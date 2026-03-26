import { useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hotel, Megaphone, ArrowRight, Sparkles, Globe } from 'lucide-react'
import { Card } from '../components/ui/Card'

const languages = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'th', flag: '🇹🇭', label: 'ไทย' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa' },
  { code: 'my', flag: '🇲🇲', label: 'မြန်မာ' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
]

export default function Welcome() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const amb = searchParams.get('amb') || ''
  const code = ref || amb
  const refParam = ref ? `?ref=${ref}` : amb ? `?amb=${amb}` : ''

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep via-[#0F2847] to-deep flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-white">
            stay <span className="text-sunset">lo</span>
          </Link>
          {code && (
            <p className="text-sm text-gray-400 mt-2">
              {t('welcome.referred_by', 'Referred by:')} <span className="font-mono text-golden">{code}</span>
            </p>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {t('welcome.title', 'Welcome to Staylo')}
          </h1>
          <p className="text-gray-400">
            {t('welcome.subtitle', 'What brings you here today?')}
          </p>
        </div>

        {/* 3 Choices */}
        <div className="space-y-4">
          {/* Become a Founding Partner */}
          <Link to={`/register${refParam}`}>
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-golden/50 hover:bg-golden/5 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-golden to-sunrise rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-golden transition-colors">{t('welcome.partner_title', 'Become a Founding Partner')}</h3>
                  <p className="text-sm text-gray-400">{t('welcome.partner_desc', 'Invest in Staylo and own a piece of the platform')}</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-golden transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Register my property */}
          <Link to={`/submit${refParam}`}>
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-libre/50 hover:bg-libre/5 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-libre to-ocean rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Hotel size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-libre transition-colors">{t('welcome.property_title', 'Register my property')}</h3>
                  <p className="text-sm text-gray-400">{t('welcome.property_desc', 'Add your hotel, guesthouse, or resort to Staylo')}</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-libre transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Become an Ambassador */}
          <Link to="/ambassador/register">
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-sunset/50 hover:bg-sunset/5 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Megaphone size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-sunset transition-colors">{t('welcome.ambassador_title', 'Become an Ambassador')}</h3>
                  <p className="text-sm text-gray-400">{t('welcome.ambassador_desc', 'Earn 2% passive income for life on every hotel you bring')}</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-sunset transition-colors shrink-0" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-10">
          {t('welcome.already_account', 'Already have an account?')} <Link to="/login" className="text-ocean hover:text-electric underline">{t('welcome.login', 'Log in')}</Link>
        </p>
      </div>

      {/* Floating Language Selector — bottom right */}
      <div ref={langRef} className="fixed bottom-6 right-6 z-50">
        {langOpen && (
          <div className="absolute bottom-16 right-0 w-52 max-h-80 overflow-y-auto rounded-2xl bg-deep/95 backdrop-blur-xl border border-white/20 shadow-2xl mb-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
                  i18n.language === lang.code ? 'text-golden bg-golden/10 font-bold' : 'text-white/80'
                } first:rounded-t-2xl last:rounded-b-2xl`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setLangOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-ocean to-electric shadow-xl shadow-ocean/30 flex items-center justify-center gap-1 text-white hover:scale-110 transition-all border-2 border-white/20"
          aria-label="Change language"
        >
          <Globe size={20} />
          <span className="text-[10px] font-bold uppercase">{currentLang.flag}</span>
        </button>
      </div>
    </div>
  )
}
