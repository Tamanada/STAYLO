// ============================================
// DashboardSidebar — adaptive based on user state
// ============================================
// V2 (2026-04-30): sidebar items now appear based on what the user
// actually owns, not a hardcoded one-size-fits-all menu.
//
//   - Always visible: Overview, My Trips (bookings), Referrals
//   - Hosting section: only if user has ≥1 property (My Properties + PMS + Banking)
//   - Investor section: only if user has ≥1 share (My Shares + My Kit)
//   - "Become a host" CTA: shown to users with no properties yet
//
// This matches the Airbnb pattern — hosting tools only appear once
// you've listed something. Avoids overwhelming a fresh signup who
// just wanted to book a room.
// ============================================
import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard,
  Building2,
  Share2,
  Gem,
  Package,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  User,
  Luggage,
  Shield,
  PlusCircle,
  Smartphone,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

// ── Section definitions ─────────────────────────────────
// Each section has a `visible` predicate computed from user state.
// Items inside inherit their parent section's visibility.

// Section visibility is role-aware — the sidebar only shows tools the user
// can actually act on. Fresh SHIP customers who signed up via /downloadapp
// see just the "STAYLO Ship" launcher; STAYLO cooperative hoteliers see
// Hosting; investors see the Investor section; admins see Admin. This
// keeps the dashboard from feeling like a mystery menu to newcomers.
const SECTIONS = [
  {
    // Section 1 — everyone gets Overview + My Trips
    visible: () => true,
    items: [
      { to: '/dashboard',          icon: LayoutDashboard, labelKey: 'dashboard.nav_overview',    label: 'Overview', end: true },
      { to: '/dashboard/bookings', icon: Luggage,         labelKey: 'dashboard.nav_my_bookings', label: 'My Trips' },
    ],
  },
  {
    // Section 2 — Hosting tools (STAYLO cooperative properties only)
    label: 'Hosting',
    labelKey: 'dashboard.section_hosting',
    visible: ({ hasProperties }) => hasProperties,
    items: [
      { to: '/dashboard/properties',   icon: Building2,     labelKey: 'dashboard.nav_properties',   label: 'My Properties' },
    ],
  },
  {
    // Section 3 — Investor (STAYLO share holders only)
    label: 'Investor',
    labelKey: 'dashboard.section_investor',
    visible: ({ hasShares }) => hasShares,
    items: [
      { to: '/dashboard/shares', icon: Gem,     labelKey: 'dashboard.nav_shares',      label: 'My Shares' },
      { to: '/dashboard/kit',    icon: Package, labelKey: 'dashboard.sidebar_kit',     label: 'My Kit' },
    ],
  },
  {
    // Section 4 — Community (everyone can refer)
    visible: () => true,
    items: [
      { to: '/dashboard/referrals', icon: Share2, labelKey: 'dashboard.nav_referrals', label: 'Referrals' },
    ],
  },
]

