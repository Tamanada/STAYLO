// Shared helpers for the integration tests. They talk to the LOCAL Supabase
// stack only (supabase start) and refuse to run against anything else.
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

let cached = null
export function localEnv() {
  if (cached) return cached
  const env = {}
  if (process.env.API_URL && process.env.ANON_KEY && process.env.SERVICE_ROLE_KEY) {
    Object.assign(env, { API_URL: process.env.API_URL, ANON_KEY: process.env.ANON_KEY, SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY })
  } else {
    const out = execSync('supabase status -o env', { cwd: repoRoot, encoding: 'utf8' })
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
      if (m) env[m[1]] = m[2]
    }
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.API_URL ?? '')) {
    throw new Error(`Refusing to run integration tests against ${env.API_URL ?? '(no API_URL)'}: local stack only`)
  }
  env.STUB_URL = process.env.STUB_URL ?? 'http://127.0.0.1:4242'
  cached = env
  return env
}

export function serviceClient() {
  const { API_URL, SERVICE_ROLE_KEY } = localEnv()
  return createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function anonClient() {
  const { API_URL, ANON_KEY } = localEnv()
  return createClient(API_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

const rand = () => Math.random().toString(36).slice(2, 10)

export function futureDate(offsetDays) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function addDays(iso, n) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export async function newUser(label = 'user') {
  const supa = serviceClient()
  const email = `${label}-${rand()}@test.local`
  const password = `pw-${rand()}-${rand()}`
  const { data, error } = await supa.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const { error: uErr } = await supa.from('users').insert({ id: data.user.id, email, full_name: label })
  if (uErr) throw uErr
  return { id: data.user.id, email, password }
}

export async function jwtFor(user) {
  const { data, error } = await anonClient().auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return data.session.access_token
}

export async function newHotelier() {
  const user = await newUser('hotelier')
  const stripe_account_id = `acct_test_${rand()}`
  const { error } = await serviceClient().from('stripe_accounts').insert({
    user_id: user.id, stripe_account_id, charges_enabled: true, payouts_enabled: true, details_submitted: true,
  })
  if (error) throw error
  return { ...user, stripe_account_id }
}

export async function newProperty(hotelier, overrides = {}) {
  const { data, error } = await serviceClient().from('properties').insert({
    user_id: hotelier.id,
    name: `Test Property ${rand()}`,
    country: 'TH', city: 'Koh Phangan',
    contact_email: hotelier.email,
    status: 'live',
    currency: 'USD',
    ...overrides,
  }).select().single()
  if (error) throw error
  return data
}

export async function newRoom(property, overrides = {}) {
  const { data, error } = await serviceClient().from('rooms').insert({
    property_id: property.id,
    name: `Room ${rand()}`,
    base_price: 100,
    max_guests: 2,
    quantity: 3,
    ...overrides,
  }).select().single()
  if (error) throw error
  return data
}

export async function setAvailability(room, rows) {
  const { error } = await serviceClient().from('room_availability').insert(
    rows.map(r => ({ room_id: room.id, available_count: room.quantity ?? 1, ...r })),
  )
  if (error) throw error
}

export async function newPackage(property, room, pkg = {}, qty = 1) {
  const supa = serviceClient()
  const { data, error } = await supa.from('packages').insert({
    property_id: property.id, name: `Pkg ${rand()}`, price: 50, pricing_type: 'per_stay', pricing_mode: 'addon', ...pkg,
  }).select().single()
  if (error) throw error
  const { error: lErr } = await supa.from('room_packages').insert({ room_id: room.id, package_id: data.id, qty })
  if (lErr) throw lErr
  return data
}

export async function newBooking(guest, property, room, opts = {}) {
  const checkIn = opts.checkIn ?? futureDate(30)
  const nights = opts.nights ?? 3
  const adults = opts.adults ?? 2
  const children = opts.children ?? 0
  const { data, error } = await serviceClient().from('bookings').insert({
    property_id: property.id,
    room_id: room.id,
    guest_id: guest.id,
    check_in: checkIn,
    check_out: addDays(checkIn, nights),
    guests: adults + children,
    adults, children,
    rooms_count: opts.roomsCount ?? 1,
    package_id: opts.packageId ?? null,
    total_price: opts.totalPrice ?? 0,
    commission: 0,
    status: 'pending',
    guest_name: 'Test Guest',
    guest_email: guest.email,
    ...(opts.extra ?? {}),
  }).select().single()
  if (error) throw error
  return data
}

export async function newInvoice(booking, overrides = {}) {
  const { data, error } = await serviceClient().from('btc_invoices').insert({
    booking_id: booking.id,
    provider: 'mock',
    provider_invoice_id: `mock_${rand()}`,
    bolt11: 'lnbcrt1test',
    payment_hash: rand() + rand(),
    amount_sats: 1000,
    fiat_currency: 'USD',
    fiat_amount_cents: 10000,
    status: 'pending',
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  }).select().single()
  if (error) throw error
  return data
}

export async function getBooking(id) {
  const { data, error } = await serviceClient().from('bookings').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getInvoice(id) {
  const { data, error } = await serviceClient().from('btc_invoices').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** POST to a local Edge Function. `jwt` null = anonymous call. */
export async function callFn(name, { jwt = null, body = {}, raw = null, headers = {} } = {}) {
  const { API_URL, ANON_KEY } = localEnv()
  const h = { 'content-type': 'application/json', apikey: ANON_KEY, ...headers }
  if (jwt) h.authorization = `Bearer ${jwt}`
  const res = await fetch(`${API_URL}/functions/v1/${name}`, { method: 'POST', headers: h, body: raw ?? JSON.stringify(body) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-JSON body */ }
  return { status: res.status, json, text }
}

export async function stubCalls() {
  const res = await fetch(`${localEnv().STUB_URL}/__calls`)
  return res.json()
}

export async function stubReset() {
  await fetch(`${localEnv().STUB_URL}/__calls`, { method: 'DELETE' })
}
