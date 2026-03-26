import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { generateReferralCode } from '../lib/referral'

export function useReferral() {
  const { profile, fetchProfile } = useAuth()
  const [referralCount, setReferralCount] = useState(0)
  const [referralRank, setReferralRank] = useState(null)
  const [referredUsers, setReferredUsers] = useState([])

  // Auto-generate referral code if user doesn't have one
  useEffect(() => {
    if (!profile?.id) return
    // Skip if user already has a valid referral code
    if (profile.referral_code && profile.referral_code.trim() !== '') return

    async function ensureReferralCode() {
      const code = generateReferralCode()
      console.log('[useReferral] Generating referral code:', code, 'for user:', profile.id)
      const { data, error } = await supabase
        .from('users')
        .update({ referral_code: code })
        .eq('id', profile.id)
        .select('referral_code')
        .single()
      if (error) {
        console.error('[useReferral] Failed to save referral code:', error)
      } else {
        console.log('[useReferral] Saved referral code:', data)
        fetchProfile(profile.id)
      }
    }

    ensureReferralCode()
  }, [profile?.id, profile?.referral_code])

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
    ? `https://staylo.app/welcome?ref=${profile.referral_code}`
    : null

  return { referralCount, referralRank, referredUsers, referralLink, referralCode: profile?.referral_code }
}
