import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BedDouble, Users, LogIn, LogOut, Clock, AlertCircle,
  ChevronLeft, ChevronRight, Building2, Phone, Mail, Search,
  Calendar as CalendarIcon, UserPlus, X, Save, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import PhoneInput from '../../components/ui/PhoneInput'
import UndoToast from '../../components/ui/UndoToast'

const STATUS_CONFIG = {
  available:   { label: 'Available',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  partial:     { label: 'Partly Occupied',  color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400' },
  occupied:    { label: 'Fully Occupied',   color: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  checkout:    { label: 'Check-out Today',  color: 'bg-amber-100 text-amber-700 border-amber-200',      dot: 'bg-amber-500' },
  arriving:    { label: 'Arriving Today',   color: 'bg-purple-100 text-purple-700 border-purple-200',   dot: 'bg-purple-500' },
  maintenance: { label: 'Maintenance',      color: 'bg-gray-100 text-gray-500 border-gray-200',         dot: 'bg-gray-400' },
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PMSFrontDesk() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [viewMode, setViewMode] = useState('cards')   // 'cards' | 'grid' | 'calendar'
  const [calStartOffset, setCalStartOffset] = useState(0)  // days from today; user can page
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date().toISOString().split('T')[0])
  const [openRoom, setOpenRoom] = useState(null)   // room object whose modal is open
  const [undo, setUndo] = useState(null)           // last reversible action (walk-in / etc.)

  async function fetchData() {
    setLoading(true)
    const { data: props } = await supabase
      .from('properties').select('*').eq('user_id', user.id).order('created_at')
    setProperties(props || [])
    if (props?.length > 0 && !selectedProperty) setSelectedProperty(props[0].id)

    const propIds = (props || []).map(p => p.id)
    if (propIds.length > 0) {
      const [roomsRes, bookingsRes] = await Promise.all([
        supabase.from('rooms').select('*').in('property_id', propIds),
        // Pull every booking that intersects today or any future date — needed
        // for the per-room calendar view in the modal.
        supabase.from('bookings').select('*').in('property_id', propIds)
          .in('status', ['pending', 'confirmed', 'checked_in']),
      ])
      setRooms(roomsRes.data || [])
      setBookings(bookingsRes.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const currentProperty = properties.find(p => p.id === selectedProperty)
  const propertyRooms = rooms.filter(r => r.property_id === selectedProperty)

  // Compute live stock & status per ROOM TYPE.
  // Each row in `rooms` is a TYPE with a `quantity` (e.g. Jungle ×3 = 3
  // physical units). The card header shows aggregate stock (e.g. "1/3
  // occupied"), and we surface today's notable activity (arrivals and
  // check-outs) so the receptionist sees the day at a glance.
  const roomStatuses = useMemo(() => {
    return propertyRooms.map(room => {
      const qty = Math.max(1, Number(room.quantity) || 1)
      const roomBookings = bookings.filter(b => b.room_id === room.id)
      const occupiedToday   = roomBookings.filter(b => b.check_in <= today && b.check_out >  today)
      const checkingOutToday = roomBookings.filter(b => b.check_out === today)
      const arrivingToday    = roomBookings.filter(b => b.check_in  === today)

      const occupiedCount = occupiedToday.length
      const availableCount = Math.max(0, qty - occupiedCount)

      // Card-level visual status — picks the most "active" thing happening today
      let status = 'available'
      if (occupiedCount >= qty) status = 'occupied'         // all units full
      else if (occupiedCount > 0) status = 'partial'        // mixed
      if (checkingOutToday.length > 0) status = 'checkout'
      if (arrivingToday.length > 0 && status === 'available') status = 'arriving'

      return {
        ...room,
        qty,
        occupiedCount,
        availableCount,
        arrivingCount:    arrivingToday.length,
        checkingOutCount: checkingOutToday.length,
        guests:           occupiedToday,                    // array of in-stay bookings (may be 0..qty)
        arrivingList:     arrivingToday,
        checkingOutList:  checkingOutToday,
        status,
      }
    })
  }, [propertyRooms, bookings, today])

  // ── Per-physical-unit grid view ────────────────────────────────────────────
  // Each room TYPE is exploded into one row per physical unit. The unit
  // identifier comes from rooms.unit_numbers (configured in PropertyManage).
  // If the pool isn't filled, we synthesise '#1, #2, …' up to room.quantity
  // so the receptionist still sees the right number of rows.
  // Booking↔unit mapping:
  //   - Numbered units: exact match against booking.room_number
  //   - Synthetic units: bookings without an assigned room_number are spread
  //     across remaining slots in arrival order (first occupied → #1 etc.)
  const unitRows = useMemo(() => {
    const rows = []
    for (const r of roomStatuses) {
      const numbered = Array.isArray(r.unit_numbers) ? r.unit_numbers : []
      const totalUnits = Math.max(numbered.length, r.qty)
      const labels = []
      for (let i = 0; i < totalUnits; i++) {
        labels.push(numbered[i] || `#${i + 1}`)
      }

      // Bucket bookings by their assigned room_number (exact match)
      const byNumber = new Map()
      const unassigned = []
      const allRelevant = [...r.guests, ...r.arrivingList, ...r.checkingOutList]
        .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i) // dedupe
      for (const b of allRelevant) {
        if (b.room_number && labels.includes(b.room_number)) {
          if (!byNumber.has(b.room_number)) byNumber.set(b.room_number, [])
          byNumber.get(b.room_number).push(b)
        } else {
          unassigned.push(b)
        }
      }

      for (const label of labels) {
        let booking = byNumber.get(label)?.[0] || null
        // Pull from unassigned pool if this slot is still free (in label order)
        if (!booking && unassigned.length > 0) booking = unassigned.shift()

        let unitStatus = 'available'
        if (booking) {
          if (booking.check_in === today)        unitStatus = 'arriving'
          else if (booking.check_out === today)  unitStatus = 'checkout'
          else if (booking.check_in <= today && booking.check_out > today) unitStatus = 'occupied'
        }

        rows.push({
          key:        `${r.id}::${label}`,
          roomTypeId: r.id,
          roomType:   r.name,
          bedType:    r.bed_type,
          unitLabel:  label,
          numbered:   numbered.includes(label),
          status:     unitStatus,
          booking,
        })
      }
    }
    return rows
  }, [roomStatuses, today])

  // ── Calendar (rack-chart) view: 14-day window, 1 row per physical unit ────
  const CAL_DAYS = 14
  const windowDays = useMemo(() => {
    const arr = []
    const start = new Date(today + 'T00:00:00Z')
    start.setUTCDate(start.getUTCDate() + calStartOffset)
    for (let i = 0; i < CAL_DAYS; i++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      arr.push(d.toISOString().slice(0, 10))
    }
    return arr
  }, [today, calStartOffset])

  // O(1) bookings-by-room-type lookup
  const bookingsByType = useMemo(() => {
    const m = new Map()
    for (const b of bookings) {
      if (!m.has(b.room_id)) m.set(b.room_id, [])
      m.get(b.room_id).push(b)
    }
    return m
  }, [bookings])

  // For each day, allocate bookings to physical units the same way the
  // grid view does for "today" — numbered units take exact matches first,
  // unassigned bookings spread to remaining slots in arrival order.
  // Returns { [dateStr]: { [unitKey]: booking | undefined } }
  const dailyAllocations = useMemo(() => {
    const result = {}
    // Group units by type for efficient per-day processing
    const unitsByType = {}
    for (const u of unitRows) {
      if (!unitsByType[u.roomTypeId]) unitsByType[u.roomTypeId] = []
      unitsByType[u.roomTypeId].push(u)
    }
    for (const day of windowDays) {
      const dayMap = {}
      for (const [typeId, units] of Object.entries(unitsByType)) {
        const covering = (bookingsByType.get(typeId) || []).filter(b =>
          b.check_in <= day && b.check_out > day
        )
        const assigned = new Set()
        // Numbered units take exact matches first
        for (const u of units) {
          if (u.numbered) {
            const b = covering.find(x => x.room_number === u.unitLabel && !assigned.has(x.id))
            if (b) { dayMap[u.key] = b; assigned.add(b.id) }
          }
        }
        // Spread remaining bookings to leftover slots in label order
        const leftover = covering.filter(b => !assigned.has(b.id))
        for (const u of units) {
          if (dayMap[u.key]) continue
          const b = leftover.shift()
          if (b) dayMap[u.key] = b
        }
      }
      result[day] = dayMap
    }
    return result
  }, [windowDays, unitRows, bookingsByType])

  // Stats — sum across types using each type's quantity, not row count.
  const totalRooms     = roomStatuses.reduce((s, r) => s + r.qty, 0)
  const occupied       = roomStatuses.reduce((s, r) => s + r.occupiedCount, 0)
  const available      = roomStatuses.reduce((s, r) => s + r.availableCount, 0)
  const arriving       = roomStatuses.reduce((s, r) => s + r.arrivingCount, 0)
  const checkingOut    = roomStatuses.reduce((s, r) => s + r.checkingOutCount, 0)
  const occupancyRate  = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('pms.no_properties', 'No properties to manage')}</h2>
        <p className="text-gray-500 mb-6">{t('pms.add_first', 'Register your first property to access the PMS.')}</p>
        <Link to="/submit" className="px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline">
          {t('pms.add_property', 'Add Property')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('pms.front_desk', 'Front Desk')}</h1>
          <p className="text-sm text-gray-500">{formatDate(today)}</p>
        </div>

        {/* Property selector */}
        {properties.length > 1 && (
          <select value={selectedProperty || ''} onChange={e => setSelectedProperty(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 min-w-[200px]">
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-extrabold text-gray-900">{totalRooms}</p>
          <p className="text-xs text-gray-500 font-medium">{t('pms.total_rooms', 'Total Rooms')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-extrabold text-blue-600">{occupied}</p>
          <p className="text-xs text-gray-500 font-medium">{t('pms.occupied', 'Occupied')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-extrabold text-emerald-600">{available}</p>
          <p className="text-xs text-gray-500 font-medium">{t('pms.available', 'Available')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-extrabold text-purple-600">{arriving}</p>
          <p className="text-xs text-gray-500 font-medium">{t('pms.arriving', 'Arriving')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-extrabold text-amber-600">{checkingOut}</p>
          <p className="text-xs text-gray-500 font-medium">{t('pms.checking_out', 'Checking Out')}</p>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-900">{t('pms.occupancy', 'Occupancy Rate')}</span>
          <span className="text-2xl font-extrabold text-gray-900">{occupancyRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${occupancyRate}%`,
            background: occupancyRate > 80 ? '#10b981' : occupancyRate > 50 ? '#3b82f6' : '#f59e0b',
          }} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* View toggle — Cards (by type) ↔ Grid (by physical unit) */}
      {roomStatuses.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">View:</span>
          <button onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'cards'
                ? 'bg-deep text-white shadow'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            🗂️ Cards (by type)
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-deep text-white shadow'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            📊 Grid (by unit · {unitRows.length} rows)
          </button>
          <button onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'calendar'
                ? 'bg-deep text-white shadow'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            📅 Calendar (rack · {CAL_DAYS} days)
          </button>
        </div>
      )}

      {/* Room grid */}
      {roomStatuses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">{t('pms.no_rooms', 'No rooms configured')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('pms.add_rooms_first', 'Add rooms in Property Management to use the Front Desk.')}</p>
          <Link to={`/dashboard/property/${selectedProperty}`}
            className="px-4 py-2 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline inline-block">
            {t('pms.manage_rooms', 'Manage Rooms')}
          </Link>
        </div>
      ) : viewMode === 'calendar' ? (
        // ── Rack-chart calendar: rows = units, cols = days, cells = status
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Window pager */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <button onClick={() => setCalStartOffset(o => o - CAL_DAYS)}
              className="px-2 py-1 rounded hover:bg-white text-xs font-semibold text-gray-600">
              ← Earlier
            </button>
            <span className="text-xs font-bold text-gray-700">
              {windowDays[0]} → {windowDays[windowDays.length - 1]}
              {calStartOffset !== 0 && (
                <button onClick={() => setCalStartOffset(0)}
                  className="ml-2 text-libre underline font-normal">jump to today</button>
              )}
            </span>
            <button onClick={() => setCalStartOffset(o => o + CAL_DAYS)}
              className="px-2 py-1 rounded hover:bg-white text-xs font-semibold text-gray-600">
              Later →
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header row — date columns */}
              <div className="grid border-b border-gray-200"
                style={{ gridTemplateColumns: `200px repeat(${CAL_DAYS}, minmax(72px, 1fr))` }}>
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 sticky left-0 z-10 border-r border-gray-200">
                  Unit / Type
                </div>
                {windowDays.map(d => {
                  const dt = new Date(d + 'T00:00:00Z')
                  const isToday = d === today
                  const isWeekend = [0, 6].includes(dt.getUTCDay())
                  return (
                    <div key={d}
                      className={`px-1 py-1.5 text-center text-[10px] font-semibold border-l border-gray-100 ${
                        isToday ? 'bg-libre/15 text-libre'
                        : isWeekend ? 'bg-gray-50 text-gray-500'
                        : 'bg-white text-gray-600'
                      }`}>
                      <div>{dt.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}</div>
                      <div className={`text-base ${isToday ? 'font-extrabold' : 'font-bold'}`}>
                        {dt.getUTCDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Body — one row per unit */}
              {unitRows.map(u => (
                <div key={u.key} className="grid border-b border-gray-100 hover:bg-gray-50/40"
                  style={{ gridTemplateColumns: `200px repeat(${CAL_DAYS}, minmax(72px, 1fr))` }}>
                  <div className="px-3 py-1.5 text-xs sticky left-0 z-10 bg-white border-r border-gray-200">
                    <div className={`font-mono font-bold ${u.numbered ? 'text-deep' : 'text-gray-400 italic'}`}>
                      {u.unitLabel}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{u.roomType}</div>
                  </div>
                  {windowDays.map(d => {
                    const b = dailyAllocations[d]?.[u.key]
                    let bg = 'bg-emerald-50'   // free
                    let txt = ''
                    let title = ''
                    if (b) {
                      const lastNight = (() => {
                        const dt = new Date(b.check_out + 'T00:00:00Z')
                        dt.setUTCDate(dt.getUTCDate() - 1)
                        return dt.toISOString().slice(0, 10)
                      })()
                      if (b.check_in === d)      { bg = 'bg-purple-200 text-purple-900'; }
                      else if (lastNight === d)  { bg = 'bg-amber-200 text-amber-900'; }
                      else                       { bg = 'bg-blue-200 text-blue-900'; }
                      // Show guest name only on the FIRST day of the stay so it
                      // doesn't repeat across cells (visually feels like a bar)
                      if (b.check_in === d) txt = (b.guest_name || '?').split(' ')[0].slice(0, 8)
                      title = `${b.guest_name || 'no name'} · ${b.check_in} → ${b.check_out}`
                    }
                    const isToday = d === today
                    return (
                      <div key={d}
                        title={title || (u.roomType + ' — ' + d)}
                        onClick={() => {
                          const room = roomStatuses.find(r => r.id === u.roomTypeId)
                          if (room) setOpenRoom(room)
                        }}
                        className={`relative h-9 border-l border-gray-100 text-[10px] font-bold flex items-center justify-center cursor-pointer ${bg} ${isToday ? 'ring-1 ring-inset ring-libre/40' : ''}`}>
                        {txt}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Mini-legend */}
          <div className="bg-gray-50 px-3 py-2 text-[11px] text-gray-500 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-gray-200" /> free</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-200" /> arriving</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200" /> in-stay</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> last night</span>
            <span className="text-gray-400">· click a cell to open the unit</span>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        // ── Per-unit table view ─────────────────────────────────────────────
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Guest</th>
                  <th className="px-3 py-2 text-left">Dates</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unitRows.map(u => {
                  const cfg = STATUS_CONFIG[u.status]
                  return (
                    <tr key={u.key} className="border-t border-gray-100 hover:bg-gray-50/60">
                      <td className="px-3 py-2 font-mono font-bold text-deep">
                        {u.numbered
                          ? u.unitLabel
                          : <span className="text-gray-400 italic">{u.unitLabel}</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{u.roomType}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded ${cfg.color}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {u.booking
                          ? (u.booking.guest_name || <span className="text-gray-400 italic">no name</span>)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 font-mono">
                        {u.booking
                          ? `${u.booking.check_in} → ${u.booking.check_out}`
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => {
                            const room = roomStatuses.find(r => r.id === u.roomTypeId)
                            if (room) setOpenRoom(room)
                          }}
                          className="text-[11px] font-semibold text-ocean hover:underline">
                          {u.booking ? 'Manage' : 'Walk-in'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-3 py-2 text-[11px] text-gray-500 border-t border-gray-100">
            {unitRows.length} units · numbered shown in mono · italic = synthetic placeholder (configure unit numbers in PropertyManage)
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {roomStatuses.map((room, idx) => {
            const cfg = STATUS_CONFIG[room.status]
            return (
              <button key={room.id}
                onClick={() => setOpenRoom(room)}
                className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${cfg.color}`}
                title={t('pms.click_to_manage', 'Click to view calendar / check in a guest')}>
                {/* Room header — name + live X / Y stock badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-extrabold truncate">{room.name}</span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-extrabold tabular-nums px-2 py-0.5 rounded bg-white/70 border border-current/15"
                      title={`${room.availableCount} of ${room.qty} units available`}>
                      {room.availableCount}/{room.qty}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  </span>
                </div>

                {/* Status */}
                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">{cfg.label}</p>

                {/* Room info */}
                <div className="flex items-center gap-2 text-[11px] opacity-60 mb-2">
                  <span className="flex items-center gap-0.5"><BedDouble size={10} /> {room.bed_type || 'Standard'}</span>
                  <span className="flex items-center gap-0.5"><Users size={10} /> {room.max_guests || 2}</span>
                </div>

                {/* Guest list — show up to 2 in-stay guests, then a +N overflow */}
                {room.guests && room.guests.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
                    {room.guests.slice(0, 2).map(g => (
                      <div key={g.id}>
                        <p className="text-xs font-bold truncate">{g.guest_name || 'Guest'}</p>
                        <p className="text-[10px] opacity-60">{g.check_in} → {g.check_out}</p>
                      </div>
                    ))}
                    {room.guests.length > 2 && (
                      <p className="text-[10px] opacity-60 italic">+{room.guests.length - 2} more in-stay</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 flex gap-1.5">
                  {room.arrivingCount > 0 && (
                    <span className="flex-1 py-1.5 bg-white/60 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <LogIn size={10} /> {room.arrivingCount > 1 ? `${room.arrivingCount} Check-Ins` : 'Check In'}
                    </span>
                  )}
                  {room.checkingOutCount > 0 && (
                    <span className="flex-1 py-1.5 bg-white/60 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <LogOut size={10} /> {room.checkingOutCount > 1 ? `${room.checkingOutCount} Check-Outs` : 'Check Out'}
                    </span>
                  )}
                  {room.availableCount > 0 && room.arrivingCount === 0 && room.checkingOutCount === 0 && (
                    <span className="flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center justify-center gap-1">
                      <UserPlus size={10} /> Walk-in ({room.availableCount} free)
                    </span>
                  )}
                  {room.status === 'occupied' && room.arrivingCount === 0 && room.checkingOutCount === 0 && (
                    <span className="flex-1 py-1.5 text-center text-[10px] font-medium opacity-50 flex items-center justify-center gap-1">
                      <Clock size={10} /> Full house
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Room detail modal: calendar + walk-in check-in form */}
      <RoomDetailModal
        room={openRoom}
        onClose={() => setOpenRoom(null)}
        bookings={openRoom ? bookings.filter(b => b.room_id === openRoom.id) : []}
        propertyId={selectedProperty}
        userId={user?.id}
        onSaved={() => { fetchData(); setOpenRoom(null) }}
        onUndoOffer={setUndo}
      />

      {/* Undo toast — appears for 30s after any reversible action (walk-in, etc.) */}
      <UndoToast undo={undo} onClose={() => setUndo(null)} />
    </div>
  )
}

// ============================================================================
// RoomDetailModal — opens when the front desk clicks any room card.
// Two tabs:
//   1. Calendar — 30-day view, shows which days are booked / free / arrival
//   2. Walk-in  — quick check-in form for guests showing up unannounced
// ============================================================================
function RoomDetailModal({ room, onClose, bookings, propertyId, userId, onSaved, onUndoOffer }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('calendar')

  // Reset to calendar tab whenever a new room is opened
  useEffect(() => {
    if (room) setTab('calendar')
  }, [room?.id])

  if (!room) return null

  return (
    <Modal open={!!room} onClose={onClose} title={`${room.name} · ${prettyType(room.type)}`}>
      <div className="space-y-4">
        {/* Quick room facts */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><BedDouble size={13} /> {prettyType(room.bed_type) || 'Standard'}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {room.max_guests || 2} {t('pms.guests', 'guests')}</span>
          {room.base_price && (
            <span className="flex items-center gap-1 text-libre font-bold">
              ${Number(room.base_price).toFixed(0)} / {room.pricing_unit === 'bed' ? 'bed' : 'night'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <TabBtn active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={CalendarIcon}>
            {t('pms.tab_calendar', 'Calendar')}
          </TabBtn>
          <TabBtn active={tab === 'walkin'} onClick={() => setTab('walkin')} icon={UserPlus}>
            {t('pms.tab_walkin', 'Walk-in check-in')}
          </TabBtn>
        </div>

        {tab === 'calendar' ? (
          <CalendarStrip room={room} bookings={bookings} />
        ) : (
          <WalkInForm
            room={room}
            propertyId={propertyId}
            userId={userId}
            existingBookings={bookings}
            onDone={onSaved}
            onCancel={onClose}
            onUndoOffer={onUndoOffer}
          />
        )}
      </div>
    </Modal>
  )
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-ocean text-ocean'
          : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon size={14} /> {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
// CalendarStrip — 30-day strip showing booked / free / arrival per day.
// Plain divs (no external date library) keep the bundle size flat.
// ────────────────────────────────────────────────────────────────────────
function CalendarStrip({ room, bookings }) {
  const days = useMemo(() => {
    const out = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push(d)
    }
    return out
  }, [])

  // Return ALL bookings overlapping a given day — needed because a single
  // room TYPE may host several physical units. Returning only the first
  // hit (the previous bug) made every partly-booked day look fully booked.
  function findBookings(d) {
    const iso = d.toISOString().split('T')[0]
    return bookings.filter(b => b.check_in <= iso && b.check_out > iso)
  }

  function findArrivals(d) {
    const iso = d.toISOString().split('T')[0]
    return bookings.filter(b => b.check_in === iso)
  }

  const totalUnits = Math.max(1, Number(room.quantity) || 1)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Next 30 days · click a free day to start a booking from there
      </p>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const dayBookings = findBookings(d)
          const arrivals    = findArrivals(d)
          const occupied    = dayBookings.length
          const available   = Math.max(0, totalUnits - occupied)
          const dayNum      = d.getDate()
          const isToday     = d.toDateString() === new Date().toDateString()

          // 3-state colouring:
          //   0 occupied            → green ('Free')
          //   some occupied, slots  → amber ('N/M free')
          //   all occupied          → blue (guest name + count if many)
          let bg, label
          if (occupied === 0) {
            bg = 'bg-emerald-50 text-emerald-800 border-emerald-200'
            label = totalUnits > 1 ? `${totalUnits}/${totalUnits} free` : 'Free'
          } else if (available > 0) {
            bg = 'bg-amber-50 text-amber-800 border-amber-200'
            label = `${available}/${totalUnits} free`
          } else {
            bg = 'bg-blue-100 text-blue-800 border-blue-300'
            const firstName = dayBookings[0].guest_name?.split(' ')[0] || 'Booked'
            label = dayBookings.length > 1
              ? `${firstName} +${dayBookings.length - 1}`
              : firstName
          }

          // Tooltip lists every guest on that day so the hotelier can audit
          const allNames = dayBookings.map(b => b.guest_name || 'no name').join(', ')
          const titleSuffix = occupied > 0
            ? ` · ${occupied}/${totalUnits} occupied: ${allNames}`
            : ''

          return (
            <div key={d.toISOString()}
              className={`rounded-lg border-2 p-2 text-center ${bg} ${isToday ? 'ring-2 ring-ocean' : ''}`}
              title={`${d.toDateString()}${titleSuffix}`}
            >
              <div className="text-[10px] font-bold uppercase opacity-60">
                {d.toLocaleDateString('en', { weekday: 'short' })}
              </div>
              <div className="text-lg font-extrabold">{dayNum}</div>
              <div className="text-[9px] truncate">{label}</div>
              {arrivals.length > 0 && available > 0 && (
                <div className="text-[8px] text-purple-600 mt-0.5">
                  → {arrivals.length} arr
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Upcoming bookings list — each row shows the QR check-in link for guests */}
      {bookings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Upcoming bookings ({bookings.length}) · click for guest self check-in QR
          </h4>
          <div className="space-y-1">
            {bookings.slice(0, 5).map(b => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// One row of the upcoming-bookings list. Click to expand TWO QR codes:
//   - Check-in QR  → guests register themselves (TM30 / passport)
//   - Check-out QR → guests submit the stay survey (drives escrow release)
function BookingRow({ booking }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('checkin')   // 'checkin' | 'checkout'
  // Local copy of room_number so the receptionist can edit-in-place without
  // the row collapsing or losing focus on every keystroke.
  const [roomNumber, setRoomNumber] = useState(booking.room_number || '')
  const [savingNumber, setSavingNumber] = useState(false)
  const capacity = (booking.adults || 1) + (booking.children || 0) + (booking.extra_beds_count || 0)

  // Build URL + QR src for whichever tab is active
  const isCheckout = tab === 'checkout'
  const url   = `https://staylo.app/${isCheckout ? 'checkout' : 'checkin'}/${isCheckout ? booking.check_out_token : booking.check_in_token}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=240x240&margin=2&color=2D3436&bgcolor=FFFFFF`
  const tokenAvailable = isCheckout ? !!booking.check_out_token : !!booking.check_in_token

  // Save the new room number on blur. No-op if unchanged. Failure is silent
  // (logs to console) — receptionist can retry, no destructive risk.
  async function persistRoomNumber() {
    const next = roomNumber.trim() || null
    if (next === (booking.room_number || null)) return
    setSavingNumber(true)
    const { error } = await supabase
      .from('bookings')
      .update({ room_number: next })
      .eq('id', booking.id)
    setSavingNumber(false)
    if (error) console.warn('room_number update failed:', error)
    else booking.room_number = next   // mutate local copy so the badge stays consistent
  }

  return (
    <div className="rounded-lg bg-gray-50 overflow-hidden">
      <div className="w-full flex items-center justify-between text-xs px-3 py-2 hover:bg-gray-100 transition-colors gap-2">
        {/* LEFT: guest name + badges + room # input. NOT inside the toggle button so
            the room-number input doesn't accidentally collapse the row when clicked. */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button type="button" onClick={() => setOpen(o => !o)}
            className="font-medium text-deep flex items-center gap-2 text-left">
            {booking.guest_name || 'Guest'}
            {booking.booking_ref && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-deep/5 text-deep/70 tracking-wider"
                title="Booking reference — quote this on phone / email">
                {booking.booking_ref}
              </span>
            )}
            <span className="text-[10px] text-gray-400">· {capacity} {capacity === 1 ? 'guest' : 'guests'}</span>
          </button>
          {booking.communicating_rooms_requested && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase" title="Guest requested communicating rooms — assign adjoining units">🚪 Connecting</span>
          )}
          {booking.dispute_status === 'open' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sunset/15 text-sunset font-bold uppercase">🚩 Dispute</span>
          )}
          {booking.checkout_survey_submitted_at && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-libre/15 text-libre font-bold uppercase">✓ Reviewed</span>
          )}
          {/* Room number — editable inline */}
          <span className="flex items-center gap-1 ml-2 text-[10px] text-gray-400">
            #
            <input type="text" value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              onBlur={persistRoomNumber}
              placeholder="—"
              className={`w-16 px-1.5 py-0.5 rounded border text-[11px] font-mono text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 ${
                booking.room_number ? 'border-ocean/30 bg-ocean/5' : 'border-gray-200 bg-white'
              }`}
              title="Physical room number — click to edit" />
            {savingNumber && <Loader2 size={10} className="animate-spin" />}
          </span>
        </div>
        {/* RIGHT: dates + source + QR toggle */}
        <button type="button" onClick={() => setOpen(o => !o)}
          className="text-gray-500 text-right flex-shrink-0">
          {booking.check_in} → {booking.check_out}
          <span className="ml-2 px-1.5 py-0.5 rounded bg-white text-[10px] uppercase">{booking.booking_source || 'online'}</span>
          <span className="ml-1 text-[10px] text-ocean">{open ? '▴' : '▾ QR'}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white p-4">
          {/* Tabs: Check-in QR vs Check-out QR */}
          <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setTab('checkin')} type="button"
              className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                tab === 'checkin' ? 'bg-white shadow-sm text-ocean' : 'text-gray-500'
              }`}>
              📥 Check-in QR
            </button>
            <button onClick={() => setTab('checkout')} type="button"
              className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                tab === 'checkout' ? 'bg-white shadow-sm text-orange' : 'text-gray-500'
              }`}>
              📤 Check-out QR
            </button>
          </div>

          {tokenAvailable ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrSrc} alt={isCheckout ? 'Stay survey QR' : 'Guest check-in QR'}
                className="w-44 h-44 border-2 border-deep rounded-lg p-2 bg-white" />
              <div className="text-center">
                <p className="text-xs font-bold text-deep">
                  {isCheckout ? '⭐ Stay survey' : '👤 Guest self check-in'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 max-w-xs">
                  {isCheckout
                    ? 'Guest fills 5-rating survey. No red flag → you get paid within 1h. Red flag → STAYLO mediates.'
                    : `Each guest scans, fills info in 30s. Up to ${capacity} can register.`}
                </p>
                <a href={url} target="_blank" rel="noopener"
                  className="text-[10px] text-ocean font-mono mt-1 inline-block break-all">{url}</a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(url)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">
                  Copy link
                </button>
                <button onClick={() => window.open(qrSrc, '_blank')}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">
                  Open QR (print)
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              Token missing — apply migration 20260503070000 if this is unexpected.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// WalkInForm — record a guest who showed up at the front desk.
// Fields kept minimal so the receptionist can finish in <30 seconds.
// ────────────────────────────────────────────────────────────────────────
function WalkInForm({ room, propertyId, userId, existingBookings, onDone, onCancel, onUndoOffer }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  // Caps from the room's published config — receptionist can't overbook
  // a room beyond its physical capacity. Extra beds extend it for kids only.
  const maxAdults    = Math.max(1, Number(room.max_guests) || 1)
  const extraBedAvail = !!room.extra_bed_available
  const maxExtraBeds = extraBedAvail ? (Number(room.extra_bed_max_qty) || 1) : 0
  const extraBedPrice = Number(room.extra_bed_price) || 0
  const extraBedMaxAge = Number(room.extra_bed_max_age) || 10

  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    check_in:  today,
    check_out: tomorrow,
    adults: 1,
    children: 0,
    extra_beds: 0,
    rate: room.base_price ? String(room.base_price) : '',
    payment_method: 'manual',  // walk-ins typically pay cash / direct
    communicating_rooms_requested: false,
    special_requests: '',
  })
  // Per-guest registry (TM30 compliance + ops). Auto-resized to adults+children.
  // Each entry covers EVERY field Thai Immigration TM30 requires.
  // The first entry is always the lead (booker). See docs/TM30_COMPLIANCE.md.
  const blankGuest = () => ({
    first_name:               '',
    last_name:                '',
    sex:                      '',           // M / F / X
    nationality:              '',
    date_of_birth:            '',
    passport_number:          '',
    travel_doc_type:          'passport',
    thailand_arrival_date:    '',           // when they entered the country
    thailand_port_of_entry:   '',           // BKK, DMK, HKT...
    visa_type:                '',
    visa_number:              '',
    is_child:                 false,
  })
  const [guests, setGuests] = useState([blankGuest()])
  // Per-guest "show TM30 details" toggle — collapsed by default to keep the
  // form short for domestic guests, expanded when nationality is non-Thai.
  const [tm30Open, setTm30Open] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Resize the guest list to match adults + children.
  // Adults come first (is_child=false), then children. Existing data preserved.
  useEffect(() => {
    const totalAdults   = Math.max(1, Number(form.adults)   || 1)
    const totalChildren = Math.max(0, Number(form.children) || 0)
    setGuests(prev => {
      const next = []
      const existingAdults   = prev.filter(g => !g.is_child)
      const existingChildren = prev.filter(g =>  g.is_child)
      for (let i = 0; i < totalAdults; i++) {
        next.push(existingAdults[i] || { ...blankGuest(), is_child: false })
      }
      for (let i = 0; i < totalChildren; i++) {
        next.push(existingChildren[i] || { ...blankGuest(), is_child: true })
      }
      return next
    })
  }, [form.adults, form.children])

  function updateGuest(idx, key, value) {
    setGuests(g => g.map((row, i) => i === idx ? { ...row, [key]: value } : row))
  }

  // Two-way sync: when the lead guest's name changes, mirror it into the
  // top-level form.guest_name field (kept on bookings for backward compat).
  useEffect(() => {
    const lead = guests[0]
    if (!lead) return
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
    if (fullName !== form.guest_name) {
      set('guest_name', fullName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests[0]?.first_name, guests[0]?.last_name])

  // Live computed nights and total
  const nights = useMemo(() => {
    const a = new Date(form.check_in), b = new Date(form.check_out)
    const diff = Math.round((b - a) / 86400000)
    return diff > 0 ? diff : 0
  }, [form.check_in, form.check_out])
  // Price breakdown: room nights + extra bed nights (kids only)
  const roomSubtotal     = nights * (Number(form.rate) || 0)
  const extraBedSubtotal = nights * (Number(form.extra_beds) || 0) * extraBedPrice
  const totalPrice       = roomSubtotal + extraBedSubtotal
  const commission       = totalPrice * 0.10

  // Conflict check — count overlapping ACTIVE bookings on each day in the
  // requested range. Refuse only when a day already has room.quantity
  // bookings (i.e. all units of this room TYPE are taken). With Jungle ×3,
  // 1 existing walk-in + new walk-in = 2 → still 1 free, so allowed.
  const conflict = useMemo(() => {
    const qty = Math.max(1, Number(room.quantity) || 1)
    const a = new Date(form.check_in + 'T00:00:00Z')
    const b = new Date(form.check_out + 'T00:00:00Z')
    if (!(b > a)) return null
    // Walk every date in [check_in, check_out)
    for (let d = new Date(a); d < b; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      const overlapping = existingBookings.filter(bk =>
        bk.check_in <= iso && bk.check_out > iso &&
        // Only "active" statuses occupy a slot; cancelled/refunded/etc. don't
        ['pending', 'confirmed', 'checked_in'].includes(bk.status)
      )
      if (overlapping.length >= qty) {
        // Surface the FIRST conflicting booking on the saturated day for the
        // error message (so the receptionist sees a real name to investigate).
        return {
          ...overlapping[0],
          saturated_on: iso,
          overlap_count: overlapping.length,
          quantity: qty,
        }
      }
    }
    return null
  }, [existingBookings, form.check_in, form.check_out, room.quantity])

  async function handleSave() {
    setError('')
    // Validate the LEAD guest (always row 0). The other rows are optional names
    // until the receptionist has time to fill them — but the lead must be set.
    const lead = guests[0]
    if (!lead?.first_name?.trim()) {
      setError(t('pms.err_name', 'At least the lead guest first name is required'))
      return
    }
    if (nights <= 0) { setError(t('pms.err_dates', 'Check-out must be after check-in')); return }
    if (!form.rate || Number(form.rate) <= 0) { setError(t('pms.err_rate', 'Rate must be > 0')); return }
    if (conflict) { setError(t('pms.err_conflict', 'These dates overlap an existing booking')); return }

    setSaving(true)
    const payload = {
      property_id:    propertyId,
      room_id:        room.id,
      guest_id:       null,                            // walk-in: no account
      booking_source: 'walk_in',
      check_in:       form.check_in,
      check_out:      form.check_out,
      guests:         Number(form.adults) + Number(form.children),
      adults:         Number(form.adults),
      children:       Number(form.children),
      extra_beds_count:   Number(form.extra_beds) || 0,
      extra_bed_subtotal: Number(extraBedSubtotal.toFixed(2)),
      communicating_rooms_requested: !!form.communicating_rooms_requested,
      total_price:    Number(totalPrice.toFixed(2)),
      commission:     Number(commission.toFixed(2)),
      currency:       'USD',
      status:         'checked_in',                    // they're physically here
      escrow_status:  'released',                      // no platform funds held
      release_reason: 'walk_in_direct_payment',
      payment_method: form.payment_method,
      guest_name:     form.guest_name.trim(),
      guest_email:    form.guest_email.trim() || null,
      guest_phone:    form.guest_phone.trim() || null,
      special_requests: form.special_requests.trim() || null,
    }

    // Insert with .select() so we get the new row's id back — needed to
    // wire the Undo toast (which deletes by id).
    const { data: inserted, error: insErr } = await supabase
      .from('bookings')
      .insert(payload)
      .select('id, booking_ref')
      .single()
    if (insErr) {
      setSaving(false)
      console.error('Walk-in insert failed:', insErr)
      setError(insErr.message)
      return
    }

    // Insert the per-guest registry rows (TM30 compliance + ops).
    // Skip empty rows (entries with no first_name) — receptionist can fill
    // them in later via the booking detail page.
    const guestRows = guests
      .map((g, i) => ({
        booking_id:               inserted.id,
        first_name:               g.first_name?.trim() || '',
        last_name:                g.last_name?.trim() || null,
        sex:                      g.sex || null,
        nationality:              g.nationality?.trim().toUpperCase() || null,
        date_of_birth:            g.date_of_birth || null,
        passport_number:          g.passport_number?.trim() || null,
        travel_doc_type:          g.travel_doc_type || 'passport',
        thailand_arrival_date:    g.thailand_arrival_date || null,
        thailand_port_of_entry:   g.thailand_port_of_entry?.trim().toUpperCase() || null,
        visa_type:                g.visa_type || null,
        visa_number:              g.visa_number?.trim() || null,
        is_lead:                  i === 0,
        is_child:                 !!g.is_child,
        created_by:               userId,
      }))
      .filter(g => g.first_name)        // skip blanks
    if (guestRows.length > 0) {
      const { error: gErr } = await supabase.from('booking_guests').insert(guestRows)
      // Don't fail the whole flow if guest insert fails — booking is created,
      // hotelier can fix names later. Log it so we know.
      if (gErr) console.warn('Guest registry insert failed (booking still created):', gErr)
    }

    setSaving(false)

    // Offer one-click undo for 30s. Deleting the booking auto-restores
    // the room's available_count via the bookings_sync_availability trigger,
    // and cascades the booking_guests rows.
    if (onUndoOffer && inserted?.id) {
      const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`
      const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || form.guest_name.trim()
      onUndoOffer({
        label:    `Walk-in checked in: ${leadName}${inserted.booking_ref ? ` · ${inserted.booking_ref}` : ''}`,
        sublabel: `${nightsLabel} · ${room.name} · ${guestRows.length} guest${guestRows.length === 1 ? '' : 's'} · $${totalPrice.toFixed(0)}`,
        onUndo:   async () => {
          await supabase.from('bookings').delete().eq('id', inserted.id)
          onDone()        // refresh list + close any open modal
        },
      })
    }
    onDone()
  }

  return (
    <div className="space-y-3">
      {/* Contact + payment (lead booker contact details) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={t('pms.guest_phone', 'Lead phone')}>
          <PhoneInput value={form.guest_phone} onChange={v => set('guest_phone', v)} />
        </Field>
        <Field label={t('pms.guest_email', 'Email (optional)')}>
          <input
            type="email" value={form.guest_email} onChange={e => set('guest_email', e.target.value)}
            placeholder="optional"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          />
        </Field>
        <Field label={t('pms.payment_method', 'Payment method')}>
          <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="manual">Cash / direct</option>
            <option value="card">Card (terminal)</option>
            <option value="lightning">Lightning (BTC)</option>
          </select>
        </Field>
        <Field label={t('pms.check_in_date', 'Check-in')}>
          <input type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)}
            min={today}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        <Field label={t('pms.check_out_date', 'Check-out')}>
          <input type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)}
            min={form.check_in}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        <Field label={`${t('pms.adults', 'Adults')} (max ${maxAdults})`}>
          <input type="number" min={1} max={maxAdults} value={form.adults}
            onChange={e => {
              const n = Number(e.target.value) || 1
              // Hard cap — receptionist can't overbook the room's physical capacity
              set('adults', Math.min(maxAdults, Math.max(1, n)))
            }}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        <Field label={t('pms.children', 'Children')}>
          <input type="number" min={0} max={20} value={form.children}
            onChange={e => set('children', Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        {extraBedAvail && (
          <Field label={`Extra beds (kids ≤ ${extraBedMaxAge}y)`}>
            <input type="number" min={0} max={maxExtraBeds} value={form.extra_beds}
              onChange={e => set('extra_beds', Math.min(maxExtraBeds, Math.max(0, Number(e.target.value) || 0)))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30" />
            <span className="text-[10px] text-gray-400 block mt-0.5">
              +${extraBedPrice.toFixed(0)}/night each · max {maxExtraBeds}
            </span>
          </Field>
        )}
        <Field label={t('pms.rate_per_night', 'Rate per night (USD)')}>
          <input type="number" min={1} step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
      </div>

      {/* ───────────────────────────────────────────────────────────────
          Per-guest registry — one row per adult/child.
          Auto-resized when adults/children counts change.
          Required by Thai TM30 immigration law for foreign guests +
          good practice for everyone (fire safety, claims, CRM).
          ─────────────────────────────────────────────────────────────── */}
      <div className="bg-cream/40 -mx-1 px-3 py-3 rounded-xl border border-cream space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Guest registry
            <span className="text-gray-300 font-normal normal-case ml-1.5">— {guests.length} {guests.length === 1 ? 'person' : 'people'}, TM30 compliant</span>
          </h4>
          <button type="button"
            onClick={() => setGuests(g => [...g, blankGuest()])}
            className="text-[11px] font-bold text-ocean hover:text-electric flex items-center gap-1">
            + Add another
          </button>
        </div>

        {guests.map((g, idx) => {
          // Auto-flag non-Thai non-children as needing TM30 (we still allow opt-in for everyone)
          const needsTM30 = !g.is_child && g.nationality && g.nationality.toUpperCase() !== 'TH'
          const isOpen   = tm30Open[idx] ?? needsTM30
          return (
          <div key={idx} className="bg-white rounded-lg border border-gray-100">
            {/* Row 1 — name + actions (always fits) */}
            <div className="grid grid-cols-12 gap-1.5 items-center p-2 pb-1">
              <div className="col-span-1 flex items-center justify-center text-[10px] font-bold text-gray-400">
                {idx === 0 ? '👤' : g.is_child ? '👶' : '👤'}
                <span className="ml-0.5">{idx + 1}</span>
              </div>
              <div className="col-span-5">
                <input type="text" value={g.first_name}
                  onChange={e => updateGuest(idx, 'first_name', e.target.value)}
                  placeholder={idx === 0 ? 'First name *' : 'First name'}
                  autoFocus={idx === 0}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </div>
              <div className="col-span-5">
                <input type="text" value={g.last_name}
                  onChange={e => updateGuest(idx, 'last_name', e.target.value)}
                  placeholder="Last name"
                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1">
                {idx > 0 && (
                  <>
                    <button type="button" onClick={() => updateGuest(idx, 'is_child', !g.is_child)}
                      className="text-[10px] text-gray-400 hover:text-electric font-bold w-5 h-5 rounded border border-gray-200 hover:border-electric flex items-center justify-center"
                      title={g.is_child ? 'Mark as adult' : 'Mark as child'}>
                      {g.is_child ? 'A' : 'C'}
                    </button>
                    <button type="button"
                      onClick={() => setGuests(arr => arr.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-sunset text-base leading-none w-5 h-5 flex items-center justify-center"
                      title="Remove this guest">×</button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2 — nationality + passport (full breathing room) */}
            <div className="grid grid-cols-12 gap-1.5 items-center px-2 pb-2">
              <div className="col-span-1" />
              <div className="col-span-3">
                <input type="text" value={g.nationality}
                  onChange={e => updateGuest(idx, 'nationality', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="FR / TH"
                  maxLength={2}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs uppercase font-mono tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </div>
              <div className="col-span-8">
                <input type="text" value={g.passport_number}
                  onChange={e => updateGuest(idx, 'passport_number', e.target.value)}
                  placeholder={g.is_child ? 'Passport / ID (optional for child)' : 'Passport / ID number'}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </div>
            </div>

            {/* TM30 details toggle — auto-opens for foreign adults */}
            <button type="button"
              onClick={() => setTm30Open(s => ({ ...s, [idx]: !isOpen }))}
              className={`w-full text-left px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-t flex items-center justify-between ${
                isOpen ? 'bg-ocean/5 text-ocean border-ocean/15' : 'bg-gray-50 text-gray-400 hover:text-gray-600 border-gray-100'
              }`}>
              <span>{isOpen ? '▾' : '▸'} TM30 immigration details {needsTM30 && !isOpen ? '· required for foreign guests' : ''}</span>
              <span className="text-[9px] normal-case font-normal opacity-60">
                {[g.sex, g.date_of_birth, g.thailand_arrival_date, g.visa_type, g.visa_number].filter(Boolean).length} / 5 filled
              </span>
            </button>

            {/* Expanded TM30 fields */}
            {isOpen && (
              <div className="grid grid-cols-12 gap-1.5 p-2 pt-1 bg-ocean/5">
                {/* Sex */}
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Sex</label>
                  <select value={g.sex || ''}
                    onChange={e => updateGuest(idx, 'sex', e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30">
                    <option value="">—</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="X">X</option>
                  </select>
                </div>
                {/* DOB */}
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Date of birth</label>
                  <input type="date" value={g.date_of_birth || ''}
                    onChange={e => updateGuest(idx, 'date_of_birth', e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30" />
                </div>
                {/* Travel doc type */}
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">ID type</label>
                  <select value={g.travel_doc_type || 'passport'}
                    onChange={e => updateGuest(idx, 'travel_doc_type', e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30">
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="border_pass">Border pass</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {/* Thailand arrival date */}
                <div className="col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Arrived in Thailand on</label>
                  <input type="date" value={g.thailand_arrival_date || ''}
                    onChange={e => updateGuest(idx, 'thailand_arrival_date', e.target.value)}
                    max={form.check_in}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30" />
                </div>
                {/* Port of entry */}
                <div className="col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Port of entry</label>
                  <input type="text" value={g.thailand_port_of_entry || ''}
                    onChange={e => updateGuest(idx, 'thailand_port_of_entry', e.target.value.toUpperCase().slice(0, 12))}
                    placeholder="BKK / DMK / HKT / CNX"
                    maxLength={12}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
                </div>
                {/* Visa type */}
                <div className="col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Visa type</label>
                  <select value={g.visa_type || ''}
                    onChange={e => updateGuest(idx, 'visa_type', e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30">
                    <option value="">—</option>
                    <option value="exempt">Exempt (visa-on-arrival)</option>
                    <option value="TR">TR (Tourist)</option>
                    <option value="TR-VOA">TR-VOA</option>
                    <option value="NON-B">NON-B (Business)</option>
                    <option value="NON-O">NON-O (Other)</option>
                    <option value="ED">ED (Education)</option>
                    <option value="RETIRE">Retirement</option>
                    <option value="DTV">DTV (Digital Nomad)</option>
                    <option value="LTR">LTR (Long-Term Resident)</option>
                  </select>
                </div>
                {/* Visa number */}
                <div className="col-span-3">
                  <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Visa number</label>
                  <input type="text" value={g.visa_number || ''}
                    onChange={e => updateGuest(idx, 'visa_number', e.target.value)}
                    placeholder="from sticker"
                    className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-deep text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
                </div>
              </div>
            )}
          </div>
        )})}

        <p className="text-[10px] text-gray-400 italic">
          ID #1 = lead booker. Nationality = 2-letter code (FR, TH, US, GB...). TM30 details auto-opens for foreign guests, optional for Thais.
        </p>
      </div>

      {/* Communicating rooms — only offered when this room type advertises pairs */}
      {!!room.communicating_rooms_available && (
        <label className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
          <input type="checkbox" checked={!!form.communicating_rooms_requested}
            onChange={e => set('communicating_rooms_requested', e.target.checked)}
            className="accent-amber-500" />
          <span className="text-xs text-deep">
            🚪 <strong>Assign communicating rooms</strong>
            <span className="text-gray-500"> — pair this booking with an adjoining room (family-friendly)</span>
          </span>
        </label>
      )}

      <Field label={t('pms.special_requests', 'Special requests (optional)')}>
        <textarea value={form.special_requests} onChange={e => set('special_requests', e.target.value)}
          rows={2} placeholder="Late check-in, extra towels, etc."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none" />
      </Field>

      {/* Live total + commission breakdown */}
      <div className="p-3 bg-libre/5 border border-libre/15 rounded-xl space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Room: {nights} {nights === 1 ? 'night' : 'nights'} × ${Number(form.rate || 0).toFixed(2)}</span>
          <span className="font-medium">${roomSubtotal.toFixed(2)}</span>
        </div>
        {form.extra_beds > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Extra beds: {nights} × {form.extra_beds} × ${extraBedPrice.toFixed(2)}</span>
            <span className="font-medium">${extraBedSubtotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold pt-1 border-t border-libre/15">
          <span>Total guest pays</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>STAYLO commission (10%)</span>
          <span>−${commission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-libre font-bold pt-1 border-t border-libre/15">
          <span>You receive (paid directly)</span>
          <span>${(totalPrice - commission).toFixed(2)}</span>
        </div>
      </div>

      {conflict && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertCircle size={14} className="inline mr-1" />
          <strong>Fully booked on {conflict.saturated_on}</strong> — all {conflict.quantity} {room.name} units already taken
          {conflict.guest_name ? ` (incl. ${conflict.guest_name} ${conflict.check_in} → ${conflict.check_out})` : ''}
        </div>
      )}
      {error && (
        <div className="p-3 bg-sunset/10 border border-sunset/30 rounded-xl text-sm text-sunset">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button onClick={handleSave} disabled={saving || conflict}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {t('pms.check_in_now', 'Check in now')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>{t('common.cancel', 'Cancel')}</Button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function prettyType(s) {
  if (!s) return ''
  return String(s).split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}
