/**
 * The Docs Studio document model: one shape for all seven document types.
 *
 * Money is stored as integer minor units, quantities as qty × 1000 and rates
 * as fraction × 1 000 000 (see money.js). Dates are ISO calendar strings (see
 * dates.js). Nothing computed is stored: totals always come from
 * calculateDocument().
 */

import { currencyExponent } from './currency.js'
import { addDays, dueDateFromTerms, isIsoDate, todayIso } from './dates.js'
import { getDocumentType } from './documentTypes.js'
import { roundDiv } from './money.js'

export const SCHEMA_VERSION = 1

/**
 * @typedef {object} Party
 * @property {string} name
 * @property {string} company
 * @property {string} address     multi-line
 * @property {string} email
 * @property {string} phone
 * @property {string} taxIdLabel  shown before taxId: "VAT No", "GST No", "NTN", "EIN", "TRN"…
 * @property {string} taxId
 * @property {string} website
 * @property {string} logoAssetId id of a logo in the asset store ('' = none)
 */

/**
 * @typedef {object} Discount
 * @property {'percent' | 'amount'} kind
 * @property {number} value   rate_micro for 'percent', minor units for 'amount'
 */

/**
 * @typedef {object} LineItem
 * @property {string} id
 * @property {string} description
 * @property {string} sku
 * @property {string} unit
 * @property {number} qty_milli
 * @property {number} unitPrice_minor   net or gross per options.taxMode
 * @property {Discount | null} discount applies to the line amount, not per unit
 * @property {string[]} taxIds
 */

/**
 * @typedef {object} Tax
 * @property {string} id
 * @property {string} name
 * @property {number} rate_micro   0 … 1 000 000 (0–100 %)
 * @property {boolean} compound    levied on base + the line's non-compound taxes
 * @property {boolean} withholding deducted from the amount payable, not added to the total
 */

/**
 * @typedef {object} Charge  shipping or an extra fee (never discounted)
 * @property {string} id
 * @property {string} label
 * @property {number} amount_minor
 * @property {string[]} taxIds
 */

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string | null} date
 * @property {number} amount_minor
 * @property {string} method
 * @property {string} reference
 * @property {string} note
 * @property {'' | 'deposit'} source  'deposit': carried over from a quotation/proforma deposit
 */

/**
 * @typedef {object} Deposit  requested on quotations / proformas
 * @property {'percent' | 'amount'} kind
 * @property {number} value            rate_micro (of the amount payable) or minor units
 * @property {number} paidAmount_minor deposit already received
 * @property {string | null} paidDate
 * @property {string} method
 */

/**
 * @typedef {object} DocumentOptions
 * @property {'exclusive' | 'inclusive'} taxMode  inclusive: prices already contain tax
 * @property {'line' | 'document'} taxRounding     round each line's tax, or each tax once per document
 * @property {'half_up' | 'half_even'} roundingMode
 * @property {number} cashRoundingIncrement_minor  0 = off; 5 = CHF 0.05
 * @property {boolean} showAmountInWords
 * @property {'western' | 'indian'} wordsSystem
 * @property {string} wordsLanguage
 */

/**
 * @typedef {object} Letterhead  the visitor's own letterhead drawn behind page templates
 * @property {string} imageAssetId  rendered page image (PNG/JPEG) in the asset store
 * @property {string} pdfAssetId    original PDF bytes when uploaded as a PDF ('' otherwise)
 * @property {number} widthPx       rendered image size (its aspect ratio decides fill vs fit; 0 = unknown → fill)
 * @property {number} heightPx
 * @property {number} topMm         safe area: content never goes above/below/beside these
 * @property {number} bottomMm
 * @property {number} leftMm
 * @property {number} rightMm
 * @property {boolean} hideBusinessHeader  the letterhead already shows the business
 * @property {'all' | 'first'} pages
 * @property {boolean} preprinted  the paper already carries the letterhead: it is
 *   shown on screen for positioning but left out of printing and PDF downloads
 */

