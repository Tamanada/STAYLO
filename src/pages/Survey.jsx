import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Textarea } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'

const platforms = ['booking', 'airbnb', 'expedia', 'agoda', 'tripadvisor', 'direct', 'other']

export default function Survey() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [answers, setAnswers] = useState({
    platforms_used: [],
    commission_pct: 15,
    biggest_frustration: '',
    interest_score: 7,
    would_join: true,
    room_count: 10,
  })

  const totalSteps = 6

  function togglePlatform(p) {
    setAnswers(prev => ({
      ...prev,
      platforms_used: prev.platforms_used.includes(p)
        ? prev.platforms_used.filter(x => x !== p)
        : [...prev.platforms_used, p],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await supabase.from('survey_answers').insert({
        user_id: user?.id || null,
        ...answers,
      })
      trackEvent(EVENTS.SURVEY_COMPLETE, { interest: answers.interest_score })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle size={64} className="mx-auto text-libre mb-6" />
        <h2 className="text-3xl font-bold text-deep mb-3">{t('survey.success_title')}</h2>
        <p className="text-gray-500 mb-8">{t('survey.success_message')}</p>
        <Button onClick={() => navigate('/submit')}>
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

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{t('survey.progress', { current: step, total: totalSteps })}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div
            className="h-2 bg-gradient-to-r from-ocean to-electric rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-8">
        {/* Step 1: Platforms */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-4">{t('survey.q1')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    answers.platforms_used.includes(p)
                      ? 'border-ocean bg-ocean/5 text-ocean'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(`survey.q1_options.${p}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Commission */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-4">{t('survey.q2')}</h3>
            <div className="text-center">
              <span className="text-5xl font-bold text-sunrise">{answers.commission_pct}%</span>
              <input
                type="range"
                min={5}
                max={30}
                value={answers.commission_pct}
                onChange={e => setAnswers(prev => ({ ...prev, commission_pct: Number(e.target.value) }))}
                className="w-full mt-6 accent-activity-orange"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span>15%</span>
                <span>25%</span>
                <span>30%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Frustration */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-4">{t('survey.q3')}</h3>
            <Textarea
              placeholder={t('survey.q3_placeholder')}
              value={answers.biggest_frustration}
              onChange={e => setAnswers(prev => ({ ...prev, biggest_frustration: e.target.value }))}
            />
          </div>
        )}

        {/* Step 4: Interest score */}
        {step === 4 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-6">{t('survey.q4')}</h3>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setAnswers(prev => ({ ...prev, interest_score: n }))}
                  className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                    answers.interest_score === n
                      ? 'bg-staylo-blue text-white scale-110'
                      : answers.interest_score > n
                        ? 'bg-staylo-blue/10 text-staylo-blue'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Would join */}
        {step === 5 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-4">{t('survey.q5')}</h3>
            <div className="space-y-3">
              <button
                onClick={() => setAnswers(prev => ({ ...prev, would_join: true }))}
                className={`w-full px-6 py-4 rounded-xl border text-left font-medium transition-all ${
                  answers.would_join
                    ? 'border-libre bg-libre/5 text-libre'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t('survey.q5_yes')}
              </button>
              <button
                onClick={() => setAnswers(prev => ({ ...prev, would_join: false }))}
                className={`w-full px-6 py-4 rounded-xl border text-left font-medium transition-all ${
                  !answers.would_join
                    ? 'border-sunset bg-sunset/5 text-sunset'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t('survey.q5_no')}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Room count */}
        {step === 6 && (
          <div>
            <h3 className="text-lg font-semibold text-deep mb-4">{t('survey.q6')}</h3>
            <Input
              type="number"
              value={answers.room_count}
              onChange={e => setAnswers(prev => ({ ...prev, room_count: Number(e.target.value) || 1 }))}
              min={1}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={16} />
              {t('survey.back')}
            </Button>
          ) : <div />}

          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)}>
              {t('survey.next')}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="green" onClick={handleSubmit} disabled={loading}>
              {loading ? t('common.loading') : t('survey.submit')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
