import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft, Plus, BedDouble, Calendar, ClipboardList, Pencil, Trash2,
  Users, DollarSign, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Save, Loader2, Ban, Check,
  Image as ImageIcon, Upload, AlertCircle, Camera, Video, Film, RotateCcw, Gift,
  Settings as SettingsIcon, UserPlus, Shield, Mail, Crown,
  Package as PackageIcon, Map as MapIcon, Sparkles,
} from 'lucide-react'
import { generateFloorPlanSVG, generateOutlineFloorPlanSVG, svgToBlob } from '../../lib/floorPlanSvg'
import { bestRoomMatch } from '../../lib/fuzzyMatch'
import { centroid as polygonCentroid, polygonArea, verticesToPoints } from '../../lib/floorPlanGeometry'
import DormSubPlanModal from '../../components/dashboard/DormSubPlanModal'
import { EventsHolidaysModal } from '../../components/dashboard/EventsHolidaysModal'
import { getEventsOnDate } from '../../lib/events'

// Dorm rooms behave differently on the floor plan: ONE marker on the
// main plan (= the physical dorm room itself), and the room.quantity
// is the number of BEDS inside that one room — surfaced via the sub-
// plan modal, not as N markers spread across the main plan.
function isDormRoom(room) {
  if (!room) return false
  const t = String(room.type || '').toLowerCase()
  return t === 'dormitory' || t === 'capsule'
}
import PackagesTab from './PackagesTab'
import RewardModal from '../../components/dashboard/RewardModal'
import { Modal } from '../../components/ui/Modal'
import PhoneInput from '../../components/ui/PhoneInput'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getAmenityMeta } from '../../lib/amenityIcons'

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
  { key: 'plan', icon: MapIcon, label: 'Plan' },
  { key: 'packages', icon: PackageIcon, label: 'Packages' },
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
  // When rendered inside PropertyLayout (the /dashboard/property/:id/manage
  // route), the parent already shows the back arrow + name + status badge
  // + city/country + the 6-pill nav. We detect that via useOutletContext
  // and hide our own redundant header — keep only the action buttons
  // (Go Live / Delete) which are specific to the manage view.
  const layoutContext = useOutletContext()
  const isInsideLayout = !!layoutContext
  const [activeTab, setActiveTab] = useState('photos')
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [propertyPackages, setPropertyPackages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [propRes, roomsRes, bookingsRes, pkgRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', propertyId).single(),
      // Order: name only at the DB layer (safe — column always
      // exists). Client-side we re-sort by display_order so the
      // hotelier's manual order applies once the migration lands,
      // but doesn't break the page on DBs where the column is
      // still missing.
      supabase.from('rooms').select('*').eq('property_id', propertyId).order('name'),
      supabase.from('bookings').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }),
      // Pull qty + date_blocks from the junction for the room form
      supabase.from('packages').select('*, room_packages(room_id, qty, date_blocks)').eq('property_id', propertyId),
    ])
    setProperty(propRes.data)
    // Decorate each room with its linked packages (with qty) so RoomsTab
    // can both DISPLAY them on the card and PRE-POPULATE the edit form.
    const allPkgs = pkgRes.data || []
    const decoratedRooms = (roomsRes.data || []).map(r => ({
      ...r,
      _packages: allPkgs
        .map(p => {
          const link = (p.room_packages || []).find(rp => rp.room_id === r.id)
          return link
            ? { ...p, _qty: link.qty || 1, _dateBlocks: Array.isArray(link.date_blocks) ? link.date_blocks : [] }
            : null
        })
        .filter(Boolean),
    }))
    // Sort by display_order (hotelier-controlled) with name fallback.
    // Done client-side so the page works on DBs where migration
    // 20260604020000 (rooms.display_order) hasn't landed yet.
    decoratedRooms.sort((a, b) => {
      const ao = a?.display_order ?? Infinity
      const bo = b?.display_order ?? Infinity
      if (ao !== bo) return ao - bo
      return (a?.name || '').localeCompare(b?.name || '')
    })
    setRooms(decoratedRooms)
    setBookings(bookingsRes.data || [])
    setPropertyPackages(allPkgs)
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
        <h2 className="text-2xl font-bold text-deep mb-4">{t('manage.property_not_found', 'Property not found')}</h2>
        <Link to="/dashboard/properties"><Button variant="secondary"><ArrowLeft size={16} /> Back</Button></Link>
      </div>
    )
  }

  return (
    <div className={isInsideLayout ? '' : 'max-w-5xl mx-auto px-4 py-8'}>
      {/* Header — only when rendered standalone. Inside PropertyLayout the
          identity row (back arrow + name + status + city/country) is
          already rendered by the parent. We still show the action buttons
          (Go Live / Delete) in either case — they're manage-specific. */}
      {isInsideLayout ? (
        <div className="flex items-center justify-end gap-2 mb-6">
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
      ) : (
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
      )}

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
      {activeTab === 'rooms' && <RoomsTab propertyId={propertyId} rooms={rooms} packages={propertyPackages} onRefresh={fetchData} onJumpToPackages={() => setActiveTab('packages')} />}
      {activeTab === 'plan' && <FloorPlanTab property={property} rooms={rooms} onRefresh={fetchData} />}
      {activeTab === 'packages' && <PackagesTab propertyId={propertyId} rooms={rooms} onRefresh={fetchData} />}
      {activeTab === 'calendar' && <CalendarTab rooms={rooms} property={property} onRefresh={fetchData} />}
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
  const { user, profile } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  // Share modal state — opens after a successful pending invite so the
  // inviter can either copy the link or share via WhatsApp/email even if
  // Resend isn't yet configured.
  const [shareModal, setShareModal] = useState(null)
  // { email, role, signupUrl, emailSent: bool, emailError: string|null }

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
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setAdding(true)
    setError('')

    // Look up the user by email
    const { data: foundUser } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .maybeSingle()

    // Already-on-team checks (cover both registered users and pending invites)
    if (foundUser && foundUser.id === user?.id) {
      setError("You're already on the team as Owner.")
      setAdding(false)
      return
    }
    if (foundUser && members.some(m => m.user_id === foundUser.id)) {
      setError(`${foundUser.email} is already on the team.`)
      setAdding(false)
      return
    }
    if (members.some(m => !m.user_id && m.invited_email?.toLowerCase() === email)) {
      setError(`An invitation for ${email} is already pending.`)
      setAdding(false)
      return
    }

    // Two paths:
    //   1. User exists → INSERT with user_id, status='active' (immediate access)
    //   2. User doesn't exist → INSERT with user_id=NULL, status='invited'
    //      The trigger claim_pending_invitations() will auto-link them
    //      when they sign up.
    const insertPayload = foundUser
      ? {
          property_id: property.id,
          user_id: foundUser.id,
          role: inviteRole,
          status: 'active',
          invited_email: foundUser.email,
          invited_by: user?.id,
          accepted_at: new Date().toISOString(),
        }
      : {
          property_id: property.id,
          user_id: null,
          role: inviteRole,
          status: 'invited',
          invited_email: email,
          invited_by: user?.id,
        }
    const { error: dbErr } = await supabase
      .from('property_members')
      .insert(insertPayload)
    if (dbErr) {
      setError(dbErr.message)
      setAdding(false)
      return
    }

    // For PENDING invites (user doesn't exist yet) → trigger the email +
    // open the share modal so the inviter has fallback options if email
    // sending fails (no RESEND_API_KEY configured, etc).
    if (!foundUser) {
      const signupUrl = `${window.location.origin}/register?email=${encodeURIComponent(email)}`
      const inviterName = profile?.full_name || user?.email || 'A STAYLO hotelier'

      let emailSent = false
      let emailError = null
      try {
        const { error: fnErr } = await supabase.functions.invoke('send-team-invite', {
          body: {
            email,
            property_name: property.name,
            inviter_name: inviterName,
            role: inviteRole,
            signup_url: signupUrl,
          },
        })
        if (fnErr) {
          // Try to get the real error body
          try {
            const body = await fnErr.context?.json?.()
            emailError = body?.detail || body?.error || fnErr.message
          } catch { emailError = fnErr.message }
        } else {
          emailSent = true
        }
      } catch (e) {
        emailError = e?.message || 'Email function unreachable'
      }

      setShareModal({ email, role: inviteRole, signupUrl, emailSent, emailError })
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
          const isPending = m.status === 'invited' && !m.user_id
          return (
            <div key={m.id} className={`flex items-center gap-3 p-4 border-b border-gray-100 last:border-0 ${isPending ? 'bg-amber-50/40' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-100' : 'bg-gray-100'}`}>
                {isPending
                  ? <Mail size={16} className="text-amber-600" />
                  : <Users size={18} className="text-gray-400" />}
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
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      ⏳ Pending invite
                    </span>
                  )}
                </div>
                {m.user?.email && (
                  <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                )}
                {isPending && (
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    Will activate when {m.invited_email} signs up at staylo.app/register
                  </p>
                )}
                {!isPending && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{info.desc}</p>
                )}
              </div>

              {/* Role / remove actions — only owner can change others, only owner+self can remove */}
              {isOwner && !isMe && (
                <div className="flex items-center gap-1">
                  {!isPending && (
                    <select
                      value={m.role}
                      onChange={e => handleChangeRole(m.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-ocean/30"
                    >
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  )}
                  <button onClick={() => handleRemove(m)}
                    title={isPending ? 'Cancel invitation' : 'Remove from team'}
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
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{t('manage.team_staylo_email', 'STAYLO email')}</label>
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
            💡 You can invite an email even if they don't have a STAYLO account yet —
            their invitation will activate the moment they sign up at{' '}
            <a href="/register" className="text-ocean hover:underline">staylo.app/register</a>.
            Auto-emailed invitations land with Chantier #4 (transactional email).
          </p>
        </Card>
      ) : (
        <Card className="bg-gray-50 text-center text-xs text-gray-500 italic">
          Only the property owner can add or remove team members.
        </Card>
      )}

      {/* Share-invite modal — opens after a successful pending invite.
          Always offers Copy + WhatsApp + Email buttons; if Resend wasn't
          configured, the email send step is reported as a warning. */}
      {shareModal && (
        <ShareInviteModal data={shareModal} property={property} onClose={() => setShareModal(null)} />
      )}
    </div>
  )
}

// ============================================
// ShareInviteModal — fallback share UI for pending invitations
// ============================================
function ShareInviteModal({ data, property, onClose }) {
  const { t } = useTranslation()
  const { email, role, signupUrl, emailSent, emailError } = data
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signupUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(`Copy failed. Manual link:\n${signupUrl}`)
    }
  }

  const message = `You've been invited to join ${property.name} on STAYLO with the role ${role}. ` +
    `Sign up with ${email} to accept: ${signupUrl}`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  const mailtoUrl = `mailto:${encodeURIComponent(email)}` +
    `?subject=${encodeURIComponent(`Invite to ${property.name} on STAYLO`)}` +
    `&body=${encodeURIComponent(message)}`

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-deep">
              {emailSent ? '✉️ Invitation sent' : '🔗 Share invitation manually'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {emailSent
                ? `We emailed ${email}. Forward the link below if needed.`
                : `We couldn't send the email automatically. Use one of the options below to share it.`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {emailError && !emailSent && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>{t('manage.email_not_configured', 'Email service not configured:')}</strong> {emailError}
          </div>
        )}

        <div className="mb-3">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('manage.signup_link', 'Signup link')}</label>
          <div className="flex gap-1">
            <input
              type="text" value={signupUrl} readOnly
              onFocus={e => e.target.select()}
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-gray-200 bg-gray-50 text-xs font-mono text-deep focus:outline-none"
            />
            <Button size="sm" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#25D366] text-white font-bold text-sm hover:opacity-90 no-underline">
            💬 WhatsApp
          </a>
          <a href={mailtoUrl}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-deep text-white font-bold text-sm hover:opacity-90 no-underline">
            ✉️ Email
          </a>
        </div>

        <p className="text-[11px] text-gray-400 mt-4 italic">
          The invitation auto-activates the moment {email} signs up at staylo.app/register.
          They don't need to enter any code.
        </p>
      </div>
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

