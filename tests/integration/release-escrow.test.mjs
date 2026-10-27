// P1 #4 (guardian/reports/2026-10-05-security-inspection.md): two concurrent
// release-escrow runs must never create two Stripe transfers for one booking.
// Mock phase only (needs the Stripe stub, which delays payment_intent reads so
// concurrent runs really overlap).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  newUser, newHotelier, newProperty, newRoom, newHeldBooking, makeAdmin,
  getBooking, jwtFor, callFn, stubCalls, stubReset,
} from './helpers.mjs'

const phase = process.env.LIGHTNING_PROVIDER ?? 'mock'
const only = phase === 'mock' ? {} : { skip: `mock phase only (current: ${phase})` }
const CRON_SECRET = 'cron_dummy_local'   // dummy, mirrors tests/integration/env.mock

let hotelier, property, room, guest, adminJwt

before(async () => {
  if (phase !== 'mock') return
  hotelier = await newHotelier()
  property = await newProperty(hotelier)
  room = await newRoom(property)
  guest = await newUser('guest')
  const admin = await newUser('admin')
  await makeAdmin(admin)
  adminJwt = await jwtFor(admin)
})

const transfers = calls => calls.filter(c => c.method === 'POST' && c.path === '/v1/transfers')

test('P1#4 five concurrent manual releases of one booking produce exactly one transfer', only, async () => {
  await stubReset()
  const booking = await newHeldBooking(guest, property, room, { payout: 9000 })
  const results = await Promise.all(Array.from({ length: 5 }, () =>
    callFn('release-escrow', { jwt: adminJwt, body: { booking_id: booking.id, reason: 'admin_manual' } })))
  const tx = transfers(await stubCalls())
  assert.equal(tx.length, 1, `transfers created: ${tx.length}`)
  assert.equal(Number(tx[0].body.amount), 9000)
  assert.equal(tx[0].body.destination, hotelier.stripe_account_id)
  const after = await getBooking(booking.id)
  assert.equal(after.escrow_status, 'released')
  assert.match(after.stripe_transfer_id ?? '', /^tr_test_stub_/)
  const releasedCount = results.filter(r => r.status === 200 && r.json?.count === 1).length
  assert.equal(releasedCount, 1, JSON.stringify(results.map(r => [r.status, r.json])))
  // the other four did not mark anything as failed
  assert.equal(after.escrow_status, 'released')
})

test('P1#4 two concurrent cron runs release each due booking once', only, async () => {
  await stubReset()
  const a = await newHeldBooking(guest, property, room, { payout: 5000 })
  const b = await newHeldBooking(guest, property, room, { payout: 7000 })
  const headers = { 'x-cron-secret': CRON_SECRET }
  await Promise.all([
    callFn('release-escrow', { body: { cron: true }, headers }),
    callFn('release-escrow', { body: { cron: true }, headers }),
  ])
  const tx = transfers(await stubCalls())
  const forA = tx.filter(t => t.body.transfer_group === `booking_${a.id}`)
  const forB = tx.filter(t => t.body.transfer_group === `booking_${b.id}`)
  assert.equal(forA.length, 1, `transfers for A: ${forA.length}`)
  assert.equal(forB.length, 1, `transfers for B: ${forB.length}`)
  assert.equal((await getBooking(a.id)).escrow_status, 'released')
  assert.equal((await getBooking(b.id)).escrow_status, 'released')
})

test('the transfer request carries an Idempotency-Key derived from the booking id', only, async () => {
  await stubReset()
  const booking = await newHeldBooking(guest, property, room)
  const res = await callFn('release-escrow', { jwt: adminJwt, body: { booking_id: booking.id } })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const tx = transfers(await stubCalls())
  assert.equal(tx.length, 1)
  assert.equal(tx[0].idempotencyKey, `escrow_release_${booking.id}`)
})

test('a second release after success is refused and creates no transfer', only, async () => {
  await stubReset()
  const booking = await newHeldBooking(guest, property, room)
  const first = await callFn('release-escrow', { jwt: adminJwt, body: { booking_id: booking.id } })
  assert.equal(first.status, 200)
  const second = await callFn('release-escrow', { jwt: adminJwt, body: { booking_id: booking.id } })
  assert.equal(second.status, 409, JSON.stringify(second.json))
  assert.equal(transfers(await stubCalls()).length, 1)
})

test('cron with a wrong secret is refused; a non-admin cannot release', only, async () => {
  await stubReset()
  const booking = await newHeldBooking(guest, property, room)
  const cron = await callFn('release-escrow', { body: { cron: true }, headers: { 'x-cron-secret': 'wrong' } })
  assert.equal(cron.status, 401)
  const user = await callFn('release-escrow', { jwt: await jwtFor(guest), body: { booking_id: booking.id } })
  assert.equal(user.status, 403)
  assert.equal(transfers(await stubCalls()).length, 0)
  assert.equal((await getBooking(booking.id)).escrow_status, 'held')
})
