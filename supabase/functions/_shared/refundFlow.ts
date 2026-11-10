// ============================================================================
// refundFlow.ts: executes a RefundPlan (Stripe + database), shared by
// cancel-booking (guest) and refund-booking (admin)
// ============================================================================
// Order of operations, each step safe against a concurrent second run:
//   1. claim_booking_refund(): one atomic UPDATE, true for exactly one caller.
//   2. If the escrow was already released to the hotelier: clawback tier 1,
//      a Stripe transfer reversal of the hotelier's share of the refund
//      (Idempotency-Key clawback_<booking>). Tiers 2 and 3 of the CONFIRMED
//      rule (retention on the next 3 bookings, platform reserve) are NOT
//      implemented: when the reversal fails the refund is refused with
//      code clawback_failed and nothing moves.
//   3. Stripe refund of refundCents on the payment intent (never the
//      processing fee), Idempotency-Key refund_<booking>.
//   4. Booking row: cancelled, amounts after the proportional split; escrow
//      stays 'held' when a remainder is still owed to the hotelier, becomes
//      'refunded' when nothing is left.
//   5. Ambassador commission reduced by its share (pending/ready rows only).
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { stripeFetch } from './stripe.ts'
import type { RefundPlan } from './refund.ts'

export interface RefundBookingRow {
  id: string
  status: string | null
  escrow_status: string | null
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  cancelled_at?: string | null
}

export interface ExecuteInput {
  supa: SupabaseClient
  booking: RefundBookingRow
  plan: RefundPlan
  actor: 'guest' | 'admin'
  reason: string | null
  stripeReason?: 'requested_by_customer' | 'duplicate' | 'fraudulent'
}

export type ExecuteResult =
  | { ok: true; refundCents: number; refundStatus: 'processed' | 'pending' | 'skipped' | 'failed'
      stripeRefundId: string | null; stripeReversalId: string | null; stripeError: string | null
      escrowStatus: string; ambassadorNote: string | null }
  | { ok: false; status: number; code: string; error: string; detail?: string }

interface StripeRefund { id: string; status: string; amount: number }
interface StripeReversal { id: string; amount: number }

