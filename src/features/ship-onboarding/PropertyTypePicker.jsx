/*
  ================================================================
  PropertyTypePicker — 2-step visual picker for hotel property types
  ================================================================
  Step 1: 9 group tiles (visual, mobile-friendly)
  Step 2: sub-type list contextual to selected group
          → "Other" reveals a free-text field
  Emits: { category_main, category_sub, category_custom? } via onSelect(value)

  Coverage: hotels/resorts/homes/bungalows/unique/retreats/backpacker/long-stay/other
  ~35 property types total, deliberately exhaustive so hoteliers don't
  feel their venue isn't represented ("private house", "treehouse",
  "converted temple", etc.)
  ================================================================
*/
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

// Emoji-first for zero-asset speed + universal legibility.
// If we want SVGs later, drop them in place of `emoji`.
export const PROPERTY_GROUPS = [
  {
    key: 'hotel',
    emoji: '🏨',
    label: 'Hotel',
    subtitle: 'Classic hotel property',
    subtypes: [
      { key: 'boutique_hotel', label: 'Boutique Hotel' },
      { key: 'business_hotel', label: 'Business Hotel' },
      { key: 'luxury_hotel', label: 'Luxury Hotel' },
      { key: 'design_hotel', label: 'Design Hotel' },
      { key: 'budget_hotel', label: 'Budget / Economy Hotel' },
    ],
  },
  {
    key: 'resort',
    emoji: '🌴',
    label: 'Resort',
    subtitle: 'Beach, mountain, or destination',
    subtypes: [
      { key: 'beach_resort', label: 'Beach Resort' },
      { key: 'mountain_resort', label: 'Mountain Resort' },
      { key: 'jungle_resort', label: 'Jungle / Eco Resort' },
      { key: 'all_inclusive_resort', label: 'All-Inclusive Resort' },
    ],
  },
  {
    key: 'homes',
    emoji: '🏡',
    label: 'Homes',
    subtitle: 'Private houses & rentals',
    subtypes: [
      { key: 'villa', label: 'Private Villa' },
      { key: 'private_house', label: 'Private House' },
      { key: 'apartment', label: 'Apartment' },
      { key: 'condo', label: 'Condominium' },
      { key: 'guest_house', label: 'Guest House' },
      { key: 'bed_and_breakfast', label: 'Bed & Breakfast' },
    ],
  },
  {
    key: 'bungalows',
    emoji: '🛖',
    label: 'Bungalows',
    subtitle: 'Cabins, chalets & standalone units',
    subtypes: [
      { key: 'beach_bungalow', label: 'Beach Bungalow' },
      { key: 'garden_bungalow', label: 'Garden Bungalow' },
      { key: 'chalet', label: 'Chalet' },
      { key: 'cabin', label: 'Cabin' },
    ],
  },
  {
    key: 'unique',
    emoji: '✨',
    label: 'Unique stays',
    subtitle: 'One-of-a-kind places',
    subtypes: [
      { key: 'treehouse', label: 'Treehouse' },
      { key: 'houseboat', label: 'Houseboat' },
      { key: 'yurt', label: 'Yurt' },
      { key: 'tent_glamping', label: 'Glamping Tent' },
      { key: 'cave', label: 'Cave Stay' },
      { key: 'converted_temple', label: 'Converted Heritage Building' },
      { key: 'shipping_container', label: 'Shipping Container' },
      { key: 'tiny_house', label: 'Tiny House' },
    ],
  },
  {
    key: 'retreat',
    emoji: '🧘',
    label: 'Retreats',
    subtitle: 'Wellness, yoga, meditation',
    subtypes: [
      { key: 'yoga_retreat', label: 'Yoga Retreat' },
      { key: 'wellness_spa_retreat', label: 'Wellness / Spa Retreat' },
      { key: 'meditation_retreat', label: 'Meditation Retreat' },
      { key: 'detox_retreat', label: 'Detox Retreat' },
    ],
  },
  {
    key: 'backpacker',
    emoji: '🎒',
    label: 'Backpacker',
    subtitle: 'Hostels, dorms, social stays',
    subtypes: [
      { key: 'hostel', label: 'Hostel' },
      { key: 'poshtel', label: 'Boutique Hostel (Poshtel)' },
      { key: 'capsule_hotel', label: 'Capsule Hotel' },
      { key: 'coliving', label: 'Coliving Space' },
    ],
  },
  {
    key: 'long_stay',
    emoji: '📅',
    label: 'Long stay',
    subtitle: 'Serviced, monthly, extended',
    subtypes: [
      { key: 'serviced_apartment', label: 'Serviced Apartment' },
      { key: 'aparthotel', label: 'Aparthotel' },
      { key: 'monthly_rental', label: 'Monthly Rental' },
      { key: 'digital_nomad_hub', label: 'Digital Nomad Hub' },
    ],
  },
  {
    key: 'other',
    emoji: '➕',
    label: 'Other',
    subtitle: 'Not listed above',
    subtypes: [
      { key: 'custom', label: 'Describe your property' },
    ],
  },
]

