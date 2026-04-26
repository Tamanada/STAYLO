// ============================================
// Dashboard — Banking & Payouts
// ============================================
// Hotelier-facing page that:
//   1. Shows their Stripe Connect account status
//   2. Triggers onboarding (or "complete onboarding") via the
//      `connect-onboarding` edge function
//   3. Re-syncs status from Stripe via the `connect-status` edge function
//
// Status state machine:
//   not_started → in_progress → active
//                            ↘ restricted (charges_enabled = false)
// ============================================
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  Banknote, CheckCircle2, AlertCircle, Loader2, ExternalLink,
  RefreshCw, Globe, Shield, Clock, ArrowRight
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { currencies, getCurrency } from '../../lib/currencies'

// Stripe Connect supports specific countries — list the most common.
// Full list: https://stripe.com/global
const SUPPORTED_COUNTRIES = [
  { code: 'TH', name: 'Thailand',          defaultCurrency: 'thb' },
  { code: 'FR', name: 'France',            defaultCurrency: 'eur' },
  { code: 'DE', name: 'Germany',           defaultCurrency: 'eur' },
  { code: 'GB', name: 'United Kingdom',    defaultCurrency: 'gbp' },
  { code: 'US', name: 'United States',     defaultCurrency: 'usd' },
  { code: 'SG', name: 'Singapore',         defaultCurrency: 'sgd' },
  { code: 'MY', name: 'Malaysia',          defaultCurrency: 'myr' },
  { code: 'ID', name: 'Indonesia',         defaultCurrency: 'idr' },
  { code: 'JP', name: 'Japan',             defaultCurrency: 'jpy' },
  { code: 'AU', name: 'Australia',         defaultCurrency: 'aud' },
  { code: 'IT', name: 'Italy',             defaultCurrency: 'eur' },
  { code: 'ES', name: 'Spain',             defaultCurrency: 'eur' },
  { code: 'NL', name: 'Netherlands',       defaultCurrency: 'eur' },
  { code: 'PT', name: 'Portugal',          defaultCurrency: 'eur' },
  { code: 'CA', name: 'Canada',            defaultCurrency: 'cad' },
]

