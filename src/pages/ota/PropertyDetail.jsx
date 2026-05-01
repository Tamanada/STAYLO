import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, ArrowLeft, Calendar, Users, ChevronLeft, ChevronRight,
  Heart, Share2, TrendingDown, Shield, Clock, Mail, Check, BedDouble,
  Wifi, Wind, Waves, Coffee, Car, Utensils, Dumbbell, Sparkles, Umbrella,
  BadgeCheck, Flame, X, Copy, CheckCircle2, Info
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { computeRoomPricing } from '../../lib/roomPricing'
import GuestPicker from '../../components/ota/GuestPicker'

const amenityConfig = {
  wifi: { icon: Wifi, label: 'Free WiFi' },
  ac: { icon: Wind, label: 'Air Conditioning' },
  pool: { icon: Waves, label: 'Swimming Pool' },
  spa: { icon: Sparkles, label: 'Spa & Wellness' },
  minibar: { icon: Coffee, label: 'Minibar' },
  parking: { icon: Car, label: 'Free Parking' },
  beach: { icon: Umbrella, label: 'Beach Access' },
  restaurant: { icon: Utensils, label: 'Restaurant' },
  gym: { icon: Dumbbell, label: 'Fitness Center' },
}

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
        <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
      ))}
    </div>
  )
}

function getDefaultCheckIn() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] }
function getDefaultCheckOut() { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split('T')[0] }

// ── Fake reviews ──────────────────────────────────────
const FAKE_REVIEWS = [
  { name: 'Sarah M.', country: '🇬🇧', date: 'March 2026', rating: 9, title: 'Wonderful stay!', text: 'Beautiful property, amazing staff. The pool area is stunning and the breakfast buffet was incredible.' },
  { name: 'Kenji T.', country: '🇯🇵', date: 'February 2026', rating: 10, title: 'Perfect in every way', text: 'Could not have asked for a better experience. Will definitely come back. Saved a lot booking through STAYLO!' },
  { name: 'Marie L.', country: '🇫🇷', date: 'January 2026', rating: 8, title: 'Très bien', text: 'Great location, clean rooms, friendly staff. The only downside was the slow elevator during peak hours.' },
]

