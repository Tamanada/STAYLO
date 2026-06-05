import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'
import {
  getCatalogForCountry,
  getEnabledEventIds, setEnabledEventIds,
  getCustomEvents, saveCustomEvents,
} from '../../lib/events'

// ============================================================================
// EventsHolidaysModal
// ============================================================================
// Ported from public/ship.html's events panel (2026-06-08). Lets the
// hotelier toggle catalog holidays (public + lunar) and add custom one-off
// events. The Disponibilités Timeline reads back via getEventsOnDate() to
// render emoji chips on day headers.
//
// onChange fires after every mutation (toggle, custom add/remove) so the
// parent can re-render the calendar without a full data refetch.
// ============================================================================
export function EventsHolidaysModal({ open, onClose, propertyId, country, onChange }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('catalog')
  const [enabled, setEnabled] = useState(new Set())
  const [custom, setCustom] = useState([])
  const [newEm, setNewEm] = useState('📌')
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')

  // Re-seed state every time the modal opens so we never show stale data
  // from a previous property.
  useEffect(() => {
    if (!open) return
    setEnabled(new Set(getEnabledEventIds(propertyId, country)))
    setCustom(getCustomEvents(propertyId))
    setTab('catalog')
  }, [open, propertyId, country])

  if (!open) return null

  const catalog = getCatalogForCountry(country)

  function toggle(eventId) {
    const next = new Set(enabled)
    if (next.has(eventId)) next.delete(eventId)
    else next.add(eventId)
    setEnabled(next)
    setEnabledEventIds(propertyId, [...next])
    onChange?.()
  }

  function addCustom() {
    const name = newName.trim()
    if (!name || !newDate) {
      alert(t('manage.events_modal_required', 'Name and date are required.'))
      return
    }
    const next = [...custom, {
      id: `cust-${Date.now()}`,
      em: newEm || '📌',
      name,
      date: newDate,
      recurring: 'one-off',
      countries: ['*'],
      color: '#6C5CE7',
    }]
    setCustom(next)
    saveCustomEvents(propertyId, next)
    setNewEm('📌'); setNewName(''); setNewDate('')
    onChange?.()
  }

  function removeCustom(id) {
    const next = custom.filter(c => c.id !== id)
    setCustom(next)
    saveCustomEvents(propertyId, next)
    onChange?.()
  }

  // Inline edit of an existing custom event. Patch is merged into the
  // matching row; we persist on every keystroke so refreshing the modal
  // mid-edit doesn't lose the change. Day-header chips re-render via the
  // onChange callback the parent passed in.
  function updateCustom(id, patch) {
    const next = custom.map(c => c.id === id ? { ...c, ...patch } : c)
    setCustom(next)
    saveCustomEvents(propertyId, next)
    onChange?.()
  }

  // Date in DD/MM for the catalog list (matches the staff Planning's chip
  // layout). Lunar events show "lunar" since dates float year-to-year.
  function fmtDdMm(ev) {
    if (ev.recurring === 'lunar') return t('manage.events_lunar', 'lunar')
    if (ev.date && ev.date.includes('-')) {
      const [m, d] = ev.date.split('-')
      return `${d}/${m}`
    }
    return ev.date || ''
  }

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between -mt-2">
          <h3 className="text-lg font-bold text-deep flex items-center gap-2">
            <span>🗓️</span>
            {t('manage.events_modal_title', 'Events & holidays')}
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab('catalog')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'catalog'
                ? 'border-ocean text-ocean'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            📅 {t('manage.events_tab_catalog', 'Catalog')} ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'custom'
                ? 'border-ocean text-ocean'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            ✏️ {t('manage.events_tab_custom', 'Custom')} ({custom.length})
          </button>
        </div>

        {tab === 'catalog' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              {t('manage.events_catalog_hint', "Events for {{country}}. Toggle each one on/off — they'll show on Timeline day headers.", { country: country || 'TH' })}
            </p>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {catalog.map(ev => {
                const isOn = enabled.has(ev.id)
                return (
                  <label
                    key={ev.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(ev.id)}
                      className="accent-ocean w-4 h-4"
                    />
                    <span className="text-base leading-none">{ev.em}</span>
                    <span className="flex-1 text-sm font-medium text-deep">{ev.name}</span>
                    <span className="text-xs font-mono text-gray-400 tabular-nums">
                      {fmtDdMm(ev)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Custom events list — every field is inline-editable. The
                user reported 2026-06-08 that "JE VEUX POUVOIR CHANGER
                LES INFO" — typos in the emoji / name / date used to mean
                deleting + re-adding. Now click into any input and type. */}
            {custom.length > 0 ? (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {custom.map(c => (
                  <div
                    key={c.id}
                    className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100/70 transition-colors"
                  >
                    <input
                      type="text"
                      value={c.em || ''}
                      onChange={e => updateCustom(c.id, { em: e.target.value.slice(0, 4) })}
                      className="col-span-2 px-2 py-1.5 rounded-md border border-transparent bg-white text-deep text-base text-center focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20"
                      maxLength={4}
                      title={t('manage.events_emoji', 'Emoji')}
                    />
                    <input
                      type="text"
                      value={c.name || ''}
                      onChange={e => updateCustom(c.id, { name: e.target.value })}
                      className="col-span-6 px-2 py-1.5 rounded-md border border-transparent bg-white text-deep text-sm font-medium focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20"
                      placeholder={t('manage.events_name_placeholder', 'Name')}
                    />
                    <input
                      type="date"
                      value={c.date || ''}
                      onChange={e => updateCustom(c.id, { date: e.target.value })}
                      className="col-span-3 px-2 py-1.5 rounded-md border border-transparent bg-white text-deep text-xs font-mono focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustom(c.id)}
                      className="col-span-1 text-gray-300 hover:text-sunset text-lg leading-none w-7 h-7 mx-auto flex items-center justify-center rounded-md hover:bg-sunset/10 transition-colors"
                      title={t('common.remove', 'Remove')}
                    >×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-4">
                {t('manage.events_custom_empty', 'No custom events yet — add one below.')}
              </p>
            )}

            {/* Add-custom form */}
            <div className="p-3 bg-ocean/[0.04] border border-ocean/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {t('manage.events_add_custom', 'Add a one-off event')}
              </h4>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newEm}
                  onChange={e => setNewEm(e.target.value.slice(0, 4))}
                  className="col-span-2 px-2 py-2 rounded-lg border border-gray-200 bg-white text-deep text-base text-center focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  maxLength={4}
                  title={t('manage.events_emoji', 'Emoji')}
                />
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={t('manage.events_name_placeholder', 'Owner birthday, off-site, etc.')}
                  className="col-span-6 px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                />
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="col-span-4 px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                />
              </div>
              <button
                type="button"
                onClick={addCustom}
                className="w-full px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-ocean to-electric shadow-sm hover:shadow-md transition-all"
              >
                + {t('manage.events_add_button', 'Add event')}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-deep/70 hover:text-deep hover:bg-gray-50 transition-all"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
