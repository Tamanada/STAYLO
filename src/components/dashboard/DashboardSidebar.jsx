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
import { NavLink, Link, useNavigate } from 'react-router-dom'
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
  ConciergeBell,
  Sparkles,
  BarChart3,
  Luggage,
  Banknote,
  Shield,
  PlusCircle
} from 'lucide-react'

// ── Section definitions ─────────────────────────────────
// Each section has a `visible` predicate computed from user state.
// Items inside inherit their parent section's visibility.

const SECTIONS = [
  {
    // Section 1 — everyone gets these
    visible: () => true,
    items: [
      { to: '/dashboard',          icon: LayoutDashboard, labelKey: 'dashboard.nav_overview',    label: 'Overview', end: true },
      { to: '/dashboard/bookings', icon: Luggage,         labelKey: 'dashboard.nav_my_bookings', label: 'My Trips' },
    ],
  },
  {
    // Section 2 — Hosting tools (only after first property)
    label: 'Hosting',
    labelKey: 'dashboard.section_hosting',
    visible: ({ hasProperties }) => hasProperties,
    items: [
      { to: '/dashboard/properties',   icon: Building2,     labelKey: 'dashboard.nav_properties',   label: 'My Properties' },
      { to: '/dashboard/front-desk',   icon: ConciergeBell, labelKey: 'dashboard.nav_front_desk',   label: 'Front Desk' },
      { to: '/dashboard/housekeeping', icon: Sparkles,      labelKey: 'dashboard.nav_housekeeping', label: 'Housekeeping' },
      { to: '/dashboard/reports',      icon: BarChart3,     labelKey: 'dashboard.nav_reports',      label: 'Reports' },
      { to: '/dashboard/banking',      icon: Banknote,      labelKey: 'dashboard.nav_banking',      label: 'Banking' },
    ],
  },
  {
    // Section 3 — Investor (only if user holds shares)
    label: 'Investor',
    labelKey: 'dashboard.section_investor',
    visible: ({ hasShares }) => hasShares,
    items: [
      { to: '/dashboard/shares', icon: Gem,     labelKey: 'dashboard.nav_shares',      label: 'My Shares' },
      { to: '/dashboard/kit',    icon: Package, labelKey: 'dashboard.sidebar_kit',     label: 'My Kit' },
    ],
  },
  {
    // Section 4 — Community (everyone)
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
  const [mobileOpen, setMobileOpen] = useState(false)

  // Adaptive flags — query Supabase once on mount.
  // Use head:true + count:'exact' so we don't pull actual rows.
  const [hasProperties, setHasProperties] = useState(false)
  const [hasShares, setHasShares] = useState(false)
  const [stateLoaded, setStateLoaded] = useState(false)

  useEffect(() => {
    if (!user) { setStateLoaded(true); return }
    let cancelled = false

    Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('shares').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([propRes, shareRes]) => {
      if (cancelled) return
      setHasProperties((propRes.count || 0) > 0)
      setHasShares((shareRes.count || 0) > 0)
      setStateLoaded(true)
    }).catch(() => {
      // On error fail open — show everything (defensive: don't lock the user out)
      if (!cancelled) {
        setHasProperties(true)
        setHasShares(true)
        setStateLoaded(true)
      }
    })

    return () => { cancelled = true }
  }, [user])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const userState = { hasProperties, hasShares }
  const visibleSections = SECTIONS.filter(s => s.visible(userState))

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
            {section.items.map(item => (
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
            ))}
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

        {/* Admin shortcut — only visible to users with role='admin' (RLS-enforced server-side too) */}
        {profile?.role === 'admin' && (
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
