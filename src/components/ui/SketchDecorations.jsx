import { useState } from 'react'

/* ── Shared Van Gogh brushstroke SVG style ── */
const brushStyle = {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
}

/* ═══════════════════════════════════════════════════════════════
   THEME 1 — Starry Night
   Swirling skies, spiraling stars, cypress flame, crescent moon
   ═══════════════════════════════════════════════════════════════ */

/** Swirling Sky — the iconic large spiral vortex from Starry Night */
function VanGoghSwirlingsky({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 300 200"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Large central spiral — primary vortex */}
      <path
        d="M150 100 C150 80 170 60 190 65 C210 70 220 90 215 110 C210 130 185 145 160 140 C135 135 120 115 125 90 C130 65 155 45 185 50 C215 55 235 80 230 115 C225 150 195 170 155 165 C115 160 95 130 100 95"
        stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M148 102 C148 84 166 66 184 70 C202 74 212 92 208 108 C204 124 182 136 162 132 C142 128 130 112 134 92 C138 72 158 56 182 60 C206 64 222 84 218 112"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M152 98 C152 82 168 68 184 72 C200 76 208 90 204 106 C200 122 180 132 164 128 C148 124 138 110 142 94"
        stroke={color} strokeWidth="3.5" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Secondary swirl — upper left */}
      <path
        d="M60 55 C60 40 75 30 88 35 C101 40 108 55 103 68 C98 81 80 88 67 83 C54 78 47 63 52 50"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none"
      />
      <path
        d="M62 53 C62 42 74 34 84 38 C94 42 100 54 96 64 C92 74 78 80 68 76 C58 72 52 60 56 50"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Tertiary swirl — upper right */}
      <path
        d="M240 45 C240 32 252 24 264 28 C276 32 282 46 278 58 C274 70 258 76 246 72 C234 68 228 54 232 42"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none"
      />
      {/* Flowing connecting strokes — the wavy sky texture */}
      <path
        d="M10 70 C30 60 50 75 70 65 C90 55 110 70 130 62 C150 54 170 68 190 60"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.4} fill="none"
      />
      <path
        d="M20 90 C40 82 60 95 80 85 C100 75 120 90 140 82 C160 74 180 88 200 80 C220 72 240 85 260 78"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.35} fill="none"
      />
      <path
        d="M5 120 C25 110 50 125 75 115 C100 105 125 120 150 112 C175 104 200 118 225 110 C250 102 275 115 295 108"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none"
      />
      {/* Turbulent swirl marks — short expressive strokes */}
      <path d="M100 50 C108 44 116 48 112 56 C108 64 100 60 100 50" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M200 80 C208 74 216 78 212 86 C208 94 200 90 200 80" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Rolling hills at bottom — undulating landscape */}
      <path
        d="M0 170 C20 155 50 160 80 150 C110 140 140 155 170 148 C200 141 230 158 260 150 C280 144 295 150 300 155"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M0 178 C25 165 55 170 85 162 C115 154 145 168 175 160 C205 152 235 166 265 158 C285 152 295 158 300 162"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.4} fill="none"
      />
      <path
        d="M0 185 C30 175 60 182 90 175 C120 168 150 180 180 172 C210 164 240 178 270 170 C290 165 298 170 300 174"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none"
      />
    </svg>
  )
}