// ── Component ─────────────────────────────────────────
export default function PropertyDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [property, setProperty] = useState(null)
  const [realRooms, setRealRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState(searchParams.get('in') || getDefaultCheckIn())
  const [checkOut, setCheckOut] = useState(searchParams.get('out') || getDefaultCheckOut())
  // Adults + Children — back-compat: ?guests=N still works (treats as adults)
  const [adults, setAdults] = useState(
    Number(searchParams.get('adults')) || Number(searchParams.get('guests')) || 2
  )
  const [children, setChildren] = useState(Number(searchParams.get('children')) || 0)
  const guests = adults + children  // total kept for capacity / display
  const setGuests = (n) => setAdults(Math.max(1, Number(n) || 1))  // legacy compat
  const [roomsCount, setRoomsCount] = useState(Number(searchParams.get('rooms')) || 1)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isFav, setIsFav] = useState(false)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  // Lightbox for room media — { photos: string[], videos: string[], idx: number, name: string } | null
  // Combines videos (first) + photos so prev/next navigates through the whole gallery.
  const [roomLightbox, setRoomLightbox] = useState(null)
  const [shareToast, setShareToast] = useState('')

  // Share the property — uses native Web Share API on supported devices
  // (mobile mostly), falls back to copying the URL to clipboard.
  async function handleShare() {
    const shareData = {
      title: property?.name || 'STAYLO',
      text: property ? `Check out ${property.name} on STAYLO` : 'Check out this property on STAYLO',
      url: window.location.href,
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
    } catch (e) { /* user cancelled or unsupported — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareToast('Link copied!')
      setTimeout(() => setShareToast(''), 2500)
    } catch {
      setShareToast('Could not share — copy the URL manually.')
      setTimeout(() => setShareToast(''), 3000)
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [propRes, roomsRes] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('rooms').select('*, room_availability(*)').eq('property_id', id).eq('is_active', true).order('base_price'),
      ])
      if (propRes.data) {
        setProperty({
          ...propRes.data,
          photos: propRes.data.photo_urls || [],
          videos: propRes.data.video_urls || [],
          rating: 8.5,
          reviews: 0,
          stars: propRes.data.star_rating || 3,
          amenities: propRes.data.amenities?.length ? propRes.data.amenities : ['wifi'],
          rooms: [],
        })
        setRealRooms(roomsRes.data || [])
      }
      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  // ── Capacity guard ────────────────────────────────
  // Auto-clamp guest count when the user picks a smaller room. Must live
  // ABOVE any early returns so the hook order stays stable across renders
  // (React forbids conditional hooks — moving this past `if (loading)`
  // caused a "Rendered more hooks" crash and blanked the page).
  useEffect(() => {
    if (!selectedRoom) return
    const r = realRooms.find(x => x.id === selectedRoom)
    if (r && Number(guests) > (r.max_guests || 0)) {
      setGuests(String(r.max_guests))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, realRooms])

  // ── Per-bed auto-sync ──────────────────────────────
  // For dorm-style rooms (pricing_unit='bed'), each guest needs 1 bed.
  // Force roomsCount (which doubles as bed count) = total guests so the
  // total price = price × nights × people. Hides the manual Beds picker.
  useEffect(() => {
    if (!selectedRoom) return
    const r = realRooms.find(x => x.id === selectedRoom)
    if (r?.pricing_unit === 'bed') {
      const totalPeople = (Number(adults) || 0) + (Number(children) || 0)
      if (totalPeople > 0 && roomsCount !== totalPeople) {
        setRoomsCount(totalPeople)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, adults, children, realRooms])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#003580]/20 border-t-[#003580] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="text-center px-4">
          <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('booking.not_found', 'Property not found')}</h2>
          <Link to="/ota" className="text-[#0071c2] text-sm font-medium hover:underline">{t('booking.back_to_search', '← Back to search')}</Link>
        </div>
      </div>
    )
  }

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
  const photos = property.photos || []
  const videos = property.videos || []
  const heroVideo = videos[0] || null  // first entry = hero per VideosTab convention
  // Real DB-backed rooms (post-demo cleanup, this is the only source).
  // Note: do NOT use `property.rooms || realRooms.map(...)` — `property.rooms`
  // is initialized to `[]`, which is TRUTHY in JS, so the OR would always
  // resolve to the empty array and the page would always show "No rooms".
  const rooms = realRooms.map(r => ({
    id: r.id,
    name: r.name,
    price: Number(r.base_price),
    beds: r.bed_type || 'Double',
    guests: r.max_guests || 2,
    sqm: 25,
    amenities: r.amenities || ['wifi'],
    desc: r.description || '',
    photos: r.photo_urls || [],
    videos: r.video_urls || [],
    pricingUnit: r.pricing_unit || 'room',  // 'room' | 'bed'
    // Carry the raw availability rows so we can compute promo + min_stay
    // per the actual selected dates without refetching.
    raw: r,
  }))

  const lowestRoom = rooms.length > 0 ? rooms.reduce((a, b) => a.price < b.price ? a : b) : null

  // ── Capacity guard helpers (hook moved above early returns) ─────────
  // - For per-room rooms: max guests = room.max_guests × roomsCount (e.g. 3 doubles = 6).
  // - For per-bed rooms : max guests = total beds. Legacy data may have set
  //   max_guests as the dorm's total capacity (with quantity=1) — defensive
  //   fallback takes whichever is bigger so the picker doesn't get stuck.
  const selectedRoomData = selectedRoom ? rooms.find(r => r.id === selectedRoom) : null
  const isPerBed = selectedRoomData?.pricingUnit === 'bed'
  const rawRoom = selectedRoom ? realRooms.find(r => r.id === selectedRoom) : null
  // Canonical bed count for per-bed rooms: max(quantity, max_guests).
  // - Clean data: quantity = N beds, max_guests = 1 → uses quantity. ✓
  // - Legacy data: quantity = 1, max_guests = N → falls back to max_guests. ✓
  const totalBeds = Math.max(rawRoom?.quantity || 1, rawRoom?.max_guests || 1)
  const effectiveMax = selectedRoomData
    ? (isPerBed
        ? totalBeds
        : selectedRoomData.guests * roomsCount)
    : (rooms.length ? Math.max(...rooms.map(r => r.guests || 1)) : 6)
  const maxAllowedGuests = effectiveMax
  // How many of THIS room type can be selected. For per-room: total rooms.
  // For per-bed: hidden (auto = guests count).
  const maxRoomsAvailable = selectedRoomData ? (rawRoom?.quantity || 1) : 1

  const guestsExceedRoom = selectedRoomData && Number(guests) > effectiveMax

  return (
    <div className="min-h-screen bg-[#f5f6fa]">

      {/* ─── Photo Gallery ───────────────────── */}
      <div className="bg-gray-900">
        <div className="max-w-6xl mx-auto relative">
          {/* Breadcrumb bar */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
            <Link to={`/ota?q=${property.city || ''}&in=${checkIn}&out=${checkOut}&adults=${adults}&children=${children}`}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-white transition-all no-underline shadow-lg">
              <ArrowLeft size={16} /> {t('booking.back', 'Back to results')}
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                title="Share this property"
                className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg cursor-pointer"
              >
                <Share2 size={16} className="text-gray-700" />
              </button>
              <button onClick={() => setIsFav(!isFav)}
                className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg">
                <Heart size={16} className={isFav ? 'fill-red-500 text-red-500' : 'text-gray-700'} />
              </button>
            </div>
          </div>

          {/* Photos grid */}
          {photos.length >= 3 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-1 h-72 sm:h-96 lg:h-[26rem]">
              <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                <img src={photos[0]} alt={property.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              {photos.slice(1, 5).map((p, i) => (
                <div key={i} className="relative overflow-hidden cursor-pointer" onClick={() => { setPhotoIndex(i + 1); setShowAllPhotos(true) }}>
                  <img src={p} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  {i === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{photos.length - 5} photos</span>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setShowAllPhotos(true)}
                className="absolute bottom-4 right-4 z-10 bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-gray-50 flex items-center gap-2">
                Show all {photos.length} photos
              </button>
            </div>
          ) : photos.length > 0 ? (
            <div className="relative h-72 sm:h-96 lg:h-[26rem]">
              <img src={photos[photoIndex]} alt={property.name} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white z-10">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white z-10">
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full z-10">
                    {photoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-72 sm:h-80 bg-gradient-to-br from-[#003580]/80 to-[#0071c2]/60 flex items-center justify-center">
              <span className="text-8xl opacity-40">🏨</span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen gallery modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setShowAllPhotos(false)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-50" onClick={() => setShowAllPhotos(false)}>
            <X size={24} />
          </button>
          <button onClick={e => { e.stopPropagation(); setPhotoIndex(i => (i - 1 + photos.length) % photos.length) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/20 z-50">
            <ChevronLeft size={28} className="text-white" />
          </button>
          <img src={photos[photoIndex]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={e => { e.stopPropagation(); setPhotoIndex(i => (i + 1) % photos.length) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/20 z-50">
            <ChevronRight size={28} className="text-white" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setPhotoIndex(i) }}
                className={`transition-all rounded-full ${i === photoIndex ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Content ─────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero video — only rendered if the hotelier uploaded one.
                Sits at the top of the left column so it's the first thing
                a visitor sees after the photo gallery. preload="metadata"
                avoids burning the visitor's data plan until they hit play. */}
            {heroVideo && (
              <div className="rounded-xl overflow-hidden bg-black border border-gray-200 shadow-sm">
                <video
                  src={heroVideo}
                  controls
                  playsInline
                  preload="metadata"
                  poster={photos[0] || undefined}
                  className="w-full aspect-video object-contain bg-black"
                />
                {videos.length > 1 && (
                  <div className="bg-white px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
                    +{videos.length - 1} more {videos.length - 1 === 1 ? 'video' : 'videos'} from this property
                  </div>
                )}
              </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating stars={property.stars} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#003580] bg-[#003580]/8 px-2 py-0.5 rounded">
                      {property.type}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">{property.name}</h1>
                  <p className="text-sm text-[#0071c2] flex items-center gap-1 font-medium">
                    <MapPin size={14} /> {property.city}, {property.country}
                    <span className="text-gray-400 ml-1">— {t('booking.show_map', 'Show on map')}</span>
                  </p>
                </div>
                <div className="hidden sm:flex items-start gap-2 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{ratingLabel(property.rating)}</p>
                    <p className="text-xs text-gray-500">{property.reviews.toLocaleString()} reviews</p>
                  </div>
                  <div className="bg-[#003580] text-white text-lg font-extrabold w-11 h-11 rounded-lg rounded-bl-none flex items-center justify-center">
                    {property.rating}
                  </div>
                </div>
              </div>
            </div>

            {/* STAYLO Advantage */}
            <div className="bg-[#008009]/5 border border-[#008009]/15 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#008009]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown size={24} className="text-[#008009]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{t('booking.staylo_advantage', 'Fair Trade Hospitality — 10% commission only')}</p>
                <p className="text-xs text-gray-600">{t('booking.advantage_desc', 'Hoteliers are the sole price-setters. STAYLO keeps only 10% commission — the margin (vs. 15–25% on OTAs) goes back to the hotel, not to middlemen.')}</p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('booking.about', 'About this property')}</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{property.desc}</p>

              {/* Amenities grid */}
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('booking.amenities', 'Most popular amenities')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.amenities.map(a => {
                  const cfg = amenityConfig[a]
                  if (!cfg) return null
                  const Icon = cfg.icon
                  return (
                    <div key={a} className="flex items-center gap-2.5 py-2 px-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                      <Icon size={16} className="text-[#003580] flex-shrink-0" />
                      {cfg.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Room Selection ─────────────── */}
            <div id="rooms">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{t('booking.select_room', 'Select your room')}</h2>
                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full font-medium">
                  {nights} {nights === 1 ? 'night' : 'nights'} · {guests} {Number(guests) === 1 ? 'adult' : 'adults'}
                </span>
              </div>

              {rooms.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">{t('booking.no_rooms', 'No rooms available')}</h3>
                  <p className="text-sm text-gray-500">{t('booking.try_dates', 'Try different dates or a smaller group.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room, idx) => {
                    // Real pricing for the selected dates: applies per-day
                    // overrides, promo discounts, and computes min_stay constraint.
                    const pricing = computeRoomPricing(room.raw, checkIn, checkOut, 1)
                    const total      = pricing.discountedTotal
                    const original   = pricing.originalTotal
                    const isSelected = selectedRoom === room.id

                    return (
                      <div key={room.id}
                        className={`bg-white rounded-xl border-2 transition-all ${
                          isSelected ? 'border-[#003580] shadow-lg shadow-[#003580]/10' :
                          idx === 0 ? 'border-[#008009]/30' : 'border-gray-200'
                        } overflow-hidden`}>

                        {/* Lowest price highlight — keeps the visual anchor for the cheapest room
                            but no more invented "savings vs OTA" claim. */}
                        {idx === 0 && rooms.length > 1 && (
                          <div className="bg-[#008009] text-white px-4 py-1.5 text-xs font-bold flex items-center gap-1.5">
                            <Flame size={12} /> {t('booking.best_value', 'Best value')}
                          </div>
                        )}

                        {/* Perks banner — green/libre, value-add (no discount).
                            Listed line by line so the guest sees exactly what
                            they get included with the room. */}
                        {pricing.hasPerks && (
                          <div className="bg-libre/95 text-white px-4 py-2 text-xs">
                            <p className="font-bold flex items-center gap-1.5 mb-1">
                              🎁 {pricing.perkLabel || 'Reward included'}
                            </p>
                            <ul className="space-y-0.5">
                              {pricing.perks.map((p, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-white/90">
                                  <span className="opacity-70">+</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Discount badge — orange, used only when promo_pct > 0
                            AND no perk is set on the same date. Honest discount. */}
                        {pricing.hasPromo && !pricing.hasPerks && (
                          <div className="bg-orange/95 text-white px-4 py-1.5 text-xs font-bold flex items-center gap-1.5">
                            <Flame size={12} />
                            {pricing.promoLabel || 'Special rate'}
                            {pricing.promoPct > 0 && <span className="ml-auto">−{Math.round(pricing.promoPct)}%</span>}
                          </div>
                        )}

                        {/* Min stay warning — disable Reserve if not met */}
                        {!pricing.minStayOK && (
                          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
                            <Info size={13} className="flex-shrink-0" />
                            <span>
                              <strong>Minimum {pricing.minStayRequired} nights</strong> required for these dates.
                              You picked {nights}.
                            </span>
                          </div>
                        )}

                        {/* Room media — photo strip + optional video.
                            Click on any thumbnail opens a fullscreen lightbox
                            with prev/next navigation through that room's media. */}
                        {(room.photos.length > 0 || room.videos.length > 0) && (
                          <div className="bg-gray-100 p-2 flex gap-2 overflow-x-auto">
                            {room.videos.map((vurl, vi) => (
                              <button
                                key={vurl + vi}
                                type="button"
                                onClick={() => setRoomLightbox({
                                  photos: room.photos, videos: room.videos,
                                  idx: vi, name: room.name,
                                })}
                                className="h-32 sm:h-40 rounded flex-shrink-0 bg-black relative overflow-hidden cursor-pointer group"
                              >
                                <video
                                  src={vurl}
                                  playsInline
                                  preload="metadata"
                                  poster={room.photos[0]}
                                  muted
                                  className="h-full w-auto object-contain pointer-events-none"
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                    <span className="ml-1 text-deep">▶</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {room.photos.map((url, i) => (
                              <button
                                key={url + i}
                                type="button"
                                onClick={() => setRoomLightbox({
                                  photos: room.photos, videos: room.videos,
                                  idx: room.videos.length + i, name: room.name,
                                })}
                                className="h-32 sm:h-40 rounded flex-shrink-0 overflow-hidden cursor-pointer group"
                              >
                                <img
                                  src={url}
                                  alt={`${room.name} ${i + 1}`}
                                  className="h-full w-auto object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            {/* Room info */}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 text-base mb-1">
                                {room.name}
                                {room.pricingUnit === 'bed' && (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-deep/10 text-deep px-2 py-0.5 rounded">
                                    Per bed
                                  </span>
                                )}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-2">
                                <span className="flex items-center gap-1"><BedDouble size={14} /> {room.beds}</span>
                                {room.pricingUnit === 'bed'
                                  ? <span className="flex items-center gap-1"><Users size={14} /> {t('booking.dorm_capacity', 'Dorm room')}</span>
                                  : <span className="flex items-center gap-1"><Users size={14} /> {t('booking.up_to', 'Up to')} {room.guests} {room.guests === 1 ? 'guest' : 'guests'}</span>
                                }
                                {room.sqm && <span>{room.sqm} m²</span>}
                              </div>
                              {room.desc && <p className="text-xs text-gray-500 mb-2">{room.desc}</p>}

                              {/* Room amenities */}
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {(room.amenities || []).map(a => {
                                  const cfg = amenityConfig[a]
                                  if (!cfg) return null
                                  const Icon = cfg.icon
                                  return (
                                    <span key={a} className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                                      <Icon size={10} /> {cfg.label}
                                    </span>
                                  )
                                })}
                              </div>

                              <div className="flex items-center gap-3 text-xs text-[#008009]">
                                <span className="flex items-center gap-1"><Check size={12} /> {t('booking.free_cancel', 'Free cancellation')}</span>
                                <span className="flex items-center gap-1"><Check size={12} /> {t('booking.escrow_short', 'Held in escrow')}</span>
                              </div>
                            </div>

                            {/* Price & CTA */}
                            <div className="flex flex-col items-end gap-3 flex-shrink-0 sm:min-w-[180px] sm:text-right">
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5">{nights} {nights === 1 ? 'night' : 'nights'}, {guests} {Number(guests) === 1 ? 'adult' : 'adults'}</p>
                                {/* If a promo is active, show original price strike-through */}
                                {pricing.hasPromo && pricing.savings > 0 && (
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-sm text-orange/80 line-through">${original.toFixed(0)}</span>
                                  </div>
                                )}
                                <p className="text-2xl font-extrabold text-gray-900">${total.toFixed(0)}</p>
                                <p className="text-[11px] text-gray-400">{t('booking.before_pay_fees', '+ payment fees at checkout')}</p>
                                {pricing.hasPromo && pricing.savings > 0 && (
                                  <p className="text-[11px] text-orange font-semibold mt-0.5">
                                    🔥 Promo applied: −${pricing.savings.toFixed(0)}
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => pricing.minStayOK && setSelectedRoom(room.id)}
                                disabled={!pricing.minStayOK}
                                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                                  !pricing.minStayOK
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-[#003580] text-white shadow-lg'
                                      : 'bg-[#0071c2] hover:bg-[#005fa8] text-white'
                                }`}>
                                {!pricing.minStayOK
                                  ? `Need ${pricing.minStayRequired}+ nights`
                                  : isSelected
                                    ? '✓ Selected'
                                    : t('booking.select', 'Select')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Guest Reviews ──────────────── */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{t('booking.guest_reviews', 'Guest reviews')}</h2>
                <div className="flex items-center gap-2">
                  <div className="bg-[#003580] text-white text-sm font-extrabold px-2.5 py-1 rounded-lg">{property.rating}</div>
                  <span className="text-sm font-semibold text-gray-900">{ratingLabel(property.rating)}</span>
                  <span className="text-xs text-gray-500">· {property.reviews.toLocaleString()} reviews</span>
                </div>
              </div>

              {/* Review bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Cleanliness', score: (property.rating + 0.1).toFixed(1) },
                  { label: 'Location', score: (property.rating - 0.1).toFixed(1) },
                  { label: 'Service', score: property.rating.toFixed(1) },
                  { label: 'Value', score: (property.rating + 0.2).toFixed(1) },
                ].map(cat => (
                  <div key={cat.label} className="text-center">
                    <p className="text-xs text-gray-500 mb-1">{cat.label}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#003580] rounded-full" style={{ width: `${cat.score * 10}%` }} />
                    </div>
                    <p className="text-xs font-bold text-gray-900 mt-1">{cat.score}</p>
                  </div>
                ))}
              </div>

              {/* Individual reviews */}
              <div className="space-y-4">
                {FAKE_REVIEWS.map((review, i) => (
                  <div key={i} className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#003580]/10 rounded-full flex items-center justify-center text-sm font-bold text-[#003580]">
                          {review.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.name} <span className="text-xs">{review.country}</span></p>
                          <p className="text-[10px] text-gray-400">{review.date}</p>
                        </div>
                      </div>
                      <div className="bg-[#003580] text-white text-xs font-bold px-2 py-1 rounded-md rounded-bl-none">{review.rating}</div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{review.title}</p>
                    <p className="text-sm text-gray-600">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ───────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">

              {/* Price card */}
              <div className="bg-white rounded-xl border-2 border-[#003580]/20 p-5 shadow-xl shadow-[#003580]/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {lowestRoom ? (
                      <>
                        <p className="text-xs text-gray-500">{t('booking.from', 'From')}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-extrabold text-gray-900">${lowestRoom.price}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          / {lowestRoom.pricingUnit === 'bed' ? t('booking.bed', 'bed') : ''} {t('booking.night', 'night')}
                        </p>
                      </>
                    ) : (
                      <p className="text-base font-bold text-gray-400">{t('booking.check_avail', 'Check availability')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    <span className="font-bold text-gray-900">{property.rating}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-gray-200 rounded-lg p-2.5 hover:border-[#003580] transition-colors">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">{t('booking.check_in', 'Check-in')}</label>
                      <input type="date" value={checkIn}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => {
                          setCheckIn(e.target.value)
                          if (e.target.value >= checkOut) {
                            const next = new Date(e.target.value); next.setDate(next.getDate() + 1)
                            setCheckOut(next.toISOString().split('T')[0])
                          }
                        }}
                        className="w-full text-sm font-medium text-gray-900 border-0 p-0 focus:outline-none bg-transparent" />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-2.5 hover:border-[#003580] transition-colors">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">{t('booking.check_out', 'Check-out')}</label>
                      <input type="date" value={checkOut} min={checkIn}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full text-sm font-medium text-gray-900 border-0 p-0 focus:outline-none bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      {t('booking.guests', 'Guests')}
                      {selectedRoomData && (
                        <span className="ml-1 normal-case text-gray-400 font-normal">
                          (max {effectiveMax}{isPerBed ? ' beds' : ''})
                        </span>
                      )}
                    </label>
                    <GuestPicker
                      adults={adults}
                      children={children}
                      onChange={({ adults: a, children: c }) => { setAdults(a); setChildren(c) }}
                      maxTotal={selectedRoomData ? effectiveMax : undefined}
                      compact
                    />
                  </div>
                </div>

                {/* Rooms picker — only for per-room; per-bed rooms auto-derive
                    bed count from guest count (handled by useEffect above). */}
                {selectedRoomData && !isPerBed && maxRoomsAvailable > 1 && (
                  <div className="border border-gray-200 rounded-lg p-2.5 hover:border-[#003580] transition-colors mt-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">
                      {t('booking.rooms', 'Rooms')}
                      <span className="ml-1 normal-case text-gray-400 font-normal">
                        (max {maxRoomsAvailable} available)
                      </span>
                    </label>
                    <select value={roomsCount} onChange={e => setRoomsCount(Number(e.target.value))}
                      className="w-full text-sm font-medium text-gray-900 border-0 p-0 focus:outline-none bg-transparent appearance-none">
                      {Array.from({ length: maxRoomsAvailable }, (_, i) => i + 1).map(n =>
                        <option key={n} value={n}>{n} {n === 1 ? 'room' : 'rooms'}</option>
                      )}
                    </select>
                  </div>
                )}

                {/* Per-bed info banner — beds = guests, no manual picker */}
                {selectedRoomData && isPerBed && (adults + children) > 0 && (
                  <div className="bg-deep/5 border border-deep/15 rounded-lg p-2.5 mt-2 text-xs text-deep">
                    🛏️ <strong>{adults + children} bed{adults + children > 1 ? 's' : ''}</strong> reserved
                    (1 per guest) ·{' '}
                    <span className="text-gray-500">${selectedRoomData.price}/bed/night</span>
                  </div>
                )}

                {/* Capacity warning — never silent overbooking */}
                {guestsExceedRoom && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs">
                    <Info size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700">
                      {t('booking.too_many_guests', 'This room sleeps up to')} <strong>{selectedRoomData.guests}</strong>{' '}
                      {t('booking.guests_lower', 'guests. Please reduce the count or pick a larger room.')}
                    </span>
                  </div>
                )}

                {/* Breakdown */}
                {lowestRoom && selectedRoom && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5 text-sm">
                    {(() => {
                      const room = rooms.find(r => r.id === selectedRoom) || lowestRoom
                      const pricing = computeRoomPricing(room.raw, checkIn, checkOut, roomsCount)
                      return (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>
                              ${room.price} × {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'}
                              {roomsCount > 1 && (
                                <span className="text-gray-400">
                                  {' '}× {roomsCount} {room.pricingUnit === 'bed'
                                    ? (roomsCount === 1 ? 'bed' : 'beds')
                                    : (roomsCount === 1 ? 'room' : 'rooms')}
                                </span>
                              )}
                            </span>
                            <span className={pricing.hasPromo && pricing.savings > 0 ? 'text-gray-400 line-through' : ''}>
                              ${pricing.originalTotal.toFixed(2)}
                            </span>
                          </div>
                          {pricing.hasPromo && pricing.savings > 0 && (
                            <div className="flex justify-between text-orange font-medium">
                              <span>🔥 {pricing.promoLabel || 'Promo'}{pricing.promoPct > 0 && ` (−${Math.round(pricing.promoPct)}%)`}</span>
                              <span>−${pricing.savings.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>{t('booking.subtotal', 'Subtotal')}</span>
                            <span>${pricing.discountedTotal.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 pt-1 leading-snug">
                            {t('booking.fees_at_checkout', 'Payment processing fees added at checkout (free with Bitcoin Lightning).')}
                          </p>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Reserve button — also blocked if guest count exceeds room capacity */}
                <button
                  disabled={!selectedRoom || guestsExceedRoom}
                  onClick={() => {
                    if (!selectedRoom || guestsExceedRoom) return
                    navigate(`/ota/${id}/checkout?room=${selectedRoom}&in=${checkIn}&out=${checkOut}&adults=${adults}&children=${children}&rooms=${roomsCount}`)
                  }}
                  className={`w-full py-3.5 rounded-lg font-bold text-base transition-all ${
                    selectedRoom && !guestsExceedRoom
                      ? 'bg-[#0071c2] hover:bg-[#005fa8] text-white shadow-lg hover:shadow-xl cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  {!selectedRoom
                    ? t('booking.select_room_first', 'Select a room to book')
                    : guestsExceedRoom
                      ? t('booking.too_many_guests_short', 'Too many guests for this room')
                      : t('booking.reserve_now', 'Reserve Now')}
                </button>

                <p className="text-center text-[11px] text-gray-400 mt-2">{t('booking.no_charge', "You won't be charged yet")}</p>

                {/* Trust badges */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="text-[#008009] flex-shrink-0" />
                    <span>{t('booking.badge_cancel', 'Free cancellation before check-in')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Shield size={14} className="text-[#003580] flex-shrink-0" />
                    <span>{t('booking.badge_escrow', 'Funds held safely until check-out')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <BadgeCheck size={14} className="text-[#003580] flex-shrink-0" />
                    <span>{t('booking.badge_verified', 'STAYLO verified property')}</span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">{t('booking.need_help', 'Need help with your booking?')}</h4>
                <a href="mailto:contact@staylo.app"
                  className="flex items-center gap-2 text-sm text-[#0071c2] hover:underline no-underline font-medium">
                  <Mail size={14} /> contact@staylo.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share toast — feedback after a successful copy/share */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-deep text-white px-4 py-2.5 rounded-full shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          {shareToast}
        </div>
      )}

      {/* ─── Room media lightbox ───────────────────────────
          Combines a room's videos (first) + photos into one virtual list.
          Indexes 0..videos.length-1 are videos, the rest are photos. */}
      {roomLightbox && (() => {
        const { photos, videos, idx, name } = roomLightbox
        const total = videos.length + photos.length
        const isVideo = idx < videos.length
        const currentUrl = isVideo ? videos[idx] : photos[idx - videos.length]
        const goPrev = () => setRoomLightbox(s => ({ ...s, idx: (s.idx - 1 + total) % total }))
        const goNext = () => setRoomLightbox(s => ({ ...s, idx: (s.idx + 1) % total }))
        return (
          <div
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setRoomLightbox(null)}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setRoomLightbox(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-10"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            {/* Title */}
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium z-10">
              {name}
            </div>

            {/* Media */}
            {isVideo ? (
              <video
                key={currentUrl}
                src={currentUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="max-w-[95vw] max-h-[90vh] bg-black"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <img
                key={currentUrl}
                src={currentUrl}
                alt={`${name} — ${idx + 1} / ${total}`}
                className="max-w-[95vw] max-h-[90vh] object-contain"
                onClick={e => e.stopPropagation()}
              />
            )}

            {/* Prev / Next */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); goPrev() }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer z-10"
                  aria-label="Previous"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); goNext() }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer z-10"
                  aria-label="Next"
                >
                  <ChevronRight size={26} />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium z-10">
                  {idx + 1} / {total}
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
