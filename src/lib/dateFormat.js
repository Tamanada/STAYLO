// ============================================================================
// dateFormat.js — single source of truth for human-readable date display
// ============================================================================
// All dates in the DB are ISO ('YYYY-MM-DD' or full timestamp). For the UI we
// want day-first (DD/MM/YYYY) which is the international standard outside the
// US and matches the format used in France, Thailand, EU, UK, AU, etc.
//
// Three helpers:
//   formatDate(iso)       → "05/05/2026"
//   formatDateLong(iso)   → "5 May 2026"
//   formatDateTime(iso)   → "05/05/2026 14:32"
//
// All accept either a date-only string ('YYYY-MM-DD') or a full ISO timestamp.
// Invalid inputs return '' (caller decides fallback).
// ============================================================================

function parseSafe(input) {
  if (!input) return null
  const d = new Date(input)
  return isNaN(d.getTime()) ? null : d
}

function pad2(n) { return String(n).padStart(2, '0') }

/** "05/05/2026" — day/month/year, the most universal non-US format */
export function formatDate(input) {
  const d = parseSafe(input)
  if (!d) return ''
  // Use UTC pieces when the input is a date-only string ('YYYY-MM-DD'),
  // otherwise the local-time conversion can shift the day across midnight.
  const isDateOnly = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)
  if (isDateOnly) {
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  }
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** "5 May 2026" — slightly more readable for cards/headers */
export function formatDateLong(input) {
  const d = parseSafe(input)
  if (!d) return ''
  const isDateOnly = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)
  // Use 'en-GB' for day-first ordering universally
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: isDateOnly ? 'UTC' : undefined,
  })
}

/** "05/05/2026 14:32" — full timestamp display */
export function formatDateTime(input) {
  const d = parseSafe(input)
  if (!d) return ''
  return `${formatDate(input)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
