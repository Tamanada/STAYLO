// ============================================================================
// PublicCheckOut — guest stay survey via QR-code token
// ============================================================================
// URL: /checkout/<token>
//
// What happens when guest submits:
//   - No red flag  → checkout_survey_submitted_at = now(),
//                    escrow_release_at = max(check_out + 1h, now() + 1h)
//                    → release-escrow cron pays the hotelier within 1 hour
//   - Red flag set → dispute_status = 'open',
//                    escrow_release_at = NULL (cron skips this booking)
//                    → STAYLO admin contacts the guest to mediate
//   - Guest never submits → existing T+24h auto-release continues
//
// All survey data lives in stay_reviews (one row per submission, multiple
// guests can submit reviews for the same booking).
// ============================================================================
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertTriangle, Calendar, MapPin, Hotel, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

const ASPECTS = [
  { key: 'cleanliness', label: 'Cleanliness',   emoji: '🧼' },
  { key: 'location',    label: 'Location',      emoji: '📍' },
  { key: 'vibe',        label: 'Vibe',          emoji: '✨' },
  { key: 'value',       label: 'Value',         emoji: '💰' },
  { key: 'service',     label: 'Service',       emoji: '🤝' },
]

export default function PublicCheckOut() {
  const { token } = useParams()
  const [booking, setBooking]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')

  const [ratings, setRatings]     = useState({}) // { cleanliness: 4, location: 5, ... }
  const [recommend, setRecommend] = useState(null)
  const [reviewText, setReviewText] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [needsHelp, setNeedsHelp] = useState(false)
  const [helpReason, setHelpReason] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    supabase.rpc('get_booking_for_checkout', { p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setLoadError(error.message)
        else if (!data || data.length === 0) setLoadError('Check-out link not found.')
        else setBooking(data[0])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  function setRating(aspect, n) {
    setRatings(r => ({ ...r, [aspect]: n }))
  }

  // Average of given ratings — used to decide if the guest is "happy"
  const avgRating = (() => {
    const values = Object.values(ratings).filter(v => v != null)
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  })()
  const happyEnough = avgRating >= 3.5 && !needsHelp

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setSubmitError('')
    if (needsHelp && !helpReason.trim()) {
      setSubmitError('Please describe what happened so STAYLO can help.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_stay_review_via_token', {
      p_token:             token,
      p_cleanliness:       ratings.cleanliness ?? null,
      p_location:          ratings.location    ?? null,
      p_vibe:              ratings.vibe        ?? null,
      p_value:             ratings.value       ?? null,
      p_service:           ratings.service     ?? null,
      p_would_recommend:   recommend,
      p_review_text:       reviewText || null,
      p_reviewer_name:     isAnonymous ? null : (reviewerName || null),
      p_is_anonymous:      isAnonymous,
      p_needs_staylo_help: needsHelp,
      p_help_reason:       needsHelp ? helpReason : null,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message || 'Could not submit. Please try again.')
      return
    }
    setSubmitted(true)
  }

  if (loading) {
    return <Page><div className="text-center py-20">
      <Loader2 size={28} className="animate-spin mx-auto text-ocean" />
      <p className="text-sm text-gray-500 mt-3">Loading…</p>
    </div></Page>
  }

  if (loadError || !booking) {
    return <Page><div className="text-center py-20">
      <AlertTriangle size={32} className="text-sunset mx-auto mb-3" />
      <h1 className="text-lg font-bold text-deep mb-1">Check-out link unavailable</h1>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{loadError || 'This link is invalid.'}</p>
    </div></Page>
  }

  if (booking.already_submitted && !submitted) {
    return <Page>
      <SEO title="Already reviewed" noindex path={`/checkout/${token}`} />
      <div className="text-center py-12">
        <CheckCircle2 size={48} className="text-libre mx-auto mb-3" />
        <h1 className="text-xl font-bold text-deep mb-2">Already reviewed</h1>
        <p className="text-sm text-gray-500">A guest from this booking has already submitted the survey. Thanks!</p>
        {booking.dispute_open && (
          <p className="text-xs text-sunset mt-4 italic">A STAYLO counselor is reviewing the case.</p>
        )}
      </div>
    </Page>
  }

  if (submitted) {
    return <Page>
      <SEO title="Thanks!" noindex path={`/checkout/${token}`} />
      <div className="text-center py-12">
        {needsHelp ? (
          <>
            <AlertTriangle size={48} className="text-amber-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-deep mb-2">We hear you.</h1>
            <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
              A STAYLO counselor will email you within 24 hours.
              The hotelier's payment is on hold until the case is resolved.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 size={48} className="text-libre mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-deep mb-2">Thank you!</h1>
            <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
              Your review will appear on the hotel's listing.
              The hotelier receives payment <strong>within 1 hour</strong>.
            </p>
            <p className="text-xs text-gray-400 italic mt-6">
              Want to support STAYLO? Tell a friend who runs a hotel — they save 12% per booking.
            </p>
          </>
        )}
      </div>
    </Page>
  }

  // ───── Main survey form ─────
  return <Page>
    <SEO title={`Check out from ${booking.property_name}`} noindex path={`/checkout/${token}`} />

    {/* Header */}
    <div className="text-center mb-6">
      <p className="text-xs uppercase tracking-wider text-orange font-bold mb-1">How was it?</p>
      <h1 className="text-2xl font-bold text-deep">{booking.property_name}</h1>
      <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-3">
        {booking.property_city && <span className="flex items-center gap-1"><MapPin size={11} /> {booking.property_city}</span>}
        <span className="flex items-center gap-1"><Hotel size={11} /> {booking.room_name}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
        <Calendar size={11} /> {booking.check_in} → {booking.check_out}
      </div>
    </div>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 5 ratings */}
      <div className="space-y-2">
        {ASPECTS.map(a => (
          <div key={a.key} className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-deep">{a.emoji} {a.label}</span>
            <StarRow value={ratings[a.key] || 0} onChange={n => setRating(a.key, n)} />
          </div>
        ))}
      </div>

      {/* Would recommend */}
      <div className="p-3 bg-gradient-to-r from-orange/5 to-pink-500/5 rounded-xl">
        <p className="text-sm font-medium text-deep mb-2">Would you recommend this place?</p>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => setRecommend(true)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
              recommend === true ? 'border-libre bg-libre text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-libre/40'
            }`}>👍 Yes</button>
          <button type="button"
            onClick={() => setRecommend(false)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
              recommend === false ? 'border-sunset bg-sunset text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-sunset/40'
            }`}>👎 No</button>
        </div>
      </div>

      {/* Free-form review */}
      <div>
        <label className="block text-xs font-bold uppercase text-gray-400 mb-1">A few words for future guests (optional)</label>
        <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
          rows={3} placeholder="What you loved, what surprised you…"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none" />
      </div>

      {/* Reviewer name + anonymous toggle */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Your first name (for the review)</label>
          <input type="text" value={reviewerName}
            onChange={e => setReviewerName(e.target.value)}
            disabled={isAnonymous}
            placeholder="Marie"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 disabled:bg-gray-100" />
        </div>
        <label className="flex items-end gap-2 text-xs text-gray-500 pb-2">
          <input type="checkbox" checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)} className="accent-ocean" />
          Anonymous
        </label>
      </div>

      {/* RED FLAG checkbox — opens a required text area when checked */}
      <div className={`p-3 rounded-xl border-2 transition-all ${
        needsHelp ? 'border-sunset bg-sunset/5' : 'border-gray-200 bg-gray-50'
      }`}>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={needsHelp}
            onChange={e => setNeedsHelp(e.target.checked)}
            className="accent-sunset mt-0.5" />
          <div>
            <span className="text-sm font-bold text-deep">
              🚩 I have a serious concern and want to talk to STAYLO
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Checking this holds the hotelier's payment until a STAYLO counselor reaches you (within 24h).
            </p>
          </div>
        </label>
        {needsHelp && (
          <textarea value={helpReason}
            onChange={e => setHelpReason(e.target.value)}
            rows={3} required
            placeholder="What happened? Be specific so we can help quickly."
            className="w-full mt-3 px-3 py-2 rounded-lg border border-sunset/40 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-sunset/30 resize-none" />
        )}
      </div>

      {submitError && (
        <div className="p-3 bg-sunset/10 border border-sunset/30 rounded-xl text-sm text-sunset">{submitError}</div>
      )}

      <button type="submit" disabled={submitting}
        className={`w-full py-3.5 mt-2 font-bold rounded-full text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 ${
          needsHelp
            ? 'bg-gradient-to-r from-sunset to-pink-500 text-white'
            : happyEnough
              ? 'bg-gradient-to-r from-libre to-emerald-500 text-white'
              : 'bg-gradient-to-r from-orange to-pink-500 text-white'
        }`}>
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
          : needsHelp
            ? '🚩 Submit & alert STAYLO'
            : 'Submit review →'}
      </button>

      <p className="text-[11px] text-gray-400 text-center mt-2">
        {needsHelp
          ? 'Hotelier payment will be held while STAYLO investigates.'
          : 'Hotelier receives payment within 1 hour of your review.'}
      </p>
    </form>
  </Page>
}

// ─── Helpers ───
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

function StarRow({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition-transform"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star size={22} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  )
}
