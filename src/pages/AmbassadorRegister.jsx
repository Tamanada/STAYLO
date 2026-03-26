import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { generateAmbassadorCode } from '../lib/referral'

export default function AmbassadorRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // If user is already logged in, register them as ambassador directly
  useEffect(() => {
    if (!user) return

    async function registerExistingUser() {
      // Check if already an ambassador
      const { data: existing } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        navigate('/dashboard/ambassador')
        return
      }

      // Auto-register as ambassador
      const referralCode = generateAmbassadorCode()
      const { error } = await supabase.from('ambassadors').insert({
        user_id: user.id,
        full_name: profile?.full_name || user.email?.split('@')[0],
        email: user.email,
        referral_code: referralCode,
      })

      if (!error) {
        navigate('/dashboard/ambassador')
      }
    }

    registerExistingUser()
  }, [user])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      const userId = data.user?.id
      if (!userId) throw new Error('Signup succeeded but no user ID returned.')

      const referralCode = generateAmbassadorCode()

      const { error: insertError } = await supabase
        .from('ambassadors')
        .insert({
          user_id: userId,
          full_name: fullName,
          email,
          phone: phone || null,
          country,
          referral_code: referralCode,
        })

      if (insertError) throw insertError

      navigate('/ambassador/dashboard')
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">{t('ambassador_register.title', 'Become a Staylo Ambassador')}</h1>
        <p className="text-gray-500">{t('ambassador_register.subtitle', 'Join the movement and earn rewards for every hotel you bring into the family.')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Input
            label={t('ambassador_register.label_full_name', 'Full Name')}
            placeholder={t('ambassador_register.placeholder_full_name', 'Enter your full name')}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />

          <Input
            label={t('ambassador_register.label_email', 'Email')}
            type="email"
            placeholder={t('ambassador_register.placeholder_email', 'you@example.com')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <Input
            label={t('ambassador_register.label_phone', 'Phone (optional)')}
            type="tel"
            placeholder={t('ambassador_register.placeholder_phone', '+66 812 345 678')}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <Input
            label={t('ambassador_register.label_country', 'Country')}
            placeholder={t('ambassador_register.placeholder_country', 'e.g. Thailand')}
            value={country}
            onChange={e => setCountry(e.target.value)}
            required
          />

          <Input
            label={t('ambassador_register.label_password', 'Password')}
            type="password"
            placeholder={t('ambassador_register.placeholder_password', 'Min. 8 characters')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <Button type="submit" variant="green" className="w-full" disabled={loading}>
            {loading ? t('ambassador_register.creating', 'Creating account...') : t('ambassador_register.submit', 'Register as Ambassador')}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          {t('ambassador_register.already_registered', 'Already registered?')}{' '}
          <Link to="/login" className="text-ocean font-medium hover:underline">
            {t('ambassador_register.login', 'Log in')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
