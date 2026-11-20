// The .xls STAYLO writes must read back as the official template does:
// same file type, same nine headers on the first sheet, one row per guest,
// every cell text. Reads the archived template with the same library.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTm30XlsBytes } from '../../src/lib/tm30Workbook.js'
import { buildTm30Rows, TM30_HEADERS } from '../../src/lib/tm30Excel.js'

const XLSX = await import('xlsx')
const template = XLSX.read(readFileSync(new URL('../fixtures/tm30-template-2023-09.xls', import.meta.url)), { type: 'buffer' })

const guests = [
  { id: 1, booking_id: 'b1', first_name: 'Anna', last_name: 'Lee', sex: 'F', passport_number: 'L39828919', nationality: 'US', date_of_birth: '1975-10-30' },
  { id: 2, booking_id: 'b1', first_name: 'Siji', last_name: 'Liu', sex: 'F', passport_number: '0059422550', nationality: 'CN', date_of_birth: null },
]
const bookings = { b1: { check_out: '2023-06-14', guest_phone: '+66 81 234 5678' } }

test('our headers are exactly the first row of the official template, first sheet', () => {
  const first = template.Sheets[template.SheetNames[0]]
  const row = XLSX.utils.sheet_to_json(first, { header: 1, raw: false })[0]
  assert.deepEqual(row.map(h => String(h).trim()), TM30_HEADERS.map(h => h.trim()))
})

test('the written file is a BIFF .xls whose first sheet holds the headers then the guests, all text', async () => {
  const rows = buildTm30Rows(guests, bookings)
  const bytes = await buildTm30XlsBytes(rows)
  // OLE2 compound document signature, as the template
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0xd0, 0xcf, 0x11, 0xe0])
  const wb = XLSX.read(bytes, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
  assert.deepEqual(grid[0].map(h => String(h).trim()), TM30_HEADERS.map(h => h.trim()))
  assert.deepEqual(grid[1], ['Anna', '', 'Lee', 'F', 'L39828919', 'USA', '30/10/1975', '14/06/2023', '+66812345678'])
  assert.deepEqual(grid[2], ['Siji', '', 'Liu', 'F', '0059422550', 'CHN', '', '14/06/2023', '+66812345678'])
  assert.equal(grid.length, 3)
  // a passport with leading zeros survives as text
  assert.equal(ws.E3.t, 's')
  assert.equal(ws.E3.v, '0059422550')
})
