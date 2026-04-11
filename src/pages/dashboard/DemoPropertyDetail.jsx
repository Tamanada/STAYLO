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

// ── Demo data (shared with BookingEngine) ─────────────
const DEMO_PROPERTIES = {
  'demo-staylo': {
    name: 'STAYLO Resort & Nomad Hub', type: 'resort', city: 'Koh Phangan', country: 'Thailand', stars: 5, featured: true,
    photos: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
      'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80',
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
    ],
    rating: 9.8, reviews: 47,
    amenities: ['wifi', 'pool', 'spa', 'beach', 'restaurant', 'gym', 'parking', 'minibar'],
    desc: 'Where it all began. STAYLO Resort is the birthplace of the hospitality revolution — a stunning beachfront property on Koh Phangan where hoteliers, digital nomads, and travelers come together. Featuring a world-class coworking space, organic farm-to-table restaurant, infinity pool overlooking the Gulf of Thailand, and legendary sunset views. This is more than a resort — it\'s the headquarters of a movement.',
    rooms: [
      { id: 'rs1', name: 'Nomad Pod — Smart Dorm', price: 29, otaPrice: 0, beds: 'Single Pod', guests: 1, sqm: 6, amenities: ['wifi', 'ac'], desc: 'High-tech sleeping pod with personal screen, USB charging, reading light, and locker. Access to the Nomad Lounge coworking space included.' },
      { id: 'rs2', name: 'Sunset Beach Room', price: 89, otaPrice: 0, beds: 'King Bed', guests: 2, sqm: 35, amenities: ['wifi', 'ac', 'minibar'], desc: 'Beachfront room with private terrace facing west — the best sunset view on the island. Rain shower and handcrafted Thai furnishings.' },
      { id: 'rs3', name: 'Ocean View Suite', price: 165, otaPrice: 0, beds: 'King Bed', guests: 3, sqm: 55, amenities: ['wifi', 'ac', 'minibar', 'pool'], desc: 'Spacious suite with separate living area, outdoor bathtub, and uninterrupted ocean panorama. Perfect for extended stays.' },
      { id: 'rs4', name: 'Founder\'s Villa — Private Pool', price: 320, otaPrice: 0, beds: 'King + Daybed', guests: 4, sqm: 110, amenities: ['wifi', 'ac', 'minibar', 'pool', 'spa'], desc: 'The ultimate STAYLO experience. Private infinity pool, lush tropical garden, outdoor kitchen, and dedicated concierge. Where the founding team stays.' },
    ],
  },
  'demo-1': {
    name: 'Anantara Riverside Bangkok Resort', type: 'resort', city: 'Bangkok', country: 'Thailand', stars: 5,
    photos: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
    ],
    rating: 9.2, reviews: 2847,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'parking'],
    desc: 'Located on the banks of the legendary Chao Phraya River, this luxurious resort offers a peaceful escape in the heart of Bangkok. Featuring world-class dining, an award-winning spa, and stunning river views from every room. Perfect for both business and leisure travelers seeking authentic Thai hospitality.',
    rooms: [
      { id: 'r1', name: 'Deluxe River View', price: 142, otaPrice: 178, beds: 'King Bed', guests: 2, sqm: 38, amenities: ['wifi', 'ac', 'minibar'], desc: 'Spacious room with floor-to-ceiling windows overlooking the river.' },
      { id: 'r2', name: 'Premier Suite', price: 245, otaPrice: 310, beds: 'King Bed', guests: 3, sqm: 62, amenities: ['wifi', 'ac', 'minibar', 'pool'], desc: 'Luxurious suite with separate living area and private balcony.' },
      { id: 'r3', name: 'Royal Penthouse', price: 520, otaPrice: 650, beds: 'King + Twin', guests: 4, sqm: 120, amenities: ['wifi', 'ac', 'minibar', 'pool', 'spa'], desc: 'The ultimate luxury experience with 360° panoramic views and butler service.' },
    ],
  },
  'demo-2': {
    name: 'The Siam Heritage Boutique', type: 'hotel', city: 'Bangkok', country: 'Thailand', stars: 4,
    photos: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
    ],
    rating: 8.8, reviews: 1563,
    amenities: ['wifi', 'pool', 'restaurant', 'ac'],
    desc: 'A charming boutique hotel nestled in the heart of old Bangkok. Traditional Thai architecture meets modern comfort in this intimate property, just steps from the Grand Palace and Wat Pho.',
    rooms: [
      { id: 'r1', name: 'Heritage Deluxe', price: 89, otaPrice: 112, beds: 'Queen Bed', guests: 2, sqm: 28, amenities: ['wifi', 'ac'], desc: 'Elegant room with Thai silk furnishings and traditional décor.' },
      { id: 'r2', name: 'Grand Heritage Suite', price: 165, otaPrice: 205, beds: 'King Bed', guests: 2, sqm: 45, amenities: ['wifi', 'ac', 'minibar'], desc: 'Spacious suite with antique furniture and courtyard views.' },
    ],
  },
  'demo-3': {
    name: 'Samui Seaside Villa & Spa', type: 'villa', city: 'Koh Samui', country: 'Thailand', stars: 5,
    photos: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80',
    ],
    rating: 9.5, reviews: 892,
    amenities: ['wifi', 'pool', 'spa', 'beach', 'restaurant', 'minibar'],
    desc: 'Exclusive beachfront villas with private infinity pools overlooking the Gulf of Thailand. Each villa offers complete privacy, personal chef service, and direct beach access.',
    rooms: [
      { id: 'r1', name: 'Garden Pool Villa', price: 310, otaPrice: 395, beds: 'King Bed', guests: 2, sqm: 85, amenities: ['wifi', 'ac', 'pool', 'minibar'], desc: 'Private villa with tropical garden and personal plunge pool.' },
      { id: 'r2', name: 'Beachfront Pool Villa', price: 485, otaPrice: 610, beds: 'King Bed', guests: 3, sqm: 120, amenities: ['wifi', 'ac', 'pool', 'minibar', 'beach'], desc: 'Ultimate beachfront experience with infinity pool merging into the sea.' },
    ],
  },
  'demo-4': {
    name: 'Phangan Sunset Hostel', type: 'hostel', city: 'Koh Phangan', country: 'Thailand', stars: 3,
    photos: [
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1200&q=80',
      'https://images.unsplash.com/photo-1528255671579-01b9e182ed1d?w=1200&q=80',
    ],
    rating: 8.4, reviews: 634,
    amenities: ['wifi', 'restaurant', 'beach'],
    desc: 'Laid-back beachfront hostel with breathtaking sunset views and a vibrant social atmosphere. The perfect base for island adventures and the famous Full Moon Party.',
    rooms: [
      { id: 'r1', name: 'Dorm Bed (6-bed mixed)', price: 18, otaPrice: 24, beds: 'Single Bed', guests: 1, sqm: 4, amenities: ['wifi'], desc: 'Air-conditioned dorm with personal locker and reading light.' },
      { id: 'r2', name: 'Private Double Room', price: 45, otaPrice: 58, beds: 'Double Bed', guests: 2, sqm: 16, amenities: ['wifi', 'ac'], desc: 'Private room with en-suite bathroom and sea view.' },
    ],
  },
  'demo-5': {
    name: 'Chiang Mai Garden Resort', type: 'resort', city: 'Chiang Mai', country: 'Thailand', stars: 4,
    photos: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80',
    ],
    rating: 9.0, reviews: 1290,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking', 'gym'],
    desc: 'Tranquil resort surrounded by lush tropical gardens, just minutes from the Night Bazaar and old city temples. Features authentic Lanna architecture and farm-to-table dining.',
    rooms: [
      { id: 'r1', name: 'Garden View Room', price: 95, otaPrice: 120, beds: 'King Bed', guests: 2, sqm: 32, amenities: ['wifi', 'ac'], desc: 'Peaceful room overlooking the resort\'s tropical gardens.' },
      { id: 'r2', name: 'Pool Access Room', price: 135, otaPrice: 170, beds: 'King Bed', guests: 2, sqm: 36, amenities: ['wifi', 'ac', 'pool'], desc: 'Step directly from your terrace into the swimming pool.' },
      { id: 'r3', name: 'Family Suite', price: 195, otaPrice: 245, beds: 'King + 2 Singles', guests: 4, sqm: 55, amenities: ['wifi', 'ac', 'minibar'], desc: 'Spacious suite with separate children\'s sleeping area and living room.' },
    ],
  },
  'demo-6': {
    name: 'Phuket Pearl Beach Hotel', type: 'hotel', city: 'Phuket', country: 'Thailand', stars: 4,
    photos: [
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80',
    ],
    rating: 8.6, reviews: 2105,
    amenities: ['wifi', 'pool', 'beach', 'restaurant', 'parking'],
    desc: 'Modern beachfront hotel on Kata Beach with direct beach access and panoramic Andaman Sea views. Features three restaurants, a rooftop bar, and a kids\' club.',
    rooms: [
      { id: 'r1', name: 'Superior Sea View', price: 78, otaPrice: 98, beds: 'Queen Bed', guests: 2, sqm: 30, amenities: ['wifi', 'ac'], desc: 'Bright room with balcony and partial sea view.' },
      { id: 'r2', name: 'Deluxe Beachfront', price: 125, otaPrice: 155, beds: 'King Bed', guests: 2, sqm: 40, amenities: ['wifi', 'ac', 'minibar', 'beach'], desc: 'Premium room with direct beach access and sunset views.' },
    ],
  },
  'demo-7': {
    name: 'Krabi Cliff Resort', type: 'resort', city: 'Krabi', country: 'Thailand', stars: 5,
    photos: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80',
      'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=1200&q=80',
    ],
    rating: 9.3, reviews: 756,
    amenities: ['wifi', 'pool', 'spa', 'beach', 'restaurant', 'gym', 'minibar'],
    desc: 'Perched on dramatic limestone cliffs with private beach access and world-class snorkeling right at your doorstep. A true paradise for nature lovers and adventure seekers.',
    rooms: [
      { id: 'r1', name: 'Cliff View Deluxe', price: 210, otaPrice: 265, beds: 'King Bed', guests: 2, sqm: 42, amenities: ['wifi', 'ac', 'minibar'], desc: 'Dramatic cliff-edge room with panoramic ocean views.' },
      { id: 'r2', name: 'Ocean Pool Suite', price: 380, otaPrice: 475, beds: 'King Bed', guests: 3, sqm: 75, amenities: ['wifi', 'ac', 'pool', 'minibar', 'spa'], desc: 'Luxurious suite with private infinity pool overlooking the Andaman Sea.' },
    ],
  },
  'demo-8': {
    name: 'Pai Mountain Lodge', type: 'guesthouse', city: 'Pai', country: 'Thailand', stars: 3,
    photos: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    ],
    rating: 8.9, reviews: 423,
    amenities: ['wifi', 'restaurant', 'parking'],
    desc: 'Cozy mountain retreat with stunning valley views, organic farm-to-table restaurant, and authentic Northern Thai hospitality. Perfect for digital nomads and nature lovers.',
    rooms: [
      { id: 'r1', name: 'Mountain View Bungalow', price: 35, otaPrice: 45, beds: 'Double Bed', guests: 2, sqm: 20, amenities: ['wifi'], desc: 'Wooden bungalow with wrap-around terrace and mountain panorama.' },
      { id: 'r2', name: 'Deluxe Cottage', price: 55, otaPrice: 70, beds: 'King Bed', guests: 2, sqm: 28, amenities: ['wifi', 'ac'], desc: 'Upgraded cottage with outdoor bathtub and premium bedding.' },
    ],
  },
  'demo-9': {
    name: 'Hua Hin Grand Hyatt Residences', type: 'hotel', city: 'Hua Hin', country: 'Thailand', stars: 5,
    photos: [
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
    ],
    rating: 9.1, reviews: 1834,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'parking', 'minibar'],
    desc: 'Elegant beachfront residences with championship golf course, multiple dining venues, and a serene wellness center. The premier luxury destination on the Royal Coast.',
    rooms: [
      { id: 'r1', name: 'Deluxe Garden', price: 175, otaPrice: 220, beds: 'King Bed', guests: 2, sqm: 40, amenities: ['wifi', 'ac', 'minibar'], desc: 'Elegant room with private terrace and garden views.' },
      { id: 'r2', name: 'Ocean Suite', price: 295, otaPrice: 370, beds: 'King Bed', guests: 3, sqm: 65, amenities: ['wifi', 'ac', 'pool', 'minibar', 'spa'], desc: 'Generous suite with separate lounge and spectacular ocean panorama.' },
    ],
  },
}

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
export default function DemoPropertyDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isDemo = searchParams.get('demo') === '1' || id?.startsWith('demo-')

  const [property, setProperty] = useState(null)
  const [realRooms, setRealRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState(searchParams.get('in') || getDefaultCheckIn())
  const [checkOut, setCheckOut] = useState(searchParams.get('out') || getDefaultCheckOut())
  const [guests, setGuests] = useState(searchParams.get('guests') || '2')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isFav, setIsFav] = useState(false)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      if (isDemo && DEMO_PROPERTIES[id]) {
        setProperty({ id, ...DEMO_PROPERTIES[id] })
      } else {
        const [propRes, roomsRes] = await Promise.all([
          supabase.from('properties').select('*').eq('id', id).single(),
          supabase.from('rooms').select('*, room_availability(*)').eq('property_id', id).eq('is_active', true).order('base_price'),
        ])
        if (propRes.data) {
          setProperty({
            ...propRes.data,
            photos: propRes.data.photo_urls || [],
            rating: 8.5,
            reviews: 0,
            stars: propRes.data.star_rating || 3,
            amenities: ['wifi'],
            rooms: [],
          })
          setRealRooms(roomsRes.data || [])
        }
      }
      setLoading(false)
    }
    if (id) fetchData()
  }, [id, isDemo])

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
          <Link to="/dashboard/book" className="text-[#0071c2] text-sm font-medium hover:underline">{t('booking.back_to_search', '← Back to search')}</Link>
        </div>
      </div>
    )
  }

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
  const photos = property.photos || []
  const rooms = property.rooms || realRooms.map(r => ({
    id: r.id,
    name: r.name,
    price: Number(r.base_price),
    otaPrice: Math.round(Number(r.base_price) * 1.25),
    beds: r.bed_type || 'Double',
    guests: r.max_guests || 2,
    sqm: 25,
    amenities: r.amenities || ['wifi'],
    desc: r.description || '',
  }))

  const lowestRoom = rooms.length > 0 ? rooms.reduce((a, b) => a.price < b.price ? a : b) : null

  return (
    <div className="min-h-screen bg-[#f5f6fa]">

      {/* ─── Photo Gallery ───────────────────── */}
      <div className="bg-gray-900">
        <div className="max-w-6xl mx-auto relative">
          {/* Breadcrumb bar */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
            <Link to={`/dashboard/book?q=${property.city || ''}&in=${checkIn}&out=${checkOut}&guests=${guests}`}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-white transition-all no-underline shadow-lg">
              <ArrowLeft size={16} /> {t('booking.back', 'Back to results')}
            </Link>
            <div className="flex items-center gap-2">
              <button className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg">
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
                <p className="font-bold text-gray-900 text-sm">{t('booking.staylo_advantage', 'STAYLO Advantage — Save up to 20%')}</p>
                <p className="text-xs text-gray-600">{t('booking.advantage_desc', 'STAYLO charges only 10% commission vs. 15–25% on Booking.com. The hotel passes the savings directly to you.')}</p>
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
                    const total = room.price * nights
                    const totalOTA = room.otaPrice * nights
                    const savings = totalOTA - total
                    const savingsPercent = Math.round((savings / totalOTA) * 100)
                    const isSelected = selectedRoom === room.id

                    return (
                      <div key={room.id}
                        className={`bg-white rounded-xl border-2 transition-all ${
                          isSelected ? 'border-[#003580] shadow-lg shadow-[#003580]/10' :
                          idx === 0 ? 'border-[#008009]/30' : 'border-gray-200'
                        } overflow-hidden`}>

                        {/* Best value badge */}
                        {idx === 0 && (
                          <div className="bg-[#008009] text-white px-4 py-1.5 text-xs font-bold flex items-center gap-1.5">
                            <Flame size={12} /> {t('booking.best_deal', 'Best deal — Save')} {savingsPercent}% {t('booking.vs_ota', 'vs. other platforms')}
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            {/* Room info */}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 text-base mb-1">{room.name}</h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-2">
                                <span className="flex items-center gap-1"><BedDouble size={14} /> {room.beds}</span>
                                <span className="flex items-center gap-1"><Users size={14} /> {t('booking.up_to', 'Up to')} {room.guests} {room.guests === 1 ? 'guest' : 'guests'}</span>
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
                                <span className="flex items-center gap-1"><Check size={12} /> {t('booking.pay_later', 'No prepayment')}</span>
                              </div>
                            </div>

                            {/* Price & CTA */}
                            <div className="flex flex-col items-end gap-3 flex-shrink-0 sm:min-w-[180px] sm:text-right">
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5">{nights} {nights === 1 ? 'night' : 'nights'}, {guests} {Number(guests) === 1 ? 'adult' : 'adults'}</p>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-sm text-gray-400 line-through">${totalOTA}</span>
                                </div>
                                <p className="text-2xl font-extrabold text-gray-900">${total}</p>
                                <p className="text-[11px] text-gray-400">{t('booking.includes_fees', 'Includes taxes & fees')}</p>
                                <p className="text-xs text-[#008009] font-semibold mt-0.5">
                                  {t('booking.you_save', 'You save')} ${savings} ({savingsPercent}%)
                                </p>
                              </div>

                              <button
                                onClick={() => setSelectedRoom(room.id)}
                                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                                  isSelected
                                    ? 'bg-[#003580] text-white shadow-lg'
                                    : 'bg-[#0071c2] hover:bg-[#005fa8] text-white'
                                }`}>
                                {isSelected ? '✓ Selected' : t('booking.select', 'Select')}
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
                          <span className="text-sm text-gray-400 line-through">${lowestRoom.otaPrice}</span>
                          <span className="text-3xl font-extrabold text-gray-900">${lowestRoom.price}</span>
                        </div>
                        <p className="text-xs text-gray-500">/ {t('booking.night', 'night')}</p>
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
                  <div className="border border-gray-200 rounded-lg p-2.5 hover:border-[#003580] transition-colors">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">{t('booking.guests', 'Guests')}</label>
                    <select value={guests} onChange={e => setGuests(e.target.value)}
                      className="w-full text-sm font-medium text-gray-900 border-0 p-0 focus:outline-none bg-transparent appearance-none">
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>)}
                    </select>
                  </div>
                </div>

                {/* Breakdown */}
                {lowestRoom && selectedRoom && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5 text-sm">
                    {(() => {
                      const room = rooms.find(r => r.id === selectedRoom) || lowestRoom
                      const total = room.price * nights
                      const fee = Math.round(total * 0.1)
                      return (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>${room.price} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
                            <span>${total}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>{t('booking.service_fee', 'STAYLO fee')} (10%)</span>
                            <span>${fee}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>{t('booking.total', 'Total')}</span>
                            <span>${total + fee}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Reserve button */}
                <button
                  disabled={!selectedRoom}
                  className={`w-full py-3.5 rounded-lg font-bold text-base transition-all ${
                    selectedRoom
                      ? 'bg-[#0071c2] hover:bg-[#005fa8] text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  {selectedRoom ? t('booking.reserve_now', 'Reserve Now') : t('booking.select_room_first', 'Select a room to book')}
                </button>

                <p className="text-center text-[11px] text-gray-400 mt-2">{t('booking.no_charge', "You won't be charged yet")}</p>

                {/* Trust badges */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="text-[#008009] flex-shrink-0" />
                    <span>{t('booking.badge_cancel', 'Free cancellation before check-in')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="text-[#008009] flex-shrink-0" />
                    <span>{t('booking.badge_pay', 'No prepayment needed')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Shield size={14} className="text-[#003580] flex-shrink-0" />
                    <span>{t('booking.badge_direct', 'Book directly with the hotel')}</span>
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
    </div>
  )
}
