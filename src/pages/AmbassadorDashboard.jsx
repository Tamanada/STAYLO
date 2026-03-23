import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Hotel, DollarSign, Users, CheckCircle, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAmbassador } from '../hooks/useAmbassador'

const statusColors = {
  active: 'green',
  pending: 'orange',
}

const propertyStatusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

function calcHotelEarnings(hotel) {
  const rooms = hotel.room_count || 10
  const rate = hotel.avg_nightly_rate || 60
  return rooms * rate * 365 * 0.65 * 0.02
}

export default function AmbassadorDashboard() {
  const { ambassador, hotels, loading, estimatedEarnings, ambassadorLink } = useAmbassador()
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (ambassadorLink) {
      navigator.clipboard.writeText(ambassadorLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  if (!ambassador) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-deep mb-2">You're not registered as an ambassador</h2>
        <p className="text-gray-500 mb-6">Join the ambassador program to earn commissions by referring hotels to Staylo.</p>
        <Link to="/ambassador/register">
          <Button>
            Become an Ambassador
            <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep">
          Welcome, {ambassador.full_name || 'Ambassador'}
        </h1>
        <p className="text-gray-500 mt-1">
          Ambassador Code: <code className="font-mono bg-gray-100 px-2 py-0.5 rounded text-ocean">{ambassador.referral_code}</code>
        </p>
        <Link to="/ambassador/guide" className="inline-flex items-center gap-2 mt-3 text-sm text-ocean hover:text-electric transition-colors no-underline">
          📖 Read the Ambassador Guide
        </Link>
      </div>

      {/* Referral Link */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-deep mb-3">Your Referral Link</h3>
        <div className="flex items-center gap-2 bg-cream rounded-lg p-3">
          <code className="text-sm text-ocean flex-1 truncate font-mono">
            {ambassadorLink || 'Loading...'}
          </code>
          <button
            onClick={copyLink}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {copied ? <CheckCircle size={16} className="text-libre" /> : <Copy size={16} className="text-gray-400" />}
          </button>
        </div>
        {copied && <p className="text-xs text-libre mt-2">Link copied to clipboard!</p>}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-ocean/10 rounded-2xl flex items-center justify-center">
            <Hotel size={24} className="text-ocean" />
          </div>
          <p className="text-3xl font-extrabold text-ocean">{hotels.length}</p>
          <p className="text-sm text-gray-500 mt-1">Hotels Brought</p>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-libre/10 rounded-2xl flex items-center justify-center">
            <DollarSign size={24} className="text-libre" />
          </div>
          <p className="text-3xl font-extrabold text-libre">
            ${Math.round(estimatedEarnings).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Est. Annual Earnings</p>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-50 rounded-2xl flex items-center justify-center">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <Badge variant={statusColors[ambassador.status] || 'gray'} className="text-lg px-4 py-1">
            {ambassador.status || 'pending'}
          </Badge>
          <p className="text-sm text-gray-500 mt-2">Status</p>
        </Card>
      </div>

      {/* Hotels Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-deep mb-4">Your Hotels</h2>

        {hotels.length === 0 ? (
          <Card className="p-8 text-center">
            <Hotel size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hotels linked yet. Share your referral link to get started!</p>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rooms</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Est. Earnings</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hotels.map((hotel, i) => {
                  const earnings = calcHotelEarnings(hotel)
                  return (
                    <tr key={hotel.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{hotel.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{hotel.type || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{hotel.room_count || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-libre">${Math.round(earnings).toLocaleString()}/yr</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={propertyStatusColors[hotel.status] || 'gray'}>
                          {hotel.status || 'pending'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Earnings Breakdown */}
      {hotels.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-deep mb-4">Earnings Breakdown</h2>
          <div className="space-y-3">
            {hotels.map(hotel => {
              const rooms = hotel.room_count || 10
              const rate = hotel.avg_nightly_rate || 60
              const annualGMV = rooms * rate * 365 * 0.65
              const earnings = annualGMV * 0.02
              return (
                <Card key={hotel.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-deep">{hotel.name}</h4>
                    <span className="text-lg font-bold text-libre">${Math.round(earnings).toLocaleString()}/yr</span>
                  </div>
                  <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>{rooms} rooms</span>
                    <span>${rate}/night avg</span>
                    <span>65% occupancy</span>
                    <span>Annual GMV: ${Math.round(annualGMV).toLocaleString()}</span>
                    <span>2% commission</span>
                  </div>
                </Card>
              )
            })}
            <Card className="p-5 border-2 border-ocean/20 bg-ocean/5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-deep">Total Estimated Annual Earnings</h4>
                <span className="text-2xl font-extrabold text-ocean">${Math.round(estimatedEarnings).toLocaleString()}</span>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
