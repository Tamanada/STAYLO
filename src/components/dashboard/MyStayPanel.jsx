// ============================================================================
// MyStayPanel — guest-side wallet + folio for an active booking
// ============================================================================
// S3b + S3c rolled into one panel. Opens as a modal from the "My Bookings"
// list when the user clicks "💼 My stay" on a confirmed/checked_in
// reservation. Two sections:
//
//   1. 🎁 My vouchers — each entitlement as a card with the voucher_code
//      AND a scannable QR. The receptionist or venue staff scans the QR
//      with their phone → routes to the consume_voucher() RPC. From the
//      guest's perspective it's their "wallet" — what they're entitled
//      to today, expiry windows, remaining quota.
//
//   2. 💼 My folio — read-only view of booking_charges (the running tab).
//      Same data the receptionist sees in BookingEditModal's Folio tab,
//      but here the guest can keep an eye on what's accumulating. RLS
//      already grants guests SELECT on their own folio.
//
// Auth — relies on the guest being logged into STAYLO. For the
// "non-user roommate" flow (voucher held by a booking_guest with NULL
// user_id), surface this from a separate flow (S3b-extension via the
// pre-arrival token, not in this panel).
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  X, Gift, Receipt, MapPin, Calendar, BedDouble,
  CheckCircle2, AlertCircle, Loader2, Copy,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Tiny helper — short human date (e.g. "Jun 5").
