// ============================================================================
// enrich-prospect — AI-powered contact info research via Anthropic Claude
// ============================================================================
// Asks Claude (with the web_search tool) to find missing contact info for a
// hotel prospect: email, phone, website, manager name, manager position.
// Updates the prospect row directly so the operator doesn't have to copy-paste.
//
// Auth: admin only.
//
// Env vars required:
//   ANTHROPIC_API_KEY  — get one at https://console.anthropic.com/settings/keys
//                        Cost: ~$0.005-$0.02 per prospect with claude-haiku +
//                        web_search. ~$15-300 for the full 16k Thai dataset.
//
// How it works:
//   1. Loads the prospect (name, district, province, current contact data)
//   2. Calls Anthropic Messages API with web_search tool enabled
//   3. Claude searches Google / hotel sites / Booking listings, finds the info
//   4. Returns structured JSON we parse and write back to the DB
//   5. Sets enrichment_source='ai' and manually_enriched_at=now()
//
// We NEVER overwrite a manually-entered value — only fill blanks. The operator
// can still edit any field afterward.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface Req {
  prospect_id: string
  force?: boolean   // if true, overwrite even existing values
}

interface EnrichmentResult {
  email?: string | null
  phone?: string | null
  website?: string | null
  contact_name?: string | null
  contact_position?: string | null
  // Thai-government hotel license (Hotel Act B.E. 2547) — see migration
  // 20260502030000 for tri-state semantics. Claude returns true/false/null.
  licensed?: boolean | null
  license_number?: string | null
  notes?: string | null
  confidence?: 'high' | 'medium' | 'low'
  sources?: string[]
}

