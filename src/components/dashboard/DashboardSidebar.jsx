import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard,
  Building2,
  Share2,
  Gem,
  Package,
  Search,
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
  Shield
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.nav_overview', label: 'Overview', end: true },
  { to: '/dashboard/properties', icon: Building2, labelKey: 'dashboard.nav_properties', label: 'My Properties' },
  { to: '/dashboard/bookings', icon: Luggage, labelKey: 'dashboard.nav_my_bookings', label: 'My Bookings' },
  { separator: true, label: 'PMS' },
  { to: '/dashboard/front-desk', icon: ConciergeBell, labelKey: 'dashboard.nav_front_desk', label: 'Front Desk' },
  { to: '/dashboard/housekeeping', icon: Sparkles, labelKey: 'dashboard.nav_housekeeping', label: 'Housekeeping' },
  { to: '/dashboard/reports', icon: BarChart3, labelKey: 'dashboard.nav_reports', label: 'Reports' },
  { separator: true, label: 'Account' },
  { to: '/dashboard/banking', icon: Banknote, labelKey: 'dashboard.nav_banking', label: 'Banking' },
  { to: '/dashboard/referrals', icon: Share2, labelKey: 'dashboard.nav_referrals', label: 'Referrals' },
  { to: '/dashboard/shares', icon: Gem, labelKey: 'dashboard.nav_shares', label: 'My Shares' },
  { to: '/dashboard/kit', icon: Package, labelKey: 'dashboard.sidebar_kit', label: 'My Kit' },
]

export function DashboardSidebar() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

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
        {navItems.map((item, idx) => {
          if (item.separator) {
            return (
              <div key={`sep-${idx}`} className="pt-4 pb-1 px-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">{item.label}</p>
              </div>
            )
          }
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
