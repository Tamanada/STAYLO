// ============================================
// Dashboard — Property Layout (shared header + pill nav)
// ============================================
// Wraps every property-scoped route so the 6 pills stay visible
// across navigation. The active section is highlighted so the
// hotelier always knows where they are.
//
// Route tree it serves:
//   /dashboard/property/:id                    → PropertyLanding
//   /dashboard/property/:id/front-desk         → PMSFrontDesk
//   /dashboard/property/:id/housekeeping       → PMSHousekeeping
//   /dashboard/property/:id/reports            → PMSReports
//   /dashboard/property/:id/banking            → Banking
//   /dashboard/property/:id/incoming-bookings  → IncomingBookings
//   /dashboard/property/:id/manage             → PropertyManage
//
// Renders:
//   • Back arrow → /dashboard/properties
//   • Property name + status badge + city/country
//   • 6 NavLink pills (active state highlighted)
//   • <Outlet /> for the child route
//
// Membership check is built in — a user with no active access to the
// property is bounced back to /dashboard/properties.
// ============================================
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, BarChart3,
  Inbox, Settings, BedDouble,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../../components/ui/Badge'

// Sort rooms by the hotelier's display_order (when present) with name
// as tie-breaker. Done client-side instead of ORDER BY display_order
// in the query because that column ships in migration 20260604020000;
// older DBs that haven't applied it yet would return an error and
// blank the page. Defensive: rooms without display_order get sorted
// LAST (Infinity), preserving alpha order among themselves.
function sortRoomsByDisplay(rooms) {
  return [...(rooms || [])].sort((a, b) => {
    const ao = a?.display_order ?? Infinity
    const bo = b?.display_order ?? Infinity
    if (ao !== bo) return ao - bo
    return (a?.name || '').localeCompare(b?.name || '')
  })
}

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

