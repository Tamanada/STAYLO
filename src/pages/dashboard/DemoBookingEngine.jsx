import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MapPin, Star, BedDouble, Search, Calendar, Users,
  SlidersHorizontal, ArrowUpDown, Heart, Wifi, Wind, Waves,
  Car, Coffee, Umbrella, X, ChevronDown, Grid3X3, List,
  TrendingDown
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const typeIcons = {
  hotel: '🏨', guesthouse: '🏠', resort: '🏝️', villa: '🏡',
  hostel: '🛏️', restaurant: '🍽️', activity: '🎯',
}

const typeLabels = {
  hotel: 'Hotel', guesthouse: 'Guesthouse', resort: 'Resort',
  villa: 'Villa', hostel: 'Hostel',
}

const typeGradients = {
  hotel: 'from-blue-500/70 to-indigo-600/50',
  guesthouse: 'from-emerald-500/70 to-teal-600/50',
  resort: 'from-amber-400/70 to-orange-500/50',
  villa: 'from-purple-500/70 to-indigo-500/50',
  hostel: 'from-rose-400/70 to-pink-500/50',
}

function getRating(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) { hash = ((hash << 5) - hash) + id.charCodeAt(i); hash |= 0 }
  return (4.0 + (Math.abs(hash) % 10) / 10).toFixed(1)
}

function getReviewCount(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) { hash = ((hash << 3) - hash) + id.charCodeAt(i); hash |= 0 }
  return 12 + (Math.abs(hash) % 188)
}

function getRatingLabel(rating) {
  if (rating >= 4.8) return 'Exceptional'
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 4.2) return 'Very Good'
  return 'Good'
}

