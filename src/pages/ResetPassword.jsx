import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('reset.error_min', 'Password must be at least 8 characters'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('reset.error_match', 'Passwords do not match'))
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 3000)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-libre" />
        </div>
        <h2 className="text-2xl font-bold text-deep mb-3">
          {t('reset.success_title', 'Password updated!')}
        </h2>
        <p className="text-gray-500">
          {t('reset.success_msg', 'Redirecting to your dashboard...')}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-electric/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-electric" />
          </div>
          <h1 className="text-2xl font-bold text-deep mb-2">
            {t('reset.title', 'Create new password')}
          </h1>
          <p className="text-gray-500 text-sm">
            {t('reset.subtitle', 'Enter your new password below')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep mb-1">
              {t('reset.new_password', 'New password')}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('reset.password_placeholder', 'Min. 8 characters')}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-deep"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-deep mb-1">
              {t('reset.confirm_password', 'Confirm password')}
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('reset.confirm_placeholder', 'Type password again')}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t('common.loading', 'Loading...')
              : t('reset.submit', 'Update password')
            }
          </Button>
        </form>
      </Card>
    </div>
  )
}
