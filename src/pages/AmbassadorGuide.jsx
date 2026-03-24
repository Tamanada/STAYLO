import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, Sparkles, ChevronDown, ChevronUp,
  UserPlus, Search, MessageSquare, Link2, Wallet,
  Shield, Vote, Database, Scale, DollarSign, BadgeCheck,
  Copy, Check, ExternalLink, BookOpen, Globe, MessageCircle,
  Calculator, Coffee, Briefcase, BarChart3
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const AVG_ROOMS = 15
const AVG_RATE = 60
const OCCUPANCY = 0.65
const AMBASSADOR_PCT = 0.02
const AVG_ANNUAL = AVG_ROOMS * AVG_RATE * 365 * OCCUPANCY
const PER_HOTEL = Math.round(AVG_ANNUAL * AMBASSADOR_PCT)

export default function AmbassadorGuide() {
  const { t } = useTranslation()
  const [openObjection, setOpenObjection] = useState(null)
  const [hotelCount, setHotelCount] = useState(5)
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const totalIncome = PER_HOTEL * hotelCount

  const whatsAppTemplate = t('ambassador_guide.whatsapp_template', 'Hi! I wanted to share something interesting with you. There\'s a new booking platform called Staylo — it works like Booking.com but only charges 10% commission instead of 15-25%. The hotels actually own the platform as shareholders. They\'re onboarding founding members right now at a special price. Check it out: staylo.app/join?amb=AMB-XXXXX')

  const handleCopy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const steps = [
    {
      num: 1,
      icon: UserPlus,
      title: t('ambassador_guide.step1_title', 'Create your account'),
      desc: t('ambassador_guide.step1_desc', 'Register at /ambassador/register and get your unique AMB-XXXXX code. It takes 2 minutes and is completely free.'),
      gradient: 'from-ocean to-electric',
    },
    {
      num: 2,
      icon: Search,
      title: t('ambassador_guide.step2_title', 'Identify hotels'),
      desc: t('ambassador_guide.step2_desc', 'Look for hotels, guesthouses, and resorts that use Booking.com or Airbnb. They currently pay 15-25% commission and would love to pay less.'),
      gradient: 'from-electric to-ocean',
    },
    {
      num: 3,
      icon: MessageSquare,
      title: t('ambassador_guide.step3_title', 'Start the conversation'),
      desc: t('ambassador_guide.step3_desc', 'Approach the owner or manager. Use the conversation scripts below to explain the value proposition clearly and confidently.'),
      gradient: 'from-sunrise to-sunset',
    },
    {
      num: 4,
      icon: Link2,
      title: t('ambassador_guide.step4_title', 'Share your link'),
      desc: t('ambassador_guide.step4_desc', 'Give them your personal link: staylo.app/join?amb=AMB-XXXXX. When they register through it, they are linked to you forever.'),
      gradient: 'from-sunset to-sunrise',
    },
    {
      num: 5,
      icon: Wallet,
      title: t('ambassador_guide.step5_title', 'Earn for life'),
      desc: t('ambassador_guide.step5_desc', 'You receive 2% of all their online bookings through Staylo. Paid monthly. No cap. No expiry. No limit on how many hotels you bring.'),
      gradient: 'from-libre to-libre/70',
    },
  ]

  const scripts = [
    {
      icon: Coffee,
      title: t('ambassador_guide.script_casual_title', 'The Casual Approach'),
      context: t('ambassador_guide.script_casual_context', 'For travelers staying at the hotel'),
      script: t('ambassador_guide.script_casual_text', "Hey, I just discovered this new platform called Staylo. It's like Booking.com but they only charge 10% instead of 22%. Hotels actually own the platform. Have you heard about it?"),
      color: 'ocean',
    },
    {
      icon: Briefcase,
      title: t('ambassador_guide.script_business_title', 'The Business Approach'),
      context: t('ambassador_guide.script_business_context', 'For direct contact with management'),
      script: t('ambassador_guide.script_business_text', "Hi, I represent Staylo — a new cooperative booking platform where hoteliers pay 10% commission instead of 15-25%. We're onboarding founding members in your region. Would you have 5 minutes to hear how it works?"),
      color: 'electric',
    },
    {
      icon: BarChart3,
      title: t('ambassador_guide.script_numbers_title', 'The Numbers Approach'),
      context: t('ambassador_guide.script_numbers_context', 'For data-driven owners'),
      script: t('ambassador_guide.script_numbers_text', "How much do you pay Booking.com per month in commissions? Imagine keeping 50-60% of that. Staylo charges 10%, and the hotel owners actually own the platform. For a 20-room hotel, that's $30,000+ saved per year."),
      color: 'libre',
    },
  ]

  const arguments_ = [
    { icon: DollarSign, title: t('ambassador_guide.arg_commission_title', '10% commission vs 15-25%'), desc: t('ambassador_guide.arg_commission_desc', 'Hotels save 50-60% on every booking compared to traditional OTAs.'), color: 'libre' },
    { icon: BadgeCheck, title: t('ambassador_guide.arg_ownership_title', 'Hotel owns the platform'), desc: t('ambassador_guide.arg_ownership_desc', 'Every hotel becomes a shareholder. Your platform, your profits.'), color: 'ocean' },
    { icon: Vote, title: t('ambassador_guide.arg_vote_title', '1 Hotel = 1 Vote'), desc: t('ambassador_guide.arg_vote_desc', 'Democratic governance. Every property has an equal say in platform decisions.'), color: 'electric' },
    { icon: Database, title: t('ambassador_guide.arg_data_title', 'Keep your guest data'), desc: t('ambassador_guide.arg_data_desc', 'Full access to guest information. Build direct relationships.'), color: 'sunset' },
    { icon: Scale, title: t('ambassador_guide.arg_parity_title', 'No price parity restrictions'), desc: t('ambassador_guide.arg_parity_desc', 'Set your own prices freely. No forced rate matching with OTAs.'), color: 'sunrise' },
    { icon: Shield, title: t('ambassador_guide.arg_founding_title', 'Founding member: $1,000/share'), desc: t('ambassador_guide.arg_founding_desc', 'Alpha price locks in now. Share price increases after this phase.'), color: 'golden' },
  ]

  const objections = [
    {
      q: t('ambassador_guide.objection1_q', "I've never heard of Staylo"),
      a: t('ambassador_guide.objection1_a', "We're in alpha phase, launching region by region. That's exactly why the founding member price is only $1,000. Early joiners get the best deal — the share price goes up after this phase."),
    },
    {
      q: t('ambassador_guide.objection2_q', "I'm happy with Booking.com"),
      a: t('ambassador_guide.objection2_a', "Are you happy paying them thousands per month? With Staylo you'd save 50-60% of those commissions AND become a shareholder in the platform. You'd actually own part of the system instead of just feeding it."),
    },
    {
      q: t('ambassador_guide.objection3_q', "What if it doesn't work?"),
      a: t('ambassador_guide.objection3_a', "Your investment is protected. If Staylo doesn't reach critical mass, funds are redistributed to shareholders. Plus, at 10% commission, hotels have every reason to switch — the economics are undeniable."),
    },
    {
      q: t('ambassador_guide.objection4_q', "I need to think about it"),
      a: t('ambassador_guide.objection4_a', "Of course! Here's my link — staylo.app/join?amb=YOUR-CODE. Take your time. Just know that alpha shares are limited to 3,000 and the price goes up after this phase. Registration is free either way."),
    },
    {
      q: t('ambassador_guide.objection5_q', "Can I try it first?"),
      a: t('ambassador_guide.objection5_a', "Absolutely. Registration is completely free! You can sign up, explore the dashboard, see the savings calculator, and decide about shares later. No commitment required."),
    },
  ]

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-deep via-[#0d1f3c] to-ocean/90 text-white py-20 sm:py-28 relative overflow-hidden animate-gradient">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[20%] w-60 h-60 bg-golden/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-sunset/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="golden" className="mb-6">{t('ambassador_guide.badge', 'Ambassador Program')}</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">{t('ambassador_guide.hero_title', 'Ambassador Guide')}</h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            {t('ambassador_guide.hero_subtitle', 'Everything you need to know to earn passive income with Staylo.')}
          </p>
        </div>
      </section>

      {/* ── How It Works — Step by Step ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.how_it_works_title', 'How It Works')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_guide.how_it_works_subtitle', 'Five clear steps from sign-up to passive income.')}
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200 hidden sm:block" />

            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.num} className="relative flex items-start gap-5">
                  <div className={`relative z-10 w-14 h-14 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="text-2xl font-black text-white">{step.num}</span>
                  </div>
                  <Card className="flex-1 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <step.icon size={20} className="text-ocean shrink-0" />
                      <h3 className="text-lg font-bold text-deep">{step.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Conversation Scripts ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-electric/5 via-white to-sunset/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.scripts_title', 'What To Say')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_guide.scripts_subtitle', 'Three proven conversation scripts for different situations.')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {scripts.map((script) => (
              <Card key={script.title} className={`p-6 border-2 border-${script.color}/20 hover:border-${script.color}/40 transition-all`}>
                <div className={`w-12 h-12 bg-${script.color}/10 rounded-2xl flex items-center justify-center mb-4`}>
                  <script.icon size={24} className={`text-${script.color}`} />
                </div>
                <h3 className="text-lg font-bold text-deep mb-1">{script.title}</h3>
                <p className="text-xs text-gray-400 mb-4">{script.context}</p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 italic leading-relaxed">"{script.script}"</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Arguments ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.arguments_title', 'Why Hotels Should Join')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_guide.arguments_subtitle', 'Six powerful arguments to convince any hotel owner.')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {arguments_.map((arg) => (
              <Card key={arg.title} className="p-6 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 bg-${arg.color}/10 rounded-2xl flex items-center justify-center mb-4`}>
                  <arg.icon size={24} className={`text-${arg.color}`} />
                </div>
                <h3 className="font-bold text-deep mb-2">{arg.title}</h3>
                <p className="text-sm text-gray-500">{arg.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Handling Objections ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.objections_title', 'Handling Objections')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_guide.objections_subtitle', 'Common pushbacks and how to respond with confidence.')}
            </p>
          </div>

          <div className="space-y-3">
            {objections.map((obj, i) => {
              const isOpen = openObjection === i
              return (
                <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenObjection(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-deep pr-4">"{obj.q}"</h4>
                    {isOpen ? (
                      <ChevronUp size={20} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5">
                      <div className="bg-libre/5 border border-libre/20 rounded-xl p-4">
                        <p className="text-sm font-semibold text-libre mb-2">{t('ambassador_guide.your_response', 'Your response:')}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{obj.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Earnings Calculator ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-electric/5 via-white to-sunset/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.calculator_title', 'Earnings Calculator')}</h2>
            <p className="text-gray-500 text-lg">{t('ambassador_guide.calculator_subtitle', 'See how much you could earn as an ambassador.')}</p>
          </div>

          <Card className="p-8 sm:p-10 border-2 border-electric/20">
            {/* Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-deep">{t('ambassador_guide.slider_label', 'How many hotels can you bring?')}</label>
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
                <span>{t('ambassador_guide.slider_min', '1 hotel')}</span>
                <span>{t('ambassador_guide.slider_max', '50 hotels')}</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-deep/5 rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-semibold text-deep mb-4">{t('ambassador_guide.breakdown_title', 'Average hotel calculation')}</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>{AVG_ROOMS} {t('ambassador_guide.breakdown_rooms', 'rooms')} x ${AVG_RATE}/{t('ambassador_guide.breakdown_night', 'night')} x {Math.round(OCCUPANCY * 100)}% {t('ambassador_guide.breakdown_occupancy', 'occupancy')}</span>
                  <span className="font-semibold text-deep">~${Math.round(AVG_ANNUAL / 1000)}K/{t('ambassador_guide.breakdown_year', 'year')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ambassador_guide.breakdown_share', 'Your 2% ambassador share per hotel')}</span>
                  <span className="font-semibold text-libre">~${PER_HOTEL.toLocaleString()}/{t('ambassador_guide.breakdown_year', 'year')}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-libre/10 to-libre/20 border-2 border-libre/30 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-2">{t('ambassador_guide.total_label', 'Your total passive income')}</p>
              <p className="text-5xl sm:text-6xl font-black text-libre mb-1">
                ${totalIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">
                {t('ambassador_guide.total_per_year', 'per year, from {{count}} hotel(s)', { count: hotelCount })}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                {t('ambassador_guide.total_basis', 'Based on avg {{rooms}} rooms x ${{rate}}/night x {{occupancy}}% occupancy x 2%', { rooms: AVG_ROOMS, rate: AVG_RATE, occupancy: Math.round(OCCUPANCY * 100) })}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Your Toolkit ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-deep mb-4">{t('ambassador_guide.toolkit_title', 'Your Toolkit')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {t('ambassador_guide.toolkit_subtitle', 'Resources and links to help you succeed.')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Unique link */}
            <Card className="p-6 border-2 border-ocean/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-ocean/10 rounded-xl flex items-center justify-center">
                  <Link2 size={20} className="text-ocean" />
                </div>
                <h3 className="font-bold text-deep">{t('ambassador_guide.toolkit_link_title', 'Your Unique Link')}</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-2">
                <code className="text-sm text-ocean font-mono truncate">staylo.app/join?amb=AMB-XXXXX</code>
                <button
                  onClick={() => handleCopy('staylo.app/join?amb=AMB-XXXXX', setCopiedLink)}
                  className="shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copiedLink ? <Check size={16} className="text-libre" /> : <Copy size={16} className="text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('ambassador_guide.toolkit_link_desc', 'Share this with every hotel you talk to.')}</p>
            </Card>

            {/* Staylo website */}
            <Card className="p-6 border-2 border-electric/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-electric/10 rounded-xl flex items-center justify-center">
                  <Globe size={20} className="text-electric" />
                </div>
                <h3 className="font-bold text-deep">{t('ambassador_guide.toolkit_website_title', 'Staylo Website')}</h3>
              </div>
              <a href="https://staylo.app" target="_blank" rel="noopener noreferrer" className="text-sm text-electric hover:underline flex items-center gap-1">
                staylo.app <ExternalLink size={14} />
              </a>
              <p className="text-xs text-gray-400 mt-2">{t('ambassador_guide.toolkit_website_desc', 'Send this to hotels who want to learn more first.')}</p>
            </Card>

            {/* Vision page */}
            <Card className="p-6 border-2 border-libre/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-libre/10 rounded-xl flex items-center justify-center">
                  <BookOpen size={20} className="text-libre" />
                </div>
                <h3 className="font-bold text-deep">{t('ambassador_guide.toolkit_vision_title', 'Vision Page')}</h3>
              </div>
              <Link to="/vision" className="text-sm text-libre hover:underline flex items-center gap-1">
                staylo.app/vision <ArrowRight size={14} />
              </Link>
              <p className="text-xs text-gray-400 mt-2">{t('ambassador_guide.toolkit_vision_desc', 'Share with skeptics. Explains the full model, roadmap, and cooperative structure.')}</p>
            </Card>

            {/* WhatsApp template */}
            <Card className="p-6 border-2 border-sunset/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-sunset/10 rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-sunset" />
                </div>
                <h3 className="font-bold text-deep">{t('ambassador_guide.toolkit_whatsapp_title', 'WhatsApp Template')}</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-2">
                <p className="text-xs text-gray-600 leading-relaxed">{whatsAppTemplate}</p>
              </div>
              <button
                onClick={() => handleCopy(whatsAppTemplate, setCopiedWhatsApp)}
                className="flex items-center gap-2 text-sm font-semibold text-sunset hover:text-sunset/80 transition-colors"
              >
                {copiedWhatsApp ? (
                  <><Check size={16} /> {t('ambassador_guide.copied', 'Copied!')}</>
                ) : (
                  <><Copy size={16} /> {t('ambassador_guide.copy_message', 'Copy message')}</>
                )}
              </button>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-electric via-sunset to-sunrise rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden animate-gradient">
            <Sparkles size={24} className="absolute top-6 left-8 text-golden/50 animate-float" />
            <Sparkles size={18} className="absolute bottom-8 right-10 text-white/30 animate-float" style={{ animationDelay: '1s' }} />

            <h2 className="relative text-3xl sm:text-4xl font-extrabold mb-4">
              {t('ambassador_guide.bottom_cta_title', 'Ready to start earning?')}
            </h2>
            <p className="relative text-white/70 mb-8 max-w-lg mx-auto">
              {t('ambassador_guide.bottom_cta_subtitle', 'Join the Staylo Ambassador Program and turn every hotel conversation into lifetime passive income.')}
            </p>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/ambassador/register">
                <button className="px-10 py-4 bg-white text-deep font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                  <span className="text-gradient">{t('ambassador_guide.cta_become', 'Become an Ambassador')}</span>
                  <ArrowRight size={20} className="text-sunset" />
                </button>
              </Link>
              <Link to="/ambassador/dashboard">
                <button className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 min-w-[260px] inline-flex items-center justify-center gap-3 cursor-pointer">
                  {t('ambassador_guide.cta_dashboard', 'Go to Dashboard')}
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
