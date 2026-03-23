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

/* ── Inline SVG components — hand-drawn pencil sketch style ── */

const sketchStyle = {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
}

/** Coconut palm tree — pencil sketch with curved trunk, big fronds, hanging coconuts */
function SketchPalm({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 140 220"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Curved trunk — slightly wobbly */}
      <path
        d="M68 218 C66 195 63 170 62 150 C60 130 59 115 61 100 C63 88 66 80 70 74"
        stroke={color}
        strokeWidth="1.4"
        strokeOpacity={opacity}
        fill="none"
      />
      <path
        d="M72 218 C71 196 69 172 67 152 C65 132 64 116 65 101 C67 89 69 81 72 75"
        stroke={color}
        strokeWidth="1"
        strokeOpacity={opacity * 0.6}
        fill="none"
      />
      {/* Trunk texture lines */}
      <path d="M64 190 C66 189 69 189 71 190" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M63 170 C65 169 68 169 70 170" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M62 150 C64 149 67 149 69 150" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M61 130 C63 129 66 129 68 130" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M62 110 C64 109 66 109 68 110" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Left frond 1 — big sweeping */}
      <path
        d="M70 74 C60 62 42 48 22 38 C18 36 12 33 6 28"
        stroke={color}
        strokeWidth="1.3"
        strokeOpacity={opacity}
        fill="none"
      />
      {/* Left frond 1 leaflets */}
      <path d="M50 52 C46 46 42 42 38 40" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M42 48 C38 54 34 58 30 60" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M34 43 C30 38 26 35 22 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M26 40 C23 46 19 50 15 52" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />

      {/* Left frond 2 — drooping */}
      <path
        d="M69 72 C56 56 36 42 14 32 C10 30 5 27 2 22"
        stroke={color}
        strokeWidth="1.1"
        strokeOpacity={opacity * 0.7}
        fill="none"
      />

      {/* Left frond 3 — upward */}
      <path
        d="M70 70 C58 52 40 30 28 16 C24 11 20 6 16 2"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity={opacity * 0.8}
        fill="none"
      />
      <path d="M48 36 C44 30 40 26 36 24" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M38 26 C35 32 32 36 28 38" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Right frond 1 — big sweeping */}
      <path
        d="M72 74 C82 62 100 48 120 38 C124 36 130 33 136 28"
        stroke={color}
        strokeWidth="1.3"
        strokeOpacity={opacity}
        fill="none"
      />
      <path d="M92 52 C96 46 100 42 104 40" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M100 48 C104 54 108 58 112 60" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M108 43 C112 38 116 35 120 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />

      {/* Right frond 2 — drooping */}
      <path
        d="M73 72 C86 56 106 42 128 32 C132 30 137 27 140 22"
        stroke={color}
        strokeWidth="1.1"
        strokeOpacity={opacity * 0.7}
        fill="none"
      />

      {/* Right frond 3 — upward */}
      <path
        d="M72 70 C84 52 102 30 114 16 C118 11 122 6 126 2"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity={opacity * 0.8}
        fill="none"
      />
      <path d="M94 36 C98 30 102 26 106 24" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Center frond — pointing up */}
      <path
        d="M71 73 C71 58 72 40 73 22 C73 14 74 8 74 2"
        stroke={color}
        strokeWidth="1.1"
        strokeOpacity={opacity * 0.6}
        fill="none"
      />

      {/* Coconuts — sketchy circles */}
      <ellipse cx="63" cy="78" rx="4.5" ry="4" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.08} />
      <ellipse cx="78" cy="76" rx="4" ry="4.3" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.08} />
      <ellipse cx="70" cy="82" rx="3.8" ry="3.5" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill={color} fillOpacity={opacity * 0.06} />
      {/* Coconut texture lines */}
      <path d="M61 78 C63 76 65 78" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M76 76 C78 74 80 76" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Crescent moon with hand-drawn stars */
