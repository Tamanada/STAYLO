// =====================================================================
// Stay overview (home) — what the guest sees when they open the app.
// =====================================================================
//
// If they have a current/upcoming stay → big card with hotel + dates
// + the next CTA (check-in if today, room key if checked in, etc.).
// If they don't → empty state pointing them to /booking.
//
// MOCKUP for now — current stay is hard-coded; real Supabase wiring
// in phase 2. The data shape is what the real backend will return.

import { useTranslation } from 'react-i18next'

const MOCK_STAY = {
  hotel_name: 'By Nanda Phangan',
  hotel_location: 'Koh Phangan, Thailand',
  hotel_hero_url: null,            // would be CDN URL in prod
  room_label: 'Garden View · Room 204',
  arrival: '2026-05-22',
  departure: '2026-05-26',
  status: 'upcoming',              // 'upcoming' | 'checked_in' | 'checked_out'
  staylo_balance: 142,
  next_activity: { name: 'Yoga sunrise', time: 'tomorrow · 6:30 AM' },
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}
function nightsBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export default function GuestHome() {
  const { t } = useTranslation()
  const s = MOCK_STAY
  return (
    <div className="guest-page">
      {/* Scale signal — tiny, ambient. Reminds the user every time
          they open the app that they're inside a network, not a
          single-hotel app. Numbers match /welcome's stat strip. */}
      <div className="guest-scale-strip">
        <span><b>1,247</b> hotels</span>
        <span className="guest-scale-dot">·</span>
        <span><b>86</b> cities</span>
        <span className="guest-scale-dot">·</span>
        <span><b>142K</b> guests on STAYLO</span>
      </div>

      {/* Hero card — the centrepiece. Gradient + property name + dates */}
      <section className="guest-hero">
        <div className="guest-hero-eyebrow">{t('guest_app.home.current_stay', 'Your current stay')}</div>
        <div className="guest-hero-title">{s.hotel_name}</div>
        <div className="guest-hero-sub">{s.hotel_location} · {s.room_label}</div>
        <div className="guest-hero-dates">
          <div>
            <div className="guest-hero-dates-lbl">Arrival</div>
            <div className="guest-hero-dates-val">{fmtDate(s.arrival)}</div>
          </div>
          <div className="guest-hero-dates-nights">{nightsBetween(s.arrival, s.departure)}n</div>
          <div className="guest-hero-dates-right">
            <div className="guest-hero-dates-lbl">Departure</div>
            <div className="guest-hero-dates-val">{fmtDate(s.departure)}</div>
          </div>
        </div>
        {s.status === 'upcoming' && (
          <a href="/checkin" className="guest-hero-cta">
            🔑 Tap to check in
          </a>
        )}
      </section>

      {/* Quick tiles — most-used actions for an in-stay guest */}
      <section className="guest-tiles">
        <Tile to="/services?cat=restaurant" emoji="🍽️" label={t('guest_app.home.tile_book_table',    'Book a table')}    hint={t('guest_app.home.tile_book_table_hint',    '2 restaurants')} />
        <Tile to="/services?cat=spa"        emoji="🧖" label={t('guest_app.home.tile_spa',           'Spa & wellness')}  hint={t('guest_app.home.tile_spa_hint',           'From 14:00')} />
        <Tile to="/services?cat=activity"   emoji="🌊" label={t('guest_app.home.tile_activities',    'Activities')}      hint={t('guest_app.home.tile_activities_hint',    'Kayak, yoga…')} />
        <Tile to="/services?cat=concierge"  emoji="🛎️" label={t('guest_app.home.tile_ask_reception', 'Ask reception')}   hint={t('guest_app.home.tile_ask_reception_hint', 'Reply ≤ 5 min')} />
      </section>

      {/* Up-next strip — the next thing on their stay agenda */}
      <section className="guest-strip">
        <div className="guest-strip-icon">⏱️</div>
        <div className="guest-strip-text">
          <div className="guest-strip-eyebrow">Up next</div>
          <div className="guest-strip-title">{s.next_activity.name}</div>
          <div className="guest-strip-sub">{s.next_activity.time}</div>
        </div>
      </section>

      {/* Loyalty teaser — $STAY balance + history shortcut */}
      <section className="guest-loyalty">
        <div className="guest-loyalty-bal">
          <span className="guest-loyalty-num">{s.staylo_balance}</span>
          <span className="guest-loyalty-tok">$STAY</span>
        </div>
        <a href="/history" className="guest-loyalty-link">View history →</a>
      </section>
    </div>
  )
}

function Tile({ to, emoji, label, hint }) {
  return (
    <a href={to} className="guest-tile">
      <div className="guest-tile-em">{emoji}</div>
      <div className="guest-tile-lbl">{label}</div>
      <div className="guest-tile-hint">{hint}</div>
    </a>
  )
}