/** Spiraling Stars — Van Gogh stars with radiating swirl halos */
function VanGoghStars({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Star 1 — top center with spiral halo */}
      <path d="M100 30 C100 22 108 18 112 24 C116 30 110 36 104 34 C98 32 100 26 100 30" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M100 30 C92 20 80 18 78 26 C76 34 86 40 96 36" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M106 24 C114 16 126 16 128 24 C130 32 120 38 110 34" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Radiating swirl strokes around star 1 */}
      <path d="M100 18 C98 10 102 6 106 12" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M88 22 C82 16 78 18 84 24" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M116 22 C122 16 126 18 120 24" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M100 42 C98 48 102 52 106 46" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Star 2 — upper left */}
      <path d="M40 60 C40 54 46 50 50 55 C54 60 48 64 42 62 C36 60 40 56 40 60" stroke={color} strokeWidth="2.5" strokeOpacity={opacity} fill="none" />
      <path d="M34 56 C28 50 30 44 36 48" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M52 56 C58 50 60 44 54 48" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M40 50 C38 44 42 40 46 46" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M40 70 C38 76 42 78 46 72" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Star 3 — upper right */}
      <path d="M160 50 C160 44 166 40 170 45 C174 50 168 54 162 52 C156 50 160 46 160 50" stroke={color} strokeWidth="2.5" strokeOpacity={opacity} fill="none" />
      <path d="M154 46 C148 40 150 34 156 38" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M172 46 C178 40 180 34 174 38" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Star 4 — mid left */}
      <path d="M25 120 C25 114 31 110 35 115 C39 120 33 124 27 122 C21 120 25 116 25 120" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.9} fill="none" />
      <path d="M19 116 C14 110 16 106 22 110" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M37 116 C42 110 44 106 38 110" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Star 5 — mid right */}
      <path d="M175 110 C175 104 181 100 185 105 C189 110 183 114 177 112 C171 110 175 106 175 110" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M169 106 C164 100 166 96 172 100" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Star 6 — bottom scattered */}
      <path d="M120 160 C120 154 126 150 130 155 C134 160 128 164 122 162" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M114 156 C110 150 112 146 118 150" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Crescent Moon — thick bold crescent with swirling halo */
function VanGoghMoon({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Crescent body — thick bold strokes */}
      <path
        d="M70 20 C90 25 105 45 105 65 C105 85 90 105 70 110 C55 100 48 80 52 60 C56 40 65 25 70 20"
        stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M68 24 C86 28 98 46 98 64 C98 82 86 98 68 102 C56 94 50 78 54 60 C58 42 66 28 68 24"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M72 18 C94 24 110 48 110 68 C110 88 94 108 72 114 C58 104 46 82 50 60 C54 38 64 22 72 18"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none"
      />
      {/* Swirling halo around moon */}
      <path
        d="M60 10 C42 12 28 28 22 48 C16 68 22 90 38 104"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.35} fill="none"
      />
      <path
        d="M56 6 C36 10 20 28 14 50 C8 72 16 96 34 110"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.25} fill="none"
      />
      {/* Radiating swirl wisps */}
      <path d="M80 14 C88 6 96 8 92 16" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M108 50 C116 46 118 52 112 56" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M108 80 C116 78 118 84 112 88" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M80 112 C88 118 86 124 78 118" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}

