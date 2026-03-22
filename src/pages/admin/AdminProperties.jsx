import { useState } from 'react'
import { CheckCircle, XCircle, Eye, Rocket, ExternalLink } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData'
import { DataTable } from '../../components/admin/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

const statusConfig = {
  pending: { variant: 'orange', label: 'Pending' },
  reviewing: { variant: 'blue', label: 'Reviewing' },
  validated: { variant: 'green', label: 'Validated' },
  live: { variant: 'golden', label: 'Live' },
}

const filters = ['all', 'pending', 'reviewing', 'validated', 'live']

export default function AdminProperties() {
  const { properties, users, updatePropertyStatus, getUserById } = useAdminData()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = filter === 'all' ? properties : properties.filter(p => p.status === filter)

  const columns = [
    { key: 'name', label: 'Property' },
    { key: 'type', label: 'Type', render: v => <span className="capitalize">{v}</span> },
    { key: 'city', label: 'Location', render: (_, row) => `${row.city}, ${row.country}` },
    { key: 'room_count', label: 'Rooms' },
    { key: 'avg_nightly_rate', label: 'Rate', render: v => `$${v}` },
    {
      key: 'status',
      label: 'Status',
      render: v => {
        const cfg = statusConfig[v] || statusConfig.pending
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {row.status === 'pending' && (
            <button
              onClick={() => updatePropertyStatus(row.id, 'reviewing')}
              className="p-1.5 rounded-lg hover:bg-ocean/10 text-ocean cursor-pointer"
              title="Start review"
            >
              <Eye size={16} />
            </button>
          )}
          {row.status === 'reviewing' && (
            <>
              <button
                onClick={() => updatePropertyStatus(row.id, 'validated')}
                className="p-1.5 rounded-lg hover:bg-libre/10 text-libre cursor-pointer"
                title="Approve"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => updatePropertyStatus(row.id, 'pending')}
                className="p-1.5 rounded-lg hover:bg-sunset/10 text-sunset cursor-pointer"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
          {row.status === 'validated' && (
            <button
              onClick={() => updatePropertyStatus(row.id, 'live')}
              className="p-1.5 rounded-lg hover:bg-golden/10 text-golden cursor-pointer"
              title="Go live"
            >
              <Rocket size={16} />
            </button>
          )}
        </div>
      )
    }
  ]

  const owner = selected ? getUserById(selected.user_id) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep">Properties</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage property submissions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer capitalize ${
              filter === f
                ? 'bg-ocean text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-ocean/30'
            }`}
          >
            {f === 'all' ? `All (${properties.length})` : `${f} (${properties.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={setSelected}
        searchPlaceholder="Search properties..."
      />

      {/* Property detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Property Details">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep">{selected.name}</h2>
              <Badge variant={statusConfig[selected.status]?.variant}>
                {statusConfig[selected.status]?.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Type</p>
                <p className="font-medium capitalize">{selected.type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Location</p>
                <p className="font-medium">{selected.city}, {selected.country}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Rooms</p>
                <p className="font-medium">{selected.room_count}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Avg Rate</p>
                <p className="font-medium">${selected.avg_nightly_rate}/night</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Contact</p>
                <p className="font-medium">{selected.contact_email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Phone</p>
                <p className="font-medium">{selected.contact_phone || '—'}</p>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              {selected.booking_link && (
                <a href={selected.booking_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-ocean hover:underline">
                  <ExternalLink size={14} /> Booking.com profile
                </a>
              )}
              {selected.airbnb_link && (
                <a href={selected.airbnb_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sunset hover:underline">
                  <ExternalLink size={14} /> Airbnb profile
                </a>
              )}
            </div>

            {/* Owner info */}
            {owner && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">Owner</p>
                <p className="font-medium text-sm">{owner.full_name}</p>
                <p className="text-xs text-gray-500">{owner.email}</p>
                <p className="text-xs text-gray-400 mt-1">Code: {owner.referral_code}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {selected.status === 'pending' && (
                <Button variant="primary" size="sm" onClick={() => { updatePropertyStatus(selected.id, 'reviewing'); setSelected(null) }}>
                  Start Review
                </Button>
              )}
              {selected.status === 'reviewing' && (
                <>
                  <Button variant="green" size="sm" onClick={() => { updatePropertyStatus(selected.id, 'validated'); setSelected(null) }}>
                    Approve
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { updatePropertyStatus(selected.id, 'pending'); setSelected(null) }}>
                    Reject
                  </Button>
                </>
              )}
              {selected.status === 'validated' && (
                <Button variant="golden" size="sm" onClick={() => { updatePropertyStatus(selected.id, 'live'); setSelected(null) }}>
                  Go Live
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
