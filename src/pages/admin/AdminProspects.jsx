// ============================================================================
// AdminProspects — outreach CRM dashboard
// ============================================================================
// Lists every row in public.prospects (admin-only via RLS). Lets the operator:
//   - Filter by status / province / category / has-email
//   - Search by name
//   - Open a prospect → see full details, change status, add notes
//   - Quick "send email" via mailto: with a pre-filled outreach template
//   - See conversion attribution (which signed-up users came from outreach)
//
// Data is upserted by `python staylo_ingest_prospects.py` from the OSM/TAT
// collector JSON. The CRM state columns (status, notes, contacted_at) are
// preserved across re-imports.
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import {
  Mail, Phone, Globe, MapPin, ExternalLink, Save, Loader2,
  CheckCircle2, XCircle, Clock, MessageSquare, Sparkles, AlertTriangle,
  TrendingUp, Send,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DataTable } from '../../components/admin/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

const STATUS_CONFIG = {
  new:            { variant: 'gray',   label: 'New',            icon: Sparkles },
  contacted:      { variant: 'blue',   label: 'Contacted',      icon: Send },
  replied:        { variant: 'orange', label: 'Replied',        icon: MessageSquare },
  meeting_set:    { variant: 'electric', label: 'Meeting set',  icon: Clock },
  signed_up:      { variant: 'green',  label: 'Signed up',      icon: CheckCircle2 },
  not_interested: { variant: 'gray',   label: 'Not interested', icon: XCircle },
  unreachable:    { variant: 'gray',   label: 'Unreachable',    icon: AlertTriangle },
  blacklisted:    { variant: 'sunset', label: 'Blacklisted',    icon: XCircle },
}

const STATUS_KEYS = Object.keys(STATUS_CONFIG)

const EMAIL_TEMPLATE = (p) => {
  const name = p.name_en || p.name_th || 'team'
  const area = [p.district, p.province].filter(Boolean).join(', ') || 'your area'
  const subject = `10% commission for life — STAYLO is hotelier-owned`
  const body =
`Hi ${name},

I'm David, founder of STAYLO — a small hotelier-owned booking platform.

We charge 10% commission instead of the 18-25% Booking and Agoda take, and that 10% is locked for life for the first hoteliers who join.

We're focusing on ${area} first, and I'd love to have ${name} on board for the launch.

Signup: https://staylo.app/register?utm_source=outreach&utm_campaign=cold

No tricks: you keep your existing channels, we just give you another one with much lower fees.

— David
david.dancingelephant@gmail.com
https://staylo.app`
  return { subject, body }
}

