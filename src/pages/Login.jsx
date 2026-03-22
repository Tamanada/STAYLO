import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">{t('auth.login_title')}</h1>
        <p className="text-gray-500">{t('auth.login_subtitle')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

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
            required
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.login_button')}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          {t('auth.no_account')}{' '}
          <Link to="/register" className="text-ocean font-medium hover:underline">
            {t('auth.register_link')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
