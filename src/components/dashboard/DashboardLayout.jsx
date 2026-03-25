import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { DashboardSidebar } from './DashboardSidebar'

export function DashboardLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-electric border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
