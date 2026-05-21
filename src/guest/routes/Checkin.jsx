// =====================================================================
// QR check-in — the moment of magic for the demo.
// =====================================================================
// The guest opens this on arrival, shows the QR to a staff member at
// reception, staff scans with the messenger app → check-in done in
// 10 seconds, no paperwork, no key card.
//
// Phase 1: static QR (we just need it to LOOK right for the demo).
// Phase 2: real QR encoding {booking_id, signed_token, expires_at}
// and the staff messenger has a "Scan check-in" action that consumes it.

const MOCK_QR_DATA = 'STAYLO_CHECKIN_STY-2K26-04219_2026-05-22'

export default function GuestCheckin() {
  return (
    <div className="guest-page guest-page-centered">
      <div className="guest-page-title">Check-in</div>
      <div className="guest-page-sub">Show this to reception when you arrive</div>

      <section className="guest-qr-card">
        {/* Pure-SVG QR placeholder — the real one would be generated
            via a library (qrcode.react) from a signed token. */}
        <div className="guest-qr-frame">
          <QRPlaceholder data={MOCK_QR_DATA} />
        </div>
        <div className="guest-qr-meta">
          <div className="guest-qr-ref">STY-2K26-04219</div>
          <div className="guest-qr-name">Sasiwimol Wong</div>
          <div className="guest-qr-hotel">By Nanda Phangan · Garden View 204</div>
        </div>
      </section>

      <section className="guest-card">
        <div className="guest-card-title">How it works</div>
        <ol className="guest-card-list-ordered">
          <li>Arrive at the hotel — no need to queue at reception.</li>
          <li>Show this QR to a STAYLO team member (any badge).</li>
          <li>They scan it from their staff app → your room key is sent here.</li>
          <li>Unlock the door with your phone (Bluetooth or NFC).</li>
        </ol>
      </section>

      <p className="guest-page-note">
        🔒 Your QR is tied to <b>this device only</b> and expires 24h after
        check-out. It can't be used by anyone else even if they take a photo.
      </p>
    </div>
  )
}

// Decorative QR — a recognisable QR-shaped pattern. The real one is
// a proper QR code from a real signed token in phase 2.
function QRPlaceholder({ data }) {
  // Deterministic "pattern" generator so the same `data` always shows
  // the same shape (helps the demo look stable). 21×21 grid like a real
  // QR. The 3 finder squares (corners) are real, the rest is hashed-noise.
  const size = 21
  const cells = []
  let hash = 0
  for (let i = 0; i < data.length; i++) hash = (hash * 31 + data.charCodeAt(i)) | 0
  const isFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
  const finderPixel = (r, c) => {
    // Each finder is a 7x7 nested square pattern
    const rr = r < 7 ? r : (r >= size - 7 ? r - (size - 7) : -1)
    const cc = c < 7 ? c : (c >= size - 7 ? c - (size - 7) : -1)
    if (rr < 0 || cc < 0) return false
    const inner = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
    const ring  = rr === 0 || rr === 6 || cc === 0 || cc === 6
    return inner || ring
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinder(r, c)) {
        cells.push({ r, c, on: finderPixel(r, c) })
      } else {
        // Pseudo-random but stable per data string
        const v = ((hash + r * 191 + c * 313) & 0xff)
        cells.push({ r, c, on: (v % 7) < 3 })
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="guest-qr-svg" aria-label="Check-in QR code">
      <rect x="0" y="0" width={size} height={size} fill="#fff" />
      {cells.filter(x => x.on).map(({ r, c }) => (
        <rect key={`${r}-${c}`} x={c} y={r} width="1.02" height="1.02" fill="#1A1F2E" />
      ))}
    </svg>
  )
}
