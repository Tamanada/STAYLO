import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './guest/guest.css'
import './i18n'
import GuestApp from './GuestApp.jsx'

// Entry point for the GUEST-FACING app (served at app.staylo.app via the
// host-based rewrite in vercel.json). Mounts a completely separate React
// tree from the hotelier dashboard (src/App.jsx) — no shared layout,
// no shared sidebar, no shared route table. Shared infra (i18n, supabase,
// hooks, design tokens) stays in src/ for reuse.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <GuestApp />
    </HelmetProvider>
  </StrictMode>,
)