/** Cypress Tree — tall, flame-like with swirling foliage */
function VanGoghCypress({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 80 240"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main trunk/spine — thick wavering stroke */}
      <path
        d="M40 238 C39 220 38 200 40 180 C42 160 40 140 42 120 C44 100 40 80 42 60 C44 40 40 25 40 12"
        stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M42 236 C41 218 40 198 42 178 C44 158 42 138 44 118 C46 98 42 78 44 58 C46 38 42 24 42 14"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Foliage swirls — left side, flame-like spirals */}
      <path
        d="M40 180 C30 175 20 170 18 160 C16 150 22 142 30 145 C38 148 40 158 38 168"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none"
      />
      <path
        d="M40 160 C28 155 16 148 14 138 C12 128 20 120 28 123 C36 126 40 136 38 148"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M40 140 C30 134 22 126 20 116 C18 106 24 100 32 103 C38 106 40 116 38 128"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M40 110 C32 104 26 96 26 86 C26 76 32 72 36 78 C40 84 40 94 38 104"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M40 80 C34 74 30 66 32 56 C34 48 38 46 40 52 C42 58 40 68 38 76"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Foliage swirls — right side */}
      <path
        d="M40 180 C50 175 60 170 62 160 C64 150 58 142 50 145 C42 148 40 158 42 168"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none"
      />
      <path
        d="M40 160 C52 155 64 148 66 138 C68 128 60 120 52 123 C44 126 40 136 42 148"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M40 140 C50 134 58 126 60 116 C62 106 56 100 48 103 C42 106 40 116 42 128"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M40 110 C48 104 54 96 54 86 C54 76 48 72 44 78 C40 84 40 94 42 104"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      <path
        d="M40 80 C46 74 50 66 48 56 C46 48 42 46 40 52 C38 58 40 68 42 76"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Tip — flame peak swirl */}
      <path
        d="M40 30 C36 22 34 14 38 8 C40 4 42 4 44 8 C46 14 44 22 40 30"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M38 26 C36 20 36 12 39 8 C41 5 43 8 42 14 C41 20 40 24 38 26"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none"
      />
      {/* Swirling texture marks on foliage */}
      <path d="M30 150 C26 146 24 150 28 154" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M50 130 C54 126 56 130 52 134" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M28 120 C24 116 22 120 26 124" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M52 110 C56 106 58 110 54 114" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Rolling Hills — wavy undulating landscape */
function VanGoghHills({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 300 80"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Hill layer 1 — foreground */}
      <path
        d="M0 60 C20 40 50 35 80 42 C110 49 130 30 160 28 C190 26 210 38 240 35 C260 33 280 42 300 38"
        stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M0 62 C22 44 52 38 82 44 C112 50 132 34 162 32 C192 30 212 40 242 38 C262 36 282 44 300 40"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Hill layer 2 — midground */}
      <path
        d="M0 48 C30 30 60 25 90 32 C120 39 150 20 180 18 C210 16 240 28 270 24 C290 22 298 26 300 28"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M0 50 C32 34 62 28 92 34 C122 40 152 24 182 22 C212 20 242 30 272 28 C292 26 298 28 300 30"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none"
      />
      {/* Hill layer 3 — background */}
      <path
        d="M0 36 C40 18 80 12 120 20 C160 28 200 10 240 8 C270 6 290 14 300 16"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Texture strokes — short swirling field marks */}
      <path d="M40 50 C44 46 48 48 46 52" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M100 40 C104 36 108 38 106 42" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M180 30 C184 26 188 28 186 32" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M250 36 C254 32 258 34 256 38" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   THEME 2 — Cafe Terrace at Night
   Cobblestones, street lamp, building facades, cafe table
   ═══════════════════════════════════════════════════════════════ */

/** Cobblestone Path — swirling perspective lines converging */
function VanGoghCobblestones({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 200 260"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Converging perspective lines */}
      <path d="M10 260 C30 220 60 160 90 100 C95 90 98 80 100 70" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M12 258 C32 218 62 158 92 98 C97 88 100 78 102 68" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M190 260 C170 220 140 160 110 100 C105 90 102 80 100 70" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M188 258 C168 218 138 158 108 98 C103 88 100 78 98 68" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Cross-lines — cobblestone rows with swirling character */}
      <path d="M30 240 C60 235 80 234 100 234 C120 234 140 235 170 240" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M42 220 C65 216 82 215 100 215 C118 215 135 216 158 220" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.55} fill="none" />
      <path d="M52 200 C70 196 84 195 100 195 C116 195 130 196 148 200" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M60 180 C74 177 86 176 100 176 C114 176 126 177 140 180" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.45} fill="none" />
      <path d="M68 160 C78 158 88 157 100 157 C112 157 122 158 132 160" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M74 140 C82 138 90 138 100 138 C110 138 118 138 126 140" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.35} fill="none" />
      <path d="M80 120 C86 119 92 118 100 118 C108 118 114 119 120 120" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      {/* Swirling stone texture marks */}
      <path d="M80 230 C84 226 88 228 86 232" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M120 230 C124 226 128 228 126 232" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M90 210 C94 206 98 208 96 212" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M110 210 C114 206 118 208 116 212" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M95 190 C99 186 103 188 101 192" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.25} fill="none" />
    </svg>
  )
}

/** Street Lamp — with radiating light rays (thick swirling strokes) */
function VanGoghLamp({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 140 240"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lamp post — thick wavy vertical */}
      <path d="M70 238 C69 220 68 200 69 180 C70 160 69 140 70 120 C71 100 70 80 70 65" stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none" />
      <path d="M72 236 C71 218 70 198 71 178 C72 158 71 138 72 118 C73 98 72 80 72 66" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Lamp head — bowl shape */}
      <path d="M50 65 C55 55 62 50 70 48 C78 50 85 55 90 65" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M52 63 C56 55 63 52 70 50 C77 52 84 55 88 63" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Lamp finial */}
      <path d="M66 48 C68 42 72 42 74 48" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Radiating light swirls — emanating outward */}
      <path d="M70 50 C65 35 55 20 40 10" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M68 48 C62 32 50 16 34 8" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M70 50 C75 35 85 20 100 10" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M72 48 C78 32 90 16 106 8" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M50 58 C38 50 24 42 10 38" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M90 58 C102 50 116 42 130 38" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Swirling light glow — concentric arcs around lamp */}
      <path d="M45 40 C50 28 60 20 70 18 C80 20 90 28 95 40" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M35 35 C42 18 55 8 70 6 C85 8 98 18 105 35" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.2} fill="none" />
      <path d="M25 30 C35 10 50 0 70 0 C90 0 105 10 115 30" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.15} fill="none" />
      {/* Base detail */}
      <path d="M60 238 C65 234 75 234 80 238" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M55 238 C60 232 80 232 85 238" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
    </svg>
  )
}

