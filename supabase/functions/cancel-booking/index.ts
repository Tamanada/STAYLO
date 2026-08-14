// ============================================================================
// cancel-booking — guest-initiated booking cancellation with policy-based refund
// ============================================================================
// Called by the guest's "Cancel my booking" button in MyBookings. Steps:
//
//   1. Auth the caller — must be logged in, and MUST own this booking
//      (booking.guest_id === auth.uid). Rejects otherwise.
//   2. Fetch booking + its property.cancellation_policy via service_role
//      (so RLS on other tables doesn't block the internal join).
//   3. Recompute the refund server-side using the SAME barème the client
//      shows in the preview modal. Client is never trusted.
//   4. If refund > 0 AND we have a stripe_payment_intent_id, trigger a
//      Stripe partial refund. Record stripe_refund_id.
//   5. Update the booking row: status='cancelled', cancelled_at now,
//      cancellation_reason (from payload), refund_amount_cents.
//   6. Return { ok, refundAmountCents, refundStatus, stripeRefundId }
//      so the client can update its UI.
//
// This EF is IDEMPOTENT-ish: if the booking is already cancelled, we
// return the existing refund payload without side effects.
// ============================================================================
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY  = Deno.env.get('STRIPE_SECRET_KEY') || ''

// ─────────────────────────────────────────────────────────────────────────
// Refund calculator — MUST mirror src/lib/cancellationPolicy.js exactly.
// Kept inline (not imported) because Deno EFs can't reach into ../../src.
// If you change the barème, change BOTH files in the same commit.
// ─────────────────────────────────────────────────────────────────────────
const POLICY_BANDS: Record<string, Array<[number, number]>> = {
  flexible:       [[24, 100], [12,  50], [ 0, 0]],
  moderate:       [[48, 100], [24,  50], [ 0, 0]],
  strict:         [[7 * 24, 100], [3 * 24, 50], [0, 0]],
  non_refundable: [[0, 0]],
}

function computeRefund(booking: any, property: any, nowIso: string) {
  const policyKey = property?.cancellation_policy || 'flexible'
  const totalCents = Math.round(Number(booking.total_price ?? 0) * 100)
  const feeCents = Number(booking.processing_fee_cents ?? 0)
  const refundableBaseCents = Math.max(0, totalCents - feeCents)

  if (booking.status === 'cancelled')        return { pct: 0, cents: 0, reason: 'already_cancelled' }
  if (booking.refunded_at != null)           return { pct: 0, cents: 0, reason: 'already_refunded' }
  if (booking.status === 'completed')        return { pct: 0, cents: 0, reason: 'stay_completed' }
  if (booking.status === 'checked_out')      return { pct: 0, cents: 0, reason: 'stay_completed' }

  const isPast = new Date(nowIso) >= new Date(booking.check_in + 'T00:00:00Z')
  if (isPast) return { pct: 0, cents: 0, reason: 'past_check_in' }

  const hours = Math.floor((new Date(booking.check_in + 'T00:00:00Z').getTime() - new Date(nowIso).getTime()) / 3600000)
  const bands = POLICY_BANDS[policyKey] || POLICY_BANDS.flexible
  const band = bands.find(([minH]) => hours >= minH) || bands[bands.length - 1]
  const pct = band[1]
  const cents = Math.floor((refundableBaseCents * pct) / 100)
  return { pct, cents, reason: pct === 0 ? 'past_window' : 'within_window' }
}

