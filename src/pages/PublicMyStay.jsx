// ============================================================================
// PublicMyStay — anonymous "digital concierge" for an active booking
// ============================================================================
// URL: /stay/<check_in_token>
//
// The guest scans the QR at check-in (encoding /checkin/<token>), registers,
// then lands here for the rest of the stay. Bookmark, add-to-home-screen,
// come back any time until check-out day. Same token as check-in — the
// physical QR at the front desk is the one artefact the guest keeps.
//
// Sections (Chunk 1 shipping now):
//   1. Hero (property + booking + room + nights + status pill)
//   2. WiFi (SSID + password with big copy buttons — the #1 thing guests scan for)
//   3. Essentials (checkout time, contact, address with map link)
//   4. Amenities badges (visual inventory)
//   5. House rules (if set)
//   6. Placeholders for Chunk 2/3/4: vouchers wallet, folio, request extras, cancel
//
// Chunks 2/3/4 will wire the placeholders to real anon RPCs. Design is
// deliberately "richer than PublicCheckIn" — this is what an investor demo
// will screen-share for the "hotels lose OTA feel because we replace it"
// story.
// ============================================================================
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Loader2, AlertTriangle, MapPin, Calendar, BedDouble, Clock,
  Phone, Mail, Globe, Wifi, Copy, Check, ScrollText, Sparkles,
  Gift, Receipt, MessageSquare, XCircle, Home,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

