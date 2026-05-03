// ============================================================================
// usePageViewLogger — logs every public page navigation to public.page_views
// ============================================================================
// Mounted ONCE at the App root (inside <BrowserRouter>). Fires on every route
// change. Skips admin/dashboard routes since those are operator-side, not
// visitor traffic. Skips duplicate fires for the same session+path within 5
// minutes (browser back/forward thrashing shouldn't double-count).
// ============================================================================
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Routes we DON'T track (operator-side, not visitor traffic)
const SKIP_PREFIXES = ['/admin', '/dashboard']

// Per-session id — regenerated on tab open. Lives in sessionStorage so
// reload keeps the same id, but new tab gets a fresh one (= new "visit").
function getSessionId() {
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let id = sessionStorage.getItem('staylo_sid')
  if (!id) {
    id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    sessionStorage.setItem('staylo_sid', id)
  }
  return id
}

// Crude device classifier from user agent — good enough for "mobile vs desktop"
function getDevice() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/Mobile|iPhone|Android.*Mobile|Phone/i.test(ua)) return 'mobile'
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua))      return 'tablet'
  return 'desktop'
}

// Strip query strings + hash so /vision?utm=x and /vision#section dedup to /vision
function cleanPath(p) {
  if (!p) return '/'
  const noQuery = p.split('?')[0].split('#')[0]
  return noQuery || '/'
}

export function usePageViewLogger() {
  const location = useLocation()
  const { user } = useAuth()
  const lastFired = useRef({ path: null, t: 0 })

  useEffect(() => {
    const path = cleanPath(location.pathname)

    // Don't track operator-side routes
    if (SKIP_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return

    // Dedup: same path within 5 minutes = same view (avoid back/forward double-count)
    const now = Date.now()
    if (lastFired.current.path === path && now - lastFired.current.t < 5 * 60 * 1000) return
    lastFired.current = { path, t: now }

    // Fire-and-forget — never block the user, never throw on failure
    supabase.from('page_views').insert({
      path,
      referrer:   typeof document !== 'undefined' ? (document.referrer || null) : null,
      session_id: getSessionId(),
      user_id:    user?.id || null,
      device:     getDevice(),
      language:   typeof navigator !== 'undefined' ? (navigator.language?.slice(0, 2) || null) : null,
    }).then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn('[pageview] log failed:', error.message)
    })
  }, [location.pathname, user?.id])
}
