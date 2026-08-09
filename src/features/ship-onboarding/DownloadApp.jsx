/*
  ================================================================
  DownloadApp — landing page for SHIP by STAYLO
  ================================================================
  Route: /downloadapp
  Purpose: convert visiting hoteliers into signups (install PWA + create
  hotel account + 14-day free trial).

  MIGRATION NOTE
  --------------
  This module is intentionally isolated at src/features/ship-onboarding/
  so it can be lifted-and-shipped verbatim to the SHIP-standalone repo
  (app.ship.app) once that spins up. No dependencies on STAYLO-specific
  code except the router registration in App.jsx and the shared brand
  colors. When migrating: copy this folder, update the "Continue with
  STAYLO" cross-link (line noted below), redeploy.
  ================================================================
*/
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Sparkles, Smartphone, Users, ArrowRight, Check, Zap,
  Wallet, MessageSquare, Calendar, ClipboardList, ShieldCheck,
  Globe, Download, Star
} from 'lucide-react'

// PWA install prompt — captured by browsers that support beforeinstallprompt
// (Chrome/Edge on desktop + Android). iOS uses "Add to Home Screen" manually.
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferred(e) }
    const installedHandler = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = async () => {
    if (!deferred) return false
    deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferred(null)
    return choice.outcome === 'accepted'
  }

  return { canInstall: !!deferred, installed, install }
}

// Detect platform for install instruction copy
function usePlatform() {
  const [p, setP] = useState('unknown')
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) setP('ios')
    else if (/android/.test(ua)) setP('android')
    else if (/mac|windows|linux/.test(ua)) setP('desktop')
  }, [])
  return p
}

