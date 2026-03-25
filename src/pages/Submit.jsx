import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, LinkIcon, Image, Upload, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { AutocompleteInput } from '../components/ui/AutocompleteInput'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'
import { countries, thailandCities } from '../lib/countries'

const propertyTypes = ['hotel', 'guesthouse', 'resort', 'villa', 'hostel']

const MAX_PHOTOS = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function extractNameFromBookingUrl(url) {
  try {
    const match = url.match(/booking\.com\/hotel\/[a-z]{2}\/([^./]+)/)
    if (match) {
      return match[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    }
  } catch {}
  return null
}

function extractCountryFromBookingUrl(url) {
  try {
    const match = url.match(/booking\.com\/hotel\/([a-z]{2})\//)
    if (match && match[1] === 'th') {
      return 'Thailand'
    }
  } catch {}
  return null
}

export default function Submit() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '',
    type: 'hotel',
    country: '',
    city: '',
    booking_link: '',
    airbnb_link: '',
    room_count: '',
    avg_nightly_rate: '',
    contact_email: user?.email || '',
    contact_phone: '',
    description: '',
  })

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Smart link parser with Booking.com name extraction
  async function handleLinkPaste(field, value) {
    updateField(field, value)
    if (!value) return

    const isBooking = value.includes('booking.com')
    const isAirbnb = value.includes('airbnb.com')

    if (isBooking || isAirbnb) {
      setParsing(true)
      trackEvent(EVENTS.LINK_PARSE, { type: isBooking ? 'booking' : 'airbnb' })

      // Simulate fetching delay
      await new Promise(r => setTimeout(r, 1500))

      if (isBooking) {
        const extractedName = extractNameFromBookingUrl(value)
        if (extractedName && !form.name) {
          updateField('name', extractedName)
        }
        const extractedCountry = extractCountryFromBookingUrl(value)
        if (extractedCountry && !form.country) {
          updateField('country', extractedCountry)
        }
      } else {
        // Airbnb fallback (simulated for alpha)
        if (!form.name) {
          updateField('name', 'Your Property')
        }
      }

      setParsing(false)
    }
  }

  // Photo upload handlers
  function handlePhotoSelect(e) {
    setPhotoError('')
    const files = Array.from(e.target.files || [])

    if (photos.length + files.length > MAX_PHOTOS) {
      setPhotoError(t('property.photo_max_error', `You can upload up to ${MAX_PHOTOS} photos`))
      return
    }

    const oversized = files.find(f => f.size > MAX_FILE_SIZE)
    if (oversized) {
      setPhotoError(t('property.photo_size_error', 'Each photo must be under 5MB'))
      return
    }

    const invalidType = files.find(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
    if (invalidType) {
      setPhotoError(t('property.photo_type_error', 'Only JPG, PNG, and WebP files are accepted'))
      return
    }

    setPhotos(prev => [...prev, ...files])
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoError('')
  }

  async function uploadPhotos(propertyId) {
    const urls = []
    for (const file of photos) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `properties/${propertyId}/${filename}`

      const { error } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { contentType: file.type })

      if (!error) {
        const { data } = supabase.storage
          .from('property-photos')
          .getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      navigate('/register')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from('properties').insert({
        user_id: user.id,
        name: form.name,
        type: form.type,
        country: form.country,
        city: form.city,
        booking_link: form.booking_link || null,
        airbnb_link: form.airbnb_link || null,
        room_count: Number(form.room_count) || 1,
        avg_nightly_rate: Number(form.avg_nightly_rate) || 0,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
      }).select('id').single()

      if (error) throw error

      // Upload photos if any were selected
      if (photos.length > 0 && data?.id) {
        const photoUrls = await uploadPhotos(data.id)
        if (photoUrls.length > 0) {
          await supabase.from('properties')
            .update({ photo_urls: photoUrls })
            .eq('id', data.id)
        }
      }

      trackEvent(EVENTS.PROPERTY_SUBMIT)
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle size={64} className="mx-auto text-libre mb-6" />
        <h2 className="text-3xl font-bold text-deep mb-3">{t('property.success_title')}</h2>
        <p className="text-gray-500 mb-8">{t('property.success_message')}</p>
        <Button onClick={() => navigate('/dashboard')}>
          {t('property.success_cta')}
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-deep mb-2">{t('property.title')}</h1>
        <p className="text-gray-500">{t('property.subtitle')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Smart link section */}
          <div className="bg-ocean/5 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ocean">
              <LinkIcon size={16} />
              <span>{t('property.paste_url', 'Paste your existing listing URL to auto-fill')}</span>
            </div>
            <Input
              label={t('property.booking_link')}
              placeholder={t('property.booking_link_placeholder')}
              value={form.booking_link}
              onChange={e => handleLinkPaste('booking_link', e.target.value)}
            />
            <Input
              label={t('property.airbnb_link')}
              placeholder={t('property.airbnb_link_placeholder')}
              value={form.airbnb_link}
              onChange={e => handleLinkPaste('airbnb_link', e.target.value)}
            />
            {parsing && (
              <div className="flex items-center gap-2 text-sm text-ocean">
                <Loader2 size={16} className="animate-spin" />
                {t('property.parsing', 'Fetching property info...')}
              </div>
            )}
          </div>

          <Input
            label={t('property.name')}
            placeholder={t('property.name_placeholder')}
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
            required
          />

          {/* Photo upload section */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('property.photos_label', 'Property Photos (optional)')}
              </label>
              <p className="text-xs text-gray-400 mb-2">
                {t('property.photos_subtitle', 'Upload up to 5 photos of your property')}
              </p>
            </div>

            {/* Photo previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photos.map((file, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`${t('property.photo_preview', 'Preview')} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={t('property.photo_remove', 'Remove photo')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-ocean/50 text-gray-500 hover:text-ocean transition-colors text-sm"
              >
                <Upload size={18} />
                <span>
                  {photos.length === 0
                    ? t('property.photo_upload_cta', 'Choose photos to upload')
                    : t('property.photo_upload_more', `Add more photos (${photos.length}/${MAX_PHOTOS})`)}
                </span>
                <Image size={16} className="ml-auto text-gray-300" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photoError && (
              <p className="text-sm text-red-500">{photoError}</p>
            )}
          </div>

          {/* Description field */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {t('property.description_label', 'Description (optional)')}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none"
              rows={4}
              maxLength={1000}
              placeholder={t('property.description_placeholder', 'Describe your property, its location, what makes it special...')}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
            />
            <p className="text-xs text-gray-400 text-right">
              {form.description.length}/1000
            </p>
          </div>

          <Select
            label={t('property.type')}
            value={form.type}
            onChange={e => updateField('type', e.target.value)}
          >
            {propertyTypes.map(type => (
              <option key={type} value={type}>{t(`property.types.${type}`)}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <AutocompleteInput
              label={t('property.country')}
              placeholder={t('property.country_placeholder')}
              options={countries}
              value={form.country}
              onChange={v => updateField('country', v)}
            />
            <AutocompleteInput
              label={t('property.city')}
              placeholder={t('property.city_placeholder')}
              options={form.country === 'Thailand' ? thailandCities : []}
              value={form.city}
              onChange={v => updateField('city', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('property.rooms')}
              type="number"
              min={1}
              value={form.room_count}
              onChange={e => updateField('room_count', e.target.value)}
              required
            />
            <Input
              label={t('property.avg_rate')}
              type="number"
              min={0}
              step="0.01"
              value={form.avg_nightly_rate}
              onChange={e => updateField('avg_nightly_rate', e.target.value)}
              required
            />
          </div>

          <Input
            label={t('property.email')}
            type="email"
            autoComplete="email"
            value={form.contact_email}
            onChange={e => updateField('contact_email', e.target.value)}
            required
          />

          <Input
            label={t('property.phone')}
            type="tel"
            autoComplete="tel"
            value={form.contact_phone}
            onChange={e => updateField('contact_phone', e.target.value)}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('property.submit')}
          </Button>

          {!user && (
            <p className="text-sm text-center text-gray-400">
              {t('property.account_required', "You'll need to create an account to submit your property.")}
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}
