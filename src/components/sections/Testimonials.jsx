import { Star } from 'lucide-react'

const REVIEWS = [
  {
    stars: 5,
    quote: "Finally, a platform where hoteliers come first. We save $4,000/month on commissions and actually own part of the platform.",
    avatar: '👨‍💼',
    name: 'Somchai T.',
    role: 'Owner, Sunset Beach Resort',
  },
  {
    stars: 5,
    quote: "The 10% commission changed our business. We reinvest the savings into guest experience. Our reviews went up 0.3 stars.",
    avatar: '👩‍💼',
    name: 'Marie L.',
    role: 'GM, Phangan Paradise',
  },
  {
    stars: 5,
    quote: "I was skeptical at first, but the governance model is real. One property, one vote. We actually decide the platform's future.",
    avatar: '🧔',
    name: 'Kenji M.',
    role: 'Owner, Zen Garden Villa',
  },
]

export function Testimonials() {
  return (
    <section style={{ background: 'white', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Testimonials</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            Hoteliers <span className="text-gradient">love it</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {REVIEWS.map(review => (
            <div key={review.name} className="card-hover rounded-3xl p-7"
              style={{
                background: '#FFFDF8',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: review.stars }).map((_, i) => (
                  <Star key={i} size={16} fill="#FDCB6E" stroke="#FDCB6E" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm italic leading-relaxed mb-6" style={{ color: '#636E72' }}>
                "{review.quote}"
              </p>

              {/* Avatar + info */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{review.avatar}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#2D3436' }}>{review.name}</p>
                  <p className="text-xs" style={{ color: '#B2BEC3' }}>{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
