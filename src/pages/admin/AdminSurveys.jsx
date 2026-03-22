import { useAdminData } from '../../hooks/useAdminData'
import { DataTable } from '../../components/admin/DataTable'
import { StatCard } from '../../components/admin/StatCard'
import { ClipboardList, TrendingUp, ThumbsUp, Percent } from 'lucide-react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSurveys() {
  const { surveys, stats, getUserById } = useAdminData()

  const columns = [
    {
      key: 'user_id',
      label: 'User',
      render: v => {
        if (!v) return <span className="text-gray-400 italic">Anonymous</span>
        const user = getUserById(v)
        return user ? user.full_name : 'Unknown'
      }
    },
    {
      key: 'platforms_used',
      label: 'Platforms',
      render: v => (
        <div className="flex flex-wrap gap-1">
          {(v || []).map(p => (
            <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full capitalize">{p}</span>
          ))}
        </div>
      )
    },
    {
      key: 'commission_pct',
      label: 'Commission',
      render: v => <span className="font-semibold text-sunset">{v}%</span>
    },
    {
      key: 'interest_score',
      label: 'Interest',
      render: v => (
        <div className="flex items-center gap-1">
          <div className="w-16 bg-gray-100 rounded-full h-2">
            <div className="bg-ocean rounded-full h-2 transition-all" style={{ width: `${v * 10}%` }} />
          </div>
          <span className="text-xs font-medium">{v}/10</span>
        </div>
      )
    },
    {
      key: 'would_join',
      label: 'Would Join',
      render: v => v
        ? <span className="text-libre font-bold text-sm">Yes</span>
        : <span className="text-gray-400 text-sm">No</span>
    },
    { key: 'room_count', label: 'Rooms' },
    {
      key: 'created_at',
      label: 'Date',
      render: v => <span className="text-xs text-gray-500">{formatDate(v)}</span>
    },
  ]

  // Top frustrations word cloud (simple grouping)
  const frustrationWords = (() => {
    const freq = {}
    surveys.forEach(s => {
      const words = (s.biggest_frustration || '').toLowerCase().split(/\W+/).filter(w => w.length > 4)
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    })
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  })()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Survey Responses</h1>
        <p className="text-gray-500 text-sm mt-1">{surveys.length} total responses</p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Responses" value={stats.totalSurveys} icon={ClipboardList} color="golden" />
        <StatCard title="Avg Interest" value={`${stats.avgInterestScore}/10`} icon={TrendingUp} color="ocean" />
        <StatCard title="Avg Commission" value={`${stats.avgCommission}%`} icon={Percent} color="sunset" />
        <StatCard title="Would Join Rate" value={`${stats.wouldJoinRate}%`} icon={ThumbsUp} color="libre" />
      </div>

      {/* Frustration keywords */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Frustration Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {frustrationWords.map(([word, count]) => (
            <span
              key={word}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-sunset/10 text-sunset"
              style={{ fontSize: `${Math.min(0.7 + count * 0.1, 1.2)}rem` }}
            >
              {word} <span className="text-xs opacity-60">({count})</span>
            </span>
          ))}
        </div>
      </div>

      {/* All responses table */}
      <DataTable
        columns={columns}
        data={surveys}
        searchPlaceholder="Search responses..."
      />
    </div>
  )
}
