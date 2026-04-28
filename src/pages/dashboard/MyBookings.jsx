// ============================================
// Dashboard — My Bookings + Incoming Reservations
// ============================================
// Two tabs in one page:
//   - "Mes voyages" (guest view): bookings the current user made AS A GUEST.
//     Focus: upcoming trips, history.
//   - "Réservations reçues" (hotelier view): bookings made ON the current
//     user's PROPERTIES. Focus: ops — who arrives when, contact info,
//     special requests. Only shown if the user owns at least one property.
//
// The split comes from the bookings table having both `guest_id` (FK to
// users) and `property_id` (FK to properties.user_id chain). RLS already
// allows both views (Guest can read own + Owner can read property bookings).
// ============================================
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Calendar, MapPin, BedDouble, Users, Clock, CheckCircle,
  XCircle, AlertCircle, Search, Luggage, Building2, Mail, Phone,
  MessageSquare, DollarSign
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../lib/currencies'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,       color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', icon: XCircle,     color: 'bg-gray-50 text-gray-500 border-gray-200',         dot: 'bg-gray-400' },
}

export default function MyBookings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialView = searchParams.get('view') === 'incoming' ? 'incoming' : 'trips'
  const [view, setView] = useState(initialView)

  const [tripBookings, setTripBookings] = useState([])
  const [incomingBookings, setIncomingBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [rooms, setRooms] = useState({})
  const [hasProperties, setHasProperties] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchAll() {
      setLoading(true)

      // 1. Bookings made by the user as a GUEST
      const tripsRes = await supabase
        .from('bookings').select('*')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false })
      const trips = tripsRes.data || []

      // 2. Bookings made TO the user's properties (hotelier view).
      //    First find their properties, then bookings on those.
      const myPropsRes = await supabase
        .from('properties').select('id')
        .eq('user_id', user.id)
      const myPropertyIds = (myPropsRes.data || []).map(p => p.id)
      let incoming = []
      if (myPropertyIds.length > 0) {
        const incomingRes = await supabase
          .from('bookings').select('*')
          .in('property_id', myPropertyIds)
          .order('created_at', { ascending: false })
        incoming = incomingRes.data || []
      }

      if (cancelled) return

      setTripBookings(trips)
      setIncomingBookings(incoming)
      setHasProperties(myPropertyIds.length > 0)

      // 3. Hydrate related properties + rooms (union of both lists)
      const all = [...trips, ...incoming]
      const propIds = [...new Set(all.map(b => b.property_id).filter(Boolean))]
      const roomIds = [...new Set(all.map(b => b.room_id).filter(Boolean))]

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

  // Switch tab — also reflect in the URL so it's bookmarkable
  function switchView(next) {
    setView(next)
    if (next === 'incoming') searchParams.set('view', 'incoming')
    else searchParams.delete('view')
    setSearchParams(searchParams, { replace: true })
  }

  const sourceList = view === 'incoming' ? incomingBookings : tripBookings
  const filtered   = filter === 'all' ? sourceList : sourceList.filter(b => b.status === filter)

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

  const isHotelier = view === 'incoming'
  const isEmpty    = sourceList.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
          {isHotelier
            ? <Building2 size={24} className="text-ocean" />
            : <Luggage   size={24} className="text-ocean" />}
          {isHotelier
            ? t('bookings.incoming_title', 'Réservations reçues')
            : t('bookings.trips_title',    'Mes voyages')}
        </h1>
        <p className="text-sm text-gray-500">
          {isHotelier
            ? t('bookings.incoming_subtitle', 'Bookings made on your properties — guest contact, dates, special requests.')
            : t('bookings.trips_subtitle',    'Your reservations as a traveler — past and upcoming trips.')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => switchView('trips')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            view === 'trips' ? 'bg-white shadow-sm text-deep' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Luggage size={14} />
          {t('bookings.tab_trips', 'Mes voyages')}
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            {tripBookings.length}
          </span>
        </button>
        {hasProperties && (
          <button
            onClick={() => switchView('incoming')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              view === 'incoming' ? 'bg-white shadow-sm text-deep' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 size={14} />
            {t('bookings.tab_incoming', 'Réservations reçues')}
            <span className="text-[10px] bg-orange/10 text-orange px-1.5 py-0.5 rounded-full font-bold">
              {incomingBookings.length}
            </span>
          </button>
        )}
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
        <EmptyState isHotelier={isHotelier} t={t} />
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
                    isHotelier={isHotelier}
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
                    isHotelier={isHotelier}
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

// ── Sub-components ───────────────────────────────────────

function EmptyState({ isHotelier, t }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      {isHotelier ? (
        <>
          <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bookings.no_incoming', 'Aucune réservation reçue')}</h2>
          <p className="text-gray-500 mb-6">{t('bookings.no_incoming_desc', 'Lorsqu\'un voyageur réservera dans vos propriétés, ils apparaîtront ici.')}</p>
          <Link to="/dashboard/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline transition-all">
            <Building2 size={16} />
            {t('bookings.manage_properties', 'Gérer mes propriétés')}
          </Link>
        </>
      ) : (
        <>
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bookings.no_bookings', 'Aucun voyage pour l\'instant')}</h2>
          <p className="text-gray-500 mb-6">{t('bookings.no_bookings_desc', 'Commencez à explorer des hôtels et faites votre première réservation.')}</p>
          <Link to="/ota"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline transition-all">
            <Search size={16} />
            {t('bookings.browse_hotels', 'Parcourir les hôtels')}
          </Link>
        </>
      )}
    </div>
  )
}

function BookingCard({ booking, property, room, isHotelier, isPast }) {
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
