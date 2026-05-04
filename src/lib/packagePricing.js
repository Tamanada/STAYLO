// ============================================================================
// packagePricing.js — math for layering a package on top of (or replacing) the
// room total computed by roomPricing.js
// ============================================================================
// Inputs:
//   - basePricing  : output of computeRoomPricing()
//   - pkg          : packages table row (or null = no package selected)
//   - nights       : number of nights in the stay
//   - guestCount   : total guests (adults + children) — used by 'per_person'
//
// Returns the same shape as basePricing PLUS:
//   {
//     packageCost      — total $ charged for the package after type math
//     packageMode      — 'addon' | 'replace' | null
//     finalTotal       — final amount the guest pays for room+package
//     basePricing.discountedTotal stays untouched (room-only line item)
//   }
// ============================================================================

export function applyPackagePricing(basePricing, pkg, nights = 1, guestCount = 1) {
  if (!pkg) {
    return {
      ...basePricing,
      packageCost: 0,
      packageMode: null,
      finalTotal: basePricing.discountedTotal,
    }
  }

  const unitPrice = Number(pkg.price) || 0
  let packageCost = unitPrice
  if (pkg.pricing_type === 'per_night')  packageCost = unitPrice * nights
  if (pkg.pricing_type === 'per_person') packageCost = unitPrice * guestCount

  const mode = pkg.pricing_mode || 'addon'
  const finalTotal = mode === 'replace'
    ? packageCost                              // package overrides the room rate
    : basePricing.discountedTotal + packageCost

  return {
    ...basePricing,
    packageCost,
    packageMode: mode,
    finalTotal,
  }
}

// Helper for compact UI labels: "+$80 per stay", "+$15/night", "$1,400 all-in"
export function formatPackageImpact(pkg, nights = 1, guestCount = 1) {
  if (!pkg) return null
  const unitPrice = Number(pkg.price) || 0
  let total = unitPrice
  if (pkg.pricing_type === 'per_night')  total = unitPrice * nights
  if (pkg.pricing_type === 'per_person') total = unitPrice * guestCount

  const sign = pkg.pricing_mode === 'replace' ? '' : '+'
  const suffix =
    pkg.pricing_mode === 'replace' ? ' all-in' :
    pkg.pricing_type === 'per_stay' ? ' total' :
    pkg.pricing_type === 'per_night' ? '/stay' :
    '/stay'

  return `${sign}$${total.toFixed(0)}${suffix}`
}
