// ============================================================================
// loyverse-stores — verify a Loyverse Personal Access Token and list stores
// ============================================================================
// Used by the "Connect Loyverse" wizard inside ship.html (Pulse → POS
// Connectors → Loyverse). The hotelier generates a read-only Personal
// Access Token in their Loyverse Back Office and pastes it into step 3 of
// the wizard. On step 4 ("Verify & Connect") the wizard POSTs the token
// here. We:
//   1. Validate the format quickly (length sanity check).
//   2. Hit Loyverse `GET /v1.0/stores` with the bearer token.
//   3. Distinguish 401/403 ("bad token") from 5xx ("their server is down").
//   4. Return a minimal `{ stores: [{ id, name, address }] }` payload so the
//      wizard can show the hotelier exactly which outlets STAYLO is about
//      to start streaming from.
//
// We do NOT store the token here yet. The wizard will pass it back on the
// "save" call once we ship the persistence layer (a `hotel_pos_credentials`
// table with row-level encryption + RLS). For the live demo, returning the
// stores list with the user's own token in-memory is enough to prove the
// integration is real.
//
// Auth: anon-readable. The hotelier proves ownership of the Loyverse
// account by holding a valid token; we don't gate this further. If we
// later add a write/store endpoint we'll require the user's Supabase JWT.
//
// Wire format:
//   POST /functions/v1/loyverse-stores  body: { token: string }
//   → 200 { stores: [{ id, name, address }], count }
//   → 400 { error: 'Missing token' | 'Token format looks wrong' }
//   → 401 { error: 'Invalid token. ...' }
//   → 502 { error: 'Loyverse unreachable' | 'Loyverse returned an error' }
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface LoyverseStore {
  id: string
  name: string
  address?: string | null
  description?: string | null
}
interface LoyverseStoresResponse {
  stores: LoyverseStore[]
  cursor?: string | null
}

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  let body: { token?: string } = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body must be JSON: { token }' }, 400)
  }

  const token = (body.token || '').trim()
  if (!token) return jsonResponse({ error: 'Missing token' }, 400)
  // Loyverse PATs are JWT-ish strings (~200-500 chars). Reject obvious
  // copy-paste-fail cases (a name, a UUID, an empty string with whitespace).
  if (token.length < 20 || token.length > 4000) {
    return jsonResponse({ error: 'Token format looks wrong — should be a long string from Loyverse' }, 400)
  }

  let resp: Response
  try {
    resp = await fetch('https://api.loyverse.com/v1.0/stores', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'STAYLO/1.0 (https://staylo.app)',
      },
    })
  } catch (err) {
    console.error('loyverse-stores fetch failed', err)
    return jsonResponse({ error: 'Loyverse unreachable', detail: String(err) }, 502)
  }

  if (resp.status === 401 || resp.status === 403) {
    return jsonResponse({
      error: 'Invalid token. Re-check the access token you copied from Loyverse — and make sure the STORES_READ permission is ticked.',
    }, 401)
  }
  if (resp.status === 429) {
    return jsonResponse({ error: 'Loyverse is rate-limiting us. Try again in a minute.' }, 429)
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('loyverse-stores upstream', resp.status, text.slice(0, 200))
    return jsonResponse({ error: 'Loyverse returned an error', status: resp.status }, 502)
  }

  let data: LoyverseStoresResponse
  try {
    data = await resp.json()
  } catch (err) {
    return jsonResponse({ error: 'Loyverse returned invalid JSON', detail: String(err) }, 502)
  }

  const stores = (data.stores || []).map(s => ({
    id: s.id,
    name: s.name || 'Unnamed store',
    address: s.address || null,
  }))

  if (stores.length === 0) {
    return jsonResponse({
      error: 'Connected, but no stores found on this Loyverse account. Create at least one store in Loyverse first.',
    }, 422)
  }

  return jsonResponse({ stores, count: stores.length }, 200)
})
