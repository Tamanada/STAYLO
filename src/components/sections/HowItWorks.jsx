// ============================================
// HowItWorks — homepage section
// ============================================
// V3 (2026-04-28): redesigned cards for instant scannability
//   - Coloured top accent bar (visual identity per step)
//   - Number badge + emoji header
//   - Bright "highlight chip" with the KEY number/benefit
//     (10%, FREE, $1,000, 2% BTC) — readable in 1 glance
//   - Title + short description
//   - 3 checkmark bullets with the most important features
// ============================================
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

const TRAVELER_STEPS = [
  {
    num: 1, emoji: '🔍',
    titleKey: 'tr_step1_title', titleDef: 'Find your stay',
    descKey: 'tr_step1_desc', descDef: 'Search and book hotels at the fairest commission on the market.',
    highlightKey: 'tr_step1_hl', highlightDef: 'Best price',
    bullets: [
      { key: 'tr_step1_b1', def: 'Same hotels as Booking & Agoda' },
      { key: 'tr_step1_b2', def: 'Up to 15% cheaper' },
      { key: 'tr_step1_b3', def: 'No hidden fees' },
    ],
    color: '#FF6B00', bg: 'rgba(255,107,0,0.1)',
  },
  {
    num: 2, emoji: '🪙',
    titleKey: 'tr_step2_title', titleDef: 'Earn $STAY tokens',
    descKey: 'tr_step2_desc', descDef: 'Every night you book earns $STAY tokens — yours to use, vote, or trade.',
    highlightKey: 'tr_step2_hl', highlightDef: 'Free tokens',
    bullets: [
      { key: 'tr_step2_b1', def: 'Discounts on future stays' },
      { key: 'tr_step2_b2', def: 'Vote on platform decisions' },
      { key: 'tr_step2_b3', def: 'Tradable on Solana' },
    ],
    color: '#00B894', bg: 'rgba(0,184,148,0.1)',
  },
  {
    num: 3, emoji: '🤝',
    titleKey: 'tr_step3_title', titleDef: 'Become an Ambassador',
    descKey: 'tr_step3_desc', descDef: 'Refer a hotel to STAYLO and earn Bitcoin on every booking they receive — for life.',
    highlightKey: 'tr_step3_hl', highlightDef: '2% BTC · for life',
    bullets: [
      { key: 'tr_step3_b1', def: 'Refer hotels you love' },
      { key: 'tr_step3_b2', def: 'Earn on every booking, forever' },
      { key: 'tr_step3_b3', def: 'Paid in Bitcoin via Lightning' },
    ],
    color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)',
  },
]

const HOTELIER_STEPS = [
  {
    num: 1, emoji: '🏨',
    titleKey: 'ho_step1_title', titleDef: 'List your hotel — free',
    descKey: 'ho_step1_desc', descDef: 'Sign up in 15 minutes. Free listing. No exclusivity required.',
    highlightKey: 'ho_step1_hl', highlightDef: 'FREE · 15 min',
    bullets: [
      { key: 'ho_step1_b1', def: 'Free listing, forever' },
      { key: 'ho_step1_b2', def: 'No exclusivity contract' },
      { key: 'ho_step1_b3', def: 'Keep Booking & Airbnb in parallel' },
    ],
    color: '#F7931A', bg: 'rgba(247,147,26,0.1)',
  },
  {
    num: 2, emoji: '💸',
    titleKey: 'ho_step2_title', titleDef: 'Keep 90% of every booking',
    descKey: 'ho_step2_desc', descDef: '10% commission, contractual, locked for life. Paid within 1 hour after check-out.',
    highlightKey: 'ho_step2_hl', highlightDef: '10% · locked for life',
    bullets: [
      { key: 'ho_step2_b1', def: 'Contractual — no surprise hikes' },
      { key: 'ho_step2_b2', def: 'Paid in 1 hour, not 45 days' },
      { key: 'ho_step2_b3', def: 'No hidden fees, no surge pricing' },
    ],
    color: '#00B894', bg: 'rgba(0,184,148,0.1)',
  },
  {
    num: 3, emoji: '🗳️',
    titleKey: 'ho_step3_title', titleDef: 'Become a co-owner',
    descKey: 'ho_step3_desc', descDef: 'Buy a Founding Partner share and become a real co-owner of the platform.',
    highlightKey: 'ho_step3_hl', highlightDef: '$1,000 · 1 share',
    bullets: [
      { key: 'ho_step3_b1', def: '1 vote on platform decisions' },
      { key: 'ho_step3_b2', def: '20% of net profit as dividends' },
      { key: 'ho_step3_b3', def: '$STAY tokens earned per night hosted' },
    ],
    color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)',
  },
]

