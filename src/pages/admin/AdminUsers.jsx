import { useState } from 'react'
import { useAdminData } from '../../hooks/useAdminData'
import { DataTable } from '../../components/admin/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Building2, FileText, Share2, Calendar } from 'lucide-react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const statusConfig = {
  pending: { variant: 'orange', label: 'Pending' },
  reviewing: { variant: 'blue', label: 'Reviewing' },
  validated: { variant: 'green', label: 'Validated' },
  live: { variant: 'golden', label: 'Live' },
}

export default function AdminUsers() {
  const { users, getUserById, getPropertiesByUser, getSurveyByUser, getReferralsByReferrer } = useAdminData()
  const [selected, setSelected] = useState(null)

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'referral_code', label: 'Code', render: v => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{v}</code> },
    {
      key: 'referred_by',
      label: 'Referred By',
      render: v => {
        if (!v) return <span className="text-gray-300">—</span>
        const referrer = getUserById(v)
        return referrer ? <span className="text-sm">{referrer.full_name}</span> : v
      }
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: v => formatDate(v)
    },
  ]

  const userProperties = selected ? getPropertiesByUser(selected.id) : []
  const userSurvey = selected ? getSurveyByUser(selected.id) : null
  const userReferrals = selected ? getReferralsByReferrer(selected.id) : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Users</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        onRowClick={setSelected}
        searchPlaceholder="Search by name or email..."
      />

      {/* User detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="User Details">
        {selected && (
          <div className="space-y-6">
            {/* User info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean to-electric flex items-center justify-center text-white font-bold text-xl">
                {selected.full_name?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-deep">{selected.full_name}</h2>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{selected.referral_code}</code>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(selected.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-libre" />
                <h3 className="text-sm font-semibold text-gray-700">Properties ({userProperties.length})</h3>
              </div>
              {userProperties.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No properties submitted</p>
              ) : (
                <div className="space-y-2">
                  {userProperties.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.city}, {p.country} &middot; {p.room_count} rooms</p>
                      </div>
                      <Badge variant={statusConfig[p.status]?.variant}>{statusConfig[p.status]?.label}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Survey */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-golden" />
                <h3 className="text-sm font-semibold text-gray-700">Survey Response</h3>
              </div>
              {!userSurvey ? (
                <p className="text-sm text-gray-400 italic">No survey completed</p>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platforms</span>
                    <span className="font-medium">{userSurvey.platforms_used?.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commission</span>
                    <span className="font-medium text-sunset">{userSurvey.commission_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interest</span>
                    <span className="font-medium text-ocean">{userSurvey.interest_score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Would Join</span>
                    <span className={`font-medium ${userSurvey.would_join ? 'text-libre' : 'text-gray-400'}`}>
                      {userSurvey.would_join ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">Frustration</span>
                    <p className="text-gray-700 text-sm italic">"{userSurvey.biggest_frustration}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Referrals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={16} className="text-electric" />
                <h3 className="text-sm font-semibold text-gray-700">Referrals ({userReferrals.length})</h3>
              </div>
              {userReferrals.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No referrals yet</p>
              ) : (
                <div className="space-y-2">
                  {userReferrals.map(r => {
                    const referred = getUserById(r.referred_id)
                    return (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                        <span className="text-sm">{referred?.full_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
