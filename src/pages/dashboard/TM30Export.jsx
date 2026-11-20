// ============================================================================
// Dashboard: TM30 export (Phase 1 of docs/TM30_COMPLIANCE.md)
// ============================================================================
// The hotelier downloads the Immigration import file and uploads it on
// https://extranet.immigration.go.th. The file is the official template
// (Template-InformAccom-ImportExcel.xls): one sheet, nine columns, at most
// 1,000 guests per file. Column rules and nationality codes live in
// src/lib/tm30Template.js; the rows are built by src/lib/tm30Excel.js and
// written by src/lib/tm30Workbook.js.
//
//   URL:  /dashboard/property/:id/tm30
//   View: pick a date -> foreign guests who checked in that day -> the
//         guests Immigration would reject are listed with what is missing ->
//         "Download" writes the .xls with the complete guests.
//         A per-guest PDF (printable archive) stays available on each row.
//
// Thai nationals are out of scope (no notification required). Guests with
// no nationality are shown with what is missing so the desk can fix them.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Calendar, AlertCircle, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { downloadTM30 } from '../../lib/tm30'
import { buildTm30Rows, tm30Date, TM30_MAX_ROWS } from '../../lib/tm30Excel'
import { downloadTm30Files } from '../../lib/tm30Workbook'

const ISSUE_LABELS = {
  first_name:  'first name',
  gender:      'sex (M or F)',
  passport:    'passport number',
  nationality: 'nationality',
}

function isoToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TM30Export() {
  const { id: propertyId } = useParams()
  const [property, setProperty] = useState(null)
  const [date, setDate] = useState(isoToday())
  const [guests, setGuests] = useState([])
  const [bookingsByGuest, setBookingsByGuest] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadNote, setDownloadNote] = useState('')

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

  // Load the guests of the bookings that checked in on the chosen date.
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
        .select('id, booking_id, first_name, last_name, sex, nationality, passport_number, date_of_birth, travel_doc_type, is_child')
        .in('booking_id', bookingIds)
      if (cancelled) return
      setGuests(guestRows || [])
      setBookingsByGuest(map)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [propertyId, date])

  const hasLicense = !!property?.tm30_license_number

  // Rows as Immigration will read them. Thai nationals are left out here.
  const rows = useMemo(() => buildTm30Rows(guests, bookingsByGuest), [guests, bookingsByGuest])
  const readyRows = rows.filter(r => r.issues.length === 0)
  const toFix = rows.filter(r => r.issues.length > 0)

  async function handleDownload() {
    if (readyRows.length === 0 || downloading) return
    setDownloading(true)
    setDownloadNote('')
    try {
      const files = await downloadTm30Files(readyRows, property?.name, date)
      const skipped = toFix.length ? `, ${toFix.length} guest${toFix.length === 1 ? '' : 's'} left out until fixed` : ''
      setDownloadNote(`${readyRows.length} guest${readyRows.length === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'}${skipped}.`)
    } catch (err) {
      setDownloadNote(`Could not build the file: ${err?.message || err}`)
    } finally {
      setDownloading(false)
    }
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
            {property?.name || '...'} · Download the Immigration Excel file, upload it at{' '}
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
                No TM30 license set:{' '}
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
          <Stat label="Foreign guests" value={rows.length} color="ocean" />
          <Stat label="Ready to upload" value={readyRows.length} color="libre" />
          <Stat label="To fix first" value={toFix.length} color="sunset" />
          <Stat label="Children" value={rows.filter(r => r.guest.is_child).length} color="electric" />
        </div>
      </Card>

      {/* Big CTA */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          {loading ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
          {loading
            ? 'Loading guests...'
            : downloadNote || `${readyRows.length} guest${readyRows.length === 1 ? '' : 's'} ready, ${toFix.length} to fix.`}
        </div>
        <Button
          onClick={handleDownload}
          disabled={readyRows.length === 0 || downloading}
          variant="orange"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download Immigration file ({readyRows.length})
        </Button>
      </div>

      {/* Guest table */}
      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-deep mb-1">No foreign guests for this date</h3>
          <p className="text-sm text-gray-500">
            Either all your arrivals are Thai nationals (TM30 does not apply),
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
                <th className="text-left px-3 py-2 font-bold">Sex</th>
                <th className="text-left px-3 py-2 font-bold">Passport</th>
                <th className="text-left px-3 py-2 font-bold">Nationality</th>
                <th className="text-left px-3 py-2 font-bold">Birth date</th>
                <th className="text-left px-3 py-2 font-bold">Check-out</th>
                <th className="text-left px-3 py-2 font-bold">Phone</th>
                <th className="text-left px-3 py-2 font-bold">Status</th>
                <th className="text-right px-3 py-2 font-bold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const g = r.guest
                const [first, , last, sex, passport, nat, dob, checkOut, phone] = r.cells
                const miss = key => r.issues.includes(key)
                const cell = (value, missing) => missing
                  ? <span className="text-sunset font-bold">missing</span>
                  : (value || <span className="text-gray-300">...</span>)
                return (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-deep/[0.02]">
                    <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-deep">
                      {cell(`${first} ${last}`.trim(), miss('first_name'))}
                      {g.is_child && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-libre/15 text-libre font-bold">child</span>}
                    </td>
                    <td className="px-3 py-2">{cell(sex, miss('gender'))}</td>
                    <td className="px-3 py-2 font-mono">{cell(passport, miss('passport'))}</td>
                    <td className="px-3 py-2 font-mono">{cell(nat, miss('nationality'))}{miss('nationality') && g.nationality ? <span className="ml-1 text-gray-400">({g.nationality})</span> : null}</td>
                    <td className="px-3 py-2 font-mono">{dob || <span className="text-gray-300">...</span>}</td>
                    <td className="px-3 py-2 font-mono">{checkOut || tm30Date(bookingsByGuest[g.booking_id]?.check_out) || '...'}</td>
                    <td className="px-3 py-2 font-mono">{phone || <span className="text-gray-300">...</span>}</td>
                    <td className="px-3 py-2">
                      {r.issues.length === 0
                        ? <span className="inline-flex items-center gap-1 text-libre font-bold"><CheckCircle2 size={12} /> ready</span>
                        : <span className="text-sunset">needs {r.issues.map(k => ISSUE_LABELS[k] || k).join(', ')}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(g)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-deep/[0.04] text-deep hover:bg-deep/10 transition-all"
                        title="Download per-guest TM30 PDF (printable backup)"
                      >
                        PDF
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
          <strong className="text-deep">File:</strong> the official Immigration template (Template-InformAccom-ImportExcel.xls),
          columns First Name, Middle Name, Last Name, Gender, Passport No., Nationality, Birth Date, Check-out Date, Phone No.
          Dates as DD/MM/YYYY, nationality as the Immigration three-letter code, at most {TM30_MAX_ROWS.toLocaleString()} guests per file
          (more arrivals give several files).
        </p>
        <p>
          <strong className="text-deep">Workflow:</strong> fix the guests marked "needs ...", download, open extranet.immigration.go.th,
          log in, choose the Excel import and select the file. Keep the receipt with the booking.
        </p>
        <p className="italic text-gray-400">
          Phase 2 (browser auto-upload) and Phase 3 (Immigration API) are on the roadmap, see <code>docs/TM30_COMPLIANCE.md</code>.
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
