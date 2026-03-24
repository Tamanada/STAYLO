import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Hotel, UtensilsCrossed, Compass, Plane, Globe, ArrowRight, Shield, Vote, Sparkles, BadgeCheck, Rocket, TrendingUp, PieChart, Users, Building2, Lock, DollarSign, Target, ChevronDown, ChevronUp, Search, Megaphone, Coins, FileText, FileCheck, CreditCard, MapPin, Scale } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const phases = [
  { key: 'phase1', icon: Hotel, gradient: 'from-ocean to-electric', status: 'Alpha', timeline: 'Now' },
  { key: 'phase2', icon: UtensilsCrossed, gradient: 'from-libre to-libre/70', status: 'V2', timeline: 'M6–M12' },
  { key: 'phase3', icon: Compass, gradient: 'from-sunrise to-sunset', status: 'V3', timeline: 'M12–M18' },
  { key: 'phase4', icon: Plane, gradient: 'from-electric to-sunset', status: 'V4', timeline: 'M18–M24' },
  { key: 'phase5', icon: Globe, gradient: 'from-golden to-sunrise', status: 'V5', timeline: 'M24+' },
]

const benefitIcons = {
  lowest_commission: Shield,
  revenue_share: Sparkles,
  governance: Vote,
  early_access: Rocket,
  badge: BadgeCheck,
}

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

