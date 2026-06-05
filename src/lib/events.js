// ============================================================================
// EVENTS CATALOG — public holidays, festivals, lunar parties.
// ============================================================================
// Ported from public/ship.html (2026-06-08) so the Disponibilités Timeline
// shows the same emoji event chips on day headers as the staff Planning.
//
// A hotelier can enable/disable any catalog event and add custom events.
// Events appear as small emoji chips on Timeline day headers so the
// manager can plan pricing and stock around them (e.g. Full Moon Party).
//
// Lunar dates are hardcoded for 2026 (Koh Phangan parties); in production
// we'd compute them via a lunar-phase library. Annual dates use MM-DD only
// and match every year.
//
// Storage: per-property localStorage. Keys are scoped by `propertyId` so
// blocking one hotel doesn't leak into another. Migrating to a Supabase
// table later is a one-shot drop-in — only the four storage primitives
// at the bottom need to switch.
// ============================================================================

export const EVENT_CATALOG = [
  // ── Worldwide / common ──────────────────────────────────────────────
  { id: 'new_year',      em: '🎆',  name: "New Year's Day",   date: '01-01', recurring: 'annual', countries: ['*'],  color: '#FF6B00' },
  { id: 'valentines',    em: '💝',  name: "Valentine's Day",  date: '02-14', recurring: 'annual', countries: ['*'],  color: '#FF3CB4' },
  { id: 'labour_day',    em: '🛠️',  name: 'Labour Day',       date: '05-01', recurring: 'annual', countries: ['*'],  color: '#0984E3' },
  { id: 'mothers_day',   em: '💐',  name: "Mother's Day",     date: '05-10', recurring: 'annual', countries: ['*'],  color: '#FD79A8' },
  { id: 'halloween',     em: '🎃',  name: 'Halloween',        date: '10-31', recurring: 'annual', countries: ['*'],  color: '#FF6B00' },
  { id: 'christmas_eve', em: '🎄',  name: 'Christmas Eve',    date: '12-24', recurring: 'annual', countries: ['*'],  color: '#00B894' },
  { id: 'christmas',     em: '🎅',  name: 'Christmas Day',    date: '12-25', recurring: 'annual', countries: ['*'],  color: '#E74C3C' },
  { id: 'nye',           em: '🎉',  name: "New Year's Eve",   date: '12-31', recurring: 'annual', countries: ['*'],  color: '#FF3CB4' },
  // ── Thailand ────────────────────────────────────────────────────────
  { id: 'makha_bucha',   em: '🪷',  name: 'Makha Bucha',      date: '02-22', recurring: 'annual', countries: ['TH'], color: '#FDCB6E' },
  { id: 'chakri_day',    em: '🛕',  name: 'Chakri Day',       date: '04-06', recurring: 'annual', countries: ['TH'], color: '#FDCB6E' },
  { id: 'songkran_1',    em: '💦',  name: 'Songkran (day 1)', date: '04-13', recurring: 'annual', countries: ['TH'], color: '#0984E3' },
  { id: 'songkran_2',    em: '💦',  name: 'Songkran (day 2)', date: '04-14', recurring: 'annual', countries: ['TH'], color: '#0984E3' },
  { id: 'songkran_3',    em: '💦',  name: 'Songkran (day 3)', date: '04-15', recurring: 'annual', countries: ['TH'], color: '#0984E3' },
  { id: 'visakha_bucha', em: '🪷',  name: 'Visakha Bucha',    date: '05-31', recurring: 'annual', countries: ['TH'], color: '#FDCB6E' },
  { id: 'kings_bday',    em: '👑',  name: "King's Birthday",  date: '07-28', recurring: 'annual', countries: ['TH'], color: '#FDCB6E' },
  { id: 'mother_day_th', em: '👩‍👧', name: "Queen Mother Day", date: '08-12', recurring: 'annual', countries: ['TH'], color: '#FD79A8' },
  { id: 'father_day_th', em: '👨‍👧', name: "Father's Day (TH)",date: '12-05', recurring: 'annual', countries: ['TH'], color: '#0984E3' },
  // ── France ──────────────────────────────────────────────────────────
  { id: 'bastille',      em: '🇫🇷',  name: 'Fête nationale',   date: '07-14', recurring: 'annual', countries: ['FR'], color: '#0984E3' },
  { id: 'toussaint',     em: '🕯️',  name: 'Toussaint',        date: '11-01', recurring: 'annual', countries: ['FR'], color: '#636E72' },
  { id: 'armistice',     em: '🌹',  name: 'Armistice 1918',   date: '11-11', recurring: 'annual', countries: ['FR'], color: '#E74C3C' },
  // ── UK ──────────────────────────────────────────────────────────────
  { id: 'boxing_day',    em: '🎁',  name: 'Boxing Day',       date: '12-26', recurring: 'annual', countries: ['UK'], color: '#E74C3C' },
  // ── US ──────────────────────────────────────────────────────────────
  { id: 'independence',  em: '🇺🇸',  name: 'Independence Day', date: '07-04', recurring: 'annual', countries: ['US'], color: '#0984E3' },
  { id: 'thanksgiving',  em: '🦃',  name: 'Thanksgiving',     date: '11-26', recurring: 'annual', countries: ['US'], color: '#FDCB6E' },
  // ── Lunar (Koh Phangan parties) — hardcoded 2026 lunar dates ────────
  {
    id: 'full_moon',  em: '🌕', name: 'Full Moon Party',  recurring: 'lunar', countries: ['TH'], color: '#FDCB6E',
    dates: ['2026-01-03','2026-02-02','2026-03-03','2026-04-02','2026-05-01','2026-05-31','2026-06-29','2026-07-29','2026-08-27','2026-09-26','2026-10-25','2026-11-24','2026-12-23'],
  },
  {
    id: 'half_moon',  em: '🌗', name: 'Half Moon Party',  recurring: 'lunar', countries: ['TH'], color: '#A29BFE',
    dates: ['2026-01-11','2026-02-09','2026-03-11','2026-04-09','2026-05-09','2026-06-08','2026-07-07','2026-08-06','2026-09-04','2026-10-04','2026-11-02','2026-12-02'],
  },
  {
    id: 'black_moon', em: '🌑', name: 'Black Moon Party', recurring: 'lunar', countries: ['TH'], color: '#1A1F2E',
    dates: ['2026-01-18','2026-02-17','2026-03-19','2026-04-17','2026-05-17','2026-06-15','2026-07-15','2026-08-13','2026-09-12','2026-10-11','2026-11-10','2026-12-09'],
  },
]

