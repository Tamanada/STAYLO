import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, BedDouble, Calendar, ClipboardList, Pencil, Trash2,
  Users, DollarSign, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  ChevronLeft, ChevronRight, X, Save, Loader2, Ban, Check,
  Image as ImageIcon, Upload, AlertCircle, Camera, Video, Film, RotateCcw, Gift,
  Settings as SettingsIcon, UserPlus, Shield, Mail, Crown
} from 'lucide-react'
import RewardModal from '../../components/dashboard/RewardModal'
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
  { key: 'team', icon: Users, label: 'Team' },
  { key: 'settings', icon: SettingsIcon, label: 'Settings' },
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
      {activeTab === 'team' && <TeamTab property={property} />}
      {activeTab === 'settings' && <SettingsTab property={property} onRefresh={fetchData} />}
    </div>
  )
}

// ============================================
// TEAM TAB — multi-user access per property
// ============================================
// Roles & permissions:
//   👑 Owner   — created the property. Full control. Can add/remove team
//                + change roles + manage payouts. Cannot be removed.
//   ⚙️ Manager — edits property settings + rooms + bookings. No payouts,
//                no team management.
//   🧑 Staff   — read-only on property + bookings + can update calendar
//                (block/unblock days, set promos).
//
// Adding a member: enter their STAYLO email. They must already have a
// STAYLO account. If found, they're added immediately. If not found,
// we show a clear error so the inviter can ask them to sign up first.
// (Email-based invitations to non-users will ship with Chantier #4 Resend.)
// ============================================
const ROLE_INFO = {
  owner:   { icon: Crown,  label: 'Owner',   color: 'bg-golden/15 text-golden border-golden/25',
             desc: 'Full control · payouts · team management' },
  manager: { icon: Shield, label: 'Manager', color: 'bg-ocean/15 text-ocean border-ocean/25',
             desc: 'Edits property + rooms + bookings' },
  staff:   { icon: Users,  label: 'Staff',   color: 'bg-libre/15 text-libre border-libre/25',
             desc: 'Read-only + calendar' },
}

