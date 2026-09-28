/**
 * Docs Studio Excel export — package structure, well-formed XML, real
 * numbers and dates, currency number formats with the ISO decimals (JPY 0,
 * USD 2, KWD 3), styled header, frozen rows, column widths, the raw sheet,
 * and the file name. (Also checked by hand with openpyxl and LibreOffice.)
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'

import { amountInWords, calculateDocument, changeCurrency, normalizeDocument } from '../src/tools/docs-studio/engine/index.js'
import { buildDocumentXlsx, currencyNumberFormat, xlsxFileName } from '../src/tools/docs-studio/io/xlsxExport.js'
import { buildXlsx, columnName, excelDate, safeSheetName, xmlEscape } from '../src/tools/docs-studio/io/xlsx.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'

const NOW = new Date(2026, 8, 27)

function sample(currency = 'USD', locale = 'en-US') {
  const s = createSampleDocument(NOW)
  const doc = normalizeDocument({ ...s, options: { ...s.options, showAmountInWords: true } })
  return { ...changeCurrency(doc, currency), locale }
}

function build(doc) {
  const totals = calculateDocument(doc)
  const bytes = buildDocumentXlsx(doc, totals, { amountWords: amountInWords(totals.amountPayable, doc.currency, {}), now: NOW })
  const files = Object.fromEntries(Object.entries(unzipSync(bytes)).map(([k, v]) => [k, strFromU8(v)]))
  return { bytes, files, totals }
}

/** Minimal well-formedness check: balanced tags, one root, escaped text. */
function assertWellFormed(xml, name) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), `${name}: XML declaration`)
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '')
  const stack = []
  let roots = 0
  for (const m of body.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) {
      assert.ok(!/[<>]|&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(m[5]), `${name}: unescaped text "${m[5].slice(0, 40)}"`)
      continue
    }
    const [, close, tag, attrs, self] = m
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(attrs), `${name}: unescaped attribute in <${tag}>`)
    if (close) assert.equal(stack.pop(), tag, `${name}: </${tag}> closes the right element`)
    else if (!self) { if (!stack.length) roots++; stack.push(tag) } else if (!stack.length) roots++
  }
  assert.equal(stack.length, 0, `${name}: all elements closed`)
  assert.equal(roots, 1, `${name}: one root element`)
}

