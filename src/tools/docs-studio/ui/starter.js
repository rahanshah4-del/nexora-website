/**
 * New-document factory for the editor: the engine's createDocument() plus the
 * visitor's saved preferences and default business.
 */

import { THERMAL_PAPER_SIZES, createDocument, createLine, dueDateFromTerms, generateId, getDocumentType, normalizeDocument, todayIso } from '../engine/index.js'
import { normalizeRegion, withRegion } from './regionPresets.js'

/** True once the visitor has saved "Your business" (wizard step 1). */
export function isReturningBusiness(businessDefault) {
  return Boolean(businessDefault?.enabled && (businessDefault.party?.name || businessDefault.party?.logoAssetId || businessDefault.letterhead))
}

/**
 * Where the studio opens: always the wizard; step 2 for returning visitors
 * (with a small "Edit business details" link), step 1 otherwise — and always
 * step 1 when the page starts from the letterhead upload.
 * @returns {{ view: 'wizard', step: 1 | 2 }}
 */
export function initialView({ businessDefault = null, preset = null } = {}) {
  if (preset?.brandMode === 'letterhead') return { view: 'wizard', step: 1 }
  return { view: 'wizard', step: isReturningBusiness(businessDefault) ? 2 : 1 }
}

/** Preferences remembered from the last edited document. */
export function preferencesFromDocument(doc, previous = null) {
  const thermal = THERMAL_PAPER_SIZES.includes(doc.appearance.paperSize)
  return {
    currency: doc.currency,
    locale: doc.locale,
    accentColor: doc.appearance.accentColor,
    // Page and thermal sizes are remembered separately, so printing one
    // receipt on 80 mm paper does not make the next invoice thermal.
    paperSize: thermal ? previous?.paperSize || 'A4' : doc.appearance.paperSize,
    receiptPaperSize: thermal ? doc.appearance.paperSize : previous?.receiptPaperSize || 'Thermal80',
    templateId: doc.templateId,
    wordsSystem: doc.options.wordsSystem,
    messageTemplate: previous?.messageTemplate || '',
    region: normalizeRegion(previous?.region),
  }
}

/**
 * @param {{ type?: string, number?: string, preferences?: object | null, businessDefault?: { enabled: boolean, party: object } | null, paperSize?: string, now?: Date }} input
 *   paperSize: overrides the remembered paper (a landing page's preset)
 */
export function createStarterDocument({ type = 'invoice', number = '', preferences = null, businessDefault = null, paperSize = '', now = new Date() } = {}) {
  const prefs = preferences || {}
  const business = businessDefault?.enabled ? businessDefault : null
  const doc = createDocument(type, {
    now,
    number,
    currency: prefs.currency || 'USD',
    locale: prefs.locale || 'en-US',
    seller: business ? business.party : undefined,
    // Saved with "Your business": signature/stamp and how clients pay.
    signoff: business?.signoff || undefined,
    payment: business?.payment || undefined,
    options: { wordsSystem: prefs.wordsSystem || 'western' },
    appearance: {
      accentColor: prefs.accentColor,
      paperSize: paperSize || (type === 'receipt' ? prefs.receiptPaperSize : prefs.paperSize),
      letterhead: business?.letterhead || null,
    },
  })
  // One empty row, so the items list is ready to type into.
  // Country preset: "Tax Invoice" title and the usual tax line for registered businesses.
  const withLine = withRegion({ ...doc, lines: [createLine()] }, normalizeRegion(prefs.region))
  return prefs.templateId ? { ...withLine, templateId: prefs.templateId } : withLine
}

/**
 * How the document will look once created: a draft previews with the type's
 * first issued status (sent / issued / dispatched), so design previews do not
 * carry a DRAFT stamp that "Create" removes anyway.
 */
export function asCreated(doc) {
  const statuses = getDocumentType(doc.type).statuses
  return doc.status === 'draft' && statuses[1] ? { ...doc, status: statuses[1] } : doc
}

/** A copy with a new id/number, today's dates, and payments cleared. */
export function duplicateDocument(doc, { number = '', now = new Date() } = {}) {
  const config = getDocumentType(doc.type)
  const today = todayIso(now)
  return normalizeDocument({
    ...doc,
    id: generateId(),
    number,
    status: config.statuses[0],
    issueDate: today,
    dueDate: config.features.dueDate ? dueDateFromTerms(today, doc.paymentTermsDays) : doc.dueDate,
    validUntil: config.features.validUntil && config.defaultValidityDays !== null ? dueDateFromTerms(today, config.defaultValidityDays) : doc.validUntil,
    payments: [],
    deposit: doc.deposit ? { ...doc.deposit, paidAmount_minor: 0, paidDate: null } : null,
    sourceDocId: '',
    sourceNumber: '',
    sourceType: '',
  })
}
