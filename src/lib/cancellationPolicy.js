// ============================================================================
// Cancellation policy — deterministic refund calculator
// ============================================================================
// Pure functions, no React, no Supabase. Used by:
//   · The guest-facing CancelBookingModal to preview "if you cancel now,
//     you'll get back X". Must match what the EF later computes to the
//     penny — the guest sees the number BEFORE confirming.
//   · supabase/functions/cancel-booking to VALIDATE + persist the refund.
//     The EF re-runs the same math server-side so the client can't
//     inflate its own refund.
//
// Contract for hoteliers (defined here so we can iterate the barème
// without touching the DB or the EF):
//
//    Policy         100% refund window     50% refund window     0%
//    flexible       ≥ 24h before check-in  12–24h                <12h
//    moderate       ≥ 48h                  24–48h                <24h
//    strict         ≥ 7 days               3–7 days              <3d
//    non_refundable never                  never                 always
//
// Payment-processing fees (3% card / 0% Lightning etc.) are NEVER
// refunded — they're acquired by the processor at the moment of pay.
// The refund is on `total_price - processing_fee` only.
// ============================================================================

// Hours-based bands per policy. First tuple entry that the caller's
// `hoursUntil` fits into wins.
//   [minHours, refundPct]   → grants `refundPct` iff hoursUntil >= minHours
// Sorted DESC so the first match is the strictest window that qualifies.
const POLICY_BANDS = {
  flexible: [
    [24, 100],
    [12,  50],
    [ 0,   0],
  ],
  moderate: [
    [48, 100],
    [24,  50],
    [ 0,   0],
  ],
  strict: [
    [7 * 24, 100],
    [3 * 24,  50],
    [     0,   0],
  ],
  non_refundable: [
    [0, 0],
  ],
}

// Human-friendly labels for each threshold — surface in the modal so the
// guest understands WHY they get X% and not Y%.
const POLICY_LABELS = {
  flexible: {
    name: 'Flexible',
    thresholds: '100% refund ≥ 24h before check-in · 50% between 12h and 24h · 0% under 12h',
  },
  moderate: {
    name: 'Moderate',
    thresholds: '100% refund ≥ 48h before check-in · 50% between 24h and 48h · 0% under 24h',
  },
  strict: {
    name: 'Strict',
    thresholds: '100% refund ≥ 7 days before check-in · 50% between 3 and 7 days · 0% under 3 days',
  },
  non_refundable: {
    name: 'Non-refundable',
    thresholds: 'This booking is non-refundable at any time.',
  },
}

export function policyMeta(policyKey) {
  return POLICY_LABELS[policyKey] || POLICY_LABELS.flexible
}

// Milliseconds → hours, floored down (a booking 23h59m out is in the
// "<24h" band, not the "≥24h" one — err on the side of the tighter
// window so the barème is never gamed by minutes-of-drift).
function hoursBetween(fromIso, toIso) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  return Math.floor(ms / (1000 * 60 * 60))
}

// Money helper — decimals-in-payload might be a float (JS math), we
// round to the nearest cent before persisting.
function toCents(amount) {
  return Math.round(Number(amount) * 100)
}

// ─────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────
// booking:  { total_price, processing_fee_cents, check_in, status,
//             payment_method, stripe_payment_intent_id }
// property: { cancellation_policy }
// nowIso:   ISO string for "now" — injected so tests can freeze time
//           and so the EF and client agree on the same moment even
//           across a 200ms request round-trip.
//
// Returns:
//   {
//     policyKey, policyName, thresholds,
//     hoursUntilCheckIn,
//     refundPct,                    // 0 | 50 | 100
//     refundableBaseCents,          // total_price - processing_fee_cents
//     processingFeeCents,           // never refundable
//     refundAmountCents,            // final integer refund
//     canCancel,                    // false if already cancelled / completed
//     reason,                       // human explanation ("Booked non-refundable", "Past check-in", …)
//     bandLabel,                    // e.g. "12 hours before check-in"
//   }
export function computeCancellationRefund({ booking, property, nowIso }) {
  const now = nowIso || new Date().toISOString()
  const policyKey = property?.cancellation_policy || 'flexible'
  const meta = policyMeta(policyKey)

  const totalCents = toCents(booking?.total_price ?? 0)
  const feeCents = Number(booking?.processing_fee_cents ?? 0)
  const refundableBaseCents = Math.max(0, totalCents - feeCents)

  const alreadyCancelled = booking?.status === 'cancelled'
  const alreadyRefunded  = booking?.refunded_at != null
  const isCompleted      = booking?.status === 'completed' || booking?.status === 'checked_out'
  const isPastCheckIn    = booking?.check_in && (new Date(now) >= new Date(booking.check_in + 'T00:00:00Z'))

  // Terminal states — never cancellable from the guest side.
  if (alreadyCancelled) {
    return { policyKey, policyName: meta.name, thresholds: meta.thresholds,
      hoursUntilCheckIn: null, refundPct: 0, refundableBaseCents, processingFeeCents: feeCents,
      refundAmountCents: 0, canCancel: false, reason: 'Booking already cancelled.', bandLabel: null }
  }
  if (alreadyRefunded) {
    return { policyKey, policyName: meta.name, thresholds: meta.thresholds,
      hoursUntilCheckIn: null, refundPct: 0, refundableBaseCents, processingFeeCents: feeCents,
      refundAmountCents: 0, canCancel: false, reason: 'This booking has already been refunded.', bandLabel: null }
  }
  if (isCompleted) {
    return { policyKey, policyName: meta.name, thresholds: meta.thresholds,
      hoursUntilCheckIn: null, refundPct: 0, refundableBaseCents, processingFeeCents: feeCents,
      refundAmountCents: 0, canCancel: false, reason: 'Stay already completed.', bandLabel: null }
  }
  if (isPastCheckIn) {
    return { policyKey, policyName: meta.name, thresholds: meta.thresholds,
      hoursUntilCheckIn: 0, refundPct: 0, refundableBaseCents, processingFeeCents: feeCents,
      refundAmountCents: 0, canCancel: true, reason: 'Check-in date has passed — no refund is due.',
      bandLabel: '0 hours (past check-in)' }
  }

  // Compute the applicable band.
  const hours = hoursBetween(now, booking.check_in + 'T00:00:00Z')
  const bands = POLICY_BANDS[policyKey] || POLICY_BANDS.flexible
  const band = bands.find(([minHours]) => hours >= minHours) || bands[bands.length - 1]
  const refundPct = band[1]

  const refundAmountCents = Math.floor((refundableBaseCents * refundPct) / 100)

  const bandLabel =
    hours >= 24 ? `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} before check-in`
                : `${hours} hour${hours === 1 ? '' : 's'} before check-in`

  const reason = refundPct === 100 ? `You're within the full-refund window (${meta.name} policy).`
              : refundPct ===  50 ? `You're within the partial-refund window (${meta.name} policy — 50%).`
              :                     `You're past the refund window for the ${meta.name} policy.`

  return {
    policyKey, policyName: meta.name, thresholds: meta.thresholds,
    hoursUntilCheckIn: hours,
    refundPct,
    refundableBaseCents,
    processingFeeCents: feeCents,
    refundAmountCents,
    canCancel: true,
    reason,
    bandLabel,
  }
}
