// ============================================================================
// Annual pricing calendar — Google Sheets importer modal
// ============================================================================
// Two-step flow:
//   1. Paste the Google Sheets URL → fetch as CSV → parse → preview
//   2. Confirm → batch insert into public.rooms + public.room_availability
//
// The sheet must be shared "Anyone with the link → Viewer" (or Published to
// web). We compute the CSV export URL from the pasted share URL — no OAuth,
// no server-side proxy. Google serves the CSV with permissive CORS.
//
// Batching:
//   · rooms are inserted one row at a time so we can capture each returned
//     UUID and map it back to the sheet's room index (batch .insert() with
//     Supabase-js returns rows in the same order, but insert-and-select can
//     fail silently on RLS mismatch — safer to do one at a time and stop on
//     first failure).
//   · availability rows are chunked (1000/req) so Supabase's default
//     payload limit isn't a problem on a 6×365=2190 grid.
// ============================================================================
import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { parseAnnualCalendar, toGoogleSheetsCSVUrl } from '../../lib/gsheetsAnnualCalendarParser'

const AVAILABILITY_CHUNK = 1000

// Batch-insert helper — walks a big array in fixed-size chunks so a
// 2190-row grid doesn't hit request-size limits. Stops on first error.
async function insertInChunks(table, rows, chunkSize) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    const { error } = await supabase.from(table).insert(slice)
    if (error) throw new Error(`${table} insert failed at row ${i}: ${error.message}`)
  }
}

