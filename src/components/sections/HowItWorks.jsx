// ============================================
// HowItWorks — homepage section
// ============================================
// Was: 3 generic steps that secretly addressed travelers only
// (Step 1 "Book your stay" → confused hoteliers landing here).
//
// Now: TWO clearly-labeled mirrored columns side-by-side
//   - For Travelers (book → earn $STAY → impact)
//   - For Hoteliers (list → keep 90% → co-own platform)
// Each side speaks to its audience. No more ambiguity.
// ============================================
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const TRAVELER_STEPS = [
  { num: 1, emoji: '🔍', titleKey: 'tr_step1_title', titleDef: 'Find your stay',
    descKey: 'tr_step1_desc', descDef: 'Search and book hotels at the fairest commission on the market. Same great hotels, better deal — for everyone.',
    color: '#FF6B00', bg: 'rgba(255,107,0,0.1)' },
  { num: 2, emoji: '🪙', titleKey: 'tr_step2_title', titleDef: 'Earn $STAY tokens',
    descKey: 'tr_step2_desc', descDef: 'Every night you book earns $STAY tokens. Use them for discounts, vote on platform decisions, or trade on Solana.',
    color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  { num: 3, emoji: '🤝', titleKey: 'tr_step3_title', titleDef: 'Become an Ambassador',
    descKey: 'tr_step3_desc', descDef: 'Refer a hotel to STAYLO → earn 2% Bitcoin on every booking they receive — for life.',
    color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
]

const HOTELIER_STEPS = [
  { num: 1, emoji: '🏨', titleKey: 'ho_step1_title', titleDef: 'List your hotel free',
    descKey: 'ho_step1_desc', descDef: 'Sign up in 15 minutes. Free listing. No exclusivity — keep Booking and Airbnb in parallel if you want.',
    color: '#F7931A', bg: 'rgba(247,147,26,0.1)' },
  { num: 2, emoji: '💸', titleKey: 'ho_step2_title', titleDef: 'Keep 90% of every booking',
    descKey: 'ho_step2_desc', descDef: '10% commission, contractual, locked for life. Paid within 1 hour after your guest checks out — not 45 days like Agoda.',
    color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  { num: 3, emoji: '🗳️', titleKey: 'ho_step3_title', titleDef: 'Become a co-owner',
    descKey: 'ho_step3_desc', descDef: 'Buy a Founding Partner share ($1,000 in Alpha) → 1 vote on platform decisions, 20% of net profit as dividends, $STAY tokens earned per night hosted.',
    color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
]

function StepCard({ step, t }) {
  return (
    <div className="card-hover rounded-3xl p-6 text-center"
      style={{
        background: 'white',
        border: '1.5px solid #E8E0D8',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: step.bg }}>
        <span className="text-lg font-black" style={{ color: step.color }}>{step.num}</span>
      </div>
      <span className="text-3xl block mb-3">{step.emoji}</span>
      <h3 className="font-black text-base mb-2" style={{ color: '#2D3436' }}>
        {t(`home_how.${step.titleKey}`, step.titleDef)}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: '#636E72' }}>
        {t(`home_how.${step.descKey}`, step.descDef)}
      </p>
    </div>
  )
}

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section style={{
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
          <p className="text-base mt-3 max-w-2xl mx-auto" style={{ color: '#636E72' }}>
            {t('home_how.subtitle', 'STAYLO is built around two audiences — travelers who book stays and hoteliers who host them. Both win, and both can become co-owners.')}
          </p>
        </div>

        {/* TWO columns — Travelers vs Hoteliers */}
        <div className="grid lg:grid-cols-2 gap-10">

          {/* ─── For TRAVELERS ─── */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧳</span>
                <h3 className="text-xl font-black" style={{ color: '#FF6B00' }}>
                  {t('home_how.for_travelers', 'For travelers')}
                </h3>
              </div>
              <Link to="/ota" className="text-xs font-bold no-underline flex items-center gap-1 transition-colors"
                style={{ color: '#FF6B00' }}>
                {t('home_how.cta_book', 'Find a stay')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {TRAVELER_STEPS.map(s => <StepCard key={s.num} step={s} t={t} />)}
            </div>
          </div>

          {/* ─── For HOTELIERS ─── */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏨</span>
                <h3 className="text-xl font-black" style={{ color: '#F7931A' }}>
                  {t('home_how.for_hoteliers', 'For hoteliers')}
                </h3>
              </div>
              <Link to="/submit" className="text-xs font-bold no-underline flex items-center gap-1 transition-colors"
                style={{ color: '#F7931A' }}>
                {t('home_how.cta_list', 'List your hotel')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {HOTELIER_STEPS.map(s => <StepCard key={s.num} step={s} t={t} />)}
            </div>
          </div>
        </div>

        {/* Tagline footer */}
        <p className="text-sm text-center mt-12 italic max-w-3xl mx-auto" style={{ color: '#636E72' }}>
          {t('home_how.footer', 'Built with hoteliers, for hoteliers. Alone, it is impossible. Together, we are unstoppable.')}
        </p>
      </div>
    </section>
  )
}
