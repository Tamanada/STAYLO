// Public review RPCs (migration 20261115000001): what the OTA property page
// shows must come from stay_reviews, without leaking private rows or names.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { newUser, newHotelier, newProperty, newRoom, newBooking, serviceClient, anonClient, futureDate } from './helpers.mjs'

let property, room, guest

async function addReview(booking, fields) {
  const { error } = await serviceClient().from('stay_reviews').insert({ booking_id: booking.id, ...fields })
  if (error) throw error
}

before(async () => {
  const hotelier = await newHotelier()
  property = await newProperty(hotelier)
  room = await newRoom(property)
  guest = await newUser('guest')
  const b1 = await newBooking(guest, property, room, { checkIn: futureDate(-20) })
  const b2 = await newBooking(guest, property, room, { checkIn: futureDate(-15) })
  const b3 = await newBooking(guest, property, room, { checkIn: futureDate(-10) })
  const b4 = await newBooking(guest, property, room, { checkIn: futureDate(-5) })
  await addReview(b1, { cleanliness: 5, location: 4, vibe: 5, value: 4, service: 5, would_recommend: true, review_text: 'Lovely place', reviewer_name: 'Marie Dupont' })
  await addReview(b2, { cleanliness: 3, location: 3, vibe: null, value: 3, service: 3, would_recommend: false, review_text: 'Average', reviewer_name: 'Kenji Tanaka', is_anonymous: true })
  await addReview(b3, { cleanliness: 1, location: 1, vibe: 1, value: 1, service: 1, would_recommend: false, review_text: 'Complaint, want STAYLO', reviewer_name: 'Angry Guest', needs_staylo_help: true, help_reason: 'noise' })
  await addReview(b4, { cleanliness: 4, would_recommend: true, reviewer_name: 'Sam' })   // ratings only, no text
})

test('anonymous visitors read the public reviews: no complaint rows, first name + initial only', async () => {
  const { data, error } = await anonClient().rpc('get_property_reviews', { p_property_id: property.id, p_limit: 10 })
  assert.equal(error, null, error?.message)
  assert.equal(data.length, 3, 'the complaint stays private')
  const names = data.map(r => r.reviewer_name)
  assert.ok(names.includes('Marie D.'), names.join(','))
  assert.ok(names.includes(null), 'anonymous review has no name')
  assert.ok(names.includes('Sam'))
  assert.ok(!names.some(n => n && n.includes('Dupont')), 'full last name never published')
  const marie = data.find(r => r.reviewer_name === 'Marie D.')
  assert.equal(Number(marie.rating), 9.2)   // (5+4+5+4+5)/5 = 4.6 x 2
  assert.equal(data[0].reviewer_name, 'Sam', 'newest first')
})

test('breakdown averages per aspect on the /10 scale, complaint excluded', async () => {
  const { data, error } = await anonClient().rpc('get_property_review_breakdown', { p_property_id: property.id })
  assert.equal(error, null, error?.message)
  const b = data[0]
  assert.equal(Number(b.review_count), 3)
  assert.equal(Number(b.cleanliness), 8.0)   // (5+3+4)/3 = 4 x 2
  assert.equal(Number(b.location), 7.0)      // (4+3)/2 = 3.5 x 2
  assert.equal(Number(b.vibe), 10.0)         // only Marie rated it
  assert.equal(Number(b.recommend_pct), 67)  // 2 of 3
})

test('the raw table stays closed to anonymous visitors', async () => {
  const { data } = await anonClient().from('stay_reviews').select('id').limit(5)
  assert.deepEqual(data ?? [], [])
})

test('a property without reviews returns an empty list and an empty breakdown', async () => {
  const other = await newProperty(await newHotelier())
  const { data: list } = await anonClient().rpc('get_property_reviews', { p_property_id: other.id })
  assert.deepEqual(list, [])
  const { data: br } = await anonClient().rpc('get_property_review_breakdown', { p_property_id: other.id })
  assert.equal(Number(br[0].review_count), 0)
  assert.equal(br[0].cleanliness, null)
})
