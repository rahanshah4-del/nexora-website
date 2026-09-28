/**
 * Docs Studio editor logic that has no DOM dependency: spreadsheet paste,
 * totals rows (shared by the totals card, the paper and the PDF renderer),
 * issue → field mapping, accent contrast, new/duplicate documents, reducer
 * additions and the sample invoice.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateDocument, convertDocument, createDocument, deserializeDocument, normalizeAppearance, primaryTax, serializeDocument, taxIdsForNewLine, validateDocument,
} from '../src/tools/docs-studio/engine/index.js'
import { buildPaperModel } from '../src/tools/docs-studio/templates/paperModel.js'
import { resolveLayout } from '../src/tools/docs-studio/templates/specs.js'
import { preferencesFromDocument } from '../src/tools/docs-studio/ui/starter.js'
import { isTabularText, parseTabularRows } from '../src/tools/docs-studio/io/pasteRows.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import { documentActions, documentReducer } from '../src/tools/docs-studio/state/documentReducer.js'
import { onAccentColor } from '../src/tools/docs-studio/templates/color.js'
import { buildTotalsRows, paymentTermsLabel } from '../src/tools/docs-studio/templates/summary.js'
import { fieldId, fieldIdCandidates, sectionForPath } from '../src/tools/docs-studio/ui/issues.js'
import { asCreated, createStarterDocument, duplicateDocument, initialView, isReturningBusiness } from '../src/tools/docs-studio/ui/starter.js'

const NOW = new Date(2026, 8, 27)
const vat = (rate = 100000, extra = {}) => ({ id: 'vat', name: 'VAT', rate_micro: rate, compound: false, withholding: false, ...extra })
const line = (id, price, qty = 1000, extra = {}) => ({ id, description: id, sku: '', unit: '', qty_milli: qty, unitPrice_minor: price, discount: null, taxIds: ['vat'], ...extra })
const rowsOf = (doc) => buildTotalsRows(doc, calculateDocument(doc)).map((r) => [r.label, r.amount, r.tone])

function doc(type, overrides = {}) {
  return { ...createDocument(type, { id: `${type}-x`, now: NOW, currency: 'USD', locale: 'en-US' }), ...overrides }
}

test('spreadsheet paste: column layouts, header row, locale numbers', () => {
  assert.ok(isTabularText('a\tb'))
  assert.ok(!isTabularText('just text\nsecond line'))
  const ctx = { currency: 'USD', locale: 'en-US' }
  assert.deepEqual(parseTabularRows('Design\t1,250.50', ctx).rows, [{ description: 'Design', qty_milli: 1000, unit: '', unitPrice_minor: 125050 }])
  assert.deepEqual(parseTabularRows('Hours\t2.5\t80', ctx).rows, [{ description: 'Hours', qty_milli: 2500, unit: '', unitPrice_minor: 8000 }])
  const withHeader = parseTabularRows('Item\tQty\tUnit\tPrice\r\nWidget\t3\tpcs\t9.99\nGadget\t\tbox\t12\n\n', ctx)
  assert.equal(withHeader.skippedHeader, true)
  assert.deepEqual(withHeader.rows, [
    { description: 'Widget', qty_milli: 3000, unit: 'pcs', unitPrice_minor: 999 },
    { description: 'Gadget', qty_milli: 1000, unit: 'box', unitPrice_minor: 1200 },
  ])
  assert.deepEqual(parseTabularRows('Beratung\t1,5\t1.234,50', { currency: 'EUR', locale: 'de-DE' }).rows, [{ description: 'Beratung', qty_milli: 1500, unit: '', unitPrice_minor: 123450 }])
  assert.deepEqual(parseTabularRows('Kit\t2\t1.250', { currency: 'KWD', locale: 'en-US' }).rows[0].unitPrice_minor, 1250)
})

test('totals rows: exclusive tax, discount, shipping, payments', () => {
  const d = doc('invoice', {
    taxes: [vat()],
    lines: [line('a', 10000, 2000)],
    discount: { kind: 'percent', value: 100000 },
    shipping: { id: 's', label: 'Courier', amount_minor: 500, taxIds: [] },
    payments: [{ id: 'p', date: '2026-09-27', amount_minor: 5000, method: '', reference: '', note: '', source: '' }],
  })
  assert.deepEqual(rowsOf(d), [
    ['Subtotal', 20000, 'default'],
    ['Discount', -2000, 'default'],
    ['Courier', 500, 'default'],
    ['VAT (10%)', 1800, 'default'],
    ['Total', 20300, 'grand'],
    ['Paid', -5000, 'default'],
    ['Balance due', 15300, 'balance'],
  ])
})

test('totals rows: inclusive tax, withholding, deposits, credit notes, receipts, delivery notes', () => {
  const inclusive = doc('invoice', { taxes: [vat(200000)], lines: [line('a', 1200)], options: { ...createDocument('invoice').options, taxMode: 'inclusive' } })
  assert.deepEqual(rowsOf(inclusive), [
    ['Subtotal (incl. tax)', 1200, 'default'],
    ['Total', 1200, 'grand'],
    ['Includes VAT (20%)', 200, 'muted'],
    ['Balance due', 1200, 'balance'],
  ])

  const wht = doc('invoice', { taxes: [vat(150000), { id: 'wht', name: 'WHT', rate_micro: 50000, compound: false, withholding: true }], lines: [line('a', 100000, 1000, { taxIds: ['vat', 'wht'] })] })
  assert.deepEqual(rowsOf(wht).slice(2), [
    ['Total', 115000, 'grand'],
    ['Less WHT (5%)', -5000, 'default'],
    ['Amount payable', 110000, 'strong'],
    ['Balance due', 110000, 'balance'],
  ])

  const quote = doc('quotation', { taxes: [vat()], lines: [line('a', 10000)], deposit: { kind: 'percent', value: 300000, paidAmount_minor: 0, paidDate: null, method: '' } })
  assert.deepEqual(rowsOf(quote).slice(-1), [['Deposit due (30%)', 3300, 'strong']])

  assert.equal(rowsOf(doc('credit_note', { lines: [line('a', 500)] })).find((r) => r[2] === 'grand')[0], 'Total credit')
  const receipt = doc('receipt', { lines: [line('a', 500, 1000, { taxIds: [] })], payments: [{ id: 'p', date: null, amount_minor: 500, method: '', reference: '', note: '', source: '' }] })
  assert.deepEqual(rowsOf(receipt).slice(-2), [['Amount received', -500, 'default'], ['Balance due', 0, 'balance']])
  assert.deepEqual(rowsOf(doc('delivery_note', { lines: [line('a', 500)] })), [])
  assert.equal(paymentTermsLabel(0), 'Due on receipt')
  assert.equal(paymentTermsLabel(30), 'Net 30')
})

test('issue paths map to fields and sections', () => {
  assert.equal(fieldId('lines[2].qty_milli'), 'ds-f-lines-2-qty-milli')
  assert.deepEqual(fieldIdCandidates('lines[0].taxIds[1]'), ['lines[0].taxIds[1]', 'lines[0].taxIds', 'lines[0]', 'lines'].map(fieldId))
  assert.equal(sectionForPath('seller.name'), 'business')
  assert.equal(sectionForPath('client.email'), 'client')
  assert.equal(sectionForPath('shipTo.name'), 'client')
  assert.equal(sectionForPath('lines[3].description'), 'items')
  assert.equal(sectionForPath('taxes[0].rate_micro'), 'taxes')
  assert.equal(sectionForPath('discount.value'), 'taxes')
  assert.equal(sectionForPath('deposit.value'), 'payments')
  assert.equal(sectionForPath('payments[1].date'), 'payments')
  assert.equal(sectionForPath('dueDate'), 'details')
  assert.equal(sectionForPath('currency'), 'details')
})

test('accent contrast picks readable text', () => {
  assert.equal(onAccentColor('#0071e3'), '#ffffff')
  assert.equal(onAccentColor('#334155'), '#ffffff')
  assert.equal(onAccentColor('#fde047'), '#0f172a')
  assert.equal(onAccentColor('#ffffff'), '#0f172a')
})

test('new and duplicated documents', () => {
  const starter = createStarterDocument({
    type: 'quotation',
    number: 'QUO-2026-0004',
    preferences: { currency: 'EUR', locale: 'de-DE', accentColor: '#059669', paperSize: 'Letter', wordsSystem: 'indian' },
    businessDefault: { enabled: true, party: { name: 'Northwind', taxIdLabel: 'VAT No', taxId: 'DE123' } },
    now: NOW,
  })
  assert.deepEqual(
    [starter.type, starter.number, starter.currency, starter.locale, starter.appearance.accentColor, starter.appearance.paperSize, starter.options.wordsSystem, starter.seller.name, starter.seller.taxIdLabel, starter.validUntil],
    ['quotation', 'QUO-2026-0004', 'EUR', 'de-DE', '#059669', 'Letter', 'indian', 'Northwind', 'VAT No', '2026-10-27'],
  )
  assert.equal(createStarterDocument({ businessDefault: { enabled: false, party: { name: 'Hidden' } }, now: NOW }).seller.name, '')

  const source = { ...createSampleDocument(NOW), status: 'paid' }
  const copy = duplicateDocument(source, { number: 'INV-2026-0009', now: new Date(2026, 9, 1) })
  assert.notEqual(copy.id, source.id)
  assert.deepEqual([copy.number, copy.status, copy.issueDate, copy.dueDate, copy.payments], ['INV-2026-0009', 'draft', '2026-10-01', '2026-10-15', []])
  assert.equal(copy.lines.length, source.lines.length)
})

test('reducer: setType in place keeps data, fixes status and dates; appearance is validated', () => {
  let state = { ...createSampleDocument(NOW), status: 'partially_paid' }
  state = documentReducer(state, documentActions.setType('quotation', 'QUO-2026-0001'))
  assert.deepEqual([state.type, state.number, state.status, state.validUntil], ['quotation', 'QUO-2026-0001', 'draft', '2026-10-27'])
  assert.equal(state.payments.length, 1, 'hidden fields are kept, just ignored')
  assert.equal(calculateDocument(state).paymentsTotal, 0)
  state = documentReducer(state, documentActions.setType('invoice'))
  assert.equal(calculateDocument(state).paymentsTotal, 150000, 'switching back restores them')
  assert.equal(documentReducer(state, documentActions.setType('nope')), state)

  state = documentReducer(state, documentActions.setAppearance({ accentColor: 'red; background:url(x)', paperSize: 'Tabloid' }))
  assert.deepEqual(state.appearance, { accentColor: '#0071e3', paperSize: 'A4', letterhead: null })
  state = documentReducer(state, documentActions.setAppearance({ accentColor: '#E11D48', paperSize: 'Letter' }))
  assert.deepEqual(state.appearance, { accentColor: '#e11d48', paperSize: 'Letter', letterhead: null })
})

test('sample invoice is valid and realistic', () => {
  const sample = createSampleDocument(NOW)
  assert.deepEqual(validateDocument(sample).filter((i) => i.severity === 'error'), [])
  const t = calculateDocument(sample)
  assert.deepEqual(t.warnings, [])
  assert.equal(t.itemsGross, 185000 + 420000 + 78000 + 18000)
  assert.equal(t.lineDiscountTotal, 1800)
  assert.equal(t.taxTotal, 54640) // 8 % of 683,000 (hosting is untaxed)
  assert.equal(t.total, 753840)
  assert.equal(t.balanceDue, 603840)
  assert.equal(sample.number, 'INV-2026-0001')
})

test('receipts default to thermal paper; the thermal choice is remembered separately', () => {
  assert.equal(createDocument('receipt', { now: NOW }).appearance.paperSize, 'Thermal80')
  assert.equal(createDocument('receipt', { now: NOW, appearance: { paperSize: 'Thermal58' } }).appearance.paperSize, 'Thermal58')
  assert.equal(createDocument('receipt', { now: NOW, appearance: { paperSize: 'A4' } }).appearance.paperSize, 'Thermal80')
  assert.equal(createDocument('invoice', { now: NOW }).appearance.paperSize, 'A4')
  const receipt = convertDocument(createSampleDocument(NOW), 'receipt', { now: NOW })
  assert.equal(receipt.appearance.paperSize, 'Thermal80')

  const afterReceipt = preferencesFromDocument({ ...receipt, appearance: { ...receipt.appearance, paperSize: 'Thermal58' } }, { paperSize: 'Letter' })
  assert.deepEqual([afterReceipt.paperSize, afterReceipt.receiptPaperSize], ['Letter', 'Thermal58'])
  assert.equal(createStarterDocument({ type: 'invoice', preferences: afterReceipt, now: NOW }).appearance.paperSize, 'Letter')
  assert.equal(createStarterDocument({ type: 'receipt', preferences: afterReceipt, now: NOW }).appearance.paperSize, 'Thermal58')
  assert.equal(resolveLayout(receipt).kind, 'receipt')
  assert.equal(resolveLayout({ ...receipt, appearance: { paperSize: 'A4' }, templateId: 'minimal' }).spec.id, 'minimal')
})

test('paper model: one source of content for HTML and PDF', () => {
  const doc = { ...createSampleDocument(NOW), status: 'paid' }
  const totals = calculateDocument(doc)
  const model = buildPaperModel(doc, totals, { amountWords: 'Words' })
  assert.equal(model.title, 'Invoice')
  assert.deepEqual(model.columns.map((c) => c.key), ['index', 'description', 'qty', 'unit', 'price', 'discount', 'amount'])
  assert.deepEqual(model.rows[3].cells, { index: '4', description: 'Managed hosting', qty: '12', unit: 'months', price: '$15.00', discount: '-$18.00', amount: '$162.00' })
  assert.deepEqual(model.totals.find((r) => r.key === 'total'), { key: 'total', label: 'Total', amount: 753840, tone: 'grand', value: '$7,538.40' })
  assert.equal(model.stamp.label, 'Paid')
  assert.deepEqual(model.receipt.items[2], { name: 'Copywriting', detail: '12 hrs × $65.00', total: '$780.00', discount: '' })
  assert.equal(model.words, 'Words')
  const codes = buildPaperModel({ ...doc, currency: 'EUR', locale: 'de-DE' }, calculateDocument({ ...doc, currency: 'EUR', locale: 'de-DE' }), { currencyDisplay: 'code' })
  assert.match(codes.totals.find((r) => r.key === 'total').value, /EUR/)
})

// ── Step 3A: wizard flow helpers, simple tax, letterhead ─────────────────────

test('wizard start: first visit → step 1, returning business → step 2', () => {
  assert.deepEqual(initialView({ businessDefault: null }), { view: 'wizard', step: 1 })
  assert.deepEqual(initialView({ businessDefault: { enabled: false, party: { name: 'Northwind' } } }), { view: 'wizard', step: 1 })
  assert.deepEqual(initialView({ businessDefault: { enabled: true, party: { name: 'Northwind' } } }), { view: 'wizard', step: 2 })
  assert.deepEqual(initialView({ businessDefault: { enabled: true, party: { name: '' }, letterhead: { imageAssetId: 'lh' } } }), { view: 'wizard', step: 2 }, 'a letterhead alone is enough')
  assert.equal(isReturningBusiness({ enabled: true, party: { name: '', logoAssetId: '' }, letterhead: null }), false)
})

test('starter document: one empty row, remembered business and letterhead', () => {
  const letterhead = { imageAssetId: 'lh-1', pdfAssetId: 'pdf-1', topMm: 52 }
  const doc = createStarterDocument({ businessDefault: { enabled: true, party: { name: 'Harbor' }, letterhead }, now: NOW })
  assert.equal(doc.lines.length, 1)
  assert.equal(doc.seller.name, 'Harbor')
  assert.equal(doc.appearance.letterhead.imageAssetId, 'lh-1')
  assert.equal(doc.appearance.letterhead.topMm, 52)
  assert.equal(doc.appearance.letterhead.hideBusinessHeader, true)
  assert.equal(createStarterDocument({ now: NOW }).appearance.letterhead, null)
})

test('asCreated: design previews show the issued status, never the DRAFT stamp', () => {
  const draft = createStarterDocument({ now: NOW })
  assert.equal(draft.status, 'draft')
  assert.equal(asCreated(draft).status, 'sent')
  assert.equal(asCreated({ ...draft, type: 'delivery_note' }).status, 'dispatched')
  const paid = { ...draft, status: 'paid' }
  assert.equal(asCreated(paid), paid)
})

test('simple tax: one rate on every line; 0 removes it; new lines inherit it', () => {
  let doc = createStarterDocument({ now: NOW })
  doc = documentReducer(doc, documentActions.updateLine(doc.lines[0].id, { description: 'Design', unitPrice_minor: 10000, qty_milli: 1000 }))
  doc = documentReducer(doc, documentActions.setSimpleTax(180000))
  assert.equal(doc.taxes.length, 1)
  assert.equal(doc.taxes[0].name, 'Tax')
  assert.deepEqual(doc.lines[0].taxIds, [doc.taxes[0].id])
  assert.equal(calculateDocument(doc).total, 11800)
  assert.deepEqual(taxIdsForNewLine(doc), [doc.taxes[0].id])
  doc = documentReducer(doc, documentActions.addLine({ description: 'Hosting', unitPrice_minor: 5000, taxIds: taxIdsForNewLine(doc) }))
  doc = documentReducer(doc, documentActions.setSimpleTax(50000))
  assert.equal(doc.taxes.length, 1, 'edits the same tax')
  assert.equal(calculateDocument(doc).total, 15750)
  assert.equal(primaryTax(doc).rate_micro, 50000)
  doc = documentReducer(doc, documentActions.setSimpleTax(0))
  assert.equal(doc.taxes.length, 0)
  assert.ok(doc.lines.every((l) => l.taxIds.length === 0), 'references removed too')
  // A withholding / compound tax from "More options" is left alone.
  doc = documentReducer(doc, documentActions.addTax({ name: 'WHT', rate_micro: 20000, withholding: true }))
  doc = documentReducer(doc, documentActions.setSimpleTax(100000))
  assert.equal(doc.taxes.length, 2)
  assert.equal(primaryTax(doc).name, 'Tax')
})

test('letterhead: normalized and clamped; setLetterhead merges; null removes', () => {
  assert.equal(normalizeAppearance({}).letterhead, null)
  assert.equal(normalizeAppearance({ letterhead: { topMm: 40 } }).letterhead, null, 'needs an image')
  const lh = normalizeAppearance({ letterhead: { imageAssetId: 'a', topMm: 999, bottomMm: -5, leftMm: '12.26', pages: 'odd', hideBusinessHeader: 'yes' } }).letterhead
  assert.deepEqual(lh, { imageAssetId: 'a', pdfAssetId: '', widthPx: 0, heightPx: 0, topMm: 150, bottomMm: 0, leftMm: 12.5, rightMm: 18, hideBusinessHeader: false, pages: 'all', preprinted: false })
  assert.equal(normalizeAppearance({ letterhead: { imageAssetId: 'a', widthPx: 2480.4, heightPx: -3 } }).letterhead.widthPx, 2480)
  let doc = createStarterDocument({ now: NOW })
  doc = documentReducer(doc, documentActions.setLetterhead({ imageAssetId: 'img', pdfAssetId: 'pdf' }))
  assert.equal(doc.appearance.letterhead.topMm, 45)
  doc = documentReducer(doc, documentActions.setLetterhead({ topMm: 60, pages: 'first' }))
  assert.deepEqual([doc.appearance.letterhead.imageAssetId, doc.appearance.letterhead.topMm, doc.appearance.letterhead.pages], ['img', 60, 'first'])
  doc = documentReducer(doc, documentActions.setLetterhead(null))
  assert.equal(doc.appearance.letterhead, null)
  // Survives the save / share-link round trip.
  const withLh = documentReducer(createStarterDocument({ now: NOW }), documentActions.setLetterhead({ imageAssetId: 'img' }))
  assert.deepEqual(deserializeDocument(serializeDocument(withLh)).document.appearance.letterhead, withLh.appearance.letterhead)
})

test('landing-page presets: letterhead page opens at step 1, a preset paper overrides the remembered one', () => {
  const business = { enabled: true, party: { name: 'Northwind' }, letterhead: null }
  assert.deepEqual(initialView({ businessDefault: business }), { view: 'wizard', step: 2 })
  assert.deepEqual(initialView({ businessDefault: business, preset: { brandMode: 'letterhead' } }), { view: 'wizard', step: 1 })
  const prefs = { receiptPaperSize: 'Thermal80', paperSize: 'A4' }
  assert.equal(createStarterDocument({ type: 'receipt', preferences: prefs, now: NOW }).appearance.paperSize, 'Thermal80')
  assert.equal(createStarterDocument({ type: 'receipt', preferences: prefs, paperSize: 'Thermal58', now: NOW }).appearance.paperSize, 'Thermal58')
  assert.equal(createStarterDocument({ type: 'quotation', now: NOW }).type, 'quotation')
})

test('pre-printed letterhead: kept in the layout (safe area), flagged so print and PDF leave the image out', () => {
  const lh = normalizeAppearance({ letterhead: { imageAssetId: 'a', preprinted: true } }).letterhead
  assert.equal(lh.preprinted, true)
  assert.equal(normalizeAppearance({ letterhead: { imageAssetId: 'a' } }).letterhead.preprinted, false, 'off by default')
  assert.equal(normalizeAppearance({ letterhead: { imageAssetId: 'a', preprinted: 'yes' } }).letterhead.preprinted, false, 'booleans only')
  const layout = resolveLayout({ ...createDocument('invoice', { now: NOW }), appearance: { ...createDocument('invoice', { now: NOW }).appearance, letterhead: lh } })
  assert.equal(layout.spec.letterhead.preprinted, true)
  assert.equal(layout.spec.letterhead.topMm, 45, 'the safe area still applies')
})
