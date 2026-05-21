// =====================================================================
// History + $STAY balance + loyalty — the "permanence" of the app.
// =====================================================================
// THIS is the screen that sells "one app, every hotel, forever".
// Past stays from multiple STAYLO properties + $STAY balance earned
// over time + loyalty tier. The visual story: the more you stay, the
// more you earn, the more the app matters.

const MOCK_HISTORY = {
  user: { name: 'Sasiwimol Wong', email: 'sasiwimol@example.com', joined: '2025-08-12' },
  loyalty: { tier: 'Silver', stays: 7, nights: 31, balance: 142 },
  stays: [
    { hotel:'By Nanda Phangan',  loc:'Koh Phangan',  arrival:'2026-05-22', nights:4,  total:14600, earned:14,  upcoming:true },
    { hotel:'Sansiri Bangkok',   loc:'Bangkok',      arrival:'2026-03-08', nights:3,  total:9600,  earned:10 },
    { hotel:'Phulay Bay Krabi',  loc:'Krabi',        arrival:'2026-01-15', nights:5,  total:22000, earned:22 },
    { hotel:'By Nanda Phangan',  loc:'Koh Phangan',  arrival:'2025-11-02', nights:6,  total:21600, earned:21 },
    { hotel:'Renaissance Pattaya',loc:'Pattaya',     arrival:'2025-09-14', nights:2,  total:7200,  earned:7  },
    { hotel:'By Nanda Phangan',  loc:'Koh Phangan',  arrival:'2025-08-12', nights:7,  total:24500, earned:24 },
    { hotel:'Sansiri Bangkok',   loc:'Bangkok',      arrival:'2025-08-04', nights:4,  total:12800, earned:13 },
    { hotel:'Sansiri Bangkok',   loc:'Bangkok',      arrival:'2025-08-01', nights:3,  total:9600,  earned:10 },
  ],
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

export default function GuestHistory() {
  const h = MOCK_HISTORY
  return (
    <div className="guest-page">
      <div className="guest-page-title">Your STAYLO journey</div>
      <div className="guest-page-sub">{h.user.name} · member since {fmtDate(h.user.joined)}</div>

      {/* Loyalty stats card — earned tier, total stays, total nights, $STAY */}
      <section className="guest-loyalty-card">
        <div className="guest-loyalty-tier">
          <div className="guest-loyalty-tier-name">{h.loyalty.tier}</div>
          <div className="guest-loyalty-tier-lbl">Tier</div>
        </div>
        <div className="guest-loyalty-stats">
          <Stat n={h.loyalty.stays}  l="Stays" />
          <Stat n={h.loyalty.nights} l="Nights" />
          <Stat n={h.loyalty.balance} l="$STAY" />
        </div>
      </section>

      {/* Tier perks — visible motivation to keep earning */}
      <section className="guest-card">
        <div className="guest-card-title">Silver perks (active)</div>
        <ul className="guest-card-list">
          <li>✓ 1% $STAY back on every stay</li>
          <li>✓ Free room upgrade (subject to avail.)</li>
          <li>✓ Late check-out without extra fee</li>
        </ul>
        <div className="guest-card-foot">
          <div className="guest-card-foot-progress">
            <div className="guest-card-foot-bar"><div className="guest-card-foot-fill" style={{width:'62%'}}/></div>
            <span>9 more nights → <b>Gold</b> (2% back + free breakfast)</span>
          </div>
        </div>
      </section>

      {/* Stay log — past trips across the network */}
      <section>
        <div className="guest-section-title">Past stays</div>
        <ul className="guest-stay-list">
          {h.stays.map((s, i) => (
            <li key={i} className={'guest-stay' + (s.upcoming ? ' upcoming' : '')}>
              <div className="guest-stay-em">{s.upcoming ? '⏰' : '🏨'}</div>
              <div className="guest-stay-body">
                <div className="guest-stay-name">{s.hotel}{s.upcoming && <span className="guest-stay-pill">Upcoming</span>}</div>
                <div className="guest-stay-meta">{s.loc} · {fmtDate(s.arrival)} · {s.nights}n</div>
              </div>
              <div className="guest-stay-right">
                <div className="guest-stay-total">฿{s.total.toLocaleString()}</div>
                <div className="guest-stay-earned">+{s.earned} $STAY</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({ n, l }) {
  return (
    <div className="guest-loyalty-stat">
      <div className="guest-loyalty-stat-n">{n}</div>
      <div className="guest-loyalty-stat-l">{l}</div>
    </div>
  )
}