function TeamTab({ property }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function fetchMembers() {
    setLoading(true)
    // pull members + their user info via 2 queries (Supabase auth.users isn't
    // reachable via a join — public.users is)
    const { data: m } = await supabase
      .from('property_members')
      .select('*')
      .eq('property_id', property.id)
      .neq('status', 'removed')
      .order('role')  // owners first
    if (!m || m.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }
    const userIds = m.map(x => x.user_id).filter(Boolean)
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, email, full_name').in('id', userIds)
      : { data: [] }
    const byId = {}
    ;(users || []).forEach(u => { byId[u.id] = u })
    setMembers(m.map(x => ({ ...x, user: byId[x.user_id] })))
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [property.id])

  // Find current user's role on this property — drives "Add" / "Remove" rights
  const myMembership = members.find(m => m.user_id === user?.id)
  const isOwner = myMembership?.role === 'owner'

  async function handleAdd(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setAdding(true)
    setError('')

    // Look up the user by email
    const { data: foundUser } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle()

    if (!foundUser) {
      setError(`No STAYLO account found for ${inviteEmail}. Ask them to sign up first at staylo.app/register, then add them here.`)
      setAdding(false)
      return
    }
    if (foundUser.id === user?.id) {
      setError("You're already on the team as Owner.")
      setAdding(false)
      return
    }
    if (members.some(m => m.user_id === foundUser.id)) {
      setError(`${foundUser.email} is already on the team.`)
      setAdding(false)
      return
    }

    const { error: dbErr } = await supabase
      .from('property_members')
      .insert({
        property_id: property.id,
        user_id: foundUser.id,
        role: inviteRole,
        status: 'active',
        invited_email: foundUser.email,
        invited_by: user?.id,
        accepted_at: new Date().toISOString(),
      })
    if (dbErr) {
      setError(dbErr.message)
      setAdding(false)
      return
    }
    setInviteEmail('')
    setInviteRole('staff')
    setAdding(false)
    await fetchMembers()
  }

  async function handleChangeRole(memberId, newRole) {
    const { error: dbErr } = await supabase
      .from('property_members')
      .update({ role: newRole })
      .eq('id', memberId)
    if (dbErr) { alert(dbErr.message); return }
    await fetchMembers()
  }

  async function handleRemove(member) {
    if (!confirm(
      `Remove ${member.user?.full_name || member.user?.email || 'this member'} from the team?\n\n` +
      `They will lose access to this property immediately.`
    )) return
    const { error: dbErr } = await supabase
      .from('property_members')
      .delete()
      .eq('id', member.id)
    if (dbErr) { alert(dbErr.message); return }
    await fetchMembers()
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-deep flex items-center gap-2 mb-1">
          <Users size={18} className="text-ocean" />
          {t('manage.team_title', 'Team & permissions')}
        </h2>
        <p className="text-xs text-gray-500">
          {t('manage.team_subtitle', 'Add staff or co-managers to help run this property. They need a STAYLO account first.')}
        </p>
      </div>

      {/* Members list */}
      <Card className="!p-0 overflow-hidden">
        {members.map(m => {
          const info = ROLE_INFO[m.role] || ROLE_INFO.staff
          const Icon = info.icon
          const isMe = m.user_id === user?.id
          const isOnlyOwner = m.role === 'owner' && members.filter(x => x.role === 'owner').length === 1
          return (
            <div key={m.id} className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-deep truncate">
                    {m.user?.full_name || m.user?.email || m.invited_email || 'Unknown'}
                    {isMe && <span className="ml-1 text-[10px] text-gray-400">(you)</span>}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${info.color}`}>
                    <Icon size={10} /> {info.label}
                  </span>
                </div>
                {m.user?.email && (
                  <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">{info.desc}</p>
              </div>

              {/* Role / remove actions — only owner can change others, only owner+self can remove */}
              {isOwner && !isMe && (
                <div className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={e => handleChangeRole(m.id, e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  >
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  <button onClick={() => handleRemove(m)}
                    title="Remove from team"
                    className="p-2 rounded-lg text-gray-400 hover:text-sunset hover:bg-sunset/10 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {/* Self-leave (any non-owner can remove themselves) */}
              {isMe && m.role !== 'owner' && (
                <button onClick={() => handleRemove(m)}
                  className="text-xs text-gray-400 hover:text-sunset px-2 py-1 cursor-pointer">
                  Leave team
                </button>
              )}
            </div>
          )
        })}
      </Card>

      {/* Add member — owner only */}
      {isOwner ? (
        <Card className="border-2 border-ocean/15">
          <h3 className="font-bold text-deep mb-3 flex items-center gap-2">
            <UserPlus size={16} /> Add team member
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-start">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">STAYLO email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="staff@example.com"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              >
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="self-end">
              <Button type="submit" disabled={adding}>
                {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Add
              </Button>
            </div>
          </form>
          {error && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-400 italic">
            💡 Email invitations to non-STAYLO users will ship with Chantier #4 (transactional email).
            For now, ask them to sign up at <a href="/register" className="text-ocean hover:underline">staylo.app/register</a> first.
          </p>
        </Card>
      ) : (
        <Card className="bg-gray-50 text-center text-xs text-gray-500 italic">
          Only the property owner can add or remove team members.
        </Card>
      )}
    </div>
  )
}

// ============================================
// SETTINGS TAB — property-level fields the hotelier may need to edit later
// ============================================
// Most basic info (name, location, description, amenities…) was set at
// creation. This tab exposes the fields most likely to change over time:
//   - name / city / country / address
//   - contact email + phone
//   - description
//   - check-in / check-out times
//   - cancellation policy
//   - smoking policy
//   - minimum age (adults-only / 18+ / 21+)
//   - star rating
//
// Photos / videos / rooms / availability live in their own tabs.
// ============================================
function SettingsTab({ property, onRefresh }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name:          property.name || '',
    description:   property.description || '',
    city:          property.city || '',
    country:       property.country || '',
    address:       property.address || '',
    contact_name:  property.contact_name || '',
    contact_role:  property.contact_role || '',
    contact_email: property.contact_email || '',
    contact_phone: property.contact_phone || '',
    check_in_time:  property.check_in_time  || '14:00',
    check_out_time: property.check_out_time || '12:00',
    cancellation_policy: property.cancellation_policy || 'flexible',
    smoking_policy:      property.smoking_policy || 'no_smoking',
    star_rating:   property.star_rating ?? 3,
    min_age:       property.min_age != null ? String(property.min_age) : '',
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSavedAt(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Property name is required'); return }
    setSaving(true)
    setError('')
    const payload = {
      name:          form.name.trim(),
      description:   form.description.trim() || null,
      city:          form.city.trim() || null,
      country:       form.country.trim() || null,
      address:       form.address.trim() || null,
      contact_name:  form.contact_name.trim() || null,
      contact_role:  form.contact_role.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      check_in_time:  form.check_in_time  || '14:00',
      check_out_time: form.check_out_time || '12:00',
      cancellation_policy: form.cancellation_policy,
      smoking_policy:      form.smoking_policy,
      star_rating:   Number(form.star_rating) || 3,
      min_age:       form.min_age ? Number(form.min_age) : null,
    }
    const { error: dbErr } = await supabase.from('properties').update(payload).eq('id', property.id)
    setSaving(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    setSavedAt(new Date())
    onRefresh?.()
  }

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-deep flex items-center gap-2">
          <SettingsIcon size={18} className="text-ocean" />
          {t('manage.settings_title', 'Property settings')}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {t('manage.settings_subtitle', 'General property info that may change over time. Save commits everything at once.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.property_name', 'Property name')} *</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.description', 'Description')}</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            rows={3}
            placeholder="A short paragraph that will appear at the top of your listing."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
          <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
          <input type="text" value={form.country} onChange={e => update('country', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Full address</label>
          <input type="text" value={form.address} onChange={e => update('address', e.target.value)}
            placeholder="Street, district…"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact name</label>
          <input type="text" value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
            placeholder="e.g. Sarah Chen"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact role</label>
          <input type="text" value={form.contact_role} onChange={e => update('contact_role', e.target.value)}
            placeholder="e.g. General Manager"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact email</label>
          <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact phone</label>
          <input type="text" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Check-in time</label>
          <input type="time" value={form.check_in_time} onChange={e => update('check_in_time', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Check-out time</label>
          <input type="time" value={form.check_out_time} onChange={e => update('check_out_time', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cancellation policy</label>
          <select value={form.cancellation_policy} onChange={e => update('cancellation_policy', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="flexible">Flexible</option>
            <option value="moderate">Moderate (48h)</option>
            <option value="strict">Strict (7 days)</option>
            <option value="non_refundable">Non-refundable</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Smoking policy</label>
          <select value={form.smoking_policy} onChange={e => update('smoking_policy', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="no_smoking">No Smoking</option>
            <option value="designated_areas">Designated Areas</option>
            <option value="allowed">Allowed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Star rating</label>
          <select value={form.star_rating} onChange={e => update('star_rating', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{'⭐'.repeat(n)} ({n} star{n > 1 ? 's' : ''})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            🔞 {t('manage.min_age', 'Minimum age')}
          </label>
          <select value={form.min_age} onChange={e => update('min_age', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="">All ages welcome</option>
            <option value="16">16+ (teens & adults)</option>
            <option value="18">18+ (adults only)</option>
            <option value="21">21+ (party / adults)</option>
            <option value="25">25+ (luxury)</option>
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            18+ properties refuse bookings with children at the OTA level.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? t('manage.saving', 'Saving…') : t('manage.save_changes', 'Save changes')}
        </Button>
        {savedAt && (
          <span className="text-xs text-libre flex items-center gap-1">
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </Card>
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
    pricing_unit: 'room',
  })
  // Carry photo/video URLs from a source room when "Copy from..." is used.
  // Stored separately because handleSave's regular flow doesn't touch media.
  const [copiedMedia, setCopiedMedia] = useState({ photo_urls: [], video_urls: [] })

  function openAdd() {
    setEditingRoom(null)
    setForm({ name: '', description: '', type: 'standard', max_guests: 2, bed_type: 'double', base_price: '', quantity: 1, amenities: [], pricing_unit: 'room' })
    setCopiedMedia({ photo_urls: [], video_urls: [] })
    setShowForm(true)
  }

  // Pre-fill the form from another room. User can still edit anything after.
  // Media (photo_urls / video_urls) are copied by REFERENCE — both rooms
  // point to the same Storage files. This keeps the operation instant.
  // The hotelier can re-upload independent media later from the Edit form.
  function copyFromRoom(sourceRoomId) {
    if (!sourceRoomId) {
      // Reset to blank
      setForm({ name: '', description: '', type: 'standard', max_guests: 2, bed_type: 'double', base_price: '', quantity: 1, amenities: [], pricing_unit: 'room' })
      setCopiedMedia({ photo_urls: [], video_urls: [] })
      return
    }
    const src = rooms.find(r => r.id === sourceRoomId)
    if (!src) return
    setForm({
      name: `${src.name} (copy)`,
      description: src.description || '',
      type: src.type,
      max_guests: src.max_guests,
      bed_type: src.bed_type,
      base_price: src.base_price,
      quantity: src.quantity,
      amenities: [...(src.amenities || [])],
    })
    setCopiedMedia({
      photo_urls: [...(src.photo_urls || [])],
      video_urls: [...(src.video_urls || [])],
    })
  }

  function openEdit(room) {
    setEditingRoom(room)
    setForm({
      name: room.name, description: room.description || '', type: room.type,
      max_guests: room.max_guests, bed_type: room.bed_type,
      base_price: room.base_price, quantity: room.quantity,
      amenities: room.amenities || [],
      pricing_unit: room.pricing_unit || 'room',
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
      pricing_unit: form.pricing_unit || 'room',
    }

    if (editingRoom) {
      await supabase.from('rooms').update(payload).eq('id', editingRoom.id)
    } else {
      // For new rooms only — carry any media copied from a source room.
      // Empty arrays for non-copied creates are fine (DB default is '{}').
      if (copiedMedia.photo_urls.length || copiedMedia.video_urls.length) {
        payload.photo_urls = copiedMedia.photo_urls
        payload.video_urls = copiedMedia.video_urls
      }
      await supabase.from('rooms').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setCopiedMedia({ photo_urls: [], video_urls: [] })
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

          {/* Copy-from-existing-room shortcut — only for NEW rooms.
              Pre-fills every field including amenities + media references.
              Hotelier still has to click Save and can edit anything first. */}
          {!editingRoom && rooms.length > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-electric/5 border border-electric/20">
              <label className="block text-xs font-bold text-electric mb-1.5 flex items-center gap-1.5">
                ⚡ {t('manage.copy_from', 'Copy from an existing room')}
                <span className="text-gray-400 font-normal normal-case">— {t('manage.copy_from_hint', 'optional, pre-fills everything')}</span>
              </label>
              <select
                onChange={e => copyFromRoom(e.target.value)}
                defaultValue=""
                className="w-full px-3 py-2 rounded-lg border border-electric/20 bg-white text-sm text-deep focus:outline-none focus:ring-2 focus:ring-electric/30"
              >
                <option value="">— {t('manage.copy_from_none', 'Start blank')} —</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({prettyLabel(r.type)} · ${Number(r.base_price).toFixed(0)} · x{r.quantity})
                  </option>
                ))}
              </select>
              {(copiedMedia.photo_urls.length > 0 || copiedMedia.video_urls.length > 0) && (
                <p className="text-[10px] text-gray-500 mt-2 italic">
                  ✓ Copied: {copiedMedia.photo_urls.length} photo{copiedMedia.photo_urls.length !== 1 ? 's' : ''}
                  {copiedMedia.video_urls.length > 0 && `, ${copiedMedia.video_urls.length} video${copiedMedia.video_urls.length !== 1 ? 's' : ''}`}.
                  {' '}You can replace them after saving.
                </p>
              )}
            </div>
          )}

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
            {/* Pricing unit — per-room or per-bed (dorm-style) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('manage.pricing_unit', 'Pricing model')}
              </label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, pricing_unit: 'room' }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.pricing_unit === 'room'
                      ? 'bg-ocean/10 border-ocean text-ocean'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  🚪 Per room <span className="text-xs opacity-60 ml-1">(standard hotel)</span>
                </button>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, pricing_unit: 'bed' }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.pricing_unit === 'bed'
                      ? 'bg-ocean/10 border-ocean text-ocean'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  🛏️ Per bed <span className="text-xs opacity-60 ml-1">(dorm / hostel)</span>
                </button>
              </div>
              {form.pricing_unit === 'bed' && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  💡 <strong>Quantity</strong> = total beds available · <strong>Max guests</strong> = people PER BED
                  (1 = single, 2 = double/queen/king, 3+ = bunk for groups)
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {form.pricing_unit === 'bed'
                  ? t('manage.people_per_bed', 'People per bed')
                  : t('manage.max_guests', 'Max Guests')}
              </label>
              <input type="number" min={1} max={20} value={form.max_guests}
                onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
              {form.pricing_unit === 'bed' && (
                <p className="text-[10px] text-gray-400 mt-1">
                  1 = single · 2 = double/queen/king · 3+ = group bunk
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('manage.base_price', 'Default price per night')} (USD, per {form.pricing_unit === 'bed' ? 'bed' : 'room'}) *
                <span className="block text-[10px] text-gray-400 font-normal mt-0.5 normal-case">
                  {t('manage.price_default_hint', 'This is what the guest pays. You can override it per day in the Availability tab.')}
                </span>
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
                    ${(Number(form.base_price) * 0.9).toFixed(2)} / {form.pricing_unit === 'bed' ? 'bed' : 'room'} / {t('manage.night', 'night')}
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
  // Bulk-edit mode: when on, clicking a day adds/removes it from the selection
  // instead of toggling block. Selection persists until bulk mode is exited
  // or an action is applied. Stored as a Set of "yyyy-mm-dd" strings.
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedDays, setSelectedDays] = useState(new Set())
  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  // Undo snapshot — captures the state of all rows touched by the last bulk
  // action. `before` is the original row (or null if no row existed before
  // the action). One click on Undo restores everything atomically.
  // Auto-expires after 30s so it doesn't linger forever.
  const [undo, setUndo] = useState(null)
  // { label: string, snapshot: [{ date: 'yyyy-mm-dd', before: row | null }] }

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
    // Convert JS getDay() (0=Sun ... 6=Sat) to Monday-first (0=Mon ... 6=Sun)
    const rawDay = new Date(year, month, 1).getDay()
    const firstDay = (rawDay + 6) % 7
    return { daysInMonth, firstDay }
  }

  function getAvailForDate(day) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return availability.find(a => a.date === dateStr)
  }

  async function refreshMonth() {
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

    await refreshMonth()
    setSaving(false)
  }

  // Build YYYY-MM-DD string for a day in current month (1-31)
  function dateStrFor(day) {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Edit per-day price override. Empty string → revert to default base_price.
  async function editPrice(day, e) {
    e.stopPropagation()  // don't toggle block / select
    if (!room) return
    const dateStr = dateStrFor(day)
    const existing = getAvailForDate(day)
    const current = existing?.price_override ?? room.base_price

    const input = prompt(
      `Set price for ${dateStr} (currently $${Number(current).toFixed(0)}).\n\n` +
      `Leave blank to revert to default ($${Number(room.base_price).toFixed(0)}).`,
      String(current)
    )
    if (input === null) return
    const trimmed = input.trim()
    let newPrice = null
    if (trimmed !== '') {
      newPrice = Number(trimmed)
      if (!isFinite(newPrice) || newPrice <= 0) {
        alert('Invalid price. Must be a positive number.')
        return
      }
    }

    setSaving(true)
    if (existing) {
      await supabase.from('room_availability').update({ price_override: newPrice }).eq('id', existing.id)
    } else {
      await supabase.from('room_availability').insert({
        room_id: selectedRoom, date: dateStr,
        available_count: room.quantity, is_blocked: false,
        price_override: newPrice,
      })
    }
    await refreshMonth()
    setSaving(false)
  }

  // ── Bulk edit handlers ───────────────────────────────────
  function toggleBulkMode() {
    setBulkMode(b => !b)
    setSelectedDays(new Set())
  }

  function toggleDaySelection(day) {
    const ds = dateStrFor(day)
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(ds)) next.delete(ds)
      else next.add(ds)
      return next
    })
  }

  function selectAllDays() {
    const today = new Date()
    const next = new Set()
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
      if (cellDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        next.add(dateStrFor(d))
      }
    }
    setSelectedDays(next)
  }

  function selectWeekends() {
    const today = new Date()
    const next = new Set()
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
      const dow = cellDate.getDay()
      if ((dow === 0 || dow === 5 || dow === 6) &&
          cellDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        next.add(dateStrFor(d))
      }
    }
    setSelectedDays(next)
  }

  // Apply an upsert payload to all selected days in one round-trip.
  // Captures a pre-state snapshot so the user can Undo with one click.
  async function bulkUpdate(payload, label) {
    if (selectedDays.size === 0) { alert('Select some days first.'); return }
    if (!confirm(`${label} for ${selectedDays.size} day${selectedDays.size > 1 ? 's' : ''}?`)) return
    setSaving(true)
    const dates = [...selectedDays]
    const existingByDate = {}
    availability.forEach(a => { existingByDate[a.date] = a })

    // Snapshot BEFORE mutation — we'll need this to undo
    const snapshot = dates.map(d => ({
      date: d,
      before: existingByDate[d] ? { ...existingByDate[d] } : null,
    }))

    const updates = dates.filter(d => existingByDate[d])
    const inserts = dates.filter(d => !existingByDate[d])

    for (const d of updates) {
      await supabase.from('room_availability').update(payload).eq('id', existingByDate[d].id)
    }
    if (inserts.length > 0) {
      const rows = inserts.map(date => ({
        room_id: selectedRoom,
        date,
        available_count: payload.is_blocked ? 0 : room.quantity,
        is_blocked: payload.is_blocked ?? false,
        price_override: payload.price_override ?? null,
        min_stay: payload.min_stay ?? null,
        promo_label: payload.promo_label ?? null,
        promo_pct: payload.promo_pct ?? null,
        perk: payload.perk ?? null,
        internal_note: payload.internal_note ?? null,
      }))
      await supabase.from('room_availability').insert(rows)
    }
    await refreshMonth()
    setSelectedDays(new Set())
    setUndo({ label, snapshot })
    setSaving(false)
  }

  // Reverse the last bulk action by restoring the captured snapshot.
  async function handleUndo() {
    if (!undo) return
    if (!confirm(`Undo "${undo.label}" on ${undo.snapshot.length} day${undo.snapshot.length > 1 ? 's' : ''}?`)) return
    setSaving(true)
    for (const { date, before } of undo.snapshot) {
      if (before) {
        // Row existed before — restore its full prior state
        await supabase.from('room_availability').update({
          is_blocked:     before.is_blocked,
          available_count: before.available_count,
          price_override: before.price_override,
          min_stay:       before.min_stay,
          promo_label:    before.promo_label,
          promo_pct:      before.promo_pct,
          perk:           before.perk,
          internal_note:  before.internal_note,
        }).eq('id', before.id)
      } else {
        // Row didn't exist before — delete the one we created
        await supabase.from('room_availability').delete()
          .eq('room_id', selectedRoom).eq('date', date)
      }
    }
    await refreshMonth()
    setUndo(null)
    setSaving(false)
  }

  // Auto-expire the undo offer after 30s so it doesn't sit around and
  // surprise the operator (the snapshot would no longer match reality if
  // they made other changes in between).
  useEffect(() => {
    if (!undo) return
    const timer = setTimeout(() => setUndo(null), 30_000)
    return () => clearTimeout(timer)
  }, [undo])

  async function bulkSetPrice() {
    const input = prompt(
      `Set price for ${selectedDays.size} selected day${selectedDays.size > 1 ? 's' : ''}.\n\n` +
      `Enter the new price in USD, or leave blank to revert to the room default ($${Number(room?.base_price || 0).toFixed(0)}).`,
      String(room?.base_price || '')
    )
    if (input === null) return
    const trimmed = input.trim()
    let newPrice = null
    if (trimmed !== '') {
      newPrice = Number(trimmed)
      if (!isFinite(newPrice) || newPrice <= 0) { alert('Invalid price.'); return }
    }
    await bulkUpdate({ price_override: newPrice }, `Set price to $${newPrice ?? 'default'}`)
  }

  async function bulkBlock()   { await bulkUpdate({ is_blocked: true,  available_count: 0 },             'Block') }
  async function bulkUnblock() { await bulkUpdate({ is_blocked: false, available_count: room?.quantity || 1 }, 'Unblock') }

  // A — Min stay
  async function bulkSetMinStay() {
    const input = prompt(
      `Minimum nights required if the booking includes ${selectedDays.size} selected day${selectedDays.size > 1 ? 's' : ''}.\n\n` +
      `Enter a number (e.g. 3 = guest must book 3+ nights). Leave blank to remove the constraint.`
    )
    if (input === null) return
    const trimmed = input.trim()
    let val = null
    if (trimmed !== '') {
      val = Math.floor(Number(trimmed))
      if (!isFinite(val) || val < 1) { alert('Invalid min stay (must be ≥ 1).'); return }
    }
    await bulkUpdate({ min_stay: val }, val ? `Set min stay to ${val} night(s)` : 'Remove min stay')
  }

  // B — Reward / Special Rate (opens the catalog modal)
  function bulkSetReward() {
    if (selectedDays.size === 0) { alert('Select some days first.'); return }
    setRewardModalOpen(true)
  }
  async function handleRewardModalApply(payload, label) {
    await bulkUpdate(payload, label)
  }

  // G — Internal note (hotelier-only)
  async function bulkSetNote() {
    const input = prompt(
      `Internal note for ${selectedDays.size} selected day${selectedDays.size > 1 ? 's' : ''}. NEVER shown to guests.\n\n` +
      `Examples: "Wedding Smith — pre-booked", "Maintenance morning of 8am-noon"\n\n` +
      `Leave blank to clear the note.`
    )
    if (input === null) return
    const note = input.trim() || null
    await bulkUpdate({ internal_note: note }, note ? 'Set internal note' : 'Clear note')
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

        {/* Bulk-edit toolbar — toggleable mode for changing many days at once */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleBulkMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              bulkMode
                ? 'bg-ocean text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean'
            }`}
          >
            {bulkMode ? '✓ Bulk edit ON' : 'Bulk edit'}
          </button>

          {bulkMode && (
            <>
              <button onClick={selectAllDays} type="button"
                className="px-2.5 py-1 rounded text-xs text-gray-500 hover:text-deep hover:bg-gray-50 transition-all">
                Select month
              </button>
              <button onClick={selectWeekends} type="button"
                className="px-2.5 py-1 rounded text-xs text-gray-500 hover:text-deep hover:bg-gray-50 transition-all">
                Weekends only
              </button>
              {selectedDays.size > 0 && (
                <button onClick={() => setSelectedDays(new Set())} type="button"
                  className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-sunset transition-all">
                  Clear ({selectedDays.size})
                </button>
              )}

              {selectedDays.size > 0 && (
                <div className="basis-full pt-2 mt-1 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-400 mr-1">
                    {selectedDays.size} day{selectedDays.size > 1 ? 's' : ''} →
                  </span>
                  <button onClick={bulkSetPrice} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-ocean text-white hover:bg-ocean/90">
                    💰 Price
                  </button>
                  <button onClick={bulkSetMinStay} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-deep/5 text-deep hover:bg-deep/10 border border-deep/15">
                    🌙 Min stay
                  </button>
                  <button onClick={bulkSetReward} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-libre/10 text-libre hover:bg-libre/20 border border-libre/15">
                    🎁 Reward
                  </button>
                  <button onClick={bulkSetNote} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-electric/10 text-electric hover:bg-electric/20 border border-electric/15">
                    📝 Note
                  </button>
                  <span className="mx-1 text-gray-200">|</span>
                  <button onClick={bulkBlock} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-sunset/10 text-sunset hover:bg-sunset/20">
                    Block
                  </button>
                  <button onClick={bulkUnblock} type="button"
                    className="px-2.5 py-1 rounded text-xs font-bold bg-libre/10 text-libre hover:bg-libre/20">
                    Unblock
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Day headers — Monday-first (matches getDaysInMonth firstDay calc) */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className={`text-center text-xs font-medium py-1 ${d === 'Sat' || d === 'Sun' ? 'text-orange/70' : 'text-gray-400'}`}>
              {d}
            </div>
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

            const isSelected = bulkMode && selectedDays.has(dateStrFor(day))
            const handleCellClick = () => {
              if (isPast) return
              if (bulkMode) toggleDaySelection(day)
              else toggleBlock(day)
            }
            const hasOverride = avail?.price_override != null
            const minStay = avail?.min_stay
            const promoLabel = avail?.promo_label
            const promoPct = avail?.promo_pct
            const perk = avail?.perk
            const internalNote = avail?.internal_note
            // Apply discount visually if any
            const priceAfterPromo = promoPct
              ? priceBrut * (1 - Number(promoPct) / 100)
              : priceBrut
            const netAfterPromo = priceAfterPromo * 0.9

            return (
              <button
                key={day}
                onClick={handleCellClick}
                disabled={isPast || saving}
                className={`relative aspect-square min-h-[96px] rounded-lg transition-all flex flex-col p-2 text-left ${
                  isPast
                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed border border-gray-100'
                    : isSelected
                      ? 'bg-ocean/15 border-2 border-ocean ring-2 ring-ocean/30 cursor-pointer'
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

                {/* Middle row — chips for perk / discount / min stay / note.
                    Reward (perk) shown in green/golden, discount in orange. */}
                {!isPast && (perk || promoPct || promoLabel || minStay || internalNote) && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {perk && (
                      <span className="text-[9px] font-bold px-1 rounded bg-libre/15 text-libre" title={`${promoLabel ? promoLabel + ' — ' : ''}${perk}`}>
                        🎁
                      </span>
                    )}
                    {promoPct ? (
                      <span className="text-[9px] font-bold px-1 rounded bg-orange/15 text-orange" title={promoLabel || 'Discount'}>
                        −{Number(promoPct).toFixed(0)}%
                      </span>
                    ) : (promoLabel && !perk) ? (
                      <span className="text-[9px] font-bold px-1 rounded bg-orange/15 text-orange" title={promoLabel}>
                        🏷️
                      </span>
                    ) : null}
                    {minStay && (
                      <span className="text-[9px] font-bold px-1 rounded bg-deep/10 text-deep" title={`Minimum ${minStay} nights`}>
                        🌙{minStay}
                      </span>
                    )}
                    {internalNote && (
                      <span className="text-[9px] font-bold px-1 rounded bg-electric/15 text-electric" title={internalNote}>
                        📝
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom: brut + net prices.
                    Click on the price text (in normal mode) → edit override for that day.
                    In bulk mode the click goes to selection toggle (cell-level handler). */}
                {!isPast && !isBlocked && priceBrut > 0 && (
                  <div
                    onClick={bulkMode ? undefined : (e) => editPrice(day, e)}
                    className={`mt-auto w-full leading-tight ${
                      bulkMode ? '' : 'rounded px-1 -mx-1 hover:bg-white/60 hover:ring-1 hover:ring-ocean/30 cursor-pointer'
                    }`}
                    title={bulkMode ? undefined : 'Click to set a custom price for this day'}
                  >
                    {promoPct ? (
                      <>
                        <p className="text-sm font-bold text-ocean">
                          ${priceAfterPromo.toFixed(0)}
                          <span className="ml-1 text-[10px] font-normal text-gray-400 line-through">${priceBrut.toFixed(0)}</span>
                          {hasOverride && <span className="ml-1 text-[9px] text-orange">★</span>}
                        </p>
                        <p className="text-[11px] text-libre/90 font-medium">net ${netAfterPromo.toFixed(0)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-ocean">
                          ${priceBrut.toFixed(0)}
                          {hasOverride && <span className="ml-1 text-[9px] font-normal text-orange">★</span>}
                        </p>
                        <p className="text-[11px] text-libre/90 font-medium">net ${priceNet.toFixed(0)}</p>
                      </>
                    )}
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

      {/* Reward picker modal */}
      <RewardModal
        open={rewardModalOpen}
        onClose={() => setRewardModalOpen(false)}
        onApply={handleRewardModalApply}
        selectedCount={selectedDays.size}
      />

      {/* Undo toast — appears after every bulk action, auto-clears in 30s */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-deep text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-sm">
            <span className="text-libre">✓</span> {undo.label} <span className="text-white/40">· {undo.snapshot.length} day{undo.snapshot.length > 1 ? 's' : ''}</span>
          </span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={saving}
            className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={11} /> Undo
          </button>
          <button
            type="button"
            onClick={() => setUndo(null)}
            className="text-white/50 hover:text-white text-base leading-none cursor-pointer"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
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
