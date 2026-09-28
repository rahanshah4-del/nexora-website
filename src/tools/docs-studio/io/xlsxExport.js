/**
 * "Excel" export: the document as a real workbook (numbers are numbers, dates
 * are dates, amounts carry a currency number format with the ISO decimal
 * places — JPY 0, USD 2, KWD 3).
 *
 *   Sheet "Invoice" (named after the type): header block, styled items table
 *   (bold header on the accent colour, frozen with the rows above it),
 *   totals, amount in words, notes and terms.
 *   Sheet "Items (raw)": one plain row per item — Description, Quantity,
 *   Unit, Unit price first, so copied rows paste straight back into the
 *   editor (io/pasteRows.js).
 *
 * Loaded only when the Excel button is clicked (with fflate).
 */

import { currencyExponent, getDocumentType } from '../engine/index.js'
import { onAccentColor } from '../templates/color.js'
import { buildTotalsRows } from '../templates/summary.js'
import { saveBlob } from './files.js'
import { buildXlsx, columnName } from './xlsx.js'

/** "Invoice-INV-2026-0001.xlsx" (same rules as the PDF name). */
export function xlsxFileName(doc) {
  const label = getDocumentType(doc.type)?.label || 'Document'
  const base = `${label}-${doc.number || 'draft'}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return `${base || 'document'}.xlsx`
}

/**
 * Excel number format for amounts in `currency`: grouping, the ISO number of
 * decimals, and the currency symbol on the side the locale puts it.
 * e.g. USD/en-US → "$"#,##0.00 · JPY → "¥"#,##0 · KWD → "KWD"\ #,##0.000 · EUR/de-DE → #,##0.00\ "€"
 */
export function currencyNumberFormat(currency, locale = 'en-US') {
  const decimals = currencyExponent(currency)
  const number = decimals ? `#,##0.${'0'.repeat(decimals)}` : '#,##0'
  let symbol = currency
  let before = true
  let spaced = true
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol' }).formatToParts(1)
    const i = parts.findIndex((p) => p.type === 'currency')
    const n = parts.findIndex((p) => p.type === 'integer')
    symbol = parts[i].value
    before = i < n
    const between = before ? parts.slice(i + 1, n) : parts.slice(n + 1, i)
    spaced = between.some((p) => p.type === 'literal' && /\s/.test(p.value))
  } catch {
    // unknown currency or locale: code before the number
  }
  const quoted = `"${symbol.replace(/"/g, '')}"`
  return before ? `${quoted}${spaced ? '\\ ' : ''}${number}` : `${number}${spaced ? '\\ ' : ''}${quoted}`
}

const partyText = (p) => [p?.name, p?.company && p.company !== p.name ? p.company : '', p?.address, p?.email, p?.phone, p?.taxId ? `${p.taxIdLabel || 'Tax ID'}: ${p.taxId}` : '']
  .filter(Boolean).join('\n')

/**
 * @param {object} doc     the document
 * @param {object} totals  calculateDocument(doc)
 * @param {{ amountWords?: string, now?: Date }} [options]
 * @returns {Uint8Array} the .xlsx bytes
 */
