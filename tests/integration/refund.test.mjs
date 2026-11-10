// P1 #3 (guardian/reports/2026-10-05-security-inspection.md): refunds follow
// the CONFIRMED rules. Admin path (refund-booking), guest path (cancel-booking),
// the Stripe webhook on partial refunds, and the escrow remainder release.
// Mock phase only (needs the Stripe stub).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  newUser, newHotelier, newProperty, newRoom, newPaidBooking, newCommission, getCommission, makeAdmin,
  getBooking, jwtFor, callFn, stubCalls, stubReset, futureDate, serviceClient,
} from './helpers.mjs'

const phase = process.env.LIGHTNING_PROVIDER ?? 'mock'
const only = phase === 'mock' ? {} : { skip: `mock phase only (current: ${phase})` }
const WEBHOOK_SECRET = 'whsec_dummy_local'   // dummy, mirrors tests/integration/env.mock

let hotelier, props, room, guest, guestJwt, adminJwt
const ROOM = 30000, PAYOUT = 27000, FEE = 900

before(async () => {
  if (phase !== 'mock') return
  hotelier = await newHotelier()
  props = {}
  for (const policy of ['flexible', 'moderate', 'strict', 'super_strict_30', 'non_refundable']) {
    props[policy] = await newProperty(hotelier, { cancellation_policy: policy })
  }
  room = await newRoom(props.flexible)
  guest = await newUser('guest')
  guestJwt = await jwtFor(guest)
  const admin = await newUser('admin')
  await makeAdmin(admin)
  adminJwt = await jwtFor(admin)
})

const refunds = calls => calls.filter(c => c.method === 'POST' && c.path === '/v1/refunds')
const reversals = calls => calls.filter(c => c.method === 'POST' && /\/reversals$/.test(c.path))
const transfers = calls => calls.filter(c => c.method === 'POST' && c.path === '/v1/transfers')
const adminRefund = (booking, body = {}) => callFn('refund-booking', { jwt: adminJwt, body: { booking_id: booking.id, ...body } })
const guestCancel = (booking, jwt = guestJwt, reason = null) => callFn('cancel-booking', { jwt, body: { booking_id: booking.id, reason } })

// ── admin: refund-booking ──────────────────────────────────────────────────

test('P1#3 admin refund: 100% of the room amount, never the processing fee', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room)
  const res = await adminRefund(b)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const r = refunds(await stubCalls())
  assert.equal(r.length, 1)
  assert.equal(Number(r[0].body.amount), ROOM, 'refund must exclude the 900 fee')
  assert.equal(r[0].idempotencyKey, `refund_${b.id}`)
  assert.equal(res.json.amount_refunded_cents, ROOM)
  const after = await getBooking(b.id)
  assert.equal(after.status, 'cancelled')
  assert.equal(after.escrow_status, 'refunded')
  assert.match(after.stripe_refund_id, /^re_test_stub_/)
  assert.ok(after.refunded_at)
  assert.equal(after.refund_amount_cents, ROOM)
  assert.equal(after.payout_amount_cents, 0)
  assert.equal(after.platform_fee_cents, 0)
})

test('P1#3 admin refund follows the band: moderate at 3 days = 50%, split 90/10, remainder stays in escrow and is released later', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.moderate, room, { checkIn: futureDate(3) })
  const res = await adminRefund(b)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.refund_pct, 50)
  assert.equal(Number(refunds(await stubCalls())[0].body.amount), 15000)
  let after = await getBooking(b.id)
  assert.equal(after.status, 'cancelled')
  assert.equal(after.escrow_status, 'held', 'hotelier is still owed his share of the kept half')
  assert.equal(after.payout_amount_cents, PAYOUT - 13500)
  assert.equal(after.platform_fee_cents, 3000 - 1500)
  // the remainder goes to the hotelier through the normal release
  const rel = await callFn('release-escrow', { jwt: adminJwt, body: { booking_id: b.id } })
  assert.equal(rel.status, 200, JSON.stringify(rel.json))
  const tx = transfers(await stubCalls())
  assert.equal(tx.length, 1)
  assert.equal(Number(tx[0].body.amount), 13500)
  after = await getBooking(b.id)
  assert.equal(after.escrow_status, 'released')
})

test('P1#3 strict at 10 days is 0%: admin gets 409 nothing_to_refund, no Stripe call', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.strict, room)
  const res = await adminRefund(b)
  assert.equal(res.status, 409, JSON.stringify(res.json))
  assert.equal(res.json.code, 'nothing_to_refund')
  assert.equal(res.json.refund_pct, 0)
  assert.equal((await stubCalls()).length, 0)
  assert.equal((await getBooking(b.id)).status, 'confirmed')
})

