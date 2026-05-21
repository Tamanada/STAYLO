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
  const s = MOCK_STAY
  return (
    <div className="guest-page">
      {/* Hero card — the centrepiece. Gradient + property name + dates */}
      <section className="guest-hero">
        <div className="guest-hero-eyebrow">Your current stay</div>
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
        <Tile to="/services?cat=restaurant" emoji="🍽️" label="Book a table"       hint="2 restaurants" />
        <Tile to="/services?cat=spa"        emoji="🧖" label="Spa & wellness"     hint="From 14:00" />
        <Tile to="/services?cat=activity"   emoji="🌊" label="Activities"         hint="Kayak, yoga…" />
        <Tile to="/services?cat=concierge"  emoji="🛎️" label="Ask reception"      hint="Reply ≤ 5 min" />
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
