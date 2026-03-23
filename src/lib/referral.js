export function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `STAYLO-${code}`
}

export function generateAmbassadorCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `AMB-${code}`
}

export function getReferralFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('ref') || null
}

export function getAmbassadorFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('amb') || null
}