// Country code normalization. Property.country is stored verbatim in the DB
// (e.g. "Thailand", "TH", "France") — we accept both ISO and English names.
const COUNTRY_ALIASES = {
  thailand: 'TH', th: 'TH',
  france: 'FR', fr: 'FR',
  uk: 'UK', 'united kingdom': 'UK', gb: 'UK',
  us: 'US', usa: 'US', 'united states': 'US',
}

function normCountry(raw) {
  if (!raw) return 'TH'
  const k = String(raw).trim().toLowerCase()
  return COUNTRY_ALIASES[k] || raw.toUpperCase().slice(0, 2)
}

export function getCatalogForCountry(country) {
  const c = normCountry(country)
  return EVENT_CATALOG.filter(e => e.countries.includes('*') || e.countries.includes(c))
}

// ────────────────────────────────────────────────────────────────────────
// Per-property persistence
// ────────────────────────────────────────────────────────────────────────
const ENABLED_KEY = (propertyId) => `staylo_events_enabled_${propertyId}`
const CUSTOM_KEY  = (propertyId) => `staylo_events_custom_${propertyId}`

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}
function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // QuotaExceeded — surface but don't break
    // eslint-disable-next-line no-console
    console.warn('[events] localStorage write failed:', e?.message || e)
  }
}

export function getEnabledEventIds(propertyId, country) {
  const stored = safeRead(ENABLED_KEY(propertyId), null)
  // Default: every catalog event for the country is enabled.
  if (stored === null) return getCatalogForCountry(country).map(e => e.id)
  return stored
}
export function setEnabledEventIds(propertyId, ids) {
  safeWrite(ENABLED_KEY(propertyId), ids)
}
export function getCustomEvents(propertyId) {
  return safeRead(CUSTOM_KEY(propertyId), [])
}
export function saveCustomEvents(propertyId, list) {
  safeWrite(CUSTOM_KEY(propertyId), list)
}

// Returns every event (catalog + custom) that lands on a given ISO date.
// Honors the per-property enabled set so disabled catalog events drop out.
export function getEventsOnDate(propertyId, country, dateStr) {
  const out = []
  const enabled = new Set(getEnabledEventIds(propertyId, country))
  for (const e of getCatalogForCountry(country)) {
    if (!enabled.has(e.id)) continue
    if (e.recurring === 'annual' && dateStr.slice(5) === e.date) out.push(e)
    else if (e.recurring === 'lunar' && Array.isArray(e.dates) && e.dates.includes(dateStr)) out.push(e)
  }
  for (const c of getCustomEvents(propertyId)) {
    if (c.date === dateStr) out.push(c)
  }
  return out
}
