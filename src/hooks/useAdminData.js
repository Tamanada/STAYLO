import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Demo data for when Supabase is not connected
const DEMO_USERS = [
  { id: '1', email: 'sarah@sunsetresort.com', full_name: 'Sarah Chen', referral_code: 'STAYLO-SC001', referred_by: null, created_at: '2026-03-15T08:30:00Z' },
  { id: '2', email: 'marco@villaparadiso.it', full_name: 'Marco Rossi', referral_code: 'STAYLO-MR002', referred_by: '1', created_at: '2026-03-16T14:20:00Z' },
  { id: '3', email: 'yuki@ryokan-zen.jp', full_name: 'Yuki Tanaka', referral_code: 'STAYLO-YT003', referred_by: '1', created_at: '2026-03-17T06:45:00Z' },
  { id: '4', email: 'pablo@casarural.es', full_name: 'Pablo Garcia', referral_code: 'STAYLO-PG004', referred_by: '2', created_at: '2026-03-18T10:15:00Z' },
  { id: '5', email: 'nina@beachhouse.th', full_name: 'Nina Kowalski', referral_code: 'STAYLO-NK005', referred_by: null, created_at: '2026-03-19T16:00:00Z' },
  { id: '6', email: 'ahmed@riadmarrakech.ma', full_name: 'Ahmed El Fassi', referral_code: 'STAYLO-AE006', referred_by: '1', created_at: '2026-03-19T20:00:00Z' },
  { id: '7', email: 'lina@boutiquehotel.de', full_name: 'Lina Weber', referral_code: 'STAYLO-LW007', referred_by: '5', created_at: '2026-03-20T09:30:00Z' },
  { id: '8', email: 'raj@palacehotels.in', full_name: 'Raj Patel', referral_code: 'STAYLO-RP008', referred_by: '3', created_at: '2026-03-20T12:00:00Z' },
  { id: '9', email: 'chloe@chateauvigne.fr', full_name: 'Chloe Dubois', referral_code: 'STAYLO-CD009', referred_by: '2', created_at: '2026-03-21T07:00:00Z' },
  { id: '10', email: 'tom@backpackerhub.au', full_name: 'Tom Wilson', referral_code: 'STAYLO-TW010', referred_by: null, created_at: '2026-03-21T15:45:00Z' },
  { id: '11', email: 'mei@gardeninn.cn', full_name: 'Mei Zhang', referral_code: 'STAYLO-MZ011', referred_by: '3', created_at: '2026-03-22T03:00:00Z' },
  { id: '12', email: 'carlos@ecolodge.br', full_name: 'Carlos Silva', referral_code: 'STAYLO-CS012', referred_by: '5', created_at: '2026-03-22T11:30:00Z' },
]

