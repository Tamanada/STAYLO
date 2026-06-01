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
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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
/* Full-viewport takeover — covers the STAYLO dashboard sidebar so
   we don't double up the chrome. z-index above the dashboard layout.
   The sidebar collapses to 0 width when retracted; transition keeps
   the slide smooth. Logo zone follows the same width so the topbar
   logo doesn't float in mid-air. */
.rm-shell{position:fixed;inset:0;z-index:50;display:grid;grid-template-columns:220px 1fr;grid-template-rows:56px 1fr;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F0EDE8;color:#1A1F2E;transition:grid-template-columns .25s ease}
.rm-shell.collapsed{grid-template-columns:0 1fr}
.rm-shell.collapsed .rm-topbar-logo{width:0;padding:0;border-right:none;opacity:0;overflow:hidden}
.rm-topbar-logo{transition:width .25s ease, padding .25s ease, opacity .25s ease}
.rm-sidebar-toggle{width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:none;border-radius:8px;cursor:pointer;margin:0 8px 0 12px;flex-shrink:0;transition:all .12s}
.rm-sidebar-toggle:hover{background:rgba(255,255,255,.15);color:white}
.rm-topbar{grid-column:1/-1;background:#1A1F2E;display:flex;align-items:center;gap:0;padding:0;border-bottom:1px solid rgba(255,255,255,.08)}
.rm-topbar-logo{width:220px;padding:0 20px;font-size:20px;font-weight:900;color:white;border-right:1px solid rgba(255,255,255,.08)}
.rm-topbar-logo b{color:#FF6B00}
.rm-topbar-nav{display:flex;height:100%}
.rm-tnav{padding:0 20px;font-size:13px;font-weight:600;color:rgba(255,255,255,.5);cursor:pointer;display:flex;align-items:center;border-bottom:2px solid transparent;transition:all .15s;text-decoration:none}
.rm-tnav:hover{color:rgba(255,255,255,.8)}
.rm-tnav.active{color:white;border-bottom-color:#FF6B00}
.rm-topbar-right{margin-left:auto;padding:0 20px;display:flex;align-items:center;gap:12px}
.rm-date-nav{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.7)}
.rm-date-btn{width:26px;height:26px;border-radius:6px;background:rgba(255,255,255,.1);border:none;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.rm-date-btn:hover{background:rgba(255,255,255,.2)}
.rm-today-btn{padding:4px 12px;border-radius:6px;background:#FF6B00;border:none;color:white;font-size:12px;font-weight:700;cursor:pointer}

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
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusOverrides, setStatusOverrides] = useState({})
  // Filters
  const [sideStatusFilter, setSideStatusFilter] = useState('all')   // sidebar: all | available | occupied | dirty | maintenance
  const [sideTypeFilter, setSideTypeFilter] = useState('all')
  const [needsActionOnly, setNeedsActionOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  // Timeline window
  const [startDay, setStartDay] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  // Floor plan
  const [activeFloor, setActiveFloor] = useState(null)
  // Today (re-evaluated only when needed)
  const today = isoDate(new Date())

  // ── Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      const [propRes, roomsRes, bookingsRes] = await Promise.all([
        supabase.from('properties').select('id, name, city, country, status').eq('id', propertyId).maybeSingle(),
        supabase.from('rooms').select('*').eq('property_id', propertyId).order('name'),
        supabase.from('bookings').select('*').eq('property_id', propertyId),
      ])
      if (cancelled) return
      setProperty(propRes.data || null)
      setRooms(roomsRes.data || [])
      setBookings(bookingsRes.data || [])
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [propertyId])

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
        {/* ── TOPBAR ──────────────────────────────────────────── */}
        <div className="rm-topbar">
          <div className="rm-topbar-logo">Stay<b>lo</b></div>
          {/* Sidebar toggle — slides the dark left panel away when the
              hotelier needs more real estate (e.g. on a wide Timeline
              grid). Position right after the logo so it's the first
              thing the eye finds when looking for a way to free up
              space. Persists choice in localStorage. */}
          <button className="rm-sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="rm-topbar-nav">
            <Link to="/dashboard" className="rm-tnav">Dashboard</Link>
            <span className="rm-tnav active">Rooms</span>
            <Link to={`/dashboard/property/${propertyId}/incoming-bookings`} className="rm-tnav">Reservations</Link>
            <Link to={`/dashboard/property/${propertyId}/housekeeping`} className="rm-tnav">Housekeeping</Link>
            <Link to={`/dashboard/property/${propertyId}/reports`} className="rm-tnav">Reports</Link>
          </div>
          <div className="rm-topbar-right">
            <div className="rm-date-nav">
              <button className="rm-date-btn" onClick={() => shift(-7)}>‹</button>
              <span>{fmtDay(startDay)} – {fmtDay(endDay)}</span>
              <button className="rm-date-btn" onClick={() => shift(7)}>›</button>
            </div>
            <button className="rm-today-btn" onClick={goToday}>Today</button>
          </div>
        </div>

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
            <div className="rm-view-tabs">
              <button className={`rm-vtab ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>📅 Timeline</button>
              <button className={`rm-vtab ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>⬛ Grid</button>
              <button className={`rm-vtab ${view === 'floorplan' ? 'active' : ''}`} onClick={() => setView('floorplan')}>🗺 Floor Plan</button>
            </div>
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
                onPick={setSelectedRoom} />
            ) : view === 'grid' ? (
              <GridView floorsMap={floorsMap} onPick={setSelectedRoom} />
            ) : (
              <FloorPlanView floorsMap={floorsMap} activeFloor={activeFloor}
                setActiveFloor={setActiveFloor} property={property}
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
            />
          </>
        )}
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

// ── Timeline view ──
function TimelineView({ rooms, bookings, startDay, dates, todayDate, onPick }) {
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
          <div key={room.id} className="rm-tl-row">
            <div className="rm-tl-room-info">
              <div className="rm-tl-room-num">{room.name}</div>
              <div className="rm-tl-room-type">{room.type}</div>
            </div>
            <div className="rm-tl-grid">
              {dates.map((d, i) => {
                const isToday = d.toDateString() === todayDate.toDateString()
                return <div key={i} className={`rm-tl-cell ${isToday ? 'today' : ''}`} />
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
    </>
  )
}

// ── Grid view ──
function GridView({ floorsMap, onPick }) {
  if (floorsMap.size === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#636E72' }}>No rooms match the current filters.</div>
  }
  return (
    <div className="rm-grid-view">
      {[...floorsMap.entries()].map(([floor, list]) => (
        <section key={floor} className="rm-floor-section">
          <div className="rm-floor-title">Floor {floor}</div>
          <div className="rm-rooms-grid">
            {list.map(r => <GridCard key={r.id} room={r} onPick={onPick} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function GridCard({ room, onPick }) {
  const s = ROOM_STATUSES[room.status] || ROOM_STATUSES.available
  const hk = room.status === 'dirty' ? '🧹'
          : room.status === 'cleaning' ? '⏳'
          : room.status === 'maintenance' ? '🔧'
          : room.status === 'checkout' ? '🚪'
          : ''
  return (
    <button className={`rm-room-card ${room.status}`} onClick={() => onPick(room)}>
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
function RoomPanel({ room, bookings, onClose, onSetStatus }) {
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
        <button className="rm-rp-btn rm-rp-btn-primary">{primary}</button>
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
