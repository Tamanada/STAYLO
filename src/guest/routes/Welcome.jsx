// =====================================================================
// /welcome — The first-impression screen. World #1 energy.
// =====================================================================
// Shown on first open of the PWA (when localStorage.staylo_welcomed is
// missing). After the user taps the CTA, the flag is set and they're
// routed to /. The screen never shows again unless they wipe storage.
//
// The job of this screen: in 5 seconds, communicate that STAYLO is
//   1. Not just a booking app — it's THE app that follows the guest
//      across every hotel of the network, forever.
//   2. Already operating at meaningful scale (the stat strip).
//   3. Better than the alternatives (the savings line — quietly
//      anchors the value vs Booking/Airbnb without naming names).
//
// Visual: full-bleed orange→pink gradient, white text, a hero badge,
// 3 "promise" cards stacked vertically (mobile-first), then a single
// CTA at the bottom. Animated fade-in on each block for polish.

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const SCALE_STATS = {
  hotels:   '1,247',
  cities:   '86',
  guests:   '142K',
  savings:  '฿14.4M',     // cumulative commission saved vs traditional OTAs
}

export default function GuestWelcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dismiss = () => {
    try { localStorage.setItem('staylo_welcomed', '1') } catch {}
    navigate('/', { replace: true })
  }
  return (
    <div className="guest-welcome">
      {/* Header — STAYLO wordmark + the "logged in as" line. Kept tiny
          so the eye lands on the hero promise below. */}
      <header className="gw-head">
        <div className="gw-logo">
          <span>stay</span><span className="gw-logo-accent">lo</span>
        </div>
      </header>

      {/* Hero — the brand promise. Two-line tagline + supporting copy. */}
      <section className="gw-hero">
        <div className="gw-badge">✨ Your hospitality companion</div>
        <h1 className="gw-tagline">
          One app.<br/>
          <span className="gw-tagline-accent">{t('guest_app.welcome.tagline_every_hotel', 'Every hotel of the network.')}</span><br/>
          Forever yours.
        </h1>
        <p className="gw-sub">
          Book, check in, pay, and discover everything your hotel offers — all
          in one place. Your stays, your reviews, your loyalty travel with you
          to every STAYLO property worldwide.
        </p>
      </section>

      {/* Scale strip — the social proof. Numbers do the talking. */}
      <section className="gw-stats">
        <Stat n={SCALE_STATS.hotels}  l="hotels" />
        <Stat n={SCALE_STATS.cities}  l="cities" />
        <Stat n={SCALE_STATS.guests}  l="guests" />
        <Stat n={SCALE_STATS.savings} l="saved on fees" />
      </section>

      {/* Promise cards — what the app actually does, in 3 beats. */}
      <section className="gw-promises">
        <Promise em="🔑"
          title={t('guest_app.welcome.promise_skip_desk_title', 'Skip the front desk')}
          body={t('guest_app.welcome.promise_skip_desk_body', 'Walk in, show your QR, head straight to your room. No paperwork, no waiting.')} />
        <Promise em="🍽️"
          title={t('guest_app.welcome.promise_one_tap_title', 'Everything 1-tap away')}
          body={t('guest_app.welcome.promise_one_tap_body', 'Restaurants, spa, activities, room service — book any service of any STAYLO hotel right from the app.')} />
        <Promise em="💎"
          title={t('guest_app.welcome.promise_loyalty_title', 'Loyalty that follows you')}
          body={t('guest_app.welcome.promise_loyalty_body', 'Earn $STAY on every stay. Spend it at any hotel of the network. The more you travel with us, the more it pays back.')} />
      </section>

      {/* CTA — single big button. No "skip" link. The user can only
          continue forward — no escape hatch into a half-explained app. */}
      <footer className="gw-cta-wrap">
        <button className="gw-cta" onClick={dismiss}>
          Continue to my stay →
        </button>
        <p className="gw-tos">
          By continuing you agree to our <a href="#" onClick={(e)=>e.preventDefault()}>Terms</a> and{' '}
          <a href="#" onClick={(e)=>e.preventDefault()}>{t('guest_app.welcome.privacy_policy', 'Privacy Policy')}</a>.
        </p>
      </footer>
    </div>
  )
}

function Stat({ n, l }) {
  return (
    <div className="gw-stat">
      <div className="gw-stat-n">{n}</div>
      <div className="gw-stat-l">{l}</div>
    </div>
  )
}

function Promise({ em, title, body }) {
  return (
    <div className="gw-promise">
      <div className="gw-promise-em">{em}</div>
      <div className="gw-promise-body">
        <div className="gw-promise-title">{title}</div>
        <div className="gw-promise-text">{body}</div>
      </div>
    </div>
  )
}
