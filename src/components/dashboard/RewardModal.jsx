// ============================================================================
// RewardModal — pick a Reward (or Special Rate) to apply to selected days
// ============================================================================
// Two-mode picker:
//   1. Reward: choose a category → choose a preset → optionally tweak label,
//      perk text, and (optionally) min-stay. Saves into:
//         { promo_label, perk, min_stay }
//      promo_pct stays NULL (no discount, value-add only).
//
//   2. Special Rate: pick a discount preset (low season, mid-week…) and a %.
//      Saves into:
//         { promo_label, promo_pct }
//      perk stays NULL.
//
// Both modes emit `clearFlags` to NULL the fields that don't apply, so
// switching from a discount day to a reward day correctly clears the %
// and vice-versa.
// ============================================================================
import { useState, useEffect } from 'react'
import { X, Gift, Tag } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { REWARD_CATEGORIES, DISCOUNT_PRESETS } from '../../lib/promoCatalog'

export default function RewardModal({ open, onClose, onApply, selectedCount }) {
  const [mode, setMode] = useState('reward')   // 'reward' | 'discount'
  const [catKey, setCatKey] = useState(REWARD_CATEGORIES[0].key)
  const [optionIdx, setOptionIdx] = useState(null)
  const [labelOverride, setLabelOverride] = useState('')
  const [perkOverride, setPerkOverride] = useState('')
  const [minStayOverride, setMinStayOverride] = useState('')
  const [discountIdx, setDiscountIdx] = useState(0)
  const [discountLabel, setDiscountLabel] = useState('')
  const [discountPct, setDiscountPct] = useState('')

  const category = REWARD_CATEGORIES.find(c => c.key === catKey)
  const selectedOption = optionIdx !== null ? category?.options[optionIdx] : null

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setMode('reward')
      setCatKey(REWARD_CATEGORIES[0].key)
      setOptionIdx(null)
      setLabelOverride('')
      setPerkOverride('')
      setMinStayOverride('')
      setDiscountIdx(0)
      setDiscountLabel(DISCOUNT_PRESETS[0].label)
      setDiscountPct(String(DISCOUNT_PRESETS[0].defaultPct))
    }
  }, [open])

  function handleApply() {
    if (mode === 'reward') {
      if (!selectedOption) return
      // NEW: emit `add_special` instead of replacing perk/promo_label.
      // bulkUpdate() in PropertyManage detects this and APPENDS the special
      // to the existing specials array → multiple rewards stack on a day.
      const ms = minStayOverride.trim() ? Number(minStayOverride) : selectedOption.minStay ?? null
      const special = {
        label:    labelOverride.trim() || selectedOption.label,
        perk:     perkOverride.trim()  || selectedOption.perk,
        ...(ms && ms >= 1 ? { min_stay: ms } : {}),
      }
      onApply({ add_special: special }, `Add reward "${special.label}"`)
    } else {
      const pct = Number(discountPct)
      if (!isFinite(pct) || pct <= 0 || pct > 100) {
        alert('Discount must be a number between 1 and 100.')
        return
      }
      onApply({
        promo_label: discountLabel.trim() || DISCOUNT_PRESETS[discountIdx].label,
        promo_pct: pct,
      }, `Apply ${pct}% rate "${discountLabel || DISCOUNT_PRESETS[discountIdx].label}"`)
    }
    onClose()
  }

  function handleClear() {
    if (!confirm(`Clear ALL rewards & discount on ${selectedCount} selected day${selectedCount > 1 ? 's' : ''}?`)) return
    onApply({
      clear_specials: true,        // wipes the specials array
      promo_label: null,
      perk: null,
      promo_pct: null,
      min_stay: null,
    }, 'Clear all rewards / discount')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add to ${selectedCount} selected day${selectedCount > 1 ? 's' : ''}`}
    >
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('reward')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'reward' ? 'bg-white shadow-sm text-libre' : 'text-gray-500'
          }`}
        >
          <Gift size={14} /> Reward (recommended)
        </button>
        <button
          type="button"
          onClick={() => setMode('discount')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'discount' ? 'bg-white shadow-sm text-orange' : 'text-gray-500'
          }`}
        >
          <Tag size={14} /> Special Rate (discount)
        </button>
      </div>

      {mode === 'reward' && (
        <>
          <p className="text-xs text-gray-500 mb-3 italic">
            💡 Add value instead of cutting price — STAYLO is built to lift hoteliers up, not race to the bottom.
          </p>

          {/* Category selector */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Category</label>
            <select
              value={catKey}
              onChange={e => { setCatKey(e.target.value); setOptionIdx(null) }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-libre/30"
            >
              {REWARD_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
            {category && (
              <p className="text-[11px] text-gray-400 mt-1.5 italic">{category.desc}</p>
            )}
          </div>

          {/* Options list */}
          <div className="mb-4 max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {category?.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setOptionIdx(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                  optionIdx === i
                    ? 'bg-libre/10 border-libre/40 text-deep'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-bold">{opt.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{opt.perk}</div>
                {opt.minStay && (
                  <div className="text-[10px] text-deep/60 mt-1">🌙 Suggests min {opt.minStay} nights</div>
                )}
              </button>
            ))}
          </div>

          {/* Optional overrides */}
          {selectedOption && (
            <details className="mb-3">
              <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-deep">
                Customize (optional)
              </summary>
              <div className="mt-2 space-y-2 pl-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Title shown to guests</label>
                  <input
                    type="text"
                    value={labelOverride}
                    onChange={e => setLabelOverride(e.target.value)}
                    placeholder={selectedOption.label}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-libre/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Perk description</label>
                  <input
                    type="text"
                    value={perkOverride}
                    onChange={e => setPerkOverride(e.target.value)}
                    placeholder={selectedOption.perk}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-libre/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                    Min stay (nights) {selectedOption.minStay && `· suggested ${selectedOption.minStay}`}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minStayOverride}
                    onChange={e => setMinStayOverride(e.target.value)}
                    placeholder={selectedOption.minStay ? String(selectedOption.minStay) : 'No minimum'}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-libre/30"
                  />
                </div>
              </div>
            </details>
          )}
        </>
      )}

      {mode === 'discount' && (
        <>
          <p className="text-xs text-gray-500 mb-3 italic">
            ⚠️ Discounts are powerful but use sparingly — STAYLO's brand is built on value, not cheap rooms.
            Best uses: low season, vacant mid-week nights, off-peak periods.
          </p>

          <div className="mb-3">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Preset</label>
            <div className="space-y-1.5">
              {DISCOUNT_PRESETS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDiscountIdx(i)
                    setDiscountLabel(d.label)
                    setDiscountPct(String(d.defaultPct))
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    discountIdx === i ? 'bg-orange/10 border-orange/40 text-deep' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold">{d.label}</span>
                  <span className="text-orange ml-2">−{d.defaultPct}% suggested</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Title shown to guests</label>
              <input
                type="text"
                value={discountLabel}
                onChange={e => setDiscountLabel(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Discount %</label>
              <input
                type="number"
                min={1}
                max={100}
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-xs focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-sunset px-3 py-2 transition-colors"
        >
          Clear all
        </button>
        <div className="flex-1" />
        <Button
          onClick={handleApply}
          disabled={mode === 'reward' && !selectedOption}
        >
          {mode === 'reward' ? '🎁 Apply Reward' : '💲 Apply Discount'}
        </Button>
      </div>
    </Modal>
  )
}