/**
 * @typedef {object} Appearance
 * @property {string} accentColor  #rrggbb
 * @property {'A4' | 'Letter' | 'Thermal80' | 'Thermal58'} paperSize  thermal sizes render the receipt template
 * @property {Letterhead | null} letterhead
 */

/**
 * @typedef {object} DocsDocument
 * @property {number} schemaVersion
 * @property {string} id
 * @property {string} type           key of DOCUMENT_TYPES
 * @property {string} number
 * @property {string} status
 * @property {string | null} issueDate
 * @property {string | null} dueDate
 * @property {string | null} validUntil
 * @property {string | null} deliveryDate
 * @property {number | null} paymentTermsDays
 * @property {string} currency       ISO 4217
 * @property {string} locale         BCP 47, independent of currency
 * @property {Party} seller          the issuer ("from")
 * @property {Party} client          the counterparty ("to")
 * @property {Party | null} shipTo
 * @property {string} reference      e.g. the customer's PO number
 * @property {LineItem[]} lines
 * @property {Tax[]} taxes
 * @property {Discount | null} discount  document-level, before tax, items only
 * @property {Charge | null} shipping
 * @property {Charge[]} fees
 * @property {Payment[]} payments
 * @property {Deposit | null} deposit
 * @property {string} reason
 * @property {string} notes
 * @property {string} terms
 * @property {string} footer
 * @property {string} templateId
 * @property {Appearance} appearance
 * @property {DocumentOptions} options
 * @property {string} titleOverride  document title shown instead of the type label ('' = type label), e.g. "Tax Invoice"
 * @property {Signoff | null} signoff
 * @property {PaymentDetails | null} payment
 * @property {string} sourceDocId    set by convertDocument
 * @property {string} sourceNumber
 * @property {string} sourceType
 */

/**
 * @typedef {object} Signoff  signature and company stamp/seal at the end of page documents
 * @property {string} signatureAssetId  image in the asset store ('' = none)
 * @property {string} sealAssetId       company stamp / seal image ('' = none)
 * @property {string} name              signatory name
 * @property {string} title             e.g. "Director"
 * @property {string} label             caption above the line ('' = "Authorised signature")
 */

/**
 * @typedef {object} PaymentDetails  how the client can pay (printed on the document)
 * @property {string} bankName
 * @property {string} accountName
 * @property {string} accountNumber
 * @property {string} iban
 * @property {string} swift          SWIFT / BIC
 * @property {string} bankCodeLabel  "Routing no." (US), "Sort code" (UK), "IFSC" (IN)…
 * @property {string} bankCode
 * @property {string} walletLabel    "JazzCash", "Easypaisa", "Raast ID", "PayPal", "UPI ID"…
 * @property {string} walletId
 * @property {string} link           payment URL (PayPal.me, Wise, Stripe…)
 * @property {string} instructions   free text
 * @property {'none' | 'link' | 'upi' | 'epc' | 'text'} qr  what the QR code holds
 * @property {string} qrText         content for qr 'text'
 */

export const LIMITS = Object.freeze({
  lines: 500,
  taxes: 20,
  fees: 20,
  payments: 200,
  shortText: 500,
  longText: 5000,
})

export const DEFAULT_APPEARANCE = Object.freeze({
  accentColor: '#0071e3',
  paperSize: 'A4',
  letterhead: null,
})

/** Safe-area limits and defaults for letterheads, in mm. */
export const LETTERHEAD_LIMITS = Object.freeze({ topMm: [0, 150], bottomMm: [0, 120], leftMm: [0, 60], rightMm: [0, 60] })
export const LETTERHEAD_DEFAULTS = Object.freeze({ topMm: 45, bottomMm: 25, leftMm: 18, rightMm: 18, hideBusinessHeader: true, pages: 'all', preprinted: false })

export const PAPER_SIZES = Object.freeze(['A4', 'Letter', 'Thermal80', 'Thermal58'])
export const THERMAL_PAPER_SIZES = Object.freeze(['Thermal80', 'Thermal58'])

export const DEFAULT_OPTIONS = Object.freeze({
  taxMode: 'exclusive',
  taxRounding: 'line',
  roundingMode: 'half_up',
  cashRoundingIncrement_minor: 0,
  showAmountInWords: false,
  wordsSystem: 'western',
  wordsLanguage: 'en',
})

