// ============================================
// /admin/transactions — all money flows in one place
// ============================================
// Three tabs:
//   1. Bookings  — every reservation, with payment + escrow info
//   2. Escrow    — bookings where STAYLO is currently holding funds
//                  (Stripe SCT model: charged to platform, awaits transfer
//                  to hotelier after check-out + questionnaire)
//   3. Shares    — Founding Partner share purchases ($1,000 each)
//
// KPI cards at the top show the running totals an operator needs at a
// glance: total revenue, escrow balance, commissions earned, total raised.
// ============================================
import { useState, useEffect, useMemo } from 'react'
import {
  CreditCard, Wallet, Banknote, Lock, Gem, Search, Calendar,
  CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Users
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
  pending:   { variant: 'orange', label: 'Pending',   icon: Clock },
  confirmed: { variant: 'green',  label: 'Confirmed', icon: CheckCircle },
  completed: { variant: 'blue',   label: 'Completed', icon: CheckCircle },
  cancelled: { variant: 'gray',   label: 'Cancelled', icon: XCircle },
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

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [shares, setShares] = useState([])
  const [propsById, setPropsById] = useState({})
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [bookingFilter, setBookingFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      const [bRes, sRes, pRes, uRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('shares').select('*').order('created_at', { ascending: false }),
        supabase.from('properties').select('id, name, city, country, currency'),
        supabase.from('users').select('id, email, full_name'),
      ])
      if (cancelled) return

      setBookings(bRes.data || [])
      setShares(sRes.data || [])
      const pm = {}; (pRes.data || []).forEach(p => { pm[p.id] = p })
      const um = {}; (uRes.data || []).forEach(u => { um[u.id] = u })
      setPropsById(pm)
      setUsersById(um)
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  // ── KPIs ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const nonCancelled = bookings.filter(b => b.status !== 'cancelled')
    const escrowHeld = bookings.filter(b => b.escrow_status === 'held')
    const sharesPaid = shares.filter(s => s.payment_confirmed)

    return {
      totalBookings:    nonCancelled.length,
      totalRevenue:     nonCancelled.reduce((s, b) => s + Number(b.total_price || 0), 0),
      totalCommission:  nonCancelled.reduce((s, b) => s + Number(b.commission || 0), 0),
      escrowCount:      escrowHeld.length,
      escrowAmount:     escrowHeld.reduce((s, b) => {
                          // payout_amount_cents is the hotelier's share that's locked
                          if (b.payout_amount_cents) return s + (b.payout_amount_cents / 100)
                          return s + Number(b.total_price || 0) * 0.9
                        }, 0),
      sharesSold:       sharesPaid.length,
      sharesRevenue:    sharesPaid.reduce((s, x) => s + Number(x.total_amount || 0), 0),
    }
  }, [bookings, shares])

  // ── Filter helpers ────────────────────────────────────
  const filteredBookings = useMemo(() => {
    let list = bookings
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
  }, [bookings, bookingFilter, search, propsById])

  const escrowBookings = useMemo(
    () => bookings.filter(b => b.escrow_status === 'held'),
    [bookings]
  )

  const filteredShares = useMemo(() => {
    if (!search.trim()) return shares
    const q = search.toLowerCase()
    return shares.filter(s =>
      (s.reference_code || '').toLowerCase().includes(q) ||
      (usersById[s.user_id]?.email || '').toLowerCase().includes(q) ||
      (propsById[s.property_id]?.name || '').toLowerCase().includes(q)
    )
  }, [shares, search, usersById, propsById])

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading transactions…</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">All money flows on STAYLO — bookings, escrow, share purchases.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Calendar}
          label="Bookings"
          value={kpis.totalBookings}
          subline={`Revenue: ${formatCurrency(kpis.totalRevenue, 'USD')}`}
          color="ocean"
        />
        <KpiCard
          icon={Banknote}
          label="STAYLO Commission"
          value={formatCurrency(kpis.totalCommission, 'USD')}
          subline="10% of all bookings"
          color="libre"
        />
        <KpiCard
          icon={Lock}
          label="Escrow Held"
          value={formatCurrency(kpis.escrowAmount, 'USD')}
          subline={`${kpis.escrowCount} booking${kpis.escrowCount !== 1 ? 's' : ''} pending payout`}
          color="orange"
        />
        <KpiCard
          icon={Gem}
          label="Shares Sold"
          value={kpis.sharesSold}
          subline={`Raised: ${formatCurrency(kpis.sharesRevenue, 'USD')}`}
          color="electric"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'bookings' ? bookings.length
                      : tab.key === 'escrow'   ? escrowBookings.length
                      :                          shares.length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-white shadow-sm text-deep'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'bookings' ? 'Search by booking ref, guest, property…'
              : activeTab === 'shares' ? 'Search by code, email, property…'
              : 'Search…'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean"
          />
        </div>
        {activeTab === 'bookings' && (
          <div className="flex gap-1">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
              <button key={f} onClick={() => setBookingFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  bookingFilter === f
                    ? 'bg-ocean text-white shadow-sm'
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
        <BookingsTable bookings={filteredBookings} propsById={propsById} usersById={usersById} />
      )}
      {activeTab === 'escrow' && (
        <BookingsTable bookings={escrowBookings} propsById={propsById} usersById={usersById} escrowMode />
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
function BookingsTable({ bookings, propsById, usersById, escrowMode = false }) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          {escrowMode
            ? 'No funds currently held in escrow.'
            : 'No bookings match your filter.'}
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
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const prop = propsById[b.property_id]
              const currency = (b.currency || prop?.currency || 'USD').toUpperCase()
              const cfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.pending
              const escrowCfg = ESCROW_STATUS_CONFIG[b.escrow_status] || ESCROW_STATUS_CONFIG.none
              return (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-orange/80">
                    {b.booking_ref || b.id.slice(0, 8)}
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
                    {prop && (
                      <p className="text-[11px] text-gray-400">{prop.city}, {prop.country}</p>
                    )}
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
                    {s.payment_confirmed
                      ? <Badge variant="green">Paid</Badge>
                      : <Badge variant="orange">Pending</Badge>}
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
