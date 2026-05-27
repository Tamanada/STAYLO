import { useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hotel, Megaphone, ArrowRight, Sparkles, Globe } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { changeLanguage } from '../i18n'

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0d2e 0%, #2a1148 50%, #1a0d2e 100%)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-[420px] h-[420px] bg-[#FF6B00]/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-[10%] w-[420px] h-[420px] bg-[#FF3CB4]/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className="relative max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-white">
            stay <span className="text-gradient">lo</span>
          </Link>
          {code && (
            <p className="text-sm text-white/60 mt-2">
              {t('welcome.referred_by', 'Referred by:')} <span className="font-mono" style={{ color: '#FDCB6E' }}>{code}</span>
            </p>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {t('welcome.title', 'Welcome to Staylo')}
          </h1>
          <p className="text-sm font-medium italic mb-2" style={{ color: 'rgba(253,203,110,0.85)' }}>Owned by Hoteliers, built for hospitality</p>
          <p className="text-white/70">
            {t('welcome.subtitle', 'What brings you here today?')}
          </p>
        </div>

        {/* 3 Choices — brand palette cycle */}
        <div className="space-y-4">
          {/* Become a Founding Partner — orange */}
          <Link to={`/register${refParam}`}>
            <Card className="p-5 bg-white/8 backdrop-blur-md border border-white/10 hover:border-[#FF6B00]/60 hover:bg-[#FF6B00]/8 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)' }}>
                  <Sparkles size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-[#FF6B00] transition-colors">{t('welcome.partner_title', 'Become a Founding Partner')}</h3>
                  <p className="text-sm text-white/65">{t('welcome.partner_desc', 'Invest in Staylo and own a piece of the platform')}</p>
                </div>
                <ArrowRight size={20} className="text-white/50 group-hover:text-[#FF6B00] transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Register my property — pink */}
          <Link to={`/submit${refParam}`}>
            <Card className="p-5 bg-white/8 backdrop-blur-md border border-white/10 hover:border-[#FF3CB4]/60 hover:bg-[#FF3CB4]/8 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #FF3CB4, #6C5CE7)' }}>
                  <Hotel size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-[#FF3CB4] transition-colors">{t('welcome.property_title', 'Register my property')}</h3>
                  <p className="text-sm text-white/65">{t('welcome.property_desc', 'Add your hotel, guesthouse, or resort to Staylo')}</p>
                </div>
                <ArrowRight size={20} className="text-white/50 group-hover:text-[#FF3CB4] transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Become an Ambassador — purple */}
          <Link to="/ambassador/register">
            <Card className="p-5 bg-white/8 backdrop-blur-md border border-white/10 hover:border-[#6C5CE7]/60 hover:bg-[#6C5CE7]/8 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #6C5CE7, #FF6B00)' }}>
                  <Megaphone size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-[#6C5CE7] transition-colors">{t('welcome.ambassador_title', 'Become an Ambassador')}</h3>
                  <p className="text-sm text-white/65">{t('welcome.ambassador_desc', 'Earn 2% passive income for life on every hotel you bring')}</p>
                </div>
                <ArrowRight size={20} className="text-white/50 group-hover:text-[#6C5CE7] transition-colors shrink-0" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 mt-10">
          {t('welcome.already_account', 'Already have an account?')} <Link to="/login" className="underline" style={{ color: '#FDCB6E' }}>{t('welcome.login', 'Log in')}</Link>
        </p>
      </div>

      {/* Language pill — top right like nava_peace */}
      <div ref={langRef} className="fixed top-5 right-5 z-50">
        <button
          onClick={() => setLangOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1.5 text-white hover:bg-white/30 transition-all shadow-lg"
          aria-label="Change language"
        >
          <span className="text-base">{currentLang.flag}</span>
          <span className="text-xs font-bold uppercase">{i18n.language?.substring(0, 2)}</span>
        </button>
        {langOpen && (
          <div
            className="absolute top-12 right-0 w-52 max-h-80 overflow-y-auto rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl mt-1"
            style={{ background: 'rgba(26, 13, 46, 0.95)' }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { changeLanguage(lang.code); setLangOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
                  i18n.language === lang.code ? 'font-bold' : 'text-white/80'
                } first:rounded-t-2xl last:rounded-b-2xl`}
                style={i18n.language === lang.code ? { color: '#FDCB6E', background: 'rgba(253,203,110,0.12)' } : {}}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
