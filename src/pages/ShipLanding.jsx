import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  MessageSquare, CalendarClock, ListChecks, BookOpen, Banknote,
  BarChart3, Activity, Boxes, Trophy, Smartphone, ArrowRight, Check, Sparkles,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'

// The real SHIP app modules (mirrors the in-app tabs). `img` points to a
// screenshot in /public/ship/<tk>.webp once added — until then the card
// renders icon + copy only (no broken image).
const MODULES = [
  { icon: MessageSquare, color: '#00B894', tk: 'chat',     img: null },
  { icon: CalendarClock, color: '#6C5CE7', tk: 'schedule', img: null },
  { icon: ListChecks,    color: '#FF6B00', tk: 'tasks',    img: null },
  { icon: BookOpen,      color: '#FF3CB4', tk: 'fiches',   img: null },
  { icon: Banknote,      color: '#00B894', tk: 'payroll',  img: null },
  { icon: BarChart3,     color: '#FDCB6E', tk: 'charges',  img: null },
  { icon: Activity,      color: '#6C5CE7', tk: 'pulse',    img: null },
  { icon: Boxes,         color: '#FF6B00', tk: 'stock',    img: null },
  { icon: Trophy,        color: '#FDCB6E', tk: 'score',    img: null },
]

export default function ShipLanding() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="relative">
      <SEO
        title="SHIP — Run your whole hotel from your pocket"
        description="STAYLO Ship (Staylo Hotelier In-Pocket) is the hotelier cockpit: front desk, channel manager, housekeeping, F&B, staff scheduling, payments and reporting — in one app. Free for life for Founding Partners."
        path="/ship"
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden text-white" style={{ background: '#0a0614' }}>
        {/* SHIP logo as the hero background — large, centered and clearly
            recognizable. object-contain shows the whole mark; a soft radial
            scrim darkens the edges so the headline stays crisp. */}
        <img
          src="/SHIP_LOGO.webp"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-none object-contain opacity-30"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(10,6,20,0.20) 0%, rgba(10,6,20,0.50) 60%, rgba(10,6,20,0.82) 100%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#FFD9A0' }}>
            {t('ship_page.eyebrow', 'by STAYLO · Free for Founding Partners')}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-3">
            STAYLO <span className="text-gradient">Ship</span>
          </h1>
          <p className="text-xl sm:text-2xl font-bold mb-3">
            {t('ship_page.hero_tagline', 'Run your whole hotel from your pocket.')}
          </p>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('ship_page.hero_sub', 'Staylo Hotelier In-Pocket — one app that replaces the five SaaS tools you stitch together today. Front desk, channel manager, housekeeping, F&B, staff, payments and reports.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={user ? '/dashboard' : '/register'} className="w-full sm:w-auto">
              <button className="w-full px-8 py-4 bg-white font-bold text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer">
                <Sparkles size={20} className="text-[#FF6B00]" />
                <span className="text-gradient">{user ? t('nav.dashboard', 'Go to Dashboard') : t('ship_page.cta_primary', 'Become a Founding Partner — SHIP free for life')}</span>
              </button>
            </Link>
            <a href="/ship.html" className="w-full sm:w-auto">
              <button className="w-full px-8 py-4 font-bold text-base rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer">
                <Smartphone size={20} />
                {t('ship_page.cta_secondary', 'Open the app')}
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── What is SHIP ── */}
      <section className="py-16 sm:py-20 bg-[#FFFDF8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">
            {t('ship_page.intro_title', 'Your whole operation, in one app')}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            {t('ship_page.intro_body', 'SHIP is the hotelier-side cockpit of STAYLO. Instead of paying for a PMS, a channel manager, a housekeeping tool, a scheduling app and a payment terminal, you run everything from your phone — built for independent hotels, guesthouses and resorts.')}
          </p>
        </div>
      </section>

      {/* ── Modules grid ── */}
      <section className="py-8 sm:py-12 bg-[#FFFDF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="section-label mb-3">{t('ship_page.modules_label', 'Everything included')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep">{t('ship_page.modules_title', 'One app. Every job.')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m) => (
              <Card key={m.tk} className="p-0 card-hover border-2 overflow-hidden" style={{ borderColor: m.color + '22' }}>
                {m.img && (
                  <div className="border-b" style={{ borderColor: m.color + '1A' }}>
                    <img src={m.img} alt="" loading="lazy" className="w-full h-44 object-cover object-top" />
                  </div>
                )}
                <div className="p-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: m.color + '14' }}>
                    <m.icon size={26} style={{ color: m.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-deep mb-2">{t(`ship_page.mod_${m.tk}_title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`ship_page.mod_${m.tk}_desc`)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── In your pocket ── */}
      <section className="py-16 sm:py-20 relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #00B894 0%, #6C5CE7 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Smartphone size={40} className="mb-4 text-white/90" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('ship_page.pocket_title', 'No new hardware. No IT team.')}</h2>
              <p className="text-white/85 text-lg leading-relaxed mb-6">
                {t('ship_page.pocket_body', 'SHIP runs on the phone already in your pocket. Onboard staff in minutes, manage from anywhere, and keep working even when the front desk is empty.')}
              </p>
              <ul className="space-y-3">
                {['pocket_p1', 'pocket_p2', 'pocket_p3'].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5"><Check size={15} /></span>
                    <span className="text-white/90">{t(`ship_page.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              {/* Simple phone frame holding the SHIP logo */}
              <div className="w-56 h-[420px] rounded-[2.5rem] border-[6px] border-white/20 bg-[#0a0614]/40 backdrop-blur-sm shadow-2xl flex flex-col items-center justify-center gap-4 p-6">
                <img src="/SHIP_LOGO.webp" alt="" className="w-20 h-20 rounded-2xl shadow-lg object-cover" />
                <p className="font-extrabold text-xl tracking-tight">STAYLO Ship</p>
                <p className="text-white/60 text-sm text-center">{t('ship_page.phone_caption', 'Your hotel, in your pocket')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing highlight ── */}
      <section className="py-16 sm:py-20 bg-[#FFFDF8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Card className="p-8 sm:p-10 text-center border-2" style={{ borderColor: 'rgba(0,184,148,0.25)' }}>
            <p className="section-label mb-3">{t('ship_page.price_label', 'Pricing')}</p>
            <p className="text-5xl sm:text-6xl font-black text-gradient mb-2">{t('ship_page.price_free', 'Free for life')}</p>
            <p className="text-lg font-bold text-deep mb-2">{t('ship_page.price_fp', 'for every Founding Partner')}</p>
            <p className="text-gray-500">{t('ship_page.price_else', 'A low flat monthly fee for everyone who joins later — no per-booking cut, ever.')}</p>
          </Card>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-8 sm:py-12 bg-[#FFFDF8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-white/40 animate-float" />
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">{t('ship_page.cta_title', 'Get SHIP free — become a Founding Partner')}</h2>
            <p className="relative text-white/80 mb-6 max-w-lg mx-auto">{t('ship_page.cta_subtitle', 'Lock in the lowest commission for life and run your whole hotel from one app.')}</p>
            <Link to={user ? '/dashboard' : '/register'}>
              <button className="relative px-10 py-4 bg-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center gap-3 cursor-pointer">
                <span className="text-gradient">{user ? t('nav.dashboard', 'Go to Dashboard') : t('ship_page.cta_button', 'Become a Founding Partner')}</span>
                <ArrowRight size={20} className="text-sunset" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
