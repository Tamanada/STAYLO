/*
  FamilyPopup v2 — explosive, memorable, colorful, balanced.

  Structure:
  - Big card 600x auto with 28px radius
  - Top half: full brand gradient header (orange → pink → purple) with
    floating sparkle particles + palm silhouettes; big hands-together
    icon in white circle "floating" over the seam.
  - Bottom half: white content zone with editorial typography — small
    italic prelude, MASSIVE headline with "Together" in gradient, warm
    body, gradient CTA with arrow slide, quiet "Not now" link.

  Session dismiss: localStorage flag keyed by today's date.
*/
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const SESSION_KEY_PREFIX = 'staylo_family_popup_seen_'
const SHOW_DELAY_MS = 400

function todayKey() {
  const d = new Date()
  return SESSION_KEY_PREFIX + d.toISOString().slice(0, 10)
}

export default function FamilyPopup() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem(todayKey())) return } catch {}
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(todayKey(), '1') } catch {}
    setOpen(false)
  }

  if (!open) return null

  // Title's "Together" word gets a gradient treatment — split for that
  const raw = t('family_popup.title', 'Alone, it is impossible. Together, we are unstoppable.')
  const parts = raw.split(/(?=\bTogether\b|\bEnsemble\b|\bJuntos\b|\bZusammen\b|\bInsieme\b|\bВместе\b|\b共に\b|\b众志\b|\b共同\b|\bمعًا\b|\bसाथ\b|\bBersama\b|\bအတူ\b|\bร่วม\b)/i)
  const before = parts[0] || raw
  const rest = parts[1] || ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-popup-title"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 8, 30, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'staylo-fp-fade 260ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 600, width: '100%',
          background: 'white',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
          position: 'relative',
          animation: 'staylo-fp-pop 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* ────────── HEADER: 3Elephants artwork with scrim for legibility ────────── */}
        <div style={{
          position: 'relative',
          height: 168,
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF3B7E 45%, #7E22CE 100%)',
          overflow: 'hidden',
        }}>
          {/* Hero artwork — <picture> so we serve webp when supported */}
          <picture>
            <source srcSet="/3Elephants.webp" type="image/webp" />
            <img
              src="/3Elephants.png"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 40%',
              }}
            />
          </picture>
          {/* Dark scrim so the STAYLO FAMILY badge + close button stay legible
              over any part of the image. Stronger at top corners, softer in
              the middle where the icon lives. */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(15,8,30,0.35) 0%, rgba(15,8,30,0.15) 45%, rgba(15,8,30,0.05) 100%)',
            pointerEvents: 'none',
          }} />

          {/* Small "family" badge top-left */}
          <div style={{
            position: 'absolute', top: 18, left: 20,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: 'white',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
            padding: '5px 12px', borderRadius: 999,
            textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            🌴 STAYLO Family
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('family_popup.close', 'Close')}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 160ms ease, transform 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'rotate(90deg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'rotate(0)' }}
          >
            <X size={18} color="white" strokeWidth={2.4} />
          </button>
        </div>

        {/* ────────── FLOATING ICON (straddles the seam) ────────── */}
        <div style={{
          position: 'absolute', top: 128, left: '50%',
          transform: 'translateX(-50%)',
          width: 96, height: 96, borderRadius: 24,
          background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(126,34,206,0.25), 0 0 0 6px white',
          animation: 'staylo-fp-float 3.6s ease-in-out infinite',
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.12)',
          }}>
            <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>🤝</span>
          </div>
        </div>

        {/* ────────── BODY: white content zone ────────── */}
        <div style={{ padding: '68px 36px 30px', textAlign: 'center' }}>

          {/* Massive title with gradient word */}
          <h2 id="family-popup-title" style={{
            fontSize: 32, fontWeight: 900, lineHeight: 1.12,
            color: '#1A1A2E', letterSpacing: '-0.8px',
            margin: '0 0 14px 0',
          }}>
            {before}
            {rest && (
              <span style={{
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 50%, #7E22CE 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic',
              }}>
                {rest}
              </span>
            )}
          </h2>

          {/* Body message */}
          <p style={{
            fontSize: 16, lineHeight: 1.55, color: '#4A5568',
            margin: '0 auto 26px', maxWidth: 460,
          }}>
            {t('family_popup.body', 'Stop wasting your time to make your web site loading bookings, join the family!')}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <Link
              to="/submit"
              onClick={dismiss}
              className="staylo-fp-cta"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #C026D3 100%)',
                backgroundSize: '200% 200%',
                color: 'white',
                fontWeight: 800, fontSize: 16,
                padding: '15px 28px',
                borderRadius: 999,
                boxShadow: '0 10px 28px rgba(255, 31, 112, 0.35)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'transform 180ms ease, box-shadow 180ms ease, background-position 400ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 14px 36px rgba(255, 31, 112, 0.5)'
                e.currentTarget.style.backgroundPosition = '100% 100%'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(255, 31, 112, 0.35)'
                e.currentTarget.style.backgroundPosition = '0% 0%'
              }}
            >
              {t('family_popup.cta_join', 'Join the family')}
              <ArrowRight size={18} strokeWidth={2.6} />
            </Link>

            <button
              type="button"
              onClick={dismiss}
              style={{
                background: 'transparent',
                color: '#8892A0',
                fontWeight: 600, fontSize: 13,
                padding: '10px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(0,0,0,0.15)',
                transition: 'color 160ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A2E'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8892A0'}
            >
              {t('family_popup.cta_later', 'Maybe later')}
            </button>
          </div>

          {/* Footer heart tag */}
          <div style={{
            marginTop: 22, fontSize: 11, color: '#A0A8B0',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            letterSpacing: 0.5,
          }}>
            <Heart size={11} fill="#FF1F70" color="#FF1F70" strokeWidth={0} />
            <span>staylo.app — Built with hoteliers, <em style={{ color: '#FF6B00', fontStyle: 'italic', fontWeight: 700 }}>for hoteliers.</em></span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes staylo-fp-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes staylo-fp-pop { from { opacity: 0; transform: translateY(24px) scale(0.94) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes staylo-fp-float { 0%, 100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(-6px) } }
      `}</style>
    </div>
  )
}
