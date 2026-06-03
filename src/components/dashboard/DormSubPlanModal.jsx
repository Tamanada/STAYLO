// ============================================================================
// DormSubPlanModal — show the bed layout inside a dormitory room
// ============================================================================
// Triggered when the hotelier clicks a dorm marker on the property's main
// floor plan. The dorm itself has ONE position on the main plan (the
// physical room), and this modal zooms in on what's inside: N beds in a
// procedural grid layout.
//
// Why procedural (not upload + drag-drop): hostels and budget hotels
// rarely have detailed dorm-interior plans, and the box layout maps 1:1
// to how a guest scanning "Bed 5 in Nanda dorm" thinks about their spot.
// A cleaner alternative (uploaded photo + drag bed markers) is on the
// roadmap for V4 if it's requested.
//
// Style: STAYLO ocean / libre palette, big readable bed numbers, tray-
// like spacing. The bed boxes scale down as N grows so the modal stays
// usable at N=24 just as well as at N=6.
// ============================================================================

import { useTranslation } from 'react-i18next'
import { X, BedDouble, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'

/**
 * @param {object}   props
 * @param {object}   props.room       — { id, name, quantity }
 * @param {() => void} props.onClose
 * @param {() => void} [props.onRemove] — optional — removes the dorm marker
 *                                         from the main floor plan
 */
export default function DormSubPlanModal({ room, onClose, onRemove }) {
  const { t } = useTranslation()
  const total = Math.max(1, Number(room?.quantity) || 1)

  // Auto-grid dimensions — square-ish, columns first so wider screens
  // benefit. For N=18 → cols=5, rows=4 (one extra empty cell).
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)))
  const rows = Math.ceil(total / cols)

  // Bed cell scales down as N grows so a 24-bed dorm doesn't overflow.
  const cellSize = total <= 9 ? 'min-w-[90px] min-h-[90px] text-2xl'
    : total <= 16 ? 'min-w-[72px] min-h-[72px] text-xl'
    : 'min-w-[58px] min-h-[58px] text-base'

  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      {/* Header — gradient strip in STAYLO brand colors */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-deep via-deep to-electric/90 rounded-t-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              {t('manage.dorm_sub_plan_eyebrow', 'Dormitory sub-plan')}
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
              <BedDouble size={22} className="text-libre" />
              {room.name}
            </h2>
            <div className="text-xs text-white/70 mt-1">
              {t('manage.dorm_sub_plan_count', '{{count}} bed', { count: total })}
              {total > 1 ? 's' : ''}
              {' · '}
              {t('manage.dorm_sub_plan_grid', '{{cols}} × {{rows}} grid', { cols, rows })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body — the bed grid. Pearl background, ocean-tinted bed boxes,
          deep navy bed numbers. Same palette as the main floor plan SVG
          so it reads as a continuation. */}
      <div className="p-6 bg-[#FAFBFC] max-h-[60vh] overflow-y-auto">
        <div
          className="grid gap-3 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: cols * 110,
          }}
        >
          {Array.from({ length: total }, (_, i) => i + 1).map(bedNum => (
            <div
              key={bedNum}
              className={`${cellSize} relative flex items-center justify-center rounded-xl bg-ocean/[0.06] border-2 border-ocean/30 hover:border-ocean/60 hover:bg-ocean/10 transition-all`}
              title={`${room.name} ${bedNum}`}
            >
              {/* Bed icon top-left so the cell reads as "a bed" even
                  before you read the number. */}
              <BedDouble
                size={14}
                className="absolute top-1.5 left-1.5 text-ocean/40"
              />
              <span className="font-extrabold text-deep">{bedNum}</span>
            </div>
          ))}
        </div>
        {/* Hint — readonly grid for now; future versions will make each
            bed bookable / assignable to a guest. */}
        <p className="text-[11px] text-deep/50 italic text-center mt-5 leading-relaxed">
          {t('manage.dorm_sub_plan_hint', 'Beds are numbered 1 to {{total}}. Guests booking this dorm get assigned a bed number at check-in.', { total })}
        </p>
      </div>

      {/* Footer — secondary action + close */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
        {onRemove ? (
          <button
            type="button"
            onClick={() => { onRemove(); onClose() }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-sunset hover:bg-sunset/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
            {t('manage.dorm_sub_plan_remove', 'Remove from plan')}
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-ocean to-electric shadow-md hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
        >
          {t('common.close', 'Close')}
        </button>
      </div>
    </Modal>
  )
}
