// =====================================================================
// Booking summary — confirmation page for the current/upcoming stay.
// =====================================================================
// Shows the guest a clean recap of what they reserved: hotel, dates,
// room, total paid, and what's included. The "Modify" / "Cancel"
// actions are stubs for phase 1 (open a contact-reception modal in
// phase 2).

const MOCK_BOOKING = {
  ref: 'STY-2K26-04219',
  hotel_name: 'By Nanda Phangan',
  hotel_location: 'Koh Phangan, Thailand',
  room_label: 'Garden View · Room 204',
  arrival: '2026-05-22',
  departure: '2026-05-26',
  guests_adults: 2,
  guests_children: 0,
  total_thb: 14600,
  paid_thb: 14600,
  payment_method: 'Visa •• 4242',
  inclusions: [
    'Breakfast for 2 (daily)',
    'Free WiFi',
    'Beach access',
    'Yoga class (1 per stay)',
  ],
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default function GuestBooking() {
  const b = MOCK_BOOKING
  const nights = Math.round((new Date(b.departure) - new Date(b.arrival)) / 86400000)
  return (
    <div className="guest-page">
      <div className="guest-page-title">Your booking</div>
      <div className="guest-page-sub">Reference {b.ref}</div>

      <section className="guest-card">
        <div className="guest-card-row">
          <div className="guest-card-lbl">Hotel</div>
          <div className="guest-card-val">{b.hotel_name}<br/><span className="guest-card-sub">{b.hotel_location}</span></div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Room</div>
          <div className="guest-card-val">{b.room_label}</div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Arrival</div>
          <div className="guest-card-val">{fmtDate(b.arrival)}</div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Departure</div>
          <div className="guest-card-val">{fmtDate(b.departure)}<br/><span className="guest-card-sub">{nights} night{nights>1?'s':''}</span></div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Guests</div>
          <div className="guest-card-val">{b.guests_adults} adult{b.guests_adults>1?'s':''}{b.guests_children?`, ${b.guests_children} children`:''}</div>
        </div>
      </section>

      <section className="guest-card">
        <div className="guest-card-title">What's included</div>
        <ul className="guest-card-list">
          {b.inclusions.map((it, i) => <li key={i}>✓ {it}</li>)}
        </ul>
      </section>

      <section className="guest-card">
        <div className="guest-card-row">
          <div className="guest-card-lbl">Total</div>
          <div className="guest-card-val guest-card-val-big">฿{b.total_thb.toLocaleString()}</div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Paid</div>
          <div className="guest-card-val">฿{b.paid_thb.toLocaleString()}<br/><span className="guest-card-sub">{b.payment_method}</span></div>
        </div>
        <div className="guest-card-row">
          <div className="guest-card-lbl">Balance</div>
          <div className="guest-card-val">฿0</div>
        </div>
      </section>

      <section className="guest-actions">
        <button className="guest-btn-secondary">Modify dates</button>
        <button className="guest-btn-secondary">Add a room</button>
        <button className="guest-btn-ghost">Cancellation policy</button>
      </section>

      <p className="guest-page-note">
        Need help? Tap <a href="/services?cat=concierge">Ask reception</a> — a
        team member replies in under 5 minutes during business hours.
      </p>
    </div>
  )
}
