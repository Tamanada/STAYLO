import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

export function CTASection() {
  const { t } = useTranslation()

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
          {/* Floating sparkles */}
          <div className="absolute top-6 left-8 animate-float">
            <Sparkles size={24} className="text-golden/60" />
          </div>
          <div className="absolute bottom-8 right-12 animate-float" style={{ animationDelay: '1.5s' }}>
            <Sparkles size={20} className="text-golden/40" />
          </div>
          <div className="absolute top-12 right-20 animate-float" style={{ animationDelay: '0.8s' }}>
            <Sparkles size={16} className="text-white/30" />
          </div>

          <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">{t('cta_section.title')}</h2>
          <p className="relative text-lg text-white/80 mb-8 max-w-lg mx-auto">{t('cta_section.subtitle')}</p>
          <Link to="/register">
            <button className="relative px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
              <span className="text-gradient">{t('cta_section.button')}</span>
              <ArrowRight size={20} className="text-sunset" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
