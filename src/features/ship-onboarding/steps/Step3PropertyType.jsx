/*
  Step 3 — Property type
  ======================
  Wraps PropertyTypePicker. On selection: calls create_ship_hotel() RPC
  which atomically inserts the ship_hotels row + owner ship_hotel_members
  row server-side (SECURITY DEFINER, so it bypasses RLS but still enforces
  auth.uid() != null). Populates data.hotelId + data.hotelSlug, then advances.

  Why an RPC and not direct .insert():
    Client-side RLS INSERTs against ship_hotels were failing intermittently
    with "new row violates row-level security policy" during real signups,
    even when the caller had a valid session. The RPC pattern is more
    robust: single server round-trip, atomic transaction, no JWT-context
    race conditions.
*/
import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import PropertyTypePicker from '../PropertyTypePicker'
import { supabase } from '../../../lib/supabase'

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

      // Atomic hotel + owner-membership via SECURITY DEFINER RPC.
      // Server-side auth.uid() check + slug retry + transaction — no
      // client-side RLS pitfalls.
      const { data: rpcRows, error: rpcErr } = await supabase.rpc(
        'create_ship_hotel',
        {
          p_name: data.hotelName,
          p_country: data.country,
          p_city: data.city,
          p_currency: data.currency,
          p_timezone: data.timezone,
          p_property_type_main: propertyType.category_main,
          p_property_type_sub: propertyType.category_sub,
          p_property_type_custom: propertyType.category_custom ?? null,
        }
      )
      if (rpcErr) throw rpcErr
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      if (!row?.hotel_id) throw new Error('RPC returned no hotel_id')

      patch({ hotelId: row.hotel_id, hotelSlug: row.slug })
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
