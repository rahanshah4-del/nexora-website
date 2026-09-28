/**
 * Docs Studio PDF — template features (side column, full band, table / meta /
 * totals styles, section order, visibility flags, fonts), letterhead mode
 * (image on every page or the first, safe areas, page numbers), the
 * letterhead aspect-ratio fit, and the pdf-lib vector merge with its image
 * fallback.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import { amountInWords, calculateDocument, normalizeDocument } from '../src/tools/docs-studio/engine/index.js'
import { createDocumentPdf } from '../src/tools/docs-studio/pdf/downloadPdf.js'
import { PDF_SERIF_FAMILY, fontsFromBytes, layoutNeedsSerif } from '../src/tools/docs-studio/pdf/fonts.js'
import { mergeLetterhead } from '../src/tools/docs-studio/pdf/letterheadMerge.js'
import { renderPdf } from '../src/tools/docs-studio/pdf/renderPdf.js'
import { toWinAnsi } from '../src/tools/docs-studio/pdf/text.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import { buildPaperModel } from '../src/tools/docs-studio/templates/paperModel.js'
import { registerTemplate, unregisterTemplate } from '../src/tools/docs-studio/templates/registry.js'
import { PAPERS, letterheadPlacement, resolveLayout } from '../src/tools/docs-studio/templates/specs.js'
import { readPdf } from './helpers/pdfReader.mjs'

const font = (name) => new Uint8Array(readFileSync(new URL(`../public/fonts/${name}`, import.meta.url)))
const SANS = fontsFromBytes(font('NotoSans-Regular.subset.ttf'), font('NotoSans-Bold.subset.ttf'))
const SERIF = fontsFromBytes(font('NotoSerif-Regular.subset.ttf'), font('NotoSerif-Bold.subset.ttf'), PDF_SERIF_FAMILY)
const NOW = new Date(2026, 8, 27)
const PNG_1PX = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'))
const A4_LETTERHEAD = { imageAssetId: 'lh-img', widthPx: 2480, heightPx: 3508, topMm: 50, bottomMm: 30, leftMm: 20, rightMm: 15 }
const flat = (text) => text.replace(/\s+/g, ' ')
const MM = 72 / 25.4

function sample(overrides = {}) {
  const base = createSampleDocument(NOW)
  return normalizeDocument({ ...base, ...overrides, appearance: { ...base.appearance, ...(overrides.appearance || {}) } })
}

function longDoc(overrides = {}, lines = 40) {
  const base = sample(overrides)
  return normalizeDocument({ ...base, lines: Array.from({ length: lines }, (_, i) => ({ ...base.lines[i % base.lines.length], id: `l${i}`, description: `Line item ${i + 1}` })) })
}

/** Renders like the browser. fonts: 'unicode' (Noto) or 'fallback' (Helvetica, readable literal text for position checks). */
function render(doc, { fonts = 'unicode', letterhead = null, logo = null } = {}) {
  const totals = calculateDocument(doc)
  const amountWords = amountInWords(totals.amountPayable, doc.currency, { system: doc.options.wordsSystem })
  const unicode = fonts === 'unicode'
  const model = unicode ? buildPaperModel(doc, totals, { amountWords }) : buildPaperModel(doc, totals, { amountWords, currencyDisplay: 'code', sanitize: toWinAnsi })
  const layout = resolveLayout(doc)
  const pdf = renderPdf({ jsPDF, autoTable, model, layout, fonts: unicode ? SANS : null, serifFonts: unicode && layoutNeedsSerif(layout) ? SERIF : null, logo, letterhead, compress: false })
  return { pdf: readPdf(pdf.output()), raw: pdf.output('arraybuffer'), layout, model }
}

/** Filled rectangles ("x y w h re" followed by f) in mm, from the top-left. */
function filledRects(page) {
  const out = []
  for (const m of page.content.matchAll(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re\s*\n?f/g)) {
    const [x, y, w, h] = m.slice(1, 5).map(Number)
    const top = page.heightMm - (y + Math.max(h, 0)) / MM
    out.push({ x: x / MM, y: h < 0 ? page.heightMm - y / MM : top, w: w / MM, h: Math.abs(h) / MM })
  }
  return out
}

