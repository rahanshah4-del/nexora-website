/**
 * The content of a rendered document — every label, formatted amount, row and
 * line — as plain data. Built once from the document and calculateDocument()
 * totals and consumed by both renderers (HTML templates and pdf/renderPdf.js),
 * so the two can never show different figures or wording.
 *
 * Options:
 *   currencyDisplay  'symbol' (default) or 'code' — the PDF uses 'code' when
 *                    the Unicode font could not be loaded (Helvetica has no ₹).
 *   sanitize         applied to every string (the PDF's Helvetica fallback
 *                    replaces characters WinAnsi cannot encode).
 */

import { formatIsoDate, formatMoney, formatQuantity, getDocumentType } from '../engine/index.js'
import { onAccentColor } from './color.js'
import { COLUMNS } from './specs.js'
import { STATUS_STAMPS, buildTotalsRows, paymentTermsLabel } from './summary.js'
import { paymentQrPayload } from '../engine/paymentQr.js'
import { qrMatrix } from './qr.js'

const identity = (s) => s

/**
 * @param {import('../engine/model.js').DocsDocument} doc
 * @param {import('../engine/calculate.js').DocumentTotals} totals
 * @param {{ amountWords?: string, currencyDisplay?: 'symbol' | 'code', sanitize?: (s: string) => string }} [options]
 */
