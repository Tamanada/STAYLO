import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAmbassador() {
  const { user, profile } = useAuth()
  const [ambassador, setAmbassador] = useState(null)
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchAmbassador()
  }, [user])

  async function fetchAmbassador() {
    setLoading(true)
    try {
      // Get ambassador profile (existence flag + payout settings)
      const { data: amb } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (amb) {
        setAmbassador(amb)
        // Get properties linked to this ambassador
        const { data: props } = await supabase
          .from('properties')
          .select('*, users:user_id(full_name, email)')
          .eq('ambassador_id', amb.id)
        setHotels(props || [])
      }
    } catch (err) {
      console.error('Ambassador fetch error:', err)
    }
    setLoading(false)
  }

  // Estimated earnings: 2% of each hotel's annual GMV
  const estimatedEarnings = hotels.reduce((total, hotel) => {
    const rooms = hotel.room_count || 10
    const rate = hotel.avg_nightly_rate || 60
    const occupancy = 0.65
    const annualGMV = rooms * rate * 365 * occupancy
    return total + (annualGMV * 0.02)
  }, 0)

  // KISS: ONE referral code per user (the STAYLO-XXXX from users.referral_code).
  // Backend attribution uses users.referred_by (FK on user id), not the code
  // string — so dropping the separate AMB code costs nothing operationally.
  // Old ?amb= links keep working: Welcome.jsx still accepts both ?ref= and ?amb=.
  const ambassadorLink = (ambassador && profile?.referral_code)
    ? `https://staylo.app/welcome?ref=${profile.referral_code}`
    : null

  return {
    ambassador,
    hotels,
    loading,
    estimatedEarnings,
    ambassadorLink,
    refetch: fetchAmbassador,
  }
}
