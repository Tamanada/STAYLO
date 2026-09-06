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
// Sections (Chunks 1 + 2 live):
//   1. Hero (property + booking + room + nights + status pill)
//   2. WiFi (SSID + password with big copy buttons)
//   3. Essentials (checkout time, contact, address with map link)
//   4. Amenities badges (visual inventory)
//   5. House rules (if set)
//   6. My wallet — voucher cards, tap to open full-screen QR for the venue scan
//   7. My folio — running tab (unpaid highlighted, paid muted)
//   8. Placeholders for Chunks 3-4: request extras, cancel booking
//
// Chunks 3-4 will wire the last placeholders. Design deliberately "richer
// than PublicCheckIn" — investor-demo target.
// ============================================================================
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  Loader2, AlertTriangle, MapPin, Calendar, BedDouble, Clock,
  Phone, Mail, Globe, Wifi, Copy, Check, ScrollText, Sparkles,
  Gift, Receipt, MessageSquare, XCircle, Home, X,
  Coffee, GlassWater, Flower2, Dumbbell, Car, Sparkle, Package,
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

// Icon per voucher kind — matches SHIP venue taxonomy from
// project_staylo_vouchers_folio.md. Fallback = Sparkle.
const VOUCHER_ICON = {
  restaurant: Coffee,
  bar:        GlassWater,
  spa:        Flower2,
  wellness:   Dumbbell,
  transport:  Car,
  tour:       Sparkles,
  gift_shop:  Package,
  other:      Sparkle,
}
// Accent gradient per voucher kind (matches Card SectionHeader style)
const VOUCHER_ACCENT = {
  restaurant: 'from-orange to-pink-500',
  bar:        'from-libre to-ocean',
  spa:        'from-pink-500 to-orange',
  wellness:   'from-ocean to-libre',
  transport:  'from-libre to-ocean',
  tour:       'from-orange to-libre',
  gift_shop:  'from-libre to-pink-500',
  other:      'from-gray-400 to-gray-500',
}

// Small currency-symbol map. Falls back to the code itself so hoteliers
// running exotic currencies still see something readable.
const CURRENCY_SYMBOL = {
  USD: '$', EUR: '€', GBP: '£', THB: '฿', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$', INR: '₹', KRW: '₩',
}
function fmtMoney(amount, code) {
  const n = Number(amount || 0)
  const sym = CURRENCY_SYMBOL[code] || code || ''
  // Compact: 2 decimals when needed, no forced padding.
  const str = n.toFixed(2).replace(/\.00$/, '')
  return `${sym}${n < 0 ? '-' : ''}${Math.abs(Number(str)).toFixed(2).replace(/\.00$/, '')}`
}

