import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BedDouble, Users, LogIn, LogOut, Clock, AlertCircle,
  ChevronLeft, ChevronRight, Building2, Phone, Mail, Search
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: props } = await supabase
        .from('properties').select('*').eq('user_id', user.id).order('created_at')
      setProperties(props || [])
      if (props?.length > 0) setSelectedProperty(props[0].id)

      const propIds = (props || []).map(p => p.id)
      if (propIds.length > 0) {
        const [roomsRes, bookingsRes] = await Promise.all([
          supabase.from('rooms').select('*').in('property_id', propIds),
          supabase.from('bookings').select('*').in('property_id', propIds).in('status', ['confirmed', 'checked_in']),
        ])
        setRooms(roomsRes.data || [])
        setBookings(bookingsRes.data || [])
      }
      setLoading(false)
    }
    if (user) fetchData()
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
              <div key={room.id}
                className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${cfg.color}`}>
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
                    <button className="flex-1 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                      <LogIn size={10} /> Check In
                    </button>
                  )}
                  {room.status === 'checkout' && (
                    <button className="flex-1 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                      <LogOut size={10} /> Check Out
                    </button>
                  )}
                  {room.status === 'occupied' && (
                    <div className="flex-1 py-1.5 text-center text-[10px] font-medium opacity-50 flex items-center justify-center gap-1">
                      <Clock size={10} /> In stay
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