/** A random id: crypto.randomUUID where available, else a random fallback. */
export function generateId() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

// ── Coercion helpers (never throw) ───────────────────────────────────────────

function str(value, max = LIMITS.shortText) {
  if (typeof value === 'string') return value.slice(0, max)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, max)
  return ''
}

function int(value, fallback = 0) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  const rounded = Math.round(n)
  return Number.isSafeInteger(rounded) ? rounded : fallback
}

function nullableInt(value) {
  return value === null || value === undefined || value === '' ? null : int(value, null)
}

function bool(value) {
  return value === true
}

function isoOrNull(value) {
  return isIsoDate(value) ? value : null
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function arr(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : []
}

function obj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function idOf(value) {
  const id = str(value, 100)
  return id || generateId()
}

function canonicalLocale(value, fallback = 'en-US') {
  try {
    return (typeof value === 'string' && value && Intl.getCanonicalLocales(value)[0]) || fallback
  } catch {
    return fallback
  }
}

export const PAYMENT_QR_KINDS = Object.freeze(['none', 'link', 'upi', 'epc', 'text'])

// ── Normalizers: arbitrary input → well-formed model objects ────────────────

/** @returns {Party} */
export function normalizeParty(raw) {
  const p = obj(raw)
  return {
    name: str(p.name),
    company: str(p.company),
    address: str(p.address, 2000),
    email: str(p.email),
    phone: str(p.phone),
    taxIdLabel: str(p.taxIdLabel, 40),
    taxId: str(p.taxId),
    website: str(p.website),
    logoAssetId: str(p.logoAssetId, 100),
  }
}

/** @returns {Signoff | null} null when nothing would be shown. */
export function normalizeSignoff(raw) {
  if (!raw || typeof raw !== 'object') return null
  const signoff = {
    signatureAssetId: str(raw.signatureAssetId, 100),
    sealAssetId: str(raw.sealAssetId, 100),
    name: str(raw.name, 120),
    title: str(raw.title, 120),
    label: str(raw.label, 80),
  }
  return signoff.signatureAssetId || signoff.sealAssetId || signoff.name || signoff.title ? signoff : null
}

/** @returns {PaymentDetails | null} null when every field is empty. */
export function normalizePaymentDetails(raw) {
  if (!raw || typeof raw !== 'object') return null
  const link = str(raw.link, 500).trim()
  const payment = {
    bankName: str(raw.bankName, 120),
    accountName: str(raw.accountName, 120),
    accountNumber: str(raw.accountNumber, 60),
    iban: str(raw.iban, 50),
    swift: str(raw.swift, 20),
    bankCodeLabel: str(raw.bankCodeLabel, 40),
    bankCode: str(raw.bankCode, 40),
    walletLabel: str(raw.walletLabel, 40),
    walletId: str(raw.walletId, 120),
    // Only web links: a QR or printed link must never carry javascript: etc.
    link: /^https?:\/\//i.test(link) ? link : '',
    instructions: str(raw.instructions, 1000),
    qr: oneOf(raw.qr, PAYMENT_QR_KINDS, 'none'),
    qrText: str(raw.qrText, 500),
  }
  // The QR kind alone is not a detail worth printing.
  return Object.entries(payment).some(([key, value]) => key !== 'qr' && value) ? payment : null
}

/** @returns {Discount | null} */
export function normalizeDiscount(raw) {
  if (!raw || typeof raw !== 'object') return null
  return { kind: oneOf(raw.kind, ['percent', 'amount'], 'percent'), value: int(raw.value) }
}

function normalizeTaxIds(raw) {
  return [...new Set(arr(raw, LIMITS.taxes).map((id) => str(id, 100)).filter(Boolean))]
}

/** @returns {LineItem} */
export function normalizeLine(raw) {
  const l = obj(raw)
  return {
    id: idOf(l.id),
    description: str(l.description, 2000),
    sku: str(l.sku, 100),
    unit: str(l.unit, 50),
    qty_milli: int(l.qty_milli),
    unitPrice_minor: int(l.unitPrice_minor),
    discount: normalizeDiscount(l.discount),
    taxIds: normalizeTaxIds(l.taxIds),
  }
}

/** @returns {Tax} */
export function normalizeTax(raw) {
  const t = obj(raw)
  return {
    id: idOf(t.id),
    name: str(t.name, 100),
    rate_micro: int(t.rate_micro),
    compound: bool(t.compound),
    withholding: bool(t.withholding),
  }
}

/** @returns {Charge} */
export function normalizeCharge(raw, defaultLabel = '') {
  const c = obj(raw)
  return {
    id: idOf(c.id),
    label: str(c.label, 200) || defaultLabel,
    amount_minor: int(c.amount_minor),
    taxIds: normalizeTaxIds(c.taxIds),
  }
}

/** @returns {Payment} */
export function normalizePayment(raw) {
  const p = obj(raw)
  return {
    id: idOf(p.id),
    date: isoOrNull(p.date),
    amount_minor: int(p.amount_minor),
    method: str(p.method, 100),
    reference: str(p.reference, 200),
    note: str(p.note, 1000),
    source: p.source === 'deposit' ? 'deposit' : '',
  }
}

/** @returns {Deposit | null} */
export function normalizeDeposit(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    kind: oneOf(raw.kind, ['percent', 'amount'], 'percent'),
    value: int(raw.value),
    paidAmount_minor: int(raw.paidAmount_minor),
    paidDate: isoOrNull(raw.paidDate),
    method: str(raw.method, 100),
  }
}

