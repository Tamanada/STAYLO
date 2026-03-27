import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Building2, DollarSign, MapPin, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const startTime = Date.now()
        const numericTarget = typeof target === 'number' ? target : parseFloat(target.replace(/[^0-9.]/g, ''))
        const tick = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(numericTarget * eased))
          if (progress < 1) requestAnimationFrame(tick)
        }
        tick()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

const founders = [
  { name: 'S. Patel', loc: 'Koh Phangan, TH', rooms: 24, type: 'Resort' },
  { name: 'L. Martin', loc: 'Bali, ID', rooms: 12, type: 'Villa' },
  { name: 'K. Tanaka', loc: 'Kyoto, JP', rooms: 8, type: 'Guesthouse' },
  { name: 'M. Garcia', loc: 'Tulum, MX', rooms: 32, type: 'Hotel' },
  { name: 'A. Dubois', loc: 'Nice, FR', rooms: 15, type: 'Hotel' },
]

export function FoundingMembers() {
  const { t } = useTranslation()
  const [userCount, setUserCount] = useState(0)
  const [propertyCount, setPropertyCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      const [users, properties] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
      ])
      if (users.count != null) setUserCount(users.count)
      if (properties.count != null) setPropertyCount(properties.count)
    }
    fetchCounts()
  }, [])

  return (
    <section className="py-8 sm:py-12 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-electric/40" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sunset/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-libre/5 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-white">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-golden/10 border border-golden/20 rounded-full text-sm text-golden font-semibold mb-4">
            <Crown size={14} />
            {t('founding_members.badge', 'Founding Members')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {t('social_proof.title', { count: 120 })}
          </h2>
        </div>

        {/* Animated stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-7">
          <div className="text-center">
            <Globe size={22} className="mx-auto text-ocean mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={12} />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.countries')}</p>
          </div>
          <div className="text-center">
            <Building2 size={22} className="mx-auto text-sunrise mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={propertyCount || userCount} />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.properties')}</p>
          </div>
          <div className="text-center">
            <DollarSign size={22} className="mx-auto text-libre mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              $<AnimatedCounter target={2.1} suffix="M" />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.saved')}</p>
          </div>
          <div className="text-center">
            <MapPin size={22} className="mx-auto text-golden mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={42} />
            </p>
            <p className="text-sm text-white/50">{t('founding_members.cities', 'Cities worldwide')}</p>
          </div>
        </div>

        {/* Founding members list preview */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white/70">{t('founding_members.latest', 'Latest founding members')}</span>
            <span className="text-xs text-golden font-mono">{t('founding_members.live', 'LIVE')}</span>
          </div>
          <div className="space-y-2">
            {founders.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-ocean to-electric rounded-lg flex items-center justify-center text-xs font-bold">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1">
                      <MapPin size={10} /> {f.loc}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60">{f.type}</p>
                  <p className="text-xs text-libre font-mono">{t('founding_members.rooms_count', '{{count}} rooms', { count: f.rooms })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
