import { useTranslation } from 'react-i18next'
import { ClipboardList, Building2, Rocket, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  { icon: ClipboardList, gradient: 'from-ocean to-electric', num: '01', link: '/survey' },
  { icon: Building2, gradient: 'from-libre to-libre/70', num: '02', link: '/submit' },
  { icon: Rocket, gradient: 'from-sunrise to-sunset', num: '03', link: '/register' },
]

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section className="py-8 sm:py-12 bg-cream relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-7">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-deep mb-3">
            {t('how_it_works.title')}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t('how_it_works.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <Link to={step.link} key={i} className="no-underline">
              <div className="group bg-white rounded-3xl p-8 border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-500 relative overflow-hidden h-full">
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                {/* Step number watermark */}
                <span className="absolute top-4 right-6 text-6xl font-extrabold text-gray-100 group-hover:text-gray-200 transition-colors">{step.num}</span>

                <div className="relative">
                  <div className={`w-14 h-14 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300 shadow-lg`}>
                    <step.icon size={26} className="text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-deep mb-2">
                    {t(`how_it_works.step${i + 1}_title`)}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    {t(`how_it_works.step${i + 1}_desc`)}
                  </p>

                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-ocean opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {t('how.start', 'Start')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Timeline connector (desktop only) */}
        <div className="hidden sm:flex justify-center mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ocean" />
            <div className="w-24 h-0.5 bg-gradient-to-r from-ocean to-libre" />
            <div className="w-3 h-3 rounded-full bg-libre" />
            <div className="w-24 h-0.5 bg-gradient-to-r from-libre to-sunrise" />
            <div className="w-3 h-3 rounded-full bg-sunrise" />
            <div className="w-16 h-0.5 bg-gradient-to-r from-sunrise to-golden" />
            <span className="text-xs font-bold text-golden">{t('how.freedom', 'FREEDOM')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