test('admin override: refund_pct needs a reason, then refunds that share of the room amount only', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.non_refundable, room)
  const noReason = await adminRefund(b, { refund_pct: 100 })
  assert.equal(noReason.status, 400)
  const res = await adminRefund(b, { refund_pct: 100, reason: 'hotel closed by storm' })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(Number(refunds(await stubCalls())[0].body.amount), ROOM)
  const after = await getBooking(b.id)
  assert.match(after.cancellation_reason, /admin override 100%/)
})

test('P1#3 ambassador share: 50% refund reduces the commission by 2% of the refund, STAYLO absorbs the remainder', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.moderate, room, { checkIn: futureDate(3) })
  const commission = await newCommission(b, hotelier, props.moderate, 600)
  const res = await adminRefund(b)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.deepEqual(res.json.split, { hotelier: 13500, ambassador: 300, staylo: 1200 })
  const after = await getBooking(b.id)
  assert.equal(after.payout_amount_cents, 13500)
  assert.equal(after.platform_fee_cents, 3000 - 1200 - 300)
  assert.equal((await getCommission(commission.id)).commission_cents, 300)
})

test('P1#3 one refund per booking: a second call is refused, 3 concurrent calls give exactly one Stripe refund', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room)
  assert.equal((await adminRefund(b)).status, 200)
  const second = await adminRefund(b)
  assert.equal(second.status, 409, JSON.stringify(second.json))
  assert.equal(refunds(await stubCalls()).length, 1)

  await stubReset()
  const c = await newPaidBooking(guest, props.flexible, room)
  const results = await Promise.all([adminRefund(c), adminRefund(c), adminRefund(c)])
  assert.equal(refunds(await stubCalls()).length, 1, 'exactly one Stripe refund')
  assert.equal(results.filter(r => r.status === 200).length, 1, JSON.stringify(results.map(r => [r.status, r.json?.code])))
})

test('P1#3 refund after escrow release: clawback tier 1 reverses the hotelier transfer before the guest is refunded', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room, {
    extra: { escrow_status: 'released', stripe_transfer_id: 'tr_test_ok_1', escrow_released_at: new Date().toISOString() },
  })
  const res = await adminRefund(b)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const calls = await stubCalls()
  const rev = reversals(calls)
  assert.equal(rev.length, 1)
  assert.equal(rev[0].path, '/v1/transfers/tr_test_ok_1/reversals')
  assert.equal(Number(rev[0].body.amount), PAYOUT)
  assert.equal(rev[0].idempotencyKey, `clawback_${b.id}`)
  assert.ok(calls.indexOf(rev[0]) < calls.indexOf(refunds(calls)[0]), 'reversal happens before the refund')
  const after = await getBooking(b.id)
  assert.equal(after.escrow_status, 'refunded')
  assert.match(after.stripe_transfer_reversal_id, /^trr_test_stub_/)
})

test('P1#3 clawback failure: no refund is sent, the booking is untouched and can be retried', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room, {
    extra: { escrow_status: 'released', stripe_transfer_id: 'tr_fail_1' },
  })
  const res = await adminRefund(b)
  assert.equal(res.status, 409, JSON.stringify(res.json))
  assert.equal(res.json.code, 'clawback_failed')
  assert.equal(refunds(await stubCalls()).length, 0)
  const after = await getBooking(b.id)
  assert.equal(after.status, 'confirmed')
  assert.equal(after.escrow_status, 'released')
  assert.equal(after.refund_claimed_at, null, 'claim given back')
})

test('refund-booking guards: non-admin 403, Lightning booking 400', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room)
  assert.equal((await callFn('refund-booking', { jwt: guestJwt, body: { booking_id: b.id } })).status, 403)
  const ln = await newPaidBooking(guest, props.flexible, room, { extra: { stripe_payment_intent_id: null, payment_method: 'lightning' } })
  assert.equal((await adminRefund(ln)).status, 400)
  assert.equal((await stubCalls()).length, 0)
})

// ── guest: cancel-booking ──────────────────────────────────────────────────

