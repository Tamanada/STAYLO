// ============================================
// /verify-email — landing page after signup + magic-link target
// ============================================
// Three states this page handles:
//
//   1. User just signed up (email/password) — show "check your inbox" with
//      a "Resend email" button. Polls auth state in case they verify in a
//      different tab and come back here.
//
//   2. User clicked the magic link in their email — Supabase JS client
//      auto-parses the URL hash, the session updates, emailVerified flips
//      to true. We auto-redirect to ?next (or /dashboard).
//
//   3. User landed here already verified (e.g. clicked a stale link, or
//      came back via OAuth which auto-verifies) — same auto-redirect.
//
// Reads ?next= for the eventual destination so booking / property /
// share-purchase flows that bounced an unverified user back here can
// continue where they left off.
// ============================================
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Mail, CheckCircle2, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { safeNext } from '../lib/safeNext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const { user, emailVerified, resendVerificationEmail, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState(null) // null | 'sent' | 'rate_limit' | 'error'
  const [resendError, setResendError] = useState('')

  // As soon as the email becomes verified — or if it already was on arrival —
  // bounce the user to where they were trying to go.
  useEffect(() => {
    if (loading) return
    if (emailVerified) {
      // Tiny delay so the user sees the "verified!" check before redirecting
      const timer = setTimeout(() => navigate(next, { replace: true }), 800)
      return () => clearTimeout(timer)
    }
  }, [emailVerified, loading, next, navigate])

  // No session at all → the magic link expired or they hit the URL directly.
  // Send them to /login with the ?next preserved.
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login?next=' + encodeURIComponent('/verify-email?next=' + next), { replace: true })
    }
  }, [user, loading, next, navigate])

  async function handleResend() {
    setResending(true)
    setResendStatus(null)
    setResendError('')
    try {
      await resendVerificationEmail()
      setResendStatus('sent')
    } catch (err) {
      // Supabase rate-limit error message contains "rate limit" or HTTP 429
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
        setResendStatus('rate_limit')
      } else {
        setResendStatus('error')
        setResendError(err?.message || 'Unknown error')
      }
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  // === State 2/3 — already verified, about to redirect ===
  if (emailVerified) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-deep mb-2">
            {t('verify.success_title', 'Email verified!')}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {t('verify.success_desc', 'Taking you back to where you were…')}
          </p>
          <Link to={next} className="text-ocean text-sm font-medium hover:underline">
            {t('verify.continue', 'Continue now →')}
          </Link>
        </Card>
      </div>
    )
  }

  // === State 1 — pending verification, show the "check your inbox" UI ===
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-ocean/10 flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-ocean" />
          </div>
          <h1 className="text-2xl font-bold text-deep mb-2">
            {t('verify.pending_title', 'Check your inbox')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('verify.pending_desc', 'We sent a confirmation link to')}
            <br />
            <strong className="text-deep">{user?.email}</strong>
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 mb-6">
          {t('verify.tip', 'Click the link in the email to activate your account. Check your spam folder if you don\'t see it within a couple of minutes.')}
        </div>

        {/* Resend button + feedback */}
        {resendStatus === 'sent' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {t('verify.resent', 'Email re-sent. Check your inbox.')}
          </div>
        )}
        {resendStatus === 'rate_limit' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
            {t('verify.rate_limit', 'Please wait a minute before requesting another email.')}
          </div>
        )}
        {resendStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
            {resendError}
          </div>
        )}

        <Button
          onClick={handleResend}
          disabled={resending}
          variant="secondary"
          className="w-full mb-3 flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
          {resending
            ? t('verify.resending', 'Sending…')
            : t('verify.resend_button', 'Resend confirmation email')}
        </Button>

        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full text-xs text-gray-400 hover:text-deep py-2 flex items-center justify-center gap-1.5 transition-colors"
        >
          <LogOut size={12} />
          {t('verify.wrong_email', 'Wrong email? Sign out and try again')}
        </button>
      </Card>
    </div>
  )
}
