import { useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hotel, Users, Megaphone, ArrowRight, Sparkles, Globe } from 'lucide-react'
import { Card } from '../components/ui/Card'

const languages = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00E7ais' },
  { code: 'th', flag: '\u{1F1F9}\u{1F1ED}', label: '\u0E44\u0E17\u0E22' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}', label: '\u65E5\u672C\u8A9E' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00F1ol' },
  { code: 'ar', flag: '\u{1F1F8}\u{1F1E6}', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { code: 'ru', flag: '\u{1F1F7}\u{1F1FA}', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
  { code: 'zh', flag: '\u{1F1E8}\u{1F1F3}', label: '\u4E2D\u6587' },
  { code: 'hi', flag: '\u{1F1EE}\u{1F1F3}', label: '\u0939\u093F\u0928\u094D\u0926\u0940' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Portugu\u00EAs' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch' },
  { code: 'id', flag: '\u{1F1EE}\u{1F1E9}', label: 'Bahasa' },
  { code: 'my', flag: '\u{1F1F2}\u{1F1F2}', label: '\u1019\u103C\u1014\u103A\u1019\u102C' },
  { code: 'it', flag: '\u{1F1EE}\u{1F1F9}', label: 'Italiano' },
]

export default function Welcome() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const amb = searchParams.get('amb') || ''
  const code = ref || amb
  const refParam = ref ? `?ref=${ref}` : amb ? `?amb=${amb}` : ''

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

      {/* Floating Language Selector */}
      <div ref={langRef} className="fixed bottom-6 right-6 z-50">
        {langOpen && (
          <div className="absolute bottom-16 right-0 w-48 max-h-72 overflow-y-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${
                  i18n.language === lang.code ? 'text-golden bg-white/5' : 'text-gray-200'
                } first:rounded-t-2xl last:rounded-b-2xl`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setLangOpen((o) => !o)}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-center gap-1 text-gray-200 hover:bg-white/20 hover:text-white transition-all"
          aria-label="Change language"
        >
          <Globe size={18} />
          <span className="text-[10px] font-bold uppercase">{i18n.language?.substring(0, 2)}</span>
        </button>
      </div>
    </div>
  )
}
