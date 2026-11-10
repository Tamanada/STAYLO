// ============================================================================
// cancel-booking: guest-initiated cancellation with the CONFIRMED refund rules
// ============================================================================
// Called by the guest's "Cancel my booking" button (MyStayPanel). Steps:
//   1. Auth the caller; the booking must be theirs (guest_id = auth.uid).
//   2. Fetch booking + property.cancellation_policy (service role).
//   3. Refund plan from _shared/refund.ts: the same bands and rounding the
//      browser preview uses (src/lib/cancellationPolicy.js). The client sends
//      no amount and is never trusted.
//   4. _shared/refundFlow.ts: atomic claim, Stripe partial refund of the room
//      share only (never the processing fee), proportional split on payout /
//      platform fee / ambassador commission, escrow kept 'held' while the
//      hotelier is still owed a remainder.
//   5. Already cancelled -> the stored result is returned, no side effect.
//
// A Stripe failure does not block the cancellation: the booking is cancelled
// with its entitlement in refund_amount_cents and an admin retries the
// payment through refund-booking.
// ============================================================================
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { computeRefundPlan } from '../_shared/refund.ts'
import { executeRefund, ambassadorShare } from '../_shared/refundFlow.ts'

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return errorResponse('POST only', 405)

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Invalid session', 401)
    const supa = getServiceClient()

    let payload: { booking_id?: string; reason?: string | null } = {}
    try { payload = await req.json() } catch { /* body optional */ }
    if (!payload.booking_id) return errorResponse('booking_id required', 400)

    const { data: booking, error: bErr } = await supa
      .from('bookings')
      .select('id, guest_id, status, escrow_status, stripe_payment_intent_id, stripe_transfer_id, check_in, total_price, processing_fee_cents, payout_amount_cents, platform_fee_cents, refunded_at, stripe_refund_id, refund_amount_cents, cancelled_at, properties!inner(id, cancellation_policy, user_id)')
      .eq('id', payload.booking_id)
      .single()
    if (bErr || !booking) return errorResponse('Booking not found', 404)
    if (booking.guest_id !== user.id) return errorResponse('Not your booking', 403)

    // Idempotency: already cancelled, return the stored outcome.
    if (booking.status === 'cancelled') {
      return jsonResponse({
        ok: true, idempotent: true,
        refundAmountCents: booking.refund_amount_cents ?? 0,
        refundStatus: booking.stripe_refund_id ? 'processed' : 'none',
        stripeRefundId: booking.stripe_refund_id ?? null,
      })
    }

    const amb = await ambassadorShare(supa, booking.id)
    // @ts-expect-error embedded property row
    const policyKey = booking.properties?.cancellation_policy as string | undefined
    const plan = computeRefundPlan({
      booking, policyKey, nowIso: new Date().toISOString(),
      hasAmbassador: amb.has, ambassadorCents: amb.cents,
    })
    if (!plan.eligible) {
      return errorResponse(`This booking cannot be cancelled (${plan.reason})`, 409, { code: plan.reason })
    }

    const reason = (payload.reason ?? '').toString().slice(0, 500) || null
    const result = await executeRefund({ supa, booking, plan, actor: 'guest', reason })
    if (!result.ok) return errorResponse(result.error, result.status, { code: result.code, detail: result.detail })

    return jsonResponse({
      ok: true,
      idempotent: false,
      refundAmountCents: plan.refundCents,
      refundPct: plan.refundPct,
      refundReason: plan.reason,
      refundStatus: result.refundStatus,
      stripeRefundId: result.stripeRefundId,
      stripeError: result.stripeError,
    })
  } catch (err) {
    console.error('cancel-booking error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
