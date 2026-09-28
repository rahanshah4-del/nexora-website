/**
 * New-document factory for the editor: the engine's createDocument() plus the
 * visitor's saved preferences and default business.
 */

import { THERMAL_PAPER_SIZES, createDocument, dueDateFromTerms, generateId, getDocumentType, normalizeDocument, todayIso } from '../engine/index.js'

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
  }
}

/**
 * @param {{ type?: string, number?: string, preferences?: object | null, businessDefault?: { enabled: boolean, party: object } | null, now?: Date }} input
 */
export function createStarterDocument({ type = 'invoice', number = '', preferences = null, businessDefault = null, now = new Date() } = {}) {
  const prefs = preferences || {}
  const doc = createDocument(type, {
    now,
    number,
    currency: prefs.currency || 'USD',
    locale: prefs.locale || 'en-US',
    seller: businessDefault?.enabled ? businessDefault.party : undefined,
    options: { wordsSystem: prefs.wordsSystem || 'western' },
    appearance: { accentColor: prefs.accentColor, paperSize: type === 'receipt' ? prefs.receiptPaperSize : prefs.paperSize },
  })
  return prefs.templateId ? { ...doc, templateId: prefs.templateId } : doc
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
