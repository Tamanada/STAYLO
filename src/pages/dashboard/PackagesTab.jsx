// ============================================================================
// PackagesTab — hotelier crafts product bundles (honeymoon, retreat, diving…)
// ============================================================================
// Each package is a sellable unit, optionally tied to specific rooms via
// room_packages. The OTA side picks them up automatically once attached.
//
// Pricing models:
//   - addon   : package price stacks on top of the room rate (most common)
//   - replace : flat all-inclusive package price replaces the room rate
//               (typical for retreats / certifications where the bundle is
//               the product, not the room)
//
// Pricing types:
//   - per_stay   : one-shot fee for the full booking
//   - per_night  : multiplied by number of nights
//   - per_person : multiplied by number of guests
// ============================================================================

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus, Pencil, Trash2, Save, X, Loader2, Ban, Check, Upload,
  Heart, Sparkles, Mountain, Users as UsersIcon, Utensils,
  Briefcase, PartyPopper, TreePine, Music, Dumbbell, ImagePlus,
  Package as PackageIcon
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'

// ── Category catalogue: emoji + lucide icon + label ──────────────────────────
const CATEGORIES = [
  { key: 'romance',     icon: Heart,        emoji: '💕', label: 'Romance / Honeymoon' },
  { key: 'wellness',    icon: Sparkles,     emoji: '🧘', label: 'Wellness / Spa' },
  { key: 'adventure',   icon: Mountain,     emoji: '🏔️', label: 'Adventure / Tours' },
  { key: 'sport',       icon: Dumbbell,     emoji: '🥊', label: 'Sport (Muay Thai, Surf, Yoga…)' },
  { key: 'party',       icon: PartyPopper,  emoji: '🌕', label: 'Party (Full Moon, Half Moon…)' },
  { key: 'festival',    icon: Music,        emoji: '🎶', label: 'Festival (Songkran, NYE, Music…)' },
  { key: 'family',      icon: UsersIcon,    emoji: '👨‍👩‍👧', label: 'Family' },
  { key: 'dining',      icon: Utensils,     emoji: '🍽️', label: 'Dining / Culinary' },
  { key: 'business',    icon: Briefcase,    emoji: '💼', label: 'Business' },
  { key: 'celebration', icon: PartyPopper,  emoji: '🎉', label: 'Celebration / Birthday' },
  { key: 'retreat',     icon: TreePine,     emoji: '🌿', label: 'Retreat' },
  { key: 'other',       icon: PackageIcon,  emoji: '📦', label: 'Other' },
]

const PRICING_TYPES = [
  { key: 'per_stay',   label: 'Per stay',   hint: 'One-shot fee for the booking' },
  { key: 'per_night',  label: 'Per night',  hint: 'Multiplied by number of nights' },
  { key: 'per_person', label: 'Per person', hint: 'Multiplied by number of guests' },
]

