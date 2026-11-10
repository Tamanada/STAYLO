// ============================================================================
// refund.ts: the CONFIRMED refund rules of STAYLO, as one pure module
// ============================================================================
// Source of the rules: guardian/RULES.md and guardian/ACCOUNTING.md (founder
// confirmed). Used by cancel-booking (guest) and refund-booking (admin), and
// mirrored for the browser preview in src/lib/cancellationPolicy.js. The unit
// test tests/unit/refund.test.mjs checks both files agree.
//
//   Bands (hours before check-in, floored):
//     flexible         100% if >= 24h, else 0
//     moderate         100% if >= 7 days, 50% if >= 48h, else 0
//     strict           100% if >= 14 days, else 0
//     super_strict_30  100% if >= 30 days, else 0
//     non_refundable   0 always
//   Base: the room amount only. The processing fee is never refunded.
//   refund_cents = Math.round(room_cents * pct / 100)
//   Split of the refund, in this order (STAYLO absorbs the remainder):
//     hotelier   = round(refund * 0.90)
//     ambassador = has_ambassador ? round(refund * 0.02) : 0
//     staylo     = refund - hotelier - ambassador
//   One refund per booking, partial or full.
//
// Pure: no Deno, no Node API, so Node can import it for tests.
// ============================================================================

export const POLICY_BANDS: Record<string, Array<[number, number]>> = {
  flexible:        [[24, 100], [0, 0]],
  moderate:        [[7 * 24, 100], [48, 50], [0, 0]],
  strict:          [[14 * 24, 100], [0, 0]],
  super_strict_30: [[30 * 24, 100], [0, 0]],
  non_refundable:  [[0, 0]],
}

export const POLICY_KEYS = Object.keys(POLICY_BANDS)

export function normalizePolicy(key: string | null | undefined): string {
  return key && POLICY_BANDS[key] ? key : 'flexible'
}

/** Whole hours from `nowIso` to midnight UTC of the check-in date, floored. */
export function hoursUntilCheckIn(nowIso: string, checkIn: string): number {
  const ms = new Date(checkIn + 'T00:00:00Z').getTime() - new Date(nowIso).getTime()
  return Math.floor(ms / 3_600_000)
}

export function refundPctFor(policyKey: string, hours: number): number {
  const bands = POLICY_BANDS[normalizePolicy(policyKey)]
  const band = bands.find(([minHours]) => hours >= minHours) ?? bands[bands.length - 1]
  return band[1]
}

export interface RefundableBooking {
  status?: string | null
  refunded_at?: string | null
  stripe_refund_id?: string | null
  check_in: string
  total_price?: number | string | null
  processing_fee_cents?: number | null
  payout_amount_cents?: number | null
  platform_fee_cents?: number | null
}

/**
 * Room amount in minor units. checkout wrote payout + platform fee = room, and
 * total_price = (room + fee) / 100; both give the same number, the first is
 * exact integers so it wins when present.
 */
export function roomAmountCents(b: RefundableBooking): number {
  if (Number.isInteger(b.payout_amount_cents) && Number.isInteger(b.platform_fee_cents)) {
    return Math.max(0, (b.payout_amount_cents as number) + (b.platform_fee_cents as number))
  }
  const total = Math.round(Number(b.total_price ?? 0) * 100)
  return Math.max(0, total - Number(b.processing_fee_cents ?? 0))
}

export interface RefundSplit { hotelier: number; ambassador: number; staylo: number }

export function splitRefund(refundCents: number, hasAmbassador: boolean): RefundSplit {
  const hotelier   = Math.round(refundCents * 0.90)
  const ambassador = hasAmbassador ? Math.round(refundCents * 0.02) : 0
  return { hotelier, ambassador, staylo: refundCents - hotelier - ambassador }
}

export type RefundReason =
  | 'already_cancelled' | 'already_refunded' | 'stay_completed'
  | 'past_check_in' | 'past_window' | 'within_window' | 'admin_override' | 'retry'

