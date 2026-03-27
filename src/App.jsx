import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { AdminGuard } from './components/admin/AdminGuard'
import { AdminLayout } from './components/admin/AdminLayout'
import Home from './pages/Home'
import SurveyChooser from './pages/SurveyChooser'
import SurveyHotelier from './pages/SurveyHotelier'
import SurveyTraveler from './pages/SurveyTraveler'
import Submit from './pages/Submit'
import Vision from './pages/Vision'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import LOI from './pages/LOI'
import AmbassadorLanding from './pages/AmbassadorLanding'
import AmbassadorRegister from './pages/AmbassadorRegister'
import AmbassadorDashboard from './pages/AmbassadorDashboard'
import AmbassadorGuide from './pages/AmbassadorGuide'
import DashboardProperties from './pages/dashboard/DashboardProperties'
import DashboardReferrals from './pages/dashboard/DashboardReferrals'
import DashboardShares from './pages/dashboard/DashboardShares'
import DemoBookingEngine from './pages/dashboard/DemoBookingEngine'
import DemoPropertyDetail from './pages/dashboard/DemoPropertyDetail'
import Splash from './pages/Splash'
import ResetPassword from './pages/ResetPassword'
import Welcome from './pages/Welcome'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProperties from './pages/admin/AdminProperties'
import AdminSurveys from './pages/admin/AdminSurveys'
import AdminReferrals from './pages/admin/AdminReferrals'
import AdminAmbassadors from './pages/admin/AdminAmbassadors'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Admin routes — separate layout, no public Navbar/Footer */}
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="surveys" element={<AdminSurveys />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="ambassadors" element={<AdminAmbassadors />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Dashboard routes — separate clean layout, no Navbar/Footer */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<DashboardProperties />} />
            <Route path="referrals" element={<DashboardReferrals />} />
            <Route path="shares" element={<DashboardShares />} />
            <Route path="ambassador" element={<AmbassadorDashboard />} />
            <Route path="preview" element={<DemoBookingEngine />} />
            <Route path="preview/:id" element={<DemoPropertyDetail />} />
          </Route>

          {/* Welcome — standalone, no Navbar/Footer */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Public routes — with Navbar + Footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<SurveyChooser />} />
            <Route path="/survey/hotelier" element={<SurveyHotelier />} />
            <Route path="/survey/traveler" element={<SurveyTraveler />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Register />} />
            <Route path="/loi" element={<LOI />} />
            <Route path="/loi/:ref" element={<LOI />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/ambassador" element={<AmbassadorLanding />} />
            <Route path="/ambassador/register" element={<AmbassadorRegister />} />
            <Route path="/ambassador/guide" element={<AmbassadorGuide />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
