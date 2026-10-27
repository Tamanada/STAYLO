// Parity: the server pricing module (supabase/functions/_shared/pricing.ts)
// must produce the same numbers as the browser helpers it was ported from.
// Runs in Node 24 (type stripping on by default): `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computeRoomPricing as browserRoomPricing } from '../../src/lib/roomPricing.js'
import { applyPackagePricing as browserPackagePricing } from '../../src/lib/packagePricing.js'
import {
  computeRoomPricing, computePackageCost, computeExtraBeds, deriveBookingCharge, PROCESSING_FEE_RATES,
} from '../../supabase/functions/_shared/pricing.ts'

// Deterministic PRNG so a failure is reproducible.
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
}

function addDays(iso, n) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function randomRoom(r) {
  const base = Math.round((20 + r() * 480) * 100) / 100
  return {
    base_price: r() < 0.5 ? base : String(base),              // numeric comes back as string from PostgREST sometimes
    monthly_rate: r() < 0.3 ? Math.round(base * 20) : null,
    monthly_min_nights: 28,
    weekly_discount_pct: r() < 0.3 ? Math.floor(r() * 40) : 0,
    weekly_min_nights: 7,
    max_guests: 1 + Math.floor(r() * 4),
    extra_bed_available: r() < 0.5,
    extra_bed_max_qty: Math.floor(r() * 3),
    extra_bed_price: r() < 0.7 ? Math.round(r() * 50) : null,
    extra_bed_adults_allowed: r() < 0.3,
  }
}

function randomAvailability(r, checkIn, nights) {
  const rows = []
  for (let i = -1; i <= nights; i++) {
    if (r() < 0.6) continue
    rows.push({
      date: addDays(checkIn, i),
      price_override: r() < 0.5 ? Math.round(r() * 300 * 100) / 100 : null,
      is_blocked: r() < 0.05,
      min_stay: r() < 0.2 ? 1 + Math.floor(r() * 5) : null,
      promo_pct: r() < 0.3 ? Math.floor(r() * 50) : null,
      promo_label: r() < 0.2 ? 'Half Moon' : null,
      perk: r() < 0.1 ? 'Free breakfast' : null,
    })
  }
  return rows
}

function randomPackage(r) {
  if (r() < 0.5) return null
  return {
    price: Math.round(r() * 500),
    pricing_type: ['per_stay', 'per_night', 'per_person'][Math.floor(r() * 3)],
    pricing_mode: r() < 0.3 ? 'replace' : 'addon',
  }
}

test('room pricing: server port matches the browser helper on 2000 random stays', () => {
  const r = rng(20261027)
  for (let i = 0; i < 2000; i++) {
    const nights = 1 + Math.floor(r() * 35)
    const checkIn = addDays('2026-11-01', Math.floor(r() * 300))
    const checkOut = addDays(checkIn, nights)
    const roomsCount = 1 + Math.floor(r() * 3)
    const room = { ...randomRoom(r), room_availability: randomAvailability(r, checkIn, nights) }

    const a = browserRoomPricing(room, checkIn, checkOut, roomsCount)
    const b = computeRoomPricing(room, checkIn, checkOut, roomsCount)

    assert.equal(b.nights, a.nights, `nights #${i}`)
    assert.equal(b.discountedTotal, a.discountedTotal, `discountedTotal #${i}`)
    assert.equal(b.originalTotal, a.originalTotal, `originalTotal #${i}`)
    assert.equal(b.minStayRequired, a.minStayRequired, `minStayRequired #${i}`)
    assert.equal(b.minStayOK, a.minStayOK, `minStayOK #${i}`)
    assert.equal(b.hasBlockedDay, a.hasBlockedDay, `hasBlockedDay #${i}`)
    assert.equal(b.longStayTier, a.longStayTier, `longStayTier #${i}`)
  }
})

