/*
  Step 3 — Property type
  ======================
  Wraps PropertyTypePicker. On selection: creates the ship_hotels row (owner
  is the auth user from Step 1) + ship_hotel_members row (self as owner),
  populates data.hotelId + data.hotelSlug, then advances.

  Slug generation retry:
    - Base slug from ship_slugify() Postgres helper called client-side via
      slugifyClient() (mirror of the SQL logic — kept in sync manually).
    - On unique-constraint conflict, append -2, -3 … until it lands.
*/
import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import PropertyTypePicker from '../PropertyTypePicker'
import { supabase } from '../../../lib/supabase'

// Mirror of the Postgres ship_slugify() function — kept manually in sync.
// Duplicated here so signup can preview the slug and craft the email
// forwarding address for Step 4 without a server round-trip per keystroke.
function slugifyClient(input) {
  let s = (input || '').toLowerCase()
  s = s.replace(/[^a-z0-9]+/g, '-')
  s = s.replace(/^-+|-+$/g, '')
  s = s.slice(0, 40)
  if (!s) s = 'hotel'
  return s
}

async function createHotelWithSlug({ data, userId, maxRetries = 8 }) {
  const baseSlug = slugifyClient(data.hotelName)
  let slug = baseSlug
  let attempt = 0

  while (attempt < maxRetries) {
    const { data: hotel, error } = await supabase
      .from('ship_hotels')
      .insert({
        slug,
        name: data.hotelName,
        country: data.country,
        city: data.city,
        currency: data.currency,
        timezone: data.timezone,
        property_type_main: data.propertyType.category_main,
        property_type_sub: data.propertyType.category_sub,
        property_type_custom: data.propertyType.category_custom ?? null,
        created_by: userId,
      })
      .select('id, slug')
      .single()

    if (!error) return hotel

    // Unique violation on slug → retry with suffix
    if (error.code === '23505' && error.message.includes('slug')) {
      attempt += 1
      slug = `${baseSlug}-${attempt + 1}`
      continue
    }
    throw error
  }
  throw new Error('Could not generate a unique slug after 8 attempts')
}

export default function Step3PropertyType({ data, patch, goNext }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handlePicked(propertyType) {
    // Cache the type; even if hotel creation fails, we want to remember it
    patch({ propertyType })

    setError('')
    setSubmitting(true)

    try {
      // If email-confirm is enabled and no session yet, we can't INSERT (RLS
      // requires auth.uid()). Surface a friendly explanation.
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (!session) {
        setError(
          'Please check your email and click the confirmation link, then return here to finish setup. ' +
          'Your hotel will be created automatically once you\'re verified.'
        )
        setSubmitting(false)
        return
      }

      const userId = session.user.id

      // Create hotel + owner membership (2 inserts in sequence — if the
      // second fails we'd have an orphan hotel, so we compensate)
      const hotel = await createHotelWithSlug({
        data: { ...data, propertyType },
        userId,
      })

      const { error: memberErr } = await supabase
        .from('ship_hotel_members')
        .insert({
          hotel_id: hotel.id,
          user_id: userId,
          role: 'owner',
          joined_at: new Date().toISOString(),
        })

      if (memberErr) {
        // Compensate: remove the hotel row so the user can retry cleanly
        await supabase.from('ship_hotels').delete().eq('id', hotel.id)
        throw memberErr
      }

      patch({ hotelId: hotel.id, hotelSlug: hotel.slug })
      goNext()
    } catch (err) {
      console.error('[Step3] hotel creation failed', err)
      setError(err.message || 'Could not create your hotel. Please try again.')
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <div className="text-center py-20">
        <Loader2 size={40} className="mx-auto animate-spin" style={{ color: '#FF6B00' }} />
        <div className="mt-6 font-bold text-gray-700">Setting up your hotel…</div>
        <div className="mt-2 text-sm text-gray-500">This takes a couple of seconds.</div>
      </div>
    )
  }

  return (
    <div>
      <PropertyTypePicker
        onSelect={handlePicked}
        initialValue={data.propertyType}
      />

      {error && (
        <div className="mt-6 p-4 rounded-xl flex items-start gap-2 text-sm" style={{
          background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5',
        }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2.4} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
