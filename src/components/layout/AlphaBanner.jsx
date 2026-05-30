import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

/**
 * The "ALPHA ROUND OPEN · KOH PHANGAN" announcement bar.
 *
 * Rendered via a React Portal that targets a host <div> the effect
 * inserts immediately AFTER the first <section> in <main>. That way the
 * banner consistently sits below each page's hero image without each
 * page having to import or render anything.
 */
export function AlphaBanner() {
  const [host, setHost] = useState(null)
  const location = useLocation()

  useEffect(() => {
    // Defer one frame so the new route has had time to mount its first section.
    let raf = requestAnimationFrame(() => {
      const firstSection = document.querySelector('main section')
      if (!firstSection) { setHost(null); return }
      let h = document.getElementById('alpha-banner-host')
      if (!h) {
        h = document.createElement('div')
        h.id = 'alpha-banner-host'
      }
      if (firstSection.nextSibling !== h) {
        firstSection.parentNode.insertBefore(h, firstSection.nextSibling)
      }
      setHost(h)
    })
    return () => cancelAnimationFrame(raf)
  }, [location.pathname])

  if (!host) return null
  return createPortal(
    <div
      className="w-full py-4 px-4 text-center border-y"
      style={{
        background: 'linear-gradient(90deg, rgba(255,107,0,0.08), rgba(255,60,180,0.06))',
        borderColor: 'rgba(255,107,0,0.15)',
      }}
    >
      <p className="text-xl font-bold tracking-wide" style={{ color: '#FF6B00' }}>
        ✦ ALPHA ROUND OPEN · KOH PHANGAN ✦
      </p>
      <p className="text-base mt-1" style={{ color: '#636E72' }}>
        3,000 shares · $1,000/share · World Round opens at $1,500
      </p>
    </div>,
    host
  )
}
