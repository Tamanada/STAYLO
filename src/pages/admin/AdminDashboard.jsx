import { Users, Building2, ClipboardList, Share2, Clock, UserPlus, Home as HomeIcon, FileText } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData'
import { StatCard } from '../../components/admin/StatCard'
import { SimpleBarChart } from '../../components/admin/SimpleBarChart'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdminDashboard() {
  const { users, properties, surveys, referrals, loading, stats } = useAdminData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
      </div>
    )
  }

  // Signups over time (last 7 days)
  const signupsByDay = (() => {
    const days = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days[key] = 0
    }
    users.forEach(u => {
      const key = u.created_at.slice(0, 10)
      if (days[key] !== undefined) days[key]++
    })
    return Object.entries(days).map(([date, count]) => ({
      label: formatDate(date),
      value: count,
    }))
  })()

  // Properties by status
  const statusChart = [
    { label: 'Pending', value: stats.propertiesByStatus.pending },
    { label: 'Reviewing', value: stats.propertiesByStatus.reviewing },
    { label: 'Validated', value: stats.propertiesByStatus.validated },
    { label: 'Live', value: stats.propertiesByStatus.live },
  ]

  // Recent activity
  const activity = [
    ...users.map(u => ({ type: 'signup', text: `${u.full_name} joined`, date: u.created_at, icon: UserPlus, color: 'text-ocean' })),
    ...properties.map(p => ({ type: 'property', text: `${p.name} submitted`, date: p.created_at, icon: HomeIcon, color: 'text-libre' })),
    ...surveys.map(s => ({ type: 'survey', text: `Survey completed (score: ${s.interest_score}/10)`, date: s.created_at, icon: FileText, color: 'text-golden' })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-deep">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your Staylo alpha metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="ocean" />
        <StatCard title="Properties" value={stats.totalProperties} icon={Building2} color="libre" />
        <StatCard title="Surveys" value={stats.totalSurveys} icon={ClipboardList} color="golden" />
        <StatCard title="Referrals" value={stats.totalReferrals} icon={Share2} color="electric" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SimpleBarChart data={signupsByDay} color="bg-ocean" title="Signups (Last 7 Days)" />
        <SimpleBarChart data={statusChart} title="Properties by Status" />
      </div>

      {/* Key metrics + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key survey metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Survey Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Avg Interest</span>
              <span className="text-lg font-bold text-ocean">{stats.avgInterestScore}/10</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Avg Commission</span>
              <span className="text-lg font-bold text-sunset">{stats.avgCommission}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Would Join</span>
              <span className="text-lg font-bold text-libre">{stats.wouldJoinRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pending Review</span>
              <span className="text-lg font-bold text-golden">{stats.propertiesByStatus.pending}</span>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`p-2 rounded-lg bg-gray-50 ${item.color}`}>
                  <item.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.text}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {timeAgo(item.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