const literalRuns = (page) => page.runs.filter((r) => r.literal !== undefined).map((r) => ({ ...r, text: r.literal }))

test('every template: required content, Noto fonts, and the accent colour', () => {
  for (const templateId of ['classic', 'modern', 'minimal', 'corporate']) {
    const { pdf } = render(sample({ templateId, appearance: { accentColor: '#7c3aed' } }))
    const text = flat(pdf.text)
    for (const needle of ['INV-2026-0001', 'Maya Chen', 'Northwind Studio', '$7,538.40', 'Balance due', 'Thank you for your business!', 'Payment due within 14 days', 'DESCRIPTION']) {
      assert.ok(text.includes(needle), `${templateId}: "${needle}"`)
    }
    // jsPDF writes fills with 2 decimals, text colours with 3.
    assert.ok(/0\.(?:49|486) 0\.(?:23|227) 0\.(?:93|929) rg/.test(pdf.pages[0].content), `${templateId}: accent #7c3aed is used`)
    assert.ok(pdf.fonts.some((f) => /NotoSans/.test(f)), templateId)
  }
})

test('Modern: an accent side column on every page, with the business, client and dates in it', () => {
  const doc = longDoc({ templateId: 'modern', appearance: { accentColor: '#4f46e5' } })
  const { pdf, layout } = render(doc, { fonts: 'fallback' })
  assert.ok(pdf.pageCount >= 2)
  const sideW = layout.spec.sidebar.widthMm
  for (const page of pdf.pages) {
    const column = filledRects(page).find((r) => Math.abs(r.x) < 0.1 && Math.abs(r.w - sideW) < 0.2 && r.h > page.heightMm - 0.5)
    assert.ok(column, 'full-height side column')
  }
  const inSide = literalRuns(pdf.pages[0]).filter((r) => r.xMm < sideW)
  const sideText = inSide.map((r) => r.text).join(' ')
  for (const needle of ['Northwind Studio', 'Maya Chen', 'ISSUE DATE']) assert.ok(sideText.includes(needle), `side column has "${needle}"`)
  assert.ok(literalRuns(pdf.pages[0]).some((r) => r.text === 'Invoice' && r.xMm > sideW), 'title in the main column, not upper-cased')
  assert.ok(!flat(pdf.text).includes('# DESCRIPTION'), 'no item numbers column (show.itemNumbers: false)')
})

test('Corporate: full-width header band, boxed meta and totals; Classic: thin band + filled table head', () => {
  const corp = render(sample({ templateId: 'corporate', appearance: { accentColor: '#1e3a5f' } }), { fonts: 'fallback' })
  const band = filledRects(corp.pdf.pages[0]).find((r) => r.y < 0.1 && r.w > 209 && r.h > 25)
  assert.ok(band, 'full-width header block')
  const title = literalRuns(corp.pdf.pages[0]).find((r) => r.text === 'INVOICE')
  assert.ok(title && title.yMm < band.h, 'title sits inside the band')
  assert.ok(/re\s*\n?S/.test(corp.pdf.pages[0].content), 'boxed meta / totals are stroked')
  const classic = render(sample({ templateId: 'classic' }), { fonts: 'fallback' })
  const thin = filledRects(classic.pdf.pages[0]).find((r) => r.y < 0.1 && r.w > 209 && r.h < 6)
  assert.ok(thin, 'thin accent band')
})

