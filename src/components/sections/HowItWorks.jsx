import { useTranslation } from 'react-i18next'

const STEPS = [
  { num: 1, emoji: '🔍', titleKey: 'step1_title', descKey: 'step1_desc', color: '#FF6B00', bg: 'rgba(255,107,0,0.1)' },
  { num: 2, emoji: '🪙', titleKey: 'step2_title', descKey: 'step2_desc', color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  { num: 3, emoji: '🤝', titleKey: 'step3_title', descKey: 'step3_desc', color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
]

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section style={{
      background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0F8 50%, #F0F4FF 100%)',
      padding: '80px 5%',
    }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">{t('home_how.label', 'How it works')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            {t('home_how.title_1', 'Book.')} {t('home_how.title_2', 'Earn.')} <span className="text-gradient">{t('home_how.title_3', 'Impact.')}</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map(step => (
            <div key={step.num} className="card-hover rounded-3xl p-7 text-center"
              style={{
                background: 'white',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              {/* Number circle */}
              <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: step.bg }}>
                <span className="text-xl font-black" style={{ color: step.color }}>{step.num}</span>
              </div>
              <span className="text-3xl block mb-4">{step.emoji}</span>
              <h3 className="font-black text-lg mb-2" style={{ color: '#2D3436' }}>{t(`home_how.${step.titleKey}`, step.titleKey)}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#636E72' }}>{t(`home_how.${step.descKey}`, step.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
