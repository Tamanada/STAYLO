import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, LinkIcon } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { trackEvent, EVENTS } from '../lib/analytics'

const propertyTypes = ['hotel', 'guesthouse', 'resort', 'villa', 'hostel']

export default function Submit() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)

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
  })

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Smart link parser (simulated for alpha)
  async function handleLinkPaste(field, value) {
    updateField(field, value)
    if (!value) return

    const isBooking = value.includes('booking.com')
    const isAirbnb = value.includes('airbnb.com')

    if (isBooking || isAirbnb) {
      setParsing(true)
      trackEvent(EVENTS.LINK_PARSE, { type: isBooking ? 'booking' : 'airbnb' })

      // Simulate parsing delay
      await new Promise(r => setTimeout(r, 2000))

      // Simulate pre-filling (in V1, real scraping via SerpAPI)
      if (!form.name) {
        updateField('name', 'Your Property')
      }
      setParsing(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      navigate('/register')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('properties').insert({
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
      })
      if (error) throw error
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
              <span>Paste your existing listing URL to auto-fill</span>
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
                {t('property.parsing')}
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
            <Input
              label={t('property.country')}
              placeholder={t('property.country_placeholder')}
              value={form.country}
              onChange={e => updateField('country', e.target.value)}
              required
            />
            <Input
              label={t('property.city')}
              placeholder={t('property.city_placeholder')}
              value={form.city}
              onChange={e => updateField('city', e.target.value)}
              required
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
            value={form.contact_email}
            onChange={e => updateField('contact_email', e.target.value)}
            required
          />

          <Input
            label={t('property.phone')}
            type="tel"
            value={form.contact_phone}
            onChange={e => updateField('contact_phone', e.target.value)}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('property.submit')}
          </Button>

          {!user && (
            <p className="text-sm text-center text-gray-400">
              You'll need to create an account to submit your property.
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}