test('Minimal: serif headings (Noto Serif) and a text-coloured balance; the serif font is only embedded when used', () => {
  const minimal = render(sample({ templateId: 'minimal' }))
  assert.ok(minimal.pdf.fonts.some((f) => /NotoSerif/.test(f)), 'Noto Serif embedded')
  assert.ok(layoutNeedsSerif(minimal.layout))
  const classic = render(sample({ templateId: 'classic' }))
  assert.ok(!classic.pdf.fonts.some((f) => /NotoSerif/.test(f)))
  assert.equal(layoutNeedsSerif(classic.layout), false)
  // Without Noto at all: the serif template falls back to Times, sans to Helvetica.
  const fallback = render(sample({ templateId: 'minimal' }), { fonts: 'fallback' })
  assert.ok(fallback.pdf.fonts.some((f) => /Times/.test(f)) && fallback.pdf.fonts.some((f) => /Helvetica/.test(f)))
})

test('section order and visibility flags from a (remote-style) spec are honoured', () => {
  const spec = {
    schemaVersion: 1, id: 'test-order', name: 'Order test',
    sections: ['header', 'notes', 'parties', 'items', 'summary', 'footer'],
    show: { logo: true, itemNumbers: false, amountInWords: false, stamp: false, notes: true, terms: false, footer: false, pageNumbers: false },
  }
  assert.equal(registerTemplate(spec).ok, true)
  try {
    const { pdf } = render(sample({ templateId: 'test-order', status: 'paid', options: { ...sample().options, showAmountInWords: true } }), { fonts: 'fallback' })
    const text = flat(pdf.text)
    assert.ok(text.indexOf('Thank you for your business!') < text.indexOf('Maya Chen'), 'notes before parties')
    assert.ok(!text.includes('Payment due within 14 days'), 'terms hidden')
    assert.ok(!text.includes('Northwind Studio · northwind.studio'), 'footer hidden')
    assert.ok(!text.includes('Seven Thousand'), 'amount in words hidden')
    assert.ok(!text.includes('PAID'), 'stamp hidden')
    assert.ok(!/Page \d of \d/.test(text), 'page numbers hidden')
    assert.ok(!text.includes('ISSUE DATE'), 'meta omitted from the sections')
  } finally {
    unregisterTemplate('test-order')
  }
})

test('letterhead (image, all pages): drawn under every page, safe areas respected, page numbers inside the bottom safe area', () => {
  const doc = longDoc({ templateId: 'classic', appearance: { letterhead: { ...A4_LETTERHEAD, pages: 'all' } } })
  const { pdf, layout } = render(doc, { fonts: 'fallback', letterhead: { data: PNG_1PX, format: 'PNG' } })
  assert.ok(pdf.pageCount >= 2)
  assert.equal(pdf.imageCount, 1, 'one image object, reused on every page')
  const H = layout.paper.heightMm
  pdf.pages.forEach((page, i) => {
    const firstOp = page.content.indexOf(' Do')
    assert.ok(firstOp >= 0 && firstOp < page.content.indexOf('BT'), `page ${i + 1}: letterhead drawn before any text`)
    const runs = literalRuns(page)
    const body = runs.filter((r) => !/^Page \d+ of \d+$/.test(r.text))
    assert.ok(Math.min(...body.map((r) => r.yMm)) >= 50 - 0.5, `page ${i + 1}: nothing above the 50 mm top safe area`)
    assert.ok(Math.max(...body.map((r) => r.yMm)) <= H - 30, `page ${i + 1}: nothing in the 30 mm bottom safe area`)
    assert.ok(Math.min(...body.map((r) => r.xMm)) >= 20 - 0.2, `page ${i + 1}: left safe area`)
    const pageNo = runs.find((r) => /^Page \d+ of \d+$/.test(r.text))
    // Runs are reported at their baseline: the text top is at H − 30 + 4 mm.
    assert.ok(pageNo && pageNo.yMm > H - 30 + 4 && pageNo.yMm < H - 30 + 7, `page ${i + 1}: "Page x of y" just inside the bottom safe area (${pageNo?.yMm.toFixed(1)})`)
  })
  assert.equal(filledRects(pdf.pages[0]).some((r) => r.y < 0.1 && r.w > 209), false, 'no header band on a letterhead')
})

