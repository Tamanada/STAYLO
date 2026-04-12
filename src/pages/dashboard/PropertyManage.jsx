import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, BedDouble, Calendar, ClipboardList, Pencil, Trash2,
  Users, DollarSign, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  ChevronLeft, ChevronRight, X, Save, Loader2, Ban, Check
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'dormitory']
const BED_TYPES = ['single', 'double', 'twin', 'king', 'dormitory']
const AMENITY_OPTIONS = [
  { key: 'wifi', icon: Wifi, label: 'WiFi' },
  { key: 'ac', icon: Wind, label: 'Air Conditioning' },
  { key: 'pool', icon: Waves, label: 'Pool' },
  { key: 'minibar', icon: Coffee, label: 'Minibar' },
  { key: 'parking', icon: Car, label: 'Parking' },
  { key: 'beach', icon: Umbrella, label: 'Beach Access' },
  { key: 'balcony', icon: null, label: 'Balcony' },
  { key: 'kitchen', icon: null, label: 'Kitchen' },
]

const tabs = [
  { key: 'rooms', icon: BedDouble, label: 'Rooms' },
  { key: 'calendar', icon: Calendar, label: 'Availability' },
  { key: 'bookings', icon: ClipboardList, label: 'Bookings' },
]

export default function PropertyManage() {
  const { t } = useTranslation()
  const { id: propertyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('rooms')
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [propRes, roomsRes, bookingsRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', propertyId).single(),
      supabase.from('rooms').select('*').eq('property_id', propertyId).order('created_at'),
      supabase.from('bookings').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
    ])
    setProperty(propRes.data)
    setRooms(roomsRes.data || [])
    setBookings(bookingsRes.data || [])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeleteProperty() {
    if (!confirm(t('manage.confirm_delete_property', `Delete "${property?.name}"? All rooms, availability, and bookings for this property will be permanently deleted.`))) return
    try {
      // Delete bookings first (no ON DELETE CASCADE on this FK)
      const { error: bookingsErr } = await supabase.from('bookings').delete().eq('property_id', propertyId)
      if (bookingsErr) throw bookingsErr

      // Delete room_availability for all rooms of this property
      const roomIds = rooms.map(r => r.id)
      if (roomIds.length > 0) {
        const { error: availErr } = await supabase.from('room_availability').delete().in('room_id', roomIds)
        if (availErr) throw availErr
      }

      // Delete rooms
      const { error: roomsErr } = await supabase.from('rooms').delete().eq('property_id', propertyId)
      if (roomsErr) throw roomsErr

      // Delete property
      const { error: propErr } = await supabase.from('properties').delete().eq('id', propertyId)
      if (propErr) throw propErr

      navigate('/dashboard/properties')
    } catch (err) {
      console.error('Delete failed:', err)
      alert(t('manage.delete_error', 'Failed to delete property. Please try again or contact support.'))
    }
  }

  async function handleToggleLive() {
    const newStatus = property.status === 'live' ? 'validated' : 'live'
    await supabase.from('properties').update({ status: newStatus }).eq('id', propertyId)
    setProperty(prev => ({ ...prev, status: newStatus }))
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
  }

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">Property not found</h2>
        <Link to="/dashboard/properties"><Button variant="secondary"><ArrowLeft size={16} /> Back</Button></Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/properties" className="text-gray-400 hover:text-ocean transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-deep">{property.name}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                property.status === 'live'
                  ? 'bg-libre/10 text-libre'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {property.status === 'live' ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{property.city}{property.country ? `, ${property.country}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleLive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              property.status === 'live'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-libre text-white hover:bg-libre/90'
            }`}>
            {property.status === 'live' ? <><Ban size={14} /> {t('manage.stop', 'Stop')}</> : <><Check size={14} /> {t('manage.go_live', 'Go Live')}</>}
          </button>
          <button onClick={handleDeleteProperty}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all">
            <Trash2 size={14} /> {t('manage.delete', 'Delete')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-deep shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {t(`manage.tab_${tab.key}`, tab.label)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'rooms' && <RoomsTab propertyId={propertyId} rooms={rooms} onRefresh={fetchData} />}
      {activeTab === 'calendar' && <CalendarTab rooms={rooms} />}
      {activeTab === 'bookings' && <BookingsTab bookings={bookings} rooms={rooms} onRefresh={fetchData} />}
    </div>
  )
}

// ============================================
// ROOMS TAB
// ============================================
function RoomsTab({ propertyId, rooms, onRefresh }) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', type: 'standard', max_guests: 2,
    bed_type: 'double', base_price: '', quantity: 1, amenities: [],
  })

  function openAdd() {
    setEditingRoom(null)
    setForm({ name: '', description: '', type: 'standard', max_guests: 2, bed_type: 'double', base_price: '', quantity: 1, amenities: [] })
    setShowForm(true)
  }

  function openEdit(room) {
    setEditingRoom(room)
    setForm({
      name: room.name, description: room.description || '', type: room.type,
      max_guests: room.max_guests, bed_type: room.bed_type,
      base_price: room.base_price, quantity: room.quantity,
      amenities: room.amenities || [],
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.base_price) return
    setSaving(true)
    const payload = {
      property_id: propertyId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      max_guests: Number(form.max_guests),
      bed_type: form.bed_type,
      base_price: Number(form.base_price),
      quantity: Number(form.quantity),
      amenities: form.amenities,
    }

    if (editingRoom) {
      await supabase.from('rooms').update(payload).eq('id', editingRoom.id)
    } else {
      await supabase.from('rooms').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    onRefresh()
  }

  async function handleDelete(roomId) {
    if (!confirm(t('manage.confirm_delete_room', 'Delete this room type? This cannot be undone.'))) return
    await supabase.from('rooms').delete().eq('id', roomId)
    onRefresh()
  }

  async function toggleActive(room) {
    await supabase.from('rooms').update({ is_active: !room.is_active }).eq('id', room.id)
    onRefresh()
  }

  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter(a => a !== key) : [...f.amenities, key]
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-deep">{t('manage.rooms_title', 'Room Types')}</h2>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> {t('manage.add_room', 'Add Room')}</Button>
      </div>

      {rooms.length === 0 && !showForm && (
        <Card className="p-12 text-center">
          <BedDouble size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_rooms', 'No rooms yet')}</h3>
          <p className="text-gray-500 mb-4">{t('manage.no_rooms_desc', 'Add your first room type to start receiving bookings.')}</p>
          <Button onClick={openAdd}><Plus size={16} /> {t('manage.add_room', 'Add Room')}</Button>
        </Card>
      )}

      {/* Room cards */}
      <div className="space-y-3">
        {rooms.map(room => (
          <Card key={room.id} className={`!p-4 ${!room.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-deep">{room.name}</h3>
                  <Badge variant={room.is_active ? 'green' : 'gray'}>
                    {room.is_active ? t('manage.active', 'Active') : t('manage.inactive', 'Inactive')}
                  </Badge>
                  <Badge variant="blue" className="capitalize">{room.type}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><BedDouble size={14} /> {room.bed_type}</span>
                  <span className="flex items-center gap-1"><Users size={14} /> {room.max_guests} guests</span>
                  <span className="flex items-center gap-1"><DollarSign size={14} /> ${Number(room.base_price).toFixed(0)}/night</span>
                  <span>x{room.quantity} {t('manage.available', 'available')}</span>
                </div>
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.map(a => (
                      <span key={a} className="text-xs bg-libre/10 text-libre px-2 py-0.5 rounded-full capitalize">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title={room.is_active ? 'Deactivate' : 'Activate'}>
                  {room.is_active ? <Ban size={16} /> : <Check size={16} />}
                </button>
                <button onClick={() => openEdit(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ocean">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(room.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sunset">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Room Form */}
      {showForm && (
        <Card className="mt-4 border-2 border-ocean/20">
          <h3 className="font-bold text-deep mb-4">
            {editingRoom ? t('manage.edit_room', 'Edit Room') : t('manage.new_room', 'New Room Type')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.room_name', 'Room Name')} *</label>
              <input
                type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Deluxe Double, Ocean View Suite"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.description', 'Description')}</label>
              <textarea
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Brief description of the room..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.room_type', 'Room Type')}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                {ROOM_TYPES.map(rt => <option key={rt} value={rt} className="capitalize">{rt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.bed_type', 'Bed Type')}</label>
              <select value={form.bed_type} onChange={e => setForm(f => ({ ...f, bed_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                {BED_TYPES.map(bt => <option key={bt} value={bt} className="capitalize">{bt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.max_guests', 'Max Guests')}</label>
              <input type="number" min={1} max={20} value={form.max_guests}
                onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.base_price', 'Price per Night (USD)')} *</label>
              <input type="number" min={1} step="0.01" value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="e.g. 45"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.quantity', 'Quantity (how many of this type)')}</label>
              <input type="number" min={1} max={999} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-2">{t('manage.amenities', 'Amenities')}</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                  <button key={a.key} onClick={() => toggleAmenity(a.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      form.amenities.includes(a.key)
                        ? 'bg-libre/10 border-libre/30 text-libre font-medium'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {a.icon && <a.icon size={14} />}
                    <span className="capitalize">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.base_price}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingRoom ? t('manage.save_changes', 'Save Changes') : t('manage.create_room', 'Create Room')}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// CALENDAR TAB
// ============================================
function CalendarTab({ rooms }) {
  const { t } = useTranslation()
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id || null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [availability, setAvailability] = useState([])
  const [saving, setSaving] = useState(false)

  const room = rooms.find(r => r.id === selectedRoom)

  useEffect(() => {
    if (!selectedRoom) return
    async function fetch() {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const { data } = await supabase
        .from('room_availability')
        .select('*')
        .eq('room_id', selectedRoom)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
      setAvailability(data || [])
    }
    fetch()
  }, [selectedRoom, currentMonth])

  function getDaysInMonth() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    return { daysInMonth, firstDay }
  }

  function getAvailForDate(day) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return availability.find(a => a.date === dateStr)
  }

  async function toggleBlock(day) {
    if (!room) return
    setSaving(true)
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existing = getAvailForDate(day)

    if (existing) {
      await supabase.from('room_availability').update({
        is_blocked: !existing.is_blocked,
        available_count: existing.is_blocked ? room.quantity : 0
      }).eq('id', existing.id)
    } else {
      await supabase.from('room_availability').insert({
        room_id: selectedRoom,
        date: dateStr,
        available_count: 0,
        is_blocked: true,
      })
    }

    // Refresh
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const { data } = await supabase
      .from('room_availability')
      .select('*')
      .eq('room_id', selectedRoom)
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
    setAvailability(data || [])
    setSaving(false)
  }

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  const { daysInMonth, firstDay } = getDaysInMonth()
  const today = new Date()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  if (rooms.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_rooms_calendar', 'Add rooms first')}</h3>
        <p className="text-gray-500">{t('manage.no_rooms_calendar_desc', 'You need at least one room type to manage availability.')}</p>
      </Card>
    )
  }

  return (
    <div>
      {/* Room selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.select_room', 'Select Room Type')}</label>
        <select value={selectedRoom || ''} onChange={e => setSelectedRoom(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — ${Number(r.base_price).toFixed(0)}/night (x{r.quantity})</option>)}
        </select>
      </div>

      {/* Month navigation */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <h3 className="text-lg font-bold text-deep capitalize">{monthName}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const avail = getAvailForDate(day)
            const isBlocked = avail?.is_blocked
            const isPast = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const priceOverride = avail?.price_override

            return (
              <button
                key={day}
                onClick={() => !isPast && toggleBlock(day)}
                disabled={isPast || saving}
                className={`relative aspect-square rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isPast
                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                    : isBlocked
                    ? 'bg-sunset/10 text-sunset border border-sunset/20 hover:bg-sunset/20'
                    : 'bg-libre/5 text-deep border border-libre/10 hover:bg-libre/15 cursor-pointer'
                }`}
              >
                <span>{day}</span>
                {!isPast && priceOverride && (
                  <span className="text-[10px] text-ocean">${Number(priceOverride).toFixed(0)}</span>
                )}
                {isBlocked && <X size={10} className="text-sunset" />}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-libre/10 border border-libre/10" /> {t('manage.available', 'Available')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-sunset/10 border border-sunset/20" /> {t('manage.blocked', 'Blocked')}
          </span>
          <span className="text-gray-400">{t('manage.click_toggle', 'Click a date to block/unblock')}</span>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// BOOKINGS TAB
// ============================================
function BookingsTab({ bookings, rooms, onRefresh }) {
  const { t } = useTranslation()

  const statusColors = {
    pending: 'orange',
    confirmed: 'green',
    cancelled: 'gray',
    completed: 'blue',
  }

  async function updateStatus(bookingId, newStatus) {
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    onRefresh()
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_bookings', 'No bookings yet')}</h3>
        <p className="text-gray-500">{t('manage.no_bookings_desc', 'Bookings will appear here once travelers start reserving your rooms.')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map(booking => {
        const room = rooms.find(r => r.id === booking.room_id)
        const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24))

        return (
          <Card key={booking.id} className="!p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-deep">{booking.guest_name || 'Guest'}</h3>
                  <Badge variant={statusColors[booking.status] || 'gray'} className="capitalize">{booking.status}</Badge>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <p>{room?.name || 'Room'} — {nights} {nights === 1 ? 'night' : 'nights'}</p>
                  <p>{t('manage.check_in', 'Check-in')}: {booking.check_in} — {t('manage.check_out', 'Check-out')}: {booking.check_out}</p>
                  <p>{booking.guests} {t('manage.guests', 'guest(s)')} — ${Number(booking.total_price).toFixed(2)}</p>
                  {booking.guest_email && <p className="text-gray-400">{booking.guest_email}</p>}
                  {booking.special_requests && <p className="italic text-gray-400">"{booking.special_requests}"</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {booking.status === 'pending' && (
                  <>
                    <Button size="sm" variant="green" onClick={() => updateStatus(booking.id, 'confirmed')}>
                      <Check size={14} /> {t('manage.confirm', 'Confirm')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(booking.id, 'cancelled')}>
                      <X size={14} />
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(booking.id, 'completed')}>
                    {t('manage.mark_completed', 'Mark Completed')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