const MODEL = 'claude-haiku-4-5'   // cheap & fast — research is a low-stakes summarisation task

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // 1. Auth — must be admin
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const sb = getServiceClient()
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return jsonResponse({ error: 'Admin only' }, 403)

  // 2. Anthropic config
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'AI enrichment not configured',
      detail: 'ANTHROPIC_API_KEY env var is missing. Set it via: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...',
    }, 503)
  }

  // 3. Parse body
  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.prospect_id) return jsonResponse({ error: 'prospect_id required' }, 400)

  // 4. Load the prospect
  const { data: prospect, error: pErr } = await sb
    .from('prospects')
    .select('id, name_en, name_th, district, province, latitude, longitude, email, phone, website, contact_name, contact_position, licensed, license_number')
    .eq('id', body.prospect_id)
    .single()

  if (pErr || !prospect) return jsonResponse({ error: 'Prospect not found' }, 404)
  const hotelName = prospect.name_en || prospect.name_th
  if (!hotelName) return jsonResponse({ error: 'Prospect has no name to research' }, 400)

  // 5. Build the prompt
  const location = [prospect.district, prospect.province].filter(Boolean).join(', ') || 'Thailand'
  const known = []
  if (prospect.email)            known.push(`email: ${prospect.email}`)
  if (prospect.phone)            known.push(`phone: ${prospect.phone}`)
  if (prospect.website)          known.push(`website: ${prospect.website}`)
  if (prospect.contact_name)     known.push(`contact: ${prospect.contact_name}`)
  if (prospect.contact_position) known.push(`position: ${prospect.contact_position}`)

  const systemPrompt = `You are a hotel-research assistant for STAYLO, a hotelier-owned booking platform launching in Thailand. The user gives you a Thai hotel name and location. Use web_search and web_fetch to find:

  - email (general contact, reservations, or manager)
  - phone (any working number — landline or WhatsApp)
  - website (official hotel site, NOT booking aggregators)
  - contact_name (name of owner / general manager / front desk lead, if discoverable)
  - contact_position (their title — Owner, GM, Manager, etc.)
  - licensed (Thai government Hotel Act B.E. 2547 license — see below)
  - license_number (the license # itself if you find it)

Where to look:
  - Hotel's own website (especially "About" / "Contact" / footer / legal pages)
  - Google Maps listing
  - Facebook page
  - TripAdvisor profile
  - For LICENSE specifically: Booking.com or Agoda listings (they REQUIRE a Thai hotel license # before publishing — if the hotel is on those platforms, it's almost certainly licensed). Also tourismthailand.org TAT directory.

Skip aggregators (Booking, Agoda, Expedia, Hotels.com) for the WEBSITE field — those aren't the hotel's own site. They're fine for license verification only.

License rules:
  - licensed=true if you find any of: a license number, a TAT directory listing, an active Booking.com or Agoda page, or a "licensed by Tourism Authority of Thailand" mention on the hotel's own site
  - licensed=false ONLY if you actively searched the TAT directory + Booking.com and the hotel doesn't appear (uncommon — be cautious)
  - licensed=null if you genuinely couldn't determine either way

Return a JSON object with these EXACT keys (use null for anything you can't find with reasonable confidence):
{
  "email": "string or null",
  "phone": "string or null",
  "website": "string or null",
  "contact_name": "string or null",
  "contact_position": "string or null",
  "licensed": true | false | null,
  "license_number": "string or null",
  "notes": "1-line summary of what you found and where",
  "confidence": "high" | "medium" | "low",
  "sources": ["url1", "url2"]
}

Output ONLY the JSON, nothing else. No markdown code fences.`

  const userPrompt = `Research this hotel:
Name: ${hotelName}
Location: ${location}
${prospect.latitude && prospect.longitude ? `GPS: ${prospect.latitude}, ${prospect.longitude}` : ''}
${known.length ? `Already known (verify, don't re-find): ${known.join(', ')}` : 'No contact info known yet.'}

Find the missing pieces and return the JSON.`

  // 6. Call Anthropic with web_search tool
  const anthropicReq = {
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  }

  const t0 = Date.now()
  const aResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(anthropicReq),
  })
  const elapsed = Date.now() - t0

  if (!aResp.ok) {
    const errText = await aResp.text().catch(() => '')
    console.error('Anthropic API error:', aResp.status, errText)
    return jsonResponse({
      error: 'Anthropic API call failed',
      detail: errText.slice(0, 500),
      status: aResp.status,
    }, 502)
  }

  const aData = await aResp.json()

  // 7. Extract the JSON block from Claude's response
  // The response shape is { content: [{type:'text', text:'...'}, ...] }
  // We want the LAST text block (web search results come before the final answer)
  const textBlocks = (aData.content || []).filter((c: any) => c.type === 'text')
  const finalText = textBlocks[textBlocks.length - 1]?.text || ''

  let result: EnrichmentResult
  try {
    // Strip markdown fences if Claude added them despite instructions
    const cleaned = finalText.replace(/```json\s*|\s*```/g, '').trim()
    // Find the JSON object — Claude sometimes adds a leading sentence
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd   = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in response')
    result = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
  } catch (err) {
    console.error('Failed to parse Claude response:', finalText.slice(0, 500))
    return jsonResponse({
      error: 'Could not parse AI response',
      detail: (err as Error).message,
      raw: finalText.slice(0, 500),
    }, 502)
  }

  // 8. Build the update payload — never overwrite existing values unless force
  const force = !!body.force
  const update: Record<string, unknown> = {}
  if (result.email            && (force || !prospect.email))            update.email            = sanitiseEmail(result.email)
  if (result.phone            && (force || !prospect.phone))            update.phone            = String(result.phone).trim()
  if (result.website          && (force || !prospect.website))          update.website          = sanitiseUrl(result.website)
  if (result.contact_name     && (force || !prospect.contact_name))     update.contact_name     = String(result.contact_name).trim()
  if (result.contact_position && (force || !prospect.contact_position)) update.contact_position = String(result.contact_position).trim()

  // Drop nulls and empty values
  for (const k of Object.keys(update)) {
    if (!update[k]) delete update[k]
  }

  // License fields — separate handling because `false` is a meaningful value
  // (we don't want it filtered out by the truthiness check above).
  if (typeof result.licensed === 'boolean' && (force || prospect.licensed === null || prospect.licensed === undefined)) {
    update.licensed           = result.licensed
    update.license_checked_at = new Date().toISOString()
  }
  if (result.license_number && (force || !prospect.license_number)) {
    update.license_number = String(result.license_number).trim()
  }

  const filledFields = Object.keys(update)
  if (filledFields.length === 0) {
    return jsonResponse({
      ok: true,
      filled: [],
      result,
      note: 'AI found nothing new (or all fields already set).',
      elapsed_ms: elapsed,
    })
  }

  // Always bump enrichment marker
  update.manually_enriched_at = new Date().toISOString()
  update.enrichment_source    = 'ai'

  // 9. Persist
  const { data: updated, error: updErr } = await sb
    .from('prospects').update(update).eq('id', prospect.id).select().single()
  if (updErr) {
    return jsonResponse({ error: 'DB update failed', detail: updErr.message, ai_result: result }, 500)
  }

  return jsonResponse({
    ok: true,
    filled: filledFields,
    confidence: result.confidence,
    notes: result.notes,
    sources: result.sources,
    prospect: updated,
    elapsed_ms: elapsed,
  })
})

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function sanitiseEmail(s: string): string | null {
  const trimmed = String(s).trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null
}

function sanitiseUrl(s: string): string | null {
  const trimmed = String(s).trim()
  if (!trimmed) return null
  // If user/AI returns "example.com", prepend https://
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}
