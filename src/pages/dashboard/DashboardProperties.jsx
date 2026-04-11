import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Building2, MapPin, BedDouble, DollarSign, Calendar, Settings } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProperties(data || [])
        setLoading(false)
      })
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
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-deep text-lg truncate">{prop.name}</h3>
                        <Badge variant={statusColors[prop.status]}>
                          {t(`dashboard.status.${prop.status}`, prop.status)}
                        </Badge>
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
