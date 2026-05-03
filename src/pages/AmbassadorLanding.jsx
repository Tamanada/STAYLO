import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Hotel, Users, Globe, DollarSign, Handshake, TrendingUp, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'
import { supabase } from '../lib/supabase'

const AVG_ROOMS = 15
const AVG_RATE = 60
const OCCUPANCY = 0.65
const AMBASSADOR_PCT = 0.02
const AVG_ANNUAL = AVG_ROOMS * AVG_RATE * 365 * OCCUPANCY
const PER_HOTEL = Math.round(AVG_ANNUAL * AMBASSADOR_PCT)

export default function AmbassadorLanding() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [isAmbassador, setIsAmbassador] = useState(false)
  const [hotelCount, setHotelCount] = useState(5)

  useEffect(() => {
    if (!user) return
    supabase.from('ambassadors').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setIsAmbassador(true) })
  }, [user])
  const [roomCount, setRoomCount] = useState(AVG_ROOMS)
  const [nightlyRate, setNightlyRate] = useState(AVG_RATE)
  const [occupancy, setOccupancy] = useState(Math.round(OCCUPANCY * 100))

  const annualPerHotel = roomCount * nightlyRate * 365 * (occupancy / 100)
  const perHotelIncome = Math.round(annualPerHotel * AMBASSADOR_PCT)
  const totalIncome = perHotelIncome * hotelCount

  const steps = [
    {
      num: 1,
      title: t('ambassador_landing.step1_title', 'Stay & Discover'),
      desc: t('ambassador_landing.step1_desc', 'Visit a hotel on Staylo. Experience a platform that truly respects its partners — and see the difference firsthand.'),
      gradient: 'from-ocean to-electric',
      icon: Hotel,
    },
    {
      num: 2,
      title: t('ambassador_landing.step2_title', 'Recruit Hotels'),
      desc: t('ambassador_landing.step2_desc', 'Share your personal ambassador link with hotel owners you meet. When they join Staylo, you become their ambassador.'),
      gradient: 'from-sunrise to-sunset',
      icon: Handshake,
    },
    {
      num: 3,
      title: t('ambassador_landing.step3_title', 'Earn Forever'),
      desc: t('ambassador_landing.step3_desc', 'Get 2% of all their online sales — every booking, every service, every transaction. For life.'),
      gradient: 'from-libre to-libre/70',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="relative">
      <SEO
        title="Become a STAYLO Ambassador — earn 2% BTC for life"
        description="Refer hotels to STAYLO and earn 2% in Bitcoin on every booking they receive — paid to your Lightning wallet, forever. Free to join. Lifetime commission."
        path="/ambassador"
      />
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-deep via-electric/80 to-ocean text-white py-20 sm:py-28 relative overflow-hidden animate-gradient">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[20%] w-60 h-60 bg-golden/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-sunset/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="golden" className="mb-6">{t('ambassador_landing.badge', 'Ambassador Program')}</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">
            {t('ambassador_landing.hero_title_prefix', 'Earn')} <span className="text-gradient-gold">{t('ambassador_landing.hero_title_highlight', '2%')}</span> {t('ambassador_landing.hero_title_suffix', 'for Life')}
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            {t('ambassador_landing.hero_subtitle', 'Bring hotels to Staylo and earn lifetime passive income on every booking they receive. No cap, no expiry — forever.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={isAmbassador ? '/dashboard/ambassador' : '/ambassador/register'}>
              <Button variant="golden" size="lg" className="min-w-[260px]">
                {isAmbassador
                  ? t('ambassador_landing.cta_dashboard', 'Go to My Ambassador Dashboard')
                  : user
                    ? t('ambassador_landing.cta_activate', 'Activate My Ambassador Account')
                    : t('ambassador_landing.cta_become', 'Become an Ambassador')}
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/ambassador/guide">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                {t('ambassador_landing.cta_guide', 'Read the Guide')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_landing.how_it_works_title', 'How It Works')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_landing.how_it_works_subtitle', 'Three simple steps to start building lifetime passive income.')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                  <span className="text-3xl font-black text-white">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-deep mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings Calculator ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-electric/5 via-white to-sunset/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_landing.calculator_title', 'Earnings Calculator')}</h2>
            <p className="text-gray-500 text-lg">{t('ambassador_landing.calculator_subtitle', 'How many hotels could you bring to Staylo?')}</p>
          </div>

          <Card className="p-8 sm:p-10 border-2 border-electric/20">
            {/* Hotels slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-deep">{t('ambassador_landing.slider_hotels_label', 'Hotels you recruit')}</label>
                <span className="text-3xl font-black text-electric">{hotelCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={hotelCount}
                onChange={(e) => setHotelCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-electric"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('ambassador_landing.slider_hotels_min', '1 hotel')}</span>
                <span>{t('ambassador_landing.slider_hotels_max', '50 hotels')}</span>
              </div>
            </div>

            {/* Rooms slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-deep">{t('ambassador_landing.slider_rooms_label', 'Rooms per hotel')}</label>
                <span className="text-2xl font-bold text-electric">{roomCount}</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={roomCount}
                onChange={(e) => setRoomCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-electric"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('ambassador_landing.slider_rooms_min', '5 rooms')}</span>
                <span>{t('ambassador_landing.slider_rooms_max', '100 rooms')}</span>
              </div>
            </div>

            {/* Rate slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-deep">{t('ambassador_landing.slider_rate_label', 'Avg. nightly rate')}</label>
                <span className="text-2xl font-bold text-sunset">${nightlyRate}</span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={5}
                value={nightlyRate}
                onChange={(e) => setNightlyRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-sunset"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('ambassador_landing.slider_rate_min', '$20/night')}</span>
                <span>{t('ambassador_landing.slider_rate_max', '$300/night')}</span>
              </div>
            </div>

            {/* Occupancy slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-deep">{t('ambassador_landing.slider_occupancy_label', 'Avg. occupancy')}</label>
                <span className="text-2xl font-bold text-ocean">{occupancy}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                step={5}
                value={occupancy}
                onChange={(e) => setOccupancy(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-ocean"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>20%</span>
                <span>95%</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-deep/5 rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-semibold text-deep mb-4">{t('ambassador_landing.breakdown_title', 'Per hotel calculation')}</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>{roomCount} {t('ambassador_landing.breakdown_rooms', 'rooms')} × ${nightlyRate}/{t('ambassador_landing.breakdown_night', 'night')} × {occupancy}% {t('ambassador_landing.breakdown_occupancy', 'occupancy')}</span>
                  <span className="font-semibold text-deep">~${Math.round(annualPerHotel / 1000)}K/{t('ambassador_landing.breakdown_year', 'year')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ambassador_landing.breakdown_share', 'Your 2% ambassador share')}</span>
                  <span className="font-semibold text-libre">~${perHotelIncome.toLocaleString()}/{t('ambassador_landing.breakdown_year', 'year')}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-libre/10 to-libre/20 border-2 border-libre/30 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-2">{t('ambassador_landing.total_label', 'Your total passive income')}</p>
              <p className="text-5xl sm:text-6xl font-black text-libre mb-1">
                ${totalIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">{t('ambassador_landing.total_per_year', 'per year, from {{count}} hotel(s)', { count: hotelCount })}</p>
            </div>
          </Card>
        </div>
      </section>

      {/* ── The Contract ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_landing.contract_title', 'The Tripartite Agreement')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_landing.contract_subtitle', 'A binding contract between all three parties protects your 2% for as long as the hotel stays on Staylo.')}
            </p>
          </div>

          <Card className="p-8 sm:p-10 border-2 border-electric/20 bg-gradient-to-br from-white to-electric/5">
            {/* Triangle visual */}
            <div className="flex items-center justify-center gap-4 sm:gap-10 flex-wrap mb-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-ocean/10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-ocean/30">
                  <Globe size={32} className="text-ocean" />
                </div>
                <p className="text-sm font-bold text-deep">{t('ambassador_landing.party_staylo', 'STAYLO')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.party_staylo_role', 'Platform')}</p>
              </div>

              <div className="text-gray-300 text-3xl font-light hidden sm:block">&#x27F7;</div>

              <div className="text-center">
                <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-libre/30">
                  <Hotel size={32} className="text-libre" />
                </div>
                <p className="text-sm font-bold text-deep">{t('ambassador_landing.party_hotel', 'HOTEL')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.party_hotel_role', 'Partner')}</p>
              </div>

              <div className="text-gray-300 text-3xl font-light hidden sm:block">&#x27F7;</div>

              <div className="text-center">
                <div className="w-20 h-20 bg-sunset/10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-sunset/30">
                  <Users size={32} className="text-sunset" />
                </div>
                <p className="text-sm font-bold text-deep">{t('ambassador_landing.party_ambassador', 'AMBASSADOR')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.party_ambassador_role', 'Business Bringer')}</p>
              </div>
            </div>

            {/* Contract details */}
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="bg-ocean/5 rounded-2xl p-5">
                <DollarSign size={20} className="text-ocean mx-auto mb-2" />
                <p className="text-sm font-semibold text-deep mb-1">{t('ambassador_landing.contract_guaranteed', 'Guaranteed 2%')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.contract_guaranteed_desc', 'Your share is locked into the contract between all parties.')}</p>
              </div>
              <div className="bg-libre/5 rounded-2xl p-5">
                <Handshake size={20} className="text-libre mx-auto mb-2" />
                <p className="text-sm font-semibold text-deep mb-1">{t('ambassador_landing.contract_binding', 'Legally Binding')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.contract_binding_desc', 'A formal agreement signed by Staylo, the hotel, and you.')}</p>
              </div>
              <div className="bg-sunset/5 rounded-2xl p-5">
                <TrendingUp size={20} className="text-sunset mx-auto mb-2" />
                <p className="text-sm font-semibold text-deep mb-1">{t('ambassador_landing.contract_lifetime', 'Lifetime Duration')}</p>
                <p className="text-xs text-gray-400">{t('ambassador_landing.contract_lifetime_desc', 'Active for as long as the hotel remains on the Staylo platform.')}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />
            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">
              {t('ambassador_landing.bottom_cta_title', 'Start earning today')}
            </h2>
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto">
              {t('ambassador_landing.bottom_cta_subtitle', 'Join the Staylo Ambassador Program and build passive income by connecting hotels to a fairer platform.')}
            </p>
            <Link to={isAmbassador ? '/dashboard/ambassador' : '/ambassador/register'}>
              <button className="relative px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                <span className="text-gradient">{isAmbassador
                  ? t('ambassador_landing.cta_dashboard', 'Go to My Ambassador Dashboard')
                  : user
                    ? t('ambassador_landing.cta_activate', 'Activate My Ambassador Account')
                    : t('ambassador_landing.cta_become', 'Become an Ambassador')}</span>
                <ArrowRight size={20} className="text-sunset" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
