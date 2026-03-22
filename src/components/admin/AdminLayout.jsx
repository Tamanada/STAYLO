import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