function mm(value, [min, max], fallback) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.min(max, Math.max(min, n)) * 2) / 2
}

/** @returns {Letterhead | null} null unless it points at an image. */
export function normalizeLetterhead(raw) {
  if (!raw || typeof raw !== 'object') return null
  const imageAssetId = str(raw.imageAssetId, 100)
  if (!imageAssetId) return null
  const d = LETTERHEAD_DEFAULTS
  return {
    imageAssetId,
    pdfAssetId: str(raw.pdfAssetId, 100),
    widthPx: Math.min(Math.max(int(raw.widthPx), 0), 20000),
    heightPx: Math.min(Math.max(int(raw.heightPx), 0), 20000),
    topMm: mm(raw.topMm, LETTERHEAD_LIMITS.topMm, d.topMm),
    bottomMm: mm(raw.bottomMm, LETTERHEAD_LIMITS.bottomMm, d.bottomMm),
    leftMm: mm(raw.leftMm, LETTERHEAD_LIMITS.leftMm, d.leftMm),
    rightMm: mm(raw.rightMm, LETTERHEAD_LIMITS.rightMm, d.rightMm),
    hideBusinessHeader: raw.hideBusinessHeader === undefined ? d.hideBusinessHeader : bool(raw.hideBusinessHeader),
    pages: oneOf(raw.pages, ['all', 'first'], d.pages),
    preprinted: raw.preprinted === undefined ? d.preprinted : bool(raw.preprinted),
  }
}

/** @returns {Appearance} */
export function normalizeAppearance(raw) {
  const a = obj(raw)
  return {
    accentColor: typeof a.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(a.accentColor) ? a.accentColor.toLowerCase() : DEFAULT_APPEARANCE.accentColor,
    paperSize: oneOf(a.paperSize, PAPER_SIZES, DEFAULT_APPEARANCE.paperSize),
    letterhead: normalizeLetterhead(a.letterhead),
  }
}

/** @returns {DocumentOptions} */
export function normalizeOptions(raw) {
  const o = obj(raw)
  return {
    taxMode: oneOf(o.taxMode, ['exclusive', 'inclusive'], DEFAULT_OPTIONS.taxMode),
    taxRounding: oneOf(o.taxRounding, ['line', 'document'], DEFAULT_OPTIONS.taxRounding),
    roundingMode: oneOf(o.roundingMode, ['half_up', 'half_even'], DEFAULT_OPTIONS.roundingMode),
    cashRoundingIncrement_minor: Math.max(int(o.cashRoundingIncrement_minor), 0),
    showAmountInWords: bool(o.showAmountInWords),
    wordsSystem: oneOf(o.wordsSystem, ['western', 'indian'], DEFAULT_OPTIONS.wordsSystem),
    wordsLanguage: str(o.wordsLanguage, 20) || DEFAULT_OPTIONS.wordsLanguage,
  }
}

