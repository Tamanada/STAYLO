// ============================================================================
// LittleHotelierCard — iCal-based Little Hotelier integration
// ============================================================================
// Sits in the OTA Channel Manager grid alongside Booking / Airbnb / Agoda /
// Expedia. Distinct component (not a variant of OtaChannelCard) because the
// UX is different — Little Hotelier hands out ONE iCal URL per room, not a
// single property-wide API key.
//
// Advanced panel:
//   · list every ical_feed row for this property + Little Hotelier source
//   · one row = { room, url, last synced, status }
//   · add form at the bottom: pick a room + paste URL → insert
//   · "Refresh now" invokes the ical-sync Edge Function for this property
//     only (feeds get polled server-side too, but the button gives the
//     hotelier a "just did it" moment)
//
// All state lives here — parent only supplies { propertyId, rooms, t }.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Trash2, Plus, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SOURCE = 'little_hotelier'

// Turn an ISO timestamp into "3 min ago" / "2 h ago" / "just now".
// Kept inline — one caller, ~10 lines, doesn't earn a util file.
function timeAgo(iso) {
  if (!iso) return 'never'
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 30)   return 'just now'
  if (diffSec < 60)   return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`
  return `${Math.floor(diffSec / 86400)} d ago`
}

export default function LittleHotelierCard({ propertyId, rooms = [], t }) {
  const [expanded, setExpanded] = useState(false)
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [addRoomId, setAddRoomId] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const loadFeeds = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('property_id', propertyId)
      .eq('source', SOURCE)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (err) { setError(err.message); return }
    setFeeds(data || [])
  }, [propertyId])

  useEffect(() => { if (expanded) loadFeeds() }, [expanded, loadFeeds])

  const connected = feeds.length > 0
  const statusPill = connected
    ? { label: `Connected (${feeds.length})`, className: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/25' }
    : { label: 'Not connected',                className: 'bg-gray-100 text-gray-500 border-gray-200' }

  async function handleRefresh() {
    setRefreshing(true)
    setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('ical-sync', {
        body: { property_id: propertyId },
      })
      if (err) throw err
      const summary = data?.succeeded != null
        ? `${data.succeeded}/${data.synced} feeds OK · ${data.failed} failed`
        : 'Sync triggered.'
      // Reload the feed rows so the "last synced" times / statuses reflect
      // what the EF just wrote. Small delay so the DB has committed.
      setTimeout(loadFeeds, 400)
      if (data?.failed > 0) setError(summary)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAdd() {
    if (!addUrl.trim()) { setError('iCal URL required.'); return }
    if (!/^https?:\/\//i.test(addUrl.trim())) { setError('URL must start with http:// or https://.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('ical_feeds').insert({
      property_id: propertyId,
      room_id: addRoomId || null,
      source: SOURCE,
      ical_url: addUrl.trim(),
      label: rooms.find(r => r.id === addRoomId)?.name || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setAddUrl('')
    setAddRoomId('')
    loadFeeds()
  }

  async function handleDelete(feedId) {
    if (!confirm('Remove this iCal feed? Bookings already imported stay in your calendar.')) return
    const { error: err } = await supabase.from('ical_feeds').delete().eq('id', feedId)
    if (err) { setError(err.message); return }
    loadFeeds()
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — Little Hotelier's teal/emerald brand palette */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-3.5 py-2 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">🏨</span>
          <span className="font-extrabold text-sm truncate">Little Hotelier</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusPill.className}`} style={{ background: 'rgba(255,255,255,.95)' }}>
          {statusPill.label}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!connected || refreshing}
            title={connected ? 'Fetch every iCal feed for this property now' : 'Add at least one iCal URL below to enable syncing.'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              !connected
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : refreshing
                  ? 'bg-emerald-100 text-emerald-700 cursor-wait'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <RotateCcw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing…' : (t?.('manage.lh_refresh', 'Refresh now') || 'Refresh now')}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-1 ml-auto text-[11px] font-bold text-gray-500 hover:text-deep transition-colors"
          >
            {expanded ? '▾' : '▸'} {t?.('manage.ota_advanced', 'Advanced')}
          </button>
        </div>

        {expanded && (
          <div className="pt-2 border-t border-gray-100 space-y-3">
            {/* Existing feeds */}
            {loading ? (
              <p className="text-[11px] text-gray-500">Loading feeds…</p>
            ) : feeds.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">
                No iCal feeds yet. In Little Hotelier: <strong>Setup → Channel Manager → iCal Export</strong>,
                copy the URL for each room, and paste them below (one per room).
              </p>
            ) : (
              <div className="space-y-1.5">
                {feeds.map(f => {
                  const room = rooms.find(r => r.id === f.room_id)
                  const statusOK = f.last_sync_status === 'ok'
                  return (
                    <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-deep">
                          {statusOK
                            ? <Check size={12} className="text-emerald-600 flex-shrink-0" />
                            : f.last_synced_at
                              ? <AlertCircle size={12} className="text-amber-600 flex-shrink-0" />
                              : <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />}
                          <span className="truncate">{room?.name || (f.room_id ? '(deleted room)' : 'Property-wide')}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5" title={f.ical_url}>
                          {f.ical_url}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Last synced: <strong>{timeAgo(f.last_synced_at)}</strong>
                          {f.last_sync_status && f.last_sync_status !== 'ok' && (
                            <span className="text-amber-600"> · {f.last_sync_status}</span>
                          )}
                          {typeof f.last_event_count === 'number' && f.last_sync_status === 'ok' && (
                            <span> · {f.last_event_count} event{f.last_event_count !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id)}
                        title="Remove this feed"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add form */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                {t?.('manage.lh_add_feed', 'Add a Little Hotelier iCal feed')}
              </label>
              <div className="flex flex-col sm:flex-row gap-1.5">
                <select
                  value={addRoomId}
                  onChange={e => setAddRoomId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-deep sm:w-40"
                >
                  <option value="">Property-wide</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <input
                  type="url"
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                  placeholder="https://…/ical.ics"
                  autoComplete="off"
                  spellCheck="false"
                  className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-deep focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !addUrl.trim()}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                    saving || !addUrl.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <Plus size={12} /> {saving ? 'Adding…' : 'Add'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 italic mt-1.5">
                Choose the STAYLO room this feed maps to. "Property-wide" imports every event without a room mapping.
              </p>
            </div>

            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
