import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MapPin, Star, Search, Calendar, Users, Heart, X,
  ChevronDown, TrendingDown, Wifi, Car, Waves, Coffee,
  Wind, Utensils, Dumbbell, Sparkles, Shield, Clock,
  ArrowRight, BadgeCheck, Flame
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { matchRegion, propertyMatchesRegion } from '../../lib/regions'
import GuestPicker from '../../components/ota/GuestPicker'


const DESTINATIONS = [
  { name: 'Bangkok', count: 284, img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80' },
  { name: 'Koh Phangan', count: 87, img: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=600&q=80', badge: 'STAYLO HQ' },
  { name: 'Phuket', count: 196, img: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=600&q=80' },
  { name: 'Chiang Mai', count: 152, img: 'https://images.unsplash.com/photo-1598935898639-81586f7d2129?w=600&q=80' },
  { name: 'Koh Samui', count: 134, img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80' },
  { name: 'Krabi', count: 98, img: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=600&q=80' },
]

const amenityIcons = {
  wifi: Wifi, pool: Waves, spa: Sparkles, beach: Waves, restaurant: Utensils,
  parking: Car, gym: Dumbbell, ac: Wind, minibar: Coffee,
}

function getDefaultCheckIn() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] }
function getDefaultCheckOut() { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split('T')[0] }

function ratingLabel(r) {
  if (r >= 9.0) return 'Exceptional'
  if (r >= 8.5) return 'Excellent'
  if (r >= 8.0) return 'Very Good'
  return 'Good'
}

function StarRating({ stars }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────
export default function OTASearch() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // Also load real properties
  const [realProperties, setRealProperties] = useState([])
  const [realRooms, setRealRooms] = useState([])

  const [searchCity, setSearchCity] = useState(searchParams.get('q') || '')
  const [checkIn, setCheckIn] = useState(searchParams.get('in') || getDefaultCheckIn())
  const [checkOut, setCheckOut] = useState(searchParams.get('out') || getDefaultCheckOut())
  // Adults + Children — back-compat with legacy ?guests=N
  const [adults, setAdults] = useState(
    Number(searchParams.get('adults')) || Number(searchParams.get('guests')) || 2
  )
  const [children, setChildren] = useState(Number(searchParams.get('children')) || 0)
  const guests = String(adults + children)
  const setGuests = (n) => setAdults(Math.max(1, Number(n) || 1))
  const [sortBy, setSortBy] = useState('recommended')
  const [typeFilter, setTypeFilter] = useState('')
  // Upper bound high enough to include luxury rooms; UI can still filter down.
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [favorites, setFavorites] = useState([])
  const [searched, setSearched] = useState(!!searchParams.get('q'))
  const [showGuestPicker, setShowGuestPicker] = useState(false)

  useEffect(() => {
    async function fetchReal() {
      const [propRes, roomsRes] = await Promise.all([
        supabase.from('properties').select('*').in('status', ['live', 'validated']),
        supabase.from('rooms').select('*').eq('is_active', true),
      ])
      setRealProperties(propRes.data || [])
      setRealRooms(roomsRes.data || [])
    }
    fetchReal()
  }, [])

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))

  // Merge demo + real properties
  const allProperties = useMemo(() => {
    const real = realProperties.map(p => {
      const pRooms = realRooms.filter(r => r.property_id === p.id)
      const lowestPrice = pRooms.length > 0 ? Math.min(...pRooms.map(r => Number(r.base_price))) : Number(p.avg_nightly_rate || 0)
      return {
        id: p.id,
        name: p.name,
        type: p.type || 'hotel',
        city: p.city,
        country: p.country,
        address: p.address,                 // included so the search filter can match
        stars: p.star_rating || 3,
        photo: p.photo_urls?.[0] || null,
        photos: p.photo_urls || [],
        price: lowestPrice,
        otaPrice: Math.round(lowestPrice * 1.25),
        rating: 8.5,
        reviews: 0,
        amenities: ['wifi'],
        desc: p.description || '',
        isReal: true,
      }
    })
    return real
  }, [realProperties, realRooms])

  const filtered = useMemo(() => {
    let result = allProperties
    if (searchCity.trim()) {
      const q = searchCity.toLowerCase().trim()
      // Step 1: try exact / substring match across name, city, country, address
      const direct = result.filter(p =>
        (p.city    || '').toLowerCase().includes(q) ||
        (p.country || '').toLowerCase().includes(q) ||
        (p.name    || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      )
      // Step 2: if the query is a known region (e.g. 'Koh Phangan'), also
      // match properties whose city/address belongs to that region's
      // village list ('Baan Tai', 'Thong Sala', etc.)
      const region = matchRegion(q)
      if (region) {
        const regionMatches = result.filter(p => propertyMatchesRegion(p, region))
        // Merge + dedupe
        const seen = new Set()
        result = [...direct, ...regionMatches].filter(p => {
          if (seen.has(p.id)) return false
          seen.add(p.id); return true
        })
      } else {
        result = direct
      }
    }
    if (typeFilter) result = result.filter(p => p.type === typeFilter)
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

    if (sortBy === 'price_low') result = [...result].sort((a, b) => a.price - b.price)
    else if (sortBy === 'price_high') result = [...result].sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') result = [...result].sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'savings') result = [...result].sort((a, b) => (b.otaPrice - b.price) - (a.otaPrice - a.price))
    // recommended = default order

    return result
  }, [allProperties, searchCity, typeFilter, sortBy, priceRange])

  function toggleFavorite(e, id) {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  function handleSearch() {
    setSearched(true)
  }

  function handleDestinationClick(destName) {
    setSearchCity(destName)
    setSearched(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">

      {/* ─── Hero Search ─────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003580] via-[#00224f] to-[#003580]" />
        <div className="absolute inset-0">
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-20 sm:pb-24">
          <div className="text-center mb-8 sm:mb-10">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-4xl sm:text-5xl font-extrabold text-white">stay</span>
              <span className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-[#ffb700] to-[#ff8c00] bg-clip-text text-transparent">lo</span>
            </div>
            {/* Slogan */}
            <p className="text-sm sm:text-base font-semibold text-[#ffb700] tracking-wider uppercase mb-4">
              {t('booking.slogan', 'Owned by Hoteliers, Built for Hospitality')}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 tracking-tight">
              {t('booking.hero_title', 'Find deals on hotels, resorts & more')}
            </h1>
            <p className="text-blue-200/70 text-sm sm:text-base max-w-2xl mx-auto">
              {t('booking.hero_subtitle', 'Book directly with hoteliers — save up to 20% vs. other platforms')}
            </p>
          </div>

          {/* Search bar */}
          <div className="bg-[#ffb700] p-1 rounded-xl max-w-5xl mx-auto shadow-2xl shadow-black/20">
            <div className="flex flex-col lg:flex-row gap-1">
              {/* Destination */}
              <div className="flex-[2] relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder={t('booking.where', 'Where are you going?')}
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-11 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              {/* Check-in */}
              <div className="flex-1 relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                <input type="date" value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setCheckIn(e.target.value)
                    if (e.target.value >= checkOut) {
                      const next = new Date(e.target.value); next.setDate(next.getDate() + 1)
                      setCheckOut(next.toISOString().split('T')[0])
                    }
                  }}
                  className="w-full pl-11 pr-4 py-4 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              {/* Check-out */}
              <div className="flex-1 relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                <input type="date" value={checkOut} min={checkIn}
                  onChange={e => setCheckOut(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              {/* Guests — adults + children with manual input */}
              <div className="flex-1">
                <GuestPicker
                  adults={adults}
                  children={children}
                  onChange={({ adults: a, children: c }) => { setAdults(a); setChildren(c) }}
                />
              </div>

              {/* Search button */}
              <button onClick={handleSearch}
                className="px-8 py-4 bg-[#0071c2] hover:bg-[#005fa8] text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg">
                <Search size={18} />
                <span>{t('booking.search', 'Search')}</span>
              </button>
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-8 max-w-3xl mx-auto text-center">
            <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
              <span className="text-[#ffb700] font-bold">{t('booking.tagline_highlight', 'You are not just a partner — you are the platform.')}</span>
              <br />
              {t('booking.tagline_body', 'STAYLO is the only booking platform owned and run by hoteliers.')}
              <br />
              <span className="text-[#ffb700]">{t('booking.tagline_cta', 'Book, share, earn — build ethical passive income while growing a community that puts hospitality first.')}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* ─── Popular Destinations (before search) ─── */}
        {!searched && (
          <div className="py-10">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {t('booking.popular_destinations', 'Popular Destinations in Thailand')}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('booking.explore_desc', 'Explore our most booked cities by fellow travelers')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {DESTINATIONS.map(dest => (
                <button key={dest.name} onClick={() => handleDestinationClick(dest.name)}
                  className="group relative h-48 rounded-2xl overflow-hidden text-left">
                  <img src={dest.img} alt={dest.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {dest.badge && (
                    <div className="absolute top-3 left-3 bg-[#ffb700] text-[#003580] text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-lg">
                      {dest.badge}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="font-bold text-base">{dest.name}</p>
                    <p className="text-xs text-white/70">{dest.count} {t('booking.properties', 'properties')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Deals Banner (before search) ──────── */}
        {!searched && (
          <div className="pb-10">
            <div className="bg-gradient-to-r from-[#003580] to-[#0071c2] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={20} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{t('booking.limited', 'Limited Time')}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold mb-2">{t('booking.deal_title', 'Hoteliers set the prices. STAYLO takes 10%. That\'s it.')}</h3>
                <p className="text-blue-200/80 text-sm">{t('booking.deal_desc', 'On OTAs, 15–25% commission goes to middlemen. On STAYLO, the difference goes back to the hotel — where it belongs.')}</p>
              </div>
              <button onClick={() => { setSearchCity(''); setSearched(true) }}
                className="px-6 py-3 bg-white text-[#003580] rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 whitespace-nowrap">
                {t('booking.browse_all', 'Browse All Properties')} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Search Results ────────────────────── */}
        {searched && (
          <div className="py-8">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {searchCity.trim()
                    ? `${searchCity}: ${filtered.length} ${t('booking.properties_found', 'properties found')}`
                    : `${filtered.length} ${t('booking.properties_found', 'properties found')}`}
                </h2>
                <p className="text-sm text-gray-500">
                  {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')} · {guests} {Number(guests) === 1 ? t('booking.adult', 'adult') : t('booking.adults', 'adults')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Type filter pills */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {['', 'hotel', 'resort', 'villa', 'hostel', 'guesthouse'].map(type => (
                    <button key={type} onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        typeFilter === type
                          ? 'bg-[#003580] text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#003580] hover:text-[#003580]'
                      }`}>
                      {type === '' ? t('booking.all', 'All') : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700">
                  <option value="recommended">{t('booking.sort_recommended', 'Recommended')}</option>
                  <option value="price_low">{t('booking.sort_price_low', 'Price: Low → High')}</option>
                  <option value="price_high">{t('booking.sort_price_high', 'Price: High → Low')}</option>
                  <option value="rating">{t('booking.sort_rating', 'Top Rated')}</option>
                  <option value="savings">{t('booking.sort_savings', 'Biggest Savings')}</option>
                </select>
              </div>
            </div>

            {/* Properties list */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('booking.no_results', 'No properties found')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('booking.try_different', 'Try a different destination or adjust your filters')}</p>
                <button onClick={() => { setSearchCity(''); setTypeFilter('') }}
                  className="px-5 py-2 bg-[#0071c2] text-white rounded-lg font-medium text-sm hover:bg-[#005fa8]">
                  {t('booking.clear_search', 'Clear All Filters')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((prop, idx) => {
                  const isFav = favorites.includes(prop.id)
                  const hasOtaPrice = prop.otaPrice > 0
                  const savings = hasOtaPrice ? prop.otaPrice - prop.price : 0
                  const savingsPercent = hasOtaPrice ? Math.round((savings / prop.otaPrice) * 100) : 0
                  const totalStaylo = prop.price * nights
                  const totalOTA = prop.otaPrice * nights
                  const isFeatured = prop.featured

                  // ── FEATURED CARD (flagship hotels with prop.featured = true) ──
                  if (isFeatured) {
                    return (
                      <Link key={prop.id}
                        to={`/ota/${prop.id}?in=${checkIn}&out=${checkOut}&adults=${adults}&children=${children}`}
                        className="no-underline">
                        <div className="rounded-2xl overflow-hidden border-2 border-[#ffb700]/50 shadow-xl shadow-[#ffb700]/10 hover:shadow-2xl hover:shadow-[#ffb700]/20 transition-all duration-300 group">
                          {/* Featured banner */}
                          <div className="bg-gradient-to-r from-[#003580] via-[#00224f] to-[#003580] px-5 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-lg font-extrabold text-white">stay</span>
                                <span className="text-lg font-extrabold text-[#ffb700]">lo</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffb700]">
                                {t('booking.flagship', 'Flagship Property — Where It All Began')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{ratingLabel(prop.rating)}</span>
                              <div className="bg-[#ffb700] text-[#003580] text-sm font-extrabold w-9 h-9 rounded-lg flex items-center justify-center">
                                {prop.rating}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white flex flex-col lg:flex-row">
                            {/* Photo grid */}
                            <div className="lg:w-[420px] flex-shrink-0 relative">
                              <div className="grid grid-cols-2 grid-rows-2 h-64 lg:h-full gap-0.5">
                                <div className="col-span-2 row-span-1 relative overflow-hidden">
                                  <img src={prop.photos[0]} alt="Beach sunset" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="relative overflow-hidden">
                                  <img src={prop.photos[4]} alt="Room" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                </div>
                                <div className="relative overflow-hidden">
                                  <img src={prop.photos[6]} alt="Restaurant" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                </div>
                              </div>
                              {/* Photo count */}
                              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
                                {prop.photos.length} photos
                              </div>
                              {/* Favorite */}
                              <button onClick={e => toggleFavorite(e, prop.id)}
                                className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-all shadow-sm z-10">
                                <Heart size={16} className={isFav ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
                              </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-5 lg:p-6 flex flex-col">
                              <div className="flex items-center gap-2 mb-1.5">
                                <StarRating stars={5} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffb700] bg-[#ffb700]/10 px-2 py-0.5 rounded">
                                  {t('booking.staylo_hq', 'STAYLO HQ')}
                                </span>
                              </div>
                              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1 group-hover:text-[#003580] transition-colors">
                                {prop.name}
                              </h3>
                              <p className="text-sm text-[#0071c2] flex items-center gap-1 font-medium mb-3">
                                <MapPin size={13} /> Koh Phangan, Thailand — <span className="text-gray-400">{t('booking.beachfront', 'Beachfront')}</span>
                              </p>

                              <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">{prop.desc}</p>

                              {/* Room highlights */}
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                {prop.roomTypes.map(r => (
                                  <div key={r.name} className="bg-gray-50 rounded-lg p-2.5">
                                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{r.name}</p>
                                    <p className="text-lg font-extrabold text-[#003580]">${r.price}<span className="text-[10px] text-gray-400 font-normal"> /{t('booking.night', 'night')}</span></p>
                                  </div>
                                ))}
                              </div>

                              {/* Amenities */}
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {prop.amenities.map(a => {
                                  const Icon = amenityIcons[a]
                                  return Icon ? (
                                    <span key={a} className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                                      <Icon size={12} className="text-[#003580]" /> {a}
                                    </span>
                                  ) : null
                                })}
                              </div>

                              {/* CTA */}
                              <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003580]">
                                    <Sparkles size={14} className="text-[#ffb700]" />
                                    {t('booking.exclusive', 'STAYLO Exclusive — No OTA markup')}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">{t('booking.from', 'From')}</p>
                                  <p className="text-2xl font-extrabold text-gray-900">${prop.roomTypes[0].price}<span className="text-xs text-gray-400 font-normal"> / {t('booking.night', 'night')}</span></p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  }

                  // ── REGULAR CARD ──
                  return (
                    <Link key={prop.id}
                      to={`/ota/${prop.id}?in=${checkIn}&out=${checkOut}&adults=${adults}&children=${children}`}
                      className="no-underline">
                      <div className="bg-white rounded-xl border border-gray-200 hover:border-[#0071c2]/40 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col sm:flex-row group">

                        {/* Image */}
                        <div className="sm:w-64 md:w-72 h-52 sm:h-auto relative flex-shrink-0 overflow-hidden">
                          <img src={prop.photo || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80`}
                            alt={prop.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                          {/* Favorite */}
                          <button onClick={e => toggleFavorite(e, prop.id)}
                            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-all shadow-sm z-10">
                            <Heart size={16} className={isFav ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
                          </button>

                          {/* Savings badge */}
                          {savingsPercent >= 15 && (
                            <div className="absolute top-3 left-3 bg-[#008009] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md">
                              Save {savingsPercent}%
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 sm:p-5 flex flex-col">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StarRating stars={prop.stars} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#003580]">
                                  {prop.type}
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-bold text-[#003580] group-hover:underline line-clamp-1">
                                {prop.name}
                              </h3>
                              <p className="text-xs text-[#0071c2] flex items-center gap-1 mt-0.5 font-medium">
                                <MapPin size={12} /> {prop.city}, {prop.country}
                              </p>
                            </div>

                            {/* Rating */}
                            <div className="flex items-start gap-1.5 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-900">{ratingLabel(prop.rating)}</p>
                                <p className="text-[10px] text-gray-500">{prop.reviews.toLocaleString()} reviews</p>
                              </div>
                              <div className="bg-[#003580] text-white text-sm font-extrabold w-9 h-9 rounded-lg rounded-bl-none flex items-center justify-center">
                                {prop.rating}
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1 mb-2 leading-relaxed">{prop.desc}</p>

                          {/* Amenities */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {prop.amenities.slice(0, 5).map(a => {
                              const Icon = amenityIcons[a]
                              return Icon ? (
                                <span key={a} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                  <Icon size={10} /> {a}
                                </span>
                              ) : null
                            })}
                          </div>

                          {/* Bottom — price section */}
                          <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#008009] bg-[#008009]/8 px-2 py-1 rounded">
                                <TrendingDown size={10} />
                                {t('booking.save_with_staylo', 'STAYLO Price')}
                              </span>
                              {prop.reviews > 1000 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                  <Flame size={10} />
                                  {t('booking.popular', 'Popular')}
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')}, {guests} {Number(guests) === 1 ? t('booking.adult', 'adult') : t('booking.adults', 'adults')}
                              </p>
                              {hasOtaPrice ? (
                                <>
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-sm text-gray-400 line-through">${totalOTA}</span>
                                    <span className="text-xl font-extrabold text-gray-900">${totalStaylo}</span>
                                  </div>
                                  <p className="text-[10px] text-[#008009] font-medium">
                                    {t('booking.you_save', 'You save')} ${savings * nights} ({savingsPercent}%)
                                  </p>
                                </>
                              ) : (
                                <span className="text-xl font-extrabold text-gray-900">${totalStaylo}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Bottom info */}
            {filtered.length > 0 && (
              <div className="mt-8 p-5 bg-white rounded-xl border border-gray-200 text-center">
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><Shield size={14} className="text-[#003580]" /> {t('booking.secure', 'Secure booking')}</span>
                  <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-[#003580]" /> {t('booking.verified', 'Verified properties')}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#003580]" /> {t('booking.support', '24/7 support')}</span>
                  <span className="flex items-center gap-1.5"><TrendingDown size={14} className="text-[#008009]" /> {t('booking.commission_note', '10% commission only — the lowest in the industry')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
