import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Check, Plus, Lock, Building2, Users, TrendingUp, Zap, Star, MessageSquare, FileText, Shield, Coins, Share2, Trophy, Send, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { useReferral } from '../hooks/useReferral'
import { supabase } from '../lib/supabase'

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

const loiStatusConfig = {
  not_signed: { label: 'Not signed', color: 'gray', icon: FileText },
  signed: { label: 'LOI Signed', color: 'blue', icon: Check },
  contract_pending: { label: 'Contract pending', color: 'orange', icon: Shield },
  confirmed: { label: 'Partner confirmed', color: 'green', icon: Star },
}

const futureFeatures = [
  { key: 'booking_engine', icon: Zap },
  { key: 'channel_manager', icon: TrendingUp },
  { key: 'revenue_share', icon: Star },
  { key: 'guest_reviews', icon: MessageSquare },
]

function getFoundingTier(position) {
  if (position <= 10) return { emoji: '🏆', label: 'Pioneer — Top 10', color: 'golden' }
  if (position <= 50) return { emoji: '💎', label: 'Early Founder — Top 50', color: 'electric' }
  if (position <= 100) return { emoji: '🥇', label: 'Founding 100', color: 'ocean' }
  if (position <= 500) return { emoji: '⭐', label: 'Founding 500', color: 'libre' }
  if (position <= 1000) return { emoji: '🌟', label: 'Founding 1,000', color: 'sunrise' }
  if (position <= 2000) return { emoji: '🔥', label: 'Builder — Top 2,000', color: 'sunset' }
  return { emoji: '✅', label: 'Member', color: 'gray' }
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, profile, loading: authLoading } = useAuth()
  const { referralCount, referralLink, referralCode } = useReferral()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [shares, setShares] = useState([])
  const [copied, setCopied] = useState(false)
  const [memberPosition, setMemberPosition] = useState(1)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    // Fetch properties
    supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProperties(data || []))
    // Fetch member position (how many users signed up before this user)
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', profile?.created_at || new Date().toISOString())
      .then(({ count }) => setMemberPosition(count || 1))
    // Fetch shares
    supabase
      .from('shares')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setShares(data || []))
  }, [user])

  function copyReferralLink() {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (authLoading) return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  if (!user) return null

  const totalRooms = properties.reduce((sum, p) => sum + (p.room_count || 0), 0)
  const avgRate = properties.length
    ? properties.reduce((sum, p) => sum + Number(p.avg_nightly_rate || 0), 0) / properties.length
    : 0
  const estimatedSavings = totalRooms * avgRate * 365 * 0.65 * 0.07 // saving = 17% - 10% = 7%
  const totalShares = shares.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const hasSignedLOI = shares.some(s => s.loi_signed)
  const loiStatus = shares.some(s => s.payment_confirmed)
    ? 'confirmed'
    : shares.some(s => s.contract_signed)
      ? 'contract_pending'
      : hasSignedLOI
        ? 'signed'
        : 'not_signed'

  const StatusConfig = loiStatusConfig[loiStatus]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep">
          {t('dashboard.welcome', { name: profile?.full_name || 'Member' })}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.member_since', { date: new Date(profile?.created_at).toLocaleDateString() })}
        </p>
        {(() => {
          const tier = getFoundingTier(memberPosition)
          return (
            <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-deep/5 to-ocean/10 border border-ocean/20 rounded-full px-4 py-2">
              <span className="text-xl">{tier.emoji}</span>
              <span className="font-bold text-deep text-sm">{tier.label}</span>
            </div>
          )
        })()}
      </div>

      {/* LOI / Shares Status — NEW */}
      <Card className="p-6 mb-6 border-2 border-ocean/20 bg-gradient-to-r from-ocean/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-ocean/10 rounded-2xl flex items-center justify-center">
              <Coins size={24} className="text-ocean" />
            </div>
            <div>
              <h3 className="font-bold text-deep text-lg">Founding Partner Status</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={StatusConfig.color}>{StatusConfig.label}</Badge>
                {totalShares > 0 && (
                  <span className="text-sm text-gray-500">
                    {totalShares} share{totalShares > 1 ? 's' : ''} (${(totalShares * 1000).toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          </div>
          {loiStatus === 'not_signed' && (
            <Link to="/loi">
              <Button size="sm">
                <FileText size={16} />
                Sign LOI
              </Button>
            </Link>
          )}
        </div>
        {/* Progress steps */}
        <div className="mt-5 pt-5 border-t border-ocean/10">
          <div className="flex items-center justify-between">
            {['LOI Signed', 'Contract Signed', 'Payment', 'Partner'].map((label, i) => {
              const stepDone = i === 0 ? hasSignedLOI
                : i === 1 ? shares.some(s => s.contract_signed)
                  : i === 2 ? shares.some(s => s.payment_confirmed)
                    : shares.some(s => s.payment_confirmed)
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    stepDone ? 'bg-libre text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {stepDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${stepDone ? 'text-libre font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${stepDone ? 'bg-libre' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Referral card — full-width, animated */}
      <style>{`
        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(27, 111, 232, 0.3), 0 0 30px rgba(29, 158, 117, 0.15); }
          50% { box-shadow: 0 0 25px rgba(27, 111, 232, 0.5), 0 0 50px rgba(29, 158, 117, 0.25); }
        }
        @keyframes bounceShare {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-8deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-2px) rotate(5deg); }
        }
        @keyframes copyPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .referral-border {
          background: linear-gradient(270deg, #1B6FE8, #1D9E75, #FF6B35, #1B6FE8, #1D9E75);
          background-size: 400% 400%;
          animation: borderRotate 4s ease infinite, pulseGlow 2.5s ease-in-out infinite;
        }
        .share-icon-bounce {
          animation: bounceShare 2s ease-in-out infinite;
        }
        .copy-pop {
          animation: copyPop 0.3s ease-out;
        }
      `}</style>
      <div className="referral-border rounded-2xl p-[3px] mb-8">
        <div className="bg-white rounded-[13px] p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-ocean/10 to-libre/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Share2 size={28} className="text-ocean share-icon-bounce" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-deep leading-tight">
                🌴 Share with your hotelier friends on Koh Phangan!
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Every friend who joins earns you a higher rank as Founding Partner. Help us build the community!
              </p>
            </div>
          </div>

          {/* Referral counter */}
          <div className="flex items-center gap-2 mb-5">
            {referralCount > 0 ? (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full px-4 py-1.5">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  You've referred {referralCount} hotelier{referralCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500">
                  You've referred 0 hoteliers — be the first to share!
                </span>
              </div>
            )}
          </div>

          {/* Referral link */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-ocean/5 to-libre/5 border border-ocean/20 rounded-xl p-3 mb-5">
            <code className="text-sm text-ocean flex-1 truncate font-mono">
              {referralLink || 'Loading...'}
            </code>
            <button
              onClick={copyReferralLink}
              className={`p-2 rounded-lg hover:bg-white/80 transition-all ${copied ? 'copy-pop' : ''}`}
            >
              {copied ? <Check size={18} className="text-libre" /> : <Copy size={18} className="text-gray-400" />}
            </button>
          </div>

          {/* Social sharing buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hey! I just joined Staylo — a new booking platform where hoteliers pay only 10% commission instead of 22% on Booking.com. We actually OWN the platform! 🌴 Check it out: ${referralLink || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.506 3.932 1.395 5.607L0 24l6.598-1.361A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.656-.506-5.216-1.44l-.375-.222-3.878.8.832-3.832-.243-.387A9.723 9.723 0 012.25 12c0-5.376 4.374-9.75 9.75-9.75S21.75 6.624 21.75 12 17.376 21.75 12 21.75z"/>
              </svg>
              WhatsApp
            </a>
            {/* Line */}
            <a
              href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(referralLink || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05a847] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 3.69 3.08 6.79 7.24 7.85.28.06.66.19.76.43.09.22.06.56.03.78l-.12.73c-.04.22-.17.86.75.47.93-.39 4.99-2.94 6.81-5.04C19.41 13.47 22 12.13 22 10.5 22 5.82 17.52 2 12 2zm-3.35 11.15H6.73a.46.46 0 01-.46-.46V8.73c0-.25.21-.46.46-.46s.46.21.46.46v3.5h1.42c.25 0 .46.21.46.46s-.2.46-.46.46zm1.98-.46a.46.46 0 01-.92 0V8.73a.46.46 0 01.92 0v3.96zm4.56 0c0 .19-.12.36-.29.43a.46.46 0 01-.51-.1l-2.01-2.73v2.4a.46.46 0 01-.92 0V8.73c0-.19.12-.36.29-.43a.46.46 0 01.51.1l2.01 2.73v-2.4a.46.46 0 01.92 0v3.96zm3.06-2.54a.46.46 0 010 .92h-1.42v.7h1.42a.46.46 0 010 .92h-1.88a.46.46 0 01-.46-.46V8.73c0-.25.21-.46.46-.46h1.88a.46.46 0 010 .92h-1.42v.7h1.42a.46.46 0 010 .26z"/>
              </svg>
              Line
            </a>
            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#0d65d9] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
            {/* Copy Link */}
            <button
              onClick={copyReferralLink}
              className={`flex items-center justify-center gap-2 border-2 font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm ${
                copied
                  ? 'bg-libre/10 border-libre text-libre'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} className="copy-pop" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code for sharing */}
      {referralLink && (
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="qr-hotelier bg-white p-3 rounded-2xl shadow-md border border-gray-100 shrink-0">
                <QRCodeSVG
                  value={`https://staylo.app/welcome?ref=${referralCode}`}
                  size={150}
                  bgColor="#FFFFFF"
                  fgColor="#0A1628"
                  level="M"
                />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-deep mb-2">🏨 {t('dashboard.qr_title', 'Your personal QR code')}</h3>
                <p className="text-sm text-gray-500 mb-3">{t('dashboard.qr_desc', 'Print it, show it, share it — any hotelier who scans it is linked to you forever.')}</p>
                <button
                  onClick={() => {
                    const svg = document.querySelector('.qr-hotelier svg')
                    if (!svg) return
                    const canvas = document.createElement('canvas')
                    canvas.width = 400
                    canvas.height = 400
                    const ctx = canvas.getContext('2d')
                    ctx.fillStyle = '#FFFFFF'
                    ctx.fillRect(0, 0, 400, 400)
                    const img = new Image()
                    const svgData = new XMLSerializer().serializeToString(svg)
                    img.onload = () => {
                      ctx.drawImage(img, 10, 10, 380, 380)
                      const a = document.createElement('a')
                      a.download = 'staylo-referral-qr.png'
                      a.href = canvas.toDataURL('image/png')
                      a.click()
                    }
                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
                  }}
                  className="inline-flex items-center gap-2 text-sm text-ocean hover:text-electric transition-colors font-medium"
                >
                  <Download size={14} /> {t('dashboard.qr_download', 'Download QR Code')}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Savings estimate */}
      <div className="mb-8">
        <Card className="p-6">
          <h3 className="font-semibold text-deep mb-3">{t('dashboard.savings_title')}</h3>
          <p className="text-3xl font-bold text-libre mb-1">
            ${Math.round(estimatedSavings).toLocaleString()}
            <span className="text-sm font-normal text-gray-400">/year</span>
          </p>
          <p className="text-sm text-gray-500">{t('dashboard.savings_description')}</p>
        </Card>
      </div>

      {/* Properties */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-deep">{t('dashboard.properties_title')}</h2>
          <Link to="/submit">
            <Button size="sm" variant="secondary">
              <Plus size={16} />
              {t('dashboard.add_property')}
            </Button>
          </Link>
        </div>

        {properties.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">{t('dashboard.no_properties')}</p>
            <Link to="/submit">
              <Button size="sm">{t('dashboard.add_property')}</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.map(prop => (
              <Card key={prop.id} className="p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-deep">{prop.name}</h4>
                  <p className="text-sm text-gray-500">
                    {prop.city}, {prop.country} — {prop.room_count} rooms
                  </p>
                </div>
                <Badge variant={statusColors[prop.status]}>
                  {t(`dashboard.status.${prop.status}`)}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Future features (locked) */}
      <div>
        <h2 className="text-xl font-semibold text-deep mb-4">{t('dashboard.coming_soon')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {futureFeatures.map(feat => (
            <Card key={feat.key} className="p-5 flex items-center gap-4 opacity-60">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Lock size={18} className="text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium text-deep">{t(`dashboard.features.${feat.key}`)}</h4>
                <p className="text-xs text-gray-400">{t('dashboard.coming_soon')}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
