import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Smooth-scrolls to the element matching `location.hash` on arrival and on
 * hash change — powers the navbar section dropdowns (e.g. /vision#v-roadmap).
 * `offset` clears the sticky navbar (≈64px) plus a little breathing room.
 */
export function useHashScroll(offset = 80) {
  const location = useLocation()
  useEffect(() => {
    const id = (location.hash || '').replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    const tmr = setTimeout(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }, 80)
    return () => clearTimeout(tmr)
    // location.key changes on every navigation, so re-scrolling works even
    // when the user re-selects the same #anchor they're already on.
  }, [location.hash, location.key, offset])
}
