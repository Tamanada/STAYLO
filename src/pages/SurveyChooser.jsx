import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Hotel, Plane } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function SurveyChooser() {
  const { t } = useTranslation()

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-deep mb-3">
          {t('survey_chooser.title', 'Tell us about yourself')}
        </h1>
        <p className="text-gray-500 text-lg">
          {t('survey_chooser.subtitle', 'We have two short surveys — pick the one that fits you.')}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Hotelier */}
        <Link to="/survey/hotelier">
          <Card className="p-8 text-center hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-ocean/30 group h-full">
            <div className="w-20 h-20 bg-gradient-to-br from-ocean to-electric rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform">
              <Hotel className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep mb-2">
              {t('survey_chooser.hotelier_title', "I'm a Hotelier")}
            </h2>
            <p className="text-sm text-gray-500">
              {t('survey_chooser.hotelier_desc', 'I own or manage a hotel, guesthouse, resort, or other accommodation.')}
            </p>
            <div className="mt-4 text-ocean font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              {t('survey_chooser.start', 'Start survey')} &rarr;
            </div>
          </Card>
        </Link>

        {/* Traveler */}
        <Link to="/survey/traveler">
          <Card className="p-8 text-center hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-sunset/30 group h-full">
            <div className="w-20 h-20 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform">
              <Plane className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-deep mb-2">
              {t('survey_chooser.traveler_title', "I'm a Traveler")}
            </h2>
            <p className="text-sm text-gray-500">
              {t('survey_chooser.traveler_desc', 'I book hotels and accommodations for my trips and travels.')}
            </p>
            <div className="mt-4 text-sunset font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              {t('survey_chooser.start', 'Start survey')} &rarr;
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
