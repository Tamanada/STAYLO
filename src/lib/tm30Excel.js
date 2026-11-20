// ============================================================================
// tm30Excel.js: builds the rows of the Immigration TM30 import file from
// STAYLO data (pure, no DOM, no Excel library)
// ============================================================================
// The official template (src/lib/tm30Template.js, generated from
// Template-InformAccom-ImportExcel.xls) has nine columns on its first sheet:
//   First Name* | Middle Name | Last Name | Gender* | Passport No.* |
//   Nationality* | Birth Date | Check-out Date | Phone No.
// This module turns booking_guests + bookings rows into those nine cells,
// reports what is missing for each guest, excludes Thai nationals (no TM30
// for them) and splits the result into files of at most 1,000 rows.
// Writing the .xls bytes is done by tm30Workbook.js (SheetJS) so this file
// stays testable in Node.
// ============================================================================
import { TM30_HEADERS, TM30_MAX_ROWS, TM30_GENDER_CODES, TM30_CODES, ALPHA2_TO_TM30 } from './tm30Template.js'

export { TM30_HEADERS, TM30_MAX_ROWS }

/** 'YYYY-MM-DD' (or ISO datetime) to 'DD/MM/YYYY'. Empty when unknown. */
export function tm30Date(value) {
  if (!value) return ''
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

/**
 * Nationality as Immigration wants it: a code of the official list.
 * Accepts what STAYLO stores (ISO alpha-2), an official code typed directly,
 * or nothing. Returns null when the value cannot be mapped.
 */
export function tm30Nationality(value) {
  if (!value) return null
  const v = String(value).trim().toUpperCase()
  if (v.length === 2) return ALPHA2_TO_TM30[v] ?? null
  if (TM30_CODES.has(v)) return v
  return null
}

/** Thai nationals are out of scope of the TM30 notification. */
export function isThaiNational(value) {
  const v = String(value ?? '').trim().toUpperCase()
  return v === 'TH' || v === 'THA'
}

export function tm30Gender(value) {
  const v = String(value ?? '').trim().toUpperCase()
  return TM30_GENDER_CODES.includes(v) ? v : ''
}

/** Phone as digits and a leading plus only; Immigration's column is free text but keep it clean. */
export function tm30Phone(value) {
  if (!value) return ''
  // "(0)" is the trunk prefix people write after a country code: drop it.
  const s = String(value).trim().replace(/\(0\)/g, '').replace(/[^\d+]/g, '')
  return s.startsWith('+') ? '+' + s.slice(1).replace(/\+/g, '') : s.replace(/\+/g, '')
}

/**
 * One guest -> one template row.
 * @returns {{ cells: string[], issues: string[] }} issues are the required
 * fields Immigration will reject: 'first_name', 'gender', 'passport', 'nationality'.
 */
export function tm30Row(guest, booking = {}) {
  const firstName = String(guest?.first_name ?? '').trim()
  const lastName  = String(guest?.last_name ?? '').trim()
  const gender    = tm30Gender(guest?.sex)
  const passport  = String(guest?.passport_number ?? '').trim()
  const nat       = tm30Nationality(guest?.nationality)
  const issues = []
  if (!firstName) issues.push('first_name')
  if (!gender)    issues.push('gender')
  if (!passport)  issues.push('passport')
  if (!nat)       issues.push('nationality')
  return {
    cells: [
      firstName,
      '',
      lastName,
      gender,
      passport,
      nat ?? '',
      tm30Date(guest?.date_of_birth),
      tm30Date(booking?.check_out),
      tm30Phone(booking?.guest_phone),
    ],
    issues,
  }
}

/**
 * All guests of a day -> rows, Thai nationals left out.
 * @param guests booking_guests rows
 * @param bookingsById { [booking_id]: { check_out, guest_phone } }
 */
export function buildTm30Rows(guests, bookingsById) {
  const out = []
  for (const g of guests ?? []) {
    if (isThaiNational(g?.nationality)) continue
    const row = tm30Row(g, bookingsById?.[g.booking_id] ?? {})
    out.push({ guest: g, ...row })
  }
  return out
}

/** Split rows into files of at most TM30_MAX_ROWS rows each. */
export function chunkTm30Rows(rows, max = TM30_MAX_ROWS) {
  const chunks = []
  for (let i = 0; i < rows.length; i += max) chunks.push(rows.slice(i, i + max))
  return chunks
}

/** Sheet content: header row then cells, as the template's first sheet. */
export function tm30SheetData(rows) {
  return [TM30_HEADERS, ...rows.map(r => r.cells)]
}

/** File name: TM30_<property>_<YYYY-MM-DD>[_part2].xls */
export function tm30FileName(propertyName, isoDate, part = 1, total = 1) {
  const safe = String(propertyName || 'property').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'property'
  const suffix = total > 1 ? `_part${part}` : ''
  return `TM30_${safe}_${isoDate}${suffix}.xls`
}
