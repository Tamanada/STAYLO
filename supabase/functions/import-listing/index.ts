// ============================================================================
// import-listing — extract public Open Graph + schema.org data from a URL
// ============================================================================
// Honest approach: we DON'T scrape proprietary data (room prices, full
// galleries, reviews) — that's against Booking/Airbnb ToS and legally
// risky. Instead we read the public meta tags that every website
// explicitly publishes for sharing previews:
//
//   <meta property="og:title">       → property name
//   <meta property="og:description"> → short description
//   <meta property="og:image">       → cover photo URL
//   <meta property="og:locality">    → city (some sites)
//   <meta property="og:country-name">→ country
//   JSON-LD schema.org Hotel/Lodging → richer geo/address/stars
//
// Returns whatever we managed to extract + a list of fields the user
// still needs to fill in manually.
//
// Caller: any authenticated STAYLO user (the form on /submit).
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAuthUser, jsonResponse } from '../_shared/supabase.ts'
import { handleOptions } from '../_shared/cors.ts'

interface Req { url: string }

interface Extracted {
  name: string | null
  description: string | null
  image_url: string | null
  city: string | null
  country: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  star_rating: number | null
  type: string | null
  source: string                    // 'booking' | 'airbnb' | 'hostelworld' | 'generic'
  source_url: string
  manual_fields_needed: string[]    // human-readable hints
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // Auth — must be a logged-in user (any role). Prevents random anon abuse.
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  const rawUrl = String(body.url || '').trim()
  if (!rawUrl) return jsonResponse({ error: 'url required' }, 400)

  let parsedUrl: URL
  try { parsedUrl = new URL(rawUrl) } catch { return jsonResponse({ error: 'Invalid URL' }, 400) }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return jsonResponse({ error: 'Only http/https URLs accepted' }, 400)
  }

  const source = detectSource(parsedUrl.host)

  // Fetch the page
  let html: string
  try {
    const resp = await fetch(rawUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!resp.ok) {
      return jsonResponse({
        error: 'Page fetch failed',
        detail: `${source} returned HTTP ${resp.status}. The page may be private, deleted, or behind a bot wall.`,
        status: resp.status,
      }, 502)
    }
    html = await resp.text()
  } catch (err) {
    return jsonResponse({
      error: 'Could not reach the URL',
      detail: (err as Error).message,
    }, 502)
  }

  // Extract everything we can
  const extracted = extractFromHtml(html, source, rawUrl)
  return jsonResponse(extracted)
})

function detectSource(host: string): string {
  const h = host.toLowerCase()
  if (h.includes('booking.com'))     return 'booking'
  if (h.includes('airbnb.'))         return 'airbnb'
  if (h.includes('hostelworld.com')) return 'hostelworld'
  if (h.includes('agoda.com'))       return 'agoda'
  if (h.includes('expedia.'))        return 'expedia'
  if (h.includes('hotels.com'))      return 'hotels'
  if (h.includes('tripadvisor.'))    return 'tripadvisor'
  return 'generic'
}

function extractFromHtml(html: string, source: string, sourceUrl: string): Extracted {
  const out: Extracted = {
    name: null, description: null, image_url: null,
    city: null, country: null, address: null,
    latitude: null, longitude: null,
    star_rating: null, type: null,
    source, source_url: sourceUrl,
    manual_fields_needed: [],
  }

  // 1. Open Graph + meta tags (regex-based — Deno has no DOM parser by default)
  const og = (prop: string) => matchMeta(html, prop)
  out.name        = og('og:title')        || matchTitle(html)
  out.description = og('og:description')  || matchMetaName(html, 'description')
  out.image_url   = og('og:image')        || og('og:image:secure_url')

  // Some sites stuff city in og:locality / city
  out.city    = og('og:locality') || og('place:location:city')
  out.country = og('og:country-name') || og('place:location:country')

  // 2. schema.org JSON-LD — richer data when available
  const jsonLd = extractJsonLd(html)
  for (const obj of jsonLd) {
    const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]
    const isLodging = types.some(t =>
      typeof t === 'string' && /Hotel|Hostel|Lodging|Resort|BedAndBreakfast|GuestHouse|Apartment/i.test(t)
    )
    if (!isLodging && !obj.address && !obj.geo) continue

    if (!out.name && obj.name) out.name = String(obj.name)
    if (!out.description && obj.description) out.description = String(obj.description)
    if (!out.image_url && obj.image) {
      const img = Array.isArray(obj.image) ? obj.image[0] : obj.image
      out.image_url = typeof img === 'string' ? img : (img?.url || null)
    }
    if (obj.address) {
      const addr = obj.address
      out.address = out.address || (typeof addr === 'string' ? addr : addr.streetAddress || null)
      out.city    = out.city    || (addr.addressLocality || null)
      out.country = out.country || (addr.addressCountry  || null)
    }
    if (obj.geo) {
      out.latitude  = parseFloat(obj.geo.latitude)  || null
      out.longitude = parseFloat(obj.geo.longitude) || null
    }
    if (obj.starRating?.ratingValue) {
      out.star_rating = parseInt(String(obj.starRating.ratingValue), 10) || null
    }
    if (typeof obj['@type'] === 'string') {
      const t = obj['@type'].toLowerCase()
      if (/hostel/.test(t))         out.type = 'hostel'
      else if (/resort/.test(t))    out.type = 'resort'
      else if (/apartment/.test(t)) out.type = 'apartment'
      else if (/bedand|guest/.test(t)) out.type = 'guesthouse'
      else if (/hotel|lodging/.test(t)) out.type = 'hotel'
    }
  }

  // 3. Friendly hints about what's missing — the hotelier needs to know
  if (!out.name)       out.manual_fields_needed.push('Property name (we couldn\'t detect it)')
  if (!out.city)       out.manual_fields_needed.push('City')
  if (!out.country)    out.manual_fields_needed.push('Country')
  if (!out.address)    out.manual_fields_needed.push('Full street address')
  if (!out.image_url)  out.manual_fields_needed.push('Cover photo')
  out.manual_fields_needed.push(
    'All additional photos (we only get the cover from the source)',
    'Room types, prices and bed configurations',
    'Amenities and accessibility features',
    'Contact name, email, phone',
    'Check-in / check-out times',
    'Cancellation and smoking policies',
  )

  return out
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = html.match(re)
  if (m) return decodeEntities(m[1])
  // Try the reversed order (content before property)
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRe(property)}["']`, 'i')
  const m2 = html.match(re2)
  return m2 ? decodeEntities(m2[1]) : null
}

function matchMetaName(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+name=["']${escapeRe(name)}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = html.match(re)
  return m ? decodeEntities(m[1]) : null
}

function matchTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? decodeEntities(m[1].trim()) : null
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) out.push(...parsed)
      else if (parsed['@graph']) out.push(...parsed['@graph'])
      else out.push(parsed)
    } catch { /* invalid JSON in some scripts — skip */ }
  }
  return out
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
