// ============================================================================
// ical-sync — pull third-party iCal feeds into external_bookings
// ============================================================================
// Two invocation modes:
//   · POST { feed_id: uuid }        — user clicked "Refresh now" on one feed
//   · POST {} or { all: true }       — scheduled run: every active feed in DB
//                                       (Supabase Cron / GitHub Actions cron)
//
// For each feed:
//   1. Fetch the iCal URL (must be publicly readable; iCal feeds usually are)
//   2. Parse VEVENT blocks (DTSTART, DTEND, SUMMARY, UID) — minimal RFC 5545
//      subset; handles line folding + escape chars
//   3. Upsert into external_bookings by (feed_id, external_uid)
//   4. Stamp ical_feeds.last_synced_at + status + error + event count
//
// Nothing here writes to public.bookings — external bookings are strictly
// their own thing. See migration 20260813000001 for the "why".
// ============================================================================
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders, preflight, jsonResponse, errorResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─────────────────────────────────────────────────────────────────────────
// Minimal RFC 5545 iCal parser
// ─────────────────────────────────────────────────────────────────────────

// Unfold RFC 5545 line continuations. A line that begins with a space or
// tab is a continuation of the previous logical line — join it back
// without the leading whitespace. Every real-world feed uses this to keep
// long SUMMARY / DESCRIPTION under 75 octets.
function unfoldLines(ics: string): string[] {
  const raw = ics.split(/\r?\n/)
  const out: string[] = []
  for (const line of raw) {
    if (line.length > 0 && (line[0] === ' ' || line[0] === '\t') && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

// Unescape RFC 5545 text values inside SUMMARY / DESCRIPTION.
// The four escapes defined by the spec: \n \, \; \\
function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

// Turn an iCal date/datetime into a plain YYYY-MM-DD.
// Accepts:  20260813  · 20260813T140000  · 20260813T140000Z
// iCal DTEND on a DATE-typed event is EXCLUSIVE (next-day midnight in the
// calendar's mind), which matches our check_out semantics 1:1 — so we
// return it verbatim without shifting.
function parseIcalDate(value: string): string | null {
  const cleaned = value.trim()
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

interface ParsedEvent {
  uid: string
  checkIn: string
  checkOut: string
  summary: string
}

// Walk unfolded lines, collect VEVENT blocks, extract the four fields we
// care about. We ignore VTIMEZONE, VCALENDAR meta, and every property
// we don't need — no need for a full ICS AST.
function parseIcs(ics: string): ParsedEvent[] {
  const lines = unfoldLines(ics)
  const events: ParsedEvent[] = []
  let cur: Partial<ParsedEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur && cur.checkIn && cur.checkOut) {
        events.push({
          uid:      cur.uid      ?? `synth-${cur.checkIn}-${cur.checkOut}-${(cur.summary || '').slice(0, 24)}`,
          checkIn:  cur.checkIn,
          checkOut: cur.checkOut,
          summary:  cur.summary ?? '',
        })
      }
      cur = null
      continue
    }
    if (!cur) continue

    // A property line is `NAME[;PARAM=VAL...]:VALUE`. We split at the
    // FIRST colon that isn't inside a parameter (":" inside quoted param
    // values would need a fancier parser — feeds we care about don't do
    // that, so a plain split is safe).
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const nameAndParams = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)
    const name = nameAndParams.split(';')[0].toUpperCase()

    switch (name) {
      case 'UID':      cur.uid      = value.trim(); break
      case 'SUMMARY':  cur.summary  = unescapeText(value); break
      case 'DTSTART': {
        const d = parseIcalDate(value); if (d) cur.checkIn = d; break
      }
      case 'DTEND': {
        const d = parseIcalDate(value); if (d) cur.checkOut = d; break
      }
    }
  }

  return events
}

