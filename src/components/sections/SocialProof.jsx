import { useTranslation } from 'react-i18next'
import { Globe, Building2, DollarSign } from 'lucide-react'

export function SocialProof() {
  const { t } = useTranslation()

  const stats = [
    { icon: Globe, value: '12', label: t('social_proof.countries'), color: 'text-electric' },
    { icon: Building2, value: '127', label: t('social_proof.properties'), color: 'text-sunrise' },
    { icon: DollarSign, value: '$2.1M', label: t('social_proof.saved'), color: 'text-libre' },
  ]

  return (
    <section className="py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-electric/5 via-sunrise/5 to-libre/5" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-deep text-center mb-5">
          {t('social_proof.title', { count: 120 })}
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center group">
              <stat.icon size={24} className={`mx-auto ${stat.color} mb-2 group-hover:scale-125 transition-transform duration-300`} />
              <p className="text-3xl sm:text-4xl font-extrabold text-deep">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
