// ============================================================================
// floor-plan-extract — Claude 3.5 Sonnet Vision turns a hotelier's raw plan
// into a structured room layout
// ============================================================================
// The hotelier uploads any photo / scan / screenshot of their floor plan
// (hand-drawn, architect blueprint, PDF screenshot — whatever they have
// lying around). The frontend stores it in storage, then calls this
// function with the public URL.
//
// Claude reads the plan and returns a JSON list of rooms with:
//   · name           — the label written on the plan (BABA, "Room 102", etc.)
//   · x_percent      — horizontal centroid as % of image width (0–100)
//   · y_percent      — vertical centroid as % of image height (0–100)
//   · width_percent  — bounding-box width (optional, for nicer SVG render)
//   · height_percent — bounding-box height
//
// We hint Claude with the property's existing room names so it can match
// even when handwriting is messy. Fuzzy-matching to the actual `rooms`
// table is done client-side after this returns.
//
// Auth: any active property_member of the target property.
//
// Env vars required:
//   ANTHROPIC_API_KEY — same key the enrich-prospect function uses.
//
// Cost: ~$0.003–$0.015 per call depending on image resolution. Onboarding
// 500 hotels once each = under $10 lifetime.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface Req {
  property_id: string
  image_url: string                 // public URL of the uploaded raw plan
  room_names?: string[]             // existing room names — sharpens Claude's reading
}

interface ExtractedRoom {
  name: string
  x_percent: number
  y_percent: number
  width_percent?: number
  height_percent?: number
}

interface ExtractionResult {
  rooms: ExtractedRoom[]
  notes?: string                     // 1-line summary from Claude (debug)
  unmatched_labels?: string[]        // labels Claude saw but couldn't classify as rooms
  confidence?: 'high' | 'medium' | 'low'
}

const MODEL = 'claude-sonnet-4-5'    // Vision-capable, structured-output-friendly

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // 1. Auth — must be authenticated
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  // 2. Parse body
  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.property_id) return jsonResponse({ error: 'property_id required' }, 400)
  if (!body.image_url)   return jsonResponse({ error: 'image_url required'   }, 400)

  // 3. Verify the caller is a member of this property (RLS would catch
  //    it later but we want a clean 403 here, not a silent no-op).
  const sb = getServiceClient()
  const { data: membership } = await sb
    .from('property_members')
    .select('property_id')
    .eq('property_id', body.property_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return jsonResponse({ error: 'Not a member of this property' }, 403)

  // 4. Anthropic config
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'AI extraction not configured',
      detail: 'ANTHROPIC_API_KEY env var is missing. Set it via: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...',
    }, 503)
  }

  // 5. Build the prompt — hint Claude with the property's room names so
  //    handwriting recognition is anchored. If we don't have names yet
  //    (rare — property without rooms), Claude works in discovery mode.
  const roomList = (body.room_names ?? []).filter(s => s && s.trim().length > 0)
  const hint = roomList.length > 0
    ? `Known room names in this property (use these as a vocabulary anchor for OCR — fuzzy-match if the label on the plan is slightly different, e.g. "BAB4" → "BABA"):
${roomList.map(n => `  · ${n}`).join('\n')}
`
    : 'No prior room names — discover whatever rooms are labelled on the plan.'

  const systemPrompt = `You analyse hotel floor plans for STAYLO, a hotelier-owned booking platform.

The user gives you ONE image: a floor plan (could be a hand sketch, a CAD export, a photo of an architect blueprint, a Google Maps satellite screenshot with annotations, anything). Your job is to extract every labelled GUEST ROOM with its position.

What counts as a room:
  · Anything that looks like a sleeping unit: bungalows, hotel rooms, suites, dorm beds
  · Has a label / number / name on it (BABA, "Room 102", "Bungalow A", "Suite Mer")

What does NOT count (skip these):
  · Reception / lobby / front desk
  · Restaurant, bar, kitchen, dining areas
  · Pool, garden, parking, paths
  · Bathrooms / toilets if they are shared common areas
  · Laundry, storage, staff quarters
  · Anything without a label

For each room you identify, return:
  · name           — the label exactly as written on the plan (preserve case)
  · x_percent      — horizontal CENTER of the room, as a percentage of total image width (0 = left edge, 100 = right edge). Float, two decimals.
  · y_percent      — vertical CENTER of the room, as a percentage of total image height (0 = top edge, 100 = bottom edge). Float, two decimals.
  · width_percent  — bounding-box width as % of total image width (rough estimate is fine)
  · height_percent — bounding-box height as % of total image height

${hint}

Output strict JSON with these EXACT keys (no markdown fences, no commentary):
{
  "rooms": [
    {"name": "BABA", "x_percent": 25.5, "y_percent": 30.2, "width_percent": 12, "height_percent": 8}
  ],
  "unmatched_labels": ["labels you saw but classified as non-room, e.g. 'Reception', 'Pool'"],
  "notes": "1-line description of what kind of plan this is",
  "confidence": "high" | "medium" | "low"
}

If you cannot make out any rooms, return rooms: [] with notes explaining why. Never invent rooms that aren't visible on the plan.`

  const userPrompt = `Extract the rooms from this floor plan. Property has ${roomList.length} known room${roomList.length === 1 ? '' : 's'}.`

  // 6. Call Anthropic with the image as a URL block. Claude fetches the
  //    image from the public URL itself — no need to base64-encode here.
  const anthropicReq = {
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: body.image_url } },
          { type: 'text', text: userPrompt },
        ],
      },
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
  const textBlocks = (aData.content || []).filter((c: { type: string }) => c.type === 'text')
  const finalText: string = textBlocks[textBlocks.length - 1]?.text || ''

  let result: ExtractionResult
  try {
    const cleaned = finalText.replace(/```json\s*|\s*```/g, '').trim()
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

  // 7. Defensive sanitisation — clamp coordinates to 0–100, drop rooms
  //    without a name, ensure numeric types. Claude is usually well-behaved
  //    here but we'd rather catch a stray NaN now than corrupt the DB.
  const clamped: ExtractedRoom[] = (result.rooms || [])
    .filter(r => r && typeof r.name === 'string' && r.name.trim().length > 0)
    .map(r => ({
      name: r.name.trim(),
      x_percent: clamp01(Number(r.x_percent)),
      y_percent: clamp01(Number(r.y_percent)),
      width_percent:  r.width_percent  != null ? clamp01(Number(r.width_percent))  : undefined,
      height_percent: r.height_percent != null ? clamp01(Number(r.height_percent)) : undefined,
    }))

  console.log(`[floor-plan-extract] ${body.property_id}: extracted ${clamped.length} rooms in ${elapsed}ms`)

  return jsonResponse({
    rooms: clamped,
    notes: result.notes,
    unmatched_labels: result.unmatched_labels ?? [],
    confidence: result.confidence ?? 'medium',
    elapsed_ms: elapsed,
  })
})

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 50    // safe centre
  return Math.max(0, Math.min(100, n))
}
