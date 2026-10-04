/**
 * Docs Studio Phase 1 — signature & company stamp, "How to pay" block with
 * payment QR codes, document title override and country presets
 * (US / UK / UAE / India / Pakistan).
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import {
  amountInWords, calculateDocument, createDocument, normalizeDocument, normalizePaymentDetails, normalizeSignoff,
} from '../src/tools/docs-studio/engine/index.js'
import { epcPayload, paymentQrPayload, upiPayload } from '../src/tools/docs-studio/engine/paymentQr.js'
import { fontsFromBytes } from '../src/tools/docs-studio/pdf/fonts.js'
import { renderPdf } from '../src/tools/docs-studio/pdf/renderPdf.js'
import { createSampleDocument } from '../src/tools/docs-studio/sample.js'
import { documentActions, documentReducer } from '../src/tools/docs-studio/state/documentReducer.js'
import { createMemoryBackend } from '../src/tools/docs-studio/storage/backends.js'
import { SETTING_KEYS, assetIdsOf, createRepository } from '../src/tools/docs-studio/storage/repository.js'
import { buildPaperModel } from '../src/tools/docs-studio/templates/paperModel.js'
import { qrMatrix } from '../src/tools/docs-studio/templates/qr.js'
import { resolveLayout } from '../src/tools/docs-studio/templates/specs.js'
import { REGION_PRESETS, normalizeRegion, regionChanges, withRegion } from '../src/tools/docs-studio/ui/regionPresets.js'
import { documentForShareLink, hasLocalDesignAssets } from '../src/tools/docs-studio/ui/share.js'
import { createStarterDocument, preferencesFromDocument } from '../src/tools/docs-studio/ui/starter.js'
import { readPdf } from './helpers/pdfReader.mjs'

const NOW = new Date(2026, 8, 27)
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
const FONTS = fontsFromBytes(
  new Uint8Array(readFileSync(new URL('../public/fonts/NotoSans-Regular.subset.ttf', import.meta.url))),
  new Uint8Array(readFileSync(new URL('../public/fonts/NotoSans-Bold.subset.ttf', import.meta.url))),
)

const PAYMENT = {
  bankName: 'Barclays', accountName: 'Northwind Studio Ltd', accountNumber: '12345678',
  bankCodeLabel: 'Sort code', bankCode: '20-00-00', walletLabel: 'PayPal', walletId: 'pay@northwind.studio',
  link: 'https://paypal.me/northwind', instructions: 'Quote the invoice number as reference.', qr: 'link',
}
const SIGNOFF = { signatureAssetId: 'sig1', sealAssetId: 'seal1', name: 'Maya Chen', title: 'Director', label: '' }

function sample(overrides = {}) {
  return normalizeDocument({ ...createSampleDocument(NOW), ...overrides })
}

function model(doc) {
  const totals = calculateDocument(doc)
  return buildPaperModel(doc, totals, { amountWords: amountInWords(totals.amountPayable, doc.currency) })
}

// ── Model ──

test('signoff and payment normalize, drop empty values and unsafe links', () => {
  assert.equal(normalizeSignoff({}), null)
  assert.equal(normalizeSignoff({ label: 'Signed' }), null, 'a caption alone is not a signature block')
  assert.deepEqual(normalizeSignoff({ name: 'A', extra: 'x' }), { signatureAssetId: '', sealAssetId: '', name: 'A', title: '', label: '' })
  assert.equal(normalizePaymentDetails({ qr: 'link' }), null, 'a QR kind without details is nothing')
  const p = normalizePaymentDetails({ link: 'javascript:alert(1)', bankName: 'X', qr: 'bogus' })
  assert.equal(p.link, '')
  assert.equal(p.qr, 'none')
  assert.equal(normalizePaymentDetails({ link: 'https://pay.example/x' }).link, 'https://pay.example/x')
  const doc = createDocument('invoice', { now: NOW, signoff: SIGNOFF, payment: PAYMENT, titleOverride: 'Tax Invoice' })
  assert.equal(doc.signoff.name, 'Maya Chen')
  assert.equal(doc.payment.bankCode, '20-00-00')
  assert.equal(doc.titleOverride, 'Tax Invoice')
})

// ── QR payloads ──

test('UPI payload: valid VPA, INR amount only, otherwise empty', () => {
  const url = upiPayload({ vpa: 'shop@okicici', name: 'Shop', amountMinor: 123450, currency: 'INR', note: 'INV-1' })
  assert.match(url, /^upi:\/\/pay\?/)
  const params = new URLSearchParams(url.split('?')[1])
  assert.equal(params.get('pa'), 'shop@okicici')
  assert.equal(params.get('am'), '1234.50')
  assert.equal(params.get('cu'), 'INR')
  assert.equal(new URLSearchParams(upiPayload({ vpa: 'shop@okicici', amountMinor: 500, currency: 'USD' }).split('?')[1]).get('am'), null)
  assert.equal(upiPayload({ vpa: 'not a vpa' }), '')
})

test('EPC (SEPA) payload: EUR + IBAN + name required, BCD format', () => {
  const lines = epcPayload({ iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX', name: 'Northwind', amountMinor: 10050, currency: 'EUR', remittance: 'INV-7' }).split('\n')
  assert.deepEqual(lines.slice(0, 4), ['BCD', '002', '1', 'SCT'])
  assert.equal(lines[6], 'DE89370400440532013000')
  assert.equal(lines[7], 'EUR100.50')
  assert.equal(lines[10], 'INV-7')
  assert.equal(epcPayload({ iban: 'DE89370400440532013000', name: 'N', currency: 'USD' }), '')
})

test('payment QR never carries a non-web link', () => {
  const doc = { currency: 'USD', seller: {}, number: '1', payment: { qr: 'link', link: 'javascript:alert(1)' } }
  assert.equal(paymentQrPayload(doc, { balanceDue: 100 }), '')
  assert.equal(paymentQrPayload({ ...doc, payment: { qr: 'link', link: 'https://x.test/p' } }, {}), 'https://x.test/p')
  assert.equal(paymentQrPayload({ ...doc, payment: { qr: 'text', qrText: 'Raast 0300' } }, {}), 'Raast 0300')
})

test('QR matrix is square and has the finder pattern', () => {
  const m = qrMatrix('https://paypal.me/northwind')
  assert.ok(m.size >= 21)
  assert.equal(m.cells.length, m.size * m.size)
  assert.equal(m.cells[0], true, 'top-left finder corner is dark')
})

// ── Paper model (shared by the HTML preview and the PDF) ──

test('paper model: payment rows, QR, signoff and title override', () => {
  const m = model(sample({ payment: PAYMENT, signoff: SIGNOFF, titleOverride: 'VAT Invoice' }))
  assert.equal(m.title, 'VAT Invoice')
  const rows = Object.fromEntries(m.payment.rows.map((r) => [r.label, r.value]))
  assert.equal(rows.Bank, 'Barclays')
  assert.equal(rows['Sort code'], '20-00-00')
  assert.equal(rows.PayPal, 'pay@northwind.studio')
  assert.equal(rows['Pay online'], 'https://paypal.me/northwind')
  assert.ok(m.payment.qr && m.payment.qr.size > 0)
  assert.equal(m.payment.qrCaption, 'Scan to pay online')
  assert.deepEqual(m.signoff, { label: 'Authorised signature', name: 'Maya Chen', title: 'Director', hasSignature: true, hasSeal: true })
})

test('paper model: nothing extra when unset; receipts have no signature line', () => {
  const plain = model(sample())
  assert.equal(plain.payment, null)
  assert.equal(plain.signoff, null)
  assert.equal(plain.title, 'Invoice')
  const receipt = model(normalizeDocument({ ...createDocument('receipt', { now: NOW }), signoff: SIGNOFF }))
  assert.equal(receipt.signoff, null)
})

// ── PDF ──

test('PDF draws payment details, QR, signatory and both images', () => {
  const doc = sample({ payment: PAYMENT, signoff: SIGNOFF, titleOverride: 'Tax Invoice' })
  const pdfDoc = renderPdf({
    jsPDF, autoTable, model: model(doc), layout: resolveLayout(doc), fonts: FONTS, compress: false,
    signature: { dataUrl: PNG_1PX, width: 300, height: 100, format: 'PNG' },
    seal: { dataUrl: PNG_1PX, width: 200, height: 200, format: 'PNG' },
  })
  const pdf = readPdf(pdfDoc.output())
  const text = pdf.text.replace(/\s+/g, ' ')
  for (const needle of ['Payment details', 'Barclays', '20-00-00', 'Sort code', 'Scan to pay online', 'Maya Chen', 'Director', 'Tax Invoice']) {
    assert.ok(text.toLowerCase().includes(needle.toLowerCase()), `missing "${needle}"`)
  }
  assert.ok(pdf.imageCount >= 1, 'signature / seal images embedded')
})

test('PDF without payment/signoff is unchanged in content', () => {
  const doc = sample()
  const pdf = readPdf(renderPdf({ jsPDF, autoTable, model: model(doc), layout: resolveLayout(doc), fonts: FONTS, compress: false }).output())
  assert.ok(!pdf.text.includes('Payment details'))
  assert.ok(!pdf.text.includes('Authorised signature'))
})

// ── Storage & sharing ──

test('signature and seal images are tracked as assets and stay off share links', () => {
  const doc = sample({ signoff: SIGNOFF })
  const ids = assetIdsOf(doc)
  assert.ok(ids.has('sig1') && ids.has('seal1'))
  assert.equal(hasLocalDesignAssets(doc), true)
  const shared = documentForShareLink(doc)
  assert.equal(shared.signoff.signatureAssetId, '')
  assert.equal(shared.signoff.sealAssetId, '')
  assert.equal(shared.signoff.name, 'Maya Chen')
})

test('switching document type clears the title override', () => {
  const doc = sample({ titleOverride: 'Tax Invoice' })
  const next = documentReducer(doc, documentActions.setType('quotation'))
  assert.equal(next.titleOverride, '')
})

// ── Country presets ──

test('five presets: US, UK, UAE, India, Pakistan', () => {
  assert.deepEqual(REGION_PRESETS.map((p) => p.code), ['US', 'GB', 'AE', 'IN', 'PK'])
  assert.equal(normalizeRegion({ code: 'XX' }), null)
  assert.deepEqual(normalizeRegion({ code: 'US', registered: true }), { code: 'US', registered: false }, 'US has no registered toggle')
})

test('UAE registered → Tax Invoice, TRN labels, VAT 5%; not registered → plain Invoice, no tax', () => {
  const doc = sample({ taxes: [], lines: createSampleDocument(NOW).lines.map((l) => ({ ...l, taxIds: [] })) })
  const yes = regionChanges(doc, { code: 'AE', registered: true })
  assert.equal(yes.currency, 'AED')
  assert.equal(yes.titleOverride, 'Tax Invoice')
  assert.deepEqual(yes.seller, { taxIdLabel: 'TRN' })
  assert.deepEqual(yes.tax, { name: 'VAT', rate_micro: 50000 })
  const no = regionChanges(doc, { code: 'AE', registered: false })
  assert.equal(no.titleOverride, '')
  assert.equal(no.tax, null)
})

test('presets keep a custom tax label and a custom title the person typed', () => {
  const doc = sample({ titleOverride: 'Commercial Invoice', seller: { ...createSampleDocument(NOW).seller, taxIdLabel: 'Company No' } })
  const changes = regionChanges(doc, { code: 'GB', registered: true })
  assert.equal(changes.titleOverride, null)
  assert.equal(changes.seller, null)
  assert.equal(regionChanges({ ...doc, type: 'quotation', titleOverride: '' }, { code: 'GB', registered: true }).titleOverride, null, 'titles are for invoices only')
})

test('new documents start with the remembered region (India: GST line on every row)', () => {
  const prefs = { currency: 'INR', locale: 'en-IN', wordsSystem: 'indian', region: { code: 'IN', registered: true } }
  const doc = normalizeDocument(createStarterDocument({ type: 'invoice', preferences: prefs, now: NOW }))
  assert.equal(doc.titleOverride, 'Tax Invoice')
  assert.equal(doc.taxes.length, 1)
  assert.equal(doc.taxes[0].name, 'GST')
  assert.ok(doc.lines.every((l) => l.taxIds.includes(doc.taxes[0].id)))
  const quote = createStarterDocument({ type: 'quotation', preferences: prefs, now: NOW })
  assert.equal(quote.titleOverride || '', '')
  assert.deepEqual(preferencesFromDocument(doc, prefs).region, { code: 'IN', registered: true })
  assert.equal(withRegion(doc, null), doc)
})

test('business profile signoff + payment carry into new documents', () => {
  const doc = createStarterDocument({ type: 'invoice', businessDefault: { enabled: true, party: { name: 'Northwind' }, signoff: SIGNOFF, payment: PAYMENT }, now: NOW })
  assert.equal(doc.signoff.name, 'Maya Chen')
  assert.equal(doc.payment.bankName, 'Barclays')
})

test('saved settings keep the business signoff/payment and the country preset', async () => {
  const repo = createRepository(createMemoryBackend())
  await repo.setSetting(SETTING_KEYS.businessDefault, { enabled: true, party: { name: 'Northwind' }, letterhead: null, signoff: SIGNOFF, payment: { ...PAYMENT, link: 'javascript:x' } })
  const business = await repo.getSetting(SETTING_KEYS.businessDefault, null)
  assert.equal(business.signoff.name, 'Maya Chen')
  assert.equal(business.signoff.sealAssetId, 'seal1')
  assert.equal(business.payment.bankName, 'Barclays')
  assert.equal(business.payment.link, '', 'unsafe link dropped on save')
  await repo.setSetting(SETTING_KEYS.preferences, { currency: 'AED', region: { code: 'AE', registered: true } })
  assert.deepEqual((await repo.getSetting(SETTING_KEYS.preferences, null)).region, { code: 'AE', registered: true })
  await repo.setSetting(SETTING_KEYS.preferences, { region: { code: 'ZZ' } })
  assert.equal((await repo.getSetting(SETTING_KEYS.preferences, null)).region, null)
})

test('a saved document keeps its signoff, payment and title', async () => {
  const repo = createRepository(createMemoryBackend())
  const doc = createDocument('invoice', { now: NOW, signoff: SIGNOFF, payment: PAYMENT, titleOverride: 'Tax Invoice' })
  await repo.saveDocument(doc)
  const { ok, document: back } = await repo.getDocument(doc.id)
  assert.equal(ok, true)
  assert.equal(back.titleOverride, 'Tax Invoice')
  assert.equal(back.signoff.signatureAssetId, 'sig1')
  assert.equal(back.payment.bankCode, '20-00-00')
})