function StatusBadge({ status }) {
  const variants = {
    active:      { bg: 'bg-libre/10',    text: 'text-libre',    icon: CheckCircle2, label: 'Active' },
    in_progress: { bg: 'bg-amber-50',    text: 'text-amber-700', icon: Clock,        label: 'In progress' },
    restricted:  { bg: 'bg-orange-50',   text: 'text-orange-700', icon: AlertCircle,  label: 'Restricted' },
    not_started: { bg: 'bg-gray-100',    text: 'text-gray-600',  icon: AlertCircle,  label: 'Not started' },
  }
  const v = variants[status] ?? variants.not_started
  const Icon = v.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${v.bg} ${v.text}`}>
      <Icon size={12} /> {v.label}
    </span>
  )
}

export default function Banking() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [country, setCountry] = useState('TH')

  const status = computeStatus(account)
  const returnedFromStripe = searchParams.get('status') === 'success'

  useEffect(() => {
    fetchStatus()
    // If we just came back from Stripe onboarding, clean the URL
    if (returnedFromStripe) {
      setTimeout(() => {
        searchParams.delete('status')
        setSearchParams(searchParams, { replace: true })
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchStatus() {
    setLoading(true)
    setError('')
    try {
      const res = await callFunction('connect-status', { sync: true })
      setAccount(res.has_account ? res : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function startOnboarding() {
    setActionLoading(true)
    setError('')
    try {
      const ctry = SUPPORTED_COUNTRIES.find(c => c.code === country)
      const res = await callFunction('connect-onboarding', {
        country,
        default_currency: ctry?.defaultCurrency ?? 'usd',
      })
      // Redirect to Stripe-hosted onboarding
      window.location.href = res.url
    } catch (err) {
      setError(err.message)
      setActionLoading(false)
    }
  }

  async function callFunction(name, body) {
    // supabase.functions.invoke automatically attaches the current session's
    // access_token in the Authorization header — no manual session juggling.
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (error) {
      // FunctionsHttpError carries the response body (with our error message)
      let detail = error.message
      try {
        const ctx = error.context
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json()
          if (body?.error) detail = body.error
        }
      } catch { /* ignore */ }
      throw new Error(detail || `Function ${name} failed`)
    }
    return data
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-orange" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* ── Header ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Banknote size={28} className="text-orange" />
            <h1 className="text-2xl sm:text-3xl font-bold text-deep">{t('banking.title', 'Banking & Payouts')}</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-xl">
            {t('banking.subtitle', 'Get paid in your local currency, directly to your bank account. Powered by Stripe Connect.')}
          </p>
        </div>
        {account && <StatusBadge status={status} />}
      </div>

      {returnedFromStripe && (
        <Card className="p-4 mb-6 bg-libre/5 border border-libre/20 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-libre flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-deep">{t('banking.returned_title', 'Welcome back from Stripe')}</p>
            <p className="text-gray-500">{t('banking.returned_desc', 'We are syncing your account status. This may take a few seconds.')}</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-900">{t('banking.error_title', 'Something went wrong')}</p>
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* ── State A: not started ─────────── */}
      {!account && (
        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-deep mb-2">{t('banking.start_title', 'Set up payouts to your bank')}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('banking.start_desc', 'STAYLO uses Stripe Connect Express to pay you securely. The setup takes 5 minutes — you only need your ID, business info, and bank details.')}
          </p>

          <div className="space-y-4 mb-6">
            <Step n={1} icon={Globe} text={t('banking.step1', 'Choose your country (defines your default currency).')} />
            <Step n={2} icon={Shield} text={t('banking.step2', 'Verify your identity on Stripe (ID + selfie).')} />
            <Step n={3} icon={Banknote} text={t('banking.step3', 'Add your bank account for payouts.')} />
            <Step n={4} icon={CheckCircle2} text={t('banking.step4', 'Done — start receiving 90% of every booking, paid the day after check-out.')} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('banking.country_label', 'Country of your business')}
            </label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-sm font-medium text-deep focus:outline-none focus:ring-2 focus:ring-orange">
              {SUPPORTED_COUNTRIES.map(c => {
                const cur = getCurrency(c.defaultCurrency.toUpperCase())
                return (
                  <option key={c.code} value={c.code}>
                    {c.name} — {cur.symbol} {cur.code}
                  </option>
                )
              })}
            </select>
          </div>

          <Button onClick={startOnboarding} disabled={actionLoading} size="lg" className="w-full sm:w-auto">
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
            {actionLoading ? t('banking.opening', 'Opening Stripe...') : t('banking.start_cta', 'Set up payouts on Stripe')}
            <ArrowRight size={18} />
          </Button>
        </Card>
      )}

      {/* ── State B: account exists ──────── */}
      {account && (
        <>
          <Card className="p-6 sm:p-8 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DetailRow label={t('banking.account_id', 'Stripe account ID')} value={account.account_id} mono />
              <DetailRow label={t('banking.country', 'Country')} value={account.country?.toUpperCase() ?? '—'} />
              <DetailRow label={t('banking.default_currency', 'Default currency')} value={account.default_currency?.toUpperCase() ?? '—'} />
              <DetailRow label={t('banking.last_synced', 'Last synced')} value={formatDate(account.last_synced_at)} />
            </div>

            <hr className="my-5 border-gray-100" />

            <div className="space-y-2">
              <Capability ok={account.details_submitted} label={t('banking.cap_details', 'Identity & business details submitted')} />
              <Capability ok={account.charges_enabled}   label={t('banking.cap_charges', 'Can accept charges from guests')} />
              <Capability ok={account.payouts_enabled}   label={t('banking.cap_payouts', 'Can receive payouts to bank')} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={fetchStatus} variant="secondary" disabled={loading}>
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {t('banking.refresh', 'Refresh status')}
              </Button>
              {status !== 'active' && (
                <Button onClick={startOnboarding} disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                  {t('banking.continue', 'Complete onboarding')}
                </Button>
              )}
            </div>
          </Card>

          {/* Status-specific messaging */}
          {status === 'active' && (
            <Card className="p-5 bg-libre/5 border border-libre/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-libre flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-deep mb-1">{t('banking.active_title', 'You are ready to receive payouts')}</p>
                  <p className="text-sm text-gray-600">
                    {t('banking.active_desc', '90% of every guest payment is transferred to your bank account 24 hours after the booking is confirmed (or sooner once the post-checkout questionnaire is wired in).')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {status === 'in_progress' && (
            <Card className="p-5 bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <Clock size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-deep mb-1">{t('banking.progress_title', 'Onboarding in progress')}</p>
                  <p className="text-sm text-gray-600">
                    {t('banking.progress_desc', 'Stripe is reviewing your information. You may need to provide additional documents — click "Complete onboarding" above to check what is missing.')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {status === 'restricted' && (
            <Card className="p-5 bg-orange-50 border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-orange-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-deep mb-1">{t('banking.restricted_title', 'Payouts are restricted')}</p>
                  <p className="text-sm text-gray-600">
                    {t('banking.restricted_desc', 'Stripe has restricted some capabilities of your account. Click "Complete onboarding" to resolve.')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center mt-8">
        {t('banking.footer', 'Secured by Stripe — STAYLO never sees your card or banking details.')}
      </p>
    </div>
  )
}

// ── Sub-components ──────────────────────
function Step({ n, icon: Icon, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-orange/10 text-orange flex items-center justify-center flex-shrink-0 font-bold text-sm">{n}</div>
      <div className="flex-1">
        <p className="text-sm text-deep flex items-center gap-2">
          <Icon size={14} className="text-gray-400" /> {text}
        </p>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-deep ${mono ? 'font-mono break-all' : 'font-medium'}`}>{value}</p>
    </div>
  )
}

function Capability({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok
        ? <CheckCircle2 size={16} className="text-libre flex-shrink-0" />
        : <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />}
      <span className={ok ? 'text-deep' : 'text-gray-500'}>{label}</span>
    </div>
  )
}

// ── Helpers ─────────────────────────────
function computeStatus(account) {
  if (!account) return 'not_started'
  if (account.charges_enabled && account.payouts_enabled) return 'active'
  if (account.details_submitted) return 'restricted'
  return 'in_progress'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch { return iso }
}
