import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, BedDouble, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  ArrowLeft, Calendar, Users, ChevronLeft, ChevronRight, Check, Heart,
  Share2, TrendingDown, Shield, Clock, Phone, Mail
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

const typeIcons = {
  hotel: '🏨', guesthouse: '🏠', resort: '🏝️', villa: '🏡',
  hostel: '🛏️', restaurant: '🍽️', activity: '🎯',
}

const typeGradients = {
  hotel: 'from-blue-500/70 to-indigo-600/50',
  guesthouse: 'from-emerald-500/70 to-teal-600/50',
  resort: 'from-amber-400/70 to-orange-500/50',
  villa: 'from-purple-500/70 to-indigo-500/50',
  hostel: 'from-rose-400/70 to-pink-500/50',
}

const amenityConfig = {
  wifi: { icon: Wifi, label: 'Free WiFi' },
  ac: { icon: Wind, label: 'Air Conditioning' },
  pool: { icon: Waves, label: 'Swimming Pool' },
  minibar: { icon: Coffee, label: 'Minibar' },
  parking: { icon: Car, label: 'Free Parking' },
  beach: { icon: Umbrella, label: 'Beach Access' },
  balcony: { icon: null, label: 'Private Balcony' },
  kitchen: { icon: null, label: 'Kitchen' },
  restaurant: { icon: Coffee, label: 'Restaurant' },
  bar: { icon: Coffee, label: 'Bar' },
}

function getRating(id) {
  let hash = 0
  for (let i = 0; i < (id || '').length; i++) { hash = ((hash << 5) - hash) + id.charCodeAt(i); hash |= 0 }
  return (4.0 + (Math.abs(hash) % 10) / 10).toFixed(1)
}
function getReviewCount(id) {
  let hash = 0
  for (let i = 0; i < (id || '').length; i++) { hash = ((hash << 3) - hash) + id.charCodeAt(i); hash |= 0 }
  return 12 + (Math.abs(hash) % 188)
}
function getRatingLabel(r) {
  if (r >= 4.8) return 'Exceptional'
  if (r >= 4.5) return 'Excellent'
  if (r >= 4.2) return 'Very Good'
  return 'Good'
}

