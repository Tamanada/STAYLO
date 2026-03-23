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
    <section className="py-16 sm:py-24 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-deep mb-3">
            {t('giants.title_before')} <span className="text-gradient">{t('giants.title_highlight')}</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            {t('giants.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Old way */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 border border-gray-200 relative">
            <div className="flex items-center gap-3 mb-6">
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
          <div className="bg-gradient-to-br from-deep to-electric/90 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 w-32 h-32 bg-libre/10 rounded-full blur-2xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-golden/10 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-libre/20 rounded-xl flex items-center justify-center">
                  <Smile size={22} className="text-libre" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t('giants.new_way')}</h3>
                  <p className="text-xs text-white/50">{t('giants.new_way_sub')}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
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
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center">
                <p className="text-white/60 text-xs mb-1">{t('giants.savings_context')}</p>
                <p className="text-3xl font-extrabold text-gradient-gold mb-1">{t('giants.savings_amount')}</p>
                <p className="text-white/40 text-xs">{t('giants.savings_compare')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
