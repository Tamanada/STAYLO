import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      // Redirect to reset password page on PASSWORD_RECOVERY event
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      setProfile(data)
    } else {
      // Profile doesn't exist yet — create it from auth user metadata
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { generateReferralCode } = await import('../lib/referral')
        const { data: newProfile, error } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || null,
            referral_code: generateReferralCode(),
          })
          .select('*')
          .single()
        if (!error && newProfile) {
          setProfile(newProfile)
        }
      }
    }
  }

  async function signUp(email, password, fullName, referralCode) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (authError) throw authError

    // Profile creation is handled by a database trigger on auth.users
    // We store metadata in the signUp call so the trigger can use it
    // After signup, we wait briefly for the trigger then fetch the profile
    if (authData.user) {
      // Try to fetch/create profile — trigger may have already created it
      // If email confirmation is disabled, session is immediate
      const session = authData.session
      if (session) {
        const { generateReferralCode } = await import('../lib/referral')
        const myCode = generateReferralCode()

        let referrerId = null
        if (referralCode) {
          const { data: referrer } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', referralCode)
            .single()
          referrerId = referrer?.id
        }

        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          referral_code: myCode,
          referred_by: referrerId,
        })
        // Ignore duplicate key error (trigger may have created it)
        if (profileError && !profileError.message.includes('duplicate')) throw profileError

        // Update profile with name if trigger created it without name
        if (profileError?.message.includes('duplicate')) {
          await supabase.from('users').update({ full_name: fullName }).eq('id', authData.user.id)
        }

        if (referrerId) {
          await supabase.from('referrals').insert({
            referrer_id: referrerId,
            referred_id: authData.user.id,
          })
        }

        await fetchProfile(authData.user.id)
      }
    }

    return authData
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
