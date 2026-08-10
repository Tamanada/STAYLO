/*
  ================================================================
  ShipDashboard — the /dashboard page for SHIP standalone customers
  ================================================================
  Rendered by Dashboard.jsx when the user has ≥1 ship_hotels row but
  0 STAYLO cooperative properties AND 0 shares. Replaces the STAYLO
  "Founding Member" welcome with a SHIP-focused overview:

    - Hotel(s) header
    - Trial countdown (14 days from ship_hotels.trial_ends_at)
    - Quick actions: Open SHIP, incoming bookings, forwarding address
    - Setup progress checklist (email forwarding, first booking, invite manager)

  When the user later joins the STAYLO cooperative (buys shares OR
  lists a property), Dashboard.jsx falls back to the full STAYLO
  dashboard automatically.
  ================================================================
*/
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Rocket, Mail, Copy, Check, Users, Calendar, ExternalLink,
  Clock, CheckCircle2, Circle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const POSTMARK_INBOUND_BASE = '70d89f66a51008af47ebb2b297222459'
const POSTMARK_INBOUND_HOST = 'inbound.postmarkapp.com'

function daysBetween(future) {
  const ms = new Date(future).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export default function ShipDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingsCount, setBookingsCount] = useState(0)
  const [hasInvites, setHasInvites] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      // The user's primary SHIP hotel (first one if they own multiple).
      // Multi-hotel accounts get a picker in a later commit.
      const { data: hotels } = await supabase
        .from('ship_hotels')
        .select('id, slug, name, city, currency, timezone, trial_ends_at, subscription_status, created_at')
        .order('created_at', { ascending: true })
        .limit(1)
      const h = hotels?.[0]
      if (cancelled) return
      setHotel(h || null)

      if (h) {
        const [bookingsRes, invitesRes] = await Promise.all([
          supabase.from('ship_bookings').select('id', { count: 'exact', head: true }).eq('hotel_id', h.id),
          supabase.from('ship_hotel_invitations').select('id', { count: 'exact', head: true }).eq('hotel_id', h.id),
        ])
        if (!cancelled) {
          setBookingsCount(bookingsRes.count || 0)
          setHasInvites((invitesRes.count || 0) > 0)
        }
      }
      if (!cancelled) setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user])

  if (loading || !hotel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse text-gray-400">Loading your hotel…</div>
      </div>
    )
  }

  const trialDaysLeft = daysBetween(hotel.trial_ends_at)
  const forwardAddress = `${POSTMARK_INBOUND_BASE}+${hotel.slug}@${POSTMARK_INBOUND_HOST}`
  const setupSteps = [
    { done: true,               label: 'Hotel created' },
    { done: bookingsCount > 0,  label: `Forward first booking (${bookingsCount} received)` },
    { done: hasInvites,         label: 'Invite a manager' },
  ]
  const stepsDone = setupSteps.filter(s => s.done).length

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(forwardAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* ────────── Header ────────── */}
      <div className="mb-8">
        <div className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#FF6B00' }}>
          SHIP · {hotel.city}
        </div>
        <h1 className="font-black text-3xl sm:text-4xl mb-1" style={{ color: '#1A1A2E', letterSpacing: '-0.6px' }}>
          {hotel.name}
        </h1>
        <p className="text-gray-500">
          {hotel.subscription_status === 'trial' ? (
            <>
              <Clock size={14} className="inline mr-1 -mt-0.5" />
              <strong>{trialDaysLeft} days</strong> left in your free trial · no credit card required
            </>
          ) : (
            <>Subscription: <strong>{hotel.subscription_status}</strong></>
          )}
        </p>
      </div>

      {/* ────────── Big Open SHIP CTA ────────── */}
      <a
        href={`/ship.html?demo=off&hotel=${encodeURIComponent(hotel.slug)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-6 p-6 rounded-2xl no-underline transition-all"
        style={{
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
          boxShadow: '0 20px 40px rgba(255,31,112,0.25)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-xs font-black tracking-widest uppercase opacity-85 mb-1">Your operational hub</div>
            <div className="font-black text-2xl">Open SHIP</div>
            <div className="text-sm opacity-85 mt-1">Bookings · Team · POS · Alerts</div>
          </div>
          <Rocket size={40} strokeWidth={2.2} />
        </div>
      </a>

      {/* ────────── Stats row ────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-white border" style={{ borderColor: '#E8E0D8' }}>
          <Calendar size={18} style={{ color: '#FF6B00' }} className="mb-2" />
          <div className="font-black text-2xl text-gray-900">{bookingsCount}</div>
          <div className="text-xs text-gray-400">Bookings imported</div>
        </div>
        <div className="p-4 rounded-xl bg-white border" style={{ borderColor: '#E8E0D8' }}>
          <Users size={18} style={{ color: '#FF6B00' }} className="mb-2" />
          <div className="font-black text-2xl text-gray-900">1</div>
          <div className="text-xs text-gray-400">Team members</div>
        </div>
        <div className="p-4 rounded-xl bg-white border" style={{ borderColor: '#E8E0D8' }}>
          <Clock size={18} style={{ color: '#FF6B00' }} className="mb-2" />
          <div className="font-black text-2xl text-gray-900">{trialDaysLeft}</div>
          <div className="text-xs text-gray-400">Trial days left</div>
        </div>
      </div>

      {/* ────────── Forwarding address (big card) ────────── */}
      <div className="mb-6 p-5 rounded-2xl border-2" style={{
        borderColor: bookingsCount > 0 ? '#00B894' : '#FF6B00',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.04), rgba(255,31,112,0.02))',
      }}>
        <div className="flex items-center gap-2 mb-3 text-xs font-black tracking-widest uppercase" style={{
          color: bookingsCount > 0 ? '#00B894' : '#FF6B00',
        }}>
          <Mail size={13} strokeWidth={3} />
          {bookingsCount > 0 ? 'Forwarding is live ✓' : 'Set up email forwarding'}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-3 rounded-xl text-sm font-mono break-all" style={{
            background: 'white', border: '1px solid #E8E0D8', color: '#1A1A2E',
          }}>
            {forwardAddress}
          </code>
          <button type="button" onClick={copyAddress}
            className="flex-shrink-0 px-4 py-3 rounded-xl font-black text-white flex items-center gap-2 transition-all"
            style={{
              background: copied ? '#00B894' : 'linear-gradient(135deg, #FF6B00, #FF1F70)',
              boxShadow: '0 6px 16px rgba(255,31,112,0.25)',
            }}>
            {copied ? <><Check size={16} strokeWidth={3} /> Copied</> : <><Copy size={16} strokeWidth={2.6} /> Copy</>}
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Forward all Booking.com emails to this address and reservations flow into SHIP automatically.
          {' '}
          <Link to="/ship-signup" className="font-bold no-underline" style={{ color: '#FF6B00' }}>
            View setup guide
          </Link>
        </div>
      </div>

      {/* ────────── Setup progress ────────── */}
      <div className="mb-6 p-5 rounded-2xl bg-white border" style={{ borderColor: '#E8E0D8' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900">Setup progress</h3>
          <span className="text-xs font-bold text-gray-400">{stepsDone} / {setupSteps.length}</span>
        </div>
        <div className="space-y-2">
          {setupSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {step.done
                ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: '#00B894' }} strokeWidth={2.4} />
                : <Circle size={18} className="flex-shrink-0 text-gray-300" strokeWidth={2.4} />}
              <span className={step.done ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────── Footer link back to landing ────────── */}
      <div className="text-center text-xs text-gray-400">
        Want to learn about the STAYLO cooperative?{' '}
        <Link to="/vision" className="font-bold no-underline" style={{ color: '#FF6B00' }}>
          Read more <ExternalLink size={12} className="inline -mt-0.5" />
        </Link>
      </div>
    </div>
  )
}