test('P1#3 guest cancel, flexible at 10 days: 100% of the room amount, escrow refunded', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room)
  const res = await guestCancel(b, guestJwt, 'change of plans')
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.refundPct, 100)
  assert.equal(res.json.refundAmountCents, ROOM)
  assert.equal(res.json.refundStatus, 'processed')
  assert.equal(Number(refunds(await stubCalls())[0].body.amount), ROOM)
  const after = await getBooking(b.id)
  assert.equal(after.status, 'cancelled')
  assert.equal(after.escrow_status, 'refunded')
  assert.equal(after.cancellation_reason, 'change of plans')
  // idempotent
  const again = await guestCancel(b)
  assert.equal(again.status, 200)
  assert.equal(again.json.idempotent, true)
  assert.equal(refunds(await stubCalls()).length, 1)
})

test('P1#3 guest cancel, strict at 10 days: cancelled with 0 refund, hotelier keeps the escrow', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.strict, room)
  const res = await guestCancel(b)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.refundPct, 0)
  assert.equal(res.json.refundAmountCents, 0)
  assert.equal(res.json.refundStatus, 'skipped')
  assert.equal((await stubCalls()).length, 0)
  const after = await getBooking(b.id)
  assert.equal(after.status, 'cancelled')
  assert.equal(after.escrow_status, 'held')
  assert.equal(after.payout_amount_cents, PAYOUT)
})

test('guest cancel guards: not the owner 403; past check-in gives 0', only, async () => {
  await stubReset()
  const b = await newPaidBooking(guest, props.flexible, room)
  const stranger = await newUser('stranger')
  assert.equal((await guestCancel(b, await jwtFor(stranger))).status, 403)
  const past = await newPaidBooking(guest, props.flexible, room, { checkIn: futureDate(-1), extra: { status: 'checked_in' } })
  const res = await guestCancel(past)
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.refundAmountCents, 0)
  assert.equal(res.json.refundReason, 'past_check_in')
  assert.equal((await stubCalls()).length, 0)
})

test('super_strict_30 is accepted by the database and refunds 100% at 31 days, 0 at 29', only, async () => {
  await stubReset()
  const far = await newPaidBooking(guest, props.super_strict_30, room, { checkIn: futureDate(31) })
  assert.equal((await guestCancel(far)).json.refundPct, 100)
  const near = await newPaidBooking(guest, props.super_strict_30, room, { checkIn: futureDate(29) })
  assert.equal((await guestCancel(near)).json.refundPct, 0)
})

// ── stripe-webhook on refunds ──────────────────────────────────────────────

function signedWebhook(event) {
  const payload = JSON.stringify(event)
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex')
  return callFn('stripe-webhook', { raw: payload, headers: { 'stripe-signature': `t=${t},v1=${v1}` } })
}

test('webhook charge.refunded: a partial refund keeps the escrow held, a full one closes it', only, async () => {
  const partial = await newPaidBooking(guest, props.flexible, room)
  let res = await signedWebhook({ type: 'charge.refunded', data: { object: {
    payment_intent: partial.stripe_payment_intent_id, amount: ROOM + FEE, amount_refunded: 15000, refunds: { data: [{ id: 're_wh_partial' }] },
  } } })
  assert.equal(res.status, 200, res.text)
  let after = await getBooking(partial.id)
  assert.equal(after.escrow_status, 'held')
  assert.equal(after.stripe_refund_id, 're_wh_partial')

  const full = await newPaidBooking(guest, props.flexible, room)
  res = await signedWebhook({ type: 'charge.refunded', data: { object: {
    payment_intent: full.stripe_payment_intent_id, amount: ROOM + FEE, amount_refunded: ROOM + FEE, refunds: { data: [{ id: 're_wh_full' }] },
  } } })
  assert.equal(res.status, 200, res.text)
  after = await getBooking(full.id)
  assert.equal(after.escrow_status, 'refunded')
  assert.equal(after.status, 'cancelled')
})

test('webhook refuses an unsigned charge.refunded', only, async () => {
  const b = await newPaidBooking(guest, props.flexible, room)
  const res = await callFn('stripe-webhook', { raw: JSON.stringify({ type: 'charge.refunded', data: { object: { payment_intent: b.stripe_payment_intent_id, amount: 1, amount_refunded: 1 } } }) })
  assert.equal(res.status, 401)
  assert.equal((await getBooking(b.id)).escrow_status, 'held')
})

test('local database accepts every policy the product offers', only, async () => {
  const { error } = await serviceClient().from('properties').update({ cancellation_policy: 'super_strict_30' }).eq('id', props.strict.id)
  assert.equal(error, null, error?.message)
  await serviceClient().from('properties').update({ cancellation_policy: 'strict' }).eq('id', props.strict.id)
})
