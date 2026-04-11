import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Sparkles, AlertTriangle, CheckCircle2, Clock, BedDouble,
  Building2, RotateCcw, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const HK_STATUSES = {
  clean: { label: 'Clean', icon: CheckCircle2, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', iconColor: 'text-emerald-500', dot: 'bg-emerald-500' },
  dirty: { label: 'Dirty', icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-700', iconColor: 'text-red-500', dot: 'bg-red-500' },
  inspected: { label: 'Inspected', icon: Eye, color: 'bg-blue-50 border-blue-200 text-blue-700', iconColor: 'text-blue-500', dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', icon: RotateCcw, color: 'bg-amber-50 border-amber-200 text-amber-700', iconColor: 'text-amber-500', dot: 'bg-amber-500' },
}

export default function PMSHousekeeping() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  // Local housekeeping state (in real app, would be in DB)
  const [hkStatuses, setHkStatuses] = useState({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: props } = await supabase
        .from('properties').select('*').eq('user_id', user.id).order('created_at')
      setProperties(props || [])
      if (props?.length > 0) setSelectedProperty(props[0].id)

      const propIds = (props || []).map(p => p.id)
      if (propIds.length > 0) {
        const { data: roomsData } = await supabase.from('rooms').select('*').in('property_id', propIds)
        setRooms(roomsData || [])
        // Init all rooms as clean by default
        const initialStatuses = {}
        ;(roomsData || []).forEach(r => { initialStatuses[r.id] = 'clean' })
        setHkStatuses(initialStatuses)
      }
      setLoading(false)
    }
    if (user) fetchData()
  }, [user])

  const propertyRooms = rooms.filter(r => r.property_id === selectedProperty)
  const filteredRooms = filter ? propertyRooms.filter(r => hkStatuses[r.id] === filter) : propertyRooms

  function setRoomStatus(roomId, status) {
    setHkStatuses(prev => ({ ...prev, [roomId]: status }))
  }

  // Stats
  const clean = propertyRooms.filter(r => hkStatuses[r.id] === 'clean').length
  const dirty = propertyRooms.filter(r => hkStatuses[r.id] === 'dirty').length
  const inProgress = propertyRooms.filter(r => hkStatuses[r.id] === 'in_progress').length
  const inspected = propertyRooms.filter(r => hkStatuses[r.id] === 'inspected').length

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ocean/20 border-t-ocean rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('pms.no_properties', 'No properties to manage')}</h2>
        <Link to="/submit" className="px-5 py-2.5 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline">
          {t('pms.add_property', 'Add Property')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Sparkles size={24} className="text-ocean" />
            {t('pms.housekeeping', 'Housekeeping')}
          </h1>
          <p className="text-sm text-gray-500">{t('pms.hk_subtitle', 'Manage room cleanliness and readiness')}</p>
        </div>

        {properties.length > 1 && (
          <select value={selectedProperty || ''} onChange={e => setSelectedProperty(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 min-w-[200px]">
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Clean', count: clean, color: 'text-emerald-600', bg: 'bg-emerald-50', key: 'clean' },
          { label: 'Dirty', count: dirty, color: 'text-red-600', bg: 'bg-red-50', key: 'dirty' },
          { label: 'In Progress', count: inProgress, color: 'text-amber-600', bg: 'bg-amber-50', key: 'in_progress' },
          { label: 'Inspected', count: inspected, color: 'text-blue-600', bg: 'bg-blue-50', key: 'inspected' },
        ].map(stat => (
          <button key={stat.key} onClick={() => setFilter(filter === stat.key ? '' : stat.key)}
            className={`rounded-xl border-2 p-4 text-center transition-all ${
              filter === stat.key ? `${stat.bg} border-current` : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
            <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.count}</p>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Room list */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">{filter ? 'No rooms match this filter' : 'No rooms configured'}</h3>
          {!filter && (
            <Link to={`/dashboard/property/${selectedProperty}`}
              className="px-4 py-2 bg-ocean text-white rounded-lg font-medium text-sm hover:bg-ocean/90 no-underline inline-block mt-4">
              Manage Rooms
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRooms.map(room => {
            const status = hkStatuses[room.id] || 'clean'
            const cfg = HK_STATUSES[status]
            const Icon = cfg.icon
            return (
              <div key={room.id}
                className={`rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${cfg.color}`}>
                <div className="flex items-center gap-3">
                  <Icon size={24} className={cfg.iconColor} />
                  <div>
                    <h3 className="font-bold text-base">{room.name}</h3>
                    <p className="text-xs opacity-60">
                      {room.bed_type || 'Standard'} · Max {room.max_guests || 2} guests · {room.quantity || 1} unit(s)
                    </p>
                  </div>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-1.5">
                  {Object.entries(HK_STATUSES).map(([key, s]) => {
                    const BtnIcon = s.icon
                    const isActive = status === key
                    return (
                      <button key={key} onClick={() => setRoomStatus(room.id, key)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                          isActive
                            ? 'bg-white shadow-sm'
                            : 'bg-white/40 hover:bg-white/70 opacity-50 hover:opacity-80'
                        }`}>
                        <BtnIcon size={12} />
                        <span className="hidden sm:inline">{s.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
        <p className="text-xs text-blue-700 font-medium">
          {t('pms.hk_note', 'Housekeeping statuses are saved locally for now. Database persistence coming soon.')}
        </p>
      </div>
    </div>
  )
}
