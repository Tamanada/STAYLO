// ============================================================================
// ship-inbound-email — Postmark inbound webhook for SHIP standalone
// ============================================================================
// Receives every email hitting `bookings+<slug>@app.ship.app` (or the Postmark
// default inbound domain during dev). Extracts the hotel slug from the To:
// field, logs the raw payload for audit/replay, picks a parser based on the
// From: address, and upserts a ship_bookings row.
//
// Flow:
//   1. Verify Basic Auth (POSTMARK_INBOUND_USER / POSTMARK_INBOUND_PASSWORD)
//   2. Parse Postmark JSON payload
//   3. Extract hotel_slug from To: sub-address ("bookings+dancing@..." → "dancing")
//   4. Resolve hotel_id from slug (ship_hotels lookup)
//   5. INSERT ship_email_events row (status='pending') — always, for audit
//   6. Pick parser by From: (booking.com / expedia / agoda / airbnb)
//   7. Run parser → structured booking data
//   8. UPSERT ship_bookings (on conflict: hotel_id + source + external_id)
//   9. UPDATE ship_email_events (status='parsed'/'failed'/'ignored')
//  10. Return 200 always (Postmark retries on 5xx; we don't want retries for
//      parse failures — those need manual replay via admin UI)
//
// Env vars needed:
//   POSTMARK_INBOUND_USER      — Basic Auth username (set in Postmark dashboard)
//   POSTMARK_INBOUND_PASSWORD  — Basic Auth password
//   SUPABASE_URL               — auto-provided by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY  — auto-provided
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { parseBookingCom } from './parsers/booking-com.ts'
import type { ParsedBooking, PostmarkInboundPayload } from './parsers/types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POSTMARK_INBOUND_USER = Deno.env.get('POSTMARK_INBOUND_USER')
const POSTMARK_INBOUND_PASSWORD = Deno.env.get('POSTMARK_INBOUND_PASSWORD')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ────────── Basic Auth check ──────────
function verifyBasicAuth(req: Request): boolean {
  if (!POSTMARK_INBOUND_USER || !POSTMARK_INBOUND_PASSWORD) {
    // In dev with no auth configured, allow (Postmark test tool doesn't send auth)
    return true
  }
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false
  try {
    const decoded = atob(header.slice(6))
    const [user, pass] = decoded.split(':')
    return user === POSTMARK_INBOUND_USER && pass === POSTMARK_INBOUND_PASSWORD
  } catch {
    return false
  }
}

// ────────── Sub-address extraction ──────────
// "bookings+dancing@app.ship.app"                → "dancing"
// "abc123+dancing@inbound.postmarkapp.com"       → "dancing"
// "bookings@app.ship.app"                        → null (no tag)
function extractHotelSlug(to: string): string | null {
  const m = to.match(/[^\s<>]+\+([a-z0-9][a-z0-9-]*)@/i)
  return m ? m[1].toLowerCase() : null
}

// ────────── Source detection from From: address ──────────
function detectSource(from: string): ParsedBooking['source'] | null {
  const f = from.toLowerCase()
  if (f.includes('booking.com')) return 'booking_com'
  if (f.includes('expedia.com') || f.includes('expediapartnercentral')) return 'expedia'
  if (f.includes('agoda.com')) return 'agoda'
  if (f.includes('airbnb.com')) return 'airbnb'
  return null
}

