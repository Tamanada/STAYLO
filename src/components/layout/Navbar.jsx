import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Globe, ChevronDown, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { changeLanguage } from '../../i18n'
import { Button } from '../ui/Button'
import { getFeatureFlags } from '../../pages/admin/AdminSettings'

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'id', label: 'Bahasa', flag: '🇮🇩' },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
]

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]
  const flags = getFeatureFlags()

  async function handleLangChange(code) {
    await changeLanguage(code)
    setLangOpen(false)
  }

  return (
    <nav className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-gray-100/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + tagline */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-extrabold text-deep">stay</span>
              <span className="text-2xl font-extrabold text-gradient">lo</span>
            </div>
            <span className="hidden sm:block text-[10px] text-gray-400 font-medium border-l border-gray-200 pl-2 leading-tight">Owned by Hoteliers,<br />built for hospitality</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/vision" className="text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
              {t('nav.vision')}
            </Link>
            <Link to="/splash" className="text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
              {t('nav.splash', 'Koh Phangan')}
            </Link>
            {flags.survey && (
              <Link to="/survey" className="text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
                {t('nav.survey')}
              </Link>
            )}
            {flags.ambassadors && (
              <Link to="/ambassador" className="text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
                {t('nav.ambassador', 'Ambassador')}
              </Link>
            )}

            <a href="mailto:contact@staylo.app" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
              <Mail size={15} />
              {t('nav.contact', 'Contact')}
            </a>

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Globe size={16} />
                <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 max-h-80 overflow-y-auto">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLangChange(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${i18n.language === lang.code ? 'text-staylo-blue font-medium' : 'text-gray-600'}`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="secondary" size="sm">{t('nav.dashboard')}</Button>
                </Link>
                <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-deep-navy transition-colors no-underline">
                  {t('nav.login')}
                </Link>
                <Link to="/register">
                  <Button size="sm">{t('nav.register')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: language pill + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <span>{currentLang.flag}</span>
                <span className="text-xs font-bold uppercase">{currentLang.code}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 max-h-80 overflow-y-auto z-50">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { handleLangChange(lang.code); setLangOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${i18n.language === lang.code ? 'text-staylo-blue font-medium' : 'text-gray-600'}`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-50"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-4 space-y-3">
            <Link to="/vision" className="block py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
              {t('nav.vision')}
            </Link>
            <Link to="/splash" className="block py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
              {t('nav.splash', 'Koh Phangan')}
            </Link>
            {flags.survey && (
              <Link to="/survey" className="block py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
                {t('nav.survey')}
              </Link>
            )}
            {flags.ambassadors && (
              <Link to="/ambassador" className="block py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
                {t('nav.ambassador', 'Ambassador')}
              </Link>
            )}
            <Link to="/submit" className="block py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
              {t('nav.submit')}
            </Link>
            <a href="mailto:contact@staylo.app" className="flex items-center gap-2 py-2 text-gray-600 no-underline" onClick={() => setMobileOpen(false)}>
              <Mail size={16} />
              {t('nav.contact', 'Contact')}
            </a>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-2">{t('nav.language', 'Language')}</p>
              <div className="grid grid-cols-3 gap-2">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { handleLangChange(lang.code); setMobileOpen(false) }}
                    className={`px-2 py-1.5 rounded-lg text-xs text-center ${i18n.language === lang.code ? 'bg-staylo-blue/10 text-staylo-blue font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" size="sm" className="w-full">{t('nav.dashboard')}</Button>
                  </Link>
                  <button onClick={() => { signOut(); setMobileOpen(false) }} className="w-full text-sm text-gray-500 py-2">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" size="sm" className="w-full">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full">{t('nav.register')}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
