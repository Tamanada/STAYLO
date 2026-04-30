// ============================================
// /admin/transactions — all money flows in one place
// ============================================
// V2 (2026-04-30): KPI cards + date range picker + CSV export +
// per-row actions (open in Stripe / refund / force release escrow).
//
// Three tabs:
//   1. Bookings  — every reservation, with payment + escrow info
//   2. Escrow    — bookings where STAYLO is currently holding funds
//   3. Shares    — Founding Partner share purchases ($1,000 each)
// ============================================
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Calendar, Search, CheckCircle, XCircle, Clock, ExternalLink,
  Download, MoreVertical, RefreshCw, RotateCcw, Mail, Lock, Gem,
  Banknote, ZapOff, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency } from '../../lib/currencies'

const TABS = [
  { key: 'bookings', label: 'Bookings',  icon: Calendar },
  { key: 'escrow',   label: 'Escrow',    icon: Lock },
  { key: 'shares',   label: 'Shares',    icon: Gem },
]

const BOOKING_STATUS_CONFIG = {
  pending:   { variant: 'orange', label: 'Pending' },
  confirmed: { variant: 'green',  label: 'Confirmed' },
  completed: { variant: 'blue',   label: 'Completed' },
  cancelled: { variant: 'gray',   label: 'Cancelled' },
}

const ESCROW_STATUS_CONFIG = {
  none:     { variant: 'gray',   label: '—' },
  held:     { variant: 'orange', label: 'Held' },
  released: { variant: 'green',  label: 'Released' },
  refunded: { variant: 'gray',   label: 'Refunded' },
  failed:   { variant: 'sunset', label: 'Failed' },
}

const PAYMENT_METHOD_LABELS = {
  card:        '💳 Card',
  lightning:   '⚡ Lightning',
  btc_onchain: '₿ BTC',
}

// Stripe dashboard URL — switches to /test/ if VITE env says we're on test mode
function stripeDashboardUrl(paymentIntentId) {
  if (!paymentIntentId) return null
  const isTest = import.meta.env.VITE_STRIPE_MODE !== 'live'
  return `https://dashboard.stripe.com${isTest ? '/test' : ''}/payments/${paymentIntentId}`
}

