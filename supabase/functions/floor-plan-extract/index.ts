// ============================================================================
// floor-plan-extract — Claude 3.5 Sonnet Vision detects every closed
// polygonal zone on a floor plan (V6-hybride — 2026-06-05)
// ============================================================================
// David's V6 design: Claude's job is the EASY task — find every enclosed
// polygonal area. NO classification (room vs corridor vs stairs). The
// hotelier curates afterwards by soft-deleting non-room zones.
//
// Why this works: classification ("is this a guest room or a corridor?")
// is the hard task Claude Vision keeps failing on. Shape detection ("find
// the enclosed polygonal areas") is a much simpler perceptual task it
// handles well even on dense CAD plans.
//
// Output shape:
//   { zones: [{ vertices: [[x,y], ...], area_pct }], notes, confidence }
//
// Vertices are % of image dimensions (0-100). Filtered server-side: any
// zone smaller than MIN_AREA_PCT is dropped as noise (typically furniture
// outlines, bathroom fixtures, or text decorations the AI misread as
// shapes).
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface Req {
  property_id: string
  image_url: string
}

interface Vertex extends Array<number> { 0: number; 1: number }
interface Zone {
  vertices: Vertex[]
  area_pct?: number
}

interface ExtractionResult {
  zones: Zone[]
  notes?: string
  confidence?: 'high' | 'medium' | 'low'
}

const MODEL = 'claude-sonnet-4-5'
const MIN_AREA_PCT = 0.4   // zones smaller than 0.4% of total image are dropped
const MAX_ZONES    = 120   // hard cap to avoid runaway responses

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.property_id) return jsonResponse({ error: 'property_id required' }, 400)
  if (!body.image_url)   return jsonResponse({ error: 'image_url required' }, 400)

  const sb = getServiceClient()
  const { data: membership } = await sb
    .from('property_members')
    .select('property_id')
    .eq('property_id', body.property_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return jsonResponse({ error: 'Not a member of this property' }, 403)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'AI detection not configured',
      detail: 'ANTHROPIC_API_KEY env var is missing.',
    }, 503)
  }

  const systemPrompt = `You analyse hotel floor plans for STAYLO, a hotelier-owned booking platform.

The user gives you ONE image: a floor plan (architect CAD, hand sketch, photo). Your job is the EASY task: detect every CLOSED POLYGONAL AREA visible on the plan. This includes:
  · Guest rooms / bungalows / suites
  · Bathrooms (in-room AND shared)
  · Corridors / hallways
  · Stairwells / emergency stairs
  · Reception / lobby / restaurant / bar / common areas
  · Kitchen / laundry / storage / service rooms
  · Anything else that's clearly an enclosed space

DO NOT try to classify them. DO NOT try to label them. DO NOT skip the
corridors or stairs — we want EVERYTHING the plan delineates. The
hotelier will sort which is which on their end.

For each polygonal area, return its boundary as a list of vertex
coordinates in % of total image dimensions (0=left/top edge, 100=
right/bottom edge). 3-12 vertices per polygon — the smallest number
of corners that still describes the shape faithfully. Use [x, y]
pairs, top-down convention.

If a room is a simple rectangle, return 4 vertices in clockwise
order from top-left. If it's irregular (L-shape, has a bay window,
etc.), return as many vertices as needed.

Output strict JSON, no markdown fences:
{
  "zones": [
    {"vertices": [[10, 10], [25, 10], [25, 25], [10, 25]]},
    {"vertices": [[30, 10], [50, 10], [50, 25], [40, 30], [30, 25]]}
  ],
  "notes": "1-line description of the plan style + how many zones you detected",
  "confidence": "high" | "medium" | "low"
}

Aim for completeness. It's much better to include EXTRA zones (the
hotelier will delete them with one click) than to miss any. Skip only
the unambiguous non-spaces: text labels, furniture sketches, fixture
icons, decorative elements outside the building outline.`

  const userPrompt = `Detect every enclosed polygonal area on this floor plan. Return all of them — guest rooms, corridors, stairs, common areas, everything. Don't filter.`

  const anthropicReq = {
    model: MODEL,
    max_tokens: 6144,                    // polygons + extra vertices can be verbose
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

  // Sanitise:
  //   · vertices must be an array of [number, number] pairs
  //   · polygon must have ≥ 3 vertices
  //   · all coordinates clamped to 0-100
  //   · area must be ≥ MIN_AREA_PCT (drops noise)
  const cleanedZones: Zone[] = []
  for (const z of result.zones || []) {
    if (!z || !Array.isArray(z.vertices) || z.vertices.length < 3) continue
    const verts: Vertex[] = []
    for (const v of z.vertices) {
      if (!Array.isArray(v) || v.length < 2) continue
      const x = clamp01(Number(v[0]))
      const y = clamp01(Number(v[1]))
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      verts.push([x, y] as Vertex)
    }
    if (verts.length < 3) continue
    const area = polygonArea(verts)
    if (area < MIN_AREA_PCT) continue
    cleanedZones.push({ vertices: verts, area_pct: Number(area.toFixed(2)) })
    if (cleanedZones.length >= MAX_ZONES) break
  }

  console.log(`[floor-plan-extract] ${body.property_id}: detected ${cleanedZones.length}/${(result.zones || []).length} zones (after filter) in ${elapsed}ms`)

  return jsonResponse({
    zones: cleanedZones,
    notes: result.notes,
    confidence: result.confidence ?? 'medium',
    elapsed_ms: elapsed,
  })
})

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, n))
}

/** Shoelace formula. Returns absolute area as % of total image area. */
function polygonArea(verts: Vertex[]): number {
  let sum = 0
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    sum += (verts[j][0] + verts[i][0]) * (verts[j][1] - verts[i][1])
  }
  return Math.abs(sum / 2)
}