export function buildPaperModel(doc, totals, { amountWords = '', currencyDisplay = 'symbol', sanitize = identity } = {}) {
  const config = getDocumentType(doc.type) || getDocumentType('invoice')
  const f = config.features
  const s = (value) => sanitize(String(value ?? ''))
  const money = (minor) => s(formatMoney(minor, doc.currency, doc.locale, { display: currencyDisplay }))
  const date = (iso) => s(formatIsoDate(iso, doc.locale, { dateStyle: 'medium' }))
  const qty = (milli) => s(formatQuantity(milli, doc.locale))
  const accent = doc.appearance?.accentColor || '#0071e3'

  const partyBlock = (role, label, party, placeholder) => {
    const p = party || {}
    const lines = [
      p.company && p.company !== p.name ? p.company : '',
      p.address,
      p.email,
      p.phone,
      p.taxId ? `${p.taxIdLabel || 'Tax ID'}: ${p.taxId}` : '',
    ].filter(Boolean).map(s)
    const name = s(p.name)
    return { role, label: s(label), name, lines, empty: !name && !lines.length, placeholder: s(placeholder) }
  }

  const parties = [
    partyBlock('from', config.partyLabels.from, doc.seller, 'Your business'),
    partyBlock('to', config.partyLabels.to, doc.client, 'Client name'),
  ]
  if (f.shipTo && doc.shipTo?.name) parties.push(partyBlock('shipTo', doc.type === 'purchase_order' ? 'Deliver to' : 'Ship to', doc.shipTo, ''))

  const meta = [
    ['Issue date', date(doc.issueDate)],
    f.dueDate ? ['Due date', date(doc.dueDate)] : null,
    f.validUntil ? ['Valid until', date(doc.validUntil)] : null,
    f.deliveryDate ? ['Delivery date', date(doc.deliveryDate)] : null,
    f.dueDate && doc.paymentTermsDays !== null ? ['Terms', s(paymentTermsLabel(doc.paymentTermsDays))] : null,
    doc.reference ? [s(config.referenceLabel), s(doc.reference)] : null,
    doc.sourceNumber && doc.sourceNumber !== doc.reference
      ? [s(`From ${getDocumentType(doc.sourceType)?.label.toLowerCase() || 'document'}`), s(doc.sourceNumber)]
      : null,
  ].filter((m) => m && m[1]).map(([label, value]) => ({ label: s(label), value }))

  const calcById = new Map(totals.lines.map((l) => [l.id, l]))
  const showUnit = doc.lines.some((l) => l.unit)
  const showDiscount = f.pricing && f.discount && totals.lines.some((l) => l.lineDiscount)
  const columns = COLUMNS.filter((c) => {
    if (c.pricing && !f.pricing) return false
    if (c.key === 'unit') return showUnit
    if (c.key === 'discount') return showDiscount
    return true
  }).map((c) => ({ ...c, label: s(c.label) }))

  const rows = doc.lines.map((line, index) => {
    const calc = calcById.get(line.id)
    const cells = {
      index: String(index + 1),
      description: s(line.description),
      qty: qty(line.qty_milli),
      unit: s(line.unit),
      price: money(line.unitPrice_minor),
      discount: calc?.lineDiscount ? money(-calc.lineDiscount) : '',
      amount: money(calc ? calc.net : 0),
    }
    return { id: line.id, cells, descriptionEmpty: !line.description.trim() }
  })

  const stamp = STATUS_STAMPS[doc.status] ? { ...STATUS_STAMPS[doc.status], label: s(STATUS_STAMPS[doc.status].label) } : null
  const totalsRows = buildTotalsRows(doc, totals).map((row) => ({ ...row, label: s(row.label), value: money(row.amount) }))

  const payments = f.payments
    ? (doc.payments || []).filter((p) => p.amount_minor).map((p) => ({ label: s([p.method || 'Payment', p.date ? date(p.date) : ''].filter(Boolean).join(' · ')), value: money(p.amount_minor) }))
    : []

  // How to pay: labelled rows, free-text instructions and the QR (pricing documents only).
  const pd = f.pricing ? doc.payment : null
  const paymentRows = pd
    ? [
        ['Bank', pd.bankName],
        ['Account name', pd.accountName],
        ['Account no.', pd.accountNumber],
        ['IBAN', pd.iban],
        ['SWIFT / BIC', pd.swift],
        [pd.bankCodeLabel || 'Bank code', pd.bankCode],
        [pd.walletLabel || 'Wallet', pd.walletId],
        ['Pay online', /^https?:\/\//i.test(pd.link || '') ? pd.link : ''],
      ].filter(([, value]) => value).map(([label, value]) => ({ label: s(label), value: s(value) }))
    : []
  const qrPayload = pd ? paymentQrPayload(doc, totals) : ''
  const payment = pd && (paymentRows.length || pd.instructions || qrPayload)
    ? {
        rows: paymentRows,
        instructions: s(pd.instructions),
        qr: qrPayload ? qrMatrix(qrPayload) : null,
        qrCaption: s(pd.qr === 'epc' ? 'Scan to pay (SEPA)' : pd.qr === 'upi' ? 'Scan to pay (UPI)' : pd.qr === 'link' ? 'Scan to pay online' : 'Scan for payment details'),
      }
    : null

  const so = doc.signoff
  const signoff = so && config.type !== 'receipt' && (so.signatureAssetId || so.sealAssetId || so.name || so.title)
    ? { label: s(so.label || 'Authorised signature'), name: s(so.name), title: s(so.title), hasSignature: Boolean(so.signatureAssetId), hasSeal: Boolean(so.sealAssetId) }
    : null

  return {
    type: config.type,
    typeLabel: config.label,
    title: s(doc.titleOverride || config.label),
    number: s(doc.number),
    brandName: s(doc.seller?.name),
    accent,
    onAccent: onAccentColor(accent),
    pricing: f.pricing,
    parties,
    meta,
    columns,
    rows,
    totals: totalsRows,
    words: f.pricing && doc.options?.showAmountInWords && amountWords ? s(amountWords) : '',
    reason: f.reason ? s(doc.reason) : '',
    notes: s(doc.notes),
    terms: s(doc.terms),
    footer: s(doc.footer),
    payment,
    signoff,
    stamp,
    receipt: {
      customer: s(doc.client?.company || doc.client?.name),
      items: rows.map((row) => ({
        name: row.cells.description,
        detail: f.pricing ? `${row.cells.qty}${row.cells.unit ? ` ${row.cells.unit}` : ''} × ${row.cells.price}` : `${row.cells.qty}${row.cells.unit ? ` ${row.cells.unit}` : ''}`,
        total: f.pricing ? row.cells.amount : '',
        discount: row.cells.discount,
      })),
      payments,
    },
  }
}

/** "Invoice-INV-2026-0001.pdf" — safe for every OS. */
export function pdfFileName(model) {
  const base = `${model.typeLabel}-${model.number || 'draft'}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return `${base || 'document'}.pdf`
}
