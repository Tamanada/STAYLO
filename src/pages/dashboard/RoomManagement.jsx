// ============================================
// Dashboard — Room Management (PMS-style full-screen takeover)
// ============================================
// Direct port of docs/ui-refs/staylo_room_manager.html — same dark
// topbar + dark sidebar + light main area + side panel. Wired to real
// STAYLO data (Supabase rooms + bookings) so what the hotelier sees
// reflects their actual property, not the mockup's sample numbers.
//
// Renders at /dashboard/property/:id/rooms OUTSIDE PropertyLayout so
// the property header + pill row don't double up with the mockup's
// own dark sidebar/topbar (which provide the same navigation).
//
// Topbar nav routes:
//   Dashboard     → /dashboard
//   Rooms         → current page (active)
//   Reservations  → /dashboard/property/:id/incoming-bookings
//   Housekeeping  → /dashboard/property/:id/housekeeping
//   Reports       → /dashboard/property/:id/reports
//
// Sidebar:
//   - HOTEL header → real property name (or "—" while loading)
//   - All Rooms / Available / Occupied / Dirty / Maintenance counts
//   - Room Types (derived from real rooms.bed_type)
//   - Quick Actions (placeholders — wire to real flows later)
//   - Today panel (Occupancy / Arrivals / Departures from bookings)
//
// Status overrides (manual cleaning / maintenance) live in component
// state; promotes to a `room_status` table when the back-office needs
// persistence.
// ============================================
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AMENITY_META } from '../../lib/amenityIcons'

