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

      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-white text-center">
          {/* Slogan */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-golden/10 backdrop-blur-sm border border-golden/30 text-sm sm:text-base font-bold mb-5">
            <span className="text-golden">✦</span>
            <span className="text-golden">Owned by Hoteliers, built for hospitality</span>
            <span className="text-golden">✦</span>
          </div>

          {/* Main title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-2 tracking-tight">
            {t('hero.title_line1')}
          </h1>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-6 tracking-tight">
            <span className="text-gradient">{t('hero.title_line2')}</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 mb-6 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* Highlight bar */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-sunrise/20 to-sunset/20 border border-sunrise/30 mb-5">
            <Zap size={20} className="text-golden" />
            <span className="text-white font-bold text-lg">{t('hero.highlight')}</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
            <div className="mt-4 flex items-center justify-center gap-4 text-white/40 text-sm">
              <div className="flex items-center gap-1.5">
                <Shield size={14} />
                <span>{t('hero.trust_line')}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/30">
              <Users size={16} />
              <span>{t('hero.early_adopters', { count: userCount })}</span>
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