// ────────────────────── Helpers ──────────────────────
function nightsBetween(iso1, iso2) {
  if (!iso1 || !iso2) return 0
  const d1 = new Date(iso1 + 'T00:00:00Z')
  const d2 = new Date(iso2 + 'T00:00:00Z')
  return Math.max(1, Math.round((d2 - d1) / 86400000))
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// "day X of Y" — where the guest is in their stay
function stayDayLabel(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const total = nightsBetween(checkIn, checkOut)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(checkIn + 'T00:00:00')
  const dayIdx = Math.floor((today - start) / 86400000) + 1
  if (dayIdx < 1) return `Starts in ${Math.abs(dayIdx - 1)} day${Math.abs(dayIdx - 1) === 1 ? '' : 's'}`
  if (dayIdx > total) return 'Check-out day'
  return `Day ${dayIdx} of ${total}`
}

// Nice human label for common amenity codes (fallback = titlecase)
const AMENITY_LABEL = {
  wifi: 'WiFi',
  pool: 'Pool',
  spa: 'Spa',
  gym: 'Gym',
  parking: 'Parking',
  breakfast: 'Breakfast',
  bar: 'Bar',
  restaurant: 'Restaurant',
  ac: 'A/C',
  laundry: 'Laundry',
  pets: 'Pet-friendly',
  beach: 'Beach access',
  airport_shuttle: 'Airport shuttle',
  ev_charger: 'EV charger',
  workspace: 'Workspace',
  concierge: 'Concierge',
}
function amenityLabel(k) {
  return AMENITY_LABEL[k] || k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ────────────────────── Component ──────────────────────
export default function PublicMyStay() {
  const { t } = useTranslation()
  const { token } = useParams()
  const [stay, setStay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    // Guard against obvious garbage tokens (e.g. a copy-paste of `<token>`)
    // so we can show a clean message instead of leaking the postgres error.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(token)) {
      setLoadError('This stay link is not valid.')
      setLoading(false)
      return () => { cancelled = true }
    }
    supabase.rpc('get_stay_view', { p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Never surface raw postgres errors on a public page.
          setLoadError('Could not load your stay page. Please try again.')
        } else if (!data || data.length === 0) {
          setLoadError('This stay link has expired or the booking was cancelled.')
        } else {
          setStay(data[0])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <Shell>
        <div className="text-center py-24">
          <Loader2 size={28} className="animate-spin mx-auto text-ocean" />
          <p className="text-sm text-gray-500 mt-3">Loading your stay…</p>
        </div>
      </Shell>
    )
  }

  if (loadError || !stay) {
    return (
      <Shell>
        <div className="text-center py-16 px-4">
          <AlertTriangle size={32} className="text-sunset mx-auto mb-3" />
          <h1 className="text-lg font-bold text-deep mb-1">Stay page unavailable</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">{loadError}</p>
          <p className="text-xs text-gray-400 mt-4">Ask the front desk to print a fresh QR code.</p>
        </div>
      </Shell>
    )
  }

  const nights = nightsBetween(stay.check_in, stay.check_out)
  const dayLabel = stayDayLabel(stay.check_in, stay.check_out)
  const hasWifi = !!(stay.wifi_ssid || stay.wifi_password)
  const hasAmenities = Array.isArray(stay.amenities) && stay.amenities.length > 0
  const mapUrl = stay.lat && stay.lng
    ? `https://www.google.com/maps/search/?api=1&query=${stay.lat},${stay.lng}`
    : stay.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.address + ', ' + (stay.property_city || ''))}`
      : null

  return (
    <Shell>
      <SEO title={`Your stay at ${stay.property_name}`} noindex path={`/stay/${token}`} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="rounded-3xl overflow-hidden shadow-lg bg-white">
          {stay.photo_urls?.[0] ? (
            <div className="relative h-40 sm:h-48 bg-gradient-to-br from-ocean to-libre">
              <img src={stay.photo_urls[0]} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="text-[10px] uppercase tracking-widest opacity-90 mb-0.5">Welcome to</div>
                <h1 className="text-xl sm:text-2xl font-extrabold leading-tight drop-shadow">{stay.property_name}</h1>
                {stay.property_city && (
                  <div className="text-xs opacity-90 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {stay.property_city}{stay.property_country ? `, ${stay.property_country}` : ''}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 bg-gradient-to-br from-ocean/10 to-libre/10">
              <div className="text-[10px] uppercase tracking-widest text-orange font-bold mb-0.5">Welcome to</div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-deep leading-tight">{stay.property_name}</h1>
              {stay.property_city && (
                <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {stay.property_city}{stay.property_country ? `, ${stay.property_country}` : ''}
                </div>
              )}
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {dayLabel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange/10 text-orange font-bold rounded-full">
                  <Sparkles size={11} /> {dayLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-ocean/10 text-ocean font-bold rounded-full">
                {nights} night{nights > 1 ? 's' : ''}
              </span>
              {stay.room_name && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-libre/10 text-libre font-bold rounded-full">
                  <BedDouble size={11} /> {stay.room_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center p-2.5 bg-gradient-to-br from-cream to-white rounded-2xl border border-gray-100">
                <div className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Check in</div>
                <div className="text-sm font-bold text-deep">{fmtDate(stay.check_in)}</div>
                {stay.check_in_time && <div className="text-[10px] text-gray-500 mt-0.5">from {stay.check_in_time}</div>}
              </div>
              <div className="text-center p-2.5 bg-gradient-to-br from-cream to-white rounded-2xl border border-gray-100">
                <div className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Check out</div>
                <div className="text-sm font-bold text-deep">{fmtDate(stay.check_out)}</div>
                {stay.check_out_time && <div className="text-[10px] text-gray-500 mt-0.5">by {stay.check_out_time}</div>}
              </div>
            </div>

            {stay.guest_name && (
              <div className="text-[11px] text-gray-500 italic text-center pt-1">
                Booked for {stay.guest_name}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WiFi ─────────────────────────────────────────────────────── */}
      {hasWifi && (
        <Card>
          <SectionHeader icon={<Wifi size={18} />} title="WiFi" accent="from-ocean to-libre" />
          <div className="space-y-2 mt-3">
            {stay.wifi_ssid && (
              <CopyRow label="Network" value={stay.wifi_ssid} mono />
            )}
            {stay.wifi_password && (
              <CopyRow label="Password" value={stay.wifi_password} mono />
            )}
          </div>
        </Card>
      )}

      {/* ── Essentials ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={<Home size={18} />} title="Essentials" accent="from-orange to-pink-500" />
        <div className="mt-3 space-y-2 text-sm">
          {stay.check_out_time && (
            <InfoRow icon={<Clock size={14} />} label="Check-out">
              by <span className="font-bold text-deep">{stay.check_out_time}</span>
            </InfoRow>
          )}
          {stay.address && (
            <InfoRow icon={<MapPin size={14} />} label="Address">
              {mapUrl ? (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="text-ocean font-bold hover:underline">
                  {stay.address}
                </a>
              ) : stay.address}
            </InfoRow>
          )}
          {stay.contact_phone && (
            <InfoRow icon={<Phone size={14} />} label="Phone">
              <a href={`tel:${stay.contact_phone}`} className="text-ocean font-bold hover:underline">{stay.contact_phone}</a>
            </InfoRow>
          )}
          {stay.contact_email && (
            <InfoRow icon={<Mail size={14} />} label="Email">
              <a href={`mailto:${stay.contact_email}`} className="text-ocean font-bold hover:underline break-all">{stay.contact_email}</a>
            </InfoRow>
          )}
          {stay.website && (
            <InfoRow icon={<Globe size={14} />} label="Website">
              <a href={stay.website.startsWith('http') ? stay.website : `https://${stay.website}`} target="_blank" rel="noreferrer" className="text-ocean font-bold hover:underline break-all">
                {stay.website.replace(/^https?:\/\//, '')}
              </a>
            </InfoRow>
          )}
        </div>
      </Card>

      {/* ── Amenities ────────────────────────────────────────────────── */}
      {hasAmenities && (
        <Card>
          <SectionHeader icon={<Sparkles size={18} />} title="Amenities" accent="from-libre to-ocean" />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {stay.amenities.map(a => (
              <span key={a} className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-full">
                {amenityLabel(a)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* ── House rules ──────────────────────────────────────────────── */}
      {stay.house_rules && (
        <Card>
          <SectionHeader icon={<ScrollText size={18} />} title="House rules" accent="from-sunset to-orange" />
          <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {stay.house_rules}
          </div>
        </Card>
      )}

      {/* ── Coming soon (placeholders for Chunks 2/3/4) ─────────────── */}
      <Card muted>
        <SectionHeader icon={<Gift size={18} />} title="More coming to this page" accent="from-gray-400 to-gray-500" small />
        <ul className="mt-3 space-y-2 text-sm text-gray-500">
          <li className="flex items-center gap-2"><Gift size={14} className="text-libre" /> My vouchers wallet (breakfast, spa, transport…)</li>
          <li className="flex items-center gap-2"><Receipt size={14} className="text-ocean" /> Live folio (running tab across venues)</li>
          <li className="flex items-center gap-2"><MessageSquare size={14} className="text-orange" /> Request extras (towels, late check-out…)</li>
          <li className="flex items-center gap-2"><XCircle size={14} className="text-sunset" /> Cancel my booking</li>
        </ul>
      </Card>

      {/* ── Feedback CTA on last day / after check-out ─────────────── */}
      <div className="mt-6 p-4 bg-gradient-to-br from-orange/10 to-pink-500/10 rounded-2xl text-center">
        <p className="text-xs text-gray-600 mb-1">Already checked out?</p>
        <p className="text-sm font-bold text-deep">
          Ask the front desk for the check-out QR to share your feedback.
        </p>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-4">
        Bookmark this page or add it to your home screen. Access lasts until check-out.
      </p>
    </Shell>
  )
}

// ────────────────────── Sub-components ──────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white">
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-5">
        <div className="text-center mb-4">
          <span className="text-2xl font-extrabold text-deep">stay</span>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-orange to-pink-500 bg-clip-text text-transparent">lo</span>
        </div>
        {children}
        <p className="text-center text-[10px] text-gray-400 mt-6 pb-4">
          Powered by <a href="https://staylo.app" className="text-orange font-bold">STAYLO</a> - hotelier-owned
        </p>
      </div>
    </div>
  )
}

function Card({ children, muted = false }) {
  return (
    <section className={`mb-3 rounded-2xl p-4 sm:p-5 shadow-sm border ${muted ? 'bg-gray-50/60 border-gray-100' : 'bg-white border-gray-100'}`}>
      {children}
    </section>
  )
}

function SectionHeader({ icon, title, accent = 'from-orange to-pink-500', small = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-sm`}>
        {icon}
      </span>
      <h2 className={`font-bold text-deep ${small ? 'text-sm' : 'text-base'}`}>{title}</h2>
    </div>
  )
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</div>
        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  )
}

// Copy-to-clipboard row for WiFi credentials
function CopyRow({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silently fail — some browsers block clipboard in insecure contexts
    }
  }
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-ocean/5 to-libre/5 border border-ocean/10">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-ocean font-bold">{label}</div>
        <div className={`text-sm text-deep truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <button
        onClick={copy}
        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-white text-ocean text-xs font-bold rounded-full border border-ocean/30 hover:bg-ocean hover:text-white transition-colors"
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  )
}