export async function executeRefund(input: ExecuteInput): Promise<ExecuteResult> {
  const { supa, booking, plan, actor } = input
  const bookingId = booking.id

  // 1. Claim
  const { data: claimed, error: claimErr } = await supa.rpc('claim_booking_refund', { p_booking_id: bookingId })
  if (claimErr) return { ok: false, status: 500, code: 'claim_failed', error: 'Could not claim the booking', detail: claimErr.message }
  if (claimed !== true) return { ok: false, status: 409, code: 'refund_in_progress', error: 'A refund of this booking is already in progress or done' }

  const giveBack = async () => { await supa.rpc('release_booking_refund_claim', { p_booking_id: bookingId }) }

  const wasReleased = booking.escrow_status === 'released'
  const hasStripe = Boolean(booking.stripe_payment_intent_id)
  let stripeReversalId: string | null = null
  let stripeRefundId: string | null = null
  let refundStatus: 'processed' | 'pending' | 'skipped' | 'failed' = 'skipped'
  let stripeError: string | null = null

  // 2. Clawback tier 1 when the hotelier already received the money
  if (wasReleased && plan.split.hotelier > 0 && hasStripe) {
    if (!booking.stripe_transfer_id) {
      await giveBack()
      return { ok: false, status: 409, code: 'clawback_failed', error: 'Escrow is released but no Stripe transfer id is recorded; recover the hotelier share manually first' }
    }
    try {
      const rev = await stripeFetch<StripeReversal>(`/transfers/${booking.stripe_transfer_id}/reversals`, {
        idempotencyKey: `clawback_${bookingId}`,
        body: { amount: plan.split.hotelier, metadata: { booking_id: bookingId, source: 'staylo_refund_clawback_tier1' } },
      })
      stripeReversalId = rev.id
    } catch (err) {
      await giveBack()
      return { ok: false, status: 409, code: 'clawback_failed',
        error: 'Could not reverse the hotelier transfer (clawback tier 1); tiers 2 and 3 are manual',
        detail: err instanceof Error ? err.message : String(err) }
    }
  }

  // 3. Stripe refund to the guest
  if (plan.refundCents > 0 && hasStripe) {
    try {
      const refund = await stripeFetch<StripeRefund>('/refunds', {
        idempotencyKey: `refund_${bookingId}`,
        body: {
          payment_intent: booking.stripe_payment_intent_id,
          amount: plan.refundCents,
          reason: input.stripeReason ?? 'requested_by_customer',
          metadata: { booking_id: bookingId, source: `staylo_${actor}_refund`, refund_pct: String(plan.refundPct), cancel_reason: (input.reason ?? '').slice(0, 450) },
        },
      })
      stripeRefundId = refund.id
      refundStatus = refund.status === 'succeeded' ? 'processed' : 'pending'
    } catch (err) {
      stripeError = (err instanceof Error ? err.message : String(err)).slice(0, 500)
      refundStatus = 'failed'
      if (actor === 'admin') {
        await giveBack()
        return { ok: false, status: 502, code: 'stripe_refund_failed', error: 'Stripe refund failed', detail: stripeError }
      }
      // Guest path: the cancellation stands, the refund is retried by an
      // admin. The claim is given back so that retry can run.
      await giveBack()
    }
  }

  // 4. Booking row. The split is applied only when money actually moved (a
  //    Stripe refund exists) or when no Stripe payment exists at all
  //    (Lightning: refunded off-Stripe by hand, the bookkeeping is all we do).
  //    A failed Stripe refund leaves the amounts untouched: the booking is
  //    cancelled with its entitlement in refund_amount_cents, and an admin
  //    retries through refund-booking.
  const nowIso = new Date().toISOString()
  const moneyMoved = stripeRefundId !== null || !hasStripe
  const fullyRefunded = plan.remaining.payoutCents === 0 && plan.remaining.platformFeeCents === 0
  let escrowStatus = booking.escrow_status ?? 'none'
  if (stripeRefundId && (booking.escrow_status === 'held' || booking.escrow_status === 'released') && fullyRefunded) {
    escrowStatus = 'refunded'
  }
  const updates: Record<string, unknown> = {
    status: 'cancelled',
    cancelled_at: booking.cancelled_at ?? nowIso,
    cancellation_reason: (input.reason ?? '').slice(0, 500) || null,
    refund_amount_cents: plan.refundCents,
    escrow_status: escrowStatus,
  }
  if (moneyMoved) {
    updates.payout_amount_cents = plan.remaining.payoutCents
    updates.platform_fee_cents = plan.remaining.platformFeeCents
  }
  if (stripeRefundId) updates.stripe_refund_id = stripeRefundId
  if (stripeReversalId) updates.stripe_transfer_reversal_id = stripeReversalId
  if (refundStatus === 'processed') updates.refunded_at = nowIso
  const { error: upErr } = await supa.from('bookings').update(updates).eq('id', bookingId)
  if (upErr) {
    console.error(`refund: booking update failed after Stripe for ${bookingId}:`, upErr.message)
    return { ok: false, status: 500, code: 'db_update_failed',
      error: 'Refund sent but the booking row could not be updated; fix the row by hand, do not refund again',
      detail: `${upErr.message}; refund=${stripeRefundId ?? 'none'}; reversal=${stripeReversalId ?? 'none'}` }
  }

  // 5. Ambassador share
  let ambassadorNote: string | null = null
  if (plan.split.ambassador > 0 && moneyMoved) {
    const { data: rows } = await supa.from('ambassador_commissions')
      .select('id, status, commission_cents').eq('booking_id', bookingId)
    for (const row of rows ?? []) {
      if (row.status === 'pending' || row.status === 'ready') {
        await supa.from('ambassador_commissions')
          .update({ commission_cents: Math.max(0, Number(row.commission_cents) - plan.split.ambassador) })
          .eq('id', row.id)
      } else if (row.status === 'paid') {
        ambassadorNote = `ambassador commission already paid: ${plan.split.ambassador} to claw back manually`
        console.warn(`refund ${bookingId}: ${ambassadorNote}`)
      }
    }
  }

  return { ok: true, refundCents: plan.refundCents, refundStatus, stripeRefundId, stripeReversalId, stripeError, escrowStatus, ambassadorNote }
}

/** Does this booking carry an ambassador commission, and how much is left on it? */
export async function ambassadorShare(supa: SupabaseClient, bookingId: string): Promise<{ has: boolean; cents: number }> {
  const { data } = await supa.from('ambassador_commissions')
    .select('commission_cents, status').eq('booking_id', bookingId)
    .in('status', ['pending', 'ready', 'paid'])
  const rows = data ?? []
  return { has: rows.length > 0, cents: rows.reduce((s, r) => s + Number(r.commission_cents ?? 0), 0) }
}
