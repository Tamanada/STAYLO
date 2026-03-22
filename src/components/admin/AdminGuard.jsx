import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').filter(Boolean)

// Hardcoded fallback for alpha
const DEFAULT_ADMINS = ['admin@staylo.app', 'david@staylo.app']

const allowedEmails = [...new Set([...DEFAULT_ADMINS, ...ADMIN_EMAILS])]

export function AdminGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !allowedEmails.includes(user.email)) {
    return <Navigate to="/" replace />
  }

  return children
}