/** Building Facades — sketchy, slightly tilted with swirling windows */
function VanGoghBuildings({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Building 1 — left, slightly tilted */}
      <path d="M10 200 L8 60 C8 56 12 52 18 50 L62 48 C66 48 70 52 70 56 L72 200" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M12 198 L10 62 C10 58 14 54 20 52 L60 50 C64 50 68 54 68 58 L70 198" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Windows — swirling rectangles */}
      <path d="M22 70 C24 66 34 66 36 70 C38 74 38 84 36 88 C34 92 24 92 22 88 C20 84 20 74 22 70" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M44 70 C46 66 56 66 58 70 C60 74 60 84 58 88 C56 92 46 92 44 88 C42 84 42 74 44 70" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M22 105 C24 101 34 101 36 105 C38 109 38 119 36 123 C34 127 24 127 22 123 C20 119 20 109 22 105" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M44 105 C46 101 56 101 58 105 C60 109 60 119 58 123 C56 127 46 127 44 123 C42 119 42 109 44 105" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Building 2 — center, taller */}
      <path d="M80 200 L78 40 C78 36 82 32 88 30 L132 28 C136 28 140 32 140 36 L142 200" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M82 198 L80 42 C80 38 84 34 90 32 L130 30 C134 30 138 34 138 38 L140 198" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Windows building 2 */}
      <path d="M92 48 C94 44 104 44 106 48 C108 52 108 62 106 66 C104 70 94 70 92 66 C90 62 90 52 92 48" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M114 48 C116 44 126 44 128 48 C130 52 130 62 128 66 C126 70 116 70 114 66 C112 62 112 52 114 48" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M92 84 C94 80 104 80 106 84 C108 88 108 98 106 102 C104 106 94 106 92 102 C90 98 90 88 92 84" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M114 84 C116 80 126 80 128 84 C130 88 130 98 128 102 C126 106 116 106 114 102 C112 98 112 88 114 84" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Building 3 — right, shorter */}
      <path d="M155 200 L154 80 C154 76 158 72 164 70 L208 68 C212 68 216 72 216 76 L218 200" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.9} fill="none" />
      <path d="M157 198 L156 82 C156 78 160 74 166 72 L206 70 C210 70 214 74 214 78 L216 198" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Windows building 3 */}
      <path d="M168 88 C170 84 180 84 182 88 C184 92 184 102 182 106 C180 110 170 110 168 106 C166 102 166 92 168 88" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M192 88 C194 84 204 84 206 88 C208 92 208 102 206 106 C204 110 194 110 192 106 C190 102 190 92 192 88" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Roof texture swirls */}
      <path d="M14 52 C20 46 30 44 40 46 C50 48 58 46 64 50" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M84 32 C94 26 110 24 120 26 C130 28 136 26 138 30" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}

/** Cafe Table and Chair — wobbly thick strokes */
function VanGoghCafeTable({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Table top — wobbly oval */}
      <path
        d="M30 50 C35 44 55 40 70 40 C85 40 105 44 110 50 C115 56 95 60 70 60 C45 60 25 56 30 50"
        stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M32 48 C36 44 54 41 70 41 C86 41 104 44 108 48 C112 52 94 56 70 56 C46 56 28 52 32 48"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Table leg — center, wobbly */}
      <path d="M70 58 C68 70 66 85 64 100 C63 108 62 114 60 120" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M72 58 C74 70 76 85 78 100 C79 108 80 114 82 120" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Table base */}
      <path d="M50 118 C56 114 64 112 70 112 C76 112 84 114 90 118" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Chair — left side, wobbly */}
      <path d="M10 55 C8 55 6 58 8 62 L14 100 C14 104 16 108 20 108" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M10 55 C14 52 20 50 26 52 C30 54 30 58 28 62 L22 100 C22 104 20 108 20 108" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      {/* Chair back — curved */}
      <path d="M6 42 C4 36 6 28 12 24 C18 20 24 22 26 28 C28 34 26 42 26 48" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M8 40 C6 36 8 30 12 27 C16 24 22 26 24 30 C26 34 24 40 24 46" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Chair seat — horizontal wobble */}
      <path d="M6 48 C10 46 18 44 26 46" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Cup on table — small swirl */}
      <path d="M62 42 C64 38 74 38 76 42 C78 46 74 48 68 48 C62 48 60 46 62 42" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M76 42 C80 42 82 44 80 46 C78 48 76 46 76 44" stroke={color} strokeWidth="1.5" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Cafe Stars — smaller cluster for the cafe sky */
