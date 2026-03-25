import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin, Star, BedDouble, Search, Calendar, Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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

// Generate a deterministic pseudo-random rating from property id
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

export default function DemoBookingEngine() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)
      const { data } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['live', 'validated'])
        .order('created_at', { ascending: false })
      setProperties(data || [])
      setLoading(false)
    }
    fetchProperties()
  }, [])

  const filtered = useMemo(() => {
    if (!searchCity.trim()) return properties
    const q = searchCity.toLowerCase().trim()
    return properties.filter(p =>
      (p.city || '').toLowerCase().includes(q) ||
      (p.country || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q)
    )
  }, [properties, searchCity])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {/* DEMO MODE badge */}
      <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-sunrise to-sunset text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
        {t('demo.badge', 'Demo Mode')}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">
          {t('demo.title', 'Staylo Booking Engine')}
        </h1>
        <p className="text-gray-500">
          {t('demo.subtitle', 'Preview how your property will appear to travelers')}
        </p>
      </div>

      {/* Search bar */}
      <Card className="p-4 mb-8 !rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <MapPin size={12} className="inline mr-1" />
              {t('demo.destination', 'Destination')}
            </label>
            <input
              type="text"
              placeholder={t('demo.search_placeholder', 'City, country, or property name...')}
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar size={12} className="inline mr-1" />
              {t('demo.check_in', 'Check-in')}
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar size={12} className="inline mr-1" />
              {t('demo.check_out', 'Check-out')}
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Users size={12} className="inline mr-1" />
              {t('demo.guests', 'Guests')}
            </label>
            <div className="flex gap-2">
              <select
                value={guests}
                onChange={e => setGuests(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? t('demo.guest', 'Guest') : t('demo.guests', 'Guests')}</option>
                ))}
              </select>
              <button
                onClick={() => {/* search is live-filtered */}}
                className="px-4 py-2.5 bg-gradient-to-r from-ocean to-electric text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-400 mb-4">
          {t('demo.results_count', '{{count}} properties found', { count: filtered.length })}
          {searchCity.trim() && ` ${t('demo.in_location', 'in "{{location}}"', { location: searchCity })}`}
        </p>
      )}

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
              ? t('demo.no_results', 'No properties found')
              : t('demo.empty_title', 'No properties listed yet')}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchCity.trim()
              ? t('demo.try_different', 'Try a different destination or clear your search.')
              : t('demo.empty_subtitle', 'Be the first to register yours!')}
          </p>
          {!searchCity.trim() && (
            <Link to="/submit">
              <Button size="sm">{t('demo.register_property', 'Register Property')}</Button>
            </Link>
          )}
          {searchCity.trim() && (
            <Button size="sm" variant="secondary" onClick={() => setSearchCity('')}>
              {t('demo.clear_search', 'Clear Search')}
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

            return (
              <Card key={prop.id} className="overflow-hidden !p-0 hover:shadow-lg transition-shadow duration-300 group">
                {/* Placeholder image */}
                <div className={`h-48 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
                  <span className="text-6xl opacity-60">{typeIcon}</span>
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
                        {prop.room_count || '—'} {t('demo.rooms', 'rooms')}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        ({reviewCount} {t('demo.reviews', 'reviews')})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xl font-black text-deep">
                        ${Number(prop.avg_nightly_rate || 0).toFixed(0)}
                      </span>
                      <span className="text-sm text-gray-400">/{t('demo.night', 'night')}</span>
                    </div>
                    <Link to={`/dashboard/preview/${prop.id}`}>
                      <Button size="sm" variant="ghost" className="!text-ocean hover:!text-electric">
                        {t('demo.view_details', 'View Details')} &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

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
