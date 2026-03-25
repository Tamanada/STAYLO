import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  MapPin, Star, BedDouble, DollarSign, Wifi, Wind, Waves,
  UtensilsCrossed, Car, Umbrella, Coffee, Lock, ArrowLeft,
  Calendar, Users, Search
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

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

function maskEmail(email) {
  if (!email) return '***@***.com'
  const [local, domain] = email.split('@')
  if (!domain) return '***@***.com'
  return `${local[0]}***@${domain}`
}

const amenities = [
  { icon: Wifi, key: 'wifi', label: 'WiFi' },
  { icon: Wind, key: 'ac', label: 'Air Conditioning' },
  { icon: Waves, key: 'pool', label: 'Pool' },
  { icon: UtensilsCrossed, key: 'restaurant', label: 'Restaurant' },
  { icon: Coffee, key: 'bar', label: 'Bar' },
  { icon: Car, key: 'parking', label: 'Parking' },
  { icon: Umbrella, key: 'beach', label: 'Beach Access' },
  { icon: Coffee, key: 'room_service', label: 'Room Service' },
]

export default function DemoPropertyDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProperty() {
      setLoading(true)
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()
      setProperty(data)
      setLoading(false)
    }
    if (id) fetchProperty()
  }, [id])

  if (loading) {
    return <div className="py-20 text-center text-gray-400">{t('common.loading', 'Loading...')}</div>
  }

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">{t('demo.not_found', 'Property not found')}</h2>
        <Link to="/dashboard/preview">
          <Button variant="secondary">
            <ArrowLeft size={16} />
            {t('demo.back_to_listings', 'Back to listings')}
          </Button>
        </Link>
      </div>
    )
  }

  const rating = getRating(property.id)
  const reviewCount = getReviewCount(property.id)
  const typeIcon = typeIcons[property.type] || '🏨'
  const gradient = typeGradients[property.type] || 'from-ocean/60 to-electric/40'
  const price = Number(property.avg_nightly_rate || 0).toFixed(0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {/* DEMO MODE badge */}
      <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-sunrise to-sunset text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
        {t('demo.badge', 'Demo Mode')}
      </div>

      {/* Back button */}
      <Link
        to="/dashboard/preview"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-ocean transition-colors mb-6 no-underline"
      >
        <ArrowLeft size={16} />
        {t('demo.back_to_listings', 'Back to listings')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content — left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image placeholder */}
          <div className={`h-64 sm:h-80 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center relative overflow-hidden`}>
            <span className="text-8xl opacity-50">{typeIcon}</span>
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <Badge variant="blue" className="!bg-white/90 !text-deep capitalize">
                {property.type || 'hotel'}
              </Badge>
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
                <span className="text-gray-400 text-sm">({reviewCount} {t('demo.reviews', 'reviews')})</span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <Card className="!p-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <BedDouble size={20} className="text-ocean mx-auto mb-1" />
                <p className="text-lg font-bold text-deep">{property.room_count || '—'}</p>
                <p className="text-xs text-gray-400">{t('demo.rooms', 'Rooms')}</p>
              </div>
              <div className="p-4 text-center">
                <DollarSign size={20} className="text-libre mx-auto mb-1" />
                <p className="text-lg font-bold text-deep">${price}</p>
                <p className="text-xs text-gray-400">{t('demo.avg_rate', 'Avg. Rate / Night')}</p>
              </div>
              <div className="p-4 text-center">
                <span className="text-2xl block mb-1">{typeIcon}</span>
                <p className="text-lg font-bold text-deep capitalize">{property.type || 'Hotel'}</p>
                <p className="text-xs text-gray-400">{t('demo.property_type', 'Property Type')}</p>
              </div>
              <div className="p-4 text-center">
                <Lock size={20} className="text-gray-300 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-400 truncate">{maskEmail(property.contact_email)}</p>
                <p className="text-xs text-gray-400">{t('demo.contact', 'Contact')}</p>
              </div>
            </div>
          </Card>

          {/* Description placeholder */}
          <Card>
            <h2 className="text-lg font-bold text-deep mb-3">{t('demo.about', 'About this property')}</h2>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-400 italic">
                {t('demo.description_placeholder', "This property's full description, photos, and amenities will be available when the Staylo booking engine launches. Stay tuned!")}
              </p>
            </div>
          </Card>

          {/* Amenities grid */}
          <Card>
            <h2 className="text-lg font-bold text-deep mb-4">{t('demo.amenities', 'Amenities')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {amenities.map(amenity => (
                <div
                  key={amenity.key}
                  className="flex items-center gap-2 bg-libre/5 border border-libre/10 rounded-xl px-3 py-2.5"
                >
                  <amenity.icon size={16} className="text-libre flex-shrink-0" />
                  <span className="text-sm text-deep">{t(`demo.amenity_${amenity.key}`, amenity.label)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">
              {t('demo.amenities_note', 'Amenities shown are placeholders. Actual amenities will be listed after launch.')}
            </p>
          </Card>
        </div>

        {/* Booking sidebar — right column */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-2 border-ocean/20">
              <h3 className="font-bold text-deep text-lg mb-4">{t('demo.book_stay', 'Book Your Stay')}</h3>

              {/* Price */}
              <div className="text-center mb-5">
                <span className="text-3xl font-black text-deep">${price}</span>
                <span className="text-gray-400">/{t('demo.night', 'night')}</span>
              </div>

              {/* Check-in / Check-out */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    {t('demo.check_in', 'Check-in')}
                  </label>
                  <input
                    type="date"
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    {t('demo.check_out', 'Check-out')}
                  </label>
                  <input
                    type="date"
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    <Users size={12} className="inline mr-1" />
                    {t('demo.guests', 'Guests')}
                  </label>
                  <select
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                  >
                    <option>2 {t('demo.guests', 'Guests')}</option>
                  </select>
                </div>
              </div>

              {/* Book Now button — disabled */}
              <Button
                disabled
                className="w-full !bg-gray-300 !from-gray-300 !to-gray-300 !text-gray-500 !shadow-none !cursor-not-allowed"
              >
                <Lock size={16} />
                {t('demo.coming_soon', 'Coming Soon')}
              </Button>

              {/* Note */}
              <div className="mt-4 bg-sunrise/5 border border-sunrise/15 rounded-xl p-3">
                <p className="text-xs text-gray-500 text-center">
                  {t('demo.booking_note', 'Bookings will open when we reach 3,000 founding shares.')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 bg-sunrise/5 border border-sunrise/20 rounded-2xl px-6 py-3">
          <span className="text-sunrise text-lg">&#9888;</span>
          <p className="text-sm text-gray-600">
            {t('demo.footer_note', 'This is a preview of the Staylo booking engine. Real bookings will be available when we reach 3,000 founding shares.')}
          </p>
        </div>
      </div>
    </div>
  )
}
