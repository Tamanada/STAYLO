import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function calcEarnings(rooms, rate) {
  return (rooms || 10) * (rate || 60) * 365 * 0.65 * 0.02
}

export default function AdminAmbassadors() {
  const [ambassadors, setAmbassadors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all ambassadors
      const { data: ambs } = await supabase
        .from('ambassadors')
        .select('*')
        .order('created_at', { ascending: false })

      if (!ambs) { setAmbassadors([]); setLoading(false); return }

      // Fetch properties for each ambassador
      const ambIds = ambs.map(a => a.id)
      const { data: properties } = await supabase
        .from('properties')
        .select('id, ambassador_id, room_count, avg_nightly_rate')
        .in('ambassador_id', ambIds)

      const propsByAmb = {}
      ;(properties || []).forEach(p => {
        if (!propsByAmb[p.ambassador_id]) propsByAmb[p.ambassador_id] = []
        propsByAmb[p.ambassador_id].push(p)
      })

      const enriched = ambs.map(amb => {
        const hotels = propsByAmb[amb.id] || []
        const earnings = hotels.reduce((sum, h) => sum + calcEarnings(h.room_count, h.avg_nightly_rate), 0)
        return { ...amb, hotelsCount: hotels.length, estimatedEarnings: earnings }
      })

      setAmbassadors(enriched)
    } catch (err) {
      console.error('Admin ambassadors fetch error:', err)
    }
    setLoading(false)
  }

  const totalAmbassadors = ambassadors.length
  const totalHotels = ambassadors.reduce((sum, a) => sum + a.hotelsCount, 0)
  const totalCommissions = ambassadors.reduce((sum, a) => sum + a.estimatedEarnings, 0)

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Ambassadors</h1>
        <p className="text-gray-500 text-sm mt-1">{totalAmbassadors} ambassador{totalAmbassadors !== 1 ? 's' : ''} registered</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-ocean">{totalAmbassadors}</p>
          <p className="text-sm text-gray-500 mt-1">Total Ambassadors</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-electric">{totalHotels}</p>
          <p className="text-sm text-gray-500 mt-1">Total Hotels Brought</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-golden">${Math.round(totalCommissions).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Est. Total Commissions</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hotels</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Est. Earnings</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ambassadors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No ambassadors yet</td>
              </tr>
            ) : (
              ambassadors.map((amb, i) => (
                <tr key={amb.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">{amb.full_name || 'Unknown'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{amb.email || '—'}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{amb.referral_code || '—'}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-lg font-bold text-ocean">{amb.hotelsCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-libre">${Math.round(amb.estimatedEarnings).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      amb.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {amb.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {amb.created_at ? formatDate(amb.created_at) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
