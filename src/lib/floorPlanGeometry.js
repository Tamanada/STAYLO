// ============================================================================
// floorPlanGeometry.js — small geometry helpers for the floor plan editor
// ============================================================================
// All coordinates are expected in % (0-100), the same convention used for
// floor_plan_zones and floor_plan_positions on the DB. The helpers are
// renderer-agnostic — they don't care whether the host element is an
// <svg viewBox="0 0 100 100"> or a div with absolute %-positioning.
// ============================================================================

/**
 * Compute the centroid of a polygon. Used to position the room label
 * inside the zone. Uses the area-weighted formula (more accurate than
 * the naïve average-of-vertices for irregular polygons).
 *
 * @param {Array<[number, number]>} vertices
 * @returns {[number, number]} {x, y} as [x, y] tuple
 */
export function centroid(vertices) {
  if (!Array.isArray(vertices) || vertices.length === 0) return [50, 50]
  if (vertices.length === 1) return [vertices[0][0], vertices[0][1]]
  if (vertices.length === 2) {
    return [
      (vertices[0][0] + vertices[1][0]) / 2,
      (vertices[0][1] + vertices[1][1]) / 2,
    ]
  }

  let cx = 0, cy = 0, a = 0
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    const [x0, y0] = vertices[i]
    const [x1, y1] = vertices[(i + 1) % n]
    const cross = x0 * y1 - x1 * y0
    a += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  a *= 0.5
  if (a === 0) {
    // Degenerate polygon (all colinear) — fall back to vertex average
    return naiveCentroid(vertices)
  }
  cx /= 6 * a
  cy /= 6 * a
  return [cx, cy]
}

function naiveCentroid(vertices) {
  let sx = 0, sy = 0
  for (const [x, y] of vertices) { sx += x; sy += y }
  return [sx / vertices.length, sy / vertices.length]
}

/**
 * Shoelace formula — signed area (positive for CCW, negative for CW).
 * Used to filter noise polygons and to sort by size.
 *
 * @param {Array<[number, number]>} vertices
 * @returns {number} absolute area in (% × %)
 */
export function polygonArea(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0
  let sum = 0
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    sum += (vertices[j][0] + vertices[i][0]) * (vertices[j][1] - vertices[i][1])
  }
  return Math.abs(sum / 2)
}

/**
 * Ray-casting point-in-polygon test. Used for hit-testing when the
 * hotelier clicks somewhere on the canvas — figures out which zone
 * (if any) the click landed in.
 *
 * @param {[number, number]} point
 * @param {Array<[number, number]>} vertices
 * @returns {boolean}
 */
export function pointInPolygon(point, vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return false
  const [px, py] = point
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1]
    const xj = vertices[j][0], yj = vertices[j][1]
    const intersect = ((yi > py) !== (yj > py))
      && (px < (xj - xi) * (py - yi) / (yj - yi || 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Convert vertices into an SVG path string ("M x,y L x,y ... Z").
 * Use when rendering with <path>; for <polygon> use verticesToPoints below.
 *
 * @param {Array<[number, number]>} vertices
 * @returns {string}
 */
export function svgPathFromVertices(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return ''
  const [first, ...rest] = vertices
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`
}

/**
 * Convert vertices into the space-separated "points" attribute used
 * by <polygon>. More compact than svgPathFromVertices.
 *
 * @param {Array<[number, number]>} vertices
 * @returns {string}
 */
export function verticesToPoints(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return ''
  return vertices.map(([x, y]) => `${x},${y}`).join(' ')
}