// Extract a probable guest name from Airbnb / Little Hotelier SUMMARY lines.
//   "Reserved — John Doe"           → "John Doe"
//   "Reservation for Jane"          → "Jane"
//   "Booked by ABC-123 · 2 guests"  → "ABC-123"
// Falls back to null when the summary is opaque ("Blocked", "Not available",
// or an obviously-technical ID) — the UI shows the raw_summary in that case.
function extractGuestName(summary: string | undefined | null): string | null {
  if (!summary) return null
  const s = summary.trim()
  if (!s) return null
  const patterns = [
    /^Reserved\s*[-—:]\s*(.+?)(?:\s+·|\s+-|$)/i,
    /^Reservation\s+for\s+(.+?)(?:\s+·|\s+-|$)/i,
    /^Booked\s+by\s+(.+?)(?:\s+·|\s+-|$)/i,
    /^Guest:\s*(.+?)(?:\s+·|\s+-|$)/i,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim()
  }
  // Common no-name markers → keep null
  if (/^(blocked|not available|closed|unavailable|reserved)$/i.test(s)) return null
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Sync one feed — fetch, parse, upsert, stamp status
// ─────────────────────────────────────────────────────────────────────────
async function syncFeed(supa: ReturnType<typeof createClient>, feed: any) {
  const stamp = async (patch: Record<string, unknown>) => {
    await supa.from('ical_feeds').update({ last_synced_at: new Date().toISOString(), ...patch }).eq('id', feed.id)
  }

  let ics: string
  try {
    const res = await fetch(feed.ical_url, { redirect: 'follow' })
    if (!res.ok) {
      await stamp({ last_sync_status: `http_${res.status}`, last_sync_error: `Feed returned HTTP ${res.status}`, last_event_count: 0 })
      return { feed_id: feed.id, ok: false, error: `http_${res.status}` }
    }
    ics = await res.text()
  } catch (e) {
    await stamp({ last_sync_status: 'network_error', last_sync_error: String(e).slice(0, 500), last_event_count: 0 })
    return { feed_id: feed.id, ok: false, error: 'network' }
  }

  let events: ParsedEvent[]
  try {
    events = parseIcs(ics)
  } catch (e) {
    await stamp({ last_sync_status: 'parse_error', last_sync_error: String(e).slice(0, 500), last_event_count: 0 })
    return { feed_id: feed.id, ok: false, error: 'parse' }
  }

  // Bulk upsert into external_bookings. Every row carries the same
  // (property_id, room_id, source) — those are copied from the feed so
  // the row is self-sufficient for filtering (no join needed on hot
  // paths like "show me this month's external bookings").
  const rows = events.map(ev => ({
    feed_id:      feed.id,
    property_id:  feed.property_id,
    room_id:      feed.room_id,
    source:       feed.source,
    external_uid: ev.uid,
    check_in:     ev.checkIn,
    check_out:    ev.checkOut,
    guest_name:   extractGuestName(ev.summary),
    raw_summary:  ev.summary?.slice(0, 500) ?? null,
    last_seen_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error: upErr } = await supa
      .from('external_bookings')
      .upsert(rows, { onConflict: 'feed_id,external_uid', ignoreDuplicates: false })
    if (upErr) {
      await stamp({ last_sync_status: 'db_error', last_sync_error: upErr.message.slice(0, 500), last_event_count: 0 })
      return { feed_id: feed.id, ok: false, error: 'db' }
    }
  }

  await stamp({ last_sync_status: 'ok', last_sync_error: null, last_event_count: events.length })
  return { feed_id: feed.id, ok: true, events: events.length }
}

// ─────────────────────────────────────────────────────────────────────────
// HTTP entry point
// ─────────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return errorResponse('POST only', 405)

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let payload: { feed_id?: string; property_id?: string; all?: boolean } = {}
  try { payload = await req.json() } catch { /* empty body is fine */ }

  // Build the feed list to sync — one, one property's worth, or all active.
  let query = supa.from('ical_feeds').select('*').eq('is_active', true)
  if (payload.feed_id)     query = query.eq('id', payload.feed_id)
  else if (payload.property_id) query = query.eq('property_id', payload.property_id)

  const { data: feeds, error: fetchErr } = await query
  if (fetchErr) return errorResponse(`Failed to list feeds: ${fetchErr.message}`, 500)
  if (!feeds || feeds.length === 0) return jsonResponse({ ok: true, synced: 0, results: [] })

  // Sync feeds sequentially. Parallel would be faster but Supabase's PostgREST
  // request pool is small and iCal endpoints are rate-limited; a small fleet
  // (usually 1-20 feeds per property) syncs in seconds either way.
  const results = []
  for (const feed of feeds) {
    results.push(await syncFeed(supa, feed))
  }

  return jsonResponse({
    ok: true,
    synced: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed:    results.filter(r => !r.ok).length,
    results,
  })
})
