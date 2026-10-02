// ============================================================================
// Little Hotelier (SiteMinder) "New Reservation" notification parser
// ============================================================================
// LH has no public API and no iCal, but its reservation notification emails
// carry the full booking core: guest name, dates, room, party size, totals,
// taxes, commission, the channel confirmation id, prepaid status, and which
// OTA the booking originally came from. Guest CONTACT details (email/phone)
// are deliberately withheld by LH ("view via the reservations search within
// Little Hotelier") — the guest fills those themselves at QR check-in.
//
// Field map (sample email, La Belle Vie 2026-10-02):
//   "New Reservation"                         → status confirmed
//   "Dan Ish Shalom"                          → guest_name (line after header)
//   "Check-in: 02-Oct-2026"                   → check_in  2026-10-02
//   "Check-out: 03-Oct-2026"                  → check_out 2026-10-03
//   "Booking Confirmation Id: 6685849076"     → external_id
//   "Number of adults : 2"                    → guests_count
//   "Total Price: 2004.75 THB"                → total_price + currency
//   "Commission Payable: 297.93 THB"          → commission_amount
//   "ROOM - Deluxe King Room with Pool View - Partially refundable - ..."
//                                             → room_type (first segment)
//   "payment_on_Booking.com"                  → raw.origin_channel
//   "** THIS RESERVATION HAS BEEN PRE-PAID **"→ raw.prepaid
//
// Cancellations/modifications: LH sends separate notifications. We detect
// "cancel" in the subject/body header zone → status 'cancelled', "modif" →
// 'modified'. Calibrated on the New Reservation template; a real cancellation
// sample will tighten this (the raw payload is kept in ship_email_events
// for replay, so nothing is lost in the meantime).
// ============================================================================
import type { ParsedBooking } from './types.ts'

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

// "02-Oct-2026" → "2026-10-02". Returns undefined on anything unexpected.
function parseLhDate(s: string | undefined): string | undefined {
  if (!s) return undefined
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (!m) return undefined
  const mon = MONTHS[m[2].toLowerCase()]
  if (!mon) return undefined
  return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`
}

// Grab "Label: value" or "Label:\nvalue" from the flattened text. LH's HTML
// renders as label/value pairs; TextBody puts them on consecutive lines.
function field(text: string, label: string): string | undefined {
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:?\\s*\\n?\\s*([^\\n]+)', 'i')
  const m = text.match(re)
  return m ? m[1].trim() : undefined
}

function parseMoney(s: string | undefined): { amount?: number; currency?: string } {
  if (!s) return {}
  const m = s.match(/([\d,]+(?:\.\d+)?)\s*([A-Z]{3})/)
  if (!m) return {}
  return { amount: parseFloat(m[1].replace(/,/g, '')), currency: m[2] }
}

export function parseLittleHotelier(input: {
  subject: string
  text: string
  html: string
}): ParsedBooking | null {
  // Work on text; fall back to naively de-tagged HTML if TextBody is empty.
  const text = (input.text && input.text.trim().length > 0)
    ? input.text
    : input.html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|td|h\d|li)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/[ \t]+\n/g, '\n')

  const headZone = (input.subject + '\n' + text.slice(0, 600)).toLowerCase()
  const status: ParsedBooking['status'] =
    /cancel/.test(headZone) ? 'cancelled'
    : /modif|amend/.test(headZone) ? 'modified'
    : 'confirmed'

  // Guest name: the line right after the "New Reservation" (or Cancelled/
  // Modified) header. Falls back to the "Guest:" field in the ROOM block.
  let guestName: string | undefined
  const headerMatch = text.match(/(?:New|Cancelled|Modified)\s+Reservation\s*\n+\s*([^\n]+)/i)
  if (headerMatch) {
    const candidate = headerMatch[1].trim()
    // Property line contains a pipe or "Hotel"; skip it if the layout shifted.
    if (candidate && !candidate.includes('|') && !/channel property code/i.test(candidate)) {
      guestName = candidate
    }
  }
  if (!guestName) guestName = field(text, 'Guest')

  const checkIn = parseLhDate(field(text, 'Check-in') || field(text, 'Check In Date'))
  const checkOut = parseLhDate(field(text, 'Check-out') || field(text, 'Check Out Date'))
  const externalId = field(text, 'Booking Confirmation Id')?.match(/[\w-]+/)?.[0]

  const adultsStr = text.match(/Number of adults\s*:?\s*(\d+)/i)?.[1]
  const childrenStr = text.match(/Number of children\s*:?\s*(\d+)/i)?.[1]
  const guestsCount =
    (adultsStr ? parseInt(adultsStr, 10) : 0) + (childrenStr ? parseInt(childrenStr, 10) : 0)

  const { amount: totalPrice, currency } = parseMoney(field(text, 'Total Price'))
  const { amount: commission } = parseMoney(field(text, 'Commission Payable'))

  // "ROOM - Deluxe King Room with Pool View - Partially refundable - Mobile(App) Rate"
  // Keep the first segment (the actual room name); the rest is rate plan noise.
  const roomMatch = text.match(/^ROOM\s*-\s*([^\n]+)/im)
  const roomType = roomMatch
    ? roomMatch[1].split(' - ')[0].trim()
    : undefined

  // Which OTA the booking originally came from (LH is a relay).
  const origin =
    /booking\.com/i.test(text) ? 'booking_com'
    : /expedia/i.test(text) ? 'expedia'
    : /agoda/i.test(text) ? 'agoda'
    : /airbnb/i.test(text) ? 'airbnb'
    : 'direct_or_unknown'

  if (!guestName || !checkIn || !checkOut) return null

  return {
    source: 'little_hotelier',
    guest_name: guestName,
    check_in: checkIn,
    check_out: checkOut,
    room_type: roomType,
    guests_count: Math.max(1, guestsCount),
    total_price: totalPrice,
    currency,
    commission_amount: commission,
    external_id: externalId,
    status,
    raw: {
      origin_channel: origin,
      prepaid: /PRE-?PAID/i.test(text),
      channel_property_code: field(text, 'Channel Property Code'),
      total_tax: parseMoney(field(text, 'Total Tax Amount')).amount,
      booked_on: parseLhDate(field(text, 'Booked On')),
    },
  }
}
