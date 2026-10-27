// P0 #2 (guardian/reports/2026-10-05-security-inspection.md): the provider
// path of crypto-webhook must never confirm a payment without a verified
// provider signature, and must be closed while the provider is the mock.
// mock phase: LIGHTNING_PROVIDER=mock. btcpay phase: LIGHTNING_PROVIDER=btcpay
// with BTCPAY_WEBHOOK_SECRET=btcpay_dummy_local_secret (tests/integration/env.btcpay).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  newUser, newHotelier, newProperty, newRoom, newBooking, newInvoice,
  getBooking, getInvoice, jwtFor, callFn,
} from './helpers.mjs'

const phase = process.env.LIGHTNING_PROVIDER ?? 'mock'
const mockOnly = phase === 'mock' ? {} : { skip: `mock phase only (current: ${phase})` }
const btcpayOnly = phase === 'btcpay' ? {} : { skip: `btcpay phase only (current: ${phase})` }
const BTCPAY_SECRET = 'btcpay_dummy_local_secret'   // dummy, mirrors env.btcpay

let property, room, guest, guestJwt

before(async () => {
  const hotelier = await newHotelier()
  property = await newProperty(hotelier)
  room = await newRoom(property)
  guest = await newUser('guest')
  guestJwt = await jwtFor(guest)
})

async function pendingInvoice(overrides = {}) {
  const booking = await newBooking(guest, property, room)
  const invoice = await newInvoice(booking, overrides)
  return { booking, invoice }
}

async function assertUntouched(booking, invoice) {
  const inv = await getInvoice(invoice.id)
  const bk = await getBooking(booking.id)
  assert.equal(inv.status, 'pending', 'invoice must stay pending')
  assert.equal(bk.escrow_status, 'none', 'booking must stay out of escrow')
  assert.equal(bk.status, 'pending')
}

// ── mock phase ─────────────────────────────────────────────────────────────

test('P0#2 unsigned provider-style payload does not confirm a payment while the provider is the mock', mockOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const res = await callFn('crypto-webhook', { body: { id: invoice.provider_invoice_id, type: 'invoice.paid' } })
  assert.equal(res.status, 403, JSON.stringify(res.json))
  await assertUntouched(booking, invoice)
})

test('P0#2 same payload with a guest JWT (not the owner) is also refused', mockOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const stranger = await newUser('stranger')
  const res = await callFn('crypto-webhook', { jwt: await jwtFor(stranger), body: { id: invoice.provider_invoice_id, type: 'paid' } })
  assert.equal(res.status, 403, JSON.stringify(res.json))
  await assertUntouched(booking, invoice)
})

test('mock self-pay by the booking owner still works (Alpha demo path)', mockOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const res = await callFn('crypto-webhook', { jwt: guestJwt, body: { invoice_id: invoice.id, mock_action: 'pay' } })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal((await getInvoice(invoice.id)).status, 'paid')
  const bk = await getBooking(booking.id)
  assert.equal(bk.status, 'confirmed')
  assert.equal(bk.escrow_status, 'held')
})

test('mock self-pay by another user is refused', mockOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const stranger = await newUser('stranger')
  const res = await callFn('crypto-webhook', { jwt: await jwtFor(stranger), body: { invoice_id: invoice.id, mock_action: 'pay' } })
  assert.equal(res.status, 403)
  await assertUntouched(booking, invoice)
})

test('mock self-pay without a JWT is refused', mockOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const res = await callFn('crypto-webhook', { body: { invoice_id: invoice.id, mock_action: 'pay' } })
  assert.equal(res.status, 401)
  await assertUntouched(booking, invoice)
})

// ── btcpay phase ───────────────────────────────────────────────────────────

const sign = raw => 'sha256=' + createHmac('sha256', BTCPAY_SECRET).update(raw).digest('hex')

test('btcpay: unsigned and wrongly signed webhooks are refused', btcpayOnly, async () => {
  const { booking, invoice } = await pendingInvoice({ provider: 'btcpay', provider_invoice_id: `btcpay_${Date.now()}` })
  const raw = JSON.stringify({ id: invoice.provider_invoice_id, type: 'InvoiceSettled' })
  const unsigned = await callFn('crypto-webhook', { raw })
  assert.equal(unsigned.status, 401, JSON.stringify(unsigned.json))
  const wrong = await callFn('crypto-webhook', { raw, headers: { 'BTCPay-Sig': 'sha256=' + '0'.repeat(64) } })
  assert.equal(wrong.status, 401, JSON.stringify(wrong.json))
  await assertUntouched(booking, invoice)
})

test('btcpay: a correctly signed settlement confirms the invoice and holds escrow', btcpayOnly, async () => {
  const { booking, invoice } = await pendingInvoice({ provider: 'btcpay', provider_invoice_id: `btcpay_${Date.now()}_ok` })
  const raw = JSON.stringify({ id: invoice.provider_invoice_id, type: 'InvoiceSettled' })
  const res = await callFn('crypto-webhook', { raw, headers: { 'BTCPay-Sig': sign(raw) } })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal((await getInvoice(invoice.id)).status, 'paid')
  const bk = await getBooking(booking.id)
  assert.equal(bk.status, 'confirmed')
  assert.equal(bk.escrow_status, 'held')
  // replay is idempotent
  const again = await callFn('crypto-webhook', { raw, headers: { 'BTCPay-Sig': sign(raw) } })
  assert.equal(again.status, 200)
  assert.equal(again.json?.already_paid, true)
})

test('btcpay: a signed webhook cannot confirm an invoice of another provider (mock)', btcpayOnly, async () => {
  const { booking, invoice } = await pendingInvoice()   // provider = mock
  const raw = JSON.stringify({ id: invoice.provider_invoice_id, type: 'InvoiceSettled' })
  const res = await callFn('crypto-webhook', { raw, headers: { 'BTCPay-Sig': sign(raw) } })
  assert.equal(res.status, 200)
  assert.equal(res.json?.ignored, true)
  await assertUntouched(booking, invoice)
})

test('btcpay: the mock self-pay path is closed once a real provider is configured', btcpayOnly, async () => {
  const { booking, invoice } = await pendingInvoice()
  const res = await callFn('crypto-webhook', { jwt: guestJwt, body: { invoice_id: invoice.id, mock_action: 'pay' } })
  assert.equal(res.status, 403, JSON.stringify(res.json))
  await assertUntouched(booking, invoice)
})
