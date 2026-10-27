// ============================================================================
// pricing.ts: server-side price derivation for a booking
// ============================================================================
// Port of src/lib/roomPricing.js + src/lib/packagePricing.js + the extra-bed
// math of src/pages/ota/Checkout.jsx. The browser shows a price with those
// files; the Edge Functions (checkout, crypto-checkout) recompute the same
// price from the database with this file and never trust the amount sent by
// the browser (guardian/reports/2026-10-05-security-inspection.md, finding #1).
//
// Pure module: no Deno or Node API, so tests/unit/pricing.test.mjs can run it
// in Node and compare it with the browser implementation on random inputs.
// Keep the arithmetic identical to the browser files; if one changes, change
// the other and the parity test tells you when they drift.
// ============================================================================

export interface AvailabilityRow {
  date: string                       // YYYY-MM-DD
  price_override?: number | string | null
  is_blocked?: boolean | null
  min_stay?: number | null
  promo_label?: string | null
  promo_pct?: number | string | null
  perk?: string | null
}

export interface RoomRow {
  base_price: number | string
  monthly_rate?: number | string | null
  monthly_min_nights?: number | null
  weekly_discount_pct?: number | null
  weekly_min_nights?: number | null
  max_guests?: number | null
  extra_bed_available?: boolean | null
  extra_bed_max_qty?: number | null
  extra_bed_price?: number | string | null
  extra_bed_adults_allowed?: boolean | null
  room_availability?: AvailabilityRow[] | null
}

export interface PackageRow {
  price: number | string
  pricing_type?: 'per_stay' | 'per_night' | 'per_person' | string | null
  pricing_mode?: 'addon' | 'replace' | string | null
}

export interface RoomPricing {
  nights: number
  perRoomOriginal: number
  perRoomDiscounted: number
  originalTotal: number
  discountedTotal: number
  minStayRequired: number
  minStayOK: boolean
  hasBlockedDay: boolean
  longStayTier: 'monthly' | 'weekly' | null
}

const DAY_MS = 1000 * 60 * 60 * 24

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Same arithmetic as computeRoomPricing() in src/lib/roomPricing.js. */
export function computeRoomPricing(
  room: RoomRow,
  checkIn: string,
  checkOut: string,
  roomsCount = 1,
): RoomPricing {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS))
  const availList = Array.isArray(room?.room_availability) ? room.room_availability : []

  let perRoomOriginal = 0
  let perRoomDiscounted = 0
  let minStayRequired = 1
  let hasBlockedDay = false

  const d = new Date(checkIn)
  for (let i = 0; i < nights; i++) {
    const dateStr = isoDate(d)
    const avail = availList.find(a => a.date === dateStr)

    if (avail?.is_blocked) hasBlockedDay = true

    const basePrice = Number(avail?.price_override ?? room?.base_price ?? 0)
    perRoomOriginal += basePrice

    const pct = Number(avail?.promo_pct || 0)
    if (pct > 0) {
      perRoomDiscounted += basePrice * (1 - pct / 100)
    } else {
      perRoomDiscounted += basePrice
    }

    if (avail?.min_stay && avail.min_stay > minStayRequired) {
      minStayRequired = avail.min_stay
    }

    d.setUTCDate(d.getUTCDate() + 1)
  }

  const monthlyRate       = Number(room?.monthly_rate)        || 0
  const monthlyMinNights  = Number(room?.monthly_min_nights)  || 28
  const weeklyDiscountPct = Number(room?.weekly_discount_pct) || 0
  const weeklyMinNights   = Number(room?.weekly_min_nights)   || 7

  let longStayTier: 'monthly' | 'weekly' | null = null
  let perRoomLongStay = perRoomDiscounted

  if (monthlyRate > 0 && nights >= monthlyMinNights) {
    perRoomLongStay = (monthlyRate / 30) * nights
    longStayTier = 'monthly'
  } else if (weeklyDiscountPct > 0 && nights >= weeklyMinNights) {
    perRoomLongStay = perRoomOriginal * (1 - weeklyDiscountPct / 100)
    longStayTier = 'weekly'
  }

  const finalPerRoom = longStayTier !== null
    ? Math.min(perRoomLongStay, perRoomDiscounted)
    : perRoomDiscounted
  const longStayApplied = longStayTier !== null && perRoomLongStay <= perRoomDiscounted

  return {
    nights,
    perRoomOriginal,
    perRoomDiscounted: finalPerRoom,
    originalTotal: perRoomOriginal * roomsCount,
    discountedTotal: finalPerRoom * roomsCount,
    minStayRequired,
    minStayOK: nights >= minStayRequired,
    hasBlockedDay,
    longStayTier: longStayApplied ? longStayTier : null,
  }
}

