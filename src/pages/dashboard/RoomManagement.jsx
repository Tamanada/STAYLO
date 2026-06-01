// ============================================
// Dashboard — Room Management module
// ============================================
// Operational view of all rooms for a property — distinct from the
// "Chambres" tab inside Gérer (which is CONFIG: add/edit room types,
// capacity, prices). This module is OPS: who is in which room right
// now, who's checking in/out, what's dirty, what's under maintenance.
//
// Three view modes (matches the reference HTML in docs/ui-refs/):
//   • Timeline (Gantt)   — rooms × 14 days, reservation bars
//   • Grid    (cards)    — rooms grouped by floor, status colors
//   • Floor Plan (map)   — top-down rooms positioned on a corridor
//
// Status taxonomy:
//   available · occupied · dirty · maintenance · cleaning · checkout
//
// Persistence:
//   - Rooms: existing `rooms` table (read-only here; edits live in
//     PropertyManage → Chambres tab).
//   - Bookings: existing `bookings` table, used to auto-derive
//     occupied / checkout status from check_in / check_out.
//   - Manual status overrides (dirty / cleaning / maintenance) are
//     stored in component state for the demo — a persistent
//     `room_status` table can come later without breaking this UI.
//
// Rendered inside PropertyLayout (route /dashboard/property/:id/rooms)
// so the 6-pill nav stays visible and the property header is shared.
// ============================================
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useOutletContext } from 'react-router-dom'
// CAREFUL: lucide-react exports `Map` (icon) which would shadow the
// global `Map` constructor used by useMemo's data grouping below.
// Always alias it (and any other globals like `Set`, `Date`) on import.
import {
  Calendar as CalendarIcon, Grid3x3, Map as MapIcon, Search,
  ChevronLeft, ChevronRight, X, BedDouble, User,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── STATUS TAXONOMY ───────────────────────────────────────────────
// Single source of truth. Each entry: label, color, text background,
// emoji-style sigil for badges. Order matters — used as the canonical
// list when rendering the status picker on the side panel.
export const ROOM_STATUSES = {
  available:   { key: 'available',   label: 'Available',    color: '#00B894', bg: '#E8F8F2', text: '#065F46', sigil: '🟢' },
  occupied:    { key: 'occupied',    label: 'Occupied',     color: '#6C5CE7', bg: '#EEF2FF', text: '#3730A3', sigil: '🟣' },
  dirty:       { key: 'dirty',       label: 'Dirty',        color: '#F4C542', bg: '#FFFBEB', text: '#92400E', sigil: '🟡' },
  maintenance: { key: 'maintenance', label: 'Maintenance',  color: '#E74C3C', bg: '#FEF2F2', text: '#B91C1C', sigil: '🔴' },
  cleaning:    { key: 'cleaning',    label: 'Cleaning',     color: '#0984E3', bg: '#EFF6FF', text: '#1E40AF', sigil: '🔵' },
  checkout:    { key: 'checkout',    label: 'Due Checkout', color: '#FF6B00', bg: '#FFF7ED', text: '#C2410C', sigil: '🟠' },
}
const STATUS_KEYS = Object.keys(ROOM_STATUSES)

const DAYS_LBL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS_LBL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDay = (d) => `${MONTHS_LBL[d.getMonth()]} ${d.getDate()}`
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export default function RoomManagement() {
  const { t } = useTranslation()
  const { id: propertyId } = useParams()
  // Property data passed by PropertyLayout — used for the corridor
  // label in the floor-plan view.
  const outletCtx = useOutletContext()
  const property = outletCtx?.property

  // ── State ────────────────────────────────────────────────────────
  const [view, setView] = useState('grid')   // 'timeline' | 'grid' | 'floorplan'
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  // Manual status overrides keyed by room.id. Lives in memory for the
  // demo — promotes to a `room_status` table when the back-office
  // wants persistence.
  const [statusOverrides, setStatusOverrides] = useState({})
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  // Selected room for the side panel
  const [selectedRoom, setSelectedRoom] = useState(null)
  // Timeline date window — starts today, walks ±7 days
  const [startDay, setStartDay] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })
  const DAYS_SHOW = 14
  // Currently-shown floor for the floor-plan view
  const [activeFloor, setActiveFloor] = useState(1)

  // ── Fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      const [roomsRes, bookingsRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('property_id', propertyId).order('name'),
        supabase.from('bookings').select('*').eq('property_id', propertyId),
      ])
      if (!cancelled) {
        setRooms(roomsRes.data || [])
        setBookings(bookingsRes.data || [])
        setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [propertyId])

  // ── Derive status per room ───────────────────────────────────────
  // Manual override wins; otherwise we look at active bookings.
  const today = isoDate(new Date())
  function deriveStatus(room) {
    if (statusOverrides[room.id]) return statusOverrides[room.id]
    const active = bookings.find(b =>
      b.room_id === room.id &&
      b.status !== 'cancelled' &&
      b.check_in  <= today &&
      b.check_out >= today,
    )
    if (active) return active.check_out === today ? 'checkout' : 'occupied'
    return 'available'
  }

  function setRoomStatus(roomId, status) {
    setStatusOverrides(s => ({ ...s, [roomId]: status }))
  }

  // ── Enrich rooms with derived status + matched guest ─────────────
  const enrichedRooms = useMemo(() => {
    return rooms.map(r => {
      const status = deriveStatus(r)
      const active = bookings.find(b =>
        b.room_id === r.id &&
        b.status !== 'cancelled' &&
        b.check_in  <= today &&
        b.check_out >= today,
      )
      const nights = active
        ? Math.max(1, Math.ceil((new Date(active.check_out) - new Date(active.check_in)) / 86400000))
        : 0
      return {
        ...r,
        status,
        floor: r.floor ?? Number(String(r.name || '').match(/^(\d)/)?.[1]) ?? 1,
        type: r.bed_type || r.name || 'Standard',
        guest: active?.guest_name || '',
        nights,
        checkin: active?.check_in || null,
        checkout: active?.check_out || null,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, bookings, statusOverrides])

  // ── Filters ──────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    return enrichedRooms.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${r.name} ${r.type} ${r.guest}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [enrichedRooms, statusFilter, typeFilter, search])

  // ── Status counts (for the toolbar chips) ────────────────────────
  const counts = useMemo(() => {
    const c = {}
    for (const k of STATUS_KEYS) c[k] = 0
    enrichedRooms.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [enrichedRooms])

  // ── Type list (for filter dropdown) ──────────────────────────────
  const types = useMemo(() => {
    return Array.from(new Set(enrichedRooms.map(r => r.type).filter(Boolean))).sort()
  }, [enrichedRooms])

  // ── Floors grouping ──────────────────────────────────────────────
  const floorsMap = useMemo(() => {
    const m = new Map()
    filteredRooms.forEach(r => {
      if (!m.has(r.floor)) m.set(r.floor, [])
      m.get(r.floor).push(r)
    })
    return new Map([...m.entries()].sort((a, b) => a[0] - b[0]))
  }, [filteredRooms])

  // ── Empty / loading states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }
  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BedDouble size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('rooms.empty_title', 'Aucune chambre configurée')}
        </h2>
        <p className="text-gray-500 mb-6">
          {t('rooms.empty_desc', 'Ajoute des chambres dans Gérer → Chambres pour les voir apparaître ici.')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
        {/* View switcher */}
        <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
          {[
            { key: 'timeline',  icon: CalendarIcon, label: t('rooms.view_timeline', 'Timeline') },
            { key: 'grid',      icon: Grid3x3,      label: t('rooms.view_grid',     'Grid') },
            { key: 'floorplan', icon: MapIcon,      label: t('rooms.view_floor',    'Floor Plan') },
          ].map(v => (
            <button key={v.key}
              onClick={() => setView(v.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === v.key ? 'bg-white text-deep shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <v.icon size={13} />
              {v.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-deep">
          <option value="all">🏠 {t('rooms.filter_all', 'All statuses')}</option>
          {STATUS_KEYS.map(k => (
            <option key={k} value={k}>{ROOM_STATUSES[k].sigil} {ROOM_STATUSES[k].label} ({counts[k] || 0})</option>
          ))}
        </select>

        {types.length > 1 && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-deep">
            <option value="all">🛏 {t('rooms.filter_types', 'All types')}</option>
            {types.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        )}

        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('rooms.search_placeholder', 'Search room, guest…')}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30"
          />
        </div>

        {/* Stat chips — right-aligned */}
        <div className="ml-auto flex gap-1.5 flex-wrap">
          {[
            ['available',   counts.available],
            ['occupied',    counts.occupied],
            ['dirty',       counts.dirty],
            ['maintenance', counts.maintenance],
          ].map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: ROOM_STATUSES[k].bg, color: ROOM_STATUSES[k].text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ROOM_STATUSES[k].color }} />
              {ROOM_STATUSES[k].label} {n}
            </span>
          ))}
        </div>
      </div>

      {/* ── View body ───────────────────────────────────────────── */}
      {view === 'grid' && (
        <GridView floorsMap={floorsMap} onPick={setSelectedRoom} />
      )}
      {view === 'timeline' && (
        <TimelineView
          rooms={filteredRooms} bookings={bookings}
          startDay={startDay} setStartDay={setStartDay} daysShow={DAYS_SHOW}
          onPick={setSelectedRoom}
        />
      )}
      {view === 'floorplan' && (
        <FloorPlanView
          floorsMap={floorsMap}
          activeFloor={activeFloor}
          setActiveFloor={setActiveFloor}
          property={property}
          onPick={setSelectedRoom}
        />
      )}

      {/* Side panel — slides over content */}
      {selectedRoom && (
        <RoomPanel
          room={selectedRoom}
          bookings={bookings}
          onClose={() => setSelectedRoom(null)}
          onSetStatus={(s) => {
            setRoomStatus(selectedRoom.id, s)
            // Refresh the panel's local view by replacing the selectedRoom
            setSelectedRoom(r => r ? { ...r, status: s } : r)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// VIEW — Grid (rooms grouped by floor)
// ============================================
function GridView({ floorsMap, onPick }) {
  const { t } = useTranslation()
  if (floorsMap.size === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
        {t('rooms.empty_filter', 'No rooms match the current filters.')}
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {[...floorsMap.entries()].map(([floor, list]) => (
        <section key={floor}>
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>{t('rooms.floor', 'Floor')} {floor}</span>
            <span className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 font-semibold">{list.length}</span>
          </h3>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {list.map(r => <RoomCard key={r.id} room={r} onPick={onPick} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function RoomCard({ room, onPick }) {
  const s = ROOM_STATUSES[room.status]
  const hkIcon = room.status === 'dirty' ? '🧹'
              : room.status === 'cleaning' ? '⏳'
              : room.status === 'maintenance' ? '🔧'
              : room.status === 'checkout' ? '🚪'
              : null
  return (
    <button
      type="button"
      onClick={() => onPick(room)}
      className="text-left bg-white rounded-xl p-3 border-2 transition-all hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden"
      style={{ borderColor: s.color + '40' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.color }} />
      {hkIcon && <div className="absolute top-2 right-2 text-base">{hkIcon}</div>}
      <div className="text-xl font-black text-deep leading-none">{room.name}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{room.type}</div>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-2"
        style={{ background: s.bg, color: s.text }}>
        {s.label}
      </span>
      {room.guest && (
        <div className="text-[11px] text-gray-600 mt-1.5 truncate flex items-center gap-1">
          <User size={10} /> {room.guest}
        </div>
      )}
      {room.nights > 0 && room.checkout && (
        <div className="text-[10px] text-gray-400 mt-0.5">
          {room.nights}N · CO {fmtDay(new Date(room.checkout))}
        </div>
      )}
    </button>
  )
}

// ============================================
// VIEW — Timeline (Gantt)
// ============================================
function TimelineView({ rooms, bookings, startDay, setStartDay, daysShow, onPick }) {
  const { t } = useTranslation()
  // Build the date columns once per startDay change.
  const dates = useMemo(() => {
    const arr = []
    for (let i = 0; i < daysShow; i++) {
      const d = new Date(startDay); d.setDate(d.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [startDay, daysShow])
  const today = new Date(); today.setHours(0,0,0,0)
  const endDay = dates[dates.length - 1]

  // Reservations indexed by room id — clipped to the visible window.
  const resByRoom = useMemo(() => {
    const m = new Map()
    bookings.forEach(b => {
      if (b.status === 'cancelled') return
      const ci = new Date(b.check_in); ci.setHours(0,0,0,0)
      const co = new Date(b.check_out); co.setHours(0,0,0,0)
      if (co < startDay || ci > endDay) return
      const startIdx = Math.max(0, Math.floor((ci - startDay) / 86400000))
      const endIdx   = Math.min(daysShow, Math.ceil((co - startDay) / 86400000))
      if (endIdx <= startIdx) return
      const arr = m.get(b.room_id) || []
      arr.push({ ...b, startIdx, endIdx })
      m.set(b.room_id, arr)
    })
    return m
  }, [bookings, startDay, endDay, daysShow])

  function shift(n) {
    const d = new Date(startDay); d.setDate(d.getDate() + n); setStartDay(d)
  }
  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0); setStartDay(d)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Date nav */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
          <button onClick={() => shift(-7)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <ChevronLeft size={14} />
          </button>
          <span>{fmtDay(startDay)} – {fmtDay(endDay)}</span>
          <button onClick={() => shift(7)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <ChevronRight size={14} />
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1 rounded-md bg-orange text-white text-[11px] font-bold">
          {t('rooms.today', 'Today')}
        </button>
      </div>

      {/* Header — Room | day cols */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-32 flex-shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-r border-gray-200">
          {t('rooms.room', 'Room')}
        </div>
        <div className="flex-1 flex">
          {dates.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i}
                className={`flex-1 min-w-[42px] text-center py-1.5 border-r border-gray-100 text-[10px] ${
                  isToday ? 'bg-orange/5' : ''
                }`}>
                <div className="text-gray-500">{DAYS_LBL[d.getDay()]}</div>
                <div className={`font-bold text-[12px] ${isToday ? 'text-orange' : 'text-deep'}`}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
        {rooms.map(room => {
          const reservations = resByRoom.get(room.id) || []
          return (
            <div key={room.id} className="flex border-b border-gray-100 h-11 items-center hover:bg-gray-50/60">
              <div className="w-32 flex-shrink-0 px-3 border-r border-gray-200">
                <div className="text-sm font-bold text-deep leading-tight">{room.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{room.type}</div>
              </div>
              <div className="flex-1 relative flex">
                {dates.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString()
                  return (
                    <div key={i} className={`flex-1 min-w-[42px] border-r border-gray-100 ${isToday ? 'bg-orange/5' : ''}`} />
                  )
                })}
                {reservations.map((b, i) => {
                  const cellW = 100 / daysShow
                  return (
                    <button key={i}
                      onClick={() => onPick(room)}
                      className="absolute h-7 top-1/2 -translate-y-1/2 rounded-md px-2 flex items-center text-[11px] font-semibold text-white truncate hover:opacity-85 transition-opacity"
                      style={{
                        left: `calc(${b.startIdx * cellW}% + 2px)`,
                        width: `calc(${(b.endIdx - b.startIdx) * cellW}% - 4px)`,
                        background: 'linear-gradient(135deg, #4C51BF, #6C5CE7)',
                      }}
                      title={`${b.guest_name || 'Guest'} · ${b.check_in} → ${b.check_out}`}
                    >
                      {b.guest_name || 'Guest'}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// VIEW — Floor Plan (top-down map)
// ============================================
function FloorPlanView({ floorsMap, activeFloor, setActiveFloor, property, onPick }) {
  const { t } = useTranslation()
  const floors = [...floorsMap.keys()]
  // If the saved active floor disappears (filtered out), fall back to first.
  const effective = floors.includes(activeFloor) ? activeFloor : floors[0]
  const floorRooms = floorsMap.get(effective) || []
  const half = Math.ceil(floorRooms.length / 2)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-200">
        {floors.map(f => (
          <button key={f}
            onClick={() => setActiveFloor(f)}
            className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              effective === f ? 'text-orange border-orange' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}>
            {t('rooms.floor', 'Floor')} {f}
          </button>
        ))}
      </div>
      <div className="p-6 bg-gray-50">
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-3xl mx-auto">
          {/* Top row of rooms */}
          <div className="flex gap-2.5 justify-center flex-wrap">
            {floorRooms.slice(0, half).map(r => <FpRoom key={r.id} room={r} onPick={onPick} />)}
          </div>
          {/* Corridor strip */}
          <div className="my-3 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
            — {property?.name || t('rooms.corridor', 'Corridor')} — Floor {effective} —
          </div>
          {/* Bottom row */}
          <div className="flex gap-2.5 justify-center flex-wrap">
            {floorRooms.slice(half).map(r => <FpRoom key={r.id} room={r} onPick={onPick} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function FpRoom({ room, onPick }) {
  const s = ROOM_STATUSES[room.status]
  return (
    <button onClick={() => onPick(room)}
      className="w-[88px] h-[70px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 relative"
      style={{ background: s.bg, borderColor: s.color + '80' }}
      title={`${room.name} · ${room.type} · ${s.label}${room.guest ? ' · ' + room.guest : ''}`}
    >
      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: s.color }} />
      <div className="text-base font-black" style={{ color: s.text }}>{room.name}</div>
      <div className="text-[9px] font-semibold uppercase opacity-60" style={{ color: s.text }}>
        {(room.type || '').split(' ')[0]}
      </div>
    </button>
  )
}

// ============================================
// Room Side Panel
// ============================================
function RoomPanel({ room, bookings, onClose, onSetStatus }) {
  const { t } = useTranslation()
  const s = ROOM_STATUSES[room.status]
  const active = bookings.find(b =>
    b.room_id === room.id && b.status !== 'cancelled' &&
    b.check_in <= isoDate(new Date()) && b.check_out >= isoDate(new Date()),
  )
  const primaryLabel = room.status === 'checkout'    ? `🚪 ${t('rooms.action_checkout', 'Process checkout')}`
                     : room.status === 'available'   ? `✅ ${t('rooms.action_checkin', 'Quick check in')}`
                     : room.status === 'dirty'       ? `🧹 ${t('rooms.action_clean', 'Assign housekeeper')}`
                     : room.status === 'maintenance' ? `🔧 ${t('rooms.action_tech', 'Assign technician')}`
                     :                                 `👤 ${t('rooms.action_guest', 'View guest profile')}`

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      {/* Panel */}
      <aside
        className="fixed right-4 top-20 w-[300px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 p-5"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-deep leading-none">
              {t('rooms.room', 'Room')} {room.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{room.type} · {t('rooms.floor', 'Floor')} {room.floor}</div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
            <X size={14} />
          </button>
        </header>

        {/* Status picker — sigil pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUS_KEYS.map(k => {
            const sk = ROOM_STATUSES[k]
            const current = k === room.status
            return (
              <button key={k}
                onClick={() => onSetStatus(k)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all"
                style={{
                  borderColor: sk.color,
                  color: current ? '#fff' : sk.text,
                  background: current ? sk.color : sk.bg,
                }}>
                {sk.label}
              </button>
            )
          })}
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 mb-4 text-[12px]">
          <Row label={t('rooms.status', 'Status')} value={s.label} valueStyle={{ color: s.color }} />
          {active?.guest_name && <Row label={t('rooms.guest', 'Guest')} value={active.guest_name} />}
          {room.nights > 0 && <Row label={t('rooms.nights', 'Nights')} value={room.nights} />}
          {active?.check_in && <Row label={t('rooms.checkin', 'Check-in')} value={fmtDay(new Date(active.check_in))} />}
          {active?.check_out && <Row label={t('rooms.checkout_label', 'Check-out')} value={fmtDay(new Date(active.check_out))} />}
        </div>

        {/* Actions */}
        <div className="space-y-1.5">
          <button
            className="w-full py-2.5 rounded-xl text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)' }}
          >
            {primaryLabel}
          </button>
          <button className="w-full py-2.5 rounded-xl bg-gray-100 text-deep text-xs font-bold border border-gray-200"
            onClick={onClose}>
            ✎ {t('rooms.edit_reservation', 'Edit reservation')}
          </button>
          <button className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-200">
            <AlertTriangle size={12} className="inline mr-1" /> {t('rooms.report_issue', 'Report issue')}
          </button>
        </div>
      </aside>
    </>
  )
}

function Row({ label, value, valueStyle }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-deep" style={valueStyle}>{value}</span>
    </div>
  )
}
