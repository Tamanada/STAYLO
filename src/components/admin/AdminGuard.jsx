import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export function AdminGuard({ children }) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    async function checkAdmin() {
      if (!user) { setIsAdmin(false); return }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.role === 'admin')
    }
    if (user) checkAdmin()
    else setIsAdmin(false)
  }, [user])

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
