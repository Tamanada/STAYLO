import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
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
  const [partnerCount, setPartnerCount] = useState(12)

  useEffect(() => {
    async function fetchPartnerCount() {
      try {
        const { count } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
        if (count && count > 0) setPartnerCount(count)
      } catch (e) { /* use default */ }
    }
    fetchPartnerCount()
  }, [])

  const pctProgress = Math.min((partnerCount / 100) * 100, 100).toFixed(0)

  const steps = [
    { icon: ClipboardList, color: 'ocean', key: 'register' },
    { icon: BarChart3, color: 'electric', key: 'survey' },
    { icon: Gem, color: 'golden', key: 'shares' },
    { icon: Handshake, color: 'libre', key: 'invite' },
  ]

  const timeline = [
    { icon: CheckCircle, color: 'libre', key: 'now' },
    { icon: RefreshCw, color: 'ocean', key: 'build' },
    { icon: Rocket, color: 'golden', key: 'launch' },
  ]

  return (
    <div>
      {/* ==================== SECTION 1: HERO ==================== */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated background with warm tropical tones */}
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-[#0d1f3c] to-[#0F3460]">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-golden/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-ocean/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-[15%] left-[30%] w-72 h-72 bg-electric/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[5%] right-[5%] w-96 h-96 bg-sunset/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
          {/* Warm sunset glow at the horizon */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#FF6B35]/8 via-[#FFBE0B]/5 to-transparent" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-golden/10 backdrop-blur-sm border border-golden/30 text-sm font-semibold mb-8 animate-pulse-glow">
            <Zap size={16} className="text-golden" />
            <span className="text-golden">{t('splash.badge')}</span>
          </div>

          {/* Big dramatic title */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] mb-4 tracking-tight">
            {t('splash.title_line1')}
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl font-semibold mb-6">
            <span className="text-gradient">{t('splash.subtitle')}</span>
          </p>

          {/* Description */}
          <p className="text-base sm:text-lg text-white/55 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('splash.description')}
          </p>

          {/* Glowing emphasized box */}
          <div className="inline-flex items-center gap-3 px-6 sm:px-8 py-4 rounded-2xl bg-gradient-to-r from-golden/15 via-sunrise/15 to-sunset/15 border border-golden/30 mb-6 animate-pulse-glow">
            <span className="text-white font-bold text-lg sm:text-xl tracking-wide">
              {t('splash.types')}
            </span>
          </div>

          {/* Small text */}
          <p className="text-white/40 text-sm mb-10">
            {t('splash.license_note')}
          </p>

          {/* CTA */}
          <Link to={user ? '/dashboard' : '/register'}>
            <button className="group relative px-10 py-4 bg-gradient-to-r from-golden via-sunrise to-sunset text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[280px] inline-flex items-center justify-center gap-3 cursor-pointer animate-pulse-glow">
              <span>{t('splash.cta')}</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Bottom shoreline — hand-drawn wave edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: '80px', pointerEvents: 'none' }}>
            <path
              d="M0 58 C40 52 90 60 150 54 C210 48 270 56 340 50 C410 44 470 58 540 52 C610 46 670 54 740 48 C810 42 870 56 940 50 C1010 44 1070 52 1140 48 C1210 44 1280 54 1360 50 L1440 52 V100 H0 Z"
              fill="var(--color-cream, #FFFCF5)"
              opacity="0.4"
            />
            <path
              d="M0 42 C70 50 150 56 250 48 C350 40 450 54 560 46 C670 38 770 50 880 44 C990 38 1090 48 1200 42 C1310 36 1380 46 1440 44 V100 H0 Z"
              fill="var(--color-cream, #FFFCF5)"
            />
          </svg>
        </div>
      </section>

      {/* ==================== SECTION 2: WHAT YOU CAN DO RIGHT NOW ==================== */}
      <section className="relative py-16 sm:py-24">
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
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-12">
            <Badge variant="golden" className="mb-4">{t('splash.next_badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              {t('splash.next_title')}
            </h2>
          </div>

          <div className="space-y-6">
            {timeline.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.key}
                  className="flex items-start gap-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <div className={`flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl bg-${item.color}/10`}>
                    <Icon size={24} className={`text-${item.color}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold text-${item.color} uppercase tracking-wider mb-1`}>
                      {t(`splash.timeline_${item.key}_label`)}
                    </p>
                    <p className="text-white/70 text-base">
                      {t(`splash.timeline_${item.key}_desc`)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: WHY KOH PHANGAN FIRST ==================== */}
      <section className="relative py-16 sm:py-24">
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
        </div>
      </section>

      {/* ==================== SECTION 5: THE DEAL ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
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
      <section className="relative py-16 sm:py-24">
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