export function buildDocumentXlsx(doc, totals, { amountWords = '', now = new Date() } = {}) {
  const config = getDocumentType(doc.type) || getDocumentType('invoice')
  const f = config.features
  const exp = currencyExponent(doc.currency)
  const amount = (minor) => Number(minor || 0) / 10 ** exp
  const moneyFmt = currencyNumberFormat(doc.currency, doc.locale)
  const accent = doc.appearance?.accentColor || '#0071e3'
  const calc = new Map(totals.lines.map((l) => [l.id, l]))
  const taxName = new Map(doc.taxes.map((t) => [t.id, t.name || 'Tax']))

  const styles = {
    title: { bold: true, size: 16, color: accent },
    label: { bold: true, color: '#64748B', valign: 'top' },

    block: { wrap: true, valign: 'top' },
    text: {},
    date: { numFmt: 14, halign: 'left' },
    head: { bold: true, color: onAccentColor(accent), fill: accent, border: 'box', borderColor: accent },
    headRight: { bold: true, color: onAccentColor(accent), fill: accent, border: 'box', borderColor: accent, halign: 'right' },
    cell: { border: 'bottom', valign: 'top', wrap: true },
    cellNum: { border: 'bottom', valign: 'top' },
    // General: 12 → "12", 1.5 → "1.5" (a "0.###" format would show "12.").
    cellQty: { border: 'bottom', valign: 'top' },
    cellMoney: { border: 'bottom', valign: 'top', numFmt: moneyFmt },
    cellMoneyBold: { border: 'bottom', valign: 'top', numFmt: moneyFmt, bold: true },
    totalLabel: { halign: 'right', color: '#475569' },
    totalMoney: { numFmt: moneyFmt },
    grandLabel: { halign: 'right', bold: true, border: 'top', borderColor: '#0F172A' },
    grandMoney: { numFmt: moneyFmt, bold: true, border: 'top', borderColor: '#0F172A' },
    balanceLabel: { halign: 'right', bold: true, color: onAccentColor(accent), fill: accent },
    balanceMoney: { numFmt: moneyFmt, bold: true, color: onAccentColor(accent), fill: accent },
    rawHead: { bold: true },
    rawMoney: { numFmt: `0.${'0'.repeat(exp)}`.replace(/\.$/, '') },
    rawPercent: { numFmt: '0.00%' },
  }

  // ── Sheet 1: the document ──
  const columns = [
    { key: 'index', label: '#', width: 5 },
    { key: 'description', label: 'Description', width: 44 },
    { key: 'qty', label: 'Qty', width: 9 },
    { key: 'unit', label: 'Unit', width: 9 },
    ...(f.pricing ? [
      { key: 'price', label: 'Unit price', width: 15 },
      { key: 'discount', label: 'Discount', width: 13 },
      { key: 'amount', label: 'Amount', width: 16 },
    ] : []),
  ]
  const last = columns.length - 1
  const lastCol = columnName(last)
  const rows = []
  const merges = []
  const heights = {}
  const put = (r, c, cell) => {
    rows[r] = rows[r] || []
    rows[r][c] = cell
  }
  const lines = (text) => Math.max(1, String(text).split('\n').length)

  // Header block: title; "From" / "Bill to" side by side; dates and currency.
  // Labels live in the wide Description column (B); the narrow "#" column stays empty.
  const blockEnd = columnName(last)
  put(0, 0, { v: `${config.label}${doc.number ? ` ${doc.number}` : ''}`, s: 'title' })
  merges.push(`A1:${blockEnd}1`)
  heights[1] = 24
  const seller = partyText(doc.seller)
  const client = partyText(doc.client)
  const rightCol = Math.min(4, last) // E: the client block spans E…last
  put(2, 1, { v: config.partyLabels.from, s: 'label' })
  put(2, rightCol, { v: config.partyLabels.to, s: 'label' })
  put(3, 1, { v: seller, s: 'block' })
  put(3, rightCol, { v: client, s: 'block' })
  if (rightCol < last) merges.push(`${columnName(rightCol)}3:${blockEnd}3`, `${columnName(rightCol)}4:${blockEnd}4`)
  heights[4] = 15 * Math.max(lines(seller), lines(client))
  const metaRows = [
    ['Number', { v: doc.number, s: 'text' }],
    ['Issue date', { v: doc.issueDate, t: 'd', s: 'date' }],
    f.dueDate ? ['Due date', { v: doc.dueDate, t: 'd', s: 'date' }] : f.validUntil ? ['Valid until', { v: doc.validUntil, t: 'd', s: 'date' }] : null,
    ['Currency', { v: doc.currency, s: 'text' }],
    doc.reference ? [config.referenceLabel || 'Reference', { v: doc.reference, s: 'text' }] : null,
  ].filter(Boolean)
  metaRows.forEach(([label, value], i) => {
    const r = 5 + i
    put(r, 1, { v: label, s: 'label' })
    put(r, 2, value)
    merges.push(`C${r + 1}:D${r + 1}`)
  })
  const headerRow = 5 + metaRows.length + 1 // blank row, then the table head

  // Items table
  columns.forEach((col, c) => put(headerRow, c, { v: col.label, s: ['qty', 'price', 'discount', 'amount'].includes(col.key) ? 'headRight' : 'head' }))
  doc.lines.forEach((line, i) => {
    const r = headerRow + 1 + i
    const l = calc.get(line.id)
    const values = {
      index: { v: i + 1, s: 'cellNum' },
      description: { v: line.description, s: 'cell' },
      qty: { v: line.qty_milli / 1000, s: 'cellQty' },
      unit: { v: line.unit, s: 'cell' },
      price: { v: amount(line.unitPrice_minor), s: 'cellMoney' },
      discount: { v: l?.lineDiscount ? -amount(l.lineDiscount) : null, s: 'cellMoney' },
      amount: { v: amount(l ? l.net : 0), s: 'cellMoneyBold' },
    }
    columns.forEach((col, c) => put(r, c, values[col.key]))
  })
  let r = headerRow + 1 + doc.lines.length + 1

  // Totals (same rows as the paper: templates/summary.js)
  if (f.pricing) {
    for (const row of buildTotalsRows(doc, totals)) {
      const grand = row.tone === 'grand'
      const balance = row.tone === 'balance'
      put(r, last - 1, { v: row.label, s: balance ? 'balanceLabel' : grand ? 'grandLabel' : 'totalLabel' })
      put(r, last, { v: amount(row.amount), s: balance ? 'balanceMoney' : grand ? 'grandMoney' : 'totalMoney' })
      r++
    }
    r++
  }
  const note = (label, text) => {
    if (!text) return
    put(r, 1, { v: label, s: 'label' })
    put(r, 2, { v: text, s: 'block' })
    if (last > 2) merges.push(`C${r + 1}:${lastCol}${r + 1}`)
    heights[r + 1] = 15 * lines(text)
    r++
  }
  if (f.pricing && doc.options?.showAmountInWords) note('Amount in words', amountWords)
  note('Notes', doc.notes)
  note('Terms', doc.terms)
  note('Footer', doc.footer)

  // ── Sheet 2: plain items for re-import ──
  const raw = [[
    'Description', 'Quantity', 'Unit', 'Unit price', 'SKU', 'Line discount', 'Line discount %', 'Taxes', 'Amount', 'Currency',
  ].map((v) => ({ v, s: 'rawHead' }))]
  doc.lines.forEach((line) => {
    const l = calc.get(line.id)
    const d = line.discount
    raw.push([
      { v: line.description },
      { v: line.qty_milli / 1000 },
      { v: line.unit },
      { v: amount(line.unitPrice_minor), s: 'rawMoney' },
      { v: line.sku },
      { v: d?.kind === 'amount' ? amount(d.value) : null, s: 'rawMoney' },
      { v: d?.kind === 'percent' ? d.value / 1_000_000 : null, s: 'rawPercent' },
      { v: line.taxIds.map((id) => taxName.get(id)).filter(Boolean).join(', ') },
      { v: amount(l ? l.net : 0), s: 'rawMoney' },
      { v: doc.currency },
    ])
  })

  return buildXlsx({
    title: `${config.label} ${doc.number}`.trim(),
    creator: doc.seller?.name || '',
    created: now,
    styles,
    sheets: [
      {
        name: config.label,
        columns,
        rows: Array.from({ length: rows.length }, (_, i) => rows[i] || []),
        rowHeights: heights,
        merges,
        freezeRows: headerRow + 1,
        fitToWidth: true,
      },
      {
        name: 'Items (raw)',
        columns: [{ width: 44 }, { width: 10 }, { width: 9 }, { width: 13 }, { width: 12 }, { width: 13 }, { width: 14 }, { width: 18 }, { width: 13 }, { width: 9 }],
        rows: raw,
        freezeRows: 1,
      },
    ],
  })
}

/** Browser: build and save the workbook. */
export function downloadDocumentXlsx({ doc, totals, amountWords }) {
  const bytes = buildDocumentXlsx(doc, totals, { amountWords })
  const fileName = xlsxFileName(doc)
  saveBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
  return { fileName, bytes: bytes.length }
}
