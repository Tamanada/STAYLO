import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useReferral() {
  const { profile } = useAuth()
  const [referralCount, setReferralCount] = useState(0)
  const [referralRank, setReferralRank] = useState(null)
  const [referredUsers, setReferredUsers] = useState([])

  useEffect(() => {
    if (!profile?.id) return

    async function fetchReferrals() {
      const { data, count } = await supabase
        .from('referrals')
        .select('*, referred:referred_id(email, full_name, created_at)', { count: 'exact' })
        .eq('referrer_id', profile.id)

      setReferralCount(count || 0)
      setReferredUsers(data || [])
    }

    fetchReferrals()
  }, [profile?.id])

  const referralLink = profile?.referral_code
    ? `https://staylo.app/join?ref=${profile.referral_code}`
    : null

  return { referralCount, referralRank, referredUsers, referralLink, referralCode: profile?.referral_code }
}
