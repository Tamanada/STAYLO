// ============================================================================
// Google Sheets — Annual pricing calendar importer
// ============================================================================
// Parses the specific tarification-grid layout David uses at La Belle Vie
// (and any hotel that copies that template). The sheet is a WIDE table:
//   · Columns A-C = fixed labels (chambre name, ref price, yearly total)
//   · Columns D+  = one column per day of the year
//   · Rows        = header block + one row per room + totals
//
// Layout markers we anchor on (all in column A, case-insensitive):
//   MOIS         → month labels row (merged cells → forward-filled)
//   JOUR         → day-of-month numbers (drives the date grid)
//   SEMAINE      → weekday letters (ignored; we compute from date)
//   SAISON       → season codes per day (S1..S4, HIGH, LOW, …)
//   FULL MOON    → any non-empty cell = full moon that day
//   /^\d+\.\s/   → a room row (e.g. "1. DELUXE JUNIOR SUITE")
//   TOTAL        → end-of-rooms marker (stop iterating)
//
// The parser accepts either:
//   · Raw TSV text (Google Sheets Ctrl+C default)
//   · Raw CSV text (from published-to-web URL or File→Download→CSV)
// It auto-detects the delimiter by counting tabs vs commas on the first
// non-empty row that has more than 5 fields.
//
// Returns a { rooms, pricing, warnings } object; the UI turns that into
// a preview screen and then batch-inserts into public.rooms +
// public.room_availability.
// ============================================================================

// Number-of-days-in-month lookup that respects leap years — Feb 29 exists
// in the sheet iff we're importing a leap year, so getting this right
// avoids the "off by one after February" drift.
function daysInMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

// Strip everything that isn't a digit or a decimal separator, then parse.
// Google Sheets exports numbers as either "8 000" (fr-FR locale) or "8000"
// (en-US locale) — both must land as 8000. Cells with letters
// ("libre", "closed") return null so the caller can flag them as blocked.
function parseMoney(cell) {
  if (cell == null) return null
  const s = String(cell).trim()
  if (!s) return null
  // Remove all whitespace (including non-breaking spaces from Google's
  // fr-FR thousand separator) then normalize decimal separator to '.'
  const cleaned = s.replace(/[\s ]/g, '').replace(',', '.')
  // Anything left that isn't purely numeric → treat as blocked / non-price
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

// French month name → 1-12. Matches both accented and unaccented forms so
// paste-from-Word variants don't break the parser.
const MONTH_FR = {
  janvier: 1, jan: 1,
  fevrier: 2, 'février': 2, fev: 2, 'fév': 2,
  mars: 3, mar: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6, jun: 6,
  juillet: 7, jul: 7, juil: 7,
  aout: 8, 'août': 8, aug: 8,
  septembre: 9, sep: 9, sept: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  decembre: 12, 'décembre': 12, dec: 12, 'déc': 12,
}

// English month names too — if a hotelier uses an English template.
const MONTH_EN = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

// Extract "JANVIER 2027" → {month:1, year:2027}. Returns null on no match.
function parseMonthHeader(cell) {
  if (!cell) return null
  const s = String(cell).trim().toLowerCase()
  const m = s.match(/([a-zàâäéèêëîïôöùûüÿç]+)\s*(\d{4})/i)
  if (!m) return null
  const key = m[1].toLowerCase()
  const month = MONTH_FR[key] || MONTH_EN[key]
  const year = parseInt(m[2], 10)
  if (!month || !year) return null
  return { month, year }
}

// Split a single line into cells. Prefer tabs (Google Sheets Ctrl+C default
// is TSV, which handles cells containing commas without needing quoting).
// Fall back to CSV parsing (RFC 4180-lite: respects double-quoted cells).
function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t')
  // CSV path — walk the string tracking quote state.
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}

