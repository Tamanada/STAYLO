import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Hotel, UtensilsCrossed, Compass, Plane, Globe, ArrowRight, Shield, Vote, Sparkles, BadgeCheck, Rocket, TrendingUp, PieChart, Users, Building2, Lock, DollarSign, Target, ChevronDown, ChevronUp, Search, Megaphone, Coins, FileText, FileCheck, CreditCard, MapPin, Scale, Wallet, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'

const phases = [
  {
    key: 'phase1', icon: Hotel, gradient: 'from-[#FF6B00] to-[#FF3CB4]', status: 'Alpha', timeline: 'Now',
    long: 'The foundation: book hotels, guesthouses, resorts and bungalows directly through STAYLO. 10% commission for life — versus 22% on Booking.com and Agoda. Hoteliers keep more revenue, guests pay fair prices, and Founding Partners own a piece of the platform itself.',
  },
  {
    key: 'phase_wallet', icon: Wallet, gradient: 'from-[#F7931A] to-[#E8840F]', status: 'M03', timeline: 'M03',
    long: 'A built-in Bitcoin Lightning wallet for every user. Load BTC, USDT, or pay by card. Use it to settle bookings, collect dividend payouts as a Founding Partner, or claim 2% lifetime referral commissions as an Ambassador. Self-custodied, fast, and global by default.',
  },
  {
    key: 'phase2', icon: UtensilsCrossed, gradient: 'from-[#FF3CB4] to-[#6C5CE7]', status: 'V2', timeline: 'M6–M12',
    long: 'Restaurant and dining bookings — a fair alternative to TheFork and OpenTable. Hoteliers can cross-promote on-site F&B. Restaurants pay a flat low fee per cover instead of percentages. Guests discover authentic local food, including independent venues priced out by today\'s platforms.',
  },
  {
    key: 'phase3', icon: Compass, gradient: 'from-[#6C5CE7] to-[#FF3CB4]', status: 'V3', timeline: 'M12–M18',
    long: 'Activities, tours, wellness, and nightlife. Whatever guests want to do on their trip — from a Full Moon Party ticket to a Muay Thai class — booked alongside their stay. Operators set their own prices, keep direct customer relationships, and pay a single low fee. No more 30% bites from GetYourGuide.',
  },
  {
    key: 'phase4', icon: Plane, gradient: 'from-[#FDCB6E] to-[#FF6B00]', status: 'V4', timeline: 'M18–M24',
    long: 'Flights and transfers to complete the travel journey. Search and book domestic and international routes side-by-side with hotels. Airport transfers, ferries, and inter-island taxis bookable from one trip view. The full stack of travel — owned by the people who run it.',
  },
  {
    key: 'phase5', icon: Globe, gradient: 'from-[#FF6B00] via-[#FF3CB4] to-[#6C5CE7]', status: 'V5', timeline: 'M24+',
    long: 'Every layer of travel stitched into one platform. Stay, Eat, Do, Fly — plus token-based governance where Founding Partners and $STAY holders vote on roadmap, treasury, and policy. A global cooperative for hospitality, operated by its own community.',
  },
]

const benefitIcons = {
  lowest_commission: Shield,
  revenue_share: Sparkles,
  governance: Vote,
  guest_relationships: Users,
  badge: BadgeCheck,
}

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

