import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const FILTERS = [
  { label: 'All', emoji: '' },
  { label: 'Beach', emoji: '🏖' },
  { label: 'Jungle', emoji: '🌿' },
  { label: 'Wellness', emoji: '🧘' },
  { label: 'City', emoji: '🌆' },
  { label: 'Luxury', emoji: '💎' },
  { label: 'Co-owned', emoji: '🤝' },
  { label: 'Best value', emoji: '💰' },
]

const STATS = [
  { value: '420+', label: 'Hotels', color: '#FF6B00' },
  { value: '10%', label: 'Commission', color: '#00B894' },
  { value: '$STAY', label: 'Earn', color: '#6C5CE7' },
  { value: '1 vote', label: 'per property', color: '#FF3CB4' },
]

export function Hero() {
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <section className="relative overflow-hidden" style={{
      background: 'linear-gradient(160deg, #FFFDF8 0%, #FFF5E6 40%, #FFF0F8 70%, #F0F8FF 100%)',
      padding: '80px 5% 60px',
    }}>
      {/* Floating blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B00 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-50px] left-[-100px] w-[400px] h-[400px] rounded-full opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF3CB4 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00B894 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Tag pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
          style={{ background: 'rgba(255,107,0,0.08)', border: '1.5px solid rgba(255,107,0,0.2)' }}>
          <span style={{ color: '#FF6B00', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ✦ Built with hoteliers, for hoteliers
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 6vw, 84px)',
          fontWeight: 900,
          letterSpacing: '-3px',
          lineHeight: 1.05,
          color: '#2D3436',
          margin: '0 0 24px',
        }}>
          Book with{' '}
          <span style={{
            background: 'linear-gradient(135deg, #FF6B00, #FF3CB4, #6C5CE7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>purpose.</span>
          <br />
          Travel with soul.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          lineHeight: 1.65,
          color: '#636E72',
          maxWidth: '620px',
          margin: '0 auto 40px',
        }}>
          Every booking on Staylo goes back to the hoteliers who built it.
          Co-owned. 10% commission. Yours forever.
        </p>

        {/* Search box */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center rounded-full overflow-hidden"
            style={{
              background: 'white',
              border: '1.5px solid #E8E0D8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              padding: '6px',
            }}>
            <div className="flex items-center flex-1 pl-5 gap-3">
              <Search size={20} style={{ color: '#B2BEC3' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Where do you want to stay?"
                className="flex-1 py-3 text-base outline-none bg-transparent"
                style={{ color: '#2D3436', fontSize: '15px' }}
              />
            </div>
            <Link to={user ? '/dashboard/book' : '/register'}>
              <button className="btn-primary !rounded-full !py-3 !px-8 flex items-center gap-2">
                <span>Search</span>
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {FILTERS.map(f => (
            <button key={f.label} onClick={() => setActiveFilter(f.label)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
              style={activeFilter === f.label ? {
                background: 'linear-gradient(135deg, #FF6B00, #FF3CB4)',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(255,107,0,0.25)',
              } : {
                background: 'white',
                color: '#636E72',
                border: '1.5px solid #E8E0D8',
              }}>
              {f.emoji && <span className="mr-1">{f.emoji}</span>}
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map(stat => (
            <div key={stat.label} className="card-hover rounded-3xl p-5 text-center"
              style={{
                background: 'white',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              <p className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs font-semibold" style={{ color: '#B2BEC3' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
