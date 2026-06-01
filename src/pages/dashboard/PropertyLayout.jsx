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
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ConciergeBell, Sparkles, BarChart3, Banknote,
  Inbox, Settings,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../../components/ui/Badge'

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

export default function PropertyLayout() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [incomingCount, setIncomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

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
      const { data: prop } = await supabase
        .from('properties')
        .select('id, name, city, country, status, type')
        .eq('id', id).maybeSingle()
      if (cancelled) return
      setProperty(prop)
      // Property-scoped incoming bookings count for the pill badge
      supabase.from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', id)
        .then(({ count }) => { if (!cancelled) setIncomingCount(count || 0) })
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
  if (!property) return null

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
  const accentByTo = {
    'front-desk':        { icon: 'text-ocean',    hover: 'hover:border-ocean/40 hover:bg-ocean/5 hover:text-ocean hover:shadow-sm' },
    'housekeeping':      { icon: 'text-libre',    hover: 'hover:border-libre/40 hover:bg-libre/5 hover:text-libre hover:shadow-sm' },
    'reports':           { icon: 'text-electric', hover: 'hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm' },
    'banking':           { icon: 'text-sunset',   hover: 'hover:border-sunset/40 hover:bg-sunset/5 hover:text-sunset hover:shadow-sm' },
    'incoming-bookings': { icon: 'text-orange',   hover: 'hover:border-orange/40 hover:bg-orange/5 hover:text-orange hover:shadow-sm' },
    'manage':            { icon: 'text-electric', hover: 'hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm' },
  }
  function pillClass(to, isActive) {
    const a = accentByTo[to] || { icon: 'text-deep', hover: '' }
    return `${pillBase} ${isActive ? pillActive : `${pillIdle} ${a.hover}`}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
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
        <NavLink to="front-desk" className={({ isActive }) => pillClass('front-desk', isActive)}>
          <ConciergeBell size={16} className={accentByTo['front-desk'].icon} />
          {t('dashboard.nav_front_desk', 'Réception')}
        </NavLink>
        <NavLink to="housekeeping" className={({ isActive }) => pillClass('housekeeping', isActive)}>
          <Sparkles size={16} className={accentByTo['housekeeping'].icon} />
          {t('dashboard.nav_housekeeping', 'Housekeeping')}
        </NavLink>
        <NavLink to="reports" className={({ isActive }) => pillClass('reports', isActive)}>
          <BarChart3 size={16} className={accentByTo['reports'].icon} />
          {t('dashboard.nav_reports', 'Rapports')}
        </NavLink>
        <NavLink to="banking" className={({ isActive }) => pillClass('banking', isActive)}>
          <Banknote size={16} className={accentByTo['banking'].icon} />
          {t('dashboard.nav_banking', 'Banque')}
        </NavLink>
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

      {/* Child route — landing hint card / Réception / Housekeeping / etc. */}
      <Outlet context={{ property }} />
    </div>
  )
}
