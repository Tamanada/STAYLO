/*
  ================================================================
  SignupWizard — SHIP standalone signup flow
  ================================================================
  Route: /ship-signup

  Steps:
    1. Auth        — email + password (Supabase Auth)
    2. Hotel       — name, country, city, currency, timezone
    3. Property    — 2-step visual picker (PropertyTypePicker)
    4. Booking     — connect Booking.com via email forwarding (Postmark)
    5. Invite      — invite a manager (optional, skippable)
    → Done         — welcome screen with link to SHIP

  On step 3 completion the ship_hotels row is created (owner = current
  auth user), a matching ship_hotel_members row is inserted. Steps 4-5
  then act on that hotel_id.

  Migration note: self-contained under src/features/ship-onboarding/;
  the only external dependency is `../../lib/supabase` (the shared
  browser client). When migrating to SHIP-standalone repo, drop in an
  equivalent supabase client and this module drops in verbatim.
  ================================================================
*/
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'

import Step1Auth from './steps/Step1Auth'
import Step2Hotel from './steps/Step2Hotel'
import Step3PropertyType from './steps/Step3PropertyType'
import Step4Booking from './steps/Step4Booking'
import Step5Invite from './steps/Step5Invite'
import StepDone from './steps/StepDone'

const TOTAL_STEPS = 5

const STEP_LABELS = [
  'Account',
  'Hotel',
  'Property',
  'Bookings',
  'Team',
]

export default function SignupWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // Central state for the whole wizard. Each step mutates the fields it
  // owns via `patch({...})`.
  const [data, setData] = useState({
    // Step 1
    email: '',
    password: '',
    userId: null,          // populated after auth.signUp
    // Step 2
    hotelName: '',
    country: '',           // ISO alpha-2
    city: '',
    currency: '',
    timezone: '',
    // Step 3
    propertyType: null,    // { category_main, category_sub, category_custom? }
    // Populated when ship_hotels row is created (after step 3 → step 4)
    hotelId: null,
    hotelSlug: null,
    // Step 5
    invitedManagerEmail: '',
  })

  const patch = (partial) => setData((d) => ({ ...d, ...partial }))
  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 1))

  // ────────── DONE screen ──────────
  if (step > TOTAL_STEPS) {
    return (
      <StepDone
        hotelName={data.hotelName}
        hotelSlug={data.hotelSlug}
        onOpenShip={() => navigate('/ship')}
      />
    )
  }

  const StepComponent = {
    1: Step1Auth,
    2: Step2Hotel,
    3: Step3PropertyType,
    4: Step4Booking,
    5: Step5Invite,
  }[step]

  return (
    <div className="min-h-screen" style={{ background: '#F8F6F0' }}>

      {/* ────────── HEADER with progress bar ────────── */}
      <header className="sticky top-0 z-40" style={{
        background: 'rgba(248,246,240,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E8E0D8',
      }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Top row: back + brand + step count */}
          <div className="flex items-center justify-between mb-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-sm font-bold transition-colors"
                style={{ color: '#8892A0' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B00'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#8892A0'}
              >
                <ChevronLeft size={16} strokeWidth={2.6} />
                Back
              </button>
            ) : (
              <div className="w-14" />
            )}

            <div className="font-black text-sm tracking-widest uppercase"
              style={{
                background: 'linear-gradient(135deg, #FF6B00, #FF1F70, #7E22CE)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
              SHIP · Sign up
            </div>

            <div className="text-xs font-bold text-gray-400 w-14 text-right">
              {step} / {TOTAL_STEPS}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const idx = i + 1
              const done = idx < step
              const current = idx === step
              return (
                <div key={idx} className="flex-1 flex items-center gap-1.5">
                  <div className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: done || current
                        ? 'linear-gradient(90deg, #FF6B00, #FF1F70)'
                        : '#E8E0D8',
                    }}
                  />
                  {done && (
                    <Check size={12} strokeWidth={3} style={{ color: '#FF1F70' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current label */}
          <div className="mt-2 text-xs font-bold text-gray-500 text-center">
            {STEP_LABELS[step - 1]}
          </div>
        </div>
      </header>

      {/* ────────── STEP BODY ────────── */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <StepComponent data={data} patch={patch} goNext={goNext} />
      </main>

    </div>
  )
}
