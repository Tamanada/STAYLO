import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, CheckCircle, Shield, Users, TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function LOI() {
  const { ref } = useParams()
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('info') // info → form → signing → done
  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState(1)
  const [formData, setFormData] = useState({
    full_name: '',
    property_name: '',
    email: '',
    phone: '',
  })

  const shareDetails = [
    { label: t('loi.share_price_label', 'Price per share'), value: t('loi.share_price_value', '$1,000 USD (~35,000 THB)') },
    { label: t('loi.share_minimum_label', 'Minimum'), value: t('loi.share_minimum_value', '1 share per property') },
    { label: t('loi.share_maximum_label', 'Maximum'), value: t('loi.share_maximum_value', '10 shares per property') },
    { label: t('loi.share_voting_label', 'Voting'), value: t('loi.share_voting_value', '1 property = 1 vote') },
    { label: t('loi.share_dividends_label', 'Dividends'), value: t('loi.share_dividends_value', 'Proportional to shares held') },
    { label: t('loi.share_transferable_label', 'Transferable'), value: t('loi.share_transferable_value', 'Yes — freely transferable') },
  ]

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        email: profile.email || '',
      }))
    }
  }, [profile])

  async function handleSign() {
    setLoading(true)
    try {
      // Generate reference code
      const refCode = `STAYLO-LOI-KPG-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`

      // Get user's first property or create a placeholder
      let propertyId = null
      if (user) {
        const { data: props } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (props && props.length > 0) {
          propertyId = props[0].id
        }
      }

      if (user && propertyId) {
        await supabase.from('shares').insert({
          user_id: user.id,
          property_id: propertyId,
          quantity: shares,
          price_per_share: 1000,
          loi_signed: true,
          loi_signed_at: new Date().toISOString(),
          reference_code: refCode,
        })
      }

      setStep('done')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-libre" />
        </div>
        <h2 className="text-3xl font-bold text-deep mb-3">{t('loi.done_title', 'Letter of Intent Signed')}</h2>
        <p className="text-gray-500 mb-8">
          {t('loi.done_welcome', 'Welcome to the founding partners of Staylo. You\'ve reserved')}{' '}
          <span className="font-bold text-libre">{shares} {t('loi.share_unit', { count: shares, defaultValue: 'share' })}{shares > 1 ? 's' : ''}</span>{' '}
          (${(shares * 1000).toLocaleString()}).
          {' '}{t('loi.done_contact', 'We\'ll reach out within 48 hours with your full partnership agreement.')}
        </p>
        <div className="bg-deep/5 rounded-2xl p-6 mb-8 text-left">
          <h4 className="font-semibold text-deep mb-3">{t('loi.done_next_title', 'What happens next:')}</h4>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-3"><span className="font-bold text-ocean">1.</span> {t('loi.done_step1', 'We review your LOI (24-48h)')}</li>
            <li className="flex gap-3"><span className="font-bold text-ocean">2.</span> {t('loi.done_step2', 'Full partnership contract sent for signature')}</li>
            <li className="flex gap-3"><span className="font-bold text-ocean">3.</span> {t('loi.done_step3', 'Share payment processed')}</li>
            <li className="flex gap-3"><span className="font-bold text-ocean">4.</span> {t('loi.done_step4', 'You\'re officially a Staylo founding partner')}</li>
          </ol>
        </div>
        <Button onClick={() => navigate('/dashboard')} size="lg">
          {t('loi.done_dashboard', 'Go to Dashboard')}
          <ArrowRight size={18} />
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-ocean/10 text-ocean px-4 py-2 rounded-full text-sm font-medium mb-4">
          <FileText size={16} />
          {t('loi.badge', 'Non-binding Letter of Intent')}
        </div>
        <h1 className="text-4xl font-bold text-deep mb-3">
          {t('loi.title', 'Become a Founding Partner')}
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          {t('loi.subtitle', 'Sign this letter of intent to claim your place in the movement. No payment required now — just your commitment to building something that\'s truly ours.')}
        </p>
      </div>

      {/* Share structure overview */}
      {step === 'info' && (
        <>
          <Card className="p-8 mb-8">
            <h3 className="text-xl font-bold text-deep mb-6 flex items-center gap-2">
              <Shield size={22} className="text-ocean" />
              {t('loi.structure_title', 'Share Structure — Alpha Phase')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {shareDetails.map(item => (
                <div key={item.label} className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">{item.label}</span>
                  <span className="font-medium text-deep text-sm">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-ocean/5 rounded-2xl p-5 text-center">
                <Users size={24} className="text-ocean mx-auto mb-2" />
                <p className="text-2xl font-bold text-deep">3,000</p>
                <p className="text-xs text-gray-500">{t('loi.alpha_shares', 'Alpha shares available')}</p>
              </div>
              <div className="bg-libre/5 rounded-2xl p-5 text-center">
                <TrendingUp size={24} className="text-libre mx-auto mb-2" />
                <p className="text-2xl font-bold text-deep">~5.9x</p>
                <p className="text-xs text-gray-500">{t('loi.avg_roi', 'Average ROI year 1')}</p>
              </div>
              <div className="bg-sunset/5 rounded-2xl p-5 text-center">
                <Shield size={24} className="text-sunset mx-auto mb-2" />
                <p className="text-2xl font-bold text-deep">10%</p>
                <p className="text-xs text-gray-500">{t('loi.commission_compare', 'Commission (vs 17-22%)')}</p>
              </div>
            </div>
          </Card>

          {/* Ambassador Recruitment Clause */}
          <Card className="p-8 mb-8 border-2 border-golden/20 bg-gradient-to-br from-white to-golden/5">
            <h3 className="text-xl font-bold text-deep mb-4 flex items-center gap-2">
              <Users size={22} className="text-golden" />
              {t('loi.ambassador_clause_title', 'Ambassador Recruitment Program')}
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {t('loi.ambassador_clause_intro', 'As a Founding Partner, you agree to participate in the Staylo Ambassador recruitment program. This is a core part of our growth strategy and your partnership.')}
            </p>

            <div className="space-y-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-golden/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-golden font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-semibold text-deep text-sm">{t('loi.ambassador_clause_step1_title', 'Personalized Welcome Kit')}</p>
                  <p className="text-xs text-gray-500">{t('loi.ambassador_clause_step1_desc', 'You receive a free branded kit with your unique QR code: reception stand, room cards, WiFi cards, window sticker, and founding partner certificate.')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-golden/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-golden font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-semibold text-deep text-sm">{t('loi.ambassador_clause_step2_title', 'QR Code on All Guest Touchpoints')}</p>
                  <p className="text-xs text-gray-500">{t('loi.ambassador_clause_step2_desc', 'Your personalized QR code is displayed at check-out, in rooms, on invoices, and on WiFi cards. Guests scan it to discover Staylo.')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-golden/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-golden font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-semibold text-deep text-sm">{t('loi.ambassador_clause_step3_title', 'Guest Becomes Ambassador')}</p>
                  <p className="text-xs text-gray-500">{t('loi.ambassador_clause_step3_desc', 'When a guest scans your QR, they get 1 free night on their first Staylo booking. If they recommend a hotel that joins, they earn 2% for life — and you helped grow the network.')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-golden/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-golden font-bold text-sm">4</span>
                </div>
                <div>
                  <p className="font-semibold text-deep text-sm">{t('loi.ambassador_clause_step4_title', 'Kit Refills at Cost')}</p>
                  <p className="text-xs text-gray-500">{t('loi.ambassador_clause_step4_desc', 'Replacement kits are available at cost via your dashboard. Print-on-demand, shipped locally — no stock needed.')}</p>
                </div>
              </div>
            </div>

            <div className="bg-golden/10 rounded-xl p-4">
              <p className="text-xs text-gray-600 italic leading-relaxed">
                {t('loi.ambassador_clause_legal', 'By signing this LOI, you acknowledge that displaying the Staylo QR code at guest touchpoints is part of the founding partner agreement. This helps grow the platform organically and increases the value of your shares. The first personalized kit is provided free of charge.')}
              </p>
            </div>
          </Card>

          <div className="text-center">
            <Button onClick={() => setStep('form')} size="lg">
              {t('loi.cta_sign', 'I\'m in — Let me sign the LOI')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </>
      )}

      {/* Form + signing */}
      {step === 'form' && (
        <Card className="p-8">
          <h3 className="text-xl font-bold text-deep mb-6">{t('loi.form_title', 'Your Information')}</h3>

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-sm font-medium text-deep mb-2">{t('loi.label_full_name', 'Full name')}</label>
              <Input
                placeholder={t('loi.placeholder_full_name', 'Your full name')}
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-deep mb-2">{t('loi.label_property_name', 'Property name')}</label>
              <Input
                placeholder={t('loi.placeholder_property_name', 'e.g. Sunset Beach Resort')}
                value={formData.property_name}
                onChange={e => setFormData(prev => ({ ...prev, property_name: e.target.value }))}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-deep mb-2">{t('loi.label_email', 'Email')}</label>
                <Input
                  type="email"
                  placeholder={t('loi.placeholder_email', 'you@hotel.com')}
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-deep mb-2">{t('loi.label_phone', 'Phone (optional)')}</label>
                <Input
                  placeholder={t('loi.placeholder_phone', '+66...')}
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Share quantity selector */}
            <div>
              <label className="block text-sm font-medium text-deep mb-3">
                {t('loi.label_shares', 'Number of shares to reserve')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setShares(n)}
                    className={`px-5 py-3 rounded-xl border-2 font-semibold transition-all ${
                      shares === n
                        ? 'border-ocean bg-ocean/5 text-ocean'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {n} {n > 1 ? t('loi.shares_plural', 'shares') : t('loi.shares_singular', 'share')}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {t('loi.total_label', 'Total:')} <span className="font-bold text-deep">${(shares * 1000).toLocaleString()}</span>
              </p>
            </div>
          </div>

          {/* Agreement checkbox area */}
          <div className="bg-cream rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('loi.agreement_text', 'By signing this Letter of Intent, I express my non-binding interest in becoming a founding partner of Staylo. I understand that this LOI is not a contract and does not commit me financially. The full partnership agreement will be sent separately for review and signature.')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('info')}>
              {t('loi.back', 'Back')}
            </Button>
            <Button
              variant="green"
              onClick={handleSign}
              disabled={loading || !formData.full_name || !formData.email}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('loi.signing', 'Signing...')}
                </>
              ) : (
                <>
                  {t('loi.sign_button', 'Sign Letter of Intent')}
                  <FileText size={18} />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
