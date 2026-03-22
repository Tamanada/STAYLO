import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react'

export function CommissionCalculator() {
  const { t } = useTranslation()
  const [commission, setCommission] = useState(18)
  const [rooms, setRooms] = useState(20)
  const [rate, setRate] = useState(80)
  const [occupancy, setOccupancy] = useState(65)

  const stayloRate = 10
  const annualRevenue = rooms * rate * 365 * (occupancy / 100)
  const currentFees = annualRevenue * (commission / 100)
  const stayloFees = annualRevenue * (stayloRate / 100)
  const savings = currentFees - stayloFees

  return (
    <section className="py-16 sm:py-24 bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-deep mb-3">
            <span className="text-gradient">{t('commission.title')}</span>
          </h2>
          <p className="text-gray-500">{t('commission.subtitle')}</p>
        </div>

        <Card className="p-8 border-2 border-transparent hover:border-sunrise/20 transition-all duration-500">
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t('commission.rooms_label')}
              </label>
              <input
                type="number"
                value={rooms}
                onChange={e => setRooms(Number(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t('commission.rate_label')}
              </label>
              <input
                type="number"
                value={rate}
                onChange={e => setRate(Number(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t('commission.occupancy_label')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={occupancy}
                  onChange={e => setOccupancy(Number(e.target.value))}
                  className="flex-1 accent-ocean"
                />
                <span className="text-sm font-mono text-deep w-12 text-right">{occupancy}%</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              {t('commission.current_label')}: <span className="text-deep font-bold text-xl">{commission}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={commission}
              onChange={e => setCommission(Number(e.target.value))}
              className="w-full accent-sunset h-2"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5%</span>
              <span>15%</span>
              <span>25%</span>
              <span>30%</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-sunset/5 to-sunset/15 rounded-2xl p-5 text-center">
              <TrendingDown size={20} className="mx-auto text-sunset mb-2" />
              <p className="text-sm text-gray-500 mb-1">{t('commission.current_label')}</p>
              <p className="text-3xl font-extrabold text-sunset">{commission}%</p>
              <p className="text-sm text-gray-400">${currentFees.toLocaleString()}{t('commission.per_year')}</p>
            </div>
            <div className="bg-gradient-to-br from-libre/5 to-libre/15 rounded-2xl p-5 text-center">
              <TrendingUp size={20} className="mx-auto text-libre mb-2" />
              <p className="text-sm text-gray-500 mb-1">{t('commission.staylo_label')}</p>
              <p className="text-3xl font-extrabold text-libre">{t('commission.staylo_rate')}</p>
              <p className="text-sm text-gray-400">${stayloFees.toLocaleString()}{t('commission.per_year')}</p>
            </div>
            <div className="bg-gradient-to-br from-golden/10 to-sunrise/15 rounded-2xl p-5 text-center border-2 border-golden/30 relative overflow-hidden">
              <Sparkles size={20} className="mx-auto text-golden mb-2" />
              <p className="text-sm text-gray-500 mb-1">{t('commission.savings_label')}</p>
              <p className="text-3xl font-extrabold text-gradient-gold">${savings.toLocaleString()}</p>
              <p className="text-sm text-gray-400">{t('commission.per_year')}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