function SketchMoon({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Crescent moon — slightly wobbly arc */}
      <path
        d="M58 12 C42 14 30 28 30 46 C30 64 42 78 58 80 C48 74 42 62 42 46 C42 30 48 18 58 12Z"
        stroke="white"
        strokeWidth="1.2"
        strokeOpacity="0.2"
        fill="white"
        fillOpacity="0.03"
      />
      {/* Star 1 — simple cross */}
      <path d="M78 20 L78 28" stroke="white" strokeWidth="1" strokeOpacity="0.18" fill="none" />
      <path d="M74 24 L82 24" stroke="white" strokeWidth="1" strokeOpacity="0.18" fill="none" />
      {/* Star 2 — small asterisk */}
      <path d="M20 22 L20 28" stroke="white" strokeWidth="0.8" strokeOpacity="0.14" fill="none" />
      <path d="M17 25 L23 25" stroke="white" strokeWidth="0.8" strokeOpacity="0.14" fill="none" />
      <path d="M18 23 L22 27" stroke="white" strokeWidth="0.6" strokeOpacity="0.1" fill="none" />
      {/* Star 3 — tiny dot-cross */}
      <path d="M88 50 L88 54" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" fill="none" />
      <path d="M86 52 L90 52" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" fill="none" />
      {/* Star 4 — small */}
      <path d="M14 60 L14 64" stroke="white" strokeWidth="0.7" strokeOpacity="0.12" fill="none" />
      <path d="M12 62 L16 62" stroke="white" strokeWidth="0.7" strokeOpacity="0.12" fill="none" />
      {/* Star 5 — tiny twinkle */}
      <path d="M70 8 L70 12" stroke="white" strokeWidth="0.6" strokeOpacity="0.1" fill="none" />
      <path d="M68 10 L72 10" stroke="white" strokeWidth="0.6" strokeOpacity="0.1" fill="none" />
    </svg>
  )
}

/** Small sketchy ocean wave */
function SketchWave({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 80 30"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Curling wave line 1 */}
      <path
        d="M4 18 C10 10 18 6 26 10 C34 14 36 20 30 24 C26 26 22 22 24 18"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity={opacity}
        fill="none"
      />
      {/* Wave line 2 — smaller curl */}
      <path
        d="M34 16 C40 10 48 8 54 12 C58 14 58 18 54 20"
        stroke={color}
        strokeWidth="1"
        strokeOpacity={opacity * 0.7}
        fill="none"
      />
      {/* Spray dots */}
      <path d="M16 8 C17 6 18 7" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M22 6 C23 4 24 5" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Foam line */}
      <path
        d="M2 22 C12 20 22 21 32 22 C42 23 52 21 62 20 C68 19 74 20 78 22"
        stroke={color}
        strokeWidth="0.8"
        strokeOpacity={opacity * 0.5}
        fill="none"
      />
    </svg>
  )
}

/** Thai longtail boat — simple pencil sketch */
function SketchBoat({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 100 50"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Hull — curved boat shape */}
      <path
        d="M8 32 C12 36 30 40 55 38 C70 37 82 34 90 30 L88 28 C80 32 65 35 50 36 C30 37 14 34 10 30Z"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity={opacity}
        fill={color}
        fillOpacity={opacity * 0.05}
      />
      {/* Bow point — sharp front */}
      <path
        d="M8 32 C6 30 4 28 2 26"
        stroke={color}
        strokeWidth="1.1"
        strokeOpacity={opacity}
        fill="none"
      />
      {/* Longtail pole extending back */}
      <path
        d="M90 30 C92 28 95 24 98 18"
        stroke={color}
        strokeWidth="1"
        strokeOpacity={opacity * 0.8}
        fill="none"
      />
      {/* Engine/prop at end */}
      <path
        d="M97 19 C98 17 99 20 98 22"
        stroke={color}
        strokeWidth="0.8"
        strokeOpacity={opacity * 0.6}
        fill="none"
      />
      {/* Cabin/canopy post */}
      <path d="M40 36 L40 22" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M55 36 L55 22" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Canopy roof */}
      <path
        d="M36 22 C40 20 48 19 55 20 C58 20 60 22 58 22"
        stroke={color}
        strokeWidth="0.9"
        strokeOpacity={opacity * 0.7}
        fill="none"
      />
      {/* Water line under boat */}
      <path
        d="M4 38 C14 40 28 42 48 42 C68 42 82 38 94 34"
        stroke={color}
        strokeWidth="0.6"
        strokeOpacity={opacity * 0.3}
        fill="none"
      />
    </svg>
  )
}