// ─────────────────────────────────────────────────────────────────────────
// Stripe partial refund (best-effort — refund failure doesn't block the
// cancel, we just mark the row and let admin retry via AdminTransactions).
// ─────────────────────────────────────────────────────────────────────────
async function issueStripeRefund(paymentIntentId: string, amountCents: number, reason: string) {
  if (!STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
  const body = new URLSearchParams({
    payment_intent: paymentIntentId,
    amount: String(amountCents),
    reason: 'requested_by_customer',
    'metadata[cancel_reason]': reason.slice(0, 500),
    'metadata[source]': 'staylo_cancel_booking_ef',
  })
  const res = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Stripe refund HTTP ${res.status}: ${err.slice(0, 300)}`)
  }
  return await res.json()
}

// ─────────────────────────────────────────────────────────────────────────
// HTTP entry point
// ─────────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return errorResponse('POST only', 405)

  // Auth — the JWT is in the Authorization header (verify_jwt=true on the
  // function config guarantees it's valid; we just need to extract the
  // user id from it).
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return errorResponse('Missing Authorization', 401)

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Introspect the JWT to grab the caller's user id.
  const { data: userData, error: authErr } = await supa.auth.getUser(jwt)
  if (authErr || !userData?.user) return errorResponse('Invalid session', 401)
  const callerId = userData.user.id

  let payload: { booking_id?: string; reason?: string } = {}
  try { payload = await req.json() } catch { /* body optional */ }
  if (!payload.booking_id) return errorResponse('booking_id required', 400)

  // Fetch booking + its property (service_role bypasses RLS so we can
  // reach into properties without joining through public policies).
  const { data: booking, error: bErr } = await supa
    .from('bookings')
    .select('*, properties!inner(id, cancellation_policy, user_id)')
    .eq('id', payload.booking_id)
    .single()
  if (bErr || !booking) return errorResponse('Booking not found', 404)

  // Ownership check — the guest must be the one on the booking.
  if (booking.guest_id !== callerId) return errorResponse('Not your booking', 403)

  // Idempotency: already cancelled → return current state without new side effects.
  if (booking.status === 'cancelled') {
    return jsonResponse({
      ok: true, idempotent: true,
      refundAmountCents: booking.refund_amount_cents ?? 0,
      refundStatus: booking.stripe_refund_id ? 'processed' : 'none',
      stripeRefundId: booking.stripe_refund_id ?? null,
    })
  }

  const nowIso = new Date().toISOString()
  const refund = computeRefund(booking, booking.properties, nowIso)

  // Attempt the Stripe refund if we have a real payment_intent AND a
  // non-zero refund. Lightning / crypto bookings without stripe_payment_
  // intent_id skip this step; those need a manual off-Stripe refund via
  // admin (or the future crypto-refund pipeline).
  let stripeRefundId: string | null = null
  let refundStatus: 'processed' | 'pending' | 'skipped' | 'failed' = 'skipped'
  let stripeError: string | null = null

  if (refund.cents > 0 && booking.stripe_payment_intent_id && STRIPE_SECRET_KEY) {
    try {
      const stripeRes = await issueStripeRefund(booking.stripe_payment_intent_id, refund.cents, payload.reason || '')
      stripeRefundId = stripeRes.id
      refundStatus = stripeRes.status === 'succeeded' ? 'processed' : 'pending'
    } catch (e) {
      stripeError = String(e).slice(0, 500)
      refundStatus = 'failed'
      // We still mark the booking cancelled — admin can retry the refund
      // from AdminTransactions. The guest sees the cancel land but with
      // a note that the refund is in review.
    }
  } else if (refund.cents === 0) {
    refundStatus = 'skipped'
  }

  // Persist the cancellation. `refunded_at` stays NULL until the Stripe
  // webhook confirms; only stamp it now if we already got a 'succeeded'
  // status from Stripe.
  const updates: Record<string, unknown> = {
    status: 'cancelled',
    cancelled_at: nowIso,
    cancellation_reason: (payload.reason || '').slice(0, 500) || null,
    refund_amount_cents: refund.cents,
  }
  if (stripeRefundId) updates.stripe_refund_id = stripeRefundId
  if (refundStatus === 'processed') updates.refunded_at = nowIso

  const { error: upErr } = await supa.from('bookings').update(updates).eq('id', booking.id)
  if (upErr) return errorResponse(`Booking update failed: ${upErr.message}`, 500)

  return jsonResponse({
    ok: true,
    idempotent: false,
    refundAmountCents: refund.cents,
    refundPct: refund.pct,
    refundReason: refund.reason,
    refundStatus,
    stripeRefundId,
    stripeError,
  })
})