// Detect the delimiter on the first row that has plenty of cells — a
// pricing grid always has 300+ columns after the fixed A-C header, so
// counting occurrences on the first non-trivial row is reliable.
function detectDelimiter(raw) {
  const firstFatLine = raw.split(/\r?\n/).find(l => l && (l.length > 40))
  if (!firstFatLine) return '\t'
  const tabs = (firstFatLine.match(/\t/g) || []).length
  const commas = (firstFatLine.match(/,/g) || []).length
  return tabs >= commas ? '\t' : ','
}

// Fill-forward a row's cells — Google Sheets exports merged cells with
// the value on the FIRST column of the merge and empty on the rest.
// A month header "JANVIER 2027" covering D5:AH5 becomes ['JANVIER 2027',
// '','','',…]; this helper turns it into ['JANVIER 2027','JANVIER 2027',
// 'JANVIER 2027',…] so per-day month lookup is O(1).
function fillForward(row) {
  const out = []
  let last = ''
  for (const c of row) {
    const v = (c || '').trim()
    if (v) last = v
    out.push(last)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────
// raw: string — the pasted TSV/CSV OR the fetched CSV body
// options.defaultYear: fallback year if no month header carries one
// Returns:
//   { rooms: [{index, name, refPrice}],
//     pricing: [{roomIndex, date:'YYYY-MM-DD', price, seasonCode, isFullMoon, isBlocked}],
//     dateColumns: [{colIndex, date, seasonCode, isFullMoon}],
//     warnings: [string] }
export function parseAnnualCalendar(raw, options = {}) {
  const delimiter = detectDelimiter(raw)
  const lines = raw.split(/\r?\n/)
  const rows = lines.map(l => splitLine(l, delimiter))

  const warnings = []

  // ── 1. Find the anchor rows ─────────────────────────────────────────
  // Exact-match on trimmed lowercase so a page title containing "JOURS"
  // (e.g. "CALENDRIER 365 JOURS…") doesn't get picked up when we ask for
  // the "jour" anchor row. Anchor labels are always the entire first cell.
  const findRow = (needle) => rows.findIndex(r =>
    r && r[0] && String(r[0]).trim().toLowerCase() === needle)

  const monthsRowIdx = findRow('mois')
  const jourRowIdx   = findRow('jour')
  const saisonRowIdx = findRow('saison')
  const fullMoonIdx  = findRow('full moon')

  if (jourRowIdx === -1) {
    return {
      rooms: [], pricing: [], dateColumns: [],
      warnings: ['Could not find a row starting with "JOUR" — is this the annual pricing template?'],
    }
  }

  const jourRow    = rows[jourRowIdx] || []
  const monthsRow  = monthsRowIdx >= 0 ? fillForward(rows[monthsRowIdx]) : []
  const saisonRow  = saisonRowIdx >= 0 ? rows[saisonRowIdx] : []
  const fullMoonRow = fullMoonIdx >= 0 ? rows[fullMoonIdx] : []

  // ── 2. Build the date grid (columns D onwards, index 3+) ────────────
  const dateColumns = []
  let currentMonth = null
  let currentYear = options.defaultYear || null

  for (let col = 3; col < jourRow.length; col++) {
    const dayCell = (jourRow[col] || '').trim()
    if (!dayCell) continue
    const day = parseInt(dayCell, 10)
    if (!Number.isFinite(day) || day < 1 || day > 31) continue

    // Roll the month forward when the JOUR value resets to 1 or a lower
    // number than we just saw — that's the boundary Google Sheets doesn't
    // print explicitly if the month header cell was merged.
    const monthCell = monthsRow[col]
    const parsedMonth = parseMonthHeader(monthCell)
    if (parsedMonth) {
      currentMonth = parsedMonth.month
      currentYear = parsedMonth.year
    }
    if (!currentMonth) {
      warnings.push(`Day ${day} at column ${col} has no month context — skipping.`)
      continue
    }
    if (!currentYear) {
      warnings.push(`Day ${day}/${currentMonth} has no year context — skipping.`)
      continue
    }

    // Sanity: don't emit a date the month can't hold (e.g. Feb 30).
    if (day > daysInMonth(currentYear, currentMonth)) {
      warnings.push(`Day ${day}/${currentMonth}/${currentYear} is out of range — skipping.`)
      continue
    }

    const iso = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const seasonRaw = (saisonRow[col] || '').trim()
    const fullMoonRaw = (fullMoonRow[col] || '').trim()
    dateColumns.push({
      colIndex: col,
      date: iso,
      seasonCode: seasonRaw ? seasonRaw.slice(0, 16) : null,
      isFullMoon: !!fullMoonRaw,
    })
  }

  if (dateColumns.length === 0) {
    warnings.push('No date columns detected — check the JOUR / MOIS rows.')
    return { rooms: [], pricing: [], dateColumns: [], warnings }
  }

  // ── 3. Detect room rows (start after FULL MOON or SAISON, stop at TOTAL) ─
  const startRowIdx = Math.max(fullMoonIdx, saisonRowIdx, jourRowIdx) + 1
  const roomRowRe = /^\s*(\d+)\s*[.)\-–]\s*(.+)$/   // "1. DELUXE ..." or "1) …" or "1- …"

  const rooms = []
  const pricing = []

  for (let r = startRowIdx; r < rows.length; r++) {
    const row = rows[r] || []
    const firstCell = (row[0] || '').trim()
    if (!firstCell) continue
    // Stop when we hit an aggregate row.
    if (/^total/i.test(firstCell) || /^nuits\s+ouvertes/i.test(firstCell)) break

    const m = firstCell.match(roomRowRe)
    if (!m) continue

    const roomIndex = rooms.length
    const roomName = m[2].trim()
    const refPrice = parseMoney(row[1])

    rooms.push({
      index: roomIndex,
      sourceIndex: parseInt(m[1], 10),
      name: roomName,
      refPrice,
    })

    // Emit one pricing row per date column that has a numeric cell.
    for (const dc of dateColumns) {
      const cell = row[dc.colIndex]
      const price = parseMoney(cell)
      const rawTrim = cell != null ? String(cell).trim() : ''
      // Empty cell → treat as "no price set" (skip — booking engine
      //   defaults to base_price on the room row).
      // Non-empty but not numeric → treat as BLOCKED (e.g. "fermé",
      //   "closed", "X") so the room doesn't get sold that night.
      if (price == null) {
        if (rawTrim) {
          pricing.push({
            roomIndex,
            date: dc.date,
            price: null,
            seasonCode: dc.seasonCode,
            isFullMoon: dc.isFullMoon,
            isBlocked: true,
          })
        }
        continue
      }
      pricing.push({
        roomIndex,
        date: dc.date,
        price,
        seasonCode: dc.seasonCode,
        isFullMoon: dc.isFullMoon,
        isBlocked: false,
      })
    }
  }

  if (rooms.length === 0) {
    warnings.push('No room rows detected — expected lines starting with "1. …", "2. …", etc.')
  }

  return { rooms, pricing, dateColumns, warnings }
}

// ─────────────────────────────────────────────────────────────────────────
// Google Sheets URL → CSV export URL
// ─────────────────────────────────────────────────────────────────────────
// Accepts any of the URLs a user might paste:
//   · https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
//   · https://docs.google.com/spreadsheets/d/{ID}/edit
//   · https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pubhtml
// Returns the CSV export URL that fetch() can pull directly (Google
// Sheets serves it with permissive CORS for public sheets).
export function toGoogleSheetsCSVUrl(url) {
  if (!url) return null
  const s = String(url).trim()

  // Publish-to-web URL — swap /pubhtml → /pub?output=csv
  const pubMatch = s.match(/\/spreadsheets\/d\/e\/([^/]+)\/(pub|pubhtml)/)
  if (pubMatch) {
    return `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv`
  }

  // Regular share URL — extract the sheet ID + optional gid
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) return null
  const sheetId = idMatch[1]
  const gidMatch = s.match(/[#&?]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}
