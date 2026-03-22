import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Check, Plus, Lock, Building2, Users, TrendingUp, Zap, Star, MessageSquare } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { useReferral } from '../hooks/useReferral'
import { supabase } from '../lib/supabase'

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

const futureFeatures = [
  { key: 'booking_engine', icon: Zap },
  { key: 'channel_manager', icon: TrendingUp },
  { key: 'revenue_share', icon: Star },
  { key: 'guest_reviews', icon: MessageSquare },
]

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, profile, loading: authLoading } = useAuth()
  const { referralCount, referralLink, referralCode } = useReferral()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProperties(data || []))
  }, [user])

  function copyReferralLink() {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (authLoading) return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  if (!user) return null

  const totalRooms = properties.reduce((sum, p) => sum + (p.room_count || 0), 0)
  const avgRate = properties.length
    ? properties.reduce((sum, p) => sum + Number(p.avg_nightly_rate || 0), 0) / properties.length
    : 0
  const estimatedSavings = totalRooms * avgRate * 365 * 0.65 * 0.10 // 10% savings estimate

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep">
          {t('dashboard.welcome', { name: profile?.full_name || 'Member' })}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.member_since', { date: new Date(profile?.created_at).toLocaleDateString() })}
        </p>
        <Badge variant="navy" className="mt-2">
          {t('dashboard.founding_position', { position: 42 })}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        {/* Referral card */}
        <Card className="p-6">
          <h3 className="font-semibold text-deep mb-3">{t('dashboard.referral_title')}</h3>
          <div className="flex items-center gap-2 bg-cream rounded-lg p-3 mb-3">
            <code className="text-sm text-ocean flex-1 truncate font-mono">
              {referralLink || 'Loading...'}
            </code>
            <button
              onClick={copyReferralLink}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {copied ? <Check size={16} className="text-libre" /> : <Copy size={16} className="text-gray-400" />}
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {t('dashboard.referral_count', { count: referralCount })}
          </p>
        </Card>

        {/* Savings estimate */}
        <Card className="p-6">
          <h3 className="font-semibold text-deep mb-3">{t('dashboard.savings_title')}</h3>
          <p className="text-3xl font-bold text-libre mb-1">
            ${Math.round(estimatedSavings).toLocaleString()}
            <span className="text-sm font-normal text-gray-400">/year</span>
          </p>
          <p className="text-sm text-gray-500">{t('dashboard.savings_description')}</p>
        </Card>
      </div>

      {/* Properties */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-deep">{t('dashboard.properties_title')}</h2>
          <Link to="/submit">
            <Button size="sm" variant="secondary">
              <Plus size={16} />
              {t('dashboard.add_property')}
            </Button>
          </Link>
        </div>

        {properties.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">{t('dashboard.no_properties')}</p>
            <Link to="/submit">
              <Button size="sm">{t('dashboard.add_property')}</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.map(prop => (
              <Card key={prop.id} className="p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-deep">{prop.name}</h4>
                  <p className="text-sm text-gray-500">
                    {prop.city}, {prop.country} — {prop.room_count} rooms
                  </p>
                </div>
                <Badge variant={statusColors[prop.status]}>
                  {t(`dashboard.status.${prop.status}`)}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Future features (locked) */}
      <div>
        <h2 className="text-xl font-semibold text-deep mb-4">{t('dashboard.coming_soon')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {futureFeatures.map(feat => (
            <Card key={feat.key} className="p-5 flex items-center gap-4 opacity-60">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Lock size={18} className="text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium text-deep">{t(`dashboard.features.${feat.key}`)}</h4>
                <p className="text-xs text-gray-400">{t('dashboard.coming_soon')}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