/** Same arithmetic as applyPackagePricing() in src/lib/packagePricing.js. */
export function computePackageCost(
  pkg: PackageRow | null | undefined,
  nights: number,
  qty: number,
  guestCount: number,
): { packageCost: number; packageMode: 'addon' | 'replace' | null } {
  if (!pkg) return { packageCost: 0, packageMode: null }
  const unitPrice = Number(pkg.price) || 0
  const safeQty = Math.max(1, Number(qty) || 1)
  let packageCost = unitPrice * safeQty
  if (pkg.pricing_type === 'per_night')  packageCost = unitPrice * safeQty * nights
  if (pkg.pricing_type === 'per_person') packageCost = unitPrice * safeQty * guestCount
  const mode = pkg.pricing_mode === 'replace' ? 'replace' : 'addon'
  return { packageCost, packageMode: mode }
}

/** Same arithmetic as the extra-bed block of src/pages/ota/Checkout.jsx. */
export function computeExtraBeds(
  room: RoomRow,
  adults: number,
  children: number,
  roomsCount: number,
  nights: number,
): { extraBedsCount: number; extraBedSubtotal: number } {
  const adultSlots            = (Number(room?.max_guests) || 1) * roomsCount
  const adultsInRegularSlots  = Math.min(adults, adultSlots)
  const adultsOverflow        = Math.max(0, adults - adultSlots)
  const remainingRegularSlots = Math.max(0, adultSlots - adultsInRegularSlots)
  const childrenOverflow      = Math.max(0, children - remainingRegularSlots)
  const extraBedCeiling = room?.extra_bed_available
    ? (Number(room.extra_bed_max_qty) || 0) * roomsCount
    : 0
  const extraBedsForAdults = room?.extra_bed_adults_allowed ? adultsOverflow : 0
  const extraBedsCount     = Math.min(childrenOverflow + extraBedsForAdults, extraBedCeiling)
  const extraBedPrice      = Number(room?.extra_bed_price) || 0
  return { extraBedsCount, extraBedSubtotal: extraBedsCount * extraBedPrice * nights }
}

// Processing fee paid by the guest on top of the room amount, per payment
// rail. Mirrors PAYMENT_METHODS[].feeRate in src/pages/ota/Checkout.jsx.
export const PROCESSING_FEE_RATES: Record<string, number> = {
  card:        0.03,
  lightning:   0,
  btc_onchain: 0.01,
  sol:         0.005,
}

export interface ChargeInput {
  room: RoomRow
  availability: AvailabilityRow[]
  pkg: PackageRow | null
  pkgQty: number
  checkIn: string
  checkOut: string
  roomsCount: number
  adults: number
  children: number
  paymentMethod: string
}

export interface BookingCharge {
  nights: number
  roomTotal: number            // major units, room only (after promos / long stay)
  extraBedsCount: number
  extraBedSubtotal: number     // major units
  packageCost: number          // major units
  packageMode: 'addon' | 'replace' | null
  chargeableSubtotal: number   // major units: what the split (90/10) applies to
  roomAmountCents: number      // chargeableSubtotal in minor units
  processingFeeCents: number   // guest-paid fee in minor units
  totalChargedCents: number
  hasBlockedDay: boolean
  minStayOK: boolean
  minStayRequired: number
}

/**
 * The amount a booking costs, derived only from database rows.
 * Minor-unit conversion is Math.round(x * 100), as in the browser.
 */
export function deriveBookingCharge(input: ChargeInput): BookingCharge {
  const roomsCount = Math.max(1, Number(input.roomsCount) || 1)
  const adults     = Math.max(1, Number(input.adults)   || 1)
  const children   = Math.max(0, Number(input.children) || 0)
  const room: RoomRow = { ...input.room, room_availability: input.availability }

  const pricing = computeRoomPricing(room, input.checkIn, input.checkOut, roomsCount)
  const nights = pricing.nights
  const roomTotal = pricing.discountedTotal

  const beds = computeExtraBeds(room, adults, children, roomsCount, nights)
  const { packageCost, packageMode } = computePackageCost(input.pkg, nights, input.pkgQty, adults + children)

  const effectiveRoomTotal = packageMode === 'replace' ? 0 : roomTotal
  const chargeableSubtotal = effectiveRoomTotal + beds.extraBedSubtotal + packageCost
  const feeRate = PROCESSING_FEE_RATES[input.paymentMethod] ?? 0

  const roomAmountCents    = Math.round(chargeableSubtotal * 100)
  const processingFeeCents = Math.round(chargeableSubtotal * feeRate * 100)

  return {
    nights,
    roomTotal,
    extraBedsCount: beds.extraBedsCount,
    extraBedSubtotal: beds.extraBedSubtotal,
    packageCost,
    packageMode,
    chargeableSubtotal,
    roomAmountCents,
    processingFeeCents,
    totalChargedCents: roomAmountCents + processingFeeCents,
    hasBlockedDay: pricing.hasBlockedDay,
    minStayOK: pricing.minStayOK,
    minStayRequired: pricing.minStayRequired,
  }
}
