/**
 * Docs Studio PDF renderer — page sizes, required content, Unicode font vs
 * Helvetica/ISO fallback, pagination with repeated table header, metadata,
 * thermal receipts, file names, font loading and RTL routing.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import { amountInWords, calculateDocument } from '../src/tools/docs-studio/engine/index.js'
import { modelNeedsComplexScript } from '../src/tools/docs-studio/pdf/complexScript.js'
import { FONT_URLS, fontsFromBytes, loadPdfFonts, resetPdfFontCache } from '../src/tools/docs-studio/pdf/fonts.js'
import { PDF_CREATOR, renderPdf } from '../src/tools/docs-studio/pdf/renderPdf.js'
import { toWinAnsi } from '../src/tools/docs-studio/pdf/text.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import { buildPaperModel, pdfFileName } from '../src/tools/docs-studio/templates/paperModel.js'
import { PAPERS, resolveLayout } from '../src/tools/docs-studio/templates/specs.js'
import { listTemplates } from '../src/tools/docs-studio/templates/registry.js'
import { readPdf } from './helpers/pdfReader.mjs'

const REGULAR = readFileSync(new URL('../public/fonts/NotoSans-Regular.subset.ttf', import.meta.url))
const BOLD = readFileSync(new URL('../public/fonts/NotoSans-Bold.subset.ttf', import.meta.url))
const FONTS = fontsFromBytes(new Uint8Array(REGULAR), new Uint8Array(BOLD))
const NOW = new Date(2026, 8, 27)
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

function sample(overrides = {}) {
  const base = createSampleDocument(NOW)
  return { ...base, ...overrides, appearance: { ...base.appearance, ...(overrides.appearance || {}) } }
}

/** Renders like the browser does; `fonts: null` = the Helvetica/ISO fallback path. */
function render(doc, { fonts = FONTS, logo = null } = {}) {
  const totals = calculateDocument(doc)
  const amountWords = amountInWords(totals.amountPayable, doc.currency, { system: doc.options.wordsSystem })
  const model = fonts
    ? buildPaperModel(doc, totals, { amountWords })
    : buildPaperModel(doc, totals, { amountWords, currencyDisplay: 'code', sanitize: toWinAnsi })
  const pdf = renderPdf({ jsPDF, autoTable, model, layout: resolveLayout(doc), fonts, logo, compress: false })
  return { pdf: readPdf(pdf.output()), model }
}

const near = (a, b, eps = 0.15) => Math.abs(a - b) <= eps
/** Text with line breaks collapsed, for phrases that may wrap. */
const flat = (text) => text.replace(/\s+/g, ' ')

test('page size in mm: A4, Letter, thermal 80 and 58 (single continuous page)', () => {
  for (const [paperSize, w, h] of [['A4', 210, 297], ['Letter', 215.9, 279.4]]) {
    const { pdf } = render(sample({ appearance: { paperSize } }))
    assert.equal(pdf.pageCount, 1, paperSize)
    assert.ok(near(pdf.pages[0].widthMm, w) && near(pdf.pages[0].heightMm, h), `${paperSize}: ${pdf.pages[0].widthMm}×${pdf.pages[0].heightMm}`)
  }
  const heights = {}
  for (const [paperSize, w] of [['Thermal80', 80], ['Thermal58', 58]]) {
    const { pdf } = render(sample({ appearance: { paperSize } }))
    assert.equal(pdf.pageCount, 1, paperSize)
    assert.ok(near(pdf.pages[0].widthMm, w), `${paperSize} width ${pdf.pages[0].widthMm}`)
    assert.ok(pdf.pages[0].heightMm > w, `${paperSize} is taller than wide (${pdf.pages[0].heightMm} mm)`)
    heights[paperSize] = pdf.pages[0].heightMm
  }
  assert.ok(heights.Thermal58 < 400 && heights.Thermal80 < 400, 'measured height, not the 5000 mm probe page')
})

