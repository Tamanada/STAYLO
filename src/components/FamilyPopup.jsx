/*
  FamilyPopup — landing page modal that appears once per session on Home /
  Splash / OTA. Message: "Alone, it is impossible. Together, we are
  unstoppable." — invites hoteliers to stop wasting time on their own
  booking pages and join STAYLO.

  Dismiss = writes localStorage flag so it doesn't re-fire the same session
  (session-key includes today's date to allow re-showing after 24h).
*/
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const SESSION_KEY_PREFIX = 'staylo_family_popup_seen_'
const SHOW_DELAY_MS = 1200

function todayKey() {
  const d = new Date()
  return SESSION_KEY_PREFIX + d.toISOString().slice(0, 10)
}

export default function FamilyPopup() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(todayKey())) return
    } catch {}
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(todayKey(), '1') } catch {}
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-popup-title"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 8, 30, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'staylo-fade-in 240ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520, width: '100%',
          background: 'white',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
          position: 'relative',
          animation: 'staylo-slide-up 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Gradient header band */}
        <div style={{
          height: 6,
          background: 'linear-gradient(90deg, #FF6B00 0%, #FF1F70 50%, #7E22CE 100%)',
        }} />

        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('family_popup.close', 'Close')}
          style={{
            position: 'absolute', top: 18, right: 18,
            background: 'rgba(0,0,0,0.05)',
            border: 'none', borderRadius: 999,
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 160ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.10)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        >
          <X size={18} color="#636E72" />
        </button>

        <div style={{ padding: '36px 32px 28px' }}>
          {/* Sparkle icon in gradient circle */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 50%, #7E22CE 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18,
            boxShadow: '0 8px 24px rgba(255, 107, 0, 0.25)',
          }}>
            <Sparkles size={28} color="white" strokeWidth={2.4} />
          </div>

          {/* Title */}
          <h2 id="family-popup-title" style={{
            fontSize: 26, fontWeight: 900, lineHeight: 1.2,
            color: '#1A1A2E', letterSpacing: '-0.5px',
            margin: '0 0 12px 0',
          }}>
            {t('family_popup.title', 'Alone, it is impossible. Together, we are unstoppable.')}
          </h2>

          {/* Body message */}
          <p style={{
            fontSize: 15, lineHeight: 1.55, color: '#4A5568',
            margin: '0 0 22px 0',
          }}>
            {t('family_popup.body', 'Stop wasting your time to make your web site loading bookings, join the family!')}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to="/submit"
              onClick={dismiss}
              style={{
                flex: 1, minWidth: 180,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 100%)',
                color: 'white',
                fontWeight: 800, fontSize: 15,
                padding: '13px 20px',
                borderRadius: 999,
                textAlign: 'center',
                boxShadow: '0 8px 20px rgba(255, 107, 0, 0.35)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 107, 0, 0.42)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 0, 0.35)' }}
            >
              {t('family_popup.cta_join', 'Join the family')}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              style={{
                background: 'transparent',
                color: '#636E72',
                fontWeight: 600, fontSize: 14,
                padding: '13px 20px',
                borderRadius: 999,
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'background 160ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {t('family_popup.cta_later', 'Maybe later')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes staylo-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes staylo-slide-up { from { opacity: 0; transform: translateY(20px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}