/** Hand-drawn shoreline divider — replaces geometric wave SVGs */
function ShorelineDivider({ fill = 'var(--color-cream, #FFFCF5)', flip = false, className = '' }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`} style={{ pointerEvents: 'none' }}>
      <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '60px' }}>
        {/* Solid fill for transition — slightly wavy top edge like hand-drawn */}
        <path
          d="M0 52 C48 48 96 55 144 50 C192 45 240 56 310 48 C380 40 430 58 500 52 C570 46 620 54 700 46 C780 38 830 55 920 50 C1010 45 1060 52 1140 48 C1220 44 1300 56 1380 50 L1440 48 V100 H0 Z"
          fill={fill}
        />
        {/* Second softer wave line behind — pencil sketch feel */}
        <path
          d="M0 62 C60 58 130 66 210 60 C290 54 370 64 450 58 C530 52 610 62 700 56 C790 50 870 60 960 55 C1050 50 1130 58 1220 54 C1310 50 1380 56 1440 58 V100 H0 Z"
          fill={fill}
          opacity="0.5"
        />
        {/* Thin pencil-like shoreline stroke on top */}
        <path
          d="M0 52 C48 48 96 55 144 50 C192 45 240 56 310 48 C380 40 430 58 500 52 C570 46 620 54 700 46 C780 38 830 55 920 50 C1010 45 1060 52 1140 48 C1220 44 1300 56 1380 50 L1440 48"
          stroke={fill}
          strokeWidth="1.5"
          strokeOpacity="0.3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** Subtle palm-leaf background pattern as inline SVG data URI — sketch style */
const palmLeafPattern = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg' fill='none'%3E%3Cpath d='M40 40 C32 28 14 16 6 6' stroke='%23000' stroke-width='0.5' opacity='0.02' stroke-linecap='round'/%3E%3Cpath d='M40 40 C48 28 66 16 74 6' stroke='%23000' stroke-width='0.5' opacity='0.02' stroke-linecap='round'/%3E%3Cpath d='M40 40 C28 48 16 66 6 74' stroke='%23000' stroke-width='0.4' opacity='0.015' stroke-linecap='round'/%3E%3Cpath d='M40 40 C52 48 64 66 74 74' stroke='%23000' stroke-width='0.4' opacity='0.015' stroke-linecap='round'/%3E%3C/svg%3E")`

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

        {/* Pencil sketch coconut palms — hero sides */}
        <SketchPalm
          className="absolute bottom-12 left-2 sm:left-6 w-24 sm:w-32 animate-float"
          style={{ animationDelay: '0.5s' }}
          color="white"
          opacity={0.18}
        />
        <SketchPalm
          className="absolute bottom-16 right-4 sm:right-10 w-20 sm:w-28 animate-float"
          style={{ animationDelay: '1.5s', transform: 'scaleX(-1)' }}
          color="white"
          opacity={0.15}
        />
        <SketchPalm
          className="absolute bottom-20 left-[15%] w-14 sm:w-20 animate-float hidden sm:block"
          style={{ animationDelay: '2.5s' }}
          color="white"
          opacity={0.1}
        />

        {/* Crescent moon with stars — top right */}
        <SketchMoon
          className="absolute top-[8%] right-[8%] w-20 sm:w-28 animate-float hidden sm:block"
          style={{ animationDelay: '3s' }}
        />

        {/* Sketch wave accents */}
        <SketchWave
          className="absolute bottom-[22%] left-[6%] w-16 sm:w-20 animate-float hidden sm:block"
          style={{ animationDelay: '4s' }}
          color="white"
          opacity={0.12}
        />
        <SketchWave
          className="absolute bottom-[18%] right-[12%] w-14 sm:w-18 animate-float hidden sm:block"
          style={{ animationDelay: '2s' }}
          color="white"
          opacity={0.1}
        />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-golden/10 backdrop-blur-sm border border-golden/30 text-sm font-semibold mb-8 animate-pulse-glow">
            <Zap size={16} className="text-golden" />
            <span className="text-golden">Round 1 — Founding Partners</span>
          </div>

          {/* Big dramatic title */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-[1.05] mb-6 tracking-tight">
            Koh Phangan{' '}
            <span className="text-gradient">First.</span>
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

        {/* Bottom shoreline — hand-drawn wave edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: '80px', pointerEvents: 'none' }}>
            {/* Semi-transparent hand-drawn edge */}
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

      {/* ==================== SECTION 2: WHY KOH PHANGAN FIRST ==================== */}
      <section className="relative py-16 sm:py-24" style={{ backgroundImage: palmLeafPattern, backgroundSize: '80px 80px' }}>
        {/* Small sketch palm on right side */}
        <SketchPalm
          className="absolute top-8 right-4 w-12 sm:w-16 hidden sm:block"
          color="#0A1628"
          opacity={0.08}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 relative">
            <Badge variant="golden" className="mb-4">Why this island?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">
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

      {/* ── Shoreline divider: light → dark ── */}
      <ShorelineDivider fill="var(--color-deep-navy, #1A1A2E)" />

      {/* ==================== SECTION 3: THE DEAL ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        {/* Subtle tropical grid texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        {/* Sketch wave accent */}
        <SketchWave
          className="absolute top-12 left-8 w-16 hidden sm:block"
          color="white"
          opacity={0.1}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="golden" className="mb-4">The Deal</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
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

      {/* ── Shoreline divider: dark → light ── */}
      <ShorelineDivider fill="var(--color-cream, #FFFCF5)" flip />

      {/* ==================== SECTION 4: WHO CAN APPLY ==================== */}
      <section className="relative py-16 sm:py-24" style={{ backgroundImage: palmLeafPattern, backgroundSize: '80px 80px' }}>
        {/* Longtail boat sketch — near bottom */}
        <SketchBoat
          className="absolute bottom-12 right-8 w-24 sm:w-32 hidden sm:block"
          color="#0A1628"
          opacity={0.08}
        />

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

      {/* ── Shoreline divider: light → dark ── */}
      <ShorelineDivider fill="var(--color-deep-navy, #1A1A2E)" />

      {/* ==================== SECTION 5: COUNTDOWN / URGENCY ==================== */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white overflow-hidden">
        {/* Subtle golden grid texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,190,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,190,11,.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        {/* Sketch wave accent */}
        <SketchWave
          className="absolute bottom-16 left-12 w-20 hidden sm:block"
          color="white"
          opacity={0.1}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10">
            <Badge variant="sunset" className="mb-4">Limited Availability</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
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

      {/* ── Shoreline divider: dark → light for CTA ── */}
      <ShorelineDivider fill="var(--color-cream, #FFFCF5)" flip />

      {/* ==================== SECTION 6: BOTTOM CTA ==================== */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-[#FF6B35] via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            {/* Pencil sketch palms in CTA card */}
            <SketchPalm
              className="absolute -bottom-4 -left-2 w-24 hidden sm:block"
              color="white"
              opacity={0.1}
            />
            <SketchPalm
              className="absolute -bottom-4 -right-2 w-20 hidden sm:block"
              style={{ transform: 'scaleX(-1)' }}
              color="white"
              opacity={0.08}
            />

            {/* Small sketch boat */}
            <SketchBoat
              className="absolute bottom-6 left-[30%] w-16 hidden sm:block"
              color="white"
              opacity={0.1}
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
