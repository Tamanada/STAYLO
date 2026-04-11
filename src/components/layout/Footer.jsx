import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: '#2D3436' }} className="text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="text-3xl font-black text-white">Stay</span>
              <span className="text-3xl font-black" style={{ color: '#FF6B00' }}>lo</span>
            </div>
            <p className="text-sm mt-2" style={{ color: '#B2BEC3' }}>
              Built with hoteliers, for hoteliers.
            </p>
            <p className="text-xs mt-1" style={{ color: '#636E72' }}>
              Who owns the platform, makes the rules.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="space-y-2.5">
              <p className="section-label !text-[10px] !tracking-[0.15em]" style={{ color: '#FF6B00' }}>Platform</p>
              <Link to="/vision" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>About</Link>
              <Link to="/submit" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>For Hoteliers</Link>
              <Link to="/loi" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Investors</Link>
            </div>
            <div className="space-y-2.5">
              <p className="section-label !text-[10px] !tracking-[0.15em]" style={{ color: '#FF6B00' }}>Resources</p>
              <Link to="/splash" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Koh Phangan</Link>
              <Link to="/ambassador" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Ambassador</Link>
              <a href="mailto:contact@staylo.app" className="block text-sm no-underline transition-colors" style={{ color: '#B2BEC3' }}>Contact</a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs" style={{ color: '#636E72' }}>
            &copy; {year} Staylo Holdings Pte. Ltd. · Singapore · All rights reserved.
          </p>
          <p className="text-xs mt-1" style={{ color: '#636E72' }}>
            contact@staylo.app · staylo.app
          </p>
        </div>
      </div>
    </footer>
  )
}
