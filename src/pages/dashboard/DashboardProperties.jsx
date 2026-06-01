import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Building2, MapPin, BedDouble, DollarSign, Calendar, Settings, ConciergeBell, Sparkles, BarChart3, Banknote, Inbox, ChevronDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

const propertyTypeIcons = {
  hotel: Building2,
  guesthouse: Building2,
  resort: Building2,
  villa: Building2,
  hostel: Building2,
  restaurant: Building2,
  activity: Building2,
}

export default function DashboardProperties() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [incomingCount, setIncomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Manage-pill popover state — when there's more than one property,
  // the pill opens a small picker listing them. Single property → the
  // pill renders as a direct Link to /dashboard/property/:id.
  const [manageOpen, setManageOpen] = useState(false)
  const manageRef = useRef(null)
  useEffect(() => {
    if (!manageOpen) return
    function onClickOutside(e) {
      if (manageRef.current && !manageRef.current.contains(e.target)) {
        setManageOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [manageOpen])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    // Show every property the user has access to — owner OR team member.
    // We query property_members (which always has a row for the owner +
    // each invited team member) and resolve the linked property records.
    async function fetchAll() {
      const { data: memberships } = await supabase
        .from('property_members')
        .select('property_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const propIds = (memberships || []).map(m => m.property_id)
      if (propIds.length === 0) {
        if (!cancelled) { setProperties([]); setLoading(false) }
        return
      }
      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .in('id', propIds)
        .order('created_at', { ascending: false })

      // Attach the user's role for display
      const roleByProp = {}
      ;(memberships || []).forEach(m => { roleByProp[m.property_id] = m.role })
      const enriched = (props || []).map(p => ({ ...p, _myRole: roleByProp[p.id] || 'member' }))
      if (!cancelled) {
        setProperties(enriched)
        setLoading(false)
      }
      // Count incoming bookings (only for properties the user OWNS — same
      // scope as IncomingBookings itself, see properties.user_id filter
      // there). Used as the badge on the "Réservations reçues" tab.
      const ownedPropIds = (props || [])
        .filter(p => p.user_id === user.id)
        .map(p => p.id)
      if (ownedPropIds.length > 0) {
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('property_id', ownedPropIds)
          .then(({ count }) => { if (!cancelled) setIncomingCount(count || 0) })
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [user])

  if (authLoading || loading) {
    return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  }
  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-deep">{t('dashboard.my_properties', 'My Properties')}</h1>
          <p className="text-gray-500 mt-1">
            {t('dashboard.properties_count_label', '{{count}} properties registered', { count: properties.length })}
          </p>
        </div>
        <Link to="/submit">
          <Button>
            <Plus size={18} />
            {t('dashboard.add_property', 'Add Property')}
          </Button>
        </Link>
      </div>

      {/* Hosting quick-nav — pill row contextual to "your properties".
          All 5 pills are Links to dedicated routes; user shouldn't have
          to scan the sidebar to find any of these hotelier tools. */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <Link
          to="/dashboard/front-desk"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-ocean/40 hover:bg-ocean/5 hover:text-ocean hover:shadow-sm"
        >
          <ConciergeBell size={16} className="text-ocean" />
          {t('dashboard.nav_front_desk', 'Front Desk')}
        </Link>
        <Link
          to="/dashboard/housekeeping"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-libre/40 hover:bg-libre/5 hover:text-libre hover:shadow-sm"
        >
          <Sparkles size={16} className="text-libre" />
          {t('dashboard.nav_housekeeping', 'Housekeeping')}
        </Link>
        <Link
          to="/dashboard/reports"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm"
        >
          <BarChart3 size={16} className="text-electric" />
          {t('dashboard.nav_reports', 'Reports')}
        </Link>
        <Link
          to="/dashboard/banking"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-sunset/40 hover:bg-sunset/5 hover:text-sunset hover:shadow-sm"
        >
          <Banknote size={16} className="text-sunset" />
          {t('dashboard.nav_banking', 'Banking')}
        </Link>
        {/* Réservations reçues — Link to a dedicated route, same pattern
            as the other 4 pills above. Lives at /dashboard/incoming-bookings
            and renders the IncomingBookings page standalone. */}
        <Link
          to="/dashboard/incoming-bookings"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-orange/40 hover:bg-orange/5 hover:text-orange hover:shadow-sm"
        >
          <Inbox size={16} className="text-orange" />
          {t('bookings.tab_incoming', 'Réservations reçues')}
          {incomingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange/15 text-orange">
              {incomingCount}
            </span>
          )}
        </Link>
        {/* Manage pill — direct Link when there's one property, popover
            picker when there are several. Lets the hotelier jump into a
            specific property's management page without scrolling the
            properties list below. Hidden entirely if no properties yet. */}
        {properties.length === 1 && (
          <Link
            to={`/dashboard/property/${properties[0].id}`}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm"
          >
            <Settings size={16} className="text-electric" />
            {t('dashboard.manage', 'Manage')}
          </Link>
        )}
        {properties.length > 1 && (
          <div className="relative" ref={manageRef}>
            <button
              type="button"
              onClick={() => setManageOpen(v => !v)}
              className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                manageOpen
                  ? 'bg-electric/10 border-electric/50 text-electric shadow-sm'
                  : 'bg-white border-gray-200 text-deep hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm'
              }`}
            >
              <Settings size={16} className="text-electric" />
              {t('dashboard.manage', 'Manage')}
              <ChevronDown size={14} className={`transition-transform duration-200 ${manageOpen ? 'rotate-180' : ''}`} />
            </button>
            {manageOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 max-w-[80vw] bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t('dashboard.select_property', 'Select a property')}
                </div>
                {properties.map(p => (
                  <Link
                    key={p.id}
                    to={`/dashboard/property/${p.id}`}
                    onClick={() => setManageOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-deep no-underline hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      p.status === 'live'      ? 'bg-emerald-500' :
                      p.status === 'validated' ? 'bg-electric' :
                      p.status === 'reviewing' ? 'bg-amber-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="truncate font-medium">{p.name || 'Untitled'}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Properties list */}
      {properties.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-deep mb-2">
            {t('dashboard.no_properties_title', 'No properties yet')}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {t('dashboard.no_properties_detail', 'Register your first property to get started. It only takes a few minutes.')}
          </p>
          <Link to="/submit">
            <Button>
              <Plus size={16} />
              {t('dashboard.add_property', 'Add Property')}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {properties.map(prop => {
            const Icon = propertyTypeIcons[prop.type] || Building2
            return (
              <Card key={prop.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-ocean/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Icon size={22} className="text-ocean" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-deep text-lg truncate">{prop.name}</h3>
                        <Badge variant={statusColors[prop.status]}>
                          {t(`dashboard.status.${prop.status}`, prop.status)}
                        </Badge>
                        {prop._myRole && prop._myRole !== 'owner' && (
                          <Badge variant="blue">
                            {prop._myRole === 'manager' ? '⚙️ Manager' : '🧑 Staff'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        {prop.type && (
                          <span className="capitalize">{t(`property_types.${prop.type}`, prop.type)}</span>
                        )}
                        {(prop.city || prop.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {[prop.city, prop.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {prop.room_count > 0 && (
                          <span className="flex items-center gap-1">
                            <BedDouble size={14} />
                            {t('dashboard.rooms_count', '{{count}} rooms', { count: prop.room_count })}
                          </span>
                        )}
                        {prop.avg_nightly_rate > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={14} />
                            {t('dashboard.avg_rate', '~${{rate}}/night', { rate: Math.round(prop.avg_nightly_rate) })}
                          </span>
                        )}
                        {prop.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(prop.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link to={`/dashboard/property/${prop.id}`}>
                    <Button size="sm" variant="secondary">
                      <Settings size={14} />
                      {t('dashboard.manage', 'Manage')}
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