test('letterhead "first page only": later pages have no letterhead and use the template margins', () => {
  const doc = longDoc({ templateId: 'classic', appearance: { letterhead: { ...A4_LETTERHEAD, pages: 'first' } } })
  const { pdf, layout } = render(doc, { fonts: 'fallback', letterhead: { data: PNG_1PX, format: 'PNG' } })
  assert.ok(pdf.pageCount >= 2)
  assert.ok(pdf.pages[0].content.includes(' Do'))
  const normalTop = layout.spec.normalMarginTopMm
  pdf.pages.slice(1).forEach((page) => {
    assert.ok(!page.content.includes(' Do'), 'no letterhead image')
    const body = literalRuns(page).filter((r) => !/^Page/.test(r.text))
    const top = Math.min(...body.map((r) => r.yMm))
    assert.ok(top >= normalTop - 0.5 && top < 50, `continuation page starts at the template margin (${top.toFixed(1)} mm)`)
  })
})

test('every template has a letterhead variant: stacked, no band/side column, business block hidden by default', () => {
  for (const templateId of ['classic', 'modern', 'minimal', 'corporate']) {
    const { pdf } = render(sample({ templateId, appearance: { letterhead: { ...A4_LETTERHEAD, pages: 'all' } } }), { fonts: 'fallback', letterhead: { data: PNG_1PX, format: 'PNG' } })
    const rects = filledRects(pdf.pages[0])
    assert.equal(rects.some((r) => r.h > 280), false, `${templateId}: no side column`)
    assert.equal(rects.some((r) => r.y < 0.1 && r.w > 209), false, `${templateId}: no band`)
    const text = flat(pdf.text)
    assert.ok(!text.includes('FROM'), `${templateId}: "From" block hidden`)
    assert.ok(text.includes('Maya Chen'))
  }
})

test('letterhead aspect ratio: fills within 3 %, otherwise fitted (never stretched) with the matching paper suggested', () => {
  const a4 = PAPERS.A4
  const letter = PAPERS.Letter
  assert.equal(letterheadPlacement(2480, 3508, a4).mode, 'fill')
  assert.equal(letterheadPlacement(0, 0, a4).mode, 'fill', 'unknown size → fill (old letterheads)')
  const nearlyA4 = letterheadPlacement(1000, 1414 * 1.029, a4)
  assert.equal(nearlyA4.mode, 'fill', '2.9 % off still fills')
  // A Letter-shaped letterhead on A4: fitted to the width, top aligned, Letter suggested.
  const onA4 = letterheadPlacement(2550, 3300, a4)
  assert.equal(onA4.mode, 'fit')
  assert.equal(onA4.suggestedPaper, 'Letter')
  assert.ok(Math.abs(onA4.w - 210) < 0.01 && onA4.h < 297 && onA4.y === 0)
  assert.ok(Math.abs(onA4.h / onA4.w - 3300 / 2550) < 1e-9, 'aspect ratio preserved')
  // An A4 letterhead on Letter: fitted to the height and centred.
  const onLetter = letterheadPlacement(2480, 3508, letter)
  assert.equal(onLetter.suggestedPaper, 'A4')
  assert.ok(Math.abs(onLetter.h - letter.heightMm) < 0.01 && onLetter.w < letter.widthMm)
  assert.ok(Math.abs(onLetter.x - (letter.widthMm - onLetter.w) / 2) < 1e-9)
  // Neither A4 nor Letter shaped.
  assert.equal(letterheadPlacement(1000, 1000, a4).suggestedPaper, null)
  // The PDF uses the same placement.
  const doc = sample({ appearance: { paperSize: 'A4', letterhead: { ...A4_LETTERHEAD, widthPx: 2550, heightPx: 3300 } } })
  assert.deepEqual(resolveLayout(doc).spec.letterheadFit, onA4)
})

