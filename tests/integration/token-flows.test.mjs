// Guest token flows (guardian/TESTS.md, high-risk scenario 7): /checkin/<token>,
// /stay/<token>, /checkout/<token>. A token opens exactly one stay, shows no
// price or payment reference, and cannot be guessed or reused across stays.
// Database-level, as an anonymous visitor (the pages call these RPCs with the
// anon key and no session).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  newUser, newHotelier, newProperty, newRoom, newPackage, newBooking, newPaidBooking,
  serviceClient, anonClient, jwtFor, getBooking, futureDate, localEnv,
} from './helpers.mjs'
import { createClient } from '@supabase/supabase-js'

let hotelier, property, room, guest, stayA, stayB
const RANDOM_TOKEN = '11111111-2222-4333-8444-555555555555'
const anon = () => anonClient()
const rpc = (name, args) => anon().rpc(name, args)
const FORBIDDEN_KEYS = ['total_price', 'payout_amount_cents', 'platform_fee_cents', 'stripe_payment_intent_id', 'stripe_checkout_session_id', 'stripe_transfer_id', 'stripe_refund_id', 'check_in_token', 'check_out_token', 'commission', 'processing_fee_cents']

async function userClient(user) {
  const { API_URL, ANON_KEY } = localEnv()
  const c = createClient(API_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return c
}

before(async () => {
  hotelier = await newHotelier()
  property = await newProperty(hotelier, { wifi_ssid: 'Villa-Guest', wifi_password: 'sunset2026', house_rules: 'Quiet after 22:00' })
  room = await newRoom(property, { max_guests: 2, extra_bed_available: true, extra_bed_max_qty: 1, extra_bed_price: 20 })
  await newPackage(property, room, { name: 'Breakfast', category: 'dining', price: 10, pricing_type: 'per_night' }, 2)
  guest = await newUser('guest')
  // Stay A: in house now, confirmed (vouchers issued by trigger), 2 adults + 1 child on an extra bed
  stayA = await newPaidBooking(guest, property, room, { checkIn: futureDate(-1), extra: { check_out: futureDate(2), adults: 2, children: 1, guests: 3, extra_beds_count: 1 } })
  // Stay B: another guest, same room type, next month
  stayB = await newPaidBooking(await newUser('other'), property, room, { checkIn: futureDate(30) })
})

// ── /checkin ────────────────────────────────────────────────────────────────

test('checkin: a valid token shows the stay without any money field; a random token shows nothing', async () => {
  const { data, error } = await rpc('get_booking_for_checkin', { p_token: stayA.check_in_token })
  assert.equal(error, null, error?.message)
  assert.equal(data.length, 1)
  assert.equal(data[0].booking_id, stayA.id)
  assert.equal(data[0].capacity, 3, 'adults + children + extra beds')
  assert.equal(data[0].registered, 0)
  for (const k of FORBIDDEN_KEYS) assert.ok(!(k in data[0]), `leaks ${k}`)
  const { data: none } = await rpc('get_booking_for_checkin', { p_token: RANDOM_TOKEN })
  assert.deepEqual(none, [])
})

test('checkin: guests register up to the capacity, the first one is the lead, the fourth is refused', async () => {
  const reg = (first, extra = {}) => rpc('register_booking_guest_via_token', { p_token: stayA.check_in_token, p_first_name: first, p_nationality: 'fr', ...extra })
  const r1 = await reg('Marie', { p_last_name: 'Dupont', p_passport_number: '12AB34567' })
  assert.equal(r1.error, null, r1.error?.message)
  const r2 = await reg('Paul')
  assert.equal(r2.error, null, r2.error?.message)
  const r3 = await reg('Lou', { p_is_child: true })
  assert.equal(r3.error, null, r3.error?.message)
  const r4 = await reg('Intruder')
  assert.ok(r4.error, 'capacity reached')
  assert.match(r4.error.message, /already checked in/i)
  const { data: rows } = await serviceClient().from('booking_guests').select('first_name, is_lead, is_child, nationality').eq('booking_id', stayA.id).order('created_at')
  assert.deepEqual(rows.map(r => [r.first_name, r.is_lead, r.is_child, r.nationality]), [['Marie', true, false, 'FR'], ['Paul', false, false, 'FR'], ['Lou', false, true, 'FR']])
  const { data: after } = await rpc('get_booking_for_checkin', { p_token: stayA.check_in_token })
  assert.equal(after[0].registered, 3)
})

test('checkin: an empty first name and an unknown token are refused; a stay checked out 31 days ago is closed', async () => {
  const blank = await rpc('register_booking_guest_via_token', { p_token: stayB.check_in_token, p_first_name: '   ' })
  assert.ok(blank.error)
  const unknown = await rpc('register_booking_guest_via_token', { p_token: RANDOM_TOKEN, p_first_name: 'Ghost' })
  assert.ok(unknown.error)
  const old = await newPaidBooking(guest, property, room, { checkIn: futureDate(-40), extra: { check_out: futureDate(-31), status: 'checked_out' } })
  const { data: hidden } = await rpc('get_booking_for_checkin', { p_token: old.check_in_token })
  assert.deepEqual(hidden, [])
  const late = await rpc('register_booking_guest_via_token', { p_token: old.check_in_token, p_first_name: 'Late' })
  assert.ok(late.error)
})

// ── /stay ───────────────────────────────────────────────────────────────────

test('stay: the token opens its own stay only, with house info but no money or payment reference', async () => {
  const { data, error } = await rpc('get_stay_view', { p_token: stayA.check_in_token })
  assert.equal(error, null, error?.message)
  assert.equal(data.length, 1)
  assert.equal(data[0].booking_id, stayA.id)
  assert.equal(data[0].wifi_password, 'sunset2026')
  assert.equal(data[0].house_rules, 'Quiet after 22:00')
  for (const k of FORBIDDEN_KEYS) assert.ok(!(k in data[0]), `leaks ${k}`)
  const { data: other } = await rpc('get_stay_view', { p_token: stayB.check_in_token })
  assert.equal(other[0].booking_id, stayB.id, 'another token, another stay')
  assert.deepEqual((await rpc('get_stay_view', { p_token: RANDOM_TOKEN })).data, [])
})

test('stay: wallet and folio follow the token; a cancelled stay goes dark', async () => {
  const { data: wallet } = await rpc('get_stay_vouchers', { p_token: stayA.check_in_token })
  assert.equal(wallet.length, 1, 'the breakfast voucher issued at confirmation')
  assert.equal(wallet[0].label, 'Breakfast')
  assert.equal(wallet[0].qty_total, 2 * 3, 'qty 2 x 3 nights')
  assert.equal(wallet[0].qty_remaining, 6)

  await serviceClient().from('booking_charges').insert([
    { booking_id: stayA.id, category: 'bar', description: '2x Singha', unit_price: 90, qty: 2, amount: 180, currency: 'USD', paid: false },
    { booking_id: stayA.id, category: 'spa', description: 'Thai massage', unit_price: 500, qty: 1, amount: 500, currency: 'USD', paid: true },
  ])
  const { data: folio } = await rpc('get_stay_folio', { p_token: stayA.check_in_token })
  assert.equal(Number(folio[0].total), 680)
  assert.equal(Number(folio[0].paid), 500)
  assert.equal(Number(folio[0].unpaid), 180)
  assert.equal(folio[0].charges.length, 2)
  const { data: folioB } = await rpc('get_stay_folio', { p_token: stayB.check_in_token })
  assert.equal(Number(folioB[0].total), 0, 'the other stay sees none of these charges')

  const cancelled = await newPaidBooking(guest, property, room, { checkIn: futureDate(3), extra: { status: 'cancelled' } })
  assert.deepEqual((await rpc('get_stay_view', { p_token: cancelled.check_in_token })).data, [])
  assert.deepEqual((await rpc('get_stay_vouchers', { p_token: cancelled.check_in_token })).data, [])
})

test('vouchers: only the property team consumes them, the guest or a visitor cannot', async () => {
  const { data: [voucher] } = await rpc('get_stay_vouchers', { p_token: stayA.check_in_token })
  const asAnon = await rpc('consume_voucher', { p_voucher_code: voucher.voucher_code, p_qty: 1 })
  assert.ok(asAnon.error, 'anonymous consumption refused')
  const asGuest = await (await userClient(guest)).rpc('consume_voucher', { p_voucher_code: voucher.voucher_code, p_qty: 1 })
  assert.ok(asGuest.error, 'the guest cannot stamp his own voucher')
  const asOwner = await (await userClient(hotelier)).rpc('consume_voucher', { p_voucher_code: voucher.voucher_code, p_qty: 2 })
  assert.equal(asOwner.error, null, asOwner.error?.message)
  const { data: after } = await rpc('get_stay_vouchers', { p_token: stayA.check_in_token })
  assert.equal(after[0].qty_remaining, 4)
})

// ── /checkout ───────────────────────────────────────────────────────────────

test('checkout: a happy review shortens the escrow release to one hour, never before check-out + 1h', async () => {
  const b = await newPaidBooking(guest, property, room, { checkIn: futureDate(-3), extra: { check_out: futureDate(0), escrow_release_at: new Date(Date.now() + 23 * 3600_000).toISOString() } })
  const { data: head } = await rpc('get_booking_for_checkout', { p_token: b.check_out_token })
  assert.equal(head[0].already_submitted, false)
  for (const k of FORBIDDEN_KEYS) assert.ok(!(k in head[0]), `leaks ${k}`)
  const { error } = await rpc('submit_stay_review_via_token', { p_token: b.check_out_token, p_cleanliness: 5, p_location: 4, p_vibe: 5, p_value: 4, p_service: 5, p_would_recommend: true, p_review_text: 'Great', p_reviewer_name: 'Marie Dupont' })
  assert.equal(error, null, error?.message)
  const after = await getBooking(b.id)
  assert.ok(after.checkout_survey_submitted_at)
  const releaseMs = new Date(after.escrow_release_at).getTime()
  const floor = new Date(b.check_out + 'T00:00:00Z').getTime() + 3600_000
  assert.ok(releaseMs <= Date.now() + 3600_000 + 5000 && releaseMs >= floor, `release at ${after.escrow_release_at}`)
  assert.equal((await rpc('get_booking_for_checkout', { p_token: b.check_out_token })).data[0].already_submitted, true)
})

test('checkout: a red flag opens a dispute and freezes the escrow; the checkin token does not open the checkout page', async () => {
  const b = await newPaidBooking(guest, property, room, { checkIn: futureDate(-2), extra: { check_out: futureDate(0) } })
  const { error } = await rpc('submit_stay_review_via_token', { p_token: b.check_out_token, p_cleanliness: 1, p_needs_staylo_help: true, p_help_reason: 'no water for two days' })
  assert.equal(error, null, error?.message)
  const after = await getBooking(b.id)
  assert.equal(after.dispute_status, 'open')
  assert.equal(after.escrow_release_at, null)
  assert.deepEqual((await rpc('get_booking_for_checkout', { p_token: b.check_in_token })).data, [], 'tokens are not interchangeable')
  assert.ok((await rpc('submit_stay_review_via_token', { p_token: RANDOM_TOKEN, p_cleanliness: 5 })).error)
})

test('checkout: one token cannot post more reviews than there are guests on the booking', async () => {
  const b = await newPaidBooking(guest, property, room, { checkIn: futureDate(-2), extra: { check_out: futureDate(0), adults: 2, children: 0, guests: 2 } })
  const post = () => rpc('submit_stay_review_via_token', { p_token: b.check_out_token, p_cleanliness: 5, p_review_text: 'again' })
  assert.equal((await post()).error, null)
  assert.equal((await post()).error, null)
  const third = await post()
  assert.ok(third.error, 'third review from a booking for 2 must be refused')
  const { data: rows } = await serviceClient().from('stay_reviews').select('id').eq('booking_id', b.id)
  assert.equal(rows.length, 2)
})

// ── raw tables ──────────────────────────────────────────────────────────────

test('anonymous visitors read nothing from bookings, booking_guests, guest_vouchers or booking_charges', async () => {
  for (const table of ['bookings', 'booking_guests', 'guest_vouchers', 'booking_charges']) {
    const { data } = await anon().from(table).select('id').limit(1)
    assert.deepEqual(data ?? [], [], `${table} must be closed to anon`)
  }
  const jwt = await jwtFor(guest)
  void jwt
})
