import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Hotel, UtensilsCrossed, Compass, Plane, Globe, ArrowRight, Shield, Vote, Sparkles, BadgeCheck, Rocket, TrendingUp, PieChart, Users, Building2, Lock, DollarSign, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'

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
  const [sharesSold, setSharesSold] = useState(127)
  const [openFaq, setOpenFaq] = useState(null)
  const totalAlphaShares = 3000
  const totalShares = 10000
  const sharePrice = 1000
  const pctSold = ((sharesSold / totalAlphaShares) * 100).toFixed(1)

  useEffect(() => {
    // Try to get actual count from survey answers
    async function fetchShares() {
      try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
        if (count && count > 0) setSharesSold(count)
      } catch (e) { /* use default */ }
    }
    fetchShares()
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-deep via-[#0d1f3c] to-ocean/90 text-white py-20 sm:py-28 relative overflow-hidden animate-gradient">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[20%] w-60 h-60 bg-golden/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-sunset/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="golden" className="mb-6">{t('vision.title')}</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">{t('vision.hero_title')}</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('vision.hero_subtitle')}</p>
        </div>
      </section>

      {/* Company Structure */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">The Staylo Structure</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">A platform built, owned, and governed by the people who use it.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-2 border-ocean/20 hover:border-ocean/40 transition-all">
              <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-ocean" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">Cooperative Model</h3>
              <p className="text-sm text-gray-500">Staylo is a collectively-owned platform. Hoteliers are not customers — they are shareholders and decision-makers.</p>
            </Card>

            <Card className="p-6 text-center border-2 border-libre/20 hover:border-libre/40 transition-all">
              <div className="w-14 h-14 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Vote size={28} className="text-libre" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">1 Hotel = 1 Vote</h3>
              <p className="text-sm text-gray-500">Governance is democratic. Whether you hold 1 share or 10, your property gets one equal vote on all platform decisions.</p>
            </Card>

            <Card className="p-6 text-center border-2 border-sunset/20 hover:border-sunset/40 transition-all">
              <div className="w-14 h-14 bg-sunset/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-sunset" />
              </div>
              <h3 className="text-lg font-bold text-deep mb-2">Transferable Shares</h3>
              <p className="text-sm text-gray-500">Shares are freely transferable. Voting rights stay with the active property registration, not the shares themselves.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Share Counter */}
      <section className="py-16 bg-gradient-to-br from-deep via-[#0d1f3c] to-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Alpha Share Sale</h2>
            <p className="text-white/60">Phase Alpha — Founding Partners only. Limited to 3,000 shares.</p>
          </div>

          {/* Big counter */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10 mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-6xl sm:text-7xl font-black text-golden">{sharesSold}</span>
              <span className="text-2xl text-white/40 font-medium">/ {totalAlphaShares.toLocaleString()}</span>
            </div>
            <p className="text-center text-white/50 text-sm mb-6">alpha shares claimed</p>

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
              <span>{pctSold}% sold</span>
              <span>{totalAlphaShares.toLocaleString()}</span>
            </div>

            {/* Share pricing tiers */}
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-golden/10 border border-golden/30 rounded-2xl p-5 text-center">
                <p className="text-xs text-golden uppercase tracking-wider font-semibold mb-2">Alpha (Now)</p>
                <p className="text-3xl font-black text-golden">$1,000</p>
                <p className="text-xs text-white/40 mt-1">per share</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-60">
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">Phase V1 (M6)</p>
                <p className="text-3xl font-black text-white/60">$1,500</p>
                <p className="text-xs text-white/40 mt-1">per share</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-40">
                <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">Phase V2+ (M12)</p>
                <p className="text-3xl font-black text-white/60">$2,000+</p>
                <p className="text-xs text-white/40 mt-1">market price</p>
              </div>
            </div>
          </div>

          {/* Key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white">{totalShares.toLocaleString()}</p>
              <p className="text-xs text-white/40">Total shares</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-golden">$1,000</p>
              <p className="text-xs text-white/40">Per share (alpha)</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white">1–10</p>
              <p className="text-xs text-white/40">Shares per property</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-libre">10%</p>
              <p className="text-xs text-white/40">Commission — forever</p>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Distribution */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">Where The Money Goes</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Full transparency. Every dollar accounted for.</p>
          </div>

          {/* Commission comparison */}
          <div className="grid sm:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-sunset/10 to-sunset/20 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Traditional OTAs</p>
              <p className="text-5xl font-extrabold text-sunset">15–25%</p>
              <p className="text-xs text-gray-400 mt-2">Goes to shareholders in Silicon Valley</p>
            </div>
            <div className="bg-gradient-to-br from-libre/10 to-libre/20 rounded-2xl p-6 text-center border-2 border-libre/30">
              <p className="text-sm text-gray-500 mb-1">Staylo</p>
              <p className="text-5xl font-extrabold text-libre">10%</p>
              <p className="text-xs text-gray-400 mt-2">Stays in the community</p>
            </div>
          </div>

          {/* Revenue breakdown */}
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-deep text-center mb-6">10% Commission Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Platform Operations', pct: 40, color: 'bg-ocean', desc: 'Tech, servers, support, payment processing' },
                { label: 'Shareholder Dividends', pct: 30, color: 'bg-libre', desc: 'Distributed to all founding partners' },
                { label: 'Growth & Marketing', pct: 20, color: 'bg-sunset', desc: 'Traveler acquisition, SEO, partnerships' },
                { label: 'Reserve Fund', pct: 10, color: 'bg-golden', desc: 'Emergency fund & future development' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-deep">{item.label}</span>
                    <span className="text-sm font-bold text-deep">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Fund Allocation — Where investment goes */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">Where Your Investment Goes</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Every dollar invested in Staylo funds the platform that replaces your OTA dependency.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Target, label: 'Technology', pct: '45%', desc: 'Booking engine, mobile app, channel manager, PMS integration', color: 'ocean' },
              { icon: TrendingUp, label: 'Marketing', pct: '25%', desc: 'Traveler acquisition, SEO, content, launch campaigns', color: 'sunset' },
              { icon: Users, label: 'Team', pct: '20%', desc: 'Engineering, support, business development, operations', color: 'libre' },
              { icon: Shield, label: 'Legal & Compliance', pct: '10%', desc: 'Company registration, contracts, licenses, insurance', color: 'golden' },
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
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto">Join {sharesSold}+ hoteliers who are taking back control of their business.</p>
            <Link to="/register">
              <button className="relative px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                <span className="text-gradient">{t('vision.cta_button')}</span>
                <ArrowRight size={20} className="text-sunset" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