function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MyStayPanel({ booking, property, room, open, onClose }) {
  const { t } = useTranslation()
  const [vouchers, setVouchers] = useState([])
  const [charges, setCharges]   = useState([])
  const [loading, setLoading]   = useState(true)
  // Currently zoomed voucher (full-screen QR for scanner). null = list view.
  const [zoomedVoucherId, setZoomedVoucherId] = useState(null)

  useEffect(() => {
    if (!open || !booking?.id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('guest_vouchers').select('*').eq('booking_id', booking.id).order('created_at'),
      supabase.from('booking_charges').select('*').eq('booking_id', booking.id).order('charged_at', { ascending: false }),
    ]).then(([vRes, cRes]) => {
      if (cancelled) return
      setVouchers(vRes.data || [])
      setCharges(cRes.data || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, booking?.id])

  // Realtime — bump local state when the receptionist consumes a voucher
  // or adds a charge. RLS already keeps us scoped to our own booking.
  useEffect(() => {
    if (!open || !booking?.id) return
    const ch = supabase
      .channel(`mystay-${booking.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'guest_vouchers',
        filter: `booking_id=eq.${booking.id}`,
      }, payload => {
        if (payload.eventType === 'UPDATE') {
          setVouchers(prev => prev.map(v => v.id === payload.new.id ? payload.new : v))
        } else if (payload.eventType === 'INSERT') {
          setVouchers(prev => [...prev, payload.new])
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'booking_charges',
        filter: `booking_id=eq.${booking.id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setCharges(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setCharges(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
        } else if (payload.eventType === 'DELETE') {
          setCharges(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [open, booking?.id])

  // Folio totals — same formula as BookingEditModal so the numbers
  // line up across surfaces. Unpaid = what the guest still owes at
  // check-out (the running balance).
  const totals = useMemo(() => {
    const total  = charges.reduce((s, c) => s + Number(c.amount || 0), 0)
    const unpaid = charges.filter(c => !c.paid).reduce((s, c) => s + Number(c.amount || 0), 0)
    const paid   = total - unpaid
    return { total, unpaid, paid }
  }, [charges])

  if (!open || !booking) return null

  const today = new Date().toISOString().slice(0, 10)
  const zoomedVoucher = vouchers.find(v => v.id === zoomedVoucherId)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(26,31,46,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header — gradient brand strip with stay essentials */}
        <div className="relative px-5 py-4 bg-gradient-to-br from-deep via-deep to-electric/90 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55 mb-1">
            💼 My stay
          </div>
          <div className="text-2xl font-extrabold leading-tight">{property?.name || 'Your stay'}</div>
          <div className="text-sm text-white/70 mt-1 flex items-center gap-3 flex-wrap">
            {(property?.city || property?.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} />
                {[property?.city, property?.country].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {fmtDay(booking.check_in)} → {fmtDay(booking.check_out)}
            </span>
            {room?.name && (
              <span className="flex items-center gap-1.5">
                <BedDouble size={12} />
                {room.name}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading your stay…
            </div>
          )}

          {/* ── Vouchers section ───────────────────────────── */}
          {!loading && (
            <section>
              <header className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-deep flex items-center gap-2">
                  <Gift size={16} className="text-orange" />
                  My vouchers
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange/10 text-orange">
                    {vouchers.length}
                  </span>
                </h3>
                <div className="text-[10px] text-gray-400 italic">
                  Show the QR to the venue
                </div>
              </header>

              {vouchers.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                  No vouchers on this stay yet. If the hotel offers
                  packages (breakfast, spa, transfer), they'll appear here
                  the moment they're added to your booking.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {vouchers.map(v => {
                    const remaining = (v.qty_total || 0) - (v.qty_consumed || 0)
                    const isAllUsed = remaining <= 0
                    const isExpired = v.valid_until && v.valid_until < today
                    const isPending = v.valid_from  && v.valid_from  > today
                    const tag = isAllUsed ? 'used'
                              : isExpired ? 'expired'
                              : isPending ? `from ${fmtDay(v.valid_from)}`
                              : `${remaining} / ${v.qty_total} left`
                    const tagClass = isAllUsed ? 'bg-gray-200 text-gray-500'
                                   : isExpired ? 'bg-sunset/15 text-sunset'
                                   : isPending ? 'bg-orange/15 text-orange'
                                   :             'bg-libre/15 text-libre'
                    const disabled = isAllUsed || isExpired || isPending
                    return (
                      <div
                        key={v.id}
                        className={`rounded-xl border px-3 py-3 transition-all ${
                          disabled
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-gradient-to-br from-orange/5 to-pink-500/5 border-orange/20 hover:border-orange/40 hover:shadow-sm cursor-pointer'
                        }`}
                        onClick={() => !disabled && setZoomedVoucherId(v.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="font-bold text-deep text-sm leading-tight flex items-center gap-1.5 flex-1 min-w-0">
                            🎁 <span className="truncate">{v.label}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${tagClass}`}>
                            {tag}
                          </span>
                        </div>
                        {v.description && (
                          <div className="text-[11px] text-gray-500 mb-2 line-clamp-2">
                            {v.description}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-[10px] text-gray-400 truncate">
                            {v.voucher_code}
                          </div>
                          {!disabled && (
                            <span className="text-[10px] font-bold text-orange flex items-center gap-1">
                              Tap for QR →
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Folio section ──────────────────────────────── */}
          {!loading && (
            <section>
              <header className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-deep flex items-center gap-2">
                  <Receipt size={16} className="text-ocean" />
                  My folio
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ocean/10 text-ocean">
                    {charges.length}
                  </span>
                </h3>
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    Balance due
                  </div>
                  <div className={`text-lg font-extrabold ${totals.unpaid > 0 ? 'text-orange' : 'text-libre'}`}>
                    ${totals.unpaid.toFixed(2)}
                  </div>
                </div>
              </header>

              {charges.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                  No charges yet. As you use the bar, restaurant or spa,
                  your folio updates in real time here.
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {charges.map(c => {
                    const isVoucherLine = c.amount === 0 && /voucher/i.test(c.description || '')
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold truncate ${isVoucherLine ? 'text-libre' : 'text-deep'}`}>
                            {c.description || c.category}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {c.category}
                            {' · '}
                            {new Date(c.charged_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                            {c.qty > 1 && ` · ${c.qty}× $${Number(c.unit_price).toFixed(2)}`}
                          </div>
                        </div>
                        {c.paid ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-libre/15 text-libre flex items-center gap-1">
                            <CheckCircle2 size={10} /> paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange/15 text-orange">
                            unpaid
                          </span>
                        )}
                        <span className="font-bold text-deep w-16 text-right">
                          ${Number(c.amount).toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                  {/* Totals footer */}
                  <div className="px-3 py-2.5 bg-gray-50 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total spent · ${totals.total.toFixed(2)}</span>
                    <span className="text-gray-500">Paid · ${totals.paid.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Zoomed QR overlay — fullscreen QR for the receptionist to scan */}
      {zoomedVoucher && (
        <div
          onClick={e => { e.stopPropagation(); setZoomedVoucherId(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 7000,
            background: 'rgba(26,31,46,.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-orange mb-1">
              🎁 Voucher
            </div>
            <div className="text-xl font-extrabold text-deep mb-1">{zoomedVoucher.label}</div>
            <div className="text-xs text-gray-500 mb-4">
              Show this QR to the venue · They'll scan to redeem
            </div>

            {/* Big QR — code embedded as plain text. The venue scanner will
                decode it and pass to consume_voucher() RPC. */}
            <div className="inline-block bg-white p-4 rounded-2xl border-4 border-orange/20 mb-4">
              <QRCodeSVG
                value={zoomedVoucher.voucher_code}
                size={260}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1A1F2E"
              />
            </div>

            {/* Fallback — text code for hand entry if the camera misfires */}
            <div className="bg-gray-50 rounded-xl px-3 py-2 inline-flex items-center gap-2 font-mono text-base tracking-wider text-deep font-bold">
              {zoomedVoucher.voucher_code}
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(zoomedVoucher.voucher_code)}
                title="Copy code"
                className="text-gray-400 hover:text-deep"
              >
                <Copy size={14} />
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              {(zoomedVoucher.qty_total - zoomedVoucher.qty_consumed)} of {zoomedVoucher.qty_total} remaining
              {zoomedVoucher.valid_until && ` · valid until ${fmtDay(zoomedVoucher.valid_until)}`}
            </div>

            <button
              type="button"
              onClick={() => setZoomedVoucherId(null)}
              className="mt-5 px-6 py-2.5 rounded-full bg-deep text-white text-sm font-bold hover:bg-deep/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
