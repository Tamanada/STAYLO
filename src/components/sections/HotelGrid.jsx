import { Link } from 'react-router-dom'
import { Star, ArrowRight } from 'lucide-react'

const HOTELS = [
  {
    emoji: '🌴',
    name: 'Sunset Beach Resort',
    location: 'Haad Rin, Koh Phangan',
    price: 85,
    stars: 4.8,
    reviews: 124,
    stay: 50,
    gradient: 'linear-gradient(135deg, #E8F8F0, #C8EFE0)',
  },
  {
    emoji: '🌊',
    name: 'Ocean View Villa',
    location: 'Thong Sala, Koh Phangan',
    price: 120,
    stars: 4.9,
    reviews: 89,
    stay: 75,
    gradient: 'linear-gradient(135deg, #E8F0FF, #C8D8FF)',
  },
  {
    emoji: '🌅',
    name: 'Golden Bay Boutique',
    location: 'Sri Thanu, Koh Phangan',
    price: 65,
    stars: 4.7,
    reviews: 201,
    stay: 40,
    gradient: 'linear-gradient(135deg, #FFF5E0, #FFE8C0)',
  },
  {
    emoji: '🌙',
    name: 'Moonlight Garden',
    location: 'Baan Tai, Koh Phangan',
    price: 95,
    stars: 4.6,
    reviews: 156,
    stay: 60,
    gradient: 'linear-gradient(135deg, #F8E8FF, #EDCFFF)',
  },
]

export function HotelGrid() {
  return (
    <section style={{ background: '#F8F6F0', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="section-label mb-3">Featured hotels</p>
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              color: '#2D3436',
              lineHeight: 1.15,
            }}>
              Koh Phangan · Alpha Market
            </h2>
          </div>
          <Link to="/dashboard/book" className="flex items-center gap-1 text-sm font-bold no-underline transition-colors"
            style={{ color: '#FF6B00' }}>
            View all 420 hotels <ArrowRight size={16} />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOTELS.map(hotel => (
            <div key={hotel.name} className="card-hover rounded-3xl overflow-hidden"
              style={{
                background: 'white',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              {/* Image area */}
              <div className="relative h-44 flex items-center justify-center" style={{ background: hotel.gradient }}>
                <span className="text-6xl">{hotel.emoji}</span>
                {/* Co-owned badge */}
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #00B894, #00CEC9)' }}>
                  Co-owned
                </span>
                {/* 10% badge */}
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C42)' }}>
                  10%
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Stars */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} fill={i < Math.round(hotel.stars) ? '#FDCB6E' : 'none'}
                      stroke={i < Math.round(hotel.stars) ? '#FDCB6E' : '#E8E0D8'} />
                  ))}
                  <span className="text-xs font-bold ml-1" style={{ color: '#2D3436' }}>{hotel.stars}</span>
                  <span className="text-xs" style={{ color: '#B2BEC3' }}>({hotel.reviews})</span>
                </div>

                <h3 className="font-bold text-base mb-1" style={{ color: '#2D3436' }}>{hotel.name}</h3>
                <p className="text-xs mb-3" style={{ color: '#B2BEC3' }}>{hotel.location}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black" style={{ color: '#2D3436' }}>${hotel.price}</span>
                    <span className="text-xs ml-1" style={{ color: '#B2BEC3' }}>/night</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(108,92,231,0.1)', color: '#6C5CE7' }}>
                    +{hotel.stay} $STAY
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
