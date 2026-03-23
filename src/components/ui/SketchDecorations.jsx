import { useState } from 'react'

/* ── Shared pencil-sketch SVG style ── */
const sketchStyle = {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
}

/* ═══════════════════════════════════════════════════════════════
   THEME 1 — Tropical Paradise
   ═══════════════════════════════════════════════════════════════ */

/** Coconut palm tree — reused from Splash.jsx pencil sketch */
export function SketchPalm({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 140 220"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Curved trunk */}
      <path
        d="M68 218 C66 195 63 170 62 150 C60 130 59 115 61 100 C63 88 66 80 70 74"
        stroke={color} strokeWidth="1.4" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M72 218 C71 196 69 172 67 152 C65 132 64 116 65 101 C67 89 69 81 72 75"
        stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.6} fill="none"
      />
      {/* Trunk texture */}
      <path d="M64 190 C66 189 69 189 71 190" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M63 170 C65 169 68 169 70 170" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M62 150 C64 149 67 149 69 150" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M61 130 C63 129 66 129 68 130" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M62 110 C64 109 66 109 68 110" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Left fronds */}
      <path d="M70 74 C60 62 42 48 22 38 C18 36 12 33 6 28" stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill="none" />
      <path d="M50 52 C46 46 42 42 38 40" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M42 48 C38 54 34 58 30 60" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M34 43 C30 38 26 35 22 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M69 72 C56 56 36 42 14 32 C10 30 5 27 2 22" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M70 70 C58 52 40 30 28 16 C24 11 20 6 16 2" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Right fronds */}
      <path d="M72 74 C82 62 100 48 120 38 C124 36 130 33 136 28" stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill="none" />
      <path d="M92 52 C96 46 100 42 104 40" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M100 48 C104 54 108 58 112 60" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M73 72 C86 56 106 42 128 32 C132 30 137 27 140 22" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M72 70 C84 52 102 30 114 16 C118 11 122 6 126 2" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Center frond */}
      <path d="M71 73 C71 58 72 40 73 22 C73 14 74 8 74 2" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Coconuts */}
      <ellipse cx="63" cy="78" rx="4.5" ry="4" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.04} />
      <ellipse cx="78" cy="76" rx="4" ry="4.3" stroke={color} strokeWidth="1.2" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.04} />
      <ellipse cx="70" cy="82" rx="3.8" ry="3.5" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill={color} fillOpacity={opacity * 0.03} />
    </svg>
  )
}

/** Hammock strung between two poles */
export function SketchHammock({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left pole */}
      <path d="M20 10 C19 30 18 60 20 95" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill="none" />
      {/* Right pole */}
      <path d="M140 10 C141 30 142 60 140 95" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill="none" />
      {/* Hammock drape — main curve */}
      <path
        d="M22 18 C40 22 55 52 80 58 C105 52 120 22 138 18"
        stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Hammock net lines */}
      <path d="M30 22 C42 36 58 48 74 54" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M40 24 C52 38 66 48 80 52" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M130 22 C118 36 102 48 86 54" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M120 24 C108 38 94 48 80 52" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Cross hatching */}
      <path d="M50 34 C58 32 66 34 74 40" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M86 40 C94 34 102 32 110 34" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.3} fill="none" />
      {/* Rope ties */}
      <path d="M22 16 C24 14 22 12 20 14" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M138 16 C136 14 138 12 140 14" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Sunset sun with radiating rays */
export function SketchSun({ className = '', style = {}, color = 'white', opacity = 0.16 }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sun circle — slightly wobbly */}
      <path
        d="M50 28 C60 27 70 32 74 42 C78 52 74 63 65 68 C56 73 44 73 35 68 C26 63 22 52 26 42 C30 32 40 27 50 28Z"
        stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
      {/* Rays — hand-drawn wobbly lines */}
      <path d="M50 18 C49 12 51 6 50 2" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M68 24 C74 18 78 12 82 8" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M78 42 C84 40 90 39 96 38" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M76 60 C82 64 86 68 90 74" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M60 74 C62 80 63 86 64 92" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M40 74 C38 80 37 86 36 92" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M24 60 C18 64 14 68 10 74" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M22 42 C16 40 10 39 4 38" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M32 24 C26 18 22 12 18 8" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
    </svg>
  )
}

