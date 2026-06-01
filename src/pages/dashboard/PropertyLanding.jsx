// ============================================
// Dashboard — Property Landing (hub)
// ============================================
// Lightweight "hub" page that opens when the hotelier clicks a property
// name in the sidebar dropdown ("Mes propriétés ▾") or arrives at
// /dashboard/property/:id directly.
//
// Shows the property identity (name + status + location) at the top,
// then the same 6 quick-nav pills as /dashboard/properties so the
// hotelier picks where to dive in:
//   • Réception · Housekeeping · Rapports · Banque  — operational tools
//   • Réservations reçues                            — guest bookings
//   • Gérer                                          — full settings
//                                                      (rooms · prices ·
//                                                       photos · etc.)
//
// "Gérer" routes to /dashboard/property/:id/manage which renders the
// existing PropertyManage component (Photos / Videos / Chambres /
// Packages / Disponibilités / Réservations / Team / Settings tabs).
// ============================================
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ConciergeBell, Sparkles, BarChart3, Banknote,
  Inbox, Settings, Building2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../../components/ui/Badge'

const statusColors = {
  pending: 'gray',
  reviewing: 'orange',
  validated: 'blue',
  live: 'green',
}

export default function PropertyLanding() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [incomingCount, setIncomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    setLoading(true)
    async function fetchAll() {
      // Verify the user has access (owner OR team member) and pull
      // the basic property info for the header.
      const memberRes = await supabase
        .from('property_members')
        .select('role').eq('user_id', user.id).eq('property_id', id)
        .eq('status', 'active').maybeSingle()
      if (cancelled) return
      if (!memberRes.data) {
        // No access → bounce back to the properties list.
        navigate('/dashboard/properties', { replace: true })
        return
      }
      const { data: prop } = await supabase
        .from('properties')
        .select('id, name, city, country, status, type')
        .eq('id', id).maybeSingle()
      if (cancelled) return
      setProperty(prop)
      // Count incoming bookings on THIS property only — the badge stays
      // contextual to the landing page.
      supabase.from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', id)
        .then(({ count }) => { if (!cancelled) setIncomingCount(count || 0) })
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [user, id, navigate])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }
  if (!property) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header — back arrow + name + status + location */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/dashboard/properties"
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors no-underline text-gray-600"
          title={t('common.back', 'Back')}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-deep truncate">{property.name}</h1>
            <Badge variant={statusColors[property.status] || 'gray'}>
              {t(`dashboard.status.${property.status}`, property.status)}
            </Badge>
          </div>
          {(property.city || property.country) && (
            <p className="text-gray-500 mt-1 text-sm">
              {[property.city, property.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* 6-pill quick-nav — same set + same visual treatment as the row
          on /dashboard/properties, so the hotelier sees a consistent
          control surface whether they entered via the list or via the
          sidebar dropdown. */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
        <Link
          to="/dashboard/front-desk"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-ocean/40 hover:bg-ocean/5 hover:text-ocean hover:shadow-sm"
        >
          <ConciergeBell size={16} className="text-ocean" />
          {t('dashboard.nav_front_desk', 'Front Desk')}
        </Link>
        <Link
          to="/dashboard/housekeeping"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-libre/40 hover:bg-libre/5 hover:text-libre hover:shadow-sm"
        >
          <Sparkles size={16} className="text-libre" />
          {t('dashboard.nav_housekeeping', 'Housekeeping')}
        </Link>
        <Link
          to="/dashboard/reports"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm"
        >
          <BarChart3 size={16} className="text-electric" />
          {t('dashboard.nav_reports', 'Reports')}
        </Link>
        <Link
          to="/dashboard/banking"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-sunset/40 hover:bg-sunset/5 hover:text-sunset hover:shadow-sm"
        >
          <Banknote size={16} className="text-sunset" />
          {t('dashboard.nav_banking', 'Banking')}
        </Link>
        <Link
          to="/dashboard/incoming-bookings"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-orange/40 hover:bg-orange/5 hover:text-orange hover:shadow-sm"
        >
          <Inbox size={16} className="text-orange" />
          {t('bookings.tab_incoming', 'Réservations reçues')}
          {incomingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange/15 text-orange">
              {incomingCount}
            </span>
          )}
        </Link>
        <Link
          to={`/dashboard/property/${property.id}/manage`}
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-deep no-underline transition-all hover:border-electric/40 hover:bg-electric/5 hover:text-electric hover:shadow-sm"
        >
          <Settings size={16} className="text-electric" />
          {t('dashboard.manage', 'Gérer')}
        </Link>
      </div>

      {/* Friendly hint card — explains what each pill does so the
          hotelier doesn't have to click each one to find out. */}
      <div className="bg-gradient-to-br from-ocean/5 to-electric/5 border border-ocean/15 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-ocean" />
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            <p className="font-semibold text-deep mb-1">{property.name}</p>
            <p>
              {t('property_landing.hint',
                'Sélectionne une section ci-dessus pour gérer cette propriété. Le bouton "Gérer" ouvre la configuration complète (chambres, prix, photos, vidéos, packages, disponibilités, équipe, réglages).')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
