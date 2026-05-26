// ============================================================================
// pixabay-search — proxy Pixabay image search so the API key stays server-side
// ============================================================================
// Used by the recipe form in messenger.html: when a cook types "wok" and
// hits the 🔍 button next to the equipment row, the picker calls this
// endpoint to fetch 6 thumbnails to choose from.
//
// We could let the client call Pixabay directly (their key system is
// rate-limit-based, not secret-based) but proxying gives us:
//   - One key to rotate if it leaks
//   - Server-side caching (Cache-Control header) → fewer Pixabay calls
//   - A neutral wire format we can swap to a different provider later
//     (Pexels, Unsplash) without touching the client
//
// Env vars required:
//   PIXABAY_API_KEY  — free, register at https://pixabay.com/api/docs/
//                      Free tier: 5,000 req/hour. Plenty for STAYLO scale.
//
// Auth: anon-readable. The Pixabay catalog is public; no point gating it.
// Rate limit is provider-side; if abused we add a Supabase Edge rate limit later.
//
// Wire format:
//   GET /functions/v1/pixabay-search?q=wok&per_page=6&lang=en
//   → 200 { results: [{ id, thumb, preview, large, alt, tags, source: 'pixabay' }] }
//   → 400 { error: 'q required' }
//   → 503 { error: 'Image search not configured' }
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface PixabayHit {
  id: number
  previewURL: string       // 150px — perfect for grid thumbs
  webformatURL: string     // 640px max edge — modal preview
  largeImageURL: string    // 1280px — full-res if we want to mirror
  tags: string             // comma-separated, used as alt text
  user: string             // photographer name (for attribution)
  pageURL: string          // source page on Pixabay
}

interface PixabayResponse {
  total: number
  totalHits: number
  hits: PixabayHit[]
}

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'GET') return jsonResponse({ error: 'GET only' }, 405)

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (!q) return jsonResponse({ error: 'q required' }, 400)
  if (q.length > 100) return jsonResponse({ error: 'q too long' }, 400)

  // per_page must be 3-200 per Pixabay docs; we cap at 12 for our UI
  const perPageRaw = parseInt(url.searchParams.get('per_page') || '6', 10)
  const perPage = Math.max(3, Math.min(12, isNaN(perPageRaw) ? 6 : perPageRaw))

  // lang: Pixabay accepts ISO-639-1 codes. We map our app langs to theirs.
  // Falls back to 'en' for anything unknown.
  const langInput = (url.searchParams.get('lang') || 'en').toLowerCase()
  const lang = ['en', 'fr', 'th', 'de', 'es', 'it', 'ja', 'ko', 'pt', 'ru', 'zh', 'id'].includes(langInput)
    ? langInput
    : 'en'

  const apiKey = Deno.env.get('PIXABAY_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'Image search not configured',
      detail: 'PIXABAY_API_KEY env var is missing. Get a free key at https://pixabay.com/api/docs/ and set it via: npx supabase secrets set PIXABAY_API_KEY=...',
    }, 503)
  }

  // Build Pixabay request
  const pixabayUrl = new URL('https://pixabay.com/api/')
  pixabayUrl.searchParams.set('key', apiKey)
  pixabayUrl.searchParams.set('q', q)
  pixabayUrl.searchParams.set('image_type', 'photo')
  pixabayUrl.searchParams.set('orientation', 'horizontal')
  pixabayUrl.searchParams.set('per_page', String(perPage))
  pixabayUrl.searchParams.set('safesearch', 'true')
  pixabayUrl.searchParams.set('lang', lang)

  let resp: Response
  try {
    resp = await fetch(pixabayUrl.toString(), {
      headers: { 'User-Agent': 'STAYLO/1.0 (https://staylo.app)' },
    })
  } catch (err) {
    console.error('pixabay-search fetch failed', err)
    return jsonResponse({ error: 'Upstream unreachable', detail: String(err) }, 502)
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    console.error('pixabay-search upstream', resp.status, body.slice(0, 200))
    return jsonResponse({ error: 'Upstream error', status: resp.status }, 502)
  }

  let data: PixabayResponse
  try {
    data = await resp.json()
  } catch (err) {
    return jsonResponse({ error: 'Upstream returned invalid JSON', detail: String(err) }, 502)
  }

  // Normalize to our wire format. We intentionally drop fields the client
  // doesn't need (likes, views, downloads, etc.) — keeps the payload small
  // and decouples our UI from Pixabay's schema.
  const results = (data.hits || []).map(h => ({
    id: String(h.id),
    thumb: h.previewURL,      // 150px
    preview: h.webformatURL,  // 640px
    large: h.largeImageURL,   // 1280px (for mirror-to-storage later)
    alt: h.tags,
    photographer: h.user,
    page_url: h.pageURL,
    source: 'pixabay' as const,
  }))

  return new Response(JSON.stringify({ results, total: data.totalHits }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      // 1-hour CDN cache. The same query ("wok") returns the same top 6
      // results for hours on end on Pixabay — no point burning the quota.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
})
