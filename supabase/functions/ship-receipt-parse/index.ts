// ============================================================================
// ship-receipt-parse — Claude Vision receipt parser for SHIP Accounting
// ============================================================================
// Client sends a receipt image (base64 data URL) + optional currency hint.
// We forward to Anthropic's Messages API with claude-haiku-4-5 (vision-
// capable, ~$0.001-0.005 per receipt), asking for a strict JSON extraction.
// Return the parsed fields to the client; the manager can then confirm /
// edit before saving.
//
// Auth: anon-callable — the endpoint doesn't touch Supabase itself, it's a
// pure API relay. Rate-limiting for later; for now the CSP + Postmark
// pattern of "small blast radius, one hotel at a time" is fine.
//
// Env vars:
//   ANTHROPIC_API_KEY — required. Provisioned as a Supabase secret. Without
//                       it, the function returns 503 with a helpful message
//                       so the client can fall back to manual entry.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// Prefer the SHIP-scoped key so cost tracking is isolated per project;
// fall back to the shared ANTHROPIC_API_KEY if the SHIP-specific one isn't
// set (e.g. staging environments).
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY_SHIP')
                       || Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-haiku-4-5-20251001'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// The category taxonomy the client uses for filing expenses. Kept in sync
// with the dropdown in ship.html — any additions here must land there too.
const CATEGORIES = [
  'food_beverage',
  'cleaning_laundry',
  'maintenance',
  'utilities',
  'office',
  'marketing',
  'travel',
  'insurance',
  'rent',
  'payroll',
  'bank_fees',
  'other',
] as const

const SYSTEM_PROMPT = `You are a receipt parsing assistant for a hotel management system.
Extract the following fields from the receipt image and return ONLY a JSON object with these exact keys:

{
  "vendor": string | null,           // Merchant name as printed on the receipt
  "date": string | null,             // ISO YYYY-MM-DD; null if unreadable
  "amount": number | null,           // Grand total paid, numeric only (no currency symbol)
  "currency": string | null,         // ISO 4217 3-letter code inferred from the receipt (THB, USD, EUR, ...)
  "category": string,                // One of: ${CATEGORIES.join(', ')}
  "description": string | null,      // Very short summary of the purchase (max 60 chars, e.g. "Groceries for kitchen", "Diesel for generator")
  "confidence": "high" | "medium" | "low",  // Your confidence in the extraction overall
  "raw_text": string | null          // The full transcribed text of the receipt (for audit)
}

Category rules:
- food_beverage:   groceries, restaurant supplies, bar stock, coffee, produce
- cleaning_laundry: cleaning chemicals, detergents, mops, linen, laundry service
- maintenance:     plumbing, electrical, hardware, pool chemicals, gardening supplies
- utilities:       electricity, water, gas, internet, phone
- office:          stationery, printer ink, computers, small office equipment
- marketing:       ads, print material, signage
- travel:          taxi, fuel, tolls, hotel/lodging for business trips
- insurance:       insurance premiums (fire, liability, workers comp)
- rent:            property rent, lease payments
- payroll:         wages, salaries, bonuses (rare — usually handled separately)
- bank_fees:       bank charges, POS fees, wire transfer fees
- other:           anything that doesn't clearly fit above

Rules:
- Return valid JSON only. No prose, no code fences, no markdown.
- If you can't read a field, use null (or "other" for category).
- amount is the FINAL amount charged (tax + tip included). Ignore subtotal.
- date must be YYYY-MM-DD. Infer year from context if not printed (assume current year).
- Never invent data. If the image isn't a receipt, return {"vendor":null,"date":null,"amount":null,"currency":null,"category":"other","description":null,"confidence":"low","raw_text":null}.`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({
      error: 'AI receipt parsing is not configured. Add ANTHROPIC_API_KEY as a Supabase secret to enable it.',
      code: 'no_api_key',
    }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  let payload: { image?: string; currency_hint?: string }
  try { payload = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }) }

  const image = payload.image
  if (!image || typeof image !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing image (base64 data URL)' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // Accept both "data:image/jpeg;base64,..." and bare base64.
  let mediaType = 'image/jpeg'
  let base64 = image
  const m = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
  if (m) { mediaType = m[1]; base64 = m[2] }

  // Sanity-cap size — Anthropic accepts up to 5MB per image but we don't
  // want a runaway payload. Client-side we already downscale to ~1200px
  // longest edge before sending.
  if (base64.length > 8_000_000) {
    return new Response(JSON.stringify({ error: 'Image too large (>6MB)' }), { status: 413, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const userPrompt = payload.currency_hint
    ? `Parse this receipt. The hotel operates in ${payload.currency_hint}.`
    : 'Parse this receipt.'

  const anthropicReq = {
    model: MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  }

  let aResp: Response
  try {
    aResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicReq),
    })
  } catch (err) {
    console.error('[ship-receipt-parse] fetch to Anthropic failed', err)
    return new Response(JSON.stringify({ error: 'Upstream request failed', detail: String(err) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  if (!aResp.ok) {
    const body = await aResp.text().catch(() => '')
    console.error('[ship-receipt-parse] Anthropic returned', aResp.status, body)
    return new Response(JSON.stringify({ error: `Anthropic ${aResp.status}`, detail: body.slice(0, 500) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const aJson = await aResp.json()
  const text = aJson?.content?.[0]?.text || ''

  // Extract the JSON block — the model is instructed to return raw JSON but
  // occasionally wraps it in a code fence. Strip fences defensively.
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(cleaned) }
  catch (err) {
    console.error('[ship-receipt-parse] Could not parse Claude output', text)
    return new Response(JSON.stringify({ error: 'Model output was not valid JSON', raw: text.slice(0, 500) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // Validate & sanitize
  const category = typeof parsed.category === 'string' && CATEGORIES.includes(parsed.category as typeof CATEGORIES[number])
    ? parsed.category
    : 'other'

  const safe = {
    vendor:      typeof parsed.vendor === 'string' ? parsed.vendor.slice(0, 120) : null,
    date:        typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
    amount:      typeof parsed.amount === 'number' && isFinite(parsed.amount) ? parsed.amount : null,
    currency:    typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency) ? parsed.currency : (payload.currency_hint || null),
    category,
    description: typeof parsed.description === 'string' ? parsed.description.slice(0, 200) : null,
    confidence:  ['high','medium','low'].includes(String(parsed.confidence)) ? parsed.confidence : 'low',
    raw_text:    typeof parsed.raw_text === 'string' ? parsed.raw_text.slice(0, 4000) : null,
    model:       MODEL,
    usage:       aJson?.usage || null,
  }

  return new Response(JSON.stringify(safe), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
})
