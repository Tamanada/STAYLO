// The CONFIRMED refund rules (guardian/RULES.md, guardian/ACCOUNTING.md) as
// executable checks on supabase/functions/_shared/refund.ts, plus parity with
// the browser preview src/lib/cancellationPolicy.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  POLICY_BANDS, refundPctFor, hoursUntilCheckIn, splitRefund, roomAmountCents, computeRefundPlan,
} from '../../supabase/functions/_shared/refund.ts'
import { computeCancellationRefund } from '../../src/lib/cancellationPolicy.js'

const H = 1
const D = 24

test('bands are the CONFIRMED ones, checked at every boundary', () => {
  const cases = [
    ['flexible', 24 * H, 100], ['flexible', 23 * H, 0], ['flexible', 0, 0],
    ['moderate', 7 * D, 100], ['moderate', 7 * D - 1, 50], ['moderate', 48 * H, 50], ['moderate', 47 * H, 0],
    ['strict', 14 * D, 100], ['strict', 14 * D - 1, 0], ['strict', 7 * D, 0],
    ['super_strict_30', 30 * D, 100], ['super_strict_30', 30 * D - 1, 0],
    ['non_refundable', 365 * D, 0], ['non_refundable', 0, 0],
    ['unknown_policy', 24 * H, 100],   // unknown falls back to flexible
  ]
  for (const [policy, hours, pct] of cases) {
    assert.equal(refundPctFor(policy, hours), pct, `${policy} @ ${hours}h`)
  }
  assert.deepEqual(Object.keys(POLICY_BANDS), ['flexible', 'moderate', 'strict', 'super_strict_30', 'non_refundable'])
})

test('hours are floored: 23h59 before check-in is the under-24h band', () => {
  assert.equal(hoursUntilCheckIn('2026-12-09T00:01:00Z', '2026-12-10'), 23)
  assert.equal(hoursUntilCheckIn('2026-12-09T00:00:00Z', '2026-12-10'), 24)
  assert.equal(hoursUntilCheckIn('2026-12-10T05:00:00Z', '2026-12-10'), -5)
})

test('split: hotelier first, ambassador second, STAYLO absorbs the remainder; sums exact for 1..20000', () => {
  for (let r = 1; r <= 20000; r++) {
    for (const amb of [false, true]) {
      const s = splitRefund(r, amb)
      assert.equal(s.hotelier + s.ambassador + s.staylo, r, `sum ${r} amb=${amb}`)
      assert.equal(s.hotelier, Math.round(r * 0.9))
      assert.equal(s.ambassador, amb ? Math.round(r * 0.02) : 0)
    }
  }
  // The documented edge: room 1175 -> 1058/24/93, refund 1166 -> 1049/23/94
  assert.deepEqual(splitRefund(1175, true), { hotelier: 1058, ambassador: 24, staylo: 93 })
  assert.deepEqual(splitRefund(1166, true), { hotelier: 1049, ambassador: 23, staylo: 94 })
})

test('refund base is the room amount, never the processing fee; amount is round(), not floor()', () => {
  const booking = { status: 'confirmed', check_in: '2026-12-20', total_price: 103.25, processing_fee_cents: 301, payout_amount_cents: 9022, platform_fee_cents: 1002 }
  assert.equal(roomAmountCents(booking), 10024)
  const plan = computeRefundPlan({ booking, policyKey: 'moderate', nowIso: '2026-12-16T00:00:00Z', hasAmbassador: false })
  assert.equal(plan.refundPct, 50)
  assert.equal(plan.refundCents, Math.round(10024 * 0.5))   // 5012
  assert.equal(plan.processingFeeCents, 301)
  // odd room amount: round, not floor
  const odd = computeRefundPlan({ booking: { ...booking, payout_amount_cents: 9001, platform_fee_cents: 1000 }, policyKey: 'moderate', nowIso: '2026-12-16T00:00:00Z', hasAmbassador: false })
  assert.equal(odd.roomCents, 10001)
  assert.equal(odd.refundCents, 5001)   // floor would give 5000
})

