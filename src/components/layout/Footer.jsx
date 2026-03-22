import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-deep text-white mt-auto relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sunrise via-sunset to-electric" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="text-2xl font-extrabold text-white">stay</span>
              <span className="text-2xl font-extrabold text-gradient">lo</span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs">{t('footer.tagline')}</p>
            <p className="text-gray-500 text-xs mt-2">{t('footer.made_with')}</p>
          </div>

          <div className="flex gap-8">
            <div className="space-y-2">
              <Link to="/vision" className="block text-sm text-gray-400 hover:text-sunrise transition-colors no-underline">
                {t('footer.links.vision')}
              </Link>
              <Link to="/survey" className="block text-sm text-gray-400 hover:text-sunrise transition-colors no-underline">
                {t('footer.links.survey')}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700/50 mt-8 pt-6">
          <p className="text-xs text-gray-500">{t('footer.copyright', { year })}</p>
        </div>
      </div>
    </footer>
  )
}
