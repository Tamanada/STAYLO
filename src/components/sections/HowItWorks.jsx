const STEPS = [
  {
    num: 1,
    emoji: '🔍',
    title: 'Book your stay',
    desc: 'Search, compare, and book hotels at the fairest commission on the market. Same great hotels, better deal.',
    color: '#FF6B00',
    bg: 'rgba(255,107,0,0.1)',
  },
  {
    num: 2,
    emoji: '🪙',
    title: 'Earn $STAY tokens',
    desc: 'Every night booked earns $STAY tokens. Use them for discounts, vote on platform decisions, or trade.',
    color: '#00B894',
    bg: 'rgba(0,184,148,0.1)',
  },
  {
    num: 3,
    emoji: '🤝',
    title: 'Support hoteliers',
    desc: 'Your booking directly supports independent hoteliers. 90% stays with the hotel. No middleman taking 25%.',
    color: '#6C5CE7',
    bg: 'rgba(108,92,231,0.1)',
  },
]

export function HowItWorks() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0F8 50%, #F0F4FF 100%)',
      padding: '80px 5%',
    }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">How it works</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            Book. Earn. <span className="text-gradient">Impact.</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map(step => (
            <div key={step.num} className="card-hover rounded-3xl p-7 text-center"
              style={{
                background: 'white',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              {/* Number circle */}
              <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: step.bg }}>
                <span className="text-xl font-black" style={{ color: step.color }}>{step.num}</span>
              </div>
              <span className="text-3xl block mb-4">{step.emoji}</span>
              <h3 className="font-black text-lg mb-2" style={{ color: '#2D3436' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#636E72' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
