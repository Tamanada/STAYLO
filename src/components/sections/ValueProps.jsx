import { useTranslation } from 'react-i18next'

const PROPS = [
  {
    emoji: '💸',
    titleKey: 'prop1_title',
    descKey: 'prop1_desc',
    gradient: 'linear-gradient(135deg, #FFF0E0, #FFDCB8)',
    borderColor: 'rgba(255,107,0,0.15)',
  },
  {
    emoji: '🗳️',
    titleKey: 'prop2_title',
    descKey: 'prop2_desc',
    gradient: 'linear-gradient(135deg, #E0FFF5, #B8FFEA)',
    borderColor: 'rgba(0,184,148,0.15)',
  },
  {
    emoji: '💎',
    titleKey: 'prop3_title',
    descKey: 'prop3_desc',
    gradient: 'linear-gradient(135deg, #F0E8FF, #DFD0FF)',
    borderColor: 'rgba(108,92,231,0.15)',
  },
  {
    emoji: '🪙',
    titleKey: 'prop4_title',
    descKey: 'prop4_desc',
    gradient: 'linear-gradient(135deg, #FFE8F5, #FFCDE8)',
    borderColor: 'rgba(255,60,180,0.15)',
  },
]

export function ValueProps() {
  const { t } = useTranslation()

  return (
    <section style={{ background: '#FFFDF8', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">{t('home_value.section_label', 'Why Staylo')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            {t('home_value.title_1', 'More than a booking platform.')}<br />
            {t('home_value.title_2', "It's ")}<span className="text-gradient">{t('home_value.title_highlight', 'your')}</span>{t('home_value.title_3', ' platform.')}
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROPS.map(prop => (
            <div key={prop.titleKey} className="card-hover rounded-3xl p-8 text-center flex flex-col items-center"
              style={{
                background: prop.gradient,
                border: `1.5px solid ${prop.borderColor}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              <span className="text-5xl block mb-5">{prop.emoji}</span>
              <h3 className="font-black text-xl mb-3" style={{ color: '#2D3436' }}>{t(`home_value.${prop.titleKey}`)}</h3>
              <p className="text-base leading-relaxed" style={{ color: '#636E72' }}>{t(`home_value.${prop.descKey}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
