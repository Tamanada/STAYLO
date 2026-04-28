import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: '#2D3436' }} className="text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="max-w-sm">
            <div className="flex items-center gap-1 mb-3">
              <span className="text-3xl font-black text-white">Stay</span>
              <span className="text-3xl font-black" style={{ color: '#FF6B00' }}>lo</span>
            </div>
            <p className="text-sm mt-2 font-semibold" style={{ color: '#B2BEC3' }}>
              Built with hoteliers, for hoteliers.
            </p>
            <p className="text-xs mt-1 italic" style={{ color: '#636E72' }}>
              Alone, it is impossible. Together, we are unstoppable.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(247,147,26,0.12)', color: '#F7931A' }}>
                ⚡ Bitcoin native
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(108,92,231,0.12)', color: '#6C5CE7' }}>
                ◎ Solana DAO
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-10">
            <div className="space-y-2.5">
              <p className="section-label !text-[10px] !tracking-[0.15em]" style={{ color: '#FF6B00' }}>Platform</p>
              <Link to="/ota" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Réserver</Link>
              <Link to="/vision" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>About</Link>
              <Link to="/submit" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>For Hoteliers</Link>
              <Link to="/loi" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Investors</Link>
            </div>
            <div className="space-y-2.5">
              <p className="section-label !text-[10px] !tracking-[0.15em]" style={{ color: '#FF6B00' }}>Community</p>
              <Link to="/splash" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Koh Phangan</Link>
              <Link to="/ambassador" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Ambassador</Link>
              <a href="mailto:contact@staylo.app" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Contact</a>
            </div>
            <div className="space-y-2.5">
              <p className="section-label !text-[10px] !tracking-[0.15em]" style={{ color: '#FF6B00' }}>Legal</p>
              <Link to="/legal/terms" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Terms</Link>
              <Link to="/legal/privacy" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Privacy</Link>
              <span className="block text-xs" style={{ color: '#636E72' }}>Singapore Pte Ltd<br/>(incorporation pending)</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs" style={{ color: '#636E72' }}>
            &copy; {year} Staylo Holdings Pte. Ltd. · Singapore · All rights reserved.
          </p>
          <p className="text-xs mt-1" style={{ color: '#636E72' }}>
            contact@staylo.app · +66 96 269 4286 · staylo.app
          </p>
          <p className="text-[10px] mt-3" style={{ color: '#3F4548' }}>
            IP Protection: STAYLO-IP-2025-001 · SHA-256 anchored to Bitcoin blockchain via originstamp.org (2026-04-25).
          </p>
        </div>
      </div>
    </footer>
  )
}
