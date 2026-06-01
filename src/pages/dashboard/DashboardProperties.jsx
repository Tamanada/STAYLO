import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Building2, MapPin, BedDouble, DollarSign, Calendar, Settings, ConciergeBell, Sparkles, BarChart3, Banknote, Inbox } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import IncomingBookings from './IncomingBookings'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [properties, setProperties] = useState([])
  const [incomingCount, setIncomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Tab state — ?tab=incoming switches to the Réservations reçues view.
  // Defaults to the properties list. URL-driven so the tab is bookmarkable
  // and survives a hard refresh.
  const tab = searchParams.get('tab') === 'incoming' ? 'incoming' : 'properties'
  function switchTab(next) {
    if (next === 'incoming') searchParams.set('tab', 'incoming')
    else searchParams.delete('tab')
    setSearchParams(searchParams, { replace: true })
  }

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-deep">
            {tab === 'incoming'
              ? t('bookings.incoming_title', 'Réservations reçues')
              : t('dashboard.my_properties', 'My Properties')}
          </h1>
          <p className="text-gray-500 mt-1">
            {tab === 'incoming'
              ? t('bookings.incoming_subtitle', 'Bookings made on your properties — guest contact, dates, special requests.')
              : t('dashboard.properties_count_label', '{{count}} properties registered', { count: properties.length })}
          </p>
        </div>
        {tab === 'properties' && (
          <Link to="/submit">
            <Button>
              <Plus size={18} />
              {t('dashboard.add_property', 'Add Property')}
            </Button>
          </Link>
        )}
      </div>

      {/* Hosting quick-nav — pill row contextual to "your properties".
          The first 4 pills are LINKS to dedicated routes (Front Desk /
          Housekeeping / Reports / Banking). The last pill ("Réservations
          reçues") is a TOGGLE that swaps the inline content between the
          properties list and the incoming-bookings view — clicking it
          activates the orange highlight, clicking again deactivates. */}
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
        {/* Réservations reçues — inline toggle (not a Link), placed to
            the right of Banking. Active state uses the orange palette so
            it stands out from the 4 navigation pills above. */}
        <button
          type="button"
          onClick={() => switchTab(tab === 'incoming' ? 'properties' : 'incoming')}
          className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all ${
            tab === 'incoming'
              ? 'bg-orange/10 border-orange/50 text-orange shadow-sm'
              : 'bg-white border-gray-200 text-deep hover:border-orange/40 hover:bg-orange/5 hover:text-orange hover:shadow-sm'
          }`}
        >
          <Inbox size={16} className={tab === 'incoming' ? 'text-orange' : 'text-orange'} />
          {t('bookings.tab_incoming', 'Réservations reçues')}
          {incomingCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === 'incoming' ? 'bg-orange text-white' : 'bg-orange/15 text-orange'
            }`}>
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {/* Body content — toggles between the properties list and the
          incoming-bookings view based on the active "tab". */}
      {tab === 'incoming' && <IncomingBookings embedded />}
      {tab === 'properties' && <PropertiesTabContent t={t} properties={properties} />}
    </div>
  )
}

// ── Extracted properties-tab body so the main render stays readable.
//    Renders just the properties list (or empty state). The Hosting
//    quick-nav row lives above in the main render so its pills stay
//    visible on both tabs.
function PropertiesTabContent({ t, properties }) {
  return (
    <>

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
    </>
  )
}