function VanGoghCafeStars({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Star cluster — spiraling stars with halos */}
      <path d="M40 30 C40 24 46 20 50 25 C54 30 48 34 42 32 C36 30 40 26 40 30" stroke={color} strokeWidth="2.5" strokeOpacity={opacity} fill="none" />
      <path d="M34 26 C28 20 30 16 36 20" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M52 26 C58 20 60 16 54 20" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M40 20 C38 14 42 10 46 16" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      <path d="M100 20 C100 14 106 10 110 15 C114 20 108 24 102 22 C96 20 100 16 100 20" stroke={color} strokeWidth="2.5" strokeOpacity={opacity} fill="none" />
      <path d="M94 16 C88 10 90 6 96 10" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M112 16 C118 10 120 6 114 10" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />

      <path d="M160 40 C160 34 166 30 170 35 C174 40 168 44 162 42 C156 40 160 36 160 40" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.9} fill="none" />
      <path d="M154 36 C148 30 150 26 156 30" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M172 36 C178 30 180 26 174 30" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />

      {/* Smaller accent stars */}
      <path d="M70 60 C70 56 74 54 76 58 C78 62 74 64 70 62" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M140 70 C140 66 144 64 146 68 C148 72 144 74 140 72" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   THEME 3 — Wheat Fields with Cypresses
   Wheat stalks, lone cypress, swirling clouds, sun, crows
   ═══════════════════════════════════════════════════════════════ */

/** Wheat Stalks — thick swirling curves in groups, waves of grain */
function VanGoghWheat({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 260 180"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Wheat group 1 — left */}
      <path d="M20 180 C18 160 16 140 20 120 C24 100 22 85 28 70" stroke={color} strokeWidth="2.5" strokeOpacity={opacity} fill="none" />
      <path d="M30 180 C28 162 26 144 30 126 C34 108 30 92 34 78" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M40 180 C38 164 36 148 40 132 C44 116 40 100 44 86" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M50 180 C48 166 46 150 48 136 C50 122 48 108 52 94" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Wheat heads — small swirls at tops */}
      <path d="M28 70 C24 64 22 58 26 54 C30 50 34 56 30 62 C26 68 28 70 28 70" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M34 78 C30 72 28 66 32 62 C36 58 40 64 36 70 C32 76 34 78 34 78" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M44 86 C40 80 38 74 42 70 C46 66 50 72 46 78 C42 84 44 86 44 86" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Wheat group 2 — center */}
      <path d="M100 180 C98 162 96 140 100 120 C104 100 100 82 104 66" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M110 180 C108 164 106 146 110 128 C114 110 110 92 114 76" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M120 180 C118 166 116 150 120 134 C124 118 120 102 124 86" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M130 180 C128 168 126 152 130 138 C134 124 130 108 132 96" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Wheat heads center */}
      <path d="M104 66 C100 60 98 54 102 50 C106 46 110 52 106 58 C102 64 104 66 104 66" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M114 76 C110 70 108 64 112 60 C116 56 120 62 116 68 C112 74 114 76 114 76" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Wheat group 3 — right */}
      <path d="M190 180 C188 164 186 144 190 126 C194 108 190 90 194 74" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M200 180 C198 166 196 148 200 132 C204 116 200 98 204 82" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M210 180 C208 168 206 152 210 136 C214 120 210 104 214 90" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M220 180 C218 170 216 156 220 142 C224 128 220 112 222 100" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Wheat heads right */}
      <path d="M194 74 C190 68 188 62 192 58 C196 54 200 60 196 66 C192 72 194 74 194 74" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M204 82 C200 76 198 70 202 66 C206 62 210 68 206 74 C202 80 204 82 204 82" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />

      {/* Wave texture across field — horizontal swirling strokes */}
      <path d="M0 160 C30 152 60 158 90 150 C120 142 150 156 180 148 C210 140 240 152 260 146" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
      <path d="M0 140 C25 132 55 138 85 130 C115 122 145 136 175 128 C205 120 235 132 260 126" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.25} fill="none" />
    </svg>
  )
}

