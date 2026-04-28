import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const FILTER_KEYS = ['filter_all', 'filter_beach', 'filter_jungle', 'filter_wellness', 'filter_city', 'filter_luxury', 'filter_coowned', 'filter_bestvalue']
const FILTER_EMOJIS = ['', '🏖', '🌿', '🧘', '🌆', '💎', '🤝', '💰']

export function Hero() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  // Real hotel count from platform_stats() RPC. Was '420+' hardcoded
  // (lying about onboarded count). Honest = real count or 'soon' if 0.
  const [hotelCount, setHotelCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      const { data } = await supabase.rpc('platform_stats')
      if (cancelled) return
      const live = Number(data?.[0]?.hotels_live ?? 0)
      setHotelCount(live)
    }
    fetchCount()
    return () => { cancelled = true }
  }, [])

  const STATS = [
    { value: hotelCount === null ? '…' : (hotelCount > 0 ? `${hotelCount}+` : 'Soon'), labelKey: 'stat_hotels', color: '#FF6B00' },
    { value: '10%', labelKey: 'stat_commission', color: '#00B894' },
    { value: '$STAY', labelKey: 'stat_earn', color: '#6C5CE7' },
    { value: '1 vote', labelKey: 'stat_vote', color: '#FF3CB4' },
  ]

  return (
    <section className="relative overflow-hidden" style={{
      background: 'linear-gradient(160deg, #FFFDF8 0%, #FFF5E6 40%, #FFF0F8 70%, #F0F8FF 100%)',
      padding: '80px 5% 60px',
    }}>
      {/* Floating blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B00 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-50px] left-[-100px] w-[400px] h-[400px] rounded-full opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF3CB4 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00B894 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Tag pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
          style={{ background: 'rgba(255,107,0,0.08)', border: '1.5px solid rgba(255,107,0,0.2)' }}>
          <span style={{ color: '#FF6B00', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {t('home_hero.badge', '✦ Built with hoteliers, for hoteliers')}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 6vw, 84px)',
          fontWeight: 900,
          letterSpacing: '-3px',
          lineHeight: 1.05,
          color: '#2D3436',
          margin: '0 0 24px',
        }}>
          {t('home_hero.title_1', 'Book with ')}
          <span style={{
            background: 'linear-gradient(135deg, #FF6B00, #FF3CB4, #6C5CE7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>{t('home_hero.title_highlight', 'purpose.')}</span>
          <br />
          {t('home_hero.title_2', 'Travel with soul.')}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          lineHeight: 1.65,
          color: '#636E72',
          maxWidth: '620px',
          margin: '0 auto 40px',
        }}>
          {t('home_hero.subtitle', 'Every booking on Staylo goes back to the hoteliers who built it. Co-owned. 10% commission. Yours forever.')}
        </p>

        {/* Search box */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center rounded-full overflow-hidden"
            style={{
              background: 'white',
              border: '1.5px solid #E8E0D8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              padding: '6px',
            }}>
            <div className="flex items-center flex-1 pl-5 gap-3">
              <Search size={20} style={{ color: '#B2BEC3' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('home_hero.search_placeholder', 'Where do you want to stay?')}
                className="flex-1 py-3 text-base outline-none bg-transparent"
                style={{ color: '#2D3436', fontSize: '15px' }}
              />
            </div>
            <Link to="/ota">
              <button className="btn-primary !rounded-full !py-3 !px-8 flex items-center gap-2">
                <span>{t('home_hero.search_button', 'Search')}</span>
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {FILTER_KEYS.map((key, i) => (
            <button key={key} onClick={() => setActiveFilter(i)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
              style={activeFilter === i ? {
                background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(255,107,0,0.25)',
              } : {
                background: 'white',
                color: '#636E72',
                border: '1.5px solid #E8E0D8',
              }}>
              {FILTER_EMOJIS[i] && <span className="mr-1">{FILTER_EMOJIS[i]}</span>}
              {t(`home_hero.${key}`, key)}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map(stat => (
            <div key={stat.labelKey} className="card-hover rounded-3xl p-5 text-center"
              style={{
                background: 'white',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              <p className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs font-semibold" style={{ color: '#B2BEC3' }}>{t(`home_hero.${stat.labelKey}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
