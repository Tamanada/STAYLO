import { useSearchParams, Link } from 'react-router-dom'
import { Hotel, Users, Megaphone, ArrowRight, Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function Welcome() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const amb = searchParams.get('amb') || ''
  const code = ref || amb
  const refParam = ref ? `?ref=${ref}` : amb ? `?amb=${amb}` : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep via-[#0F2847] to-deep flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-white">
            stay <span className="text-sunset">lo</span>
          </Link>
          {code && (
            <p className="text-sm text-gray-400 mt-2">
              Referred by: <span className="font-mono text-golden">{code}</span>
            </p>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Welcome to Staylo
          </h1>
          <p className="text-gray-400">
            What brings you here today?
          </p>
        </div>

        {/* 3 Choices */}
        <div className="space-y-4">
          {/* Become a Founding Partner */}
          <Link to={`/register${refParam}`}>
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-golden/50 hover:bg-golden/5 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-golden to-sunrise rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-golden transition-colors">Become a Founding Partner</h3>
                  <p className="text-sm text-gray-400">Invest in Staylo and own a piece of the platform</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-golden transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Register my property */}
          <Link to={`/submit${refParam}`}>
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-libre/50 hover:bg-libre/5 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-libre to-ocean rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Hotel size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-libre transition-colors">Register my property</h3>
                  <p className="text-sm text-gray-400">Add your hotel, guesthouse, or resort to Staylo</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-libre transition-colors shrink-0" />
              </div>
            </Card>
          </Link>

          {/* Become an Ambassador */}
          <Link to="/ambassador/register">
            <Card className="p-5 bg-white/5 backdrop-blur border border-white/10 hover:border-sunset/50 hover:bg-sunset/5 transition-all cursor-pointer group mt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sunset to-sunrise rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Megaphone size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-sunset transition-colors">Become an Ambassador</h3>
                  <p className="text-sm text-gray-400">Earn 2% passive income for life on every hotel you bring</p>
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-sunset transition-colors shrink-0" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-10">
          Already have an account? <Link to="/login" className="text-ocean hover:text-electric underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