// Short human "3h ago" / "just now" for folio charged_at
function timeAgo(iso) {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const s = Math.floor((now - then) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86400)
  if (d < 7) return `${d} d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
  const [vouchers, setVouchers] = useState([])
  const [folio, setFolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Currently zoomed voucher (full-screen QR for scanning). null = list view.
  const [zoomedVoucherId, setZoomedVoucherId] = useState(null)

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
    // Fan out the three RPCs in parallel. Wallet + folio failures are
    // non-fatal (page still renders) — we only block on get_stay_view.
    Promise.all([
      supabase.rpc('get_stay_view',     { p_token: token }),
      supabase.rpc('get_stay_vouchers', { p_token: token }),
      supabase.rpc('get_stay_folio',    { p_token: token }),
    ]).then(([viewRes, vouRes, folRes]) => {
      if (cancelled) return
      if (viewRes.error) {
        setLoadError('Could not load your stay page. Please try again.')
      } else if (!viewRes.data || viewRes.data.length === 0) {
        setLoadError('This stay link has expired or the booking was cancelled.')
      } else {
        setStay(viewRes.data[0])
      }
      if (!vouRes.error && Array.isArray(vouRes.data)) setVouchers(vouRes.data)
      if (!folRes.error && folRes.data && folRes.data.length > 0) setFolio(folRes.data[0])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token])

  const zoomedVoucher = vouchers.find(v => v.id === zoomedVoucherId)

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

      {/* ── My wallet (vouchers) ─────────────────────────────────────── */}
      {vouchers.length > 0 && (
        <Card>
          <SectionHeader icon={<Gift size={18} />} title="My wallet" accent="from-libre to-ocean" />
          <p className="text-[11px] text-gray-500 mt-1">Tap a voucher to show its QR at the venue.</p>
          <div className="mt-3 space-y-2">
            {vouchers.map(v => (
              <VoucherRow key={v.id} voucher={v} onOpen={() => setZoomedVoucherId(v.id)} />
            ))}
          </div>
        </Card>
      )}

      {/* ── My folio (running tab) ───────────────────────────────────── */}
      {folio && Array.isArray(folio.charges) && folio.charges.length > 0 && (
        <Card>
          <SectionHeader icon={<Receipt size={18} />} title="My folio" accent="from-ocean to-libre" />

          <div className="grid grid-cols-3 gap-2 mt-3">
            <FolioStat label="Total"  value={fmtMoney(folio.total,  folio.currency)} />
            <FolioStat label="Paid"   value={fmtMoney(folio.paid,   folio.currency)} tone="paid" />
            <FolioStat label="Unpaid" value={fmtMoney(folio.unpaid, folio.currency)} tone="unpaid" />
          </div>

          <div className="mt-3 space-y-1.5">
            {folio.charges.map(c => (
              <div key={c.id} className={`flex items-start justify-between gap-2 p-2.5 rounded-xl ${c.paid ? 'bg-gray-50' : 'bg-orange/5 border border-orange/20'}`}>
                <div className="min-w-0">
                  <div className="text-sm text-deep truncate">{c.description || c.category}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {c.category} · {timeAgo(c.charged_at)}
                  </div>
                </div>
                <div className={`flex-shrink-0 text-sm font-bold ${c.paid ? 'text-gray-500 line-through' : 'text-deep'}`}>
                  {fmtMoney(c.amount, c.currency || folio.currency)}
                </div>
              </div>
            ))}
          </div>

          {Number(folio.unpaid) > 0 && (
            <p className="mt-3 text-[11px] text-gray-500 italic">
              Unpaid items settle at check-out.
            </p>
          )}
        </Card>
      )}

      {/* ── Coming soon (Chunks 3-4) ─────────────────────────────────── */}
      <Card muted>
        <SectionHeader icon={<Sparkles size={18} />} title="More coming to this page" accent="from-gray-400 to-gray-500" small />
        <ul className="mt-3 space-y-2 text-sm text-gray-500">
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

      {/* Full-screen QR overlay — the guest holds their phone in front of
          the venue staff who scans. Big code + big QR = readable at arm's
          length, works even in a bright poolside setting. */}
      {zoomedVoucher && (
        <ZoomedVoucher voucher={zoomedVoucher} onClose={() => setZoomedVoucherId(null)} />
      )}
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

// ── Wallet: single voucher card in the wallet list. Tap to open the
//    full-screen QR overlay (ZoomedVoucher). Dead when qty_remaining=0.
function VoucherRow({ voucher, onOpen }) {
  const Icon = VOUCHER_ICON[voucher.kind] || Sparkle
  const accent = VOUCHER_ACCENT[voucher.kind] || 'from-orange to-pink-500'
  const remaining = voucher.qty_remaining ?? (voucher.qty_total - voucher.qty_consumed)
  const spent = remaining === 0
  return (
    <button
      type="button"
      disabled={spent}
      onClick={onOpen}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all ${
        spent
          ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
          : 'bg-white border-gray-100 hover:border-libre/40 hover:shadow-md active:scale-[0.99]'
      }`}
    >
      <span className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-deep truncate">{voucher.label}</div>
        {voucher.description && (
          <div className="text-[11px] text-gray-500 truncate">{voucher.description}</div>
        )}
      </div>
      <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
        spent
          ? 'bg-gray-100 text-gray-400'
          : remaining < voucher.qty_total
            ? 'bg-orange/10 text-orange'
            : 'bg-libre/10 text-libre'
      }`}>
        {spent ? 'used' : `${remaining} × left`}
      </span>
    </button>
  )
}

// ── Wallet: full-screen QR overlay for the venue scan. Locked scroll on
//    open (venue staff usually holds the phone). Tap anywhere to close.
function ZoomedVoucher({ voucher, onClose }) {
  const remaining = voucher.qty_remaining ?? (voucher.qty_total - voucher.qty_consumed)
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(26,31,46,.92)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
        >
          <X size={16} />
        </button>
        <div className="text-[10px] uppercase tracking-widest text-libre font-bold mb-1">Show at venue</div>
        <div className="text-lg font-extrabold text-deep mb-1">{voucher.label}</div>
        <div className="text-xs text-gray-500 mb-4">{remaining} × remaining</div>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 inline-block mb-3">
          <QRCodeSVG value={voucher.voucher_code} size={200} level="M" includeMargin={false} />
        </div>
        <div className="text-xs text-gray-500 mb-1">Backup code</div>
        <div className="font-mono text-base font-bold text-deep tracking-widest">{voucher.voucher_code}</div>
      </div>
    </div>
  )
}

// ── Folio: single "Total / Paid / Unpaid" stat cell above the charge list.
function FolioStat({ label, value, tone }) {
  const cls =
    tone === 'paid'   ? 'bg-libre/10 text-libre' :
    tone === 'unpaid' ? 'bg-orange/10 text-orange' :
                        'bg-ocean/10 text-ocean'
  return (
    <div className={`p-2.5 rounded-xl text-center ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
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
