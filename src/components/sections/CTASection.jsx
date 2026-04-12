import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'

const PILL_KEYS = ['pill1', 'pill2', 'pill3', 'pill4', 'pill5']

export function CTASection() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <section style={{
      background: 'linear-gradient(135deg, #FF6B00 0%, #FF3CB4 50%, #6C5CE7 100%)',
      padding: '100px 5%',
    }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-bold tracking-widest uppercase mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {t('home_cta.badge', 'Founding Partner · Alpha Round')}
        </p>

        {/* Price */}
        <p style={{
          fontSize: 'clamp(60px, 10vw, 80px)',
          fontWeight: 900,
          color: 'white',
          lineHeight: 1,
          textShadow: '0 4px 20px rgba(0,0,0,0.2)',
          marginBottom: '16px',
        }}>
          {t('home_cta.price', '$1,000')}
        </p>
        <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {t('home_cta.price_sub', 'per share · World Round opens at $1,500 · 3,000 shares total')}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {PILL_KEYS.map(key => (
            <span key={key} className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
              {t(`home_cta.${key}`)}
            </span>
          ))}
        </div>

        {/* CTA button — white */}
        <Link to={user ? '/loi' : '/register'}>
          <button className="px-12 py-5 rounded-full text-lg font-black cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: 'white',
              color: '#FF6B00',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: 'none',
            }}>
            <span className="flex items-center gap-3">
              {t('home_cta.button', 'Become a Founding Partner')}
              <ArrowRight size={20} />
            </span>
          </button>
        </Link>

        {/* Note */}
        <p className="mt-8 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('home_cta.note', 'KYC required · Min. 1 share · Singapore law · Staylo Holdings Pte. Ltd.')}
        </p>
      </div>
    </section>
  )
}