test('required content: number, client, totals, words, notes/terms/footer, "Page x of y", selectable text', () => {
  for (const templateId of listTemplates().map((t) => t.id)) {
    const { pdf } = render(sample({ templateId }))
    const text = flat(pdf.text)
    for (const needle of ['INV-2026-0001', 'Maya Chen', 'Acme Corporation', '$7,538.40', '$6,038.40', 'Balance due',
      'Seven Thousand Five Hundred Thirty-Eight Dollars and Forty Cents', 'Thank you for your business!',
      'Payment due within 14 days', 'Northwind Studio · northwind.studio', `Page 1 of ${pdf.pageCount}`, 'DESCRIPTION']) {
      assert.ok(text.includes(needle), `${templateId}: missing "${needle}"`)
    }
    assert.ok(pdf.fonts.some((f) => /NotoSans/.test(f)), `${templateId}: Unicode font embedded`)
  }
})

test('accent colour, logo image and status stamp are drawn', () => {
  const { pdf } = render(sample({ status: 'paid', appearance: { accentColor: '#e11d48' } }), { logo: { dataUrl: PNG_1PX, width: 1, height: 1, format: 'PNG' } })
  const content = pdf.pages[0].content
  // #e11d48 → 0.882 0.114 0.282 (fill for the band / table header / balance row)
  assert.match(content, /0\.88\d* 0\.11\d* 0\.28\d* rg/)
  assert.equal(pdf.imageCount, 1)
  assert.ok(pdf.text.includes('PAID'))
  assert.match(content, /\/GS\d+ gs/, 'stamp drawn with reduced opacity')
})

test('₹ / ₩ / ₺ render with the Unicode font', () => {
  for (const [currency, symbol, locale] of [['INR', '₹', 'en-IN'], ['KRW', '₩', 'ko-KR'], ['TRY', '₺', 'tr-TR']]) {
    const { pdf } = render(sample({ currency, locale }))
    assert.ok(pdf.text.includes(symbol), `${currency}: expected ${symbol}`)
  }
})

test('font unavailable: Helvetica with ISO currency codes and WinAnsi-safe text', () => {
  const doc = sample({ currency: 'INR', locale: 'en-IN', client: { ...sample().client, name: 'Ирина Ковалёва' } })
  const { pdf, model } = render(doc, { fonts: null })
  assert.ok(pdf.fonts.some((f) => /Helvetica/.test(f)))
  assert.ok(!pdf.fonts.some((f) => /NotoSans/.test(f)))
  assert.ok(pdf.text.includes('INR'), 'ISO code instead of the symbol')
  assert.ok(!pdf.text.includes('₹'))
  assert.equal(model.parties[1].name, '????? ????????', 'non-Latin names degrade to "?" rather than garbage')
  assert.ok(pdf.text.includes('INV-2026-0001'))
})

test('60-line invoice: several pages, header repeated on each, correct "Page x of y"', () => {
  const lines = Array.from({ length: 60 }, (_, i) => ({ id: `l${i}`, description: `Line item number ${i + 1}`, sku: '', unit: '', qty_milli: 1000, unitPrice_minor: 1000 + i, discount: null, taxIds: ['sample-tax'] }))
  const { pdf } = render(sample({ lines, payments: [] }))
  assert.ok(pdf.pageCount >= 2, `pages: ${pdf.pageCount}`)
  pdf.pages.forEach((page, i) => {
    assert.ok(page.text.includes('DESCRIPTION') && page.text.includes('AMOUNT'), `page ${i + 1} repeats the table header`)
    assert.ok(page.text.includes(`Page ${i + 1} of ${pdf.pageCount}`), `page ${i + 1} numbered`)
    assert.ok(near(page.widthMm, 210) && near(page.heightMm, 297))
  })
  assert.ok(pdf.pages[0].text.split('\n').includes('Line item number 1'))
  assert.ok(pdf.pages.at(-1).text.split('\n').includes('Line item number 60'))
  assert.ok(pdf.pages.at(-1).text.includes('Total'), 'totals follow the last rows')
})