/** Flip flops on sand */
export function SketchFlipFlops({ className = '', style = {}, color = 'white', opacity = 0.14 }) {
  return (
    <svg
      viewBox="0 0 90 60"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left flip flop sole */}
      <path
        d="M12 14 C8 16 6 22 6 30 C6 38 8 46 14 50 C18 52 24 52 28 48 C32 44 32 36 30 28 C28 20 24 14 18 12 C16 11 14 12 12 14Z"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Left straps */}
      <path d="M18 14 C16 22 17 28 18 30" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M10 28 C14 26 18 30 18 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M26 26 C22 26 18 30 18 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Right flip flop sole — slightly rotated */}
      <path
        d="M52 18 C48 16 44 18 42 24 C40 32 42 42 48 48 C52 52 58 54 64 50 C68 46 70 38 68 30 C66 22 60 18 56 16 C54 16 52 16 52 18Z"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Right straps */}
      <path d="M56 18 C54 26 55 32 56 34" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M46 30 C50 28 56 34 56 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M64 28 C60 28 56 34 56 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Sand dots */}
      <circle cx="78" cy="50" r="0.8" fill={color} fillOpacity={opacity * 0.3} />
      <circle cx="82" cy="46" r="0.6" fill={color} fillOpacity={opacity * 0.25} />
      <circle cx="3" cy="48" r="0.7" fill={color} fillOpacity={opacity * 0.25} />
    </svg>
  )
}

/** Cocktail glass with umbrella */
export function SketchCocktail({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 80 110"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Glass — V shape */}
      <path
        d="M16 30 C20 32 28 58 38 68 C40 70 40 70 42 68 C52 58 60 32 64 30"
        stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Rim */}
      <path d="M12 28 C20 30 32 30 40 30 C48 30 60 30 68 28" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Stem */}
      <path d="M40 70 C40 78 40 86 40 94" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Base */}
      <path d="M28 94 C32 92 38 92 40 94 C42 92 48 92 52 94" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Umbrella stick */}
      <path d="M50 30 C48 18 46 10 44 4" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Umbrella canopy */}
      <path
        d="M44 4 C38 6 32 12 30 18 C36 14 42 10 50 12 C52 12 54 14 56 18 C54 12 50 6 44 4Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Umbrella ribs */}
      <path d="M44 4 C38 12 34 16 30 18" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M44 4 C46 12 50 16 56 18" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Liquid line */}
      <path d="M22 38 C30 40 38 40 46 40 C52 40 56 38 58 38" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Straw */}
      <path d="M30 28 C28 18 26 8 24 2" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Small sketchy starfish accent */
export function SketchStarfish({ className = '', style = {}, color = 'white', opacity = 0.12 }) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M25 8 C26 14 28 18 25 22 C22 18 20 14 21 8 C22 6 24 6 25 8Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
      <path
        d="M34 16 C30 18 28 20 25 22 C28 24 32 24 38 22 C40 21 38 17 34 16Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
      <path
        d="M36 30 C32 28 28 26 25 22 C24 26 26 30 28 36 C29 38 34 36 36 30Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
      <path
        d="M14 30 C18 28 22 26 25 22 C26 26 24 30 22 36 C21 38 16 36 14 30Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
      <path
        d="M16 16 C20 18 22 20 25 22 C22 24 18 24 12 22 C10 21 12 17 16 16Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.04}
      />
    </svg>
  )
}

/** Tiny seashell accent */
export function SketchShell({ className = '', style = {}, color = 'white', opacity = 0.10 }) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Shell outline */}
      <path
        d="M20 4 C28 6 34 14 34 22 C34 28 28 32 20 32 C12 32 6 28 6 22 C6 14 12 6 20 4Z"
        stroke={color} strokeWidth="1" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Ridges */}
      <path d="M20 6 C18 14 18 22 20 32" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M14 10 C14 18 16 26 18 32" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M26 10 C26 18 24 26 22 32" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   THEME 2 — Mountain Adventure
   ═══════════════════════════════════════════════════════════════ */

