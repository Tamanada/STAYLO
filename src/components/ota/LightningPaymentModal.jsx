// ============================================
// LightningPaymentModal — chantier #9.4
// ============================================
// Modal that displays a Lightning invoice as a QR code, with countdown
// to expiry and live polling of payment status.
//
// Behavior:
//   - On open: displays QR code (BOLT11) + amount in sats + fiat preview
//   - Polls /functions/v1/btc-invoice-status every 3s OR via webhook trigger
//   - On status='paid' → calls onSuccess(invoiceId)
//   - On expiry → shows "Invoice expired, retry" with a regenerate button
//
// MOCK MODE NOTE:
//   When the provider is 'mock', the backend returns a `mock.will_pay_at`
//   timestamp. After that delay, the frontend self-triggers the payment
//   confirmation via crypto-webhook (mock_action='pay').
//   In production with a real provider, the real webhook fires it instead.
// ============================================

import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, CheckCircle, X, Copy, Zap, Clock } from 'lucide-react'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'

const POLL_INTERVAL_MS = 3000

export default function LightningPaymentModal({ invoice, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [status, setStatus]   = useState('pending')   // pending | paid | expired | error
  const [copied, setCopied]   = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(invoice.expires_at).getTime() - Date.now()) / 1000)),
  )

  const isMock = invoice.provider === 'mock'
  const mockPayAt = invoice.mock?.will_pay_at ? new Date(invoice.mock.will_pay_at).getTime() : null

  // ── Countdown to expiry ─────────────────────────
  useEffect(() => {
    if (status !== 'pending') return
    const tick = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setStatus('expired'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [status])

  // ── Polling: ping the DB to see if the invoice has been marked paid ──
  useEffect(() => {
    if (status !== 'pending') return
    let cancelled = false

    async function poll() {
      const { data } = await supabase
        .from('btc_invoices')
        .select('status, paid_at')
        .eq('id', invoice.invoice_id)
        .single()
      if (cancelled) return
      if (data?.status === 'paid') {
        setStatus('paid')
        setTimeout(() => onSuccess?.(invoice.invoice_id), 1200)
      } else if (data?.status === 'expired') {
        setStatus('expired')
      }
    }

    const t0 = setInterval(poll, POLL_INTERVAL_MS)
    poll()  // immediate first poll
    return () => { cancelled = true; clearInterval(t0) }
  }, [invoice.invoice_id, onSuccess, status])

  // ── MOCK self-trigger: when mockPayAt elapses, fire the webhook ──
  useEffect(() => {
    if (!isMock || !mockPayAt || status !== 'pending') return
    const delayMs = Math.max(0, mockPayAt - Date.now())
    const timer = setTimeout(async () => {
      try {
        await supabase.functions.invoke('crypto-webhook', {
          body: { invoice_id: invoice.invoice_id, mock_action: 'pay' },
        })
        // Polling above will pick up the status change in 0-3s
      } catch (err) {
        console.error('Mock pay trigger failed:', err)
      }
    }, delayMs + 200)  // tiny buffer
    return () => clearTimeout(timer)
  }, [isMock, mockPayAt, invoice.invoice_id, status])

  function copyInvoice() {
    navigator.clipboard?.writeText(invoice.bolt11)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fiat = (invoice.fiat_amount_cents / 100).toFixed(2)
  const sats = Number(invoice.amount_sats).toLocaleString('en-US')

  const minutesLeft = Math.floor(secondsLeft / 60)
  const sec = (secondsLeft % 60).toString().padStart(2, '0')

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-orange" />
            <h3 className="font-bold text-deep">{t('lightning.title', 'Pay with Bitcoin Lightning')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {status === 'pending' && (
          <div className="p-6 text-center">
            {/* QR code */}
            <div className="inline-block bg-white p-3 rounded-xl border-2 border-gray-100 mb-4">
              <QRCodeSVG value={invoice.bolt11} size={220} level="M" includeMargin={false} />
            </div>

            {/* Amounts */}
            <div className="mb-4">
              <p className="text-3xl font-bold text-deep">{sats} <span className="text-base text-gray-400 font-normal">sats</span></p>
              <p className="text-sm text-gray-500">≈ {invoice.fiat_currency} {fiat}</p>
            </div>

            {/* Countdown */}
            <div className={`flex items-center justify-center gap-2 text-sm mb-4 ${secondsLeft < 300 ? 'text-sunset' : 'text-gray-500'}`}>
              <Clock size={14} />
              <span>{t('lightning.expires_in', 'Expires in')} {minutesLeft}:{sec}</span>
            </div>

            {/* Copy invoice button */}
            <button onClick={copyInvoice}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors mb-3">
              <Copy size={14} />
              {copied ? t('lightning.copied', 'Copied!') : t('lightning.copy_invoice', 'Copy BOLT11 invoice')}
            </button>

            {/* Mock mode notice */}
            {isMock && (
              <div className="mt-4 p-3 bg-orange/5 border border-orange/15 rounded-lg text-xs text-orange/80">
                <p className="font-bold mb-1">⚙️ Demo mode (Alpha)</p>
                <p>This QR is a simulated Lightning invoice. Payment will auto-confirm in a few seconds — no real sats needed. Production swaps in BTCPay Server for live payments.</p>
              </div>
            )}

            {/* Polling indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              <span>{t('lightning.waiting', 'Waiting for payment...')}</span>
            </div>
          </div>
        )}

        {status === 'paid' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle size={48} className="text-libre" />
            </div>
            <h4 className="text-2xl font-bold text-deep mb-2">{t('lightning.paid_title', 'Payment received!')}</h4>
            <p className="text-sm text-gray-500">{t('lightning.paid_desc', 'Your booking is being confirmed...')}</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-sunset/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-sunset" />
            </div>
            <h4 className="text-xl font-bold text-deep mb-2">{t('lightning.expired_title', 'Invoice expired')}</h4>
            <p className="text-sm text-gray-500 mb-4">{t('lightning.expired_desc', 'Lightning invoices expire after 1 hour. Generate a new one to retry.')}</p>
            <Button onClick={onClose} variant="secondary">{t('lightning.close', 'Close')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
