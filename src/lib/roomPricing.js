// ============================================================================
// roomPricing.js — single source of truth for OTA price + promo + constraints
// ============================================================================
// Both PropertyDetail (display) and Checkout (insert) call this so the
// price the guest SEES === the price the guest PAYS.
//
// Inputs:
//   - room          : DB row with base_price + room_availability nested
//                     (room_availability rows: date, price_override,
//                      is_blocked, min_stay, promo_label, promo_pct)
//   - checkIn/Out   : 'YYYY-MM-DD' strings
//   - roomsCount    : number of identical rooms reserved (default 1)
//
// Returns:
//   {
//     nights, perRoomOriginal, perRoomDiscounted, originalTotal,
//     discountedTotal, savings, savingsPct, promoPct, promoLabel,
//     hasPromo, minStayRequired, minStayOK, hasBlockedDay
//   }
// ============================================================================

export function computeRoomPricing(room, checkIn, checkOut, roomsCount = 1) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
  const availList = Array.isArray(room?.room_availability) ? room.room_availability : []

  let perRoomOriginal = 0
  let perRoomDiscounted = 0
  let highestPct = 0
  let topLabel = null
  let minStayRequired = 1
  let hasBlockedDay = false
  // Collect unique perks across the stay (a 5-night stay could span 2
  // different reward windows — show both to the guest).
  const perksSet = new Set()
  let primaryPerkLabel = null

  const d = new Date(checkIn)
  for (let i = 0; i < nights; i++) {
    const dateStr = d.toISOString().split('T')[0]
    const avail = availList.find(a => a.date === dateStr)

    if (avail?.is_blocked) hasBlockedDay = true

    const basePrice = Number(avail?.price_override ?? room?.base_price ?? 0)
    perRoomOriginal += basePrice

    const pct = Number(avail?.promo_pct || 0)
    if (pct > 0) {
      perRoomDiscounted += basePrice * (1 - pct / 100)
      if (pct > highestPct) {
        highestPct = pct
        topLabel = avail?.promo_label || null
      }
    } else {
      perRoomDiscounted += basePrice
      // Label-only promo (no auto discount) — still pick it up
      if (avail?.promo_label && !topLabel) topLabel = avail.promo_label
    }

    if (avail?.perk) {
      perksSet.add(avail.perk)
      if (!primaryPerkLabel && avail?.promo_label) primaryPerkLabel = avail.promo_label
    }

    if (avail?.min_stay && avail.min_stay > minStayRequired) {
      minStayRequired = avail.min_stay
    }

    d.setDate(d.getDate() + 1)
  }
  const perks = [...perksSet]

  const originalTotal = perRoomOriginal * roomsCount
  const discountedTotal = perRoomDiscounted * roomsCount
  const savings = originalTotal - discountedTotal
  const savingsPct = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0

  return {
    nights,
    perRoomOriginal,
    perRoomDiscounted,
    originalTotal,
    discountedTotal,
    savings,
    savingsPct,
    promoPct: highestPct,
    promoLabel: topLabel,
    hasPromo: highestPct > 0 || !!topLabel,
    perks,                                   // array of unique perk strings
    perkLabel: primaryPerkLabel,             // the title to show beside perks
    hasPerks: perks.length > 0,
    minStayRequired,
    minStayOK: nights >= minStayRequired,
    hasBlockedDay,
  }
}