/** Mountain peaks with snow caps */
export function SketchMountains({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main peak */}
      <path
        d="M20 130 C40 100 60 60 80 22 C82 18 84 16 86 18 C90 24 92 30 100 50 C108 30 112 24 114 18 C116 16 118 18 120 22 C140 60 160 100 180 130"
        stroke={color} strokeWidth="1.4" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Snow cap — main peak */}
      <path
        d="M72 38 C76 28 80 22 84 18 C86 22 88 28 92 38 C86 36 78 36 72 38Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill={color} fillOpacity={opacity * 0.04}
      />
      {/* Snow cap — second peak */}
      <path
        d="M108 34 C112 26 116 20 118 18 C120 22 122 28 126 38 C120 36 112 36 108 34Z"
        stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill={color} fillOpacity={opacity * 0.04}
      />
      {/* Ridge details */}
      <path d="M60 80 C66 72 72 66 78 58" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M122 58 C128 66 134 72 140 80" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Background mountain silhouette */}
      <path
        d="M0 130 C20 110 40 80 55 60 C58 56 62 58 65 62 C80 80 90 110 100 130"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.35} fill="none"
      />
      <path
        d="M100 130 C120 108 140 78 155 56 C158 52 162 54 165 58 C178 80 188 108 200 130"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.35} fill="none"
      />
    </svg>
  )
}

/** Pine / fir tree — sketch style */
export function SketchPineTree({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 60 100"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Trunk */}
      <path d="M28 88 C28 78 29 70 29 65" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M32 88 C32 78 31 70 31 65" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Bottom tier */}
      <path
        d="M8 72 C14 62 22 56 30 48 C38 56 46 62 52 72"
        stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Middle tier */}
      <path
        d="M14 58 C20 48 26 40 30 34 C34 40 40 48 46 58"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Top tier */}
      <path
        d="M18 44 C22 34 26 24 30 14 C34 24 38 34 42 44"
        stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Top point */}
      <path d="M30 14 C30 10 30 6 30 4" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
    </svg>
  )
}

/** Winding trail/path */
export function SketchTrail({ className = '', style = {}, color = 'white', opacity = 0.12 }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Winding path — left edge */}
      <path
        d="M50 156 C44 140 38 120 42 100 C46 80 58 70 62 52 C66 34 56 20 50 8 C48 4 46 2 44 0"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity} fill="none"
      />
      {/* Winding path — right edge */}
      <path
        d="M64 156 C58 140 52 122 56 102 C60 82 72 72 76 54 C80 36 70 22 64 10 C62 6 60 4 58 0"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity} fill="none"
      />
      {/* Path texture — dashes across */}
      <path d="M48 140 C54 138 58 138 62 140" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M44 118 C50 116 54 116 58 118" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M48 96 C54 94 58 94 62 96" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M58 74 C64 72 68 72 72 74" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M56 48 C62 46 66 46 70 48" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M50 24 C56 22 60 22 64 24" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Compass rose */
export function SketchCompass({ className = '', style = {}, color = 'white', opacity = 0.15 }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.02} />
      <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* N-S needle */}
      <path d="M50 10 L46 48 L50 44 L54 48 Z" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.8} fill={color} fillOpacity={opacity * 0.05} />
      <path d="M50 90 L46 52 L50 56 L54 52 Z" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      {/* E-W needle */}
      <path d="M90 50 L52 46 L56 50 L52 54 Z" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M10 50 L48 46 L44 50 L48 54 Z" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Cardinal letters */}
      <text x="50" y="20" textAnchor="middle" fill={color} fillOpacity={opacity * 0.6} fontSize="7" fontFamily="serif">N</text>
      <text x="50" y="86" textAnchor="middle" fill={color} fillOpacity={opacity * 0.4} fontSize="6" fontFamily="serif">S</text>
      <text x="82" y="53" textAnchor="middle" fill={color} fillOpacity={opacity * 0.4} fontSize="6" fontFamily="serif">E</text>
      <text x="18" y="53" textAnchor="middle" fill={color} fillOpacity={opacity * 0.4} fontSize="6" fontFamily="serif">W</text>
      {/* Center dot */}
      <circle cx="50" cy="50" r="2" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill={color} fillOpacity={opacity * 0.04} />
    </svg>
  )
}

