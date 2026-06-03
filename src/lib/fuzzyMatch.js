// ============================================================================
// fuzzyMatch.js — tiny Levenshtein-based name matcher
// ============================================================================
// Used to map AI-extracted room names ("BAB4", "HQ-dbl") to the real
// `rooms` table entries ("BABA", "HQ double bed"). When Claude can't read
// a handwritten label perfectly, this lets us still auto-place the room
// without the hotelier intervening.
//
// Strategy: lowercase + strip non-alphanumerics, then compare Levenshtein
// distance with a cap. Distance ≤ 2 OR substring containment counts as a
// match. We pick the BEST scoring candidate; if ties, prefer the longest
// real name (more specific match).
// ============================================================================

/**
 * Find the best matching candidate name for `query`.
 * @param {string} query — the AI-extracted label
 * @param {Array<{id:string, name:string}>} candidates — real rooms
 * @returns {{id:string, name:string} | null} match or null
 */
export function bestRoomMatch(query, candidates) {
  if (!query || !Array.isArray(candidates) || candidates.length === 0) return null
  const nq = normalize(query)
  if (!nq) return null

  let best = null
  let bestScore = Infinity   // lower = better

  for (const c of candidates) {
    if (!c?.name) continue
    const nc = normalize(c.name)
    if (!nc) continue
    // Exact match — short-circuit
    if (nq === nc) return c
    // Substring containment — strong signal
    if (nc.includes(nq) || nq.includes(nc)) {
      const score = Math.abs(nc.length - nq.length) * 0.5
      if (score < bestScore) { best = c; bestScore = score }
      continue
    }
    // Edit distance — only useful for short strings; cap at 3 for noise
    const dist = levenshtein(nq, nc)
    const tolerance = Math.max(2, Math.floor(Math.max(nq.length, nc.length) * 0.25))
    if (dist <= tolerance && dist < bestScore) {
      best = c
      bestScore = dist
    }
  }
  return best
}

/**
 * Lowercase + strip non-alphanumerics.
 */
function normalize(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Standard iterative Levenshtein.
 */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      )
    }
    prev = curr
  }
  return prev[b.length]
}
