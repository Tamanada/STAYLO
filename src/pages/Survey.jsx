import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, ArrowLeft, DollarSign, BarChart3, Wallet, Building2, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'

const investmentOptions = [
  { value: 1000, label: '$1,000 (1 share)' },
  { value: 2000, label: '$2,000 (2 shares)' },
  { value: 5000, label: '$5,000 (5 shares)' },
  { value: 10000, label: '$10,000 (10 shares)' },
]

const otaDependencyOptions = ['<30%', '30-50%', '50-70%', '>70%']

const frustrationKeys = [
  'high_commissions',
  'price_parity',
  'no_guest_data',
  'unfair_ranking',
  'forced_discounts',
  'late_payouts',
  'no_brand',
  'poor_support',
  'overbooking',
  'total_dependency',
]

const frustrationEmojis = {
  high_commissions: '💸',
  price_parity: '🔒',
  no_guest_data: '👤',
  unfair_ranking: '📉',
  forced_discounts: '🏷️',
  late_payouts: '⏳',
  no_brand: '🏨',
  poor_support: '📞',
  overbooking: '📊',
  total_dependency: '🔗',
}

export default function Survey() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [answers, setAnswers] = useState({
    monthly_commission: 2000,
    ota_dependency: '50-70%',
    frustrations: [],
    intended_investment: 1000,
    property_name: '',
    contact_email: '',
  })

  const totalSteps = 5
  const annualCommission = answers.monthly_commission * 12
  const annualWithStaylo = answers.monthly_commission * (10 / 17) * 12
  const annualSaving = annualCommission - annualWithStaylo

  const stepIcons = [DollarSign, BarChart3, AlertTriangle, Wallet, Building2]

  function toggleFrustration(key) {
    setAnswers(prev => ({
      ...prev,
      frustrations: prev.frustrations.includes(key)
        ? prev.frustrations.filter(f => f !== key)
        : [...prev.frustrations, key],
    }))
  }

  async function handleSubmit() {
    if (!answers.property_name || !answers.contact_email) return
    setLoading(true)
    try {
      await supabase.from('survey_answers').insert({
        user_id: user?.id || null,
        platforms_used: [],
        monthly_commission: answers.monthly_commission,
        commission_pct: 17,
        ota_dependency: answers.ota_dependency,
        biggest_frustration: answers.frustrations.join(', '),
        interest_score: 8,
        would_join: true,
        intended_investment: answers.intended_investment,
        property_name: answers.property_name,
        contact_email: answers.contact_email,
      })
      trackEvent(EVENTS.SURVEY_COMPLETE, { investment: answers.intended_investment })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-libre" />
        </div>
        <h2 className="text-3xl font-bold text-deep mb-3">{t('survey.success_title')}</h2>
        <p className="text-gray-500 mb-4">{t('survey.success_message')}</p>
        <div className="bg-libre/5 border border-libre/20 rounded-2xl p-6 mb-8">
          <p className="text-sm text-gray-500 mb-1">{t('survey.savings_label', 'Your estimated annual savings')}</p>
          <p className="text-4xl font-bold text-libre">${annualSaving.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">{t('survey.savings_detail', 'by switching to Staylo (10% vs 17%)')}</p>
        </div>
        <Button onClick={() => navigate('/submit')} size="lg">
          {t('survey.success_cta')}
          <ArrowRight size={18} />
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">{t('survey.title')}</h1>
        <p className="text-gray-500">{t('survey.subtitle')}</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-3">
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step
                  ? 'bg-gradient-to-r from-ocean to-electric text-white scale-110 shadow-lg shadow-ocean/30'
                  : s < step
                    ? 'bg-libre text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? '✓' : s}
            </button>
            {s < 5 && (
              <div className={`w-8 h-0.5 ${s < step ? 'bg-libre' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-8">
        {/* Step 1: Monthly OTA commission */}
        {step === 1 && (
          <div className="text-center">
            <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign size={28} className="text-sunset" />
            </div>
            <h3 className="text-xl font-bold text-deep mb-2">
              {t('survey.step1_title', 'How much do you pay in OTA commissions per month?')}
            </h3>
            <p className="text-gray-400 text-sm mb-8">
              {t('survey.step1_subtitle', 'Estimate your total monthly payment to Agoda, Booking.com, etc.')}
            </p>
            <div className="mb-4">
              <span className="text-6xl font-bold text-deep">${answers.monthly_commission.toLocaleString()}</span>
              <span className="text-gray-400 text-lg">/{t('survey.per_month', 'month')}</span>
            </div>
            <input
              type="range"
              min={100}
              max={20000}
              step={100}
              value={answers.monthly_commission}
              onChange={e => setAnswers(prev => ({ ...prev, monthly_commission: Number(e.target.value) }))}
              className="w-full accent-sunset mb-4"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>$100</span>
              <span>$5,000</span>
              <span>$10,000</span>
              <span>$20,000</span>
            </div>
            <div className="mt-8 bg-sunset/5 border border-sunset/20 rounded-2xl p-5">
              <p className="text-sm text-gray-500">
                {t('survey.annual_leaving', "That's")} <span className="font-bold text-sunset text-lg">${annualCommission.toLocaleString()}</span> {t('survey.annual_leaving_suffix', 'per year leaving your business.')}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: OTA dependency */}
        {step === 2 && (
          <div className="text-center">
            <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={28} className="text-ocean" />
            </div>
            <h3 className="text-xl font-bold text-deep mb-2">
              {t('survey.step2_title', 'What % of your bookings come through OTAs?')}
            </h3>
            <p className="text-gray-400 text-sm mb-8">
              {t('survey.step2_subtitle', 'How dependent are you on platforms like Agoda or Booking.com?')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {otaDependencyOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswers(prev => ({ ...prev, ota_dependency: opt }))}
                  className={`py-5 px-4 rounded-2xl border-2 text-center transition-all ${
                    answers.ota_dependency === opt
                      ? 'border-ocean bg-ocean/5 shadow-lg shadow-ocean/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-2xl font-bold block ${answers.ota_dependency === opt ? 'text-ocean' : 'text-deep'}`}>
                    {opt}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {opt === '<30%' && t('survey.dep_low', 'Mostly direct')}
                    {opt === '30-50%' && t('survey.dep_mid', 'Balanced mix')}
                    {opt === '50-70%' && t('survey.dep_high', 'OTA dependent')}
                    {opt === '>70%' && t('survey.dep_very_high', 'Heavily reliant')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Frustrations (NEW — multi-select) */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-sunset" />
              </div>
              <h3 className="text-xl font-bold text-deep mb-2">
                {t('survey.q3')}
              </h3>
              <p className="text-gray-400 text-sm">
                {t('survey.q3_subtitle', 'Select all that apply — be honest, we\'re building this for you.')}
              </p>
            </div>
            <div className="grid gap-3">
              {frustrationKeys.map(key => {
                const selected = answers.frustrations.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleFrustration(key)}
                    className={`w-full py-4 px-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      selected
                        ? 'border-sunset bg-sunset/5 shadow-md shadow-sunset/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{frustrationEmojis[key]}</span>
                    <span className={`font-medium text-sm ${selected ? 'text-deep' : 'text-gray-600'}`}>
                      {t(`survey.q3_options.${key}`)}
                    </span>
                    {selected && (
                      <CheckCircle size={20} className="text-sunset ml-auto flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
            {answers.frustrations.length > 0 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-sunset font-semibold">
                  {answers.frustrations.length} {t('survey.selected', 'selected')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Investment interest */}
        {step === 4 && (
          <div className="text-center">
            <div className="w-14 h-14 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet size={28} className="text-libre" />
            </div>
            <h3 className="text-xl font-bold text-deep mb-4">
              {t('survey.step4_title', 'How much would you invest to own the platform?')}
            </h3>

            {/* Governance rule */}
            <div className="bg-gradient-to-r from-ocean/10 via-electric/10 to-ocean/10 border-2 border-ocean/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-ocean rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-black">1</span>
                </div>
                <span className="text-3xl font-black text-deep">=</span>
                <div className="w-12 h-12 bg-ocean rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-black">1</span>
                </div>
              </div>
              <p className="text-xl font-bold text-deep mb-1">{t('survey.governance_title', '1 Hotel = 1 Governance Vote')}</p>
              <p className="text-sm text-gray-500">
                {t('survey.governance_desc', 'Regardless of how many shares you hold. Every property gets equal voice.')}
              </p>
              <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                <span className="text-ocean font-semibold">$1,000 / {t('survey.share', 'share')}</span>
                <span className="text-gray-300">|</span>
                <span className="text-ocean font-semibold">1–10 {t('survey.shares_per', 'shares per property')}</span>
              </div>
            </div>

            <div className="space-y-3">
              {investmentOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers(prev => ({ ...prev, intended_investment: opt.value }))}
                  className={`w-full py-4 px-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                    answers.intended_investment === opt.value
                      ? 'border-libre bg-libre/5 shadow-lg shadow-libre/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`font-semibold ${answers.intended_investment === opt.value ? 'text-libre' : 'text-deep'}`}>
                    {opt.label}
                  </span>
                  {answers.intended_investment === opt.value && (
                    <CheckCircle size={20} className="text-libre" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6 bg-libre/5 border border-libre/20 rounded-2xl p-5">
              <p className="text-sm text-gray-500">
                {t('survey.your_investment', 'Your investment')}: <span className="font-bold text-libre">${answers.intended_investment.toLocaleString()}</span>
                {' '}— {t('survey.est_saving', 'Estimated yearly saving')}: <span className="font-bold text-libre">${annualSaving.toLocaleString()}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ROI: {(annualSaving / answers.intended_investment).toFixed(1)}x {t('survey.in_year1', 'in year 1')}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Property name + email */}
        {step === 5 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-electric/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-electric" />
              </div>
              <h3 className="text-xl font-bold text-deep mb-2">
                {t('survey.step5_title', 'Almost done! Tell us about your property.')}
              </h3>
              <p className="text-gray-400 text-sm">
                {t('survey.step5_subtitle', "We'll contact you with next steps for becoming a founding partner.")}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep mb-2">{t('survey.property_name', 'Property name')}</label>
                <Input
                  placeholder={t('survey.property_placeholder', 'e.g. Sunset Beach Resort')}
                  value={answers.property_name}
                  onChange={e => setAnswers(prev => ({ ...prev, property_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-deep mb-2">{t('survey.your_email', 'Your email')}</label>
                <Input
                  type="email"
                  placeholder="you@hotel.com"
                  value={answers.contact_email}
                  onChange={e => setAnswers(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={16} />
              {t('survey.back', 'Back')}
            </Button>
          ) : <div />}

          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)}>
              {t('survey.next', 'Next')}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              variant="green"
              onClick={handleSubmit}
              disabled={loading || !answers.property_name || !answers.contact_email}
            >
              {loading ? t('common.loading', 'Submitting...') : t('survey.become_partner', 'Become a Founding Partner')}
              {!loading && <ArrowRight size={16} />}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