export default function Vision() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [sharesSold, setSharesSold] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)
  const [showProjection, setShowProjection] = useState(false)
  const [showShareStructure, setShowShareStructure] = useState(false)
  const [showTokenomics, setShowTokenomics] = useState(false)
  const [showGovernance, setShowGovernance] = useState(false)
  const [showInvestorRights, setShowInvestorRights] = useState(false)
  // Tracks which allocation row in the "Founders, discover how you will
  // invest in STAYLO" table is currently expanded. One row open at a time
  // keeps the page tidy on mobile. null = all collapsed.
  const [expandedAlloc, setExpandedAlloc] = useState(null)
  // Roadmap popup: which phase is the user inspecting (null = closed)
  const [openPhase, setOpenPhase] = useState(null)
  const totalAlphaShares = 3000
  const totalShares = 500000
  const sharePrice = 1000
  const pctSold = ((sharesSold / totalAlphaShares) * 100).toFixed(1)

  useEffect(() => {
    let cancelled = false
    async function fetchShares() {
      // Real source: platform_stats() RPC returns shares_sold (sum of
      // shares.quantity WHERE payment_confirmed=TRUE).
      // Fallback: count shares directly in case the RPC is missing on
      // the deployed DB.
      const { data, error } = await supabase.rpc('platform_stats')
      if (cancelled) return
      if (!error && data?.[0]?.shares_sold != null) {
        setSharesSold(Number(data[0].shares_sold))
        return
      }
      const { data: rows } = await supabase
        .from('shares')
        .select('quantity')
        .eq('payment_confirmed', true)
      if (cancelled) return
      if (Array.isArray(rows)) {
        const sum = rows.reduce((acc, r) => acc + Number(r.quantity || 0), 0)
        setSharesSold(sum)
      }
    }
    fetchShares()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative">
      <SEO
        title="Vision — A booking platform owned by hoteliers"
        description="Why STAYLO exists: 22% commissions are killing hotel margins. We're building a hotelier-owned cooperative where members vote, share revenue, and pay 10% for life. Roadmap, milestones, and ownership model."
        path="/vision"
      />
      {/* Hero — EnjoyLife.png as background (consistent with the rest
          of the artwork-backed brand surface across the site) */}
      <section className="text-white py-16 sm:py-24 relative overflow-hidden">
        <img
          src="/EnjoyLife.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/45" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="golden" className="mb-3">{t('vision.title')}</Badge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.95)' }}
          >
            {t('vision.hero_title')}
          </h1>
          <p
            className="text-lg sm:text-xl text-white max-w-2xl mx-auto mb-6 font-medium leading-relaxed"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.95)' }}
          >
            {t('vision.hero_subtitle')}
          </p>
          <Link to={user ? '/dashboard' : '/register'}>
            <button className="px-10 py-4 bg-white text-[#FF6B00] font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3 cursor-pointer animate-pulse-glow">
              <Sparkles size={22} />
              <span className="text-gradient">{user ? t('nav.dashboard', 'Go to Dashboard') : t('vision.invest_cta', 'Become a Founding Member')}</span>
              <ArrowRight size={20} className="text-[#FF3CB4]" />
            </button>
          </Link>
        </div>
      </section>

      {/* Company Structure — Option B (light brand cards, orange→pink→purple cycle) */}
      <section className="py-8 sm:py-12 bg-[#FFFDF8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-3">
            <p className="section-label mb-3">{t('vision.structure_label', 'Structure')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.structure_title', 'The Staylo Structure')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.structure_subtitle', 'A platform built, owned, and governed by the people who use it.')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-2 border-[#FF6B00]/20 hover:border-[#FF6B00]/50 transition-all card-hover">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,107,0,0.12)' }}>
                <Building2 size={28} style={{ color: '#FF6B00' }} />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_coop_title', 'Cooperative Model')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_coop_desc', 'Staylo is a collectively-owned platform. Hoteliers are not customers — they are shareholders and decision-makers.')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-[#FF3CB4]/20 hover:border-[#FF3CB4]/50 transition-all card-hover">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,60,180,0.12)' }}>
                <Vote size={28} style={{ color: '#FF3CB4' }} />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_vote_title', '1 Hotel = 1 Vote')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_vote_desc', 'Governance is democratic. Whether you hold 1 share or 10, your property gets one equal vote on all platform decisions.')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-[#6C5CE7]/20 hover:border-[#6C5CE7]/50 transition-all card-hover">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(108,92,231,0.12)' }}>
                <Lock size={28} style={{ color: '#6C5CE7' }} />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_transfer_title', 'Transferable Shares')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_transfer_desc', 'Shares are freely transferable. Voting rights stay with the active property registration, not the shares themselves.')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Bitcoin Strategy */}
      <section className="py-8 sm:py-12 bg-gradient-to-br from-[#F7931A]/5 via-white to-[#F7931A]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <Badge variant="golden" className="mb-3">{t('vision.btc_badge', 'Bitcoin-Native')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-3">{t('vision.btc_title', 'Bitcoin at the Core')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.btc_subtitle', 'Staylo is a Bitcoin-native cooperative platform. BTC as payment rail, treasury reserve, and investment currency.')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 border-2 border-[#F7931A]/20 hover:border-[#F7931A]/40 transition-all">
              <div className="w-14 h-14 bg-[#F7931A]/10 rounded-2xl flex items-center justify-center mb-4">
                <CreditCard size={28} className="text-[#F7931A]" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.btc_payment_title', 'BTC as Payment Rail')}</h3>
              <p className="text-sm text-gray-500">{t('vision.btc_payment_desc', 'Travelers pay by card, PayPal, bank transfer — or in Bitcoin via Lightning Network. Hoteliers receive THB, USD, EUR, or BTC. Their choice.')}</p>
            </Card>

            <Card className="p-6 border-2 border-[#F7931A]/20 hover:border-[#F7931A]/40 transition-all">
              <div className="w-14 h-14 bg-[#F7931A]/10 rounded-2xl flex items-center justify-center mb-4">
                <Lock size={28} className="text-[#F7931A]" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.btc_treasury_title', 'BTC as Treasury Reserve')}</h3>
              <p className="text-sm text-gray-500">{t('vision.btc_treasury_desc', '20% of ALL capital raised goes to a permanent Bitcoin reserve. Written into company statutes. 90% shareholder vote to change. At full scale: $149.7M in BTC. Never sold.')}</p>
            </Card>

            <Card className="p-6 border-2 border-[#F7931A]/20 hover:border-[#F7931A]/40 transition-all">
              <div className="w-14 h-14 bg-[#F7931A]/10 rounded-2xl flex items-center justify-center mb-4">
                <Coins size={28} className="text-[#F7931A]" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.btc_investment_title', 'BTC as Investment Currency')}</h3>
              <p className="text-sm text-gray-500">{t('vision.btc_investment_desc', 'Founding Partners buy shares WITH Bitcoin. $1,000 in BTC = 1 Alpha share. Annual dividends claimable in BTC.')}</p>
            </Card>
          </div>

          {/* Market stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { stat: '<1% → 15%', label: t('vision.btc_stat1', 'Hotel bookings paid in crypto by 2027') },
              { stat: '+30%', label: t('vision.btc_stat2', 'Higher booking value vs fiat') },
              { stat: '3x', label: t('vision.btc_stat3', 'Higher customer LTV') },
              { stat: '14%', label: t('vision.btc_stat4', 'Of all crypto transactions = travel') },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-white rounded-2xl border border-[#F7931A]/10 shadow-sm">
                <p className="text-2xl font-black text-[#F7931A]">{item.stat}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3 italic">{t('vision.btc_sources', 'Sources: CoinsPaid, Triple-A, Travala, PhocusWire')}</p>
        </div>
      </section>

      {/* Live Share Counter — emotional brand moment: elephants at sunset
          (the painting literally IS our brand palette: orange-pink-purple sky,
          rooted in Koh Phangan with palm silhouettes). */}
      <section className="py-8 text-white relative overflow-hidden">
        {/* Painting as full-bleed background */}
        <img
          src="/3Elephants.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark scrim — lighter than before so more of the painting reads
            through, but still enough to keep body copy legible. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/40" />
        {/* One subtle brand orb pulled in front of the scrim to add a
            soft glow without competing with the painting's own light */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] right-[8%] w-64 h-64 bg-[#FFAB40]/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-5">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">{t('vision.share_sale_title', 'Alpha Share Whitelisting')}</h2>
            <p className="text-white/70">{t('vision.share_sale_subtitle', 'Phase Alpha — Founding Partners only. Limited to 3,000 shares.')}</p>
          </div>

          {/* Big counter */}
          <div className="bg-white/8 backdrop-blur-md border border-[#FF6B00]/30 rounded-3xl p-8 sm:p-10 mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-6xl sm:text-7xl font-black text-gradient">{sharesSold}</span>
              <span className="text-2xl text-white/40 font-medium">/ {totalAlphaShares.toLocaleString()}</span>
            </div>
            <p className="text-center text-white/60 text-sm mb-3">{t('vision.shares_claimed', 'alpha shares claimed')}</p>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 relative"
                style={{ width: `${pctSold}%`, background: 'linear-gradient(90deg, #FF6B00, #FF3CB4, #6C5CE7)' }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>0</span>
              <span>{pctSold}% {t('vision.sold', 'sold')}</span>
              <span>{totalAlphaShares.toLocaleString()}</span>
            </div>

            {/* Urgency message */}
            <div className="rounded-2xl p-4 mt-4 mb-4 text-center" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.35)' }}>
              <p className="text-white font-bold text-lg mb-1">
                {t('vision.urgency_title', '600 hotels. 3,000 shares. Do the math.')}
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                {t('vision.urgency_line1', "That's ~5 shares per hotel.")}<br />
                {t('vision.urgency_line2', 'Max 10 per property at Alpha price.')}<br />
                {t('vision.urgency_line3', 'Not everyone will get theirs.')}
              </p>
              <p className="font-black text-xs uppercase tracking-wider mt-2" style={{ color: '#FF6B00' }}>
                {t('vision.urgency_cta', 'First come, first served. No exceptions.')}
              </p>
            </div>

            {/* Share pricing — Alpha vs World */}
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(253,203,110,0.12)', border: '1px solid rgba(253,203,110,0.35)' }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: '#FDCB6E' }}>{t('vision.tier_alpha', 'Alpha (Now)')}</p>
                <p className="text-4xl font-black" style={{ color: '#FDCB6E' }}>$1,000</p>
                <p className="text-xs text-white/50 mt-1">{t('vision.per_share', 'per share')}</p>
                <p className="text-xs mt-2" style={{ color: 'rgba(253,203,110,0.75)' }}>{t('vision.tier_alpha_note', 'For KP. Best price. Forever.')}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-60">
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">{t('vision.tier_world', 'World (Next)')}</p>
                <p className="text-4xl font-black text-white/60">$1,500</p>
                <p className="text-xs text-white/40 mt-1">{t('vision.tier_world_note', 'Opens after Alpha round closes')}</p>
              </div>
            </div>
          </div>

          {/* Key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/8 backdrop-blur-md rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black text-white">{totalShares.toLocaleString()}</p>
              <p className="text-xs text-white/50">{t('vision.total_shares', 'Total shares')}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-md rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black" style={{ color: '#FDCB6E' }}>$1,000</p>
              <p className="text-xs text-white/50">{t('vision.per_share_alpha', 'Per share (alpha)')}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-md rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black text-white">1–10</p>
              <p className="text-xs text-white/50">{t('vision.shares_per_property', '1 to 10 shares per property')}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-md rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black" style={{ color: '#FF6B00' }}>10%</p>
              <p className="text-xs text-white/50">{t('vision.commission_forever', 'Commission — forever')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fund Allocation — Founders, discover how you will invest in STAYLO
          ────────────────────────────────────────────────────────────────
          Each row in the allocation table expands inline to reveal a
          detail panel that explains the strategic reasoning for that
          slice of the raise. BTC carries 3 illustrative charts, the
          others carry icon-grid breakdowns.
          One row open at a time (setExpandedAlloc) keeps mobile clean. */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-3">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.fund_title', 'Founders, discover how you will invest in STAYLO')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.fund_subtitle', 'Every dollar invested in Staylo funds the platform that replaces your OTA dependency. Click any line to discover the strategy behind it.')}</p>
          </div>

          <Card className="p-6 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-deep text-center mb-5">{t('vision.capital_table_title', 'Use of Alpha Capital — $3M')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-deep">{t('vision.capital_col_item', 'Line Item')}</th>
                    <th className="text-right py-2 px-2 font-semibold text-deep">{t('vision.capital_col_amount', 'Amount')}</th>
                    <th className="text-right py-2 px-2 font-semibold text-deep">{t('vision.capital_col_pct', '%')}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {[
                    { id: 'btc',          label: t('vision.capital_btc', '₿ Bitcoin Reserve'),                        amount: '$600K', pct: '20%', color: '#F7931A' },
                    { id: 'acquisitions', label: t('vision.capital_acquisitions', 'Acquisitions — Flagship Hotels KP'),amount: '$750K', pct: '25%', color: '#FF6B00' },
                    { id: 'tech',         label: t('vision.capital_tech', 'Product & Tech'),                          amount: '$660K', pct: '22%', color: '#6C5CE7' },
                    { id: 'operations',   label: t('vision.capital_operations', 'Operations Runway'),                 amount: '$690K', pct: '23%', color: '#00B894' },
                    { id: 'marketing',    label: t('vision.capital_marketing', 'Marketing & Legal'),                  amount: '$300K', pct: '10%', color: '#636E72' },
                  ].map((row) => {
                    const isOpen = expandedAlloc === row.id
                    return (
                      <>
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 cursor-pointer hover:bg-orange/5 transition-colors"
                          onClick={() => setExpandedAlloc(isOpen ? null : row.id)}
                          aria-expanded={isOpen}
                        >
                          <td className="py-3 pr-4 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                              <span>{row.label}</span>
                              <ChevronDown size={16} className={`ml-auto sm:ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: row.color }} />
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 font-bold">{row.amount}</td>
                          <td className="text-right py-3 px-2 font-bold" style={{ color: row.color }}>{row.pct}</td>
                        </tr>
                        {isOpen && (
                          <tr key={row.id + '-detail'} className="border-b border-gray-100" style={{ backgroundColor: row.color + '08' }}>
                            <td colSpan={3} className="px-2 py-5 sm:px-4">
                              {row.id === 'btc'          && <BtcDetail t={t} />}
                              {row.id === 'acquisitions' && <AcquisitionsDetail t={t} />}
                              {row.id === 'tech'         && <TechDetail t={t} />}
                              {row.id === 'operations'   && <OperationsDetail t={t} />}
                              {row.id === 'marketing'    && <MarketingDetail t={t} />}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                  <tr className="border-t-2 border-gray-300 font-black text-deep">
                    <td className="py-3 pr-4">{t('vision.capital_col_total', 'TOTAL')}</td>
                    <td className="text-right py-3 px-2">$3,000K</td>
                    <td className="text-right py-3 px-2">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3 italic">{t('vision.capital_note', 'Acquisitions = signing 100 flagship hoteliers KP before M06. Commission = 10% revenue per booking (separate).')}</p>
          </Card>
        </div>
      </section>

      {/* Revenue Distribution */}
      <section className="py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-3">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.revenue_distribution_title', 'Where The Money Goes')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.revenue_distribution_subtitle', 'Full transparency. Every dollar accounted for.')}</p>
          </div>

          {/* Money flow — For every $100 booked (brand comparison panel) */}
          <div className="p-6 sm:p-10 mb-3 max-w-4xl mx-auto rounded-3xl overflow-hidden" style={{ background: '#FFFDF8', border: '1.5px solid #E8E0D8', boxShadow: '0 8px 32px rgba(255,107,0,0.08)' }}>
            <p className="text-center text-sm text-gray-500 mb-2 uppercase tracking-wider font-semibold">{t('vision.flow_label', 'For every')}</p>
            <p className="text-center text-5xl sm:text-6xl font-black mb-4 text-deep">$100 <span className="text-2xl font-normal text-gray-400">{t('vision.flow_booked', 'booked')}</span></p>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* OTA side — muted "loser" treatment */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <p className="font-bold text-gray-500">{t('vision.flow_ota_title', 'With Booking.com / Agoda')}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">{t('vision.flow_ota_commission', 'Commission')}</span>
                    <span className="text-2xl font-bold" style={{ color: '#dc2626' }}>−$22</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">{t('vision.flow_ota_where', 'Where does it go?')}</span>
                    <span className="text-sm text-gray-400">→ {t('vision.flow_ota_destination', 'Hedge funds & tax havens')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">{t('vision.flow_ota_back', 'What comes back to you?')}</span>
                    <span className="text-lg font-bold" style={{ color: '#dc2626' }}>$0</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">{t('vision.flow_you_keep', 'You keep')}</span>
                    <span className="text-2xl font-bold text-gray-500">$78</span>
                  </div>
                </div>
              </div>

              {/* Staylo side — brand-gradient WINNER */}
              <div
                className="rounded-2xl p-6 relative"
                style={{
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF6B00, #FF3CB4, #6C5CE7) border-box',
                  border: '2px solid transparent',
                  boxShadow: '0 8px 32px rgba(255,60,180,0.18)',
                }}
              >
                <div
                  className="absolute -top-3 right-4 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse-glow"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)' }}
                >
                  {t('vision.flow_recommended', 'BETTER DEAL')}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)' }} />
                  <p className="font-bold text-gradient">{t('vision.flow_staylo_title', 'With Staylo')}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">{t('vision.flow_staylo_commission', 'Commission')}</span>
                    <span className="text-2xl font-black" style={{ color: '#FF6B00' }}>−$10</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">{t('vision.flow_staylo_where', 'Where does it go?')}</span>
                    <span className="text-sm font-semibold" style={{ color: '#FF3CB4' }}>→ {t('vision.flow_staylo_community', 'Your community')}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">{t('vision.flow_you_keep', 'You keep')}</span>
                    <span className="text-2xl font-black text-gradient">$90</span>
                  </div>
                  <div className="text-center mt-3 rounded-lg py-2" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,60,180,0.1), rgba(108,92,231,0.1))' }}>
                    <span className="font-black text-lg" style={{ color: '#FF6B00' }}>+15.4% </span>
                    <span className="text-gray-600 text-sm">{t('vision.flow_more_revenue', 'more revenue vs OTAs')}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">{t('vision.flow_disclaimer', 'Based on average 22% OTA commission. Actual savings depend on your current platform and rates.')}</p>
          </div>

        </div>
      </section>

      {/* Detailed Projections — Option C deep brand-purple, premium/financial */}
      <section className="py-8 sm:py-12 text-white relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a0d2e 0%, #2a1148 60%, #1a0d2e 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[5%] w-96 h-96 bg-[#FF6B00]/12 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-[#FF3CB4]/12 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <Badge variant="golden" className="mb-4">{t('vision.projections_badge', 'Financial Projections')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3"><span className="text-gradient">{t('vision.projections_title', 'The Roadmap to $1B')}</span></h2>
            <p className="text-white/70 max-w-2xl mx-auto">{t('vision.projections_subtitle', 'Transparent data. Real numbers. Built for trust.')}</p>
          </div>

          {/* 36-Month Projections — icon orange */}
          <div className="mb-4">
            <button onClick={() => setShowProjection(!showProjection)} className="w-full flex items-center justify-between bg-white/8 backdrop-blur-md border border-[#FF6B00]/30 rounded-2xl p-5 hover:bg-white/12 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <TrendingUp style={{ color: '#FF6B00' }} size={24} />
                <span className="font-bold text-lg">{t('vision.proj_36m_title', '36-Month Financial Projections')}</span>
              </div>
              {showProjection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showProjection && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-golden border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-semibold">{t('vision.proj_col_metric', 'Metric')}</th>
                      <th className="text-right py-2 px-2">M06</th>
                      <th className="text-right py-2 px-2">M12</th>
                      <th className="text-right py-2 px-2">M18</th>
                      <th className="text-right py-2 px-2">M24</th>
                      <th className="text-right py-2 px-2">M30</th>
                      <th className="text-right py-2 px-2">M36</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_partner_hotels', 'Partner Hotels')}</td><td className="text-right px-2">100</td><td className="text-right px-2">380</td><td className="text-right px-2">1,200</td><td className="text-right px-2">4,800</td><td className="text-right px-2">9,200</td><td className="text-right px-2 text-golden font-bold">16,649</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_gmv_month', 'GMV / Month')}</td><td className="text-right px-2">$0.3M</td><td className="text-right px-2">$2.1M</td><td className="text-right px-2">$8.4M</td><td className="text-right px-2">$33.6M</td><td className="text-right px-2">$64.4M</td><td className="text-right px-2 text-golden font-bold">$88M</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_revenue_month', 'Revenue / Month')}</td><td className="text-right px-2">$0.03M</td><td className="text-right px-2">$0.21M</td><td className="text-right px-2">$0.84M</td><td className="text-right px-2">$3.36M</td><td className="text-right px-2">$6.44M</td><td className="text-right px-2 text-golden font-bold">$8.8M</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_gmv_annual', 'GMV Annual')}</td><td className="text-right px-2">$0.9M</td><td className="text-right px-2">$13.8M</td><td className="text-right px-2">$60.6M</td><td className="text-right px-2">$268.8M</td><td className="text-right px-2">$619.2M</td><td className="text-right px-2 text-golden font-bold">$1,055M</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_revenue_annual', 'Revenue Annual')}</td><td className="text-right px-2">$0.09M</td><td className="text-right px-2">$1.4M</td><td className="text-right px-2">$6.1M</td><td className="text-right px-2">$26.9M</td><td className="text-right px-2">$61.9M</td><td className="text-right px-2 text-golden font-bold">$105.5M</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.proj_valuation', 'Valuation (10x Rev)')}</td><td className="text-right px-2">—</td><td className="text-right px-2">$13.8M</td><td className="text-right px-2">$60.6M</td><td className="text-right px-2">$268.8M</td><td className="text-right px-2">$619.2M</td><td className="text-right px-2 text-golden font-bold">$1,055M</td></tr>
                    <tr className="border-b border-white/5 bg-golden/10"><td className="py-2 pr-4 font-bold text-golden">{t('vision.proj_alpha_value', 'Alpha Share Value')}</td><td className="text-right px-2 font-bold">$1,000</td><td className="text-right px-2 font-bold">~$4,600</td><td className="text-right px-2 font-bold">~$20K</td><td className="text-right px-2 font-bold">~$89.6K</td><td className="text-right px-2 font-bold">~$206K</td><td className="text-right px-2 font-bold text-golden">~$351K</td></tr>
                    <tr className="bg-libre/10"><td className="py-2 pr-4 font-bold text-libre">{t('vision.proj_alpha_roi', 'Alpha ROI')}</td><td className="text-right px-2 font-bold">1x</td><td className="text-right px-2 font-bold">~5x</td><td className="text-right px-2 font-bold">~20x</td><td className="text-right px-2 font-bold">~90x</td><td className="text-right px-2 font-bold">~206x</td><td className="text-right px-2 font-bold text-libre">~351x</td></tr>
                  </tbody>
                </table>
                <p className="text-xs text-white/30 mt-4 text-center italic">{t('vision.proj_disclaimer', 'Base case projections. Not guaranteed. Revenue = GMV x 10% commission.')}</p>
              </div>
            )}
          </div>

          {/* Share Structure — icon pink */}
          <div className="mb-4">
            <button onClick={() => setShowShareStructure(!showShareStructure)} className="w-full flex items-center justify-between bg-white/8 backdrop-blur-md border border-[#FF3CB4]/30 rounded-2xl p-5 hover:bg-white/12 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <PieChart style={{ color: '#FF3CB4' }} size={24} />
                <span className="font-bold text-lg">{t('vision.share_structure_title', 'Share Structure — 500,000 Shares · 4 Categories')}</span>
              </div>
              {showShareStructure ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showShareStructure && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-golden border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-semibold">{t('vision.shs_col_category', 'Category')}</th>
                      <th className="text-right py-2 px-2">{t('vision.shs_col_shares', 'Shares')}</th>
                      <th className="text-right py-2 px-2">%</th>
                      <th className="text-right py-2 px-2">{t('vision.shs_col_price', 'Price')}</th>
                      <th className="text-left py-2 px-2">{t('vision.shs_col_conditions', 'Conditions')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.shs_founders', 'Founders (seed cohort)')}</td><td className="text-right px-2">50,000</td><td className="text-right px-2">10%</td><td className="text-right px-2 italic">{t('vision.shs_sweat_equity', 'Sweat equity')}</td><td className="px-2 text-xs">{t('vision.shs_founders_cond', '12m cliff + 36m vesting')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.shs_private', 'Private Investors (non-hotelier)')}</td><td className="text-right px-2">100,000</td><td className="text-right px-2">20%</td><td className="text-right px-2">$1,500</td><td className="px-2 text-xs">{t('vision.shs_private_cond', 'Vote · Dividends · BTC treasury benefit')}</td></tr>
                    <tr className="border-b border-white/5 bg-golden/10"><td className="py-2 pr-4 font-bold text-golden">{t('vision.shs_alpha', 'Alpha — Koh Phangan')}</td><td className="text-right px-2">3,000</td><td className="text-right px-2">0.6%</td><td className="text-right px-2 font-bold text-golden">$1,000</td><td className="px-2 text-xs">{t('vision.shs_alpha_cond', 'KP hoteliers only — limited')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.shs_world', 'World Round — Global Hotels')}</td><td className="text-right px-2">347,000</td><td className="text-right px-2">69.4%</td><td className="text-right px-2">$1,500</td><td className="px-2 text-xs">{t('vision.shs_world_cond', 'Hotel owners worldwide — open')}</td></tr>
                    <tr className="bg-white/5 font-bold"><td className="py-2 pr-4">{t('vision.shs_total', 'TOTAL')}</td><td className="text-right px-2">500,000</td><td className="text-right px-2 text-golden">100%</td><td className="text-right px-2">—</td><td className="px-2 text-xs italic">{t('vision.shs_total_note', '~$748.5M raised at FDV · ~$149.7M to BTC treasury')}</td></tr>
                  </tbody>
                </table>
                <p className="text-xs text-white/30 mt-4 text-center italic">{t('vision.shs_footer', 'Alpha partners get the best price — forever. 20% of ALL capital raised goes to permanent Bitcoin reserve (90% shareholder vote to change). Source: STAYLO IP Protection Document (originstamp.org, 2026-04-25).')}</p>
              </div>
            )}
          </div>

          {/* $STAY Tokenomics — icon purple */}
          <div className="mb-4">
            <button onClick={() => setShowTokenomics(!showTokenomics)} className="w-full flex items-center justify-between bg-white/8 backdrop-blur-md border border-[#6C5CE7]/30 rounded-2xl p-5 hover:bg-white/12 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <DollarSign style={{ color: '#6C5CE7' }} size={24} />
                <span className="font-bold text-lg">{t('vision.tokenomics_title', '$STAY Token — 10B Supply · Solana · Bitcoin halving')}</span>
              </div>
              {showTokenomics ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showTokenomics && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 overflow-x-auto">
                {/* Tokenomics core params */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/5 rounded-lg p-3"><p className="text-white/40 uppercase tracking-wider">{t('vision.tok_supply', 'Total supply')}</p><p className="text-white font-bold mt-1">10,000,000,000</p><p className="text-white/40">{t('vision.tok_supply_note', 'Fixed forever')}</p></div>
                  <div className="bg-white/5 rounded-lg p-3"><p className="text-white/40 uppercase tracking-wider">{t('vision.tok_tge_price', 'TGE price')}</p><p className="text-white font-bold mt-1">$0.10</p><p className="text-white/40">$1B FDV</p></div>
                  <div className="bg-white/5 rounded-lg p-3"><p className="text-white/40 uppercase tracking-wider">{t('vision.tok_chain', 'Blockchain')}</p><p className="text-white font-bold mt-1">Solana</p><p className="text-white/40">Raydium DEX</p></div>
                  <div className="bg-white/5 rounded-lg p-3"><p className="text-white/40 uppercase tracking-wider">{t('vision.tok_halving', 'Halving')}</p><p className="text-white font-bold mt-1">{t('vision.tok_halving_value', 'Every 4 years')}</p><p className="text-white/40">{t('vision.tok_halving_note', 'Bitcoin-style')}</p></div>
                </div>

                {/* Earn rate over time */}
                <div className="bg-white/5 rounded-lg p-3 text-xs">
                  <p className="text-white/40 uppercase tracking-wider mb-2">{t('vision.tok_earn_label', 'Earn rate (per night hosted)')}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-libre font-bold">{t('vision.tok_earn_y0', 'Y0–Y4 : 10 $STAY/night')}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/70">{t('vision.tok_earn_y4', 'Y4–Y8 : 5 $STAY')}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/50">{t('vision.tok_earn_y8', 'Y8–Y12 : 2.5 $STAY')}</span>
                    <span className="text-white/30 italic">{t('vision.tok_earn_forever', '…halving forever')}</span>
                  </div>
                </div>

                {/* Allocation */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-golden border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-semibold">{t('vision.tok_col_allocation', 'Allocation')}</th>
                      <th className="text-right py-2 px-2">{t('vision.tok_col_tokens', 'Tokens')}</th>
                      <th className="text-right py-2 px-2">%</th>
                      <th className="text-left py-2 px-2">{t('vision.tok_col_purpose', 'Purpose')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_fp_pool', 'Founding Partner Earn Pool')}</td><td className="text-right px-2">3,000,000,000</td><td className="text-right px-2 font-bold text-golden">30%</td><td className="px-2 text-xs">{t('vision.tok_fp_pool_desc', 'Earn rewards for Alpha FP hotels')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_platform_pool', 'Platform Earn Pool')}</td><td className="text-right px-2">2,000,000,000</td><td className="text-right px-2">20%</td><td className="px-2 text-xs">{t('vision.tok_platform_pool_desc', 'Per-night $STAY (hotels + travelers)')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_reserve', 'Reserve')}</td><td className="text-right px-2">2,000,000,000</td><td className="text-right px-2">20%</td><td className="px-2 text-xs">{t('vision.tok_reserve_desc', 'Strategic reserve, future programs')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_ambassador', 'Ambassador Program')}</td><td className="text-right px-2">1,500,000,000</td><td className="text-right px-2">15%</td><td className="px-2 text-xs">{t('vision.tok_ambassador_desc', 'Referral rewards + signing bonuses')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_team', 'Team & Founders')}</td><td className="text-right px-2">1,000,000,000</td><td className="text-right px-2">10%</td><td className="px-2 text-xs">{t('vision.tok_team_desc', '4-year vesting, 1-year cliff')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.tok_dex', 'DEX Liquidity')}</td><td className="text-right px-2">500,000,000</td><td className="text-right px-2">5%</td><td className="px-2 text-xs">{t('vision.tok_dex_desc', 'Raydium launch liquidity pool')}</td></tr>
                    <tr className="bg-white/5 font-bold"><td className="py-2 pr-4">{t('vision.tok_total', 'TOTAL')}</td><td className="text-right px-2">10,000,000,000</td><td className="text-right px-2 text-golden">100%</td><td className="px-2 text-xs italic">{t('vision.tok_total_note', 'Fixed FOREVER · 10–15% annual buy & burn from commission revenue')}</td></tr>
                  </tbody>
                </table>

                <p className="text-xs text-white/30 text-center italic">{t('vision.tok_tge_note', 'TGE target: Month 07 post-Alpha funding. Emergency mint requires 90% governance vote, capped at 1%/year.')}</p>
              </div>
            )}
          </div>

          {/* Governance — icon gold */}
          <div className="mb-4">
            <button onClick={() => setShowGovernance(!showGovernance)} className="w-full flex items-center justify-between bg-white/8 backdrop-blur-md border border-[#FDCB6E]/30 rounded-2xl p-5 hover:bg-white/12 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <Scale style={{ color: '#FDCB6E' }} size={24} />
                <span className="font-bold text-lg">{t('vision.governance_detail_title', 'Governance — On-Chain DAO · 1 Hotel = 1 Vote')}</span>
              </div>
              {showGovernance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showGovernance && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-golden border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-semibold">{t('vision.gov_col_rule', 'Rule')}</th>
                      <th className="text-left py-2 px-2">{t('vision.gov_col_value', 'Value')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_structure', 'Structure')}</td><td className="px-2">{t('vision.gov_structure_val', 'Two layers: Singapore Pte Ltd (off-chain) + Solana DAO (on-chain, Realms)')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium text-libre">{t('vision.gov_layer1_label', '— Layer 1 —')}</td><td className="px-2 text-libre/80 text-xs italic">{t('vision.gov_layer1_val', 'Singapore Corporate Vote (off-chain)')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_voters', 'Voters')}</td><td className="px-2">{t('vision.gov_voters_val', 'Founders + Private Investors + Founding Partners (1 share = 1 vote)')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_decides', 'Decides')}</td><td className="px-2">{t('vision.gov_decides_l1_val', 'Dividends · Share dilution · M&A · Treasury allocation · Audit · Board appointments')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium text-electric">{t('vision.gov_layer2_label', '— Layer 2 —')}</td><td className="px-2 text-electric/80 text-xs italic">{t('vision.gov_layer2_val', 'Solana DAO (on-chain) — TWO seat types')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_hotel_seats', '🏨 Hotel Seats')}</td><td className="px-2" dangerouslySetInnerHTML={{ __html: t('vision.gov_hotel_seats_val', '<strong>1 active property = 1 vote</strong> · unbounded · ≥1,000 $STAY required') }} /></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_founder_seats', '⭐ Founder Seats')}</td><td className="px-2" dangerouslySetInnerHTML={{ __html: t('vision.gov_founder_seats_val', '<strong>1 founder = 1 vote · cap 10 absolute</strong> · ≥1,000 $STAY + seed cohort + active attestation') }} /></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_sunset', 'Sunset clause')}</td><td className="px-2">{t('vision.gov_sunset_val', 'At M36, if >10K active Hotel Seats, Founder Seats can be abolished by 51% Hotel-Seat vote alone')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 pl-4 text-xs">{t('vision.gov_decides', 'Decides')}</td><td className="px-2">{t('vision.gov_decides_l2_val', 'Features · Roadmap · OTA partnerships · Marketing · Channel Manager · $STAY emissions · Commission rate (within 10% lock)')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_quorum', 'Quorum (DAO)')}</td><td className="px-2">{t('vision.gov_quorum_val', '30% of total eligible seats')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_majority', 'Simple majority')}</td><td className="px-2">{t('vision.gov_majority_val', '51% — features, partnerships, marketing')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_supermaj', 'Supermajority')}</td><td className="px-2 text-golden font-bold">{t('vision.gov_supermaj_val', '90% · required for commission rate, BTC mandate, token supply changes')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_comm_lock', 'Commission lock')}</td><td className="px-2 text-golden font-bold">{t('vision.gov_comm_lock_val', '10% per FP contract · only 90% supermajority can change')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_btc_lock', 'BTC treasury lock')}</td><td className="px-2 text-[#F7931A] font-bold">{t('vision.gov_btc_lock_val', '20% mandate in statutes · only 90% supermajority can change')}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-4 font-medium">{t('vision.gov_dividends', 'Dividends')}</td><td className="px-2">{t('vision.gov_dividends_val', '20% net profit/year, distributed proportionally to all shareholders')}</td></tr>
                    <tr><td className="py-2 pr-4 font-medium">{t('vision.gov_div_currency', 'Dividend currency')}</td><td className="px-2">{t('vision.gov_div_currency_val', "USD, THB, or Bitcoin (shareholder's choice)")}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Private Investors Rights — icon teal (semantic positive: protection) */}
          <div className="mb-4">
            <button onClick={() => setShowInvestorRights(!showInvestorRights)} className="w-full flex items-center justify-between bg-white/8 backdrop-blur-md border border-[#00B894]/30 rounded-2xl p-5 hover:bg-white/12 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <Shield style={{ color: '#00B894' }} size={24} />
                <span className="font-bold text-lg">{t('vision.investor_rights_title', 'Private Investors Rights — Engaged but not Controlling')}</span>
              </div>
              {showInvestorRights ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {showInvestorRights && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <p className="text-sm text-white/70 italic mb-4">
                  {t('vision.pi_intro', 'Private Investors put up cash without operating hotels. They get voice + protection on their financial stake, but cannot take control of day-to-day operations (which would defeat the cooperative purpose). The 5 mechanisms below are formalized in the Shareholders Agreement (Drew & Napier counsel, post-Singapore incorporation).')}
                </p>

                <div className="space-y-3">
                  {/* Mechanism 1 */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="font-bold text-libre text-sm mb-1">{t('vision.pi_m1_title', '1. Information rights — full transparency, zero power')}</p>
                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                      <li>{t('vision.pi_m1_li1', 'Quarterly written report (bookings, revenue, BTC treasury, $STAY metrics, roadmap, risks)')}</li>
                      <li>{t('vision.pi_m1_li2', 'Mandatory Annual General Meeting (AGM) — physical or virtual')}</li>
                      <li>{t('vision.pi_m1_li3', 'Quarterly investor call with the founder/CEO')}</li>
                      <li>{t('vision.pi_m1_li4', 'Private Telegram/Discord "Investor Circle" — direct line to David')}</li>
                    </ul>
                  </div>

                  {/* Mechanism 2 */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="font-bold text-libre text-sm mb-1">{t('vision.pi_m2_title', '2. Advisory Board — consultative seats, no decision power')}</p>
                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                      <li dangerouslySetInnerHTML={{ __html: t('vision.pi_m2_li1', 'Private Investors elect <strong>2 members</strong> of an Advisory Board') }} />
                      <li dangerouslySetInnerHTML={{ __html: t('vision.pi_m2_li2', 'The Advisory Board <em>advises</em> the Executive Board (Founders + Founding Partners) but does not vote on operations') }} />
                      <li>{t('vision.pi_m2_li3', 'May issue public recommendations on any topic')}</li>
                    </ul>
                  </div>

                  {/* Mechanism 3 */}
                  <div className="bg-white/5 rounded-xl p-4 border border-golden/20">
                    <p className="font-bold text-golden text-sm mb-1">{t('vision.pi_m3_title', '3. Veto rights — minority defensive only (51% of PI class)')}</p>
                    <p className="text-xs text-white/70 mb-2">{t('vision.pi_m3_intro', 'Can BLOCK (not initiate) any of:')}</p>
                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                      <li>{t('vision.pi_m3_li1', 'Share dilution >10% of existing capital')}</li>
                      <li>{t('vision.pi_m3_li2', 'Sale of the company (M&A)')}</li>
                      <li>{t('vision.pi_m3_li3', 'Any change to the 10% commission rate')}</li>
                      <li>{t('vision.pi_m3_li4', 'Removal of the 20% BTC treasury mandate')}</li>
                      <li>{t('vision.pi_m3_li5', 'Liquidation preference modification')}</li>
                    </ul>
                    <p className="text-[10px] text-white/40 italic mt-2">{t('vision.pi_m3_note', 'Standard VC blocking minority. They can say "no" to 5 critical things, cannot force anything.')}</p>
                  </div>

                  {/* Mechanism 4 */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="font-bold text-libre text-sm mb-1">{t('vision.pi_m4_title', '4. Pre-emptive rights — anti-dilution protection')}</p>
                    <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                      <li dangerouslySetInnerHTML={{ __html: t('vision.pi_m4_li1', 'On every new share issuance: <strong>30 days</strong> to exercise pro-rata right') }} />
                      <li>{t('vision.pi_m4_li2', 'If they invest again → maintain their 20% stake')}</li>
                      <li>{t('vision.pi_m4_li3', 'If they decline → accept the dilution')}</li>
                    </ul>
                  </div>

                  {/* Mechanism 5 */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="font-bold text-libre text-sm mb-1">{t('vision.pi_m5_title', '5. Voting on financial-only matters (1 share = 1 vote, Layer 1)')}</p>
                    <p className="text-xs text-white/70 mb-2">{t('vision.pi_m5_intro', 'At the corporate (Singapore Pte Ltd) layer only — never in the Solana DAO.')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-libre/80 font-semibold">{t('vision.pi_m5_yes_label', '✅ Votes on:')}</p>
                        <ul className="text-white/60 list-disc list-inside">
                          <li>{t('vision.pi_m5_yes1', 'Annual dividend distribution')}</li>
                          <li>{t('vision.pi_m5_yes2', 'New share emissions')}</li>
                          <li>{t('vision.pi_m5_yes3', 'M&A, acquisitions')}</li>
                          <li>{t('vision.pi_m5_yes4', 'Annual financial audit')}</li>
                          <li>{t('vision.pi_m5_yes5', 'CFO / auditor appointment')}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sunset/80 font-semibold">{t('vision.pi_m5_no_label', '❌ Does NOT vote on:')}</p>
                        <ul className="text-white/60 list-disc list-inside">
                          <li>{t('vision.pi_m5_no1', 'Product features')}</li>
                          <li>{t('vision.pi_m5_no2', 'Marketing campaigns')}</li>
                          <li>{t('vision.pi_m5_no3', 'OTA partnerships')}</li>
                          <li>{t('vision.pi_m5_no4', 'Channel Manager priorities')}</li>
                          <li>{t('vision.pi_m5_no5', 'Day-to-day operations')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/30 text-center italic mt-4">
                  {t('vision.pi_footer', 'Standard structure for cooperative platforms with mixed shareholder classes. Drafted by Drew & Napier (Singapore counsel) post-incorporation.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ambassador Program */}
      <section className="py-8 bg-gradient-to-br from-electric/5 via-white to-sunset/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-3">
            <Badge variant="golden" className="mb-4">{t('vision.marketing_badge', 'Passive Income Program')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.marketing_title', 'Become an Ambassador')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.marketing_subtitle', "Build the world's largest accommodation network — and earn 2% passive income for life on every hotel you bring to Staylo. No limits. No expiry. Forever.")}</p>
            <div className="mt-3">
              <Link to="/ambassador/register">
                <Button size="lg" className="bg-gradient-to-r from-sunset to-sunrise text-white font-bold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  {t('vision.ambassador_cta', 'Become an Ambassador')} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* How it works — 3 steps */}
          <div className="grid sm:grid-cols-3 gap-6 mb-3">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-electric to-ocean rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Search className="w-9 h-9 text-white" />
              </div>
              <h3 className="font-bold text-deep mb-2">{t('vision.ambassador_step1_title', 'Stay & Discover')}</h3>
              <p className="text-sm text-gray-500">{t('vision.ambassador_step1_desc', 'You visit a hotel on Staylo and discover a platform that truly respects its partners.')}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Megaphone className="w-9 h-9 text-white" />
              </div>
              <h3 className="font-bold text-deep mb-2">{t('vision.ambassador_step2_title', 'Spread the Word')}</h3>
              <p className="text-sm text-gray-500">{t('vision.ambassador_step2_desc', 'You tell other hotel owners about Staylo. If they join, you become their Ambassador.')}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-libre to-libre/70 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Coins className="w-9 h-9 text-white" />
              </div>
              <h3 className="font-bold text-deep mb-2">{t('vision.ambassador_step3_title', 'Earn for Life')}</h3>
              <p className="text-sm text-gray-500">{t('vision.ambassador_step3_desc', 'You receive 2% of all online sales from every hotel you brought to Staylo. Forever.')}</p>
            </div>
          </div>

          {/* The deal — big card */}
          <Card className="p-8 sm:p-10 max-w-3xl mx-auto border-2 border-electric/20 bg-gradient-to-br from-white to-electric/5">
            <div className="text-center mb-3">
              <p className="text-6xl sm:text-7xl font-black text-gradient mb-2">2%</p>
              <p className="text-xl font-bold text-deep">{t('vision.ambassador_lifetime', 'Lifetime Passive Income')}</p>
              <p className="text-gray-500 text-sm mt-1">{t('vision.ambassador_lifetime_desc', 'On every booking, every service, every sale from the hotels you brought to Staylo.')}</p>
            </div>

            {/* Contract triangle */}
            <div className="bg-deep/5 rounded-2xl p-6 mb-3">
              <h4 className="font-bold text-deep text-center mb-4">{t('vision.tripartite_title', 'The Tripartite Contract')}</h4>
              <div className="flex items-center justify-center gap-4 sm:gap-4 flex-wrap">
                <div className="text-center">
                  <div className="w-14 h-14 bg-ocean/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Globe size={24} className="text-ocean" />
                  </div>
                  <p className="text-xs font-semibold text-deep">STAYLO</p>
                  <p className="text-[10px] text-gray-400">{t('vision.tripartite_platform', 'Platform')}</p>
                </div>
                <div className="text-gray-300 text-2xl">⟷</div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Hotel size={24} className="text-libre" />
                  </div>
                  <p className="text-xs font-semibold text-deep">{t('vision.tripartite_hotel', 'HOTEL')}</p>
                  <p className="text-[10px] text-gray-400">{t('vision.tripartite_partner', 'Partner')}</p>
                </div>
                <div className="text-gray-300 text-2xl">⟷</div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-sunset/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users size={24} className="text-sunset" />
                  </div>
                  <p className="text-xs font-semibold text-deep">{t('vision.tripartite_ambassador', 'AMBASSADOR')}</p>
                  <p className="text-[10px] text-gray-400">{t('vision.tripartite_bringer', 'Business Bringer')}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">{t('vision.tripartite_desc', "A binding agreement between all three parties. The Ambassador's 2% is guaranteed as long as the hotel stays on Staylo.")}</p>
            </div>

            {/* Example calculation */}
            <div className="bg-libre/5 border border-libre/20 rounded-2xl p-5">
              <h4 className="font-semibold text-deep text-sm mb-3 text-center">{t('vision.example_title', 'Example: You bring a 20-room hotel')}</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400">{t('vision.example_revenue', 'Hotel annual revenue')}</p>
                  <p className="text-lg font-bold text-deep">$438,000</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('vision.example_share', 'Your 2% share')}</p>
                  <p className="text-lg font-bold text-libre">$8,760</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('vision.example_lifetime', 'Per year, for life')}</p>
                  <p className="text-lg font-bold text-golden">♾️ {t('vision.example_passive', 'Passive')}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-3">{t('vision.example_disclaimer', 'Based on 20 rooms × $60/night × 365 days × 100% online booking rate. Actual results vary.')}</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Roadmap — horizontal timeline with click-to-expand popup
          Background: UnVoyage.png (dreamy night-voyage painting) — the
          journey metaphor pairs naturally with a phased roadmap. White
          phase cards float as jewels above the dark artwork. */}
      <section className="py-12 sm:py-16 relative overflow-hidden">
        <img
          src="/UnVoyage.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Light scrim — the painting is already dark, so we just nudge
            the contrast a touch to ensure the title and subtitle read */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/40" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl font-bold text-white text-center mb-3"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.95)' }}
          >
            {t('vision.roadmap_title', 'Roadmap')}
          </h2>
          <p
            className="text-center text-white mb-10 max-w-2xl mx-auto text-sm sm:text-base font-medium"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.8)' }}
          >
            {t('vision.roadmap_subtitle', 'Click any step to see what we ship and when.')}
          </p>

          <div className="relative">
            {/* Connecting line behind the cards — brand-gradient bar, desktop only */}
            <div
              className="hidden md:block absolute top-9 left-[8%] right-[8%] h-1 rounded-full opacity-40 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, #FF6B00, #F7931A, #FF3CB4, #6C5CE7, #FDCB6E, #FF3CB4)' }}
            />

            {/* Horizontal scroll on mobile, even grid on desktop */}
            <div className="flex md:grid md:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
              {phases.map((phase, i) => (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => setOpenPhase(phase)}
                  className={`relative flex-shrink-0 w-[180px] md:w-auto snap-start text-center bg-white/[0.66] backdrop-blur-md rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer ${
                    i === 0
                      ? 'border-libre/50 shadow-lg shadow-libre/15 hover:shadow-xl hover:bg-white/80 hover:-translate-y-1'
                      : 'border-white/50 hover:border-white/70 hover:bg-white/80 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {/* Icon tile sits ON the connecting line at the top */}
                  <div className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-gradient-to-br ${phase.gradient} rounded-2xl flex items-center justify-center shadow-md mb-3`}>
                    <phase.icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-deep mb-1.5 line-clamp-1">
                    {t(`vision.${phase.key}`)}
                  </h3>
                  <div className="flex items-center justify-center mb-1.5">
                    <Badge variant={i === 0 ? 'green' : 'gray'} className="text-[10px]">
                      {phase.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">{phase.timeline}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Popup modal — opens when a phase card is clicked */}
        {openPhase && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpenPhase(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="phase-modal-title"
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpenPhase(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className={`w-16 h-16 bg-gradient-to-br ${openPhase.gradient} rounded-2xl flex items-center justify-center shadow-lg mb-4`}>
                <openPhase.icon size={32} className="text-white" />
              </div>

              <h3 id="phase-modal-title" className="text-2xl sm:text-3xl font-bold text-deep mb-2">
                {t(`vision.${openPhase.key}`)}
              </h3>

              <div className="flex items-center gap-2 mb-5">
                <Badge variant={openPhase.timeline === 'Now' ? 'green' : 'gray'} className="text-xs">
                  {openPhase.status}
                </Badge>
                <span className="text-sm text-gray-500 font-medium">{openPhase.timeline}</span>
              </div>

              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 font-medium">
                {t(`vision.${openPhase.key}_desc`)}
              </p>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {t(`vision.${openPhase.key}_long`, openPhase.long)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Founding benefits — brand palette cycle */}
      <section className="py-10 sm:py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-deep text-center mb-8">
            {t('vision.founding_title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {(() => {
              const palette = ['#FF6B00', '#FF3CB4', '#6C5CE7', '#FDCB6E', '#00B894']
              return Object.entries(benefitIcons).map(([key, Icon], i) => {
                const color = palette[i % palette.length]
                return (
                  <Card key={key} className="p-6 flex items-center gap-4 card-hover" style={{ borderColor: color + '33' }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '1A' }}>
                      <Icon size={26} style={{ color }} />
                    </div>
                    <p className="text-base sm:text-lg text-gray-700 leading-relaxed font-medium">{t(`vision.founding_benefits.${key}`)}</p>
                  </Card>
                )
              })
            })()}
          </div>
        </div>
      </section>

      {/* Required Documents — Bob.png as background (brand-aligned artwork) */}
      <section className="py-8 text-white relative overflow-hidden">
        {/* Bob.png as full-bleed background */}
        <img
          src="/Bob.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark scrim — lighter pass so the artwork breathes more,
            still dark enough to keep the doc cards readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/40" />
        {/* Subtle warm glow top-right */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-[8%] w-64 h-64 bg-[#FFAB40]/12 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-3">
            <Badge variant="golden" className="mb-4 text-sm sm:text-base">{t('vision.docs_badge', 'Registration Process')}</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4"><span className="text-gradient">{t('vision.docs_title', 'What You Need to Join')}</span></h2>
            <p className="text-white/85 text-base sm:text-lg max-w-2xl mx-auto">{t('vision.docs_subtitle', 'To become an official Staylo Founding Partner, your business must be legally registered. Here\'s what we require:')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {(() => {
              const palette = ['#FF6B00', '#FF3CB4', '#6C5CE7', '#FDCB6E', '#FF6B00', '#FF3CB4']
              const docs = [
                { icon: FileText, title: t('vision.doc_license', 'Business License'), desc: t('vision.doc_license_desc', 'TAT license (Thailand) or equivalent local business registration'), required: true },
                { icon: Building2, title: t('vision.doc_registration', 'Company Registration'), desc: t('vision.doc_registration_desc', 'DBD registration certificate or equivalent (e.g. Ltd., Co., sole proprietor)'), required: true },
                { icon: MapPin, title: t('vision.doc_property', 'Property Proof'), desc: t('vision.doc_property_desc', 'Ownership deed, lease agreement, or management contract for the property'), required: true },
                { icon: CreditCard, title: t('vision.doc_tax', 'Tax ID'), desc: t('vision.doc_tax_desc', 'Valid tax identification number for the business entity'), required: true },
                { icon: FileCheck, title: t('vision.doc_loi', 'Letter of Intent'), desc: t('vision.doc_loi_desc', 'Signed LOI (provided by Staylo) — bilingual TH/EN, non-binding'), required: true },
                { icon: Scale, title: t('vision.doc_contract', 'Founding Partner Contract'), desc: t('vision.doc_contract_desc', 'Official partnership agreement — signed upon share purchase'), required: false },
              ]
              return docs.map((doc, i) => {
                const color = palette[i % palette.length]
                return (
                  <div key={i} className="bg-white/8 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex gap-4 hover:bg-white/12 transition-all" style={{ borderColor: color + '33' }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                      <doc.icon size={26} style={{ color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white text-base sm:text-lg">{doc.title}</h4>
                        {doc.required && (
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.4)' }}
                          >
                            {t('vision.doc_required', 'Required')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/75 mt-1.5 leading-relaxed">{doc.desc}</p>
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          <p className="text-center text-sm text-white/65 mt-6">{t('vision.docs_note', 'The official partnership process will start when all 3,000 alpha shares are booked. Reserve your shares now — submit documents later.')}</p>
        </div>
      </section>

      {/* FAQ — Accordion */}
      <section className="py-8 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep text-center mb-5">
            {t('vision.faq_title')}
          </h2>
          <div className="space-y-3">
            {faqKeys.map(key => {
              const isOpen = openFaq === key
              return (
                <div key={key} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : key)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-deep pr-4">{t(`vision.faq.${key}`)}</h4>
                    {isOpen ? <ChevronUp size={20} className="text-gray-400 shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5">
                      <p className="text-sm text-gray-500 leading-relaxed">{t(`vision.faq.a${key.slice(1)}`)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Founder Section — Option C deep brand-purple */}
      <section className="py-8 sm:py-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0d2e 0%, #2a1148 60%, #1a0d2e 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-[15%] w-[420px] h-[420px] bg-[#FF6B00]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-[15%] w-[420px] h-[420px] bg-[#6C5CE7]/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <Badge variant="golden" className="mb-4">{t('vision.founder_badge', 'The Founder')}</Badge>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Photo placeholder */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl border-2 border-golden/20 overflow-hidden shadow-2xl">
                <img src="/founder.png" alt="David Deveaux — Founder of STAYLO" className="w-full h-full object-cover object-[center_30%]" />
              </div>
            </div>

            {/* Bio */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">David Deveaux</h2>
              <p className="text-golden font-semibold text-lg mb-4">{t('vision.founder_role', 'Founder of STAYLO')}</p>

              <p className="text-white/70 mb-4 leading-relaxed">
                {t('vision.founder_bio1', 'French hospitality entrepreneur based in Koh Phangan, Thailand, with nearly 40 years of experience across restaurants, bars, luxury service, tourism, and hospitality business development.')}
              </p>

              <p className="text-white/70 mb-4 leading-relaxed">
                {t('vision.founder_bio2', 'Having worked internationally in France, Monaco, Abu Dhabi, Moscow, and Thailand — and having founded several hospitality businesses — David understands firsthand the challenges faced by independent operators.')}
              </p>

              <p className="text-white/70 mb-4 leading-relaxed">
                {t('vision.founder_bio3', 'After years of seeing hotels lose control, margin, and influence to high-commission booking platforms, he created STAYLO with one clear mission:')}
              </p>

              <blockquote className="text-2xl sm:text-3xl font-extrabold text-golden italic my-6">
                "{t('vision.founder_quote', 'Give control back to those who host.')}"
              </blockquote>

              <p className="text-white/60 text-sm leading-relaxed">
                {t('vision.founder_belief', 'STAYLO is built on the belief that independent hotels deserve a platform that is fairer, more respectful, and designed around their interests — not against them.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">{t('vision.cta_title')}</h2>
            <p className="relative text-white/70 mb-4 max-w-lg mx-auto">{t('vision.cta_subtitle', 'Join {{count}}+ hoteliers who are taking back control of their business.', { count: sharesSold })}</p>
            <Link to={user ? '/dashboard' : '/register'}>
              <button className="relative px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                <span className="text-gradient">{user ? t('nav.dashboard', 'Go to Dashboard') : t('vision.cta_button')}</span>
                <ArrowRight size={20} className="text-sunset" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Company footer */}
      <div className="py-6 text-center border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-400">{t('vision.company_footer_by', 'Staylo is a project by')} <span className="font-semibold text-gray-500">Barokat Halal Food Co., Ltd.</span></p>
        <p className="text-[10px] text-gray-300 mt-1">{t('vision.company_footer_location', 'Koh Phangan, Surat Thani, Thailand')}</p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
 *  Allocation detail panels — rendered inline below each row of the
 *  "Founders, discover how you will invest in STAYLO" table.
 *  Each panel takes the `t` translator so all copy stays i18n-friendly.
 * ════════════════════════════════════════════════════════════════════════ */

// ─── BTC — Why a 20% Bitcoin reserve is strategic ──────────────────────
// Three illustrative SVG charts (price growth, BTC vs Gold mcap, corporate
// adoption) — values are representative, not real-time. The point is
// VISUAL conviction: "Bitcoin is the new digital gold."
function BtcDetail({ t }) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-bold text-lg text-deep mb-1.5 flex items-center gap-2">
          <span style={{ color: '#F7931A' }}>₿</span>
          {t('vision.btc_detail_title', 'Why we lock 20% of every raise in Bitcoin')}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('vision.btc_detail_intro', 'Bitcoin is the only treasury reserve asset with a fixed supply (21M coins, ever), no central authority, and a 15-year track record of outperforming every other store of value. We lock 20% of the raise in a permanent BTC reserve, written into company statutes (90% supermajority required to change). This protects every Founder against currency debasement AND aligns Staylo with the most credible long-term reserve asset of our generation.')}
        </p>
      </div>

      {/* Three charts: price growth · BTC vs Gold · corporate treasuries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chart 1: BTC price 2013→2026, log-style curve */}
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {t('vision.btc_chart1_label', 'BTC price · 2013 → 2026')}
          </div>
          <div className="text-xs text-deep font-bold mb-2">
            {t('vision.btc_chart1_caption', 'From $13 to $100K — same asset, no central bank')}
          </div>
          <svg viewBox="0 0 280 120" className="w-full h-auto">
            <defs>
              <linearGradient id="btcG1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#F7931A" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#F7931A" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Y baseline */}
            <line x1="20" y1="105" x2="270" y2="105" stroke="#E5E5E5" strokeWidth="1" />
            {/* Area under curve */}
            <path d="M 20 102 L 60 100 L 90 95 L 110 96 L 130 80 L 150 90 L 170 60 L 190 75 L 210 35 L 230 50 L 250 18 L 270 22 L 270 105 L 20 105 Z" fill="url(#btcG1)" />
            {/* Curve */}
            <path d="M 20 102 L 60 100 L 90 95 L 110 96 L 130 80 L 150 90 L 170 60 L 190 75 L 210 35 L 230 50 L 250 18 L 270 22" stroke="#F7931A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Endpoint dot */}
            <circle cx="270" cy="22" r="3.5" fill="#F7931A" />
            {/* X axis labels */}
            <text x="20"  y="118" fontSize="8" fill="#999">2013</text>
            <text x="145" y="118" fontSize="8" fill="#999">2020</text>
            <text x="252" y="118" fontSize="8" fill="#999">2026</text>
          </svg>
        </div>

        {/* Chart 2: BTC market cap vs Gold market cap */}
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {t('vision.btc_chart2_label', 'BTC vs Gold · market cap')}
          </div>
          <div className="text-xs text-deep font-bold mb-2">
            {t('vision.btc_chart2_caption', 'BTC = 13% of gold today. Closing the gap = 8× upside.')}
          </div>
          <svg viewBox="0 0 280 120" className="w-full h-auto">
            {/* Gold bar */}
            <rect x="50" y="20" width="50" height="80" rx="4" fill="#FFD700" />
            <text x="75" y="115" fontSize="9" fill="#666" textAnchor="middle" fontWeight="700">{t('vision.btc_chart2_gold', 'Gold')}</text>
            <text x="75" y="14" fontSize="9" fill="#B8860B" textAnchor="middle" fontWeight="800">$15T</text>
            {/* BTC bar (smaller) */}
            <rect x="155" y="80" width="50" height="20" rx="4" fill="#F7931A" />
            <text x="180" y="115" fontSize="9" fill="#666" textAnchor="middle" fontWeight="700">BTC</text>
            <text x="180" y="74" fontSize="9" fill="#F7931A" textAnchor="middle" fontWeight="800">$2T</text>
            {/* Arrow pointing up */}
            <path d="M 230 50 L 230 30 M 225 35 L 230 30 L 235 35" stroke="#F7931A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x="240" y="42" fontSize="11" fill="#F7931A" fontWeight="800">8×</text>
          </svg>
        </div>

        {/* Chart 3: Corporate treasuries holding BTC */}
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {t('vision.btc_chart3_label', 'Companies with BTC on balance sheet')}
          </div>
          <div className="text-xs text-deep font-bold mb-2">
            {t('vision.btc_chart3_caption', 'From 5 in 2020 to 200+ in 2026. Adoption is accelerating.')}
          </div>
          <svg viewBox="0 0 280 120" className="w-full h-auto">
            {/* Bars increasing year by year */}
            <rect x="20"  y="100" width="35" height="5"  rx="2" fill="#F7931A" opacity="0.5" />
            <rect x="65"  y="92"  width="35" height="13" rx="2" fill="#F7931A" opacity="0.65" />
            <rect x="110" y="75"  width="35" height="30" rx="2" fill="#F7931A" opacity="0.78" />
            <rect x="155" y="55"  width="35" height="50" rx="2" fill="#F7931A" opacity="0.88" />
            <rect x="200" y="25"  width="35" height="80" rx="2" fill="#F7931A" />
            {/* Labels */}
            <text x="37"  y="118" fontSize="8" fill="#999" textAnchor="middle">'20</text>
            <text x="82"  y="118" fontSize="8" fill="#999" textAnchor="middle">'22</text>
            <text x="127" y="118" fontSize="8" fill="#999" textAnchor="middle">'24</text>
            <text x="172" y="118" fontSize="8" fill="#999" textAnchor="middle">'25</text>
            <text x="217" y="118" fontSize="8" fill="#F7931A" textAnchor="middle" fontWeight="800">'26</text>
            {/* Top value labels */}
            <text x="37"  y="95"  fontSize="7" fill="#999" textAnchor="middle">5</text>
            <text x="217" y="20"  fontSize="9" fill="#F7931A" textAnchor="middle" fontWeight="800">200+</text>
          </svg>
        </div>
      </div>

      <div className="text-[11px] text-gray-400 italic text-center">
        {t('vision.btc_charts_sources', 'Illustrative — Sources: CoinMarketCap, Bitcoin Treasuries, Companiesmarketcap')}
      </div>
    </div>
  )
}

// ─── ACQUISITIONS — what the $750K actually buys ───────────────────────
// 4 concrete sub-allocations. The user spec was:
//   1. Une partie reste en réserve (cash buffer)
//   2. Lieu de travail pour l'équipe (office/co-working)
//   3. Un hôtel sur la plateforme (flagship hotel acquired)
//   4. Siège social en Thailande (HQ)
function AcquisitionsDetail({ t }) {
  const items = [
    {
      icon: Lock, color: '#FF6B00',
      title: t('vision.acq_reserve_title', 'Cash reserve — locked, untouchable'),
      body: t('vision.acq_reserve_body', "A portion of the acquisition fund stays as a strategic cash reserve. Cannot be spent on anything else — it's our insurance against unexpected market shocks, slow months, or opportunistic acquisitions that present themselves outside the plan."),
    },
    {
      icon: Building2, color: '#FF6B00',
      title: t('vision.acq_workspace_title', 'A workspace for our team'),
      body: t('vision.acq_workspace_body', "A real office in Koh Phangan where the team works, hosts hoteliers for onboarding, and welcomes Founding Partners visiting Thailand. Not a fancy WeWork — a productive base camp built for the people who build the platform."),
    },
    {
      icon: Hotel, color: '#FF6B00',
      title: t('vision.acq_hotel_title', 'A flagship hotel ON the platform'),
      body: t('vision.acq_hotel_body', "We acquire a real working hotel in Koh Phangan as our first STAYLO-owned property. It's our live testing ground for every feature (PMS, guest app, Pulse, schedule), our showcase for prospects, and a revenue-generating asset for the cooperative."),
    },
    {
      icon: MapPin, color: '#FF6B00',
      title: t('vision.acq_hq_title', 'Our HQ in Thailand'),
      body: t('vision.acq_hq_body', "Legal headquarters registered in Thailand — the country where we launch and where 70% of the platform's first 500 hotels will be. Anchoring the company physically where the business happens is a deliberate choice: we are not a Delaware-shell SaaS, we are a coop building from inside the market we serve."),
    },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-bold text-lg text-deep mb-1.5 flex items-center gap-2">
          <Building2 size={20} style={{ color: '#FF6B00' }} />
          {t('vision.acq_detail_title', 'Acquisitions — $750K, four concrete uses')}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('vision.acq_detail_intro', 'The acquisition envelope is the most tangible part of the raise. It buys real assets you can visit, photograph, and audit. Every Founding Partner gets a yearly invitation to see them.')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => {
          const Icon = it.icon
          return (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: it.color + '15' }}>
                <Icon size={18} style={{ color: it.color }} />
              </div>
              <div>
                <div className="font-bold text-deep text-sm mb-1">{it.title}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{it.body}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PRODUCT & TECH — $660K → what we build ────────────────────────────
function TechDetail({ t }) {
  const items = [
    { title: t('vision.tech_web_title',    'Web platform & guest PWA'), body: t('vision.tech_web_body',    'The booking site, the hotelier dashboard, and the guest PWA (app.staylo.app) — all React, all installable, all reaching 14 languages on day one.') },
    { title: t('vision.tech_mobile_title', 'Native mobile apps'),       body: t('vision.tech_mobile_body', 'iOS + Android wraps via Capacitor for BLE room keys, NFC payments, push notifications, and biometric auth. Phase 2 priority once the PWA is validated.') },
    { title: t('vision.tech_pms_title',    'PMS + staff messenger'),   body: t('vision.tech_pms_body',    'A full property management system + staff messenger — replaces 6-8 separate SaaS subscriptions hoteliers currently juggle. 17,800+ lines of UI shipped.') },
    { title: t('vision.tech_chain_title',  'Blockchain & $STAY token'), body: t('vision.tech_chain_body',  'Solana SPL Token-2022 deployment, NFT booking proofs, escrow smart contracts, Lightning Network payment rail integration. Security audits included.') },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-lg text-deep mb-1.5 flex items-center gap-2">
          <Sparkles size={20} style={{ color: '#6C5CE7' }} />
          {t('vision.tech_detail_title', 'Product & Tech — $660K, the engine')}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('vision.tech_detail_intro', 'The platform itself. Engineering, design, infrastructure, security audits. Every line of code we ship reduces a hotelier subscription elsewhere — we replace, not add.')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="font-bold text-deep text-sm mb-1">{it.title}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── OPERATIONS RUNWAY — $690K → team + hosting + support ──────────────
function OperationsDetail({ t }) {
  const items = [
    { title: t('vision.ops_team_title',    'Core team salaries (18 months)'),  body: t('vision.ops_team_body',    '5-7 full-time roles: engineering, product, hotelier success, content. 18-month runway lets us hit 500 hotels before needing a Series A — keeping you protected from dilution.') },
    { title: t('vision.ops_infra_title',   'Infrastructure & hosting'),        body: t('vision.ops_infra_body',   'Supabase, Vercel, S3 storage, CDN, email (Resend), monitoring (Sentry), domain registrations, SSL. Scales linearly with hotel count.') },
    { title: t('vision.ops_support_title', 'Hotelier success & onboarding'),   body: t('vision.ops_support_body', 'A real human team that visits hotels in person to set up properties, train staff, and capture feedback. Not a chatbot — Thailand-based humans speaking the local languages.') },
    { title: t('vision.ops_finops_title',  'Accounting & compliance'),         body: t('vision.ops_finops_body',  'Thai accounting firm + auditor, monthly reporting, quarterly investor updates, regulatory filings. Founding Partners get the books open.') },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-lg text-deep mb-1.5 flex items-center gap-2">
          <Users size={20} style={{ color: '#00B894' }} />
          {t('vision.ops_detail_title', 'Operations Runway — $690K, the people')}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('vision.ops_detail_intro', 'STAYLO needs 18 months to reach the 500-hotel network effect. This envelope keeps the lights on — salaries, hosting, support, accounting — without diluting Founders for the bridge.')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="font-bold text-deep text-sm mb-1">{it.title}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MARKETING & LEGAL — $300K → reach + compliance ───────────────────
function MarketingDetail({ t }) {
  const items = [
    { title: t('vision.mkt_outreach_title', 'Hotelier outreach campaigns'),   body: t('vision.mkt_outreach_body', 'Door-to-door + digital outreach to the first 500 hotels in Thailand. Trade-show presence (HORECA, Hospitality Industry Forum), local press, hotelier association partnerships.') },
    { title: t('vision.mkt_content_title',  'Brand & content'),               body: t('vision.mkt_content_body',  'Marketing site, video case studies, hotelier testimonials, multi-language SEO, social media — the assets that make a 5-minute meeting convert.') },
    { title: t('vision.mkt_legal_title',    'Legal counsel & contracts'),     body: t('vision.mkt_legal_body',    'Thai law firm for cooperative structure, Founding Partner agreements, token issuance counsel (Solana SPL), GDPR / PDPA compliance, terms of service across 14 jurisdictions.') },
    { title: t('vision.mkt_audit_title',    'Security & smart contract audit'),body: t('vision.mkt_audit_body',   'Third-party audit of the $STAY token contract, escrow smart contracts, and the payment rail. Critical before any real money moves through the platform.') },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-lg text-deep mb-1.5 flex items-center gap-2">
          <Megaphone size={20} style={{ color: '#636E72' }} />
          {t('vision.mkt_detail_title', 'Marketing & Legal — $300K, the trust layer')}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('vision.mkt_detail_intro', 'The smallest envelope, but every dollar carries leverage. Outreach brings hoteliers in. Legal makes the cooperative structure bulletproof. Audits make the on-chain layer credible.')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="font-bold text-deep text-sm mb-1">{it.title}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