function letterheadPdfBytes() {
  const lh = new jsPDF({ unit: 'mm', format: 'a4' })
  lh.setFillColor(14, 116, 144)
  lh.rect(0, 0, 210, 10, 'F')
  lh.text('HARBOR LETTERHEAD', 20, 25)
  return new Uint8Array(lh.output('arraybuffer'))
}

test('pdf-lib merge: the vector letterhead goes under each page, content stays selectable, metadata kept', async () => {
  const doc = longDoc({ templateId: 'corporate', appearance: { letterhead: { ...A4_LETTERHEAD, pdfAssetId: 'lh-pdf', pages: 'all' } } })
  const { raw, layout, pdf: before } = render(doc, { fonts: 'fallback' })
  const merged = await mergeLetterhead(raw, letterheadPdfBytes(), { pages: 'all', fit: layout.spec.letterheadFit })
  const after = readPdf(Buffer.from(merged).toString('latin1'))
  assert.equal(after.pageCount, before.pageCount)
  assert.ok(after.formCount >= 1, 'letterhead embedded as a form XObject')
  after.pages.forEach((page, i) => {
    assert.ok(page.streams.length >= 2, `page ${i + 1}: an extra content stream`)
    assert.ok(/\/Letterhead\S* Do/.test(page.streams[0]), `page ${i + 1}: drawn first (underneath)`)
  })
  assert.equal(flat(after.text), flat(before.text), 'content text unchanged')
  assert.equal(after.info.Creator, before.info.Creator)
  assert.equal(after.info.Title, 'Invoice INV-2026-0001')

  const firstOnly = readPdf(Buffer.from(await mergeLetterhead(raw, letterheadPdfBytes(), { pages: 'first', fit: layout.spec.letterheadFit })).toString('latin1'))
  assert.ok(/Do/.test(firstOnly.pages[0].streams[0]))
  assert.ok(firstOnly.pages.slice(1).every((p) => !p.streams.some((st) => /\/Letterhead/.test(st))), 'first page only')
  await assert.rejects(mergeLetterhead(raw, new Uint8Array([1, 2, 3]), { pages: 'all', fit: layout.spec.letterheadFit }))
})

function fakeRepo(assets) {
  return { getAsset: async (id) => assets[id] || null }
}

test('createDocumentPdf: PDF letterhead → vector merge; a damaged PDF falls back to the rendered image', async () => {
  const doc = sample({ templateId: 'classic', appearance: { letterhead: { ...A4_LETTERHEAD, pdfAssetId: 'lh-pdf' } } })
  const totals = calculateDocument(doc)
  const image = { blob: new Blob([PNG_1PX], { type: 'image/png' }), mime: 'image/png', width: 2480, height: 3508 }
  const good = await createDocumentPdf({ doc, totals, amountWords: '', repo: fakeRepo({ 'lh-img': image, 'lh-pdf': { blob: new Blob([letterheadPdfBytes()], { type: 'application/pdf' }), mime: 'application/pdf' } }) })
  assert.equal(good.ok, true)
  assert.equal(good.letterhead, 'vector')
  assert.equal(good.fileName, 'Invoice-INV-2026-0001.pdf')
  const goodPdf = readPdf(Buffer.from(await good.blob.arrayBuffer()).toString('latin1'))
  assert.ok(goodPdf.formCount >= 1)

  const bad = await createDocumentPdf({ doc, totals, amountWords: '', repo: fakeRepo({ 'lh-img': image, 'lh-pdf': { blob: new Blob(['%PDF-broken'], { type: 'application/pdf' }), mime: 'application/pdf' } }) })
  assert.equal(bad.ok, true)
  assert.equal(bad.letterhead, 'image', 'fallback to the image letterhead')
  const badPdf = readPdf(Buffer.from(await bad.blob.arrayBuffer()).toString('latin1'))
  assert.equal(badPdf.imageCount, 1)

  const none = await createDocumentPdf({ doc: sample(), totals: calculateDocument(sample()), amountWords: '', repo: null })
  assert.equal(none.letterhead, null)
})
