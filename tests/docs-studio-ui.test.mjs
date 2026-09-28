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

import { calculateDocument, convertDocument, createDocument, validateDocument } from '../src/tools/docs-studio/engine/index.js'
import { buildPaperModel } from '../src/tools/docs-studio/templates/paperModel.js'
import { resolveLayout } from '../src/tools/docs-studio/templates/specs.js'
import { preferencesFromDocument } from '../src/tools/docs-studio/ui/starter.js'
import { isTabularText, parseTabularRows } from '../src/tools/docs-studio/io/pasteRows.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import { documentActions, documentReducer } from '../src/tools/docs-studio/state/documentReducer.js'
import { onAccentColor } from '../src/tools/docs-studio/templates/color.js'
import { buildTotalsRows, paymentTermsLabel } from '../src/tools/docs-studio/templates/summary.js'
import { fieldId, fieldIdCandidates, sectionForPath } from '../src/tools/docs-studio/ui/issues.js'
import { createStarterDocument, duplicateDocument } from '../src/tools/docs-studio/ui/starter.js'

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
  assert.deepEqual(state.appearance, { accentColor: '#0071e3', paperSize: 'A4' })
  state = documentReducer(state, documentActions.setAppearance({ accentColor: '#E11D48', paperSize: 'Letter' }))
  assert.deepEqual(state.appearance, { accentColor: '#e11d48', paperSize: 'Letter' })
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
