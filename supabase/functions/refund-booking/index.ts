// ============================================================================
// refund-booking: admin refund, under the CONFIRMED rules
// ============================================================================
// Caller: signed-in admin (public.users.role = 'admin').
// Body: { booking_id, reason?, refund_pct?, stripe_reason? }
//   refund_pct  optional admin override (integer 0..100) of the policy band;
//               requires a non-empty reason. The processing fee is never
//               refunded, override or not.
//   stripe_reason  'duplicate' | 'fraudulent' | default 'requested_by_customer'
//
// What happens (shared with cancel-booking, see _shared/refundFlow.ts):
//   - refund = round(room amount x band%), band from the property policy and
//     the hours before check-in (_shared/refund.ts); 0% -> 409 nothing_to_refund
//   - one refund per booking (atomic claim); a cancelled booking whose guest
//     refund failed earlier is retried for its recorded entitlement
//   - escrow released already -> transfer reversal first (clawback tier 1),
//     refused with clawback_failed when Stripe cannot reverse
//   - proportional split 90 / 8 / 2 (or 90 / 10 / 0): payout, platform fee
//     and ambassador commission are reduced; escrow stays 'held' while a
//     remainder is owed to the hotelier
// Returns { ok, refund_id, amount_refunded, amount_refunded_cents, currency,
//           refund_pct, split, escrow_status, reversal_id, ambassador_note }
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { computeRefundPlan } from '../_shared/refund.ts'
import { executeRefund, ambassadorShare } from '../_shared/refundFlow.ts'

interface RefundReq { booking_id?: string; reason?: string; refund_pct?: number | string; stripe_reason?: string }

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return errorResponse('POST only', 405)

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)
    const sb = getServiceClient()
    const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return errorResponse('Admin role required', 403)

    let body: RefundReq
    try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400) }
    if (!body.booking_id) return errorResponse('booking_id required', 400)
    const reason = (body.reason ?? '').trim()
    const hasOverride = body.refund_pct !== undefined && body.refund_pct !== null && body.refund_pct !== ''
    if (hasOverride) {
      const pct = Number(body.refund_pct)
      if (!Number.isInteger(pct) || pct < 0 || pct > 100) return errorResponse('refund_pct must be an integer between 0 and 100', 400)
      if (!reason) return errorResponse('A reason is required when refund_pct overrides the policy', 400, { code: 'reason_required' })
    }

    const { data: booking, error: bErr } = await sb
      .from('bookings')
      .select('id, status, escrow_status, stripe_payment_intent_id, stripe_transfer_id, check_in, total_price, processing_fee_cents, payout_amount_cents, platform_fee_cents, refunded_at, stripe_refund_id, refund_amount_cents, cancelled_at, currency, properties!inner(cancellation_policy)')
      .eq('id', body.booking_id)
      .single()
    if (bErr || !booking) return errorResponse('Booking not found', 404)
    if (!booking.stripe_payment_intent_id) {
      return errorResponse('No Stripe payment to refund (Lightning or manual booking)', 400, { code: 'no_stripe_payment' })
    }
    if (booking.escrow_status === 'refunded' || booking.stripe_refund_id || booking.refunded_at) {
      return errorResponse('Booking already refunded', 409, { code: 'already_refunded' })
    }
    if (booking.escrow_status === 'disputed') {
      return errorResponse('Booking is under dispute; Stripe handles the money until it is resolved', 409, { code: 'disputed' })
    }
    if (booking.escrow_status === 'none' || booking.escrow_status === 'failed') {
      return errorResponse(`No payment held for this booking (escrow_status=${booking.escrow_status})`, 400, { code: 'no_payment' })
    }

    const amb = await ambassadorShare(sb, booking.id)
    // @ts-expect-error embedded property row
    const policyKey = booking.properties?.cancellation_policy as string | undefined
    const isRetry = booking.status === 'cancelled' && Number(booking.refund_amount_cents ?? 0) > 0 && !hasOverride
    const plan = computeRefundPlan({
      booking, policyKey, nowIso: new Date().toISOString(),
      hasAmbassador: amb.has, ambassadorCents: amb.cents,
      pctOverride: hasOverride ? Number(body.refund_pct) : null,
      retryCents: isRetry ? Number(booking.refund_amount_cents) : null,
    })
    if (!plan.eligible) {
      return errorResponse(`Cannot refund this booking (${plan.reason})`, 409, { code: plan.reason })
    }
    if (plan.refundCents === 0) {
      return errorResponse('The policy gives 0% at this date; pass refund_pct with a reason to override', 409, {
        code: 'nothing_to_refund', refund_pct: 0, policy: plan.policyKey, hours_until_check_in: plan.hoursUntilCheckIn,
      })
    }

    const stripeReason = body.stripe_reason === 'duplicate' || body.stripe_reason === 'fraudulent' ? body.stripe_reason : 'requested_by_customer'
    const recordedReason = hasOverride ? `admin override ${plan.refundPct}%: ${reason}` : (reason || `admin refund ${plan.refundPct}% (${plan.policyKey})`)
    const result = await executeRefund({ supa: sb, booking, plan, actor: 'admin', reason: recordedReason, stripeReason })
    if (!result.ok) return errorResponse(result.error, result.status, { code: result.code, detail: result.detail })

    return jsonResponse({
      ok: true,
      refund_id: result.stripeRefundId,
      amount_refunded: plan.refundCents / 100,
      amount_refunded_cents: plan.refundCents,
      currency: booking.currency,
      refund_pct: plan.refundPct,
      split: plan.split,
      escrow_status: result.escrowStatus,
      reversal_id: result.stripeReversalId,
      ambassador_note: result.ambassadorNote,
    })
  } catch (err) {
    console.error('refund-booking error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
