import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Globe, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { changeLanguage } from '../../i18n'
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

// Sections of the (long) /vision page — surfaced as a dropdown under "Vision"
// so visitors can jump straight to a part. Each links to /vision#<id>; the
// Vision page reads the hash and smooth-scrolls there.
const visionSections = [
  { id: 'v-structure', key: 'vision.nav_structure', fallback: 'Model' },
  { id: 'v-moat',      key: 'vision.nav_moat',      fallback: 'Edge' },
  { id: 'v-bitcoin',   key: 'vision.nav_bitcoin',   fallback: 'Bitcoin' },
  { id: 'v-alpha',     key: 'vision.nav_alpha',     fallback: 'Alpha shares' },
  { id: 'v-invest',    key: 'vision.nav_invest',    fallback: 'Investment' },
  { id: 'v-roadmap',   key: 'vision.nav_roadmap',   fallback: 'Roadmap' },
  { id: 'v-revenue',   key: 'vision.nav_revenue',   fallback: 'Money flow' },
  { id: 'v-growth',    key: 'vision.nav_growth',    fallback: 'Growth' },
  { id: 'v-join',      key: 'vision.nav_join',      fallback: 'Join' },
  { id: 'v-faq',       key: 'vision.nav_faq',       fallback: 'FAQ' },
]

// Stay (/splash) + Ambassador (/ambassador) section dropdowns — reuse each
// page's existing section-title i18n keys as labels (already translated).
const splashSections = [
  { id: 's-now',  key: 'splash.right_now_title', fallback: 'Right now' },
  { id: 's-next', key: 'splash.next_title',      fallback: 'What happens next' },
  { id: 's-why',  key: 'splash.why_title',       fallback: 'Why' },
  { id: 's-deal', key: 'splash.deal_title',      fallback: 'The deal' },
  { id: 's-who',  key: 'splash.who_title',       fallback: 'Who' },
]
const ambassadorSections = [
  { id: 'a-how',      key: 'ambassador_landing.how_it_works_title', fallback: 'How It Works' },
  { id: 'a-calc',     key: 'ambassador_landing.calculator_title',   fallback: 'Earnings Calculator' },
  { id: 'a-contract', key: 'ambassador_landing.contract_title',     fallback: 'The Tripartite Agreement' },
]