export default function DownloadApp() {
  const { canInstall, installed, install } = useInstallPrompt()
  const platform = usePlatform()

  const installLabel =
    installed ? 'Already installed ✓'
    : canInstall ? 'Install SHIP'
    : platform === 'ios' ? 'Add to Home Screen'
    : platform === 'android' ? 'Install SHIP'
    : 'Install SHIP'

  return (
    <div className="min-h-screen" style={{ background: '#F8F6F0' }}>

      {/* ────────── HERO ────────── */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:pt-24 sm:pb-28"
        style={{
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 45%, #7E22CE 100%)',
        }}
      >
        {/* Sparkle particles decorating the sky */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
          <g fill="white">
            <circle cx="120" cy="80" r="3" opacity="0.85"/>
            <circle cx="240" cy="150" r="2" opacity="0.55"/>
            <circle cx="380" cy="60" r="3.5" opacity="0.9"/>
            <circle cx="520" cy="200" r="2" opacity="0.5"/>
            <circle cx="680" cy="90" r="3" opacity="0.7"/>
            <circle cx="860" cy="180" r="2.5" opacity="0.75"/>
            <circle cx="1040" cy="120" r="3.5" opacity="0.85"/>
            <circle cx="1140" cy="60" r="2" opacity="0.5"/>
            <path d="M 300 300 L 305 312 L 317 317 L 305 322 L 300 334 L 295 322 L 283 317 L 295 312 Z" opacity="0.9"/>
            <path d="M 900 380 L 903 388 L 911 390 L 903 393 L 900 401 L 897 393 L 889 390 L 897 388 Z" opacity="0.8"/>
          </g>
        </svg>

        <div className="relative max-w-5xl mx-auto text-center text-white">
          {/* Small badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.28)',
              fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase',
            }}
          >
            <Sparkles size={13} strokeWidth={2.6} />
            <span>SHIP by STAYLO · Now in your pocket</span>
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none mb-6"
            style={{ fontSize: 'clamp(40px, 7vw, 84px)', letterSpacing: '-2px' }}
          >
            Your hotel.<br/>
            <span style={{ fontStyle: 'italic', opacity: 0.92 }}>In your pocket.</span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto mb-10" style={{
            fontSize: 'clamp(15px, 1.6vw, 19px)',
            lineHeight: 1.55,
            maxWidth: 620,
            color: 'rgba(255,255,255,0.92)',
          }}>
            Bookings, team, payroll, POS, tip pool — all in one app.
            Runs from your phone. In your language. <strong>Free 14-day trial.</strong>
          </p>

          {/* Primary CTA + secondary */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link to="/ship-signup" onClick={() => window.scrollTo(0, 0)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black transition-all no-underline"
              style={{
                background: 'white',
                color: '#7E22CE',
                fontSize: 17,
                boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.28)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.22)' }}
            >
              Start 14-day free trial
              <ArrowRight size={18} strokeWidth={2.8} />
            </Link>

            <button type="button"
              onClick={install}
              disabled={!canInstall && platform !== 'ios' && platform !== 'android'}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold transition-all"
              style={{
                background: 'transparent',
                color: 'white',
                border: '1.5px solid rgba(255,255,255,0.5)',
                fontSize: 15,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Download size={17} strokeWidth={2.4} />
              {installLabel}
            </button>
          </div>

          {/* Trust line under CTAs */}
          <div className="mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            No credit card · Cancel anytime · $49/month after trial
          </div>
        </div>
      </section>

      {/* ────────── 3 STEP FLOW ────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#FF6B00' }}>
              How it works
            </div>
            <h2 className="font-black text-3xl sm:text-4xl mb-3" style={{ color: '#1A1A2E', letterSpacing: '-0.8px' }}>
              Live in <span style={{
                background: 'linear-gradient(135deg, #FF6B00, #FF1F70)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>10 minutes.</span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Sign up, set up your hotel, invite your manager. That's it.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Download, num: '01', title: 'Install the app', body: 'One-tap install on your phone or laptop. Runs offline. No app store needed.' },
              { icon: Smartphone, num: '02', title: 'Set up your hotel', body: 'Name, country, currency, property type. 5 questions. 2 minutes.' },
              { icon: Users, num: '03', title: 'Invite your manager', body: 'Add trusted team, assign roles, they get their own login. You keep control.' },
            ].map(({ icon: Icon, num, title, body }, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 border" style={{ borderColor: '#E8E0D8' }}>
                <div className="absolute -top-3 left-6 text-xs font-black tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FF1F70)', color: 'white' }}>
                  STEP {num}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.12), rgba(255,31,112,0.08))' }}>
                  <Icon size={24} style={{ color: '#FF6B00' }} strokeWidth={2.4} />
                </div>
                <div className="font-black text-lg text-gray-900 mb-1">{title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── FEATURES GRID ────────── */}
      <section className="py-12 sm:py-16 px-4" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#FF6B00' }}>
              Everything included
            </div>
            <h2 className="font-black text-3xl sm:text-4xl" style={{ color: '#1A1A2E', letterSpacing: '-0.8px' }}>
              6 SaaS in one. <span style={{
                background: 'linear-gradient(135deg, #FF6B00, #FF1F70)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>$49/month.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Calendar, title: 'Bookings & Front Desk', body: 'Check-in, check-out, room status, calendar in one view.' },
              { icon: Users, title: 'Team & HR', body: 'Contracts (EN+TH), schedule, roster, tasks.' },
              { icon: Wallet, title: 'Payroll auto', body: 'SSO, tax, OT, service charge. Local Thai law built-in.' },
              { icon: ClipboardList, title: 'POS Pulse', body: 'Revenue live, tip pool by points × hours.' },
              { icon: MessageSquare, title: 'Staff Messenger', body: 'Channels, DMs, tickets, order cards.' },
              { icon: ShieldCheck, title: 'Alerts & Compliance', body: 'TM30, break reminders, low-stock, safety.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <div key={i} className="p-5 rounded-xl border" style={{ borderColor: '#E8E0D8' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,31,112,0.06))' }}>
                  <Icon size={20} style={{ color: '#FF6B00' }} strokeWidth={2.4} />
                </div>
                <div className="font-black text-base text-gray-900 mb-1">{title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── PRICING ────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 45%, #7E22CE 100%)',
              boxShadow: '0 24px 60px rgba(126,34,206,0.25)',
            }}
          >
            <div className="text-xs font-black tracking-widest uppercase mb-4" style={{ opacity: 0.85 }}>
              Simple, honest pricing
            </div>
            <div className="mb-2">
              <span className="font-black" style={{ fontSize: 'clamp(60px, 10vw, 96px)', letterSpacing: '-3px' }}>$49</span>
              <span className="font-bold ml-2" style={{ fontSize: 20, opacity: 0.85 }}>/ month</span>
            </div>
            <div className="mb-6" style={{ fontSize: 15, opacity: 0.9 }}>
              per hotel · unlimited managers · unlimited staff records
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-8 text-left text-sm">
              {[
                'All 6 modules included',
                '14-day free trial (no CC)',
                'Cancel anytime',
                'EN + TH + 12 more languages',
                'Mobile + desktop + offline',
                'Free updates forever',
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check size={16} strokeWidth={3} className="mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Link to="/ship-signup" onClick={() => window.scrollTo(0, 0)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black transition-all no-underline"
              style={{
                background: 'white',
                color: '#7E22CE',
                fontSize: 17,
                boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Start 14-day free trial
              <ArrowRight size={18} strokeWidth={2.8} />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────── COMPETITOR COMPARISON ────────── */}
      <section className="py-12 sm:py-16 px-4" style={{ background: 'white' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#FF6B00' }}>
              Compare
            </div>
            <h2 className="font-black text-3xl" style={{ color: '#1A1A2E', letterSpacing: '-0.5px' }}>
              5–10× less than Cloudbeds.
            </h2>
          </div>
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#E8E0D8' }}>
            <table className="w-full text-sm">
              <thead style={{ background: '#FAFAF8' }}>
                <tr className="text-left">
                  <th className="px-4 py-3 font-black text-gray-900">Platform</th>
                  <th className="px-4 py-3 font-black text-gray-900 text-right">Price / mo</th>
                  <th className="px-4 py-3 font-black text-gray-900">All-in-one</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t" style={{ borderColor: '#E8E0D8' }}>
                  <td className="px-4 py-3">Cloudbeds</td>
                  <td className="px-4 py-3 text-right text-gray-600">$250 – $500</td>
                  <td className="px-4 py-3 text-gray-500">PMS only · No HR/POS</td>
                </tr>
                <tr className="border-t" style={{ borderColor: '#E8E0D8' }}>
                  <td className="px-4 py-3">Mews</td>
                  <td className="px-4 py-3 text-right text-gray-600">$300 – $500+</td>
                  <td className="px-4 py-3 text-gray-500">Enterprise focus</td>
                </tr>
                <tr className="border-t" style={{ borderColor: '#E8E0D8' }}>
                  <td className="px-4 py-3">Little Hotelier</td>
                  <td className="px-4 py-3 text-right text-gray-600">$99 – $150</td>
                  <td className="px-4 py-3 text-gray-500">PMS + Channel</td>
                </tr>
                <tr className="border-t font-black" style={{ borderColor: '#E8E0D8', background: 'linear-gradient(90deg, rgba(255,107,0,0.06), rgba(255,31,112,0.04))' }}>
                  <td className="px-4 py-3 text-gray-900">SHIP by STAYLO</td>
                  <td className="px-4 py-3 text-right" style={{
                    background: 'linear-gradient(135deg, #FF6B00, #FF1F70)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>$49</td>
                  <td className="px-4 py-3 text-gray-900">✓ PMS · HR · Payroll · POS · Messenger · Alerts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ────────── FINAL CTA + POWERED-BY ────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill="#FF6B00" color="#FF6B00" strokeWidth={0} />
              ))}
            </div>
          </div>
          <h2 className="font-black mb-4" style={{
            fontSize: 'clamp(28px, 4vw, 40px)', color: '#1A1A2E', letterSpacing: '-0.8px', lineHeight: 1.15,
          }}>
            Alone, it is impossible.<br/>
            <span style={{
              background: 'linear-gradient(135deg, #FF6B00, #FF1F70, #7E22CE)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontStyle: 'italic',
            }}>
              Together, we are unstoppable.
            </span>
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Join hundreds of independent hoteliers reclaiming their time and their margins.
          </p>
          <Link to="/ship-signup" onClick={() => window.scrollTo(0, 0)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black text-white transition-all no-underline"
            style={{
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
              fontSize: 17,
              boxShadow: '0 12px 32px rgba(255,31,112,0.35)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(255,31,112,0.45)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,31,112,0.35)' }}
          >
            Start free trial · No credit card
            <ArrowRight size={18} strokeWidth={2.8} />
          </Link>

          {/* Powered by — cross-link to STAYLO. NOTE: when migrating to
              SHIP-standalone repo, remove this line (SHIP standalone stays
              silent about the STAYLO coop connection). */}
          <div className="mt-10 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Globe size={12} />
            <span>Powered by</span>
            <Link to="/" className="font-bold" style={{ color: '#FF6B00' }}>STAYLO</Link>
            <span>· the cooperative platform owned by hoteliers</span>
          </div>
        </div>
      </section>

    </div>
  )
}