const DEMO_PROPERTIES = [
  { id: 'p1', user_id: '1', name: 'Sunset Beach Resort', type: 'resort', country: 'Thailand', city: 'Koh Phangan', booking_link: 'https://booking.com/sunset-beach', airbnb_link: null, room_count: 45, avg_nightly_rate: 120, contact_email: 'sarah@sunsetresort.com', status: 'validated', created_at: '2026-03-15T09:00:00Z' },
  { id: 'p2', user_id: '2', name: 'Villa Paradiso', type: 'villa', country: 'Italy', city: 'Amalfi', booking_link: 'https://booking.com/villa-paradiso', airbnb_link: 'https://airbnb.com/rooms/paradiso', room_count: 8, avg_nightly_rate: 280, contact_email: 'marco@villaparadiso.it', status: 'live', created_at: '2026-03-16T15:00:00Z' },
  { id: 'p3', user_id: '3', name: 'Ryokan Zen Garden', type: 'guesthouse', country: 'Japan', city: 'Kyoto', booking_link: null, airbnb_link: 'https://airbnb.com/rooms/zen-garden', room_count: 12, avg_nightly_rate: 195, contact_email: 'yuki@ryokan-zen.jp', status: 'reviewing', created_at: '2026-03-17T07:00:00Z' },
  { id: 'p4', user_id: '4', name: 'Casa Rural El Olivo', type: 'guesthouse', country: 'Spain', city: 'Granada', booking_link: 'https://booking.com/casa-olivo', airbnb_link: null, room_count: 6, avg_nightly_rate: 85, contact_email: 'pablo@casarural.es', status: 'pending', created_at: '2026-03-18T11:00:00Z' },
  { id: 'p5', user_id: '5', name: 'Tropical Beach House', type: 'hotel', country: 'Thailand', city: 'Koh Samui', booking_link: 'https://booking.com/tropical-beach', airbnb_link: null, room_count: 24, avg_nightly_rate: 95, contact_email: 'nina@beachhouse.th', status: 'pending', created_at: '2026-03-19T17:00:00Z' },
  { id: 'p6', user_id: '6', name: 'Riad Marrakech Stars', type: 'hotel', country: 'Morocco', city: 'Marrakech', booking_link: 'https://booking.com/riad-stars', airbnb_link: null, room_count: 10, avg_nightly_rate: 150, contact_email: 'ahmed@riadmarrakech.ma', status: 'validated', created_at: '2026-03-20T05:00:00Z' },
  { id: 'p7', user_id: '7', name: 'Boutique Hotel Berlin', type: 'hotel', country: 'Germany', city: 'Berlin', booking_link: 'https://booking.com/boutique-berlin', airbnb_link: null, room_count: 30, avg_nightly_rate: 170, contact_email: 'lina@boutiquehotel.de', status: 'reviewing', created_at: '2026-03-20T10:00:00Z' },
  { id: 'p8', user_id: '8', name: 'Palace Heritage Hotel', type: 'resort', country: 'India', city: 'Jaipur', booking_link: 'https://booking.com/palace-jaipur', airbnb_link: null, room_count: 55, avg_nightly_rate: 200, contact_email: 'raj@palacehotels.in', status: 'pending', created_at: '2026-03-21T08:00:00Z' },
  { id: 'p9', user_id: '10', name: 'Backpacker Hub Sydney', type: 'hostel', country: 'Australia', city: 'Sydney', booking_link: null, airbnb_link: 'https://airbnb.com/rooms/backpacker-hub', room_count: 40, avg_nightly_rate: 35, contact_email: 'tom@backpackerhub.au', status: 'pending', created_at: '2026-03-21T16:00:00Z' },
]

const DEMO_SURVEYS = [
  { id: 's1', user_id: '1', platforms_used: ['booking', 'expedia'], commission_pct: 22, biggest_frustration: 'High commissions eating into profits, no flexibility on pricing', interest_score: 9, would_join: true, room_count: 45, created_at: '2026-03-15T08:45:00Z' },
  { id: 's2', user_id: '2', platforms_used: ['booking', 'airbnb'], commission_pct: 18, biggest_frustration: 'Guest data is owned by the platform, not by us', interest_score: 8, would_join: true, room_count: 8, created_at: '2026-03-16T14:30:00Z' },
  { id: 's3', user_id: '3', platforms_used: ['airbnb'], commission_pct: 15, biggest_frustration: 'Poor customer support and unfair review system', interest_score: 7, would_join: true, room_count: 12, created_at: '2026-03-17T07:00:00Z' },
  { id: 's4', user_id: '4', platforms_used: ['booking'], commission_pct: 20, biggest_frustration: 'Rate parity requirements prevent us from offering direct deals', interest_score: 10, would_join: true, room_count: 6, created_at: '2026-03-18T10:30:00Z' },
  { id: 's5', user_id: '5', platforms_used: ['booking', 'agoda'], commission_pct: 19, biggest_frustration: 'Too many hidden fees and forced promotions', interest_score: 8, would_join: true, room_count: 24, created_at: '2026-03-19T16:15:00Z' },
  { id: 's6', user_id: '6', platforms_used: ['booking', 'tripadvisor'], commission_pct: 25, biggest_frustration: 'Commission keeps increasing year after year', interest_score: 10, would_join: true, room_count: 10, created_at: '2026-03-19T20:15:00Z' },
  { id: 's7', user_id: '7', platforms_used: ['booking', 'expedia', 'airbnb'], commission_pct: 21, biggest_frustration: 'No brand visibility, guests think they book with OTA not with us', interest_score: 9, would_join: true, room_count: 30, created_at: '2026-03-20T09:45:00Z' },
  { id: 's8', user_id: '8', platforms_used: ['booking', 'agoda', 'expedia'], commission_pct: 23, biggest_frustration: 'Forced to participate in discounts that cut our margins', interest_score: 8, would_join: true, room_count: 55, created_at: '2026-03-20T12:15:00Z' },
  { id: 's9', user_id: null, platforms_used: ['direct'], commission_pct: 0, biggest_frustration: 'Hard to get visibility without OTAs', interest_score: 6, would_join: false, room_count: 3, created_at: '2026-03-21T09:00:00Z' },
  { id: 's10', user_id: '10', platforms_used: ['booking', 'airbnb'], commission_pct: 17, biggest_frustration: 'Algorithm favors big chains over independent hostels', interest_score: 9, would_join: true, room_count: 40, created_at: '2026-03-21T16:00:00Z' },
]

