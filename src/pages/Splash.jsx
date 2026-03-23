import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, MapPin, Building2, Users, CheckCircle, XCircle,
  Clock, TrendingUp, Award, Star, Vote, ArrowRight, Zap, Sparkles
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'

/* ── Inline SVG components for tropical decorations ── */

/** Palm tree silhouette — CSS-only via SVG path */
function PalmTree({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 120 200" fill="currentColor" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      {/* trunk */}
      <path d="M56 200 C58 140 54 100 60 80 C66 100 62 140 64 200Z" opacity="0.9" />
      {/* left fronds */}
      <path d="M60 80 C40 60 10 55 2 40 C20 50 45 48 60 70Z" opacity="0.7" />
      <path d="M58 75 C30 45 5 50 0 30 C18 40 40 35 58 65Z" opacity="0.5" />
      <path d="M56 70 C35 30 15 25 8 10 C25 22 42 25 56 58Z" opacity="0.6" />
      {/* right fronds */}
      <path d="M60 80 C80 60 110 55 118 40 C100 50 75 48 60 70Z" opacity="0.7" />
      <path d="M62 75 C90 45 115 50 120 30 C102 40 80 35 62 65Z" opacity="0.5" />
      <path d="M64 70 C85 30 105 25 112 10 C95 22 78 25 64 58Z" opacity="0.6" />
      {/* coconuts */}
      <circle cx="55" cy="78" r="4" opacity="0.8" />
      <circle cx="65" cy="76" r="4" opacity="0.8" />
      <circle cx="60" cy="82" r="3.5" opacity="0.7" />
    </svg>
  )
}

