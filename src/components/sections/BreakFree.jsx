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
          {/* Big 10% — desktop only */}
          <div className="hidden lg:flex bg-gradient-to-b from-deep to-[#0d1f3c] rounded-3xl flex-col items-center justify-center w-[130px] shrink-0">
            <p className="text-[5.5rem] font-black text-golden leading-none tracking-tight">10</p>
            <p className="text-3xl font-black text-golden -mt-2">%</p>
            <div className="w-10 h-0.5 bg-golden/30 rounded-full my-3" />
            <p className="text-[10px] text-white/50 text-center leading-tight px-2">{t('giants.why_10_short', 'is all we need')}</p>
          </div>

          {/* 2 columns */}
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            {/* Old way */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 sm:p-8 border border-gray-200 relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sunset/10 rounded-xl flex items-center justify-center">
                  <Frown size={22} className="text-sunset" />
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
                    <span className="text-sunset font-bold text-sm bg-sunset/10 px-2 py-0.5 rounded-lg">-{p.fee}</span>
                  </div>
                ))}
              </div>

              {/* Strikethrough line */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-0.5 bg-sunset/30 rotate-[-8deg]" />
              </div>
            </div>

            {/* New way */}
            <div className="bg-gradient-to-br from-deep to-electric/90 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 w-32 h-32 bg-libre/10 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-golden/10 rounded-full blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-libre/20 rounded-xl flex items-center justify-center">
                    <Smile size={22} className="text-libre" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('giants.new_way')}</h3>
                    <p className="text-xs text-white/50">{t('giants.new_way_sub')}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-libre/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-libre font-bold text-xs">10%</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat1_title')}</p>
                      <p className="text-xs text-white/40">{t('giants.feat1_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-golden/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-golden font-bold text-xs">$$</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat2_title')}</p>
                      <p className="text-xs text-white/40">{t('giants.feat2_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ocean/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-ocean font-bold text-xs">OWN</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('giants.feat3_title')}</p>
                      <p className="text-xs text-white/40">{t('giants.feat3_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Savings highlight */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center">
                  <p className="text-white/60 text-xs mb-1">{t('giants.savings_context')}</p>
                  <p className="text-2xl font-extrabold text-gradient-gold mb-1">{t('giants.savings_amount')}</p>
                  <p className="text-white/40 text-xs">{t('giants.savings_compare')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why 10% is enough — full width banner */}
        <div className="mt-5 bg-gradient-to-r from-deep via-[#0d1f3c] to-deep rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-2">
            {t('giants.why_10_pct', "\"10%, that's all a platform needs when it doesn't have 22,000 employees and shareholders on Wall Street to pay.\"")}
          </p>
          <p className="text-golden font-semibold text-sm sm:text-base">
            {t('giants.why_10_detail', 'No offices to rent. No massive teams. No external shareholders. Your community IS the infrastructure.')}
          </p>
        </div>
      </div>
    </section>
  )
}
