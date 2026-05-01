import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, BedDouble, Calendar, ClipboardList, Pencil, Trash2,
  Users, DollarSign, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  ChevronLeft, ChevronRight, X, Save, Loader2, Ban, Check,
  Image as ImageIcon, Upload, AlertCircle, Camera, Video, Film
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

// ── Extended choices for room form (V2 — 2026-04-30) ─────────────
// Room types follow common hotel taxonomy (Booking + Airbnb hybrid).
// Bed types cover the majority of real-world configurations.
// Amenities are grouped into 6 readable categories so 30+ items
// don't overwhelm the form.
const ROOM_TYPES = [
  'standard', 'superior', 'deluxe', 'junior_suite', 'suite',
  'executive_suite', 'family', 'studio', 'apartment', 'villa',
  'bungalow', 'cabin', 'dormitory', 'capsule',
]

const BED_TYPES = [
  'single', 'double', 'queen', 'king', 'super_king',
  'twin', 'bunk', 'sofa_bed', 'futon', 'dormitory_bunk',
]

// Categorised amenities. Icon is optional — when null, only label is shown.
const AMENITY_CATEGORIES = [
  {
    key: 'comfort', label: '🛏️ Comfort',
    items: [
      { key: 'wifi',         icon: Wifi,   label: 'Free WiFi' },
      { key: 'tv',           icon: null,   label: 'TV' },
      { key: 'smart_tv',     icon: null,   label: 'Smart TV' },
      { key: 'ac',           icon: Wind,   label: 'Air Conditioning' },
      { key: 'heating',      icon: null,   label: 'Heating' },
      { key: 'ceiling_fan',  icon: null,   label: 'Ceiling Fan' },
      { key: 'soundproof',   icon: null,   label: 'Soundproof' },
      { key: 'workspace',    icon: null,   label: 'Workspace / Desk' },
      { key: 'safe',         icon: null,   label: 'Safe' },
      { key: 'iron',         icon: null,   label: 'Iron' },
      { key: 'hair_dryer',   icon: null,   label: 'Hair Dryer' },
    ],
  },
  {
    key: 'bathroom', label: '🚿 Bathroom',
    items: [
      { key: 'bathtub',         icon: null, label: 'Bathtub' },
      { key: 'walk_in_shower',  icon: null, label: 'Walk-in Shower' },
      { key: 'outdoor_shower',  icon: null, label: 'Outdoor Shower' },
      { key: 'bathrobe',        icon: null, label: 'Bathrobe & Slippers' },
      { key: 'premium_toilet',  icon: null, label: 'Premium Toiletries' },
    ],
  },
  {
    key: 'kitchen_food', label: '🍳 Kitchen & Food',
    items: [
      { key: 'kitchen',     icon: null,   label: 'Full Kitchen' },
      { key: 'kitchenette', icon: null,   label: 'Kitchenette' },
      { key: 'mini_fridge', icon: null,   label: 'Mini Fridge' },
      { key: 'microwave',   icon: null,   label: 'Microwave' },
      { key: 'coffee_machine', icon: Coffee, label: 'Coffee Machine' },
      { key: 'kettle',      icon: null,   label: 'Kettle' },
      { key: 'minibar',     icon: null,   label: 'Minibar' },
    ],
  },
  {
    key: 'view_space', label: '🌅 View & Space',
    items: [
      { key: 'sea_view',      icon: Waves, label: 'Sea View' },
      { key: 'mountain_view', icon: null,  label: 'Mountain View' },
      { key: 'garden_view',   icon: null,  label: 'Garden View' },
      { key: 'city_view',     icon: null,  label: 'City View' },
      { key: 'pool_view',     icon: null,  label: 'Pool View' },
      { key: 'balcony',       icon: null,  label: 'Balcony' },
      { key: 'terrace',       icon: null,  label: 'Terrace' },
      { key: 'private_garden', icon: null, label: 'Private Garden' },
    ],
  },
  {
    key: 'outdoor', label: '🌴 Outdoor',
    items: [
      { key: 'private_pool', icon: Waves,    label: 'Private Pool' },
      { key: 'jacuzzi',      icon: null,     label: 'Jacuzzi' },
      { key: 'bbq',          icon: null,     label: 'Outdoor BBQ' },
      { key: 'fireplace',    icon: null,     label: 'Fireplace' },
      { key: 'hammock',      icon: null,     label: 'Hammock' },
      { key: 'pool',         icon: Waves,    label: 'Shared Pool' },
      { key: 'beach',        icon: Umbrella, label: 'Beach Access' },
      { key: 'parking',      icon: Car,      label: 'Free Parking' },
    ],
  },
  {
    key: 'access_policy', label: '♿ Access & Policy',
    items: [
      { key: 'wheelchair_access', icon: null, label: 'Wheelchair Access' },
      { key: 'mosquito_net',      icon: null, label: 'Mosquito Net' },
      { key: 'pet_friendly',      icon: null, label: 'Pet-Friendly' },
      { key: 'smoking_allowed',   icon: null, label: 'Smoking Allowed' },
    ],
  },
]