function getDefaultCheckIn() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function getDefaultCheckOut() {
  const d = new Date(); d.setDate(d.getDate() + 3)
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
  const [sortBy, setSortBy] = useState('price')
  const [typeFilter, setTypeFilter] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [propRes, roomsRes] = await Promise.all([
        supabase.from('properties').select('*').in('status', ['live', 'validated']).order('created_at', { ascending: false }),
        supabase.from('rooms').select('*, room_availability(*)').eq('is_active', true),
      ])
      setProperties(propRes.data || [])
      setRooms(roomsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const propertyPrices = useMemo(() => {
    const prices = {}
    const guestCount = Number(guests)
    for (const room of rooms) {
      if (room.max_guests < guestCount) continue
      let isAvailable = true
      if (room.room_availability) {
        for (const avail of room.room_availability) {
          if (avail.date >= checkIn && avail.date < checkOut) {
            if (avail.is_blocked || avail.available_count <= 0) { isAvailable = false; break }
          }
        }
      }
      if (!isAvailable) continue
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

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))

  const filtered = useMemo(() => {
    let result = properties
    if (searchCity.trim()) {
      const q = searchCity.toLowerCase().trim()
      result = result.filter(p =>
        (p.city || '').toLowerCase().includes(q) ||
        (p.country || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
    }
    if (typeFilter) result = result.filter(p => p.type === typeFilter)
    if (priceMax) {
      const max = Number(priceMax)
      result = result.filter(p => {
        const price = propertyPrices[p.id] || Number(p.avg_nightly_rate) || 0
        return price <= max
      })
    }
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
  }, [properties, searchCity, typeFilter, priceMax, sortBy, propertyPrices])

  function toggleFavorite(id) {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero search section */}
      <div className="relative bg-gradient-to-br from-deep via-deep to-electric/90 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-ocean rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-electric rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              {t('booking.title', 'Find Your Perfect Stay')}
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
              {t('booking.subtitle', 'Book directly with hoteliers — 10% commission only, no hidden fees.')}
            </p>
          </div>

          {/* Search card */}
          <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3">
              {/* Destination */}
              <div className="lg:col-span-4 relative">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  {t('booking.destination', 'Destination')}
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('booking.search_placeholder', 'Where are you going?')}
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-deep placeholder:text-gray-400 focus:outline-none focus:border-ocean focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Check-in */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  {t('booking.check_in', 'Check-in')}
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="date" value={checkIn} min={new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      setCheckIn(e.target.value)
                      if (e.target.value >= checkOut) {
                        const next = new Date(e.target.value); next.setDate(next.getDate() + 1)
                        setCheckOut(next.toISOString().split('T')[0])
                      }
                    }}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-deep focus:outline-none focus:border-ocean focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  {t('booking.check_out', 'Check-out')}
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="date" value={checkOut} min={checkIn}
                    onChange={e => setCheckOut(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-deep focus:outline-none focus:border-ocean focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  {t('booking.guests', 'Guests')}
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={guests} onChange={e => setGuests(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-deep focus:outline-none focus:border-ocean focus:bg-white transition-all text-sm font-medium appearance-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? t('booking.guest', 'Guest') : t('booking.guests', 'Guests')}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Search button */}
              <div className="lg:col-span-2 flex items-end">
                <button className="w-full py-3 bg-gradient-to-r from-ocean to-electric text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-ocean/30 transition-all flex items-center justify-center gap-2">
                  <Search size={18} />
                  <span className="hidden sm:inline">{t('booking.search', 'Search')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-deep">
              {searchCity.trim()
                ? t('booking.results_in', 'Stays in "{{location}}"', { location: searchCity })
                : t('booking.all_stays', 'All Stays')}
            </h2>
            <span className="text-sm text-gray-400 font-medium">
              ({filtered.length} {t('booking.found', 'found')})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filters toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                showFilters ? 'bg-ocean/10 border-ocean/30 text-ocean' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              <SlidersHorizontal size={14} />
              {t('booking.filters', 'Filters')}
              {(typeFilter || priceMax) && (
                <span className="w-5 h-5 rounded-full bg-ocean text-white text-[10px] font-bold flex items-center justify-center">
                  {(typeFilter ? 1 : 0) + (priceMax ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300">
              <option value="price">{t('booking.sort_price', 'Price: Low to High')}</option>
              <option value="rating">{t('booking.sort_rating', 'Top Rated')}</option>
            </select>

            {/* View toggle */}
            <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-ocean/10 text-ocean' : 'text-gray-400 hover:text-gray-600'}`}>
                <Grid3X3 size={16} />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-ocean/10 text-ocean' : 'text-gray-400 hover:text-gray-600'}`}>
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('booking.property_type', 'Property Type')}</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white min-w-[140px]">
                <option value="">{t('booking.all_types', 'All Types')}</option>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{typeIcons[k]} {v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('booking.max_price', 'Max Price / Night')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  placeholder="No limit" min={0}
                  className="pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white w-32" />
              </div>
            </div>
            {(typeFilter || priceMax) && (
              <button onClick={() => { setTypeFilter(''); setPriceMax('') }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-sunset transition-colors">
                <X size={14} /> {t('booking.clear_filters', 'Clear')}
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-medium">{t('booking.searching', 'Searching available properties...')}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-deep mb-2">
              {searchCity.trim() ? t('booking.no_results', 'No properties found') : t('booking.empty_title', 'No properties listed yet')}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchCity.trim()
                ? t('booking.try_different', 'Try adjusting your filters or search for a different destination.')
                : t('booking.empty_subtitle', 'Be the first to register your property!')}
            </p>
            {searchCity.trim() && (
              <button onClick={() => { setSearchCity(''); setTypeFilter(''); setPriceMax('') }}
                className="px-5 py-2.5 bg-ocean text-white rounded-xl font-medium text-sm hover:bg-ocean/90 transition-colors">
                {t('booking.clear_search', 'Clear All Filters')}
              </button>
            )}
          </div>
        )}

        {/* Property grid / list */}
        {!loading && filtered.length > 0 && (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
            : 'space-y-4'
          }>
            {filtered.map(prop => {
              const rating = getRating(prop.id)
              const reviewCount = getReviewCount(prop.id)
              const typeIcon = typeIcons[prop.type] || '🏨'
              const gradient = typeGradients[prop.type] || 'from-blue-500/70 to-indigo-600/50'
              const lowestPrice = propertyPrices[prop.id] || Number(prop.avg_nightly_rate || 0)
              const hasRooms = propertyPrices[prop.id] !== undefined
              const firstPhoto = prop.photo_urls && prop.photo_urls.length > 0 ? prop.photo_urls[0] : null
              const isFav = favorites.includes(prop.id)
              const ratingLabel = getRatingLabel(Number(rating))
              const totalStay = lowestPrice * nights

              if (viewMode === 'list') {
                return (
                  <Link key={prop.id} to={`/dashboard/book/${prop.id}?in=${checkIn}&out=${checkOut}&guests=${guests}`}
                    className="no-underline">
                    <div className="bg-white rounded-xl border border-gray-100 hover:border-ocean/30 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className={`sm:w-72 h-48 sm:h-auto relative flex-shrink-0 ${!firstPhoto ? `bg-gradient-to-br ${gradient}` : ''}`}>
                        {firstPhoto ? (
                          <img src={firstPhoto} alt={prop.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl opacity-60">{typeIcon}</span>
                          </div>
                        )}
                        <button onClick={e => { e.preventDefault(); toggleFavorite(prop.id) }}
                          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm">
                          <Heart size={16} className={isFav ? 'fill-sunset text-sunset' : 'text-gray-400'} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ocean">{typeLabels[prop.type] || 'Hotel'}</span>
                              <h3 className="text-lg font-bold text-deep">{prop.name}</h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={13} /> {prop.city}{prop.country ? `, ${prop.country}` : ''}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <div className="flex items-center gap-1.5">
                                <div className="text-right">
                                  <p className="text-xs text-gray-400">{ratingLabel}</p>
                                  <p className="text-xs text-gray-400">{reviewCount} reviews</p>
                                </div>
                                <span className="bg-ocean text-white text-sm font-bold px-2 py-1.5 rounded-lg rounded-tl-none">
                                  {rating}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-libre/10 text-libre px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <TrendingDown size={10} /> 10% {t('booking.commission_only', 'commission only')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')}, {guests} {t('booking.guests', 'guests')}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-deep">${totalStay.toFixed(0)}</p>
                            <p className="text-xs text-gray-400">${lowestPrice.toFixed(0)} / {t('booking.night', 'night')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              }

              // Grid card
              return (
                <Link key={prop.id} to={`/dashboard/book/${prop.id}?in=${checkIn}&out=${checkOut}&guests=${guests}`}
                  className="no-underline group">
                  <div className="bg-white rounded-2xl border border-gray-100 hover:border-ocean/20 hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                    {/* Image */}
                    <div className={`h-52 relative overflow-hidden ${!firstPhoto ? `bg-gradient-to-br ${gradient}` : ''}`}>
                      {firstPhoto ? (
                        <img src={firstPhoto} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <span className="text-7xl opacity-50">{typeIcon}</span>
                        </div>
                      )}

                      {/* Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Favorite */}
                      <button onClick={e => { e.preventDefault(); toggleFavorite(prop.id) }}
                        className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm z-10">
                        <Heart size={16} className={isFav ? 'fill-sunset text-sunset' : 'text-gray-500'} />
                      </button>

                      {/* Type badge */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-white/90 backdrop-blur-sm text-deep text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                          {typeLabels[prop.type] || 'Hotel'}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-ocean text-white text-sm font-bold px-2.5 py-1 rounded-lg shadow-lg">
                          {rating}
                        </span>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex-1">
                        <h3 className="font-bold text-deep text-base mb-1 group-hover:text-ocean transition-colors line-clamp-1">
                          {prop.name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{prop.city}{prop.country ? `, ${prop.country}` : ''}</span>
                        </p>

                        {/* Quick info */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Star size={12} className="text-golden fill-golden" /> {ratingLabel}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{reviewCount} {t('booking.reviews', 'reviews')}</span>
                        </div>

                        {/* STAYLO advantage */}
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-libre bg-libre/8 px-2 py-1 rounded-full">
                          <TrendingDown size={10} /> {t('booking.save_vs_ota', 'Save vs. OTAs')}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between">
                        <div className="text-xs text-gray-400">
                          {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-deep leading-tight">${totalStay.toFixed(0)}</p>
                          <p className="text-[11px] text-gray-400">${lowestPrice.toFixed(0)} / {t('booking.night', 'night')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Bottom banner */}
        {!loading && filtered.length > 0 && (
          <div className="mt-10 bg-gradient-to-r from-ocean/5 to-electric/5 border border-ocean/10 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-600 font-medium">
              {t('booking.staylo_promise', "With STAYLO, you book directly with the hotel — only 10% commission vs. 15-25% on other platforms. That's savings for everyone.")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
