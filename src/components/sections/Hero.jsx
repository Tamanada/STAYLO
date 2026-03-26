import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Zap, Link2Off, ShieldCheck, TrendingUp, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export function Hero() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
      if (count) setUserCount(count)
    }
    fetchCount()
  }, [])

  return (
    <section className="relative overflow-hidden min-h-[92vh] flex items-center">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-deep via-[#16213E] to-[#0F3460]">
        {/* Floating orbs */}
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-sunset/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-[30%] right-[10%] w-80 h-80 bg-ocean/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[15%] left-[25%] w-72 h-72 bg-electric/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[5%] right-[5%] w-96 h-96 bg-libre/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="text-white text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-semibold mb-4 animate-pulse-glow">
              <Zap size={16} className="text-golden" />
              <span>{t('hero.badge')}</span>
            </div>

            {/* Eyebrow — The powerful question */}
            <p className="text-xl sm:text-2xl text-golden font-semibold mb-4 tracking-wide">
              {t('hero.eyebrow')}
            </p>

            {/* Main title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-2 tracking-tight">
              {t('hero.title_line1')}
            </h1>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight">
              <span className="text-gradient">{t('hero.title_line2')}</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/60 mb-6 max-w-xl leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Highlight bar */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-sunrise/20 to-sunset/20 border border-sunrise/30 mb-5">
              <Zap size={20} className="text-golden" />
              <span className="text-white font-bold text-lg">{t('hero.highlight')}</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <Link to={user ? '/dashboard' : '/register'}>
                <button className="group relative px-8 py-4 bg-gradient-to-r from-golden via-sunrise to-sunset text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] flex items-center justify-center gap-3 cursor-pointer animate-pulse-glow">
                  <span>{user ? t('nav.dashboard', 'Dashboard') : t('hero.cta')}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/vision">
                <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 cursor-pointer">
                  {t('hero.secondary_cta')}
                </button>
              </Link>
            </div>

            {/* Trust line */}
            <div className="mt-4 flex items-center justify-center lg:justify-start gap-4 text-white/40 text-sm">
              <div className="flex items-center gap-1.5">
                <Shield size={14} />
                <span>{t('hero.trust_line')}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center lg:justify-start gap-2 text-sm text-white/30">
              <Users size={16} />
              <span>{t('hero.early_adopters', { count: userCount })}</span>
            </div>
          </div>

          {/* Right: Visual card stack */}
          <div className="hidden lg:block relative">
            <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Chain breaking icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-golden to-sunrise rounded-2xl flex items-center justify-center shadow-lg">
                    <Link2Off size={36} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-libre rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
              </div>

              <h3 className="text-white text-xl font-bold text-center mb-6">{t('hero.card_title')}</h3>

              {/* Before / After comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-white/60 text-sm">Booking.com</span>
                  <span className="text-sunset font-bold">-22%</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-white/60 text-sm">Expedia</span>
                  <span className="text-sunset font-bold">-18%</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-white/60 text-sm">Airbnb</span>
                  <span className="text-sunset font-bold">-15%</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />
                <div className="flex items-center justify-between bg-libre/20 border border-libre/30 rounded-xl px-4 py-3">
                  <span className="text-white font-semibold text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-libre" />
                    Staylo
                  </span>
                  <span className="text-libre font-bold">-10%</span>
                </div>
              </div>

              {/* Savings callout */}
              <div className="mt-5 bg-gradient-to-r from-golden/20 to-sunrise/20 border border-golden/30 rounded-xl px-4 py-3 text-center">
                <p className="text-golden text-xs font-medium mb-1">{t('hero.card_savings_label')}</p>
                <p className="text-white text-2xl font-extrabold flex items-center justify-center gap-1">
                  <TrendingUp size={20} className="text-libre" />
                  $30,368
                </p>
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-white/5 rounded-3xl border border-white/10 -z-10 rotate-2" />
            <div className="absolute -top-8 -right-8 w-full h-full bg-white/[0.02] rounded-3xl border border-white/5 -z-20 rotate-4" />
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 40C240 70 480 80 720 60C960 40 1200 10 1440 30V80H0V40Z" fill="var(--color-cream)" />
        </svg>
      </div>
    </section>
  )
}