/** Swirling Clouds — big bold spiral patterns in the sky */
function VanGoghClouds({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 280 120"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cloud spiral 1 — large left */}
      <path
        d="M60 60 C60 44 76 32 92 36 C108 40 116 56 110 70 C104 84 86 90 70 84 C54 78 48 62 56 48"
        stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M62 58 C62 46 74 36 88 40 C102 44 108 56 104 68 C100 80 84 84 72 80 C60 76 54 62 60 52"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none"
      />
      <path
        d="M64 56 C64 48 72 42 82 44 C92 46 98 56 94 64 C90 72 80 76 72 72 C64 68 60 58 64 52"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none"
      />
      {/* Cloud spiral 2 — right */}
      <path
        d="M180 50 C180 36 194 26 208 30 C222 34 228 48 222 60 C216 72 200 78 186 72 C172 66 166 52 172 40"
        stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.9} fill="none"
      />
      <path
        d="M182 48 C182 38 192 30 204 34 C216 38 222 48 218 58 C214 68 200 72 188 68 C176 64 172 52 178 44"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none"
      />
      {/* Cloud spiral 3 — small upper */}
      <path
        d="M130 30 C130 20 140 14 150 18 C160 22 164 32 158 40 C152 48 140 50 132 44 C124 38 122 28 128 22"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none"
      />
      <path
        d="M132 28 C132 22 138 18 146 20 C154 22 158 30 154 36 C150 42 140 44 136 40 C132 36 130 30 132 26"
        stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none"
      />
      {/* Flowing connecting wisps */}
      <path d="M10 50 C20 44 35 48 50 44 C60 42 70 50 80 46" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.35} fill="none" />
      <path d="M110 55 C120 50 130 54 140 50 C150 46 160 52 170 48" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.35} fill="none" />
      <path d="M220 45 C230 40 245 44 255 40 C265 36 272 42 280 38" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}

/** Spiraling Sun — thick radiating swirl rays */
function VanGoghSun({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 140 140"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sun core — spiral */}
      <path
        d="M70 70 C70 60 80 54 88 58 C96 62 98 74 90 80 C82 86 70 84 66 76 C62 68 66 58 76 54 C86 50 98 56 102 68 C106 80 98 92 84 96"
        stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none"
      />
      <path
        d="M72 68 C72 62 78 58 84 60 C90 62 92 70 88 76 C84 82 76 82 72 78 C68 74 70 66 74 62"
        stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none"
      />
      {/* Radiating swirl rays */}
      <path d="M70 48 C68 36 64 24 66 14 C68 8 72 6 74 12 C76 18 72 28 70 40" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M68 46 C64 34 58 22 60 12" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M92 58 C102 48 112 40 120 36 C126 34 128 38 122 42 C116 46 106 52 96 60" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M94 56 C106 44 118 34 126 32" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M70 92 C68 104 64 116 66 126 C68 132 72 134 74 128 C76 122 72 112 70 100" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M68 94 C64 106 58 118 60 128" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M48 58 C38 48 28 40 20 36 C14 34 12 38 18 42 C24 46 34 52 44 60" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M46 56 C34 44 22 34 14 32" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Diagonal swirl rays */}
      <path d="M86 52 C94 40 100 28 108 20 C112 16 116 18 112 24 C108 30 100 40 90 50" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M54 52 C46 40 40 28 32 20 C28 16 24 18 28 24 C32 30 40 40 50 50" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M86 88 C94 100 100 112 108 120 C112 124 116 122 112 116 C108 110 100 100 90 90" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
      <path d="M54 88 C46 100 40 112 32 120 C28 124 24 122 28 116 C32 110 40 100 50 90" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Crows/Birds — bold V-shapes with thick strokes */
function VanGoghCrows({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Crow 1 — large foreground */}
      <path d="M40 50 C44 40 50 34 58 30 C54 34 50 42 48 50 C50 42 56 34 64 30" stroke={color} strokeWidth="3.5" strokeOpacity={opacity} fill="none" />
      <path d="M42 48 C46 40 52 36 58 33 C54 36 52 42 50 48" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Crow 2 — medium */}
      <path d="M100 35 C103 28 108 24 114 21 C110 24 108 30 107 35 C108 30 112 24 118 21" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M102 33 C104 28 108 25 112 23" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      {/* Crow 3 — small far */}
      <path d="M150 45 C152 40 156 37 160 35 C158 37 156 42 155 45 C156 42 160 37 164 35" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      {/* Crow 4 — small far */}
      <path d="M80 65 C82 60 86 57 90 55 C88 57 86 62 85 65 C86 62 90 57 94 55" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.6} fill="none" />
      {/* Crow 5 — distant */}
      <path d="M170 25 C172 22 174 20 177 19 C175 20 174 24 173 25 C174 24 176 20 179 19" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
      {/* Crow 6 — distant */}
      <path d="M30 30 C32 26 34 24 37 23 C35 24 34 28 33 30 C34 28 36 24 39 23" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.5} fill="none" />
    </svg>
  )
}

