import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Hotel, UtensilsCrossed, Compass, Plane, Globe, ArrowRight, Shield, Vote, Sparkles, BadgeCheck, Rocket } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const phases = [
  { key: 'phase1', icon: Hotel, gradient: 'from-ocean to-electric', status: 'Alpha' },
  { key: 'phase2', icon: UtensilsCrossed, gradient: 'from-libre to-libre/70', status: 'V2' },
  { key: 'phase3', icon: Compass, gradient: 'from-sunrise to-sunset', status: 'V3' },
  { key: 'phase4', icon: Plane, gradient: 'from-electric to-sunset', status: 'V4' },
  { key: 'phase5', icon: Globe, gradient: 'from-golden to-sunrise', status: 'V5' },
]

const benefitIcons = {
  lowest_commission: Shield,
  revenue_share: Sparkles,
  governance: Vote,
  early_access: Rocket,
  badge: BadgeCheck,
}

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5']

export default function Vision() {
  const { t } = useTranslation()

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-deep via-electric/80 to-ocean text-white py-20 sm:py-28 relative overflow-hidden animate-gradient">
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

      {/* Ownership */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-deep-navy mb-4">{t('vision.ownership_title')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('vision.ownership_desc')}
          </p>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep-navy text-center mb-12">
            {t('vision.roadmap_title')}
          </h2>
          <div className="space-y-4">
            {phases.map((phase, i) => (
              <Card key={phase.key} className="p-6 flex items-center gap-5 hover:scale-[1.01] transition-all duration-300 border-2 border-transparent hover:border-sunrise/10">
                <div className={`w-14 h-14 bg-gradient-to-br ${phase.gradient} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                  <phase.icon size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-deep">{t(`vision.${phase.key}`)}</h3>
                    <Badge variant={i === 0 ? 'green' : 'gray'} className="text-xs">
                      {phase.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{t(`vision.${phase.key}_desc`)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue model */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-deep-navy mb-4">{t('vision.revenue_title')}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">{t('vision.revenue_desc')}</p>

          <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-lg mx-auto">
            <div className="bg-gradient-to-br from-sunset/10 to-sunset/20 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Traditional OTAs</p>
              <p className="text-4xl font-extrabold text-sunset">15–25%</p>
            </div>
            <div className="bg-gradient-to-br from-libre/10 to-libre/20 rounded-2xl p-6 text-center border-2 border-libre/30">
              <p className="text-sm text-gray-500 mb-1">Staylo</p>
              <p className="text-4xl font-extrabold text-libre">10%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founding benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep-navy text-center mb-10">
            {t('vision.founding_title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(benefitIcons).map(([key, Icon]) => (
              <Card key={key} className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-fair-green/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-fair-green" />
                </div>
                <p className="text-sm text-gray-600">{t(`vision.founding_benefits.${key}`)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-deep-navy text-center mb-10">
            {t('vision.faq_title')}
          </h2>
          <div className="space-y-4">
            {faqKeys.map(key => (
              <Card key={key} className="p-6">
                <h4 className="font-semibold text-deep-navy mb-2">{t(`vision.faq.${key}`)}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`vision.faq.a${key.slice(1)}`)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-6">{t('vision.cta_title')}</h2>
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