/** Backpack */
export function SketchBackpack({ className = '', style = {}, color = 'white', opacity = 0.14 }) {
  return (
    <svg
      viewBox="0 0 70 90"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main body */}
      <path
        d="M14 28 C12 30 10 40 10 50 C10 62 12 74 14 80 C16 84 22 86 35 86 C48 86 54 84 56 80 C58 74 60 62 60 50 C60 40 58 30 56 28 C52 24 18 24 14 28Z"
        stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Top flap */}
      <path
        d="M16 28 C16 20 20 14 35 14 C50 14 54 20 54 28"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.8} fill="none"
      />
      {/* Handle loop */}
      <path d="M30 14 C30 8 32 4 35 4 C38 4 40 8 40 14" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Front pocket */}
      <path
        d="M20 48 C20 46 22 44 35 44 C48 44 50 46 50 48 C50 58 48 66 46 68 C44 70 26 70 24 68 C22 66 20 58 20 48Z"
        stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none"
      />
      {/* Pocket flap */}
      <path d="M24 48 C30 46 40 46 46 48" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Straps */}
      <path d="M20 28 C18 40 16 60 18 80" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M50 28 C52 40 54 60 52 80" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Buckle */}
      <rect x="32" y="44" width="6" height="4" rx="1" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Birds in V-formation */
export function SketchBirds({ className = '', style = {}, color = 'white', opacity = 0.12 }) {
  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lead bird */}
      <path d="M50 24 C46 18 42 16 38 18" stroke={color} strokeWidth="1" strokeOpacity={opacity} fill="none" />
      <path d="M50 24 C54 18 58 16 62 18" stroke={color} strokeWidth="1" strokeOpacity={opacity} fill="none" />
      {/* Left wing birds */}
      <path d="M38 30 C34 24 30 22 26 24" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M38 30 C42 24 46 22 50 24" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M26 36 C22 30 18 28 14 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M26 36 C30 30 34 28 38 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Right wing birds */}
      <path d="M62 30 C58 24 54 22 50 24" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M62 30 C66 24 70 22 74 24" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M74 36 C70 30 66 28 62 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M74 36 C78 30 82 28 86 30" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Trailing small birds */}
      <path d="M16 42 C14 38 10 38 8 40" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M16 42 C18 38 22 38 24 40" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M84 42 C82 38 78 38 76 40" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M84 42 C86 38 90 38 92 40" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   THEME 3 — Urban Explorer
   ═══════════════════════════════════════════════════════════════ */

/** City skyline with various building heights */
export function SketchSkyline({ className = '', style = {}, color = 'white', opacity = 0.16 }) {
  return (
    <svg
      viewBox="0 0 220 140"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Building 1 — tall narrow */}
      <path d="M10 130 L10 50 C10 48 12 46 14 46 L28 46 C30 46 32 48 32 50 L32 130" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      <path d="M16 56 L16 62" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M22 56 L22 62" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M16 68 L16 74" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M22 68 L22 74" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M16 80 L16 86" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M22 80 L22 86" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Building 2 — skyscraper with antenna */}
      <path d="M36 130 L36 28 C36 26 38 24 40 24 L58 24 C60 24 62 26 62 28 L62 130" stroke={color} strokeWidth="1.3" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      <path d="M49 24 L49 12 L49 8" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M46 12 L52 12" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Windows */}
      {[36, 50, 64, 78, 92, 106].map((y) => (
        <g key={`b2-${y}`}>
          <rect x="42" y={y} width="4" height="5" rx="0.5" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.35} fill="none" />
          <rect x="52" y={y} width="4" height="5" rx="0.5" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.35} fill="none" />
        </g>
      ))}
      {/* Building 3 — medium wide */}
      <path d="M66 130 L66 62 C66 60 68 58 70 58 L94 58 C96 58 98 60 98 62 L98 130" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.9} fill={color} fillOpacity={opacity * 0.03} />
      <path d="M72 66 L72 72" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M82 66 L82 72" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M92 66 L92 72" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Building 4 — short */}
      <path d="M102 130 L102 86 C102 84 104 82 106 82 L126 82 C128 82 130 84 130 86 L130 130" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill={color} fillOpacity={opacity * 0.03} />
      {/* Building 5 — tall with dome */}
      <path d="M134 130 L134 42 C134 40 136 38 138 38 L156 38 C158 38 160 40 160 42 L160 130" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      <path d="M138 38 C140 30 145 26 147 24 C149 26 154 30 156 38" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Building 6 — small */}
      <path d="M164 130 L164 94 C164 92 166 90 168 90 L186 90 C188 90 190 92 190 94 L190 130" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill={color} fillOpacity={opacity * 0.03} />
      {/* Ground line */}
      <path d="M2 130 C40 129 80 131 120 130 C160 129 200 131 218 130" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Vintage scooter / vespa */