/**
 * Any input (a saved record, a decoded share link, a half-built object) → a
 * complete, well-typed document. Only known fields are copied, which also
 * keeps keys such as "__proto__" in untrusted JSON from going anywhere.
 * Unknown types fall back to "invoice"; unknown statuses to the type's first.
 * @returns {DocsDocument}
 */
export function normalizeDocument(raw) {
  const d = obj(raw)
  const config = getDocumentType(d.type) || getDocumentType('invoice')
  const currency = typeof d.currency === 'string' && /^[A-Za-z]{3}$/.test(d.currency) ? d.currency.toUpperCase() : 'USD'
  return {
    schemaVersion: SCHEMA_VERSION,
    id: idOf(d.id),
    type: config.type,
    number: str(d.number, 100),
    status: oneOf(d.status, config.statuses, config.statuses[0]),
    issueDate: isoOrNull(d.issueDate),
    dueDate: isoOrNull(d.dueDate),
    validUntil: isoOrNull(d.validUntil),
    deliveryDate: isoOrNull(d.deliveryDate),
    paymentTermsDays: nullableInt(d.paymentTermsDays),
    currency,
    locale: canonicalLocale(d.locale),
    seller: normalizeParty(d.seller),
    client: normalizeParty(d.client),
    shipTo: d.shipTo && typeof d.shipTo === 'object' ? normalizeParty(d.shipTo) : null,
    reference: str(d.reference, 200),
    lines: arr(d.lines, LIMITS.lines).map(normalizeLine),
    taxes: arr(d.taxes, LIMITS.taxes).map(normalizeTax),
    discount: normalizeDiscount(d.discount),
    shipping: d.shipping && typeof d.shipping === 'object' ? normalizeCharge(d.shipping, 'Shipping') : null,
    fees: arr(d.fees, LIMITS.fees).map((f) => normalizeCharge(f, 'Fee')),
    payments: arr(d.payments, LIMITS.payments).map(normalizePayment),
    deposit: normalizeDeposit(d.deposit),
    reason: str(d.reason, 2000),
    notes: str(d.notes, LIMITS.longText),
    terms: str(d.terms, LIMITS.longText),
    footer: str(d.footer, 1000),
    templateId: str(d.templateId, 100) || 'classic',
    appearance: normalizeAppearance(d.appearance),
    options: normalizeOptions(d.options),
    titleOverride: str(d.titleOverride, 60),
    signoff: normalizeSignoff(d.signoff),
    payment: normalizePaymentDetails(d.payment),
    sourceDocId: str(d.sourceDocId, 100),
    sourceNumber: str(d.sourceNumber, 100),
    sourceType: getDocumentType(d.sourceType) ? d.sourceType : '',
  }
}

// ── Factories ────────────────────────────────────────────────────────────────

/**
 * A new, empty document of `type` with the type's default dates.
 * Pass `now` (and `id`) for deterministic output, e.g. during SSR or tests.
 * @param {string} [type]
 * @param {{ id?: string, now?: Date, currency?: string, locale?: string, number?: string, seller?: object, client?: object, options?: object, appearance?: object }} [init]
 * @returns {DocsDocument}
 */