export default function PropertyLayout() {
  const { t } = useTranslation()
  const { id } = useParams()
  const location = useLocation()
  // Reception views (Chambres, Réservations, Housekeeping) need the
  // full viewport for their grid + side panel. Other tabs (Photos,
  // Videos, Manage) keep the narrower 1440px cap so forms stay
  // readable. David, 2026-06-08: "agrandis le tableau au maximum sur
  // la page" on the Chambres → Timeline screen.
  const isWideSurface = /\/(rooms|bookings|housekeeping|reports|front-desk)(\/|$)/.test(location.pathname)
  const containerWidthClass = isWideSurface
    ? 'w-full max-w-none px-4'
    : 'w-[92%] max-w-[1440px] mx-auto px-4'
  const { user } = useAuth()
  const navigate = useNavigate()
  // Shared state — child routes (Rooms, Manage, TM30, Reports, etc.)
  // all read this via useOutletContext() so they DON'T re-fetch when
  // the user navigates between them. React Router keeps PropertyLayout
  // mounted across sibling-route changes, which means fetches happen
  // once per property visit instead of once per page mount. Big UX win:
  // no more loading flash on every pill click.
  const [property, setProperty] = useState(null)
  const [rooms, setRooms]       = useState([])
  const [bookings, setBookings] = useState([])
  const [packages, setPackages] = useState([])
  const [incomingCount, setIncomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Refetch helpers — exposed via context so any child can refresh a
  // slice after a write without reloading everything. e.g. PropertyManage
  // calls refetchRooms() after saving a new room.
  const refetchRooms = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('rooms').select('*').eq('property_id', id).order('name')
    setRooms(sortRoomsByDisplay(data))
  }, [id])

  const refetchBookings = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('bookings').select('*').eq('property_id', id)
    setBookings(data || [])
    setIncomingCount((data || []).length)
  }, [id])

  const refetchPackages = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('packages')
      .select('id, name, description, price, currency, room_packages(room_id, qty, date_blocks)')
      .eq('property_id', id)
      .eq('is_active', true)
    setPackages(data || [])
  }, [id])

  const refetchProperty = useCallback(async () => {
    if (!id) return
    // SELECT * because some columns (checkin_*_hour, passport_validity_*,
    // tm30_license_number) only exist after later migrations have been
    // applied. Enumerating them broke the page on databases where those
    // columns aren't yet present. * is tolerant: it returns whatever the
    // schema currently has.
    const { data } = await supabase
      .from('properties').select('*').eq('id', id).maybeSingle()
    setProperty(data)
  }, [id])

  // Initial fetch — runs once per property visit (`id` is the dep).
  // Navigating between child routes does NOT re-trigger this because
  // PropertyLayout stays mounted across sibling routes.
  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    setLoading(true)
    async function fetchAll() {
      // Membership check first — if no active row, bounce back.
      const memberRes = await supabase
        .from('property_members')
        .select('role').eq('user_id', user.id).eq('property_id', id)
        .eq('status', 'active').maybeSingle()
      if (cancelled) return
      if (!memberRes.data) {
        navigate('/dashboard/properties', { replace: true })
        return
      }
      // Parallel fetch — property meta + rooms + bookings + packages.
      // SELECT * on properties so we don't break when newer columns
      // (tm30_*, checkin_*_hour, etc.) aren't yet in the deployed DB.
      // Each query is awaited individually with allSettled so a single
      // failure (e.g. packages table missing in an exotic deploy)
      // doesn't blank the whole page — we degrade gracefully.
      const settled = await Promise.allSettled([
        supabase.from('properties').select('*').eq('id', id).maybeSingle(),
        supabase.from('rooms').select('*').eq('property_id', id).order('name'),
        supabase.from('bookings').select('*').eq('property_id', id),
        supabase.from('packages')
          .select('id, name, description, price, currency, room_packages(room_id, qty, date_blocks)')
          .eq('property_id', id).eq('is_active', true),
      ])
      if (cancelled) return
      const [pRes, rRes, bRes, pkRes] = settled.map(s => s.status === 'fulfilled' ? s.value : { data: null, error: s.reason })
      // Log any non-fatal failures so they're easy to debug from the
      // browser console without crashing the page.
      settled.forEach((s, i) => {
        if (s.status === 'rejected') console.warn('PropertyLayout fetch[' + i + '] failed:', s.reason)
        else if (s.value?.error) console.warn('PropertyLayout fetch[' + i + '] error:', s.value.error)
      })
      setProperty(pRes?.data || null)
      setRooms(sortRoomsByDisplay(rRes?.data))
      setBookings(bRes?.data || [])
      setPackages(pkRes?.data || [])
      setIncomingCount((bRes?.data || []).length)
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [user, id, navigate])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }
  // Fetch completed but no property row came back — could be a
  // schema mismatch (newer column requested against an older DB),
  // a deleted row, or a permission issue. Surface this instead of
  // rendering a silent blank page (the bug David hit on 2026-06-03).
  if (!property) {
    return (
      <div className="w-[92%] max-w-[1440px] mx-auto px-4 py-20 text-center">
        <div className="inline-block px-6 py-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="text-2xl mb-2">🤔</div>
          <h2 className="text-lg font-bold text-deep mb-1">Property not loaded</h2>
          <p className="text-sm text-gray-500 max-w-md mb-3">
            The property record didn't load. This usually means a database
            migration is pending. Open the browser console for details.
          </p>
          <Link to="/dashboard/properties" className="inline-block px-4 py-2 rounded-xl bg-deep text-white text-sm font-bold no-underline hover:opacity-90">
            ← Back to My Properties
          </Link>
        </div>
      </div>
    )
  }

  // Pill class factories — share a base + per-color hover state, with
  // a stronger highlight when the pill is the active route. NavLink's
  // `end` prop differentiates the landing (no sub-path) from the deep
  // children so the property hub doesn't stay highlighted everywhere.
  const pillBase =
    'group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold no-underline transition-all'
  const pillIdle = 'bg-white border border-gray-200 text-deep shadow-none'
  const pillActive = 'bg-deep border border-deep text-white shadow-md'
  // Per-section accent color (used on hover when idle, AND for the icon
  // tint even when active so the brand color stays present).
  // Note: "banking" was removed — its content (BTC / Solana / Bank /
  // Stripe) is folded into the Settings tab under "Payment Connection".
  // Note: "front-desk" (Réception) was removed — its calendar rack +
  // arrivals/departures workflow is fully covered by the Rooms module
  // (Timeline view + Grid + side panel with check-in/check-out actions).
  const accentByTo = {
    'rooms':             { icon: 'text-pink',     hover: 'hover:border-pink/40 hover:bg-pink/5 hover:text-pink hover:shadow-sm' },
    'housekeeping':      { icon: 'text-libre',    hover: 'hover:border-libre/40 hover:bg-libre/5 hover:text-libre hover:shadow-sm' },
    'reports':           { icon: 'text-electric', hover: 'hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm' },
    'incoming-bookings': { icon: 'text-orange',   hover: 'hover:border-orange/40 hover:bg-orange/5 hover:text-orange hover:shadow-sm' },
    'manage':            { icon: 'text-electric', hover: 'hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm' },
  }
  function pillClass(to, isActive) {
    const a = accentByTo[to] || { icon: 'text-deep', hover: '' }
    return `${pillBase} ${isActive ? pillActive : `${pillIdle} ${a.hover}`}`
  }

  return (
    // Wider container (≈90 % viewport on standard laptops; capped at
    // a max so very-wide monitors don't stretch tables to oblivion).
    // Was max-w-5xl — too tight for the Rooms toolbar + the Timeline
    // 14-day grid; David asked for the room info + filters to live on
    // the same row.
    <div className={`${containerWidthClass} py-5`}>
      {/* Header — back arrow + name + status + location (compact) */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/dashboard/properties"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors no-underline text-gray-600 flex-shrink-0"
          title={t('common.back', 'Back')}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-deep truncate leading-tight">{property.name}</h1>
            <Badge variant={statusColors[property.status] || 'gray'}>
              {t(`dashboard.status.${property.status}`, property.status)}
            </Badge>
            {(property.city || property.country) && (
              <span className="text-gray-500 text-xs sm:text-sm">
                · {[property.city, property.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6-pill quick-nav (sticky-friendly horizontal scroll if too tight) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <NavLink to="rooms" className={({ isActive }) => pillClass('rooms', isActive)}>
          <BedDouble size={16} className={accentByTo['rooms'].icon} />
          {t('dashboard.nav_rooms', 'Chambres')}
        </NavLink>
        {/* The old "Réception" pill (Front Desk) was retired — its
            calendar rack + arrivals/departures workflow is now part of
            the Rooms module (Timeline view + side panel actions). The
            route /dashboard/property/:id/front-desk is still mounted
            in App.jsx so old bookmarks / external links keep working. */}
        <NavLink to="housekeeping" className={({ isActive }) => pillClass('housekeeping', isActive)}>
          <Sparkles size={16} className={accentByTo['housekeeping'].icon} />
          {t('dashboard.nav_housekeeping', 'Housekeeping')}
        </NavLink>
        <NavLink to="reports" className={({ isActive }) => pillClass('reports', isActive)}>
          <BarChart3 size={16} className={accentByTo['reports'].icon} />
          {t('dashboard.nav_reports', 'Rapports')}
        </NavLink>
        {/* The old Banque pill is now folded into Settings → Payment
            Connection (BTC · Solana · Bank · Stripe) inside the Gérer tab. */}
        <NavLink to="incoming-bookings" className={({ isActive }) => pillClass('incoming-bookings', isActive)}>
          <Inbox size={16} className={accentByTo['incoming-bookings'].icon} />
          {t('bookings.tab_incoming', 'Réservations reçues')}
          {incomingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange/15 text-orange">
              {incomingCount}
            </span>
          )}
        </NavLink>
        <NavLink to="manage" className={({ isActive }) => pillClass('manage', isActive)}>
          <Settings size={16} className={accentByTo['manage'].icon} />
          {t('dashboard.manage', 'Gérer')}
        </NavLink>
      </div>

      {/* Child route — landing hint card / Réception / Housekeeping / etc.
          Shared data + refetch hooks flow down so child pages don't
          re-fetch on navigation. Children read selectively via
          useOutletContext() and call refetch*() after writes. */}
      <Outlet context={{
        property,
        rooms,
        bookings,
        packages,
        refetchProperty,
        refetchRooms,
        refetchBookings,
        refetchPackages,
      }} />
    </div>
  )
}