export function DashboardSidebar() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Adaptive flags — query Supabase once on mount.
  const [hasProperties, setHasProperties] = useState(false)
  const [hasShares, setHasShares] = useState(false)
  const [hasShipHotels, setHasShipHotels] = useState(false)  // SHIP standalone customers
  const [shipHotelSlug, setShipHotelSlug] = useState(null)   // for /ship.html?hotel=<slug>
  const [stateLoaded, setStateLoaded] = useState(false)
  // Mini-list of the user's properties for the sidebar dropdown.
  // Lightweight payload (id + name) — the full Properties page still
  // fetches its own rich record set when the user navigates there.
  const [propertyList, setPropertyList] = useState([])
  // "Mes propriétés" is now a pure expand/collapse toggle — no longer
  // links to the /dashboard/properties list page. Per David: the
  // properties are accessed directly from this dropdown, so the parent
  // row should not navigate, just expand. We default to OPEN so the
  // list is visible the moment the dashboard mounts.
  const propertiesActive = /^\/dashboard\/propert/.test(location.pathname)
  const [propsExpanded, setPropsExpanded] = useState(true)
  // Still keep it open whenever the user lands on a property URL (e.g.
  // via a deep link / refresh) so the active item is visible in context.
  useEffect(() => {
    if (propertiesActive) setPropsExpanded(true)
  }, [propertiesActive])

  useEffect(() => {
    if (!user) { setStateLoaded(true); return }
    let cancelled = false

    // Count via property_members so team members (managers/staff) also see
    // the Hosting section, not just owners. Each property they belong to
    // gets one row in property_members regardless of role.
    Promise.all([
      supabase.from('property_members')
        .select('property_id')
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabase.from('shares').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ship_hotel_members')
        .select('hotel_id, ship_hotels(slug)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1),
    ]).then(async ([propRes, shareRes, shipRes]) => {
      if (cancelled) return
      const memberRows = propRes.data || []
      const shipRows = shipRes.data || []
      setHasProperties(memberRows.length > 0)
      setHasShares((shareRes.count || 0) > 0)
      setHasShipHotels(shipRows.length > 0)
      setShipHotelSlug(shipRows[0]?.ship_hotels?.slug || null)
      setStateLoaded(true)
      // Fetch the property names for the dropdown list. Cheap query —
      // we only ask for id + name + status so the payload stays tiny.
      const propIds = memberRows.map(r => r.property_id)
      if (propIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, name, status')
          .in('id', propIds)
          .order('name', { ascending: true })
        if (!cancelled) setPropertyList(props || [])
      }
    }).catch(() => {
      // On query error, fail CLOSED — only show the always-visible sections.
      // Prevents accidentally exposing investor/admin surfaces to a plain
      // signup that just failed a lookup. Users can retry after refresh.
      if (!cancelled) {
        setHasProperties(false)
        setHasShares(false)
        setHasShipHotels(false)
        setShipHotelSlug(null)
        setStateLoaded(true)
      }
    })

    return () => { cancelled = true }
  }, [user])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const userState = { hasProperties, hasShares, hasShipHotels }
  const visibleSections = SECTIONS.filter(s => s.visible(userState))
  const isAdmin = profile?.role === 'admin'
  // Team Tools section (Ship banner + Guest App) is only meaningful to
  // people who own or work at a hotel — either a STAYLO cooperative
  // property or a SHIP standalone hotel.
  const showTeamTools = hasProperties || hasShipHotels

  const sidebarContent = (
    <>
      {/* Logo + user info */}
      <div className="p-6 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <span className="text-2xl font-extrabold text-white">stay</span>
          <span className="text-2xl font-extrabold text-gradient">lo</span>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-electric/20 rounded-full flex items-center justify-center">
            <User size={14} className="text-electric" />
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Partner'}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.label && (
              <div className="pt-4 pb-1 px-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                  {section.labelKey ? t(section.labelKey, section.label) : section.label}
                </p>
              </div>
            )}
            {section.items.map(item => {
              // Special case: the "Mes propriétés" item is now a PURE
              // expand/collapse toggle — no navigation to a list page.
              // Per David, properties are accessed directly from the
              // dropdown items below (one per property). The list page
              // /dashboard/properties is still mounted for old bookmarks,
              // but nothing in the sidebar links to it anymore.
              const isPropertiesItem = item.to === '/dashboard/properties'
              if (isPropertiesItem) {
                return (
                  <div key={item.to}>
                    <button
                      type="button"
                      onClick={() => setPropsExpanded(v => !v)}
                      aria-expanded={propsExpanded}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        propertiesActive
                          ? 'bg-electric/15 text-electric border-l-4 border-electric -ml-1 pl-5'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{t(item.labelKey, item.label)}</span>
                      {propsExpanded
                        ? <ChevronDown size={16} className="text-white/40" />
                        : <ChevronRight size={16} className="text-white/40" />}
                    </button>
                    {/* Dropdown — one row per property, indented under the
                        parent. Status dot (green/orange/gray) gives an at-
                        a-glance health signal so the user spots a property
                        stuck in review without clicking through. */}
                    {propsExpanded && (
                      <div className="ml-3 mt-1 mb-1 pl-3 border-l border-white/10 space-y-0.5">
                        {propertyList.length > 0 ? (
                          propertyList.map(prop => (
                            <NavLink
                              key={prop.id}
                              to={`/dashboard/property/${prop.id}`}
                              onClick={() => setMobileOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 no-underline ${
                                  isActive
                                    ? 'bg-electric/10 text-electric font-semibold'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`
                              }
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                prop.status === 'live'      ? 'bg-libre' :
                                prop.status === 'validated' ? 'bg-electric' :
                                prop.status === 'reviewing' ? 'bg-sunset' :
                                'bg-white/30'
                              }`} />
                              <span className="truncate">{prop.name || 'Untitled'}</span>
                            </NavLink>
                          ))
                        ) : (
                          // Empty state — the hotelier has no properties
                          // yet. Surface the "Add your first" CTA right
                          // inside the dropdown so they don't have to
                          // hunt for it elsewhere.
                          <Link
                            to="/submit"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-electric/80 hover:text-electric hover:bg-electric/10 no-underline transition-all"
                          >
                            <PlusCircle size={14} className="flex-shrink-0" />
                            <span className="truncate">
                              {t('dashboard.add_first_property', 'Add your first property')}
                            </span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              }
              // Default render — every other item stays a simple NavLink
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 no-underline ${
                      isActive
                        ? 'bg-electric/15 text-electric border-l-4 border-electric -ml-1 pl-5'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span>{t(item.labelKey, item.label)}</span>
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* "Become a host" CTA — visible to anyone without properties yet.
            Wait for stateLoaded so we don't flash it for hoteliers on a slow query. */}
        {stateLoaded && !hasProperties && (
          <div className="pt-6">
            <Link
              to="/submit"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold no-underline transition-all duration-200 bg-gradient-to-br from-electric/15 to-libre/10 text-electric border border-electric/20 hover:border-electric/40 hover:shadow-lg hover:shadow-electric/10"
            >
              <PlusCircle size={18} />
              <span>{t('dashboard.cta_become_host', 'List your property')}</span>
            </Link>
            <p className="text-[10px] text-white/30 px-4 pt-2 leading-relaxed">
              {t('dashboard.cta_become_host_sub', 'Become a hotelier on STAYLO — free, 15 minutes.')}
            </p>
          </div>
        )}

        {/* Team Tools — only for people who actually operate a hotel.
            The Ship banner opens the static single-file app (public/ship.html);
            Guest App is the STAYLO cooperative guest PWA and only makes sense
            when the user has a STAYLO property. */}
        {showTeamTools && (
          <>
            <div className="pt-4 pb-1 px-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-electric/60">
                {t('dashboard.section_team_tools', 'Team tools')}
              </p>
            </div>
            <a
              href={
                hasShipHotels && !hasProperties && shipHotelSlug
                  ? `/ship.html?demo=off&hotel=${encodeURIComponent(shipHotelSlug)}`
                  : hasShipHotels && !hasProperties
                    ? '/ship.html?demo=off'
                    : '/ship.html'
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              title={t('dashboard.nav_messenger', 'Staff Messenger') + ' — Open ↗'}
              aria-label={t('dashboard.nav_messenger', 'Staff Messenger')}
              className="block rounded-xl overflow-hidden border border-electric/20 hover:border-electric/50 transition-all duration-200 hover:shadow-lg hover:shadow-electric/20 group"
            >
              <img
                src="/ShipBanner.webp"
                alt={t('dashboard.nav_messenger', 'Staff Messenger')}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
              />
            </a>

            {/* Guest App — the guest-facing PWA (app.staylo.app). Only
                relevant to STAYLO cooperative properties, not SHIP standalone
                customers who have their own guest surface. */}
            {hasProperties && (
              <a
                href="https://app.staylo.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl text-sm font-semibold no-underline transition-all duration-200 text-libre/80 hover:text-libre hover:bg-libre/10 border border-libre/20"
              >
                <Smartphone size={18} />
                <span>{t('dashboard.nav_guest_app', 'Guest App')}</span>
                <span className="ml-auto text-[10px] uppercase font-bold opacity-60">Open ↗</span>
              </a>
            )}
          </>
        )}

        {/* Admin shortcut — only for users with profile.role === 'admin'.
            Admin pages are also RLS-enforced server-side; this just avoids
            teasing the link to non-admins. */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-sunset/60">Admin</p>
            </div>
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold no-underline transition-all duration-200 text-sunset/80 hover:text-sunset hover:bg-sunset/10 border border-sunset/20"
            >
              <Shield size={18} />
              <span>STAYLO Admin</span>
              <span className="ml-auto text-[10px] uppercase font-bold opacity-60">Open ↗</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all no-underline"
        >
          <ArrowLeft size={16} />
          <span>{t('dashboard.back_to_site', 'Back to Staylo')}</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-sunset hover:bg-sunset/10 transition-all w-full cursor-pointer"
        >
          <LogOut size={16} />
          <span>{t('common.sign_out', 'Sign Out')}</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen bg-deep border-r border-white/5 fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-deep rounded-xl text-white shadow-lg cursor-pointer"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-deep z-50 flex flex-col shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
