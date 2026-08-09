// ============================================================================
// Booking.com email parser
// ============================================================================
// Extracts structured booking data from the emails Booking.com sends to
// hoteliers via their Extranet notification system:
//
//   - "New Reservation"        → confirmed
//   - "Cancellation of your booking" → cancelled
//   - "Modification of..."     → modified
//   - "Guest no-show reported" → no_show
//
// Format stability: Booking.com's transactional emails have used the same
// TextBody layout since ~2018. The HTML body varies (redesigns every couple
// of years) but the plain-text body stays consistent. Parse from TextBody
// first, fallback to HtmlBody (strip tags) if empty.
//
// Locale caveat: many hoteliers receive these emails in their own language
// (Thai, French, etc.). This parser targets ENGLISH bodies for V1. i18n
// variants land in commit 9 as separate regex sets keyed by detected locale.
// ============================================================================
import type { ParsedBooking } from './types.ts'

interface ParseInput {
  subject: string
  text: string
  html: string
}

// Strip HTML tags + normalize whitespace — fallback for empty TextBody.
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

// "15 August 2026" / "Saturday, 15 August 2026" / "15 Aug 2026" → "2026-08-15"
const MONTHS: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09', sept: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const cleaned = raw.replace(/^\w+,\s*/, '').trim()  // drop "Saturday, "
  // "15 August 2026" or "15 Aug 2026"
  const m = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!m) return undefined
  const day = m[1].padStart(2, '0')
  const month = MONTHS[m[2].toLowerCase()]
  const year = m[3]
  if (!month) return undefined
  return `${year}-${month}-${day}`
}

// "THB 4,500" / "€ 1.250,50" (some locales) / "USD 320.00" → { amount, currency }
function parseMoney(raw: string | undefined): { amount?: number; currency?: string } {
  if (!raw) return {}
  // Look for 3-letter currency code + amount, in either order
  const withCode = raw.match(/([A-Z]{3})\s*([\d.,\s]+)|([\d.,\s]+)\s*([A-Z]{3})/)
  if (withCode) {
    const currency = (withCode[1] || withCode[4]) as string
    const numStr = (withCode[2] || withCode[3] || '').replace(/\s/g, '')
    // Heuristic: if last separator is dot AND has 2 digits after → decimal dot (US/UK style)
    //            if last separator is comma AND has 2 digits after → decimal comma (EU style)
    let normalized = numStr
    const lastDot = normalized.lastIndexOf('.')
    const lastComma = normalized.lastIndexOf(',')
    if (lastComma > lastDot) {
      // EU: "1.250,50" → "1250.50"
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      // US: "1,250.50" → "1250.50"
      normalized = normalized.replace(/,/g, '')
    }
    const amount = parseFloat(normalized)
    return { amount: isNaN(amount) ? undefined : amount, currency }
  }
  return {}
}

// Detect message intent from subject line — drives the `status` field.
function detectStatus(subject: string): ParsedBooking['status'] {
  const s = subject.toLowerCase()
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('modif') || s.includes('changed') || s.includes('updated')) return 'modified'
  if (s.includes('no-show') || s.includes('no show')) return 'no_show'
  return 'confirmed'
}

export function parseBookingCom(input: ParseInput): ParsedBooking | null {
  const body = (input.text?.trim() || stripHtml(input.html || '')).replace(/\r\n/g, '\n')
  if (!body) return null

  // ────────── External ID (booking number) ──────────
  // Priority: subject line first (shortest + most reliable), body fallback
  const idSubject = input.subject.match(/(?:Booking|Reservation|Confirmation)[^\d]*(\d{6,12})/i)
  const idBody = body.match(/Booking\s*(?:number|ID|reference)[:\s]*(\d{6,12})/i)
  const external_id = (idSubject?.[1] || idBody?.[1])?.trim()

  // ────────── Guest identity ──────────
  const nameMatch = body.match(/Guest\s*name[:\s]+([^\n]+)/i)
    || body.match(/Guest[:\s]+([A-Z][^\n]+)/)
    || body.match(/Name[:\s]+([A-Z][^\n]+)/)
  const guest_name = nameMatch?.[1]?.trim().replace(/\s+/g, ' ')

  const emailMatch = body.match(/([\w.+-]+@[\w-]+\.[\w.-]+)/)
  const guest_email = emailMatch?.[1]

  const phoneMatch = body.match(/(?:Phone|Tel|Mobile)[:\s]+(\+?[\d\s()-]{7,})/i)
  const guest_phone = phoneMatch?.[1]?.trim()

  const countryMatch = body.match(/Guest\s*country[:\s]+([A-Z]{2})/i)
    || body.match(/Country[:\s]+([A-Z]{2})/i)
  const guest_country = countryMatch?.[1]

  // ────────── Stay dates ──────────
  const inMatch = body.match(/Check[- ]?in[:\s]+([^\n]+)/i)
  const outMatch = body.match(/Check[- ]?out[:\s]+([^\n]+)/i)
  const check_in = parseDate(inMatch?.[1])
  const check_out = parseDate(outMatch?.[1])

  // ────────── Room + party ──────────
  const roomMatch = body.match(/Room(?:\s*type)?[:\s]+([^\n]+)/i)
  const room_type = roomMatch?.[1]?.trim()

  const guestsMatch = body.match(/(?:Guests|Number\s*of\s*guests|Adults)[:\s]+(\d+)/i)
  const guests_count = guestsMatch ? parseInt(guestsMatch[1], 10) : undefined

  // ────────── Money ──────────
  const totalMatch = body.match(/Total\s*(?:price|amount|cost)[:\s]+([^\n]+)/i)
    || body.match(/Grand\s*total[:\s]+([^\n]+)/i)
  const { amount: total_price, currency } = parseMoney(totalMatch?.[1])

  const commissionMatch = body.match(/Commission[:\s]+([^\n]+)/i)
  const { amount: commission_amount } = parseMoney(commissionMatch?.[1])

  // ────────── Bare-minimum validity check ──────────
  // If we couldn't find guest name OR either date, this is not parseable.
  // Signal to the handler that fallback (or manual review) is needed.
  if (!guest_name || !check_in || !check_out) {
    return null
  }

  return {
    source: 'booking_com',
    external_id,
    guest_name,
    guest_email,
    guest_phone,
    guest_country,
    check_in,
    check_out,
    room_type,
    guests_count,
    total_price,
    currency,
    commission_amount,
    status: detectStatus(input.subject),
    raw: {
      subject: input.subject,
      body_length: body.length,
    },
  }
}