test('plan leaves the right remainder on payout, platform fee and ambassador commission', () => {
  const booking = { status: 'confirmed', check_in: '2026-12-20', processing_fee_cents: 900, payout_amount_cents: 27000, platform_fee_cents: 3000 }
  const plan = computeRefundPlan({ booking, policyKey: 'moderate', nowIso: '2026-12-16T12:00:00Z', hasAmbassador: true, ambassadorCents: 600 })
  assert.equal(plan.refundCents, 15000)
  assert.deepEqual(plan.split, { hotelier: 13500, ambassador: 300, staylo: 1200 })
  assert.deepEqual(plan.remaining, { payoutCents: 13500, platformFeeCents: 1500, ambassadorCents: 300 })
  // full refund empties everything
  const full = computeRefundPlan({ booking, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: true, ambassadorCents: 600 })
  assert.equal(full.refundCents, 30000)
  assert.deepEqual(full.remaining, { payoutCents: 0, platformFeeCents: 0, ambassadorCents: 0 })
})

test('terminal states: cancelled or refunded bookings are not eligible; past check-in refunds 0', () => {
  const base = { check_in: '2026-12-20', payout_amount_cents: 9000, platform_fee_cents: 1000 }
  assert.equal(computeRefundPlan({ booking: { ...base, status: 'cancelled' }, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false }).eligible, false)
  assert.equal(computeRefundPlan({ booking: { ...base, status: 'confirmed', refunded_at: '2026-12-01T00:00:00Z' }, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false }).reason, 'already_refunded')
  assert.equal(computeRefundPlan({ booking: { ...base, status: 'confirmed', stripe_refund_id: 're_1' }, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false }).eligible, false)
  assert.equal(computeRefundPlan({ booking: { ...base, status: 'checked_out' }, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false }).reason, 'stay_completed')
  const past = computeRefundPlan({ booking: { ...base, status: 'checked_in' }, policyKey: 'flexible', nowIso: '2026-12-21T00:00:00Z', hasAmbassador: false })
  assert.equal(past.eligible, true)
  assert.equal(past.refundCents, 0)
  assert.equal(past.reason, 'past_check_in')
})

test('admin override replaces the band but never touches the fee, and is clamped to 0..100', () => {
  const booking = { status: 'confirmed', check_in: '2026-12-20', processing_fee_cents: 900, payout_amount_cents: 27000, platform_fee_cents: 3000 }
  const nr = computeRefundPlan({ booking, policyKey: 'non_refundable', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false, pctOverride: 100 })
  assert.equal(nr.refundCents, 30000)
  assert.equal(nr.reason, 'admin_override')
  assert.equal(computeRefundPlan({ booking, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false, pctOverride: 250 }).refundCents, 30000)
  assert.equal(computeRefundPlan({ booking, policyKey: 'flexible', nowIso: '2026-12-01T00:00:00Z', hasAmbassador: false, pctOverride: -5 }).refundCents, 0)
})

test('browser preview (cancellationPolicy.js) agrees with the server on 3000 random bookings', () => {
  let s = 20261110
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  const policies = ['flexible', 'moderate', 'strict', 'super_strict_30', 'non_refundable', null]
  for (let i = 0; i < 3000; i++) {
    const room = 50 + Math.floor(r() * 500000)
    const fee = r() < 0.5 ? Math.round(room * 0.03) : 0
    const payout = room - Math.round(room * 0.10)
    const booking = {
      status: ['confirmed', 'pending', 'checked_in'][Math.floor(r() * 3)],
      check_in: '2027-01-15',
      total_price: (room + fee) / 100,
      processing_fee_cents: fee,
      payout_amount_cents: payout,
      platform_fee_cents: room - payout,
    }
    const nowIso = new Date(Date.UTC(2027, 0, 15) - Math.floor(r() * 45 * 24 * 3600) * 1000 + 1000).toISOString()
    const policy = policies[Math.floor(r() * policies.length)]
    const a = computeCancellationRefund({ booking, property: { cancellation_policy: policy }, nowIso })
    const b = computeRefundPlan({ booking, policyKey: policy, nowIso, hasAmbassador: false })
    assert.equal(a.refundPct, b.refundPct, `pct #${i} ${policy} ${nowIso}`)
    assert.equal(a.refundAmountCents, b.refundCents, `cents #${i} ${policy} ${nowIso}`)
    assert.equal(a.refundableBaseCents, b.roomCents, `base #${i}`)
    assert.equal(a.processingFeeCents, b.processingFeeCents, `fee #${i}`)
  }
})