function buildMailto(p) {
  if (!p.email) return null
  const { subject, body } = EMAIL_TEMPLATE(p)
  return `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function AdminProspects() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProvince, setFilterProvince] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [emailOnly, setEmailOnly] = useState(false)

  async function load() {
    setLoading(true)
    // Cap at 5,000 to keep the table responsive — admins can filter to find more.
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(5000)
    if (error) {
      console.error('Failed to load prospects:', error)
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Derive filter dropdown options from the data we actually have
  const provinces = useMemo(() => {
    const set = new Set(rows.map(r => r.province).filter(Boolean))
    return Array.from(set).sort()
  }, [rows])

  const categories = useMemo(() => {
    const set = new Set(rows.map(r => r.category).filter(Boolean))
    return Array.from(set).sort()
  }, [rows])

  // Apply filters
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus   !== 'all' && r.status   !== filterStatus)   return false
      if (filterProvince !== 'all' && r.province !== filterProvince) return false
      if (filterCategory !== 'all' && r.category !== filterCategory) return false
      if (emailOnly && !r.email) return false
      return true
    })
  }, [rows, filterStatus, filterProvince, filterCategory, emailOnly])

  // KPI tiles
  const stats = useMemo(() => {
    const s = { total: rows.length }
    for (const k of STATUS_KEYS) s[k] = 0
    s.with_email = 0
    for (const r of rows) {
      if (s[r.status] != null) s[r.status]++
      if (r.email) s.with_email++
    }
    s.conversion = s.total ? ((s.signed_up / s.total) * 100).toFixed(1) : '0.0'
    return s
  }, [rows])

  const columns = [
    {
      key: 'name_en',
      label: 'Name',
      render: (_, row) => (
        <div className="min-w-0">
          <div className="font-medium text-deep truncate">{row.name_en || row.name_th || <span className="text-gray-300 italic">unnamed</span>}</div>
          {row.name_th && row.name_en && (
            <div className="text-[11px] text-gray-400 truncate">{row.name_th}</div>
          )}
        </div>
      ),
    },
    { key: 'category', label: 'Type', render: v => v ? <Badge variant="blue">{v}</Badge> : <span className="text-gray-300">—</span> },
    {
      key: 'province',
      label: 'Location',
      render: (_, row) => (
        <span className="text-xs text-gray-500">
          {[row.district, row.province].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      render: (_, row) => (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {row.email && <Mail size={12} className="text-libre" />}
          {row.phone && <Phone size={12} className="text-ocean" />}
          {row.website && <Globe size={12} className="text-electric" />}
          {!row.email && !row.phone && !row.website && <span className="text-gray-300">—</span>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: v => {
        const cfg = STATUS_CONFIG[v] || STATUS_CONFIG.new
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep">Prospects</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Loading…' : `${stats.total.toLocaleString()} hoteliers in the outreach pipeline`}
          </p>
        </div>
        <Button onClick={load} variant="secondary" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : null} Refresh
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiTile label="Total"       value={stats.total}       icon={Sparkles}       tone="gray" />
        <KpiTile label="With email"  value={stats.with_email}  icon={Mail}           tone="blue" />
        <KpiTile label="Contacted"   value={stats.contacted}   icon={Send}           tone="orange" />
        <KpiTile label="Signed up"   value={stats.signed_up}   icon={CheckCircle2}   tone="green" />
        <KpiTile label="Conversion"  value={`${stats.conversion}%`} icon={TrendingUp} tone="electric" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-3 flex items-center gap-2 flex-wrap text-sm">
        <FilterSelect label="Status"    value={filterStatus}   onChange={setFilterStatus}
          options={[{ value: 'all', label: `All (${stats.total})` },
            ...STATUS_KEYS.map(k => ({ value: k, label: `${STATUS_CONFIG[k].label} (${stats[k]})` }))]} />
        <FilterSelect label="Province"  value={filterProvince} onChange={setFilterProvince}
          options={[{ value: 'all', label: `All` }, ...provinces.map(p => ({ value: p, label: p }))]} />
        <FilterSelect label="Type"      value={filterCategory} onChange={setFilterCategory}
          options={[{ value: 'all', label: `All` }, ...categories.map(c => ({ value: c, label: c }))]} />
        <label className="ml-auto flex items-center gap-2 text-gray-500 cursor-pointer">
          <input type="checkbox" checked={emailOnly} onChange={e => setEmailOnly(e.target.checked)} />
          With email only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={setSelected}
        searchPlaceholder="Search by name, area, email…"
        pageSize={20}
      />

      <ProspectModal
        prospect={selected}
        onClose={() => setSelected(null)}
        onSaved={updated => {
          setRows(rs => rs.map(r => r.id === updated.id ? updated : r))
          setSelected(updated)
        }}
      />
    </div>
  )
}

function KpiTile({ label, value, icon: Icon, tone }) {
  const toneClasses = {
    gray:     'bg-gray-100 text-gray-600',
    blue:     'bg-ocean/10 text-ocean',
    orange:   'bg-sunset/10 text-sunset',
    green:    'bg-libre/10 text-libre',
    electric: 'bg-electric/10 text-electric',
  }[tone] || 'bg-gray-100 text-gray-600'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClasses}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold text-deep">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-gray-500">
      <span className="text-xs uppercase tracking-wider">{label}</span>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 max-w-[200px]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function ProspectModal({ prospect, onClose, onSaved }) {
  const [status, setStatus]       = useState('new')
  const [notes, setNotes]         = useState('')
  const [followUp, setFollowUp]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!prospect) return
    setStatus(prospect.status || 'new')
    setNotes(prospect.notes || '')
    setFollowUp(prospect.next_follow_up || '')
    setError('')
  }, [prospect])

  if (!prospect) return null

  const mailto = buildMailto(prospect)
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new

  async function handleSave() {
    setSaving(true)
    setError('')
    const wasContacted = prospect.status !== 'contacted' && status === 'contacted'
    const payload = {
      status,
      notes: notes.trim() || null,
      next_follow_up: followUp || null,
      ...(wasContacted ? {
        contacted_at: new Date().toISOString(),
        contact_count: (prospect.contact_count || 0) + 1,
      } : {}),
    }
    const { data, error } = await supabase
      .from('prospects').update(payload).eq('id', prospect.id).select().single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved(data)
  }

  function markContactedAndOpenMail() {
    if (!mailto) return
    // Open mailto first (so popup blocker doesn't fire on the post-await tick)
    window.location.href = mailto
    // Then update CRM state
    setStatus('contacted')
    setTimeout(handleSave, 100)
  }

  const mapsUrl = (prospect.latitude && prospect.longitude)
    ? `https://www.google.com/maps?q=${prospect.latitude},${prospect.longitude}`
    : null

  return (
    <Modal open={!!prospect} onClose={onClose} title="Prospect">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-deep">
            {prospect.name_en || prospect.name_th || <span className="italic text-gray-400">unnamed</span>}
          </h2>
          {prospect.name_th && prospect.name_en && (
            <p className="text-sm text-gray-500 mt-0.5">{prospect.name_th}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            {prospect.category && <Badge variant="blue">{prospect.category}</Badge>}
            {prospect.source && <span className="text-[10px] uppercase tracking-wider text-gray-400">via {prospect.source}</span>}
          </div>
        </div>

        {/* Contact + location grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-ocean hover:underline">
              <Mail size={14} /> {prospect.email}
            </a>
          )}
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-libre hover:underline">
              <Phone size={14} /> {prospect.phone}
            </a>
          )}
          {prospect.website && (
            <a href={prospect.website} target="_blank" rel="noopener" className="flex items-center gap-2 text-electric hover:underline truncate">
              <Globe size={14} /> <span className="truncate">{prospect.website}</span> <ExternalLink size={11} />
            </a>
          )}
          {(prospect.district || prospect.province) && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={14} /> {[prospect.district, prospect.province].filter(Boolean).join(', ')}
            </div>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-gray-500 hover:text-ocean text-xs col-span-full">
              📍 View on Google Maps <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Quick action: mailto with pre-filled template */}
        {mailto && (
          <div className="p-3 bg-libre/5 border border-libre/15 rounded-xl">
            <p className="text-xs text-gray-500 mb-2">
              Opens YOUR mail client with the standard outreach pitch pre-filled, then auto-marks as contacted.
            </p>
            <Button onClick={markContactedAndOpenMail}>
              <Send size={14} /> Send invite & mark contacted
            </Button>
          </div>
        )}

        {/* CRM state */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status} onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            {STATUS_KEYS.map(k => (
              <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Notes <span className="text-gray-300 font-normal normal-case">(only admins see this)</span>
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Replied via WhatsApp 2026-05-02 — interested but wants to see commission breakdown…"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Next follow-up</label>
          <input
            type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          />
        </div>

        {/* Conversion attribution */}
        {prospect.converted_user_id && (
          <div className="p-3 bg-libre/10 border border-libre/30 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-libre font-medium">
              <CheckCircle2 size={16} /> Converted to STAYLO user
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Signed up {prospect.converted_at ? new Date(prospect.converted_at).toLocaleDateString() : ''}
              {' '}— user id <code className="bg-white px-1 rounded">{prospect.converted_user_id.slice(0, 8)}…</code>
            </div>
          </div>
        )}

        {/* Audit trail (compact) */}
        <div className="text-xs text-gray-400 space-y-0.5">
          <div>Imported {new Date(prospect.imported_at).toLocaleString()}</div>
          {prospect.contacted_at && <div>Last contacted {new Date(prospect.contacted_at).toLocaleString()} ({prospect.contact_count}×)</div>}
          <div>Source id: <code className="bg-gray-100 px-1 rounded">{prospect.source_place_id}</code></div>
        </div>

        {error && (
          <div className="p-3 bg-sunset/10 border border-sunset/30 rounded-xl text-sm text-sunset">
            {error}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
