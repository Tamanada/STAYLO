import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, BedDouble, DollarSign, Wifi, Wind, Waves,
  UtensilsCrossed, Car, Umbrella, Coffee, ArrowLeft,
  Calendar, Users, ChevronLeft, ChevronRight, Check
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

const typeIcons = {
  hotel: '🏨', guesthouse: '🏠', resort: '🏝️', villa: '🏡',
  hostel: '🛏️', restaurant: '🍽️', activity: '🎯',
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

const amenityIcons = {
  wifi: Wifi, ac: Wind, pool: Waves, restaurant: UtensilsCrossed,
  bar: Coffee, parking: Car, beach: Umbrella, minibar: Coffee,
  room_service: Coffee, balcony: null, kitchen: null,
}

const amenityLabels = {
  wifi: 'WiFi', ac: 'Air Conditioning', pool: 'Pool', restaurant: 'Restaurant',
  bar: 'Bar', parking: 'Parking', beach: 'Beach Access', minibar: 'Minibar',
  room_service: 'Room Service', balcony: 'Balcony', kitchen: 'Kitchen',
}

function getRating(id) {
  let hash = 0
  for (let i = 0; i < (id || '').length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return (4.0 + (Math.abs(hash) % 10) / 10).toFixed(1)
}

function getReviewCount(id) {
  let hash = 0
  for (let i = 0; i < (id || '').length; i++) {
    hash = ((hash << 3) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return 12 + (Math.abs(hash) % 188)
}

function getDefaultCheckIn() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function getDefaultCheckOut() {
  const d = new Date(); d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export default function DemoPropertyDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState(searchParams.get('in') || getDefaultCheckIn())
  const [checkOut, setCheckOut] = useState(searchParams.get('out') || getDefaultCheckOut())
  const [guests, setGuests] = useState(searchParams.get('guests') || '2')
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [propRes, roomsRes] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('rooms').select('*, room_availability(*)').eq('property_id', id).eq('is_active', true).order('base_price'),
      ])
      setProperty(propRes.data)
      setRooms(roomsRes.data || [])
      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  if (loading) {
    return <div className="py-20 text-center text-gray-400">{t('common.loading', 'Loading...')}</div>
  }

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">{t('booking.not_found', 'Property not found')}</h2>
        <Link to="/dashboard/book">
          <Button variant="secondary"><ArrowLeft size={16} /> {t('booking.back_to_search', 'Back to search')}</Button>
        </Link>
      </div>
    )
  }

  const rating = getRating(property.id)
  const reviewCount = getReviewCount(property.id)
  const typeIcon = typeIcons[property.type] || '🏨'
  const gradient = typeGradients[property.type] || 'from-ocean/60 to-electric/40'
  const photos = property.photo_urls || []
  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
  const guestCount = Number(guests)

  // Filter rooms by guest capacity and availability
  const availableRooms = rooms.filter(room => {
    if (room.max_guests < guestCount) return false
    if (room.room_availability) {
      for (const avail of room.room_availability) {
        if (avail.date >= checkIn && avail.date < checkOut) {
          if (avail.is_blocked || avail.available_count <= 0) return false
        }
      }
    }
    return true
  }).map(room => {
    // Calculate total price for the stay
    let total = 0
    const d = new Date(checkIn)
    for (let i = 0; i < nights; i++) {
      const dateStr = d.toISOString().split('T')[0]
      const override = room.room_availability?.find(a => a.date === dateStr)
      total += Number(override?.price_override || room.base_price)
      d.setDate(d.getDate() + 1)
    }
    return { ...room, totalPrice: total, pricePerNight: total / nights }
  })

  const lowestPrice = availableRooms.length > 0 ? Math.min(...availableRooms.map(r => r.pricePerNight)) : null

  function handleBook(room) {
    navigate(`/dashboard/book/${property.id}/checkout?room=${room.id}&in=${checkIn}&out=${checkOut}&guests=${guests}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to={`/dashboard/book?q=&in=${checkIn}&out=${checkOut}&guests=${guests}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-ocean transition-colors mb-6 no-underline"
      >
        <ArrowLeft size={16} />
        {t('booking.back_to_search', 'Back to search')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo gallery / placeholder */}
          <div className="relative rounded-2xl overflow-hidden">
            {photos.length > 0 ? (
              <>
                <img src={photos[photoIndex]} alt={property.name} className="w-full h-64 sm:h-80 object-cover" />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={`h-64 sm:h-80 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-8xl opacity-50">{typeIcon}</span>
              </div>
            )}
            <div className="absolute bottom-4 left-4">
              <Badge variant="blue" className="!bg-white/90 !text-deep capitalize">{property.type || 'hotel'}</Badge>
            </div>
          </div>

          {/* Property name + location */}
          <div>
            <h1 className="text-3xl font-bold text-deep mb-2">{property.name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 text-gray-500">
                <MapPin size={16} className="text-ocean" />
                <span>{property.city}{property.country ? `, ${property.country}` : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star size={16} className="text-golden fill-golden" />
                <span className="font-bold text-deep">{rating}</span>
                <span className="text-gray-400 text-sm">({reviewCount} {t('booking.reviews', 'reviews')})</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <Card>
              <h2 className="text-lg font-bold text-deep mb-3">{t('booking.about', 'About this property')}</h2>
              <p className="text-gray-600">{property.description}</p>
            </Card>
          )}

          {/* Available Rooms */}
          <div>
            <h2 className="text-lg font-bold text-deep mb-4">
              {t('booking.available_rooms', 'Available Rooms')}
              <span className="text-sm font-normal text-gray-400 ml-2">
                {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')}, {guests} {t('booking.guests', 'guests')}
              </span>
            </h2>

            {availableRooms.length === 0 ? (
              <Card className="p-8 text-center">
                <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-deep mb-1">{t('booking.no_rooms_available', 'No rooms available')}</h3>
                <p className="text-sm text-gray-500">{t('booking.try_different_dates', 'Try different dates or a smaller group.')}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableRooms.map(room => (
                  <Card key={room.id} className="!p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-deep">{room.name}</h3>
                          <Badge variant="blue" className="capitalize text-xs">{room.type}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1"><BedDouble size={14} /> {room.bed_type}</span>
                          <span className="flex items-center gap-1"><Users size={14} /> {t('booking.up_to', 'Up to')} {room.max_guests} {t('booking.guests', 'guests')}</span>
                        </div>
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {room.amenities.map(a => {
                              const Icon = amenityIcons[a]
                              return (
                                <span key={a} className="flex items-center gap-1 text-xs bg-libre/5 text-libre px-2 py-0.5 rounded-full">
                                  {Icon && <Icon size={10} />}
                                  <span className="capitalize">{amenityLabels[a] || a}</span>
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {room.description && <p className="text-sm text-gray-400 mt-1">{room.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="text-2xl font-black text-deep">${room.totalPrice.toFixed(0)}</span>
                          <p className="text-xs text-gray-400">${room.pricePerNight.toFixed(0)}/{t('booking.night', 'night')} x {nights}</p>
                        </div>
                        <Button size="sm" onClick={() => handleBook(room)}>
                          {t('booking.book_now', 'Book Now')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-2 border-ocean/20">
              <h3 className="font-bold text-deep text-lg mb-4">{t('booking.your_stay', 'Your Stay')}</h3>

              {/* Price */}
              {lowestPrice && (
                <div className="text-center mb-5">
                  <span className="text-xs text-gray-400">{t('booking.from', 'from')}</span>{' '}
                  <span className="text-3xl font-black text-deep">${lowestPrice.toFixed(0)}</span>
                  <span className="text-gray-400">/{t('booking.night', 'night')}</span>
                </div>
              )}

              {/* Dates & guests */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Calendar size={12} className="inline mr-1" />{t('booking.check_in', 'Check-in')}
                  </label>
                  <input type="date" value={checkIn} min={new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      setCheckIn(e.target.value)
                      if (e.target.value >= checkOut) {
                        const next = new Date(e.target.value); next.setDate(next.getDate() + 1)
                        setCheckOut(next.toISOString().split('T')[0])
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Calendar size={12} className="inline mr-1" />{t('booking.check_out', 'Check-out')}
                  </label>
                  <input type="date" value={checkOut} min={checkIn}
                    onChange={e => setCheckOut(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Users size={12} className="inline mr-1" />{t('booking.guests', 'Guests')}
                  </label>
                  <select value={guests} onChange={e => setGuests(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                  <span className="text-gray-500">{guests} {Number(guests) === 1 ? 'guest' : 'guests'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('booking.rooms_available', 'Rooms available')}</span>
                  <span className="font-bold text-deep">{availableRooms.length}</span>
                </div>
              </div>

              {/* STAYLO guarantee */}
              <div className="bg-libre/5 border border-libre/15 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-libre mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-deep">{t('booking.guarantee_title', 'STAYLO Guarantee')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('booking.guarantee_desc', 'Only 10% commission — no hidden fees. You book directly with the hotel.')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
