// ============================================================================
// tm30Workbook.js: writes the Immigration TM30 import file (.xls, BIFF8)
// ============================================================================
// Same file type as the official Template-InformAccom-ImportExcel.xls: one
// sheet, header row from tm30Template.js, one row per guest, all cells as
// text so passport numbers and dates reach the portal untouched.
// SheetJS is loaded on demand: only the TM30 page pays for it.
// ============================================================================
import { tm30SheetData, chunkTm30Rows, tm30FileName } from './tm30Excel.js'

const SHEET_NAME = 'Inform Accom'

/** rows: output of buildTm30Rows. Returns the .xls bytes (Uint8Array). */
export async function buildTm30XlsBytes(rows) {
  const XLSX = await import('xlsx')
  const data = tm30SheetData(rows)
  const ws = XLSX.utils.aoa_to_sheet(data)
  // Force text cells: a passport like "0012345" or a date must not become a number.
  for (const addr of Object.keys(ws)) {
    if (addr[0] === '!') continue
    ws[addr].t = 's'
    ws[addr].v = String(ws[addr].v ?? '')
  }
  ws['!cols'] = [18, 14, 18, 8, 18, 12, 14, 14, 16].map(wch => ({ wch }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
  const out = XLSX.write(wb, { bookType: 'biff8', type: 'array' })
  return new Uint8Array(out)
}

/** One download per 1,000 rows, as the portal limit requires. */
export async function downloadTm30Files(rows, propertyName, isoDate) {
  const chunks = chunkTm30Rows(rows)
  for (let i = 0; i < chunks.length; i++) {
    const bytes = await buildTm30XlsBytes(chunks[i])
    const blob = new Blob([bytes], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = tm30FileName(propertyName, isoDate, i + 1, chunks.length)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return chunks.length
}
