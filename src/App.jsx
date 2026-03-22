import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { AdminGuard } from './components/admin/AdminGuard'
import { AdminLayout } from './components/admin/AdminLayout'
import Home from './pages/Home'
import Survey from './pages/Survey'
import Submit from './pages/Submit'
import Vision from './pages/Vision'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProperties from './pages/admin/AdminProperties'
import AdminSurveys from './pages/admin/AdminSurveys'
import AdminReferrals from './pages/admin/AdminReferrals'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <BrowserRouter basename="/STAYLO">
      <AuthProvider>
        <Routes>
          {/* Admin routes — separate layout, no public Navbar/Footer */}
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="surveys" element={<AdminSurveys />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Public routes — with Navbar + Footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Register />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
