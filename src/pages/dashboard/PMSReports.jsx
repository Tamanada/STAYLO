import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, BedDouble,
  Calendar, Building2, Users, ArrowUpRight, ArrowDownRight,
  Star, Globe
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function MiniBar({ value, max, color = 'bg-ocean' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({ icon: Icon, iconColor, label, value, subvalue, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      {subvalue && <p className="text-[10px] text-gray-400 mt-0.5">{subvalue}</p>}
    </div>
  )
}

export default function PMSReports() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: props } = await supabase
        .from('properties').select('*').eq('user_id', user.id).order('created_at')
      setProperties(props || [])

      const propIds = (props || []).map(p => p.id)
      if (propIds.length > 0) {
        const [roomsRes, bookingsRes] = await Promise.all([
          supabase.from('rooms').select('*').in('property_id', propIds),
          supabase.from('bookings').select('*').in('property_id', propIds).order('created_at', { ascending: false }),
        ])
        setRooms(roomsRes.data || [])
        setBookings(bookingsRes.data || [])
      }
      setLoading(false)
    }
    if (user) fetchData()
  }, [user])

  // Filter by property
  const filteredBookings = useMemo(() => {
    let result = bookings
    if (selectedProperty !== 'all') {
      result = result.filter(b => b.property_id === selectedProperty)
    }
    // Filter by period
    const now = new Date()
    let cutoff = new Date()
    if (period === 'week') cutoff.setDate(now.getDate() - 7)
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1)
    else if (period === 'quarter') cutoff.setMonth(now.getMonth() - 3)
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1)
    result = result.filter(b => new Date(b.created_at) >= cutoff)
    return result
  }, [bookings, selectedProperty, period])

  const filteredRooms = useMemo(() => {
    if (selectedProperty === 'all') return rooms
    return rooms.filter(r => r.property_id === selectedProperty)
  }, [rooms, selectedProperty])

  // Compute metrics
  const totalBookings = filteredBookings.length
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
  const totalNights = filteredBookings.reduce((sum, b) => {
    const nights = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24)))
    return sum + nights
  }, 0)
  const totalRoomCount = filteredRooms.reduce((sum, r) => sum + (r.quantity || 1), 0)

  // ADR (Average Daily Rate)
  const adr = totalNights > 0 ? totalRevenue / totalNights : 0

  // Occupancy (simplified: booked nights / available nights in period)
  const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365
  const availableRoomNights = totalRoomCount * daysInPeriod
  const occupancyRate = availableRoomNights > 0 ? Math.min(100, Math.round((totalNights / availableRoomNights) * 100)) : 0

  // RevPAR (Revenue Per Available Room)
  const revpar = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0

  // Average stay length
  const avgStay = totalBookings > 0 ? (totalNights / totalBookings).toFixed(1) : 0

  // Commission earned by STAYLO (10%)
  const commission = totalRevenue * 0.1
  const hotelRevenue = totalRevenue - commission

  // Monthly revenue chart data (simplified bars)
  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = d.toLocaleString('default', { month: 'short' })
      const monthBookings = bookings.filter(b => {
        const bd = b.created_at?.substring(0, 7)
        return bd === monthKey && (selectedProperty === 'all' || b.property_id === selectedProperty)
      })
      const revenue = monthBookings.reduce((s, b) => s + Number(b.total_price || 0), 0)
      months.push({ label: monthLabel, revenue, bookings: monthBookings.length })
    }
    return months
  }, [bookings, selectedProperty])

  const maxMonthRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('pms.no_properties', 'No properties to manage')}</h2>
        <Link to="/submit" className="px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline">
          {t('pms.add_property', 'Add Property')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-ocean" />
            {t('pms.reports', 'Reports & Analytics')}
          </h1>
          <p className="text-sm text-gray-500">{t('pms.reports_subtitle', 'Key performance metrics for your properties')}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Property filter */}
          <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900">
            <option value="all">{t('pms.all_properties', 'All Properties')}</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Period */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { key: 'week', label: '7D' },
              { key: 'month', label: '30D' },
              { key: 'quarter', label: '90D' },
              { key: 'year', label: '1Y' },
            ].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} iconColor="bg-emerald-100 text-emerald-600"
          label={t('pms.total_revenue', 'Total Revenue')}
          value={`$${totalRevenue.toLocaleString()}`}
          subvalue={`$${hotelRevenue.toLocaleString()} net`}
          trend={12} trendUp={true} />
        <StatCard icon={BedDouble} iconColor="bg-blue-100 text-blue-600"
          label={t('pms.occupancy_rate', 'Occupancy Rate')}
          value={`${occupancyRate}%`}
          subvalue={`${totalNights} room nights`}
          trend={5} trendUp={true} />
        <StatCard icon={TrendingUp} iconColor="bg-purple-100 text-purple-600"
          label="ADR"
          value={`$${adr.toFixed(0)}`}
          subvalue={t('pms.adr_desc', 'Average Daily Rate')} />
        <StatCard icon={Star} iconColor="bg-amber-100 text-amber-600"
          label="RevPAR"
          value={`$${revpar.toFixed(0)}`}
          subvalue={t('pms.revpar_desc', 'Revenue per Available Room')} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Calendar} iconColor="bg-ocean/10 text-ocean"
          label={t('pms.total_bookings', 'Total Bookings')}
          value={totalBookings} />
        <StatCard icon={Users} iconColor="bg-pink-100 text-pink-600"
          label={t('pms.avg_stay', 'Avg. Stay Length')}
          value={`${avgStay} nights`} />
        <StatCard icon={Globe} iconColor="bg-indigo-100 text-indigo-600"
          label={t('pms.properties_count', 'Properties')}
          value={selectedProperty === 'all' ? properties.length : 1} />
        <StatCard icon={TrendingDown} iconColor="bg-red-100 text-red-600"
          label={t('pms.commission', 'STAYLO Commission (10%)')}
          value={`$${commission.toFixed(0)}`}
          subvalue={t('pms.commission_note', 'vs. $' + (totalRevenue * 0.22).toFixed(0) + ' on Booking.com (22%)')} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">{t('pms.revenue_trend', 'Revenue Trend (Last 6 Months)')}</h3>
        <div className="flex items-end gap-2 h-40">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-gray-900">
                {m.revenue > 0 ? `$${m.revenue.toLocaleString()}` : ''}
              </span>
              <div className="w-full flex items-end" style={{ height: '100px' }}>
                <div
                  className="w-full bg-gradient-to-t from-ocean to-electric/70 rounded-t-lg transition-all duration-700 hover:from-ocean/80"
                  style={{ height: `${Math.max(4, (m.revenue / maxMonthRevenue) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Property breakdown */}
      {selectedProperty === 'all' && properties.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">{t('pms.property_breakdown', 'Revenue by Property')}</h3>
          <div className="space-y-3">
            {properties.map(prop => {
              const propBookings = bookings.filter(b => b.property_id === prop.id)
              const propRevenue = propBookings.reduce((s, b) => s + Number(b.total_price || 0), 0)
              return (
                <div key={prop.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">{prop.name}</span>
                    <span className="text-sm font-bold text-gray-900">${propRevenue.toLocaleString()}</span>
                  </div>
                  <MiniBar value={propRevenue} max={totalRevenue || 1} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
