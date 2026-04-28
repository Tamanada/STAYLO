// ============================================
// HotelGrid — featured properties on the homepage
// ============================================
// Was: 4 hardcoded fake hotels with emojis (visible on homepage,
// fatal for credibility with investors and hoteliers).
// Now: live fetch from properties WHERE status='live' (Koh Phangan first),
// graceful empty state, real photos when available.
// ============================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, ArrowRight, MapPin, Hotel as HotelIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currencies'

// Pastel placeholder gradients — used when a property has no photo yet
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #E8F8F0, #C8EFE0)',
  'linear-gradient(135deg, #E8F0FF, #C8D8FF)',
  'linear-gradient(135deg, #FFF5E0, #FFE8C0)',
  'linear-gradient(135deg, #F8E8FF, #EDCFFF)',
  'linear-gradient(135deg, #FFE8E8, #FFC8C8)',
  'linear-gradient(135deg, #E8FFF8, #C8EFEF)',
]

const FEATURED_LIMIT = 4  // homepage carousel size

export function HotelGrid() {
  const { t } = useTranslation()
  const [hotels, setHotels]   = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Featured = newest live properties; can be expanded later
      // (e.g. ORDER BY star_rating DESC NULLS LAST, created_at DESC)
      const { data, count } = await supabase
        .from('properties')
        .select('id, name, city, country, photo_urls, avg_nightly_rate, currency, star_rating, type, created_at', { count: 'exact' })
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(FEATURED_LIMIT)
      if (cancelled) return
      setHotels(data ?? [])
      setTotal(count ?? 0)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return null  // homepage shouldn't show a loading skeleton on first paint

  // Empty state — explicitly say "we're onboarding hotels", not fake content
  if (hotels.length === 0) {
    return (
      <section style={{ background: '#F8F6F0', padding: '80px 5%' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label mb-3">{t('home_grid.section_label', 'Featured hotels')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
            marginBottom: '16px',
          }}>
            {t('home_grid.empty_title', 'Onboarding the first hotels of Koh Phangan')}
          </h2>
          <p className="text-base mb-6" style={{ color: '#636E72' }}>
            {t('home_grid.empty_desc', 'Featured properties will appear here as hoteliers complete their listing. Want yours to be first ?')}
          </p>
          <Link to="/submit" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white no-underline"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C42)' }}>
            {t('home_grid.empty_cta', 'List your hotel')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section style={{ background: '#F8F6F0', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="section-label mb-3">{t('home_grid.section_label', 'Featured hotels')}</p>
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              color: '#2D3436',
              lineHeight: 1.15,
            }}>
              {t('home_grid.title', 'Koh Phangan · Alpha Market')}
            </h2>
          </div>
          <Link to="/ota" className="flex items-center gap-1 text-sm font-bold no-underline transition-colors"
            style={{ color: '#FF6B00' }}>
            {total > FEATURED_LIMIT
              ? t('home_grid.view_all_count', 'View all {{count}} hotels', { count: total })
              : t('home_grid.view_all', 'Browse all hotels')} <ArrowRight size={16} />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {hotels.map((hotel, idx) => {
            const photo    = hotel.photo_urls?.[0] || null
            const gradient = PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length]
            const stars    = hotel.star_rating || 0
            const price    = Number(hotel.avg_nightly_rate || 0)
            const currency = (hotel.currency || 'USD').toUpperCase()

            return (
              <Link
                key={hotel.id}
                to={`/ota/${hotel.id}`}
                className="card-hover rounded-3xl overflow-hidden no-underline block"
                style={{
                  background: 'white',
                  border: '1.5px solid #E8E0D8',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                {/* Image area — real photo if uploaded, pastel placeholder otherwise */}
                <div className="relative h-44 flex items-center justify-center overflow-hidden"
                     style={{ background: photo ? '#F5F3EE' : gradient }}>
                  {photo ? (
                    <img src={photo} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <HotelIcon size={48} style={{ color: 'rgba(45,52,54,0.25)' }} />
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white z-10"
                    style={{ background: 'linear-gradient(135deg, #00B894, #00CEC9)' }}>
                    {t('home_grid.coowned', 'Co-owned')}
                  </span>
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white z-10"
                    style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C42)' }}>
                    10%
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  {stars > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12}
                          fill={i < stars ? '#FDCB6E' : 'none'}
                          stroke={i < stars ? '#FDCB6E' : '#E8E0D8'} />
                      ))}
                      <span className="text-xs font-bold ml-1" style={{ color: '#2D3436' }}>{stars}</span>
                    </div>
                  )}

                  <h3 className="font-bold text-base mb-1 truncate" style={{ color: '#2D3436' }}>{hotel.name}</h3>
                  <p className="text-xs mb-3 flex items-center gap-1 truncate" style={{ color: '#B2BEC3' }}>
                    <MapPin size={10} />
                    {[hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.type || ''}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      {price > 0 ? (
                        <>
                          <span className="text-xl font-black" style={{ color: '#2D3436' }}>{formatCurrency(price, currency)}</span>
                          <span className="text-xs ml-1" style={{ color: '#B2BEC3' }}>{t('home_grid.night', '/night')}</span>
                        </>
                      ) : (
                        <span className="text-xs italic" style={{ color: '#B2BEC3' }}>{t('home_grid.no_price', 'Pricing soon')}</span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(108,92,231,0.1)', color: '#6C5CE7' }}>
                      {hotel.type || 'hotel'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
