// ============================================================================
// PublicCheckIn — guest self check-in via QR-code token
// ============================================================================
// URL: /checkin/<token>
// Anyone holding the token can register one guest entry on the booking.
// Cap enforced server-side (bookings.adults + children + extra_beds).
//
// Mobile-first form. Most guests will scan the QR with their phone, fill
// in 30 seconds, hit submit. No login required, but a "Create STAYLO
// account" toggle at the bottom lets them keep their booking history.
//
// All writes go through the SECURITY DEFINER RPC
// register_booking_guest_via_token() — which is the only thing the anon
// role can do against booking_guests.
// ============================================================================
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertTriangle, MapPin, Calendar, Hotel } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

export default function PublicCheckIn() {
  const { token } = useParams()
  const [booking, setBooking]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')

  // Guest form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', sex: '',
    nationality: '', date_of_birth: '',
    passport_number: '', travel_doc_type: 'passport',
    is_child: false,
    thailand_arrival_date: '',
    thailand_port_of_entry: '',
    visa_type: '', visa_number: '',
  })
  const [showTM30, setShowTM30] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Auto-prompt TM30 details when the guest types a non-Thai nationality
  useEffect(() => {
    if (form.nationality && form.nationality.toUpperCase() !== 'TH' && !form.is_child) {
      setShowTM30(true)
    }
  }, [form.nationality, form.is_child])

  // Load the booking via the public read RPC
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    supabase.rpc('get_booking_for_checkin', { p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(error.message || 'Could not load this check-in link.')
        } else if (!data || data.length === 0) {
          setLoadError('Check-in link not found or expired.')
        } else {
          setBooking(data[0])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setSubmitError('')
    if (!form.first_name.trim()) {
      setSubmitError('First name is required.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.rpc('register_booking_guest_via_token', {
      p_token:                  token,
      p_first_name:             form.first_name,
      p_last_name:              form.last_name || null,
      p_sex:                    form.sex || null,
      p_date_of_birth:          form.date_of_birth || null,
      p_nationality:            form.nationality || null,
      p_passport_number:        form.passport_number || null,
      p_travel_doc_type:        form.travel_doc_type || 'passport',
      p_thailand_arrival_date:  form.thailand_arrival_date || null,
      p_thailand_port_of_entry: form.thailand_port_of_entry || null,
      p_visa_type:              form.visa_type || null,
      p_visa_number:            form.visa_number || null,
      p_is_child:               !!form.is_child,
      p_user_id:                null,             // future: link STAYLO user account
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message || 'Could not register. Please ask the front desk.')
      return
    }
    setSubmitted(true)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render: loading / error / success / form
  // ──────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Page>
        <div className="text-center py-20">
          <Loader2 size={28} className="animate-spin mx-auto text-ocean" />
          <p className="text-sm text-gray-500 mt-3">Loading check-in…</p>
        </div>
      </Page>
    )
  }

  if (loadError || !booking) {
    return (
      <Page>
        <div className="text-center py-20">
          <AlertTriangle size={32} className="text-sunset mx-auto mb-3" />
          <h1 className="text-lg font-bold text-deep mb-1">Check-in link unavailable</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">{loadError || 'This link is invalid or expired.'}</p>
          <p className="text-xs text-gray-400 mt-4">Ask the front desk to print a new QR code, or try again from a fresh link.</p>
        </div>
      </Page>
    )
  }

  if (submitted) {
    const remaining = (booking.capacity || 0) - (booking.registered + 1)
    return (
      <Page>
        <SEO title="Checked in — STAYLO" noindex path={`/checkin/${token}`} />
        <div className="text-center py-12">
          <CheckCircle2 size={48} className="text-libre mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-deep mb-2">You're all set, {form.first_name}!</h1>
          <p className="text-sm text-gray-500 mb-6">Your details have been added to the booking.</p>

          {remaining > 0 ? (
            <button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, first_name: '', last_name: '', passport_number: '', date_of_birth: '' })) }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange to-pink-500 text-white font-bold rounded-full text-sm hover:opacity-90">
              ➕ Add another guest ({remaining} remaining)
            </button>
          ) : (
            <p className="text-sm text-gray-400 italic">All {booking.capacity} guests now registered.</p>
          )}

          <div className="mt-10 p-4 bg-gradient-to-br from-orange/5 to-pink-500/5 rounded-2xl max-w-sm mx-auto">
            <p className="text-xs text-gray-500 mb-2">
              Want to keep this booking and your $STAY rewards?
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 text-sm font-bold text-orange hover:text-pink-500">
              Create your free STAYLO account →
            </Link>
          </div>
        </div>
      </Page>
    )
  }

  // ───────────── Main form ─────────────
  const fullCapacityMet = booking.registered >= booking.capacity
  return (
    <Page>
      <SEO title={`Check in to ${booking.property_name}`} noindex path={`/checkin/${token}`} />

      {/* Booking header */}
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-wider text-orange font-bold mb-1">Welcome</p>
        <h1 className="text-2xl font-bold text-deep">{booking.property_name}</h1>
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-2">
          {booking.property_city && <><MapPin size={12} /> {booking.property_city}</>}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><Hotel size={12} /> {booking.room_name}</span>
          <span className="flex items-center gap-1"><Calendar size={12} /> {booking.check_in} → {booking.check_out}</span>
        </div>
        <div className="mt-3 inline-block px-3 py-1 bg-ocean/10 text-ocean text-xs font-bold rounded-full">
          {booking.registered} / {booking.capacity} guests registered
        </div>
        {booking.lead_name && booking.registered === 0 && (
          <p className="text-xs text-gray-400 mt-2 italic">Booking under: {booking.lead_name}</p>
        )}
      </div>

      {fullCapacityMet ? (
        <div className="text-center p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={24} className="text-amber-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-900">All {booking.capacity} guests already checked in.</p>
          <p className="text-xs text-amber-700 mt-1">Need an extra bed? Ask the front desk.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <input type="text" value={form.first_name} required
                onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </Field>
            <Field label="Last name">
              <input type="text" value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </Field>
            <Field label="Sex">
              <select value={form.sex} onChange={e => set('sex', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30">
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="X">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.date_of_birth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => set('date_of_birth', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </Field>
            <Field label="Nationality (2-letter)">
              <input type="text" value={form.nationality}
                placeholder="FR, TH, US…"
                maxLength={2}
                onChange={e => set('nationality', e.target.value.toUpperCase().slice(0, 2))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </Field>
            <Field label="Passport number">
              <input type="text" value={form.passport_number}
                placeholder={form.is_child ? 'optional' : ''}
                onChange={e => set('passport_number', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={form.is_child}
              onChange={e => set('is_child', e.target.checked)}
              className="accent-orange" />
            This is a child (under-13)
          </label>

          {/* TM30 expander — auto-opens for non-Thai non-children */}
          <button type="button" onClick={() => setShowTM30(s => !s)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors ${
              showTM30 ? 'bg-ocean/10 text-ocean border-ocean/30' : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-700'
            }`}>
            {showTM30 ? '▾' : '▸'} Thai Immigration details (TM30)
            <span className="float-right text-[10px] normal-case font-normal opacity-60">Required for foreign guests</span>
          </button>
          {showTM30 && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-ocean/5 rounded-xl">
              <Field label="Arrived in Thailand on" small>
                <input type="date" value={form.thailand_arrival_date}
                  max={booking.check_in}
                  onChange={e => set('thailand_arrival_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </Field>
              <Field label="Port of entry" small>
                <input type="text" value={form.thailand_port_of_entry}
                  placeholder="BKK, DMK, HKT…"
                  maxLength={12}
                  onChange={e => set('thailand_port_of_entry', e.target.value.toUpperCase().slice(0, 12))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </Field>
              <Field label="Visa type" small>
                <select value={form.visa_type} onChange={e => set('visa_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-ocean/30">
                  <option value="">—</option>
                  <option value="exempt">Visa exempt</option>
                  <option value="TR">TR (Tourist)</option>
                  <option value="TR-VOA">TR-VOA</option>
                  <option value="NON-B">NON-B (Business)</option>
                  <option value="NON-O">NON-O (Other)</option>
                  <option value="ED">ED (Education)</option>
                  <option value="RETIRE">Retirement</option>
                  <option value="DTV">DTV (Digital Nomad)</option>
                  <option value="LTR">LTR (Long-Term)</option>
                </select>
              </Field>
              <Field label="Visa number" small>
                <input type="text" value={form.visa_number}
                  placeholder="from sticker"
                  onChange={e => set('visa_number', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ocean/30" />
              </Field>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-sunset/10 border border-sunset/30 rounded-xl text-sm text-sunset">
              {submitError}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-orange to-pink-500 text-white font-bold rounded-full text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Check me in →'}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-2">
            Your data is shared with the hotel for legal registration (TM30) and never sold.
          </p>
        </form>
      )}
    </Page>
  )
}

// ────────────────────── Helpers ──────────────────────
function Page({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <span className="text-2xl font-extrabold">stay</span>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-orange to-pink-500 bg-clip-text text-transparent">lo</span>
        </div>
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 sm:p-6">
          {children}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-4">
          Powered by <a href="https://staylo.app" className="text-orange font-bold">STAYLO</a> — hotelier-owned
        </p>
      </div>
    </div>
  )
}

function Field({ label, children, small }) {
  return (
    <label className="block">
      <span className={`block ${small ? 'text-[10px]' : 'text-[11px]'} font-bold uppercase text-gray-400 mb-1`}>{label}</span>
      {children}
    </label>
  )
}
