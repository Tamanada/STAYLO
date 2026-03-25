import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, FileText, Check, Shield, Star, TrendingUp, DollarSign, Info } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// Currency config (same as Dashboard.jsx)
const currencyByLang = {
  en: { symbol: '$', code: 'USD', rate: 1 },
  fr: { symbol: '\u20AC', code: 'EUR', rate: 0.92 },
  th: { symbol: '\u0E3F', code: 'THB', rate: 34.5 },
  ja: { symbol: '\u00A5', code: 'JPY', rate: 150 },
  es: { symbol: '\u20AC', code: 'EUR', rate: 0.92 },
  ar: { symbol: '$', code: 'USD', rate: 1 },
  ru: { symbol: '\u20BD', code: 'RUB', rate: 92 },
  zh: { symbol: '\u00A5', code: 'CNY', rate: 7.2 },
  hi: { symbol: '\u20B9', code: 'INR', rate: 83 },
  pt: { symbol: 'R$', code: 'BRL', rate: 5 },
  de: { symbol: '\u20AC', code: 'EUR', rate: 0.92 },
  id: { symbol: 'Rp', code: 'IDR', rate: 15700 },
  my: { symbol: 'K', code: 'MMK', rate: 2100 },
  it: { symbol: '\u20AC', code: 'EUR', rate: 0.92 },
}

function getCurrency(lang) {
  return currencyByLang[lang] || currencyByLang.en
}

function formatCurrency(usdAmount, currency) {
  const local = Math.round(usdAmount * currency.rate)
  return `${currency.symbol}${local.toLocaleString()}`
}

const loiStatusConfig = {
  not_signed: { key: 'dashboard.loi_status.not_signed', color: 'gray', icon: FileText },
  signed: { key: 'dashboard.loi_status.signed', color: 'blue', icon: Check },
  contract_pending: { key: 'dashboard.loi_status.contract_pending', color: 'orange', icon: Shield },
  confirmed: { key: 'dashboard.loi_status.confirmed', color: 'green', icon: Star },
}

export default function DashboardShares() {
  const { t, i18n } = useTranslation()
  const currency = getCurrency(i18n.language)
  const fmt = (usd) => formatCurrency(usd, currency)
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [shares, setShares] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase
        .from('shares')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id),
    ]).then(([sharesRes, propsRes]) => {
      setShares(sharesRes.data || [])
      setProperties(propsRes.data || [])
      setLoading(false)
    })
  }, [user])

  if (authLoading || loading) {
    return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  }
  if (!user) return null

  const totalShares = shares.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const totalValue = totalShares * 1000
  const hasSignedLOI = shares.some(s => s.loi_signed)
  const loiStatus = shares.some(s => s.payment_confirmed)
    ? 'confirmed'
    : shares.some(s => s.contract_signed)
      ? 'contract_pending'
      : hasSignedLOI
        ? 'signed'
        : 'not_signed'

  const StatusConfig = loiStatusConfig[loiStatus]
  const StatusIcon = StatusConfig.icon

  // Commission savings estimate (same as Dashboard.jsx)
  const totalRooms = properties.reduce((sum, p) => sum + (p.room_count || 0), 0)
  const avgRate = properties.length
    ? properties.reduce((sum, p) => sum + Number(p.avg_nightly_rate || 0), 0) / properties.length
    : 0
  const estimatedSavings = totalRooms * avgRate * 365 * 0.65 * 0.07

  const stepLabels = [
    t('dashboard.step_loi', 'LOI Signed'),
    t('dashboard.step_contract', 'Contract Signed'),
    t('dashboard.step_payment', 'Payment'),
    t('dashboard.step_partner', 'Partner'),
  ]

  const stepDone = [
    hasSignedLOI,
    shares.some(s => s.contract_signed),
    shares.some(s => s.payment_confirmed),
    shares.some(s => s.payment_confirmed),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep">{t('dashboard.my_shares', 'My Shares')}</h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.shares_subtitle', 'Your founding partner status and investment details')}
        </p>
      </div>

      {/* Current status card */}
      <Card className="p-6 mb-6 border-2 border-ocean/20 bg-gradient-to-r from-ocean/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center">
              <Coins size={28} className="text-ocean" />
            </div>
            <div>
              <h2 className="font-bold text-deep text-xl">{t('dashboard.founding_partner_status', 'Founding Partner Status')}</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={StatusConfig.color}>
                  <StatusIcon size={14} className="mr-1" />
                  {t(StatusConfig.key)}
                </Badge>
                {totalShares > 0 && (
                  <span className="text-sm text-gray-500">
                    {t('dashboard.shares_count', { count: totalShares, amount: fmt(totalValue) })}
                  </span>
                )}
              </div>
            </div>
          </div>
          {loiStatus === 'not_signed' && (
            <Link to="/loi">
              <Button>
                <FileText size={16} />
                {t('dashboard.sign_loi', 'Sign LOI')}
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Progress stepper */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-deep mb-5">{t('dashboard.partnership_progress', 'Partnership Progress')}</h3>
        <div className="flex items-center justify-between">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                stepDone[i] ? 'bg-libre text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {stepDone[i] ? '\u2713' : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${stepDone[i] ? 'text-libre font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${stepDone[i] ? 'bg-libre' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-deep">{totalShares}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.shares_held', 'Shares Held')}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-ocean">{fmt(totalValue)}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.total_value', 'Total Value')}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-libre">{fmt(Math.round(estimatedSavings))}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.est_savings_year', 'Est. Savings/Year')}</p>
        </Card>
      </div>

      {/* Commission savings estimate */}
      {properties.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-libre/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={22} className="text-libre" />
            </div>
            <div>
              <h3 className="font-semibold text-deep mb-1">{t('dashboard.savings_title', 'Commission Savings Estimate')}</h3>
              <p className="text-sm text-gray-500 mb-3">
                {t('dashboard.savings_description', 'Based on your property data — switching from OTAs (17%) to Staylo (10%) saves you 7% on commissions.')}
              </p>
              <p className="text-2xl font-bold text-libre">
                {fmt(Math.round(estimatedSavings))}
                <span className="text-sm font-normal text-gray-400 ml-1">/{t('dashboard.per_year', 'year')}</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Share details */}
      <Card className="p-6">
        <h3 className="font-semibold text-deep mb-4 flex items-center gap-2">
          <Info size={18} className="text-ocean" />
          {t('dashboard.share_details', 'Share Details')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">{t('dashboard.price_per_share', 'Price per Share')}</span>
            <span className="font-semibold text-deep">{fmt(1000)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">{t('dashboard.max_per_property', 'Max per Property')}</span>
            <span className="font-semibold text-deep">10</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">{t('dashboard.total_available_alpha', 'Total Available (Alpha)')}</span>
            <span className="font-semibold text-deep">3,000</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">{t('dashboard.voting_rule', 'Voting Rule')}</span>
            <span className="font-semibold text-deep">{t('dashboard.one_property_one_vote', '1 Property = 1 Vote')}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-500">{t('dashboard.share_transfer', 'Share Transfer')}</span>
            <span className="font-semibold text-deep">{t('dashboard.freely_transferable', 'Freely Transferable')}</span>
          </div>
        </div>

        {loiStatus === 'not_signed' && (
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-4">
              {t('dashboard.loi_cta_text', 'Ready to become a founding partner? Start by signing the Letter of Intent.')}
            </p>
            <Link to="/loi">
              <Button>
                <FileText size={16} />
                {t('dashboard.sign_loi', 'Sign LOI')}
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