/** Reusable wave divider SVG */
function WaveDivider({ fill = 'var(--color-cream, #FFFCF5)', flip = false, className = '' }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`}>
      <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '60px' }}>
        <path
          d="M0 50C120 80 240 90 360 75C480 60 600 30 720 25C840 20 960 40 1080 55C1200 70 1320 80 1440 60V100H0V50Z"
          fill={fill}
        />
        <path
          d="M0 65C160 85 320 95 480 80C640 65 800 40 960 35C1120 30 1280 50 1440 70V100H0V65Z"
          fill={fill}
          opacity="0.5"
        />
      </svg>
    </div>
  )
}

/** Subtle palm-leaf background pattern as inline SVG data URI */
const palmLeafPattern = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 40 C30 25 10 15 5 5 C18 15 30 20 40 35Z' fill='%23000' opacity='0.02'/%3E%3Cpath d='M40 40 C50 25 70 15 75 5 C62 15 50 20 40 35Z' fill='%23000' opacity='0.02'/%3E%3Cpath d='M40 40 C25 50 15 70 5 75 C15 62 20 50 35 40Z' fill='%23000' opacity='0.015'/%3E%3Cpath d='M40 40 C55 50 65 70 75 75 C65 62 60 50 45 40Z' fill='%23000' opacity='0.015'/%3E%3C/svg%3E")`

/** Floating tropical emoji accent */
function FloatingEmoji({ emoji, className = '', style = {} }) {
  return (
    <span
      className={`absolute select-none pointer-events-none ${className}`}
      style={{ fontSize: '1.5rem', ...style }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  )
}

export default function Splash() {
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

        {/* Palm tree silhouettes on sides */}
        <PalmTree
          className="absolute bottom-12 left-2 sm:left-6 w-20 sm:w-28 text-white/[0.04] animate-float"
          style={{ animationDelay: '0.5s' }}
        />
        <PalmTree
          className="absolute bottom-16 right-4 sm:right-10 w-16 sm:w-24 text-white/[0.05] animate-float"
          style={{ animationDelay: '1.5s', transform: 'scaleX(-1)' }}
        />
        <PalmTree
          className="absolute bottom-20 left-[15%] w-12 sm:w-16 text-white/[0.03] animate-float hidden sm:block"
          style={{ animationDelay: '2.5s' }}
        />

        {/* Floating tropical accents in hero */}
        <FloatingEmoji emoji="🥥" className="animate-float hidden sm:block" style={{ top: '18%', left: '8%', fontSize: '1.2rem', opacity: 0.3, animationDelay: '3s' }} />
        <FloatingEmoji emoji="🌺" className="animate-float hidden sm:block" style={{ top: '25%', right: '12%', fontSize: '1rem', opacity: 0.25, animationDelay: '4s' }} />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-golden/10 backdrop-blur-sm border border-golden/30 text-sm font-semibold mb-8 animate-pulse-glow">
            <Zap size={16} className="text-golden" />
            <span className="text-golden">Round 1 — Founding Partners</span>
          </div>

          {/* Big dramatic title with palm emoji accents */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-[1.05] mb-6 tracking-tight">
            <span className="inline-block" aria-hidden="true" style={{ fontSize: '0.5em', verticalAlign: 'middle', marginRight: '0.2em', opacity: 0.7 }}>🌴</span>
            Koh Phangan{' '}
            <span className="text-gradient">First.</span>
            <span className="inline-block" aria-hidden="true" style={{ fontSize: '0.5em', verticalAlign: 'middle', marginLeft: '0.2em', opacity: 0.7 }}>🌴</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-8 leading-relaxed">
            The first round of Staylo shares is exclusively reserved for legally registered accommodations on Koh Phangan island.
          </p>

          {/* Glowing emphasized box */}
          <div className="inline-flex items-center gap-3 px-6 sm:px-8 py-4 rounded-2xl bg-gradient-to-r from-golden/15 via-sunrise/15 to-sunset/15 border border-golden/30 mb-6 animate-pulse-glow">
            <span className="text-white font-bold text-lg sm:text-xl tracking-wide">
              Hotels &middot; Guesthouses &middot; Hostels &middot; Resorts &middot; Bungalows
            </span>
          </div>

          {/* Small text */}
          <p className="text-white/40 text-sm mb-10">
            With valid Thai business license (TAT / DBD registered)
          </p>

          {/* CTA */}
          <Link to="/register">
            <button className="group relative px-10 py-4 bg-gradient-to-r from-golden via-sunrise to-sunset text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[280px] inline-flex items-center justify-center gap-3 cursor-pointer animate-pulse-glow">
              <span>Apply for Round 1</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Bottom wave — layered for depth */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: '80px' }}>
            <path d="M0 60C180 85 360 90 540 75C720 60 900 35 1080 30C1260 25 1380 45 1440 55V100H0V60Z" fill="var(--color-cream, #FFFCF5)" opacity="0.4" />
            <path d="M0 40C240 70 480 80 720 60C960 40 1200 10 1440 30V100H0V40Z" fill="var(--color-cream, #FFFCF5)" />
          </svg>
        </div>
      </section>

      {/* ==================== SECTION 2: WHY KOH PHANGAN FIRST ==================== */}
      <section className="relative py-16 sm:py-24" style={{ backgroundImage: palmLeafPattern, backgroundSize: '80px 80px' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 relative">
            <Badge variant="golden" className="mb-4">Why this island?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">
              <span aria-hidden="true" style={{ marginRight: '0.3em', opacity: 0.7 }}>🏝️</span>
              Why Koh Phangan First
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              The perfect launchpad for a hospitality revolution.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card className="p-6 text-center border-2 border-ocean/20 hover:border-ocean/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-ocean" />
              </div>
              <p className="text-4xl font-black text-ocean mb-2">420+</p>
              <h3 className="text-lg font-bold text-deep mb-2">Accommodations</h3>
              <p className="text-sm text-gray-500">One of Thailand's most vibrant hospitality ecosystems, packed onto one island.</p>
            </Card>

            {/* Card 2 */}
            <Card className="p-6 text-center border-2 border-sunset/20 hover:border-sunset/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={28} className="text-sunset" />
              </div>
              <p className="text-4xl font-black text-sunset mb-2">$6.3M</p>
              <h3 className="text-lg font-bold text-deep mb-2">Lost Per Year</h3>
              <p className="text-sm text-gray-500">In commissions leaving the island to foreign OTAs every single year. Money that never comes back.</p>
            </Card>

            {/* Card 3 */}
            <Card className="p-6 text-center border-2 border-libre/20 hover:border-libre/40 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-libre" />
              </div>
              <p className="text-4xl font-black text-libre mb-2">United</p>
              <h3 className="text-lg font-bold text-deep mb-2">A Community Ready</h3>
              <p className="text-sm text-gray-500">Independent hoteliers who know each other, trust each other, and are ready to own their future together.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Wave divider: light → dark ── */}
      <WaveDivider fill="var(--color-deep-navy, #1A1A2E)" />

      {/* ==================== SECTION 3: THE DEAL ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        {/* Subtle tropical grid texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="golden" className="mb-4">The Deal</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              <span aria-hidden="true" style={{ marginRight: '0.3em', opacity: 0.7 }}>☀️</span>
              What Round 1 Partners Get
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">Exclusive terms. Never offered again at this price.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-golden/20 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            {/* Glow effect — warm sunset tint */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-golden/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sunrise/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

            {/* Share price — big */}
            <div className="relative text-center mb-8">
              <p className="text-sm text-golden uppercase tracking-widest font-semibold mb-2">Alpha Share Price</p>
              <p className="text-6xl sm:text-7xl font-black text-golden">$1,000</p>
              <p className="text-white/40 text-sm mt-2">Goes to $1,500 in Round 2</p>
            </div>

            {/* Deal details — grid */}
            <div className="relative grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-golden/10 rounded-xl flex items-center justify-center shrink-0">
                  <Star size={20} className="text-golden" />
                </div>
                <div>
                  <p className="font-semibold text-white">1 to 10 Shares</p>
                  <p className="text-xs text-white/40">Per property registration</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-libre/10 rounded-xl flex items-center justify-center shrink-0">
                  <Vote size={20} className="text-libre" />
                </div>
                <div>
                  <p className="font-semibold text-white">1 Property = 1 Vote</p>
                  <p className="text-xs text-white/40">Regardless of shares held</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-sunrise/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-sunrise" />
                </div>
                <div>
                  <p className="font-semibold text-white">Revenue Sharing</p>
                  <p className="text-xs text-white/40">From day 1 of platform launch</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-ocean/10 rounded-xl flex items-center justify-center shrink-0">
                  <Award size={20} className="text-ocean" />
                </div>
                <div>
                  <p className="font-semibold text-white">Founding Partner</p>
                  <p className="text-xs text-white/40">Status — forever</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-electric/10 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-electric" />
                </div>
                <div>
                  <p className="font-semibold text-white">Priority Listing</p>
                  <p className="text-xs text-white/40">When booking engine goes live</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                <div className="w-10 h-10 bg-sunset/10 rounded-xl flex items-center justify-center shrink-0">
                  <Shield size={20} className="text-sunset" />
                </div>
                <div>
                  <p className="font-semibold text-white">10% Commission</p>
                  <p className="text-xs text-white/40">Locked forever — vs 17-22% OTA</p>
                </div>
              </div>
            </div>

            {/* Alpha shares badge */}
            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-golden/10 border border-golden/30">
                <Clock size={16} className="text-golden" />
                <span className="text-golden font-bold text-sm">Only 3,000 alpha shares available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wave divider: dark → light ── */}
      <WaveDivider fill="var(--color-cream, #FFFCF5)" flip />

      {/* ==================== SECTION 4: WHO CAN APPLY ==================== */}
      <section className="relative py-16 sm:py-24" style={{ backgroundImage: palmLeafPattern, backgroundSize: '80px 80px' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">Who Can Apply</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Round 1 is exclusive. Here are the requirements.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Eligible */}
            <div className="space-y-3 mb-8">
              {[
                'Registered accommodation on Koh Phangan',
                'Valid Thai business license (TAT or DBD)',
                'Currently listed on Booking.com, Agoda, or Airbnb',
                'Minimum 1 bookable room/unit',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-libre/5 border border-libre/20 rounded-xl px-5 py-4">
                  <CheckCircle size={22} className="text-libre shrink-0 mt-0.5" />
                  <span className="text-deep font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Not eligible */}
            <div className="space-y-3">
              {[
                { text: 'Restaurants, bars, tour operators', note: 'Coming in Round 2' },
                { text: 'Properties outside Koh Phangan', note: 'Coming in Round 2' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 bg-sunset/5 border border-sunset/20 rounded-xl px-5 py-4">
                  <XCircle size={22} className="text-sunset shrink-0 mt-0.5" />
                  <div>
                    <span className="text-deep font-medium">{item.text}</span>
                    <span className="text-gray-400 text-sm ml-2">({item.note})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Wave divider: light → dark ── */}
      <WaveDivider fill="var(--color-deep-navy, #1A1A2E)" />

      {/* ==================== SECTION 5: COUNTDOWN / URGENCY ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        {/* Subtle golden grid texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="sunset" className="mb-4">Limited Availability</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              <span aria-hidden="true" style={{ marginRight: '0.3em', opacity: 0.7 }}>🌊</span>
              The Clock Is Ticking
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Round 1 closes when 100 properties have joined — or July 2026, whichever comes first.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10">
            {/* Big counter */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-6xl sm:text-7xl font-black text-golden">{partnerCount}</span>
              <span className="text-2xl text-white/40 font-medium">/ 100</span>
            </div>
            <p className="text-center text-white/50 text-sm mb-6">Founding Partners</p>

            {/* Progress bar */}
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
              <span>{pctProgress}% full</span>
              <span>100</span>
            </div>

            {/* Warning */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sunset/10 border border-sunset/30">
                <Clock size={16} className="text-sunset" />
                <span className="text-sunset font-semibold text-sm">Once Round 1 closes, share price increases to $1,500</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wave divider: dark → light for CTA ── */}
      <WaveDivider fill="var(--color-cream, #FFFCF5)" flip />

      {/* ==================== SECTION 6: BOTTOM CTA ==================== */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-[#FF6B35] via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            {/* Decorative elements — tropical mix */}
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />
            <Sparkles size={14} className="absolute top-12 right-20 text-golden/30 animate-float" style={{ animationDelay: '1.5s' }} />

            {/* Palm tree silhouettes in CTA card */}
            <PalmTree
              className="absolute -bottom-4 -left-2 w-20 text-white/[0.07] hidden sm:block"
            />
            <PalmTree
              className="absolute -bottom-4 -right-2 w-16 text-white/[0.06] hidden sm:block"
              style={{ transform: 'scaleX(-1)' }}
            />

            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">
              Are you a Koh Phangan hotelier?
            </h2>
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto text-lg">
              Apply now. Secure your shares. Own your future.
            </p>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <button className="group px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                  <span className="text-gradient">Apply for Round 1</span>
                  <ArrowRight size={20} className="text-sunset group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/vision">
                <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 cursor-pointer">
                  Learn more about Staylo
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
