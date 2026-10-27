// P0 #1 (guardian/reports/2026-10-05-security-inspection.md): the checkout
// Edge Function must derive the price from the database and must only pay the
// hotelier of the booking's property. Runs in the `mock` phase of
// tests/integration/run.mjs (needs the Stripe stub and the local stack).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  newUser, newHotelier, newProperty, newRoom, setAvailability, newPackage, newBooking,
  getBooking, jwtFor, callFn, stubCalls, stubReset, futureDate, addDays,
} from './helpers.mjs'

const phase = process.env.LIGHTNING_PROVIDER ?? 'mock'
const only = phase === 'mock' ? {} : { skip: `checkout tests run in the mock phase (current: ${phase})` }

let hotelierA, propertyA, roomA, hotelierB, propertyB, guest, guestJwt, checkIn
// Room A: 100/night, one night overridden to 150 with a 10% promo -> 3 nights = 100 + 135 + 100 = 335.00
const ROOM_CENTS = 33500
const FEE_CENTS = Math.round(335 * 0.03 * 100)   // 1005, card = 3%

before(async () => {
  if (phase !== 'mock') return
  hotelierA = await newHotelier()
  propertyA = await newProperty(hotelierA)
  roomA = await newRoom(propertyA, { base_price: 100, max_guests: 2, quantity: 3 })
  checkIn = futureDate(30)
  await setAvailability(roomA, [{ date: addDays(checkIn, 1), price_override: 150, promo_pct: 10 }])
  hotelierB = await newHotelier()
  propertyB = await newProperty(hotelierB)
  guest = await newUser('guest')
  guestJwt = await jwtFor(guest)
})

function honestBody(booking, extra = {}) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    room_amount: ROOM_CENTS,
    processing_fee: FEE_CENTS,
    currency: 'USD',
    property_id: propertyA.id,
    property_name: propertyA.name,
    room_name: roomA.name,
    nights: 3,
    guest_email: guest.email,
    payment_method: 'card',
    ...extra,
  }
}

test('P0#1 tampered room_amount (50 instead of 33500) is refused and never reaches Stripe', only, async () => {
  await stubReset()
  const booking = await newBooking(guest, propertyA, roomA, { checkIn })
  const res = await callFn('checkout', { jwt: guestJwt, body: honestBody(booking, { room_amount: 50, processing_fee: 0 }) })
  assert.equal(res.status, 409, JSON.stringify(res.json))
  assert.equal(res.json?.code, 'price_changed')
  assert.equal(res.json?.server?.room_amount_cents, ROOM_CENTS)
  const calls = await stubCalls()
  assert.equal(calls.length, 0, `Stripe was called: ${JSON.stringify(calls)}`)
  const after = await getBooking(booking.id)
  assert.equal(after.stripe_checkout_session_id, null)
  assert.equal(after.payout_amount_cents, null)
})

test('P0#1 swapped property_id (another hotelier) is refused and never reaches Stripe', only, async () => {
  await stubReset()
  const booking = await newBooking(guest, propertyA, roomA, { checkIn })
  const res = await callFn('checkout', { jwt: guestJwt, body: honestBody(booking, { property_id: propertyB.id }) })
  assert.equal(res.status, 400, JSON.stringify(res.json))
  assert.equal(res.json?.code, 'property_mismatch')
  const calls = await stubCalls()
  assert.equal(calls.length, 0, `Stripe was called: ${JSON.stringify(calls)}`)
  const after = await getBooking(booking.id)
  assert.equal(after.stripe_checkout_session_id, null)
})