const cell = (sheetXml, ref) => {
  const m = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>(.*?)</c>)`).exec(sheetXml)
  return m ? { attrs: m[1], inner: m[2] || '' } : null
}

test('package: every part present, declared in [Content_Types].xml, related, and well-formed', () => {
  const { files } = build(sample())
  const expected = ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'docProps/app.xml', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels',
    'xl/styles.xml', 'xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']
  assert.deepEqual(Object.keys(files).sort(), [...expected].sort())
  assert.equal(Object.keys(files)[0], '[Content_Types].xml', 'content types first in the zip')
  for (const [name, xml] of Object.entries(files)) assertWellFormed(xml, name)
  const ct = files['[Content_Types].xml']
  for (const part of expected.filter((p) => p.startsWith('xl/') && !p.includes('_rels') || p.startsWith('docProps/'))) {
    assert.ok(ct.includes(`PartName="/${part}"`), `${part} declared`)
  }
  const rels = files['xl/_rels/workbook.xml.rels']
  for (const target of ['worksheets/sheet1.xml', 'worksheets/sheet2.xml', 'styles.xml', 'sharedStrings.xml']) assert.ok(rels.includes(`Target="${target}"`))
  assert.match(files['xl/workbook.xml'], /<sheet name="Invoice" sheetId="1" r:id="rId1"\/><sheet name="Items \(raw\)" sheetId="2" r:id="rId2"\/>/)
})

test('sheet element order follows the schema (Excel rejects out-of-order parts)', () => {
  const { files } = build(sample())
  const sheet = files['xl/worksheets/sheet1.xml']
  const order = ['<sheetPr', '<dimension', '<sheetViews', '<sheetFormatPr', '<cols', '<sheetData', '<mergeCells', '<pageMargins', '<pageSetup']
  const positions = order.map((tag) => sheet.indexOf(tag))
  assert.ok(positions.every((p) => p > 0), 'all present')
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'in schema order')
})

test('amounts are real numbers with the currency format and ISO decimals (JPY 0, USD 2, KWD 3)', () => {
  const cases = [['USD', 'en-US', '"$"#,##0.00', '7538.4'], ['JPY', 'ja-JP', '#,##0', '7538'], ['KWD', 'en-KW', '#,##0.000', '7538.4'], ['EUR', 'de-DE', '#,##0.00\\ "€"', '7538.4']]
  for (const [currency, locale, format, total] of cases) {
    const { files } = build(sample(currency, locale))
    const styles = files['xl/styles.xml']
    assert.ok(styles.includes(`formatCode="${xmlEscape(currencyNumberFormat(currency, locale))}"`), `${currency}: format declared`)
    assert.ok(currencyNumberFormat(currency, locale).includes(format), `${currency}: ${currencyNumberFormat(currency, locale)}`)
    const sheet = files['xl/worksheets/sheet1.xml']
    assert.ok(new RegExp(`<v>${total.replace('.', '\\.')}</v>`).test(sheet), `${currency}: total ${total} stored as a number`)
  }
  assert.equal(currencyNumberFormat('KWD', 'en-KW'), '"KWD"\\ #,##0.000')
  assert.equal(currencyNumberFormat('USD', 'en-US'), '"$"#,##0.00')
})

test('Invoice sheet: title, party blocks, dates as dates, styled frozen table head, widths, totals', () => {
  const doc = sample()
  const { files } = build(doc)
  const sheet = files['xl/worksheets/sheet1.xml']
  const sst = files['xl/sharedStrings.xml']
  const strings = [...sst.matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)].map((m) => m[1])
  const text = (ref) => { const c = cell(sheet, ref); return c && /t="s"/.test(c.attrs) ? strings[Number(/<v>(\d+)<\/v>/.exec(c.inner)[1])] : null }
  assert.equal(text('A1'), 'Invoice INV-2026-0001')
  assert.equal(text('B3'), 'From')
  assert.ok(text('B4').startsWith('Northwind Studio\n221 Market Street'))
  assert.equal(text('E3'), 'Bill to')
  // Dates are serial numbers with a date format (numFmt 14).
  assert.equal(text('B7'), 'Issue date')
  assert.match(cell(sheet, 'C7').inner, new RegExp(`<v>${excelDate(doc.issueDate)}</v>`))
  // Header row: bold white on the accent, frozen with everything above it.
  const headRow = Number(/<pane ySplit="(\d+)"/.exec(sheet)[1])
  assert.equal(text(`B${headRow}`), 'Description')
  assert.match(sheet, new RegExp(`<pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/>`))
  const styles = files['xl/styles.xml']
  assert.ok(styles.includes('<fgColor rgb="FF0071E3"/>'), 'accent fill')
  assert.ok(/<font><b\/><sz val="11"\/><color rgb="FFFFFFFF"\/>/.test(styles), 'bold white header font')
  assert.match(sheet, /<col min="2" max="2" width="44" customWidth="1"\/>/)
  // Item 1: number cells, not strings.
  const r = headRow + 1
  assert.match(cell(sheet, `C${r}`).inner, /^<v>1<\/v>$/, 'qty is a number')
  assert.match(cell(sheet, `E${r}`).inner, /^<v>1850<\/v>$/, 'unit price is a number')
  assert.match(cell(sheet, `G${r}`).inner, /^<v>1850<\/v>$/)
  assert.ok(strings.includes('Balance due') && /<v>6038\.4<\/v>/.test(sheet))
  assert.ok(strings.some((s) => s.startsWith('Seven Thousand Five Hundred')))
  assert.match(sheet, /<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"\/>/)
})

test('Items (raw): plain rows in the paste-import column order, numbers only', () => {
  const { files } = build(sample('JPY', 'ja-JP'))
  const raw = files['xl/worksheets/sheet2.xml']
  const strings = [...files['xl/sharedStrings.xml'].matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)].map((m) => m[1])
  const headers = ['A1', 'B1', 'C1', 'D1'].map((ref) => strings[Number(/<v>(\d+)<\/v>/.exec(cell(raw, ref).inner)[1])])
  assert.deepEqual(headers, ['Description', 'Quantity', 'Unit', 'Unit price'])
  assert.match(cell(raw, 'B4').inner, /^<v>12<\/v>$/)
  assert.match(cell(raw, 'D2').inner, /^<v>1850<\/v>$/, 'JPY price has no decimals')
  assert.match(raw, /<pane ySplit="1"/)
})

test('file name, sheet names, escaping and dates', () => {
  assert.equal(xlsxFileName(sample()), 'Invoice-INV-2026-0001.xlsx')
  assert.equal(xlsxFileName({ ...sample(), type: 'delivery_note', number: 'DN/2026 #7' }), 'Delivery-Note-DN-2026-7.xlsx')
  assert.equal(safeSheetName('Items [raw]: a/b?'), 'Items  raw   a b')
  assert.equal(safeSheetName('x'.repeat(40)).length, 31)
  assert.equal(xmlEscape('A & B <c> "d"\u0001'), 'A &amp; B &lt;c&gt; &quot;d&quot;')
  assert.equal(columnName(0), 'A')
  assert.equal(columnName(25), 'Z')
  assert.equal(columnName(26), 'AA')
  assert.equal(excelDate('1900-03-01'), 61)
  assert.equal(excelDate('2026-09-27'), 46292)
  assert.equal(excelDate('nope'), null)
  const tricky = buildXlsx({ sheets: [{ name: 'S', rows: [[{ v: '<script>&"\u0007' }, { v: Number.NaN }, { v: true }]] }] })
  const files = Object.fromEntries(Object.entries(unzipSync(tricky)).map(([k, v]) => [k, strFromU8(v)]))
  for (const [name, xml] of Object.entries(files)) assertWellFormed(xml, name)
  assert.ok(files['xl/sharedStrings.xml'].includes('&lt;script&gt;&amp;&quot;'))
  assert.match(files['xl/worksheets/sheet1.xml'], /<c r="C1" t="b"><v>1<\/v><\/c>/)
})
