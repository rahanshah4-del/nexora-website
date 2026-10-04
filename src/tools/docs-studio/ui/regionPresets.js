/**
 * Country presets: one tap sets the currency, number format, tax-ID labels,
 * the invoice title a tax-registered business uses, and the usual tax line.
 *
 * Titles and taxes only apply when the business says it is registered —
 * e.g. in the UAE only a VAT-registered business may issue a "Tax Invoice".
 * Rates are the common standard rates; the editor always lets people change
 * them, and `note` reminds them to check their own rate.
 */

import { createTax } from '../engine/index.js'

/**
 * @typedef {{
 *   code: string, name: string, flag: string, currency: string, locale: string,
 *   sellerTaxIdLabel: string, clientTaxIdLabel: string, wordsSystem: 'western' | 'indian',
 *   registeredLabel: string | null, invoiceTitle: string, tax: { name: string, rate_micro: number } | null,
 *   note: string,
 * }} RegionPreset
 */

/** @type {readonly RegionPreset[]} */
export const REGION_PRESETS = Object.freeze([
  {
    code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', locale: 'en-US',
    sellerTaxIdLabel: 'EIN', clientTaxIdLabel: 'Tax ID', wordsSystem: 'western',
    registeredLabel: null, invoiceTitle: '', tax: null,
    note: 'Sales tax depends on the state (and city) — add your rate under Taxes if you collect it.',
  },
  {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB',
    sellerTaxIdLabel: 'VAT No', clientTaxIdLabel: 'VAT No', wordsSystem: 'western',
    registeredLabel: 'VAT-registered', invoiceTitle: 'VAT Invoice', tax: { name: 'VAT', rate_micro: 200000 },
    note: 'Standard VAT is 20%; reduced (5%) and zero rates apply to some goods.',
  },
  {
    code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', locale: 'en-AE',
    sellerTaxIdLabel: 'TRN', clientTaxIdLabel: 'TRN', wordsSystem: 'western',
    registeredLabel: 'VAT-registered (has a TRN)', invoiceTitle: 'Tax Invoice', tax: { name: 'VAT', rate_micro: 50000 },
    note: 'Only VAT-registered businesses issue a "Tax Invoice". Standard VAT is 5%.',
  },
  {
    code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', locale: 'en-IN',
    sellerTaxIdLabel: 'GSTIN', clientTaxIdLabel: 'GSTIN', wordsSystem: 'indian',
    registeredLabel: 'GST-registered', invoiceTitle: 'Tax Invoice', tax: { name: 'GST', rate_micro: 180000 },
    note: 'GST rates depend on the goods or service. Within one state you can split it into CGST + SGST under Taxes.',
  },
  {
    code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', locale: 'en-PK',
    sellerTaxIdLabel: 'NTN', clientTaxIdLabel: 'NTN', wordsSystem: 'indian',
    registeredLabel: 'Registered for sales tax (STRN)', invoiceTitle: 'Sales Tax Invoice', tax: { name: 'Sales Tax', rate_micro: 180000 },
    note: 'Standard sales tax on goods is 18%; provincial sales tax on services differs by province.',
  },
])

export function getRegionPreset(code) {
  return REGION_PRESETS.find((p) => p.code === code) || null
}

/** Labels a preset may overwrite (anything else the person typed is kept). */
const KNOWN_TAX_ID_LABELS = new Set(['', 'Tax ID', 'VAT No', 'GST No', 'GSTIN', 'NTN', 'EIN', 'TRN', 'ABN'])

/** Stored in preferences so new documents start the same way. */
export function normalizeRegion(raw) {
  const preset = getRegionPreset(raw?.code)
  if (!preset) return null
  return { code: preset.code, registered: Boolean(raw.registered && preset.registeredLabel) }
}

/**
 * What a preset changes on a document, as plain data (pure; tested).
 * @param {object} doc normalized document
 * @param {{ code: string, registered?: boolean }} region
 * @returns {null | {
 *   currency: string, locale: string, wordsSystem: string,
 *   seller: object | null, client: object | null,
 *   titleOverride: string | null,  null = leave as is
 *   tax: { name: string, rate_micro: number } | null,  add only when the document has no tax yet
 * }}
 */
export function regionChanges(doc, region) {
  const preset = getRegionPreset(region?.code)
  if (!preset) return null
  const registered = Boolean(region.registered && preset.registeredLabel)
  const isInvoice = doc.type === 'invoice'
  const knownTitle = !doc.titleOverride || REGION_PRESETS.some((p) => p.invoiceTitle && p.invoiceTitle === doc.titleOverride)
  return {
    currency: preset.currency,
    locale: preset.locale,
    wordsSystem: preset.wordsSystem,
    seller: KNOWN_TAX_ID_LABELS.has(doc.seller?.taxIdLabel || '') ? { taxIdLabel: preset.sellerTaxIdLabel } : null,
    client: KNOWN_TAX_ID_LABELS.has(doc.client?.taxIdLabel || '') ? { taxIdLabel: preset.clientTaxIdLabel } : null,
    titleOverride: isInvoice && knownTitle ? (registered ? preset.invoiceTitle : '') : null,
    tax: registered && preset.tax && !(doc.taxes || []).length ? preset.tax : null,
  }
}

/** Applies a preset through the editor's reducer actions. */
export function applyRegion(doc, region, actions) {
  const changes = regionChanges(doc, region)
  if (!changes) return
  actions.setCurrency(changes.currency)
  actions.set('locale', changes.locale)
  actions.setOption('wordsSystem', changes.wordsSystem)
  if (changes.seller) actions.updateParty('seller', changes.seller)
  if (changes.client) actions.updateParty('client', changes.client)
  if (changes.titleOverride !== null) actions.set('titleOverride', changes.titleOverride)
  if (changes.tax) actions.setSimpleTax(changes.tax.rate_micro, changes.tax.name)
}

/** A new document from the starter, with the remembered region applied (pure). */
export function withRegion(doc, region) {
  const changes = regionChanges(doc, region)
  if (!changes) return doc
  const next = { ...doc }
  if (changes.titleOverride) next.titleOverride = changes.titleOverride
  if (changes.client) next.client = { ...doc.client, ...changes.client }
  if (changes.tax) {
    const tax = createTax({ name: changes.tax.name, rate_micro: changes.tax.rate_micro })
    next.taxes = [tax]
    next.lines = doc.lines.map((line) => ({ ...line, taxIds: [tax.id] }))
  }
  return next
}
