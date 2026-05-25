import { useState, useRef, useMemo } from 'react'
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
import PhoneInput from '../components/ui/PhoneInput'

const propertyTypes = ['hotel', 'guesthouse', 'resort', 'villa', 'hostel', 'apartment', 'bungalow', 'homestay']

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024

// ── Services & Amenities ──────────────────────────────
// Static structure — labels translated at render time via t('submit.amenities.<key>', fallback)
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

// Languages spoken — static keys, labels translated at render time
const LANGUAGES_SPOKEN = [
  { key: 'en', flag: '🇬🇧', label: 'English' },
  { key: 'th', flag: '🇹🇭', label: 'Thai' },
  { key: 'fr', flag: '🇫🇷', label: 'French' },
  { key: 'de', flag: '🇩🇪', label: 'German' },
  { key: 'zh', flag: '🇨🇳', label: 'Chinese' },
  { key: 'ja', flag: '🇯🇵', label: 'Japanese' },
  { key: 'ru', flag: '🇷🇺', label: 'Russian' },
  { key: 'es', flag: '🇪🇸', label: 'Spanish' },
  { key: 'ko', flag: '🇰🇷', label: 'Korean' },
  { key: 'ar', flag: '🇸🇦', label: 'Arabic' },
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
    min_age: '',
    lat: '', lng: '', address: '',
  })

  // Translated arrays — rebuilt when language changes so labels track the locale
  const translatedAmenityCategories = useMemo(
    () => AMENITY_CATEGORIES.map(cat => ({
      ...cat,
      label: t(`submit.amenities.categories.${cat.key}`, cat.label),
      items: cat.items.map(item => ({
        ...item,
        label: t(`submit.amenities.items.${item.key}`, item.label),
      })),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )
  const translatedAccessibilityFeatures = useMemo(
    () => ACCESSIBILITY_FEATURES.map(f => ({
      ...f,
      label: t(`submit.accessibility_features.${f.key}`, f.label),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )
  const translatedBedTypes = useMemo(
    () => BED_TYPES.map(b => ({
      ...b,
      label: t(`submit.bed_types.${b.key}`, b.label),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )
  const translatedAttractions = useMemo(
    () => ATTRACTION_TYPES.map(a => ({
      ...a,
      label: t(`submit.attractions.${a.key}`, a.label),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

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
  }

  // ── Import-from-URL ──────────────────────────────────
  // Calls the import-listing edge function which fetches the URL on the
  // server side and extracts public Open Graph + schema.org metadata
  // (no scraping of proprietary data). Pre-fills as many fields as
  // possible and tells the user exactly what they still need to fill in.
  const [importUrl, setImportUrl] = useState('')
  const [importResult, setImportResult] = useState(null) // { success, extracted, message }

  async function handleImport() {
    const url = importUrl.trim()
    if (!url) return
    setParsing(true)
    setImportResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('import-listing', {
        body: { url },
      })
      if (error) {
        let detail = error.message
        try { const body = await error.context?.json?.(); detail = body?.detail || body?.error || detail } catch {}
        setImportResult({ success: false, message: detail })
        setParsing(false)
        return
      }
      // Pre-fill form with whatever we got, never overwriting non-empty user input
      const e = data
      const setIfEmpty = (field, value) => {
        if (value && !form[field]) updateField(field, value)
      }
      setIfEmpty('name', e.name)
      setIfEmpty('description', e.description)
      setIfEmpty('city', e.city)
      setIfEmpty('country', e.country)
      setIfEmpty('address', e.address)
      if (e.star_rating) setIfEmpty('star_rating', String(e.star_rating))
      if (e.type)        setIfEmpty('type', e.type)
      if (e.latitude)    setIfEmpty('lat', e.latitude)
      if (e.longitude)   setIfEmpty('lng', e.longitude)
      // Drop the URL into booking_link or airbnb_link based on source
      if (e.source === 'booking') setIfEmpty('booking_link', url)
      else if (e.source === 'airbnb') setIfEmpty('airbnb_link', url)

      setImportResult({ success: true, extracted: e })
      trackEvent(EVENTS.LINK_PARSE, { source: e.source })
    } catch (err) {
      setImportResult({ success: false, message: err?.message || t('submit.import.unknown_error', 'Unknown error') })
    } finally {
      setParsing(false)
    }
  }

  function handlePhotoSelect(e) {
    setPhotoError('')
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > MAX_PHOTOS) {
      setPhotoError(t('submit.photos.error_max_count', 'You can upload up to {{max}} photos', { max: MAX_PHOTOS })); return
    }
    if (files.find(f => f.size > MAX_FILE_SIZE)) {
      setPhotoError(t('submit.photos.error_too_large', 'Each photo must be under 5MB')); return
    }
    if (files.find(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) {
      setPhotoError(t('submit.photos.error_bad_type', 'Only JPG, PNG, and WebP files are accepted')); return
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
        t('submit.photos.upload_failed_header', 'Photo upload failed ({{failed}}/{{total}}):', { failed: failures.length, total: photos.length }) + '\n' +
        failures.join('\n') +
        '\n\n' + t('submit.photos.upload_failed_footer', 'The property was saved without photos. Edit the property to add them once the issue is resolved.')
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
        min_age: form.min_age ? Number(form.min_age) : null,
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
              <span className="hidden sm:inline">{t(`submit.steps.${s.key}`, s.label)}</span>
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
                <Building2 size={20} className="text-ocean" /> {t('submit.basics.heading', 'Basic Information')}
              </h2>

              {/* Smart link — Import from any listing URL.
                  Calls the import-listing edge function which extracts public
                  Open Graph + schema.org data (no proprietary scraping). */}
              <div className="bg-ocean/5 rounded-xl p-5 space-y-3 border border-ocean/15">
                <div className="flex items-start gap-2">
                  <LinkIcon size={18} className="text-ocean mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-deep">{t('submit.import.title', 'Already listed on Booking, Airbnb or another OTA?')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('submit.import.hint', "Paste the URL — we'll auto-fill what we can (name, location, cover photo, description) so you start from a populated form instead of a blank one.")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    placeholder={t('submit.import.url_placeholder', 'https://www.booking.com/hotel/... or https://www.airbnb.com/rooms/...')}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-deep focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  />
                  <Button onClick={handleImport} disabled={parsing || !importUrl.trim()}>
                    {parsing ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                    {parsing ? t('submit.import.fetching', 'Fetching…') : t('submit.import.button', 'Import')}
                  </Button>
                </div>

                {/* Import result — success or failure breakdown */}
                {importResult?.success && importResult.extracted && (
                  <div className="bg-libre/5 border border-libre/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-bold text-libre flex items-center gap-1.5">
                      ✅ {t('submit.import.success_from', 'Imported from {{source}}', { source: importResult.extracted.source })}
                    </p>
                    <div className="text-xs text-gray-700 space-y-0.5">
                      {importResult.extracted.name        && <div>✓ <strong>{t('submit.import.field_name', 'Name:')}</strong> {importResult.extracted.name}</div>}
                      {importResult.extracted.city        && <div>✓ <strong>{t('submit.import.field_city', 'City:')}</strong> {importResult.extracted.city}</div>}
                      {importResult.extracted.country     && <div>✓ <strong>{t('submit.import.field_country', 'Country:')}</strong> {importResult.extracted.country}</div>}
                      {importResult.extracted.address     && <div>✓ <strong>{t('submit.import.field_address', 'Address:')}</strong> {importResult.extracted.address}</div>}
                      {importResult.extracted.image_url   && <div>✓ <strong>{t('submit.import.field_cover_image', 'Cover image')}</strong> {t('submit.import.field_cover_image_suffix', '(preview below)')}</div>}
                      {importResult.extracted.star_rating && <div>✓ <strong>{t('submit.import.field_star_rating', 'Star rating:')}</strong> {importResult.extracted.star_rating}</div>}
                      {importResult.extracted.type        && <div>✓ <strong>{t('submit.import.field_type', 'Type:')}</strong> {importResult.extracted.type}</div>}
                    </div>
                    {importResult.extracted.image_url && (
                      <img src={importResult.extracted.image_url} alt={t('submit.import.cover_preview_alt', 'Cover preview')}
                        className="w-32 h-20 object-cover rounded border border-gray-200" />
                    )}
                    {importResult.extracted.manual_fields_needed?.length > 0 && (
                      <details className="pt-2 border-t border-libre/20">
                        <summary className="text-xs font-bold text-amber-700 cursor-pointer">
                          ⚠️ {t('submit.import.manual_fields_summary', '{{count}} fields you still need to fill in manually', { count: importResult.extracted.manual_fields_needed.length })}
                        </summary>
                        <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600 pl-4 list-disc">
                          {importResult.extracted.manual_fields_needed.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {importResult && !importResult.success && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                    <strong>{t('submit.import.failed_label', 'Import failed:')}</strong> {importResult.message}
                    <p className="text-red-600 mt-1">{t('submit.import.failed_hint', 'No worries — fill the form manually below. The URL is saved either way.')}</p>
                  </div>
                )}

                {/* Manual URL fields — kept so the link is stored even if import didn't run */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ocean/10">
                  <Input label={t('submit.basics.booking_url_label', 'Booking.com URL (optional)')} placeholder="https://www.booking.com/hotel/..."
                    value={form.booking_link} onChange={e => handleLinkPaste('booking_link', e.target.value)} />
                  <Input label={t('submit.basics.airbnb_url_label', 'Airbnb URL (optional)')} placeholder="https://www.airbnb.com/rooms/..."
                    value={form.airbnb_link} onChange={e => handleLinkPaste('airbnb_link', e.target.value)} />
                </div>
              </div>

              <Input label={t('submit.basics.name_label', 'Property Name *')} placeholder={t('submit.basics.name_placeholder', 'e.g., Sunset Beach Resort')} required
                value={form.name} onChange={e => updateField('name', e.target.value)} />

              <div className="grid grid-cols-2 gap-4">
                <Select label={t('submit.basics.type_label', 'Property Type *')} value={form.type} onChange={e => updateField('type', e.target.value)}>
                  {propertyTypes.map(tp => <option key={tp} value={tp}>{t(`submit.property_types.${tp}`, tp.charAt(0).toUpperCase() + tp.slice(1))}</option>)}
                </Select>
                <Select label={t('submit.basics.star_rating_label', 'Star Rating')} value={form.star_rating} onChange={e => updateField('star_rating', e.target.value)}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{t('submit.basics.star_option', '{{n}} Star', { count: n, n })}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AutocompleteInput label={t('submit.basics.country_label', 'Country *')} placeholder={t('submit.basics.country_placeholder', 'Start typing...')} options={countries}
                  value={form.country} onChange={v => updateField('country', v)} />
                <AutocompleteInput label={t('submit.basics.city_label', 'City *')} placeholder={t('submit.basics.city_placeholder', 'City name')} value={form.city}
                  options={form.country === 'Thailand' ? thailandCities : []} onChange={v => updateField('city', v)} />
              </div>

              <Input label={t('submit.basics.address_label', 'Street Address')} placeholder={t('submit.basics.address_placeholder', '123 Beach Road, Soi 4...')}
                value={form.address} onChange={e => updateField('address', e.target.value)} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input label={t('submit.basics.rooms_label', 'Total Rooms *')} type="number" min={1} required
                  value={form.room_count} onChange={e => updateField('room_count', e.target.value)} />
                <Select label={t('submit.basics.currency_label', 'Currency *')} value={form.currency} onChange={e => updateField('currency', e.target.value)}>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </Select>
                <Input label={t('submit.basics.avg_rate_label', 'Avg. Nightly Rate ({{symbol}}) *', { symbol: getCurrency(form.currency).symbol })} type="number" min={0} step="0.01" required
                  value={form.avg_nightly_rate} onChange={e => updateField('avg_nightly_rate', e.target.value)} />
                <Input label={t('submit.basics.website_label', 'Website')} placeholder="https://..." type="url"
                  value={form.website} onChange={e => updateField('website', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label={t('submit.basics.contact_email_label', 'Contact Email *')} type="email" required
                  value={form.contact_email} onChange={e => updateField('contact_email', e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('submit.basics.phone_label', 'Phone')}</label>
                  <PhoneInput value={form.contact_phone} onChange={v => updateField('contact_phone', v)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('submit.basics.description_label', 'Description')}</label>
                <textarea className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
                  rows={4} maxLength={2000} placeholder={t('submit.basics.description_placeholder', 'Describe your property, its location, what makes it special...')}
                  value={form.description} onChange={e => updateField('description', e.target.value)} />
                <p className="text-xs text-gray-400 text-right">{form.description.length}/2000</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Photos ─────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Image size={20} className="text-ocean" /> {t('submit.photos.heading', 'Property Photos')}
              </h2>
              <p className="text-sm text-gray-500">{t('submit.photos.hint', 'Upload up to {{max}} photos. Show your best rooms, lobby, pool, restaurant, views... First photo will be the cover image.', { max: MAX_PHOTOS })}</p>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {photos.map((file, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-ocean text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded z-10">{t('submit.photos.cover_badge', 'Cover')}</span>
                      )}
                      <img src={URL.createObjectURL(file)} alt={t('submit.photos.preview_alt', 'Preview {{n}}', { n: index + 1 })} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={t('submit.photos.remove_aria', 'Remove photo')}>
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
                    {photos.length === 0
                      ? t('submit.photos.upload_cta', 'Click to upload photos')
                      : t('submit.photos.add_more', 'Add more ({{count}}/{{max}})', { count: photos.length, max: MAX_PHOTOS })}
                  </span>
                  <span className="text-xs text-gray-400">{t('submit.photos.format_hint', 'JPG, PNG, WebP — max 5MB each')}</span>
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
                <Sparkles size={20} className="text-ocean" /> {t('submit.amenities.heading', 'Services & Amenities')}
              </h2>
              <p className="text-sm text-gray-500">{t('submit.amenities.hint', 'Select all services and amenities your property offers. This helps guests find the perfect match.')}</p>

              {translatedAmenityCategories.map(cat => (
                <div key={cat.key}>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{cat.label}</h3>
                  <CheckboxGrid items={cat.items} selected={form.amenities}
                    onToggle={key => toggleArrayField('amenities', key)} columns={2} />
                </div>
              ))}

              {/* Check-in / Check-out times */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">{t('submit.policies.heading', 'Policies')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input label={t('submit.policies.check_in_label', 'Check-in Time')} type="time" value={form.check_in_time}
                    onChange={e => updateField('check_in_time', e.target.value)} />
                  <Input label={t('submit.policies.check_out_label', 'Check-out Time')} type="time" value={form.check_out_time}
                    onChange={e => updateField('check_out_time', e.target.value)} />
                  <Select label={t('submit.policies.cancellation_label', 'Cancellation')} value={form.cancellation_policy}
                    onChange={e => updateField('cancellation_policy', e.target.value)}>
                    <option value="flexible">{t('submit.policies.cancellation.flexible', 'Flexible')}</option>
                    <option value="moderate">{t('submit.policies.cancellation.moderate', 'Moderate (48h)')}</option>
                    <option value="strict">{t('submit.policies.cancellation.strict', 'Strict (7 days)')}</option>
                    <option value="non_refundable">{t('submit.policies.cancellation.non_refundable', 'Non-refundable')}</option>
                  </Select>
                  <Select label={t('submit.policies.smoking_label', 'Smoking')} value={form.smoking_policy}
                    onChange={e => updateField('smoking_policy', e.target.value)}>
                    <option value="no_smoking">{t('submit.policies.smoking.no_smoking', 'No Smoking')}</option>
                    <option value="designated_areas">{t('submit.policies.smoking.designated_areas', 'Designated Areas')}</option>
                    <option value="allowed">{t('submit.policies.smoking.allowed', 'Allowed')}</option>
                  </Select>
                  <Select label={t('submit.policies.min_age_label', 'Minimum age')}
                    value={form.min_age || ''}
                    onChange={e => updateField('min_age', e.target.value)}>
                    <option value="">{t('submit.policies.min_age.all', 'All ages welcome')}</option>
                    <option value="16">{t('submit.policies.min_age.16', '16+ (teens & adults)')}</option>
                    <option value="18">{t('submit.policies.min_age.18', '18+ (adults only)')}</option>
                    <option value="21">{t('submit.policies.min_age.21', '21+ (party / adults)')}</option>
                    <option value="25">{t('submit.policies.min_age.25', '25+ (luxury)')}</option>
                  </Select>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{t('submit.languages.heading', 'Languages Spoken')}</h3>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES_SPOKEN.map(lang => (
                    <button key={lang.key} type="button" onClick={() => toggleArrayField('languages_spoken', lang.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        form.languages_spoken.includes(lang.key)
                          ? 'border-ocean bg-ocean/5 text-ocean'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {lang.flag} {t(`submit.languages.${lang.key}`, lang.label)}
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
                <Accessibility size={20} className="text-ocean" /> {t('submit.accessibility.heading', 'Accessibility')}
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">
                  {t('submit.accessibility.intro', 'Accessibility matters. Providing accurate information helps guests with disabilities plan their stay with confidence. Please check all features your property offers.')}
                </p>
              </div>
              <CheckboxGrid items={translatedAccessibilityFeatures.map(f => ({ ...f, icon: Accessibility }))}
                selected={form.accessibility} onToggle={key => toggleArrayField('accessibility', key)} columns={2} />
            </div>
          )}

          {/* ── Step 5: Specials ───────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Star size={20} className="text-ocean" /> {t('submit.specials.heading', 'Specials & Extras')}
              </h2>

              {/* Bed types */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{t('submit.specials.bed_types_heading', 'Bed Types Available')}</h3>
                <CheckboxGrid items={translatedBedTypes.map(b => ({ ...b, icon: BedDouble }))}
                  selected={form.bed_types} onToggle={key => toggleArrayField('bed_types', key)} columns={2} />
              </div>

              {/* Nearby attractions */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{t('submit.specials.attractions_heading', 'Nearby Attractions & Activities')}</h3>
                <p className="text-xs text-gray-500 mb-3">{t('submit.specials.attractions_hint', 'What can guests do or see near your property?')}</p>
                <CheckboxGrid items={translatedAttractions} selected={form.attractions}
                  onToggle={key => toggleArrayField('attractions', key)} columns={2} />
              </div>

              {/* Special requests */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{t('submit.specials.requests_heading', 'Special Requests & Notes')}</h3>
                <textarea className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
                  rows={4} maxLength={1000}
                  placeholder={t('submit.specials.requests_placeholder', "Anything else guests should know? e.g., 'Late check-in available upon request', 'Honeymoon packages available', 'Airport pickup included for stays over 3 nights'...")}
                  value={form.special_requests} onChange={e => updateField('special_requests', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Step 6: Location & Map ─────── */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-ocean" /> {t('submit.location.heading', 'Location & Map')}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input label={t('submit.location.latitude_label', 'Latitude')} placeholder={t('submit.location.latitude_placeholder', 'e.g., 9.7489')} type="number" step="any"
                  value={form.lat} onChange={e => updateField('lat', e.target.value)} />
                <Input label={t('submit.location.longitude_label', 'Longitude')} placeholder={t('submit.location.longitude_placeholder', 'e.g., 100.0143')} type="number" step="any"
                  value={form.lng} onChange={e => updateField('lng', e.target.value)} />
              </div>

              <p className="text-xs text-gray-500">
                {t('submit.location.tip_prefix', 'Tip: Find your coordinates on')} <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-ocean hover:underline">{t('submit.location.google_maps', 'Google Maps')}</a> {t('submit.location.tip_suffix', '— right-click on your property and select "What\'s here?"')}
              </p>

              {/* Map preview */}
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                {form.lat && form.lng ? (
                  <iframe
                    title={t('submit.location.iframe_title', 'Property Location')}
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
                    <p className="text-sm font-medium">{t('submit.location.placeholder_main', 'Enter coordinates to preview your location on the map')}</p>
                    <p className="text-xs mt-1">{t('submit.location.placeholder_sub', 'The map will appear here automatically')}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                  <CheckCircle size={16} /> {t('submit.summary.heading', 'Ready to Submit')}
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-emerald-700">
                  <span>{t('submit.summary.property', 'Property:')} <strong>{form.name || '—'}</strong></span>
                  <span>{t('submit.summary.type', 'Type:')} <strong>{t(`submit.property_types.${form.type}`, form.type)}</strong></span>
                  <span>{t('submit.summary.location', 'Location:')} <strong>{form.city}, {form.country}</strong></span>
                  <span>{t('submit.summary.rooms', 'Rooms:')} <strong>{form.room_count || '—'}</strong></span>
                  <span>{t('submit.summary.amenities', 'Amenities:')} <strong>{t('submit.summary.selected', '{{count}} selected', { count: form.amenities.length })}</strong></span>
                  <span>{t('submit.summary.accessibility', 'Accessibility:')} <strong>{t('submit.summary.features', '{{count}} features', { count: form.accessibility.length })}</strong></span>
                  <span>{t('submit.summary.photos', 'Photos:')} <strong>{t('submit.summary.uploaded', '{{count}} uploaded', { count: photos.length })}</strong></span>
                  <span>{t('submit.summary.attractions', 'Attractions:')} <strong>{t('submit.summary.nearby', '{{count}} nearby', { count: form.attractions.length })}</strong></span>
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
                <ChevronLeft size={16} /> {t('submit.nav.back', 'Back')}
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-ocean text-white hover:bg-ocean/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ocean/20">
                {t('submit.nav.next', 'Next')} <ChevronRight size={16} />
              </button>
            ) : (
              <Button type="submit" disabled={loading} className="shadow-lg">
                {loading ? <><Loader2 size={16} className="animate-spin" /> {t('submit.nav.submitting', 'Submitting...')}</> : t('submit.nav.register', 'Register Property')}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            {t('submit.nav.step_counter', 'Step {{current}} of {{total}} — {{label}}', { current: step + 1, total: STEPS.length, label: t(`submit.steps.${STEPS[step].key}`, STEPS[step].label) })}
          </p>
        </form>
      </Card>
    </div>
  )
}
