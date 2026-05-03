import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getFeatureFlags } from '../../pages/admin/AdminSettings'
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Share2,
  Settings,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Shield,
  Handshake,
  Receipt,
  Sparkles,
  TrendingUp
} from 'lucide-react'

const allNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/properties', icon: Building2, label: 'Properties' },
  { to: '/admin/prospects', icon: Sparkles, label: 'Prospects' },
  { to: '/admin/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Surveys', flag: 'survey' },
  { to: '/admin/referrals', icon: Share2, label: 'Referrals', flag: 'referrals' },
  { to: '/admin/ambassadors', icon: Handshake, label: 'Ambassadors', flag: 'ambassadors' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export function AdminSidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [flags, setFlags] = useState(getFeatureFlags())

  // Re-check flags when localStorage changes (from Settings page)
  useEffect(() => {
    const interval = setInterval(() => {
      setFlags(getFeatureFlags())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const navItems = allNavItems.filter(item => !item.flag || flags[item.flag])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const sidebarContent = (
    <>
      {/* Logo + admin badge */}
      <div className="p-6 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2 no-underline">
          <span className="text-2xl font-extrabold text-white">stay</span>
          <span className="text-2xl font-extrabold text-gradient">lo</span>
        </Link>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
          <Shield size={12} />
          <span>Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 no-underline ${
                isActive
                  ? 'bg-ocean/15 text-ocean border-l-4 border-ocean -ml-1 pl-5'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </Link>

        <div className="px-4 py-2">
          <p className="text-xs text-white/30 truncate">{user?.email}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-sunset hover:bg-sunset/10 transition-all w-full cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-deep border-r border-white/5 fixed left-0 top-0 z-30">
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
