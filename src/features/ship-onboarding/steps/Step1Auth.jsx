/*
  Step 1 — Auth
  =============
  Creates the auth.users row via supabase.auth.signUp. We do NOT create the
  STAYLO-side `users` row here (referral_code / full_name are STAYLO-specific
  and irrelevant to SHIP customers). The ship_hotels + ship_hotel_members
  rows are created after Step 3 (property type) when we have enough data.

  Behavior:
    - If email already exists → clear message + link to /login (SHIP-scoped
      later, /login for now shares STAYLO's auth session)
    - Password rules: 8+ chars, at least 1 letter + 1 digit
    - Session may or may not be immediate depending on Supabase project
      email-confirm setting. We proceed to step 2 either way — if a session
      is present we have userId, if not we mark `pendingEmailConfirm` and
      handle that in step 3 (defer hotel INSERT until session lands).
*/
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
function validPassword(s) {
  return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s)
}

export default function Step1Auth({ data, patch, goNext }) {
  const [emailInput, setEmailInput] = useState(data.email)
  const [passwordInput, setPasswordInput] = useState(data.password)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const emailOk = validEmail(emailInput)
  const passwordOk = validPassword(passwordInput)
  const canSubmit = emailOk && passwordOk && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setSubmitting(true)

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: emailInput.trim(),
        password: passwordInput,
        options: {
          emailRedirectTo: window.location.origin + '/ship-signup',
        },
      })

      if (authErr) {
        if (authErr.message.toLowerCase().includes('already')) {
          setError('This email is already registered. Try logging in instead.')
        } else {
          setError(authErr.message)
        }
        setSubmitting(false)
        return
      }

      patch({
        email: emailInput.trim(),
        password: passwordInput,
        userId: authData.user?.id || null,
      })
      goNext()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-black text-3xl sm:text-4xl mb-3" style={{
          color: '#1A1A2E', letterSpacing: '-0.8px',
        }}>
          Let's get you set up.
        </h1>
        <p className="text-gray-500">
          14 days free · no credit card · cancel any time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Your work email
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@yourhotel.com"
              autoFocus
              autoComplete="email"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base"
              style={{ borderColor: '#E8E0D8', background: 'white' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="At least 8 characters, 1 letter + 1 digit"
              autoComplete="new-password"
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 outline-none transition-colors text-base"
              style={{ borderColor: '#E8E0D8', background: 'white' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            />
            <button type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
              style={{ color: '#8892A0' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B00'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8892A0'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password rules — inline live feedback */}
          {passwordInput.length > 0 && (
            <div className="mt-2 text-xs" style={{
              color: passwordOk ? '#00B894' : '#8892A0',
            }}>
              {passwordOk
                ? '✓ Strong enough'
                : `${passwordInput.length < 8 ? 'Need 8+ chars. ' : ''}${!/[A-Za-z]/.test(passwordInput) ? 'Need a letter. ' : ''}${!/\d/.test(passwordInput) ? 'Need a digit.' : ''}`}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl flex items-start gap-2 text-sm" style={{
            background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5',
          }}>
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2.4} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-2 py-4 rounded-xl font-black text-white text-base transition-all flex items-center justify-center gap-2"
          style={{
            background: canSubmit
              ? 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)'
              : '#E8E0D8',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 12px 32px rgba(255,31,112,0.35)' : 'none',
            opacity: submitting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {submitting ? 'Creating account…' : (
            <>Continue <ArrowRight size={18} strokeWidth={2.8} /></>
          )}
        </button>

        <div className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/login" className="font-bold" style={{ color: '#FF6B00' }}>
            Log in
          </a>
        </div>
      </form>
    </div>
  )
}
