// Auto-issued vouchers (migration 20260604010000, applied in production on
// 2026-11-15): when a booking becomes confirmed, every active package linked
// to its room becomes a voucher in the guest wallet.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { newUser, newHotelier, newProperty, newRoom, newPackage, newBooking, serviceClient, anonClient, futureDate } from './helpers.mjs'

let property, room, guest, breakfast, spa

const vouchersOf = async bookingId => {
  const { data, error } = await serviceClient().from('guest_vouchers').select('*').eq('booking_id', bookingId).order('label')
  if (error) throw error
  return data
}
const setStatus = async (bookingId, status) => {
  const { error } = await serviceClient().from('bookings').update({ status }).eq('id', bookingId)
  if (error) throw error
}

before(async () => {
  const hotelier = await newHotelier()
  property = await newProperty(hotelier)
  room = await newRoom(property)
  guest = await newUser('guest')
  breakfast = await newPackage(property, room, { name: 'Breakfast', category: 'dining', price: 10, pricing_type: 'per_night' }, 2)
  spa = await newPackage(property, room, { name: 'Spa hour', category: 'wellness', price: 50, pricing_type: 'per_stay' }, 1)
  await newPackage(property, room, { name: 'Old offer', category: 'other', price: 1, is_active: false }, 1)
})

test('a pending booking has no voucher; confirming it issues one per active package with the right quantity', async () => {
  const b = await newBooking(guest, property, room, { checkIn: futureDate(5), nights: 3 })
  assert.deepEqual(await vouchersOf(b.id), [])
  await setStatus(b.id, 'confirmed')
  const v = await vouchersOf(b.id)
  assert.deepEqual(v.map(x => x.label), ['Breakfast', 'Spa hour'], 'inactive package ignored')
  const bf = v.find(x => x.label === 'Breakfast')
  assert.equal(bf.qty_total, 2 * 3, 'per_night: qty x nights')
  assert.equal(bf.source, 'package')
  assert.equal(bf.source_ref, breakfast.id)
  assert.equal(bf.kind, 'dining')
  assert.equal(bf.valid_from, b.check_in)
  assert.equal(bf.valid_until, b.check_out)
  assert.match(bf.voucher_code, /\S+/)
  assert.equal(v.find(x => x.label === 'Spa hour').qty_total, 1)
  assert.equal(v.find(x => x.label === 'Spa hour').source_ref, spa.id)
})

test('idempotent: check-in and manual re-issue do not duplicate vouchers', async () => {
  const b = await newBooking(guest, property, room, { checkIn: futureDate(6), nights: 2 })
  await setStatus(b.id, 'confirmed')
  await setStatus(b.id, 'checked_in')
  const { data: again } = await serviceClient().rpc('issue_vouchers_for_booking', { p_booking_id: b.id })
  assert.equal(again, 0)
  assert.equal((await vouchersOf(b.id)).length, 2)
})

test('a walk-in inserted directly as checked_in gets its vouchers; a cancelled booking gets none', async () => {
  const walkIn = await newBooking(guest, property, room, { checkIn: futureDate(0), nights: 1, extra: { status: 'checked_in', booking_source: 'walk_in' } })
  assert.equal((await vouchersOf(walkIn.id)).length, 2)
  const c = await newBooking(guest, property, room, { checkIn: futureDate(7), nights: 1 })
  await setStatus(c.id, 'cancelled')
  assert.deepEqual(await vouchersOf(c.id), [])
})

test('the issuing function is not callable by anonymous visitors (migration 20261115000002)', async () => {
  const b = await newBooking(guest, property, room, { checkIn: futureDate(8), nights: 1 })
  const { error } = await anonClient().rpc('issue_vouchers_for_booking', { p_booking_id: b.id })
  assert.ok(error, 'anon must be refused')
  assert.equal(error.code, '42501', error.message)
  assert.deepEqual(await vouchersOf(b.id), [])
})
