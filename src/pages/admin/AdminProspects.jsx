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
  // Greeting: prefer the human contact name if known, else fall back to hotel name
  const greetName = p.contact_name || p.name_en || p.name_th || 'team'
  const hotelName = p.name_en || p.name_th || 'your property'
  const area = [p.district, p.province].filter(Boolean).join(', ') || 'your area'
  const subject = `10% commission for life — STAYLO is hotelier-owned`
  const body =
`Hi ${greetName},

I'm David, founder of STAYLO — a small hotelier-owned booking platform.

We charge 10% commission instead of the 18-25% Booking and Agoda take, and that 10% is locked for life for the first hoteliers who join.

We're focusing on ${area} first, and I'd love to have ${hotelName} on board for the launch.

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
  // CRM state
  const [status, setStatus]     = useState('new')
  const [notes, setNotes]       = useState('')
  const [followUp, setFollowUp] = useState('')
  // Editable contact fields — manually enriched during outreach research
  const [email, setEmail]                   = useState('')
  const [phone, setPhone]                   = useState('')
  const [website, setWebsite]               = useState('')
  const [contactName, setContactName]       = useState('')
  const [contactPosition, setContactPosition] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  // Branded-email-via-Resend state (separate from form save)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentInfo, setEmailSentInfo] = useState(null)
  const [emailError, setEmailError]       = useState('')

  useEffect(() => {
    if (!prospect) return
    setStatus(prospect.status || 'new')
    setNotes(prospect.notes || '')
    setFollowUp(prospect.next_follow_up || '')
    setEmail(prospect.email || '')
    setPhone(prospect.phone || '')
    setWebsite(prospect.website || '')
    setContactName(prospect.contact_name || '')
    setContactPosition(prospect.contact_position || '')
    setError('')
    setEmailSentInfo(null)
    setEmailError('')
  }, [prospect])

  if (!prospect) return null

  // Build mailto from the CURRENT (possibly edited) email — so right after the
  // admin types one in, "Send invite" works without needing to save first.
  const mailto = email && email.includes('@')
    ? buildMailto({ ...prospect, email, name_en: prospect.name_en, contact_name: contactName })
    : null
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new

  async function handleSave() {
    setSaving(true)
    setError('')
    const wasContacted = prospect.status !== 'contacted' && status === 'contacted'
    // Detect if any contact field was manually changed → bump manually_enriched_at
    const enriched =
      (email.trim()           || null) !== (prospect.email            || null) ||
      (phone.trim()           || null) !== (prospect.phone            || null) ||
      (website.trim()         || null) !== (prospect.website          || null) ||
      (contactName.trim()     || null) !== (prospect.contact_name     || null) ||
      (contactPosition.trim() || null) !== (prospect.contact_position || null)

    const payload = {
      status,
      notes: notes.trim() || null,
      next_follow_up: followUp || null,
      email:            email.trim()            || null,
      phone:            phone.trim()            || null,
      website:          website.trim()          || null,
      contact_name:     contactName.trim()      || null,
      contact_position: contactPosition.trim()  || null,
      ...(wasContacted ? {
        contacted_at: new Date().toISOString(),
        contact_count: (prospect.contact_count || 0) + 1,
      } : {}),
      ...(enriched && !prospect.manually_enriched_at ? {
        manually_enriched_at: new Date().toISOString(),
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

  // Send the branded HTML email via the send-prospect-invite edge function.
  // The function itself updates status='contacted' + bumps contact_count,
  // so we just need to refresh the row afterward.
  async function sendBrandedEmail() {
    setEmailError('')
    setEmailSentInfo(null)
    if (!email || !email.includes('@')) {
      setEmailError('Fill in a valid email first, then save.')
      return
    }
    // Persist the contact-info edits before sending — the edge function reads
    // from the DB row, so unsaved field changes wouldn't make it into the email.
    if (
      email.trim()        !== (prospect.email        || '') ||
      contactName.trim()  !== (prospect.contact_name || '')
    ) {
      await handleSave()
    }
    setSendingEmail(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-prospect-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prospect_id: prospect.id }),
        },
      )
      const json = await resp.json()
      if (!resp.ok) {
        setEmailError(json.error || `HTTP ${resp.status}`)
        return
      }
      setEmailSentInfo(json)
      // Refresh the prospect row to pull the new contacted_at / status
      const { data: refreshed } = await supabase
        .from('prospects').select('*').eq('id', prospect.id).single()
      if (refreshed) {
        setStatus(refreshed.status)
        onSaved(refreshed)
      }
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setSendingEmail(false)
    }
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
            {prospect.manually_enriched_at && (
              <span className="text-[10px] uppercase tracking-wider text-libre font-bold">researched ✓</span>
            )}
          </div>
        </div>

        {/* Location (read-only — comes from import) */}
        {(prospect.district || prospect.province || mapsUrl) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={14} />
            <span>{[prospect.district, prospect.province].filter(Boolean).join(', ') || '—'}</span>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener"
                className="ml-auto text-xs text-ocean hover:underline inline-flex items-center gap-1 no-underline">
                Maps <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────
            EDITABLE CONTACT FIELDS — fill these in as you research the
            prospect (Google reviews, hotel website, walk-in visit, etc.).
            ────────────────────────────────────────────────────────────── */}
        <div className="bg-cream/40 -mx-1 px-3 py-3 rounded-xl border border-cream">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Contact info <span className="font-normal normal-case text-gray-300">— fill in as you research</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProspectField label="Email" icon={Mail}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="manager@hotel.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </ProspectField>
            <ProspectField label="Phone / WhatsApp" icon={Phone}>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+66 …"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </ProspectField>
            <ProspectField label="Website" icon={Globe}>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </ProspectField>
            <ProspectField label="Contact name">
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="Khun Som / Marie Dupont"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </ProspectField>
            <ProspectField label="Contact position">
              <input type="text" value={contactPosition} onChange={e => setContactPosition(e.target.value)}
                placeholder="Owner / GM / Front desk / Marketing"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-deep text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30" />
            </ProspectField>
          </div>
        </div>

        {/* Outreach actions — primary path = branded HTML via Resend, fallback = mailto */}
        {email && email.includes('@') && (
          <div className="p-3 bg-gradient-to-r from-libre/10 to-electric/5 border border-libre/20 rounded-xl space-y-3">
            {/* Primary: branded HTML email via edge function */}
            <div>
              <p className="text-xs text-gray-600 mb-2">
                <strong className="text-deep">Send a branded HTML invitation</strong>
                {contactName ? ` to ${contactName}` : ''} from <code className="text-[10px] bg-white px-1 rounded">invites@staylo.app</code>
                — replies land in your personal inbox.
              </p>
              <Button onClick={sendBrandedEmail} disabled={sendingEmail}>
                {sendingEmail
                  ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : <><Send size={14} /> Send STAYLO email & mark contacted</>}
              </Button>
              {emailSentInfo && (
                <p className="text-xs text-libre mt-2 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Sent to {emailSentInfo.sent_to}
                  {emailSentInfo.warning ? ` — ${emailSentInfo.warning}` : ''}
                </p>
              )}
              {emailError && (
                <p className="text-xs text-sunset mt-2">{emailError}</p>
              )}
            </div>

            {/* Fallback: open in mail client (when you want to personalise) */}
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                Or open in my own mail client (plain text, customisable)
              </summary>
              <p className="mt-2 text-gray-500 mb-2">
                Opens YOUR Gmail/Outlook so you can edit before sending. Doesn't auto-mark contacted.
              </p>
              <button onClick={markContactedAndOpenMail}
                className="text-xs text-ocean hover:text-electric font-medium underline">
                Open in mail client →
              </button>
            </details>
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

// Small labelled-field helper used throughout the prospect modal.
function ProspectField({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
        {Icon ? <Icon size={11} className="text-gray-400" /> : null}
        {label}
      </span>
      {children}
    </label>
  )
}
