import { useTranslation } from 'react-i18next'
import { Frown, Smile } from 'lucide-react'

const oldPlatforms = [
  { name: 'Booking.com', fee: '22%', painKey: 0 },
  { name: 'Expedia', fee: '18%', painKey: 1 },
  { name: 'Airbnb', fee: '15%', painKey: 2 },
  { name: 'Agoda', fee: '20%', painKey: 3 },
]

export function BreakFree() {
  const { t } = useTranslation()
  const pains = t('giants.old_pains', { returnObjects: true })

  return (
    <section className="py-8 sm:py-12 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-7">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-deep mb-3">
            {t('giants.title_before')} <span className="text-gradient">{t('giants.title_highlight')}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            {t('giants.subtitle')}
          </p>
        </div>

        {/* Main layout: 10% left + 2 columns right */}
        <div className="flex gap-4 items-stretch">
          {/* Big 10% — desktop only, brand-gradient pillar */}
          <div
            className="hidden lg:flex rounded-3xl flex-col items-center justify-center w-[130px] shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #FF6B00 0%, #FF3CB4 60%, #6C5CE7 100%)' }}
          >
            <p className="text-[5.5rem] font-black text-white leading-none tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>10</p>
            <p className="text-3xl font-black text-white -mt-2">%</p>
            <div className="w-10 h-0.5 bg-white/40 rounded-full my-3" />
            <p className="text-[10px] text-white/85 text-center leading-tight px-2">{t('giants.why_10_short', 'is all we need')}</p>
          </div>

          {/* 2 columns */}
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            {/* Old way — muted grey "loser" treatment */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 sm:p-8 border border-gray-200 relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.1)' }}>
                  <Frown size={22} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h3 className="font-bold text-deep text-lg">{t('giants.old_way')}</h3>
                  <p className="text-xs text-gray-400">{t('giants.old_way_sub')}</p>
                </div>
              </div>

              <div className="space-y-3">
                {oldPlatforms.map(p => (
                  <div key={p.name} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                    <div>
                      <span className="font-medium text-deep text-sm">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">— {Array.isArray(pains) ? pains[p.painKey] : p.name}</span>
                    </div>
                    <span className="font-bold text-sm px-2 py-0.5 rounded-lg" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}>-{p.fee}</span>
                  </div>
                ))}
              </div>

              {/* Strikethrough line */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-0.5 rotate-[-8deg]" style={{ background: 'rgba(220,38,38,0.3)' }} />
              </div>
            </div>

            {/* New way — Option C brand-deep purple, with brand-color accents */}
            <div className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a1148 0%, #1a0d2e 100%)' }}>
              <div className="absolute top-4 right-4 w-32 h-32 bg-[#FF6B00]/20 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-[#FF3CB4]/20 rounded-full blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,0,0.2)' }}>
                    <Smile size={22} style={{ color: '#FF6B00' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('giants.new_way')}</h3>
                    <p className="text-xs text-white/60">{t('giants.new_way_sub')}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,107,0,0.2)' }}>
                      <span className="font-bold text-xs" style={{ color: '#FF6B00' }}>10%</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat1_title')}</p>
                      <p className="text-xs text-white/55">{t('giants.feat1_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,60,180,0.2)' }}>
                      <span className="font-bold text-xs" style={{ color: '#FF3CB4' }}>$$</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat2_title')}</p>
                      <p className="text-xs text-white/55">{t('giants.feat2_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,92,231,0.25)' }}>
                      <span className="font-bold text-xs" style={{ color: '#6C5CE7' }}>OWN</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat3_title')}</p>
                      <p className="text-xs text-white/55">{t('giants.feat3_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Savings highlight — brand-gradient border */}
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: 'linear-gradient(#1a0d2e,#1a0d2e) padding-box, linear-gradient(135deg, #FF6B00, #FF3CB4, #6C5CE7) border-box',
                    border: '2px solid transparent',
                  }}
                >
                  <p className="text-white/70 text-xs mb-1">{t('giants.savings_context')}</p>
                  <p className="text-2xl font-extrabold text-gradient mb-1">{t('giants.savings_amount')}</p>
                  <p className="text-white/55 text-xs">{t('giants.savings_compare')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why 10% is enough — full-width brand-gradient banner */}
        <div
          className="mt-5 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF3CB4 50%, #6C5CE7 100%)' }}
        >
          <p className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            {t('giants.why_10_pct', "\"10%, that's all a platform needs when it doesn't have 22,000 employees and shareholders on Wall Street to pay.\"")}
          </p>
          <p className="font-semibold text-sm sm:text-base text-white/90">
            {t('giants.why_10_detail', 'No offices to rent. No massive teams. No external shareholders. Your community IS the infrastructure.')}
          </p>
        </div>
      </div>
    </section>
  )
}
