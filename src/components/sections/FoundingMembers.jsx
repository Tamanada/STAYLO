import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Building2, Users, MapPin, Crown } from 'lucide-react'
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

export function FoundingMembers() {
  const { t } = useTranslation()
  const [memberCount, setMemberCount] = useState(0)
  const [propertyCount, setPropertyCount] = useState(0)
  const [countryCount, setCountryCount] = useState(0)
  const [cityCount, setCityCount] = useState(0)
  const [latestProperties, setLatestProperties] = useState([])

  useEffect(() => {
    async function fetchAll() {
      const [members, propsAgg, latest] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase
          .from('properties')
          .select('country, city', { count: 'exact' })
          .in('status', ['live', 'validated']),
        supabase
          .from('properties')
          .select('id, name, city, country, type, room_count')
          .in('status', ['live', 'validated'])
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (members.count != null) setMemberCount(members.count)
      if (propsAgg.count != null) setPropertyCount(propsAgg.count)
      if (propsAgg.data) {
        const countries = new Set(propsAgg.data.map((p) => p.country).filter(Boolean))
        const cities = new Set(propsAgg.data.map((p) => p.city).filter(Boolean))
        setCountryCount(countries.size)
        setCityCount(cities.size)
      }
      if (latest.data) setLatestProperties(latest.data)
    }
    fetchAll()
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
            {t('social_proof.title', { count: memberCount })}
          </h2>
        </div>

        {/* Animated stats — all live from Supabase */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-7">
          <div className="text-center">
            <Globe size={22} className="mx-auto text-ocean mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={countryCount} />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.countries')}</p>
          </div>
          <div className="text-center">
            <Building2 size={22} className="mx-auto text-sunrise mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={propertyCount} />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.properties')}</p>
          </div>
          <div className="text-center">
            <Users size={22} className="mx-auto text-libre mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={memberCount} />
            </p>
            <p className="text-sm text-white/50">{t('social_proof.members', 'Members')}</p>
          </div>
          <div className="text-center">
            <MapPin size={22} className="mx-auto text-golden mb-2" />
            <p className="text-3xl sm:text-4xl font-extrabold">
              <AnimatedCounter target={cityCount} />
            </p>
            <p className="text-sm text-white/50">{t('founding_members.cities', 'Cities')}</p>
          </div>
        </div>

        {/* Founding members list — hidden when empty (no fictitious entries) */}
        {latestProperties.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white/70">{t('founding_members.latest', 'Latest founding members')}</span>
              <span className="text-xs text-golden font-mono">{t('founding_members.live', 'LIVE')}</span>
            </div>
            <div className="space-y-2">
              {latestProperties.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-ocean to-electric rounded-lg flex items-center justify-center text-xs font-bold">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <MapPin size={10} /> {p.city}{p.country ? `, ${p.country}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60 capitalize">{p.type}</p>
                    {p.room_count > 0 && (
                      <p className="text-xs text-libre font-mono">
                        {t('founding_members.rooms_count', '{{count}} rooms', { count: p.room_count })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