export function SketchScooter({ className = '', style = {}, color = 'white', opacity = 0.14 }) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Rear wheel */}
      <circle cx="26" cy="62" r="14" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      <circle cx="26" cy="62" r="3" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Front wheel */}
      <circle cx="94" cy="62" r="14" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      <circle cx="94" cy="62" r="3" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Body */}
      <path
        d="M26 48 C28 40 32 34 40 30 C48 26 56 26 62 28 C66 30 70 34 72 40 L80 40 C84 38 90 36 94 36 L94 48"
        stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Floor board */}
      <path d="M36 52 C48 50 64 50 80 52" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Seat */}
      <path d="M36 30 C40 24 46 20 54 20 C58 20 60 22 60 26" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Handlebar */}
      <path d="M90 36 C90 28 92 20 94 14" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M86 14 C90 12 94 14 98 12" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Headlight */}
      <ellipse cx="96" cy="38" rx="4" ry="3" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill={color} fillOpacity={opacity * 0.04} />
      {/* Rear fender */}
      <path d="M16 50 C20 44 28 42 36 48" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Front fender */}
      <path d="M86 50 C90 44 96 42 102 48" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Mirror */}
      <path d="M86 14 C84 10 82 8 80 10" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
      <ellipse cx="79" cy="10" rx="2.5" ry="2" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Street lamp */
export function SketchStreetLamp({ className = '', style = {}, color = 'white', opacity = 0.13 }) {
  return (
    <svg
      viewBox="0 0 50 120"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Pole */}
      <path d="M24 116 C24 90 24 60 24 30 C24 24 25 20 26 18" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill="none" />
      <path d="M26 116 C26 90 26 60 26 30 C26 24 26 20 26 18" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Lamp arm */}
      <path d="M26 18 C28 14 32 12 38 12" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Lamp shade */}
      <path
        d="M32 12 C30 8 32 4 38 4 C44 4 46 8 44 12 C42 14 34 14 32 12Z"
        stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill={color} fillOpacity={opacity * 0.04}
      />
      {/* Light glow lines */}
      <path d="M36 16 C35 20 34 24 34 26" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M38 16 C38 20 38 24 38 26" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M40 16 C41 20 42 24 42 26" stroke={color} strokeWidth="0.5" strokeOpacity={opacity * 0.3} fill="none" />
      {/* Base */}
      <path d="M18 116 C20 114 24 112 25 112 C26 112 30 114 32 116" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Decorative curl on pole */}
      <path d="M24 40 C20 38 18 36 20 34 C22 32 24 34 24 36" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Coffee cup steaming */
export function SketchCoffee({ className = '', style = {}, color = 'white', opacity = 0.14 }) {
  return (
    <svg
      viewBox="0 0 70 80"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cup body */}
      <path
        d="M12 32 C14 54 16 62 20 68 C24 72 36 74 42 74 C48 74 52 72 54 68 C58 62 58 54 58 32"
        stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Rim */}
      <path d="M10 30 C18 32 30 32 38 32 C46 32 54 32 62 30" stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Handle */}
      <path
        d="M58 38 C64 38 68 42 68 50 C68 58 64 62 58 62"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity * 0.7} fill="none"
      />
      {/* Saucer */}
      <path d="M6 76 C14 72 28 70 36 70 C44 70 58 72 66 76" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Steam wisps */}
      <path d="M24 26 C22 20 24 14 22 8 C20 4 22 0 24 -2" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M34 24 C36 18 34 12 36 6 C38 2 36 -2 34 -4" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M44 26 C42 20 44 14 42 8" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}