const DEMO_REFERRALS = [
  { id: 'r1', referrer_id: '1', referred_id: '2', created_at: '2026-03-16T14:20:00Z' },
  { id: 'r2', referrer_id: '1', referred_id: '3', created_at: '2026-03-17T06:45:00Z' },
  { id: 'r3', referrer_id: '1', referred_id: '6', created_at: '2026-03-19T20:00:00Z' },
  { id: 'r4', referrer_id: '2', referred_id: '4', created_at: '2026-03-18T10:15:00Z' },
  { id: 'r5', referrer_id: '2', referred_id: '9', created_at: '2026-03-21T07:00:00Z' },
  { id: 'r6', referrer_id: '5', referred_id: '7', created_at: '2026-03-20T09:30:00Z' },
  { id: 'r7', referrer_id: '5', referred_id: '12', created_at: '2026-03-22T11:30:00Z' },
  { id: 'r8', referrer_id: '3', referred_id: '8', created_at: '2026-03-20T12:00:00Z' },
  { id: 'r9', referrer_id: '3', referred_id: '11', created_at: '2026-03-22T03:00:00Z' },
]

// Check if Supabase is properly configured
function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && !url.includes('your-project')
}

export function useAdminData() {
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [surveys, setSurveys] = useState([])
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    // No more silent demo fallback. If Supabase isn't configured we
    // surface empty arrays + log a warning rather than show the admin
    // imaginary data that could mislead a real operator.
    if (!isSupabaseConfigured()) {
      console.warn('[useAdminData] Supabase not configured — admin sees empty state.')
      setUsers([])
      setProperties([])
      setSurveys([])
      setReferrals([])
      setLoading(false)
      return
    }

    try {
      const [usersRes, propsRes, surveysRes, referralsRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('survey_answers').select('*').order('created_at', { ascending: false }),
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
      ])

      setUsers(usersRes.data || [])
      setProperties(propsRes.data || [])
      setSurveys(surveysRes.data || [])
      setReferrals(referralsRes.data || [])
    } catch (err) {
      console.error('[useAdminData] fetch error:', err)
      setUsers([])
      setProperties([])
      setSurveys([])
      setReferrals([])
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function updatePropertyStatus(propertyId, newStatus) {
    if (isSupabaseConfigured()) {
      await supabase.from('properties').update({ status: newStatus }).eq('id', propertyId)
    }
    // Optimistic update
    setProperties(prev =>
      prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p)
    )
  }

  function getUserById(id) {
    return users.find(u => u.id === id)
  }

  function getPropertiesByUser(userId) {
    return properties.filter(p => p.user_id === userId)
  }

  function getSurveyByUser(userId) {
    return surveys.find(s => s.user_id === userId)
  }

  function getReferralsByReferrer(referrerId) {
    return referrals.filter(r => r.referrer_id === referrerId)
  }

  // Dashboard stats
  const stats = {
    totalUsers: users.length,
    totalProperties: properties.length,
    totalSurveys: surveys.length,
    totalReferrals: referrals.length,
    propertiesByStatus: {
      pending: properties.filter(p => p.status === 'pending').length,
      reviewing: properties.filter(p => p.status === 'reviewing').length,
      validated: properties.filter(p => p.status === 'validated').length,
      live: properties.filter(p => p.status === 'live').length,
    },
    avgInterestScore: surveys.length
      ? (surveys.reduce((sum, s) => sum + Number(s.interest_score || 0), 0) / surveys.length).toFixed(1)
      : 0,
    avgCommission: surveys.length
      ? (surveys.reduce((sum, s) => sum + Number(s.commission_pct || 0), 0) / surveys.length).toFixed(1)
      : 0,
    wouldJoinRate: surveys.length
      ? Math.round((surveys.filter(s => s.would_join).length / surveys.length) * 100)
      : 0,
  }

  return {
    users, properties, surveys, referrals,
    loading, refetch: fetchAll,
    updatePropertyStatus,
    getUserById, getPropertiesByUser, getSurveyByUser, getReferralsByReferrer,
    stats,
  }
}