export function createDocument(type = 'invoice', init = {}) {
  const config = getDocumentType(type) || getDocumentType('invoice')
  const issueDate = todayIso(init.now || new Date())
  return normalizeDocument({
    id: init.id || generateId(),
    type: config.type,
    number: init.number || '',
    issueDate,
    // Kept even without a due date: a purchase order states its payment terms,
    // and they carry over when the PO is invoiced.
    paymentTermsDays: config.defaultPaymentTermsDays,
    dueDate: config.features.dueDate ? dueDateFromTerms(issueDate, config.defaultPaymentTermsDays) : null,
    validUntil: config.features.validUntil && config.defaultValidityDays !== null ? addDays(issueDate, config.defaultValidityDays) : null,
    currency: init.currency || 'USD',
    locale: init.locale || 'en-US',
    seller: init.seller,
    client: init.client,
    signoff: init.signoff,
    payment: init.payment,
    titleOverride: init.titleOverride,
    options: { ...DEFAULT_OPTIONS, ...(init.options || {}) },
    // Receipts default to thermal paper (see DocumentTypeConfig.defaultPaperSize).
    appearance: config.defaultPaperSize
      ? { ...(init.appearance || {}), paperSize: THERMAL_PAPER_SIZES.includes(init.appearance?.paperSize) ? init.appearance.paperSize : config.defaultPaperSize }
      : init.appearance,
  })
}

/** @returns {LineItem} */
export function createLine(fields = {}) {
  return normalizeLine({ qty_milli: 1000, ...fields, id: fields.id || generateId() })
}

/** @returns {Tax} */
export function createTax(fields = {}) {
  return normalizeTax({ ...fields, id: fields.id || generateId() })
}

/** @returns {Charge} */
export function createCharge(fields = {}, defaultLabel = 'Fee') {
  return normalizeCharge({ ...fields, id: fields.id || generateId() }, defaultLabel)
}

/** @returns {Payment} */
export function createPayment(fields = {}) {
  return normalizePayment({ ...fields, id: fields.id || generateId() })
}

// ── Simple tax (one rate for the whole document) ───────────────────────────

/** The tax the simple "Tax %" field edits: the first ordinary (not compound, not withholding) tax. */
export function primaryTax(doc) {
  return (doc?.taxes || []).find((t) => !t.compound && !t.withholding) || null
}

/** Taxes a newly added line should carry: those every existing line has (or the primary tax on an empty list). */
export function taxIdsForNewLine(doc) {
  const lines = doc?.lines || []
  if (!lines.length) {
    const tax = primaryTax(doc)
    return tax ? [tax.id] : []
  }
  return (doc.taxes || []).map((t) => t.id).filter((id) => lines.every((l) => l.taxIds.includes(id)))
}

// ── Currency change ─────────────────────────────────────────────────────────

/**
 * Re-expresses every stored amount for a currency with a different minor-unit
 * exponent, keeping the typed values: 12.34 USD (1234) → 12 JPY (12), not
 * ¥1,234. Rounds with the document's rounding mode when digits are lost.
 * @param {DocsDocument} doc
 * @param {string} toCurrency
 * @returns {DocsDocument}
 */
export function changeCurrency(doc, toCurrency) {
  const code = String(toCurrency || '').toUpperCase()
  const diff = currencyExponent(code) - currencyExponent(doc.currency)
  const mode = doc.options?.roundingMode || 'half_up'
  const scale = (value) => {
    const n = BigInt(Math.trunc(Number(value) || 0))
    if (diff === 0) return Number(n)
    return Number(diff > 0 ? n * 10n ** BigInt(diff) : roundDiv(n, 10n ** BigInt(-diff), mode))
  }
  const scaleDiscount = (d) => (d && d.kind === 'amount' ? { ...d, value: scale(d.value) } : d)
  const scaleCharge = (c) => (c ? { ...c, amount_minor: scale(c.amount_minor) } : c)
  return {
    ...doc,
    currency: code,
    lines: doc.lines.map((l) => ({ ...l, unitPrice_minor: scale(l.unitPrice_minor), discount: scaleDiscount(l.discount) })),
    discount: scaleDiscount(doc.discount),
    shipping: scaleCharge(doc.shipping),
    fees: doc.fees.map(scaleCharge),
    payments: doc.payments.map((p) => ({ ...p, amount_minor: scale(p.amount_minor) })),
    deposit: doc.deposit
      ? { ...doc.deposit, value: doc.deposit.kind === 'amount' ? scale(doc.deposit.value) : doc.deposit.value, paidAmount_minor: scale(doc.deposit.paidAmount_minor) }
      : null,
    options: { ...doc.options, cashRoundingIncrement_minor: scale(doc.options.cashRoundingIncrement_minor) },
  }
}
