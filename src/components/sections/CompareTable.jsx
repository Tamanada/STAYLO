const ROWS = [
  {
    feature: 'Commission rate',
    booking: { text: '17-22%', bad: true },
    agoda: { text: '17%', bad: true },
    airbnb: { text: '15%', bad: true },
    staylo: { text: '10% locked forever', good: true },
  },
  {
    feature: 'Co-ownership',
    booking: { text: '✗', bad: true },
    agoda: { text: '✗', bad: true },
    airbnb: { text: '✗', bad: true },
    staylo: { text: 'Real shares ✓', good: true },
  },
  {
    feature: 'Governance vote',
    booking: { text: '✗', bad: true },
    agoda: { text: '✗', bad: true },
    airbnb: { text: '✗', bad: true },
    staylo: { text: '1 property = 1 vote ✓', good: true },
  },
  {
    feature: 'Annual dividends',
    booking: { text: '✗', bad: true },
    agoda: { text: '✗', bad: true },
    airbnb: { text: '✗', bad: true },
    staylo: { text: '20% net profit ✓', good: true },
  },
  {
    feature: 'Token rewards',
    booking: { text: '✗', bad: true },
    agoda: { text: '✗', bad: true },
    airbnb: { text: '✗', bad: true },
    staylo: { text: '$STAY per night ✓', good: true },
  },
  {
    feature: 'Commission fixed?',
    booking: { text: '✗ No', bad: true },
    agoda: { text: '✗ No', bad: true },
    airbnb: { text: '✗ No', bad: true },
    staylo: { text: '✓ 90% vote only', good: true },
  },
]

export function CompareTable() {
  return (
    <section style={{ background: '#F8F6F0', padding: '80px 5%' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Compare</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            Why hoteliers <span className="text-gradient">switch</span>
          </h2>
        </div>

        {/* Table */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: 'white',
            border: '1.5px solid #E8E0D8',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="text-left px-6 py-5 text-sm font-bold" style={{ color: '#2D3436' }}>Feature</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Booking.com</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Agoda</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Airbnb</th>
                  <th className="text-center px-4 py-5 text-sm font-bold rounded-tr-xl"
                    style={{ color: '#00B894', background: 'rgba(0,184,148,0.08)' }}>
                    Staylo ✓
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F0EDE8' }}>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#2D3436' }}>{row.feature}</td>
                    <Cell data={row.booking} />
                    <Cell data={row.agoda} />
                    <Cell data={row.airbnb} />
                    <td className="text-center px-4 py-4 text-sm font-bold"
                      style={{ color: '#00B894', background: 'rgba(0,184,148,0.04)' }}>
                      {row.staylo.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Staylo vs Others */}
          <div className="md:hidden p-5 space-y-4">
            {ROWS.map((row, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: '#FAFAF8', border: '1px solid #F0EDE8' }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#B2BEC3' }}>{row.feature}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#FF7675' }}>{row.booking.text}</span>
                  <span className="text-sm font-bold" style={{ color: '#00B894' }}>{row.staylo.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cell({ data }) {
  return (
    <td className="text-center px-4 py-4 text-sm"
      style={{ color: data.bad ? '#FF7675' : '#636E72' }}>
      {data.text}
    </td>
  )
}