test('PDF metadata: title, author = seller, creator', () => {
  const { pdf } = render(sample())
  assert.equal(pdf.info.Title, 'Invoice INV-2026-0001')
  assert.equal(pdf.info.Author, 'Northwind Studio')
  assert.equal(pdf.info.Creator, PDF_CREATOR)
  assert.equal(PDF_CREATOR, 'Nexora Docs Studio – nexorasolution.online')
})

test('receipt content: items as qty × price, totals, payments, footer', () => {
  const { pdf } = render(sample({ appearance: { paperSize: 'Thermal80' } }))
  const text = flat(pdf.text)
  for (const needle of ['Northwind Studio', 'INVOICE', '12 hrs × $65.00', '$780.00', 'Total', '$7,538.40', 'Payments', 'Bank transfer', 'Northwind Studio · northwind.studio']) {
    assert.ok(text.includes(needle), `receipt missing "${needle}"`)
  }
  assert.ok(!/Page \d+ of/.test(pdf.text), 'receipts are one continuous page, no page numbers')
})

test('file name: {TypeLabel}-{number}.pdf, sanitized', () => {
  const name = (typeLabel, number) => pdfFileName({ typeLabel, number })
  assert.equal(name('Invoice', 'INV-2026-0001'), 'Invoice-INV-2026-0001.pdf')
  assert.equal(name('Proforma Invoice', 'PRO/2026 #7'), 'Proforma-Invoice-PRO-2026-7.pdf')
  assert.equal(name('Credit Note', 'Crédit:é/../x'), 'Credit-Note-Credit-e-..-x.pdf')
  assert.equal(name('Receipt', ''), 'Receipt-draft.pdf')
  assert.doesNotMatch(name('Invoice', '<script>/\\:*?"|'), /[<>/\\:*?"|]/)
})

test('fonts load once per session; a failed fetch is retried next time', async () => {
  resetPdfFontCache()
  let calls = 0
  const okFetch = async (url) => {
    calls++
    assert.ok(Object.values(FONT_URLS).includes(url))
    return { ok: true, arrayBuffer: async () => (url.includes('Bold') ? BOLD : REGULAR).buffer.slice(0) }
  }
  const first = await loadPdfFonts(okFetch)
  const second = await loadPdfFonts(okFetch)
  assert.equal(first, second)
  assert.equal(calls, 2, 'regular + bold fetched exactly once')
  assert.equal(first.family, 'NotoSans')

  resetPdfFontCache()
  await assert.rejects(loadPdfFonts(async () => ({ ok: false, status: 503 })))
  const retried = await loadPdfFonts(okFetch)
  assert.equal(retried.family, 'NotoSans', 'failure was not cached')
  resetPdfFontCache()
})

test('RTL / complex scripts are detected and routed to the print path', () => {
  const doc = sample({ client: { ...sample().client, name: 'شركة الأفق' } })
  const totals = calculateDocument(doc)
  assert.equal(modelNeedsComplexScript(buildPaperModel(doc, totals)), true)
  assert.equal(modelNeedsComplexScript(buildPaperModel(sample(), calculateDocument(sample()))), false)
})

test('both renderers read one spec: layout numbers exist only in specs.js', () => {
  // The HTML paper's CSS variables are generated from the same spec objects
  // the PDF renderer reads; spot-check the mapping stays complete.
  for (const template of listTemplates()) {
    const spec = resolveLayout({ templateId: template.id, appearance: { paperSize: 'A4' } }).spec
    for (const key of ['marginXMm', 'marginTopMm', 'marginBottomMm', 'lineHeight']) assert.equal(typeof spec[key], 'number', `${spec.id}.${key}`)
    for (const key of ['base', 'title', 'tableHead', 'total', 'pageNumber']) assert.equal(typeof spec.sizesPt[key], 'number', `${spec.id}.sizesPt.${key}`)
  }
  assert.deepEqual(Object.keys(PAPERS), ['A4', 'Letter', 'Thermal80', 'Thermal58'])
  const css = readFileSync(new URL('../src/tools/docs-studio/templates/paper.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\b\d+(\.\d+)?pt\b/, 'no hard-coded point sizes in paper.css')
})
