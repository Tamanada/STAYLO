// Same P0 #1 pattern on the Lightning path: crypto-checkout must price the
// invoice from the database, not from the browser. Mock phase only.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  newUser, newHotelier, newProperty, newRoom, newBooking, getBooking, jwtFor, callFn, futureDate,
} from './helpers.mjs'

const phase = process.env.LIGHTNING_PROVIDER ?? 'mock'
const only = phase === 'mock' ? {} : { skip: `mock phase only (current: ${phase})` }

let property, room, guest, guestJwt, checkIn
const ROOM_CENTS = 30000   // 3 nights x 100.00, Lightning fee = 0

before(async () => {
  if (phase !== 'mock') return
  const hotelier = await newHotelier()
  property = await newProperty(hotelier)
  room = await newRoom(property, { base_price: 100 })
  guest = await newUser('guest')
  guestJwt = await jwtFor(guest)
  checkIn = futureDate(45)
})

const body = (booking, extra = {}) => ({
  booking_id: booking.id, booking_ref: booking.booking_ref, room_amount: ROOM_CENTS, processing_fee: 0,
  currency: 'USD', property_id: property.id, property_name: property.name, room_name: room.name, nights: 3,
  guest_email: guest.email, payment_method: 'lightning', ...extra,
})

test('P0#1 (Lightning) tampered room_amount is refused, no invoice created', only, async () => {
  const booking = await newBooking(guest, property, room, { checkIn })
  const res = await callFn('crypto-checkout', { jwt: guestJwt, body: body(booking, { room_amount: 50 }) })
  assert.equal(res.status, 409, JSON.stringify(res.json))
  assert.equal(res.json?.code, 'price_changed')
  const after = await getBooking(booking.id)
  assert.equal(after.payout_amount_cents, null)
})

test('honest Lightning request: invoice carries the server-derived fiat amount', only, async () => {
  const booking = await newBooking(guest, property, room, { checkIn })
  const res = await callFn('crypto-checkout', { jwt: guestJwt, body: body(booking) })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.fiat_amount_cents, ROOM_CENTS)
  assert.equal(res.json.provider, 'mock')
  const after = await getBooking(booking.id)
  assert.equal(after.payout_amount_cents, ROOM_CENTS - Math.round(ROOM_CENTS * 0.10))
  assert.equal(after.processing_fee_cents, 0)
})