export interface RefundPlan {
  eligible: boolean          // false: the booking cannot be cancelled/refunded at all
  reason: RefundReason
  policyKey: string
  hoursUntilCheckIn: number | null
  refundPct: number
  roomCents: number
  processingFeeCents: number // never refunded, reported for the UI
  refundCents: number
  split: RefundSplit
  remaining: { payoutCents: number; platformFeeCents: number; ambassadorCents: number }
}

export interface PlanInput {
  booking: RefundableBooking
  policyKey: string | null | undefined
  nowIso: string
  hasAmbassador: boolean
  ambassadorCents?: number       // current commission_cents, for the remainder
  pctOverride?: number | null    // admin only, integer 0..100, replaces the band
  retryCents?: number | null     // admin retry of a cancelled booking whose Stripe refund failed:
                                 // the entitlement recorded at cancellation (refund_amount_cents)
}

export function computeRefundPlan(input: PlanInput): RefundPlan {
  const { booking: b, nowIso, hasAmbassador } = input
  const policyKey = normalizePolicy(input.policyKey)
  const roomCents = roomAmountCents(b)
  const processingFeeCents = Number(b.processing_fee_cents ?? 0)
  const payoutCents = Number.isInteger(b.payout_amount_cents) ? (b.payout_amount_cents as number) : Math.round(roomCents * 0.9)
  const platformFeeCents = Number.isInteger(b.platform_fee_cents) ? (b.platform_fee_cents as number) : roomCents - payoutCents
  const ambassadorCents = Number(input.ambassadorCents ?? 0)

  const zero = (reason: RefundReason, eligible: boolean, hours: number | null): RefundPlan => ({
    eligible, reason, policyKey, hoursUntilCheckIn: hours, refundPct: 0, roomCents, processingFeeCents,
    refundCents: 0, split: { hotelier: 0, ambassador: 0, staylo: 0 },
    remaining: { payoutCents, platformFeeCents, ambassadorCents },
  })

  if (b.refunded_at != null || b.stripe_refund_id) return zero('already_refunded', false, null)

  const hours = hoursUntilCheckIn(nowIso, b.check_in)
  let pct: number
  let reason: RefundReason
  if (b.status === 'cancelled' && input.retryCents != null) {
    // Cancelled earlier, Stripe refund failed then: pay the recorded entitlement.
    const cents = Math.max(0, Math.min(roomCents, Math.trunc(Number(input.retryCents))))
    const split = splitRefund(cents, hasAmbassador)
    return {
      eligible: cents > 0, reason: 'retry', policyKey, hoursUntilCheckIn: Math.max(0, hours),
      refundPct: roomCents > 0 ? Math.round(cents * 100 / roomCents) : 0,
      roomCents, processingFeeCents, refundCents: cents, split,
      remaining: {
        payoutCents:      Math.max(0, payoutCents - split.hotelier),
        platformFeeCents: Math.max(0, platformFeeCents - split.staylo - split.ambassador),
        ambassadorCents:  Math.max(0, ambassadorCents - split.ambassador),
      },
    }
  }
  if (b.status === 'cancelled')                 return zero('already_cancelled', false, null)
  if (b.status === 'completed' || b.status === 'checked_out') return zero('stay_completed', false, null)

  if (input.pctOverride != null) {
    pct = Math.min(100, Math.max(0, Math.trunc(Number(input.pctOverride))))
    reason = 'admin_override'
  } else if (hours < 0 || new Date(nowIso) >= new Date(b.check_in + 'T00:00:00Z')) {
    return zero('past_check_in', true, 0)
  } else {
    pct = refundPctFor(policyKey, hours)
    reason = pct === 0 ? 'past_window' : 'within_window'
  }

  const refundCents = Math.round(roomCents * pct / 100)
  const split = splitRefund(refundCents, hasAmbassador)
  return {
    eligible: true, reason, policyKey, hoursUntilCheckIn: Math.max(0, hours), refundPct: pct,
    roomCents, processingFeeCents, refundCents, split,
    remaining: {
      payoutCents:      Math.max(0, payoutCents - split.hotelier),
      platformFeeCents: Math.max(0, platformFeeCents - split.staylo - split.ambassador),
      ambassadorCents:  Math.max(0, ambassadorCents - split.ambassador),
    },
  }
}
