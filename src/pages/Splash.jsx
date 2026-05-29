import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHashScroll } from '../hooks/useHashScroll'
import {
  Shield, MapPin, Building2, Users, CheckCircle, XCircle,
  Clock, TrendingUp, Award, Star, Vote, ArrowRight, Zap,
  ClipboardList, BarChart3, Gem, Handshake, Rocket, RefreshCw
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'

export default function Splash() {
  const { t } = useTranslation()
  const { user } = useAuth()
  useHashScroll()   // jump to a section when arriving at /splash#s-...
  // Real partner count from platform_stats() RPC. We start at 0 (honest)
  // instead of a hardcoded fallback that lied (was 12). Renders nothing
  // misleading until the real number lands.
  const [partnerCount, setPartnerCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      // Prefer platform_stats() RPC (returns hotels_live + others).
      const { data, error } = await supabase.rpc('platform_stats')
      if (cancelled) return
      if (!error && data?.[0]?.hotels_live != null) {
        setPartnerCount(Number(data[0].hotels_live))
      } else {
        // Fallback: count properties WHERE status='live'
        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'live')
        if (!cancelled && typeof count === 'number') setPartnerCount(count)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [])

  const pctProgress = Math.min((partnerCount / 100) * 100, 100).toFixed(0)

  const steps = [
    { icon: ClipboardList, color: 'ocean', key: 'register' },
    { icon: BarChart3, color: 'electric', key: 'survey' },
    { icon: Gem, color: 'golden', key: 'shares' },
    { icon: Handshake, color: 'libre', key: 'invite' },
  ]

  const timeline = [
    // The "now" item is the ONLY actionable step on the roadmap —
    // a hotelier reading this page can ONLY do this one today. We
    // mark it with a `to` prop so the renderer wraps it in a <Link>
    // and adds a chevron + hover lift so the affordance is obvious.
    { icon: CheckCircle, color: 'libre', key: 'now', to: '/submit' },
    { icon: RefreshCw, color: 'ocean', key: 'build' },
    { icon: Rocket, color: 'golden', key: 'launch' },
  ]

  return (
    <div>
      {/* ==================== SECTION 1: HERO ==================== */}
      {/* ThePath artwork as full-bleed background — same scrim treatment
          as the artwork-backed sections on /vision so the page feels
          like one consistent brand surface. */}
      {/* Same 2.5:1 banner-height band as every other hero. Type scale
          tuned so the whole stack fits inside it without clipping. */}
      <section className="relative overflow-hidden w-full min-h-[440px] sm:aspect-[2.5/1] flex items-center">
        {/* Painting background */}
        <img
          src="/ThePath.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Light dark scrim — keeps the white headline crisp while
            letting the artwork breathe (same level as Vision sections) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/45" />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-golden/10 backdrop-blur-sm border border-golden/30 text-xs sm:text-sm font-semibold mb-3 animate-pulse-glow">
            <Zap size={14} className="text-golden" />
            <span className="text-golden">{t('splash.badge')}</span>
          </div>

          {/* Big dramatic title */}
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold leading-[1.05] mb-3 tracking-tight">
            {t('splash.title_line1')}
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 text-white"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.95)' }}
          >
            {t('splash.subtitle')}
          </p>

          {/* Description */}
          <p
            className="text-base sm:text-lg text-white max-w-2xl mx-auto mb-4 leading-relaxed font-medium"
            style={{ textShadow: '0 2px 14px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.95)' }}
          >
            {t('splash.description')}
          </p>

          {/* Glowing emphasized box */}
          <div className="inline-flex items-center gap-3 px-5 sm:px-7 py-2.5 rounded-2xl bg-black/35 backdrop-blur-md border border-golden/40 mb-3 animate-pulse-glow">
            <span
              className="text-white font-bold text-base sm:text-lg tracking-wide"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
            >
              {t('splash.types')}
            </span>
          </div>

          {/* Small text */}
          <p
            className="text-white text-sm sm:text-base mb-5 font-medium"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.85)' }}
          >
            {t('splash.license_note')}
          </p>

          {/* CTA */}
          <Link to={user ? '/dashboard' : '/register'}>
            <button className="group relative px-8 py-3 bg-gradient-to-r from-golden via-sunrise to-sunset text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 w-full sm:w-auto sm:min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer animate-pulse-glow">
              <span>{t('splash.cta')}</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

      </section>

      {/* ==================== SECTION 2: WHAT YOU CAN DO RIGHT NOW ==================== */}
      <section id="s-now" className="relative py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="green" className="mb-4">{t('splash.right_now_badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">
              {t('splash.right_now_title')}
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <div
                  key={step.key}
                  className={`flex items-start gap-5 bg-white border-2 border-${step.color}/20 hover:border-${step.color}/40 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all`}
                >
                  <div className={`flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl bg-${step.color}/10`}>
                    <Icon size={24} className={`text-${step.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-sm font-bold text-${step.color} uppercase tracking-wider`}>
                        {t(`splash.step${idx + 1}_number`)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-deep mb-1">
                      {t(`splash.step${idx + 1}_title`)}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t(`splash.step${idx + 1}_desc`)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: WHAT HAPPENS NEXT ==================== */}
      {/* Banner is the BACKGROUND (its natural 2.5:1 aspect ratio so
          nothing gets cropped). Cards overlay the RIGHT half of the
          banner where there's no text — STAYLO wordmark + "FROM ONE
          ISLAND TO THE WORLD" tagline on the left stay completely
          uncovered. Mobile (<md): cards stack below the banner. */}
      <section id="s-next"
        className="relative text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 45%, #7E22CE 100%)' }}
      >
        {/* Banner band — natural aspect ratio, full visible */}
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 1' }}>
          <img
            src="/bannerSTAYLO.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Desktop title — anchored near the TOP of the banner, large */}
          <div className="hidden md:block absolute top-6 lg:top-10 left-0 right-0 text-center px-4 z-10">
            <Badge variant="golden" className="mb-3 text-sm">{t('splash.next_badge')}</Badge>
            <h2
              className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.95)' }}
            >
              {t('splash.next_title')}
            </h2>
          </div>

          {/* Desktop overlay — cards centered horizontally on the page,
              narrowed to ~2/3 of the previous width per user direction */}
          <div className="hidden md:flex absolute inset-y-0 left-[31%] right-[31%] flex-col justify-center px-2 lg:px-4 pt-20 lg:pt-24">
            <div className="space-y-2 lg:space-y-3">
              {timeline.map((item) => {
                const Icon = item.icon
                const inner = (
                  <>
                    <div className="flex items-center justify-center shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white/20">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] lg:text-xs font-bold text-white uppercase tracking-wider mb-0.5">
                        {t(`splash.timeline_${item.key}_label`)}
                      </p>
                      <p className="text-white/95 text-xs lg:text-sm leading-snug">
                        {t(`splash.timeline_${item.key}_desc`)}
                      </p>
                    </div>
                    {item.to && (
                      <ArrowRight size={18} className="hidden lg:block shrink-0 self-center text-white/80 group-hover:translate-x-1 transition-transform" />
                    )}
                  </>
                )
                return item.to ? (
                  <Link
                    key={item.key}
                    to={item.to}
                    className="group flex items-center gap-3 bg-white/[0.33] backdrop-blur-md border border-white rounded-xl px-3 py-2.5 lg:px-4 lg:py-3 no-underline cursor-pointer transition-all hover:bg-white/[0.42] hover:-translate-y-0.5"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 bg-white/[0.33] backdrop-blur-md border border-white rounded-xl px-3 py-2.5 lg:px-4 lg:py-3"
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile (<md): cards stack below the banner on the brand gradient */}
        <div className="md:hidden max-w-4xl mx-auto w-full px-4 py-10 relative">
          <div className="text-center mb-6">
            <Badge variant="golden" className="mb-3">{t('splash.next_badge')}</Badge>
            <h2 className="text-3xl font-bold" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
              {t('splash.next_title')}
            </h2>
          </div>
          <div className="space-y-3">
            {timeline.map((item) => {
              const Icon = item.icon
              const inner = (
                <>
                  <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-xl bg-white/20">
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                      {t(`splash.timeline_${item.key}_label`)}
                    </p>
                    <p className="text-white text-sm">
                      {t(`splash.timeline_${item.key}_desc`)}
                    </p>
                    {item.to && (
                      <p className="mt-1.5 text-xs font-bold text-white inline-flex items-center gap-1">
                        {t('splash.timeline_now_cta', 'Register now')}
                        <ArrowRight size={14} />
                      </p>
                    )}
                  </div>
                </>
              )
              return item.to ? (
                <Link
                  key={item.key}
                  to={item.to}
                  className="group flex items-start gap-4 bg-white/[0.33] backdrop-blur-md border border-white rounded-xl p-4 no-underline"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={item.key}
                  className="flex items-start gap-4 bg-white/[0.33] backdrop-blur-md border border-white rounded-xl p-4"
                >
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: WHY KOH PHANGAN FIRST ==================== */}
      <section id="s-why" className="relative py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 relative">
            <Badge variant="golden" className="mb-4">{t('splash.why_badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">
              {t('splash.why_title')}
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('splash.why_subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-2 border-ocean/20 hover:border-ocean/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-ocean" />
              </div>
              <p className="text-4xl font-black text-ocean mb-2">{t('splash.why_stat1_number')}</p>
              <h3 className="text-lg font-bold text-deep mb-2">{t('splash.why_stat1_title')}</h3>
              <p className="text-sm text-gray-500">{t('splash.why_stat1_desc')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-sunset/20 hover:border-sunset/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={28} className="text-sunset" />
              </div>
              <p className="text-4xl font-black text-sunset mb-2">{t('splash.why_stat2_number')}</p>
              <h3 className="text-lg font-bold text-deep mb-2">{t('splash.why_stat2_title')}</h3>
              <p className="text-sm text-gray-500">{t('splash.why_stat2_desc')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-libre/20 hover:border-libre/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-libre" />
              </div>
              <p className="text-4xl font-black text-libre mb-2">{t('splash.why_stat3_number')}</p>
              <h3 className="text-lg font-bold text-deep mb-2">{t('splash.why_stat3_title')}</h3>
              <p className="text-sm text-gray-500">{t('splash.why_stat3_desc')}</p>
            </Card>
          </div>

          {/* CTA — the section ends on an emotional note ("Unis · communauté
              prête"). We give the visitor a way to JOIN that community right
              here, instead of forcing them to scroll further. Brand-gradient
              pill, white text, slight hover lift to invite the click. */}
          <div className="mt-10 text-center">
            <Link
              to="/submit"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-black text-white text-base sm:text-lg no-underline shadow-lg shadow-sunset/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sunset/30"
              style={{ background: 'linear-gradient(90deg, #FF6B00, #FF3CB4)' }}
            >
              {t('splash.why_cta', 'Je rejoins la communauté')}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 5: THE DEAL ==================== */}
      <section id="s-deal" className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="golden" className="mb-4">{t('splash.deal_badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              {t('splash.deal_title')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">{t('splash.deal_subtitle')}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-golden/20 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-golden/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sunrise/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

            {/* Share price */}
            <div className="relative text-center mb-8">
              <p className="text-sm text-golden uppercase tracking-widest font-semibold mb-2">{t('splash.deal_price_label')}</p>
              <p className="text-6xl sm:text-7xl font-black text-golden">$1,000</p>
              <p className="text-white/40 text-sm mt-2">{t('splash.deal_price_next')}</p>
            </div>

            {/* Deal details grid */}
            <div className="relative grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-golden/10 rounded-xl flex items-center justify-center shrink-0">
                  <Star size={20} className="text-golden" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_shares')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_shares_sub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-libre/10 rounded-xl flex items-center justify-center shrink-0">
                  <Vote size={20} className="text-libre" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_vote')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_vote_sub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-sunrise/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-sunrise" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_revenue')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_revenue_sub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-ocean/10 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={20} className="text-ocean" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_guests')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_guests_sub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-sunset/10 rounded-xl flex items-center justify-center shrink-0">
                  <Shield size={20} className="text-sunset" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_commission')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_commission_sub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-golden/10 rounded-xl flex items-center justify-center shrink-0">
                  <Award size={20} className="text-golden" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t('splash.deal_founding')}</p>
                  <p className="text-xs text-white/40">{t('splash.deal_founding_sub')}</p>
                </div>
              </div>
            </div>

            {/* Alpha shares badge */}
            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-golden/10 border border-golden/30">
                <Clock size={16} className="text-golden" />
                <span className="text-golden font-bold text-sm">{t('splash.deal_limited')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 6: WHO CAN APPLY ==================== */}
      <section id="s-who" className="relative py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('splash.who_title')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              {t('splash.who_subtitle')}
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Eligible */}
            <div className="space-y-3 mb-8">
              {['eligible1', 'eligible2', 'eligible3', 'eligible4'].map((key) => (
                <div key={key} className="flex items-start gap-3 bg-libre/5 border border-libre/20 rounded-xl px-5 py-4">
                  <CheckCircle size={22} className="text-libre shrink-0 mt-0.5" />
                  <span className="text-deep font-medium">{t(`splash.who_${key}`)}</span>
                </div>
              ))}
            </div>

            {/* Not eligible */}
            <div className="space-y-3">
              {['ineligible1', 'ineligible2'].map((key) => (
                <div key={key} className="flex items-start gap-3 bg-sunset/5 border border-sunset/20 rounded-xl px-5 py-4">
                  <XCircle size={22} className="text-sunset shrink-0 mt-0.5" />
                  <div>
                    <span className="text-deep font-medium">{t(`splash.who_${key}`)}</span>
                    <span className="text-gray-400 text-sm ml-2">({t(`splash.who_${key}_note`)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 7: COUNTDOWN / URGENCY ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="sunset" className="mb-4">{t('splash.clock_badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-1 italic">
              "{t('splash.clock_title')}"
            </h2>
            <p className="text-golden text-lg font-medium mb-6">{t('splash.clock_author', '— Gandhi')}</p>
            <p className="text-white/60 max-w-2xl mx-auto text-lg leading-relaxed">
              {t('splash.clock_subtitle')}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-6xl sm:text-7xl font-black text-golden">{partnerCount}</span>
              <span className="text-2xl text-white/40 font-medium">/ 100</span>
            </div>
            <p className="text-center text-white/50 text-sm mb-6">{t('splash.clock_label')}</p>

            <div className="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-golden via-sunrise to-sunset rounded-full transition-all duration-1000 relative"
                style={{ width: `${pctProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>0</span>
              <span>{t('splash.clock_pct', { pct: pctProgress })}</span>
              <span>100</span>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sunset/10 border border-sunset/30">
                <Clock size={16} className="text-sunset" />
                <span className="text-sunset font-semibold text-sm">{t('splash.clock_warning')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 8: BOTTOM CTA ==================== */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-[#FF6B35] via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">
              {t('splash.bottom_title')}
            </h2>
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto text-lg">
              {t('splash.bottom_subtitle')}
            </p>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={user ? '/dashboard' : '/register'}>
                <button className="group px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                  <span className="text-gradient">{t('splash.bottom_cta')}</span>
                  <ArrowRight size={20} className="text-sunset group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/vision">
                <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 cursor-pointer">
                  {t('splash.bottom_secondary')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