const tabs = [
  { key: 'photos', icon: Camera, label: 'Photos' },
  { key: 'videos', icon: Video, label: 'Videos' },
  { key: 'rooms', icon: BedDouble, label: 'Rooms' },
  { key: 'calendar', icon: Calendar, label: 'Availability' },
  { key: 'bookings', icon: ClipboardList, label: 'Bookings' },
]

export default function PropertyManage() {
  const { t } = useTranslation()
  const { id: propertyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('photos')
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [propRes, roomsRes, bookingsRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', propertyId).single(),
      supabase.from('rooms').select('*').eq('property_id', propertyId).order('created_at'),
      supabase.from('bookings').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
    ])
    setProperty(propRes.data)
    setRooms(roomsRes.data || [])
    setBookings(bookingsRes.data || [])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeleteProperty() {
    if (!confirm(t('manage.confirm_delete_property', `Delete "${property?.name}"? All rooms, availability, and bookings for this property will be permanently deleted.`))) return
    try {
      // Delete bookings first (no ON DELETE CASCADE on this FK)
      const { error: bookingsErr } = await supabase.from('bookings').delete().eq('property_id', propertyId)
      if (bookingsErr) throw bookingsErr

      // Delete room_availability for all rooms of this property
      const roomIds = rooms.map(r => r.id)
      if (roomIds.length > 0) {
        const { error: availErr } = await supabase.from('room_availability').delete().in('room_id', roomIds)
        if (availErr) throw availErr
      }

      // Delete rooms
      const { error: roomsErr } = await supabase.from('rooms').delete().eq('property_id', propertyId)
      if (roomsErr) throw roomsErr

      // Delete property
      const { error: propErr } = await supabase.from('properties').delete().eq('id', propertyId)
      if (propErr) throw propErr

      navigate('/dashboard/properties')
    } catch (err) {
      console.error('Delete failed:', err)
      alert(t('manage.delete_error', 'Failed to delete property. Please try again or contact support.'))
    }
  }

  async function handleToggleLive() {
    const newStatus = property.status === 'live' ? 'validated' : 'live'
    await supabase.from('properties').update({ status: newStatus }).eq('id', propertyId)
    setProperty(prev => ({ ...prev, status: newStatus }))
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
  }

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">Property not found</h2>
        <Link to="/dashboard/properties"><Button variant="secondary"><ArrowLeft size={16} /> Back</Button></Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/properties" className="text-gray-400 hover:text-ocean transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-deep">{property.name}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                property.status === 'live'
                  ? 'bg-libre/10 text-libre'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {property.status === 'live' ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{property.city}{property.country ? `, ${property.country}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleLive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              property.status === 'live'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-libre text-white hover:bg-libre/90'
            }`}>
            {property.status === 'live' ? <><Ban size={14} /> {t('manage.stop', 'Stop')}</> : <><Check size={14} /> {t('manage.go_live', 'Go Live')}</>}
          </button>
          <button onClick={handleDeleteProperty}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all">
            <Trash2 size={14} /> {t('manage.delete', 'Delete')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-deep shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {t(`manage.tab_${tab.key}`, tab.label)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'photos' && <PhotosTab property={property} onRefresh={fetchData} />}
      {activeTab === 'videos' && <VideosTab property={property} onRefresh={fetchData} />}
      {activeTab === 'rooms' && <RoomsTab propertyId={propertyId} rooms={rooms} onRefresh={fetchData} />}
      {activeTab === 'calendar' && <CalendarTab rooms={rooms} />}
      {activeTab === 'bookings' && <BookingsTab bookings={bookings} rooms={rooms} onRefresh={fetchData} />}
    </div>
  )
}

// ============================================
// VIDEOS TAB — manage property videos
// ============================================
// Same pattern as PhotosTab but for video assets:
//   - Bucket property-videos (created by 20260430030000)
//   - Column properties.video_urls text[]
//   - Hard-cap 2 videos per property — videos are heavy and we want
//     hoteliers to publish their best 60-sec teaser, not a vacation reel
//   - Accept MP4 / MOV / WebM only — H.264 inside MP4 is the universal
//     web standard, MOV is iPhone-friendly (also H.264 internally),
//     WebM covers some Android cameras
// ============================================
function VideosTab({ property, onRefresh }) {
  const { t } = useTranslation()
  const [videos, setVideos] = useState(property.video_urls || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const MAX_VIDEOS = 2
  const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50 MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')

    if (videos.length + files.length > MAX_VIDEOS) {
      setError(`Maximum ${MAX_VIDEOS} videos per property. You have ${videos.length}, you tried to add ${files.length}.`)
      return
    }
    const oversized = files.find(f => f.size > MAX_FILE_SIZE)
    if (oversized) {
      const sizeMB = (oversized.size / (1024 * 1024)).toFixed(1)
      setError(`"${oversized.name}" is ${sizeMB} MB — max 50 MB per video. Compress it first (e.g. with HandBrake or CapCut).`)
      return
    }
    const wrongType = files.find(f => !ALLOWED_TYPES.includes(f.type))
    if (wrongType) {
      setError(`"${wrongType.name}" is not a supported format. Use MP4, MOV, or WebM.`)
      return
    }

    setUploading(true)
    setProgress({ done: 0, total: files.length })
    const newUrls = []
    const failures = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `properties/${property.id}/${filename}`
      const { error: upErr } = await supabase.storage
        .from('property-videos')
        .upload(path, file, { contentType: file.type })
      if (upErr) {
        console.error(`Video upload failed for ${file.name}:`, upErr)
        failures.push(`${file.name}: ${upErr.message}`)
      } else {
        const { data } = supabase.storage.from('property-videos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      setProgress({ done: i + 1, total: files.length })
    }

    if (newUrls.length > 0) {
      const merged = [...videos, ...newUrls]
      const { error: dbErr } = await supabase
        .from('properties')
        .update({ video_urls: merged })
        .eq('id', property.id)
      if (dbErr) {
        setError(`Videos uploaded but couldn't save to property: ${dbErr.message}`)
      } else {
        setVideos(merged)
        onRefresh?.()
      }
    }

    if (failures.length) {
      setError(`${failures.length} video${failures.length > 1 ? 's' : ''} failed to upload:\n${failures.join('\n')}`)
    }

    setUploading(false)
    setProgress({ done: 0, total: 0 })
    if (e.target) e.target.value = ''
  }

  async function handleDelete(idx) {
    if (!confirm('Remove this video? This cannot be undone.')) return
    const url = videos[idx]
    const next = videos.filter((_, i) => i !== idx)

    try {
      const pathInBucket = url.split('/property-videos/')[1]
      if (pathInBucket) {
        await supabase.storage.from('property-videos').remove([pathInBucket])
      }
    } catch (e) { console.warn('Storage delete failed:', e) }

    const { error: dbErr } = await supabase
      .from('properties')
      .update({ video_urls: next })
      .eq('id', property.id)
    if (dbErr) { setError(dbErr.message); return }
    setVideos(next)
    onRefresh?.()
  }

  async function handleSetCover(idx) {
    if (idx === 0) return
    const reordered = [videos[idx], ...videos.filter((_, i) => i !== idx)]
    const { error: dbErr } = await supabase
      .from('properties')
      .update({ video_urls: reordered })
      .eq('id', property.id)
    if (dbErr) { setError(dbErr.message); return }
    setVideos(reordered)
    onRefresh?.()
  }

  const canAddMore = videos.length < MAX_VIDEOS

  return (
    <Card className="p-6">
      {/* Header + Upload button */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-deep flex items-center gap-2">
            <Film size={20} className="text-ocean" />
            {t('manage.videos_title', 'Videos')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('manage.videos_subtitle', 'Up to 2 short videos. The first is shown as the hero on your property page. Keep them under 60 seconds for best engagement.')}
          </p>
        </div>
        {canAddMore && (
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all ${
            uploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-ocean text-white hover:bg-ocean/90'
          }`}>
            <Upload size={14} />
            {uploading
              ? `${t('manage.uploading', 'Uploading')} ${progress.done}/${progress.total}…`
              : t('manage.upload_videos', 'Upload video')}
            <input
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Format reminder */}
      <div className="mb-4 p-3 bg-ocean/5 border border-ocean/15 rounded-lg text-[11px] text-gray-600 leading-relaxed">
        <strong className="text-deep">Recommended:</strong> MP4 (H.264) · max 60 sec · max 50 MB · 1080p.
        Shoot vertical for mobile-first viewing. iPhone .MOV files work too.
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700 whitespace-pre-line">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {videos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <Video size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-deep mb-1">
            {t('manage.no_videos_title', 'No videos yet')}
          </p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t('manage.no_videos_desc', 'Properties with video get up to 80% more booking enquiries. Show your rooms, common areas, and the vibe in one short clip.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((url, idx) => (
            <div key={url + idx} className="relative rounded-xl overflow-hidden bg-gray-900 group">
              <video
                src={url}
                controls
                playsInline
                preload="metadata"
                className="w-full aspect-video object-contain bg-black"
              />
              {idx === 0 && (
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-deep/85 text-white pointer-events-none">
                  Hero
                </span>
              )}
              {/* Action buttons (always visible — videos use the play overlay so hover doesn't reach them well) */}
              <div className="p-2 bg-gray-50 flex items-center justify-end gap-2">
                {idx !== 0 && (
                  <button
                    onClick={() => handleSetCover(idx)}
                    className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 text-deep hover:border-ocean hover:text-ocean cursor-pointer"
                    title="Make this the hero video"
                  >
                    Set as hero
                  </button>
                )}
                <button
                  onClick={() => handleDelete(idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                  title="Remove video"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-4">
        {videos.length} / {MAX_VIDEOS} {t('manage.videos_count', 'videos')}
      </p>
    </Card>
  )
}

// ============================================
// PHOTOS TAB — manage property photos post-creation
// ============================================
// The hotelier could only upload photos at the initial Submit step.
// This tab lets them add more photos, replace the cover, and remove
// individual photos any time after.
//
// All uploads go to bucket `property-photos`, path properties/<id>/<file>
// (matches what Submit.jsx writes, RLS enforced by 20260430020000).
// ============================================
function PhotosTab({ property, onRefresh }) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState(property.photo_urls || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const inputRef = useState(null)

  const MAX_PHOTOS = 15
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')

    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos per property. You currently have ${photos.length}.`)
      return
    }
    const oversized = files.find(f => f.size > MAX_FILE_SIZE)
    if (oversized) { setError(`"${oversized.name}" is too big — max 5 MB per photo.`); return }
    const wrongType = files.find(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
    if (wrongType) { setError(`"${wrongType.name}" is not a supported format. Use JPG, PNG, or WebP.`); return }

    setUploading(true)
    setProgress({ done: 0, total: files.length })
    const newUrls = []
    const failures = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `properties/${property.id}/${filename}`
      const { error: upErr } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { contentType: file.type })
      if (upErr) {
        console.error(`Upload failed for ${file.name}:`, upErr)
        failures.push(`${file.name}: ${upErr.message}`)
      } else {
        const { data } = supabase.storage.from('property-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      setProgress({ done: i + 1, total: files.length })
    }

    if (newUrls.length > 0) {
      const merged = [...photos, ...newUrls]
      const { error: dbErr } = await supabase
        .from('properties')
        .update({ photo_urls: merged })
        .eq('id', property.id)
      if (dbErr) {
        setError(`Photos uploaded but couldn't save to property: ${dbErr.message}`)
      } else {
        setPhotos(merged)
        onRefresh?.()
      }
    }

    if (failures.length) {
      setError(`${failures.length} photo${failures.length > 1 ? 's' : ''} failed to upload:\n${failures.join('\n')}`)
    }

    setUploading(false)
    setProgress({ done: 0, total: 0 })
    if (e.target) e.target.value = ''  // reset input so same file can re-upload
  }

  async function handleDelete(idx) {
    if (!confirm('Remove this photo? This cannot be undone.')) return
    const url = photos[idx]
    const next = photos.filter((_, i) => i !== idx)

    // Try to delete from Storage too (best-effort — even if it fails, the DB
    // reference goes away so the orphan is invisible).
    try {
      const pathInBucket = url.split('/property-photos/')[1]
      if (pathInBucket) {
        await supabase.storage.from('property-photos').remove([pathInBucket])
      }
    } catch (e) { console.warn('Storage delete failed:', e) }

    const { error: dbErr } = await supabase
      .from('properties')
      .update({ photo_urls: next })
      .eq('id', property.id)
    if (dbErr) { setError(dbErr.message); return }
    setPhotos(next)
    onRefresh?.()
  }

  async function handleSetCover(idx) {
    if (idx === 0) return
    const reordered = [photos[idx], ...photos.filter((_, i) => i !== idx)]
    const { error: dbErr } = await supabase
      .from('properties')
      .update({ photo_urls: reordered })
      .eq('id', property.id)
    if (dbErr) { setError(dbErr.message); return }
    setPhotos(reordered)
    onRefresh?.()
  }

  return (
    <Card className="p-6">
      {/* Header + Upload button */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-deep flex items-center gap-2">
            <ImageIcon size={20} className="text-ocean" />
            {t('manage.photos_title', 'Photos')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('manage.photos_subtitle', 'The first photo is the cover image shown on search results. Drag-to-reorder coming soon.')}
          </p>
        </div>
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all ${
          uploading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-ocean text-white hover:bg-ocean/90'
        }`}>
          <Upload size={14} />
          {uploading
            ? `${t('manage.uploading', 'Uploading')} ${progress.done}/${progress.total}…`
            : t('manage.upload_photos', 'Upload photos')}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700 whitespace-pre-line">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state — clear call to action */}
      {photos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <Camera size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-deep mb-1">
            {t('manage.no_photos_title', 'No photos yet')}
          </p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t('manage.no_photos_desc', 'Properties without photos cannot go live. Upload at least 3 high-quality images of your rooms, common areas, and views.')}
          </p>
        </div>
      ) : (
        <>
          {/* Photo grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((url, idx) => (
              <div key={url + idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                <img
                  src={url}
                  alt={`${property.name} ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {idx === 0 && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-deep/85 text-white">
                    Cover
                  </span>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {idx !== 0 && (
                    <button
                      onClick={() => handleSetCover(idx)}
                      className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-deep hover:bg-gray-100 cursor-pointer"
                      title="Make this the cover image"
                    >
                      Set cover
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-4">
            {photos.length} / {MAX_PHOTOS} {t('manage.photos_count', 'photos')}
            {photos.length < 3 && (
              <span className="ml-2 text-amber-600">
                · {t('manage.photos_warning', 'Add at least 3 photos before going live')}
              </span>
            )}
          </p>
        </>
      )}
    </Card>
  )
}

// Pretty label for snake_case enum values: "junior_suite" → "Junior Suite"
function prettyLabel(s) {
  return String(s || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ============================================
// ROOMS TAB
// ============================================
function RoomsTab({ propertyId, rooms, onRefresh }) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', type: 'standard', max_guests: 2,
    bed_type: 'double', base_price: '', quantity: 1, amenities: [],
  })

  function openAdd() {
    setEditingRoom(null)
    setForm({ name: '', description: '', type: 'standard', max_guests: 2, bed_type: 'double', base_price: '', quantity: 1, amenities: [] })
    setShowForm(true)
  }

  function openEdit(room) {
    setEditingRoom(room)
    setForm({
      name: room.name, description: room.description || '', type: room.type,
      max_guests: room.max_guests, bed_type: room.bed_type,
      base_price: room.base_price, quantity: room.quantity,
      amenities: room.amenities || [],
    })
    setShowForm(true)
  }

  // Refresh single room from DB after a media update inside the form, so
  // the photo strip on the card list is always in sync.
  async function refreshRoomMedia(roomId) {
    const { data } = await supabase.from('rooms').select('photo_urls, video_urls').eq('id', roomId).single()
    if (data) {
      setEditingRoom(prev => prev?.id === roomId ? { ...prev, ...data } : prev)
      onRefresh()
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.base_price) return
    setSaving(true)
    const payload = {
      property_id: propertyId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      max_guests: Number(form.max_guests),
      bed_type: form.bed_type,
      base_price: Number(form.base_price),
      quantity: Number(form.quantity),
      amenities: form.amenities,
    }

    if (editingRoom) {
      await supabase.from('rooms').update(payload).eq('id', editingRoom.id)
    } else {
      await supabase.from('rooms').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    onRefresh()
  }

  async function handleDelete(roomId) {
    if (!confirm(t('manage.confirm_delete_room', 'Delete this room type? This cannot be undone.'))) return
    await supabase.from('rooms').delete().eq('id', roomId)
    onRefresh()
  }

  async function toggleActive(room) {
    await supabase.from('rooms').update({ is_active: !room.is_active }).eq('id', room.id)
    onRefresh()
  }

  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter(a => a !== key) : [...f.amenities, key]
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-deep">{t('manage.rooms_title', 'Room Types')}</h2>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> {t('manage.add_room', 'Add Room')}</Button>
      </div>

      {rooms.length === 0 && !showForm && (
        <Card className="p-12 text-center">
          <BedDouble size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_rooms', 'No rooms yet')}</h3>
          <p className="text-gray-500 mb-4">{t('manage.no_rooms_desc', 'Add your first room type to start receiving bookings.')}</p>
          <Button onClick={openAdd}><Plus size={16} /> {t('manage.add_room', 'Add Room')}</Button>
        </Card>
      )}

      {/* Room cards */}
      <div className="space-y-3">
        {rooms.map(room => (
          <Card key={room.id} className={`!p-4 ${!room.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              {/* Photo strip — first 3 photos, with media count overlay */}
              {room.photo_urls && room.photo_urls.length > 0 ? (
                <div className="flex-shrink-0 grid grid-cols-2 gap-1 w-32">
                  <img src={room.photo_urls[0]} alt={room.name}
                    className="col-span-2 w-full h-16 object-cover rounded-lg" loading="lazy" />
                  {room.photo_urls[1] && (
                    <img src={room.photo_urls[1]} alt=""
                      className="w-full h-12 object-cover rounded-lg" loading="lazy" />
                  )}
                  <div className="relative">
                    {room.photo_urls[2] && (
                      <img src={room.photo_urls[2]} alt=""
                        className="w-full h-12 object-cover rounded-lg" loading="lazy" />
                    )}
                    {room.photo_urls.length > 3 && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        +{room.photo_urls.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0 w-32 h-28 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                  <Camera size={20} />
                  <span className="text-[9px] mt-1">No photos</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-deep">{room.name}</h3>
                  <Badge variant={room.is_active ? 'green' : 'gray'}>
                    {room.is_active ? t('manage.active', 'Active') : t('manage.inactive', 'Inactive')}
                  </Badge>
                  <Badge variant="blue">{prettyLabel(room.type)}</Badge>
                  {room.video_urls && room.video_urls.length > 0 && (
                    <Badge variant="orange">
                      <Video size={10} className="inline mr-1" />
                      {room.video_urls.length}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><BedDouble size={14} /> {prettyLabel(room.bed_type)}</span>
                  <span className="flex items-center gap-1"><Users size={14} /> {room.max_guests} guests</span>
                  <span className="flex items-center gap-1"><DollarSign size={14} /> ${Number(room.base_price).toFixed(0)}/night</span>
                  <span>x{room.quantity} {t('manage.available', 'available')}</span>
                </div>
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.slice(0, 6).map(a => (
                      <span key={a} className="text-xs bg-libre/10 text-libre px-2 py-0.5 rounded-full">{prettyLabel(a)}</span>
                    ))}
                    {room.amenities.length > 6 && (
                      <span className="text-xs text-gray-400 px-2 py-0.5">+{room.amenities.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title={room.is_active ? 'Deactivate' : 'Activate'}>
                  {room.is_active ? <Ban size={16} /> : <Check size={16} />}
                </button>
                <button onClick={() => openEdit(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ocean" title="Edit room & manage media">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(room.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sunset">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Room Form */}
      {showForm && (
        <Card className="mt-4 border-2 border-ocean/20">
          <h3 className="font-bold text-deep mb-4">
            {editingRoom ? t('manage.edit_room', 'Edit Room') : t('manage.new_room', 'New Room Type')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.room_name', 'Room Name')} *</label>
              <input
                type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Deluxe Double, Ocean View Suite"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.description', 'Description')}</label>
              <textarea
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Brief description of the room..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.room_type', 'Room Type')}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{prettyLabel(rt)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.bed_type', 'Bed Type')}</label>
              <select value={form.bed_type} onChange={e => setForm(f => ({ ...f, bed_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                {BED_TYPES.map(bt => <option key={bt} value={bt}>{prettyLabel(bt)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.max_guests', 'Max Guests')}</label>
              <input type="number" min={1} max={20} value={form.max_guests}
                onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('manage.base_price', 'Price per Night (USD)')} <span className="text-gray-400 normal-case font-normal">— {t('manage.price_paid_by_guest', 'paid by guest')}</span> *
              </label>
              <input type="number" min={1} step="0.01" value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="e.g. 45"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
              {/* Auto-calculated net the hotelier receives — STAYLO keeps 10%.
                  Always shown so the hotelier knows exactly what lands in their account. */}
              {form.base_price && Number(form.base_price) > 0 && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-libre/5 border border-libre/15 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {t('manage.net_received', 'Net you receive')} <span className="text-gray-400">({t('manage.after_commission', 'after 10% STAYLO commission')})</span>
                  </span>
                  <span className="font-bold text-libre">
                    ${(Number(form.base_price) * 0.9).toFixed(2)} / {t('manage.night', 'night')}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.quantity', 'Quantity (how many of this type)')}</label>
              <input type="number" min={1} max={999} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            {/* Amenities — categorised. Click anywhere to toggle. */}
            <div className="sm:col-span-2 space-y-4">
              <label className="block text-xs font-medium text-gray-500">{t('manage.amenities', 'Amenities')}</label>
              {AMENITY_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{cat.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(a => (
                      <button key={a.key} type="button" onClick={() => toggleAmenity(a.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          form.amenities.includes(a.key)
                            ? 'bg-libre/10 border-libre/30 text-libre font-medium'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {a.icon && <a.icon size={14} />}
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.base_price}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingRoom ? t('manage.save_changes', 'Save Changes') : t('manage.create_room', 'Create Room')}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>

          {/* ── Media (only for existing rooms — needs an id to upload) ── */}
          {editingRoom ? (
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
              <RoomMediaUploader
                kind="photo"
                room={editingRoom}
                propertyId={propertyId}
                onChange={() => refreshRoomMedia(editingRoom.id)}
              />
              <RoomMediaUploader
                kind="video"
                room={editingRoom}
                propertyId={propertyId}
                onChange={() => refreshRoomMedia(editingRoom.id)}
              />
            </div>
          ) : (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 italic">
                💡 {t('manage.media_after_save', 'Save the room first, then re-open it to upload photos and videos for this specific room type.')}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ============================================
// ROOM MEDIA UPLOADER — used inside the Edit Room form
// ============================================
// Handles either photos or videos depending on `kind`. Uploads land in the
// existing buckets under properties/<property_id>/rooms/<room_id>/<file>.
// Same RLS policies as property-level media (path prefix is still
// 'properties' so the simplified policy passes).
//
// Same UX patterns as the property-level PhotosTab/VideosTab:
//   - cover/hero badge on first
//   - Set cover + Delete on hover
//   - explicit error reporting (no silent failures)
//   - file-type and size validation client-side
// ============================================
function RoomMediaUploader({ kind, room, propertyId, onChange }) {
  const isPhoto = kind === 'photo'
  const bucket = isPhoto ? 'property-photos' : 'property-videos'
  const dbColumn = isPhoto ? 'photo_urls' : 'video_urls'
  const accept = isPhoto
    ? 'image/jpeg,image/png,image/webp'
    : 'video/mp4,video/quicktime,video/webm'
  const maxSize = isPhoto ? 5 * 1024 * 1024 : 50 * 1024 * 1024
  const maxCount = isPhoto ? 10 : 2
  const allowedTypes = isPhoto
    ? ['image/jpeg', 'image/png', 'image/webp']
    : ['video/mp4', 'video/quicktime', 'video/webm']

  const [items, setItems] = useState(room[dbColumn] || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')

    if (items.length + files.length > maxCount) {
      setError(`Maximum ${maxCount} ${kind}${maxCount > 1 ? 's' : ''} per room. You have ${items.length}.`)
      return
    }
    const oversized = files.find(f => f.size > maxSize)
    if (oversized) {
      const sizeMB = (oversized.size / (1024 * 1024)).toFixed(1)
      setError(`"${oversized.name}" is ${sizeMB} MB — max ${maxSize / (1024 * 1024)} MB per ${kind}.`)
      return
    }
    const wrongType = files.find(f => !allowedTypes.includes(f.type))
    if (wrongType) {
      setError(`"${wrongType.name}" is not a supported format.`)
      return
    }

    setUploading(true)
    setProgress({ done: 0, total: files.length })
    const newUrls = []
    const failures = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `properties/${propertyId}/rooms/${room.id}/${filename}`
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
      if (upErr) {
        console.error(`${kind} upload failed for ${file.name}:`, upErr)
        failures.push(`${file.name}: ${upErr.message}`)
      } else {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      setProgress({ done: i + 1, total: files.length })
    }

    if (newUrls.length) {
      const merged = [...items, ...newUrls]
      const { error: dbErr } = await supabase.from('rooms').update({ [dbColumn]: merged }).eq('id', room.id)
      if (dbErr) setError(`Uploaded but DB update failed: ${dbErr.message}`)
      else {
        setItems(merged)
        onChange?.()
      }
    }
    if (failures.length) {
      setError(`${failures.length} ${kind}${failures.length > 1 ? 's' : ''} failed:\n${failures.join('\n')}`)
    }
    setUploading(false)
    setProgress({ done: 0, total: 0 })
    if (e.target) e.target.value = ''
  }

  async function handleDelete(idx) {
    if (!confirm(`Remove this ${kind}?`)) return
    const url = items[idx]
    const next = items.filter((_, i) => i !== idx)
    try {
      const pathInBucket = url.split(`/${bucket}/`)[1]
      if (pathInBucket) await supabase.storage.from(bucket).remove([pathInBucket])
    } catch (e) { console.warn('Storage delete failed:', e) }
    const { error: dbErr } = await supabase.from('rooms').update({ [dbColumn]: next }).eq('id', room.id)
    if (dbErr) { setError(dbErr.message); return }
    setItems(next)
    onChange?.()
  }

  async function handleSetCover(idx) {
    if (idx === 0) return
    const reordered = [items[idx], ...items.filter((_, i) => i !== idx)]
    const { error: dbErr } = await supabase.from('rooms').update({ [dbColumn]: reordered }).eq('id', room.id)
    if (dbErr) { setError(dbErr.message); return }
    setItems(reordered)
    onChange?.()
  }

  const Icon = isPhoto ? Camera : Video
  const sectionLabel = isPhoto ? 'Room Photos' : 'Room Videos'
  const subtitle = isPhoto
    ? 'Upload photos specific to this room type. First photo is the cover.'
    : 'Optional. 1-2 short videos showcasing this specific room.'

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h4 className="font-bold text-deep flex items-center gap-2">
            <Icon size={16} className="text-ocean" />
            {sectionLabel}
            <span className="text-xs font-normal text-gray-400">
              ({items.length}/{maxCount})
            </span>
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {items.length < maxCount && (
          <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs cursor-pointer transition-all ${
            uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-ocean text-white hover:bg-ocean/90'
          }`}>
            <Upload size={12} />
            {uploading ? `${progress.done}/${progress.total}…` : `Upload ${kind}${maxCount > 1 ? 's' : ''}`}
            <input type="file" multiple={isPhoto} accept={accept} onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 whitespace-pre-line flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-xs text-gray-400">
          <Icon size={24} className="mx-auto mb-2 opacity-50" />
          No {kind}s yet for this room.
        </div>
      ) : (
        <div className={`grid gap-2 ${isPhoto ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {items.map((url, idx) => (
            <div key={url + idx} className="relative rounded-lg overflow-hidden bg-gray-100 group">
              {isPhoto ? (
                <img src={url} alt="" className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <video src={url} controls playsInline preload="metadata"
                  className="w-full aspect-video object-contain bg-black" />
              )}
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-deep/85 text-white pointer-events-none">
                  {isPhoto ? 'Cover' : 'Hero'}
                </span>
              )}
              <div className={`absolute inset-0 ${isPhoto ? 'bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100' : 'pointer-events-none'} transition-all flex items-end justify-end p-1 gap-1`}>
                {idx !== 0 && isPhoto && (
                  <button onClick={() => handleSetCover(idx)} type="button"
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white text-deep hover:bg-gray-100 cursor-pointer pointer-events-auto">
                    Set cover
                  </button>
                )}
                <button onClick={() => handleDelete(idx)} type="button"
                  className="p-1 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer pointer-events-auto">
                  <Trash2 size={10} />
                </button>
              </div>
              {/* Video controls overlay (always visible for videos since their hover is the play button) */}
              {!isPhoto && idx !== 0 && (
                <button onClick={() => handleSetCover(idx)} type="button"
                  className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/90 text-deep hover:bg-white cursor-pointer pointer-events-auto">
                  Set hero
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// CALENDAR TAB
// ============================================
function CalendarTab({ rooms }) {
  const { t } = useTranslation()
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id || null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [availability, setAvailability] = useState([])
  const [saving, setSaving] = useState(false)

  const room = rooms.find(r => r.id === selectedRoom)

  useEffect(() => {
    if (!selectedRoom) return
    async function fetch() {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const { data } = await supabase
        .from('room_availability')
        .select('*')
        .eq('room_id', selectedRoom)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
      setAvailability(data || [])
    }
    fetch()
  }, [selectedRoom, currentMonth])

  function getDaysInMonth() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    return { daysInMonth, firstDay }
  }

  function getAvailForDate(day) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return availability.find(a => a.date === dateStr)
  }

  async function toggleBlock(day) {
    if (!room) return
    setSaving(true)
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existing = getAvailForDate(day)

    if (existing) {
      await supabase.from('room_availability').update({
        is_blocked: !existing.is_blocked,
        available_count: existing.is_blocked ? room.quantity : 0
      }).eq('id', existing.id)
    } else {
      await supabase.from('room_availability').insert({
        room_id: selectedRoom,
        date: dateStr,
        available_count: 0,
        is_blocked: true,
      })
    }

    // Refresh
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const { data } = await supabase
      .from('room_availability')
      .select('*')
      .eq('room_id', selectedRoom)
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
    setAvailability(data || [])
    setSaving(false)
  }

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  const { daysInMonth, firstDay } = getDaysInMonth()
  const today = new Date()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  if (rooms.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_rooms_calendar', 'Add rooms first')}</h3>
        <p className="text-gray-500">{t('manage.no_rooms_calendar_desc', 'You need at least one room type to manage availability.')}</p>
      </Card>
    )
  }

  return (
    <div>
      {/* Room selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.select_room', 'Select Room Type')}</label>
        <select value={selectedRoom || ''} onChange={e => setSelectedRoom(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — ${Number(r.base_price).toFixed(0)}/night (x{r.quantity})</option>)}
        </select>
      </div>

      {/* Month navigation */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <h3 className="text-lg font-bold text-deep capitalize">{monthName}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid — each cell shows date, stock count, brut + net price */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const avail = getAvailForDate(day)
            const isBlocked = avail?.is_blocked
            const isPast = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const priceBrut = Number(avail?.price_override ?? room.base_price ?? 0)
            const priceNet = priceBrut * 0.9
            // Stock — default = quantity. If avail row exists, use available_count.
            // Blocked = 0. Quantity is the total of this room type.
            const totalStock = room.quantity || 1
            const availableStock = isBlocked
              ? 0
              : (avail && typeof avail.available_count === 'number'
                  ? avail.available_count
                  : totalStock)

            return (
              <button
                key={day}
                onClick={() => !isPast && toggleBlock(day)}
                disabled={isPast || saving}
                className={`relative aspect-square min-h-[96px] rounded-lg transition-all flex flex-col p-2 text-left ${
                  isPast
                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed border border-gray-100'
                    : isBlocked
                      ? 'bg-sunset/10 border border-sunset/20 hover:bg-sunset/20 cursor-pointer'
                      : 'bg-libre/5 border border-libre/10 hover:bg-libre/15 cursor-pointer'
                }`}
              >
                {/* Top row: date (left) + stock (right) */}
                <div className="flex items-start justify-between w-full mb-1">
                  <span className={`text-base font-bold ${isPast ? 'text-gray-300' : isBlocked ? 'text-sunset' : 'text-deep'}`}>
                    {day}
                  </span>
                  {!isPast && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      availableStock === 0
                        ? 'bg-sunset/15 text-sunset'
                        : availableStock < totalStock
                          ? 'bg-orange/15 text-orange'
                          : 'bg-libre/15 text-libre'
                    }`}>
                      {availableStock}/{totalStock}
                    </span>
                  )}
                </div>

                {/* Bottom: brut + net prices */}
                {!isPast && !isBlocked && priceBrut > 0 && (
                  <div className="mt-auto w-full leading-tight">
                    <p className="text-sm font-bold text-ocean">${priceBrut.toFixed(0)}</p>
                    <p className="text-[11px] text-libre/90 font-medium">net ${priceNet.toFixed(0)}</p>
                  </div>
                )}
                {!isPast && isBlocked && (
                  <div className="mt-auto w-full text-xs font-bold text-sunset uppercase tracking-wider">
                    Blocked
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-libre/10 border border-libre/10" /> {t('manage.available', 'Available')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-sunset/10 border border-sunset/20" /> {t('manage.blocked', 'Blocked')}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-ocean font-bold text-[11px]">$X</span>
            <span className="text-gray-400">price guest pays</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-libre font-bold text-[11px]">net $X</span>
            <span className="text-gray-400">you receive (90%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-libre font-bold text-[11px]">N/M</span>
            <span className="text-gray-400">rooms available / total</span>
          </span>
          <span className="text-gray-400 italic">· {t('manage.click_toggle', 'Click a date to block/unblock')}</span>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// BOOKINGS TAB
// ============================================
function BookingsTab({ bookings, rooms, onRefresh }) {
  const { t } = useTranslation()

  const statusColors = {
    pending: 'orange',
    confirmed: 'green',
    cancelled: 'gray',
    completed: 'blue',
  }

  async function updateStatus(bookingId, newStatus) {
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    onRefresh()
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_bookings', 'No bookings yet')}</h3>
        <p className="text-gray-500">{t('manage.no_bookings_desc', 'Bookings will appear here once travelers start reserving your rooms.')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map(booking => {
        const room = rooms.find(r => r.id === booking.room_id)
        const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24))

        return (
          <Card key={booking.id} className="!p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-deep">{booking.guest_name || 'Guest'}</h3>
                  <Badge variant={statusColors[booking.status] || 'gray'} className="capitalize">{booking.status}</Badge>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <p>{room?.name || 'Room'} — {nights} {nights === 1 ? 'night' : 'nights'}</p>
                  <p>{t('manage.check_in', 'Check-in')}: {booking.check_in} — {t('manage.check_out', 'Check-out')}: {booking.check_out}</p>
                  <p>{booking.guests} {t('manage.guests', 'guest(s)')} — ${Number(booking.total_price).toFixed(2)}</p>
                  {booking.guest_email && <p className="text-gray-400">{booking.guest_email}</p>}
                  {booking.special_requests && <p className="italic text-gray-400">"{booking.special_requests}"</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {booking.status === 'pending' && (
                  <>
                    <Button size="sm" variant="green" onClick={() => updateStatus(booking.id, 'confirmed')}>
                      <Check size={14} /> {t('manage.confirm', 'Confirm')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(booking.id, 'cancelled')}>
                      <X size={14} />
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(booking.id, 'completed')}>
                    {t('manage.mark_completed', 'Mark Completed')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
