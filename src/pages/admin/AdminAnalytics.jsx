// ============================================================================
// AdminAnalytics — visitor counter dashboard (admin-only)
// ============================================================================
// Reads from public.page_views and aggregates client-side into:
//   - 4 KPI tiles: Today / This week / This month / This year
//   - Daily visitors line chart (last 30 days)
//   - Top 10 pages by views
//   - Top 10 referrers (where traffic came from)
//   - Device split (mobile / tablet / desktop)
//   - Logged-in vs anonymous split
//
// Pulls 1 year of raw rows in chunks (PostgREST 1000-row cap), aggregates
// in JS. At 500 rows/day this is 180k rows/year — heavy but loadable in
// ~5-10 seconds. We can switch to materialised views if it gets slow.
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import {
  Eye, Users, Smartphone, Monitor, Tablet, Globe, ExternalLink,
  Loader2, TrendingUp, Calendar, RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const PAGE_SIZE = 1000

export default function AdminAnalytics() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [period, setPeriod] = useState('month')   // 'day' | 'week' | 'month' | 'year'

  async function load() {
    setLoading(true)
    setProgress({ done: 0, total: 0 })

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const since = oneYearAgo.toISOString()

    const first = await supabase
      .from('page_views')
      .select('*', { count: 'exact' })
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    if (first.error) {
      console.error('Failed to load page_views:', first.error)
      setLoading(false)
      return
    }

    const total = first.count || 0
    setProgress({ done: first.data?.length || 0, total })
    let acc = first.data || []
    setRows(acc)

    for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) { console.error(error); break }
      acc = acc.concat(data || [])
      setRows(acc)
      setProgress({ done: acc.length, total })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ────────────────────────────────────────────────────────────────────────
  // Period boundaries — used for the 4 KPI tiles
  // ────────────────────────────────────────────────────────────────────────
  const now = useMemo(() => new Date(), [])
  const startOfToday = useMemo(() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d
  }, [now])
  const startOfWeek = useMemo(() => {
    const d = new Date(startOfToday); d.setDate(d.getDate() - d.getDay()); return d   // Sunday
  }, [startOfToday])
  const startOfMonth = useMemo(() => {
    const d = new Date(startOfToday); d.setDate(1); return d
  }, [startOfToday])
  const startOfYear = useMemo(() => {
    const d = new Date(startOfToday); d.setMonth(0); d.setDate(1); return d
  }, [startOfToday])

  // ────────────────────────────────────────────────────────────────────────
  // Aggregations
  // ────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const inRange = (d, since) => d >= since.getTime()
    const counts = {
      today_views: 0, today_uniques: new Set(),
      week_views:  0, week_uniques:  new Set(),
      month_views: 0, month_uniques: new Set(),
      year_views:  0, year_uniques:  new Set(),
      total_views: rows.length,
      unique_visitors: new Set(),
      logged_in: 0, anonymous: 0,
      mobile: 0, tablet: 0, desktop: 0,
    }

    for (const r of rows) {
      const t = new Date(r.created_at).getTime()
      counts.unique_visitors.add(r.session_id)
      if (r.user_id) counts.logged_in++
      else           counts.anonymous++
      if (r.device === 'mobile')  counts.mobile++
      else if (r.device === 'tablet') counts.tablet++
      else                        counts.desktop++

      if (inRange(t, startOfYear))  { counts.year_views++;  counts.year_uniques.add(r.session_id) }
      if (inRange(t, startOfMonth)) { counts.month_views++; counts.month_uniques.add(r.session_id) }
      if (inRange(t, startOfWeek))  { counts.week_views++;  counts.week_uniques.add(r.session_id) }
      if (inRange(t, startOfToday)) { counts.today_views++; counts.today_uniques.add(r.session_id) }
    }
    return {
      today: { views: counts.today_views, uniques: counts.today_uniques.size },
      week:  { views: counts.week_views,  uniques: counts.week_uniques.size },
      month: { views: counts.month_views, uniques: counts.month_uniques.size },
      year:  { views: counts.year_views,  uniques: counts.year_uniques.size },
      total_views: counts.total_views,
      unique_visitors: counts.unique_visitors.size,
      logged_in: counts.logged_in, anonymous: counts.anonymous,
      mobile: counts.mobile, tablet: counts.tablet, desktop: counts.desktop,
    }
  }, [rows, startOfToday, startOfWeek, startOfMonth, startOfYear])

  // Daily timeline for the chart (last 30 days)
  const dailySeries = useMemo(() => {
    const buckets = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(startOfToday); d.setDate(d.getDate() - i)
      buckets[d.toISOString().slice(0, 10)] = { views: 0, uniques: new Set() }
    }
    for (const r of rows) {
      const dayKey = r.created_at.slice(0, 10)
      if (buckets[dayKey]) {
        buckets[dayKey].views++
        buckets[dayKey].uniques.add(r.session_id)
      }
    }
    return Object.entries(buckets).map(([day, v]) => ({
      day, views: v.views, uniques: v.uniques.size,
    }))
  }, [rows, startOfToday])

  // Top pages
  const topPages = useMemo(() => {
    const map = {}
    for (const r of rows) map[r.path] = (map[r.path] || 0) + 1
    return Object.entries(map)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [rows])

  // Top referrers (cleaned up — strip query strings, group by domain)
  const topReferrers = useMemo(() => {
    const map = {}
    for (const r of rows) {
      if (!r.referrer) continue
      try {
        const u = new URL(r.referrer)
        if (u.hostname === 'staylo.app') continue   // skip internal
        map[u.hostname] = (map[u.hostname] || 0) + 1
      } catch { /* invalid URL — skip */ }
    }
    return Object.entries(map)
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [rows])

  // Max bar value for chart scaling
  const maxDaily = useMemo(() =>
    Math.max(1, ...dailySeries.map(d => period === 'uniques' ? d.uniques : d.views))
  , [dailySeries, period])

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep">Visitor Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading
              ? `Loading ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} events…`
              : `${stats.total_views.toLocaleString()} page views from ${stats.unique_visitors.toLocaleString()} unique sessions (last 12 months)`}
          </p>
        </div>
        <Button onClick={load} variant="secondary" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </Button>
      </div>

      {/* Loading bar while fetching */}
      {loading && progress.total > 0 && (
        <div className="mb-4 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-ocean to-electric transition-all"
            style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }} />
        </div>
      )}

      {/* 4 KPI tiles — Today / Week / Month / Year */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile period="Today"      data={stats.today}  highlight />
        <KpiTile period="This week"  data={stats.week} />
        <KpiTile period="This month" data={stats.month} />
        <KpiTile period="This year"  data={stats.year} />
      </div>

      {/* Daily chart — last 30 days */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-deep flex items-center gap-2">
              <TrendingUp size={16} /> Last 30 days
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Bar height = page views per day. Hover for unique sessions.</p>
          </div>
        </div>

        <div className="flex items-end gap-1 h-40">
          {dailySeries.map(d => {
            const h = (d.views / maxDaily) * 100
            const isToday = d.day === startOfToday.toISOString().slice(0, 10)
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end min-w-0 group">
                <div className="text-[9px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.views} / {d.uniques}u
                </div>
                <div
                  className={`w-full rounded-t transition-all ${
                    isToday
                      ? 'bg-gradient-to-t from-sunset to-pink-500'
                      : 'bg-gradient-to-t from-ocean to-electric'
                  }`}
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${d.day} — ${d.views} views, ${d.uniques} unique sessions`}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>{dailySeries[0]?.day.slice(5)}</span>
          <span>{dailySeries[dailySeries.length - 1]?.day.slice(5)}</span>
        </div>
      </Card>

      {/* Two columns — top pages + referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <h2 className="font-bold text-deep flex items-center gap-2 mb-3">
            <Eye size={16} /> Top pages
          </h2>
          {topPages.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
          <div className="space-y-1.5">
            {topPages.map(p => {
              const pct = (p.count / stats.total_views) * 100
              return (
                <div key={p.path}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <code className="text-xs text-deep truncate">{p.path}</code>
                    <span className="text-gray-500 ml-2 flex-shrink-0">{p.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-ocean" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-deep flex items-center gap-2 mb-3">
            <ExternalLink size={16} /> Top external referrers
          </h2>
          {topReferrers.length === 0 && (
            <p className="text-xs text-gray-400">No external traffic recorded yet — all visits are direct.</p>
          )}
          <div className="space-y-1.5">
            {topReferrers.map(r => {
              const pct = (r.count / topReferrers[0].count) * 100
              return (
                <div key={r.host}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="text-xs text-deep truncate">{r.host}</span>
                    <span className="text-gray-500 ml-2 flex-shrink-0">{r.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-libre" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Device + auth split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-deep flex items-center gap-2 mb-3">
            <Smartphone size={16} /> Device split
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <DeviceTile label="Mobile"  count={stats.mobile}  total={stats.total_views} icon={Smartphone} />
            <DeviceTile label="Tablet"  count={stats.tablet}  total={stats.total_views} icon={Tablet} />
            <DeviceTile label="Desktop" count={stats.desktop} total={stats.total_views} icon={Monitor} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-deep flex items-center gap-2 mb-3">
            <Users size={16} /> Visitor type
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <DeviceTile label="Logged-in" count={stats.logged_in} total={stats.total_views} icon={Users} />
            <DeviceTile label="Anonymous" count={stats.anonymous} total={stats.total_views} icon={Globe} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function KpiTile({ period, data, highlight }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${
      highlight ? 'border-sunset/40 bg-gradient-to-br from-sunset/5 to-transparent' : 'border-gray-100'
    }`}>
      <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">{period}</div>
      <div className="text-2xl font-bold text-deep">{data.uniques.toLocaleString()}
        <span className="text-xs font-normal text-gray-400 ml-1">visitors</span>
      </div>
      <div className="text-[11px] text-gray-500 mt-1">{data.views.toLocaleString()} page views</div>
    </div>
  )
}

function DeviceTile({ label, count, total, icon: Icon }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div className="text-center p-3 bg-gray-50 rounded-xl">
      <Icon size={18} className="text-gray-400 mx-auto mb-1" />
      <div className="text-lg font-bold text-deep">{pct}%</div>
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-[10px] text-gray-400">{count.toLocaleString()}</div>
    </div>
  )
}