test('honest request: Stripe receives the server-derived total and the booking hotelier account', only, async () => {
  await stubReset()
  const booking = await newBooking(guest, propertyA, roomA, { checkIn })
  const res = await callFn('checkout', { jwt: guestJwt, body: honestBody(booking) })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.match(res.json.url, /^https:\/\/checkout\.stripe\.test\//)
  assert.equal(res.json.total_charged_cents, ROOM_CENTS + FEE_CENTS)
  assert.equal(res.json.payout_amount_cents, ROOM_CENTS - Math.round(ROOM_CENTS * 0.10))
  const calls = await stubCalls()
  assert.equal(calls.length, 1)
  const session = calls[0].body
  assert.equal(Number(session.line_items[0].price_data.unit_amount), ROOM_CENTS + FEE_CENTS)
  assert.equal(session.metadata.hotelier_stripe_account_id, hotelierA.stripe_account_id)
  assert.equal(session.metadata.property_id, propertyA.id)
  const after = await getBooking(booking.id)
  assert.equal(after.payout_amount_cents, ROOM_CENTS - Math.round(ROOM_CENTS * 0.10))
  assert.equal(after.platform_fee_cents, Math.round(ROOM_CENTS * 0.10))
  assert.equal(after.processing_fee_cents, FEE_CENTS)
  assert.equal(Number(after.total_price), (ROOM_CENTS + FEE_CENTS) / 100)
})

test('amount omitted by the client: the server amount is used', only, async () => {
  await stubReset()
  const booking = await newBooking(guest, propertyA, roomA, { checkIn })
  const body = honestBody(booking)
  delete body.room_amount
  delete body.processing_fee
  const res = await callFn('checkout', { jwt: guestJwt, body })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const calls = await stubCalls()
  assert.equal(Number(calls[0].body.line_items[0].price_data.unit_amount), ROOM_CENTS + FEE_CENTS)
})

test('extra bed and add-on package are part of the charged amount', only, async () => {
  await stubReset()
  const room = await newRoom(propertyA, {
    base_price: 100, max_guests: 2, quantity: 2,
    extra_bed_available: true, extra_bed_max_qty: 1, extra_bed_price: 20,
  })
  const pkg = await newPackage(propertyA, room, { price: 30, pricing_type: 'per_night', pricing_mode: 'addon' }, 2)
  // guests = adults only: the DB trigger enforce_booking_max_guests counts
  // `guests` against max_guests x rooms_count and would refuse the child even
  // though the extra bed exists for exactly that case (pre-existing product
  // defect, recorded in guardian/reports/2026-10-27-p0-fixes-local-tests.md).
  const booking = await newBooking(guest, propertyA, room, { checkIn, nights: 2, adults: 2, children: 1, packageId: pkg.id, extra: { guests: 2 } })
  // room 2 x 100 = 200; extra bed 1 x 20 x 2 nights = 40; package 30 x qty 2 x 2 nights = 120 -> 360.00
  const expectedRoom = 36000
  const expectedFee = Math.round(360 * 0.03 * 100)
  const res = await callFn('checkout', { jwt: guestJwt, body: honestBody(booking, { room_amount: expectedRoom, processing_fee: expectedFee, room_name: room.name, nights: 2 }) })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const calls = await stubCalls()
  assert.equal(Number(calls[0].body.line_items[0].price_data.unit_amount), expectedRoom + expectedFee)
})

test('another signed-in user cannot check out my booking', only, async () => {
  await stubReset()
  const booking = await newBooking(guest, propertyA, roomA, { checkIn })
  const stranger = await newUser('stranger')
  const res = await callFn('checkout', { jwt: await jwtFor(stranger), body: honestBody(booking) })
  assert.equal(res.status, 403)
  assert.equal((await stubCalls()).length, 0)
})

test('a blocked night is refused', only, async () => {
  await stubReset()
  const room = await newRoom(propertyA, { base_price: 100 })
  const blockedIn = futureDate(60)
  await setAvailability(room, [{ date: blockedIn, is_blocked: true, available_count: 0 }])
  const booking = await newBooking(guest, propertyA, room, { checkIn: blockedIn, nights: 2 })
  const res = await callFn('checkout', { jwt: guestJwt, body: honestBody(booking, { room_amount: 20000, processing_fee: 600, room_name: room.name, nights: 2 }) })
  assert.equal(res.status, 409, JSON.stringify(res.json))
  assert.equal(res.json?.code, 'dates_unavailable')
  assert.equal((await stubCalls()).length, 0)
})
