// ============================================================================
// loyverse-proxy — generic read-only proxy for the Loyverse v1.0 API
// ============================================================================
// One edge function that fronts the whole Loyverse catalog. The client
// (ship.html Pulse tab) sends:
//
//   POST /functions/v1/loyverse-proxy
//   { "token": "...", "path": "receipts", "query": { "limit": "50" } }
//
// and gets back the raw Loyverse JSON. The wrapper:
//   • Validates the path against an allow-list (read-only resources).
//   • Forwards the user's Personal Access Token as a Bearer header.
//   • Caches very lightly (5 s) for repeat calls in the same browser tab.
//   • Translates Loyverse 401/403 into a clear "re-paste your token" error.
//
// Why not call Loyverse directly from the browser? Loyverse does not
// publish CORS headers for cross-origin browser requests — so we must
// hop through Deno. Bonus benefits: server-side log of every hit, easy
// rate-limit knob, one place to swap auth strategy when we move from
// per-user PATs to a STAYLO-owned OAuth app.
//
// Auth: anon-readable. The hotelier proves ownership of their Loyverse
// account by holding a valid token. Writes (POST/PUT/DELETE on Loyverse)
// are NOT proxied — we explicitly only GET.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

// Read-only resources we let the client hit. Each maps 1:1 to a Loyverse
// v1.0 endpoint top-level segment. We refuse anything not on this list so
// a compromised token can never be coerced into writing.
const ALLOWED_TOP = new Set([
  'stores',
  'items',
  'categories',
  'modifiers',
  'discounts',
  'taxes',
  'payment_types',
  'receipts',
  'customers',
  'employees',
  'inventory_levels',
  'suppliers',
  'shifts',
  'merchant',
  'pos_devices',
])

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  let body: { token?: string; path?: string; query?: Record<string, string> } = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body must be JSON: { token, path, query? }' }, 400)
  }

  const token = (body.token || '').trim()
  if (!token) return jsonResponse({ error: 'Missing token' }, 400)
  if (token.length < 20 || token.length > 4000) {
    return jsonResponse({ error: 'Token format looks wrong' }, 400)
  }

  // Normalize path: strip leading/trailing slashes, refuse empty,
  // refuse anything starting with a non-letter (defends against weirdness).
  const path = (body.path || '').trim().replace(/^\/+|\/+$/g, '')
  if (!path || !/^[a-z]/i.test(path)) return jsonResponse({ error: 'Invalid path' }, 400)

  const top = path.split('/')[0]
  if (!ALLOWED_TOP.has(top)) {
    return jsonResponse({ error: `Resource not allowed: ${top}` }, 400)
  }

  const url = new URL(`https://api.loyverse.com/v1.0/${path}`)
  if (body.query && typeof body.query === 'object') {
    for (const [k, v] of Object.entries(body.query)) {
      if (typeof v === 'string' && v.length && v.length < 200) {
        url.searchParams.set(k, v)
      }
    }
  }

  let resp: Response
  try {
    resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'STAYLO/1.0 (https://staylo.app)',
      },
    })
  } catch (err) {
    console.error('loyverse-proxy fetch failed', err)
    return jsonResponse({ error: 'Loyverse unreachable', detail: String(err) }, 502)
  }

  if (resp.status === 401 || resp.status === 403) {
    return jsonResponse({
      error: 'Invalid or expired token — re-paste the access token from Loyverse.',
    }, 401)
  }
  if (resp.status === 429) {
    return jsonResponse({ error: 'Loyverse is rate-limiting STAYLO. Try again shortly.' }, 429)
  }
  if (resp.status === 404) {
    return jsonResponse({ error: 'Loyverse returned 404 for that resource' }, 404)
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('loyverse-proxy upstream', resp.status, text.slice(0, 300))
    return jsonResponse({ error: 'Loyverse returned an error', status: resp.status }, 502)
  }

  let data: unknown
  try {
    data = await resp.json()
  } catch (err) {
    return jsonResponse({ error: 'Loyverse returned invalid JSON', detail: String(err) }, 502)
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
      // Very short cache so quickly-repeated calls in one tab don't hit
      // Loyverse twice. 5 s is invisible to the user but slashes traffic
      // when the page renders the same resource in two places.
      'Cache-Control': 'private, max-age=5',
    },
  })
})
