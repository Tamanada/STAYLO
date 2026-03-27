import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Globe, ThumbsDown, Heart, MapPin, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'

const platformOptions = [
  { key: 'booking', label: 'Booking.com', emoji: '🟦' },
  { key: 'airbnb', label: 'Airbnb', emoji: '🏠' },
  { key: 'expedia', label: 'Expedia', emoji: '🟡' },
  { key: 'google', label: 'Google Hotels', emoji: '🔍' },
  { key: 'agoda', label: 'Agoda', emoji: '🔴' },
  { key: 'direct', label: 'Direct with hotel', emoji: '🏨' },
  { key: 'other', label: 'Other', emoji: '📱' },
]

const frustrationOptions = [
  { key: 'high_prices', emoji: '💸' },
  { key: 'hidden_fees', emoji: '🔒' },
  { key: 'fake_reviews', emoji: '⭐' },
  { key: 'no_contact', emoji: '📞' },
  { key: 'generic_experience', emoji: '🏗️' },
  { key: 'poor_support', emoji: '😤' },
  { key: 'cancellation_policy', emoji: '❌' },
  { key: 'no_loyalty', emoji: '💔' },
]

const directBookingOptions = ['yes_absolutely', 'maybe', 'dont_care']

export default function SurveyTraveler() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const totalSteps = 5

  const [answers, setAnswers] = useState({
    platforms: [],
    frustrations: [],
    direct_booking: '',
    hotels_per_year: 3,
  })

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function toggleItem(field, key) {
    setAnswers(prev => ({
      ...prev,
      [field]: prev[field].includes(key)
        ? prev[field].filter(f => f !== key)
        : [...prev[field], key],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await supabase.from('survey_answers').insert({
        user_id: user?.id || null,
        platforms_used: answers.platforms,
        monthly_commission: 0,
        commission_pct: 0,
        ota_dependency: answers.direct_booking,
        biggest_frustration: answers.frustrations.join(', '),
        interest_score: answers.direct_booking === 'yes_absolutely' ? 9 : answers.direct_booking === 'maybe' ? 6 : 3,
        would_join: true,
        intended_investment: 0,
        room_count: answers.hotels_per_year,
        property_name: 'traveler_survey',
        contact_email: user?.email || '',
      })
      trackEvent(EVENTS.SURVEY_COMPLETE, { type: 'traveler' })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
    setStep(5)
  }

  const stepIcons = [Globe, ThumbsDown, Heart, MapPin, Sparkles]
  const StepIcon = stepIcons[step - 1] || Sparkles

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">
          {t('survey_traveler.title', 'Traveler Survey')}
        </h1>
        <p className="text-gray-500">
          {t('survey_traveler.subtitle', 'Help us build a better booking experience for you.')}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-3">
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                s === step
                  ? 'bg-gradient-to-r from-sunset to-sunrise text-white scale-110 shadow-lg shadow-sunset/30'
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

      {/* Progress */}
      <div className="mb-8 text-center">
        <span className="text-sm text-gray-400">
          {t('survey.progress', 'Step {{current}} of {{total}}', { current: Math.min(step, totalSteps), total: totalSteps })}
        </span>
      </div>

      {/* Step 1: How do you book? */}
      {step === 1 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep">
              {t('survey_traveler.step1_title', 'How do you usually book hotels?')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('survey_traveler.step1_subtitle', 'Select all that apply.')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {platformOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggleItem('platforms', opt.key)}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  answers.platforms.includes(opt.key)
                    ? 'border-sunset bg-sunset/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mr-2">{opt.emoji}</span>
                <span className="font-medium text-deep text-sm">
                  {t(`survey_traveler.platform_${opt.key}`, opt.label)}
                </span>
              </button>
            ))}
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={answers.platforms.length === 0}
            className="w-full"
          >
            {t('survey.next', 'Next')} <ArrowRight size={18} className="ml-2" />
          </Button>
        </Card>
      )}

      {/* Step 2: Frustrations */}
      {step === 2 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ThumbsDown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep">
              {t('survey_traveler.step2_title', 'What frustrates you most about booking platforms?')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('survey_traveler.step2_subtitle', 'Select all that apply.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {frustrationOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggleItem('frustrations', opt.key)}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  answers.frustrations.includes(opt.key)
                    ? 'border-sunset bg-sunset/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mr-2">{opt.emoji}</span>
                <span className="font-medium text-deep text-sm">
                  {t(`survey_traveler.frustration_${opt.key}`, opt.key.replace(/_/g, ' '))}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft size={18} className="mr-2" /> {t('survey.back', 'Back')}
            </Button>
            <Button onClick={() => setStep(3)} disabled={answers.frustrations.length === 0} className="flex-1">
              {t('survey.next', 'Next')} <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Direct booking preference */}
      {step === 3 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep">
              {t('survey_traveler.step3_title', 'Would you prefer booking directly with the hotel if the price was the same or lower?')}
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {directBookingOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setAnswers(prev => ({ ...prev, direct_booking: opt }))}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  answers.direct_booking === opt
                    ? 'border-sunset bg-sunset/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-deep">
                  {t(`survey_traveler.direct_${opt}`, opt.replace(/_/g, ' '))}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft size={18} className="mr-2" /> {t('survey.back', 'Back')}
            </Button>
            <Button onClick={() => setStep(4)} disabled={!answers.direct_booking} className="flex-1">
              {t('survey.next', 'Next')} <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Hotels per year */}
      {step === 4 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep">
              {t('survey_traveler.step4_title', 'How many hotels do you book per year?')}
            </h2>
          </div>

          <div className="text-center mb-6">
            <p className="text-5xl font-black text-gradient mb-2">{answers.hotels_per_year}</p>
            <p className="text-sm text-gray-400">
              {t('survey_traveler.hotels_label', 'hotels per year')}
            </p>
          </div>

          <input
            type="range"
            min="1"
            max="30"
            value={answers.hotels_per_year}
            onChange={e => setAnswers(prev => ({ ...prev, hotels_per_year: parseInt(e.target.value) }))}
            className="w-full mb-2 accent-sunset"
          />
          <div className="flex justify-between text-xs text-gray-400 mb-8">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>30+</span>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
              <ArrowLeft size={18} className="mr-2" /> {t('survey.back', 'Back')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? t('common.loading', 'Loading...') : t('survey.next', 'Next')} <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: The Hook — Ambassador CTA */}
      {step === 5 && (
        <div className="text-center">
          <Card className="p-10 bg-gradient-to-br from-deep via-deep to-ocean/90 border-0 text-white">
            <div className="w-20 h-20 bg-gradient-to-br from-golden to-sunrise rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
              {t('survey_traveler.hook_title', 'Thank you for your answers!')}
            </h2>

            <p className="text-white/70 text-lg mb-6">
              {t('survey_traveler.hook_subtitle', 'You book hotels. You know good ones. You recommend them to friends.')}
            </p>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-2xl sm:text-3xl font-extrabold text-golden mb-2">
                {t('survey_traveler.hook_question', 'What if you could earn lifetime passive income on every hotel you bring to Staylo?')}
              </p>
              <p className="text-white/60 text-sm">
                {t('survey_traveler.hook_detail', 'Earn 2% of all bookings, forever. No investment needed. Just spread the word.')}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/ambassador/register')}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-golden to-sunrise text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                {t('survey_traveler.cta_ambassador', 'Become an Ambassador')}
                <ArrowRight size={20} />
              </button>

              <div>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer"
                >
                  {t('survey_traveler.cta_skip', 'Maybe later')}
                </button>
              </div>
            </div>
          </Card>

          {/* Social proof */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏨</span>
              <span>{t('survey_traveler.proof_hotels', '127+ hotels already listed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span>{t('survey_traveler.proof_earn', '2% lifetime earnings')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
