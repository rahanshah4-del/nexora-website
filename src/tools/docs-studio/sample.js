/**
 * The sample invoice shown on a first visit, so the preview looks like a real
 * document before the visitor types anything. It is never saved unless edited.
 */

import { addDays, createDocument, formatNumber, getDocumentType, todayIso } from './engine/index.js'

export const SAMPLE_DOCUMENT_ID = 'sample-invoice'

export function createSampleDocument(now = new Date()) {
  const issueDate = todayIso(now)
  const config = getDocumentType('invoice')
  const base = createDocument('invoice', { id: SAMPLE_DOCUMENT_ID, now, currency: 'USD', locale: 'en-US' })
  return {
    ...base,
    number: formatNumber(config.numberPattern, { prefix: config.prefix, seq: 1, date: issueDate }),
    status: 'sent',
    paymentTermsDays: 14,
    dueDate: addDays(issueDate, 14),
    reference: 'PO-4471',
    seller: {
      ...base.seller,
      name: 'Northwind Studio',
      address: '221 Market Street, Suite 400\nSan Francisco, CA 94105',
      email: 'billing@northwind.studio',
      phone: '+1 415 555 0142',
      taxIdLabel: 'EIN',
      taxId: '12-3456789',
    },
    client: {
      ...base.client,
      name: 'Maya Chen',
      company: 'Acme Corporation',
      address: '500 Harbor Blvd\nSeattle, WA 98101',
      email: 'accounts@acme.example',
    },
    taxes: [{ id: 'sample-tax', name: 'Sales tax', rate_micro: 80000, compound: false, withholding: false }],
    lines: [
      { id: 'sample-1', description: 'Brand identity design\nLogo, colour palette and typography guide', sku: '', unit: '', qty_milli: 1000, unitPrice_minor: 185000, discount: null, taxIds: ['sample-tax'] },
      { id: 'sample-2', description: 'Website design & development (5 pages)', sku: '', unit: '', qty_milli: 1000, unitPrice_minor: 420000, discount: null, taxIds: ['sample-tax'] },
      { id: 'sample-3', description: 'Copywriting', sku: '', unit: 'hrs', qty_milli: 12000, unitPrice_minor: 6500, discount: null, taxIds: ['sample-tax'] },
      { id: 'sample-4', description: 'Managed hosting', sku: '', unit: 'months', qty_milli: 12000, unitPrice_minor: 1500, discount: { kind: 'percent', value: 100000 }, taxIds: [] },
    ],
    payments: [{ id: 'sample-pay', date: issueDate, amount_minor: 150000, method: 'Bank transfer', reference: 'Deposit', note: '', source: '' }],
    notes: 'Thank you for your business! Questions about this invoice? Email billing@northwind.studio.',
    terms: 'Payment due within 14 days. Please include the invoice number with your payment.',
    footer: 'Northwind Studio · northwind.studio',
    options: { ...base.options, showAmountInWords: true },
  }
}
