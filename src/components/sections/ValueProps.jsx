const PROPS = [
  {
    emoji: '💸',
    title: '10% commission — forever',
    desc: 'Locked at 10%. No hidden fees, no surge pricing. Only a 90% member vote can ever change it.',
    gradient: 'linear-gradient(135deg, #FFF0E0, #FFDCB8)',
    borderColor: 'rgba(255,107,0,0.15)',
  },
  {
    emoji: '🗳️',
    title: '1 property = 1 vote',
    desc: 'Every hotel has an equal voice. Democratic governance on all platform decisions.',
    gradient: 'linear-gradient(135deg, #E0FFF5, #B8FFEA)',
    borderColor: 'rgba(0,184,148,0.15)',
  },
  {
    emoji: '💎',
    title: 'Annual dividends',
    desc: '20% of net profit distributed to shareholders every year. Own the platform, share the profit.',
    gradient: 'linear-gradient(135deg, #F0E8FF, #DFD0FF)',
    borderColor: 'rgba(108,92,231,0.15)',
  },
  {
    emoji: '🪙',
    title: 'Earn $STAY tokens',
    desc: 'Every night booked earns $STAY tokens. Use them for discounts, governance, or trade.',
    gradient: 'linear-gradient(135deg, #FFE8F5, #FFCDE8)',
    borderColor: 'rgba(255,60,180,0.15)',
  },
]

export function ValueProps() {
  return (
    <section style={{ background: '#FFFDF8', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Why Staylo</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            More than a booking platform.<br />
            It's <span className="text-gradient">your</span> platform.
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROPS.map(prop => (
            <div key={prop.title} className="card-hover rounded-3xl p-7"
              style={{
                background: prop.gradient,
                border: `1.5px solid ${prop.borderColor}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              <span className="text-4xl block mb-5">{prop.emoji}</span>
              <h3 className="font-black text-lg mb-2" style={{ color: '#2D3436' }}>{prop.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#636E72' }}>{prop.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