// Reusable navbar dropdown: a top-level link with a hover menu of in-page
// section anchors. Each item links to `${to}#${section.id}`; the target page
// (via useHashScroll) smooth-scrolls there. Self-manages its open state.
function NavDropdown({ to, label, sections, t }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link to={to}
        className="flex items-center gap-1 text-sm font-medium no-underline transition-colors"
        style={{ color: open ? '#FF6B00' : '#636E72' }}>
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </Link>
      {open && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="min-w-52 bg-white rounded-2xl shadow-lg py-2" style={{ border: '1.5px solid #E8E0D8' }}>
            {sections.map(s => (
              <Link key={s.id} to={`${to}#${s.id}`} onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm no-underline transition-colors whitespace-nowrap"
                style={{ color: '#636E72' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF6B00'; e.currentTarget.style.background = 'rgba(255,107,0,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#636E72'; e.currentTarget.style.background = 'transparent' }}>
                {t(s.key, s.fallback)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Mobile menu accordion section — a tappable row with chevron that
// expands/collapses a list of in-page section anchors. The parent
// passes `expanded` + `onToggle` so all sections share one accordion
// state (only one open at a time). The first item inside the dropdown
// is always the page itself (`to`), so the user can navigate to the
// full page from the dropdown without leaving the menu.
function MobileSection({ id, to, label, sections, t, expanded, onToggle, onNavigate }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between py-2.5 text-sm font-medium"
        style={{ color: expanded ? '#FF6B00' : '#636E72' }}
      >
        <span>{label}</span>
        <ChevronDown
          size={16}
          className="transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      {expanded && (
        <div className="pl-4 mb-2 space-y-0.5"
          style={{ borderLeft: '2px solid #F0E8DE' }}>
          {/* Always-first: take me to the full page */}
          <Link to={to} onClick={onNavigate}
            className="block py-1.5 text-sm font-semibold no-underline"
            style={{ color: '#FF6B00' }}>
            → {label}
          </Link>
          {sections.map(s => (
            <Link key={s.id} to={`${to}#${s.id}`} onClick={onNavigate}
              className="block py-1.5 text-sm no-underline"
              style={{ color: '#9AA0A6' }}>
              {t(s.key, s.fallback)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  // 2026-06-08 — David: "menu déroulant pour chaque onglet, ça prend trop
  // de place". Accordion behavior: only one section's sub-items visible
  // at a time. null = all collapsed. Stay/About/Ambassador each have a
  // chevron; simple links (Book/SHIP/Contact) stay direct.
  const [mobileExpanded, setMobileExpanded] = useState(null)
  // Reset accordion every time the menu closes so reopening starts clean.
  function closeMobile() { setMobileOpen(false); setMobileExpanded(null) }
  function toggleSection(id) { setMobileExpanded(prev => prev === id ? null : id) }

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]
  const flags = getFeatureFlags()

  async function handleLangChange(code) {
    await changeLanguage(code)
    setLangOpen(false)
  }

  return (
    <>
      {/* Investor "ALPHA ROUND OPEN" bar moved out of the navbar — see
          AlphaBanner.jsx (rendered via a Portal in Layout so it lands
          below each page's hero image instead of above the nav). */}

      {/* ── Main Nav ── */}
      <nav className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgba(255,253,248,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: '#E8E0D8'
        }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo — rounded-square STAYLO icon */}
            <Link to="/" className="flex items-center no-underline" aria-label="STAYLO">
              <img
                src="/staylo-icon.svg"
                alt="STAYLO"
                className="h-10 w-10 sm:h-11 sm:w-11"
                width="44"
                height="44"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <NavDropdown to="/splash" label={t('nav.home', 'Stay')} sections={splashSections} t={t} />
              <Link to="/ota" className="text-sm font-medium no-underline transition-colors"
                style={{ color: '#636E72' }}
                onMouseEnter={e => e.target.style.color = '#FF6B00'}
                onMouseLeave={e => e.target.style.color = '#636E72'}>
                {t('nav.book', 'Book')}
              </Link>
              <NavDropdown to="/vision" label={t('nav.vision', 'About')} sections={visionSections} t={t} />
              <Link to="/submit" className="text-sm font-medium no-underline transition-colors"
                style={{ color: '#636E72' }}
                onMouseEnter={e => e.target.style.color = '#FF6B00'}
                onMouseLeave={e => e.target.style.color = '#636E72'}>
                {t('nav.submit', 'For Hoteliers')}
              </Link>
              <Link to="/ship" className="text-sm font-bold no-underline transition-colors"
                style={{ color: '#636E72' }}
                onMouseEnter={e => e.target.style.color = '#00B894'}
                onMouseLeave={e => e.target.style.color = '#636E72'}>
                {t('nav.ship', 'SHIP')}
              </Link>
              <NavDropdown to="/ambassador" label={t('nav.ambassador', 'Ambassador')} sections={ambassadorSections} t={t} />

              {/* (Review-mode shortcuts Dashboard/Messenger/Guest App/Admin
                  removed — they were used for the internal walk-through
                  and don't belong in the public marketing nav. The same
                  surfaces remain reachable from the dashboard sidebar
                  once a user is signed in.) */}

              {/* Language */}
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{ color: '#636E72' }}>
                  <Globe size={15} />
                  <span>{currentLang.code.toUpperCase()}</span>
                  <ChevronDown size={13} />
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg py-2 max-h-80 overflow-y-auto z-50"
                      style={{ border: '1.5px solid #E8E0D8' }}>
                      {languages.map(lang => (
                        <button key={lang.code} onClick={() => handleLangChange(lang.code)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-orange/5 flex items-center gap-2 ${
                            i18n.language === lang.code ? 'font-semibold' : ''
                          }`}
                          style={{ color: i18n.language === lang.code ? '#FF6B00' : '#636E72' }}>
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
                    <button className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                      style={{ border: '1.5px solid #E8E0D8', color: '#2D3436' }}>
                      {t('nav.dashboard', 'Dashboard')}
                    </button>
                  </Link>
                  <button onClick={signOut} className="text-sm" style={{ color: '#B2BEC3' }}>
                    {t('nav.logout', 'Log out')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <button className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                      style={{ border: '1.5px solid #E8E0D8', color: '#2D3436' }}>
                      {t('nav.login', 'Sign in')}
                    </button>
                  </Link>
                  <Link to="/submit">
                    <button className="btn-primary !py-2.5 !px-5 !text-sm">
                      {t('nav.register', 'List your hotel')}
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                  style={{ background: '#F8F6F0', color: '#636E72' }}>
                  <Globe size={14} />
                  <span className="text-xs font-bold">{currentLang.code.toUpperCase()}</span>
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg py-2 max-h-80 overflow-y-auto z-50"
                      style={{ border: '1.5px solid #E8E0D8' }}>
                      {languages.map(lang => (
                        <button key={lang.code} onClick={() => { handleLangChange(lang.code); setLangOpen(false) }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2`}
                          style={{ color: i18n.language === lang.code ? '#FF6B00' : '#636E72' }}>
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button className="p-2 rounded-xl"
                onClick={() => mobileOpen ? closeMobile() : setMobileOpen(true)}
                style={{ color: '#2D3436' }}>
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu — sits inside the sticky <nav>. The nav header is
            h-16 (64px) so the open menu is capped at `100vh - 4rem` with
            its own scroll. overscroll-contain stops the scroll bleeding
            back to the page when you hit the top/bottom of the menu.
            2026-06-08 (v2) — David: "menu déroulant pour chaque onglet
            ça prend trop de place + remonte login/join/dashboard en
            haut". Auth now sits at the top, and the three sections that
            have sub-items (Stay / About / Ambassador) collapse into
            accordion-style dropdowns triggered by tapping the row.
            Simple links (Book / SHIP / For Hoteliers / Contact) stay
            inline. */}
        {mobileOpen && (
          <div className="md:hidden bg-white overflow-y-auto overscroll-contain"
               style={{ borderTop: '1.5px solid #E8E0D8', maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="px-4 py-4 space-y-2">

              {/* ── Auth (top) ── */}
              <div className="pb-3 space-y-2" style={{ borderBottom: '1.5px solid #E8E0D8' }}>
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={closeMobile}>
                      <button className="w-full px-5 py-2.5 rounded-full text-sm font-semibold"
                        style={{ border: '1.5px solid #E8E0D8', color: '#2D3436' }}>
                        {t('nav.dashboard', 'Dashboard')}
                      </button>
                    </Link>
                    <button onClick={() => { signOut(); closeMobile() }}
                      className="w-full text-sm py-2"
                      style={{ color: '#B2BEC3' }}>
                      {t('nav.logout', 'Log out')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={closeMobile}>
                      <button className="w-full px-5 py-2.5 rounded-full text-sm font-semibold"
                        style={{ border: '1.5px solid #E8E0D8', color: '#2D3436' }}>
                        {t('nav.login', 'Sign in')}
                      </button>
                    </Link>
                    <Link to="/submit" onClick={closeMobile}>
                      <button className="btn-primary w-full">
                        {t('nav.register', 'List your hotel')}
                      </button>
                    </Link>
                  </>
                )}
              </div>

              {/* ── Stay (accordion) ── */}
              <MobileSection
                id="stay" to="/splash" label={t('nav.home', 'Stay')}
                sections={splashSections} t={t}
                expanded={mobileExpanded === 'stay'}
                onToggle={() => toggleSection('stay')}
                onNavigate={closeMobile}
              />

              {/* ── Book (simple link, no sub-items) ── */}
              <Link to="/ota" onClick={closeMobile}
                className="block py-2.5 text-sm font-medium no-underline"
                style={{ color: '#636E72' }}>
                {t('nav.book', 'Book')}
              </Link>

              {/* ── About (accordion) ── */}
              <MobileSection
                id="vision" to="/vision" label={t('nav.vision', 'About')}
                sections={visionSections} t={t}
                expanded={mobileExpanded === 'vision'}
                onToggle={() => toggleSection('vision')}
                onNavigate={closeMobile}
              />

              {/* ── For Hoteliers (simple link) ── */}
              <Link to="/submit" onClick={closeMobile}
                className="block py-2.5 text-sm font-medium no-underline"
                style={{ color: '#636E72' }}>
                {t('nav.submit', 'For Hoteliers')}
              </Link>

              {/* ── SHIP (simple link, bold) ── */}
              <Link to="/ship" onClick={closeMobile}
                className="block py-2.5 text-sm font-bold no-underline"
                style={{ color: '#636E72' }}>
                {t('nav.ship', 'SHIP')}
              </Link>

              {/* ── Ambassador (accordion) ── */}
              <MobileSection
                id="ambassador" to="/ambassador" label={t('nav.ambassador', 'Ambassador')}
                sections={ambassadorSections} t={t}
                expanded={mobileExpanded === 'ambassador'}
                onToggle={() => toggleSection('ambassador')}
                onNavigate={closeMobile}
              />

              {/* ── Contact (simple link) ── */}
              <a href="mailto:contact@staylo.app" onClick={closeMobile}
                className="block py-2.5 text-sm font-medium no-underline"
                style={{ color: '#636E72' }}>
                {t('nav.contact', 'Contact')}
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