/** Camera */
export function SketchCamera({ className = '', style = {}, color = 'white', opacity = 0.14 }) {
  return (
    <svg
      viewBox="0 0 90 70"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Camera body */}
      <path
        d="M10 22 C8 22 6 24 6 28 L6 56 C6 60 8 62 12 62 L78 62 C82 62 84 60 84 56 L84 28 C84 24 82 22 78 22 Z"
        stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Viewfinder bump */}
      <path d="M32 22 L34 14 C35 12 37 10 40 10 L50 10 C53 10 55 12 56 14 L58 22" stroke={color} strokeWidth="1" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Lens — outer ring */}
      <circle cx="45" cy="42" r="14" stroke={color} strokeWidth="1.2" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03} />
      {/* Lens — inner ring */}
      <circle cx="45" cy="42" r="8" stroke={color} strokeWidth="0.9" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Lens — center */}
      <circle cx="45" cy="42" r="3" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.4} fill={color} fillOpacity={opacity * 0.04} />
      {/* Flash */}
      <rect x="14" y="28" width="8" height="5" rx="1" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Shutter button */}
      <circle cx="70" cy="18" r="3" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Strap loop */}
      <path d="M6 30 C2 30 0 32 2 34" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M84 30 C88 30 90 32 88 34" stroke={color} strokeWidth="0.6" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}

