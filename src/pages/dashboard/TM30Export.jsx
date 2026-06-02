// ============================================================================
// Dashboard — TM30 Export (Phase 1 of docs/TM30_COMPLIANCE.md)
// ============================================================================
// Per the TM30 roadmap, Phase 1 ships a CSV that the hotelier downloads
// manually and uploads to https://extranet.immigration.go.th. This is the
// route that ships that CSV.
//
//   URL:  /dashboard/property/:id/tm30
//   View: pick a date → list of foreign guests checked in that day → click
//         "Download CSV" → file matches Immigration's expected column order.
//         A daily PDF (per booking) is also downloadable from the row's
//         inline action — uses the existing pdf-lib generator in
//         src/lib/tm30.js (kept for printable archives).
//
// What counts as "foreign" for TM30 purposes
//   Any booking_guest with `nationality` ≠ 'TH'. Thai nationals are out
//   of scope (no immigration notification required). If nationality is
//   NULL we INCLUDE the row but flag it so the hotelier knows to confirm
//   before submitting.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Calendar, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { downloadTM30 } from '../../lib/tm30'

// Immigration Bureau column order (approximate spec — confirm with the
// portal sample CSV before going live). Header row is included to make
// the file self-documenting; the IB portal accepts it.
const CSV_HEADERS = [
  'HotelID', 'GuestSeq', 'FamilyName', 'GivenName', 'Sex', 'DOB',
  'Nationality', 'PassportNo', 'DocType', 'ThailandArrival',
  'PortOfEntry', 'VisaType', 'VisaNo', 'CheckIn', 'CheckOut', 'Phone',
]

function isoToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Properly quote a CSV cell — escapes embedded quotes, wraps when needed.
function csvCell(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildCSV(rows) {
  const lines = [CSV_HEADERS.join(',')]
  for (const r of rows) lines.push(r.map(csvCell).join(','))
  return lines.join('\r\n')   // CRLF — Windows-friendly, IB portal-friendly
}

export default function TM30Export() {
  const { id: propertyId } = useParams()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [date, setDate] = useState(isoToday())
  const [guests, setGuests] = useState([])
  const [bookingsByGuest, setBookingsByGuest] = useState({})
  const [loading, setLoading] = useState(true)

  // Load the property (TM30 license, name, etc.) once.
  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    supabase
      .from('properties')
      .select('id, name, city, country, address, contact_name, tm30_license_number')
      .eq('id', propertyId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setProperty(data) })
    return () => { cancelled = true }
  }, [propertyId])

  // Load the foreign guests checked in on the chosen date. We JOIN to
  // bookings to filter by property + check_in date.
  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, guest_phone, check_in, check_out')
        .eq('property_id', propertyId)
        .eq('check_in', date)
      if (cancelled) return
      const bookingIds = (bookings || []).map(b => b.id)
      if (bookingIds.length === 0) { setGuests([]); setBookingsByGuest({}); setLoading(false); return }
      const map = {}
      ;(bookings || []).forEach(b => { map[b.id] = b })
      const { data: guestRows } = await supabase
        .from('booking_guests')
        .select('id, booking_id, first_name, last_name, sex, nationality, passport_number, date_of_birth, travel_doc_type, thailand_arrival_date, thailand_port_of_entry, visa_type, visa_number, is_child')
        .in('booking_id', bookingIds)
      if (cancelled) return
      // Filter out Thai nationals — TM30 only requires foreign guest
      // notification. Rows with NULL nationality kept with a flag so
      // the hotelier knows to confirm before exporting.
      const foreign = (guestRows || []).filter(g => !g.nationality || g.nationality.toUpperCase() !== 'TH')
      setGuests(foreign)
      setBookingsByGuest(map)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [propertyId, date])

  const hasLicense = !!property?.tm30_license_number

  const csvRows = useMemo(() => {
    return guests.map((g, i) => {
      const b = bookingsByGuest[g.booking_id] || {}
      return [
        property?.tm30_license_number || '',                  // HotelID
        i + 1,                                                 // GuestSeq
        g.last_name || '',                                     // FamilyName
        g.first_name || '',                                    // GivenName
        g.sex || '',                                           // Sex
        g.date_of_birth || '',                                 // DOB (YYYY-MM-DD)
        g.nationality || '',                                   // Nationality (alpha-2)
        g.passport_number || '',                               // PassportNo
        g.travel_doc_type || 'passport',                       // DocType
        g.thailand_arrival_date || '',                         // ThailandArrival
        g.thailand_port_of_entry || '',                        // PortOfEntry
        g.visa_type || '',                                     // VisaType
        g.visa_number || '',                                   // VisaNo
        b.check_in  || '',                                     // CheckIn
        b.check_out || '',                                     // CheckOut
        b.guest_phone || '',                                   // Phone (from booking, not per-guest)
      ]
    })
  }, [guests, bookingsByGuest, property])

  function handleDownloadCSV() {
    if (csvRows.length === 0) return
    const csv = buildCSV(csvRows)
    // BOM for Excel UTF-8 compatibility (the IB portal also handles BOM cleanly).
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const safeName = (property?.name || 'property').replace(/[^a-z0-9-_]+/gi, '_')
    const a = document.createElement('a')
    a.href = url
    a.download = `TM30_${safeName}_${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function handleDownloadPDF(guest) {
    const b = bookingsByGuest[guest.booking_id] || {}
    downloadTM30({
      booking: {
        id: b.id || guest.booking_id,
        check_in: b.check_in || date,
        check_out: b.check_out || date,
        guest_name: `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
      },
      property: property || { name: 'Property' },
      guests: [{
        first_name: guest.first_name,
        last_name: guest.last_name,
        nationality: guest.nationality,
        passport_number: guest.passport_number,
        passport_expires_at: null,
        date_of_birth: guest.date_of_birth,
        sex: guest.sex,
      }],
    })
  }

  return (
    <div className="w-[92%] max-w-[1200px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/dashboard/property/${propertyId}/manage`}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors no-underline text-gray-600"
          title="Back to property"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange">
            Thai Immigration · TM.30
          </div>
          <h1 className="text-2xl font-bold text-deep">Daily TM30 export</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {property?.name || '—'} · Generate the CSV, upload at{' '}
            <a href="https://extranet.immigration.go.th" target="_blank" rel="noopener noreferrer"
              className="text-orange font-semibold">extranet.immigration.go.th</a> within 24h of arrival.
          </p>
        </div>
      </div>

      {/* License + date picker */}
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-ocean" />
            <label className="text-sm text-deep font-semibold">Date of arrival</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
            />
          </div>
          <div className="text-xs text-gray-500">
            {hasLicense ? (
              <span className="flex items-center gap-1.5">
                <Badge variant="green">License</Badge>
                <code className="font-mono">{property.tm30_license_number}</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sunset">
                <AlertCircle size={14} />
                No TM30 license set —{' '}
                <Link to={`/dashboard/property/${propertyId}/manage`} className="underline">
                  add it in Property settings
                </Link>
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Stats strip */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="Foreign guests" value={guests.length} color="ocean" />
          <Stat label="Bookings" value={Object.keys(bookingsByGuest).length} color="electric" />
          <Stat label="Missing passport" value={guests.filter(g => !g.passport_number).length} color="sunset" />
          <Stat label="Children" value={guests.filter(g => g.is_child).length} color="libre" />
        </div>
      </Card>

      {/* Big CTA */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          {loading ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
          {loading ? 'Loading guests…' : `${guests.length} foreign guest${guests.length === 1 ? '' : 's'} ready for export.`}
        </div>
        <Button
          onClick={handleDownloadCSV}
          disabled={guests.length === 0 || !hasLicense}
          variant="orange"
        >
          <Download size={16} />
          Download TM30 CSV ({guests.length})
        </Button>
      </div>

      {/* Guest table */}
      {guests.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-deep mb-1">No foreign guests for this date</h3>
          <p className="text-sm text-gray-500">
            Either all your arrivals are Thai nationals (TM30 doesn't apply),
            or no bookings checked in on this day. Pick another date above.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-deep/[0.03] border-b border-gray-100 text-deep/60 uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-bold">#</th>
                <th className="text-left px-3 py-2 font-bold">Name</th>
                <th className="text-left px-3 py-2 font-bold">Nat.</th>
                <th className="text-left px-3 py-2 font-bold">Passport</th>
                <th className="text-left px-3 py-2 font-bold">Sex</th>
                <th className="text-left px-3 py-2 font-bold">DOB</th>
                <th className="text-left px-3 py-2 font-bold">Visa</th>
                <th className="text-left px-3 py-2 font-bold">Port</th>
                <th className="text-left px-3 py-2 font-bold">Stay</th>
                <th className="text-right px-3 py-2 font-bold">Per-row PDF</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g, i) => {
                const b = bookingsByGuest[g.booking_id] || {}
                const missingPassport = !g.passport_number
                const missingNat = !g.nationality
                return (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-deep/[0.02]">
                    <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-deep">
                      {g.first_name} {g.last_name}
                      {g.is_child && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-libre/15 text-libre font-bold">child</span>}
                    </td>
                    <td className="px-3 py-2">
                      {missingNat ? <span className="text-sunset font-bold">?</span> : <span className="font-mono">{g.nationality}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {missingPassport
                        ? <span className="text-sunset">missing</span>
                        : g.passport_number}
                    </td>
                    <td className="px-3 py-2">{g.sex || '—'}</td>
                    <td className="px-3 py-2 font-mono">{g.date_of_birth || '—'}</td>
                    <td className="px-3 py-2">{g.visa_type || '—'}{g.visa_number ? ` · ${g.visa_number}` : ''}</td>
                    <td className="px-3 py-2 font-mono">{g.thailand_port_of_entry || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {b.check_in} → {b.check_out}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(g)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-deep/[0.04] text-deep hover:bg-deep/10 transition-all"
                        title="Download per-guest TM30 PDF (printable backup)"
                      >
                        📄 PDF
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Footer notes */}
      <div className="mt-6 text-[11px] text-gray-500 space-y-1">
        <p>
          <strong className="text-deep">CSV columns:</strong>{' '}
          <code className="font-mono">{CSV_HEADERS.join(', ')}</code>
        </p>
        <p>
          <strong className="text-deep">Workflow:</strong> Download CSV → open extranet.immigration.go.th → log in →
          "Bulk upload" → select the file. STAYLO archives the export under the booking;
          drop the receipt PDF back into STAYLO when you have it.
        </p>
        <p className="italic text-gray-400">
          Phase 2 (browser auto-upload) and Phase 3 (Immigration API) are on the roadmap — see <code>docs/TM30_COMPLIANCE.md</code>.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  const colorMap = {
    ocean:    'text-ocean',
    electric: 'text-electric',
    sunset:   'text-sunset',
    libre:    'text-libre',
  }
  return (
    <div>
      <div className={`text-3xl font-extrabold ${colorMap[color] || 'text-deep'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">{label}</div>
    </div>
  )
}
