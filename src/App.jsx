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
import OTASearch from './pages/ota/Search'
import OTAPropertyDetail from './pages/ota/PropertyDetail'
import OTACheckout from './pages/ota/Checkout'
import LegalTerms from './pages/legal/Terms'
import LegalPrivacy from './pages/legal/Privacy'
import PropertyManage from './pages/dashboard/PropertyManage'
import DashboardKit from './pages/dashboard/DashboardKit'
import PMSFrontDesk from './pages/dashboard/PMSFrontDesk'
import PMSHousekeeping from './pages/dashboard/PMSHousekeeping'
import PMSReports from './pages/dashboard/PMSReports'
import MyBookings from './pages/dashboard/MyBookings'
import Banking from './pages/dashboard/Banking'
import Splash from './pages/Splash'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Welcome from './pages/Welcome'
import EmailVerificationGate from './components/auth/EmailVerificationGate'
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
            <Route path="kit" element={<DashboardKit />} />
            <Route path="property/:id" element={<PropertyManage />} />
            <Route path="front-desk" element={<PMSFrontDesk />} />
            <Route path="housekeeping" element={<PMSHousekeeping />} />
            <Route path="reports" element={<PMSReports />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="banking" element={<Banking />} />
          </Route>

          {/* Welcome — standalone, no Navbar/Footer */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Public routes — with Navbar + Footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<SurveyChooser />} />
            <Route path="/survey/hotelier" element={<SurveyHotelier />} />
            <Route path="/survey/traveler" element={<SurveyTraveler />} />
            <Route path="/submit" element={<EmailVerificationGate reason="to list a property"><Submit /></EmailVerificationGate>} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Register />} />
            <Route path="/loi" element={<LOI />} />
            <Route path="/loi/:ref" element={<LOI />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/ambassador" element={<AmbassadorLanding />} />
            <Route path="/ambassador/register" element={<AmbassadorRegister />} />
            <Route path="/ambassador/guide" element={<AmbassadorGuide />} />

            {/* OTA — public booking site (was /dashboard/book/* until 2026-04-22) */}
            <Route path="/ota" element={<OTASearch />} />
            <Route path="/ota/:id" element={<OTAPropertyDetail />} />
            <Route path="/ota/:id/checkout" element={<EmailVerificationGate reason="to complete a booking"><OTACheckout /></EmailVerificationGate>} />

            {/* Legal pages — Alpha placeholders, to be replaced by counsel */}
            <Route path="/legal/terms" element={<LegalTerms />} />
            <Route path="/legal/privacy" element={<LegalPrivacy />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
