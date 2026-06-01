// ============================================
// Dashboard — Property Landing (hub body)
// ============================================
// The "index" route under /dashboard/property/:id. Pure body content —
// the property header (back arrow, name, status, location) and the
// 6-pill nav strip are rendered by PropertyLayout above us.
//
// This page just shows a friendly hint card explaining what each pill
// does, so a hotelier arriving via the sidebar dropdown immediately
// knows what to click next.
// ============================================
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export default function PropertyLanding() {
  const { t } = useTranslation()
  const { property } = useOutletContext() || {}

  return (
    <div className="bg-gradient-to-br from-ocean/5 to-electric/5 border border-ocean/15 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <Building2 size={20} className="text-ocean" />
        </div>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="font-semibold text-deep mb-1">{property?.name || ''}</p>
          <p>
            {t('property_landing.hint',
              'Sélectionne une section ci-dessus pour gérer cette propriété. Le bouton "Gérer" ouvre la configuration complète (chambres, prix, photos, vidéos, packages, disponibilités, équipe, réglages).')}
          </p>
        </div>
      </div>
    </div>
  )
}
