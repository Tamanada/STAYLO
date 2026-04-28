// ============================================
// AmbassadorCommissionsWidget — chantier #10.3
// ============================================
// Embedded in AmbassadorDashboard (top of page) and shows:
//   - Counters: pending / ready to withdraw / paid all-time (BTC)
//   - "Add Lightning Address" form (saves to users.ln_address)
//   - "Withdraw now" button → calls ambassador-payout edge fn
//   - Recent commissions list (last 10)
// ============================================
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Zap, Wallet, Loader2, CheckCircle, Clock, AlertCircle, Send, Save
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function fmtCents(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format((cents || 0) / 100)
}

function fmtSats(sats) {
  return Number(sats || 0).toLocaleString('en-US') + ' sats'
}

export default function AmbassadorCommissionsWidget() {
  const { t } = useTranslation()
  const { user, profile, fetchProfile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [lnAddress, setLnAddress] = useState('')
  const [savingAddr, setSavingAddr] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Initial data load
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const [statsRes, recentRes] = await Promise.all([
        supabase.rpc('ambassador_commission_stats', { p_user_id: user.id }),
        supabase
          .from('ambassador_commissions')
          .select('id, status, commission_cents, currency, amount_sats, created_at, ready_at, paid_at, booking_id')
          .eq('ambassador_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (cancelled) return
      // RPC returns an array of one row
      setStats(statsRes.data?.[0] ?? null)
      setRecent(recentRes.data ?? [])
      setLnAddress(profile?.ln_address ?? '')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, profile?.ln_address])

  async function saveAddress() {
    setSavingAddr(true)
    setFeedback(null)
    const { error } = await supabase
      .from('users')
      .update({ ln_address: lnAddress.trim() || null })
      .eq('id', user.id)
    setSavingAddr(false)
    if (error) {
      setFeedback({ type: 'error', message: error.message })
    } else {
      setFeedback({ type: 'success', message: t('amb.addr_saved', 'Lightning address saved.') })
      // refresh profile so the rest of the app sees the change
      await fetchProfile?.(user.id)
    }
  }

  async function withdrawNow() {
    if (!profile?.ln_address) {
      setFeedback({ type: 'error', message: t('amb.need_addr', 'Please set your Lightning address first.') })
      return
    }
    setWithdrawing(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase.functions.invoke('ambassador-payout', { body: {} })
      if (error) {
        let detail = error.message
        try {
          const ctx = error.context
          if (ctx?.json) {
            const errBody = await ctx.json()
            if (errBody?.error) detail = errBody.error
          }
        } catch { /* noop */ }
        setFeedback({ type: 'error', message: detail })
      } else if (data?.error) {
        setFeedback({ type: 'error', message: data.error })
      } else if (data?.skipped) {
        setFeedback({ type: 'info', message: data.reason })
      } else if ((data?.paid_count ?? 0) === 0) {
        setFeedback({ type: 'info', message: t('amb.no_ready', 'No commissions ready to withdraw yet.') })
      } else {
        setFeedback({
          type:    'success',
          message: t('amb.payout_done', 'Sent {{sats}} sats ({{cents}}) to {{addr}}', {
            sats:  fmtSats(data.paid_sats),
            cents: fmtCents(data.paid_cents, data.currency || 'USD'),
            addr:  data.address_used,
          }),
        })
        // Reload counters
        const fresh = await supabase.rpc('ambassador_commission_stats', { p_user_id: user.id })
        setStats(fresh.data?.[0] ?? null)
        const recentRes = await supabase
          .from('ambassador_commissions')
          .select('id, status, commission_cents, currency, amount_sats, created_at, ready_at, paid_at, booking_id')
          .eq('ambassador_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setRecent(recentRes.data ?? [])
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Withdraw failed' })
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <Card className="!p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading commissions…
        </div>
      </Card>
    )
  }

  const readyCents = Number(stats?.ready_cents ?? 0)
  const paidSats   = Number(stats?.paid_sats ?? 0)
  const lifeCents  = Number(stats?.total_lifetime_cents ?? 0)

  return (
    <Card className="!p-0 mb-6 overflow-hidden border-2 border-orange/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange/10 via-orange/5 to-transparent px-6 py-4 border-b border-orange/15">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-orange" />
          <h2 className="font-bold text-deep">{t('amb.title', 'Mes commissions BTC')}</h2>
          <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-orange/70 bg-orange/10 px-2 py-0.5 rounded-full">2% par booking</span>
        </div>
        <p className="text-xs text-gray-500">{t('amb.subtitle', 'Vous touchez 2% (en BTC) sur chaque réservation des hôtels que vous avez référés. Pour la vie.')}</p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        <div className="px-6 py-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Clock size={12} /> {t('amb.pending', 'En cours (booking pending)')}
          </div>
          <p className="text-xl font-bold text-deep">{fmtCents(stats?.pending_cents, 'USD')}</p>
          <p className="text-[10px] text-gray-400">{stats?.pending_count ?? 0} bookings</p>
        </div>
        <div className="px-6 py-5 bg-libre/5">
          <div className="flex items-center gap-1.5 text-xs text-libre mb-1">
            <Wallet size={12} /> {t('amb.ready', 'Prêt à retirer')}
          </div>
          <p className="text-xl font-bold text-libre">{fmtCents(readyCents, 'USD')}</p>
          <p className="text-[10px] text-gray-500">{stats?.ready_count ?? 0} bookings réglés</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <CheckCircle size={12} /> {t('amb.paid', 'Total payé en BTC')}
          </div>
          <p className="text-xl font-bold text-deep">{fmtSats(paidSats)}</p>
          <p className="text-[10px] text-gray-400">≈ {fmtCents(lifeCents, 'USD')} all-time</p>
        </div>
      </div>

      {/* Lightning address + Withdraw */}
      <div className="border-t border-gray-100 p-6 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
            {t('amb.your_ln_addr', 'Votre Lightning Address (BTC payout)')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={lnAddress}
              onChange={e => setLnAddress(e.target.value)}
              placeholder="alice@walletofsatoshi.com"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange/30"
            />
            <Button
              onClick={saveAddress}
              disabled={savingAddr || lnAddress === (profile?.ln_address ?? '')}
              variant="secondary"
            >
              {savingAddr ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('amb.save', 'Enregistrer')}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {t('amb.ln_help', 'Pas de Lightning Address ? Téléchargez Wallet of Satoshi (gratuit, 30 sec) pour en créer une.')}
          </p>
        </div>

        <Button
          onClick={withdrawNow}
          disabled={withdrawing || readyCents === 0 || !profile?.ln_address}
          className="w-full"
        >
          {withdrawing
            ? <><Loader2 size={16} className="animate-spin" /> {t('amb.withdrawing', 'Envoi en cours...')}</>
            : <><Send size={16} /> {t('amb.withdraw', 'Retirer {{amount}} maintenant', { amount: fmtCents(readyCents, 'USD') })}</>
          }
        </Button>

        {feedback && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
            feedback.type === 'error'   ? 'bg-sunset/5 border-sunset/20 text-sunset'
            : feedback.type === 'info'  ? 'bg-gray-50 border-gray-200 text-gray-600'
            :                             'bg-libre/5 border-libre/20 text-libre'
          }`}>
            {feedback.type === 'error' ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> : <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Recent list */}
      {recent.length > 0 && (
        <div className="border-t border-gray-100 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            {t('amb.recent', 'Dernières commissions')}
          </h3>
          <div className="space-y-1.5">
            {recent.map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    c.status === 'paid'      ? 'bg-libre'
                    : c.status === 'ready'   ? 'bg-orange'
                    : c.status === 'pending' ? 'bg-amber-400'
                    :                          'bg-gray-300'
                  }`} />
                  <span className="font-mono text-gray-500">{c.booking_id?.slice(0, 8)}…</span>
                  <span className="uppercase tracking-wider text-[9px] font-bold text-gray-400">{c.status}</span>
                </div>
                <span className="font-medium text-deep">
                  {fmtCents(c.commission_cents, c.currency)}
                  {c.amount_sats ? ` · ${fmtSats(c.amount_sats)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