export default function AnnualCalendarImportModal({ propertyId, open, onClose, onImported }) {
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const csvUrl = useMemo(() => toGoogleSheetsCSVUrl(url), [url])

  if (!open) return null

  const handleFetch = async () => {
    setError('')
    setParsed(null)
    if (!csvUrl) {
      setError('URL Google Sheets non reconnue. Colle l\'URL complète de partage.')
      return
    }
    setFetching(true)
    try {
      const res = await fetch(csvUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status} — la feuille est-elle publique ?`)
      const text = await res.text()
      const result = parseAnnualCalendar(text, { defaultYear: new Date().getFullYear() })
      if (result.rooms.length === 0) {
        setError('Aucune chambre détectée. ' + (result.warnings[0] || ''))
        return
      }
      setParsed(result)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setFetching(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsed || !propertyId) return
    setImporting(true)
    setError('')
    try {
      // 1. Insert each room, capture its new UUID keyed by the sheet index.
      const idByIndex = new Map()
      for (const r of parsed.rooms) {
        const { data, error: insErr } = await supabase.from('rooms').insert({
          property_id: propertyId,
          name: r.name,
          base_price: r.refPrice ?? 0,
          type: 'standard',
          max_guests: 2,
          quantity: 1,
          is_active: true,
        }).select('id').single()
        if (insErr) throw new Error(`Room "${r.name}" insert failed: ${insErr.message}`)
        idByIndex.set(r.index, data.id)
      }

      // 2. Map every parsed pricing row to a room_availability payload.
      const availabilityRows = parsed.pricing.map(p => ({
        room_id: idByIndex.get(p.roomIndex),
        date: p.date,
        available_count: p.isBlocked ? 0 : 1,
        price_override: p.price,
        is_blocked: p.isBlocked,
        season_code: p.seasonCode,
        is_full_moon: p.isFullMoon,
      })).filter(r => r.room_id)

      // 3. Chunked insert to stay well under any per-request payload cap.
      await insertInChunks('room_availability', availabilityRows, AVAILABILITY_CHUNK)

      onImported?.({ rooms: parsed.rooms.length, availability: availabilityRows.length })
      onClose?.()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setImporting(false)
    }
  }

  const stats = parsed && {
    roomsCount: parsed.rooms.length,
    daysCount: parsed.dateColumns.length,
    pricedCells: parsed.pricing.filter(p => !p.isBlocked).length,
    blockedCells: parsed.pricing.filter(p => p.isBlocked).length,
    fullMoonDays: parsed.dateColumns.filter(d => d.isFullMoon).length,
    seasons: [...new Set(parsed.dateColumns.map(d => d.seasonCode).filter(Boolean))],
    minPrice: Math.min(...parsed.pricing.filter(p => p.price != null).map(p => p.price)),
    maxPrice: Math.max(...parsed.pricing.filter(p => p.price != null).map(p => p.price)),
  }

  return (
    <div style={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose?.() }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📥 Import du calendrier annuel</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={importing} aria-label="Close">×</button>
        </div>

        {!parsed ? (
          <>
            <p style={styles.help}>
              Dans Google Sheets → <strong>Fichier → Partager → Publier sur le web</strong> (ou "Anyone with the link → Viewer"),
              puis colle l'URL de la feuille ici. Format attendu : lignes = chambres, colonnes = jours de l'année,
              cellules = prix en THB.
            </p>
            <label style={styles.label}>URL Google Sheets</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              style={styles.input}
              disabled={fetching}
            />
            {csvUrl && (
              <div style={styles.hint}>✓ URL reconnue. Endpoint CSV : <code style={styles.code}>{csvUrl}</code></div>
            )}
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.actions}>
              <button style={styles.btnGhost} onClick={onClose} disabled={fetching}>Annuler</button>
              <button style={styles.btnPrimary} onClick={handleFetch} disabled={fetching || !csvUrl}>
                {fetching ? '⏳ Chargement…' : 'Charger & prévisualiser →'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.previewGrid}>
              <StatCard label="Chambres" value={stats.roomsCount} />
              <StatCard label="Jours" value={stats.daysCount} />
              <StatCard label="Prix définis" value={stats.pricedCells.toLocaleString('fr-FR')} />
              <StatCard label="Nuits bloquées" value={stats.blockedCells.toLocaleString('fr-FR')} />
              <StatCard label="Full-moon nights" value={stats.fullMoonDays} />
              <StatCard label="Saisons" value={stats.seasons.join(' · ') || '—'} />
              <StatCard label="Prix min" value={Number.isFinite(stats.minPrice) ? stats.minPrice.toLocaleString('fr-FR') + ' THB' : '—'} />
              <StatCard label="Prix max" value={Number.isFinite(stats.maxPrice) ? stats.maxPrice.toLocaleString('fr-FR') + ' THB' : '—'} />
            </div>

            <h3 style={styles.subheading}>Chambres détectées</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Nom</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Prix réf.</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rooms.map(r => (
                  <tr key={r.index}>
                    <td style={styles.td}>{r.sourceIndex}</td>
                    <td style={styles.td}><strong>{r.name}</strong></td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                      {r.refPrice != null ? r.refPrice.toLocaleString('fr-FR') + ' THB' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {parsed.warnings.length > 0 && (
              <div style={styles.warn}>
                <strong>Avertissements :</strong>
                <ul style={{ margin: '4px 0 0 20px' }}>
                  {parsed.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                  {parsed.warnings.length > 5 && <li>… et {parsed.warnings.length - 5} autres</li>}
                </ul>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.actions}>
              <button style={styles.btnGhost} onClick={() => setParsed(null)} disabled={importing}>← Retour</button>
              <button style={styles.btnPrimary} onClick={handleConfirm} disabled={importing}>
                {importing ? '⏳ Import en cours…' : `Importer ${stats.roomsCount} chambres + ${stats.pricedCells.toLocaleString('fr-FR')} prix`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLbl}>{label}</div>
      <div style={styles.statVal}>{value}</div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(20,20,30,.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9500,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: 24, maxWidth: 720, width: '100%',
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
    fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:  { margin: 0, fontSize: 20, fontWeight: 800, color: '#1A1F2E' },
  closeBtn: {
    background: 'transparent', border: 0, fontSize: 28, cursor: 'pointer', color: '#636E72',
    lineHeight: 1, padding: '0 6px',
  },
  help:  { color: '#636E72', fontSize: 13, lineHeight: 1.6, margin: '4px 0 16px' },
  label: { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: .5, color: '#636E72', textTransform: 'uppercase', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '2px solid #E8E0D8',
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  },
  hint: { marginTop: 8, fontSize: 11, color: '#059669' },
  code: { background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontSize: 10, wordBreak: 'break-all' },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  btnGhost: {
    background: '#F7F5F0', color: '#1A1F2E', border: 0, padding: '10px 18px',
    borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg,#FF6B00,#FF1F70)', color: '#fff', border: 0,
    padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 13,
    boxShadow: '0 4px 12px rgba(255,31,112,.3)',
  },
  error: {
    background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C',
    padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 12,
  },
  warn: {
    background: '#FFFBEB', border: '1px solid #FCD34D', color: '#B45309',
    padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 12,
  },
  previewGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0 20px',
  },
  statCard: { background: '#FAFAF7', border: '1px solid #E8E0D8', borderRadius: 8, padding: '10px 12px' },
  statLbl: { fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#636E72' },
  statVal: { fontSize: 16, fontWeight: 900, color: '#1A1F2E', marginTop: 2 },
  subheading: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, color: '#7E22CE', margin: '16px 0 8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 10px', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, color: '#636E72' },
  td: { padding: '8px 10px', borderBottom: '1px solid #F3F4F6' },
}
