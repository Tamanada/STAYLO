import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, Star, BedDouble, Search, Calendar, Users, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const typeIcons = {
  hotel: '🏨',
  guesthouse: '🏠',
  resort: '🏝️',
  villa: '🏡',
  hostel: '🛏️',
  restaurant: '🍽️',
  activity: '🎯',
}

const typeGradients = {
  hotel: 'from-ocean/60 to-electric/40',
  guesthouse: 'from-libre/60 to-ocean/40',
  resort: 'from-golden/60 to-sunrise/40',
  villa: 'from-electric/60 to-libre/40',
  hostel: 'from-sunrise/60 to-sunset/40',
  restaurant: 'from-sunset/60 to-golden/40',
  activity: 'from-libre/60 to-golden/40',
}

function getRating(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return (4.0 + (Math.abs(hash) % 10) / 10).toFixed(1)
}

function getReviewCount(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 3) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return 12 + (Math.abs(hash) % 188)
}

// Get tomorrow's date as default check-in
function getDefaultCheckIn() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function getDefaultCheckOut() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export default function DemoBookingEngine() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState(searchParams.get('q') || '')
  const [checkIn, setCheckIn] = useState(searchParams.get('in') || getDefaultCheckIn())
  const [checkOut, setCheckOut] = useState(searchParams.get('out') || getDefaultCheckOut())
  const [guests, setGuests] = useState(searchParams.get('guests') || '2')
  const [sortBy, setSortBy] = useState('price') // price, rating
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [propRes, roomsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .in('status', ['live', 'validated'])
          .order('created_at', { ascending: false }),
        supabase
          .from('rooms')
          .select('*, room_availability(*)')
          .eq('is_active', true),
      ])
      setProperties(propRes.data || [])
      setRooms(roomsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // Build property-to-lowest-price mapping based on rooms and availability
  const propertyPrices = useMemo(() => {
    const prices = {}
    const guestCount = Number(guests)

    for (const room of rooms) {
      if (room.max_guests < guestCount) continue

      // Check if room has any blocked dates in the range
      let isAvailable = true
      if (room.room_availability) {
        for (const avail of room.room_availability) {
          if (avail.date >= checkIn && avail.date < checkOut) {
            if (avail.is_blocked || avail.available_count <= 0) {
              isAvailable = false
              break
            }
          }
        }
      }
      if (!isAvailable) continue

      // Calculate price for the stay
      const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
      let totalPrice = 0
      const d = new Date(checkIn)
      for (let i = 0; i < nights; i++) {
        const dateStr = d.toISOString().split('T')[0]
        const override = room.room_availability?.find(a => a.date === dateStr)
        totalPrice += Number(override?.price_override || room.base_price)
        d.setDate(d.getDate() + 1)
      }
      const pricePerNight = totalPrice / nights

      if (!prices[room.property_id] || pricePerNight < prices[room.property_id]) {
        prices[room.property_id] = pricePerNight
      }
    }
    return prices
  }, [rooms, checkIn, checkOut, guests])

  const filtered = useMemo(() => {
    let result = properties

    // Text search
    if (searchCity.trim()) {
      const q = searchCity.toLowerCase().trim()
      result = result.filter(p =>
        (p.city || '').toLowerCase().includes(q) ||
        (p.country || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
    }

    // Type filter
    if (typeFilter) {
      result = result.filter(p => p.type === typeFilter)
    }

    // Sort
    if (sortBy === 'price') {
      result = [...result].sort((a, b) => {
        const pa = propertyPrices[a.id] || Number(a.avg_nightly_rate) || 9999
        const pb = propertyPrices[b.id] || Number(b.avg_nightly_rate) || 9999
        return pa - pb
      })
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => Number(getRating(b.id)) - Number(getRating(a.id)))
    }

    return result
  }, [properties, searchCity, typeFilter, sortBy, propertyPrices])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">
          {t('booking.title', 'Find Your Perfect Stay')}
        </h1>
        <p className="text-gray-500">
          {t('booking.subtitle', 'Search and book directly with hoteliers — only 10% commission, no hidden fees.')}
        </p>
      </div>

      {/* Search bar */}
      <Card className="p-4 mb-6 !rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <MapPin size={12} className="inline mr-1" />
              {t('booking.destination', 'Destination')}
            </label>
            <input
              type="text"
              placeholder={t('booking.search_placeholder', 'City, country, or property name...')}
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar size={12} className="inline mr-1" />
              {t('booking.check_in', 'Check-in')}
            </label>
            <input
              type="date"
              value={checkIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                setCheckIn(e.target.value)
                if (e.target.value >= checkOut) {
                  const next = new Date(e.target.value)
                  next.setDate(next.getDate() + 1)
                  setCheckOut(next.toISOString().split('T')[0])
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar size={12} className="inline mr-1" />
              {t('booking.check_out', 'Check-out')}
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={e => setCheckOut(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Users size={12} className="inline mr-1" />
              {t('booking.guests', 'Guests')}
            </label>
            <div className="flex gap-2">
              <select
                value={guests}
                onChange={e => setGuests(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? t('booking.guest', 'Guest') : t('booking.guests', 'Guests')}</option>
                ))}
              </select>
              <button
                className="px-4 py-2.5 bg-gradient-to-r from-ocean to-electric text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600">
            <option value="">{t('booking.all_types', 'All Types')}</option>
            <option value="hotel">Hotel</option>
            <option value="guesthouse">Guesthouse</option>
            <option value="resort">Resort</option>
            <option value="villa">Villa</option>
            <option value="hostel">Hostel</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600">
            <option value="price">{t('booking.sort_price', 'Price: Low to High')}</option>
            <option value="rating">{t('booking.sort_rating', 'Rating: High to Low')}</option>
          </select>
        </div>
        <span className="text-sm text-gray-400 ml-auto">
          {t('booking.results_count', '{{count}} properties found', { count: filtered.length })}
        </span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-20 text-center text-gray-400">
          {t('common.loading', 'Loading...')}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">🏨</div>
          <h3 className="text-xl font-bold text-deep mb-2">
            {searchCity.trim()
              ? t('booking.no_results', 'No properties found')
              : t('booking.empty_title', 'No properties listed yet')}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchCity.trim()
              ? t('booking.try_different', 'Try a different destination or clear your search.')
              : t('booking.empty_subtitle', 'Be the first to register yours!')}
          </p>
          {searchCity.trim() && (
            <Button size="sm" variant="secondary" onClick={() => setSearchCity('')}>
              {t('booking.clear_search', 'Clear Search')}
            </Button>
          )}
        </Card>
      )}

      {/* Property grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(prop => {
            const rating = getRating(prop.id)
            const reviewCount = getReviewCount(prop.id)
            const typeIcon = typeIcons[prop.type] || '🏨'
            const gradient = typeGradients[prop.type] || 'from-ocean/60 to-electric/40'
            const lowestPrice = propertyPrices[prop.id] || Number(prop.avg_nightly_rate || 0)
            const hasRooms = propertyPrices[prop.id] !== undefined
            const firstPhoto = prop.photo_urls && prop.photo_urls.length > 0 ? prop.photo_urls[0] : null

            return (
              <Card key={prop.id} className="overflow-hidden !p-0 hover:shadow-lg transition-shadow duration-300 group">
                {/* Property image */}
                <div className={`h-48 ${!firstPhoto ? `bg-gradient-to-br ${gradient}` : ''} flex items-center justify-center relative overflow-hidden`}>
                  {firstPhoto ? (
                    <img src={firstPhoto} alt={prop.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl opacity-60">{typeIcon}</span>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="blue" className="!bg-white/90 !text-deep text-xs capitalize">
                      {prop.type || 'hotel'}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                    <Star size={14} className="text-golden fill-golden" />
                    <span className="text-xs font-bold text-deep">{rating}</span>
                  </div>
                </div>

                {/* Card content */}
                <div className="p-4">
                  <h3 className="font-bold text-deep text-lg mb-1 group-hover:text-ocean transition-colors">
                    {prop.name}
                  </h3>

                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{prop.city}{prop.country ? `, ${prop.country}` : ''}</span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BedDouble size={14} />
                        {prop.room_count || '—'} {t('booking.rooms', 'rooms')}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        ({reviewCount} {t('booking.reviews', 'reviews')})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      {hasRooms ? (
                        <>
                          <span className="text-xs text-gray-400">{t('booking.from', 'from')}</span>{' '}
                          <span className="text-xl font-black text-deep">
                            ${lowestPrice.toFixed(0)}
                          </span>
                          <span className="text-sm text-gray-400">/{t('booking.night', 'night')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-black text-deep">
                            ${Number(prop.avg_nightly_rate || 0).toFixed(0)}
                          </span>
                          <span className="text-sm text-gray-400">/{t('booking.night', 'night')}</span>
                        </>
                      )}
                    </div>
                    <Link to={`/dashboard/book/${prop.id}?in=${checkIn}&out=${checkOut}&guests=${guests}`}>
                      <Button size="sm" variant="ghost" className="!text-ocean hover:!text-electric">
                        {t('booking.view_details', 'View Details')} &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