function StepCard({ step, t }) {
  return (
    <div className="card-hover rounded-2xl overflow-hidden relative"
      style={{
        background: 'white',
        border: '1.5px solid #E8E0D8',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
      {/* Coloured top accent bar — instant visual identity */}
      <div style={{ height: '5px', background: step.color }} />

      <div className="p-5">
        {/* Header: number badge + emoji + key-benefit chip */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base shrink-0"
              style={{ background: step.bg, color: step.color }}>
              {step.num}
            </div>
            <span className="text-3xl shrink-0">{step.emoji}</span>
          </div>
          <div className="text-[11px] font-black px-2.5 py-1 rounded-md whitespace-nowrap shrink-0"
            style={{ background: step.color, color: 'white', letterSpacing: '0.2px' }}>
            {t(`home_how.${step.highlightKey}`, step.highlightDef)}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-black text-lg mb-2 leading-tight" style={{ color: '#2D3436' }}>
          {t(`home_how.${step.titleKey}`, step.titleDef)}
        </h3>

        {/* Description (kept short) */}
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#636E72' }}>
          {t(`home_how.${step.descKey}`, step.descDef)}
        </p>

        {/* Key features — instantly scannable */}
        <ul className="space-y-2 pt-3 border-t" style={{ borderColor: '#F0EBE5' }}>
          {step.bullets.map((b, i) => (
            <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#2D3436' }}>
              <span className="rounded-full flex items-center justify-center shrink-0"
                style={{ width: '16px', height: '16px', background: step.bg, marginTop: '1px' }}>
                <Check size={11} strokeWidth={3.5} style={{ color: step.color }} />
              </span>
              <span className="font-semibold leading-snug">{t(`home_how.${b.key}`, b.def)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section className="overflow-x-hidden" style={{
      background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0F8 50%, #F0F4FF 100%)',
      padding: '80px 5%',
    }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="section-label mb-3">{t('home_how.label', 'How it works')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            {t('home_how.title', 'Two sides, one fair platform')}
          </h2>
          <p className="text-base mt-3 max-w-2xl mx-auto px-4" style={{ color: '#636E72' }}>
            {t('home_how.subtitle', 'STAYLO is built around two audiences — travelers who book stays and hoteliers who host them. Both win, and both can become co-owners.')}
          </p>
        </div>

        {/* TWO columns — Travelers vs Hoteliers */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">

          {/* ─── For TRAVELERS ─── */}
          <div className="min-w-0">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl">🧳</span>
                <h3 className="text-xl font-black" style={{ color: '#FF6B00' }}>
                  {t('home_how.for_travelers', 'For travelers')}
                </h3>
              </div>
              <div>
                <Link to="/ota" className="inline-flex items-center gap-1 text-xs font-bold no-underline transition-colors"
                  style={{ color: '#FF6B00' }}>
                  {t('home_how.cta_book', 'Find a stay')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {TRAVELER_STEPS.map(s => <StepCard key={s.num} step={s} t={t} />)}
            </div>
          </div>

          {/* ─── For HOTELIERS ─── */}
          <div className="min-w-0">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl">🏨</span>
                <h3 className="text-xl font-black" style={{ color: '#F7931A' }}>
                  {t('home_how.for_hoteliers', 'For hoteliers')}
                </h3>
              </div>
              <div>
                <Link to="/submit" className="inline-flex items-center gap-1 text-xs font-bold no-underline transition-colors"
                  style={{ color: '#F7931A' }}>
                  {t('home_how.cta_list', 'List your hotel')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {HOTELIER_STEPS.map(s => <StepCard key={s.num} step={s} t={t} />)}
            </div>
          </div>
        </div>

        {/* Tagline footer */}
        <p className="text-sm text-center mt-12 italic max-w-3xl mx-auto px-4" style={{ color: '#636E72' }}>
          {t('home_how.footer', 'Built with hoteliers, for hoteliers. Alone, it is impossible. Together, we are unstoppable.')}
        </p>
      </div>
    </section>
  )
}
