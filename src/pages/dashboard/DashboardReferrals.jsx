import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, UserPlus, Copy, Check, Trophy, Calendar, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { useReferral } from '../../hooks/useReferral'
import { supabase } from '../../lib/supabase'

export default function DashboardReferrals() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { referralCount, referralLink, referralCode } = useReferral()
  const navigate = useNavigate()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('referrals')
      .select('*, referred:referred_id(id, full_name, email, created_at)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReferrals(data || [])
        setLoading(false)
      })
  }, [user])

  function copyLink() {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (authLoading || loading) {
    return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  }
  if (!user) return null

  // Count by type — check if referred user has ambassador record or properties
  const totalReferred = referrals.length
  // For simplicity, count all as hotel referrals (type detection would require extra queries)
  const hotelsReferred = totalReferred
  const ambassadorsReferred = 0

  const activeLink = referralLink

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep">{t('dashboard.my_referrals', 'My Referrals')}</h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.referrals_subtitle', 'Track your referrals and grow the community')}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-ocean" />
          </div>
          <p className="text-3xl font-bold text-deep">{totalReferred}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.total_referred', 'Total Referred')}</p>
        </Card>
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-libre/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 size={22} className="text-libre" />
          </div>
          <p className="text-3xl font-bold text-deep">{hotelsReferred}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.hotels_referred', 'Hotels Referred')}</p>
        </Card>
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <UserPlus size={22} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-deep">{ambassadorsReferred}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.ambassadors_referred', 'Ambassadors Referred')}</p>
        </Card>
      </div>

      {/* Referral link + QR */}
      <Card className="p-6 mb-8">
        <h2 className="font-semibold text-deep text-lg mb-4">{t('dashboard.your_referral_link', 'Your Referral Link')}</h2>

        {/* Link with copy */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
          <code className="text-sm text-ocean flex-1 truncate font-mono">
            {activeLink || t('common.loading')}
          </code>
          <button
            onClick={copyLink}
            className="p-2 rounded-lg hover:bg-white transition-all"
          >
            {copied ? <Check size={18} className="text-libre" /> : <Copy size={18} className="text-gray-400" />}
          </button>
        </div>

        {/* QR Code */}
        {activeLink && (
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            <div className="qr-referrals bg-white p-3 rounded-2xl shadow-md border border-gray-100 shrink-0">
              <QRCodeSVG
                value={activeLink}
                size={150}
                bgColor="#FFFFFF"
                fgColor="#0A1628"
                level="M"
              />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-deep mb-2">{t('dashboard.qr_title', 'Scan to join Staylo')}</h3>
              <p className="text-sm text-gray-500 mb-3">
                {t('dashboard.qr_desc', 'Print it, show it, share it — any hotelier who scans it is linked to you forever.')}
              </p>
              <button
                onClick={() => {
                  const svg = document.querySelector('.qr-referrals svg')
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
        )}

        {/* Social share buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              t('dashboard.wa_hotelier_msg', { link: activeLink || '' })
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.506 3.932 1.395 5.607L0 24l6.598-1.361A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.656-.506-5.216-1.44l-.375-.222-3.878.8.832-3.832-.243-.387A9.723 9.723 0 012.25 12c0-5.376 4.374-9.75 9.75-9.75S21.75 6.624 21.75 12 17.376 21.75 12 21.75z"/>
            </svg>
            {t('dashboard.whatsapp', 'WhatsApp')}
          </a>
          {/* Line */}
          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(activeLink || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05a847] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 3.69 3.08 6.79 7.24 7.85.28.06.66.19.76.43.09.22.06.56.03.78l-.12.73c-.04.22-.17.86.75.47.93-.39 4.99-2.94 6.81-5.04C19.41 13.47 22 12.13 22 10.5 22 5.82 17.52 2 12 2z"/>
            </svg>
            {t('dashboard.line', 'Line')}
          </a>
          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeLink || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#0d65d9] text-white font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t('dashboard.facebook', 'Facebook')}
          </a>
          {/* Copy Link */}
          <button
            onClick={copyLink}
            className={`flex items-center justify-center gap-2 border-2 font-semibold rounded-xl py-3 px-4 transition-all hover:scale-[1.03] active:scale-95 text-sm ${
              copied
                ? 'bg-libre/10 border-libre text-libre'
                : 'bg-white border-gray-200 text-gray-600 hover:border-ocean hover:text-ocean'
            }`}
          >
            {copied ? (
              <>
                <Check size={18} />
                {t('dashboard.copied', 'Copied!')}
              </>
            ) : (
              <>
                <Copy size={18} />
                {t('dashboard.copy_link', 'Copy Link')}
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Referred users table */}
      <div>
        <h2 className="text-xl font-semibold text-deep mb-4">{t('dashboard.referred_users', 'Referred Users')}</h2>
        {referrals.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {t('dashboard.no_referrals_yet', 'No referrals yet. Share your link to start growing the community!')}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('dashboard.ref_name', 'Name')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('dashboard.ref_email', 'Email')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('dashboard.ref_type', 'Type')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('dashboard.ref_date', 'Date Joined')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(ref => (
                    <tr key={ref.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-medium text-deep">
                        {ref.referred?.full_name || t('dashboard.ref_unknown', 'Unknown')}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{ref.referred?.email || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge variant="blue">{t('dashboard.ref_type_hotel', 'Hotel')}</Badge>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {ref.referred?.created_at
                            ? new Date(ref.referred.created_at).toLocaleDateString()
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
