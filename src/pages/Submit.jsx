import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Loader2, LinkIcon, Image, Upload, X, ChevronRight, ChevronLeft,
  Building2, MapPin, BedDouble, Wifi, Wind, Waves, Coffee, Car, Umbrella,
  Utensils, Dumbbell, Sparkles, Baby, Dog, Cigarette, Globe, Clock,
  Accessibility, Heart, Mountain, ShoppingBag, Camera, Music, Anchor,
  TreePine, Bike, Ship, Landmark, Phone, Mail, Star, Info, Map
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { AutocompleteInput } from '../components/ui/AutocompleteInput'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'
import { countries, thailandCities } from '../lib/countries'
import { currencies, getCurrency } from '../lib/currencies'

const propertyTypes = ['hotel', 'guesthouse', 'resort', 'villa', 'hostel', 'apartment', 'bungalow', 'homestay']

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024

// ── Services & Amenities ──────────────────────────────
const AMENITY_CATEGORIES = [
  {
    key: 'essentials', label: 'Essentials',
    items: [
      { key: 'wifi', icon: Wifi, label: 'Free WiFi' },
      { key: 'ac', icon: Wind, label: 'Air Conditioning' },
      { key: 'parking', icon: Car, label: 'Free Parking' },
      { key: 'breakfast', icon: Coffee, label: 'Breakfast Included' },
      { key: '24h_reception', icon: Clock, label: '24h Reception' },
      { key: 'luggage_storage', icon: ShoppingBag, label: 'Luggage Storage' },
    ],
  },
  {
    key: 'leisure', label: 'Leisure & Wellness',
    items: [
      { key: 'pool', icon: Waves, label: 'Swimming Pool' },
      { key: 'spa', icon: Sparkles, label: 'Spa & Massage' },
      { key: 'gym', icon: Dumbbell, label: 'Fitness Center' },
      { key: 'beach', icon: Umbrella, label: 'Beach Access' },
      { key: 'garden', icon: TreePine, label: 'Garden / Terrace' },
      { key: 'yoga', icon: Heart, label: 'Yoga / Meditation' },
    ],
  },
  {
    key: 'dining', label: 'Food & Drink',
    items: [
      { key: 'restaurant', icon: Utensils, label: 'Restaurant' },
      { key: 'bar', icon: Coffee, label: 'Bar / Lounge' },
      { key: 'room_service', icon: BedDouble, label: 'Room Service' },
      { key: 'minibar', icon: Coffee, label: 'Minibar' },
      { key: 'kitchen', icon: Utensils, label: 'Shared Kitchen' },
      { key: 'bbq', icon: Utensils, label: 'BBQ Facilities' },
    ],
  },
  {
    key: 'business', label: 'Business & Digital Nomad',
    items: [
      { key: 'coworking', icon: Globe, label: 'Coworking Space' },
      { key: 'meeting_room', icon: Building2, label: 'Meeting Room' },
      { key: 'printer', icon: Info, label: 'Printer / Scanner' },
      { key: 'fast_wifi', icon: Wifi, label: 'High-Speed WiFi (>50Mbps)' },
      { key: 'video_call_booth', icon: Camera, label: 'Video Call Booths' },
      { key: 'power_backup', icon: Info, label: 'Power Backup / UPS' },
    ],
  },
  {
    key: 'transport', label: 'Transport',
    items: [
      { key: 'airport_shuttle', icon: Car, label: 'Airport Shuttle' },
      { key: 'car_rental', icon: Car, label: 'Car / Motorbike Rental' },
      { key: 'bicycle', icon: Bike, label: 'Bicycle Rental' },
      { key: 'boat_transfer', icon: Ship, label: 'Boat Transfer' },
      { key: 'tour_desk', icon: Map, label: 'Tour Desk' },
    ],
  },
  {
    key: 'family', label: 'Family & Pets',
    items: [
      { key: 'kids_club', icon: Baby, label: 'Kids Club' },
      { key: 'babysitting', icon: Baby, label: 'Babysitting Service' },
      { key: 'playground', icon: Baby, label: 'Playground' },
      { key: 'pets_allowed', icon: Dog, label: 'Pets Allowed' },
      { key: 'family_rooms', icon: BedDouble, label: 'Family Rooms' },
    ],
  },
]

