export function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const random = crypto.getRandomValues(new Uint8Array(8))
  return `STAYLO-${Array.from(random).map(b => chars[b % chars.length]).join('')}`
}

export function generateAmbassadorCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const random = crypto.getRandomValues(new Uint8Array(8))
  return `AMB-${Array.from(random).map(b => chars[b % chars.length]).join('')}`
}

export function getReferralFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('ref') || null
}

export function getAmbassadorFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('amb') || null
}
