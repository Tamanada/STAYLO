// Database guards on bookings (no Edge Function involved): the max-guests
// trigger must count booked extra beds (migration 20261115000000).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { newUser, newHotelier, newProperty, newRoom, newBooking, futureDate } from './helpers.mjs'

let property, roomWithBed, roomNoBed, guest

before(async () => {
  const hotelier = await newHotelier()
  property = await newProperty(hotelier)
  roomWithBed = await newRoom(property, { max_guests: 2, extra_bed_available: true, extra_bed_max_qty: 1, extra_bed_price: 20 })
  roomNoBed = await newRoom(property, { max_guests: 2, extra_bed_available: false })
  guest = await newUser('guest')
})

const tryBooking = async (room, opts) => {
  try { await newBooking(guest, property, room, { checkIn: futureDate(20), ...opts }); return 'ok' }
  catch (e) { return e.code ?? e.message }
}

test('3 guests in a room for 2 with one extra bed booked is accepted', async () => {
  assert.equal(await tryBooking(roomWithBed, { adults: 2, children: 1, extra: { extra_beds_count: 1 } }), 'ok')
})

test('3 guests in a room for 2 without extra bed is refused (23514)', async () => {
  assert.equal(await tryBooking(roomWithBed, { adults: 2, children: 1 }), '23514')
  assert.equal(await tryBooking(roomNoBed, { adults: 2, children: 1, extra: { extra_beds_count: 1 } }), '23514', 'room offers no extra bed')
})

test('extra beds beyond what the room offers do not raise the capacity', async () => {
  assert.equal(await tryBooking(roomWithBed, { adults: 2, children: 2, extra: { extra_beds_count: 2 } }), '23514')
  assert.equal(await tryBooking(roomWithBed, { adults: 4, children: 2, roomsCount: 2, extra: { extra_beds_count: 2 } }), 'ok')
})
