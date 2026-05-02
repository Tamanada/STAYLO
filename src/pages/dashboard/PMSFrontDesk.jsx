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

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  occupied: { label: 'Occupied', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  checkout: { label: 'Check-out Today', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  arriving: { label: 'Arriving Today', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  maintenance: { label: 'Maintenance', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
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
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date().toISOString().split('T')[0])
  const [openRoom, setOpenRoom] = useState(null)   // room object whose modal is open

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

  // Compute room statuses
  const roomStatuses = useMemo(() => {
    return propertyRooms.map(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id)
      const activeBooking = roomBookings.find(b =>
        b.check_in <= today && b.check_out > today
      )
      const checkingOut = roomBookings.find(b => b.check_out === today)
      const arriving = roomBookings.find(b => b.check_in === today)

      let status = 'available'
      let guest = null
      if (activeBooking) {
        status = 'occupied'
        guest = activeBooking
      }
      if (checkingOut) {
        status = 'checkout'
        guest = checkingOut
      }
      if (arriving && !activeBooking) {
        status = 'arriving'
        guest = arriving
      }

      return { ...room, status, guest }
    })
  }, [propertyRooms, bookings, today])

  // Stats
  const totalRooms = roomStatuses.length
  const occupied = roomStatuses.filter(r => r.status === 'occupied' || r.status === 'checkout').length
  const arriving = roomStatuses.filter(r => r.status === 'arriving').length
  const available = roomStatuses.filter(r => r.status === 'available').length
  const checkingOut = roomStatuses.filter(r => r.status === 'checkout').length
  const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {roomStatuses.map((room, idx) => {
            const cfg = STATUS_CONFIG[room.status]
            return (
              <button key={room.id}
                onClick={() => setOpenRoom(room)}
                className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${cfg.color}`}
                title={t('pms.click_to_manage', 'Click to view calendar / check in a guest')}>
                {/* Room header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-extrabold">{room.name}</span>
                  <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                </div>

                {/* Status */}
                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">{cfg.label}</p>

                {/* Room info */}
                <div className="flex items-center gap-2 text-[11px] opacity-60 mb-2">
                  <span className="flex items-center gap-0.5"><BedDouble size={10} /> {room.bed_type || 'Standard'}</span>
                  <span className="flex items-center gap-0.5"><Users size={10} /> {room.max_guests || 2}</span>
                </div>

                {/* Guest info */}
                {room.guest && (
                  <div className="mt-2 pt-2 border-t border-current/10">
                    <p className="text-xs font-bold truncate">{room.guest.guest_name || 'Guest'}</p>
                    <p className="text-[10px] opacity-60">
                      {room.guest.check_in} → {room.guest.check_out}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 flex gap-1.5">
                  {room.status === 'arriving' && (
                    <span className="flex-1 py-1.5 bg-white/60 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <LogIn size={10} /> Check In
                    </span>
                  )}
                  {room.status === 'checkout' && (
                    <span className="flex-1 py-1.5 bg-white/60 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <LogOut size={10} /> Check Out
                    </span>
                  )}
                  {room.status === 'available' && (
                    <span className="flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center justify-center gap-1">
                      <UserPlus size={10} /> Walk-in
                    </span>
                  )}
                  {room.status === 'occupied' && (
                    <span className="flex-1 py-1.5 text-center text-[10px] font-medium opacity-50 flex items-center justify-center gap-1">
                      <Clock size={10} /> In stay
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
      />
    </div>
  )
}

// ============================================================================
// RoomDetailModal — opens when the front desk clicks any room card.
// Two tabs:
//   1. Calendar — 30-day view, shows which days are booked / free / arrival
//   2. Walk-in  — quick check-in form for guests showing up unannounced
// ============================================================================
function RoomDetailModal({ room, onClose, bookings, propertyId, userId, onSaved }) {
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

  function findBooking(d) {
    const iso = d.toISOString().split('T')[0]
    return bookings.find(b => b.check_in <= iso && b.check_out > iso)
  }

  function findArrival(d) {
    const iso = d.toISOString().split('T')[0]
    return bookings.find(b => b.check_in === iso)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Next 30 days · click a free day to start a booking from there
      </p>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const booking = findBooking(d)
          const arrival = findArrival(d)
          const dayNum = d.getDate()
          const isToday = d.toDateString() === new Date().toDateString()
          let bg = 'bg-emerald-50 text-emerald-800 border-emerald-200'
          let label = 'Free'
          if (booking) {
            bg = 'bg-blue-100 text-blue-800 border-blue-300'
            label = booking.guest_name?.split(' ')[0] || 'Booked'
          }
          if (arrival && !booking) {
            bg = 'bg-purple-100 text-purple-800 border-purple-300'
            label = `→ ${arrival.guest_name?.split(' ')[0] || 'arr.'}`
          }
          return (
            <div key={d.toISOString()}
              className={`rounded-lg border-2 p-2 text-center ${bg} ${isToday ? 'ring-2 ring-ocean' : ''}`}
              title={`${d.toDateString()}${booking ? ` · ${booking.guest_name || 'booking'}` : ''}`}
            >
              <div className="text-[10px] font-bold uppercase opacity-60">
                {d.toLocaleDateString('en', { weekday: 'short' })}
              </div>
              <div className="text-lg font-extrabold">{dayNum}</div>
              <div className="text-[9px] truncate">{label}</div>
            </div>
          )
        })}
      </div>

      {/* Upcoming bookings list */}
      {bookings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Upcoming bookings ({bookings.length})
          </h4>
          <div className="space-y-1">
            {bookings.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-gray-50">
                <span className="font-medium text-deep">{b.guest_name || 'Guest'}</span>
                <span className="text-gray-500">
                  {b.check_in} → {b.check_out}
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-white text-[10px] uppercase">{b.booking_source || 'online'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// WalkInForm — record a guest who showed up at the front desk.
// Fields kept minimal so the receptionist can finish in <30 seconds.
// ────────────────────────────────────────────────────────────────────────
function WalkInForm({ room, propertyId, userId, existingBookings, onDone, onCancel }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    check_in:  today,
    check_out: tomorrow,
    adults: 1,
    children: 0,
    rate: room.base_price ? String(room.base_price) : '',
    payment_method: 'manual',  // walk-ins typically pay cash / direct
    special_requests: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Live computed nights and total
  const nights = useMemo(() => {
    const a = new Date(form.check_in), b = new Date(form.check_out)
    const diff = Math.round((b - a) / 86400000)
    return diff > 0 ? diff : 0
  }, [form.check_in, form.check_out])
  const totalPrice = nights * (Number(form.rate) || 0)
  const commission = totalPrice * 0.10

  // Conflict check — refuse if these dates overlap an existing booking
  const conflict = useMemo(() => {
    return existingBookings.find(b =>
      // overlap: a.check_in < b.check_out AND a.check_out > b.check_in
      form.check_in < b.check_out && form.check_out > b.check_in
    )
  }, [existingBookings, form.check_in, form.check_out])

  async function handleSave() {
    setError('')
    if (!form.guest_name.trim()) { setError(t('pms.err_name', 'Guest name is required')); return }
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

    const { error: insErr } = await supabase.from('bookings').insert(payload)
    setSaving(false)
    if (insErr) {
      console.error('Walk-in insert failed:', insErr)
      setError(insErr.message)
      return
    }
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('pms.guest_name', 'Guest name *')}>
          <input
            type="text" value={form.guest_name} onChange={e => set('guest_name', e.target.value)}
            placeholder="Somchai R." autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          />
        </Field>
        <Field label={t('pms.guest_phone', 'Phone')}>
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
        <Field label={t('pms.adults', 'Adults')}>
          <input type="number" min={1} max={20} value={form.adults} onChange={e => set('adults', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        <Field label={t('pms.children', 'Children')}>
          <input type="number" min={0} max={20} value={form.children} onChange={e => set('children', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
        <Field label={t('pms.rate_per_night', 'Rate per night (USD)')}>
          <input type="number" min={1} step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </Field>
      </div>

      <Field label={t('pms.special_requests', 'Special requests (optional)')}>
        <textarea value={form.special_requests} onChange={e => set('special_requests', e.target.value)}
          rows={2} placeholder="Late check-in, extra towels, etc."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none" />
      </Field>

      {/* Live total + commission breakdown */}
      <div className="p-3 bg-libre/5 border border-libre/15 rounded-xl space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{nights} {nights === 1 ? 'night' : 'nights'} × ${Number(form.rate || 0).toFixed(2)}</span>
          <span className="font-bold">${totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>STAYLO commission (10%)</span>
          <span>${commission.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-libre font-bold pt-1 border-t border-libre/15">
          <span>You receive (paid directly)</span>
          <span>${(totalPrice - commission).toFixed(2)}</span>
        </div>
      </div>

      {conflict && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertCircle size={14} className="inline mr-1" />
          Conflicts with existing booking {conflict.check_in} → {conflict.check_out}
          {conflict.guest_name ? ` (${conflict.guest_name})` : ''}
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