export default function PropertyTypePicker({ onSelect, initialValue }) {
  const [step, setStep] = useState(initialValue?.category_main ? 2 : 1)
  const [selectedGroup, setSelectedGroup] = useState(
    initialValue ? PROPERTY_GROUPS.find(g => g.key === initialValue.category_main) : null
  )
  const [selectedSub, setSelectedSub] = useState(initialValue?.category_sub || null)
  const [customText, setCustomText] = useState(initialValue?.category_custom || '')

  const goToStep2 = (group) => {
    setSelectedGroup(group)
    setSelectedSub(null)
    setCustomText('')
    setStep(2)
  }

  const backToStep1 = () => {
    setStep(1)
    setSelectedSub(null)
    setCustomText('')
  }

  const chooseSub = (sub) => {
    setSelectedSub(sub.key)
    if (sub.key === 'custom') return   // wait for text input
    onSelect?.({
      category_main: selectedGroup.key,
      category_sub: sub.key,
    })
  }

  const submitCustom = () => {
    const trimmed = customText.trim()
    if (!trimmed) return
    onSelect?.({
      category_main: selectedGroup.key,
      category_sub: 'custom',
      category_custom: trimmed,
    })
  }

  // ────────── STEP 1: category tiles ──────────
  if (step === 1) {
    return (
      <div>
        <div className="mb-6">
          <div className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#FF6B00' }}>
            Step 1 of 2
          </div>
          <h3 className="font-black text-2xl text-gray-900 mb-1">
            What kind of place do you run?
          </h3>
          <p className="text-sm text-gray-500">
            Pick the closest match — you can be more specific next.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PROPERTY_GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => goToStep2(group)}
              className="text-left p-4 rounded-xl border-2 transition-all"
              style={{
                borderColor: '#E8E0D8',
                background: 'white',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF6B00'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,107,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E8E0D8'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div className="text-4xl mb-2">{group.emoji}</div>
              <div className="font-black text-base text-gray-900 mb-0.5">{group.label}</div>
              <div className="text-xs text-gray-500 leading-tight">{group.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ────────── STEP 2: sub-type list ──────────
  return (
    <div>
      <button
        type="button"
        onClick={backToStep1}
        className="inline-flex items-center gap-1 text-sm font-bold mb-4 transition-colors"
        style={{ color: '#8892A0' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B00'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#8892A0'}
      >
        <ChevronLeft size={16} strokeWidth={2.6} />
        Change category
      </button>

      <div className="mb-6">
        <div className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#FF6B00' }}>
          Step 2 of 2
        </div>
        <h3 className="font-black text-2xl text-gray-900 mb-1 flex items-center gap-2">
          <span className="text-3xl">{selectedGroup.emoji}</span>
          {selectedGroup.label}
        </h3>
        <p className="text-sm text-gray-500">
          Which best describes it?
        </p>
      </div>

      <div className="space-y-2">
        {selectedGroup.subtypes.map((sub) => (
          <button
            key={sub.key}
            type="button"
            onClick={() => chooseSub(sub)}
            className="w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left"
            style={{
              borderColor: selectedSub === sub.key ? '#FF6B00' : '#E8E0D8',
              background: selectedSub === sub.key ? 'linear-gradient(135deg, rgba(255,107,0,0.06), rgba(255,31,112,0.03))' : 'white',
            }}
            onMouseEnter={(e) => {
              if (selectedSub !== sub.key) e.currentTarget.style.borderColor = '#FFB380'
            }}
            onMouseLeave={(e) => {
              if (selectedSub !== sub.key) e.currentTarget.style.borderColor = '#E8E0D8'
            }}
          >
            <span className="font-bold text-gray-900">{sub.label}</span>
            {selectedSub === sub.key ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FF6B00' }}>
                <Check size={14} color="white" strokeWidth={3} />
              </div>
            ) : (
              <ChevronRight size={18} className="text-gray-300" />
            )}
          </button>
        ))}
      </div>

      {/* Free-text field for "Other" */}
      {selectedSub === 'custom' && (
        <div className="mt-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Describe your property in a few words
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCustom() } }}
              placeholder="e.g. Floating raft cabin on a river"
              autoFocus
              maxLength={80}
              className="flex-1 px-4 py-3 rounded-xl border-2 outline-none transition-colors"
              style={{ borderColor: '#E8E0D8', background: 'white' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
            />
            <button
              type="button"
              onClick={submitCustom}
              disabled={!customText.trim()}
              className="px-5 py-3 rounded-xl font-black text-white transition-all"
              style={{
                background: customText.trim()
                  ? 'linear-gradient(135deg, #FF6B00, #FF1F70)'
                  : '#E8E0D8',
                cursor: customText.trim() ? 'pointer' : 'not-allowed',
                opacity: customText.trim() ? 1 : 0.6,
              }}
            >
              Confirm
            </button>
          </div>
          <div className="mt-1.5 text-xs text-gray-400">{customText.length} / 80</div>
        </div>
      )}
    </div>
  )
}