export default function Vision() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [sharesSold, setSharesSold] = useState(127)
  const [openFaq, setOpenFaq] = useState(null)
  const totalAlphaShares = 3000
  const totalShares = 10000
  const sharePrice = 1000
  const pctSold = ((sharesSold / totalAlphaShares) * 100).toFixed(1)

  useEffect(() => {
    async function fetchShares() {
      try {
        // Get total shares from the shares table (sum of quantity)
        const { data } = await supabase.from('shares').select('quantity')
        if (data && data.length > 0) {
          const total = data.reduce((sum, s) => sum + (s.quantity || 0), 0)
          if (total > 0) setSharesSold(total)
        }
      } catch (e) { /* use default */ }
    }
    fetchShares()
  }, [])

  return (
    <div className="relative">
      {/* Hero */}
      <section className="bg-gradient-to-br from-deep via-[#0d1f3c] to-ocean/90 text-white py-20 sm:py-28 relative overflow-hidden animate-gradient">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[20%] w-60 h-60 bg-golden/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-sunset/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="golden" className="mb-6">{t('vision.title')}</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">{t('vision.hero_title')}</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">{t('vision.hero_subtitle')}</p>
          <Link to={user ? '/dashboard' : '/register'}>
            <button className="px-10 py-4 bg-gradient-to-r from-golden to-sunrise text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3 cursor-pointer">
              <Sparkles size={22} />
              {user ? t('nav.dashboard', 'Go to Dashboard') : t('vision.invest_cta', 'Become a Founding Member')}
              <ArrowRight size={20} />
            </button>
          </Link>
        </div>
      </section>

      {/* Company Structure */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.structure_title', 'The Staylo Structure')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.structure_subtitle', 'A platform built, owned, and governed by the people who use it.')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-2 border-ocean/20 hover:border-ocean/40 transition-all">
              <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-ocean" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_coop_title', 'Cooperative Model')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_coop_desc', 'Staylo is a collectively-owned platform. Hoteliers are not customers — they are shareholders and decision-makers.')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-libre/20 hover:border-libre/40 transition-all">
              <div className="w-14 h-14 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Vote size={28} className="text-libre" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_vote_title', '1 Hotel = 1 Vote')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_vote_desc', 'Governance is democratic. Whether you hold 1 share or 10, your property gets one equal vote on all platform decisions.')}</p>
            </Card>

            <Card className="p-6 text-center border-2 border-sunset/20 hover:border-sunset/40 transition-all">
              <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-sunset" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">{t('vision.structure_transfer_title', 'Transferable Shares')}</h3>
              <p className="text-sm text-gray-500">{t('vision.structure_transfer_desc', 'Shares are freely transferable. Voting rights stay with the active property registration, not the shares themselves.')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Share Counter */}
      <section className="py-16 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">{t('vision.share_sale_title', 'Alpha Share Sale')}</h2>
            <p className="text-white/60">{t('vision.share_sale_subtitle', 'Phase Alpha — Founding Partners only. Limited to 3,000 shares.')}</p>
          </div>

          {/* Big counter */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10 mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-6xl sm:text-7xl font-black text-golden">{sharesSold}</span>
              <span className="text-2xl text-white/40 font-medium">/ {totalAlphaShares.toLocaleString()}</span>
            </div>
            <p className="text-center text-white/50 text-sm mb-6">{t('vision.shares_claimed', 'alpha shares claimed')}</p>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-golden via-sunrise to-sunset rounded-full transition-all duration-1000 relative"
                style={{ width: `${pctSold}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>0</span>
              <span>{pctSold}% {t('vision.sold', 'sold')}</span>
              <span>{totalAlphaShares.toLocaleString()}</span>
            </div>

            {/* Share pricing tiers */}
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-golden/10 border border-golden/30 rounded-2xl p-5 text-center">
                <p className="text-xs text-golden uppercase tracking-wider font-semibold mb-2">{t('vision.tier_alpha', 'Alpha (Now)')}</p>
                <p className="text-3xl font-black text-golden">$1,000</p>
                <p className="text-xs text-white/40 mt-1">{t('vision.per_share', 'per share')}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-60">
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">{t('vision.tier_v1', 'Phase V1 (M6)')}</p>
                <p className="text-3xl font-black text-white/60">$1,500</p>
                <p className="text-xs text-white/40 mt-1">{t('vision.per_share', 'per share')}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-40">
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">{t('vision.tier_v2', 'Phase V2+ (M12)')}</p>
                <p className="text-3xl font-black text-white/60">$2,000+</p>
                <p className="text-xs text-white/40 mt-1">{t('vision.market_price', 'market price')}</p>
              </div>
            </div>
          </div>

          {/* Key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white">{totalShares.toLocaleString()}</p>
              <p className="text-xs text-white/40">{t('vision.total_shares', 'Total shares')}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-golden">$1,000</p>
              <p className="text-xs text-white/40">{t('vision.per_share_alpha', 'Per share (alpha)')}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white">1–10</p>
              <p className="text-xs text-white/40">{t('vision.shares_per_property', 'Shares per property')}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-libre">10%</p>
              <p className="text-xs text-white/40">{t('vision.commission_forever', 'Commission — forever')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Distribution */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.revenue_distribution_title', 'Where The Money Goes')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.revenue_distribution_subtitle', 'Full transparency. Every dollar accounted for.')}</p>
          </div>

          {/* Money flow — For every $100 booked */}
          <Card className="p-6 sm:p-10 mb-12 max-w-4xl mx-auto bg-gradient-to-br from-deep to-[#0F2847] text-white overflow-hidden">
            <p className="text-center text-sm text-gray-400 mb-2 uppercase tracking-wider">{t('vision.flow_label', 'For every')}</p>
            <p className="text-center text-5xl sm:text-6xl font-black mb-8">$100 <span className="text-2xl font-normal text-gray-400">{t('vision.flow_booked', 'booked')}</span></p>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* OTA side */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-sunset" />
                  <p className="font-bold text-gray-300">{t('vision.flow_ota_title', 'With Booking.com / Agoda')}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{t('vision.flow_ota_commission', 'Commission')}</span>
                    <span className="text-2xl font-bold text-sunset">−$22</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{t('vision.flow_ota_where', 'Where does it go?')}</span>
                    <span className="text-sm text-gray-500">→ {t('vision.flow_ota_destination', 'Hedge funds & tax havens')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{t('vision.flow_ota_back', 'What comes back to you?')}</span>
                    <span className="text-lg font-bold text-sunset">$0</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">{t('vision.flow_you_keep', 'You keep')}</span>
                    <span className="text-2xl font-bold text-white">$78</span>
                  </div>
                </div>
              </div>

              {/* Staylo side */}
              <div className="bg-libre/10 backdrop-blur rounded-2xl p-6 border-2 border-libre/30 relative">
                <div className="absolute -top-3 right-4 bg-libre text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('vision.flow_recommended', 'BETTER DEAL')}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-libre" />
                  <p className="font-bold text-libre">{t('vision.flow_staylo_title', 'With Staylo')}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{t('vision.flow_staylo_commission', 'Commission')}</span>
                    <span className="text-2xl font-bold text-libre">−$10</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{t('vision.flow_staylo_where', 'Where does it go?')}</span>
                    <span className="text-sm text-libre">→ {t('vision.flow_staylo_community', 'Your community')}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">{t('vision.flow_you_keep', 'You keep')}</span>
                    <span className="text-2xl font-bold text-libre">$90</span>
                  </div>
                  <div className="text-center mt-3 bg-libre/20 rounded-lg py-2">
                    <span className="text-libre font-bold text-lg">+15.4% </span>
                    <span className="text-gray-400 text-sm">{t('vision.flow_more_revenue', 'more revenue vs OTAs')}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-6">{t('vision.flow_disclaimer', 'Based on average 22% OTA commission. Actual savings depend on your current platform and rates.')}</p>
          </Card>

          {/* Revenue breakdown — Pie Chart */}
          <Card className="p-8 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-deep text-center mb-8">{t('vision.breakdown_title', '10% Commission Breakdown')}</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Pie chart SVG */}
              <div className="relative w-64 h-64 flex-shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                  {/* Operations 40% — starts at 0° */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#3B82F6" strokeWidth="40"
                    strokeDasharray={`${40 * 5.026} ${(100 - 40) * 5.026}`}
                    strokeDashoffset="0" transform="rotate(-90 100 100)" />
                  {/* Ambassador 20% — starts at 144° */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#8B5CF6" strokeWidth="40"
                    strokeDasharray={`${20 * 5.026} ${(100 - 20) * 5.026}`}
                    strokeDashoffset={`${-(40) * 5.026}`} transform="rotate(-90 100 100)" />
                  {/* Dividends 20% — starts at 216° */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#10B981" strokeWidth="40"
                    strokeDasharray={`${20 * 5.026} ${(100 - 20) * 5.026}`}
                    strokeDashoffset={`${-(60) * 5.026}`} transform="rotate(-90 100 100)" />
                  {/* Growth 15% — starts at 288° */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#F97316" strokeWidth="40"
                    strokeDasharray={`${15 * 5.026} ${(100 - 15) * 5.026}`}
                    strokeDashoffset={`${-(80) * 5.026}`} transform="rotate(-90 100 100)" />
                  {/* Reserve 5% — starts at 342° */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#FBBF24" strokeWidth="40"
                    strokeDasharray={`${5 * 5.026} ${(100 - 5) * 5.026}`}
                    strokeDashoffset={`${-(95) * 5.026}`} transform="rotate(-90 100 100)" />
                  {/* Center circle */}
                  <circle cx="100" cy="100" r="58" fill="white" />
                  <text x="100" y="92" textAnchor="middle" className="fill-deep text-2xl font-bold" style={{ fontSize: '28px', fontWeight: 700 }}>10%</text>
                  <text x="100" y="115" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '11px' }}>commission</text>
                </svg>
              </div>

              {/* Legend */}
              <div className="space-y-4 flex-1">
                {[
                  { emoji: '⚙️', label: t('vision.breakdown_operations', 'Platform Operations'), pct: 40, color: '#3B82F6', desc: t('vision.breakdown_operations_desc', 'Tech, servers, support, payment processing') },
                  { emoji: '🤝', label: t('vision.breakdown_ambassador', 'Ambassador Reward'), pct: 20, color: '#8B5CF6', desc: t('vision.breakdown_ambassador_desc', '2% lifetime passive income for the person who brought the hotel to Staylo') },
                  { emoji: '💰', label: t('vision.breakdown_dividends', 'Shareholder Dividends'), pct: 20, color: '#10B981', desc: t('vision.breakdown_dividends_desc', 'Distributed to all founding partners proportionally') },
                  { emoji: '📈', label: t('vision.breakdown_growth', 'Growth & Marketing'), pct: 15, color: '#F97316', desc: t('vision.breakdown_growth_desc', 'Traveler acquisition, SEO, partnerships') },
                  { emoji: '🛡️', label: t('vision.breakdown_reserve', 'Reserve Fund'), pct: 5, color: '#FBBF24', desc: t('vision.breakdown_reserve_desc', 'Emergency fund & future development') },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-deep">{item.emoji} {item.label}</span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.pct}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Ambassador Program */}
      <section className="py-16 bg-gradient-to-br from-electric/5 via-white to-sunset/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="golden" className="mb-4">{t('vision.marketing_badge', 'Passive Income Program')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.marketing_title', 'Become an Ambassador')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.marketing_subtitle', "Build the world's largest accommodation network — and earn 2% passive income for life on every hotel you bring to Staylo. No limits. No expiry. Forever.")}</p>
            <div className="mt-6">
              <Link to="/ambassador/register">
                <Button size="lg" className="bg-gradient-to-r from-sunset to-sunrise text-white font-bold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  {t('vision.ambassador_cta', 'Become an Ambassador')} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* How it works — 3 steps */}
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
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
            <div className="text-center mb-6">
              <p className="text-6xl sm:text-7xl font-black text-gradient mb-2">2%</p>
              <p className="text-xl font-bold text-deep">{t('vision.ambassador_lifetime', 'Lifetime Passive Income')}</p>
              <p className="text-gray-500 text-sm mt-1">{t('vision.ambassador_lifetime_desc', 'On every booking, every service, every sale from the hotels you brought to Staylo.')}</p>
            </div>

            {/* Contract triangle */}
            <div className="bg-deep/5 rounded-2xl p-6 mb-6">
              <h4 className="font-bold text-deep text-center mb-4">{t('vision.tripartite_title', 'The Tripartite Contract')}</h4>
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
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

      {/* Fund Allocation — Where investment goes */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('vision.fund_title', 'Where Your Investment Goes')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.fund_subtitle', 'Every dollar invested in Staylo funds the platform that replaces your OTA dependency.')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Target, label: t('vision.fund_tech', 'Technology'), pct: '45%', desc: t('vision.fund_tech_desc', 'Booking engine, mobile app, channel manager, PMS integration'), color: 'ocean' },
              { icon: TrendingUp, label: t('vision.fund_marketing', 'Marketing'), pct: '25%', desc: t('vision.fund_marketing_desc', 'Traveler acquisition, SEO, content, launch campaigns'), color: 'sunset' },
              { icon: Users, label: t('vision.fund_team', 'Team'), pct: '20%', desc: t('vision.fund_team_desc', 'Engineering, support, business development, operations'), color: 'libre' },
              { icon: Shield, label: t('vision.fund_legal', 'Legal & Compliance'), pct: '10%', desc: t('vision.fund_legal_desc', 'Company registration, contracts, licenses, insurance'), color: 'golden' },
            ].map(item => (
              <Card key={item.label} className="p-6 text-center hover:shadow-lg transition-all">
                <div className={`w-12 h-12 bg-${item.color}/10 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <item.icon size={24} className={`text-${item.color}`} />
                </div>
                <p className={`text-3xl font-black text-${item.color} mb-1`}>{item.pct}</p>
                <p className="font-semibold text-deep text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-deep text-center mb-12">
            {t('vision.roadmap_title')}
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200 hidden sm:block" />
            <div className="space-y-6">
              {phases.map((phase, i) => (
                <div key={phase.key} className="relative flex items-start gap-5">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-14 h-14 bg-gradient-to-br ${phase.gradient} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                    <phase.icon size={28} className="text-white" />
                  </div>
                  <Card className={`flex-1 p-5 ${i === 0 ? 'border-2 border-libre/30 shadow-lg' : ''}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-deep">{t(`vision.${phase.key}`)}</h3>
                      <Badge variant={i === 0 ? 'green' : 'gray'} className="text-xs">
                        {phase.status}
                      </Badge>
                      <span className="text-xs text-gray-400 ml-auto">{phase.timeline}</span>
                    </div>
                    <p className="text-sm text-gray-500">{t(`vision.${phase.key}_desc`)}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founding benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep text-center mb-10">
            {t('vision.founding_title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(benefitIcons).map(([key, Icon]) => (
              <Card key={key} className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-libre/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-libre" />
                </div>
                <p className="text-sm text-gray-600">{t(`vision.founding_benefits.${key}`)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Required Documents for Whitelisted Businesses */}
      <section className="py-16 bg-gradient-to-br from-deep to-[#0F2847] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="golden" className="mb-4">{t('vision.docs_badge', 'Registration Process')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('vision.docs_title', 'What You Need to Join')}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t('vision.docs_subtitle', 'To become an official Staylo Founding Partner, your business must be legally registered. Here\'s what we require:')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: FileText, title: t('vision.doc_license', 'Business License'), desc: t('vision.doc_license_desc', 'TAT license (Thailand) or equivalent local business registration'), required: true },
              { icon: Building2, title: t('vision.doc_registration', 'Company Registration'), desc: t('vision.doc_registration_desc', 'DBD registration certificate or equivalent (e.g. Ltd., Co., sole proprietor)'), required: true },
              { icon: MapPin, title: t('vision.doc_property', 'Property Proof'), desc: t('vision.doc_property_desc', 'Ownership deed, lease agreement, or management contract for the property'), required: true },
              { icon: CreditCard, title: t('vision.doc_tax', 'Tax ID'), desc: t('vision.doc_tax_desc', 'Valid tax identification number for the business entity'), required: true },
              { icon: FileCheck, title: t('vision.doc_loi', 'Letter of Intent'), desc: t('vision.doc_loi_desc', 'Signed LOI (provided by Staylo) — bilingual TH/EN, non-binding'), required: true },
              { icon: Scale, title: t('vision.doc_contract', 'Founding Partner Contract'), desc: t('vision.doc_contract_desc', 'Official partnership agreement — signed upon share purchase'), required: false },
            ].map((doc, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 flex gap-4">
                <div className="w-12 h-12 bg-golden/10 rounded-xl flex items-center justify-center shrink-0">
                  <doc.icon size={22} className="text-golden" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-sm">{doc.title}</h4>
                    {doc.required && <span className="text-[10px] bg-sunset/20 text-sunset px-2 py-0.5 rounded-full">{t('vision.doc_required', 'Required')}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">{t('vision.docs_note', 'The official partnership process will start when all 3,000 alpha shares are booked. Reserve your shares now — submit documents later.')}</p>
        </div>
      </section>

      {/* FAQ — Accordion */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep text-center mb-10">
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

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">{t('vision.cta_title')}</h2>
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto">{t('vision.cta_subtitle', 'Join {{count}}+ hoteliers who are taking back control of their business.', { count: sharesSold })}</p>
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
        <p className="text-xs text-gray-400">Staylo is a project by <span className="font-semibold text-gray-500">Barokat Halal Food Co., Ltd.</span></p>
        <p className="text-[10px] text-gray-300 mt-1">Koh Phangan, Surat Thani, Thailand</p>
      </div>
    </div>
  )
}