test('package cost: server port matches the browser helper', () => {
  const r = rng(7)
  for (let i = 0; i < 500; i++) {
    const pkg = randomPackage(r)
    const nights = 1 + Math.floor(r() * 14)
    const qty = 1 + Math.floor(r() * 4)
    const guests = 1 + Math.floor(r() * 6)
    const base = { discountedTotal: Math.round(r() * 1000) }
    const a = browserPackagePricing(base, pkg, nights, qty, guests)
    const b = computePackageCost(pkg, nights, qty, guests)
    assert.equal(b.packageCost, a.packageCost, `packageCost #${i}`)
    assert.equal(b.packageMode, a.packageMode, `packageMode #${i}`)
  }
})

test('extra beds: children overflow, adult overflow only when allowed, capped by room', () => {
  const room = { max_guests: 2, extra_bed_available: true, extra_bed_max_qty: 1, extra_bed_price: 15, extra_bed_adults_allowed: false }
  assert.deepEqual(computeExtraBeds(room, 2, 1, 1, 3), { extraBedsCount: 1, extraBedSubtotal: 45 })
  assert.deepEqual(computeExtraBeds(room, 3, 0, 1, 3), { extraBedsCount: 0, extraBedSubtotal: 0 })
  assert.deepEqual(computeExtraBeds({ ...room, extra_bed_adults_allowed: true }, 3, 0, 1, 3), { extraBedsCount: 1, extraBedSubtotal: 45 })
  assert.deepEqual(computeExtraBeds(room, 2, 3, 1, 3), { extraBedsCount: 1, extraBedSubtotal: 45 })
  assert.deepEqual(computeExtraBeds({ ...room, extra_bed_available: false }, 2, 1, 1, 3), { extraBedsCount: 0, extraBedSubtotal: 0 })
})

test('deriveBookingCharge: cents are round(major * 100); fee follows the payment rail', () => {
  const room = { base_price: '100.00', max_guests: 2 }
  const availability = [{ date: '2026-12-02', price_override: 150, promo_pct: 10 }]
  const charge = deriveBookingCharge({
    room, availability, pkg: null, pkgQty: 1,
    checkIn: '2026-12-01', checkOut: '2026-12-04', roomsCount: 1, adults: 2, children: 0, paymentMethod: 'card',
  })
  assert.equal(charge.nights, 3)
  assert.equal(charge.roomTotal, 100 + 135 + 100)
  assert.equal(charge.roomAmountCents, 33500)
  assert.equal(charge.processingFeeCents, Math.round(335 * 0.03 * 100))
  assert.equal(charge.totalChargedCents, 33500 + 1005)

  const lightning = deriveBookingCharge({
    room, availability, pkg: null, pkgQty: 1,
    checkIn: '2026-12-01', checkOut: '2026-12-04', roomsCount: 1, adults: 2, children: 0, paymentMethod: 'lightning',
  })
  assert.equal(lightning.processingFeeCents, 0)
  assert.equal(PROCESSING_FEE_RATES.card, 0.03)
})

test('deriveBookingCharge: a replace package overrides the room rate, an addon stacks', () => {
  const room = { base_price: 100, max_guests: 2 }
  const base = { room, availability: [], pkgQty: 2, checkIn: '2026-12-01', checkOut: '2026-12-03', roomsCount: 1, adults: 2, children: 0, paymentMethod: 'card' }
  const addon = deriveBookingCharge({ ...base, pkg: { price: 30, pricing_type: 'per_night', pricing_mode: 'addon' } })
  assert.equal(addon.chargeableSubtotal, 200 + 30 * 2 * 2)
  const replace = deriveBookingCharge({ ...base, pkg: { price: 500, pricing_type: 'per_stay', pricing_mode: 'replace' } })
  assert.equal(replace.chargeableSubtotal, 1000)
})

test('deriveBookingCharge: blocked nights and min stay are reported', () => {
  const room = { base_price: 100, max_guests: 2 }
  const charge = deriveBookingCharge({
    room, availability: [{ date: '2026-12-01', is_blocked: true, min_stay: 3 }], pkg: null, pkgQty: 1,
    checkIn: '2026-12-01', checkOut: '2026-12-02', roomsCount: 1, adults: 1, children: 0, paymentMethod: 'card',
  })
  assert.equal(charge.hasBlockedDay, true)
  assert.equal(charge.minStayOK, false)
  assert.equal(charge.minStayRequired, 3)
})