/** Rolling Field Lines — parallel wavy strokes suggesting texture */
function VanGoghFieldLines({ className = '', style = {}, color = 'white', opacity = 0.18 }) {
  return (
    <svg
      viewBox="0 0 300 60"
      fill="none"
      className={className}
      style={{ ...brushStyle, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Parallel wavy field rows */}
      <path d="M0 10 C20 6 40 12 60 8 C80 4 100 10 120 6 C140 2 160 8 180 4 C200 0 220 6 240 2 C260 -2 280 4 300 0" stroke={color} strokeWidth="3" strokeOpacity={opacity} fill="none" />
      <path d="M0 12 C22 8 42 14 62 10 C82 6 102 12 122 8 C142 4 162 10 182 6 C202 2 222 8 242 4 C262 0 282 6 300 2" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.4} fill="none" />
      <path d="M0 24 C20 20 40 26 60 22 C80 18 100 24 120 20 C140 16 160 22 180 18 C200 14 220 20 240 16 C260 12 280 18 300 14" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.8} fill="none" />
      <path d="M0 38 C20 34 40 40 60 36 C80 32 100 38 120 34 C140 30 160 36 180 32 C200 28 220 34 240 30 C260 26 280 32 300 28" stroke={color} strokeWidth="2.5" strokeOpacity={opacity * 0.7} fill="none" />
      <path d="M0 40 C22 36 42 42 62 38 C82 34 102 40 122 36 C142 32 162 38 182 34 C202 30 222 36 242 32 C262 28 282 34 300 30" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.35} fill="none" />
      <path d="M0 52 C20 48 40 54 60 50 C80 46 100 52 120 48 C140 44 160 50 180 46 C200 42 220 48 240 44 C260 40 280 46 300 42" stroke={color} strokeWidth="3" strokeOpacity={opacity * 0.6} fill="none" />
      <path d="M0 54 C22 50 42 56 62 52 C82 48 102 54 122 50 C142 46 162 52 182 48 C202 44 222 50 242 46 C262 42 282 48 300 44" stroke={color} strokeWidth="2" strokeOpacity={opacity * 0.3} fill="none" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════
   ELEMENT PLACEMENT — Position arrays for each theme
   ═══════════════════════════════════════════════════════════════ */

const starryElements = [
  // Large swirling sky — top area
  {
    Component: VanGoghSwirlingsky,
    style: { position: 'absolute', top: '-2%', left: '-3%', width: '55%', maxWidth: '440px' },
    opacity: 0.16,
  },
  // Stars — top right
  {
    Component: VanGoghStars,
    style: { position: 'absolute', top: '2%', right: '3%', width: '30%', maxWidth: '260px' },
    opacity: 0.14,
  },
  // Crescent moon — upper right
  {
    Component: VanGoghMoon,
    style: { position: 'absolute', top: '5%', right: '15%', width: '10%', maxWidth: '90px' },
    opacity: 0.18,
  },
  // Cypress tree — bottom left
  {
    Component: VanGoghCypress,
    style: { position: 'absolute', bottom: '0%', left: '5%', width: '8%', maxWidth: '70px' },
    opacity: 0.16,
  },
  // Rolling hills — bottom
  {
    Component: VanGoghHills,
    style: { position: 'absolute', bottom: '2%', left: '10%', width: '60%', maxWidth: '500px' },
    opacity: 0.12,
  },
  // Small stars scattered — mid left
  {
    Component: VanGoghStars,
    style: { position: 'absolute', top: '35%', left: '2%', width: '14%', maxWidth: '120px' },
    opacity: 0.08,
  },
  // Small cypress — bottom right
  {
    Component: VanGoghCypress,
    style: { position: 'absolute', bottom: '0%', right: '8%', width: '5%', maxWidth: '45px', transform: 'scaleX(-1)' },
    opacity: 0.10,
  },
]

