import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const FILTER_KEYS = ['filter_all', 'filter_beach', 'filter_jungle', 'filter_wellness', 'filter_city', 'filter_luxury', 'filter_coowned', 'filter_bestvalue']

// Custom mini-SVG icons for the three categories the user explicitly asked
// us to design (Beach / Jungle / Wellness). All use currentColor so they
// inherit the pill's text color (white when active, gray when inactive).
const BeachIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Sun */}
    <circle cx="6" cy="6" r="2.4" fill="currentColor"/>
    {/* Sun rays */}
    <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <line x1="6" y1="1.5" x2="6" y2="2.6"/>
      <line x1="1.5" y1="6" x2="2.6" y2="6"/>
      <line x1="9.4" y1="6" x2="10.5" y2="6"/>
      <line x1="3" y1="3" x2="3.7" y2="3.7"/>
      <line x1="8.3" y1="3.7" x2="9" y2="3"/>
    </g>
    {/* Palm trunk — gentle curve */}
    <path d="M 17 21 Q 16 14 18 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    {/* Palm fronds */}
    <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M 18 7 Q 13 5.5 10.5 7.5"/>
      <path d="M 18 7 Q 21.5 5 23 7"/>
      <path d="M 18 7 Q 16 9 14 11"/>
      <path d="M 18 7 Q 20 9 20.5 11.5"/>
    </g>
    {/* Coconut */}
    <circle cx="17.4" cy="7.6" r="0.7" fill="currentColor"/>
    {/* Waves */}
    <path d="M 1 21 Q 4 19.5 7 21 T 13 21" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  </svg>
)

const JungleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Big monstera leaf — central */}
    <path d="M 12 22 L 12 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path
      d="M 12 13
         Q 5 11 4 4
         Q 9 6 12 9
         Q 15 6 20 4
         Q 19 11 12 13 Z"
      fill="currentColor"
    />
    {/* Leaf veins */}
    <g stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="0.6" fill="none" strokeLinecap="round">
      <path d="M 12 13 L 8 8"/>
      <path d="M 12 13 L 16 8"/>
      <path d="M 12 13 L 6 6"/>
      <path d="M 12 13 L 18 6"/>
    </g>
    {/* Small side leaves */}
    <path d="M 7 22 Q 4 20 3 17" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    <path d="M 17 22 Q 20 20 21 17" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    {/* Small bud */}
    <circle cx="3" cy="17" r="0.9" fill="currentColor"/>
    <circle cx="21" cy="17" r="0.9" fill="currentColor"/>
  </svg>
)

const WellnessIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Lotus — 5 petals around center */}
    {/* Center petal (top) */}
    <path d="M 12 12 Q 11 6 12 3 Q 13 6 12 12 Z" fill="currentColor"/>
    {/* Upper-right petal */}
    <path d="M 12 12 Q 17 8 20 7 Q 18 12 12 12 Z" fill="currentColor" opacity="0.85"/>
    {/* Upper-left petal */}
    <path d="M 12 12 Q 7 8 4 7 Q 6 12 12 12 Z" fill="currentColor" opacity="0.85"/>
    {/* Lower-right petal */}
    <path d="M 12 12 Q 19 13 21 16 Q 16 17 12 13 Z" fill="currentColor" opacity="0.7"/>
    {/* Lower-left petal */}
    <path d="M 12 12 Q 5 13 3 16 Q 8 17 12 13 Z" fill="currentColor" opacity="0.7"/>
    {/* Water line under lotus */}
    <path d="M 3 20 Q 8 19 12 20 T 21 20" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
  </svg>
)

// Map filter key → custom icon component (null = render the emoji fallback)
const FILTER_ICONS = [null, BeachIcon, JungleIcon, WellnessIcon, null, null, null, null]
const FILTER_EMOJIS = ['', '', '', '', '🌆', '💎', '🤝', '💰']

export function Hero() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState(0)
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
            Brand gradient text per user reference (orange → pink → purple).
            text-shadow is explicitly disabled here so the parent h1's halo
            doesn't bleed through the transparent text-fill (which is what
            made the gradient look black before). filter: drop-shadow adds
            depth that works on the rendered gradient (not on text fill).
            display: inline-block isolates the span so the gradient renders
            crisply.
          */}
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #FF6B00, #FF3CB4, #6C5CE7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 1px rgba(255,255,255,0.4))',
          }}>{t('home_hero.title_highlight', 'purpose.')}</span>
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

        {/* Filter pills — 30% white frosted glass, white text (active state
            keeps the brand-gradient bg) */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FILTER_KEYS.map((key, i) => {
            const Icon = FILTER_ICONS[i]
            const isActive = activeFilter === i
            return (
              <button key={key} onClick={() => setActiveFilter(i)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer backdrop-blur-md"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.45)',
                  boxShadow: '0 4px 14px rgba(255,107,0,0.35)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.30)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.55)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.55)',
                }}>
                {Icon ? <Icon size={16} /> : (FILTER_EMOJIS[i] && <span>{FILTER_EMOJIS[i]}</span>)}
                {t(`home_hero.${key}`, key)}
              </button>
            )
          })}
        </div>

        {/* Stats row — 30% white frosted glass cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map(stat => (
            <div key={stat.labelKey} className="card-hover rounded-3xl p-5 text-center backdrop-blur-md"
              style={{
                background: 'rgba(255,255,255,0.30)',
                border: '1.5px solid rgba(255,255,255,0.55)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}>
              <p
                className="text-3xl font-black mb-1"
                style={{ color: stat.color, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
              >{stat.value}</p>
              <p
                className="text-xs font-semibold"
                style={{ color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
              >{t(`home_hero.${stat.labelKey}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
