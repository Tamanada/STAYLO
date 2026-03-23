import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { generateAmbassadorCode } from '../lib/referral'

export default function AmbassadorRegister() {
  const navigate = useNavigate()

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
        <h1 className="text-3xl font-bold text-deep mb-2">Become a Staylo Ambassador</h1>
        <p className="text-gray-500">Join our ambassador program and earn rewards for every referral.</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+66 812 345 678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <Input
            label="Country"
            placeholder="e.g. Thailand"
            value={country}
            onChange={e => setCountry(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <Button type="submit" variant="green" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Register as Ambassador'}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-ocean font-medium hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}
