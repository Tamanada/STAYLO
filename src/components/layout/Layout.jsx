import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-warm-white">
      <Navbar />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  )
}
