// ============================================================================
// floorPlanSvg.js — render clean STAYLO-styled floor plans from AI extraction
// ============================================================================
// Two flavours:
//   1. generateOutlineFloorPlanSVG({outlines, title})   — V2 default
//      Empty rectangle per detected outline, numbered placeholders in light
//      grey. Used as the new background after AI run; hotelier drag-drops
//      room names on top (snap-to-outline magnetism in the UI).
//   2. generateFloorPlanSVG({rooms, title})             — V1 legacy
//      Named rectangles, kept for the rare case where Claude returns
//      labelled outlines so we can render them pre-assigned.
//
// Style guide (STAYLO brand):
//   · Canvas:        800×600, pearl background (#FAFBFC)
//   · Property outline: dashed ocean tint border
//   · Outline rects:    ocean fill 6%, ocean border 35%, rounded corners
//   · Placeholder #:    deep navy at 28% opacity, centred
//   · Brand footer:     small ocean text "STAYLO · N ROOMS DETECTED"
// ============================================================================

const PALETTE = {
  bg:           '#FAFBFC',
  outline:      '#1F5675',                          // ocean 80%
  roomFill:     'rgba(31, 86, 117, 0.06)',
  roomBorder:   'rgba(31, 86, 117, 0.35)',
  placeholder:  'rgba(15, 42, 61, 0.28)',           // deep at low op
  roomLabel:    '#0F2A3D',                          // deep
  accentFill:   'rgba(0, 195, 166, 0.18)',          // libre at low op
  accentBorder: 'rgba(0, 195, 166, 0.70)',
}

const CANVAS_W = 800
const CANVAS_H = 600
const MARGIN   = 24

/**
 * V2 — render N empty room outlines with light placeholder numbers.
 * The hotelier drops room names from the tray onto these outlines.
 *
 * @param {object} opts
 * @param {Array<{x_percent:number, y_percent:number, width_percent?:number, height_percent?:number, suggested_label?:string}>} opts.outlines
 * @param {string} [opts.title]   Property name, rendered at the top.
 * @returns {string} SVG markup.
 */
export function generateOutlineFloorPlanSVG({ outlines, title }) {
  const innerW = CANVAS_W - 2 * MARGIN
  const innerH = CANVAS_H - 2 * MARGIN
  const pct = (p, axis) => MARGIN + (Number(p) / 100) * (axis === 'x' ? innerW : innerH)

  // Sort outlines top-to-bottom, then left-to-right so the placeholder
  // numbering (1, 2, 3…) reads naturally.
  const sorted = [...outlines].sort((a, b) => {
    if (Math.abs(a.y_percent - b.y_percent) > 4) return a.y_percent - b.y_percent
    return a.x_percent - b.x_percent
  })

  const titleBlock = title
    ? `  <text x="${CANVAS_W / 2}" y="${MARGIN - 4}" text-anchor="middle"
          font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          font-size="14" font-weight="700" fill="${PALETTE.outline}"
          letter-spacing="0.08em" text-transform="uppercase">${escapeXml(title)}</text>`
    : ''

  // Property outline — soft rounded rect just inside the margin
  const outerOutline = `  <rect x="${MARGIN}" y="${MARGIN}" width="${innerW}" height="${innerH}"
        fill="none" stroke="${PALETTE.outline}" stroke-opacity="0.20" stroke-width="1.5"
        stroke-dasharray="4 6" rx="14" ry="14" />`

  const rectBlocks = sorted.map((o, idx) => {
    const wPct = o.width_percent  ?? 8
    const hPct = o.height_percent ?? 6
    const cx   = pct(o.x_percent, 'x')
    const cy   = pct(o.y_percent, 'y')
    const w    = (wPct / 100) * innerW
    const h    = (hPct / 100) * innerH
    const x    = cx - w / 2
    const y    = cy - h / 2

    // If Claude already gave us a label for this outline, show it dimmed —
    // the UI will turn it into a confirmed marker once the hotelier
    // approves the auto-assignment.
    const placeholderText = o.suggested_label
      ? escapeXml(o.suggested_label)
      : String(idx + 1)
    const placeholderSize = o.suggested_label
      ? Math.max(10, Math.min(16, w / Math.max(2, o.suggested_label.length) * 1.2))
      : Math.max(12, Math.min(22, Math.min(w, h) * 0.4))

    return `  <g data-outline-index="${idx}">
    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}"
          width="${w.toFixed(1)}" height="${h.toFixed(1)}"
          fill="${PALETTE.roomFill}" stroke="${PALETTE.roomBorder}"
          stroke-width="1.5" rx="6" ry="6" />
    <text x="${cx.toFixed(1)}" y="${(cy + placeholderSize / 3).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
          font-size="${placeholderSize.toFixed(0)}" font-weight="600"
          fill="${PALETTE.placeholder}">${placeholderText}</text>
  </g>`
  }).join('\n')

  const footer = `  <text x="${CANVAS_W - MARGIN}" y="${CANVAS_H - 6}" text-anchor="end"
        font-family="ui-sans-serif, system-ui, sans-serif"
        font-size="9" fill="${PALETTE.outline}" fill-opacity="0.4"
        letter-spacing="0.12em">STAYLO · ${outlines.length} ROOM${outlines.length === 1 ? '' : 'S'} DETECTED</text>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"
     width="${CANVAS_W}" height="${CANVAS_H}"
     style="background:${PALETTE.bg}">
  <rect width="100%" height="100%" fill="${PALETTE.bg}" />
${titleBlock}
${outerOutline}
${rectBlocks}
${footer}
</svg>`
}

/**
 * V1 legacy renderer — keeps support for the (rare) case where the AI
 * returned named rooms. Not used as the default in V2.
 */
export function generateFloorPlanSVG({ rooms, title }) {
  const innerW = CANVAS_W - 2 * MARGIN
  const innerH = CANVAS_H - 2 * MARGIN
  const pct = (p, axis) => MARGIN + (Number(p) / 100) * (axis === 'x' ? innerW : innerH)
  const DEFAULT_W_PCT = 16
  const DEFAULT_H_PCT = 12

  const rects = rooms.map((r, i) => {
    const wPct = r.width_percent  ?? DEFAULT_W_PCT
    const hPct = r.height_percent ?? DEFAULT_H_PCT
    const cx   = pct(r.x_percent, 'x')
    const cy   = pct(r.y_percent, 'y')
    const w    = (wPct / 100) * innerW
    const h    = (hPct / 100) * innerH
    return { i, name: r.name, accent: !!r.accent, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy }
  })

  const titleBlock = title
    ? `  <text x="${CANVAS_W / 2}" y="${MARGIN - 4}" text-anchor="middle"
          font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="14" font-weight="700" fill="${PALETTE.outline}"
          letter-spacing="0.08em" text-transform="uppercase">${escapeXml(title)}</text>`
    : ''

  const outerOutline = `  <rect x="${MARGIN}" y="${MARGIN}" width="${innerW}" height="${innerH}"
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
          font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="${labelSize.toFixed(0)}" font-weight="700"
          fill="${PALETTE.roomLabel}">${escapeXml(r.name)}</text>
  </g>`
  }).join('\n')

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
${outerOutline}
${roomBlocks}
${footer}
</svg>`
}

/** Convert SVG string → Blob (image/svg+xml) for storage upload. */
export function svgToBlob(svgString) {
  return new Blob([svgString], { type: 'image/svg+xml' })
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