const PRICING_MODES = [
  { key: 'addon',   label: 'Add-on',     hint: 'Stacks on top of room rate' },
  { key: 'replace', label: 'All-inclusive', hint: 'Replaces the room rate (flat package price)' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'other',
  inclusions: [],
  price: '',
  pricing_type: 'per_stay',
  pricing_mode: 'addon',
  min_nights: 1,
  min_guests: 1,
  photo_url: '',
  is_active: true,
}

function categoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

export default function PackagesTab({ propertyId, rooms = [] }) {
  const { t } = useTranslation()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)        // package being edited (null = new)
  const [form, setForm] = useState(EMPTY_FORM)
  const [linkedRoomIds, setLinkedRoomIds] = useState([])  // rooms attached to current package
  const [newInclusion, setNewInclusion] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // ── Fetch packages + their room links ─────────────────────────────────────
  async function fetchPackages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('packages')
      .select('*, room_packages(room_id)')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setPackages(data || [])
    setLoading(false)
  }

  useEffect(() => { if (propertyId) fetchPackages() }, [propertyId])

  // ── Open form (new or edit) ───────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setLinkedRoomIds([])
    setShowForm(true)
    setError(null)
  }

  function openEdit(pkg) {
    setEditing(pkg)
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      category: pkg.category || 'other',
      inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
      price: pkg.price ?? '',
      pricing_type: pkg.pricing_type || 'per_stay',
      pricing_mode: pkg.pricing_mode || 'addon',
      min_nights: pkg.min_nights || 1,
      min_guests: pkg.min_guests || 1,
      photo_url: pkg.photo_url || '',
      is_active: pkg.is_active ?? true,
    })
    setLinkedRoomIds((pkg.room_packages || []).map(rp => rp.room_id))
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setLinkedRoomIds([])
    setNewInclusion('')
    setError(null)
  }

  // ── Save (insert or update) + sync room_packages ──────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)

    const payload = {
      property_id: propertyId,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: form.category,
      inclusions: form.inclusions,
      price: Number(form.price) || 0,
      pricing_type: form.pricing_type,
      pricing_mode: form.pricing_mode,
      min_nights: Number(form.min_nights) || 1,
      min_guests: Number(form.min_guests) || 1,
      photo_url: form.photo_url?.trim() || null,
      is_active: !!form.is_active,
    }

    let pkgId = editing?.id
    if (editing) {
      const { error: upErr } = await supabase.from('packages').update(payload).eq('id', editing.id)
      if (upErr) { setError(upErr.message); setSaving(false); return }
    } else {
      const { data, error: insErr } = await supabase.from('packages').insert(payload).select('id').single()
      if (insErr) { setError(insErr.message); setSaving(false); return }
      pkgId = data.id
    }

    // Sync room links: drop all then re-insert (simple + atomic enough at this scale)
    await supabase.from('room_packages').delete().eq('package_id', pkgId)
    if (linkedRoomIds.length > 0) {
      const rows = linkedRoomIds.map(room_id => ({ room_id, package_id: pkgId }))
      const { error: linkErr } = await supabase.from('room_packages').insert(rows)
      if (linkErr) { setError(`Saved, but room linking failed: ${linkErr.message}`); setSaving(false); return }
    }

    setSaving(false)
    closeForm()
    fetchPackages()
  }

  async function handleDelete(pkg) {
    if (!confirm(`Delete package "${pkg.name}"?`)) return
    const { error: delErr } = await supabase.from('packages').delete().eq('id', pkg.id)
    if (delErr) setError(delErr.message)
    else fetchPackages()
  }

  async function toggleActive(pkg) {
    const { error: upErr } = await supabase
      .from('packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    if (upErr) setError(upErr.message)
    else fetchPackages()
  }

  function addInclusion() {
    const v = newInclusion.trim()
    if (!v) return
    setForm(f => ({ ...f, inclusions: [...f.inclusions, v] }))
    setNewInclusion('')
  }

  function removeInclusion(idx) {
    setForm(f => ({ ...f, inclusions: f.inclusions.filter((_, i) => i !== idx) }))
  }

  function toggleRoomLink(roomId) {
    setLinkedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    )
  }

  // ── Photo upload — same pattern as PhotosTab/VideosTab: drop the file
  // into the existing 'property-photos' bucket under a packages/<propId>/
  // sub-path. Public URL is then stored on the form state so handleSave
  // persists it like a regular text field.
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image (JPG, PNG, WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5 MB).')
      return
    }
    setUploadingPhoto(true); setError(null)
    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `packages/${propertyId}/${filename}`
      const { error: upErr } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { contentType: file.type })
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return }
      const { data } = supabase.storage.from('property-photos').getPublicUrl(path)
      setForm(f => ({ ...f, photo_url: data.publicUrl }))
    } finally {
      setUploadingPhoto(false)
      // Reset the input so the same file can be re-uploaded after removal
      e.target.value = ''
    }
  }

  function removePhoto() {
    setForm(f => ({ ...f, photo_url: '' }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackageIcon size={20} className="text-libre" />
            {t('manage.packages_title', 'Packages')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('manage.packages_sub', 'Craft bundles guests can add at booking — honeymoon, wellness, retreat, diving…')}
          </p>
        </div>
        {!showForm && (
          <Button onClick={openNew} className="flex items-center gap-2">
            <Plus size={16} /> {t('manage.add_package', 'Add package')}
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-sunset/10 border border-sunset/30 text-sunset rounded-lg p-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sunset/60 hover:text-sunset">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Package list ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : packages.length === 0 && !showForm ? (
        <Card className="p-8 text-center">
          <PackageIcon size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t('manage.no_packages', 'No packages yet. Click "Add package" to craft your first one.')}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {packages.map(pkg => {
            const meta = categoryMeta(pkg.category)
            const linkedRooms = (pkg.room_packages || []).length
            return (
              <Card key={pkg.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xl">{meta.emoji}</span>
                      <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                      <Badge variant={pkg.is_active ? 'green' : 'gray'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="blue">{meta.label}</Badge>
                      <Badge variant="orange">{pkg.pricing_mode === 'replace' ? 'All-inclusive' : 'Add-on'}</Badge>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>💰 ${Number(pkg.price).toFixed(0)} {PRICING_TYPES.find(p => p.key === pkg.pricing_type)?.label.toLowerCase()}</span>
                      <span>📅 ≥{pkg.min_nights} night{pkg.min_nights > 1 ? 's' : ''}</span>
                      <span>👥 ≥{pkg.min_guests} guest{pkg.min_guests > 1 ? 's' : ''}</span>
                      <span>🛏️ {linkedRooms} {linkedRooms === 1 ? 'room' : 'rooms'} linked</span>
                    </div>
                    {pkg.inclusions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pkg.inclusions.slice(0, 5).map((inc, i) => (
                          <span key={i} className="text-[11px] bg-libre/10 text-libre px-2 py-0.5 rounded-full">
                            ✓ {inc}
                          </span>
                        ))}
                        {pkg.inclusions.length > 5 && (
                          <span className="text-[11px] text-gray-400 px-2 py-0.5">
                            +{pkg.inclusions.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(pkg)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title={pkg.is_active ? 'Deactivate' : 'Activate'}>
                      {pkg.is_active ? <Ban size={16} /> : <Check size={16} />}
                    </button>
                    <button onClick={() => openEdit(pkg)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ocean">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(pkg)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sunset">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Form (new / edit) ─────────────────────────────────────────────── */}
      {showForm && (
        <Card className="p-5 border-2 border-libre/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editing ? `Edit "${editing.name}"` : 'New package'}
            </h3>
            <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Honeymoon Bliss"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea value={form.description} rows={3}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What makes this package special?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            {/* Inclusions */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Inclusions</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={newInclusion}
                  onChange={e => setNewInclusion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInclusion() } }}
                  placeholder="e.g. Champagne on arrival"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <Button type="button" onClick={addInclusion} className="!py-2">
                  <Plus size={14} />
                </Button>
              </div>
              {form.inclusions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.inclusions.map((inc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-libre/10 text-libre px-2 py-1 rounded-full">
                      ✓ {inc}
                      <button onClick={() => removeInclusion(i)} className="hover:text-sunset ml-1">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price + pricing type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Price (USD)</label>
              <input type="number" min="0" step="0.01" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pricing type</label>
              <select value={form.pricing_type}
                onChange={e => setForm({ ...form, pricing_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {PRICING_TYPES.map(p => <option key={p.key} value={p.key}>{p.label} — {p.hint}</option>)}
              </select>
            </div>

            {/* Pricing mode */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pricing mode</label>
              <div className="flex gap-2">
                {PRICING_MODES.map(m => (
                  <button key={m.key} type="button"
                    onClick={() => setForm({ ...form, pricing_mode: m.key })}
                    className={`flex-1 p-3 rounded-lg border-2 text-left text-sm ${
                      form.pricing_mode === m.key
                        ? 'border-libre bg-libre/10 text-libre'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-xs opacity-70">{m.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Min nights / guests */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Min nights</label>
              <input type="number" min="1" max="90" value={form.min_nights}
                onChange={e => setForm({ ...form, min_nights: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Min guests</label>
              <input type="number" min="1" max="20" value={form.min_guests}
                onChange={e => setForm({ ...form, min_guests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            {/* Photo — upload to Supabase storage, preview inline */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cover photo (optional)</label>
              {form.photo_url ? (
                <div className="relative inline-block group">
                  <img src={form.photo_url} alt="Package cover"
                    className="h-32 w-48 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={removePhoto}
                    className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-sunset hover:bg-white shadow"
                    title="Remove photo">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 w-full border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-libre/50 hover:bg-libre/5 transition-colors">
                  {uploadingPhoto ? (
                    <Loader2 size={20} className="animate-spin text-libre" />
                  ) : (
                    <>
                      <ImagePlus size={20} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Click to upload (JPG, PNG, WebP — max 5 MB)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>

            {/* Room links */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Attach to rooms ({linkedRoomIds.length} selected)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Pick which rooms this package can be sold with. Leave empty to keep it as a standalone product.
              </p>
              {rooms.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No rooms yet — create a room first to attach packages.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rooms.map(r => (
                    <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                      linkedRoomIds.includes(r.id) ? 'border-libre bg-libre/5' : 'border-gray-200'
                    }`}>
                      <input type="checkbox" checked={linkedRoomIds.includes(r.id)}
                        onChange={() => toggleRoomLink(r.id)} />
                      <span className="text-sm">{r.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">${Number(r.base_price).toFixed(0)}/n</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-sm text-gray-700">Active (visible to guests)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editing ? 'Save changes' : 'Create package'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
