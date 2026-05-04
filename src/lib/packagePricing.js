// ============================================================================
// packagePricing.js — math for layering a package on top of (or replacing) the
// room total computed by roomPricing.js
// ============================================================================
// Inputs:
//   - basePricing  : output of computeRoomPricing()
//   - pkg          : packages table row (or null = no package selected)
//   - nights       : number of nights in the stay
//   - qty          : how many units of this package come with the chosen room
//                    (room_packages.qty — 1 by default, room.max_guests at
//                    link time when the hotelier auto-fills it)
//   - guestCount   : kept for backwards-compat with per_person semantics, but
//                    qty is now the primary multiplier
//
// Pricing model:
//   line_total = unit_price × qty × (1 if per_stay, nights if per_night,
//                                    guestCount if per_person)
//
// Returns the same shape as basePricing PLUS:
//   {
//     packageCost      — total $ charged for the package
//     packageMode      — 'addon' | 'replace' | null
//     packageQty       — qty actually applied (echo for the UI)
//     finalTotal       — final amount the guest pays for room+package
//   }
// ============================================================================

export function applyPackagePricing(basePricing, pkg, nights = 1, qty = 1, guestCount = 1) {
  if (!pkg) {
    return {
      ...basePricing,
      packageCost: 0,
      packageMode: null,
      packageQty: 0,
      finalTotal: basePricing.discountedTotal,
    }
  }

  const unitPrice = Number(pkg.price) || 0
  const safeQty = Math.max(1, Number(qty) || 1)
  let packageCost = unitPrice * safeQty
  if (pkg.pricing_type === 'per_night')  packageCost = unitPrice * safeQty * nights
  if (pkg.pricing_type === 'per_person') packageCost = unitPrice * safeQty * guestCount

  const mode = pkg.pricing_mode || 'addon'
  const finalTotal = mode === 'replace'
    ? packageCost                              // package overrides the room rate
    : basePricing.discountedTotal + packageCost

  return {
    ...basePricing,
    packageCost,
    packageMode: mode,
    packageQty: safeQty,
    finalTotal,
  }
}

// Helper for compact UI labels: "+$240 (2× $120)", "+$15/night", "$1,400 all-in"
export function formatPackageImpact(pkg, nights = 1, qty = 1, guestCount = 1) {
  if (!pkg) return null
  const unitPrice = Number(pkg.price) || 0
  const safeQty = Math.max(1, Number(qty) || 1)
  let total = unitPrice * safeQty
  if (pkg.pricing_type === 'per_night')  total = unitPrice * safeQty * nights
  if (pkg.pricing_type === 'per_person') total = unitPrice * safeQty * guestCount

  const sign = pkg.pricing_mode === 'replace' ? '' : '+'
  const qtyHint = safeQty > 1 ? ` (${safeQty}×$${unitPrice.toFixed(0)})` : ''
  const suffix =
    pkg.pricing_mode === 'replace' ? ' all-in' :
    pkg.pricing_type === 'per_night' ? '/stay' :
    ' total'

  return `${sign}$${total.toFixed(0)}${suffix}${qtyHint}`
}
