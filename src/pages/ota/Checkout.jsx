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
import LightningPaymentModal from '../../components/ota/LightningPaymentModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { computeRoomPricing } from '../../lib/roomPricing'

const COMMISSION_RATE = 0.10 // 10% STAYLO commission (on room price, NOT total)

// Emoji icon for each property type (used in the booking summary card)
const PROPERTY_TYPE_ICONS = {
  hotel:      '🏨',
  guesthouse: '🏠',
  resort:     '🏖️',
  villa:      '🏡',
  hostel:     '🛏️',
  apartment:  '🏢',
  bungalow:   '🛖',
  homestay:   '🏠',
}

// Processing fee added to the GUEST's total (covers Stripe / processor cost).
// STAYLO does not absorb processor fees → guest sees a transparent line item.
const PAYMENT_METHODS = [
  {
    key:        'card',
    feeRate:    0.03,    // 3% — covers Stripe ~2.9% + 0.30€/transaction roughly
    available:  true,
    icon:       '💳',
    labelKey:   'checkout.method_card',
    labelDef:   'Carte bancaire',
    descKey:    'checkout.method_card_desc',
    descDef:    'Visa, Mastercard, Amex via Stripe',
  },
  {
    key:        'lightning',
    feeRate:    0.0,     // Lightning network fees are essentially zero
    available:  true,    // ⚡ Live since chantier #9 (MockProvider in Alpha, BTCPay later)
    icon:       '⚡',
    labelKey:   'checkout.method_lightning',
    labelDef:   'Bitcoin Lightning',
    descKey:    'checkout.method_lightning_desc',
    descDef:    'Sans frais. Instantané.',
  },
  {
    key:        'btc_onchain',
    feeRate:    0.01,    // 1% covers blockchain network fee
    available:  false,   // ⛓️ Coming later — Lightning covers 95% of cases
    comingSoon: true,
    icon:       '₿',
    labelKey:   'checkout.method_onchain',
    labelDef:   'Bitcoin on-chain',
    descKey:    'checkout.method_onchain_desc',
    descDef:    'Pour les gros montants. Activation prochaine.',
  },
]

