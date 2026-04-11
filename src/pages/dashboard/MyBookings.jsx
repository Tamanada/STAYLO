import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Calendar, MapPin, BedDouble, Users, Clock, CheckCircle,
  XCircle, AlertCircle, Search, ChevronRight, Luggage
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,       color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', icon: CheckCircle,  color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', icon: XCircle,      color: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
}

export default function MyBookings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [rooms, setRooms] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    async function fetch() {
      setLoading(true)
      const { data: bks } = await supabase
        .from('bookings')
        .select('*')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false })

      setBookings(bks || [])

      // Fetch related properties and rooms
      const propIds = [...new Set((bks || []).map(b => b.property_id).filter(Boolean))]
      const roomIds = [...new Set((bks || []).map(b => b.room_id).filter(Boolean))]

      if (propIds.length > 0) {
        const { data: props } = await supabase.from('properties').select('id, name, city, country, photo_urls').in('id', propIds)
        const propMap = {}
        ;(props || []).forEach(p => { propMap[p.id] = p })
        setProperties(propMap)
      }

      if (roomIds.length > 0) {
        const { data: rms } = await supabase.from('rooms').select('id, name, bed_type, max_guests').in('id', roomIds)
        const roomMap = {}
        ;(rms || []).forEach(r => { roomMap[r.id] = r })
        setRooms(roomMap)
      }

      setLoading(false)
    }
    fetch()
  }, [user])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  // Split into upcoming and past
  const now = new Date().toISOString().split('T')[0]
  const upcoming = filtered.filter(b => b.check_in >= now && b.status !== 'cancelled')
  const past = filtered.filter(b => b.check_in < now || b.status === 'cancelled')

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Luggage size={24} className="text-ocean" />
            {t('bookings.my_bookings', 'My Bookings')}
          </h1>
          <p className="text-sm text-gray-500">{t('bookings.subtitle', 'Your reservations and travel history')}</p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-ocean text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {f === 'all' ? t('bookings.filter_all', 'All') : f}
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bookings.no_bookings', 'No bookings yet')}</h2>
          <p className="text-gray-500 mb-6">{t('bookings.no_bookings_desc', 'Start exploring hotels and make your first reservation.')}</p>
          <Link to="/dashboard/book"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline transition-all">
            <Search size={16} />
            {t('bookings.browse_hotels', 'Browse Hotels')}
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t('bookings.upcoming', 'Upcoming')} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map(booking => (
                  <BookingCard key={booking.id} booking={booking} property={properties[booking.property_id]} room={rooms[booking.room_id]} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t('bookings.past', 'Past & Cancelled')} ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map(booking => (
                  <BookingCard key={booking.id} booking={booking} property={properties[booking.property_id]} room={rooms[booking.room_id]} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BookingCard({ booking, property, room, isPast }) {
  const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)))
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon

  const photoUrl = property?.photo_urls?.[0]

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md ${isPast ? 'opacity-75' : ''}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Photo */}
        <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={property?.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ocean/20 to-electric/20 flex items-center justify-center">
              <BedDouble size={32} className="text-ocean/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{property?.name || 'Property'}</h3>
              {property && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={12} />
                  {[property.city, property.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
              <StatusIcon size={12} />
              {cfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Check-in</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Calendar size={12} className="text-ocean" />
                {booking.check_in}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Check-out</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Calendar size={12} className="text-ocean" />
                {booking.check_out}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Room</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <BedDouble size={12} className="text-ocean" />
                {room?.name || 'Room'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total</p>
              <p className="font-bold text-ocean text-base">
                ${Number(booking.total_price || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span>{nights} night{nights > 1 ? 's' : ''}</span>
            <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
            {booking.special_requests && <span className="italic truncate max-w-[200px]">"{booking.special_requests}"</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
