import { useMemo } from 'react'
import { Trophy, Medal, Award } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const medalColors = [
  'from-golden to-sunrise', // Gold
  'from-gray-300 to-gray-400', // Silver
  'from-sunrise to-sunset', // Bronze
]

export default function AdminReferrals() {
  const { users, referrals, getUserById } = useAdminData()

  // Build leaderboard
  const leaderboard = useMemo(() => {
    const counts = {}
    referrals.forEach(r => {
      counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1
    })

    return Object.entries(counts)
      .map(([userId, count]) => {
        const user = getUserById(userId)
        const userRefs = referrals.filter(r => r.referrer_id === userId)
        const latestDate = userRefs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at
        return {
          userId,
          name: user?.full_name || 'Unknown',
          email: user?.email || '',
          code: user?.referral_code || '',
          count,
          latestDate,
          referred: userRefs.map(r => {
            const ref = getUserById(r.referred_id)
            return { name: ref?.full_name || 'Unknown', date: r.created_at }
          }),
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [referrals, getUserById])

  const totalWithReferrals = leaderboard.length
  const totalReferred = referrals.length
  const avgPerReferrer = totalWithReferrals ? (totalReferred / totalWithReferrals).toFixed(1) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Referral Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">{totalReferred} total referrals from {totalWithReferrals} referrers</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-ocean">{totalReferred}</p>
          <p className="text-sm text-gray-500 mt-1">Total Referrals</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-electric">{totalWithReferrals}</p>
          <p className="text-sm text-gray-500 mt-1">Active Referrers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-golden">{avgPerReferrer}</p>
          <p className="text-sm text-gray-500 mt-1">Avg per Referrer</p>
        </div>
      </div>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map(idx => {
            const entry = leaderboard[idx]
            if (!entry) return null
            const rank = idx + 1
            const isFirst = idx === 0
            return (
              <div
                key={entry.userId}
                className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center ${isFirst ? 'sm:-mt-4 sm:pb-8 ring-2 ring-golden/30' : ''}`}
              >
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${medalColors[idx]} flex items-center justify-center shadow-lg`}>
                  {rank === 1 ? <Trophy size={24} className="text-white" /> :
                   rank === 2 ? <Medal size={24} className="text-white" /> :
                   <Award size={24} className="text-white" />}
                </div>
                <p className="text-xs text-gray-400 mb-1">#{rank}</p>
                <p className="font-bold text-deep truncate">{entry.name}</p>
                <p className="text-xs text-gray-400 truncate">{entry.email}</p>
                <p className="text-2xl font-extrabold text-ocean mt-2">{entry.count}</p>
                <p className="text-xs text-gray-400">referrals</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-12">Rank</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referrer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referred Users</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leaderboard.map((entry, i) => (
              <tr key={entry.userId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${i < 3 ? 'text-golden' : 'text-gray-400'}`}>
                    #{i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-700">{entry.name}</p>
                  <p className="text-xs text-gray-400">{entry.email}</p>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{entry.code}</code>
                </td>
                <td className="px-4 py-3">
                  <span className="text-lg font-bold text-ocean">{entry.count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {entry.referred.map((r, j) => (
                      <span key={j} className="text-[10px] bg-electric/10 text-electric px-1.5 py-0.5 rounded-full">
                        {r.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {entry.latestDate ? formatDate(entry.latestDate) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
