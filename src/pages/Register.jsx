import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { trackEvent, EVENTS } from '../lib/analytics'

export default function Register() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, fullName, refCode)
      trackEvent(EVENTS.SIGNUP, { referred: !!refCode })
      navigate('/survey')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">{t('auth.register_title')}</h1>
        <p className="text-gray-500">{t('auth.register_subtitle')}</p>
      </div>

      <Card className="p-8">
        {refCode && (
          <div className="mb-5">
            <Badge variant="green">{t('auth.referred_by', { code: refCode })}</Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Input
            label={t('auth.full_name')}
            placeholder={t('auth.full_name_placeholder')}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />

          <Input
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <Input
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.password_placeholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <Button type="submit" variant="green" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.register_button')}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          {t('auth.have_account')}{' '}
          <Link to="/login" className="text-ocean font-medium hover:underline">
            {t('auth.login_link')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