// Tiny helper — turn "king" / "extra_bed" into "King", "Extra bed"
const prettyLabel = k => (k || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

// Format a sorted list of ISO dates as compact human ranges:
//   ['2026-06-03','2026-06-04','2026-06-05','2026-06-10']
//   → 'Jun 3-5, Jun 10'
// Used in the room info popover to surface upcoming rewards
// without listing 14 individual days for a "Free spa weekends".
function formatDateRanges(isoDates) {
  if (!isoDates || isoDates.length === 0) return ''
  const dates = isoDates.slice().sort().map(s => new Date(s + 'T00:00:00'))
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const groups = []
  let cur = { start: dates[0], end: dates[0] }
  for (let i = 1; i < dates.length; i++) {
    const prev = cur.end
    const next = dates[i]
    if ((next - prev) === 86400000) {
      cur.end = next
    } else {
      groups.push(cur)
      cur = { start: next, end: next }
    }
  }
  groups.push(cur)
  return groups.map(g => {
    const sameDay = g.start.getTime() === g.end.getTime()
    const sm = months[g.start.getMonth()]
    const em = months[g.end.getMonth()]
    const sd = g.start.getDate()
    const ed = g.end.getDate()
    if (sameDay) return `${sm} ${sd}`
    if (sm === em) return `${sm} ${sd}-${ed}`
    return `${sm} ${sd} – ${em} ${ed}`
  }).join(', ')
}

// ── STATUS TAXONOMY ───────────────────────────────────────────────
export const ROOM_STATUSES = {
  available:   { label: 'Available',    color: '#00B894', bg: '#E8F8F2', text: '#065F46', sigil: '🟢' },
  occupied:    { label: 'Occupied',     color: '#6C5CE7', bg: '#EEF2FF', text: '#3730A3', sigil: '🟣' },
  dirty:       { label: 'Dirty',        color: '#F4C542', bg: '#FFFBEB', text: '#92400E', sigil: '🟡' },
  maintenance: { label: 'Maintenance',  color: '#E74C3C', bg: '#FEF2F2', text: '#B91C1C', sigil: '🔴' },
  cleaning:    { label: 'Cleaning',     color: '#0984E3', bg: '#EFF6FF', text: '#1E40AF', sigil: '🔵' },
  checkout:    { label: 'Due Checkout', color: '#FF6B00', bg: '#FFF7ED', text: '#C2410C', sigil: '🟠' },
  // Blocked = hotelier closed the date for sale via Disponibilités →
  // Timeline. A room with is_blocked=true on today's date should NOT
  // count as Available even if no booking is on it.
  blocked:     { label: 'Blocked',      color: '#FF3CB4', bg: '#FDF2F8', text: '#A21CAF', sigil: '🔒' },
}
const STATUS_KEYS = Object.keys(ROOM_STATUSES)

const DAYS_LBL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS_LBL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDay = (d) => `${MONTHS_LBL[d.getMonth()]} ${d.getDate()}`
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// ── EXACT MOCKUP CSS ─────────────────────────────────────────────
// Lifted verbatim from docs/ui-refs/staylo_room_manager.html — kept
// inline so the styles are scoped to this component without
// polluting the global Tailwind layer. Class names mirror the
// mockup so future tweaks can be ported 1:1.
const STYLES = `
/* Renders INSIDE PropertyLayout — the STAYLO pill bar (Chambres /
   Housekeeping / Rapports / etc.) stays on top, this module sits
   below it. No fixed positioning, no own topbar (would duplicate
   the pill bar). Dark sidebar + light main area only.
   Sidebar collapses smoothly when the chef wants more grid width. */
.rm-shell{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 200px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F0EDE8;color:#1A1F2E;border-radius:12px;overflow:hidden;border:1px solid #E8E0D8;transition:grid-template-columns .25s ease}
.rm-shell.collapsed{grid-template-columns:0 1fr}
/* Date nav lives in the toolbar (top of main area) so it stays
   visible even when the sidebar collapses. */
.rm-date-nav{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#636E72;font-weight:600;padding:0 8px}
.rm-date-btn{width:24px;height:24px;border-radius:6px;background:#F8F6F0;border:1px solid #E8E0D8;color:#636E72;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}
.rm-date-btn:hover{background:#FFE9D6;color:#FF6B00;border-color:#FF6B00}
.rm-today-btn{padding:4px 10px;border-radius:6px;background:#FF6B00;border:none;color:white;font-size:11px;font-weight:700;cursor:pointer}
.rm-sidebar-toggle{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#F8F6F0;color:#636E72;border:1px solid #E8E0D8;border-radius:8px;cursor:pointer;flex-shrink:0;transition:all .12s}
.rm-sidebar-toggle:hover{background:#FFE9D6;color:#FF6B00;border-color:#FF6B00}

.rm-sidebar{background:#1A1F2E;padding:16px 0;overflow-y:auto;border-right:1px solid rgba(255,255,255,.06)}
.rm-sidebar-section{margin-bottom:8px}
.rm-sidebar-title{font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.08em;padding:8px 18px 4px}
.rm-sidebar-item{display:flex;align-items:center;gap:10px;padding:9px 18px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.55);transition:all .12s;position:relative;background:none;border:none;width:100%;font-family:inherit;text-align:left}
.rm-sidebar-item:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85)}
.rm-sidebar-item.active{background:rgba(255,107,0,.15);color:white}
.rm-sidebar-item.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#FF6B00;border-radius:0 2px 2px 0}
.rm-si-icon{font-size:15px;width:20px;text-align:center}
.rm-badge{margin-left:auto;background:#E74C3C;color:white;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:700}
.rm-badge.green{background:#00B894}
.rm-badge.orange{background:#FF6B00}
.rm-badge.purple{background:#6C5CE7}

.rm-main{overflow:hidden;display:flex;flex-direction:column}

.rm-toolbar{background:white;border-bottom:1px solid #E8E0D8;padding:10px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap}
.rm-view-tabs{display:flex;gap:4px;background:#F8F6F0;border-radius:8px;padding:3px}
.rm-vtab{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;color:#636E72;border:none;background:none;transition:all .12s}
.rm-vtab.active{background:white;color:#1A1F2E;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.rm-filter-btn{padding:6px 14px;border-radius:8px;border:1px solid #E8E0D8;background:white;font-size:12px;font-weight:600;color:#636E72;cursor:pointer;display:flex;align-items:center;gap:5px}
.rm-filter-btn:hover{border-color:#FF6B00;color:#FF6B00}
.rm-filter-btn.active{border-color:#FF6B00;color:#FF6B00;background:#FFF5E6}
.rm-search-box{flex:1;max-width:260px;padding:6px 12px;border-radius:8px;border:1px solid #E8E0D8;font-size:13px;font-family:inherit;outline:none}
.rm-search-box:focus{border-color:#FF6B00}
.rm-stats-row{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.rm-stat-chip{padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:5px}
.rm-stat-chip::before{content:'';width:7px;height:7px;border-radius:50%}
.rm-sc-available{background:#E8F8F2;color:#00875A}.rm-sc-available::before{background:#00B894}
.rm-sc-occupied{background:#EEF2FF;color:#4338CA}.rm-sc-occupied::before{background:#6C5CE7}
.rm-sc-dirty{background:#FFF8E1;color:#92400E}.rm-sc-dirty::before{background:#F4C542}
.rm-sc-maintenance{background:#FEF2F2;color:#B91C1C}.rm-sc-maintenance::before{background:#E74C3C}

.rm-legend{display:flex;gap:12px;align-items:center;padding:8px 20px;background:white;border-bottom:1px solid #E8E0D8;flex-shrink:0;flex-wrap:wrap}
.rm-legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#636E72}
.rm-legend-dot{width:8px;height:8px;border-radius:50%}

.rm-view{flex:1;overflow:auto;transition:padding-right .15s ease-out}
/* When the right-side popover is open, shrink the timeline content to
   leave the cells visible to the LEFT of the popover. CSS :has() is
   supported in all evergreen browsers and degrades gracefully (older
   browsers just see the popover float over the right cells, same as
   before). 520px = popover width 480 + side gap. */
.rm-view:has(.rm-info-pop){padding-right:520px}
@media (max-width:1100px){.rm-view:has(.rm-info-pop){padding-right:460px}}

/* Timeline */
.rm-tl-header{display:flex;background:white;border-bottom:1px solid #E8E0D8;position:sticky;top:0;z-index:2}
.rm-tl-room-col{width:200px;flex-shrink:0;padding:10px 14px;font-size:11px;font-weight:700;color:#636E72;text-transform:uppercase;letter-spacing:.05em;border-right:1px solid #E8E0D8}
.rm-tl-dates{flex:1;display:flex}
.rm-tl-day{flex:1;min-width:60px;text-align:center;padding:6px 4px;border-right:1px solid #F0EDE8;font-size:11px}
.rm-tl-day.today{background:#FFF5E6}
.rm-tl-day .rm-tl-dow{color:#636E72;font-weight:500;display:block}
.rm-tl-day .rm-tl-date{font-weight:700;color:#1A1F2E;font-size:13px}
.rm-tl-day.today .rm-tl-date{color:#FF6B00}
.rm-tl-row{display:flex;border-bottom:1px solid #F0EDE8;position:relative;height:44px;align-items:center;background:white}
.rm-tl-row:hover{background:#FAFAF8}
.rm-tl-room-info{width:200px;flex-shrink:0;padding:0 14px;border-right:1px solid #E8E0D8;display:flex;flex-direction:column;justify-content:center;height:100%;overflow:hidden}
.rm-tl-room-num{font-weight:700;font-size:13px;color:#2D3436;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.rm-tl-room-type{font-size:11px;color:#636E72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.rm-tl-room-num{font-size:14px;font-weight:700;color:#1A1F2E}
.rm-tl-room-type{font-size:10px;color:#B2BEC3}
.rm-tl-grid{flex:1;position:relative;height:100%;display:flex}
.rm-tl-cell{flex:1;min-width:60px;border-right:1px solid #F0EDE8;position:relative;height:100%}
.rm-tl-cell.today{background:rgba(255,107,0,.04)}
.rm-tl-cell.blocked{background:repeating-linear-gradient(45deg,rgba(255,60,180,.10),rgba(255,60,180,.10) 6px,rgba(255,60,180,.18) 6px,rgba(255,60,180,.18) 12px);cursor:not-allowed}
.rm-tl-cell.blocked::after{content:'BLOQUÉ';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#A21CAF;letter-spacing:.05em;text-shadow:0 1px 0 rgba(255,255,255,.7)}
.rm-res-bar{position:absolute;height:28px;top:8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;padding:0 10px;font-size:11px;font-weight:600;color:white;transition:opacity .12s;white-space:nowrap;overflow:hidden;z-index:1;border:none;font-family:inherit}
.rm-res-bar:hover{opacity:.85;z-index:5}
.rm-rb-confirmed{background:linear-gradient(135deg,#4C51BF,#6C5CE7)}
.rm-rb-checkin{background:linear-gradient(135deg,#0F766E,#00B894)}
.rm-rb-checkout{background:linear-gradient(135deg,#C2410C,#FF6B00)}
.rm-rb-blocked{background:repeating-linear-gradient(45deg,#9CA3AF,#9CA3AF 4px,#D1D5DB 4px,#D1D5DB 8px)}

/* Grid */
.rm-grid-view{padding:20px}
.rm-floor-section{margin-bottom:24px}
.rm-floor-title{font-size:12px;font-weight:700;color:#636E72;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.rm-floor-title::after{content:'';flex:1;height:1px;background:#E8E0D8}
.rm-rooms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.rm-room-card{background:white;border-radius:14px;padding:14px;cursor:pointer;border:2px solid #E8E0D8;transition:all .15s;position:relative;overflow:hidden;text-align:left;font-family:inherit}
.rm-room-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.08)}
.rm-room-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.rm-room-card.available{border-color:rgba(0,184,148,.3)}.rm-room-card.available::before{background:#00B894}
.rm-room-card.occupied{border-color:rgba(108,92,231,.3)}.rm-room-card.occupied::before{background:#6C5CE7}
.rm-room-card.dirty{border-color:rgba(244,197,66,.4)}.rm-room-card.dirty::before{background:#F4C542}
.rm-room-card.maintenance{border-color:rgba(231,76,60,.3)}.rm-room-card.maintenance::before{background:#E74C3C}
.rm-room-card.cleaning{border-color:rgba(9,132,227,.3)}.rm-room-card.cleaning::before{background:#0984E3}
.rm-room-card.checkout{border-color:rgba(255,107,0,.3)}.rm-room-card.checkout::before{background:#FF6B00}
.rm-rc-num{font-size:22px;font-weight:900;color:#1A1F2E;line-height:1}
.rm-rc-type{font-size:10px;color:#B2BEC3;margin-top:2px;margin-bottom:8px}
.rm-rc-status{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700}
.rm-rc-status.available{background:#E8F8F2;color:#00875A}
.rm-rc-status.occupied{background:#EEF2FF;color:#4338CA}
.rm-rc-status.dirty{background:#FFF8E1;color:#92400E}
.rm-rc-status.maintenance{background:#FEF2F2;color:#B91C1C}
.rm-rc-status.cleaning{background:#EEF6FF;color:#1D4ED8}
.rm-rc-status.checkout{background:#FFF5E6;color:#C2410C}
.rm-rc-guest{font-size:11px;color:#636E72;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rm-rc-nights{font-size:10px;color:#B2BEC3;margin-top:2px}
.rm-hk-icon{position:absolute;top:10px;right:10px;font-size:14px}

/* Floor plan */
.rm-fp-view{display:flex;flex-direction:column}
.rm-fp-floors{display:flex;gap:0;background:white;border-bottom:1px solid #E8E0D8;flex-shrink:0}
.rm-fp-floor-tab{padding:10px 20px;font-size:13px;font-weight:600;color:#636E72;cursor:pointer;border-bottom:2px solid transparent;transition:all .12s;background:none;border-left:none;border-right:none;border-top:none;font-family:inherit}
.rm-fp-floor-tab.active{color:#FF6B00;border-bottom-color:#FF6B00}
.rm-fp-canvas{flex:1;overflow:auto;padding:24px;background:#F0EDE8}
.rm-floor-plan{background:white;border-radius:16px;padding:28px;display:grid;gap:12px;box-shadow:0 2px 20px rgba(0,0,0,.06);max-width:700px;margin:0 auto}
.rm-fp-corridor{background:#F0EDE8;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#636E72;text-transform:uppercase;letter-spacing:.06em;grid-column:1/-1}
.rm-fp-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.rm-fp-room{width:90px;height:70px;border-radius:10px;border:2px solid #E8E0D8;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .15s;position:relative;background:white;font-family:inherit}
.rm-fp-room:hover{transform:scale(1.04);z-index:5}
.rm-fpr-num{font-size:16px;font-weight:900}
.rm-fpr-type{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;opacity:.7}
.rm-fpr-status{width:8px;height:8px;border-radius:50%;position:absolute;top:7px;right:7px}
.rm-fp-room.available{background:#E8F8F2;border-color:#A7F3D0}.rm-fp-room.available .rm-fpr-num{color:#065F46}.rm-fp-room.available .rm-fpr-status{background:#00B894}
.rm-fp-room.occupied{background:#EEF2FF;border-color:#C4B5FD}.rm-fp-room.occupied .rm-fpr-num{color:#3730A3}.rm-fp-room.occupied .rm-fpr-status{background:#6C5CE7}
.rm-fp-room.dirty{background:#FFFBEB;border-color:#FCD34D}.rm-fp-room.dirty .rm-fpr-num{color:#92400E}.rm-fp-room.dirty .rm-fpr-status{background:#F4C542}
.rm-fp-room.maintenance{background:#FEF2F2;border-color:#FCA5A5}.rm-fp-room.maintenance .rm-fpr-num{color:#B91C1C}.rm-fp-room.maintenance .rm-fpr-status{background:#E74C3C}
.rm-fp-room.cleaning{background:#EFF6FF;border-color:#93C5FD}.rm-fp-room.cleaning .rm-fpr-num{color:#1E40AF}.rm-fp-room.cleaning .rm-fpr-status{background:#0984E3}
.rm-fp-room.checkout{background:#FFF7ED;border-color:#FDBA74}.rm-fp-room.checkout .rm-fpr-num{color:#C2410C}.rm-fp-room.checkout .rm-fpr-status{background:#FF6B00}

/* Side panel */
.rm-room-panel{position:fixed;right:20px;top:80px;width:300px;background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);border:1px solid #E8E0D8;z-index:1000;padding:20px}
.rm-rp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.rm-rp-num{font-size:28px;font-weight:900;color:#1A1F2E;line-height:1}
.rm-rp-type{font-size:12px;color:#636E72;margin-top:2px}
.rm-rp-close{width:28px;height:28px;border-radius:50%;background:#F8F6F0;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.rm-rp-status-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.rm-rp-status-btn{padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .12s}
.rm-rp-status-btn.current{box-shadow:0 0 0 2px rgba(0,0,0,.1)}
.rm-rp-info{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.rm-rp-row{display:flex;justify-content:space-between;font-size:12px}
.rm-rp-label{color:#636E72}
.rm-rp-val{font-weight:600;color:#1A1F2E}
.rm-rp-actions{display:flex;flex-direction:column;gap:6px}
.rm-rp-btn{padding:9px;border-radius:10px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center}
.rm-rp-btn-primary{background:linear-gradient(135deg,#FF6B00,#FF3CB4);color:white}
.rm-rp-btn-secondary{background:#F8F6F0;color:#1A1F2E;border:1px solid #E8E0D8}
.rm-rp-btn-danger{background:#FEF2F2;color:#E74C3C;border:1px solid rgba(231,76,60,.2)}

/* Backdrop click target */
.rm-panel-backdrop{position:fixed;inset:0;z-index:999}

/* ── Room info hover popover ──────────────────────────────────────
   Appears when the receptionist hovers a room row (Timeline view) or
   a room card (Grid view). Position is computed at the mouseenter
   from the row's bounding rect, so it never gets clipped by the
   overflow:auto on the grid container. STAYLO brand styling: dark
   gradient header, soft white body, brand-coloured chips. */
.rm-info-pop{position:fixed;top:140px;right:20px;bottom:20px;z-index:5000;width:480px;max-width:38vw;background:#fff;border-radius:22px;box-shadow:0 24px 60px -10px rgba(26,31,46,.35),0 8px 24px -8px rgba(26,31,46,.15);border:1px solid rgba(26,31,46,.06);overflow:hidden;pointer-events:auto;display:flex;flex-direction:column;animation:rm-pop-in .15s ease-out}
@media (max-width:1100px){.rm-info-pop{width:420px;max-width:46vw}}
.rm-info-pop.pinned{box-shadow:0 28px 70px -10px rgba(255,107,0,.4),0 10px 30px -8px rgba(255,60,180,.2);border-color:rgba(255,107,0,.4)}
/* Three-column body — receptionist sees everything in one glance.
   Packages got the WIDEST middle column so name + description + price
   are all on one line. David: "agrandir les polices, infos lisibles
   en un clin d'oeil". */
.rm-ip-cols{display:flex;flex-direction:column;gap:14px;padding:14px 16px 18px;flex:1;overflow-y:auto}
.rm-ip-col{display:flex;flex-direction:column;gap:11px;min-width:0}
@keyframes rm-pop-in{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.rm-ip-header{padding:16px 18px;background:linear-gradient(135deg,#1A1F2E 0%,#2A1F4E 60%,#6C5CE7 110%);color:#fff;position:relative;cursor:grab;user-select:none}
.rm-ip-header.dragging{cursor:grabbing}
.rm-ip-close{position:absolute;top:10px;right:10px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;transition:background .12s}
.rm-ip-close:hover{background:rgba(255,255,255,.22)}
.rm-ip-drag-hint{position:absolute;top:11px;right:46px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);pointer-events:none}
.rm-ip-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.5);margin-bottom:3px}
.rm-ip-title{font-size:20px;font-weight:800;line-height:1.2;color:#fff}
.rm-ip-sub{font-size:13px;color:rgba(255,255,255,.75);margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rm-ip-price{margin-top:10px;display:flex;align-items:baseline;justify-content:space-between}
.rm-ip-price-amt{font-size:24px;font-weight:800;background:linear-gradient(90deg,#FF6B00,#FF3CB4);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.rm-ip-price-net{font-size:12px;color:rgba(255,255,255,.65);font-weight:600}
.rm-ip-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow-y:auto}
.rm-ip-cta{padding:11px 16px;background:linear-gradient(135deg,#F8F6F0,#FFF7ED);border-top:1px solid #E8E0D8;font-size:13px;color:#1A1F2E;display:flex;align-items:center;gap:8px;font-weight:600}
.rm-ip-cta .pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#FF6B00;box-shadow:0 0 0 4px rgba(255,107,0,.18);animation:rm-pulse 1.6s ease-in-out infinite}
@keyframes rm-pulse{0%,100%{box-shadow:0 0 0 4px rgba(255,107,0,.18)}50%{box-shadow:0 0 0 7px rgba(255,107,0,.08)}}
.rm-ip-section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#1A1F2E;margin-bottom:7px;display:flex;align-items:center;gap:6px}
.rm-ip-section-title .dot{width:7px;height:7px;border-radius:50%}
.rm-ip-chips{display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start}
.rm-ip-chip{font-size:12px;padding:3px 9px;border-radius:999px;background:rgba(0,184,148,.10);color:#066e54;font-weight:600;display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(0,184,148,.20);white-space:nowrap}
.rm-ip-chip svg{width:12px;height:12px;flex-shrink:0}
.rm-ip-pkg-list{display:flex;flex-direction:column;gap:7px}
.rm-ip-pkg{padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(255,107,0,.07),rgba(255,60,180,.07));border:1px solid rgba(255,107,0,.20);line-height:1.4}
.rm-ip-pkg-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px}
.rm-ip-pkg-name{font-weight:800;color:#C2410C;display:flex;align-items:center;gap:6px;font-size:14px;min-width:0}
.rm-ip-pkg-name .qty{font-size:10px;font-weight:800;background:#FF6B00;color:#fff;padding:2px 7px;border-radius:999px;line-height:1.1}
.rm-ip-pkg-price{font-size:12px;font-weight:800;color:#C2410C;background:rgba(255,107,0,.12);padding:2px 8px;border-radius:999px;white-space:nowrap}
.rm-ip-pkg-price.free{background:rgba(0,184,148,.15);color:#066e54}
.rm-ip-pkg-desc{color:#5A6370;font-size:12.5px;line-height:1.45}
.rm-ip-empty{font-size:12.5px;color:#9CA3AF;font-style:italic;padding:8px 10px;border-radius:10px;background:#FAFAF8;border:1px dashed #E8E0D8}
.rm-ip-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.rm-ip-meta-cell{padding:9px 11px;border-radius:11px;background:#F8F6F0;border:1px solid #E8E0D8}
.rm-ip-meta-cell .lab{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#636E72;font-weight:700;margin-bottom:3px}
.rm-ip-meta-cell .val{font-size:13.5px;font-weight:700;color:#1A1F2E;display:flex;align-items:center;gap:5px}
.rm-ip-desc{font-size:13px;color:#1A1F2E;line-height:1.5;font-style:italic;padding:9px 12px;border-left:3px solid #FF6B00;background:rgba(255,107,0,.05);border-radius:0 10px 10px 0}
/* Full-width rewards row — sits below the 3-column body so we get
   real horizontal real estate. Each card is a compact box that flexes
   to fill the line. ~3-4 fit per row at 1020px popover width. */
.rm-ip-rewards-row{padding:0 16px 14px;display:flex;flex-direction:column;gap:8px}
.rm-ip-rewards-grid{display:flex;flex-wrap:wrap;gap:8px}
.rm-ip-reward-card{flex:1 1 220px;min-width:200px;max-width:300px;padding:9px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(255,60,180,.08),rgba(108,92,231,.08));border:1px solid rgba(255,60,180,.22);display:flex;flex-direction:column;gap:3px}
.rm-ip-reward-card .rwd-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
.rm-ip-reward-card .rwd-label{font-weight:800;color:#A21CAF;font-size:12.5px;display:flex;align-items:center;gap:4px;min-width:0;flex:1}
.rm-ip-reward-card .rwd-label .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rm-ip-reward-card .rwd-days{font-size:10.5px;font-weight:800;color:#A21CAF;background:rgba(255,60,180,.14);padding:2px 7px;border-radius:999px;white-space:nowrap}
.rm-ip-reward-card .rwd-pct{font-size:9px;font-weight:800;background:#A21CAF;color:#fff;padding:1px 6px;border-radius:999px;line-height:1.1}
.rm-ip-reward-card .rwd-perk{font-size:11.5px;color:#5A6370;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rm-ip-reward-card .rwd-dates{font-size:10.5px;color:#7C7F8A;font-style:italic}
.rm-ip-reward-card .rwd-min{font-size:10.5px;color:#5A6370}
`

const DAYS_SHOW = 14

export default function RoomManagement() {
  const { id: propertyId } = useParams()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────
  // Sidebar collapsed state — persisted across navigations so the
  // user's preference sticks. Default expanded on first visit.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('staylo_rm_sidebar') !== 'closed' }
    catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem('staylo_rm_sidebar', sidebarOpen ? 'open' : 'closed') } catch {}
  }, [sidebarOpen])
  const [view, setView] = useState('timeline')   // 'timeline' | 'grid' | 'floorplan'
  // Shared state from PropertyLayout — property + rooms + bookings +
  // packages are fetched once by the parent and reused across every
  // child route. Navigating from Rooms → Gérer → Réservations now
  // happens without a refetch flash. Children can call refetchRooms /
  // refetchBookings after a write to keep things fresh.
  const ctx = useOutletContext() || {}
  const property = ctx.property || null
  const rooms    = ctx.rooms    || []
  const bookings = ctx.bookings || []
  const packages = ctx.packages || []
  const refetchBookings = ctx.refetchBookings || (() => {})
  // Upcoming rewards/specials per room — fetched from room_availability
  // for the next 60 days. The hover popover surfaces them so the
  // receptionist sees "Early bird ×3 days, Free spa Jun 8" without
  // clicking through to the Disponibilités tab.
  const [upcomingAvail, setUpcomingAvail] = useState([])
  // We're loading only while the parent's initial fetch hasn't seeded
  // rooms yet. After that, navigation is instant.
  const loading = !property
  const [statusOverrides, setStatusOverrides] = useState({})
  // Filters
  const [sideStatusFilter, setSideStatusFilter] = useState('all')   // sidebar: all | available | occupied | dirty | maintenance
  const [sideTypeFilter, setSideTypeFilter] = useState('all')
  const [needsActionOnly, setNeedsActionOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  // Walk-in routing — clicking a Timeline date cell (or "Quick Check-In"
  // on a Grid card) navigates to PMSFrontDesk with ?room=<id>&tab=walkin
  // so the mature multi-guest walk-in form opens pre-filled. We removed
  // the parallel CheckInModal that lived here (it duplicated PMSFrontDesk
  // without the TM30 fields).
  function startWalkIn(roomId /*, dateIso */) {
    navigate(`/dashboard/property/${propertyId}/front-desk?room=${roomId}&tab=walkin`)
  }
  // Timeline window
  const [startDay, setStartDay] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  // Floor plan
  const [activeFloor, setActiveFloor] = useState(null)
  // Today (re-evaluated only when needed)
  const today = isoDate(new Date())

  // ── Fetch ──────────────────────────────────────────────────────
  // Property / rooms / bookings / packages now come from PropertyLayout
  // via useOutletContext above — no local fetch needed. Big UX win:
  // switching between Rooms / Gérer / Réservations no longer triggers
  // a reload flash.

  // ── Derive ─────────────────────────────────────────────────────
  const enrichedRooms = useMemo(() => {
    return rooms.map(r => {
      const override = statusOverrides[r.id]
      const active = bookings.find(b =>
        b.room_id === r.id && b.status !== 'cancelled' &&
        b.check_in <= today && b.check_out >= today)
      // A room is "blocked TODAY" if there's a room_availability row
      // for this room × today with is_blocked=true. Without this
      // check, fully-blocked rooms (like BABA when the hotelier closes
      // every date) would fall through to 'available' and slip past
      // the Available filter.
      const blockedToday = upcomingAvail.some(a =>
        a.room_id === r.id && a.date === today && a.is_blocked
      )
      let status = override
      if (!status) {
        if (active)           status = active.check_out === today ? 'checkout' : 'occupied'
        else if (blockedToday) status = 'blocked'
        else                   status = 'available'
      }
      const nights = active
        ? Math.max(1, Math.ceil((new Date(active.check_out) - new Date(active.check_in)) / 86400000))
        : 0
      return {
        ...r,
        status,
        floor: r.floor ?? Number(String(r.name || '').match(/^(\d)/)?.[1]) ?? 1,
        type: r.bed_type || 'Standard',
        guest: active?.guest_name || '',
        nights,
        checkin: active?.check_in || null,
        checkout: active?.check_out || null,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, bookings, statusOverrides, today, upcomingAvail])

  const counts = useMemo(() => {
    const c = { all: enrichedRooms.length }
    for (const k of STATUS_KEYS) c[k] = 0
    enrichedRooms.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [enrichedRooms])

  // Fetch upcoming room_availability — runs once the rooms list is known.
  // We need TWO things from this query:
  //   1. Rewards (rows with specials / perk / promo_*) for the popover
  //   2. Blocked days (rows with is_blocked=true) for the Timeline cells
  //      so blocked dates render like Disponibilités' "BLOQUÉ" pink cells.
  // Keeping both in one fetch + filtering client-side is cheaper than
  // two queries.
  useEffect(() => {
    if (rooms.length === 0) return
    let cancelled = false
    const todayISO = isoDate(new Date())
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 60)
    const horizonISO = isoDate(horizon)
    const roomIds = rooms.map(r => r.id)
    ;(async () => {
      const { data, error } = await supabase
        .from('room_availability')
        .select('room_id, date, specials, perk, promo_label, promo_pct, min_stay, is_blocked')
        .in('room_id', roomIds)
        .gte('date', todayISO)
        .lte('date', horizonISO)
      if (cancelled) return
      if (error) { console.warn('room_availability fetch failed:', error); return }
      // Keep any row that has SOMETHING to surface — a reward OR a block.
      // Empty rows (just available_count snapshots with no specials/blocks)
      // are dropped to keep the in-memory set small.
      const meaningful = (data || []).filter(r =>
        r.is_blocked ||
        (Array.isArray(r.specials) && r.specials.length > 0) ||
        r.perk || r.promo_label || r.promo_pct
      )
      setUpcomingAvail(meaningful)
    })()
    return () => { cancelled = true }
  }, [rooms])

  // Index packages by room_id once so the hover popup is O(1) lookup
  // per row instead of scanning the whole packages array each time.
  // Each value = the packages bundled with that specific room (with
  // qty from the room_packages join so we can display "x2" etc.).
  const packagesByRoom = useMemo(() => {
    const m = new Map()
    for (const pkg of packages) {
      for (const rp of (pkg.room_packages || [])) {
        const list = m.get(rp.room_id) || []
        list.push({ ...pkg, qty: rp.qty || 1 })
        m.set(rp.room_id, list)
      }
    }
    return m
  }, [packages])

  // Blocked dates per room — for the Timeline cell renderer to paint
  // pink "BLOQUÉ" cells like Disponibilités does. Set of ISO date
  // strings = O(1) lookup per cell.
  const blockedByRoom = useMemo(() => {
    const m = new Map()
    for (const row of upcomingAvail) {
      if (!row.is_blocked) continue
      const set = m.get(row.room_id) || new Set()
      set.add(row.date)
      m.set(row.room_id, set)
    }
    return m
  }, [upcomingAvail])

  // Group rewards per room, then by reward identity (label + perk) so
  // a reward applying to 5 days shows ONCE with a date list rather
  // than 5 cluttering rows. Anonymous discount rows (no label, only
  // promo_pct/promo_label) become their own group too.
  const rewardsByRoom = useMemo(() => {
    const m = new Map()  // roomId -> array of { key, label, perk, min_stay, dates[] }
    for (const row of upcomingAvail) {
      const list = m.get(row.room_id) || []
      // Stack model — each row can carry an array of specials.
      const items = Array.isArray(row.specials) && row.specials.length > 0
        ? row.specials.map(s => ({ label: s.label, perk: s.perk, min_stay: s.min_stay }))
        : []
      // Legacy single-perk / promo fields.
      if (row.perk || row.promo_label) {
        items.push({
          label: row.promo_label || row.perk,
          perk: row.perk,
          min_stay: row.min_stay,
          promo_pct: row.promo_pct,
        })
      } else if (row.promo_pct) {
        items.push({
          label: `${Number(row.promo_pct)}% discount`,
          promo_pct: row.promo_pct,
        })
      }
      for (const it of items) {
        const key = `${it.label || ''}__${it.perk || ''}__${it.promo_pct || ''}`
        let g = list.find(x => x.key === key)
        if (!g) {
          g = { key, label: it.label || '—', perk: it.perk, min_stay: it.min_stay, promo_pct: it.promo_pct, dates: [] }
          list.push(g)
        }
        if (!g.dates.includes(row.date)) g.dates.push(row.date)
      }
      m.set(row.room_id, list)
    }
    // Sort dates per group + groups by first occurrence for stable UI.
    for (const list of m.values()) {
      list.forEach(g => g.dates.sort())
      list.sort((a, b) => (a.dates[0] || '').localeCompare(b.dates[0] || ''))
    }
    return m
  }, [upcomingAvail])

  const types = useMemo(() => {
    const counts = new Map()
    enrichedRooms.forEach(r => counts.set(r.type, (counts.get(r.type) || 0) + 1))
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [enrichedRooms])

  const filteredRooms = useMemo(() => {
    return enrichedRooms.filter(r => {
      if (sideStatusFilter !== 'all') {
        // Sidebar groups "Dirty" + "Cleaning" together as the housekeeping
        // bucket (matches the mockup's "Dirty / Clean" label).
        if (sideStatusFilter === 'dirty') {
          if (r.status !== 'dirty' && r.status !== 'cleaning') return false
        } else if (r.status !== sideStatusFilter) return false
      }
      if (sideTypeFilter !== 'all' && r.type !== sideTypeFilter) return false
      if (needsActionOnly && !['dirty','maintenance','checkout','cleaning'].includes(r.status)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${r.name} ${r.type} ${r.guest}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [enrichedRooms, sideStatusFilter, sideTypeFilter, needsActionOnly, search])

  const floorsMap = useMemo(() => {
    const m = new Map()
    filteredRooms.forEach(r => {
      if (!m.has(r.floor)) m.set(r.floor, [])
      m.get(r.floor).push(r)
    })
    return new Map([...m.entries()].sort((a, b) => a[0] - b[0]))
  }, [filteredRooms])

  // Pick a default active floor when the floor plan view opens
  useEffect(() => {
    if (activeFloor === null && floorsMap.size > 0) {
      setActiveFloor([...floorsMap.keys()][0])
    }
  }, [floorsMap, activeFloor])

  const todayStats = useMemo(() => {
    const total = enrichedRooms.length || 1
    const occupied = enrichedRooms.filter(r => r.status === 'occupied' || r.status === 'checkout').length
    const occupancy = Math.round((occupied / total) * 100)
    const arrivals = bookings.filter(b => b.status !== 'cancelled' && b.check_in === today).length
    const departures = bookings.filter(b => b.status !== 'cancelled' && b.check_out === today).length
    return { occupancy, arrivals, departures }
  }, [enrichedRooms, bookings, today])

  // ── Helpers ────────────────────────────────────────────────────
  function shift(n) {
    const d = new Date(startDay); d.setDate(d.getDate() + n); setStartDay(d)
  }
  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0); setStartDay(d)
  }
  function setRoomStatus(roomId, status) {
    setStatusOverrides(s => ({ ...s, [roomId]: status }))
  }

  const dates = useMemo(() => {
    const arr = []
    for (let i = 0; i < DAYS_SHOW; i++) {
      const d = new Date(startDay); d.setDate(d.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [startDay])
  const endDay = dates[dates.length - 1]
  const todayDate = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()

  return (
    <>
      <style>{STYLES}</style>
      <div className={`rm-shell ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <div className="rm-sidebar">
          <div className="rm-sidebar-section">
            <div className="rm-sidebar-title">
              {property?.name || (loading ? '…' : 'Hotel')}
            </div>
            <SidebarItem icon="🏠" label="All Rooms" badge={counts.all} badgeClass="green"
              active={sideStatusFilter === 'all'} onClick={() => setSideStatusFilter('all')} />
            <SidebarItem icon="🟢" label="Available" badge={counts.available || 0} badgeClass="green"
              active={sideStatusFilter === 'available'} onClick={() => setSideStatusFilter('available')} />
            <SidebarItem icon="🟣" label="Occupied" badge={counts.occupied || 0} badgeClass="purple"
              active={sideStatusFilter === 'occupied'} onClick={() => setSideStatusFilter('occupied')} />
            <SidebarItem icon="🟡" label="Dirty / Clean" badge={(counts.dirty || 0) + (counts.cleaning || 0)} badgeClass="orange"
              active={sideStatusFilter === 'dirty'} onClick={() => setSideStatusFilter('dirty')} />
            <SidebarItem icon="🔴" label="Maintenance" badge={counts.maintenance || 0}
              active={sideStatusFilter === 'maintenance'} onClick={() => setSideStatusFilter('maintenance')} />
          </div>

          {types.length > 0 && (
            <div className="rm-sidebar-section">
              <div className="rm-sidebar-title">Room Types</div>
              <SidebarItem icon="🛏" label={`All (${counts.all})`}
                active={sideTypeFilter === 'all'} onClick={() => setSideTypeFilter('all')} />
              {types.map(([type, n]) => (
                <SidebarItem key={type} icon="🛏" label={`${type} (${n})`}
                  active={sideTypeFilter === type} onClick={() => setSideTypeFilter(type)} />
              ))}
            </div>
          )}

          <div className="rm-sidebar-section">
            <div className="rm-sidebar-title">Quick Actions</div>
            <SidebarItem icon="➕" label="New Booking" />
            <SidebarItem icon="✅" label={`Check In (${todayStats.arrivals})`} />
            <SidebarItem icon="🚪" label={`Check Out (${todayStats.departures})`} />
            <SidebarItem icon="🔄" label="Room Move" />
          </div>

          <div className="rm-sidebar-section">
            <div className="rm-sidebar-title">Today</div>
            <SidebarItem icon="📈" label={`Occupancy: ${todayStats.occupancy}%`} />
            <SidebarItem icon="⬆️" label={`Arrivals: ${todayStats.arrivals}`} />
            <SidebarItem icon="⬇️" label={`Departures: ${todayStats.departures}`} />
          </div>

          <div className="rm-sidebar-section">
            <SidebarItem icon="←"
              label="Back to property"
              onClick={() => navigate(`/dashboard/property/${propertyId}`)} />
          </div>
        </div>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <div className="rm-main">
          {/* Toolbar */}
          <div className="rm-toolbar">
            {/* Sidebar toggle — moved here from the (removed) dark
                topbar. Stays visible whether the sidebar is open or
                closed, so the chef can always swap. */}
            <button className="rm-sidebar-toggle"
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <div className="rm-view-tabs">
              <button className={`rm-vtab ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>📅 Timeline</button>
              <button className={`rm-vtab ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>⬛ Grid</button>
              <button className={`rm-vtab ${view === 'floorplan' ? 'active' : ''}`} onClick={() => setView('floorplan')}>🗺 Floor Plan</button>
            </div>
            {/* Date nav — only meaningful in Timeline view. Hide on
                other views to keep the toolbar tidy. */}
            {view === 'timeline' && (
              <>
                <div className="rm-date-nav">
                  <button className="rm-date-btn" onClick={() => shift(-7)}>‹</button>
                  <span>{fmtDay(startDay)} – {fmtDay(endDay)}</span>
                  <button className="rm-date-btn" onClick={() => shift(7)}>›</button>
                </div>
                <button className="rm-today-btn" onClick={goToday}>Today</button>
              </>
            )}
            <button className={`rm-filter-btn ${sideTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSideTypeFilter('all')}>🏠 All Types</button>
            <button className={`rm-filter-btn ${sideStatusFilter === 'available' ? 'active' : ''}`}
              onClick={() => setSideStatusFilter(sideStatusFilter === 'available' ? 'all' : 'available')}>🟢 Available</button>
            <button className={`rm-filter-btn ${needsActionOnly ? 'active' : ''}`}
              onClick={() => setNeedsActionOnly(v => !v)}>⚠️ Needs Action</button>
            <input
              className="rm-search-box"
              type="text" placeholder="🔍  Search room, guest..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="rm-stats-row">
              <span className="rm-stat-chip rm-sc-available">Available {counts.available || 0}</span>
              <span className="rm-stat-chip rm-sc-occupied">Occupied {counts.occupied || 0}</span>
              <span className="rm-stat-chip rm-sc-dirty">Dirty {counts.dirty || 0}</span>
              <span className="rm-stat-chip rm-sc-maintenance">Maint. {counts.maintenance || 0}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="rm-legend">
            <span style={{ fontSize: 11, fontWeight: 700, color: '#636E72' }}>Legend:</span>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#00B894' }}></div>Available</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#6C5CE7' }}></div>Occupied</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#F4C542' }}></div>Dirty / Ready to clean</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#FF6B00' }}></div>Due checkout</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#0984E3' }}></div>In cleaning</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#E74C3C' }}></div>Maintenance</div>
            <div className="rm-legend-item"><div className="rm-legend-dot" style={{ background: '#9CA3AF' }}></div>Blocked</div>
          </div>

          {/* View body */}
          <div className="rm-view">
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#636E72' }}>Loading rooms…</div>
            ) : rooms.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#636E72' }}>
                No rooms configured yet. <Link to={`/dashboard/property/${propertyId}/manage`}>Add rooms in Manage → Chambres</Link>.
              </div>
            ) : view === 'timeline' ? (
              <TimelineView rooms={filteredRooms} bookings={bookings}
                startDay={startDay} dates={dates} todayDate={todayDate}
                packagesByRoom={packagesByRoom}
                rewardsByRoom={rewardsByRoom}
                blockedByRoom={blockedByRoom}
                onPick={setSelectedRoom}
                onCheckIn={(room, date) => startWalkIn(room.id, date)} />
            ) : view === 'grid' ? (
              <GridView floorsMap={floorsMap}
                packagesByRoom={packagesByRoom}
                rewardsByRoom={rewardsByRoom}
                onPick={setSelectedRoom}
                onCheckIn={(room) => startWalkIn(room.id)} />
            ) : (
              <FloorPlanView floorsMap={floorsMap} activeFloor={activeFloor}
                setActiveFloor={setActiveFloor} property={property}
                packagesByRoom={packagesByRoom}
                rewardsByRoom={rewardsByRoom}
                bookings={bookings}
                today={today}
                onPick={setSelectedRoom} />
            )}
          </div>
        </div>

        {/* ── SIDE PANEL ──────────────────────────────────────── */}
        {selectedRoom && (
          <>
            <div className="rm-panel-backdrop" onClick={() => setSelectedRoom(null)} />
            <RoomPanel
              room={selectedRoom}
              bookings={bookings}
              onClose={() => setSelectedRoom(null)}
              onSetStatus={(s) => {
                setRoomStatus(selectedRoom.id, s)
                setSelectedRoom(r => r ? { ...r, status: s } : r)
              }}
              onCheckIn={() => {
                startWalkIn(selectedRoom.id)
                setSelectedRoom(null)
              }}
            />
          </>
        )}

        {/* Walk-in flow lives in PMSFrontDesk (mature multi-guest form
            with full TM30 fields). startWalkIn() navigates there with
            ?room=<id>&tab=walkin so the right modal opens pre-targeted. */}
      </div>
    </>
  )
}

// ── Sidebar item ──
function SidebarItem({ icon, label, badge, badgeClass, active, onClick }) {
  return (
    <button className={`rm-sidebar-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="rm-si-icon">{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge !== '' && (
        <span className={`rm-badge ${badgeClass || ''}`}>{badge}</span>
      )}
    </button>
  )
}

// ── Room info hover popover ──
// Lightweight read-only card that floats next to the row when the
// receptionist hovers a room. Goal: answer "what's this room like?"
// without a single click — so when a guest asks at the desk, the
// receptionist can rattle off "KING bed, breakfast for 2 included,
// transfer to Full Moon included" instantly.
//
// Rendered as position:fixed so the grid's overflow-x can't clip it.
// Coordinates come from the hovered row's bounding rect (computed in
// the parent on mouseenter). pointer-events:none so the popover never
// steals hover from the row itself — the row continues to drive the
// open/close state.
function RoomInfoPopover({ room, packages, rewards, x, y, side, onClose, onPin, onMouseEnter, onMouseLeave }) {
  // V8 — fixed right-side panel. Position is set entirely by CSS
  // (.rm-info-pop top/right/bottom). x/y/side props are accepted for
  // backward compat with existing call sites but unused. Drag-to-move
  // is gone; the popover is stationary and only updates content as
  // the receptionist hovers different room rows.

  const amenities = Array.isArray(room.amenities) ? room.amenities : []
  const amenityChips = amenities.map(k => {
    const meta = AMENITY_META[k]
    return { key: k, label: meta?.label || prettyLabel(k), Icon: meta?.icon || null }
  })

  return (
    <div
      className="rm-info-pop"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="rm-ip-header" title="Room details">
        <div className="rm-ip-eyebrow">Room details</div>
        <div className="rm-ip-title">{room.display_name || room.name}</div>
        <div className="rm-ip-sub">
          {room.bed_type && <>🛏️ {prettyLabel(room.bed_type)} bed</>}
          {room.max_guests > 0 && <span>· 👤 max {room.max_guests}</span>}
          {room.size_sqm > 0 && <span>· 📐 {room.size_sqm} m²</span>}
        </div>
        {room.base_price > 0 && (
          <div className="rm-ip-price">
            <span className="rm-ip-price-amt">${Number(room.base_price).toFixed(0)}<span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)'}}>/night</span></span>
            <span className="rm-ip-price-net">net ${(Number(room.base_price) * 0.9).toFixed(0)}</span>
          </div>
        )}
        <button
          type="button"
          className="rm-ip-close"
          onClick={(e) => { e.stopPropagation(); onClose?.() }}
          aria-label="Close"
          title="Close (Esc)"
        >✕</button>
      </div>
      {/* Body — THREE columns for max density. The receptionist sees
          essentials + packages + amenities all without scrolling.
          col 1: bed/capacity + included packages (the pitch story)
          col 2: description + room basics
          col 3: amenities chip cloud (wide, flows naturally) */}
      <div className="rm-ip-cols">
        {/* ── Col 1 — Essentials + Packages ── */}
        <div className="rm-ip-col">
          <div className="rm-ip-meta">
            <div className="rm-ip-meta-cell">
              <div className="lab">Bed</div>
              <div className="val">🛏️ {prettyLabel(room.bed_type) || 'Standard'}</div>
            </div>
            <div className="rm-ip-meta-cell">
              <div className="lab">Capacity</div>
              <div className="val">👤 {room.max_guests || 1} {room.max_guests > 1 ? 'guests' : 'guest'}</div>
            </div>
          </div>

          {/* Packages — what's INCLUDED (breakfast, transfer, etc.).
              The pitch the receptionist needs: "Breakfast for 2
              included · Full Moon transfer included". */}
          <div>
            <div className="rm-ip-section-title">
              <span className="dot" style={{background:'#FF6B00'}} />
              🎁 Included packages
            </div>
            {packages.length === 0 ? (
              <div className="rm-ip-empty">No packages bundled with this room</div>
            ) : (
              <div className="rm-ip-pkg-list">
                {packages.map(p => {
                  // Price model: packages.price is the per-unit add-on
                  // price in `currency` (USD by default). `qty` comes
                  // from the room_packages join — how many units the
                  // room gets by default (e.g. breakfast ×2 for a
                  // couple). Total = price × qty. price = 0 → "Included
                  // free", surfaced as a green pill so the receptionist
                  // spots it immediately when reading off the room.
                  const unitPrice = Number(p.price) || 0
                  const total = unitPrice * (p.qty || 1)
                  const currency = p.currency || 'USD'
                  const isFree = unitPrice === 0
                  return (
                    <div key={p.id} className="rm-ip-pkg">
                      <div className="rm-ip-pkg-head">
                        <div className="rm-ip-pkg-name">
                          🎁 {p.name}
                          {p.qty > 1 && <span className="qty">×{p.qty}</span>}
                        </div>
                        <span className={`rm-ip-pkg-price${isFree ? ' free' : ''}`}>
                          {isFree
                            ? '✓ Included'
                            : (p.qty > 1
                                ? `${total} ${currency} (${unitPrice}×${p.qty})`
                                : `${unitPrice} ${currency}`)
                          }
                        </span>
                      </div>
                      {p.description && <div className="rm-ip-pkg-desc">{p.description}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── Col 2 — Description + basics ── */}
        <div className="rm-ip-col">
          {room.description && (
            <div>
              <div className="rm-ip-section-title">
                <span className="dot" style={{background:'#6C5CE7'}} />
                📝 Description
              </div>
              <div className="rm-ip-desc">{room.description}</div>
            </div>
          )}
          {/* Quick-fact chips — extra context the receptionist may need
              (size, view type if set as fields, floor, etc.). Only render
              if at least one piece of data exists. */}
          {(room.size_sqm > 0 || room.floor || room.unit_number) && (
            <div>
              <div className="rm-ip-section-title">
                <span className="dot" style={{background:'#6C5CE7'}} />
                ℹ️ At a glance
              </div>
              <div className="rm-ip-chips" style={{ marginTop: 2 }}>
                {room.size_sqm > 0 && (
                  <span className="rm-ip-chip" style={{ background: 'rgba(108,92,231,.08)', color: '#3F2E94', borderColor: 'rgba(108,92,231,.18)' }}>
                    📐 {room.size_sqm} m²
                  </span>
                )}
                {room.floor && (
                  <span className="rm-ip-chip" style={{ background: 'rgba(108,92,231,.08)', color: '#3F2E94', borderColor: 'rgba(108,92,231,.18)' }}>
                    🏢 Floor {room.floor}
                  </span>
                )}
                {room.unit_number && (
                  <span className="rm-ip-chip" style={{ background: 'rgba(108,92,231,.08)', color: '#3F2E94', borderColor: 'rgba(108,92,231,.18)' }}>
                    🚪 #{room.unit_number}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Col 3 (wide) — Amenities chip cloud ── */}
        <div className="rm-ip-col">
          {amenityChips.length > 0 ? (
            <div>
              <div className="rm-ip-section-title">
                <span className="dot" style={{background:'#00B894'}} />
                ✨ Amenities ({amenityChips.length})
              </div>
              <div className="rm-ip-chips">
                {amenityChips.map(a => (
                  <span key={a.key} className="rm-ip-chip" title={a.label}>
                    {a.Icon && <a.Icon size={10} />}
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rm-ip-empty">No amenities configured yet</div>
          )}
        </div>
      </div>

      {/* Active rewards — full-width horizontal row. Each reward is a
          compact card that flexes to fill the line; 3-4 fit per row at
          the popover's 1020px width. Sits below the 3-column body so
          the rewards get real horizontal real estate instead of being
          stacked vertically in col 1. */}
      {rewards && rewards.length > 0 && (
        <div className="rm-ip-rewards-row">
          <div className="rm-ip-section-title">
            <span className="dot" style={{background:'#FF3CB4'}} />
            ✨ Active rewards (next 60 days) · {rewards.length}
          </div>
          <div className="rm-ip-rewards-grid">
            {rewards.map(r => (
              <div key={r.key} className="rm-ip-reward-card">
                <div className="rwd-head">
                  <span className="rwd-label">
                    <span>✨</span>
                    <span className="lbl">{r.label || 'Reward'}</span>
                    {r.promo_pct ? <span className="rwd-pct">-{Number(r.promo_pct)}%</span> : null}
                  </span>
                  <span className="rwd-days">{r.dates.length}d</span>
                </div>
                {r.perk && <div className="rwd-perk">{r.perk}</div>}
                {r.min_stay > 1 && (
                  <div className="rwd-min">🌙 ≥ {r.min_stay} nights</div>
                )}
                <div className="rwd-dates">{formatDateRanges(r.dates)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer hint — tells the receptionist that clicking the row
          launches the check-in flow. Subtle pulse on the dot draws the
          eye without being noisy. */}
      <div className="rm-ip-cta">
        <span className="pulse" />
        🔑 Click any cell in this row to start a check-in
      </div>
    </div>
  )
}

// ── Timeline view ──
function TimelineView({ rooms, bookings, packagesByRoom, rewardsByRoom, blockedByRoom, startDay, dates, todayDate, onPick, onCheckIn }) {
  // Expand each non-dorm multi-unit room (e.g. Hibrakim × 3, HQ double
  // bed × 9) into N virtual rows so the receptionist sees one row per
  // physical unit. Dorms stay as one row (per-bed detail lives in the
  // DormSubPlanModal grid). Single-unit rooms unchanged.
  //
  // The virtual row carries `unit_index` (1..quantity) and a synthetic
  // display name like 'Hibrakim 2'. Lookups for packages, rewards,
  // blocks still key on the parent room.id since those don't partition
  // per unit.
  const virtualRooms = useMemo(() => {
    const out = []
    for (const r of (rooms || [])) {
      const type = String(r.type || '').toLowerCase()
      const dorm = type === 'dormitory' || type === 'capsule'
      const qty  = Math.max(1, Number(r.quantity) || 1)
      if (dorm || qty <= 1) {
        out.push({ ...r, unit_index: null, display_name: r.name, virtual_id: r.id })
      } else {
        for (let i = 1; i <= qty; i++) {
          out.push({
            ...r,
            unit_index: i,
            display_name: `${r.name} ${i}`,
            virtual_id: `${r.id}#${i}`,
          })
        }
      }
    }
    return out
  }, [rooms])

  // Bookings keyed by the VIRTUAL row id, not the raw room_id. For
  // multi-unit rooms we distribute bookings deterministically by
  // check-in date — first arrival goes to unit 1, second to unit 2, etc.
  // (Same pattern as the FloorPlanV7View per-unit fix shipped earlier.)
  // Long term this is replaced by an explicit bookings.room_unit_index
  // column so the assignment isn't order-dependent.
  const resByRoom = useMemo(() => {
    const m = new Map()
    const endDay = dates[dates.length - 1]

    // Group bookings by raw room_id with their grid indices computed.
    const byRoom = new Map()
    bookings.forEach(b => {
      if (b.status === 'cancelled') return
      const ci = new Date(b.check_in); ci.setHours(0,0,0,0)
      const co = new Date(b.check_out); co.setHours(0,0,0,0)
      if (co < startDay || ci > endDay) return
      const startIdx = Math.max(0, Math.floor((ci - startDay) / 86400000))
      const endIdx   = Math.min(DAYS_SHOW, Math.ceil((co - startDay) / 86400000))
      if (endIdx <= startIdx) return
      const arr = byRoom.get(b.room_id) || []
      arr.push({ ...b, startIdx, endIdx, _ciTs: ci.getTime() })
      byRoom.set(b.room_id, arr)
    })

    // Distribute each room's bookings across its virtual rows.
    for (const [roomId, list] of byRoom.entries()) {
      const parent = rooms.find(r => r.id === roomId)
      const type = String(parent?.type || '').toLowerCase()
      const dorm = type === 'dormitory' || type === 'capsule'
      const qty  = Math.max(1, Number(parent?.quantity) || 1)
      if (dorm || qty <= 1) {
        // All bookings on the single row.
        m.set(roomId, list)
        continue
      }
      // Sort by check-in ascending for stable assignment.
      const sorted = [...list].sort((a, b) => a._ciTs - b._ciTs)
      // Walk the sorted bookings and assign each to the next free
      // virtual unit FOR ITS DATE RANGE. A unit is "free" for a
      // booking if no already-assigned booking on that unit overlaps.
      const occupancy = new Array(qty + 1).fill(null).map(() => [])
      for (const b of sorted) {
        let placed = false
        for (let u = 1; u <= qty; u++) {
          const conflicts = occupancy[u].some(existing =>
            !(b.endIdx <= existing.startIdx || b.startIdx >= existing.endIdx)
          )
          if (!conflicts) {
            occupancy[u].push(b)
            const key = `${roomId}#${u}`
            const arr = m.get(key) || []
            arr.push(b)
            m.set(key, arr)
            placed = true
            break
          }
        }
        if (!placed) {
          // Over-capacity (more concurrent bookings than units) — fall
          // back to unit 1 visually. The receptionist will spot the
          // overlap on the timeline and resolve it.
          const key = `${roomId}#1`
          const arr = m.get(key) || []
          arr.push(b)
          m.set(key, arr)
        }
      }
    }
    return m
  }, [bookings, startDay, dates, rooms])
  const todayISO = isoDate(new Date())

  // Hover popover state — { room, x, y, side } | null. Coordinates
  // are computed from the row's bounding rect at mouseenter so the
  // popover anchors below/right of the room-info column and tracks
  // viewport edges (flips to the LEFT of the row if there's not
  // enough room on the right).
  // V8 — fixed right-side panel. Auto-closes when the cursor leaves
  // both the row and the popover itself. cancelClose fires when the
  // cursor enters the popover, so the receptionist has time to read.
  const [hovered, setHovered] = useState(null)
  const closeTimerRef = useRef(null)
  const setPinned = () => {}

  function handleRowEnter(e, room) {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    setHovered({ room })
  }
  function handleRowLeave() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setHovered(null)
      closeTimerRef.current = null
    }, 120)
  }
  function cancelClose() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }
  function closePopover() {
    cancelClose()
    setHovered(null)
  }

  return (
    <>
      <div className="rm-tl-header">
        <div className="rm-tl-room-col">Room</div>
        <div className="rm-tl-dates">
          {dates.map((d, i) => {
            const isToday = d.toDateString() === todayDate.toDateString()
            return (
              <div key={i} className={`rm-tl-day ${isToday ? 'today' : ''}`}>
                <span className="rm-tl-dow">{DAYS_LBL[d.getDay()]}</span>
                <span className="rm-tl-date">{d.getDate()}</span>
              </div>
            )
          })}
        </div>
      </div>
      {virtualRooms.map(room => {
        const reservations = resByRoom.get(room.virtual_id) || []
        return (
          <div
            key={room.virtual_id}
            className="rm-tl-row"
            onMouseEnter={e => handleRowEnter(e, room)}
            onMouseLeave={handleRowLeave}
          >
            <div className="rm-tl-room-info">
              <div className="rm-tl-room-num">{room.display_name}</div>
              <div className="rm-tl-room-type">{room.type}</div>
            </div>
            <div className="rm-tl-grid">
              {dates.map((d, i) => {
                const isToday = d.toDateString() === todayDate.toDateString()
                const iso = isoDate(d)
                // Mirror Disponibilités: cells flagged is_blocked in
                // room_availability render with hatched pink bg + "BLOQUÉ"
                // label. blockedByRoom is the Map of roomId → Set<ISO>
                // built from the same query as rewards (no extra fetch).
                const isBlocked = blockedByRoom?.get(room.id)?.has(iso)
                if (isBlocked) {
                  return (
                    <div key={i}
                      className={`rm-tl-cell blocked ${isToday ? 'today' : ''}`}
                      title="This date is blocked for sale (set in Disponibilités → Timeline)"
                    />
                  )
                }
                // Clicking an empty cell launches the check-in modal
                // pre-filled with this room + the cell's date. The
                // reservation bars above sit on TOP of cells (z-index
                // in CSS) so they intercept their own clicks.
                return (
                  <div key={i}
                    className={`rm-tl-cell ${isToday ? 'today' : ''}`}
                    onClick={() => onCheckIn?.(room, iso)}
                    style={{ cursor: 'pointer' }}
                    title="Click to start a check-in for this date"
                  />
                )
              })}
              {reservations.map((b, i) => {
                const cellW = 100 / DAYS_SHOW
                const isCheckin = b.check_in === todayISO
                const isCheckout = b.check_out === todayISO
                const isBlocked = b.status === 'blocked'
                const klass = isBlocked ? 'rm-rb-blocked'
                            : isCheckout ? 'rm-rb-checkout'
                            : isCheckin ? 'rm-rb-checkin'
                            : 'rm-rb-confirmed'
                return (
                  <button key={i} className={`rm-res-bar ${klass}`}
                    style={{
                      left: `calc(${b.startIdx * cellW}% + 2px)`,
                      width: `calc(${(b.endIdx - b.startIdx) * cellW}% - 4px)`,
                    }}
                    onClick={() => onPick(room)}
                    title={`${b.guest_name || 'Guest'} · ${b.check_in} → ${b.check_out}`}>
                    {b.guest_name || 'Guest'}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {hovered && (
        <RoomInfoPopover
          room={hovered.room}
          packages={packagesByRoom?.get(hovered.room.id) || []}
          rewards={rewardsByRoom?.get(hovered.room.id) || []}
          x={hovered.x}
          y={hovered.y}
          side={hovered.side}
          onMouseEnter={cancelClose}
          onMouseLeave={handleRowLeave}
          onClose={closePopover}
          onPin={() => setPinned(true)}
        />
      )}
    </>
  )
}

// ── Grid view ──
function GridView({ floorsMap, packagesByRoom, rewardsByRoom, onPick }) {
  // Same hover popover wiring as Timeline — the card opens it, popover
  // is rendered once at the view root so we don't get N popovers
  // racing each other.
  // V8 — fixed right-side panel with auto-close on row leave + cancel
  // when the cursor enters the popover itself.
  const [hovered, setHovered] = useState(null)
  const closeTimerRef = useRef(null)
  const setPinned = () => {}

  function openFor(room) {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    setHovered({ room })
  }
  function closeSoon() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setHovered(null)
      closeTimerRef.current = null
    }, 120)
  }
  function cancelClose() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }
  function closePopover() {
    cancelClose()
    setHovered(null)
  }

  if (floorsMap.size === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#636E72' }}>No rooms match the current filters.</div>
  }
  return (
    <div className="rm-grid-view">
      {[...floorsMap.entries()].map(([floor, list]) => (
        <section key={floor} className="rm-floor-section">
          <div className="rm-floor-title">Floor {floor}</div>
          <div className="rm-rooms-grid">
            {list.map(r => (
              <GridCard
                key={r.id}
                room={r}
                onPick={onPick}
                onHoverIn={() => openFor(r)}
                onHoverOut={closeSoon}
              />
            ))}
          </div>
        </section>
      ))}
      {hovered && (
        <RoomInfoPopover
          room={hovered.room}
          packages={packagesByRoom?.get(hovered.room.id) || []}
          rewards={rewardsByRoom?.get(hovered.room.id) || []}
          x={hovered.x}
          y={hovered.y}
          side={hovered.side}
          onMouseEnter={cancelClose}
          onMouseLeave={closeSoon}
          onClose={closePopover}
          onPin={() => setPinned(true)}
        />
      )}
    </div>
  )
}

function GridCard({ room, onPick, onHoverIn, onHoverOut }) {
  const s = ROOM_STATUSES[room.status] || ROOM_STATUSES.available
  const hk = room.status === 'dirty' ? '🧹'
          : room.status === 'cleaning' ? '⏳'
          : room.status === 'maintenance' ? '🔧'
          : room.status === 'checkout' ? '🚪'
          : ''
  return (
    <button
      className={`rm-room-card ${room.status}`}
      onClick={() => onPick(room)}
      onMouseEnter={e => onHoverIn?.(e.currentTarget)}
      onMouseLeave={() => onHoverOut?.()}
    >
      <div className="rm-rc-num">{room.name}</div>
      <div className="rm-rc-type">{room.type}</div>
      <div className={`rm-rc-status ${room.status}`}>{s.label}</div>
      {room.guest && <div className="rm-rc-guest">👤 {room.guest}</div>}
      {room.nights > 0 && room.checkout && (
        <div className="rm-rc-nights">📅 {room.nights}N · CO: {fmtDay(new Date(room.checkout))}</div>
      )}
      {hk && <div className="rm-hk-icon">{hk}</div>}
    </button>
  )
}

// ── Floor plan view ──
function FloorPlanView({ floorsMap, activeFloor, setActiveFloor, property, bookings, today, onPick }) {
  // V7 shortcut — if the hotelier has configured zones (drag-drop shapes
  // on the architect plan in PropertyManage), display THAT instead of
  // the auto-layout fallback. The fallback is kept for properties that
  // haven't run the V7 editor yet.
  const planUrl = property?.floor_plan_url
  const allZones = Array.isArray(property?.floor_plan_zones) ? property.floor_plan_zones : []
  const liveZones = allZones.filter(z => !z?.deleted && z?.assigned_room_id)
  const hasV7 = !!planUrl && liveZones.length > 0

  // Build a flat room lookup so we can match each zone to its room
  // status. Rooms in floorsMap already carry the computed status from
  // the parent's per-day pipeline.
  const allRooms = [...floorsMap.values()].flat()
  const roomById = new Map(allRooms.map(r => [r.id, r]))

  if (hasV7) {
    return (
      <FloorPlanV7View
        planUrl={planUrl}
        zones={liveZones}
        roomById={roomById}
        bookings={bookings || []}
        today={today}
        property={property}
        onPick={onPick}
      />
    )
  }

  // ─── Legacy auto-layout fallback ───
  const floors = [...floorsMap.keys()]
  const effective = floors.includes(activeFloor) ? activeFloor : (floors[0] ?? 1)
  const list = floorsMap.get(effective) || []
  const half = Math.ceil(list.length / 2)
  return (
    <div className="rm-fp-view">
      <div className="rm-fp-floors">
        {floors.map(f => (
          <button key={f} className={`rm-fp-floor-tab ${effective === f ? 'active' : ''}`}
            onClick={() => setActiveFloor(f)}>Floor {f}</button>
        ))}
      </div>
      <div className="rm-fp-canvas">
        <div className="rm-floor-plan">
          <div className="rm-fp-row">
            {list.slice(0, half).map(r => <FpRoom key={r.id} room={r} onPick={onPick} />)}
          </div>
          <div className="rm-fp-corridor">— {property?.name || 'Corridor'} — Floor {effective} —</div>
          <div className="rm-fp-row">
            {list.slice(half).map(r => <FpRoom key={r.id} room={r} onPick={onPick} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// V7 reception view — architect plan as background, V7 shape zones as
// clickable status-coloured rectangles/circles/polygons on top.
// ──────────────────────────────────────────────────────────────────────
function FloorPlanV7View({ planUrl, zones, roomById, bookings, today, property, onPick }) {
  // Per-room booking count active today — used to compute PER-UNIT
  // status instead of inheriting the type-level room.status. Without
  // this, a room with quantity=3 and ONE booking would show all 3
  // V7 zones as "occupied" because the parent rolls the type-level
  // status up to "occupied" as soon as any unit is booked.
  const bookingsByRoom = (() => {
    const map = new Map()
    for (const b of (bookings || [])) {
      if (!b?.room_id) continue
      if (b.status === 'cancelled') continue
      if (today && (b.check_in > today || b.check_out <= today)) continue
      const arr = map.get(b.room_id) || []
      arr.push(b)
      map.set(b.room_id, arr)
    }
    return map
  })()
  /**
   * Status for one specific zone (= one physical unit, identified by
   * room.id + zone.unit_index).
   *
   * Rules:
   *   1. If the room.status is 'blocked' or 'maintenance' (type-wide
   *      hotelier action), every unit inherits it — those flags don't
   *      partition by unit.
   *   2. For multi-unit rooms, count active bookings today. Units with
   *      unit_index ≤ count are 'occupied'; the rest fall back to
   *      'available'. Deterministic assignment by ascending index —
   *      good enough until bookings.room_unit_index lands.
   *   3. For dorms (1 zone per dorm, room.quantity = beds), we keep
   *      the type-level status. Future work: show a partial-fill
   *      indicator on the dorm zone with N/total occupied beds.
   *   4. Single-unit rooms: just use the type-level status as is.
   */
  function statusFor(zone) {
    const room = roomById.get(zone.assigned_room_id)
    if (!room) return ROOM_STATUSES.available

    const typeStatus = room.status || 'available'
    if (typeStatus === 'blocked' || typeStatus === 'maintenance') {
      return ROOM_STATUSES[typeStatus]
    }

    const quantity = room.quantity || 1
    const dorm = (room.type || '').toLowerCase()
    const isDorm = dorm === 'dormitory' || dorm === 'capsule'
    if (quantity === 1 || isDorm) {
      return ROOM_STATUSES[typeStatus] || ROOM_STATUSES.available
    }

    const activeBookings = bookingsByRoom.get(room.id) || []
    const occupiedCount = activeBookings.length
    const myIndex = zone.unit_index ?? 1
    if (myIndex <= occupiedCount) {
      // Mirror the type-level state when more specific information
      // exists (checkout / cleaning / dirty). Otherwise default to
      // 'occupied' since this unit IS booked.
      if (['checkout', 'cleaning', 'dirty'].includes(typeStatus)) {
        return ROOM_STATUSES[typeStatus]
      }
      return ROOM_STATUSES.occupied
    }
    // Unbooked unit of a multi-unit room → available even if other
    // units share the same room_id and are occupied.
    return ROOM_STATUSES.available
  }
  // Sort zones — bigger ones first so smaller ones (e.g. en-suite
  // bathrooms accidentally drawn inside a room) stay clickable on top.
  // Order doesn't change visuals because shapes don't overlap typically.
  const ordered = [...zones].sort((a, b) => {
    const aa = (a.w || 10) * (a.h || 10)
    const bb = (b.w || 10) * (b.h || 10)
    return bb - aa
  })

  return (
    <div className="rm-fp-view">
      {/* Compact header — no floors here yet; V7 is single-plan for now */}
      <div className="rm-fp-floors">
        <span className="rm-fp-floor-tab active">
          🗺 {property?.name || 'Floor plan'}
        </span>
      </div>
      <div className="rm-fp-canvas">
        <div
          className="rm-fp-v7-canvas"
          style={{
            position: 'relative',
            width: '100%',
            maxHeight: '70vh',
            overflow: 'hidden',
            borderRadius: 12,
            background: '#FAFBFC',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <img
            src={planUrl}
            alt="Floor plan"
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              filter: 'contrast(1.45) saturate(0) brightness(1.06)',
              opacity: 0.55,
              pointerEvents: 'none',
            }}
          />
          {/* SVG shapes layered above the image. ViewBox 0..100 lets
              us drop zone coordinates straight in without per-render
              math. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {ordered.map(z => {
              const s = statusFor(z)
              // Legacy V6 polygon
              if (Array.isArray(z.vertices) && z.vertices.length >= 3) {
                const points = z.vertices.map(v => `${v[0]},${v[1]}`).join(' ')
                return (
                  <polygon
                    key={z.id}
                    points={points}
                    fill={s.color}
                    fillOpacity={0.3}
                    stroke={s.color}
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              }
              // V7 circle
              if (z.shape === 'circle') {
                return (
                  <circle
                    key={z.id}
                    cx={z.cx} cy={z.cy} r={(z.w || 10) / 2}
                    fill={s.color}
                    fillOpacity={0.3}
                    stroke={s.color}
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              }
              // V7 rect / square
              return (
                <rect
                  key={z.id}
                  x={z.cx - z.w / 2} y={z.cy - z.h / 2}
                  width={z.w} height={z.h}
                  rx={0.8} ry={0.8}
                  fill={s.color}
                  fillOpacity={0.3}
                  stroke={s.color}
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
          {/* Clickable HTML overlays — one per zone with the room name
              + status pill. pointer-events on these only; the SVG is
              decorative. Sorted to put labels in front of shapes. */}
          {ordered.map(z => {
            const room = roomById.get(z.assigned_room_id)
            if (!room) return null
            const s = statusFor(z)
            const cx = z.cx ?? (Array.isArray(z.vertices)
              ? z.vertices.reduce((a, v) => a + v[0], 0) / z.vertices.length
              : 50)
            const cy = z.cy ?? (Array.isArray(z.vertices)
              ? z.vertices.reduce((a, v) => a + v[1], 0) / z.vertices.length
              : 50)
            const w  = z.w ?? 12
            const h  = z.h ?? 8
            return (
              <button
                key={`btn-${z.id}`}
                type="button"
                onClick={() => onPick(room)}
                title={`${room.name} · ${s.label}${room.guest_name ? ' · ' + room.guest_name : ''}`}
                style={{
                  position: 'absolute',
                  left:   `${cx - w / 2}%`,
                  top:    `${cy - h / 2}%`,
                  width:  `${w}%`,
                  height: `${h}%`,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '4px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: s.color,
                    color: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 0 0 2px #fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.sigil} {room.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FpRoom({ room, onPick }) {
  return (
    <button className={`rm-fp-room ${room.status}`} onClick={() => onPick(room)}
      title={`Room ${room.name} · ${room.type}`}>
      <div className="rm-fpr-num">{room.name}</div>
      <div className="rm-fpr-type">{(room.type || '').split(' ')[0]}</div>
      <div className="rm-fpr-status" />
    </button>
  )
}

// ── Side panel ──
function RoomPanel({ room, bookings, onClose, onSetStatus, onCheckIn }) {
  const today = isoDate(new Date())
  const active = bookings.find(b =>
    b.room_id === room.id && b.status !== 'cancelled' &&
    b.check_in <= today && b.check_out >= today)
  const s = ROOM_STATUSES[room.status] || ROOM_STATUSES.available
  const primary =
    room.status === 'checkout'    ? '🚪 Process Checkout'
  : room.status === 'available'   ? '✅ Quick Check In'
  : room.status === 'dirty'       ? '🧹 Assign Housekeeper'
  : room.status === 'maintenance' ? '🔧 Assign Technician'
  :                                 '👤 View Guest Profile'

  return (
    <aside className="rm-room-panel" onClick={e => e.stopPropagation()}>
      <div className="rm-rp-header">
        <div>
          <div className="rm-rp-num">Room {room.name}</div>
          <div className="rm-rp-type">{room.type} · Floor {room.floor}</div>
        </div>
        <button className="rm-rp-close" onClick={onClose}>✕</button>
      </div>

      <div className="rm-rp-status-row">
        {STATUS_KEYS.map(k => {
          const sk = ROOM_STATUSES[k]
          const cur = k === room.status
          return (
            <button key={k} className={`rm-rp-status-btn ${cur ? 'current' : ''}`}
              style={{
                borderColor: sk.color,
                background: cur ? sk.color : sk.bg,
                color: cur ? '#fff' : sk.text,
              }}
              onClick={() => onSetStatus(k)}>
              {sk.label}
            </button>
          )
        })}
      </div>

      <div className="rm-rp-info">
        <Row label="Status" value={s.label} valueStyle={{ color: s.color }} />
        {active?.guest_name && <Row label="Guest" value={active.guest_name} />}
        {room.nights > 0 && <Row label="Nights" value={room.nights} />}
        {active?.check_in && <Row label="Check-in" value={fmtDay(new Date(active.check_in))} />}
        {active?.check_out && <Row label="Check-out" value={fmtDay(new Date(active.check_out))} />}
      </div>

      <div className="rm-rp-actions">
        <button
          className="rm-rp-btn rm-rp-btn-primary"
          onClick={room.status === 'available' ? onCheckIn : undefined}
        >
          {primary}
        </button>
        <button className="rm-rp-btn rm-rp-btn-secondary" onClick={onClose}>Edit Reservation</button>
        <button className="rm-rp-btn rm-rp-btn-danger">Report Issue</button>
      </div>
    </aside>
  )
}

function Row({ label, value, valueStyle }) {
  return (
    <div className="rm-rp-row">
      <span className="rm-rp-label">{label}</span>
      <span className="rm-rp-val" style={valueStyle}>{value}</span>
    </div>
  )
}
