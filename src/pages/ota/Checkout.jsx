import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, BedDouble, MapPin, Shield,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const COMMISSION_RATE = 0.10 // 10% STAYLO commission

export default function Checkout() {
  const { t } = useTranslation()
  const { id: propertyId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const roomId = searchParams.get('room')
  const checkIn = searchParams.get('in')
  const checkOut = searchParams.get('out')
  const guests = searchParams.get('guests') || '2'

  const [property, setProperty] = useState(null)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Guest form
  const [guestName, setGuestName] = useState(profile?.full_name || '')
  const [guestEmail, setGuestEmail] = useState(user?.email || '')
  const [guestPhone, setGuestPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  useEffect(() => {
    if (profile?.full_name && !guestName) setGuestName(profile.full_name)
    if (user?.email && !guestEmail) setGuestEmail(user.email)
  }, [profile, user])

  useEffect(() => {
    async function fetchData() {
      if (!propertyId || !roomId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [propRes, roomRes] = await Promise.all([
          supabase.from('properties').select('*').eq('id', propertyId).single(),
          supabase.from('rooms').select('*, room_availability(*)').eq('id', roomId).single(),
        ])
        if (propRes.error) console.error('Checkout: property fetch failed', propRes.error)
        if (roomRes.error) console.error('Checkout: room fetch failed', roomRes.error)
        setProperty(propRes.data)
        setRoom(roomRes.data)
      } catch (err) {
        console.error('Checkout fetch error', err)
        setError(err.message || 'Failed to load booking details')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [propertyId, roomId])

  if (loading) {
    return <div className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
  }

  if (!property || !room || !checkIn || !checkOut) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">{t('checkout.invalid', 'Invalid booking details')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {!property && 'Property not found. '}
          {!room && 'Room not found. '}
          {!checkIn && 'Missing check-in date. '}
          {!checkOut && 'Missing check-out date. '}
        </p>
        <Link to={propertyId ? `/ota/${propertyId}` : '/ota'}>
          <Button variant="secondary"><ArrowLeft size={16} /> {t('booking.back_to_search', 'Back to property')}</Button>
        </Link>
      </div>
    )
  }

  // Auth gate — booking requires a logged-in guest (we attach guest_id)
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-deep mb-4">{t('checkout.signin_required', 'Sign in to book')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('checkout.signin_desc', 'You need an account to complete your reservation.')}</p>
        <Link to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
          <Button>{t('nav.login', 'Sign in')}</Button>
        </Link>
      </div>
    )
  }

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))

  // Calculate total with potential price overrides
  let roomTotal = 0
  const d = new Date(checkIn)
  const availabilityList = Array.isArray(room.room_availability) ? room.room_availability : []
  for (let i = 0; i < nights; i++) {
    const dateStr = d.toISOString().split('T')[0]
    const override = availabilityList.find(a => a.date === dateStr)
    const nightlyPrice = Number(override?.price_override ?? room.base_price ?? 0)
    roomTotal += isFinite(nightlyPrice) ? nightlyPrice : 0
    d.setDate(d.getDate() + 1)
  }

  const commission = roomTotal * COMMISSION_RATE
  const totalPrice = roomTotal + commission

  async function handleSubmit(e) {
    e.preventDefault()
    if (!guestName.trim() || !guestEmail.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      // Create booking in Supabase
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          property_id: propertyId,
          room_id: roomId,
          guest_id: user.id,
          check_in: checkIn,
          check_out: checkOut,
          guests: Number(guests),
          total_price: totalPrice,
          commission: commission,
          status: 'pending',
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim() || null,
          special_requests: specialRequests.trim() || null,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Try Stripe checkout via Edge Function
      try {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout', {
          body: {
            booking_id: booking.id,
            amount: Math.round(totalPrice * 100), // cents
            property_name: property.name,
            room_name: room.name,
            nights,
            guest_email: guestEmail.trim(),
          }
        })

        if (checkoutError) throw checkoutError

        if (checkoutData?.url) {
          // Redirect to Stripe Checkout
          window.location.href = checkoutData.url
          return
        }
      } catch (stripeErr) {
        // SECURITY FIX: do NOT auto-confirm without payment.
        // Leave booking in 'pending' status so it can be reconciled or cancelled.
        // TODO: when Stripe Connect is wired (TOP 5 chantier #1), remove this fallback entirely.
        console.error('Stripe checkout failed, booking left as pending:', stripeErr)
        throw new Error(t('checkout.payment_unavailable', 'Payment is temporarily unavailable. Your booking is on hold — please retry shortly.'))
      }

      setSuccess(true)
    } catch (err) {
      console.error('Booking error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-libre" />
        </div>
        <h1 className="text-3xl font-bold text-deep mb-3">{t('checkout.success_title', 'Booking Confirmed!')}</h1>
        <p className="text-gray-500 mb-2">{t('checkout.success_desc', 'Your reservation has been confirmed. You will receive a confirmation email shortly.')}</p>
        <Card className="mt-6 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{t('checkout.property', 'Property')}</span><span className="font-medium text-deep">{property.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t('checkout.room', 'Room')}</span><span className="font-medium text-deep">{room.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t('checkout.dates', 'Dates')}</span><span className="font-medium text-deep">{checkIn} → {checkOut}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t('checkout.total', 'Total')}</span><span className="font-bold text-deep">${totalPrice.toFixed(2)}</span></div>
          </div>
        </Card>
        <div className="mt-6 flex gap-3 justify-center">
          <Link to="/dashboard"><Button>{t('checkout.go_dashboard', 'Go to Dashboard')}</Button></Link>
          <Link to="/ota"><Button variant="secondary">{t('checkout.book_another', 'Book Another')}</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        to={`/ota/${propertyId}?in=${checkIn}&out=${checkOut}&guests=${guests}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-ocean transition-colors mb-6 no-underline"
      >
        <ArrowLeft size={16} />
        {t('checkout.back_to_property', 'Back to property')}
      </Link>

      <h1 className="text-2xl font-bold text-deep mb-6">{t('checkout.title', 'Complete Your Booking')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Guest form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Details */}
            <Card>
              <h2 className="text-lg font-bold text-deep mb-4">{t('checkout.guest_details', 'Guest Details')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('checkout.full_name', 'Full Name')} *</label>
                  <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('checkout.email', 'Email')} *</label>
                  <input type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('checkout.phone', 'Phone')}</label>
                  <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                    placeholder="+66..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('checkout.special_requests', 'Special Requests')}</label>
                  <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)}
                    rows={3} placeholder={t('checkout.special_placeholder', 'Late check-in, extra bed, dietary needs...')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean resize-none" />
                </div>
              </div>
            </Card>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sunset bg-sunset/5 border border-sunset/20 rounded-xl px-4 py-3">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full !py-4 text-lg" disabled={submitting || !guestName.trim() || !guestEmail.trim()}>
              {submitting ? (
                <><Loader2 size={20} className="animate-spin" /> {t('checkout.processing', 'Processing...')}</>
              ) : (
                <><Shield size={20} /> {t('checkout.confirm_pay', 'Confirm & Pay')} — ${totalPrice.toFixed(2)}</>
              )}
            </Button>
          </form>
        </div>

        {/* Right: Booking summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-2 border-ocean/20">
              <h3 className="font-bold text-deep mb-4">{t('checkout.summary', 'Booking Summary')}</h3>

              {/* Property info */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-ocean/40 to-electric/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{(typeIcons || {})[property.type] || '🏨'}</span>
                </div>
                <div>
                  <h4 className="font-bold text-deep text-sm">{property.name}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={10} /> {property.city}{property.country ? `, ${property.country}` : ''}
                  </p>
                </div>
              </div>

              {/* Room & dates */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <BedDouble size={14} className="text-ocean" />
                  <span>{room.name}</span>
                  <Badge variant="blue" className="capitalize text-xs ml-auto">{room.type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-ocean" />
                  <span>{checkIn} → {checkOut}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} className="text-ocean" />
                  <span>{guests} {Number(guests) === 1 ? 'guest' : 'guests'}</span>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{room.name} x {nights} {nights === 1 ? 'night' : 'nights'}</span>
                  <span className="text-deep">${roomTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('checkout.service_fee', 'Service fee')} (10%)</span>
                  <span className="text-deep">${commission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100 font-bold">
                  <span className="text-deep">{t('checkout.total', 'Total')}</span>
                  <span className="text-deep text-lg">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
