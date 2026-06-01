// ============================================
// Dashboard — My Bookings (traveler view)
// ============================================
// Bookings the current user made AS A GUEST. Focus: upcoming trips, history.
//
// The hotelier-side "Réservations reçues" view used to live here as a second
// tab; it was moved to /dashboard/properties (as a tab next to "Mes
// propriétés") so this page stays focused on the traveler experience.
// See ./IncomingBookings.jsx for the standalone component.
//
// BookingCard + STATUS_CONFIG are exported so IncomingBookings can reuse
// them without duplicating the rich card layout.
// ============================================
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Calendar, MapPin, BedDouble, Users, Clock, CheckCircle,
  XCircle, Search, Luggage, Mail, Phone,
  MessageSquare, DollarSign
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../lib/currencies'
import { formatDate } from '../../lib/dateFormat'

export const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,       color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', icon: XCircle,     color: 'bg-gray-50 text-gray-500 border-gray-200',         dot: 'bg-gray-400' },
}

export default function MyBookings() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [tripBookings, setTripBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [rooms, setRooms] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchAll() {
      setLoading(true)

      // Bookings made by the user as a GUEST
      const tripsRes = await supabase
        .from('bookings').select('*')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false })
      const trips = tripsRes.data || []

      if (cancelled) return
      setTripBookings(trips)

      // Hydrate related properties + rooms
      const propIds = [...new Set(trips.map(b => b.property_id).filter(Boolean))]
      const roomIds = [...new Set(trips.map(b => b.room_id).filter(Boolean))]

      if (propIds.length > 0) {
        const { data: props } = await supabase
          .from('properties').select('id, name, city, country, photo_urls, currency')
          .in('id', propIds)
        const propMap = {}
        ;(props || []).forEach(p => { propMap[p.id] = p })
        if (!cancelled) setProperties(propMap)
      }
      if (roomIds.length > 0) {
        const { data: rms } = await supabase
          .from('rooms').select('id, name, bed_type, max_guests')
          .in('id', roomIds)
        const roomMap = {}
        ;(rms || []).forEach(r => { roomMap[r.id] = r })
        if (!cancelled) setRooms(roomMap)
      }

      if (!cancelled) setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [user])

  const filtered = filter === 'all' ? tripBookings : tripBookings.filter(b => b.status === filter)
  const now = new Date().toISOString().split('T')[0]
  const upcoming = filtered.filter(b => b.check_in >= now && b.status !== 'cancelled')
  const past     = filtered.filter(b => b.check_in <  now || b.status === 'cancelled')

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  const isEmpty = tripBookings.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
          <Luggage size={24} className="text-ocean" />
          {t('bookings.trips_title', 'Mes voyages')}
        </h1>
        <p className="text-sm text-gray-500">
          {t('bookings.trips_subtitle', 'Your reservations as a traveler — past and upcoming trips.')}
        </p>
      </div>

      {/* Status filter chips */}
      {!isEmpty && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
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
      )}

      {isEmpty ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bookings.no_bookings', 'Aucun voyage pour l\'instant')}</h2>
          <p className="text-gray-500 mb-6">{t('bookings.no_bookings_desc', 'Commencez à explorer des hôtels et faites votre première réservation.')}</p>
          <Link to="/ota"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline transition-all">
            <Search size={16} />
            {t('bookings.browse_hotels', 'Parcourir les hôtels')}
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t('bookings.upcoming', 'Upcoming')} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    property={properties[booking.property_id]}
                    room={rooms[booking.room_id]}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t('bookings.past', 'Past & Cancelled')} ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    property={properties[booking.property_id]}
                    room={rooms[booking.room_id]}
                    isPast
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Shared BookingCard — exported for IncomingBookings ────────────────
//
// `isHotelier` flips the layout to surface guest contact (name / email /
// phone / special requests) and to show "You receive" instead of "Total"
// using the payout_amount_cents column. Trip cards (the default) hide
// those panels since the guest is the viewer.
export function BookingCard({ booking, property, room, isHotelier = false, isPast = false }) {
  const { t } = useTranslation()
  const nights = Math.max(1, Math.ceil(
    (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
  ))
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  const photoUrl   = property?.photo_urls?.[0]
  const currency   = (booking.currency || property?.currency || 'USD').toUpperCase()

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
            <div className="min-w-0">
              {/* Booking reference — copyable, communication-friendly */}
              {booking.booking_ref && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(booking.booking_ref)}
                  title={t('bookings.copy_ref', 'Click to copy reference')}
                  className="text-[10px] font-mono uppercase tracking-wider text-orange/80 hover:text-orange bg-orange/5 hover:bg-orange/10 px-2 py-0.5 rounded inline-flex items-center gap-1 mb-1.5 transition-colors cursor-pointer"
                >
                  #{booking.booking_ref}
                </button>
              )}
              <h3 className="font-bold text-gray-900 text-lg truncate">{property?.name || 'Property'}</h3>
              {property && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={12} />
                  {[property.city, property.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap flex-shrink-0 ${cfg.color}`}>
              <StatusIcon size={12} />
              {cfg.label}
            </span>
          </div>

          {/* Hotelier-only block: guest contact info */}
          {isHotelier && (
            <div className="mb-3 mt-2 p-3 bg-orange/5 border border-orange/15 rounded-lg space-y-1 text-xs">
              <p className="font-semibold text-deep flex items-center gap-1.5">
                <Users size={12} className="text-orange" />
                {booking.guest_name || 'Guest'}
              </p>
              {booking.guest_email && (
                <p className="text-gray-600 flex items-center gap-1.5">
                  <Mail size={11} className="text-gray-400" />
                  <a href={`mailto:${booking.guest_email}`} className="hover:text-ocean">{booking.guest_email}</a>
                </p>
              )}
              {booking.guest_phone && (
                <p className="text-gray-600 flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400" />
                  <a href={`tel:${booking.guest_phone}`} className="hover:text-ocean">{booking.guest_phone}</a>
                </p>
              )}
              {booking.special_requests && (
                <p className="text-gray-600 flex items-start gap-1.5 italic">
                  <MessageSquare size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="italic">"{booking.special_requests}"</span>
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Check-in</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Calendar size={12} className="text-ocean" />
                {formatDate(booking.check_in)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Check-out</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Calendar size={12} className="text-ocean" />
                {formatDate(booking.check_out)}
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
              <p className="text-gray-400 text-xs">
                {isHotelier ? 'You receive' : 'Total'}
              </p>
              <p className="font-bold text-ocean text-base flex items-center gap-1">
                <DollarSign size={12} />
                {isHotelier && booking.payout_amount_cents
                  ? formatCurrency(booking.payout_amount_cents / 100, currency)
                  : formatCurrency(Number(booking.total_price || 0), currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span>{nights} night{nights > 1 ? 's' : ''}</span>
            <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
            {booking.payment_method && (
              <span className="uppercase tracking-wider text-[10px] font-bold text-ocean/60">
                {booking.payment_method === 'card' ? '💳 card' : booking.payment_method === 'lightning' ? '⚡ lightning' : booking.payment_method}
              </span>
            )}
            {booking.escrow_status && booking.escrow_status !== 'none' && (
              <span className={`uppercase tracking-wider text-[10px] font-bold ${
                booking.escrow_status === 'released' ? 'text-libre' :
                booking.escrow_status === 'held' ? 'text-amber-600' :
                'text-gray-500'
              }`}>
                escrow: {booking.escrow_status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