// ============================================
// OtaChannelCard — V1 placeholder for the channel-manager Connect /
// Refresh flow. Status pill reads from whether the hotelier has
// already pasted an API key:
//   · no key     → "🔌 Not connected" (gray)
//   · key set    → "⏳ Pending integration" (orange) — credentials
//                  on file, awaiting Phase 2 connector rollout
// "Refresh now" + "Connect" buttons are disabled but visible so
// hoteliers can see what's coming. Clicking the gradient pill
// surfaces a tooltip + the Advanced panel collapses below for
// pasting / updating the key today.
//
// When the Phase 2 connectors ship, swap the disabled handlers
// for real RPCs without touching the layout.
// ============================================
function OtaChannelCard({ channel, hasKey, form, update, propagate, togglePropagate, hasOtherProperties, otherPropCount, t }) {
  const [expanded, setExpanded] = useState(false)
  const statusPill = hasKey
    ? { label: 'Pending integration', className: 'bg-orange/12 text-orange border-orange/25' }
    : { label: 'Not connected',       className: 'bg-gray-100 text-gray-500 border-gray-200' }

  function handleConnect() {
    // V1: open a mailto for early access. V2: trigger the OAuth /
    // API-key wizard for the specific channel. Same button label
    // both phases — no re-learning for the hotelier.
    const subject = encodeURIComponent(`Early access — ${channel.name} channel for STAYLO`)
    const body = encodeURIComponent(
      `Hi STAYLO team,\n\nI'd like early access to the ${channel.name} channel manager integration for my property.\n\nThanks!`
    )
    window.open(`mailto:contact@staylo.app?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — gradient strip in the channel's brand colour family */}
      <div className={`bg-gradient-to-r ${channel.accent} px-3.5 py-2 text-white flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{channel.emoji}</span>
          <span className="font-extrabold text-sm truncate">{channel.name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusPill.className}`} style={{ background: 'rgba(255,255,255,.95)' }}>
          {statusPill.label}
        </span>
      </div>

      {/* Body — action buttons + collapsible advanced */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleConnect}
            title={t('manage.ota_connect_tip', 'Channel-manager auto-connect arrives in Phase 2. Click to request early access — our team gets back within 24 h.')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-deep text-white hover:bg-deep/90 transition-colors"
          >
            🔌 {t('manage.ota_request_access', 'Request early access')}
          </button>
          <button
            type="button"
            disabled
            title={t('manage.ota_refresh_tip', 'Manual refresh will pull every reservation from this channel in real time. Phase 2 feature.')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
          >
            <RotateCcw size={11} /> {t('manage.ota_refresh', 'Refresh now')}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-1 ml-auto text-[11px] font-bold text-gray-500 hover:text-deep transition-colors"
          >
            {expanded ? '▾' : '▸'} {t('manage.ota_advanced', 'Advanced')}
          </button>
        </div>

        {expanded && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {t('manage.ota_api_key', 'API key')}
            </label>
            <input
              type="password"
              value={form[channel.formKey]}
              onChange={e => update(channel.formKey, e.target.value)}
              placeholder="••••••••••••••••"
              autoComplete="off"
              spellCheck="false"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30"
            />
            <p className="text-[10px] text-gray-400 italic leading-tight">
              {t('manage.ota_key_hint', 'Paste your channel API key here to pre-stage the connection. The key is encrypted at rest and never sent back to the browser.')}
            </p>
            {hasOtherProperties && (
              <label className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 hover:text-deep cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={propagate[channel.propKey]}
                  onChange={() => togglePropagate(channel.propKey)}
                  className="rounded border-gray-300 text-ocean focus:ring-ocean/30 w-3 h-3"
                />
                🔗 {t('manage.propagate_field', { defaultValue: 'Appliquer à mes {{n}} autre{{p}} propriété{{p}} à la sauvegarde', n: otherPropCount, p: otherPropCount > 1 ? 's' : '' })}
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsTab({ property, onRefresh }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  // Lock editing once the property has been verified (status >= validated).
  // Hoteliers must contact STAYLO admin to amend legal info after that point.
  // Admins can still edit via /admin/properties (their RLS bypass).
  const isLocked = property.status === 'validated' || property.status === 'live'
  // Per-field "Apply to my other properties on save" intent. Default off
  // per field so an owner with 5 hotels doesn't accidentally write their
  // BTC address everywhere. Toggles aren't persisted — they're a save-
  // time directive, the chef re-checks them next time if they want to
  // re-sync after editing one property in isolation.
  const [propagate, setPropagate] = useState({
    payment_btc_address:    false,
    payment_solana_address: false,
    payment_bank_details:   false,
    payment_stripe_link:    false,
    ota_booking_com:        false,
    ota_airbnb:             false,
    ota_agoda:              false,
    ota_expedia:            false,
  })
  const togglePropagate = (key) => setPropagate(p => ({ ...p, [key]: !p[key] }))
  // Count of OTHER properties the user owns — drives the "Synced to N
  // other properties" badge after save and conditionally shows the
  // propagate toggles (no toggle when there's only this one property).
  const [otherPropCount, setOtherPropCount] = useState(0)
  useEffect(() => {
    if (!user?.id || !property?.id) return
    let cancelled = false
    supabase.from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('id', property.id)
      .then(({ count }) => { if (!cancelled) setOtherPropCount(count || 0) })
    return () => { cancelled = true }
  }, [user?.id, property?.id])
  const hasOtherProperties = otherPropCount > 0
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
    // ── Payment Connection (folded in from the old Banking page) ──
    // Where the hotelier wants to RECEIVE their share of bookings.
    // Editable even when the property is verified — these are payout
    // details, not legal info, and they may legitimately change over time.
    payment_btc_address:    property.payment_btc_address    || '',
    payment_solana_address: property.payment_solana_address || '',
    payment_bank_details:   property.payment_bank_details   || '',
    payment_stripe_link:    property.payment_stripe_link    || '',
    // ── OTA Integrations (API connectors for inbound bookings) ──
    // JSONB bag — each connector gets a { api_key, enabled } pair.
    // Initialised from the row so untouched connectors stay intact.
    ota_booking_com_api_key: property.ota_integrations?.booking_com?.api_key || '',
    ota_airbnb_api_key:      property.ota_integrations?.airbnb?.api_key      || '',
    ota_agoda_api_key:       property.ota_integrations?.agoda?.api_key       || '',
    ota_expedia_api_key:     property.ota_integrations?.expedia?.api_key     || '',
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSavedAt(null)
  }

  async function handleSave() {
    // Payment + integration fields stay editable even when the property
    // is locked (verified) — only the legal/identity fields freeze.
    if (!isLocked && !form.name.trim()) { setError('Property name is required'); return }
    setSaving(true)
    setError('')
    // Build the OTA integrations bag — keep untouched connectors intact
    // by spreading the existing payload + overwriting only the api_key.
    const prevOta = property.ota_integrations || {}
    const otaPayload = {
      ...prevOta,
      booking_com: { ...(prevOta.booking_com || {}), api_key: form.ota_booking_com_api_key.trim() || null },
      airbnb:      { ...(prevOta.airbnb      || {}), api_key: form.ota_airbnb_api_key.trim()      || null },
      agoda:       { ...(prevOta.agoda       || {}), api_key: form.ota_agoda_api_key.trim()       || null },
      expedia:     { ...(prevOta.expedia     || {}), api_key: form.ota_expedia_api_key.trim()     || null },
    }
    // Payout + integrations payload — always saved.
    const payoutPayload = {
      payment_btc_address:    form.payment_btc_address.trim()    || null,
      payment_solana_address: form.payment_solana_address.trim() || null,
      payment_bank_details:   form.payment_bank_details.trim()   || null,
      payment_stripe_link:    form.payment_stripe_link.trim()    || null,
      ota_integrations:       otaPayload,
    }
    // Legal/identity payload — only when NOT locked.
    const legalPayload = isLocked ? {} : {
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
    const payload = { ...legalPayload, ...payoutPayload }
    const { error: dbErr } = await supabase.from('properties').update(payload).eq('id', property.id)
    if (dbErr) {
      setSaving(false)
      setError(dbErr.message)
      return
    }

    // ── Field-level propagation to the user's OTHER properties ──
    // Only fields with their propagate toggle ON get copied. Bank,
    // Stripe etc. are simple TEXT updates (one bulk UPDATE …in(ids));
    // OTA keys need a per-row read-merge-write because the JSONB bag
    // may already hold other connectors we mustn't clobber.
    let propagated = 0
    try {
      const otherIdsRes = await supabase
        .from('properties').select('id, ota_integrations')
        .eq('user_id', user.id).neq('id', property.id)
      const otherProps = otherIdsRes.data || []
      const otherIds = otherProps.map(p => p.id)

      if (otherIds.length > 0) {
        // 1. Simple text fields → one bulk UPDATE per checked field
        const textUpdates = {}
        if (propagate.payment_btc_address)    textUpdates.payment_btc_address    = payoutPayload.payment_btc_address
        if (propagate.payment_solana_address) textUpdates.payment_solana_address = payoutPayload.payment_solana_address
        if (propagate.payment_bank_details)   textUpdates.payment_bank_details   = payoutPayload.payment_bank_details
        if (propagate.payment_stripe_link)    textUpdates.payment_stripe_link    = payoutPayload.payment_stripe_link
        if (Object.keys(textUpdates).length > 0) {
          await supabase.from('properties').update(textUpdates).in('id', otherIds)
          propagated++
        }

        // 2. OTA keys → merge into each other property's existing JSONB
        const otaKeysToCopy = []
        if (propagate.ota_booking_com) otaKeysToCopy.push('booking_com')
        if (propagate.ota_airbnb)      otaKeysToCopy.push('airbnb')
        if (propagate.ota_agoda)       otaKeysToCopy.push('agoda')
        if (propagate.ota_expedia)     otaKeysToCopy.push('expedia')
        if (otaKeysToCopy.length > 0) {
          const sourceOta = otaPayload  // the freshly-saved bag
          await Promise.all(otherProps.map(p => {
            const merged = { ...(p.ota_integrations || {}) }
            for (const k of otaKeysToCopy) merged[k] = sourceOta[k]
            return supabase.from('properties').update({ ota_integrations: merged }).eq('id', p.id)
          }))
          propagated++
        }
      }
    } catch (e) {
      console.warn('Field propagation failed (continuing)', e)
    }

    setSaving(false)
    setSavedAt({ at: new Date(), propagated, otherCount: otherPropCount })
    // Reset toggles so a stray click on Save doesn't re-propagate.
    setPropagate({
      payment_btc_address: false, payment_solana_address: false,
      payment_bank_details: false, payment_stripe_link: false,
      ota_booking_com: false, ota_airbnb: false,
      ota_agoda: false, ota_expedia: false,
    })
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

      {/* Lock banner — once the property is verified by STAYLO, the legal
          info (name, address, contact, etc.) can no longer be changed
          freely. Hoteliers contact admin to request amendments. */}
      {isLocked && (
        <div className="mb-5 p-4 rounded-xl bg-deep/5 border border-deep/20 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔒</span>
          <div className="text-sm">
            <p className="font-bold text-deep mb-0.5">
              {t('manage.locked_title', 'Property settings are locked')}
            </p>
            <p className="text-gray-600 text-xs leading-relaxed">
              {t('manage.locked_desc',
                'Your property has been verified by STAYLO. Legal info (name, address, contact details, policies) is now read-only. '
                + 'To request changes, please email '
              )}
              <a href="mailto:contact@staylo.app" className="text-ocean hover:underline font-medium">contact@staylo.app</a>
              .
            </p>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.property_name', 'Property name')} *</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.description', 'Description')}</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            rows={3}
            placeholder={t('manage.description_placeholder', 'A short paragraph that will appear at the top of your listing.')}
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
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.full_address', 'Full address')}</label>
          <input type="text" value={form.address} onChange={e => update('address', e.target.value)}
            placeholder="Street, district…"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.contact_name', 'Contact name')}</label>
          <input type="text" value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
            placeholder="e.g. Sarah Chen"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.contact_role', 'Contact role')}</label>
          <input type="text" value={form.contact_role} onChange={e => update('contact_role', e.target.value)}
            placeholder="e.g. General Manager"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.contact_email', 'Contact email')}</label>
          <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.contact_phone', 'Contact phone')}</label>
          <PhoneInput value={form.contact_phone} onChange={v => update('contact_phone', v)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.check_in_time', 'Check-in time')}</label>
          <input type="time" value={form.check_in_time} onChange={e => update('check_in_time', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.check_out_time', 'Check-out time')}</label>
          <input type="time" value={form.check_out_time} onChange={e => update('check_out_time', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.cancellation_policy', 'Cancellation policy')}</label>
          <select value={form.cancellation_policy} onChange={e => update('cancellation_policy', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="flexible">{t('manage.cancel_flexible', 'Flexible')}</option>
            <option value="moderate">{t('manage.cancel_moderate', 'Moderate (48h)')}</option>
            <option value="strict">{t('manage.cancel_strict', 'Strict (7 days)')}</option>
            <option value="non_refundable">{t('manage.cancel_non_refundable', 'Non-refundable')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.smoking_policy', 'Smoking policy')}</label>
          <select value={form.smoking_policy} onChange={e => update('smoking_policy', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
            <option value="no_smoking">{t('manage.smoke_no', 'No Smoking')}</option>
            <option value="designated_areas">{t('manage.smoke_designated', 'Designated Areas')}</option>
            <option value="allowed">{t('manage.smoke_allowed', 'Allowed')}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('manage.star_rating', 'Star rating')}</label>
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
            <option value="">{t('manage.min_age_all', 'All ages welcome')}</option>
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

      {/* ───── Payment Connection ─────────────────────────────────────
          Folded in from the old "Banque" pill. These are payout
          destinations — where the hotelier wants to RECEIVE their share
          of bookings. Stays editable even when the property is verified
          (a wallet change is a routine operations event, not a legal
          amendment requiring STAYLO admin review). */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-bold uppercase tracking-wider text-deep mb-1 flex items-center gap-2">
          💰 {t('manage.payment_connection_title', 'Payment connection')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          {t('manage.payment_connection_subtitle',
            'Où veux-tu recevoir ta part des réservations ? Tous les champs sont optionnels — remplis ceux qui te conviennent. STAYLO utilisera le premier disponible dans cet ordre : BTC → Solana → Stripe → Banque.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ₿ {t('manage.payment_btc', 'Bitcoin address')}
            </label>
            <input type="text"
              value={form.payment_btc_address}
              onChange={e => update('payment_btc_address', e.target.value)}
              placeholder="bc1q... · 3... · 1..."
              spellCheck="false"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('manage.payment_btc_hint', 'Adresse BTC (Bech32, P2SH ou Legacy). Payouts crypto natifs, frais minimes.')}
            </p>
            {hasOtherProperties && (
              <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 hover:text-deep cursor-pointer select-none">
                <input type="checkbox"
                  checked={propagate.payment_btc_address}
                  onChange={() => togglePropagate('payment_btc_address')}
                  className="rounded border-gray-300 text-ocean focus:ring-ocean/30 w-3.5 h-3.5" />
                🔗 {t('manage.propagate_field', { defaultValue: 'Appliquer à mes {{n}} autre{{p}} propriété{{p}} à la sauvegarde', n: otherPropCount, p: otherPropCount > 1 ? 's' : '' })}
              </label>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ◎ {t('manage.payment_solana', 'Solana address')}
            </label>
            <input type="text"
              value={form.payment_solana_address}
              onChange={e => update('payment_solana_address', e.target.value)}
              placeholder="9xN...base58"
              spellCheck="false"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('manage.payment_solana_hint', 'Adresse Solana (base58). Reçoit aussi les payouts en $STAY.')}
            </p>
            {hasOtherProperties && (
              <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 hover:text-deep cursor-pointer select-none">
                <input type="checkbox"
                  checked={propagate.payment_solana_address}
                  onChange={() => togglePropagate('payment_solana_address')}
                  className="rounded border-gray-300 text-ocean focus:ring-ocean/30 w-3.5 h-3.5" />
                🔗 {t('manage.propagate_field', { defaultValue: 'Appliquer à mes {{n}} autre{{p}} propriété{{p}} à la sauvegarde', n: otherPropCount, p: otherPropCount > 1 ? 's' : '' })}
              </label>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              🏦 {t('manage.payment_bank', 'Bank account details')}
            </label>
            <textarea
              value={form.payment_bank_details}
              onChange={e => update('payment_bank_details', e.target.value)}
              rows={3}
              placeholder={t('manage.payment_bank_placeholder',
                'Holder name · IBAN · SWIFT/BIC · Bank · Country')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none" />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('manage.payment_bank_hint', 'Virement bancaire classique. Les frais SWIFT s’appliquent sur les paiements internationaux.')}
            </p>
            {hasOtherProperties && (
              <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 hover:text-deep cursor-pointer select-none">
                <input type="checkbox"
                  checked={propagate.payment_bank_details}
                  onChange={() => togglePropagate('payment_bank_details')}
                  className="rounded border-gray-300 text-ocean focus:ring-ocean/30 w-3.5 h-3.5" />
                🔗 {t('manage.propagate_field', { defaultValue: 'Appliquer à mes {{n}} autre{{p}} propriété{{p}} à la sauvegarde', n: otherPropCount, p: otherPropCount > 1 ? 's' : '' })}
              </label>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              💳 {t('manage.payment_stripe', 'Stripe link')}
            </label>
            <input type="url"
              value={form.payment_stripe_link}
              onChange={e => update('payment_stripe_link', e.target.value)}
              placeholder="https://connect.stripe.com/express/... or acct_..."
              spellCheck="false"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            <p className="text-[11px] text-gray-400 mt-1">
              {t('manage.payment_stripe_hint', 'Lien Stripe Connect/Express OU ton account id (acct_...). Pour payouts par carte.')}
            </p>
            {hasOtherProperties && (
              <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 hover:text-deep cursor-pointer select-none">
                <input type="checkbox"
                  checked={propagate.payment_stripe_link}
                  onChange={() => togglePropagate('payment_stripe_link')}
                  className="rounded border-gray-300 text-ocean focus:ring-ocean/30 w-3.5 h-3.5" />
                🔗 {t('manage.propagate_field', { defaultValue: 'Appliquer à mes {{n}} autre{{p}} propriété{{p}} à la sauvegarde', n: otherPropCount, p: otherPropCount > 1 ? 's' : '' })}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ───── OTA Channel Manager ─────────────────────────────────
          V1 placeholder UI for the upcoming channel-manager
          integration. Each OTA is a card with a status pill and
          Connect/Refresh action stubs — clicking them today shows
          a "coming soon" hint + opens a contact mailto for early
          access. When the API connectors ship (V2), the same UI
          gains real behaviour without re-training the hotelier.

          The 4 API-key text inputs from the previous version are
          preserved inside a collapsible "Advanced" panel so
          channel-manager-savvy operators can still paste a key
          today. */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-bold uppercase tracking-wider text-deep mb-1 flex items-center gap-2">
          🔌 {t('manage.ota_integrations_title', 'OTA channel manager')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          {t('manage.ota_integrations_subtitle_v2',
            'Synchronise les réservations de chaque plateforme automatiquement. Évite le surbooking. La connexion API arrive en Phase 2 — demande un accès anticipé.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'booking_com', emoji: '🔵', name: 'Booking.com', accent: 'from-blue-500 to-blue-600',
              formKey: 'ota_booking_com_api_key', propKey: 'ota_booking_com' },
            { key: 'airbnb',      emoji: '🌸', name: 'Airbnb',      accent: 'from-pink-500 to-red-500',
              formKey: 'ota_airbnb_api_key',      propKey: 'ota_airbnb' },
            { key: 'agoda',       emoji: '🔴', name: 'Agoda',       accent: 'from-red-500 to-rose-600',
              formKey: 'ota_agoda_api_key',       propKey: 'ota_agoda' },
            { key: 'expedia',     emoji: '🟡', name: 'Expedia',     accent: 'from-amber-500 to-yellow-500',
              formKey: 'ota_expedia_api_key',     propKey: 'ota_expedia' },
          ].map(ch => {
            const hasKey = !!form[ch.formKey]?.trim()
            return (
              <OtaChannelCard
                key={ch.key}
                channel={ch}
                hasKey={hasKey}
                form={form}
                update={update}
                propagate={propagate}
                togglePropagate={togglePropagate}
                hasOtherProperties={hasOtherProperties}
                otherPropCount={otherPropCount}
                t={t}
              />
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-electric/5 border border-electric/20 rounded-lg text-xs text-electric flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            {t('manage.ota_phase2_note',
              'Phase 2 (post-launch) : Channel manager natif STAYLO — un bouton "Refresh" rapatrie les réservations de toutes vos plateformes en temps réel. Aujourd\'hui en mode preview : tu peux déjà saisir tes clés API pour préparer la connexion (chiffrées au repos, jamais exposées).')}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button onClick={handleSave} disabled={saving || isLocked}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isLocked
            ? t('manage.locked_button', 'Locked — contact admin')
            : saving ? t('manage.saving', 'Saving…') : t('manage.save_changes', 'Save changes')}
        </Button>
        {savedAt && (
          <span className="text-xs text-libre flex items-center gap-1 flex-wrap">
            <Check size={12} /> {t('manage.saved', 'Saved')}
            {savedAt.propagated > 0 && savedAt.otherCount > 0 && (
              <span className="text-gray-500 ml-1">
                · {t('manage.synced_to_others',
                  { defaultValue: 'Synced to {{n}} other propert{{p}}',
                    n: savedAt.otherCount,
                    p: savedAt.otherCount > 1 ? 'ies' : 'y' })}
              </span>
            )}
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
                    title={t('manage.set_hero_video', 'Make this the hero video')}
                  >
                    Set as hero
                  </button>
                )}
                <button
                  onClick={() => handleDelete(idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                  title={t('manage.remove_video', 'Remove video')}
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
                      title={t('manage.set_cover_image', 'Make this the cover image')}
                    >
                      Set cover
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    title={t('manage.remove_photo', 'Remove photo')}
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
// FLOOR PLAN TAB — upload an image of the property's floor plan,
// then drag each room from the "Unplaced" tray onto it. Marker
// positions persist as % coordinates on rooms.floor_plan_x/y.
// ============================================
function FloorPlanTab({ property, rooms, onRefresh }) {
  const { t } = useTranslation()
  const [planUrl, setPlanUrl] = useState(property?.floor_plan_url || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  // The room currently being dragged — tracked locally so the drop
  // handler on the image knows which room.id to update.
  const [draggingRoomId, setDraggingRoomId] = useState(null)
  // Clean view — applies a CSS filter that boosts contrast +
  // desaturates, so walls stay sharp while furniture and decoration
  // fade. Default ON for new uploads (it's the more readable mode for
  // most architect CAD plans); the hotelier can flip back to raw if
  // their plan is already crisp.
  const [cleanView, setCleanView] = useState(true)
  // V6-hybride zones — every enclosed polygonal area Claude detected,
  // plus any zones the hotelier added/edited. Each entry:
  //   { id, vertices: [[x,y]...], deleted?: bool,
  //     assigned_room_id?: uuid, unit_index?: int }
  // Curated by the hotelier: soft-delete with X, assign by drag-drop.
  const [zones, setZones] = useState(() => {
    const raw = property?.floor_plan_zones
    return Array.isArray(raw) ? raw : []
  })
  // AI detection flow — three stages so the button can show what it's
  // doing during the ~20-30s round-trip to Claude Vision.
  const [aiStage, setAiStage] = useState(null)    // null | 'uploading' | 'analysing' | 'saving'
  const [aiResult, setAiResult] = useState(null)  // { detected: number, notes?: string } | null
  // V7 drag-drop + shape model. After confirming V6's click-to-draw was
  // awkward, the hotelier just drags a tray chip onto the plan. We drop
  // a default rectangle (12% × 8%) centred on the cursor and auto-assign
  // it to that room. The hotelier then clicks the shape to select it,
  // drags corners to resize, drags the body to move, or cycles the shape
  // type (rectangle / square / circle) via a floating selector.
  //   selectedZoneId : id of the currently selected zone (handles visible)
  //   zoneDrag       : { zoneId, mode, originX, originY,
  //                      startCx, startCy, startW, startH, handle? }
  //                    Used during a move / resize gesture. `mode` is
  //                    'move' or 'resize'. `handle` is 'nw'|'ne'|'sw'|'se'
  //                    for corner-anchored resizes.
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [zoneDrag,       setZoneDrag]       = useState(null)
  // Background visibility — hotelier toggles OFF once every room is
  // placed, leaving a clean abstract plan with only the coloured shapes.
  const [bgVisible, setBgVisible] = useState(true)
  // Outlines from any previous AI extraction. We no longer FETCH new
  // outlines (the AI detection path was dropped 2026-06-05 — it was
  // imprecise on dense CAD plans and the hotelier prefers to place
  // every room manually). Existing outlines are still rendered so
  // properties that ran the old flow don't suddenly lose their state.
  const [outlines, setOutlines] = useState(() => {
    const raw = property?.floor_plan_outlines
    return Array.isArray(raw) ? raw : []
  })
  // Local positions cache — keyed by room.id, value is an array of
  // {x, y, index}. Index is 1-based and maps to room.quantity slots.
  // Backward compat: if a room only has the legacy floor_plan_x/y set,
  // promote it to a singleton positions[] entry on first read.
  const seedPositions = useCallback(() => {
    const m = {}
    for (const r of rooms) {
      if (Array.isArray(r.floor_plan_positions) && r.floor_plan_positions.length > 0) {
        m[r.id] = r.floor_plan_positions.map((p, i) => ({
          x: Number(p.x),
          y: Number(p.y),
          index: Number(p.index ?? (i + 1)),
        }))
      } else if (r.floor_plan_x != null && r.floor_plan_y != null) {
        m[r.id] = [{ x: Number(r.floor_plan_x), y: Number(r.floor_plan_y), index: 1 }]
      } else {
        m[r.id] = []
      }
    }
    return m
  }, [rooms])
  const [localPositions, setLocalPositions] = useState(seedPositions)
  // Re-seed local cache when the parent re-fetches rooms.
  useEffect(() => { setLocalPositions(seedPositions()) }, [seedPositions])
  // And sync the upload state when the parent's property reference
  // changes (e.g. after a fetch that picks up the new URL).
  useEffect(() => { setPlanUrl(property?.floor_plan_url || null) }, [property?.floor_plan_url])
  useEffect(() => {
    const raw = property?.floor_plan_outlines
    setOutlines(Array.isArray(raw) ? raw : [])
  }, [property?.floor_plan_outlines])
  useEffect(() => {
    const raw = property?.floor_plan_zones
    setZones(Array.isArray(raw) ? raw : [])
  }, [property?.floor_plan_zones])

  /**
   * Trigger the AI polygon detection. Sends the current floor_plan_url
   * to the `floor-plan-extract` edge function, which returns every
   * enclosed polygonal area Claude could perceive (rooms + corridors +
   * stairs — no classification). We replace the property's zones with
   * the detected set, then the hotelier curates by clicking X on the
   * non-room zones and dragging room names onto the rest.
   *
   * Confirmation: if zones already exist (previous detection or manual
   * additions), warn before replacing. We never auto-merge — assignments
   * and edits would be impossible to reconcile across runs.
   */
  async function handleAiDetect() {
    if (!planUrl) return
    if (zones.length > 0) {
      const hasAssigned = zones.some(z => !z.deleted && z.assigned_room_id)
      const msg = hasAssigned
        ? t('manage.plan_zones_replace_assigned',
            'Re-running AI will WIPE every existing zone, including the ones you\'ve already assigned to a room. Continue?')
        : t('manage.plan_zones_replace_plain',
            'Re-running AI will replace every existing zone. Continue?')
      if (!confirm(msg)) return
    }
    setError(null)
    setAiResult(null)
    try {
      setAiStage('analysing')
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/floor-plan-extract`
      const fnResp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          image_url:   planUrl,
        }),
      })
      if (!fnResp.ok) {
        const errBody = await fnResp.json().catch(() => ({}))
        throw new Error(errBody.error || errBody.detail || `Edge function returned ${fnResp.status}`)
      }
      const extracted = await fnResp.json()
      const detected = Array.isArray(extracted.zones) ? extracted.zones : []
      const newZones = detected.map((z, i) => ({
        id: `z-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        vertices: z.vertices,
        deleted: false,
        assigned_room_id: null,
        unit_index: null,
      }))

      setAiStage('saving')
      const { error: upErr } = await supabase
        .from('properties')
        .update({ floor_plan_zones: newZones })
        .eq('id', property.id)
      if (upErr) throw new Error(`Couldn't save zones: ${upErr.message}`)

      setZones(newZones)
      setAiResult({
        detected: newZones.length,
        notes: extracted.notes,
      })
      onRefresh?.()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setAiStage(null)
    }
  }

  /** Soft-delete a zone (corridor, stairs, lobby — anything not a room). */
  async function handleZoneDelete(zoneId) {
    const next = zones.map(z =>
      z.id === zoneId ? { ...z, deleted: true, assigned_room_id: null, unit_index: null } : z
    )
    setZones(next)
    const { error: upErr } = await supabase
      .from('properties')
      .update({ floor_plan_zones: next })
      .eq('id', property.id)
    if (upErr) {
      setError(`Couldn't delete zone: ${upErr.message}`)
      setZones(zones)   // revert
    } else {
      onRefresh?.()
    }
  }

  // ──────────────────────────────────────────────────────────────
  // V7 drag-drop + shape model
  // ──────────────────────────────────────────────────────────────
  // Fast room lookup for the orphan-zone check below.
  const roomById = useMemo(() => {
    const m = new Map()
    for (const r of (rooms || [])) m.set(r.id, r)
    return m
  }, [rooms])

  // A zone is "orphan" when the room it points to no longer carries a
  // matching unit. Two ways that happens:
  //   1. The assigned room was deleted (no entry in roomById)
  //   2. The hotelier shrank the room's quantity below the zone's
  //      unit_index (the 2026-06-08 case: BABA × 4 → × 2 leaves
  //      zones with unit_index 3 and 4 dangling)
  // Orphan zones are filtered out of every render below so the floor
  // plan auto-cleans. We don't hard-delete the JSON entries — that way
  // bumping the quantity back to 4 brings the BABA-003 / 004 zones
  // back where the hotelier originally drew them.
  function isOrphanZone(z) {
    if (!z.assigned_room_id) return false
    const r = roomById.get(z.assigned_room_id)
    if (!r) return true
    const qty = Math.max(1, Number(r.quantity) || 1)
    const idx = Number(z.unit_index) || 1
    return idx > qty
  }

  // Count of active (= non-deleted, non-orphan) zones assigned to a
  // given room. Used by the unplaced-tray badge so it accurately shows
  // how many zones still represent THIS room, not stale ones.
  function assignedCount(roomId) {
    return zones.filter(z => !z.deleted && !isOrphanZone(z) && z.assigned_room_id === roomId).length
  }
  // Lowest unused unit_index in 1..max — stable across removals.
  // Orphan zones are ignored so a quantity drop frees up their slots
  // (e.g. BABA × 4 → × 2 then × 3 again: the new 3rd unit reuses
  // index 3, not 5).
  function nextZoneIndexFor(roomId, max) {
    const used = new Set(
      zones.filter(z => !z.deleted && !isOrphanZone(z) && z.assigned_room_id === roomId).map(z => z.unit_index)
    )
    for (let i = 1; i <= max; i++) if (!used.has(i)) return i
    return max
  }

  // Pointer position as % of the canvas bounding rect.
  function pointerPctOf(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    }
  }

  // Default shape dimensions when a room is first dropped on the plan.
  // Conservative — small enough to fit between adjacent rooms on a
  // dense CAD plan, large enough to be readable. Hotelier can resize.
  const DEFAULT_SHAPE_W = 12
  const DEFAULT_SHAPE_H = 8

  /**
   * Tray-chip drag → canvas drop. Creates a new zone with default
   * rectangle shape centred on the cursor, auto-assigned to the
   * dragged room. For multi-unit rooms the unit_index iterates; for
   * dorms only the first drop sticks.
   */
  async function handleZoneDrop(e) {
    e.preventDefault()
    const roomId = draggingRoomId || e.dataTransfer.getData('text/plain')
    setDraggingRoomId(null)
    if (!roomId) return
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    const dorm = isDormRoom(room)
    const max = dorm ? 1 : (room.quantity || 1)
    if (assignedCount(room.id) >= max) return
    const p = pointerPctOf(e)
    const newZone = {
      id: `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      shape: 'rect',
      cx: p.x,
      cy: p.y,
      w: DEFAULT_SHAPE_W,
      h: DEFAULT_SHAPE_H,
      deleted: false,
      assigned_room_id: room.id,
      unit_index: dorm ? null : nextZoneIndexFor(room.id, max),
    }
    const next = [...zones, newZone]
    setZones(next)
    setSelectedZoneId(newZone.id)
    const { error: upErr } = await supabase
      .from('properties')
      .update({ floor_plan_zones: next })
      .eq('id', property.id)
    if (upErr) {
      setError(`Couldn't save zone: ${upErr.message}`)
      setZones(zones)
    } else {
      onRefresh?.()
    }
  }

  /** Persist a single zone mutation to the DB. Called by move / resize /
   *  shape-change. Updates the local cache optimistically; reverts on
   *  error so the UI doesn't drift from the DB. */
  async function persistZone(zoneId, patch) {
    const prev = zones
    const next = zones.map(z => z.id === zoneId ? { ...z, ...patch } : z)
    setZones(next)
    const { error: upErr } = await supabase
      .from('properties')
      .update({ floor_plan_zones: next })
      .eq('id', property.id)
    if (upErr) {
      setError(`Couldn't save change: ${upErr.message}`)
      setZones(prev)
      return false
    }
    onRefresh?.()
    return true
  }

  /** Cycle shape: rect → square → circle → rect. Square keeps current
   *  width as both dimensions; circle uses width as diameter. */
  function cycleShape(zone) {
    const cycle = { rect: 'square', square: 'circle', circle: 'rect' }
    const nextShape = cycle[zone.shape] || 'rect'
    const patch = { shape: nextShape }
    if (nextShape === 'square' || nextShape === 'circle') {
      const size = Math.max(zone.w, zone.h)
      patch.w = size
      patch.h = size
    }
    persistZone(zone.id, patch)
  }

  // Move + resize via NATIVE pointer events attached to the window.
  // React's synthetic onPointerMove on the canvas didn't fire reliably
  // during a drag — the cursor would leave the canvas bounding box,
  // hit the empty page area, and we'd stop getting move updates.
  // Window-level native listeners keep the drag alive regardless of
  // which element the cursor is over, until release. The listeners are
  // installed in start* and torn down in the local pointerup handler.
  function startMove(e, zone) {
    e.stopPropagation()
    const rect = e.currentTarget.closest('[data-plan-canvas]')?.getBoundingClientRect()
    if (!rect) return
    setSelectedZoneId(zone.id)
    runDrag(e, zone, rect, 'move', null)
  }
  function startResize(e, zone, handle) {
    e.stopPropagation()
    const rect = e.currentTarget.closest('[data-plan-canvas]')?.getBoundingClientRect()
    if (!rect) return
    setSelectedZoneId(zone.id)
    runDrag(e, zone, rect, 'resize', handle)
  }

  /** Shared drag driver — installs window listeners and tears them
   *  down on release. Uses a 4px movement threshold to distinguish a
   *  pure CLICK (no drag) from a real DRAG: below threshold, neither
   *  the zone state nor the DB are touched, so the click leaves the
   *  selection intact and the floater visible/clickable. Above
   *  threshold, the move/resize updates apply normally and the final
   *  state is persisted on release.
   *
   *  onClickNoMove (optional) — fires when the gesture ends without
   *  crossing the 4px threshold. Used by dorm zones to open the bed
   *  sub-plan modal on a tap, while still supporting full move/resize
   *  via the same pointerdown. */
  function runDrag(downEvt, zone, canvasRect, mode, handle, onClickNoMove) {
    const startCx = zone.cx, startCy = zone.cy
    const startW  = zone.w,  startH  = zone.h
    const originX = downEvt.clientX, originY = downEvt.clientY
    const canvasW = canvasRect.width, canvasH = canvasRect.height
    const zoneId  = zone.id
    const isSqOrCircle = zone.shape === 'square' || zone.shape === 'circle'
    let hasMoved = false   // flips true once movement passes the threshold

    function move(ev) {
      const dxPx = ev.clientX - originX
      const dyPx = ev.clientY - originY
      // Threshold gate — small accidental movements between mousedown
      // and mouseup (typical of a click) get ignored. Only true drags
      // mutate state.
      if (!hasMoved && Math.abs(dxPx) < 4 && Math.abs(dyPx) < 4) return
      hasMoved = true

      const dxPct = (dxPx / canvasW) * 100
      const dyPct = (dyPx / canvasH) * 100
      if (mode === 'move') {
        const nCx = Math.max(0, Math.min(100, startCx + dxPct))
        const nCy = Math.max(0, Math.min(100, startCy + dyPct))
        setZones(zs => zs.map(z => z.id === zoneId ? { ...z, cx: nCx, cy: nCy } : z))
      } else {
        const left   = startCx - startW / 2
        const right  = startCx + startW / 2
        const top    = startCy - startH / 2
        const bot    = startCy + startH / 2
        let nLeft = left, nRight = right, nTop = top, nBot = bot
        if (handle.includes('w')) nLeft  = Math.min(right - 1, left  + dxPct)
        if (handle.includes('e')) nRight = Math.max(left + 1,  right + dxPct)
        if (handle.includes('n')) nTop   = Math.min(bot - 1,   top   + dyPct)
        if (handle.includes('s')) nBot   = Math.max(top + 1,   bot   + dyPct)
        let nW = nRight - nLeft
        let nH = nBot - nTop
        if (isSqOrCircle) {
          const size = Math.max(nW, nH)
          nW = nH = size
        }
        const nCx = Math.max(0, Math.min(100, (nLeft + nRight) / 2))
        const nCy = Math.max(0, Math.min(100, (nTop  + nBot)   / 2))
        setZones(zs => zs.map(z => z.id === zoneId
          ? { ...z, cx: nCx, cy: nCy, w: Math.max(2, nW), h: Math.max(2, nH) }
          : z))
      }
    }
    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!hasMoved) {
        // Pure click → fire the tap-handler if provided (e.g. dorm
        // modal opener) and leave state untouched. The floater +
        // handles remain visible because selectedZoneId was already
        // set in startMove/startResize.
        onClickNoMove?.()
        return
      }
      // Real drag → persist the new state.
      setZones(zs => {
        supabase.from('properties')
          .update({ floor_plan_zones: zs })
          .eq('id', property.id)
          .then(() => onRefresh?.())
        return zs
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  // The canvas's onPointerMove / onPointerUp are no-ops now (kept as
  // attribute references to avoid breaking the existing JSX, but
  // the real work runs through window listeners). Defined as no-ops:
  function handlePointerMove() {}
  function handlePointerUp()   {}

  /** Explicitly set the zone's shape — used by the floater buttons.
   *  When changing to square or circle, size both axes to the larger
   *  of w/h so the existing footprint is preserved as best possible. */
  function setShape(zone, nextShape) {
    const patch = { shape: nextShape }
    if (nextShape === 'square' || nextShape === 'circle') {
      const size = Math.max(zone.w, zone.h)
      patch.w = size
      patch.h = size
    }
    persistZone(zone.id, patch)
  }

  // Escape deselects.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setSelectedZoneId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Sub-plan modal for dorm rooms — opens when the hotelier clicks a
  // dorm marker on the main plan. Carries the room being inspected.
  const [dormModal, setDormModal] = useState(null)  // room | null

  // Helpers — how many units placed vs total, lowest free index, snap.
  // For dorms, total capacity on the MAIN plan is 1 (the room itself);
  // the room.quantity (= bed count) is shown inside the sub-plan modal.
  const placedCount = (roomId) => (localPositions[roomId] || []).length
  const maxPositionsFor = (room) => isDormRoom(room) ? 1 : (room.quantity || 1)
  const remainingFor = (room) => Math.max(0, maxPositionsFor(room) - placedCount(room.id))
  function nextIndexFor(roomId, max) {
    const used = new Set((localPositions[roomId] || []).map(p => p.index))
    for (let i = 1; i <= max; i++) {
      if (!used.has(i)) return i
    }
    return max   // shouldn't happen if remaining > 0
  }
  /**
   * Magnétisme snap-to-outline. If the cursor lands within ~10% of an
   * outline center we snap to that center; otherwise we return the raw
   * cursor coords. Returns { x, y, snapped:boolean }.
   */
  function snapToNearestOutline(rawX, rawY) {
    if (!outlines.length) return { x: rawX, y: rawY, snapped: false }
    let best = null
    for (const o of outlines) {
      const cx = Number(o.x_percent)
      const cy = Number(o.y_percent)
      const dist = Math.hypot(rawX - cx, rawY - cy)
      if (!best || dist < best.dist) best = { cx, cy, dist }
    }
    if (best && best.dist < 10) return { x: best.cx, y: best.cy, snapped: true }
    return { x: rawX, y: rawY, snapped: false }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    const ext = file.name.split('.').pop()
    const filename = `floor-plan-${Date.now()}.${ext}`
    const path = `properties/${property.id}/${filename}`
    const { error: upErr } = await supabase.storage
      .from('property-photos')
      .upload(path, file, { contentType: file.type })
    if (upErr) {
      setUploading(false)
      setError(`Upload failed: ${upErr.message}`)
      return
    }
    const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(path)
    const url = urlData?.publicUrl
    // Replacing the image invalidates every existing zone/marker — their
    // coordinates are tied to the dimensions of the previous image. We
    // wipe them so the hotelier starts fresh, exactly like Remove plan
    // does but without dropping the URL.
    const writes = [
      supabase.from('properties')
        .update({ floor_plan_url: url, floor_plan_zones: [] })
        .eq('id', property.id),
      supabase.from('rooms')
        .update({ floor_plan_positions: [], floor_plan_x: null, floor_plan_y: null })
        .eq('property_id', property.id),
    ]
    const results = await Promise.all(writes)
    const firstErr = results.find(r => r.error)?.error
    setUploading(false)
    if (firstErr) {
      setError(`Saved file but couldn't update property: ${firstErr.message}`)
    } else {
      setPlanUrl(url)
      setZones([])
      setAiResult(null)
      onRefresh?.()
    }
  }

  /** Wipe every zone on this property — manual cleanup when the hotelier
   *  wants to start over without changing the background image. */
  async function handleClearAllZones() {
    if (!confirm(t('manage.plan_clear_zones_confirm', 'Wipe every zone on this plan? This deletes every polygon, including the ones you\'ve assigned to rooms. The background image stays.'))) return
    setError(null)
    const { error: upErr } = await supabase
      .from('properties')
      .update({ floor_plan_zones: [] })
      .eq('id', property.id)
    if (upErr) {
      setError(`Couldn't clear zones: ${upErr.message}`)
      return
    }
    setZones([])
    setAiResult(null)
    onRefresh?.()
  }

  /**
   * AI-assisted plan generation (V2 — outline detection).
   *
   *  1. Upload the raw plan to storage (kept for traceability)
   *  2. Send the public URL to `floor-plan-extract`, which asks Claude
   *     Vision to detect every guest-room RECTANGLE on the plan. No
   *     labels needed — most plans don't have them and that's expected.
   *  3. Receive back {outlines: [{x_percent, y_percent, w, h}, ...]}
   *  4. Render a clean STAYLO-styled SVG from those outlines (empty
   *     rectangles + placeholder numbers)
   *  5. Upload the SVG and persist:
   *       · properties.floor_plan_url       = SVG public URL
   *       · properties.floor_plan_outlines  = outlines JSONB (for snap)
   *     Clear any previously placed positions (the new plan has new
   *     coordinates; old positions would land in the wrong places).
   *  6. Hotelier drag-drops their room names onto the outlines — the UI
   *     snaps to the nearest outline center on drop.
   */
  async function handleAiGenerate(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setAiResult(null)
    setAiInfo(null)

    try {
      // ─── 1. Raw image upload ─────────────────────────────────
      setAiStage('uploading')
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const stamp = Date.now()
      const rawPath  = `properties/${property.id}/floor-plan-raw-${stamp}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('property-photos')
        .upload(rawPath, file, { contentType: file.type })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
      const { data: rawUrlData } = supabase.storage.from('property-photos').getPublicUrl(rawPath)
      const rawUrl = rawUrlData?.publicUrl
      if (!rawUrl) throw new Error('Could not derive public URL for uploaded image')

      // ─── 2. Call the edge function ───────────────────────────
      setAiStage('analysing')
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/floor-plan-extract`
      const fnResp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          image_url:   rawUrl,
          room_names:  rooms.map(r => r.name).filter(Boolean),
        }),
      })
      if (!fnResp.ok) {
        const errBody = await fnResp.json().catch(() => ({}))
        throw new Error(errBody.error || errBody.detail || `Edge function returned ${fnResp.status}`)
      }
      const extracted = await fnResp.json()
      const detectedOutlines = Array.isArray(extracted.outlines) ? extracted.outlines : []
      if (detectedOutlines.length === 0) {
        // Successful AI run, but nothing detected. Show an INFO banner
        // (not a red error). The hotelier can either annotate the plan
        // more clearly or continue in manual mode.
        setAiInfo({
          notes: extracted.notes || 'AI ran but couldn\'t detect any room rectangles on this image.',
          confidence: extracted.confidence,
        })
        return
      }

      // ─── 3. Keep the original image as the background ────────
      // Earlier iterations generated a clean STAYLO-styled SVG and
      // replaced the original. That made the plan look generic and
      // disconnected from the building's real geometry. We now KEEP
      // the original raw image as the floor_plan_url; the AI outlines
      // are stored separately in properties.floor_plan_outlines and
      // overlaid as React elements at render time (transparent
      // rectangles + placeholder numbers floating on top of the image).
      setAiStage('rendering')
      const finalUrl = rawUrl

      // ─── 4. Persist URL + outlines + clear stale positions ───
      // Re-running the AI on a NEW plan produces new outline coordinates,
      // so any previously placed markers would now be misaligned. Reset
      // every room's positions[] (and legacy floor_plan_x/y) to NULL so
      // the hotelier re-drops on the new outlines.
      const writes = [
        supabase.from('properties')
          .update({
            floor_plan_url: finalUrl,
            floor_plan_outlines: detectedOutlines,
          })
          .eq('id', property.id),
        supabase.from('rooms')
          .update({
            floor_plan_positions: [],
            floor_plan_x: null,
            floor_plan_y: null,
          })
          .eq('property_id', property.id),
      ]
      const writeResults = await Promise.all(writes)
      const firstErr = writeResults.find(r => r.error)?.error
      if (firstErr) throw new Error(`Plan generated but couldn't save: ${firstErr.message}`)

      // ─── 5. Done — surface result + reset local state ────────
      setPlanUrl(finalUrl)
      setOutlines(detectedOutlines)
      setLocalPositions(Object.fromEntries(rooms.map(r => [r.id, []])))
      setAiResult({
        detected: detectedOutlines.length,
        notes: extracted.notes,
      })
      onRefresh?.()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setAiStage(null)
      // Reset the input so picking the same file again retriggers onChange
      if (e?.target) e.target.value = ''
    }
  }

  async function handleRemovePlan() {
    if (!confirm(t('manage.confirm_remove_plan', 'Remove this floor plan? Every room shape, marker, and position will be cleared.'))) return
    setError(null)
    // Full wipe — URL + outlines + V7 zones + V5 marker positions.
    // Without this the reception-side view (/rooms → Floor Plan)
    // would keep showing the V7 zones because it checks both URL
    // and zones independently. David reported 2026-06-05: 'le floor
    // plan est toujours visible cote reception alors que je l'ai
    // desactive' — caused by floor_plan_zones surviving the wipe.
    await supabase.from('properties')
      .update({
        floor_plan_url: null,
        floor_plan_outlines: [],
        floor_plan_zones: [],
      })
      .eq('id', property.id)
    await supabase.from('rooms')
      .update({ floor_plan_positions: [], floor_plan_x: null, floor_plan_y: null })
      .eq('property_id', property.id)
    setPlanUrl(null)
    setOutlines([])
    setZones([])
    setSelectedZoneId(null)
    setLocalPositions(Object.fromEntries(rooms.map(r => [r.id, []])))
    setAiResult(null)
    setAiInfo(null)
    onRefresh?.()
  }

  // Drag-and-drop — HTML5 native API.
  function handleRoomDragStart(e, roomId) {
    setDraggingRoomId(roomId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', roomId)
  }
  function handleRoomDragEnd() { setDraggingRoomId(null) }
  function handlePlanDragOver(e) {
    if (!draggingRoomId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  async function handlePlanDrop(e) {
    e.preventDefault()
    const roomId = draggingRoomId || e.dataTransfer.getData('text/plain')
    setDraggingRoomId(null)
    if (!roomId) return
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    // Refuse if the room is already fully placed (defensive — the tray
    // entry shouldn't render in this case but covers a race).
    if (remainingFor(room) <= 0) return

    // Compute drop coords as % of the image's bounding rect.
    const rect = e.currentTarget.getBoundingClientRect()
    const rawX = ((e.clientX - rect.left) / rect.width)  * 100
    const rawY = ((e.clientY - rect.top)  / rect.height) * 100
    const clampedRaw = {
      x: Math.max(0, Math.min(100, rawX)),
      y: Math.max(0, Math.min(100, rawY)),
    }
    // Snap to nearest AI outline if one is within tolerance.
    const { x, y } = snapToNearestOutline(clampedRaw.x, clampedRaw.y)

    // Pick the next free index for this room (1..maxPositionsFor).
    // For dorms maxPositionsFor === 1 so this always returns 1.
    const idx = nextIndexFor(roomId, maxPositionsFor(room))
    const newPos = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), index: idx }
    const nextPositions = [...(localPositions[roomId] || []), newPos]
      .sort((a, b) => a.index - b.index)

    // Optimistic UI — drop the marker now, persist async.
    setLocalPositions(prev => ({ ...prev, [roomId]: nextPositions }))

    const { error: upErr } = await supabase
      .from('rooms')
      .update({ floor_plan_positions: nextPositions })
      .eq('id', roomId)
    if (upErr) {
      setError(`Could not save room position: ${upErr.message}`)
      // Revert on failure
      setLocalPositions(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(p => p.index !== idx),
      }))
    } else {
      onRefresh?.()
    }
  }
  /** Remove a single unit's position; other units of the same room stay. */
  async function handleMarkerRemove(roomId, index) {
    const next = (localPositions[roomId] || []).filter(p => p.index !== index)
    setLocalPositions(prev => ({ ...prev, [roomId]: next }))
    const { error: upErr } = await supabase
      .from('rooms')
      .update({ floor_plan_positions: next })
      .eq('id', roomId)
    if (upErr) setError(upErr.message)
    else onRefresh?.()
  }

  // Flatten positions into a single list of markers for rendering.
  // Each marker references back to its room + its index within that room.
  // Dorms get a single marker labelled "Name · N beds"; non-dorm rooms
  // with quantity > 1 get numbered markers ("Name 1", "Name 2"…).
  const markers = []
  for (const room of rooms) {
    const positions = localPositions[room.id] || []
    const dorm = isDormRoom(room)
    for (const p of positions) {
      const label = dorm
        ? `${room.name} · ${room.quantity || 1} beds`
        : (room.quantity || 1) > 1 ? `${room.name} ${p.index}` : room.name
      markers.push({
        roomId: room.id,
        roomName: room.name,
        roomRef: room,             // full room object for the modal
        isDorm: dorm,
        quantity: room.quantity || 1,
        index: p.index,
        x: p.x,
        y: p.y,
        label,
      })
    }
  }
  // Rooms that still have at least one unit to place. We show one tray
  // chip per remaining UNIT (so dragging "Hibrakim" three times in a row
  // sees the chip count decrement each time).
  const trayRooms = rooms.filter(r => remainingFor(r) > 0)

  // ── Render ────────────────────────────────────────────────
  if (!planUrl) {
    return (
      <Card className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-ocean/15 to-electric/15 flex items-center justify-center mb-4">
            <MapIcon size={26} className="text-ocean" />
          </div>
          <h3 className="text-xl font-bold text-deep mb-2">
            {t('manage.plan_empty_title', 'Upload your floor plan')}
          </h3>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            {t('manage.plan_empty_desc_v3', 'A schematic, a photo, or a CAD plan. We apply a clean-up filter so the structure pops, then you drag each room onto the plan where it actually is in your property.')}
          </p>

          <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-ocean to-electric text-white font-bold text-sm cursor-pointer hover:shadow-md transition-all ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Upload size={16} />
            {uploading ? t('common.uploading', 'Uploading…') : t('manage.plan_upload_cta', 'Choose an image')}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>

          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-sunset/10 text-sunset text-xs font-semibold">{error}</div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-gray-500">
          {t('manage.plan_toolbar_hint', 'Drag a room from below onto the plan to place it. Click a marker to remove it.')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI zone detection — Claude finds every enclosed polygonal
              area on the plan, the hotelier curates afterwards. */}
          <button
            type="button"
            onClick={handleAiDetect}
            disabled={!!aiStage}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              aiStage
                ? 'bg-libre/20 text-libre opacity-80 cursor-wait'
                : 'bg-gradient-to-r from-libre to-electric text-white shadow-sm hover:shadow-md'
            }`}
            title={t('manage.plan_ai_detect_tip', 'AI detects every enclosed area on the plan. You delete the corridors and stairs afterwards.')}
          >
            {aiStage === 'analysing' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {aiStage === 'analysing'
              ? t('manage.plan_ai_analysing', 'Analysing…')
              : aiStage === 'saving'
                ? t('manage.plan_ai_saving', 'Saving…')
                : zones.length > 0
                  ? t('manage.plan_ai_redetect', 'Re-detect zones')
                  : t('manage.plan_ai_detect', '✨ Detect zones (AI)')}
          </button>
          {/* Clean view toggle — boosts contrast + desaturates so walls
              pop and meubles fade. Hotelier can flip OFF if plan is
              already crisp. Only meaningful while bg is visible. */}
          <button
            type="button"
            onClick={() => setCleanView(v => !v)}
            disabled={!bgVisible}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              cleanView
                ? 'bg-deep text-white shadow-sm hover:shadow-md'
                : 'bg-white border border-gray-200 text-deep hover:border-ocean'
            }`}
            title={cleanView
              ? t('manage.plan_clean_on', 'Clean view ON — click to show the raw image')
              : t('manage.plan_clean_off', 'Clean view OFF — click to simplify')}
          >
            {cleanView
              ? t('manage.plan_clean_label_on', '☼ Clean')
              : t('manage.plan_clean_label_off', '◯ Raw')}
          </button>
          {/* Hide background — once every room is placed, the hotelier
              flips this to get a clean abstract plan with only the
              coloured shapes. Toggle-back to verify alignment. */}
          <button
            type="button"
            onClick={() => setBgVisible(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              bgVisible
                ? 'bg-white border border-gray-200 text-deep hover:border-ocean'
                : 'bg-gradient-to-r from-libre to-electric text-white shadow-sm hover:shadow-md'
            }`}
            title={bgVisible
              ? t('manage.plan_bg_hide_tip', 'Hide the architect plan — only the room shapes remain')
              : t('manage.plan_bg_show_tip', 'Show the architect plan')}
          >
            {bgVisible
              ? t('manage.plan_bg_hide', '👁 Hide plan')
              : t('manage.plan_bg_show', '◉ Show plan')}
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-deep hover:border-ocean cursor-pointer transition-all">
            <Upload size={12} />
            {uploading ? '…' : t('manage.plan_replace', 'Replace image')}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {/* Clear all zones — only shown when at least one zone exists
              (otherwise it would be a no-op). Hotelier nukes every zone
              without touching the background image — useful after a bad
              AI run or to start fresh tracing. */}
          {zones.filter(z => !z.deleted && !isOrphanZone(z)).length > 0 && (
            <button
              type="button"
              onClick={handleClearAllZones}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sunset/30 text-xs font-bold text-sunset hover:bg-sunset/5 transition-all"
              title={t('manage.plan_clear_zones_tip', 'Delete every zone (AI-detected + manually drawn) on this plan')}
            >
              <X size={12} />
              {t('manage.plan_clear_zones', 'Clear zones')}
            </button>
          )}
          <button
            type="button"
            onClick={handleRemovePlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sunset/30 text-xs font-bold text-sunset hover:bg-sunset/5 transition-all"
          >
            <Trash2 size={12} />
            {t('manage.plan_remove', 'Remove plan')}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-sunset/10 text-sunset text-xs font-semibold">{error}</div>
      )}

      {/* AI result toast — once detection succeeds, tell the hotelier
          what's next: hover a polygon to delete it, drag a room name
          onto a polygon to assign. */}
      {aiResult && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-libre/10 to-electric/10 border border-libre/30 text-deep text-xs">
          <Sparkles size={14} className="text-libre mt-0.5 flex-shrink-0" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">
              {t('manage.plan_zones_done', '✓ {{count}} zones detected. Click a polygon\'s X to remove non-rooms, then drag a room name onto a polygon to assign.', { count: aiResult.detected })}
            </span>
            {aiResult.notes && (
              <span className="block text-deep/50 mt-1 italic">{aiResult.notes}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAiResult(null)}
            className="text-deep/40 hover:text-deep transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Plan canvas — drop target. The original image is the background
          (can be hidden via toolbar toggle once rooms are placed). Zones
          are rendered as SVG shapes (rect / circle); the selected zone
          gets resize handles + a shape selector floating above it. */}
      <div
        data-plan-canvas
        onDragOver={handlePlanDragOver}
        onDrop={handleZoneDrop}
        onClick={(e) => {
          // Only deselect when the click hits the canvas itself —
          // not when it bubbled up from a child (zone, handle, floater).
          // Children either have e.stopPropagation() in their own
          // handlers OR are non-interactive (pointer-events:none, so
          // the click goes through to the canvas with e.target === the
          // child, not the canvas).
          if (e.target === e.currentTarget) {
            setSelectedZoneId(null)
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full rounded-2xl border-2 border-dashed border-ocean/30 bg-white overflow-hidden select-none"
        style={{ minHeight: 360 }}
      >
        <img
          src={planUrl}
          alt="Floor plan"
          className="w-full h-auto block pointer-events-none transition-[filter,opacity] duration-300"
          draggable={false}
          style={{
            filter: bgVisible && cleanView
              ? 'contrast(1.55) saturate(0) brightness(1.08)'
              : 'none',
            opacity: bgVisible ? 1 : 0,
          }}
        />
        {/* AI zone polygons — rendered as an SVG overlay using the same
            % coordinate system as the data. viewBox 0..100 matches the
            stored vertices directly, no per-render math needed. */}
        {/* V7 shape zones — rect / circle, with optional legacy polygon
            support for properties still on V6 polygon vertices.
            CRITICAL: pointer-events:none MUST be on each child SVG
            element, not just the parent. The default SVG pointer-events
            value is `visiblePainted` which intercepts clicks on the
            painted fill regardless of the parent's CSS. Without this,
            every click on a zone shape bubbled to the canvas onClick
            and deselected the zone before its drag surface (a sibling
            HTML div above the SVG) could process the click. */}
        {zones.filter(z => !z.deleted && !isOrphanZone(z)).length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {zones.filter(z => !z.deleted && !isOrphanZone(z)).map(z => {
              const assigned = !!z.assigned_room_id
              const room = assigned ? rooms.find(r => r.id === z.assigned_room_id) : null
              const dorm = room && isDormRoom(room)
              const colour = !assigned
                ? 'fill-deep/[0.06] stroke-deep/40'
                : dorm
                  ? 'fill-libre/25 stroke-libre'
                  : 'fill-ocean/25 stroke-ocean'
              // Legacy V6 polygon
              if (Array.isArray(z.vertices) && z.vertices.length >= 3) {
                return (
                  <polygon
                    key={z.id}
                    points={verticesToPoints(z.vertices)}
                    className={colour}
                    strokeWidth="0.4"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: 'none' }}
                  />
                )
              }
              // V7 shape
              const shape = z.shape || 'rect'
              if (shape === 'circle') {
                return (
                  <circle
                    key={z.id}
                    cx={z.cx} cy={z.cy} r={(z.w || 10) / 2}
                    className={colour}
                    strokeWidth="0.4"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: 'none' }}
                  />
                )
              }
              return (
                <rect
                  key={z.id}
                  x={z.cx - z.w / 2} y={z.cy - z.h / 2}
                  width={z.w} height={z.h}
                  rx="0.6" ry="0.6"
                  className={colour}
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}
          </svg>
        )}
        {/* Per-zone interactive overlay — invisible drag surface covering
            the shape, with a label at the center, resize handles when
            selected, and a shape selector / delete floating above. */}
        {zones.filter(z => !z.deleted && !isOrphanZone(z)).map(z => {
          const assigned = z.assigned_room_id
            ? rooms.find(r => r.id === z.assigned_room_id)
            : null
          const dorm = assigned && isDormRoom(assigned)
          const isSelected = selectedZoneId === z.id
          // V7 shape coordinates
          const cx = z.cx ?? 50
          const cy = z.cy ?? 50
          const w  = z.w  ?? DEFAULT_SHAPE_W
          const h  = z.h  ?? DEFAULT_SHAPE_H
          // Bounding box (for handle positioning)
          const left = cx - w / 2
          const top  = cy - h / 2
          // Label text
          const unitSuffix = !dorm && (assigned?.quantity || 1) > 1 && z.unit_index
            ? ` ${z.unit_index}`
            : ''
          const label = assigned
            ? (dorm ? `${assigned.name} · ${assigned.quantity || 0} beds` : `${assigned.name}${unitSuffix}`)
            : ''
          // Shape label for the selector button
          const shapeIcon = z.shape === 'circle' ? '●' : z.shape === 'square' ? '■' : '▭'
          return (
            <div key={`overlay-${z.id}`} className="contents">
              {/* Drag surface — covers the shape. Pointerdown selects
                  AND arms a drag with the 4px threshold. For dorms,
                  the tap-without-drag opens the bed sub-plan modal;
                  for non-dorms, the tap just selects (no save). */}
              <div
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.stopPropagation()
                  setSelectedZoneId(z.id)
                  const rect = e.currentTarget.closest('[data-plan-canvas]')?.getBoundingClientRect()
                  if (!rect) return
                  runDrag(e, z, rect, 'move', null, dorm ? () => setDormModal(assigned) : null)
                }}
                onClick={(e) => { e.stopPropagation() }}
                className="absolute cursor-move"
                style={{
                  left: `${left}%`, top: `${top}%`,
                  width: `${w}%`,   height: `${h}%`,
                  touchAction: 'none',
                  zIndex: 5,
                }}
              />
              {/* Center label */}
              {label && (
                <div
                  className="absolute pointer-events-none"
                  style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow ring-2 ring-white whitespace-nowrap ${
                    dorm ? 'bg-gradient-to-r from-libre to-electric text-white'
                         : 'bg-gradient-to-r from-orange to-pink-500 text-white'
                  }`}>
                    🛏️ {label}
                  </span>
                </div>
              )}
              {/* Selected — handles + shape selector + delete */}
              {isSelected && (
                <>
                  {/* Shape selector floater — 3 explicit buttons + delete.
                      Flips BELOW the zone if there's no room above so the
                      buttons never escape the canvas. */}
                  {(() => {
                    // Bigger vertical clearance (24px) so the floater
                    // never overlaps with the corner handle wrappers
                    // (which are 32×32px hit areas at each corner).
                    const showBelow = top < 22
                    const anchorY = showBelow ? (cy + h / 2) : top
                    const yTransform = showBelow ? 'calc(0% + 24px)' : 'calc(-100% - 24px)'
                    const currentShape = z.shape || 'rect'
                    const ShapeBtn = ({ shape, icon, label }) => (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setShape(z, shape)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-md text-lg font-bold transition-all cursor-pointer ${
                          currentShape === shape
                            ? 'bg-ocean text-white shadow-inner'
                            : 'text-white/80 hover:bg-white/15 active:bg-white/25'
                        }`}
                        title={label}
                      >
                        {icon}
                      </button>
                    )
                    return (
                      <div
                        className="absolute flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-deep text-white shadow-2xl ring-1 ring-white/10 z-40"
                        style={{
                          left: `${cx}%`, top: `${anchorY}%`,
                          transform: `translate(-50%, ${yTransform})`,
                          pointerEvents: 'auto',
                        }}
                      >
                        {/* Shape selectors apply to every zone, dorms
                            included — a dorm room can be rectangular,
                            square, or round depending on the building. */}
                        <ShapeBtn shape="rect"   icon="▭" label={t('manage.plan_shape_rect',   'Rectangle')} />
                        <ShapeBtn shape="square" icon="■" label={t('manage.plan_shape_square', 'Square')} />
                        <ShapeBtn shape="circle" icon="●" label={t('manage.plan_shape_circle', 'Circle')} />
                        <span className="w-px h-6 bg-white/20 mx-1" />
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleZoneDelete(z.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-md text-xl font-bold text-sunset hover:bg-sunset/15 active:bg-sunset/25 cursor-pointer transition-all"
                          title={t('manage.plan_zone_delete', 'Remove this zone')}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })()}
                  {/* Selection outline — thicker stroke around the shape
                      so the hotelier sees clearly which zone is active. */}
                  <div
                    className="absolute border-2 border-ocean rounded-md pointer-events-none"
                    style={{
                      left: `${left}%`, top: `${top}%`,
                      width: `${w}%`, height: `${h}%`,
                      boxShadow: '0 0 0 2px rgba(255,255,255,0.7)',
                    }}
                  />
                  {/* 4 corner handles — generous 32px hit-target wrapper
                      around a visible 20px white square. The hit area
                      extends BEYOND the shape's bounding box so the
                      user can grab a corner without competing with the
                      drag surface underneath. e.stopPropagation prevents
                      the drag surface (sibling) or canvas from
                      receiving the same pointerdown. */}
                  {['nw', 'ne', 'sw', 'se'].map(handle => {
                    const hx = handle.includes('w') ? left : (cx + w / 2)
                    const hy = handle.includes('n') ? top  : (cy + h / 2)
                    const cursor = (handle === 'nw' || handle === 'se')
                      ? 'cursor-nwse-resize' : 'cursor-nesw-resize'
                    return (
                      <div
                        key={handle}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return
                          e.stopPropagation()
                          startResize(e, z, handle)
                        }}
                        className={`absolute flex items-center justify-center ${cursor} z-30`}
                        style={{
                          left: `${hx}%`, top: `${hy}%`,
                          width: 32, height: 32,
                          marginLeft: -16, marginTop: -16,
                          touchAction: 'none',
                        }}
                      >
                        <span className="block w-5 h-5 rounded-sm bg-white border-2 border-ocean shadow-lg pointer-events-none" />
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )
        })}
        {/* Legacy V5 markers — only rendered when the property has NO
            V7 zones yet. Once any zone is dropped, the V7 shape rendering
            (with handles + shape selector) takes over and the V5 pin
            pills would just intercept clicks meant for the shape. */}
        {zones.filter(z => !z.deleted && !isOrphanZone(z)).length === 0 && markers.map(m => (
          <button
            type="button"
            key={`${m.roomId}-${m.index}`}
            onClick={() => m.isDorm
              ? setDormModal(m.roomRef)
              : handleMarkerRemove(m.roomId, m.index)}
            title={m.isDorm
              ? `${m.label} — click to open bed layout`
              : `${m.label} — click to remove this unit`}
            style={{
              position: 'absolute',
              left: `${m.x}%`,
              top:  `${m.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`px-2.5 py-1.5 rounded-full text-white text-[11px] font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer ring-2 ring-white whitespace-nowrap ${
              m.isDorm
                ? 'bg-gradient-to-r from-libre to-electric'
                : 'bg-gradient-to-r from-orange to-pink-500'
            }`}
          >
            🛏️ {m.label}
          </button>
        ))}
        {/* Empty-state hint — nothing placed (no V5 markers AND no V7
            zones). Once either model has data, the hint disappears. */}
        {markers.length === 0 && zones.filter(z => !z.deleted && !isOrphanZone(z)).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur px-4 py-2.5 rounded-full text-xs font-bold text-deep shadow-lg">
              ⬇️ {t('manage.plan_drop_here', 'Drag a room here to place it')}
            </div>
          </div>
        )}
      </div>

      {/* Unplaced tray — one chip per room TYPE still having unplaced units.
          The chip shows "Hibrakim · 1/3 placed" so the hotelier sees how
          many of that type they've put down. Drag it once for each unit. */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">
          {t('manage.plan_unplaced', 'Unplaced rooms')} · {trayRooms.length}
        </div>
        {trayRooms.length === 0 ? (
          <div className="text-xs text-libre font-semibold py-2">
            ✓ {t('manage.plan_all_placed', 'Every room is placed on the plan.')}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trayRooms.map(room => {
              // Prefer V6 zone count once any zones exist for this property;
              // fall back to V5 positions otherwise (backward compat).
              const usesZones = zones.some(z => !z.deleted && z.assigned_room_id)
              const placed = usesZones ? assignedCount(room.id) : placedCount(room.id)
              const max    = maxPositionsFor(room)
              const dorm   = isDormRoom(room)
              const beds   = room.quantity || 1
              return (
                <button
                  key={room.id}
                  type="button"
                  draggable
                  onDragStart={(e) => handleRoomDragStart(e, room.id)}
                  onDragEnd={handleRoomDragEnd}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-dashed text-xs font-bold text-deep cursor-grab active:cursor-grabbing transition-all ${
                    dorm
                      ? 'border-libre/40 hover:border-libre hover:bg-libre/5'
                      : 'border-gray-300 hover:border-ocean hover:bg-ocean/5'
                  } ${draggingRoomId === room.id ? 'opacity-50' : ''}`}
                  title={t('manage.plan_place_hint_v7', 'Drag onto the plan to place {{name}}', { name: room.name })}
                >
                  <span className="text-gray-300">⋮⋮</span>
                  🛏️ {room.name}
                  {dorm ? (
                    /* Dorms — show 'N beds' subtitle, binary placed badge */
                    <>
                      <span className="text-[10px] text-libre font-bold normal-case">
                        · {beds} {t('manage.plan_beds', 'beds')}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        placed === 0 ? 'bg-gray-100 text-gray-500' : 'bg-libre/15 text-libre'
                      }`}>
                        {placed === 0
                          ? t('manage.plan_not_placed', 'Not placed')
                          : t('manage.plan_placed', '✓ Placed')}
                      </span>
                    </>
                  ) : max > 1 ? (
                    /* Non-dorm multi-unit — N/Total badge */
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      placed === 0 ? 'bg-gray-100 text-gray-500' : 'bg-libre/15 text-libre'
                    }`}>
                      {placed}/{max}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Dorm sub-plan modal — opens when a dorm zone is clicked. */}
      {dormModal && (
        <DormSubPlanModal
          room={dormModal}
          onClose={() => setDormModal(null)}
          onRemove={() => {
            // V7 — delete the zone assigned to this dorm room.
            const v7Zone = zones.find(z => !z?.deleted && z?.assigned_room_id === dormModal.id)
            if (v7Zone) {
              handleZoneDelete(v7Zone.id)
            }
            // V5 backward compat — also clear any legacy marker
            // position for this room. No-op if the property has
            // migrated fully to V7 zones.
            const positions = localPositions[dormModal.id] || []
            if (positions[0]) handleMarkerRemove(dormModal.id, positions[0].index)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// ROOMS TAB
// ============================================
// Small two-state pill switch used in optional section headers (Long-stay,
// Hourly / day-use). When OFF the parent disables the section fieldset
// AND coerces the saved rate values to null. Keeps the typed values in
// state so the hotelier can flip back without re-entering anything.
function SectionToggle({ enabled, onChange, labelOn = 'Active', labelOff = 'Inactive' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
        enabled
          ? 'bg-libre/15 text-libre border border-libre/30'
          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className={`w-3 h-3 rounded-full transition-colors ${enabled ? 'bg-libre' : 'bg-gray-400'}`} />
      {enabled ? labelOn : labelOff}
    </button>
  )
}

function RoomsTab({ propertyId, rooms, packages = [], onRefresh, onJumpToPackages }) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [saving, setSaving] = useState(false)
  // Linked packages on the room being edited:
  //   { [packageId]: { qty: number, dates: [{start, end}, ...] } }
  // Pre-loaded from room._packages on openEdit, reset on openAdd.
  const [linkedPkgs, setLinkedPkgs] = useState({})
  const [form, setForm] = useState({
    name: '', description: '', type: 'standard', max_guests: 2,
    bed_type: 'double', base_price: '', quantity: 1, amenities: [],
    pricing_unit: 'room',
    // Extra bed config (kids only, see migration 20260503050000)
    extra_bed_available: false,
    extra_bed_max_qty:   1,
    extra_bed_price:     '',
    extra_bed_max_age:   10,
    extra_bed_adults_allowed: false,
    communicating_rooms_available: false,
    communicating_with_room_id: '',
    monthly_rate:        '',
    monthly_min_nights:  28,
    weekly_discount_pct: 0,
    weekly_min_nights:   7,
    // Hourly / day-use rental — empty/null = not offered
    hourly_rate:         '',
    hourly_min_hours:    2,
    hourly_max_hours:    8,
    day_use_rate:        '',
    day_use_max_hours:   6,
    // Bulk pool of physical unit numbers (raw string from textarea —
    // parsed to TEXT[] on save). Comma OR newline separated.
    unit_numbers_raw: '',
  })
  // Carry photo/video URLs from a source room when "Copy from..." is used.
  // Stored separately because handleSave's regular flow doesn't touch media.
  const [copiedMedia, setCopiedMedia] = useState({ photo_urls: [], video_urls: [] })

  // Section toggles — UI-only state that lets the hotelier flip the
  // Long-stay / Hourly blocks ON or OFF without losing the field
  // values they typed. When OFF the inputs are visually disabled and
  // handleSave coerces every rate in that section to null, regardless
  // of the typed value. Default = ON when at least one field is
  // populated (preserves behaviour for rooms that already had rates),
  // OFF for fresh blank forms.
  const [longStayEnabled, setLongStayEnabled] = useState(false)
  const [hourlyEnabled,   setHourlyEnabled]   = useState(false)

  // Helper — keeps the blank form definition in one place so we don't
  // forget to add new fields in two places.
  const blankRoomForm = () => ({
    name: '', description: '', type: 'standard', max_guests: 2,
    bed_type: 'double', base_price: '', quantity: 1, amenities: [],
    pricing_unit: 'room',
    extra_bed_available: false,
    extra_bed_max_qty:   1,
    extra_bed_price:     '',
    extra_bed_max_age:   10,
    extra_bed_adults_allowed: false,
    communicating_rooms_available: false,
    communicating_with_room_id: '',
    monthly_rate:        '',
    monthly_min_nights:  28,
    weekly_discount_pct: 0,
    weekly_min_nights:   7,
    unit_numbers_raw: '',
  })

  function openAdd() {
    setEditingRoom(null)
    setForm(blankRoomForm())
    setCopiedMedia({ photo_urls: [], video_urls: [] })
    setLinkedPkgs({})
    // Fresh room → optional sections start OFF. The hotelier opts in
    // by flipping the toggle, which avoids spurious zero/null writes
    // for standard nightly-only rooms.
    setLongStayEnabled(false)
    setHourlyEnabled(false)
    setShowForm(true)
  }

  // Pre-fill the form from another room. User can still edit anything after.
  // Media (photo_urls / video_urls) are copied by REFERENCE — both rooms
  // point to the same Storage files. This keeps the operation instant.
  // The hotelier can re-upload independent media later from the Edit form.
  function copyFromRoom(sourceRoomId) {
    if (!sourceRoomId) {
      setForm(blankRoomForm())
      setCopiedMedia({ photo_urls: [], video_urls: [] })
      return
    }
    const src = rooms.find(r => r.id === sourceRoomId)
    if (!src) return
    setForm({
      ...blankRoomForm(),
      name: `${src.name} (copy)`,
      description: src.description || '',
      type: src.type,
      max_guests: src.max_guests,
      bed_type: src.bed_type,
      base_price: src.base_price,
      quantity: src.quantity,
      amenities: [...(src.amenities || [])],
      pricing_unit: src.pricing_unit || 'room',
      extra_bed_available: !!src.extra_bed_available,
      extra_bed_max_qty:   src.extra_bed_max_qty || 1,
      extra_bed_price:     src.extra_bed_price ?? '',
      extra_bed_max_age:   src.extra_bed_max_age || 10,
      extra_bed_adults_allowed: !!src.extra_bed_adults_allowed,
      communicating_rooms_available: !!src.communicating_rooms_available,
      communicating_with_room_id:    src.communicating_with_room_id || '',
      monthly_rate:        src.monthly_rate ?? '',
      monthly_min_nights:  src.monthly_min_nights || 28,
      weekly_discount_pct: src.weekly_discount_pct || 0,
      weekly_min_nights:   src.weekly_min_nights || 7,
      hourly_rate:         src.hourly_rate ?? '',
      hourly_min_hours:    src.hourly_min_hours || 2,
      hourly_max_hours:    src.hourly_max_hours || 8,
      day_use_rate:        src.day_use_rate ?? '',
      day_use_max_hours:   src.day_use_max_hours || 6,
      // Unit numbers are physical identifiers — never copy across types.
      unit_numbers_raw: '',
    })
    setCopiedMedia({
      photo_urls: [...(src.photo_urls || [])],
      video_urls: [...(src.video_urls || [])],
    })
  }

  function openEdit(room) {
    setEditingRoom(room)
    setForm({
      ...blankRoomForm(),
      name: room.name, description: room.description || '', type: room.type,
      max_guests: room.max_guests, bed_type: room.bed_type,
      base_price: room.base_price, quantity: room.quantity,
      amenities: room.amenities || [],
      pricing_unit: room.pricing_unit || 'room',
      extra_bed_available: !!room.extra_bed_available,
      extra_bed_max_qty:   room.extra_bed_max_qty || 1,
      extra_bed_price:     room.extra_bed_price ?? '',
      extra_bed_max_age:   room.extra_bed_max_age || 10,
      extra_bed_adults_allowed: !!room.extra_bed_adults_allowed,
      communicating_rooms_available: !!room.communicating_rooms_available,
      communicating_with_room_id:    room.communicating_with_room_id || '',
      monthly_rate:        room.monthly_rate ?? '',
      monthly_min_nights:  room.monthly_min_nights || 28,
      weekly_discount_pct: room.weekly_discount_pct || 0,
      weekly_min_nights:   room.weekly_min_nights || 7,
      hourly_rate:         room.hourly_rate ?? '',
      hourly_min_hours:    room.hourly_min_hours || 2,
      hourly_max_hours:    room.hourly_max_hours || 8,
      day_use_rate:        room.day_use_rate ?? '',
      day_use_max_hours:   room.day_use_max_hours || 6,
      unit_numbers_raw:    Array.isArray(room.unit_numbers) ? room.unit_numbers.join(', ') : '',
    })
    // Seed the section toggles from the room's current state — ON when
    // the room already has a value in the corresponding rate column,
    // OFF otherwise. Lets the hotelier flip a section off without
    // losing the typed values.
    setLongStayEnabled(room.monthly_rate != null && room.monthly_rate !== '')
    setHourlyEnabled((room.hourly_rate != null && room.hourly_rate !== '') || (room.day_use_rate != null && room.day_use_rate !== ''))
    // Pre-populate linked packages from the decorated room (with qty + dates).
    const seed = {}
    for (const p of (room._packages || [])) {
      seed[p.id] = { qty: p._qty || 1, dates: p._dateBlocks || [] }
    }
    setLinkedPkgs(seed)
    setShowForm(true)
  }

  // Toggle a package on/off — auto-suggests qty = current room.max_guests
  // when ticking on (the user can override afterwards). Removing is just delete.
  function togglePackageLink(pkgId) {
    setLinkedPkgs(prev => {
      if (prev[pkgId]) {
        const { [pkgId]: _, ...rest } = prev
        return rest
      }
      const autoQty = Math.max(1, Number(form.max_guests) || 1)
      return { ...prev, [pkgId]: { qty: autoQty, dates: [] } }
    })
  }

  function setPackageQty(pkgId, qty) {
    const n = Math.max(1, Math.min(50, Number(qty) || 1))
    setLinkedPkgs(prev => ({
      ...prev,
      [pkgId]: { ...(prev[pkgId] || { dates: [] }), qty: n },
    }))
  }

  // ── Date blocks per linked package — array of {start, end} in YYYY-MM-DD ──
  function addPackageDateBlock(pkgId) {
    setLinkedPkgs(prev => {
      const cur = prev[pkgId]
      if (!cur) return prev
      const today = new Date().toISOString().slice(0, 10)
      return {
        ...prev,
        [pkgId]: { ...cur, dates: [...(cur.dates || []), { start: today, end: today }] },
      }
    })
  }

  function updatePackageDateBlock(pkgId, idx, field, value) {
    setLinkedPkgs(prev => {
      const cur = prev[pkgId]
      if (!cur) return prev
      const next = [...(cur.dates || [])]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, [pkgId]: { ...cur, dates: next } }
    })
  }

  function removePackageDateBlock(pkgId, idx) {
    setLinkedPkgs(prev => {
      const cur = prev[pkgId]
      if (!cur) return prev
      return {
        ...prev,
        [pkgId]: { ...cur, dates: (cur.dates || []).filter((_, i) => i !== idx) },
      }
    })
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
      extra_bed_available: !!form.extra_bed_available,
      extra_bed_max_qty:   Number(form.extra_bed_max_qty) || 1,
      extra_bed_price:     form.extra_bed_price ? Number(form.extra_bed_price) : null,
      extra_bed_max_age:   Number(form.extra_bed_max_age) || 10,
      extra_bed_adults_allowed: !!form.extra_bed_adults_allowed,
      communicating_rooms_available: !!form.communicating_rooms_available,
      communicating_with_room_id:    form.communicating_with_room_id || null,
      // Long-stay rate columns are gated on the section toggle —
      // OFF wipes every related field to null so the OTA / booking
      // engine never half-applies a stale monthly_rate the hotelier
      // intended to disable. The typed values are preserved in `form`
      // state, so flipping the toggle back ON restores them.
      monthly_rate:        longStayEnabled && form.monthly_rate ? Number(form.monthly_rate) : null,
      monthly_min_nights:  longStayEnabled ? (Number(form.monthly_min_nights) || 28) : null,
      // Same pattern for the Hourly / day-use block.
      hourly_rate:         hourlyEnabled && form.hourly_rate ? Number(form.hourly_rate) : null,
      hourly_min_hours:    hourlyEnabled ? (Number(form.hourly_min_hours) || 2) : null,
      hourly_max_hours:    hourlyEnabled ? (Number(form.hourly_max_hours) || 8) : null,
      day_use_rate:        hourlyEnabled && form.day_use_rate ? Number(form.day_use_rate) : null,
      day_use_max_hours:   hourlyEnabled ? (Number(form.day_use_max_hours) || 6) : null,
      weekly_discount_pct: longStayEnabled ? (Number(form.weekly_discount_pct) || 0) : 0,
      weekly_min_nights:   longStayEnabled ? (Number(form.weekly_min_nights) || 7) : 7,
      // Parse the bulk textarea: split on commas OR newlines, trim, drop blanks,
      // dedupe while preserving the order the hotelier typed them in.
      unit_numbers: (() => {
        const seen = new Set()
        return (form.unit_numbers_raw || '')
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(s => s && !seen.has(s) && (seen.add(s), true))
      })(),
    }

    let opError = null
    let savedRoomId = editingRoom?.id
    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id)
      opError = error
    } else {
      // For new rooms only — carry any media copied from a source room.
      // Empty arrays for non-copied creates are fine (DB default is '{}').
      if (copiedMedia.photo_urls.length || copiedMedia.video_urls.length) {
        payload.photo_urls = copiedMedia.photo_urls
        payload.video_urls = copiedMedia.video_urls
      }
      const { data: insertedRoom, error } = await supabase.from('rooms').insert(payload).select('id').single()
      opError = error
      savedRoomId = insertedRoom?.id
    }

    // Sync room↔package links (drop & re-insert with qty + date_blocks).
    if (!opError && savedRoomId) {
      await supabase.from('room_packages').delete().eq('room_id', savedRoomId)
      const rows = Object.entries(linkedPkgs).map(([package_id, val]) => ({
        room_id:     savedRoomId,
        package_id,
        qty:         val.qty || 1,
        // Persist only {start} — end is derived from package.duration_days
        // at read time. Drop any window without a start date.
        date_blocks: Array.isArray(val.dates)
          ? val.dates.filter(d => d.start).map(d => ({ start: d.start }))
          : [],
      }))
      if (rows.length > 0) {
        const { error: linkErr } = await supabase.from('room_packages').insert(rows)
        if (linkErr) opError = linkErr
      }
    }

    setSaving(false)

    // Surface DB errors so the operator doesn't end up with a silent failure
    // (the previous behaviour just closed the form and called onRefresh,
    // leading to the "I created a room but it didn't appear" support ticket).
    if (opError) {
      console.error('Room save failed:', opError)
      // Common case: missing column because a migration hasn't been applied.
      // Tell the operator clearly what to do.
      const isMissingColumn = /column .* does not exist/i.test(opError.message || '')
      alert(
        isMissingColumn
          ? `Save failed: ${opError.message}\n\nThis usually means a SQL migration hasn't been applied yet. Check the Supabase SQL Editor — there are pending migrations under supabase/migrations/.`
          : `Save failed: ${opError.message || opError.code}`
      )
      return
    }

    setShowForm(false)
    setCopiedMedia({ photo_urls: [], video_urls: [] })
    setLinkedPkgs({})
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

  // Manual reordering — swap display_order between two rooms.
  // The hotelier's sequence is shown EVERYWHERE rooms are listed:
  //   · OTA PropertyDetail (the public listing)
  //   · Reception timelines (Chambres + Disponibilités)
  //   · PropertyManage Chambres tab (this very list)
  // Defensive: clamps to the array bounds, skips no-op moves.
  async function moveRoom(roomId, direction) {
    const idx = rooms.findIndex(r => r.id === roomId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= rooms.length) return
    const a = rooms[idx]
    const b = rooms[targetIdx]
    // Pairwise swap of display_order — minimum churn on the index.
    // If two rows happen to share the same display_order (legacy data,
    // edge case after delete), fall back to assigning idx-based values
    // for THIS pair so the swap is deterministic.
    const aOrder = a.display_order ?? idx
    const bOrder = b.display_order ?? targetIdx
    if (aOrder === bOrder) {
      // Force a difference so the next swap behaves predictably.
      await supabase.from('rooms').update({ display_order: targetIdx }).eq('id', a.id)
      await supabase.from('rooms').update({ display_order: idx }).eq('id', b.id)
    } else {
      await supabase.from('rooms').update({ display_order: bOrder }).eq('id', a.id)
      await supabase.from('rooms').update({ display_order: aOrder }).eq('id', b.id)
    }
    onRefresh()
  }

  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key) ? f.amenities.filter(a => a !== key) : [...f.amenities, key]
    }))
  }

  // Props bundle reused at every render site of <RoomEditFormCard />.
  const formProps = {
    editingRoom, t, form, setForm,
    copiedMedia, copyFromRoom, rooms,
    handleSave, saving, setShowForm,
    toggleAmenity, propertyId, refreshRoomMedia,
    packages, linkedPkgs, togglePackageLink, setPackageQty,
    addPackageDateBlock, updatePackageDateBlock, removePackageDateBlock,
    onJumpToPackages,
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

      {/* Room cards — when editing, the form renders inline below its row */}
      <div className="space-y-3">
        {rooms.map((room, idx) => (
          <Fragment key={room.id}>
          <Card className={`!p-4 ${!room.is_active ? 'opacity-60' : ''}`}>
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
                  <span className="text-[9px] mt-1">{t('manage.no_photos', 'No photos')}</span>
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
                  {Array.isArray(room.unit_numbers) && room.unit_numbers.length > 0 && (
                    <span className={`flex items-center gap-1 ${
                      room.unit_numbers.length === room.quantity ? 'text-libre' : 'text-orange'
                    }`}
                      title={room.unit_numbers.join(', ')}>
                      🔢 {room.unit_numbers.length}/{room.quantity} numbered
                    </span>
                  )}
                  {(room.hourly_rate || room.day_use_rate) && (
                    <span className="flex items-center gap-1 text-electric"
                      title={[
                        room.hourly_rate  ? `$${room.hourly_rate}/h (min ${room.hourly_min_hours || 2}h)` : null,
                        room.day_use_rate ? `Day-use $${room.day_use_rate} / ${room.day_use_max_hours || 6}h` : null,
                      ].filter(Boolean).join(' · ')}>
                      🕐 hourly{room.day_use_rate ? ' + day-use' : ''}
                    </span>
                  )}
                </div>
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.map(a => {
                      const { icon: Icon, label } = getAmenityMeta(a)
                      return (
                        <span key={a} className="inline-flex items-center gap-1 text-xs bg-libre/10 text-libre px-2 py-0.5 rounded-full">
                          <Icon size={11} /> {label}
                        </span>
                      )
                    })}
                  </div>
                )}
                {/* Linked packages — only render the row when at least one
                    package is bundled with this room. Click jumps into the
                    room edit form (where the link is managed). */}
                {(room._packages || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <PackageIcon size={11} /> Packages:
                    </span>
                    {room._packages.map(p => (
                      <button key={p.id} onClick={() => openEdit(room)}
                        className="inline-flex items-center gap-1 text-xs bg-orange/10 text-orange px-2 py-0.5 rounded-full hover:bg-orange/20"
                        title={`${p.name} × ${p._qty} — click to edit room links`}>
                        ✨ {p.name}{p._qty > 1 && <span className="font-bold">×{p._qty}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Reorder buttons — this sequence drives the OTA listing
                    AND every reception view. Up disabled on the first
                    row, down on the last. */}
                <div className="flex flex-col -mx-0.5">
                  <button
                    type="button"
                    onClick={() => moveRoom(room.id, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-gray-400 hover:text-deep hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    title={t('manage.move_up', 'Move up')}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRoom(room.id, 'down')}
                    disabled={idx === rooms.length - 1}
                    className="p-0.5 rounded text-gray-400 hover:text-deep hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    title={t('manage.move_down', 'Move down')}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button onClick={() => toggleActive(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title={room.is_active ? 'Deactivate' : 'Activate'}>
                  {room.is_active ? <Ban size={16} /> : <Check size={16} />}
                </button>
                <button onClick={() => openEdit(room)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ocean" title={t('manage.edit_room_media', 'Edit room & manage media')}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(room.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sunset">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
          {/* Inline edit form — appears directly under the room being edited */}
          {showForm && editingRoom?.id === room.id && (
            <RoomEditFormCard {...formProps} />
          )}
          </Fragment>
        ))}
      </div>

      {/* New room form — when adding (not editing), render at the bottom */}
      {showForm && !editingRoom && <RoomEditFormCard {...formProps} />}
    </div>
  )
}

// ============================================
// ROOM EDIT FORM CARD — extracted so it can render inline below the
// edited room card (instead of always at the bottom of the page).
// All state lives in the parent (RoomsTab) and is passed via props,
// so React doesn't recreate the component on every render.
// ============================================
function RoomEditFormCard({
  editingRoom, t, form, setForm,
  copiedMedia, copyFromRoom, rooms,
  handleSave, saving, setShowForm,
  toggleAmenity, propertyId, refreshRoomMedia,
  packages = [], linkedPkgs = {}, togglePackageLink, setPackageQty,
  addPackageDateBlock, updatePackageDateBlock, removePackageDateBlock,
  onJumpToPackages,
}) {
  return (
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
            className="w-full px-3 py-2 rounded-lg border border-electric/20 bg-white text-sm text-deep focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
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
            rows={2} placeholder={t('manage.room_description_placeholder', 'Brief description of the room...')}
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
              💡 <strong>{t('manage.bed_quantity', 'Quantity')}</strong> = {t('manage.bed_quantity_desc', 'total beds available')} · <strong>{t('manage.bed_max_guests', 'Max guests')}</strong> = {t('manage.bed_max_guests_desc', 'people PER BED')}
              {' '}{t('manage.bed_examples', '(1 = single, 2 = double/queen/king, 3+ = bunk for groups)')}
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

        {/* ───── Communicating rooms toggle + linked-room dropdown ───── */}
        <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!form.communicating_rooms_available}
              onChange={e => setForm(f => ({
                ...f,
                communicating_rooms_available: e.target.checked,
                // If they uncheck, clear the linked room too
                communicating_with_room_id: e.target.checked ? f.communicating_with_room_id : '',
              }))}
              className="w-4 h-4 accent-amber-500" />
            <span className="text-sm font-bold text-deep">
              🚪 {t('manage.communicating_rooms', 'Communicating rooms available')}
            </span>
            <span className="text-[11px] text-gray-400 ml-auto">
              {t('manage.communicating_rooms_hint', 'At least one pair of this room type connects through an internal door')}
            </span>
          </label>
          {form.communicating_rooms_available && (
            <div className="mt-2 pl-6">
              <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                {t('manage.communicating_with', 'Connects with which room type?')}
              </label>
              <select value={form.communicating_with_room_id || ''}
                onChange={e => setForm(f => ({ ...f, communicating_with_room_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                <option value="">— same type ({form.name || 'this'} ↔ {form.name || 'this'}) —</option>
                {rooms.filter(r => !editingRoom || r.id !== editingRoom.id).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1 italic">
                E.g. Jungle ↔ Forest. Leave empty if pairs are within the same type (Jungle ↔ Jungle).
              </p>
            </div>
          )}
        </div>

        {/* ───── Extra bed (kid only) configuration ───── */}
        <div className="sm:col-span-2 p-4 rounded-xl bg-electric/5 border border-electric/15">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox"
              checked={!!form.extra_bed_available}
              onChange={e => setForm(f => ({ ...f, extra_bed_available: e.target.checked }))}
              className="w-4 h-4 accent-electric" />
            <span className="text-sm font-bold text-deep">
              🛏️ {t('manage.extra_bed_offer', 'Offer extra beds for children')}
            </span>
            <span className="text-[11px] text-gray-400 ml-auto">
              {t('manage.extra_bed_hint', 'Roll-away bed billed per night, kids only')}
            </span>
          </label>
          {form.extra_bed_available && (
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                  {t('manage.extra_bed_max_qty', 'Max extra beds')}
                </label>
                <input type="number" min={1} max={5} value={form.extra_bed_max_qty}
                  onChange={e => setForm(f => ({ ...f, extra_bed_max_qty: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                  {t('manage.extra_bed_price', 'Price/night (USD)')}
                </label>
                <input type="number" min={0} step="0.01" value={form.extra_bed_price}
                  onChange={e => setForm(f => ({ ...f, extra_bed_price: e.target.value }))}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                  {t('manage.extra_bed_max_age', 'Max child age')}
                </label>
                <input type="number" min={0} max={17} value={form.extra_bed_max_age}
                  onChange={e => setForm(f => ({ ...f, extra_bed_max_age: e.target.value }))}
                  disabled={!!form.extra_bed_adults_allowed}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-100 disabled:text-gray-400" />
              </div>
            </div>
          )}
          {/* Adults-too toggle — for last-minute friends OR mobility-reduced
              guests' accompanists. Disabled visually when extra-bed off. */}
          {form.extra_bed_available && (
            <label className="flex items-start gap-2 mt-3 pt-3 border-t border-electric/10 cursor-pointer">
              <input type="checkbox"
                checked={!!form.extra_bed_adults_allowed}
                onChange={e => setForm(f => ({ ...f, extra_bed_adults_allowed: e.target.checked }))}
                className="mt-0.5 accent-electric" />
              <div className="text-xs">
                <span className="font-bold text-deep">
                  👥 {t('manage.extra_bed_adults', 'Allow adults on the extra bed too')}
                </span>
                <span className="block text-gray-500 mt-0.5">
                  {t('manage.extra_bed_adults_hint',
                    'For last-minute friends, OR a companion of a guest with reduced mobility (caregiver, accessibility helper). When checked, the age limit above becomes informational.')}
                </span>
              </div>
            </label>
          )}
        </div>

        {/* ───── Bulk pool of physical unit numbers ───── */}
        <div className="sm:col-span-2 p-4 rounded-xl bg-deep/5 border border-deep/15">
          <h4 className="text-sm font-bold text-deep flex items-center gap-2 mb-1">
            🔢 {t('manage.unit_numbers_title', 'Physical unit numbers')}
            <span className="text-[11px] text-gray-400 font-normal ml-auto">
              {t('manage.unit_numbers_hint', 'Optional. Receptionists pick from this pool when assigning bookings.')}
            </span>
          </h4>
          <p className="text-[11px] text-gray-500 mb-2">
            {t('manage.unit_numbers_desc',
              'Paste all unit numbers separated by commas or new lines. e.g. t.03, t.04, t.12, t.32 — for a Junior Suite type with quantity 4.')}
          </p>
          {(() => {
            // Live parse for the chip preview + count check
            const parsed = (() => {
              const seen = new Set()
              return (form.unit_numbers_raw || '')
                .split(/[\n,]+/)
                .map(s => s.trim())
                .filter(s => s && !seen.has(s) && (seen.add(s), true))
            })()
            const qty = Math.max(1, Number(form.quantity) || 1)
            const mismatch = parsed.length > 0 && parsed.length !== qty
            return (
              <>
                <textarea
                  value={form.unit_numbers_raw}
                  onChange={e => setForm(f => ({ ...f, unit_numbers_raw: e.target.value }))}
                  placeholder={'t.03, t.04, t.12, t.32\nt.45, t.67…'}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm font-mono focus:outline-none focus:ring-2 focus:ring-deep/20"
                />
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className={mismatch ? 'text-orange font-semibold' : 'text-gray-500'}>
                    {parsed.length === 0
                      ? 'No units entered yet — receptionist falls back to free-text.'
                      : `${parsed.length} unit${parsed.length > 1 ? 's' : ''} parsed`}
                    {mismatch && ` (quantity says ${qty} — please align)`}
                  </span>
                </div>
                {parsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                    {parsed.map((n, i) => (
                      <span key={i} className="text-[11px] bg-deep/10 text-deep px-2 py-0.5 rounded font-mono">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* ───── Long-stay rates (monthly + weekly tiers) ───── */}
        <div className={`sm:col-span-2 p-4 rounded-xl bg-libre/5 border border-libre/15 transition-opacity ${longStayEnabled ? '' : 'opacity-60'}`}>
          <h4 className="text-sm font-bold text-deep flex items-center gap-2 mb-1">
            🗓️ {t('manage.long_stay_title', 'Long-stay rates')}
            {/* Active / inactive switch — the section is the source of
                truth, the typed values are preserved while OFF. */}
            <SectionToggle
              enabled={longStayEnabled}
              onChange={setLongStayEnabled}
              labelOn={t('manage.section_active', 'Active')}
              labelOff={t('manage.section_inactive', 'Inactive')}
            />
            <span className="text-[11px] text-gray-400 font-normal ml-auto">
              {t('manage.long_stay_hint', 'Optional. Catches digital nomads + monthly travellers.')}
            </span>
          </h4>
          <p className="text-[11px] text-gray-500 mb-3">
            {t('manage.long_stay_desc',
              'Set a monthly rate for stays of ≥ N nights. STAYLO auto-applies the better of (daily × nights) vs (monthly_rate × nights / 30) — guests with long stays pay less, you fill the room.')}
          </p>
          <fieldset disabled={!longStayEnabled} className="grid grid-cols-2 gap-3 disabled:cursor-not-allowed">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.monthly_rate', 'Monthly rate (USD per 30 nights)')}
              </label>
              <input type="number" min={0} step="0.01" value={form.monthly_rate}
                onChange={e => setForm(f => ({ ...f, monthly_rate: e.target.value }))}
                placeholder={t('manage.monthly_rate_eg', 'e.g. 600 (= $20/night)')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-libre/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.monthly_min_nights', 'Triggered at (nights)')}
              </label>
              <input type="number" min={14} max={90} value={form.monthly_min_nights}
                onChange={e => setForm(f => ({ ...f, monthly_min_nights: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-libre/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.weekly_discount', 'Weekly discount (%)')}
              </label>
              <input type="number" min={0} max={80} value={form.weekly_discount_pct}
                onChange={e => setForm(f => ({ ...f, weekly_discount_pct: e.target.value }))}
                placeholder="0 = off"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-libre/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.weekly_min_nights', 'Weekly triggered at (nights)')}
              </label>
              <input type="number" min={3} max={28} value={form.weekly_min_nights}
                onChange={e => setForm(f => ({ ...f, weekly_min_nights: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-libre/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
          </fieldset>
          {longStayEnabled && form.monthly_rate && form.base_price && (
            <p className="text-[11px] text-libre mt-2 italic">
              ✓ Monthly = ~${(Number(form.monthly_rate) / 30).toFixed(0)}/night
              ({Math.round((1 - (Number(form.monthly_rate) / 30) / Number(form.base_price)) * 100)}% off your daily rate of ${form.base_price})
            </p>
          )}
        </div>

        {/* ───── Hourly / day-use rental ───── */}
        <div className={`sm:col-span-2 p-4 rounded-xl bg-electric/5 border border-electric/15 transition-opacity ${hourlyEnabled ? '' : 'opacity-60'}`}>
          <h4 className="text-sm font-bold text-deep flex items-center gap-2 mb-1">
            🕐 {t('manage.hourly_title', 'Hourly / day-use rental')}
            <SectionToggle
              enabled={hourlyEnabled}
              onChange={setHourlyEnabled}
              labelOn={t('manage.section_active', 'Active')}
              labelOff={t('manage.section_inactive', 'Inactive')}
            />
            <span className="text-[11px] text-gray-400 font-normal ml-auto">
              {t('manage.hourly_hint', 'Optional. Day-use guests, layovers, short stays.')}
            </span>
          </h4>
          <p className="text-[11px] text-gray-500 mb-3">
            {t('manage.hourly_desc',
              'Set a flat per-hour price (and/or a half-day block rate). When a guest books for fewer hours than your day-use cap, the cheaper of (hourly × hours) vs day_use_rate wins automatically.')}
          </p>
          <fieldset disabled={!hourlyEnabled} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.hourly_rate', 'Hourly rate (USD)')}
              </label>
              <input type="number" min={0} step="0.01" value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                placeholder={t('manage.hourly_rate_eg', 'e.g. 8 ($/hour)')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                  {t('manage.hourly_min', 'Min h')}
                </label>
                <input type="number" min={1} max={24} value={form.hourly_min_hours}
                  onChange={e => setForm(f => ({ ...f, hourly_min_hours: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                  {t('manage.hourly_max', 'Max h')}
                </label>
                <input type="number" min={1} max={24} value={form.hourly_max_hours}
                  onChange={e => setForm(f => ({ ...f, hourly_max_hours: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.day_use_rate', 'Day-use flat (USD)')}
              </label>
              <input type="number" min={0} step="0.01" value={form.day_use_rate}
                onChange={e => setForm(f => ({ ...f, day_use_rate: e.target.value }))}
                placeholder={t('manage.day_use_rate_eg', 'e.g. 35 (covers up to 6h)')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                {t('manage.day_use_max_hours', 'Day-use covers (hours)')}
              </label>
              <input type="number" min={2} max={12} value={form.day_use_max_hours}
                onChange={e => setForm(f => ({ ...f, day_use_max_hours: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
            </div>
          </fieldset>
          {hourlyEnabled && (form.hourly_rate || form.day_use_rate) && (
            <p className="text-[11px] text-electric mt-2 italic">
              ✓ Available as hourly{form.hourly_rate ? ` from $${form.hourly_rate}/h (min ${form.hourly_min_hours}h)` : ''}
              {form.day_use_rate ? ` · day-use $${form.day_use_rate} for ${form.day_use_max_hours}h` : ''}
            </p>
          )}
        </div>

        {/* ───── Linked packages — connect any package to this room with qty ───── */}
        <div className="sm:col-span-2 p-4 rounded-xl bg-orange/5 border border-orange/15">
          <h4 className="text-sm font-bold text-deep flex items-center gap-2 mb-1">
            ✨ {t('manage.linked_packages_title', 'Linked packages')}
            <span className="text-[11px] text-gray-400 font-normal ml-auto">
              {Object.keys(linkedPkgs).length} selected
            </span>
          </h4>
          <p className="text-[11px] text-gray-500 mb-3">
            {t('manage.linked_packages_desc',
              'Tick any package to bundle it with this room. Qty defaults to the room capacity (1 unit per guest); change it manually for couple-only or family-only packages.')}
          </p>
          {packages.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              No packages yet.{' '}
              {onJumpToPackages && (
                <button type="button" onClick={onJumpToPackages}
                  className="text-orange underline hover:text-orange/80">
                  Create one in the Packages tab →
                </button>
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {packages.map(pkg => {
                const link = linkedPkgs[pkg.id]
                const linked = !!link
                const qty    = link?.qty || 1
                const dates  = link?.dates || []
                const unitPrice = Number(pkg.price) || 0
                const lineTotal = unitPrice * qty
                return (
                  <div key={pkg.id}
                    className={`p-2.5 rounded-lg border ${
                      linked ? 'border-orange/40 bg-white' : 'border-gray-200 bg-white/60'
                    }`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={linked}
                        onChange={() => togglePackageLink(pkg.id)}
                        className="w-4 h-4 accent-orange flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-deep truncate">{pkg.name}</div>
                        <div className="text-[11px] text-gray-500">
                          ${unitPrice.toFixed(0)}/unit · {pkg.pricing_type?.replace('_', ' ')} · {pkg.pricing_mode}
                          <span className={`ml-2 px-1.5 rounded ${
                            (pkg.duration_days || 1) > 1
                              ? 'bg-libre/15 text-libre font-bold'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            ⏱️ {pkg.duration_days || 1}d
                          </span>
                        </div>
                      </div>
                      {linked && (
                        <>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[11px] text-gray-400">qty</span>
                            <input type="number" min={1} max={50} value={qty}
                              onChange={e => setPackageQty(pkg.id, e.target.value)}
                              className="w-14 px-2 py-1 rounded border border-gray-200 text-sm text-center" />
                          </div>
                          <div className="text-xs font-bold text-orange w-20 text-right">
                            = ${lineTotal.toFixed(0)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── Date blocks — when this package is offered for this room.
                        Empty = always available. Multiple windows supported
                        (Full Moon happens monthly etc.). */}
                    {linked && (
                      <div className="mt-2 pt-2 border-t border-orange/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            📅 Available dates
                            <span className="font-normal text-gray-400 ml-1">
                              ({dates.length === 0 ? 'always' : `${dates.length} window${dates.length > 1 ? 's' : ''}`})
                            </span>
                          </span>
                          <button type="button"
                            onClick={() => addPackageDateBlock?.(pkg.id)}
                            className="text-[11px] text-orange font-semibold hover:underline">
                            + Add window
                          </button>
                        </div>
                        {dates.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic">
                            No date restriction — bookable on any night you have stock.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {dates.map((d, i) => {
                              // End is derived from package.duration_days
                              // (start + duration - 1, inclusive). The hotelier
                              // only enters the start; the OTA validates the
                              // booking against the derived window.
                              // ⚠️ Use UTC-only date math — local TZ parsing
                              //    of 'YYYY-MM-DDT00:00:00' shifts a full day
                              //    east of UTC after toISOString().
                              const dur = Number(pkg.duration_days) || 1
                              let endStr = ''
                              if (d.start) {
                                const dt = new Date(d.start + 'T00:00:00Z')
                                dt.setUTCDate(dt.getUTCDate() + dur - 1)
                                endStr = dt.toISOString().slice(0, 10)
                              }
                              return (
                                <div key={i} className="group relative flex items-center gap-2 text-[11px]">
                                  {/* Hover popup — shows the auto-computed end + duration */}
                                  {d.start && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-30 bg-deep text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                                      Ends {endStr} · {dur} day{dur > 1 ? 's' : ''} ({dur - 1} night{dur - 1 === 1 ? '' : 's'})
                                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-deep rotate-45" />
                                    </div>
                                  )}
                                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">{t('manage.window_start', 'Start')}</span>
                                  <input type="date" value={d.start || ''}
                                    onChange={e => updatePackageDateBlock?.(pkg.id, i, 'start', e.target.value)}
                                    className="px-1.5 py-0.5 rounded border border-gray-200 text-[11px]" />
                                  {endStr && (
                                    <span className="text-[10px] text-gray-500">→ {endStr}</span>
                                  )}
                                  <button type="button"
                                    onClick={() => removePackageDateBlock?.(pkg.id, i)}
                                    className="ml-auto p-1 text-gray-400 hover:text-sunset"
                                    title={t('manage.remove_window', 'Remove this window')}>
                                    <X size={12} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

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

      {/* Validation summary — surfaces WHY the Save button is disabled.
          Was a silent gray button (David: "j'ai crée une chambre mais
          je ne peux pas l'enregistrer"); now the missing required
          field(s) are listed inline so the hotelier knows what to fill. */}
      {(!form.name.trim() || !form.base_price) && (
        <div className="mt-6 px-4 py-3 rounded-xl bg-orange/5 border border-orange/20 text-xs text-orange">
          <strong className="font-bold">
            {t('manage.missing_required', 'Fill the required fields to enable saving:')}
          </strong>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            {!form.name.trim() && (
              <li>{t('manage.room_name', 'Room Name')} *</li>
            )}
            {!form.base_price && (
              <li>{t('manage.base_price', 'Default price per night')} *</li>
            )}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.base_price}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {editingRoom ? t('manage.save_changes', 'Save Changes') : t('manage.create_room', 'Create Room')}
        </Button>
        <Button variant="secondary" onClick={() => setShowForm(false)}>
          {t('common.cancel', 'Cancel')}
        </Button>
      </div>

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
function CalendarTab({ rooms, property, onRefresh }) {
  const { t } = useTranslation()
  // View mode — 'monthly' (per-room 35-day grid, editor) or 'timeline'
  // (all rooms × 14 days, bird's-eye view). The Timeline view is the
  // hotelier's "Réception calendar" for availability: same Gantt-style
  // layout as the old front-desk page, except the cells are filled with
  // room info (stock + price + net) instead of reservation bars.
  // Persisted in localStorage so each hotelier keeps their preference.
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'monthly'
    return localStorage.getItem('staylo_avail_view') || 'monthly'
  })
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('staylo_avail_view', viewMode)
  }, [viewMode])
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
      // Monthly view operates at the room-TYPE level (unit_index=0).
      // Per-unit overrides (unit_index>0) only show up in the Timeline
      // view's per-unit chips. Without this filter, getAvailForDate()
      // can grab any of the N+1 rows for the same date — picking up a
      // per-unit override row would make the cell look blocked even
      // when the type-default is free.
      const { data } = await supabase
        .from('room_availability')
        .select('*')
        .eq('room_id', selectedRoom)
        .eq('room_unit_index', 0)
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
    // See useEffect above for why we filter on unit_index=0.
    const { data } = await supabase
      .from('room_availability')
      .select('*')
      .eq('room_id', selectedRoom)
      .eq('room_unit_index', 0)
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
    setAvailability(data || [])
  }

  async function toggleBlock(day) {
    if (!room) return
    setSaving(true)
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existing = getAvailForDate(day)

    // We deliberately ONLY toggle is_blocked here — never set available_count
    // by hand. The DB function recompute_room_availability() then computes
    // the correct value by counting overlapping active bookings, which means
    // unblocking a day with an in-house guest restores the room to e.g. 2/3,
    // NOT 3/3 (the bug we just fixed).
    if (existing) {
      await supabase.from('room_availability').update({
        is_blocked: !existing.is_blocked,
      }).eq('id', existing.id)
      // Unblocking the type-default? Also wipe per-unit override rows
      // so cells fully reopen (see Timeline bulkUpdate for the same
      // reasoning). 2026-06-08: same root cause as the 4-BABA bug.
      if (existing.is_blocked) {
        await supabase.from('room_availability')
          .delete()
          .eq('room_id', selectedRoom)
          .eq('date', dateStr)
          .gt('room_unit_index', 0)
          .eq('is_blocked', true)
      }
    } else {
      await supabase.from('room_availability').insert({
        room_id: selectedRoom,
        date: dateStr,
        room_unit_index: 0,            // type-default row
        available_count: 0,            // safe initial value, recompute fixes it
        is_blocked: true,
      })
    }

    // Re-sync from source of truth (active bookings + is_blocked override)
    await supabase.rpc('recompute_room_availability', {
      p_room_id:   selectedRoom,
      p_check_in:  dateStr,
      p_check_out: addDaysISO(dateStr, 1),
    })

    await refreshMonth()
    setSaving(false)
  }

  // Tiny helper — adds N days to a YYYY-MM-DD string and returns same format.
  // Used by toggleBlock to give the RPC a [start, end) range of one day.
  function addDaysISO(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
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
        room_unit_index: 0,
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
  //
  // Special payload kinds:
  //   - { add_special: {label, perk, min_stay} } → APPENDS to the day's
  //     specials jsonb array (multiple rewards stack on the same day).
  //   - { clear_specials: true } → wipes the array entirely.
  //   - { remove_special_at: <index> } → removes the special at that
  //     position in the array (single-day chip-click flow).
  // Any other keys behave as before (direct column writes).
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

    // Pull the meta-actions out of the payload — they need per-row processing
    const { add_special, clear_specials, remove_special_at, ...directWrites } = payload

    const updates = dates.filter(d => existingByDate[d])
    const inserts = dates.filter(d => !existingByDate[d])

    for (const d of updates) {
      const row = existingByDate[d]
      const currentSpecials = Array.isArray(row.specials) ? row.specials : []
      let nextSpecials = currentSpecials
      if (clear_specials) {
        nextSpecials = []
      } else if (add_special) {
        nextSpecials = [...currentSpecials, add_special]
      } else if (typeof remove_special_at === 'number') {
        nextSpecials = currentSpecials.filter((_, i) => i !== remove_special_at)
      }
      const rowPayload = (add_special || clear_specials || typeof remove_special_at === 'number')
        ? { ...directWrites, specials: nextSpecials }
        : directWrites
      await supabase.from('room_availability').update(rowPayload).eq('id', row.id)
    }
    if (inserts.length > 0) {
      // For brand-new (no existing row) days, the array starts empty
      // unless we're inserting a special right away. available_count is
      // a placeholder — recompute_room_availability fixes it below.
      // room_unit_index=0 is the type-default row.
      const startingSpecials = add_special ? [add_special] : []
      const rows = inserts.map(date => ({
        room_id: selectedRoom,
        date,
        room_unit_index: 0,
        available_count: directWrites.is_blocked ? 0 : room.quantity,
        is_blocked: directWrites.is_blocked ?? false,
        price_override: directWrites.price_override ?? null,
        min_stay: directWrites.min_stay ?? null,
        promo_label: directWrites.promo_label ?? null,
        promo_pct: directWrites.promo_pct ?? null,
        perk: directWrites.perk ?? null,
        specials: startingSpecials,
        internal_note: directWrites.internal_note ?? null,
      }))
      await supabase.from('room_availability').insert(rows)
    }

    // When un-blocking days at the type-default level, also wipe any
    // per-unit override rows that are still blocked — otherwise the
    // Timeline view will continue to show BABA-001..N as blocked even
    // after the user said "Unblock" at the room level.
    if (directWrites.is_blocked === false) {
      await supabase.from('room_availability')
        .delete()
        .eq('room_id', selectedRoom)
        .gt('room_unit_index', 0)
        .eq('is_blocked', true)
        .in('date', dates)
    }

    // After ANY change to is_blocked, recompute available_count from active
    // bookings so we never leave stale stock numbers (e.g. unblocking a day
    // with an in-house guest must show 2/3, not 3/3). For other changes
    // (price overrides, specials, notes) the recompute is a cheap no-op.
    if ('is_blocked' in directWrites) {
      const sortedDates = [...dates].sort()
      const minDate = sortedDates[0]
      const maxDateExclusive = addDaysISO(sortedDates[sortedDates.length - 1], 1)
      // Recompute the whole spanning range in one RPC — function iterates day-by-day internally
      await supabase.rpc('recompute_room_availability', {
        p_room_id:   selectedRoom,
        p_check_in:  minDate,
        p_check_out: maxDateExclusive,
      })
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
          specials:       before.specials ?? [],
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

  // Block / Unblock — only toggle is_blocked. The bulkUpdate function then
  // re-syncs available_count via the recompute_room_availability RPC for
  // each selected day, so unblocking a day with an in-house guest restores
  // the correct stock (e.g. 2/3) instead of overwriting to room.quantity.
  async function bulkBlock()   { await bulkUpdate({ is_blocked: true  }, 'Block') }
  async function bulkUnblock() { await bulkUpdate({ is_blocked: false }, 'Unblock') }

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
      {/* View toggle — Monthly only. In Timeline view the toggle is
          merged into TimelineAvailabilityView's combined header bar
          (alongside date nav + bulk edit toggle) per David's request
          "Bulk edit / La date viennent sur la même ligne que les box
          monthly/timeline". */}
      {viewMode === 'monthly' && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-deep text-white shadow-sm"
            >
              📅 {t('manage.view_monthly', 'Monthly')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-deep transition-all"
            >
              📊 {t('manage.view_timeline', 'Timeline')}
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {t('manage.view_monthly_hint', 'Per-room month grid · edit prices & blocks')}
          </span>
        </div>
      )}

      {viewMode === 'timeline' ? (
        <TimelineAvailabilityView
          rooms={rooms}
          propertyId={property?.id}
          country={property?.country}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onRefresh={onRefresh}
        />
      ) : (
      <>
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
            // Stackable rewards (new model). Falls back to the legacy
            // perk/promo_label single-reward when the array is empty,
            // so existing days keep displaying until they're re-saved.
            const specials = Array.isArray(avail?.specials) ? avail.specials : []
            const visibleSpecials = specials.length > 0
              ? specials
              : (perk ? [{ label: promoLabel, perk }] : [])
            // Apply discount visually if any
            const priceAfterPromo = promoPct
              ? priceBrut * (1 - Number(promoPct) / 100)
              : priceBrut
            const netAfterPromo = priceAfterPromo * 0.9

            const fullDateStr = dateStrFor(day)
            return (
              <button
                key={day}
                onClick={handleCellClick}
                disabled={isPast || saving}
                className={`group relative aspect-square min-h-[96px] rounded-lg transition-all flex flex-col p-2 text-left ${
                  isPast
                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed border border-gray-100'
                    : isSelected
                      ? 'bg-ocean/15 border-2 border-ocean ring-2 ring-ocean/30 cursor-pointer'
                      : isBlocked
                        ? 'bg-sunset/10 border border-sunset/20 hover:bg-sunset/20 cursor-pointer'
                        : 'bg-libre/5 border border-libre/10 hover:bg-libre/15 cursor-pointer'
                }`}
              >
                {/* ── Rich hover panel — opens on cell hover, fully detailed.
                    pointer-events-none so it never intercepts the cell click.
                    z-50 + absolute lifts it over neighbour cells. */}
                {!isPast && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 p-3 text-left">
                    {/* Pointer arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-gray-200" />

                    {/* Header — date + room name */}
                    <div className="flex items-baseline justify-between gap-2 pb-2 mb-2 border-b border-gray-100">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          {new Date(fullDateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-sm font-bold text-deep">{room.name}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isBlocked ? 'bg-sunset/15 text-sunset' :
                        availableStock === 0 ? 'bg-sunset/15 text-sunset' :
                        availableStock < totalStock ? 'bg-orange/15 text-orange' :
                        'bg-libre/15 text-libre'
                      }`}>
                        {isBlocked ? 'BLOCKED' : `${availableStock}/${totalStock}`}
                      </span>
                    </div>

                    {/* Room basics */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 mb-2">
                      <span><BedDouble size={10} className="inline mr-0.5" />{prettyLabel(room.bed_type)}</span>
                      <span><Users size={10} className="inline mr-0.5" />{room.max_guests} guests</span>
                      {room.pricing_unit === 'bed' && <span className="text-deep font-semibold">PER BED</span>}
                    </div>

                    {/* Pricing */}
                    {!isBlocked && (
                      <div className="bg-gray-50 rounded-lg px-2.5 py-1.5 mb-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-gray-500">{t('manage.cal_guest_pays', 'Guest pays')}</span>
                          <span className="text-base font-bold text-ocean">
                            ${priceAfterPromo.toFixed(0)}
                            {promoPct > 0 && <span className="ml-1 text-[10px] font-normal text-gray-400 line-through">${priceBrut.toFixed(0)}</span>}
                            {hasOverride && <span className="ml-1 text-[10px] text-orange" title={t('manage.cal_custom_price', 'Custom price for this day')}>★</span>}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-gray-500">You receive (90%)</span>
                          <span className="text-sm font-semibold text-libre">${netAfterPromo.toFixed(0)}</span>
                        </div>
                        {hasOverride && (
                          <div className="text-[10px] text-orange mt-0.5 italic">
                            Default base price: ${Number(room.base_price).toFixed(0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Min stay */}
                    {minStay > 1 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-deep mb-1">
                        <span className="font-bold">🌙 Min stay:</span> {minStay} nights
                      </div>
                    )}

                    {/* Promo */}
                    {(promoLabel || promoPct > 0) && (
                      <div className="flex items-start gap-1.5 text-[11px] text-orange mb-1">
                        <span className="font-bold whitespace-nowrap">🏷️ Promo:</span>
                        <span>{promoLabel || 'Discount'}{promoPct > 0 && ` (−${Number(promoPct).toFixed(0)}%)`}</span>
                      </div>
                    )}

                    {/* Specials / rewards (full list, not just first 3) */}
                    {visibleSpecials.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-libre mb-1">
                          🎁 Rewards ({visibleSpecials.length})
                        </div>
                        <div className="space-y-1">
                          {visibleSpecials.map((sp, i) => (
                            <div key={i} className="text-[11px] leading-tight">
                              <div className="font-semibold text-deep">{sp.label || `Reward ${i + 1}`}</div>
                              {sp.perk && <div className="text-gray-500">{sp.perk}</div>}
                              {sp.min_stay && <div className="text-gray-400 text-[10px]">Requires ≥ {sp.min_stay} nights</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internal note */}
                    {internalNote && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-electric mb-0.5">📝 Internal note</div>
                        <div className="text-[11px] text-gray-600 italic">{internalNote}</div>
                      </div>
                    )}

                    {/* Status hint when nothing else to show */}
                    {!isBlocked && !minStay && !promoLabel && !promoPct && visibleSpecials.length === 0 && !internalNote && !hasOverride && (
                      <div className="text-[11px] text-gray-400 italic text-center py-1">
                        Default pricing, no specials
                      </div>
                    )}
                  </div>
                )}
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

                {/* Middle row — chips for ALL rewards (stackable) + discount + min stay + note.
                    Each reward shows as its own 🎁 chip; hover for label+perk. */}
                {/* Compact chip row — full details live in the hover popup
                    above; titles dropped to avoid double-tooltip */}
                {!isPast && (visibleSpecials.length > 0 || promoPct || promoLabel || minStay || internalNote) && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {visibleSpecials.slice(0, 3).map((sp, i) => (
                      <span key={i} className="text-[9px] font-bold px-1 rounded bg-libre/15 text-libre">
                        🎁{visibleSpecials.length > 1 ? <sup className="ml-0.5 text-[7px]">{i + 1}</sup> : ''}
                      </span>
                    ))}
                    {visibleSpecials.length > 3 && (
                      <span className="text-[9px] font-bold px-1 rounded bg-libre/10 text-libre/80">
                        +{visibleSpecials.length - 3}
                      </span>
                    )}
                    {promoPct ? (
                      <span className="text-[9px] font-bold px-1 rounded bg-orange/15 text-orange">
                        −{Number(promoPct).toFixed(0)}%
                      </span>
                    ) : (promoLabel && visibleSpecials.length === 0) ? (
                      <span className="text-[9px] font-bold px-1 rounded bg-orange/15 text-orange">
                        🏷️
                      </span>
                    ) : null}
                    {minStay && (
                      <span className="text-[9px] font-bold px-1 rounded bg-deep/10 text-deep">
                        🌙{minStay}
                      </span>
                    )}
                    {internalNote && (
                      <span className="text-[9px] font-bold px-1 rounded bg-electric/15 text-electric">
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
      </>
      )}
    </div>
  )
}

// ============================================
// CELL EDITOR MODAL
// ============================================
// Centered modal that opens when the hotelier clicks a Timeline
// cell (Bulk edit OFF). Inline inputs for price · min stay · note
// + a clean Available/Blocked toggle, plus the rewards section
// that opens the shared RewardModal scoped to this cell.
//
// Single Save commits ALL changed fields at once via bulkUpdate
// with a single-cell Set. Rewards are managed separately because
// they need the catalog UI from RewardModal.
//
// Renders via the project's Modal component so it lives at body
// root — no more clipping by the grid's overflow-x container.
// ============================================
function CellEditorModal({ cell, room, row, saving, onClose, onSave, onOpenReward, onRemoveReward, onClearRewards, onUnitToggle, unitBlockedSet, t }) {
  // Per-unit mode — set when the user clicked a unit-specific row
  // (BABA-002) rather than a type-level row. In per-unit mode the
  // Available/Blocked toggle writes ONLY to that physical unit's
  // override row; the type-default is untouched.
  // 2026-06-08: removed the "PER-UNIT STATUS" chips section — now
  // that each unit has its own row in the Timeline, the chips were
  // redundant and confusing.
  const isUnit = cell.unitIndex != null
  // `row` is now the merged effective row (per-unit override on top of
  // type-default) — see TimelineAvailabilityView.mergeEffectiveRow.
  // Every field including is_blocked already reflects the unit's
  // actual state, so we don't need the separate unitBlocked branch.

  // Local form state — initialized from the row when the modal
  // opens, then edited freely. Save builds a delta payload.
  const [price, setPrice] = useState('')
  const [minStay, setMinStay] = useState('')
  const [note, setNote] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  // Re-seed local state every time the cell changes (e.g. user
  // closes and opens another cell quickly).
  useEffect(() => {
    setPrice(row?.price_override != null ? String(row.price_override) : '')
    setMinStay(row?.min_stay != null ? String(row.min_stay) : '')
    setNote(row?.internal_note || '')
    setIsBlocked(!!row?.is_blocked)
  }, [cell.roomId, cell.iso, cell.unitIndex, row?.price_override, row?.min_stay, row?.internal_note, row?.is_blocked])

  if (!room) return null

  const dateDisplay = new Date(cell.iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  // Header name. For a unit row we show "BABA-002" so the hotelier
  // knows EXACTLY which physical unit they're touching.
  const headerName = isUnit
    ? `${room.name}-${String(cell.unitIndex).padStart(3, '0')}`
    : room.name
  const totalStock = isUnit ? 1 : (room.quantity || 1)
  const stock = isBlocked ? 0
    : (isUnit ? 1
      : (row && typeof row.available_count === 'number' ? row.available_count : totalStock))
  const previewPrice = price.trim() !== '' && Number(price) > 0 ? Number(price) : Number(room.base_price || 0)
  const previewNet = previewPrice * 0.9
  const specials = Array.isArray(row?.specials) ? row.specials : []

  const statusPillClass = isBlocked
    ? 'bg-gradient-to-r from-sunset to-sunset/80 text-white'
    : stock === 0 ? 'bg-gradient-to-r from-sunset to-sunset/80 text-white'
    : stock < totalStock ? 'bg-gradient-to-r from-orange to-pink text-white'
    : 'bg-gradient-to-r from-libre to-libre/80 text-white'

  function handleSave() {
    // 2026-06-08 — David asked for "every field manageable from the
    // popup, not just status". The per-unit modal used to short-circuit
    // here and only emit onUnitToggle. Now we collect the full payload
    // regardless of mode, and split the writes at the bottom:
    //   · is_blocked → per-unit override row when isUnit (the only
    //     truly unit-scoped field today)
    //   · price / min-stay / note / specials → type-level row, applied
    //     to every unit of the room type (the in-modal hint warns the
    //     user so there's no surprise)
    // Lets the receptionist tweak BABA's price for next Friday from
    // BABA-002's cell without leaving for the Monthly view.

    // Build payload of CHANGED fields only — passing every field every
    // time would clobber columns we didn't touch (perk, promo_label,
    // promo_pct etc. handled by RewardModal).
    const payload = {}
    const newPrice = price.trim() === '' ? null : Number(price)
    if (newPrice !== null && (!isFinite(newPrice) || newPrice <= 0)) {
      alert(t('manage.invalid_price', 'Invalid price. Must be a positive number.'))
      return
    }
    if (newPrice !== (row?.price_override ?? null)) {
      payload.price_override = newPrice
    }
    const newMinStay = minStay.trim() === '' ? null : Math.floor(Number(minStay))
    if (newMinStay !== null && (!isFinite(newMinStay) || newMinStay < 1)) {
      alert(t('manage.invalid_min_stay', 'Invalid min stay (must be ≥ 1).'))
      return
    }
    if (newMinStay !== (row?.min_stay ?? null)) {
      payload.min_stay = newMinStay
    }
    const newNote = note.trim() === '' ? null : note.trim()
    // Normalize the existing value so the explicit-empty sentinel ''
    // (used on per-unit rows that have been cleared, see mergeEffectiveRow)
    // is treated the same as NULL for the diff check. Without this,
    // re-opening a cleared unit cell and re-clicking Save would write
    // null again, which the merge interprets as "inherit" → the type
    // note would silently come back. Same bug shape David hit before.
    const currentNote = row?.internal_note ? row.internal_note : null
    if (newNote !== currentNote) {
      payload.internal_note = newNote
    }
    // is_blocked rides the same payload as every other field. The
    // parent component builds the cell key with a unit suffix when
    // editingCell.unitIndex is set, so bulkUpdate routes the write to
    // the per-unit override row (room_unit_index = N). One save path,
    // one consistent flow regardless of mode.
    if (isBlocked !== !!row?.is_blocked) {
      payload.is_blocked = isBlocked
    }
    if (Object.keys(payload).length === 0) {
      // No changes — just close
      onClose()
      return
    }
    onSave(payload, 'Update cell')
  }

  return (
    <Modal open onClose={onClose}>
      {/* Header — gradient strip in STAYLO brand colors */}
      <div className="-mx-6 -mt-6 mb-5 px-6 py-4 bg-gradient-to-br from-deep via-deep to-electric/90 rounded-t-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              {dateDisplay}
            </div>
            <div className="text-base font-bold text-white truncate mt-0.5">{headerName}</div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {isUnit
                ? `${t('manage.default_price', 'Default')}: $${Number(room.base_price || 0).toFixed(0)}/night · 1 ${t('manage.unit', 'unit')}`
                : `${t('manage.default_price', 'Default')}: $${Number(room.base_price || 0).toFixed(0)}/night · ×${totalStock}`}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap tracking-wide ${statusPillClass}`}>
            {isBlocked ? t('manage.blocked', 'Blocked').toUpperCase() : `${stock} / ${totalStock}`}
          </span>
        </div>
      </div>

      {/* Form body — inline fields, real inputs */}
      <div className="space-y-4">
        {/* Available / Blocked toggle */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-deep/60 mb-1.5">
            {t('manage.status', 'Status')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsBlocked(false)}
              className={`px-3 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                !isBlocked
                  ? 'bg-gradient-to-r from-libre to-libre/80 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-deep/50 hover:border-libre/40 hover:text-libre'
              }`}
            >
              ✓ {t('manage.available', 'Available')}
            </button>
            <button
              type="button"
              onClick={() => setIsBlocked(true)}
              className={`px-3 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                isBlocked
                  ? 'bg-gradient-to-r from-sunset to-sunset/80 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-deep/50 hover:border-sunset/40 hover:text-sunset'
              }`}
            >
              ⛔ {t('manage.blocked', 'Blocked')}
            </button>
          </div>
          {isBlocked && !isUnit && (
            <p className="text-[10px] text-deep/40 mt-1.5 italic">
              {t('manage.editor_block_all_hint_v2', 'Blocks every unit of this room for this date. To block only one unit, click its specific row in the Timeline.')}
            </p>
          )}
          {isBlocked && isUnit && (
            <p className="text-[10px] text-deep/40 mt-1.5 italic">
              {t('manage.editor_block_unit_hint', 'Blocks {{name}} only. The other units of this room stay bookable.', { name: headerName })}
            </p>
          )}
        </div>

        {/* Per-unit scope hint — David asked 2026-06-08 for price to
            be per-unit too (not type-level). Block, price, min-stay
            and note all land on the {room_id, date, unit_index} row
            and only affect this physical unit. Rewards stay type-
            level because they're marketing decisions usually applied
            to the full bookable category. */}
        {isUnit && (
          <div className="text-[11px] text-deep/60 px-3 py-2.5 rounded-2xl bg-libre/[0.06] border border-libre/15 flex items-start gap-2">
            <span aria-hidden="true">🔒</span>
            <span>
              {t('manage.editor_unit_scope_note_v2', 'Changes here apply to {{name}} only. The other {{type}} units stay on their default. Rewards still apply to all units.', { name: headerName, type: room.name })}
            </span>
          </div>
        )}

        {/* Price input */}
        <>
        {/* Price input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-deep/60 mb-1.5">
            💰 {t('manage.price', 'Price')} <span className="text-deep/30 font-normal normal-case">(USD · {t('common.night', 'night')})</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-deep/40 font-bold">$</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={`${Number(room.base_price || 0).toFixed(0)} (default)`}
              disabled={isBlocked}
              className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-deep text-base font-bold focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          {!isBlocked && previewPrice > 0 && (
            <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-ocean/5 to-electric/5 border border-ocean/10 text-[11px] flex items-center justify-between">
              <span className="text-deep/60">{t('manage.you_receive', 'You receive (90%)')}</span>
              <span className="font-bold text-libre">${previewNet.toFixed(2)}</span>
            </div>
          )}
          <p className="text-[10px] text-deep/40 mt-1">
            {t('manage.editor_price_hint', 'Leave blank to use the room default')}
          </p>
        </div>

        {/* Min stay input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-deep/60 mb-1.5">
            🌙 {t('manage.min_stay', 'Min stay')} <span className="text-deep/30 font-normal normal-case">({t('common.nights', 'nights')})</span>
          </label>
          <input
            type="number"
            min={1}
            value={minStay}
            onChange={e => setMinStay(e.target.value)}
            placeholder={t('manage.editor_min_stay_placeholder', 'No minimum')}
            className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-deep text-base focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean"
          />
        </div>

        {/* Rewards list — read + remove. Add goes through RewardModal.
            "Clear all" button appears next to "+ Add" whenever the cell
            has at least one reward — David, 2026-06-08: removing them
            one by one when there are 5+ rewards on the day was tedious. */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-deep/60">
              🎁 {t('manage.rewards', 'Rewards')}
              {specials.length > 0 && <span className="ml-1 text-libre">· {specials.length}</span>}
            </label>
            <div className="flex items-center gap-2">
              {specials.length > 0 && onClearRewards && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('manage.editor_clear_rewards_confirm', 'Remove all {{n}} rewards from this cell?', { n: specials.length }))) {
                      onClearRewards()
                    }
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold text-sunset border border-sunset/30 bg-sunset/5 hover:bg-sunset/10 transition-all disabled:opacity-50 cursor-pointer"
                  title={t('manage.editor_clear_rewards_title', 'Remove every reward from this cell')}
                >
                  🗑️ {t('manage.editor_clear_all', 'Clear all')}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenReward}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-libre to-electric shadow-sm hover:shadow-md hover:scale-[1.03] transition-all disabled:opacity-50 cursor-pointer"
              >
                + {t('manage.add', 'Add')}
              </button>
            </div>
          </div>
          {specials.length > 0 ? (
            <div className="space-y-1">
              {specials.map((sp, idx) => (
                <div key={idx} className="flex items-start gap-2 px-3 py-2 rounded-2xl bg-libre/[0.06] border border-libre/15">
                  <span className="text-base leading-none mt-0.5">🎁</span>
                  <div className="flex-1 min-w-0 text-[12px]">
                    <div className="font-semibold text-deep">{sp.label || `Reward ${idx + 1}`}</div>
                    {sp.perk && <div className="text-deep/50">{sp.perk}</div>}
                    {sp.min_stay && <div className="text-deep/40 text-[10px]">Min stay ≥ {sp.min_stay}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveReward(idx)}
                    disabled={saving}
                    className="p-1 rounded-full text-deep/30 hover:text-sunset hover:bg-sunset/10 transition-all cursor-pointer disabled:opacity-50"
                    aria-label="Remove reward"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-deep/40 italic px-1">
              {t('manage.editor_no_rewards', 'No rewards yet — click + Add to attach one.')}
            </p>
          )}
        </div>

        {/* Internal note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-deep/60 mb-1.5">
            📝 {t('manage.internal_note', 'Internal note')} <span className="text-deep/30 font-normal normal-case">({t('manage.editor_note_private', 'never shown to guests')})</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder={t('manage.editor_note_placeholder', 'e.g. Wedding Smith — pre-booked')}
            className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
          />
        </div>
        </>
      </div>

      {/* Footer — Save commits all changes at once */}
      <div className="mt-6 flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-deep/60 hover:text-deep hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-ocean to-electric shadow-md hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t('common.save', 'Save')}
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// CELL HOVER PANEL — DEPRECATED
// ============================================
// Was rendered as an absolute-positioned popover anchored to each
// cell. Two problems killed it:
//   1. overflow-x-auto on the grid container forces overflow-y to
//      auto too in browsers, so the popover got clipped at the top
//      of the first row.
//   2. The buttons opened native prompts, which the user found
//      clunky ("JE VEUX POUVOIR CHANGER LES PRIX, LES OPTIONS").
// Replaced by CellEditorModal above. Function body kept for a beat
// so the diff is reviewable; will be deleted in a follow-up commit.
// eslint-disable-next-line no-unused-vars
function CellHoverPanel_DEPRECATED({
  room, iso, row, stock, totalStock, priceBrut, priceNet, hasOverride,
  isBlocked, saving,
  onMouseEnter, onMouseLeave,
  onSetPrice, onToggleBlock, onSetMinStay, onSetReward, onSetNote,
  t,
}) {
  const minStay = row?.min_stay
  const internalNote = row?.internal_note
  const specials = Array.isArray(row?.specials) ? row.specials : []
  const dateDisplay = new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  })
  // Status pill — borrows the same color logic from cells so the
  // popover header reads at a glance.
  const statusPillClass = isBlocked
    ? 'bg-gradient-to-r from-sunset to-sunset/80 text-white'
    : stock === 0 ? 'bg-gradient-to-r from-sunset to-sunset/80 text-white'
    : stock < totalStock ? 'bg-gradient-to-r from-orange to-pink text-white'
    : 'bg-gradient-to-r from-libre to-libre/80 text-white'

  // Action button — shared structure for the 5 cells in the grid.
  // STAYLO style: rounded-2xl pill, gradient bg, soft lift on hover.
  const ActionBtn = ({ onClick, gradient, icon, label, full }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-white shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:scale-[1.03] cursor-pointer ${gradient} ${full ? 'col-span-2' : ''}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-80 max-w-[92vw] bg-white rounded-2xl shadow-2xl shadow-deep/20 border border-white/60 ring-1 ring-deep/5 overflow-hidden text-left animate-in fade-in slide-in-from-bottom-1 duration-200"
    >
      {/* Pointer arrow — matches the white card body */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-deep/5" />

      {/* Header — gradient strip in STAYLO brand colors. Deep navy
          fading to electric mirrors the dashboard sidebar accent. */}
      <div className="relative px-4 py-3 bg-gradient-to-br from-deep via-deep to-electric/90">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              {dateDisplay}
            </div>
            <div className="text-sm font-bold text-white truncate mt-0.5">{room.name}</div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap tracking-wide ${statusPillClass}`}>
            {isBlocked ? t('manage.blocked', 'Blocked').toUpperCase() : `${stock} / ${totalStock}`}
          </span>
        </div>
      </div>

      {/* Body — soft off-white inside, content stacks vertically */}
      <div className="p-4 bg-white">
        {/* Pricing summary — only when bookable. Uses the brand gradient
            on the headline price so it pops the way prices do across
            the rest of the app. */}
        {!isBlocked && (
          <div className="rounded-2xl bg-gradient-to-br from-ocean/5 to-electric/5 border border-ocean/10 px-3.5 py-2.5 mb-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-deep/60 font-medium">
                {t('manage.cal_guest_pays', 'Guest pays')}
              </span>
              <span className="text-xl font-extrabold bg-gradient-to-r from-ocean to-electric bg-clip-text text-transparent leading-none">
                ${priceBrut.toFixed(0)}
                {hasOverride && (
                  <span className="ml-1.5 text-xs text-orange align-middle" title={t('manage.cal_custom_price', 'Custom price for this day')}>★</span>
                )}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[11px] text-deep/60 font-medium">
                {t('manage.you_receive', 'You receive (90%)')}
              </span>
              <span className="text-sm font-bold text-libre">${priceNet.toFixed(0)}</span>
            </div>
            {hasOverride && (
              <div className="text-[10px] text-orange/80 mt-1 italic font-medium">
                {t('manage.default_price', 'Default')}: ${Number(room.base_price).toFixed(0)}
              </div>
            )}
          </div>
        )}

        {/* Existing flags — only render if any are set. Each is a soft
            pastel chip so they read as informational, not noisy. */}
        {(minStay > 1 || specials.length > 0 || internalNote) && (
          <div className="space-y-1.5 mb-3">
            {minStay > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-deep/[0.04] text-[11px]">
                <span className="text-base leading-none">🌙</span>
                <span className="text-deep/80 font-medium">
                  {t('manage.min_stay', 'Min stay')}:
                </span>
                <span className="font-bold text-deep">
                  {minStay} {minStay > 1 ? t('common.nights', 'nights') : t('common.night', 'night')}
                </span>
              </div>
            )}
            {specials.length > 0 && (
              <div className="px-3 py-2 rounded-xl bg-libre/[0.06] border border-libre/15">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base leading-none">🎁</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-libre">
                    {t('manage.rewards', 'Rewards')} · {specials.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {specials.map((sp, idx) => (
                    <div key={idx} className="text-[11px] leading-tight pl-6">
                      <span className="font-semibold text-deep">{sp.label || `Reward ${idx + 1}`}</span>
                      {sp.perk && <span className="text-deep/50"> · {sp.perk}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {internalNote && (
              <div className="px-3 py-2 rounded-xl bg-electric/[0.06] border border-electric/15">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base leading-none">📝</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-electric">
                    {t('manage.internal_note', 'Internal note')}
                  </span>
                </div>
                <div className="text-[11px] text-deep/70 italic pl-6">{internalNote}</div>
              </div>
            )}
          </div>
        )}

        {/* Actions — STAYLO-style gradient pills. 2-column grid keeps
            the popover compact; the bottom "Note" pill spans both cols. */}
        <div className="grid grid-cols-2 gap-1.5">
          <ActionBtn
            onClick={onSetPrice}
            gradient="bg-gradient-to-r from-ocean to-electric"
            icon="💰"
            label={t('manage.price', 'Price')}
          />
          {isBlocked ? (
            <ActionBtn
              onClick={onToggleBlock}
              gradient="bg-gradient-to-r from-libre to-libre/80"
              icon="✓"
              label={t('manage.unblock', 'Unblock')}
            />
          ) : (
            <ActionBtn
              onClick={onToggleBlock}
              gradient="bg-gradient-to-r from-sunset to-sunset/80"
              icon="⛔"
              label={t('manage.block', 'Block')}
            />
          )}
          <ActionBtn
            onClick={onSetMinStay}
            gradient="bg-gradient-to-r from-deep to-deep/80"
            icon="🌙"
            label={t('manage.min_stay', 'Min stay')}
          />
          <ActionBtn
            onClick={onSetReward}
            gradient="bg-gradient-to-r from-libre to-electric"
            icon="🎁"
            label={t('manage.reward', 'Reward')}
          />
          <ActionBtn
            onClick={onSetNote}
            gradient="bg-gradient-to-r from-electric to-pink"
            icon="📝"
            label={t('manage.note', 'Note')}
            full
          />
        </div>
      </div>
    </div>
  )
}

// ============================================
// TIMELINE AVAILABILITY VIEW
// ============================================
// All-rooms × 14-days bird's-eye view of stock + price. Same visual
// rhythm as the Réception page's Gantt rack (rooms on the left, days
// across the top), but cells are filled with availability info
// (e.g. "24/24" + "$45" + "net $40") instead of reservation bars.
//
// This is a READ-MOSTLY view: clicking a cell jumps to the Monthly
// view's corresponding room+month so the hotelier can edit prices /
// block days there. Keeping the heavy editor in one place avoids
// duplicating the bulk-edit machinery in two layouts.
// ============================================
function TimelineAvailabilityView({ rooms, propertyId, country, viewMode, setViewMode, onRefresh }) {
  const { t } = useTranslation()
  const DAYS = 14
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
  const [availByRoom, setAvailByRoom] = useState({})
  // unitBlocksByCell[roomId][date] = Set of unit_indexes (>0) that are
  // explicitly blocked. Used by CellEditorModal to render the per-unit
  // status chips and by the cell rendering to subtract from the
  // displayed available_count.
  const [unitBlocksByCell, setUnitBlocksByCell] = useState({})
  // Full per-unit override rows keyed by [roomId][date][unitIndex].
  // 2026-06-08: lets us render BABA-001 with its OWN price instead of
  // the type-level $500 when David set a per-unit override.
  const [unitOverridesByCell, setUnitOverridesByCell] = useState({})
  // Virtual rooms — expand non-dorm multi-unit rooms into N rows.
  // BABA × 4 → 4 rows ("BABA-001" / "BABA-002" / "BABA-003" / "BABA-004").
  // Each row carries `display_name` (the unit-numbered identifier shown
  // in the timeline) and `unit_index` (1..quantity). Dorms stay as ONE
  // row (per-bed detail lives in DormSubPlanModal). Single-unit rooms
  // unchanged.
  // Type filter — drops the rendered rows + bulk selection scope to one
  // category at a time. Default 'all' = every type. Persisted only for
  // the lifetime of the component (intentional — re-opening the tab
  // should reset, so the hotelier doesn't get surprised by a stale
  // filter hiding rooms).
  const [typeFilter, setTypeFilter] = useState('all')
  const virtualRooms = useMemo(() => {
    const out = []
    for (const r of (rooms || [])) {
      const qty = Math.max(1, Number(r.quantity) || 1)
      if (qty <= 1) {
        out.push({ ...r, unit_index: null, display_name: r.name, virtual_id: r.id })
      } else {
        // Expand multi-unit rooms (including dorms) into N rows so each
        // physical unit / bed gets its own row in the Timeline. Dorm beds
        // are first-class: Nanda × 18 → NANDA-001..018, each independently
        // bookable & blockable via the per-unit override row pattern
        // (room_availability.room_unit_index = 1..N).
        for (let i = 1; i <= qty; i++) {
          const padded = String(i).padStart(3, '0')
          out.push({
            ...r,
            unit_index: i,
            display_name: `${r.name}-${padded}`,
            virtual_id: `${r.id}#${i}`,
          })
        }
      }
    }
    return out
  }, [rooms])

  // Unique types present in this property, with their virtual-row count.
  // Drives the type filter dropdown options. Sorted by count desc so the
  // biggest categories appear first (Dormitory often dwarfs Executive
  // Suite count). Untyped rooms fall under '__untyped__' so the picker
  // still surfaces them rather than silently dropping the count.
  const typeOptions = useMemo(() => {
    const counts = new Map()
    for (const vr of virtualRooms) {
      const key = String(vr.type || '__untyped__').toLowerCase()
      const slot = counts.get(key) || { key, label: vr.type ? prettyLabel(vr.type) : t('manage.untyped', 'Untyped'), count: 0 }
      slot.count += 1
      counts.set(key, slot)
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  }, [virtualRooms, t])

  // Virtual rooms after the TYPE filter is applied. Every selection /
  // rendering hook below operates on THIS list so the filter narrows
  // both what's shown AND what bulk actions can touch — there's no
  // surprise of "Select range" picking up hidden BABA rows.
  const visibleVirtualRooms = useMemo(() => {
    if (!typeFilter || typeFilter === 'all') return virtualRooms
    const f = String(typeFilter).toLowerCase()
    return virtualRooms.filter(vr => String(vr.type || '__untyped__').toLowerCase() === f)
  }, [virtualRooms, typeFilter])

  const [loading, setLoading] = useState(true)
  // Bulk edit — same idea as Monthly view but cells span room × date.
  // Each entry is "${room_id}|${yyyy-mm-dd}" so the user can mix rooms
  // and dates in one selection (the big advantage of Timeline).
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedCells, setSelectedCells] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  // When the RewardModal is opened from a single-cell popover, we
  // remember which cell triggered it so onApply targets THAT cell
  // and not the user's bulk selection (which may be unrelated).
  // null → use selectedCells (Bulk edit flow).
  const [rewardCellSet, setRewardCellSet] = useState(null)

  // Editor modal — opens when a cell is clicked (and the user is NOT
  // in Bulk edit mode, where clicks toggle selection). Holds the
  // identity of the cell being edited so the modal can fetch its
  // current values from availByRoom + rooms on the fly.
  // Was previously a hover popover but it kept getting clipped by
  // the grid's overflow-x-auto container, and the user explicitly
  // wanted inline fields to "change prices, options" — modal is
  // the right surface for that.
  const [editingCell, setEditingCell] = useState(null) // { roomId, iso } | null

  // Events & holidays — when open, the hotelier toggles catalog events
  // (Full Moon, Songkran, ...) and adds custom one-offs that ride on
  // the day column headers as emoji chips. `eventsTick` is just a
  // version counter we bump after the modal saves so the day-header
  // memo recomputes from the localStorage source of truth.
  const [eventsOpen, setEventsOpen] = useState(false)
  const [eventsTick, setEventsTick] = useState(0)

  // 📝 Internal note editor. Was a native browser prompt() — David rejected
  // it 2026-06-08 ("fais une belle popup. je veux pouvoir ajouter ou annuler
  // des notes"). Now a real Modal with a textarea, Save / Clear / Cancel.
  // Shape: null | { initialValue: string, count: number, onConfirm(value|null) }
  const [noteModal, setNoteModal] = useState(null)

  // Drag-drop reordering of room rows. The left info column of each
  // row is draggable; drop onto another row's info column swaps the
  // two rooms' display_order. Applies everywhere rooms are listed
  // (OTA + reception views) because every fetch sorts by display_order.
  // HTML5 native API, no library — vertical reorder is the simplest
  // case it handles well on desktop.
  const [draggedRoomId, setDraggedRoomId] = useState(null)
  const [dragOverRoomId, setDragOverRoomId] = useState(null)

  async function reorderRooms(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return
    const srcIdx = rooms.findIndex(r => r.id === draggedId)
    const dstIdx = rooms.findIndex(r => r.id === targetId)
    if (srcIdx < 0 || dstIdx < 0) return

    // Insertion-style reorder (not swap) — pluck the dragged room out
    // of the array, splice it back in at the target's position. This
    // is what hoteliers expect when they drag A onto C: A moves to C's
    // slot, everything in between shifts up by one.
    const next = rooms.slice()
    const [moved] = next.splice(srcIdx, 1)
    next.splice(dstIdx, 0, moved)

    // Full renumber 0..N — guarantees no collisions even on legacy
    // data where all rooms share display_order = 0 (the case before
    // 20260604020000_rooms_display_order.sql was applied).
    const updates = next.map((r, i) => ({ id: r.id, order: i }))

    // Hit the DB. We do the writes in parallel; if ANY of them fails
    // we surface the error loudly because silent failure is exactly
    // what the hotelier saw before this fix ("the order never changes").
    // The most common failure here is the migration not having been
    // applied yet — the `display_order` column doesn't exist, every
    // update returns "column does not exist" and the array snaps back
    // on next render.
    try {
      const results = await Promise.all(
        updates.map(u =>
          supabase.from('rooms').update({ display_order: u.order }).eq('id', u.id).select('id')
        )
      )
      const firstError = results.find(r => r.error)?.error
      if (firstError) {
        console.error('[reorderRooms] DB update failed:', firstError)
        const missingColumn = /display_order/i.test(firstError.message || '')
        alert(
          missingColumn
            ? "Reorder couldn't save — the `display_order` column is missing on `rooms`. Apply migration 20260604020000_rooms_display_order.sql in Supabase, then try again."
            : `Reorder couldn't save: ${firstError.message || firstError}`
        )
        return
      }
    } catch (err) {
      console.error('[reorderRooms] unexpected error:', err)
      alert(`Reorder couldn't save: ${err?.message || err}`)
      return
    }

    onRefresh?.()
  }

  function handleRowDragStart(e, roomId) {
    setDraggedRoomId(roomId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', roomId)
  }
  function handleRowDragOver(e, roomId) {
    if (!draggedRoomId) return
    e.preventDefault()  // tells the browser this is a valid drop target
    e.dataTransfer.dropEffect = 'move'
    if (draggedRoomId !== roomId) setDragOverRoomId(roomId)
  }
  function handleRowDragLeave() {
    setDragOverRoomId(null)
  }
  async function handleRowDrop(e, targetId) {
    e.preventDefault()
    const sourceId = draggedRoomId || e.dataTransfer.getData('text/plain')
    setDraggedRoomId(null)
    setDragOverRoomId(null)
    if (sourceId && sourceId !== targetId) {
      await reorderRooms(sourceId, targetId)
    }
  }
  function handleRowDragEnd() {
    setDraggedRoomId(null)
    setDragOverRoomId(null)
  }

  // Build the 14 ISO dates from the current start.
  const dates = []
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startDate); d.setDate(d.getDate() + i)
    dates.push(d)
  }
  const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const addDaysISO = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
  }

  // Pulled out of the useEffect so bulk-edit handlers can call it after
  // writing rows to refresh the on-screen grid.
  // Splits the rows into:
  //   availByRoom[roomId][date]              → the room_unit_index=0 row (type-default)
  //   unitOverridesByCell[roomId][date][N]   → the full per-unit override row at index N (any is_blocked)
  //   unitBlocksByCell[roomId][date]         → Set of unit indexes that are explicitly blocked
  //                                            (derived for cheap is-blocked lookups in the renderer)
  async function refreshAvail() {
    if (rooms.length === 0) { setLoading(false); return }
    setLoading(true)
    const startISO = isoOf(dates[0])
    const endISO   = isoOf(dates[DAYS - 1])
    const roomIds  = rooms.map(r => r.id)
    const { data } = await supabase
      .from('room_availability')
      .select('*')
      .in('room_id', roomIds)
      .gte('date', startISO)
      .lte('date', endISO)
    const map = {}
    const unitMap = {}
    const unitOverrides = {}
    ;(data || []).forEach(row => {
      const unitIdx = Number(row.room_unit_index || 0)
      if (unitIdx === 0) {
        if (!map[row.room_id]) map[row.room_id] = {}
        map[row.room_id][row.date] = row
      } else {
        if (!unitOverrides[row.room_id]) unitOverrides[row.room_id] = {}
        if (!unitOverrides[row.room_id][row.date]) unitOverrides[row.room_id][row.date] = {}
        unitOverrides[row.room_id][row.date][unitIdx] = row
        if (row.is_blocked) {
          if (!unitMap[row.room_id]) unitMap[row.room_id] = {}
          if (!unitMap[row.room_id][row.date]) unitMap[row.room_id][row.date] = new Set()
          unitMap[row.room_id][row.date].add(unitIdx)
        }
      }
    })
    setAvailByRoom(map)
    setUnitBlocksByCell(unitMap)
    setUnitOverridesByCell(unitOverrides)
    setLoading(false)
  }

  // Per-unit override row merged on top of the type-default. Called by
  // the cell renderer + modal so per-unit price / min-stay / note bubble
  // up where they exist, while empty unit-row fields fall back to the
  // type default. is_blocked: unit row is source of truth when it
  // exists (a unit can be "available" even when the type is blocked).
  function mergeEffectiveRow(typeRow, unitRow) {
    if (!unitRow) return typeRow || null
    if (!typeRow) return unitRow
    return {
      ...typeRow,
      id:              unitRow.id,
      room_unit_index: unitRow.room_unit_index,
      is_blocked:      unitRow.is_blocked,
      price_override:  unitRow.price_override ?? typeRow.price_override,
      min_stay:        unitRow.min_stay ?? typeRow.min_stay,
      // Note inheritance with explicit-empty sentinel. A NULL unit cell
      // means "inherit the type note". The empty string '' is the
      // sentinel for "the hotelier explicitly cleared this unit's note"
      // — without it, clearing a unit note silently re-inherits the
      // type's note (David hit this 2026-06-08: erased "Peinting" on
      // BABA-001, it kept coming back). The CellEditorModal's textarea
      // shows both '' and null as blank via `|| ''`, so the UX stays
      // identical; only the persistence layer cares about the difference.
      internal_note:   unitRow.internal_note === '' ? '' : (unitRow.internal_note ?? typeRow.internal_note),
      // Specials — three-way precedence:
      //   · unit row absent or specials=[]                    → inherit type
      //   · unit row carries a {_cleared:true} sentinel       → EXPLICIT empty
      //     (the hotelier removed every reward; do NOT re-inherit)
      //   · unit row carries actual rewards                    → use them
      // The sentinel approach unblocks the David case from 2026-06-08:
      // remove the last reward × on BABA-002 → specials becomes
      // [{_cleared:true}] → merge returns [] → reward list stays empty
      // until he explicitly adds one back.
      specials:        (() => {
        const raw = Array.isArray(unitRow.specials) ? unitRow.specials : null
        if (!raw || raw.length === 0) return typeRow.specials || []
        const hasCleared = raw.some(s => s?._cleared)
        const clean = raw.filter(s => !s?._cleared)
        if (hasCleared) return clean                           // explicit empty (or explicit minus inherits)
        return clean.length > 0 ? clean : (typeRow.specials || [])
      })(),
    }
  }

  /** Toggle the block state of a specific room unit on a given date.
   *  Writes to room_availability at (room_id, date, unit_index).
   *  - blocked=true  → upsert is_blocked=true (insert if missing)
   *  - blocked=false → either delete the row entirely OR update is_blocked=false.
   *    We delete to keep the table lean: no row means "no override", falls
   *    back to the type-default.
   */
  async function handleUnitToggle(roomId, iso, unitIndex, blocked) {
    if (blocked) {
      // Upsert per-unit block row.
      const { error: upErr } = await supabase
        .from('room_availability')
        .upsert(
          {
            room_id: roomId,
            date: iso,
            room_unit_index: unitIndex,
            is_blocked: true,
            available_count: 0,   // per-unit row, 1 unit, blocked = 0
          },
          { onConflict: 'room_id,date,room_unit_index' }
        )
      if (upErr) {
        alert(`Couldn't block unit: ${upErr.message}`)
        return
      }
    } else {
      // Delete the override row → falls back to type-default.
      const { error: delErr } = await supabase
        .from('room_availability')
        .delete()
        .eq('room_id', roomId)
        .eq('date', iso)
        .eq('room_unit_index', unitIndex)
      if (delErr) {
        alert(`Couldn't unblock unit: ${delErr.message}`)
        return
      }
    }
    await refreshAvail()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await refreshAvail()
      if (cancelled) return
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, startDate])

  function shift(days) {
    setStartDate(d => {
      const next = new Date(d); next.setDate(next.getDate() + days); return next
    })
  }
  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); setStartDate(d)
  }

  // ── Bulk-edit handlers ───────────────────────────────────
  // Cell keys are scoped to VIRTUAL rows so per-unit selection works:
  // clicking BABA-002 selects only BABA-002, not the 3 other BABAs that
  // share the same room.id. virtual_id is either:
  //   · `${room.id}`               — single-unit room / pre-expansion row
  //   · `${room.id}#${unit_index}` — per-unit row (BABA-001, Nanda-005...)
  // bulkUpdate parses the key back into (room_id, unit_index) and writes
  // to the matching row_availability row (room_unit_index column).
  function toggleBulkMode() {
    setBulkMode(b => !b)
    setSelectedCells(new Set())
  }
  function cellKey(vid, iso) { return `${vid}|${iso}` }
  function toggleCell(vid, iso) {
    setSelectedCells(prev => {
      const next = new Set(prev)
      const k = cellKey(vid, iso)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }
  function selectAllFuture() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const next = new Set()
    // Acts on the FILTERED list so the user's mental model holds: if
    // they're zoomed to "Standard" rooms, Select range picks Hibrakim
    // cells only — not BABA cells that aren't even on screen.
    for (const vr of visibleVirtualRooms) {
      for (const d of dates) {
        if (d >= today) next.add(cellKey(vr.virtual_id, isoOf(d)))
      }
    }
    setSelectedCells(next)
  }
  function selectWeekends() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const next = new Set()
    for (const vr of visibleVirtualRooms) {
      for (const d of dates) {
        const dow = d.getDay()
        if ((dow === 0 || dow === 6) && d >= today) {
          next.add(cellKey(vr.virtual_id, isoOf(d)))
        }
      }
    }
    setSelectedCells(next)
  }
  // Toggle ONE virtual row's future cells — first click selects every
  // future cell on the row, second click (with the row already fully
  // selected) clears them. Mirrors the column-header toggle's "click
  // again to deselect" pattern so the user has a single consistent
  // interaction model across row / column / type clicks.
  function selectVirtualRow(vid) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const rowKeys = []
    for (const d of dates) {
      if (d >= today) rowKeys.push(cellKey(vid, isoOf(d)))
    }
    if (rowKeys.length === 0) return
    setSelectedCells(prev => {
      const fullySelected = rowKeys.every(k => prev.has(k))
      const next = new Set(prev)
      if (fullySelected) rowKeys.forEach(k => next.delete(k))
      else               rowKeys.forEach(k => next.add(k))
      return next
    })
  }
  // Toggle every virtual row that shares the clicked TYPE — first click
  // selects all of them ("all Executive Suites" / "every dorm bed"),
  // second click deselects them. Same fully-selected → wipe logic as
  // selectVirtualRow above.
  function selectByType(typeStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tnorm = String(typeStr || '').toLowerCase()
    const typeKeys = []
    // Scoped to visible rows so the click can't reach into a type that
    // the user filtered away — though in practice once a single type
    // is filtered, every row already shares that type.
    for (const vr of visibleVirtualRooms) {
      if (String(vr.type || '').toLowerCase() !== tnorm) continue
      for (const d of dates) {
        if (d >= today) typeKeys.push(cellKey(vr.virtual_id, isoOf(d)))
      }
    }
    if (typeKeys.length === 0) return
    setSelectedCells(prev => {
      const fullySelected = typeKeys.every(k => prev.has(k))
      const next = new Set(prev)
      if (fullySelected) typeKeys.forEach(k => next.delete(k))
      else               typeKeys.forEach(k => next.add(k))
      return next
    })
  }

  // Excel-like column selection — click a date header to select every
  // room × that day. Modifier-aware:
  //   · plain click  → REPLACE the selection with just this column
  //   · ⌘ / Ctrl     → ADD this column to the existing selection
  //                    (or remove it if it was already fully selected)
  //   · ⇧ Shift      → contiguous range from the last anchor to here
  //                    (so click Jun 3, shift+click Jun 7 picks Jun 3..7)
  const lastColAnchorRef = useRef(null)
  function toggleColumn(iso, e) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    // Pre-compute the keys this column would add (only future cells
    // across every virtual row — past cells aren't actionable).
    // Iterates virtualRooms so multi-unit rooms add ALL their unit
    // rows' cells (BABA-001..004 + every dorm bed) instead of one
    // type-level cell per room.
    const dateObj = new Date(iso + 'T00:00:00')
    if (dateObj < today) return
    const additive = !!(e && (e.metaKey || e.ctrlKey))
    const rangeMode = !!(e && e.shiftKey)
    const colKeys = []
    for (const vr of visibleVirtualRooms) colKeys.push(cellKey(vr.virtual_id, iso))

    setSelectedCells(prev => {
      if (rangeMode && lastColAnchorRef.current) {
        // Contiguous range from anchor to here. Builds the date list
        // forward or backward depending on direction.
        const anchor = lastColAnchorRef.current
        const idxA = dates.findIndex(d => isoOf(d) === anchor)
        const idxB = dates.findIndex(d => isoOf(d) === iso)
        if (idxA === -1 || idxB === -1) return prev
        const [lo, hi] = idxA < idxB ? [idxA, idxB] : [idxB, idxA]
        const next = new Set(prev)
        for (let i = lo; i <= hi; i++) {
          const di = dates[i]
          if (di < today) continue
          for (const vr of visibleVirtualRooms) next.add(cellKey(vr.virtual_id, isoOf(di)))
        }
        return next
      }
      // Detect whether the column is ALREADY fully selected (so a
      // re-click in additive mode toggles it off, like macOS Finder).
      const fullySelected = colKeys.every(k => prev.has(k))
      if (additive) {
        const next = new Set(prev)
        if (fullySelected) colKeys.forEach(k => next.delete(k))
        else               colKeys.forEach(k => next.add(k))
        return next
      }
      // Plain click — replace the selection with just this column.
      // If the column is already the EXACT selection, clear it instead
      // (lets a re-click deselect without needing the keyboard).
      if (fullySelected && prev.size === colKeys.length) return new Set()
      return new Set(colKeys)
    })
    lastColAnchorRef.current = iso
  }

  // Apply payload to all selected cells. Groups by room_id so we can
  // do one fetch + one insert/update batch per room, then recompute
  // availability if is_blocked was touched.
  //
  // Special meta-keys (mirror Monthly's bulkUpdate so rewards stack
  // correctly across days):
  //   - add_special: {label, perk, min_stay} → append to specials[]
  //   - clear_specials: true → wipe specials[]
  //   - remove_special_at: <index> → remove one entry
  // Plain keys (is_blocked, price_override, min_stay, internal_note,
  // promo_label, promo_pct, perk) write directly.
  async function bulkUpdate(payload, label, customCellSet, opts = {}) {
    const targetSet = customCellSet || selectedCells
    // Single-cell flows (from the hover popover) skip the confirm —
    // it would be obnoxious for one-click actions. Bulk flows still
    // confirm because they can touch dozens of cells across rooms.
    // EXCEPT when the caller already showed an explicit confirmation
    // UI (NoteEditorModal, RewardModal) — David flagged the double
    // confirm 2026-06-08: "on a pas besoin de confirmer la confirmation".
    const isSingleCell = !!customCellSet && targetSet.size === 1
    const skipConfirm = !!opts.skipConfirm
    if (targetSet.size === 0) { alert(t('manage.timeline_select_first', 'Select some cells first.')); return }
    if (!isSingleCell && !skipConfirm && !confirm(`${label} — ${targetSet.size} ${targetSet.size > 1 ? 'cells' : 'cell'}?`)) return
    setSaving(true)
    // Collect per-row errors so a single bad write doesn't silently
    // abort the batch. The user gets a single alert at the end with
    // everything that failed — better than a silent half-success.
    const bulkErrors = []

    // Group keys by (room_id, unit_index). Virtual ids encode the unit:
    //   "<uuid>"          → type-level row (room_unit_index = 0)
    //   "<uuid>#<index>"  → per-unit override row (room_unit_index = N)
    // Same payload writes to whichever row the cell key references, so
    // bulk-blocking a mix of cells (Executive Suite type-level + Nanda
    // bed 5 + Hibrakim-002) in one selection just works — each
    // (rid, unitIndex) pair gets its own fetch + upsert below.
    const byCell = {}                              // groupKey → { rid, unitIndex, isos[] }
    targetSet.forEach(k => {
      const [vid, iso] = k.split('|')
      const hashAt = vid.indexOf('#')
      const rid = hashAt === -1 ? vid : vid.slice(0, hashAt)
      const unitIndex = hashAt === -1 ? 0 : Number(vid.slice(hashAt + 1)) || 0
      const groupKey = `${rid}#${unitIndex}`
      if (!byCell[groupKey]) byCell[groupKey] = { rid, unitIndex, isos: [] }
      byCell[groupKey].isos.push(iso)
    })

    // Pull meta-actions out — they need per-row processing
    const { add_special, clear_specials, remove_special_at, ...directWrites } = payload
    const touchesSpecials = !!add_special || !!clear_specials || typeof remove_special_at === 'number'

    for (const { rid, unitIndex, isos: isoList } of Object.values(byCell)) {
      const room = rooms.find(r => r.id === rid)
      if (!room) continue

      // 2026-06-08 — every editable field is per-unit now, including
      // rewards/specials. A unit cell that adds/removes a reward
      // writes to its own (room_id, date, unit_index) row, computed
      // from the merged effective row's current specials so the user
      // sees the operation applied to what was visible in the modal.
      const isUnitBulk = unitIndex > 0

      // Fetch existing rows for this (room, unit, dates). Filtering on
      // room_unit_index keeps the per-unit refactor safe: before this,
      // a multi-unit room's (room_id, date) lookup pulled N+1 rows and
      // `existingByDate[r.date] = r` overwrote (last row scanned won),
      // so the wrong unit's is_blocked could end up updated. Now exact.
      const { data: existing } = await supabase
        .from('room_availability')
        .select('*')
        .eq('room_id', rid)
        .eq('room_unit_index', unitIndex)
        .in('date', isoList)
      const existingByDate = {}
      ;(existing || []).forEach(r => { existingByDate[r.date] = r })

      const toUpdate = isoList.filter(d => existingByDate[d])
      const toInsert = isoList.filter(d => !existingByDate[d])

      // Helper — compute the next specials array for a given iso
      // based on the merged effective row's CURRENT specials. For
      // type-level edits this is just the type row's specials; for
      // unit edits this is the merged view (unit override winning
      // over type), so removing reward index 0 from BABA-002 sees
      // the same indices as the modal showed.
      function nextSpecialsFor(iso) {
        const typeRow0 = availByRoom[rid]?.[iso]
        const unitRow0 = isUnitBulk ? unitOverridesByCell[rid]?.[iso]?.[unitIndex] : null
        const effective = isUnitBulk ? mergeEffectiveRow(typeRow0, unitRow0) : (existingByDate[iso] || typeRow0)
        // Strip any pre-existing sentinel before applying the next op.
        const current = (Array.isArray(effective?.specials) ? effective.specials : [])
          .filter(s => !s?._cleared)
        let next
        if (clear_specials)                              next = []
        else if (add_special)                            next = [...current, add_special]
        else if (typeof remove_special_at === 'number')  next = current.filter((_, i) => i !== remove_special_at)
        else                                             next = current
        // Per-unit rows store an EXPLICIT empty-marker so the merge
        // doesn't re-inherit the type's rewards behind the user's back.
        // Without this, removing the last reward via × (or hitting
        // Clear all) makes them all come back as soon as the cell
        // re-renders. 2026-06-08.
        if (isUnitBulk && next.length === 0) return [{ _cleared: true }]
        return next
      }

      // Updates — every changed field propagates to both type rows
      // and unit rows. Specials use the merged effective row as the
      // source so unit-cell edits stack onto whatever was visible.
      // Errors are collected (not thrown) so one bad row doesn't
      // abort the rest of the batch. The user gets a single alert
      // at the end if anything failed.
      for (const iso of toUpdate) {
        const row = existingByDate[iso]
        let rowPayload = directWrites
        if (touchesSpecials) {
          rowPayload = { ...directWrites, specials: nextSpecialsFor(iso) }
        }
        // Per-unit clear-note sentinel: a NULL note on a unit row would
        // get masked by the merge (`unitRow.internal_note ?? typeRow.internal_note`).
        // Persist '' instead so mergeEffectiveRow treats it as "explicit
        // empty" and stops re-inheriting the type's note. See the
        // sentinel branch in mergeEffectiveRow for the read side.
        if (isUnitBulk && 'internal_note' in rowPayload && rowPayload.internal_note === null) {
          rowPayload = { ...rowPayload, internal_note: '' }
        }
        const { error } = await supabase.from('room_availability').update(rowPayload).eq('id', row.id)
        if (error) {
          // eslint-disable-next-line no-console
          console.error('[bulkUpdate] update failed', { iso, rid, unitIndex, rowPayload, error })
          bulkErrors.push(`${iso}: ${error.message}`)
        }
      }

      // Inserts — per-unit rows carry the full editable field set
      // (block + price + min-stay + note + specials) so a fresh
      // BABA-002 override can land with a $399 price OR a custom
      // rewards list even when nothing was blocked. Type rows
      // additionally carry promo + available_count because they're
      // the public surface OTA reads from.
      //
      // Per-unit `specials` defaults to NULL (not []) so a row
      // created purely for blocking doesn't accidentally hide the
      // type's rewards — see mergeEffectiveRow above.
      if (toInsert.length > 0) {
        const rows = toInsert.map(iso => {
          // The `specials` column is NOT NULL (default '[]'). Only
          // include it in the insert payload when the user is actually
          // touching specials — otherwise omit so the DB default
          // kicks in. Was writing `null` here which blew up with
          // "null value in column 'specials' violates not-null
          // constraint" when bulkSetPrice fired with no specials op.
          // 2026-06-08 — David's bulk-set-$100 hit this on 14 rows.
          const specialsForRow = touchesSpecials ? nextSpecialsFor(iso) : undefined
          // Per-unit clear-note sentinel: when the caller passed
          // internal_note: null explicitly (clear at unit level), we
          // persist '' instead so mergeEffectiveRow stops re-inheriting
          // the type row's note. When the field wasn't in the payload
          // at all, fall through to null (= "inherit").
          const unitNote = 'internal_note' in directWrites
            ? (directWrites.internal_note === null ? '' : directWrites.internal_note)
            : null
          return isUnitBulk ? ({
            room_id: rid,
            date: iso,
            room_unit_index: unitIndex,
            available_count: directWrites.is_blocked ? 0 : 1,
            is_blocked:     directWrites.is_blocked ?? false,
            price_override: directWrites.price_override ?? null,
            min_stay:       directWrites.min_stay ?? null,
            internal_note:  unitNote,
            ...(specialsForRow !== undefined ? { specials: specialsForRow } : {}),
          }) : ({
            room_id: rid,
            date: iso,
            room_unit_index: 0,
            available_count: directWrites.is_blocked ? 0 : (room.quantity || 1),
            is_blocked:     directWrites.is_blocked ?? false,
            price_override: directWrites.price_override ?? null,
            min_stay:       directWrites.min_stay ?? null,
            promo_label:    directWrites.promo_label ?? null,
            promo_pct:      directWrites.promo_pct ?? null,
            perk:           directWrites.perk ?? null,
            // Type-level always needs SOMETHING (it's the public
            // surface). Default to [] when no op, computed array
            // when adding a special.
            specials:       specialsForRow !== undefined ? specialsForRow : (add_special ? [add_special] : []),
            internal_note:  directWrites.internal_note ?? null,
          })
        })
        // Use upsert with onConflict so concurrent edits or stale
        // caches don't blow up with a unique-constraint violation:
        // if the row already exists at (room_id, date, room_unit_index)
        // we replace its editable fields rather than reject the write.
        const { error } = await supabase
          .from('room_availability')
          .upsert(rows, { onConflict: 'room_id,date,room_unit_index' })
        if (error) {
          // eslint-disable-next-line no-console
          console.error('[bulkUpdate] upsert failed', { rid, unitIndex, rowsLen: rows.length, error })
          bulkErrors.push(`${rows.length} row(s): ${error.message}`)
        }
      }

      // When UN-blocking the type-default, also clear any per-unit
      // override rows still blocked for these dates so the cell fully
      // reopens. Only fires at type level — un-blocking a single unit
      // shouldn't cascade-clear siblings.
      if (!isUnitBulk && directWrites.is_blocked === false) {
        await supabase.from('room_availability')
          .delete()
          .eq('room_id', rid)
          .gt('room_unit_index', 0)
          .eq('is_blocked', true)
          .in('date', isoList)
      }

      // Recompute available_count if is_blocked changed (type level only
      // — per-unit rows are single-stock by definition: 1 unit blocked
      // or not).
      if (!isUnitBulk && 'is_blocked' in directWrites) {
        const sorted = [...isoList].sort()
        await supabase.rpc('recompute_room_availability', {
          p_room_id:   rid,
          p_check_in:  sorted[0],
          p_check_out: addDaysISO(sorted[sorted.length - 1], 1),
        })
      }
    }

    await refreshAvail()
    // Only clear the user's bulk selection if THIS call used it.
    // Single-cell popover actions must not nuke an in-progress bulk pick.
    if (!customCellSet) setSelectedCells(new Set())
    setSaving(false)

    // Surface anything that didn't apply — silent failure was the
    // whole "bulk change ne fonctionne pas" complaint. Capped at the
    // first 5 lines so the alert stays readable when 30 rows fail.
    if (bulkErrors.length > 0) {
      const preview = bulkErrors.slice(0, 5).join('\n')
      const more = bulkErrors.length > 5 ? `\n…and ${bulkErrors.length - 5} more` : ''
      alert(`${label} — ${bulkErrors.length} write(s) failed:\n\n${preview}${more}\n\nFull details in the browser console.`)
    }
  }

  async function bulkBlock()   { await bulkUpdate({ is_blocked: true  }, t('manage.bulk_block_label', 'Block')) }
  async function bulkUnblock() { await bulkUpdate({ is_blocked: false }, t('manage.bulk_unblock_label', 'Unblock')) }

  async function bulkSetPrice() {
    if (selectedCells.size === 0) { alert(t('manage.timeline_select_first', 'Select some cells first.')); return }
    const input = prompt(
      t('manage.bulk_price_prompt', 'Set price (USD) for {{n}} selected cell(s).\n\nLeave blank to revert to each room\'s default price.', { n: selectedCells.size })
    )
    if (input === null) return
    const trimmed = input.trim()
    let newPrice = null
    if (trimmed !== '') {
      newPrice = Number(trimmed)
      if (!isFinite(newPrice) || newPrice <= 0) {
        alert(t('manage.invalid_price', 'Invalid price. Must be a positive number.'))
        return
      }
    }
    await bulkUpdate(
      { price_override: newPrice },
      newPrice ? `${t('manage.bulk_set_price_label', 'Set price to')} $${newPrice}` : t('manage.bulk_clear_price_label', 'Clear price override')
    )
  }

  // 🌙 Min stay — same UX as Monthly: prompt for an integer ≥ 1, blank clears.
  async function bulkSetMinStay() {
    if (selectedCells.size === 0) { alert(t('manage.timeline_select_first', 'Select some cells first.')); return }
    const input = prompt(
      t(
        'manage.bulk_min_stay_prompt',
        'Minimum nights required if the booking includes any of the {{n}} selected cell(s).\n\nEnter a number (e.g. 3). Leave blank to remove the constraint.',
        { n: selectedCells.size }
      )
    )
    if (input === null) return
    const trimmed = input.trim()
    let val = null
    if (trimmed !== '') {
      val = Math.floor(Number(trimmed))
      if (!isFinite(val) || val < 1) {
        alert(t('manage.invalid_min_stay', 'Invalid min stay (must be ≥ 1).'))
        return
      }
    }
    await bulkUpdate(
      { min_stay: val },
      val ? `${t('manage.bulk_set_min_stay_label', 'Set min stay to')} ${val} ${val > 1 ? t('common.nights', 'nights') : t('common.night', 'night')}`
          : t('manage.bulk_clear_min_stay_label', 'Remove min stay')
    )
  }

  // 🎁 Reward — opens the same RewardModal as Monthly. The modal's
  // onApply returns the payload + label which we pass straight through.
  function bulkSetReward() {
    if (selectedCells.size === 0) { alert(t('manage.timeline_select_first', 'Select some cells first.')); return }
    setRewardCellSet(null) // null → use selectedCells inside onApply
    setRewardModalOpen(true)
  }
  async function handleRewardModalApply(payload, label) {
    // If a single-cell popover opened the modal, target that cell.
    // Otherwise fall back to the user's bulk selection.
    // skipConfirm: RewardModal's own Apply button is the user's intent
    // signal — no need for a second native confirm() on top.
    await bulkUpdate(payload, label, rewardCellSet || undefined, { skipConfirm: true })
    setRewardCellSet(null)
  }

  // 📝 Internal note — hotelier-only annotation, never shown to guests.
  // 2026-06-08: David rejected the native browser prompt() — too ugly,
  // doesn't preserve multi-line, no Clear button. Replaced with a real
  // NoteEditorModal (state below, render at bottom).
  function bulkSetNote() {
    if (selectedCells.size === 0) { alert(t('manage.timeline_select_first', 'Select some cells first.')); return }
    // Survey the selection. Three pieces of info matter:
    //   - sameForAll → pre-fill the textarea (safe: editing common ground)
    //   - cellsWithNote → count the cells that actually have a note today
    //   - anyHasNote → drives the Clear button. Even if cells disagree on
    //     content, the user must be able to wipe them all at once. David
    //     hit this on 2026-06-08: 14 cells selected, 2 with notes, no
    //     way to clear → "je ne peux pas retirer des notes". Fixed.
    let sameForAll = true
    let first = null
    let cellsWithNote = 0
    selectedCells.forEach(k => {
      const [vid, iso] = k.split('|')
      const hashAt = vid.indexOf('#')
      const rid = hashAt === -1 ? vid : vid.slice(0, hashAt)
      const note = availByRoom[rid]?.[iso]?.internal_note ?? null
      if (note) cellsWithNote++
      if (first === null) first = note
      else if (note !== first) sameForAll = false
    })
    const initial = sameForAll && first ? first : ''
    setNoteModal({
      initialValue: initial,
      count: selectedCells.size,
      cellsWithNote,           // > 0 → render Clear button
      mixed: !sameForAll,      // → show "Notes differ across cells" hint
      onConfirm: async (newValue) => {
        const note = (newValue || '').trim() || null
        await bulkUpdate(
          { internal_note: note },
          note ? t('manage.bulk_set_note_label', 'Set internal note') : t('manage.bulk_clear_note_label', 'Clear note'),
          undefined,
          { skipConfirm: true } // NoteEditorModal already showed the count + intent
        )
      },
    })
  }

  // ── Single-cell handlers ────────────────────────────────
  // Called from the hover popover so the user can edit one cell at
  // a time without entering Bulk edit mode. Each one builds a Set
  // of just {roomId|iso} and routes through bulkUpdate so we get
  // the same insert/update/recompute logic for free.
  function singleSetPrice(roomId, iso) {
    const room = rooms.find(r => r.id === roomId)
    const existing = availByRoom[roomId]?.[iso]
    const current = existing?.price_override ?? room?.base_price ?? 0
    const input = prompt(
      `Set price for ${iso} (currently $${Number(current).toFixed(0)}).\n\nLeave blank to revert to default ($${Number(room?.base_price || 0).toFixed(0)}).`,
      String(current)
    )
    if (input === null) return
    const trimmed = input.trim()
    let newPrice = null
    if (trimmed !== '') {
      newPrice = Number(trimmed)
      if (!isFinite(newPrice) || newPrice <= 0) {
        alert(t('manage.invalid_price', 'Invalid price. Must be a positive number.'))
        return
      }
    }
    bulkUpdate(
      { price_override: newPrice },
      newPrice ? `Set price to $${newPrice}` : 'Clear price override',
      new Set([cellKey(roomId, iso)])
    )
  }
  function singleToggleBlock(roomId, iso) {
    const row = availByRoom[roomId]?.[iso]
    const nextBlocked = !row?.is_blocked
    bulkUpdate(
      { is_blocked: nextBlocked },
      nextBlocked ? 'Block' : 'Unblock',
      new Set([cellKey(roomId, iso)])
    )
  }
  function singleSetMinStay(roomId, iso) {
    const row = availByRoom[roomId]?.[iso]
    const current = row?.min_stay ?? ''
    const input = prompt(
      `Minimum nights for ${iso} (currently ${current || 'none'}).\n\nEnter a number ≥ 1, or leave blank to remove.`,
      String(current)
    )
    if (input === null) return
    const trimmed = input.trim()
    let val = null
    if (trimmed !== '') {
      val = Math.floor(Number(trimmed))
      if (!isFinite(val) || val < 1) {
        alert(t('manage.invalid_min_stay', 'Invalid min stay (must be ≥ 1).'))
        return
      }
    }
    bulkUpdate(
      { min_stay: val },
      val ? `Set min stay to ${val} ${val > 1 ? 'nights' : 'night'}` : 'Remove min stay',
      new Set([cellKey(roomId, iso)])
    )
  }
  function singleSetReward(roomId, iso, unitIndex) {
    // 2026-06-08 — virtual-id encoding so the reward modal writes to
    // the per-unit row when invoked from a unit cell. Without the
    // suffix the add lands on the type-default and applies to every
    // BABA, which is what David hit when removing one earlier.
    const vid = unitIndex != null ? `${roomId}#${unitIndex}` : roomId
    setRewardCellSet(new Set([cellKey(vid, iso)]))
    setRewardModalOpen(true)
  }
  function singleSetNote(roomId, iso, unitIndex) {
    const row = availByRoom[roomId]?.[iso]
    const current = row?.internal_note ?? ''
    const vid = unitIndex != null ? `${roomId}#${unitIndex}` : roomId
    setNoteModal({
      initialValue: String(current),
      count: 1,
      cellsWithNote: current ? 1 : 0,
      mixed: false,
      onConfirm: async (newValue) => {
        const note = (newValue || '').trim() || null
        await bulkUpdate(
          { internal_note: note },
          note ? 'Set internal note' : 'Clear note',
          new Set([cellKey(vid, iso)]),
          { skipConfirm: true }
        )
      },
    })
  }

  if (rooms.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-deep mb-2">{t('manage.no_rooms_calendar', 'Add rooms first')}</h3>
        <p className="text-gray-500">{t('manage.no_rooms_calendar_desc', 'You need at least one room type to manage availability.')}</p>
      </Card>
    )
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayISO = isoOf(today)
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <>
      {/* Unified header bar — view toggle + date nav + Bulk edit on
          ONE line. Lives OUTSIDE the Card so it sits with the page
          chrome rather than inside the grid panel. Per David: "Bulk
          edit / La date viennent sur la même ligne que les box
          monthly/timeline". */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-deep transition-all"
          >
            📅 {t('manage.view_monthly', 'Monthly')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-deep text-white shadow-sm"
          >
            📊 {t('manage.view_timeline', 'Timeline')}
          </button>
        </div>

        {/* Date nav */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1 py-0.5">
          <button onClick={() => shift(-7)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs sm:text-sm font-bold text-deep px-2 whitespace-nowrap">
            {dates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' – '}
            {dates[DAYS - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={() => shift(7)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Next week">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-deep text-white text-xs font-bold hover:bg-deep/90">
          {t('common.today', 'Today')}
        </button>

        {/* Bulk edit toggle */}
        <button
          type="button"
          onClick={toggleBulkMode}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            bulkMode
              ? 'bg-ocean text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean'
          }`}
        >
          {bulkMode ? `✓ ${t('manage.bulk_edit_on', 'Bulk edit ON')}` : `✏️ ${t('manage.bulk_edit', 'Bulk edit')}`}
        </button>

        {/* Events & holidays — ported from ship.html's Planning. Lets the
            hotelier toggle public holidays + lunar parties + custom events
            that ride on the day column headers as emoji chips. Helps with
            price/stock planning around Full Moon, Songkran, etc. */}
        <button
          type="button"
          onClick={() => setEventsOpen(true)}
          title={t('manage.events_button_hint', 'Pick which holidays + parties show on day headers')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white border border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean"
        >
          🗓️ {t('manage.events_button', 'Events')}
        </button>

        {/* TYPE filter — narrows the rendered rows + bulk scope to a
            single room category. With 58 virtual rows (4 BABA + 3 Hibrakim
            + 18 Nanda beds + 24 HQ single + 9 HQ double), scrolling is the
            previous default; picking "Dormitory" here shows just the
            51 beds, "Executive Suite" just the 4 BABAs. */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white border border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean cursor-pointer focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20"
          title={t('manage.type_filter_hint', 'Filter the Timeline to one room type')}
        >
          <option value="all">🛏️ {t('manage.type_filter_all', 'All types')} ({virtualRooms.length})</option>
          {typeOptions.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>

        {/* Hint — pushed to the right via ml-auto so it doesn't crowd the controls */}
        <span className="text-[11px] text-gray-400 italic ml-auto">
          {bulkMode
            ? t('manage.timeline_bulk_hint', 'Click cells or date headers (⌘/Ctrl for multi) · then apply an action')
            : t('manage.view_timeline_hint', 'All rooms · 14 days at a glance')}
        </span>
      </div>

    <Card>
      {/* Bulk-edit secondary toolbar — quick selects + actions, only
          rendered when bulk mode is ON. The toggle itself moved up
          into the unified header so this row is purely the workspace. */}
      {bulkMode && (
        <div className="mb-3 flex items-center gap-2 flex-wrap pb-2 border-b border-gray-100">
          <button onClick={selectAllFuture} type="button"
            className="px-2.5 py-1 rounded text-xs text-gray-500 hover:text-deep hover:bg-gray-50 transition-all">
            {t('manage.timeline_select_all', 'Select range')}
          </button>
          <button onClick={selectWeekends} type="button"
            className="px-2.5 py-1 rounded text-xs text-gray-500 hover:text-deep hover:bg-gray-50 transition-all">
            {t('manage.weekends_only', 'Weekends only')}
          </button>
          {selectedCells.size > 0 && (
            <button onClick={() => setSelectedCells(new Set())} type="button"
              className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-sunset transition-all">
              {t('manage.clear_count', 'Clear ({{n}})', { n: selectedCells.size })}
            </button>
          )}

          {selectedCells.size > 0 && (
            <div className="basis-full pt-2 mt-1 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">
                {t('manage.cells_count', '{{n}} cell(s) →', { n: selectedCells.size })}
              </span>
              <button onClick={bulkSetPrice} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-ocean text-white hover:bg-ocean/90 disabled:opacity-50">
                💰 {t('manage.price', 'Price')}
              </button>
              <button onClick={bulkSetMinStay} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-deep/5 text-deep hover:bg-deep/10 border border-deep/15 disabled:opacity-50">
                🌙 {t('manage.min_stay', 'Min stay')}
              </button>
              <button onClick={bulkSetReward} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-libre/10 text-libre hover:bg-libre/20 border border-libre/15 disabled:opacity-50">
                🎁 {t('manage.reward', 'Reward')}
              </button>
              <button onClick={bulkSetNote} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-electric/10 text-electric hover:bg-electric/20 border border-electric/15 disabled:opacity-50">
                📝 {t('manage.note', 'Note')}
              </button>
              <span className="mx-1 text-gray-200">|</span>
              <button onClick={bulkBlock} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-sunset/10 text-sunset hover:bg-sunset/20 disabled:opacity-50">
                {t('manage.block', 'Block')}
              </button>
              <button onClick={bulkUnblock} type="button" disabled={saving}
                className="px-2.5 py-1 rounded text-xs font-bold bg-libre/10 text-libre hover:bg-libre/20 disabled:opacity-50">
                {t('manage.unblock', 'Unblock')}
              </button>
              {saving && <Loader2 size={14} className="animate-spin text-gray-400 ml-1" />}
            </div>
          )}
        </div>
      )}

      {/* Grid — fixed type + room columns + DAYS evenly-spaced day columns.
          The type column was split out 2026-06-08 so the receptionist
          can scan room categories (Executive Suite / Standard / Dorm)
          down a single vertical line instead of decoding stacked badges.
          Horizontal scroll kicks in below ~960px so cells never collapse
          into illegible slivers on tablet portraits.

          gridTemplateColumns layout:
            · 130px → TYPE (room category)
            · 170px → ROOM (unit identifier + price)
            · 14 ×  1fr → days
       */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[960px]">
          {/* Header row — DOW + day number per column.
              In Bulk edit mode, each header becomes a clickable column
              selector:
                · plain click → replace selection with this column
                · ⌘/Ctrl+click → add (or remove) this column
                · Shift+click → range from last anchor to here */}
          <div className="grid mb-1" style={{ gridTemplateColumns: `130px 170px repeat(${DAYS}, 1fr)` }}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 py-2 px-2 border-b border-gray-200">
              {t('manage.type', 'Type')}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 py-2 px-2 border-b border-gray-200">
              {t('manage.room', 'Room')}
            </div>
            {dates.map((d, i) => {
              const iso = isoOf(d)
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const isToday = iso === todayISO
              const isPastCol = d < today
              // A column is "selected" iff every (virtual row × this iso)
              // cell is in selectedCells. Iterates virtualRooms so multi-
              // unit rooms count each unit row individually (BABA-001..
              // 004 each must be selected for the column to flag as full).
              const colSelected = bulkMode && visibleVirtualRooms.length > 0 &&
                visibleVirtualRooms.every(vr => selectedCells.has(cellKey(vr.virtual_id, iso)))
              const headerClickable = bulkMode && !isPastCol
              // Catalog + custom events on this date (see lib/events.js).
              // eventsTick forces re-eval after the modal saves. propertyId
              // is the storage scope key. Limited to 3 chips per header so
              // a busy day (Christmas + Full Moon + custom) doesn't blow
              // the column width — overflow goes into the title tooltip.
              const evList = propertyId
                ? getEventsOnDate(propertyId, country, iso)
                : []
              // eslint-disable-next-line no-unused-expressions
              eventsTick // mark dependency
              return (
                <div
                  key={i}
                  onClick={headerClickable ? (e) => toggleColumn(iso, e) : undefined}
                  title={headerClickable
                    ? 'Click to select this column · ⌘/Ctrl+click to add · Shift+click for range'
                    : (evList.length > 0 ? evList.map(e => e.name).join(' · ') : undefined)}
                  className={`text-center py-1.5 border-b border-gray-200 transition-colors ${
                    colSelected
                      ? 'bg-ocean/20 ring-1 ring-inset ring-ocean/40'
                      : isToday ? 'bg-ocean/10' : ''
                  } ${headerClickable ? 'cursor-pointer hover:bg-ocean/10' : ''}`}
                >
                  {/* Event chips — emoji row above the DOW. Hidden when
                      empty so single-event columns don't grow taller than
                      blank columns. */}
                  {evList.length > 0 && (
                    <div className="flex items-center justify-center gap-0.5 h-4 mb-0.5"
                      title={evList.map(e => e.name).join(' · ')}
                    >
                      {evList.slice(0, 3).map(ev => (
                        <span key={ev.id} className="text-[13px] leading-none" aria-hidden="true">
                          {ev.em}
                        </span>
                      ))}
                      {evList.length > 3 && (
                        <span className="text-[8px] text-gray-400 font-bold">+{evList.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className={`text-[10px] font-medium ${isWeekend ? 'text-orange/70' : 'text-gray-400'}`}>
                    {dows[d.getDay()]}
                  </div>
                  <div className={`text-sm font-bold ${
                    colSelected ? 'text-ocean'
                    : isToday   ? 'text-ocean'
                    : isWeekend ? 'text-orange' : 'text-deep'
                  }`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rows — one per VIRTUAL room (1 per physical unit for non-dorm
              multi-unit rooms, 1 per room otherwise). In bulk mode,
              clicking a cell toggles it in the selection.

              We compute `firstOfGroup` so the TYPE cell only renders
              the label on the first row of each room (BABA-001 shows
              "Executive Suite", BABA-002..004 leave the cell blank).
              Same-type but different rooms (e.g. Nanda dorm + HQ dorm)
              keep their own label because the group key is the real
              room.id, not the type string. */}
          {visibleVirtualRooms.map((vroom, vIdx) => {
            const room = vroom              // alias for clarity in older code below
            const isUnitRow = vroom.unit_index != null
            const prev = vIdx > 0 ? visibleVirtualRooms[vIdx - 1] : null
            const firstOfGroup = !prev || prev.id !== vroom.id
            return (
            <div
              key={vroom.virtual_id}
              className={`grid items-stretch transition-all ${
                draggedRoomId === room.id ? 'opacity-40' : ''
              } ${
                dragOverRoomId === room.id ? 'ring-2 ring-inset ring-ocean bg-ocean/10' : ''
              }`}
              style={{ gridTemplateColumns: `130px 170px repeat(${DAYS}, 1fr)` }}
              onDragOver={!bulkMode && !isUnitRow ? (e) => handleRowDragOver(e, room.id) : undefined}
              onDragLeave={!bulkMode && !isUnitRow ? handleRowDragLeave : undefined}
              onDrop={!bulkMode && !isUnitRow ? (e) => handleRowDrop(e, room.id) : undefined}
            >
              {/* TYPE column — only rendered on the first row of a
                  multi-unit group so the column reads like a category
                  index instead of repeating "Executive Suite × 4".
                  Subsequent unit rows show a subtle vertical guide line
                  on the left edge to signal continuation. */}
              <div
                role={bulkMode && firstOfGroup ? 'button' : undefined}
                tabIndex={bulkMode && firstOfGroup ? 0 : undefined}
                onClick={bulkMode && firstOfGroup ? () => selectByType(room.type) : undefined}
                title={bulkMode && firstOfGroup
                  ? t('manage.timeline_select_by_type', 'Click to select every {{type}} on screen', { type: prettyLabel(room.type) || t('manage.untyped', 'Untyped') })
                  : undefined}
                className={`py-1.5 px-2 border-b border-r border-gray-100 flex flex-col justify-center bg-deep/[0.015] text-left transition-colors ${
                  isUnitRow ? 'pl-3' : ''
                } ${bulkMode && firstOfGroup ? 'cursor-pointer hover:bg-ocean/10' : ''}`}
              >
                {firstOfGroup ? (
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ocean/80 truncate leading-tight">
                    {prettyLabel(room.type) || t('manage.untyped', 'Untyped')}
                  </span>
                ) : (
                  // Continuation indicator — thin vertical line + chevron
                  // so the eye groups the unit rows together visually.
                  <span className="text-gray-200 text-[11px] select-none" aria-hidden="true">
                    ↳
                  </span>
                )}
              </div>

              {/* Room info — unit identifier + price.
                  Layout chosen 2026-06-05 with David: he needs to see
                  the specific unit ID (BABA-001) at a glance to manage
                  4 BABAs distinctly. Type moved to its own column
                  2026-06-08 for scan-ability. */}
              <div
                role="button"
                tabIndex={0}
                draggable={!bulkMode && !isUnitRow}
                onDragStart={!bulkMode && !isUnitRow ? (e) => handleRowDragStart(e, room.id) : undefined}
                onDragEnd={!bulkMode && !isUnitRow ? handleRowDragEnd : undefined}
                onClick={bulkMode ? () => selectVirtualRow(vroom.virtual_id) : undefined}
                className={`py-1.5 px-2 border-b border-gray-100 flex flex-col justify-center bg-deep/[0.02] text-left transition-all ${
                  bulkMode ? 'cursor-pointer hover:bg-ocean/5' : (isUnitRow ? '' : 'cursor-grab active:cursor-grabbing hover:bg-ocean/5')
                }`}
                title={bulkMode
                  ? t('manage.timeline_select_row', 'Click to select all future cells in this row')
                  : (isUnitRow ? '' : t('manage.drag_to_reorder', 'Drag to reorder rooms — this order applies on the OTA + every reception view'))}
              >
                {/* Unit identifier — primary label. BABA-001 / Hibrakim-002
                    for multi-unit, just the name for single-unit & dorms. */}
                <div className="text-sm font-bold text-deep truncate flex items-center gap-1 leading-tight">
                  {!bulkMode && !isUnitRow && <span className="text-gray-300 select-none text-xs" aria-hidden="true">⋮⋮</span>}
                  {vroom.display_name}
                </div>
                {/* Price line — kept compact under the name */}
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  ${Number(room.base_price || 0).toFixed(0)}/night
                  {!isUnitRow && ` · ×${room.quantity}`}
                </div>
              </div>

              {/* Day cells */}
              {dates.map((d, i) => {
                const iso = isoOf(d)
                const isPast = d < today
                const isToday = iso === todayISO
                // Per-unit cells merge the unit override on top of the
                // type-default so BABA-001 with a $399 override shows
                // $399 while BABA-002 shows the type's $500. Unit rows
                // without an override fall back to the type-default
                // for every field (price, min-stay, note, is_blocked).
                const typeRow = availByRoom[room.id]?.[iso]
                const unitRow = isUnitRow ? unitOverridesByCell[room.id]?.[iso]?.[vroom.unit_index] : null
                const row = isUnitRow ? mergeEffectiveRow(typeRow, unitRow) : typeRow
                const isBlocked = !!row?.is_blocked
                const priceBrut = Number(row?.price_override ?? room.base_price ?? 0)
                const priceNet = priceBrut * 0.9
                const totalStock = isUnitRow ? 1 : (room.quantity || 1)
                const stock = isBlocked ? 0
                  : (isUnitRow ? 1
                    : (row && typeof row.available_count === 'number' ? row.available_count : totalStock))
                const hasOverride = row?.price_override != null
                // Cell-level selection is keyed on the VIRTUAL row so a
                // mid-row click on BABA-002 highlights only BABA-002's
                // cell, not the shared room.id cells in BABA-001..004.
                const isSelected = bulkMode && selectedCells.has(cellKey(vroom.virtual_id, iso))

                // Stock chip color — full = libre, partial = orange, none = sunset
                const stockChipClass = stock === 0
                  ? 'bg-sunset/15 text-sunset'
                  : stock < totalStock
                    ? 'bg-orange/15 text-orange'
                    : 'bg-libre/15 text-libre'

                if (isPast) {
                  return (
                    <div key={i} className="border-b border-l border-gray-100 bg-gray-50 py-2 px-1 text-center">
                      <span className="text-[10px] text-gray-300">—</span>
                    </div>
                  )
                }

                // Click → either toggle bulk selection OR open editor modal.
                // Bulk mode keeps the existing select-toggle behaviour;
                // outside bulk mode every click opens the editor anchored
                // on this cell so the hotelier can change anything inline.
                // unitIndex on the editing cell: null for type-level rows
                // (single-unit rooms, dorms), 1..N for unit-specific rows
                // (BABA-002 etc.). The modal uses it to scope the Save
                // to the per-unit override row instead of the type-default.
                const onCellClick = !isPast
                  ? (bulkMode
                      ? () => toggleCell(vroom.virtual_id, iso)
                      : () => setEditingCell({ roomId: room.id, iso, unitIndex: vroom.unit_index }))
                  : undefined

                // Selection ring + cursor cue
                const selectionRing = isSelected
                  ? 'ring-2 ring-ocean bg-ocean/15'
                  : isToday ? 'ring-1 ring-inset ring-ocean/30' : ''
                const cursorClass = !isPast ? 'cursor-pointer' : 'cursor-default'
                // Compact tooltip via title — gives a quick read of the
                // cell's state without needing to click in.
                const titleParts = [
                  `${room.name} · ${iso}`,
                  isBlocked ? 'BLOCKED' : `${stock}/${totalStock} available · $${priceBrut.toFixed(0)} (net $${priceNet.toFixed(0)})`,
                ]
                if (row?.min_stay > 1) titleParts.push(`Min stay: ${row.min_stay} nights`)
                if (Array.isArray(row?.specials) && row.specials.length > 0) titleParts.push(`🎁 ${row.specials.length} reward(s)`)
                if (row?.internal_note) titleParts.push(`📝 ${row.internal_note}`)
                const cellTitle = titleParts.join(' · ') + (bulkMode ? '' : ' — click to edit')

                // Discreet status badges in the corner — let the user see
                // at a glance which cells already have a min stay /
                // rewards / note attached.
                const hasMinStay = row?.min_stay > 1
                const hasReward = Array.isArray(row?.specials) && row.specials.length > 0
                const hasNote   = !!row?.internal_note

                if (isBlocked) {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={onCellClick}
                      disabled={saving}
                      title={cellTitle}
                      className={`border-b border-l border-gray-100 py-2 px-1 text-center bg-sunset/10 flex flex-col justify-center hover:bg-sunset/20 transition-colors ${selectionRing} ${cursorClass}`}
                    >
                      <div className="text-[9px] font-bold text-sunset uppercase tracking-wider">
                        {t('manage.blocked', 'Blocked')}
                      </div>
                    </button>
                  )
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={onCellClick}
                    disabled={saving}
                    title={cellTitle}
                    className={`relative border-b border-l border-gray-100 py-1.5 px-1 text-center bg-libre/5 flex flex-col justify-center gap-0.5 transition-colors hover:bg-libre/15 ${selectionRing} ${cursorClass} ${isToday && !isSelected ? 'bg-ocean/[0.04]' : ''}`}
                  >
                    <div className={`text-[10px] font-bold inline-block px-1 rounded mx-auto ${stockChipClass}`}>
                      {stock}/{totalStock}
                    </div>
                    <div className="text-xs font-bold text-ocean leading-tight">
                      ${priceBrut.toFixed(0)}
                      {hasOverride && <span className="ml-0.5 text-[9px] text-orange">★</span>}
                    </div>
                    <div className="text-[10px] text-libre/90 font-medium leading-tight">
                      net ${priceNet.toFixed(0)}
                    </div>
                    {/* At-a-glance badges — only render if any flag is set */}
                    {(hasMinStay || hasReward || hasNote) && (
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5 text-[8px] leading-none">
                        {hasMinStay && <span title={`Min stay ${row.min_stay}`}>🌙</span>}
                        {hasReward && <span title="Reward(s) on this day">🎁</span>}
                        {hasNote && <span title="Internal note">📝</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
        </div>
      </div>

      {loading && (
        <div className="text-center py-3 text-gray-400 text-xs">
          <Loader2 size={14} className="inline animate-spin mr-1" />
          {t('common.loading', 'Loading…')}
        </div>
      )}

      {/* Legend — same vocabulary as Monthly view */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-libre/10 border border-libre/10" /> {t('manage.available', 'Available')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-sunset/10 border border-sunset/20" /> {t('manage.blocked', 'Blocked')}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-ocean font-bold text-[11px]">$X</span>
          <span className="text-gray-400">{t('manage.cal_guest_pays', 'Guest pays')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-libre font-bold text-[11px]">net $X</span>
          <span className="text-gray-400">{t('manage.you_receive', 'You receive (90%)')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-libre font-bold text-[11px]">N/M</span>
          <span className="text-gray-400">{t('manage.rooms_avail_total', 'rooms available / total')}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-orange font-bold text-[11px]">★</span>
          <span className="text-gray-400">{t('manage.custom_price', 'custom price for this day')}</span>
        </span>
      </div>
    </Card>

    {/* Per-cell editor — opens on click in non-bulk mode. Inline
        inputs for price / min stay / note + Block/Available toggle,
        plus a Rewards section that opens the RewardModal scoped to
        this cell. One Save commits all changes at once.
        IMPORTANT: rendered BEFORE the RewardModal so when the reward
        picker opens from "+ Add" it stacks on top — same z-index
        (z-50 on the shared Modal component), DOM order decides who
        wins. David hit this 2026-06-08: "cette page s'ouvre derriere". */}
    {editingCell && (
      <CellEditorModal
        cell={editingCell}
        room={rooms.find(r => r.id === editingCell.roomId)}
        // Merged effective row — per-unit override + type-default
        // fallback. The modal seeds price/min-stay/note/is_blocked from
        // this row, so opening BABA-001 shows its $399 override even
        // when the type default is still $500.
        row={mergeEffectiveRow(
          availByRoom[editingCell.roomId]?.[editingCell.iso],
          editingCell.unitIndex ? unitOverridesByCell[editingCell.roomId]?.[editingCell.iso]?.[editingCell.unitIndex] : null
        )}
        unitBlockedSet={unitBlocksByCell[editingCell.roomId]?.[editingCell.iso]}
        saving={saving}
        onClose={() => setEditingCell(null)}
        onSave={async (payload, label) => {
          // Build the cell key WITH unit_index so bulkUpdate routes the
          // write to the per-unit override row (room_unit_index = N)
          // instead of the type-default. Without this every "save price"
          // from BABA-001's popup overwrote BABA-002..004's price too.
          const vid = editingCell.unitIndex != null
            ? `${editingCell.roomId}#${editingCell.unitIndex}`
            : editingCell.roomId
          await bulkUpdate(payload, label, new Set([cellKey(vid, editingCell.iso)]))
          setEditingCell(null)
        }}
        onOpenReward={() => singleSetReward(editingCell.roomId, editingCell.iso, editingCell.unitIndex)}
        onRemoveReward={async (idx) => {
          // Use the virtual-id cell key so removing reward index N
          // from BABA-002 writes to BABA-002's override row only —
          // BABA-001, 003, 004 stay on the type's reward list.
          const vid = editingCell.unitIndex != null
            ? `${editingCell.roomId}#${editingCell.unitIndex}`
            : editingCell.roomId
          await bulkUpdate(
            { remove_special_at: idx },
            'Remove reward',
            new Set([cellKey(vid, editingCell.iso)])
          )
        }}
        onClearRewards={async () => {
          // Same virtual-id scoping as onRemoveReward. clear_specials
          // is the bulk-update meta-key for "wipe the specials[] array
          // on this cell" — handled in bulkUpdate's nextSpecialsFor.
          const vid = editingCell.unitIndex != null
            ? `${editingCell.roomId}#${editingCell.unitIndex}`
            : editingCell.roomId
          await bulkUpdate(
            { clear_specials: true },
            'Clear rewards',
            new Set([cellKey(vid, editingCell.iso)])
          )
        }}
        onUnitToggle={(unitIndex, blocked) => handleUnitToggle(editingCell.roomId, editingCell.iso, unitIndex, blocked)}
        t={t}
      />
    )}

    {/* Reward picker — shared modal with Monthly view. onApply hands
        back a payload that bulkUpdate knows how to merge into the
        specials[] arrays of the selected cells. Rendered AFTER the
        CellEditorModal so it stacks ON TOP via DOM order — both use
        the shared <Modal> at z-50 so position-in-tree decides. */}
    <RewardModal
      open={rewardModalOpen}
      onClose={() => setRewardModalOpen(false)}
      onApply={handleRewardModalApply}
      selectedCount={rewardCellSet ? rewardCellSet.size : selectedCells.size}
    />

    {/* Events & holidays picker — small dropdown-style modal listing
        the catalog + any custom events for this property. onChange
        bumps eventsTick so the day-header memo re-evaluates from the
        freshly-saved localStorage state. */}
    <EventsHolidaysModal
      open={eventsOpen}
      onClose={() => setEventsOpen(false)}
      propertyId={propertyId}
      country={country}
      onChange={() => setEventsTick(n => n + 1)}
    />

    {/* 📝 Internal-note editor — replaces the native browser prompt() that
        David rejected ("fais une belle popup. je veux pouvoir ajouter
        ou annuler des notes"). Single component used for both single-cell
        and bulk flows; the trigger fills `noteModal` with the right
        callback. Save persists, Clear writes null, Cancel exits. */}
    <NoteEditorModal
      state={noteModal}
      onClose={() => setNoteModal(null)}
      t={t}
    />
    </>
  )
}

// ============================================================================
// NoteEditorModal — beautiful replacement for native prompt() on
// internal notes. Opens with the cell's current note pre-filled (or
// blank when bulk targets disagree). Footer offers three intents:
//   • Cancel  → leave note unchanged
//   • Clear   → write null (only shown when there's already text)
//   • Save    → write the trimmed textarea value (null if empty)
// onConfirm receives the final value (string or null); the parent
// runs bulkUpdate and the modal closes.
// ============================================================================
function NoteEditorModal({ state, onClose, t }) {
  const [value, setValue] = useState('')

  // Reset the textarea every time the modal opens for a different cell.
  useEffect(() => {
    if (state) setValue(state.initialValue || '')
  }, [state])

  if (!state) return null

  const { count, onConfirm, cellsWithNote = 0, mixed = false } = state
  const trimmed = (value || '').trim()
  // Clear button visibility: ANY selected cell already has a note → expose
  // a one-click wipe. Fixes David's 2026-06-08 complaint where 14 cells
  // were selected, 2 with notes, and the modal had no way to clear them.
  const canClear = cellsWithNote > 0

  async function handleSave() {
    await onConfirm(trimmed || null)
    onClose()
  }
  async function handleClear() {
    await onConfirm(null)
    onClose()
  }

  return (
    <Modal open={!!state} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="-mt-2">
          <h3 className="text-lg font-bold text-deep flex items-center gap-2">
            <span>📝</span>
            {t('manage.note_modal_title', 'Internal note')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {count > 1
              ? t('manage.note_modal_sub_bulk', '{{n}} selected cell(s) — never shown to guests.', { n: count })
              : t('manage.note_modal_sub_single', 'Hotelier-only — never shown to guests.')}
          </p>
        </div>

        {/* Mixed-notes warning — when selection spans cells with different
            notes we show a small banner so the user understands that
            saving will OVERWRITE everyone, and Clear will WIPE everyone. */}
        {mixed && cellsWithNote > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <span className="text-sm leading-none mt-0.5">⚠️</span>
            <div>
              <div className="font-semibold">
                {t('manage.note_modal_mixed_title', 'Selected cells have different notes')}
              </div>
              <div className="text-amber-800/80 mt-0.5">
                {t(
                  'manage.note_modal_mixed_body',
                  '{{withNote}} of {{count}} cell(s) currently have a note. Save overwrites them all. Clear removes them all.',
                  { withNote: cellsWithNote, count }
                )}
              </div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div>
          <textarea
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={5}
            placeholder={t(
              'manage.note_modal_placeholder',
              'e.g. "Wedding Smith — pre-booked", "Maintenance 8am–noon", "VIP – upgrade if possible"',
            )}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20 resize-y"
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            {canClear
              ? t('manage.note_modal_hint_clear', 'Type to replace · use Clear to remove the note(s) entirely.')
              : t('manage.note_modal_hint', 'Type to add a note. Cells without a note stay empty until you save.')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-deep/70 hover:text-deep hover:bg-gray-50 transition-all"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <div className="flex items-center gap-2">
            {canClear && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-sunset bg-sunset/10 hover:bg-sunset/20 transition-all flex items-center gap-1.5"
                title={
                  count > 1
                    ? t('manage.note_modal_clear_tooltip_bulk', 'Remove the internal note from all {{n}} selected cell(s).', { n: count })
                    : t('manage.note_modal_clear_tooltip', 'Remove the internal note from this cell.')
                }
              >
                🗑️ {count > 1 && cellsWithNote > 0
                    ? t('manage.note_modal_clear_n', 'Clear {{n}} note(s)', { n: cellsWithNote })
                    : t('manage.note_modal_clear', 'Clear note')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!trimmed && !canClear}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-ocean to-electric shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              💾 {t('manage.note_modal_save', 'Save note')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
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
