// TM30 Immigration import file: the row builder (src/lib/tm30Excel.js) against
// the rules printed on the official template (tests/fixtures/tm30-template-2023-09.xls).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TM30_HEADERS, TM30_MAX_ROWS, tm30Date, tm30Nationality, isThaiNational, tm30Gender, tm30Phone,
  tm30Row, buildTm30Rows, chunkTm30Rows, tm30SheetData, tm30FileName,
} from '../../src/lib/tm30Excel.js'
import { TM30_NATIONALITIES, TM30_CODES, ALPHA2_TO_TM30 } from '../../src/lib/tm30Template.js'

test('template: nine columns in the official order, English labels intact', () => {
  assert.equal(TM30_HEADERS.length, 9)
  const english = ['First Name *', 'Middle Name', 'Last Name', 'Gender *', 'Passport No. *', 'Nationality *', 'Birth Date', 'Check-out Date', 'Phone No.']
  english.forEach((label, i) => assert.ok(TM30_HEADERS[i].includes(label), `column ${i + 1} must be ${label}`))
  assert.equal(TM30_MAX_ROWS, 1000)
})

test('nationalities: 267 official codes, every alpha-2 mapping lands on one of them, common countries present', () => {
  assert.equal(TM30_NATIONALITIES.length, 267)
  for (const [a2, code] of Object.entries(ALPHA2_TO_TM30)) {
    assert.ok(TM30_CODES.has(code), `${a2} -> ${code} is not in the official list`)
  }
  assert.ok(Object.keys(ALPHA2_TO_TM30).length >= 200)
  for (const [a2, code] of [['FR', 'FRA'], ['GB', 'GBR'], ['US', 'USA'], ['DE', 'DEU'], ['CN', 'CHN'], ['JP', 'JPN'], ['RU', 'RUS'], ['AU', 'AUS'], ['IL', 'ISR'], ['MM', 'MMR'], ['TH', 'THA'], ['AW', 'AWB'], ['CW', 'C15'], ['PS', 'PLT'], ['XK', 'RKS'], ['HK', 'HKG'], ['TW', 'TWN']]) {
    assert.equal(ALPHA2_TO_TM30[a2], code, a2)
  }
})

test('tm30Nationality: alpha-2 mapped, official code kept, anything else null', () => {
  assert.equal(tm30Nationality('fr'), 'FRA')
  assert.equal(tm30Nationality('FRA'), 'FRA')
  assert.equal(tm30Nationality('B13'), 'B13')
  assert.equal(tm30Nationality('ZZ'), null)
  assert.equal(tm30Nationality('France'), null)
  assert.equal(tm30Nationality(''), null)
  assert.equal(tm30Nationality(null), null)
  assert.equal(isThaiNational('TH'), true)
  assert.equal(isThaiNational('tha'), true)
  assert.equal(isThaiNational('FR'), false)
})

test('dates DD/MM/YYYY, gender M/F only, phone cleaned', () => {
  assert.equal(tm30Date('1985-06-17'), '17/06/1985')
  assert.equal(tm30Date('2026-11-21T10:00:00Z'), '21/11/2026')
  assert.equal(tm30Date(null), '')
  assert.equal(tm30Date('garbage'), '')
  assert.equal(tm30Gender('M'), 'M')
  assert.equal(tm30Gender('f'), 'F')
  assert.equal(tm30Gender('X'), '', 'prefer not to say is not a code Immigration accepts')
  assert.equal(tm30Gender(null), '')
  assert.equal(tm30Phone('+66 (0)81-234 5678'), '+66812345678')
  assert.equal(tm30Phone('081 234 5678'), '0812345678')
  assert.equal(tm30Phone(null), '')
})

test('a complete guest gives a row with no issue, in the template order', () => {
  const guest = { first_name: ' Anna ', last_name: 'Lee', sex: 'F', passport_number: 'L39828919', nationality: 'US', date_of_birth: '1975-10-30' }
  const booking = { check_out: '2023-06-14', guest_phone: '+66 81 234 5678' }
  const row = tm30Row(guest, booking)
  assert.deepEqual(row.issues, [])
  assert.deepEqual(row.cells, ['Anna', '', 'Lee', 'F', 'L39828919', 'USA', '30/10/1975', '14/06/2023', '+66812345678'])
})

test('missing required fields are reported one by one, the row is still built', () => {
  const row = tm30Row({ first_name: '', sex: 'X', passport_number: null, nationality: 'Martian' }, {})
  assert.deepEqual(row.issues, ['first_name', 'gender', 'passport', 'nationality'])
  assert.deepEqual(row.cells, ['', '', '', '', '', '', '', '', ''])
  const child = tm30Row({ first_name: 'Lou', sex: 'F', passport_number: '', nationality: 'FR' }, { check_out: '2026-12-01' })
  assert.deepEqual(child.issues, ['passport'])
})

test('buildTm30Rows leaves Thai nationals out and keeps the others with their booking data', () => {
  const guests = [
    { id: 1, booking_id: 'b1', first_name: 'Somchai', sex: 'M', passport_number: 'X', nationality: 'TH' },
    { id: 2, booking_id: 'b1', first_name: 'Marie', last_name: 'Dupont', sex: 'F', passport_number: '12AB', nationality: 'FR', date_of_birth: '1990-01-02' },
    { id: 3, booking_id: 'b2', first_name: 'Kenji', sex: 'M', passport_number: 'TK1', nationality: null },
  ]
  const rows = buildTm30Rows(guests, { b1: { check_out: '2026-12-05', guest_phone: '0812345678' }, b2: { check_out: '2026-12-06' } })
  assert.equal(rows.length, 2)
  assert.equal(rows[0].cells[0], 'Marie')
  assert.equal(rows[0].cells[7], '05/12/2026')
  assert.equal(rows[0].cells[8], '0812345678')
  assert.deepEqual(rows[1].issues, ['nationality'])
})

test('files of 1,000 rows at most; sheet data starts with the header row; file names', () => {
  const rows = Array.from({ length: 2300 }, (_, i) => ({ cells: [String(i)], issues: [] }))
  const chunks = chunkTm30Rows(rows)
  assert.deepEqual(chunks.map(c => c.length), [1000, 1000, 300])
  const sheet = tm30SheetData(rows.slice(0, 2))
  assert.equal(sheet.length, 3)
  assert.equal(sheet[0], TM30_HEADERS)
  assert.equal(tm30FileName('Villa Sunset & Spa', '2026-11-20'), 'TM30_Villa_Sunset_Spa_2026-11-20.xls')
  assert.equal(tm30FileName('X', '2026-11-20', 2, 3), 'TM30_X_2026-11-20_part2.xls')
  assert.equal(tm30FileName('', '2026-11-20'), 'TM30_property_2026-11-20.xls')
})