// Generate + trigger CSV download from an array of objects.
// Header = first row's keys. Values are JSON.stringify'd to handle commas/quotes safely.
function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    alert('Nothing to export — empty list.')
    return
  }
  const headers = Object.keys(rows[0])
  const escape = v => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [shares, setShares] = useState([])
  const [propsById, setPropsById] = useState({})
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [bookingFilter, setBookingFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')   // yyyy-mm-dd
  const [dateTo, setDateTo] = useState('')

  async function fetchAll() {
    setLoading(true)
    const [bRes, sRes, pRes, uRes] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('shares').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name, city, country, currency'),
      supabase.from('users').select('id, email, full_name'),
    ])
    setBookings(bRes.data || [])
    setShares(sRes.data || [])
    const pm = {}; (pRes.data || []).forEach(p => { pm[p.id] = p })
    const um = {}; (uRes.data || []).forEach(u => { um[u.id] = u })
    setPropsById(pm)
    setUsersById(um)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── Date range filter helper ──────────────────────────
  function withinDateRange(createdAt) {
    if (!createdAt) return true
    const ts = new Date(createdAt).getTime()
    if (dateFrom) {
      if (ts < new Date(dateFrom + 'T00:00:00').getTime()) return false
    }
    if (dateTo) {
      if (ts > new Date(dateTo + 'T23:59:59').getTime()) return false
    }
    return true
  }

  // ── KPIs (computed on date-range filtered set) ────────
  const kpis = useMemo(() => {
    const dateFiltered = bookings.filter(b => withinDateRange(b.created_at))
    const dateFilteredShares = shares.filter(s => withinDateRange(s.created_at))

    const nonCancelled = dateFiltered.filter(b => b.status !== 'cancelled')
    const escrowHeld = dateFiltered.filter(b => b.escrow_status === 'held')
    const sharesPaid = dateFilteredShares.filter(s => s.payment_confirmed)

    return {
      totalBookings:    nonCancelled.length,
      totalRevenue:     nonCancelled.reduce((s, b) => s + Number(b.total_price || 0), 0),
      totalCommission:  nonCancelled.reduce((s, b) => s + Number(b.commission || 0), 0),
      escrowCount:      escrowHeld.length,
      escrowAmount:     escrowHeld.reduce((s, b) => {
                          if (b.payout_amount_cents) return s + (b.payout_amount_cents / 100)
                          return s + Number(b.total_price || 0) * 0.9
                        }, 0),
      sharesSold:       sharesPaid.length,
      sharesRevenue:    sharesPaid.reduce((s, x) => s + Number(x.total_amount || 0), 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, shares, dateFrom, dateTo])

  // ── Filtered lists ────────────────────────────────────
  const filteredBookings = useMemo(() => {
    let list = bookings.filter(b => withinDateRange(b.created_at))
    if (bookingFilter !== 'all') list = list.filter(b => b.status === bookingFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        (b.booking_ref || '').toLowerCase().includes(q) ||
        (b.guest_name || '').toLowerCase().includes(q) ||
        (b.guest_email || '').toLowerCase().includes(q) ||
        (propsById[b.property_id]?.name || '').toLowerCase().includes(q)
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, bookingFilter, search, propsById, dateFrom, dateTo])

  const escrowBookings = useMemo(
    () => bookings.filter(b => b.escrow_status === 'held' && withinDateRange(b.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, dateFrom, dateTo]
  )

  const filteredShares = useMemo(() => {
    let list = shares.filter(s => withinDateRange(s.created_at))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        (s.reference_code || '').toLowerCase().includes(q) ||
        (usersById[s.user_id]?.email || '').toLowerCase().includes(q) ||
        (propsById[s.property_id]?.name || '').toLowerCase().includes(q)
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shares, search, usersById, propsById, dateFrom, dateTo])

  // ── Action handlers ───────────────────────────────────
  async function handleForceRelease(booking) {
    if (!confirm(
      `Force release escrow for ${booking.booking_ref || booking.id.slice(0,8)}?\n\n` +
      `This will transfer ~${formatCurrency((booking.payout_amount_cents || booking.total_price * 90) / 100, booking.currency || 'USD')} ` +
      `to the hotelier's Stripe account immediately, without waiting for the post-stay questionnaire.`
    )) return

    try {
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: { booking_id: booking.id, force: true },
      })
      if (error) throw error
      alert(`✓ Release initiated.\n${JSON.stringify(data, null, 2)}`)
      await fetchAll()
    } catch (err) {
      alert(`Force release failed: ${err.message || err}`)
    }
  }

  async function handleRefund(booking) {
    if (!confirm(
      `Refund booking ${booking.booking_ref || booking.id.slice(0,8)} for ` +
      `${formatCurrency(Number(booking.total_price || 0), booking.currency || 'USD')}?\n\n` +
      `This will:\n` +
      `  • Issue a Stripe refund to the guest's card\n` +
      `  • Set booking status to "cancelled"\n` +
      `  • Cancel any held escrow\n\n` +
      `This action cannot be undone.`
    )) return

    try {
      const { data, error } = await supabase.functions.invoke('refund-booking', {
        body: { booking_id: booking.id },
      })
      if (error) throw error
      alert(`✓ Refund processed: ${data.refund_id}\n${formatCurrency(data.amount_refunded, data.currency || 'USD')}`)
      await fetchAll()
    } catch (err) {
      alert(`Refund failed: ${err.message || err}`)
    }
  }

  function handleResendConfirmation(booking) {
    alert(
      'Resend confirmation email is not yet wired.\n\n' +
      'It will be available once Chantier #4 (transactional email via Resend) ships.\n' +
      'For now, you can reach the guest manually:\n\n' +
      `${booking.guest_email || '(no email on file)'}`
    )
  }

  // ── CSV exporters ─────────────────────────────────────
  function exportBookingsCSV() {
    const rows = filteredBookings.map(b => ({
      booking_ref: b.booking_ref || '',
      created_at: b.created_at,
      status: b.status,
      guest_name: b.guest_name || '',
      guest_email: b.guest_email || '',
      property: propsById[b.property_id]?.name || '',
      check_in: b.check_in,
      check_out: b.check_out,
      guests: b.guests,
      payment_method: b.payment_method || '',
      total_price: b.total_price,
      commission: b.commission,
      currency: b.currency || propsById[b.property_id]?.currency || 'USD',
      escrow_status: b.escrow_status || '',
      stripe_payment_intent_id: b.stripe_payment_intent_id || '',
      stripe_transfer_id: b.stripe_transfer_id || '',
    }))
    downloadCSV(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  function exportSharesCSV() {
    const rows = filteredShares.map(s => ({
      reference_code: s.reference_code || '',
      created_at: s.created_at,
      buyer_email: usersById[s.user_id]?.email || '',
      buyer_name: usersById[s.user_id]?.full_name || '',
      property: propsById[s.property_id]?.name || '',
      quantity: s.quantity,
      price_per_share: s.price_per_share,
      total_amount: s.total_amount,
      loi_signed: s.loi_signed,
      contract_signed: s.contract_signed,
      payment_confirmed: s.payment_confirmed,
    }))
    downloadCSV(`shares-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading transactions…</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-deep">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">All money flows on STAYLO — bookings, escrow, share purchases.</p>
        </div>
        <button onClick={fetchAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:text-deep transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Calendar} label="Bookings" value={kpis.totalBookings}
          subline={`Revenue: ${formatCurrency(kpis.totalRevenue, 'USD')}`} color="ocean" />
        <KpiCard icon={Banknote} label="STAYLO Commission" value={formatCurrency(kpis.totalCommission, 'USD')}
          subline="10% of all bookings" color="libre" />
        <KpiCard icon={Lock} label="Escrow Held" value={formatCurrency(kpis.escrowAmount, 'USD')}
          subline={`${kpis.escrowCount} booking${kpis.escrowCount !== 1 ? 's' : ''} pending payout`} color="orange" />
        <KpiCard icon={Gem} label="Shares Sold" value={kpis.sharesSold}
          subline={`Raised: ${formatCurrency(kpis.sharesRevenue, 'USD')}`} color="electric" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'bookings' ? bookings.length
                      : tab.key === 'escrow'   ? escrowBookings.length
                      :                          shares.length
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.key ? 'bg-white shadow-sm text-deep' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={14} />
              {tab.label}
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Toolbar — search + date range + export */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text"
            placeholder={
              activeTab === 'shares' ? 'Search by code, email, property…'
              : 'Search by booking ref, guest, property…'
            }
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean" />
        </div>

        {/* Date range — applies to both tabs (filters by created_at) */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2">
          <span className="text-[11px] text-gray-400 font-medium">Range</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-xs px-1 py-1.5 bg-transparent focus:outline-none" />
          <span className="text-gray-300">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-xs px-1 py-1.5 bg-transparent focus:outline-none" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-gray-400 hover:text-deep text-xs ml-1" title="Clear range">
              ✕
            </button>
          )}
        </div>

        {/* Export current tab */}
        <button
          onClick={activeTab === 'shares' ? exportSharesCSV : exportBookingsCSV}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:border-ocean hover:text-ocean transition-all">
          <Download size={14} /> Export CSV
        </button>

        {activeTab === 'bookings' && (
          <div className="flex gap-1 w-full">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
              <button key={f} onClick={() => setBookingFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  bookingFilter === f ? 'bg-ocean text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                }`}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'bookings' && (
        <BookingsTable bookings={filteredBookings} propsById={propsById} usersById={usersById}
          onForceRelease={handleForceRelease} onRefund={handleRefund} onResend={handleResendConfirmation} />
      )}
      {activeTab === 'escrow' && (
        <BookingsTable bookings={escrowBookings} propsById={propsById} usersById={usersById} escrowMode
          onForceRelease={handleForceRelease} onRefund={handleRefund} onResend={handleResendConfirmation} />
      )}
      {activeTab === 'shares' && (
        <SharesTable shares={filteredShares} propsById={propsById} usersById={usersById} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, subline, color = 'ocean' }) {
  const colorMap = {
    ocean:    { bg: 'bg-ocean/10',    text: 'text-ocean' },
    libre:    { bg: 'bg-libre/10',    text: 'text-libre' },
    orange:   { bg: 'bg-orange/10',   text: 'text-orange' },
    electric: { bg: 'bg-electric/10', text: 'text-electric' },
  }
  const c = colorMap[color] || colorMap.ocean
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
          <Icon size={14} className={c.text} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-deep">{value}</p>
      {subline && <p className="text-[11px] text-gray-400 mt-1">{subline}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────
function BookingsTable({ bookings, propsById, usersById, escrowMode = false, onForceRelease, onRefund, onResend }) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          {escrowMode ? 'No funds currently held in escrow.' : 'No bookings match your filter.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Ref</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Guest</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Property</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Stay</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Commission</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Pay</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Escrow</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const prop = propsById[b.property_id]
              const currency = (b.currency || prop?.currency || 'USD').toUpperCase()
              const cfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.pending
              const escrowCfg = ESCROW_STATUS_CONFIG[b.escrow_status] || ESCROW_STATUS_CONFIG.none
              const stripeUrl = stripeDashboardUrl(b.stripe_payment_intent_id)
              return (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-orange/80">{b.booking_ref || b.id.slice(0, 8)}</span>
                    {stripeUrl && (
                      <a href={stripeUrl} target="_blank" rel="noopener noreferrer"
                        className="ml-1.5 inline-flex items-center text-gray-300 hover:text-ocean"
                        title="Open in Stripe Dashboard">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-deep">{b.guest_name || '—'}</p>
                    {b.guest_email && (
                      <a href={`mailto:${b.guest_email}`} className="text-[11px] text-gray-400 hover:text-ocean">
                        {b.guest_email}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-deep">{prop?.name || '—'}</p>
                    {prop && <p className="text-[11px] text-gray-400">{prop.city}, {prop.country}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {b.check_in} → {b.check_out}
                    <p className="text-[11px] text-gray-400">{b.guests || 1} guest{(b.guests || 1) > 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-deep whitespace-nowrap">
                    {formatCurrency(Number(b.total_price || 0), currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-libre font-medium whitespace-nowrap">
                    {formatCurrency(Number(b.commission || 0), currency)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                    {PAYMENT_METHOD_LABELS[b.payment_method] || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={escrowCfg.variant}>{escrowCfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionsMenu
                      booking={b}
                      onForceRelease={() => onForceRelease(b)}
                      onRefund={() => onRefund(b)}
                      onResend={() => onResend(b)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────
function ActionsMenu({ booking, onForceRelease, onRefund, onResend }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const canRelease = booking.escrow_status === 'held'
  const canRefund  = booking.stripe_payment_intent_id && booking.status !== 'cancelled'

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-deep cursor-pointer">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
          <ActionItem icon={ZapOff} label="Force release escrow" disabled={!canRelease}
            disabledReason={canRelease ? null : 'Only available when escrow is held'}
            onClick={() => { setOpen(false); onForceRelease() }} />
          <ActionItem icon={RotateCcw} label="Refund this booking" disabled={!canRefund} danger
            disabledReason={!booking.stripe_payment_intent_id ? 'No Stripe payment to refund' : 'Already cancelled'}
            onClick={() => { setOpen(false); onRefund() }} />
          <ActionItem icon={Mail} label="Resend confirmation" disabled
            disabledReason="Available with Chantier #4 (Resend integration)"
            onClick={() => { setOpen(false); onResend() }} />
        </div>
      )}
    </div>
  )
}

function ActionItem({ icon: Icon, label, onClick, disabled, danger, disabledReason }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
        disabled
          ? 'text-gray-300 cursor-not-allowed'
          : danger
            ? 'text-red-600 hover:bg-red-50 cursor-pointer'
            : 'text-deep hover:bg-gray-50 cursor-pointer'
      }`}
    >
      <Icon size={14} />
      <span className="font-medium">{label}</span>
    </button>
  )
}

// ──────────────────────────────────────────────────────
function SharesTable({ shares, propsById, usersById }) {
  if (shares.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Gem size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No share purchases yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Code</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Buyer</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Property</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Quantity</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">LOI</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Contract</th>
              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Paid</th>
            </tr>
          </thead>
          <tbody>
            {shares.map(s => {
              const buyer = usersById[s.user_id]
              const prop = propsById[s.property_id]
              return (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-electric/80">
                    {s.reference_code || s.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-deep">{buyer?.full_name || '—'}</p>
                    {buyer?.email && (
                      <a href={`mailto:${buyer.email}`} className="text-[11px] text-gray-400 hover:text-ocean">
                        {buyer.email}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-deep">{prop?.name || '—'}</p>
                    {prop && <p className="text-[11px] text-gray-400">{prop.city}, {prop.country}</p>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {s.quantity} × ${Number(s.price_per_share).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-deep whitespace-nowrap">
                    {formatCurrency(Number(s.total_amount), 'USD')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.loi_signed ? <CheckCircle size={14} className="text-libre mx-auto" /> : <Clock size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.contract_signed ? <CheckCircle size={14} className="text-libre mx-auto" /> : <Clock size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.payment_confirmed ? <Badge variant="green">Paid</Badge> : <Badge variant="orange">Pending</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
