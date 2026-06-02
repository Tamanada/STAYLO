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

// ── STATUS TAXONOMY ───────────────────────────────────────────────
export const ROOM_STATUSES = {
  available:   { label: 'Available',    color: '#00B894', bg: '#E8F8F2', text: '#065F46', sigil: '🟢' },
  occupied:    { label: 'Occupied',     color: '#6C5CE7', bg: '#EEF2FF', text: '#3730A3', sigil: '🟣' },
  dirty:       { label: 'Dirty',        color: '#F4C542', bg: '#FFFBEB', text: '#92400E', sigil: '🟡' },
  maintenance: { label: 'Maintenance',  color: '#E74C3C', bg: '#FEF2F2', text: '#B91C1C', sigil: '🔴' },
  cleaning:    { label: 'Cleaning',     color: '#0984E3', bg: '#EFF6FF', text: '#1E40AF', sigil: '🔵' },
  checkout:    { label: 'Due Checkout', color: '#FF6B00', bg: '#FFF7ED', text: '#C2410C', sigil: '🟠' },
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

.rm-view{flex:1;overflow:auto}

/* Timeline */
.rm-tl-header{display:flex;background:white;border-bottom:1px solid #E8E0D8;position:sticky;top:0;z-index:2}
.rm-tl-room-col{width:140px;flex-shrink:0;padding:10px 14px;font-size:11px;font-weight:700;color:#636E72;text-transform:uppercase;letter-spacing:.05em;border-right:1px solid #E8E0D8}
.rm-tl-dates{flex:1;display:flex}
.rm-tl-day{flex:1;min-width:60px;text-align:center;padding:6px 4px;border-right:1px solid #F0EDE8;font-size:11px}
.rm-tl-day.today{background:#FFF5E6}
.rm-tl-day .rm-tl-dow{color:#636E72;font-weight:500;display:block}
.rm-tl-day .rm-tl-date{font-weight:700;color:#1A1F2E;font-size:13px}
.rm-tl-day.today .rm-tl-date{color:#FF6B00}
.rm-tl-row{display:flex;border-bottom:1px solid #F0EDE8;position:relative;height:44px;align-items:center;background:white}
.rm-tl-row:hover{background:#FAFAF8}
.rm-tl-room-info{width:140px;flex-shrink:0;padding:0 14px;border-right:1px solid #E8E0D8;display:flex;flex-direction:column;justify-content:center;height:100%}
.rm-tl-room-num{font-size:14px;font-weight:700;color:#1A1F2E}
.rm-tl-room-type{font-size:10px;color:#B2BEC3}
.rm-tl-grid{flex:1;position:relative;height:100%;display:flex}
.rm-tl-cell{flex:1;min-width:60px;border-right:1px solid #F0EDE8;position:relative;height:100%}
.rm-tl-cell.today{background:rgba(255,107,0,.04)}
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
.rm-info-pop{position:fixed;z-index:5000;width:1020px;max-width:96vw;background:#fff;border-radius:22px;box-shadow:0 24px 60px -10px rgba(26,31,46,.35),0 8px 24px -8px rgba(26,31,46,.15);border:1px solid rgba(26,31,46,.06);overflow:hidden;pointer-events:none;animation:rm-pop-in .15s ease-out}
/* Three-column body — receptionist sees everything in one glance.
   Packages got the WIDEST middle column so name + description + price
   are all on one line. David: "agrandir les polices, infos lisibles
   en un clin d'oeil". */
.rm-ip-cols{display:grid;grid-template-columns:200px 280px 1fr;gap:12px;padding:14px 16px 14px;max-height:68vh;overflow-y:auto}
.rm-ip-col{display:flex;flex-direction:column;gap:11px;min-width:0}
@keyframes rm-pop-in{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.rm-ip-header{padding:16px 18px;background:linear-gradient(135deg,#1A1F2E 0%,#2A1F4E 60%,#6C5CE7 110%);color:#fff;position:relative}
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
      let status = override
      if (!status) {
        if (active) status = active.check_out === today ? 'checkout' : 'occupied'
        else status = 'available'
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
  }, [rooms, bookings, statusOverrides, today])

  const counts = useMemo(() => {
    const c = { all: enrichedRooms.length }
    for (const k of STATUS_KEYS) c[k] = 0
    enrichedRooms.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [enrichedRooms])

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
                onPick={setSelectedRoom}
                onCheckIn={(room, date) => startWalkIn(room.id, date)} />
            ) : view === 'grid' ? (
              <GridView floorsMap={floorsMap} packagesByRoom={packagesByRoom}
                onPick={setSelectedRoom}
                onCheckIn={(room) => startWalkIn(room.id)} />
            ) : (
              <FloorPlanView floorsMap={floorsMap} activeFloor={activeFloor}
                setActiveFloor={setActiveFloor} property={property}
                packagesByRoom={packagesByRoom}
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
function RoomInfoPopover({ room, packages, x, y, side }) {
  const amenities = Array.isArray(room.amenities) ? room.amenities : []
  // Map amenity keys → human labels via AMENITY_META so "wifi" reads
  // as "Free WiFi" and "breakfast_included" → its proper label.
  // Falls back to the prettified key for any unknown amenity so the
  // chip still renders.
  const amenityChips = amenities.map(k => {
    const meta = AMENITY_META[k]
    return { key: k, label: meta?.label || prettyLabel(k), Icon: meta?.icon || null }
  })

  // "Side" lets the parent flip the popover left/right depending on
  // where the row sits in the viewport (so we never get cut off on
  // the right edge of large monitors).
  const style = { left: x, top: y }
  return (
    <div className="rm-info-pop" style={style} data-side={side}>
      <div className="rm-ip-header">
        <div className="rm-ip-eyebrow">Room details</div>
        <div className="rm-ip-title">{room.name}</div>
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
function TimelineView({ rooms, bookings, packagesByRoom, startDay, dates, todayDate, onPick, onCheckIn }) {
  const resByRoom = useMemo(() => {
    const m = new Map()
    const endDay = dates[dates.length - 1]
    bookings.forEach(b => {
      if (b.status === 'cancelled') return
      const ci = new Date(b.check_in); ci.setHours(0,0,0,0)
      const co = new Date(b.check_out); co.setHours(0,0,0,0)
      if (co < startDay || ci > endDay) return
      const startIdx = Math.max(0, Math.floor((ci - startDay) / 86400000))
      const endIdx   = Math.min(DAYS_SHOW, Math.ceil((co - startDay) / 86400000))
      if (endIdx <= startIdx) return
      const arr = m.get(b.room_id) || []
      arr.push({ ...b, startIdx, endIdx })
      m.set(b.room_id, arr)
    })
    return m
  }, [bookings, startDay, dates])
  const todayISO = isoDate(new Date())

  // Hover popover state — { room, x, y, side } | null. Coordinates
  // are computed from the row's bounding rect at mouseenter so the
  // popover anchors below/right of the room-info column and tracks
  // viewport edges (flips to the LEFT of the row if there's not
  // enough room on the right).
  const [hovered, setHovered] = useState(null)
  const closeTimerRef = useRef(null)

  function handleRowEnter(e, room) {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    const rowRect = e.currentTarget.getBoundingClientRect()
    const POPOVER_W = 1020
    const GAP = 12
    // Default: place popover to the RIGHT of the room-info col, just
    // below the row. If there isn't room (right edge cuts off), flip
    // to the LEFT side of the row.
    const roomColW = 180 // matches .rm-tl-room-info default width
    let x = rowRect.left + roomColW + GAP
    let side = 'right'
    if (x + POPOVER_W > window.innerWidth - 8) {
      x = Math.max(8, rowRect.left + roomColW - POPOVER_W - GAP)
      side = 'left'
    }
    // Vertically: align with the row top, but clamp so it never goes
    // above the viewport or off the bottom (where the popover would
    // get cut by the browser chrome).
    let y = rowRect.top
    const POPOVER_MAX_H = 480
    if (y + POPOVER_MAX_H > window.innerHeight - 8) {
      y = Math.max(8, window.innerHeight - POPOVER_MAX_H - 8)
    }
    setHovered({ room, x, y, side })
  }
  function handleRowLeave() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => { setHovered(null); closeTimerRef.current = null }, 80)
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
      {rooms.map(room => {
        const reservations = resByRoom.get(room.id) || []
        return (
          <div
            key={room.id}
            className="rm-tl-row"
            onMouseEnter={e => handleRowEnter(e, room)}
            onMouseLeave={handleRowLeave}
          >
            <div className="rm-tl-room-info">
              <div className="rm-tl-room-num">{room.name}</div>
              <div className="rm-tl-room-type">{room.type}</div>
            </div>
            <div className="rm-tl-grid">
              {dates.map((d, i) => {
                const isToday = d.toDateString() === todayDate.toDateString()
                // Clicking an empty cell launches the check-in modal
                // pre-filled with this room + the cell's date. The
                // reservation bars above sit on TOP of cells (z-index
                // in CSS) so they intercept their own clicks.
                return (
                  <div key={i}
                    className={`rm-tl-cell ${isToday ? 'today' : ''}`}
                    onClick={() => onCheckIn?.(room, isoDate(d))}
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
          x={hovered.x}
          y={hovered.y}
          side={hovered.side}
        />
      )}
    </>
  )
}

// ── Grid view ──
function GridView({ floorsMap, packagesByRoom, onPick }) {
  // Same hover popover wiring as Timeline — the card opens it, popover
  // is rendered once at the view root so we don't get N popovers
  // racing each other.
  const [hovered, setHovered] = useState(null)
  const closeTimerRef = useRef(null)

  function openFor(room, el) {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    const r = el.getBoundingClientRect()
    const POPOVER_W = 1020
    const GAP = 12
    let x = r.right + GAP
    let side = 'right'
    if (x + POPOVER_W > window.innerWidth - 8) {
      x = Math.max(8, r.left - POPOVER_W - GAP)
      side = 'left'
    }
    let y = r.top
    const POPOVER_MAX_H = 480
    if (y + POPOVER_MAX_H > window.innerHeight - 8) {
      y = Math.max(8, window.innerHeight - POPOVER_MAX_H - 8)
    }
    setHovered({ room, x, y, side })
  }
  function closeSoon() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => { setHovered(null); closeTimerRef.current = null }, 80)
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
                onHoverIn={el => openFor(r, el)}
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
          x={hovered.x}
          y={hovered.y}
          side={hovered.side}
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
function FloorPlanView({ floorsMap, activeFloor, setActiveFloor, property, onPick }) {
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
