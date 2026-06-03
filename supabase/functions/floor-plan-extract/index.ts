// ============================================================================
// floor-plan-extract — Claude 3.5 Sonnet Vision turns a raw CAD plan into
// a structured list of room outlines (V2 — outline-detection mode)
// ============================================================================
// Design clarified by David 2026-06-05: most hotelier plans don't have
// room labels written on them (that's normal). What we really want from
// the AI is to LOCATE every guest-room rectangle on the plan, regardless
// of whether it's labelled. The frontend then renders those rectangles
// as clean outlines on a STAYLO-styled SVG background, and the hotelier
// drag-drops their actual room names onto the outlines (snap magnetism).
//
// Optional secondary output: if any labels DO exist on the plan, return
// them so the UI can pre-assign matching rooms automatically.
//
// Auth: any active property_member of the target property.
// Cost: ~$0.003–$0.015 per analysis (one Claude Vision call).
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface Req {
  property_id: string
  image_url: string                 // public URL of the uploaded raw plan
  room_names?: string[]             // existing room names — sharpens label OCR if any
}

interface Outline {
  x_percent: number
  y_percent: number
  width_percent: number
  height_percent: number
  suggested_label?: string          // optional — only if a label is visible on the plan
}

interface ExtractionResult {
  outlines: Outline[]
  notes?: string                     // 1-line debug summary from Claude
  confidence?: 'high' | 'medium' | 'low'
}

const MODEL = 'claude-sonnet-4-5'    // Vision-capable, fast, cheap

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

  // 3. Verify property membership
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

  // 5. Prompt — focus on OUTLINE detection, not labels.
  const roomList = (body.room_names ?? []).filter(s => s && s.trim().length > 0)
  const labelHint = roomList.length > 0
    ? `If you happen to see a label like one of these on a room, return it as suggested_label so the UI can auto-assign:\n${roomList.map(n => `  · ${n}`).join('\n')}`
    : 'Most plans don\'t have labels — that\'s expected. Skip suggested_label if nothing readable.'

  const systemPrompt = `You analyse hotel floor plans for STAYLO, a hotelier-owned booking platform.

The user gives you ONE image: a floor plan (hand sketch, CAD export, photo of an architect blueprint, etc.). Your job is to LOCATE every guest-room rectangle on the plan. Most plans WON'T have labels written on the rooms — that's expected. You don't need labels to detect a room; you detect them from their shape, bed layout, and position.

What counts as a guest room:
  · A sleeping unit (hotel room, bungalow, suite, dorm cell)
  · Has a recognisable bed / sleeping area in it
  · Has its own walls (enclosed space)

What does NOT count (skip these):
  · Reception / lobby / front desk
  · Restaurant, bar, kitchen, dining areas
  · Pool, garden, parking, outdoor paths
  · Shared bathrooms (in-room private baths are fine — count those as part of the room)
  · Laundry, storage, staff quarters
  · Corridors / hallways

For each guest room you detect, return:
  · x_percent       — horizontal CENTER of the room, % of total image width (0=left, 100=right). Float, two decimals.
  · y_percent       — vertical CENTER of the room, % of total image height (0=top, 100=bottom). Float, two decimals.
  · width_percent   — bounding-box width as % of total image width.
  · height_percent  — bounding-box height as % of total image height.
  · suggested_label — ONLY if a clear label/number is written on the room. Omit otherwise. ${labelHint}

Order doesn't matter. Aim for completeness — better to include all rooms than to skip some.

Output strict JSON with these EXACT keys (no markdown fences, no commentary):
{
  "outlines": [
    {"x_percent": 25.5, "y_percent": 30.2, "width_percent": 12, "height_percent": 8},
    {"x_percent": 25.5, "y_percent": 45.0, "width_percent": 12, "height_percent": 8, "suggested_label": "BABA"}
  ],
  "notes": "1-line description of the plan style + how many rooms you detected",
  "confidence": "high" | "medium" | "low"
}

If you genuinely can't make out any rooms, return outlines: [] with notes explaining why. Never invent rooms.`

  const userPrompt = `Detect every guest-room rectangle on this floor plan. Property has ${roomList.length} known room${roomList.length === 1 ? '' : 's'} in its database (most likely with quantity > 1 for some types).`

  const anthropicReq = {
    model: MODEL,
    max_tokens: 4096,                // bigger plans → more outlines → bigger output
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

  // 6. Sanitise — clamp coordinates, drop incomplete entries.
  const clamped: Outline[] = (result.outlines || [])
    .filter((o: Partial<Outline>) =>
      o &&
      typeof o.x_percent === 'number' &&
      typeof o.y_percent === 'number'
    )
    .map((o: Outline) => ({
      x_percent:      clamp01(Number(o.x_percent)),
      y_percent:      clamp01(Number(o.y_percent)),
      width_percent:  o.width_percent  != null ? clamp01(Number(o.width_percent))  : 8,
      height_percent: o.height_percent != null ? clamp01(Number(o.height_percent)) : 6,
      suggested_label: typeof o.suggested_label === 'string' && o.suggested_label.trim()
        ? o.suggested_label.trim()
        : undefined,
    }))

  console.log(`[floor-plan-extract] ${body.property_id}: detected ${clamped.length} outlines in ${elapsed}ms`)

  // 7. Return — NEVER treat 0 outlines as an error. If Claude saw a non-
  //    floor-plan image or genuinely empty plan, the UI shows an info
  //    banner with the notes, not a red error.
  return jsonResponse({
    outlines: clamped,
    notes: result.notes,
    confidence: result.confidence ?? 'medium',
    elapsed_ms: elapsed,
  })
})

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, n))
}