export default function Checkout() {
  const { t } = useTranslation()
  const { id: propertyId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const roomId = searchParams.get('room')
  const checkIn = searchParams.get('in')
  const checkOut = searchParams.get('out')
  // Adults + Children — back-compat with legacy ?guests=N
  const adults   = Math.max(1, Number(searchParams.get('adults'))   || Number(searchParams.get('guests')) || 2)
  const children = Math.max(0, Number(searchParams.get('children')) || 0)
  const guests   = String(adults + children)        // total used by legacy code paths
  const roomsCount = Math.max(1, Number(searchParams.get('rooms')) || 1)

  const [property, setProperty] = useState(null)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [createdBooking, setCreatedBooking] = useState(null)  // holds {id, booking_ref, ...} after insert
  const [lightningInvoice, setLightningInvoice] = useState(null) // { invoice_id, bolt11, ... } when Lightning is selected

  // Guest form
  const [guestName, setGuestName] = useState(profile?.full_name || '')
  const [guestEmail, setGuestEmail] = useState(user?.email || '')
  const [guestPhone, setGuestPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')

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

  // Pricing — use the shared helper so PropertyDetail (display) and
  // Checkout (insert) compute identical numbers, applying overrides + promos
  // identically. Also returns min_stay constraint info.
  const pricing = computeRoomPricing(room, checkIn, checkOut, roomsCount)
  const roomTotal = pricing.discountedTotal

  // Pricing model: STAYLO commission comes OUT OF the room price (10%).
  // The processing fee is added ON TOP and paid by the guest.
  const commission       = roomTotal * COMMISSION_RATE                  // 10% goes to STAYLO
  const hotelierNet      = roomTotal - commission                        // 90% to hotelier
  const selectedMethod   = PAYMENT_METHODS.find(m => m.key === paymentMethod) || PAYMENT_METHODS[0]
  const processingFee    = roomTotal * (selectedMethod.feeRate || 0)
  const totalPrice       = roomTotal + processingFee                     // What the guest pays

  async function handleSubmit(e) {
    e.preventDefault()
    if (!guestName.trim() || !guestEmail.trim()) return

    // Last-mile capacity check — even if PropertyDetail's guard was bypassed
    // (URL tampering, stale form), refuse to insert an over-capacity booking.
    const requestedGuests = Number(guests)
    const roomCap = Number(room.max_guests || 0)
    const effectiveCap = roomCap * roomsCount
    if (roomCap > 0 && requestedGuests > effectiveCap) {
      setError(
        t('checkout.over_capacity',
          `Your ${roomsCount} room${roomsCount > 1 ? 's' : ''} sleep up to ${effectiveCap} guests total. ` +
          `You selected ${requestedGuests}. Please go back and reduce the guest count or add more rooms.`
        )
      )
      return
    }
    // Stock check — can't book more rooms than the room type has
    const stockCap = Number(room.quantity || 1)
    if (roomsCount > stockCap) {
      setError(`Only ${stockCap} of this room type available — you tried to book ${roomsCount}.`)
      return
    }
    // Min stay enforcement — refuse if any night in the range requires more
    if (!pricing.minStayOK) {
      setError(
        `These dates require a minimum of ${pricing.minStayRequired} nights. ` +
        `You picked ${pricing.nights}. Please go back and extend your stay.`
      )
      return
    }
    // Also refuse if any night in the range is blocked
    if (pricing.hasBlockedDay) {
      setError(`At least one night in your range is unavailable. Please go back and try different dates.`)
      return
    }

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
          adults,
          children,
          rooms_count: roomsCount,
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

      // Persist the freshly inserted booking (incl. auto-generated booking_ref)
      // so the success screen can display it for the guest to keep.
      setCreatedBooking(booking)

      const currency = (property.currency || 'USD').toUpperCase()
      const sharedBody = {
        booking_id:     booking.id,
        booking_ref:    booking.booking_ref,
        room_amount:    Math.round(roomTotal * 100),
        processing_fee: Math.round(processingFee * 100),
        currency,
        property_id:    propertyId,
        property_name:  property.name,
        room_name:      room.name,
        nights,
        guest_email:    guestEmail.trim(),
        payment_method: paymentMethod,
      }

      // ── Lightning / on-chain BTC: route to crypto-checkout ──
      if (paymentMethod === 'lightning' || paymentMethod === 'btc_onchain') {
        const { data: invoice, error: cryptoErr } = await supabase.functions.invoke('crypto-checkout', {
          body: sharedBody,
        })
        if (cryptoErr) {
          let detail = cryptoErr.message
          try {
            const ctx = cryptoErr.context
            if (ctx?.json) {
              const errBody = await ctx.json()
              if (errBody?.error) detail = errBody.error
            }
          } catch { /* ignore */ }
          throw new Error(detail || t('checkout.crypto_failed', 'Could not create Lightning invoice'))
        }
        if (!invoice?.bolt11) throw new Error(t('checkout.crypto_no_invoice', 'Lightning invoice missing — please retry'))

        // Open the QR modal — payment confirmation comes via polling + mock auto-trigger
        setLightningInvoice(invoice)
        setSubmitting(false)
        return  // stay on the page; modal handles success → setSuccess(true)
      }

      // ── Card: existing Stripe flow ──
      try {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout', {
          body: sharedBody,
        })

        if (checkoutError) {
          // FunctionsHttpError carries the response body — extract the real
          // error message and code so the user sees the actual reason
          // (e.g., "Hotelier Stripe account is not fully active yet.")
          // instead of a generic fallback.
          let detail = checkoutError.message
          let code   = null
          try {
            const ctx = checkoutError.context
            if (ctx && typeof ctx.json === 'function') {
              const errBody = await ctx.json()
              if (errBody?.error) detail = errBody.error
              if (errBody?.code)  code   = errBody.code
            }
          } catch { /* ignore */ }

          // Friendly mapping for the most common cases
          if (code === 'hotelier_not_onboarded') {
            detail = t('checkout.err_hotelier_not_onboarded',
              'The hotelier has not yet linked a payout account. Please try again later or contact support.')
          } else if (code === 'hotelier_account_inactive') {
            detail = t('checkout.err_hotelier_inactive',
              'The hotelier\'s payment account is not fully active yet. Your booking is on hold — please retry shortly.')
          }

          throw new Error(detail)
        }

        if (checkoutData?.url) {
          // Redirect to Stripe Checkout
          window.location.href = checkoutData.url
          return
        }

        // No URL returned but no error either — unexpected state
        throw new Error(t('checkout.no_url', 'Payment session could not be created. Please retry.'))
      } catch (stripeErr) {
        // Safety net: any uncaught error from the Stripe step. The booking
        // stays 'pending' (we never auto-flip to 'confirmed' without payment).
        console.error('Stripe checkout failed, booking left as pending:', stripeErr)
        throw stripeErr  // propagate the real error message to the outer catch
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

        {/* Booking reference — prominently displayed for the guest to keep */}
        {createdBooking?.booking_ref && (
          <div className="mt-6 inline-flex flex-col items-center gap-1 bg-orange/5 border border-orange/20 rounded-2xl px-6 py-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange/60">
              {t('checkout.your_reference', 'Your booking reference')}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(createdBooking.booking_ref)}
              title={t('checkout.click_to_copy', 'Click to copy')}
              className="text-2xl font-mono font-bold text-orange tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
            >
              {createdBooking.booking_ref}
            </button>
            <span className="text-[11px] text-gray-500">
              {t('checkout.ref_note', 'Use this reference in any correspondence with the hotel or STAYLO.')}
            </span>
          </div>
        )}

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
        to={`/ota/${propertyId}?in=${checkIn}&out=${checkOut}&adults=${adults}&children=${children}&rooms=${roomsCount}`}
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
                  <span className="text-2xl">{PROPERTY_TYPE_ICONS[property.type] || '🏨'}</span>
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
                  <span>
                    {adults} {adults === 1 ? 'adult' : 'adults'}
                    {children > 0 && (
                      <> · {children} {children === 1 ? 'child' : 'children'}</>
                    )}
                  </span>
                </div>
                {roomsCount > 1 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <BedDouble size={14} className="text-ocean" />
                    <span>{roomsCount} {roomsCount === 1 ? 'room' : 'rooms'}</span>
                  </div>
                )}
              </div>

              {/* Price breakdown — transparent: room, hotelier-net, processing fee, total */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {room.name} × {nights} {nights === 1 ? 'night' : 'nights'}
                    {roomsCount > 1 && <span className="text-gray-400"> × {roomsCount} rooms</span>}
                  </span>
                  <span className={pricing.hasPromo && pricing.savings > 0 ? 'text-gray-400 line-through' : 'text-deep'}>
                    ${pricing.originalTotal.toFixed(2)}
                  </span>
                </div>
                {pricing.hasPromo && pricing.savings > 0 && (
                  <div className="flex justify-between text-orange font-medium text-xs">
                    <span>🔥 {pricing.promoLabel || 'Promo'}{pricing.promoPct > 0 && ` (−${Math.round(pricing.promoPct)}%)`}</span>
                    <span>−${pricing.savings.toFixed(2)}</span>
                  </div>
                )}
                {pricing.hasPromo && pricing.savings > 0 && (
                  <div className="flex justify-between font-medium pt-1 border-t border-gray-100">
                    <span className="text-deep">Room subtotal</span>
                    <span className="text-deep">${roomTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400 pl-3">
                  <span>↳ {t('checkout.staylo_commission', 'STAYLO commission (10%)')}</span>
                  <span>−${commission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-libre pl-3 italic">
                  <span>↳ {t('checkout.hotelier_receives', 'Hotelier receives')}</span>
                  <span>${hotelierNet.toFixed(2)}</span>
                </div>

                {/* Payment method selector */}
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    {t('checkout.payment_method', 'Payment method')}
                  </p>
                  <div className="space-y-1.5">
                    {PAYMENT_METHODS.map(m => {
                      const fee = roomTotal * (m.feeRate || 0)
                      const isSelected = paymentMethod === m.key
                      return (
                        <label
                          key={m.key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            !m.available
                              ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'bg-ocean/5 border-ocean'
                                : 'bg-white border-gray-200 hover:border-ocean/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={m.key}
                            checked={isSelected}
                            onChange={() => m.available && setPaymentMethod(m.key)}
                            disabled={!m.available}
                            className="accent-ocean"
                          />
                          <span className="text-base">{m.icon}</span>
                          <span className="flex-1 text-xs">
                            <span className="font-medium text-deep">{t(m.labelKey, m.labelDef)}</span>
                            {m.comingSoon && (
                              <span className="ml-1.5 text-[9px] uppercase font-bold text-orange tracking-wider">{t('checkout.coming_soon', 'Soon')}</span>
                            )}
                          </span>
                          <span className={`text-xs font-medium ${m.feeRate === 0 ? 'text-libre' : 'text-gray-500'}`}>
                            {m.feeRate === 0 ? t('checkout.free', 'Free') : `+$${fee.toFixed(2)}`}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Processing fee line */}
                {processingFee > 0 && (
                  <div className="flex justify-between pt-2 text-gray-500">
                    <span>{t('checkout.processing_fee', 'Processing fee')} ({(selectedMethod.feeRate * 100).toFixed(0)}%)</span>
                    <span className="text-deep">+${processingFee.toFixed(2)}</span>
                  </div>
                )}

                {/* Total guest pays */}
                <div className="flex justify-between pt-2 border-t border-gray-100 font-bold">
                  <span className="text-deep">{t('checkout.total_you_pay', 'You pay')}</span>
                  <span className="text-deep text-lg">${totalPrice.toFixed(2)}</span>
                </div>

                {/* Trust note */}
                <p className="text-[10px] text-gray-400 pt-2 leading-relaxed">
                  {t('checkout.transparency_note', 'STAYLO never marks up the room price. The processing fee covers payment gateway costs only — pay with Lightning to skip it entirely.')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Lightning payment modal — opens when guest selects Lightning + confirms */}
      {lightningInvoice && (
        <LightningPaymentModal
          invoice={lightningInvoice}
          onClose={() => setLightningInvoice(null)}
          onSuccess={() => {
            // Webhook already marked the booking confirmed in DB.
            // Show the success screen.
            setLightningInvoice(null)
            setSuccess(true)
          }}
        />
      )}
    </div>
  )
}
