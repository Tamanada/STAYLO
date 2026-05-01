import { useState } from 'react'
import { CheckCircle, XCircle, Eye, Rocket, ExternalLink, ImageOff, X, Pencil, Save, Loader2 } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData'
import { DataTable } from '../../components/admin/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

const statusConfig = {
  pending: { variant: 'orange', label: 'Pending' },
  reviewing: { variant: 'blue', label: 'Reviewing' },
  validated: { variant: 'green', label: 'Validated' },
  live: { variant: 'golden', label: 'Live' },
}

const filters = ['all', 'pending', 'reviewing', 'validated', 'live']

export default function AdminProperties() {
  const { properties, users, updatePropertyStatus, getUserById, refetch } = useAdminData()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function openEdit() {
    if (!selected) return
    setEditForm({
      name:          selected.name || '',
      city:          selected.city || '',
      country:       selected.country || '',
      contact_email: selected.contact_email || '',
      contact_phone: selected.contact_phone || '',
      min_age:       selected.min_age != null ? String(selected.min_age) : '',
    })
    setEditError('')
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!selected) return
    if (!editForm.name.trim()) { setEditError('Name is required'); return }
    setSaving(true)
    setEditError('')
    const payload = {
      name:          editForm.name.trim(),
      city:          editForm.city.trim() || null,
      country:       editForm.country.trim() || null,
      contact_email: editForm.contact_email.trim() || null,
      contact_phone: editForm.contact_phone.trim() || null,
      min_age:       editForm.min_age ? Number(editForm.min_age) : null,
    }
    const { error } = await supabase.from('properties').update(payload).eq('id', selected.id)
    setSaving(false)
    if (error) {
      setEditError(error.message)
      return
    }
    // Optimistically update the open modal so the user sees the new values
    // immediately, then refetch the full list in the background.
    setSelected(prev => ({ ...prev, ...payload }))
    setEditing(false)
    refetch()
  }

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
  const [lightboxIdx, setLightboxIdx] = useState(null)  // index into selected.photo_urls
  const photos = selected?.photo_urls || []
  const videos = selected?.video_urls || []

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
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setEditing(false); setEditError('') }}
        title="Property Details"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              {editing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  className="flex-1 text-xl font-bold text-deep border-b-2 border-ocean focus:outline-none bg-transparent"
                />
              ) : (
                <h2 className="text-xl font-bold text-deep flex items-center gap-2">
                  {selected.name}
                  <button
                    type="button"
                    onClick={openEdit}
                    title="Edit property details"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-ocean cursor-pointer transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </h2>
              )}
              <Badge variant={statusConfig[selected.status]?.variant}>
                {statusConfig[selected.status]?.label}
              </Badge>
            </div>

            {/* Inline edit form — appears below the header in edit mode */}
            {editing && (
              <div className="bg-ocean/5 border border-ocean/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ocean">Edit property</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">City</label>
                    <input
                      type="text" value={editForm.city}
                      onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Country</label>
                    <input
                      type="text" value={editForm.country}
                      onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Contact email</label>
                    <input
                      type="email" value={editForm.contact_email}
                      onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Contact phone</label>
                    <input
                      type="text" value={editForm.contact_phone}
                      onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Minimum age</label>
                    <select
                      value={editForm.min_age}
                      onChange={e => setEditForm(f => ({ ...f, min_age: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    >
                      <option value="">All ages welcome</option>
                      <option value="16">16+ (teens & adults)</option>
                      <option value="18">18+ (adults only)</option>
                      <option value="21">21+ (party / adults)</option>
                      <option value="25">25+ (luxury)</option>
                    </select>
                  </div>
                </div>
                {editError && (
                  <p className="text-xs text-red-600">{editError}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setEditError('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Photo gallery — what the hotelier uploaded.
                Critical for the admin to validate a listing before approval. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Photos
                </p>
                <span className="text-[11px] text-gray-400">
                  {photos.length} uploaded
                </span>
              </div>
              {photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxIdx(idx)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`${selected.name} photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-red-50') }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-deep/80 text-white">
                          Cover
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 p-4 flex items-center gap-3 text-sm text-amber-800">
                  <ImageOff size={20} className="flex-shrink-0" />
                  <span>
                    <strong>No photos uploaded.</strong> Without photos this listing
                    cannot go live — ask the hotelier to add at least 3 images.
                  </span>
                </div>
              )}
            </div>

            {/* Videos — what the hotelier uploaded. Critical for admin review:
                an over-promising video can mislead guests, so admin should
                actually watch them before approving. */}
            {videos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Videos
                  </p>
                  <span className="text-[11px] text-gray-400">
                    {videos.length} uploaded
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {videos.map((url, idx) => (
                    <div key={url + idx} className="relative rounded-lg overflow-hidden bg-black">
                      <video
                        src={url}
                        controls
                        playsInline
                        preload="metadata"
                        poster={photos[0] || undefined}
                        className="w-full aspect-video object-contain"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-deep/85 text-white pointer-events-none">
                          Hero
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Lightbox — fullscreen photo viewer over the modal */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
          <img
            src={photos[lightboxIdx]}
            alt={`Photo ${lightboxIdx + 1}`}
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % photos.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer"
              >
                ›
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
                {lightboxIdx + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