/** Folded map with compass */
export function SketchMap({ className = '', style = {}, color = 'white', opacity = 0.11 }) {
  return (
    <svg
      viewBox="0 0 80 60"
      fill="none"
      className={className}
      style={{ ...sketchStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Map — folded paper */}
      <path
        d="M6 10 L26 6 L50 10 L74 6 L74 52 L50 56 L26 52 L6 56 Z"
        stroke={color} strokeWidth="1.1" strokeOpacity={opacity} fill={color} fillOpacity={opacity * 0.03}
      />
      {/* Fold lines */}
      <path d="M26 6 L26 52" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M50 10 L50 56" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Route line */}
      <path d="M16 20 C20 22 24 18 30 22 C36 26 40 24 46 28 C52 32 56 30 62 34" stroke={color} strokeWidth="0.8" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Pin marker */}
      <path d="M62 34 C60 30 62 26 66 26 C70 26 72 30 68 34 C66 36 64 38 64 40" stroke={color} strokeWidth="0.7" strokeOpacity={opacity * 0.5} fill={color} fillOpacity={opacity * 0.04} />
      {/* Dotted path */}
      <circle cx="18" cy="36" r="0.8" fill={color} fillOpacity={opacity * 0.4} />
      <circle cx="22" cy="38" r="0.8" fill={color} fillOpacity={opacity * 0.4} />
      <circle cx="26" cy="36" r="0.8" fill={color} fillOpacity={opacity * 0.4} />
      <circle cx="30" cy="38" r="0.8" fill={color} fillOpacity={opacity * 0.4} />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   THEME LAYOUT DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

const tropicalElements = [
  // Top-left — large palm tree
  {
    Component: SketchPalm,
    style: { position: 'absolute', top: '-2%', left: '-3%', width: '22%', maxWidth: '180px' },
    opacity: 0.16,
  },
  // Top-right — sun with rays
  {
    Component: SketchSun,
    style: { position: 'absolute', top: '2%', right: '3%', width: '14%', maxWidth: '120px' },
    opacity: 0.14,
  },
  // Bottom-left — flip flops
  {
    Component: SketchFlipFlops,
    style: { position: 'absolute', bottom: '5%', left: '4%', width: '10%', maxWidth: '90px' },
    opacity: 0.12,
  },
  // Bottom-right — cocktail glass
  {
    Component: SketchCocktail,
    style: { position: 'absolute', bottom: '3%', right: '5%', width: '9%', maxWidth: '80px' },
    opacity: 0.13,
  },
  // Center-left — hammock
  {
    Component: SketchHammock,
    style: { position: 'absolute', top: '40%', left: '1%', width: '16%', maxWidth: '140px' },
    opacity: 0.08,
  },
  // Center-right — starfish accent
  {
    Component: SketchStarfish,
    style: { position: 'absolute', top: '55%', right: '8%', width: '5%', maxWidth: '50px' },
    opacity: 0.08,
  },
  // Scattered — shell
  {
    Component: SketchShell,
    style: { position: 'absolute', top: '25%', right: '18%', width: '4%', maxWidth: '40px' },
    opacity: 0.07,
  },
]

const mountainElements = [
  // Top-left — mountain peaks
  {
    Component: SketchMountains,
    style: { position: 'absolute', top: '-1%', left: '-2%', width: '28%', maxWidth: '220px' },
    opacity: 0.16,
  },
  // Top-right — compass rose
  {
    Component: SketchCompass,
    style: { position: 'absolute', top: '3%', right: '4%', width: '12%', maxWidth: '100px' },
    opacity: 0.13,
  },
  // Bottom-left — backpack
  {
    Component: SketchBackpack,
    style: { position: 'absolute', bottom: '4%', left: '5%', width: '8%', maxWidth: '70px' },
    opacity: 0.12,
  },
  // Bottom-right — birds V-formation
  {
    Component: SketchBirds,
    style: { position: 'absolute', bottom: '8%', right: '6%', width: '12%', maxWidth: '100px' },
    opacity: 0.11,
  },
  // Center-left — pine tree
  {
    Component: SketchPineTree,
    style: { position: 'absolute', top: '35%', left: '2%', width: '7%', maxWidth: '60px' },
    opacity: 0.09,
  },
  // Center-right — trail
  {
    Component: SketchTrail,
    style: { position: 'absolute', top: '20%', right: '2%', width: '8%', maxWidth: '80px' },
    opacity: 0.07,
  },
  // Scattered — small pine
  {
    Component: SketchPineTree,
    style: { position: 'absolute', top: '60%', right: '20%', width: '5%', maxWidth: '45px' },
    opacity: 0.06,
  },
  // Scattered — small birds
  {
    Component: SketchBirds,
    style: { position: 'absolute', top: '12%', left: '30%', width: '8%', maxWidth: '70px' },
    opacity: 0.06,
  },
]

const urbanElements = [
  // Top-left — city skyline
  {
    Component: SketchSkyline,
    style: { position: 'absolute', top: '-1%', left: '-2%', width: '28%', maxWidth: '240px' },
    opacity: 0.15,
  },
  // Top-right — camera
  {
    Component: SketchCamera,
    style: { position: 'absolute', top: '3%', right: '4%', width: '11%', maxWidth: '90px' },
    opacity: 0.13,
  },
  // Bottom-left — coffee cup
  {
    Component: SketchCoffee,
    style: { position: 'absolute', bottom: '4%', left: '5%', width: '8%', maxWidth: '70px' },
    opacity: 0.12,
  },
  // Bottom-right — scooter
  {
    Component: SketchScooter,
    style: { position: 'absolute', bottom: '3%', right: '4%', width: '14%', maxWidth: '120px' },
    opacity: 0.13,
  },
  // Center-left — street lamp
  {
    Component: SketchStreetLamp,
    style: { position: 'absolute', top: '30%', left: '2%', width: '5%', maxWidth: '50px' },
    opacity: 0.09,
  },
  // Center-right — map
  {
    Component: SketchMap,
    style: { position: 'absolute', top: '45%', right: '6%', width: '9%', maxWidth: '80px' },
    opacity: 0.08,
  },
  // Scattered — small street lamp
  {
    Component: SketchStreetLamp,
    style: { position: 'absolute', top: '55%', right: '22%', width: '4%', maxWidth: '40px' },
    opacity: 0.06,
  },
]


/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

const themes = [tropicalElements, mountainElements, urbanElements]
const themeMap = { tropical: 0, mountain: 1, urban: 2 }

/**
 * SketchDecorations — renders travel-themed pencil-sketch SVG decorations
 *
 * @param {'random'|'tropical'|'mountain'|'urban'} variant — theme selection
 * @param {boolean} lightMode — true = dark strokes on light bg, false = white on dark
 */
export function SketchDecorations({ variant = 'random', lightMode = false }) {
  const [themeIndex] = useState(() => {
    if (variant === 'random') {
      return Math.floor(Math.random() * themes.length)
    }
    return themeMap[variant] ?? 0
  })

  const elements = themes[themeIndex]
  const strokeColor = lightMode ? '#0A1628' : 'white'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {elements.map(({ Component, style, opacity }, i) => (
        <Component
          key={i}
          color={strokeColor}
          opacity={opacity}
          style={style}
        />
      ))}
    </div>
  )
}

export default SketchDecorations
