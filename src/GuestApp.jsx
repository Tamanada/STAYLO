// =====================================================================
// GuestApp — root component for the guest-facing PWA (app.staylo.app)
// =====================================================================
//
// Separate React tree from the hotelier dashboard (App.jsx). Five top-
// level routes for the demo / phase-1:
//
//   /                   → Stay overview (Hôtel actuel + check-in CTA)
//   /booking            → Booking summary (chambre + dates + paiement)
//   /checkin            → QR code check-in flow
//   /services           → Catalogue de l'hôtel courant (resto/spa/etc.)
//   /history            → Past stays + $STAY balance + loyalty
//
// All screens are MOCKUPS for now — they tell the story for the
// Sasiwimol demo. Real booking / payment / Supabase wiring lands in
// phase 2. Each route is designed mobile-first (PWA on phone).
//
// The bottom-nav (.guest-rail) is the single source of navigation —
// matches the messenger pattern but with guest-oriented icons + labels.

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import GuestHome     from './guest/routes/Home.jsx'
import GuestBooking  from './guest/routes/Booking.jsx'
import GuestCheckin  from './guest/routes/Checkin.jsx'
import GuestChat     from './guest/routes/Chat.jsx'
import GuestServices from './guest/routes/Services.jsx'
import GuestHistory  from './guest/routes/History.jsx'

export default function GuestApp() {
  return (
    <BrowserRouter>
      <div className="guest-shell">
        <main className="guest-main">
          <Routes>
            <Route path="/"         element={<GuestHome />} />
            <Route path="/booking"  element={<GuestBooking />} />
            <Route path="/checkin"  element={<GuestCheckin />} />
            <Route path="/chat"     element={<GuestChat />} />
            <Route path="/services" element={<GuestServices />} />
            <Route path="/history"  element={<GuestHistory />} />
            {/* Catch-all: route unknown paths back to home so the PWA
                deep-links never end on a 404 inside the app */}
            <Route path="*"         element={<GuestHome />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

// Bottom-nav: 5 sections, gradient orange→pink like the messenger
// (single brand color across both apps). White text + SVG line icons,
// active state lifts with a white pill + scaled icon — same treatment
// as messenger.html's `.rail`.
function BottomNav() {
  // 6 tabs — fits comfortably down to ~360px (60px each). Chat sits in
  // the middle of the flow because it's the most-tapped surface in a
  // stay (more than Services or History) and it visualizes the live
  // bridge to the staff messenger.
  return (
    <nav className="guest-rail" aria-label="Main navigation">
      <NavTab to="/"         end label="Stay"     icon={IconHome} />
      <NavTab to="/booking"  label="Booking"      icon={IconKey} />
      <NavTab to="/checkin"  label="Check-in"     icon={IconQR} />
      <NavTab to="/chat"     label="Chat"         icon={IconChat} />
      <NavTab to="/services" label="Services"     icon={IconBell} />
      <NavTab to="/history"  label="History"      icon={IconUser} />
    </nav>
  )
}

function NavTab({ to, end, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => 'guest-rail-btn' + (isActive ? ' active' : '')}
    >
      <Icon className="guest-rail-icon" />
      <span className="guest-rail-lbl">{label}</span>
    </NavLink>
  )
}

// Inline SVGs — Lucide line-style, currentColor-driven. Identical
// rendering across iOS / Android / Windows / Linux (no emoji fallback
// inconsistency). Sized via CSS .guest-rail-icon = 22×22.
function IconHome(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-5h-4v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
    </svg>
  )
}
function IconKey(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="m21 2-9.6 9.6"/>
      <path d="m15.5 7.5 3 3L22 7l-3-3"/>
    </svg>
  )
}
function IconQR(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <path d="M14 14h3M14 17h7M17 21h4M14 21v-2"/>
    </svg>
  )
}
function IconBell(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
}
function IconUser(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconChat(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
  )
}
