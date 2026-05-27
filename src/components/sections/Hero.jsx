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
      padding: '40px 5% 50px',
    }}>
      {/* Samuii.png — starry-night beach painting as background.
          Aligned to the rest of the site's artwork-backed surfaces. */}
      <img
        src="/Samuii.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Light scrim — painting is already dark blue, just nudge contrast
          for the white headline and cards */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/45 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Tag pill — bumped to translucent gold pill on dark painting */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5"
          style={{
            background: 'rgba(253,203,110,0.15)',
            border: '1.5px solid rgba(253,203,110,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
          <span style={{ color: '#FFE54C', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            {t('home_hero.badge', '✦ Built with hoteliers, for hoteliers')}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(40px, 5.5vw, 76px)',
          fontWeight: 900,
          letterSpacing: '-3px',
          lineHeight: 1.05,
          color: '#FFFFFF',
          margin: '0 0 20px',
          textShadow: '0 2px 18px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.9)',
        }}>
          {t('home_hero.title_1', 'Book with ')}
          {/*
            "purpose." was a gradient text-fill with transparent fill —
            the parent h1's text-shadow was bleeding through the
            transparent fill and making it look black against the
            dark painting. Switched to a solid bright yellow that
            inherits the same shadow halo, so it pops on any zone.
          */}
          <span style={{ color: '#FFE54C' }}>{t('home_hero.title_highlight', 'purpose.')}</span>
          <br />
          {t('home_hero.title_2', 'Travel with soul.')}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '17px',
          lineHeight: 1.6,
          color: '#FFFFFF',
          maxWidth: '620px',
          margin: '0 auto 28px',
          fontWeight: 500,
          textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.7)',
        }}>
          {t('home_hero.subtitle', 'Every booking on Staylo goes back to the hoteliers who built it. Co-owned by worldwide hoteliers. 10% commission forever… and much more.')}
        </p>

        {/* Search box */}
        <div className="max-w-2xl mx-auto mb-6">
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
        <div className="flex flex-wrap justify-center gap-2 mb-8">
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
