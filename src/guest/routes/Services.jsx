// =====================================================================
// Hotel services catalogue — everything the guest can book in 1 tap.
// =====================================================================
// Restaurants, spa, activities, concierge, room service. Each card
// expands into a booking flow (datetime picker + party size). Phase 1
// shows a static catalogue with clickable cards that "fake" the
// booking — the demo punchline is "look how easy it is for the
// guest, look how it flows back to the staff's screen".

const MOCK_SERVICES = {
  restaurant: [
    { name: 'Phangan\'s Pizza',  emoji: '🍕', hours: '12:00 – 23:00', tag: 'Italian',  desc: 'Wood-fired pizza, beachfront seating, sunset specials.',         availability: '3 slots tonight' },
    { name: 'Oriental',          emoji: '🥢', hours: '18:00 – 22:30', tag: 'Thai',     desc: 'Chef Theerawat\'s Thai tasting menu — book ahead.',                availability: '7 slots this week' },
    { name: 'By Nanda Lounge',   emoji: '🍹', hours: '17:00 – 01:00', tag: 'Bar',     desc: 'Cocktails, light bites and acoustic sets Fri-Sat.',                 availability: 'Walk-in welcome' },
  ],
  spa: [
    { name: 'Traditional Thai massage',  emoji: '🧖', hours: '60 / 90 / 120 min', tag: '฿1,200 / ฿1,800 / ฿2,400', desc: 'Pressure-point release by certified therapists.',         availability: 'Today 14:00, 16:00' },
    { name: 'Aromatic oil massage',      emoji: '💆', hours: '60 / 90 min',       tag: '฿1,400 / ฿2,000',         desc: 'Lavender, coconut or jasmine — your choice of oil.',     availability: 'Today 15:30' },
    { name: 'Couples retreat',           emoji: '💑', hours: '120 min',           tag: '฿4,800 (2 pers.)',        desc: 'Side-by-side cabin with private rinse pool.',           availability: 'Tomorrow only' },
  ],
  activity: [
    { name: 'Sunrise yoga',     emoji: '🧘', hours: '6:30 – 7:30',  tag: 'Free for guests', desc: 'Beach-side flow with Malai. Mats provided.',         availability: 'Tomorrow + Thursday' },
    { name: 'Kayak rental',     emoji: '🛶', hours: 'All day',       tag: '฿400 / hour',     desc: 'Single or double kayaks, life vests included.',     availability: '8 available' },
    { name: 'Sunset boat tour', emoji: '⛵', hours: '17:30 – 19:30', tag: '฿1,800 / pers.',  desc: 'Catamaran cruise around Phangan with snacks.',     availability: '6 seats Friday' },
    { name: 'Diving day-trip',  emoji: '🤿', hours: '8:00 – 17:00',  tag: 'From ฿3,600',     desc: 'Two-tank dive at Sail Rock, all gear, lunch.',     availability: 'Next: Saturday' },
  ],
  concierge: [
    { name: 'Ask the team anything', emoji: '🛎️', hours: '24/7',         tag: 'Avg. reply 4 min', desc: 'Towels, transport, restaurant recos, lost item…', availability: 'Online now' },
    { name: 'Order to your room',    emoji: '🍱', hours: '11:00 – 23:00', tag: 'Menu in app',      desc: 'Anything from the kitchen, delivered by Niran.',  availability: 'Open' },
    { name: 'Late check-out',        emoji: '🕒', hours: 'Departure day', tag: 'Subject to avail.',desc: 'Request a 14:00 or 16:00 check-out.',             availability: 'Available' },
  ],
}

const CAT_LABELS = {
  restaurant: '🍽️ Restaurants',
  spa:        '🧖 Spa & wellness',
  activity:   '🌊 Activities',
  concierge:  '🛎️ Concierge',
}

export default function GuestServices() {
  // Read ?cat= from the URL to focus a section (matches the Home tiles).
  const params = new URLSearchParams(window.location.search)
  const focusCat = params.get('cat')
  const cats = focusCat && CAT_LABELS[focusCat]
    ? [focusCat]
    : Object.keys(CAT_LABELS)
  return (
    <div className="guest-page">
      <div className="guest-page-title">{focusCat ? CAT_LABELS[focusCat] : 'Services'}</div>
      <div className="guest-page-sub">By Nanda Phangan · everything is one tap away.</div>
      {cats.map(cat => (
        <section key={cat} className="guest-cat">
          {!focusCat && <div className="guest-cat-title">{CAT_LABELS[cat]}</div>}
          <div className="guest-cat-list">
            {MOCK_SERVICES[cat].map((s, i) => (
              <ServiceCard key={i} svc={s} />
            ))}
          </div>
        </section>
      ))}
      {focusCat && (
        <div className="guest-actions">
          <a href="/services" className="guest-btn-ghost">← All services</a>
        </div>
      )}
    </div>
  )
}

function ServiceCard({ svc }) {
  return (
    <article className="guest-svc">
      <div className="guest-svc-em">{svc.emoji}</div>
      <div className="guest-svc-body">
        <div className="guest-svc-name">{svc.name}</div>
        <div className="guest-svc-meta">{svc.hours} · {svc.tag}</div>
        <div className="guest-svc-desc">{svc.desc}</div>
        <div className="guest-svc-foot">
          <span className="guest-svc-avail">{svc.availability}</span>
          <button className="guest-svc-cta" onClick={(e) => {
            e.preventDefault()
            alert(`Booking flow opens here — phase 2.\n\n"${svc.name}"`)
          }}>Book</button>
        </div>
      </div>
    </article>
  )
}