function getDefaultCheckIn() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }
function getDefaultCheckOut() { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0] }

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
  const [isFav, setIsFav] = useState(false)

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-deep mb-3">{t('booking.not_found', 'Property not found')}</h2>
          <Link to="/dashboard/book"><Button variant="secondary"><ArrowLeft size={16} /> {t('booking.back_to_search', 'Back to search')}</Button></Link>
        </div>
      </div>
    )
  }

  const rating = getRating(property.id)
  const reviewCount = getReviewCount(property.id)
  const typeIcon = typeIcons[property.type] || '🏨'
  const gradient = typeGradients[property.type] || 'from-blue-500/70 to-indigo-600/50'
  const photos = property.photo_urls || []
  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
  const guestCount = Number(guests)
  const ratingLabel = getRatingLabel(Number(rating))

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
  const lowestTotal = lowestPrice ? lowestPrice * nights : null

  function handleBook(room) {
    navigate(`/dashboard/book/${property.id}/checkout?room=${room.id}&in=${checkIn}&out=${checkOut}&guests=${guests}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo gallery */}
      <div className="relative bg-deep">
        <div className="max-w-6xl mx-auto">
          <div className="relative h-72 sm:h-96 lg:h-[28rem] overflow-hidden">
            {photos.length > 0 ? (
              <>
                <img src={photos[photoIndex]} alt={property.name}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-all">
                      <ChevronLeft size={22} />
                    </button>
                    <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-all">
                      <ChevronRight size={22} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {photos.map((_, i) => (
                        <button key={i} onClick={() => setPhotoIndex(i)}
                          className={`transition-all rounded-full ${i === photoIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`} />
                      ))}
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                      {photoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <span className="text-9xl opacity-40">{typeIcon}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </>
            )}

            {/* Top bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <Link to={`/dashboard/book?q=&in=${checkIn}&out=${checkOut}&guests=${guests}`}
                className="flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/60 transition-all no-underline">
                <ArrowLeft size={16} />
                {t('booking.back_to_search', 'Back')}
              </Link>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-all">
                  <Share2 size={18} />
                </button>
                <button onClick={() => setIsFav(!isFav)}
                  className="p-2.5 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-all">
                  <Heart size={18} className={isFav ? 'fill-sunset text-sunset' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ocean bg-ocean/10 px-2.5 py-1 rounded-full">
                  {property.type || 'Hotel'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-deep mb-2">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <MapPin size={15} className="text-ocean" />
                  {property.city}{property.country ? `, ${property.country}` : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="bg-ocean text-white text-xs font-bold px-2 py-1 rounded-md">{rating}</span>
                  <span className="font-semibold text-deep">{ratingLabel}</span>
                  <span className="text-gray-400">· {reviewCount} reviews</span>
                </div>
              </div>
            </div>

            {/* STAYLO advantage banner */}
            <div className="bg-gradient-to-r from-libre/5 to-ocean/5 border border-libre/15 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-libre/15 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown size={20} className="text-libre" />
              </div>
              <div>
                <p className="text-sm font-bold text-deep">{t('booking.staylo_advantage', 'STAYLO Advantage')}</p>
                <p className="text-xs text-gray-500">{t('booking.advantage_desc', 'Only 10% commission vs. 15-25% on Booking.com. You save, the hotel earns more.')}</p>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-lg font-bold text-deep mb-3">{t('booking.about', 'About')}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Available Rooms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-deep">
                  {t('booking.available_rooms', 'Available Rooms')}
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                  {checkIn} → {checkOut} · {guests} {Number(guests) === 1 ? 'guest' : 'guests'}
                </span>
              </div>

              {availableRooms.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-deep mb-1">{t('booking.no_rooms_available', 'No rooms available')}</h3>
                  <p className="text-sm text-gray-500">{t('booking.try_different_dates', 'Try different dates or a smaller group.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableRooms.map((room, idx) => (
                    <div key={room.id}
                      className={`bg-white rounded-xl border ${idx === 0 ? 'border-ocean/30 ring-1 ring-ocean/10' : 'border-gray-100'} p-5 hover:shadow-md transition-all`}>
                      {idx === 0 && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-ocean bg-ocean/10 px-2.5 py-1 rounded-full mb-3">
                          {t('booking.best_value', 'Best Value')}
                        </span>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-deep text-base mb-1">{room.name}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-2">
                            <span className="flex items-center gap-1"><BedDouble size={14} /> {room.bed_type}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> Max {room.max_guests}</span>
                            {room.quantity > 1 && (
                              <span className="flex items-center gap-1"><Clock size={14} /> {room.quantity} {t('booking.left', 'left')}</span>
                            )}
                          </div>
                          {room.amenities && room.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {room.amenities.map(a => {
                                const cfg = amenityConfig[a]
                                const Icon = cfg?.icon
                                return (
                                  <span key={a} className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                                    {Icon && <Icon size={10} />}
                                    {cfg?.label || a}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {room.description && <p className="text-xs text-gray-400 mt-2">{room.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-2xl font-black text-deep">${room.totalPrice.toFixed(0)}</p>
                            <p className="text-[11px] text-gray-400">${room.pricePerNight.toFixed(0)} x {nights} {nights === 1 ? 'night' : 'nights'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{t('booking.includes_fees', 'includes taxes & fees')}</p>
                          </div>
                          <button onClick={() => handleBook(room)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-ocean to-electric text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-ocean/30 transition-all">
                            {t('booking.reserve', 'Reserve')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property details */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-lg font-bold text-deep mb-4">{t('booking.property_info', 'Property Information')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <BedDouble size={20} className="text-ocean mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-deep">{property.room_count || '—'}</p>
                  <p className="text-[11px] text-gray-400">{t('booking.total_rooms', 'Total Rooms')}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <Star size={20} className="text-golden mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-deep">{rating}</p>
                  <p className="text-[11px] text-gray-400">{reviewCount} reviews</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl block mb-0.5">{typeIcon}</span>
                  <p className="text-sm font-bold text-deep capitalize">{property.type || 'Hotel'}</p>
                  <p className="text-[11px] text-gray-400">{t('booking.property_type', 'Type')}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <Shield size={20} className="text-libre mx-auto mb-1.5" />
                  <p className="text-sm font-bold text-deep">10%</p>
                  <p className="text-[11px] text-gray-400">{t('booking.commission', 'Commission')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Price card */}
              <div className="bg-white rounded-xl border-2 border-ocean/20 p-5 shadow-lg shadow-ocean/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {lowestPrice ? (
                      <>
                        <span className="text-xs text-gray-400">{t('booking.from', 'from')}</span>
                        <p className="text-3xl font-black text-deep leading-tight">${lowestPrice.toFixed(0)}<span className="text-sm font-normal text-gray-400"> / {t('booking.night', 'night')}</span></p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-gray-400">{t('booking.check_availability', 'Check availability')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-golden fill-golden" />
                    <span className="font-bold text-sm text-deep">{rating}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{t('booking.check_in', 'Check-in')}</label>
                    <input type="date" value={checkIn} min={new Date().toISOString().split('T')[0]}
                      onChange={e => {
                        setCheckIn(e.target.value)
                        if (e.target.value >= checkOut) {
                          const next = new Date(e.target.value); next.setDate(next.getDate() + 1)
                          setCheckOut(next.toISOString().split('T')[0])
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-deep text-sm focus:outline-none focus:border-ocean" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{t('booking.check_out', 'Check-out')}</label>
                    <input type="date" value={checkOut} min={checkIn}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-deep text-sm focus:outline-none focus:border-ocean" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{t('booking.guests', 'Guests')}</label>
                  <select value={guests} onChange={e => setGuests(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-deep text-sm focus:outline-none focus:border-ocean">
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                  </select>
                </div>

                {/* Price breakdown */}
                {lowestTotal && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>${lowestPrice.toFixed(0)} x {nights} {nights === 1 ? 'night' : 'nights'}</span>
                      <span>${lowestTotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>{t('booking.service_fee', 'Service fee')} (10%)</span>
                      <span>${(lowestTotal * 0.1).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-deep pt-1.5 border-t border-gray-200">
                      <span>{t('booking.total', 'Total')}</span>
                      <span>${(lowestTotal * 1.1).toFixed(0)}</span>
                    </div>
                  </div>
                )}

                <p className="text-center text-[11px] text-gray-400 mb-3">{t('booking.select_room_below', 'Select a room below to book')}</p>

                {/* Guarantee badges */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check size={14} className="text-libre flex-shrink-0" />
                    <span>{t('booking.free_cancel', 'Free cancellation available')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check size={14} className="text-libre flex-shrink-0" />
                    <span>{t('booking.no_prepay', 'No prepayment needed')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield size={14} className="text-libre flex-shrink-0" />
                    <span>{t('booking.direct_booking', 'Direct booking with hotel')}</span>
                  </div>
                </div>
              </div>

              {/* Contact card */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h4 className="text-sm font-bold text-deep mb-3">{t('booking.need_help', 'Need help?')}</h4>
                <a href="mailto:contact@staylo.app"
                  className="flex items-center gap-2 text-sm text-ocean hover:text-electric transition-colors no-underline">
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
