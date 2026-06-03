// ============================================================================
// floorPlanSvg.js — turn an extracted room layout into a clean STAYLO-branded
// SVG floor plan
// ============================================================================
// Takes the JSON output of the `floor-plan-extract` edge function (rooms
// with x/y/w/h in %) and renders an aesthetically consistent SVG using
// STAYLO's brand palette. Output is a Blob ready to upload to Supabase
// Storage as the property's official floor_plan_url.
//
// Why generate an SVG instead of keeping the raw photo?
//   1. Consistency — every hotel on the platform gets the same clean look,
//      regardless of whether the hotelier uploaded a hand sketch or an
//      architect blueprint.
//   2. Privacy — the raw photo may show staff, neighbours, brand markings,
//      or other information the hotelier shouldn't have to share with
//      guests viewing the plan in the app.
//   3. Modifiability — text-based SVG can be tweaked, translated, or
//      re-themed without round-tripping through an image editor.
//
// Style guide (STAYLO brand):
//   · Canvas: 800x600, light pearl background (#FAFBFC)
//   · Property outline: subtle ocean tint border
//   · Room rectangles: ocean fill at 8% opacity, ocean border at 40%
//   · Room labels: deep navy, bold, centred. Auto-fit to box.
//   · Stay-loyal accents: libre highlight on the largest / "featured" room
// ============================================================================

const PALETTE = {
  bg:          '#FAFBFC',
  outline:     '#1F5675',   // ocean 80%
  roomFill:    'rgba(31, 86, 117, 0.08)',
  roomBorder:  'rgba(31, 86, 117, 0.40)',
  roomLabel:   '#0F2A3D',   // deep
  accentFill:  'rgba(0, 195, 166, 0.18)',   // libre teal at low op
  accentBorder:'rgba(0, 195, 166, 0.70)',
}

const CANVAS_W = 800
const CANVAS_H = 600
const MARGIN   = 24

/**
 * Generate the SVG string for a property's floor plan.
 *
 * @param {object} opts
 * @param {Array<{name:string, x_percent:number, y_percent:number, width_percent?:number, height_percent?:number, accent?:boolean}>} opts.rooms
 *   Rooms with positions in %. Optional `accent: true` highlights one room
 *   (e.g. the suite / the most expensive).
 * @param {string} [opts.title]
 *   Property name, rendered at the top.
 * @returns {string} SVG markup.
 */
export function generateFloorPlanSVG({ rooms, title }) {
  // Convert % → SVG units. Apply margin so labels at the edges don't get
  // clipped.
  const innerW = CANVAS_W - 2 * MARGIN
  const innerH = CANVAS_H - 2 * MARGIN
  const pct = (p, axis) => MARGIN + (Number(p) / 100) * (axis === 'x' ? innerW : innerH)

  // Default room box size — used when the extractor didn't return w/h.
  // 18% × 14% looks reasonable for typical hotels (5–15 rooms).
  const DEFAULT_W_PCT = 16
  const DEFAULT_H_PCT = 12

  // Compute each room's rectangle in SVG units. Centered on (x, y).
  const rects = rooms.map((r, i) => {
    const wPct = r.width_percent  ?? DEFAULT_W_PCT
    const hPct = r.height_percent ?? DEFAULT_H_PCT
    const cx   = pct(r.x_percent, 'x')
    const cy   = pct(r.y_percent, 'y')
    const w    = (wPct / 100) * innerW
    const h    = (hPct / 100) * innerH
    return {
      i,
      name: r.name,
      accent: !!r.accent,
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      cx,
      cy,
    }
  })

  const titleBlock = title
    ? `  <text x="${CANVAS_W / 2}" y="${MARGIN - 4}" text-anchor="middle"
          font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          font-size="14" font-weight="700" fill="${PALETTE.outline}"
          letter-spacing="0.08em" text-transform="uppercase">${escapeXml(title)}</text>`
    : ''

  // Property outline — soft rounded rect just inside the margin
  const outline = `  <rect x="${MARGIN}" y="${MARGIN}" width="${innerW}" height="${innerH}"
        fill="none" stroke="${PALETTE.outline}" stroke-opacity="0.25" stroke-width="1.5"
        stroke-dasharray="4 6" rx="14" ry="14" />`

  const roomBlocks = rects.map(r => {
    const fill   = r.accent ? PALETTE.accentFill   : PALETTE.roomFill
    const border = r.accent ? PALETTE.accentBorder : PALETTE.roomBorder
    const labelSize = Math.max(10, Math.min(18, r.w / Math.max(1, r.name.length) * 1.4))
    return `  <g>
    <rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}"
          width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}"
          fill="${fill}" stroke="${border}" stroke-width="1.5" rx="8" ry="8" />
    <text x="${r.cx.toFixed(1)}" y="${(r.cy + 4).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          font-size="${labelSize.toFixed(0)}" font-weight="700"
          fill="${PALETTE.roomLabel}">${escapeXml(r.name)}</text>
  </g>`
  }).join('\n')

  // Legend / footer — small line at the bottom that orientates the viewer.
  // Doubles as a brand mark so guests viewing the plan in the app know
  // where it came from.
  const footer = `  <text x="${CANVAS_W - MARGIN}" y="${CANVAS_H - 6}" text-anchor="end"
        font-family="ui-sans-serif, system-ui, sans-serif"
        font-size="9" fill="${PALETTE.outline}" fill-opacity="0.4"
        letter-spacing="0.12em">STAYLO · ${rooms.length} ROOM${rooms.length === 1 ? '' : 'S'}</text>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"
     width="${CANVAS_W}" height="${CANVAS_H}"
     style="background:${PALETTE.bg}">
  <rect width="100%" height="100%" fill="${PALETTE.bg}" />
${titleBlock}
${outline}
${roomBlocks}
${footer}
</svg>`
}

/**
 * Convert the SVG string into a Blob suitable for storage upload.
 */
export function svgToBlob(svgString) {
  return new Blob([svgString], { type: 'image/svg+xml' })
}

/**
 * Simple XML-safe escaping for room names.
 */
function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
