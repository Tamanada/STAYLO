// ============================================
// Dashboard — Incoming Reservations (hotelier view)
// ============================================
// Standalone component for the "bookings made ON the current user's
// properties" view. Previously this lived as a second tab inside
// MyBookings; David moved it onto the Properties page (as a tab next to
// "Mes propriétés") so the traveller dashboard stays focused on trips.
//
// Renders without an outer page wrapper so a parent (DashboardProperties)
// can place it inside its own tabs/layout. If no parent renders it, the
// /dashboard/bookings/incoming route still works as a direct standalone
// page (defensive — keeps deep-links from old emails / bookmarks alive).
// ============================================
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { BookingCard } from './MyBookings'

export default function IncomingBookings({ embedded = false }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [bookings, setBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [rooms, setRooms] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      // 1. Find this user's properties
      const myPropsRes = await supabase
        .from('properties').select('id')
        .eq('user_id', user.id)
      const myPropertyIds = (myPropsRes.data || []).map(p => p.id)

      // 2. Bookings made on those properties
      let incoming = []
      if (myPropertyIds.length > 0) {
        const incomingRes = await supabase
          .from('bookings').select('*')
          .in('property_id', myPropertyIds)
          .order('created_at', { ascending: false })
        incoming = incomingRes.data || []
      }

      if (cancelled) return
      setBookings(incoming)

      // 3. Hydrate related properties + rooms
      const propIds = [...new Set(incoming.map(b => b.property_id).filter(Boolean))]
      const roomIds = [...new Set(incoming.map(b => b.room_id).filter(Boolean))]

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
  // setSearchParams is stable from react-router; only re-run when the
  // signed-in user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
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

  const isEmpty = bookings.length === 0

  // Body content — same in standalone and embedded modes
  const body = (
    <>
      {/* Subtitle / page intro */}
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
            <Building2 size={24} className="text-ocean" />
            {t('bookings.incoming_title', 'Réservations reçues')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('bookings.incoming_subtitle', 'Bookings made on your properties — guest contact, dates, special requests.')}
          </p>
        </div>
      )}

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
          <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('bookings.no_incoming', 'Aucune réservation reçue')}
          </h2>
          <p className="text-gray-500 mb-6">
            {t('bookings.no_incoming_desc', 'Lorsqu\'un voyageur réservera dans vos propriétés, ils apparaîtront ici.')}
          </p>
          <Link to="/dashboard/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline transition-all">
            <Building2 size={16} />
            {t('bookings.manage_properties', 'Gérer mes propriétés')}
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
                    isHotelier
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
                    isHotelier
                    isPast
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )

  // Embedded: no outer container — parent provides its own layout
  if (embedded) return body

  // Standalone: same outer container as MyBookings
  return <div className="max-w-4xl mx-auto px-4 py-6">{body}</div>
}