// ── Accessibility ──────────────────────────────────────
const ACCESSIBILITY_FEATURES = [
  { key: 'wheelchair_access', label: 'Wheelchair Accessible Entrance' },
  { key: 'wheelchair_rooms', label: 'Wheelchair Accessible Rooms' },
  { key: 'elevator', label: 'Elevator / Lift' },
  { key: 'ground_floor', label: 'Ground Floor Rooms Available' },
  { key: 'grab_bars', label: 'Grab Bars in Bathroom' },
  { key: 'roll_in_shower', label: 'Roll-in Shower' },
  { key: 'raised_toilet', label: 'Raised Toilet Seat' },
  { key: 'visual_aids', label: 'Visual Aids (Braille, Tactile)' },
  { key: 'hearing_aids', label: 'Hearing Aid Compatible' },
  { key: 'service_animals', label: 'Service Animals Welcome' },
  { key: 'wide_doorways', label: 'Wide Doorways (>80cm)' },
  { key: 'accessible_parking', label: 'Accessible Parking Spaces' },
  { key: 'pool_lift', label: 'Pool Lift / Ramp' },
  { key: 'staff_trained', label: 'Staff Trained in Accessibility' },
]

// ── Bed Types ──────────────────────────────────────────
const BED_TYPES = [
  { key: 'king', label: 'King Bed' },
  { key: 'queen', label: 'Queen Bed' },
  { key: 'double', label: 'Double Bed' },
  { key: 'twin', label: 'Twin Beds' },
  { key: 'single', label: 'Single Bed' },
  { key: 'bunk', label: 'Bunk Beds' },
  { key: 'sofa_bed', label: 'Sofa Bed' },
  { key: 'futon', label: 'Futon / Floor Mattress' },
  { key: 'water_bed', label: 'Water Bed' },
  { key: 'extra_bed', label: 'Extra Bed Available' },
  { key: 'crib', label: 'Baby Crib / Cot' },
]

// ── Attractions ────────────────────────────────────────
const ATTRACTION_TYPES = [
  { key: 'beach_nearby', icon: Umbrella, label: 'Beach Nearby' },
  { key: 'temple', icon: Landmark, label: 'Temple / Cultural Site' },
  { key: 'night_market', icon: ShoppingBag, label: 'Night Market' },
  { key: 'national_park', icon: Mountain, label: 'National Park / Hiking' },
  { key: 'diving', icon: Anchor, label: 'Diving / Snorkeling' },
  { key: 'waterfall', icon: Waves, label: 'Waterfall' },
  { key: 'viewpoint', icon: Camera, label: 'Scenic Viewpoint' },
  { key: 'nightlife', icon: Music, label: 'Nightlife / Bars' },
  { key: 'cooking_class', icon: Utensils, label: 'Cooking Classes' },
  { key: 'elephant_sanctuary', icon: Heart, label: 'Elephant Sanctuary' },
  { key: 'muay_thai', icon: Dumbbell, label: 'Muay Thai / Sports' },
  { key: 'island_hopping', icon: Ship, label: 'Island Hopping' },
]