// ────────── Main handler ──────────
serve(async (req: Request) => {
  // Postmark only POSTs; anything else = misuse
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 })
  }

  if (!verifyBasicAuth(req)) {
    console.warn('[ship-inbound-email] Basic auth failed')
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse payload
  let payload: PostmarkInboundPayload
  try {
    payload = await req.json()
  } catch (err) {
    console.error('[ship-inbound-email] Invalid JSON', err)
    return new Response('Invalid JSON', { status: 400 })
  }

  const toAddr = payload.To || payload.OriginalRecipient || ''
  const fromAddr = payload.From || ''
  const subject = payload.Subject || ''
  const hotelSlug = extractHotelSlug(toAddr)

  // ────────── ALWAYS log the raw event first (audit + replay) ──────────
  // Even if we can't route it, we keep the payload for debug.
  let hotelId: string | null = null
  if (hotelSlug) {
    const { data: hotel } = await supabase
      .from('ship_hotels')
      .select('id')
      .eq('slug', hotelSlug)
      .maybeSingle()
    hotelId = hotel?.id ?? null
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from('ship_email_events')
    .insert({
      hotel_slug: hotelSlug,
      hotel_id: hotelId,
      source_email: fromAddr,
      subject: subject,
      raw_payload: payload,
      parse_status: 'pending',
    })
    .select('id')
    .single()

  if (eventErr) {
    console.error('[ship-inbound-email] Failed to log event', eventErr)
    // Return 200 anyway — don't want Postmark to retry a DB error
    return new Response('logged with errors', { status: 200 })
  }

  const eventId = eventRow.id
  const finish = async (
    status: 'parsed' | 'failed' | 'ignored',
    extra: { parse_error?: string; booking_id?: string } = {}
  ) => {
    await supabase
      .from('ship_email_events')
      .update({
        parse_status: status,
        parsed_at: new Date().toISOString(),
        ...extra,
      })
      .eq('id', eventId)
    return new Response(JSON.stringify({ status, event_id: eventId, ...extra }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ────────── Routing errors ──────────
  if (!hotelSlug) {
    return finish('ignored', {
      parse_error: 'no hotel sub-address tag in To: field',
    })
  }
  if (!hotelId) {
    return finish('ignored', {
      parse_error: `no hotel matches slug "${hotelSlug}"`,
    })
  }

  const source = detectSource(fromAddr)
  if (!source) {
    return finish('ignored', {
      parse_error: `unknown source: ${fromAddr}`,
    })
  }

  // ────────── Parse ──────────
  let parsed: ParsedBooking | null = null
  try {
    if (source === 'booking_com') {
      parsed = parseBookingCom({
        subject,
        text: payload.TextBody || '',
        html: payload.HtmlBody || '',
      })
    } else {
      // Parsers for expedia/agoda/airbnb ship in commit 9
      return finish('ignored', {
        parse_error: `parser not yet implemented: ${source}`,
      })
    }
  } catch (err) {
    console.error('[ship-inbound-email] Parser threw', err)
    return finish('failed', {
      parse_error: `parser exception: ${(err as Error).message}`,
    })
  }

  if (!parsed || !parsed.guest_name || !parsed.check_in || !parsed.check_out) {
    return finish('failed', {
      parse_error: 'parser returned incomplete data (missing guest_name/check_in/check_out)',
    })
  }

  // ────────── Upsert booking ──────────
  const bookingRow = {
    hotel_id: hotelId,
    source,
    external_id: parsed.external_id ?? null,
    guest_name: parsed.guest_name,
    guest_email: parsed.guest_email ?? null,
    guest_phone: parsed.guest_phone ?? null,
    guest_country: parsed.guest_country ?? null,
    check_in: parsed.check_in,
    check_out: parsed.check_out,
    room_type: parsed.room_type ?? null,
    guests_count: parsed.guests_count ?? 1,
    total_price: parsed.total_price ?? null,
    currency: parsed.currency ?? null,
    commission_amount: parsed.commission_amount ?? null,
    status: parsed.status ?? 'confirmed',
    raw_data: { parser: source, subject, ...(parsed.raw ?? {}) },
    updated_at: new Date().toISOString(),
  }

  // Only upsert on conflict when we have an external_id (partial unique index)
  const query = parsed.external_id
    ? supabase
        .from('ship_bookings')
        .upsert(bookingRow, {
          onConflict: 'hotel_id,source,external_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single()
    : supabase.from('ship_bookings').insert(bookingRow).select('id').single()

  const { data: booking, error: bookingErr } = await query

  if (bookingErr) {
    console.error('[ship-inbound-email] Upsert failed', bookingErr)
    return finish('failed', { parse_error: `db error: ${bookingErr.message}` })
  }

  return finish('parsed', { booking_id: booking.id })
})
