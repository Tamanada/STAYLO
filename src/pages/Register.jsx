import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'

export default function Register() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const ambCode = searchParams.get('amb')
  const referralCode = refCode || ambCode

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
      await signUp(email, password, fullName, referralCode)
      trackEvent(EVENTS.SIGNUP, { referred: !!referralCode, ambassador: !!ambCode })
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
        {referralCode && (
          <div className="mb-5 p-3 bg-libre/5 border border-libre/20 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">{ambCode ? t('auth.referred_by_ambassador', 'Referred by Ambassador') : t('auth.referred_by', 'Referred by')}</p>
            <p className="font-mono font-bold text-libre text-sm">{referralCode}</p>
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

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">{t('auth.or_continue', 'or continue with')}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social login buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-sm font-medium text-gray-600">Google</span>
          </button>

          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin + '/dashboard' } })}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-[#1877F2] hover:bg-blue-50 transition-all cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="text-sm font-medium text-gray-600">Facebook</span>
          </button>

          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'twitter', options: { redirectTo: window.location.origin + '/dashboard' } })}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-800 hover:bg-gray-50 transition-all cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-sm font-medium text-gray-600">X</span>
          </button>
        </div>

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