// ── Steps ──────────────────────────────────────────────
const STEPS = [
  { key: 'basics', label: 'Basic Info', icon: Building2 },
  { key: 'photos', label: 'Photos', icon: Image },
  { key: 'amenities', label: 'Services', icon: Sparkles },
  { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { key: 'specials', label: 'Specials', icon: Star },
  { key: 'location', label: 'Location & Map', icon: MapPin },
]

function extractNameFromBookingUrl(url) {
  try {
    const match = url.match(/booking\.com\/hotel\/[a-z]{2}\/([^./]+)/)
    if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  } catch {}
  return null
}

function extractCountryFromBookingUrl(url) {
  try {
    const match = url.match(/booking\.com\/hotel\/([a-z]{2})\//)
    if (match && match[1] === 'th') return 'Thailand'
  } catch {}
  return null
}

// ── Checkbox Grid ──────────────────────────────────────
function CheckboxGrid({ items, selected, onToggle, columns = 2 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
      {items.map(item => {
        const Icon = item.icon
        const isChecked = selected.includes(item.key)
        return (
          <button key={item.key} type="button" onClick={() => onToggle(item.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
              isChecked
                ? 'border-ocean bg-ocean/5 text-ocean'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {Icon && <Icon size={18} className={isChecked ? 'text-ocean' : 'text-gray-400'} />}
            <span className="flex-1">{item.label}</span>
            {isChecked && <CheckCircle size={16} className="text-ocean flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Component ──────────────────────────────────────────
export default function Submit() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', type: 'hotel', country: '', city: '', currency: 'USD',
    booking_link: '', airbnb_link: '',
    room_count: '', avg_nightly_rate: '', star_rating: '3',
    contact_email: user?.email || '', contact_phone: '', website: '',
    description: '',
    check_in_time: '14:00', check_out_time: '12:00',
    amenities: [],
    accessibility: [],
    bed_types: [],
    attractions: [],
    languages_spoken: ['en'],
    special_requests: '',
    cancellation_policy: 'flexible',
    smoking_policy: 'no_smoking',
    lat: '', lng: '', address: '',
  })

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleArrayField(field, key) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(key)
        ? prev[field].filter(k => k !== key)
        : [...prev[field], key],
    }))
  }

  async function handleLinkPaste(field, value) {
    updateField(field, value)
    if (!value) return
    const isBooking = value.includes('booking.com')
    const isAirbnb = value.includes('airbnb.com')
    if (isBooking || isAirbnb) {
      setParsing(true)
      trackEvent(EVENTS.LINK_PARSE, { type: isBooking ? 'booking' : 'airbnb' })
      await new Promise(r => setTimeout(r, 1500))
      if (isBooking) {
        const name = extractNameFromBookingUrl(value)
        if (name && !form.name) updateField('name', name)
        const country = extractCountryFromBookingUrl(value)
        if (country && !form.country) updateField('country', country)
      }
      setParsing(false)
    }
  }

  function handlePhotoSelect(e) {
    setPhotoError('')
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > MAX_PHOTOS) {
      setPhotoError(`You can upload up to ${MAX_PHOTOS} photos`); return
    }
    if (files.find(f => f.size > MAX_FILE_SIZE)) {
      setPhotoError('Each photo must be under 5MB'); return
    }
    if (files.find(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) {
      setPhotoError('Only JPG, PNG, and WebP files are accepted'); return
    }
    setPhotos(prev => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index) { setPhotos(prev => prev.filter((_, i) => i !== index)); setPhotoError('') }

  async function uploadPhotos(propertyId) {
    const urls = []
    const failures = []
    for (const file of photos) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `properties/${propertyId}/${filename}`
      const { error } = await supabase.storage.from('property-photos').upload(path, file, { contentType: file.type })
      if (error) {
        // Don't swallow — surface the failure so the hotelier knows photos
        // didn't save. Common causes: bucket missing, RLS blocking,
        // file too large, MIME type rejected.
        console.error(`Photo upload failed for ${file.name}:`, error)
        failures.push(`${file.name}: ${error.message}`)
        continue
      }
      const { data } = supabase.storage.from('property-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    if (failures.length > 0) {
      throw new Error(
        `Photo upload failed (${failures.length}/${photos.length}):\n` +
        failures.join('\n') +
        '\n\nThe property was saved without photos. Edit the property to add them once the issue is resolved.'
      )
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) { navigate('/register'); return }
    setError('')
    setLoading(true)
    try {
      const { data, error: insertErr } = await supabase.from('properties').insert({
        user_id: user.id,
        // Basic
        name: form.name, type: form.type, country: form.country, city: form.city,
        currency: (form.currency || 'USD').toUpperCase(),
        booking_link: form.booking_link || null, airbnb_link: form.airbnb_link || null,
        room_count: Number(form.room_count) || 1,
        avg_nightly_rate: Number(form.avg_nightly_rate) || 0,
        star_rating: Number(form.star_rating) || 3,
        description: form.description || null,
        website: form.website || null,
        // Contact
        contact_email: form.contact_email, contact_phone: form.contact_phone || null,
        // Location
        address: form.address || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        // Operations
        check_in_time: form.check_in_time || '14:00',
        check_out_time: form.check_out_time || '12:00',
        // Services & features
        amenities: form.amenities || [],
        accessibility: form.accessibility || [],
        bed_types: form.bed_types || [],
        attractions: form.attractions || [],
        languages_spoken: form.languages_spoken?.length ? form.languages_spoken : ['en'],
        // Policies
        special_requests: form.special_requests || null,
        cancellation_policy: form.cancellation_policy || 'flexible',
        smoking_policy: form.smoking_policy || 'no_smoking',
      }).select('id').single()
      if (insertErr) throw insertErr

      if (photos.length > 0 && data?.id) {
        const photoUrls = await uploadPhotos(data.id)
        if (photoUrls.length > 0) {
          await supabase.from('properties').update({ photo_urls: photoUrls }).eq('id', data.id)
        }
      }
      trackEvent(EVENTS.PROPERTY_SUBMIT)
      setSubmitted(true)
    } catch (err) {
      console.error('Submit failed:', err)
      setError(err?.message || t('property.error', 'Registration failed. Please check all required fields and try again.'))
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle size={64} className="mx-auto text-emerald-500 mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('property.success_title', 'Property Registered!')}</h2>
        <p className="text-gray-500 mb-8">{t('property.success_message', 'Your property is being reviewed. You\'ll be notified once approved.')}</p>
        <Button onClick={() => navigate('/dashboard')}>{t('property.success_cta', 'Go to Dashboard')}</Button>
      </div>
    )
  }

  const canProceed = () => {
    if (step === 0) return form.name && form.type && form.country && form.city && form.room_count
    return true
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t('property.title', 'Register Your Property')}</h1>
        <p className="text-gray-500">{t('property.subtitle', 'Join the STAYLO network — free registration, 10% commission only')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <button key={s.key} onClick={() => i <= step && setStep(i)} type="button"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive ? 'bg-ocean text-white shadow-lg shadow-ocean/20' :
                isDone ? 'bg-ocean/10 text-ocean' :
                'bg-gray-100 text-gray-400'
              }`}>
              <Icon size={14} />
              <span className="hidden sm:inline">{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="ml-1 text-gray-300" />}
            </button>
          )
        })}
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit}>

          {/* ── Step 1: Basics ──────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} className="text-ocean" /> Basic Information
              </h2>

              {/* Smart link */}
              <div className="bg-ocean/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ocean">
                  <LinkIcon size={16} /> Paste your existing listing URL to auto-fill
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Booking.com URL" placeholder="https://www.booking.com/hotel/..."
                    value={form.booking_link} onChange={e => handleLinkPaste('booking_link', e.target.value)} />
                  <Input label="Airbnb URL" placeholder="https://www.airbnb.com/rooms/..."
                    value={form.airbnb_link} onChange={e => handleLinkPaste('airbnb_link', e.target.value)} />
                </div>
                {parsing && (
                  <div className="flex items-center gap-2 text-sm text-ocean">
                    <Loader2 size={16} className="animate-spin" /> Fetching property info...
                  </div>
                )}
              </div>

              <Input label="Property Name *" placeholder="e.g., Sunset Beach Resort" required
                value={form.name} onChange={e => updateField('name', e.target.value)} />

              <div className="grid grid-cols-2 gap-4">
                <Select label="Property Type *" value={form.type} onChange={e => updateField('type', e.target.value)}>
                  {propertyTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </Select>
                <Select label="Star Rating" value={form.star_rating} onChange={e => updateField('star_rating', e.target.value)}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AutocompleteInput label="Country *" placeholder="Start typing..." options={countries}
                  value={form.country} onChange={v => updateField('country', v)} />
                <AutocompleteInput label="City *" placeholder="City name" value={form.city}
                  options={form.country === 'Thailand' ? thailandCities : []} onChange={v => updateField('city', v)} />
              </div>

              <Input label="Street Address" placeholder="123 Beach Road, Soi 4..."
                value={form.address} onChange={e => updateField('address', e.target.value)} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input label="Total Rooms *" type="number" min={1} required
                  value={form.room_count} onChange={e => updateField('room_count', e.target.value)} />
                <Select label="Currency *" value={form.currency} onChange={e => updateField('currency', e.target.value)}>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </Select>
                <Input label={`Avg. Nightly Rate (${getCurrency(form.currency).symbol}) *`} type="number" min={0} step="0.01" required
                  value={form.avg_nightly_rate} onChange={e => updateField('avg_nightly_rate', e.target.value)} />
                <Input label="Website" placeholder="https://..." type="url"
                  value={form.website} onChange={e => updateField('website', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Contact Email *" type="email" required
                  value={form.contact_email} onChange={e => updateField('contact_email', e.target.value)} />
                <Input label="Phone" type="tel"
                  value={form.contact_phone} onChange={e => updateField('contact_phone', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
                  rows={4} maxLength={2000} placeholder="Describe your property, its location, what makes it special..."
                  value={form.description} onChange={e => updateField('description', e.target.value)} />
                <p className="text-xs text-gray-400 text-right">{form.description.length}/2000</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Photos ─────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Image size={20} className="text-ocean" /> Property Photos
              </h2>
              <p className="text-sm text-gray-500">Upload up to {MAX_PHOTOS} photos. Show your best rooms, lobby, pool, restaurant, views... First photo will be the cover image.</p>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {photos.map((file, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-ocean text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded z-10">Cover</span>
                      )}
                      <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 px-4 py-8 w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-ocean/50 text-gray-400 hover:text-ocean transition-colors">
                  <Upload size={32} />
                  <span className="text-sm font-medium">
                    {photos.length === 0 ? 'Click to upload photos' : `Add more (${photos.length}/${MAX_PHOTOS})`}
                  </span>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP — max 5MB each</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotoSelect} />
              {photoError && <p className="text-sm text-red-500">{photoError}</p>}
            </div>
          )}

          {/* ── Step 3: Amenities ──────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-ocean" /> Services & Amenities
              </h2>
              <p className="text-sm text-gray-500">Select all services and amenities your property offers. This helps guests find the perfect match.</p>

              {AMENITY_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{cat.label}</h3>
                  <CheckboxGrid items={cat.items} selected={form.amenities}
                    onToggle={key => toggleArrayField('amenities', key)} columns={2} />
                </div>
              ))}

              {/* Check-in / Check-out times */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Policies</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input label="Check-in Time" type="time" value={form.check_in_time}
                    onChange={e => updateField('check_in_time', e.target.value)} />
                  <Input label="Check-out Time" type="time" value={form.check_out_time}
                    onChange={e => updateField('check_out_time', e.target.value)} />
                  <Select label="Cancellation" value={form.cancellation_policy}
                    onChange={e => updateField('cancellation_policy', e.target.value)}>
                    <option value="flexible">Flexible</option>
                    <option value="moderate">Moderate (48h)</option>
                    <option value="strict">Strict (7 days)</option>
                    <option value="non_refundable">Non-refundable</option>
                  </Select>
                  <Select label="Smoking" value={form.smoking_policy}
                    onChange={e => updateField('smoking_policy', e.target.value)}>
                    <option value="no_smoking">No Smoking</option>
                    <option value="designated_areas">Designated Areas</option>
                    <option value="allowed">Allowed</option>
                  </Select>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Languages Spoken</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'en', label: '🇬🇧 English' }, { key: 'th', label: '🇹🇭 Thai' },
                    { key: 'fr', label: '🇫🇷 French' }, { key: 'de', label: '🇩🇪 German' },
                    { key: 'zh', label: '🇨🇳 Chinese' }, { key: 'ja', label: '🇯🇵 Japanese' },
                    { key: 'ru', label: '🇷🇺 Russian' }, { key: 'es', label: '🇪🇸 Spanish' },
                    { key: 'ko', label: '🇰🇷 Korean' }, { key: 'ar', label: '🇸🇦 Arabic' },
                  ].map(lang => (
                    <button key={lang.key} type="button" onClick={() => toggleArrayField('languages_spoken', lang.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        form.languages_spoken.includes(lang.key)
                          ? 'border-ocean bg-ocean/5 text-ocean'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Accessibility ──────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Accessibility size={20} className="text-ocean" /> Accessibility
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">
                  Accessibility matters. Providing accurate information helps guests with disabilities plan their stay with confidence. Please check all features your property offers.
                </p>
              </div>
              <CheckboxGrid items={ACCESSIBILITY_FEATURES.map(f => ({ ...f, icon: Accessibility }))}
                selected={form.accessibility} onToggle={key => toggleArrayField('accessibility', key)} columns={2} />
            </div>
          )}

          {/* ── Step 5: Specials ───────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Star size={20} className="text-ocean" /> Specials & Extras
              </h2>

              {/* Bed types */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Bed Types Available</h3>
                <CheckboxGrid items={BED_TYPES.map(b => ({ ...b, icon: BedDouble }))}
                  selected={form.bed_types} onToggle={key => toggleArrayField('bed_types', key)} columns={2} />
              </div>

              {/* Nearby attractions */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Nearby Attractions & Activities</h3>
                <p className="text-xs text-gray-500 mb-3">What can guests do or see near your property?</p>
                <CheckboxGrid items={ATTRACTION_TYPES} selected={form.attractions}
                  onToggle={key => toggleArrayField('attractions', key)} columns={2} />
              </div>

              {/* Special requests */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Special Requests & Notes</h3>
                <textarea className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
                  rows={4} maxLength={1000}
                  placeholder="Anything else guests should know? e.g., 'Late check-in available upon request', 'Honeymoon packages available', 'Airport pickup included for stays over 3 nights'..."
                  value={form.special_requests} onChange={e => updateField('special_requests', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Step 6: Location & Map ─────── */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-ocean" /> Location & Map
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" placeholder="e.g., 9.7489" type="number" step="any"
                  value={form.lat} onChange={e => updateField('lat', e.target.value)} />
                <Input label="Longitude" placeholder="e.g., 100.0143" type="number" step="any"
                  value={form.lng} onChange={e => updateField('lng', e.target.value)} />
              </div>

              <p className="text-xs text-gray-500">
                Tip: Find your coordinates on <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-ocean hover:underline">Google Maps</a> — right-click on your property and select "What's here?"
              </p>

              {/* Map preview */}
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                {form.lat && form.lng ? (
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.lng) - 0.01},${Number(form.lat) - 0.01},${Number(form.lng) + 0.01},${Number(form.lat) + 0.01}&layer=mapnik&marker=${form.lat},${form.lng}`}
                  />
                ) : (
                  <div className="h-[350px] flex flex-col items-center justify-center text-gray-400">
                    <Map size={48} className="mb-3" />
                    <p className="text-sm font-medium">Enter coordinates to preview your location on the map</p>
                    <p className="text-xs mt-1">The map will appear here automatically</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                  <CheckCircle size={16} /> Ready to Submit
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-emerald-700">
                  <span>Property: <strong>{form.name || '—'}</strong></span>
                  <span>Type: <strong>{form.type}</strong></span>
                  <span>Location: <strong>{form.city}, {form.country}</strong></span>
                  <span>Rooms: <strong>{form.room_count || '—'}</strong></span>
                  <span>Amenities: <strong>{form.amenities.length} selected</strong></span>
                  <span>Accessibility: <strong>{form.accessibility.length} features</strong></span>
                  <span>Photos: <strong>{photos.length} uploaded</strong></span>
                  <span>Attractions: <strong>{form.attractions.length} nearby</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ── Error ─────────────────────── */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* ── Navigation ─────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-ocean text-white hover:bg-ocean/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ocean/20">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <Button type="submit" disabled={loading} className="shadow-lg">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Register Property'}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Step {step + 1} of {STEPS.length} — {STEPS[step].label}
          </p>
        </form>
      </Card>
    </div>
  )
}
