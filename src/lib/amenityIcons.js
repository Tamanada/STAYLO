// ============================================================================
// amenityIcons — single source of truth for amenity → (icon, label) mapping
// ============================================================================
// Every amenity key that can appear in rooms.amenities[] gets a Lucide icon
// and a human label here. Search cards, PropertyDetail, MyBookings, the
// hotelier room form — all read this map so they stay visually consistent.
//
// New amenity? Add it here once. The hotelier form (PropertyManage) still
// imports its own AMENITY_CATEGORIES for the categorised picker, but the
// keys MUST match these.
// ============================================================================
import {
  Wifi, Wind, Tv, Coffee, Flame, Briefcase, ShieldCheck, Shirt, Sparkles,
  Bath, Droplets, ShowerHead, Star,
  ChefHat, Refrigerator, Microwave, CupSoda, Wine,
  Waves, Mountain, Trees, Building2, Sun, Home, Tent,
  Dumbbell, Bike, Flower2, Umbrella, Car,
  Accessibility, BugOff, PawPrint, Cigarette,
} from 'lucide-react'

// Per-key icon + label. Falls back to Sparkles + the raw key if unknown
// (so a new amenity added in the DB still renders as a chip).
export const AMENITY_META = {
  // Comfort
  wifi:         { icon: Wifi,         label: 'Free WiFi' },
  tv:           { icon: Tv,           label: 'TV' },
  smart_tv:     { icon: Tv,           label: 'Smart TV' },
  ac:           { icon: Wind,         label: 'Air Conditioning' },
  heating:      { icon: Flame,        label: 'Heating' },
  ceiling_fan:  { icon: Wind,         label: 'Ceiling Fan' },
  soundproof:   { icon: ShieldCheck,  label: 'Soundproof' },
  workspace:    { icon: Briefcase,    label: 'Workspace' },
  safe:         { icon: ShieldCheck,  label: 'Safe' },
  iron:         { icon: Shirt,        label: 'Iron' },
  hair_dryer:   { icon: Sparkles,     label: 'Hair Dryer' },

  // Bathroom
  bathtub:        { icon: Bath,        label: 'Bathtub' },
  walk_in_shower: { icon: ShowerHead,  label: 'Walk-in Shower' },
  outdoor_shower: { icon: Droplets,    label: 'Outdoor Shower' },
  bathrobe:       { icon: Star,        label: 'Bathrobe & Slippers' },
  premium_toilet: { icon: Star,        label: 'Premium Toiletries' },

  // Kitchen & Food
  kitchen:        { icon: ChefHat,      label: 'Full Kitchen' },
  kitchenette:    { icon: ChefHat,      label: 'Kitchenette' },
  mini_fridge:    { icon: Refrigerator, label: 'Mini Fridge' },
  microwave:      { icon: Microwave,    label: 'Microwave' },
  coffee_machine: { icon: Coffee,       label: 'Coffee Machine' },
  kettle:         { icon: CupSoda,      label: 'Kettle' },
  minibar:        { icon: Wine,         label: 'Minibar' },
  restaurant:     { icon: ChefHat,      label: 'Restaurant on-site' },

  // View & Space
  sea_view:       { icon: Waves,    label: 'Sea View' },
  mountain_view:  { icon: Mountain, label: 'Mountain View' },
  garden_view:    { icon: Trees,    label: 'Garden View' },
  city_view:      { icon: Building2,label: 'City View' },
  pool_view:      { icon: Waves,    label: 'Pool View' },
  balcony:        { icon: Sun,      label: 'Balcony' },
  terrace:        { icon: Home,     label: 'Terrace' },
  private_garden: { icon: Trees,    label: 'Private Garden' },

  // Outdoor & Wellness
  private_pool:   { icon: Waves,    label: 'Private Pool' },
  pool:           { icon: Waves,    label: 'Shared Pool' },
  jacuzzi:        { icon: Droplets, label: 'Jacuzzi' },
  bbq:            { icon: Flame,    label: 'Outdoor BBQ' },
  fireplace:      { icon: Flame,    label: 'Fireplace' },
  hammock:        { icon: Tent,     label: 'Hammock' },
  beach:          { icon: Umbrella, label: 'Beach Access' },
  parking:        { icon: Car,      label: 'Free Parking' },
  spa:            { icon: Sparkles, label: 'Spa' },
  gym:            { icon: Dumbbell, label: 'Gym' },
  bicycle:        { icon: Bike,     label: 'Bicycles' },
  yoga:           { icon: Flower2,  label: 'Yoga' },

  // Access & Policy
  wheelchair_access: { icon: Accessibility, label: 'Wheelchair Access' },
  mosquito_net:      { icon: BugOff,        label: 'Mosquito Net' },
  pet_friendly:      { icon: PawPrint,      label: 'Pet-Friendly' },
  smoking_allowed:   { icon: Cigarette,     label: 'Smoking Allowed' },
}

// Pretty-print a raw key when no entry exists (e.g. snake_case → "Pool view")
function prettify(key) {
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Public helper — always returns { icon, label }, never undefined.
export function getAmenityMeta(key) {
  if (!key) return { icon: Sparkles, label: '' }
  const meta = AMENITY_META[key]
  if (meta) return meta
  // Unknown amenity → still render as a chip with a generic icon + prettified label
  return { icon: Sparkles, label: prettify(key) }
}

// Aggregate every unique amenity across a property's rooms — what we show
// on a hotel card. Keeps order stable using Set + Array.from.
export function aggregatePropertyAmenities(rooms = []) {
  const set = new Set()
  for (const r of rooms) {
    const list = Array.isArray(r.amenities) ? r.amenities : []
    for (const a of list) {
      if (a) set.add(a)
    }
  }
  return Array.from(set)
}
