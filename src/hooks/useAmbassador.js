import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAmbassador() {
  const { user } = useAuth()
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
      // Get ambassador profile
      const { data: amb } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('user_id', user.id)
        .single()

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

  const ambassadorLink = ambassador
    ? `https://staylo.app/join?amb=${ambassador.referral_code}`
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
