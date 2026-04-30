// ============================================
// <EmailVerificationGate> — wraps sensitive flows
// ============================================
// Renders children only if the user is signed in AND has a verified email.
// Otherwise shows a friendly prompt with a "Verify email" button that
// routes to /verify-email?next=<current-url> so the user comes back here
// after confirming.
//
// Usage:
//   <EmailVerificationGate reason="to complete a booking">
//     <CheckoutForm />
//   </EmailVerificationGate>
//
// Loading state: renders nothing until auth resolves to avoid flash of gate.
// ============================================
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export default function EmailVerificationGate({ children, reason }) {
  const { t } = useTranslation()
  const { user, emailVerified, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  // Not signed in — let the route's own auth check handle that.
  // (Most pages already redirect to /login when !user.)
  if (!user) return children

  if (emailVerified) return children

  const verifyHref = '/verify-email?next=' + encodeURIComponent(location.pathname + location.search)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Mail size={32} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-deep mb-2">
          {t('verify.gate_title', 'Verify your email first')}
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          {reason
            ? t('verify.gate_reason', 'You need a verified email')  + ' ' + reason + '.'
            : t('verify.gate_generic', 'You need a verified email to continue.')}
        </p>
        <p className="text-xs text-gray-400 mb-6 flex items-center justify-center gap-1.5">
          <AlertCircle size={12} />
          {t('verify.gate_security', 'This protects you and the hoteliers you interact with.')}
        </p>
        <Link to={verifyHref}>
          <Button>
            {t('verify.gate_button', 'Verify my email')}
          </Button>
        </Link>
      </Card>
    </div>
  )
}
