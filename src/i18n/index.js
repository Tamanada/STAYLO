import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('staylo-lang') : null

// Lazy-load language modules
const langModules = {
  fr: () => import('./fr.json'),
  th: () => import('./th.json'),
  ja: () => import('./ja.json'),
  es: () => import('./es.json'),
  ar: () => import('./ar.json'),
  ru: () => import('./ru.json'),
  zh: () => import('./zh.json'),
  hi: () => import('./hi.json'),
  pt: () => import('./pt.json'),
  de: () => import('./de.json'),
  id: () => import('./id.json'),
  my: () => import('./my.json'),
  it: () => import('./it.json'),
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

// Preload saved language immediately on startup
if (savedLang && savedLang !== 'en' && langModules[savedLang]) {
  langModules[savedLang]().then(mod => {
    i18n.addResourceBundle(savedLang, 'translation', mod.default, true, true)
    i18n.changeLanguage(savedLang)
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
  })
}

export async function changeLanguage(lang) {
  if (lang !== 'en' && !i18n.hasResourceBundle(lang, 'translation')) {
    if (langModules[lang]) {
      const mod = await langModules[lang]()
      i18n.addResourceBundle(lang, 'translation', mod.default, true, true)
    }
  }
  await i18n.changeLanguage(lang)
  localStorage.setItem('staylo-lang', lang)
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

export default i18n