const cafeElements = [
  // Buildings — top left
  {
    Component: VanGoghBuildings,
    style: { position: 'absolute', top: '-1%', left: '-2%', width: '35%', maxWidth: '300px' },
    opacity: 0.15,
  },
  // Street lamp — center left
  {
    Component: VanGoghLamp,
    style: { position: 'absolute', top: '10%', left: '35%', width: '10%', maxWidth: '100px' },
    opacity: 0.16,
  },
  // Cobblestones — bottom center
  {
    Component: VanGoghCobblestones,
    style: { position: 'absolute', bottom: '-2%', left: '25%', width: '30%', maxWidth: '250px' },
    opacity: 0.13,
  },
  // Cafe table — bottom right
  {
    Component: VanGoghCafeTable,
    style: { position: 'absolute', bottom: '5%', right: '8%', width: '14%', maxWidth: '120px' },
    opacity: 0.14,
  },
  // Stars above — top right
  {
    Component: VanGoghCafeStars,
    style: { position: 'absolute', top: '3%', right: '5%', width: '28%', maxWidth: '240px' },
    opacity: 0.13,
  },
  // Buildings right — top right
  {
    Component: VanGoghBuildings,
    style: { position: 'absolute', top: '-1%', right: '-2%', width: '30%', maxWidth: '260px', transform: 'scaleX(-1)' },
    opacity: 0.10,
  },
  // Small lamp — bottom left
  {
    Component: VanGoghLamp,
    style: { position: 'absolute', bottom: '15%', left: '4%', width: '5%', maxWidth: '50px' },
    opacity: 0.08,
  },
]

const wheatElements = [
  // Wheat stalks — bottom spread
  {
    Component: VanGoghWheat,
    style: { position: 'absolute', bottom: '-2%', left: '-2%', width: '45%', maxWidth: '380px' },
    opacity: 0.16,
  },
  // More wheat — bottom right
  {
    Component: VanGoghWheat,
    style: { position: 'absolute', bottom: '-2%', right: '-2%', width: '40%', maxWidth: '340px', transform: 'scaleX(-1)' },
    opacity: 0.14,
  },
  // Lone cypress — left side
  {
    Component: VanGoghCypress,
    style: { position: 'absolute', bottom: '8%', left: '20%', width: '7%', maxWidth: '60px' },
    opacity: 0.18,
  },
  // Swirling clouds — top
  {
    Component: VanGoghClouds,
    style: { position: 'absolute', top: '-1%', left: '5%', width: '50%', maxWidth: '420px' },
    opacity: 0.14,
  },
  // Sun — top right
  {
    Component: VanGoghSun,
    style: { position: 'absolute', top: '2%', right: '8%', width: '14%', maxWidth: '120px' },
    opacity: 0.16,
  },
  // Crows — upper area
  {
    Component: VanGoghCrows,
    style: { position: 'absolute', top: '15%', left: '30%', width: '25%', maxWidth: '200px' },
    opacity: 0.12,
  },
  // Field lines — bottom
  {
    Component: VanGoghFieldLines,
    style: { position: 'absolute', bottom: '15%', left: '0%', width: '100%', maxWidth: '600px' },
    opacity: 0.10,
  },
  // Small clouds — top right
  {
    Component: VanGoghClouds,
    style: { position: 'absolute', top: '0%', right: '-3%', width: '35%', maxWidth: '280px', transform: 'scaleX(-1)' },
    opacity: 0.08,
  },
]


/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

const themes = [starryElements, cafeElements, wheatElements]
const themeMap = { starry: 0, cafe: 1, wheat: 2 }

/**
 * SketchDecorations — renders Van Gogh inspired SVG decorations
 *
 * @param {'random'|'starry'|'cafe'|'wheat'} variant — theme selection
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
