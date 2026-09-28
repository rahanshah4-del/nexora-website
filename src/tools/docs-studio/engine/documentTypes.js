/**
 * The seven Docs Studio document types.
 *
 * Every type shares one document shape (see model.js); a type's `features`
 * say which parts of that shape apply to it. calculateDocument() ignores the
 * parts a type does not use (a delivery note's prices never reach a total),
 * and convertDocument() resets them when a document changes type.
 */

/**
 * @typedef {object} DocumentFeatures
 * @property {boolean} pricing       unit prices and money totals
 * @property {boolean} taxes
 * @property {boolean} discount      line and document discounts
 * @property {boolean} shipping
 * @property {boolean} fees
 * @property {boolean} payments      payments received, balance due
 * @property {boolean} deposit       deposit / advance requested
 * @property {boolean} dueDate
 * @property {boolean} validUntil
 * @property {boolean} deliveryDate
 * @property {boolean} shipTo
 * @property {boolean} reason        free-text reason (credit notes)
 */

/**
 * @typedef {object} DocumentTypeConfig
 * @property {string} type
 * @property {string} label
 * @property {string} prefix              default {PREFIX} for numbering
 * @property {string} numberPattern
 * @property {1 | -1} sign                -1: amounts are credited, not charged
 * @property {{ from: string, to: string }} partyLabels
 * @property {string} referenceLabel     label for the free `reference` field
 * @property {string[]} statuses          first entry is the initial status
 * @property {DocumentFeatures} features
 * @property {boolean} allowNegativeQuantity
 * @property {number | null} defaultPaymentTermsDays
 * @property {number | null} defaultValidityDays
 * @property {string} [defaultPaperSize]   paper a new document of this type starts on
 */

const NONE = {
  pricing: false, taxes: false, discount: false, shipping: false, fees: false, payments: false,
  deposit: false, dueDate: false, validUntil: false, deliveryDate: false, shipTo: false, reason: false,
}
const PRICED = { ...NONE, pricing: true, taxes: true, discount: true, shipping: true, fees: true }

const DEFAULT_PATTERN = '{PREFIX}-{YYYY}-{seq:4}'

function deepFreeze(value) {
  Object.values(value).forEach((v) => { if (v && typeof v === 'object') deepFreeze(v) })
  return Object.freeze(value)
}

/** @type {Readonly<Record<string, DocumentTypeConfig>>} */
export const DOCUMENT_TYPES = deepFreeze({
  invoice: {
    type: 'invoice',
    label: 'Invoice',
    prefix: 'INV',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'From', to: 'Bill to' },
    referenceLabel: 'PO / Reference',
    statuses: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'],
    features: { ...PRICED, payments: true, dueDate: true, shipTo: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: 14,
    defaultValidityDays: null,
  },
  quotation: {
    type: 'quotation',
    label: 'Quotation',
    prefix: 'QUO',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'From', to: 'Quote for' },
    referenceLabel: 'Reference',
    statuses: ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted'],
    features: { ...PRICED, deposit: true, validUntil: true, shipTo: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: null,
    defaultValidityDays: 30,
  },
  proforma: {
    type: 'proforma',
    label: 'Proforma Invoice',
    prefix: 'PRO',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'From', to: 'Bill to' },
    referenceLabel: 'PO / Reference',
    statuses: ['draft', 'sent', 'accepted', 'converted', 'void'],
    features: { ...PRICED, deposit: true, validUntil: true, shipTo: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: null,
    defaultValidityDays: 30,
  },
  receipt: {
    type: 'receipt',
    label: 'Receipt',
    prefix: 'RCT',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'Received by', to: 'Received from' },
    referenceLabel: 'For invoice',
    statuses: ['draft', 'issued', 'void'],
    features: { ...PRICED, payments: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: null,
    defaultValidityDays: null,
    defaultPaperSize: 'Thermal80',
  },
  delivery_note: {
    type: 'delivery_note',
    label: 'Delivery Note',
    prefix: 'DN',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'From', to: 'Deliver to' },
    referenceLabel: 'Order no.',
    statuses: ['draft', 'dispatched', 'delivered'],
    features: { ...NONE, deliveryDate: true, shipTo: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: null,
    defaultValidityDays: null,
  },
  credit_note: {
    type: 'credit_note',
    label: 'Credit Note',
    prefix: 'CN',
    numberPattern: DEFAULT_PATTERN,
    sign: -1,
    partyLabels: { from: 'From', to: 'Credit to' },
    referenceLabel: 'Original invoice',
    statuses: ['draft', 'issued', 'applied', 'void'],
    features: { ...PRICED, reason: true },
    allowNegativeQuantity: true,
    defaultPaymentTermsDays: null,
    defaultValidityDays: null,
  },
  purchase_order: {
    type: 'purchase_order',
    label: 'Purchase Order',
    prefix: 'PO',
    numberPattern: DEFAULT_PATTERN,
    sign: 1,
    partyLabels: { from: 'Buyer', to: 'Vendor' },
    referenceLabel: 'Reference',
    statuses: ['draft', 'sent', 'confirmed', 'received', 'closed', 'cancelled'],
    features: { ...PRICED, deliveryDate: true, shipTo: true },
    allowNegativeQuantity: false,
    defaultPaymentTermsDays: 30,
    defaultValidityDays: null,
  },
})

export const DOCUMENT_TYPE_IDS = Object.freeze(Object.keys(DOCUMENT_TYPES))

/** Supported conversions: source type → target types. */
export const CONVERSIONS = Object.freeze({
  quotation: Object.freeze(['invoice', 'proforma']),
  proforma: Object.freeze(['invoice']),
  invoice: Object.freeze(['receipt', 'delivery_note', 'credit_note']),
  purchase_order: Object.freeze(['invoice']),
})

/** @returns {DocumentTypeConfig | null} */
export function getDocumentType(type) {
  return Object.hasOwn(DOCUMENT_TYPES, type) ? DOCUMENT_TYPES[type] : null
}

export function listDocumentTypes() {
  return DOCUMENT_TYPE_IDS.map((id) => DOCUMENT_TYPES[id])
}

export function canConvert(fromType, toType) {
  return Boolean(Object.hasOwn(CONVERSIONS, fromType) && CONVERSIONS[fromType].includes(toType))
}

export function conversionTargets(fromType) {
  return Object.hasOwn(CONVERSIONS, fromType) ? CONVERSIONS[fromType] : []
}
