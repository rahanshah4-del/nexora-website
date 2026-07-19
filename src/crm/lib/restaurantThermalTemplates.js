/**
 * Restaurant 58mm Thermal Printer Templates — Modern & Advanced
 *
 * Pure functions that generate professional 58mm receipts for:
 *   - Bill / Guest Check
 *   - KOT (Kitchen Order Ticket)
 *   - Daily Closing Report
 *   - Cash Drawer Reconciliation
 *
 * Each template has two outputs:
 *   1. thermalText  — for direct USB/WebUSB thermal printers (plain text with modern layout)
 *   2. printHtml    — for browser print preview (rich CSS-styled HTML, fits 58mm paper)
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function mv(value, currency = 'PKR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '---'
  const num = Number(value)
  return `${currency} ${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

function nv(value) {
  if (value === null || value === undefined) return '---'
  return Number(value).toLocaleString('en-PK')
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function padCenter(text, width = 32) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text
}

function padRight(text, width = 32) {
  return text.padEnd(width)
}

function divider(char = '-', width = 32) {
  return char.repeat(width)
}

function doubleDivider(width = 32) {
  return '='.repeat(width)
}

function lineLR(left, right, width = 32) {
  const leftStr = String(left || '')
  const rightStr = String(right || '')
  const dots = Math.max(1, width - leftStr.length - rightStr.length)
  return leftStr + ' ' + '.'.repeat(dots) + ' ' + rightStr
}

function sectionHeader(text, width = 32) {
  return [
    '',
    divider('-', width),
    padCenter(` ${text} `, width),
    divider('-', width),
  ].join('\n')
}

// ── Shared 58mm HTML CSS ─────────────────────────────────────────────────────

function thermalCss(extra = '') {
  return `
@page { margin: 0; size: 58mm auto; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 58mm;
  background: #fff;
  color: #111827;
  font-family: 'Courier New', Menlo, Monaco, monospace;
  font-size: 9px;
  line-height: 1.35;
  padding: 3mm 2.5mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.receipt { width: 100%; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: 900; }
.brand { font-size: 13px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
.subhead { font-size: 8px; color: #6b7280; margin-top: 1px; }
.title-badge {
  display: inline-block;
  border: 1.5px solid #111827;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 4px 0;
}
.divider { border-top: 1px dashed #9ca3af; margin: 4px 0; }
.divider-solid { border-top: 1px solid #374151; margin: 4px 0; }
.divider-double { border-top: 2px solid #111827; margin: 4px 0; }
.info-row { display: flex; justify-content: space-between; gap: 8px; font-size: 9px; padding: 1px 0; }
.info-row .label { color: #6b7280; white-space: nowrap; }
.info-row .value { text-align: right; font-weight: 700; color: #111827; }
.item-row { display: flex; align-items: flex-start; gap: 6px; padding: 2px 0; font-size: 9px; }
.item-row .qty { width: 18px; text-align: center; font-weight: 900; flex-shrink: 0; }
.item-row .name { flex: 1; font-weight: 600; min-width: 0; }
.item-row .price { text-align: right; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
.item-row .note { font-size: 7px; color: #6b7280; padding-left: 24px; }
.total-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; padding: 2px 0; }
.total-row.grand { font-size: 14px; font-weight: 900; border-top: 1.5px solid #111827; padding-top: 4px; margin-top: 2px; }
.kpi-card { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3px 5px; margin: 2px 0; }
.kpi-card .kpi-label { font-size: 6px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
.kpi-card .kpi-value { font-size: 10px; font-weight: 900; color: #111827; }
.section-title { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; background: #111827; color: #fff; padding: 3px 6px; border-radius: 3px; margin: 6px 0 3px; text-align: center; }
.footer { margin-top: 6px; padding-top: 4px; border-top: 1px solid #d1d5db; text-align: center; font-size: 7px; color: #9ca3af; }
.signature-line { border-bottom: 1px solid #9ca3af; margin: 12px 0 3px; }
.qr-box { width: 54px; height: 54px; margin: 6px auto; border: 1px dashed #9ca3af; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: 800; color: #9ca3af; }
.note-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 6px; font-size: 7px; color: #6b7280; }
${extra}
@media print { body { width: 58mm; } }
`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. MODERN 58mm BILL / GUEST CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate advanced thermal text for a restaurant bill.
 * Uses line-pair formatting, dividers, and centered headers.
 */
export function buildModernBillThermalText(data = {}) {
  const s = data.settings || {}
  const totals = data.totals || {}
  const paid = Number.isFinite(Number(data.paidAmount)) ? Number(data.paidAmount) : totals.total
  const due = Math.max(0, (Number(totals.total) || 0) - paid)
  const change = Math.max(0, paid - (Number(totals.total) || 0))
  const W = 32

  const lines = [
    doubleDivider(W),
    padCenter(data.restaurantName || s.restaurantName || 'RESTAURANT', W),
    s.branchName ? padCenter(s.branchName, W) : '',
    s.address ? padCenter(s.address, W) : '',
    s.phone ? padCenter(`Tel: ${s.phone}`, W) : '',
    s.taxNumber ? padCenter(`Tax #: ${s.taxNumber}`, W) : '',
    doubleDivider(W),
    '',
    padCenter('GUEST CHECK', W),
    '',
    divider('-', W),
    lineLR('Order #', data.orderNumber || '---', W),
    lineLR('Bill #', data.billNumber || `BILL-${(data.orderNumber || '').replace(/^#/, '')}`, W),
    lineLR('Type', data.orderType || 'Dine-in', W),
    lineLR('Table', data.table || '---', W),
    lineLR('Guest', (data.customerName || 'Walk-in Guest').slice(0, 20), W),
    lineLR('Date', new Date(data.date || Date.now()).toLocaleString(), W),
    divider('-', W),
    '',
  ]

  // Items header
  lines.push(padRight('  ITEM                  AMOUNT', W))
  lines.push(divider('-', W))

  // Item rows
  for (const row of (data.rows || [])) {
    const qty = row.quantity || row.qty || 1
    const name = (row.item?.name || row.name || 'Item').slice(0, 18)
    const price = mv(row.lineTotal, 'PKR')
    lines.push(lineLR(`${qty}x ${name}`, price, W))
    if (row.unitPrice) {
      const up = mv(row.unitPrice, 'PKR')
      lines.push(`  @ ${up} each`)
    }
    if (row.note) {
      lines.push(`  Note: ${String(row.note).slice(0, 22)}`)
    }
  }

  // Totals
  lines.push('')
  lines.push(divider('-', W))
  lines.push(lineLR('SUBTOTAL', mv(totals.subtotal, 'PKR'), W))
  if (Number(totals.discount) > 0) lines.push(lineLR('DISCOUNT', mv(totals.discount, 'PKR'), W))
  if (Number(totals.serviceCharges) > 0) lines.push(lineLR('SVC CHARGE', mv(totals.serviceCharges, 'PKR'), W))
  if (Number(totals.tax) > 0) lines.push(lineLR('TAX', mv(totals.tax, 'PKR'), W))
  lines.push(doubleDivider(W))
  lines.push(lineLR('TOTAL', mv(totals.total, 'PKR'), W))
  lines.push(doubleDivider(W))
  lines.push(lineLR('PAID', mv(paid, 'PKR'), W))
  if (change > 0) {
    lines.push(lineLR('CHANGE DUE', mv(change, 'PKR'), W))
  } else if (due > 0) {
    lines.push(lineLR('BALANCE DUE', mv(due, 'PKR'), W))
  }
  lines.push(lineLR('PAYMENT', data.paymentMethod || 'Cash', W))
  lines.push('')
  lines.push(divider('-', W))
  lines.push(padCenter('THANK YOU', W))
  lines.push(padCenter(s.footerMessage || 'Please visit again', W))
  lines.push(padCenter('NEXORA SOLUTION © 2019-2026', W))
  lines.push(doubleDivider(W))

  return lines.filter(Boolean).join('\n')
}

/**
 * Generate modern 58mm bill as printable HTML.
 */
export function buildModernBillPrintHtml(data = {}) {
  const s = data.settings || {}
  const totals = data.totals || {}
  const paid = Number.isFinite(Number(data.paidAmount)) ? Number(data.paidAmount) : totals.total
  const due = Math.max(0, (Number(totals.total) || 0) - paid)
  const change = Math.max(0, paid - (Number(totals.total) || 0))

  const itemsHtml = (data.rows || []).map((row) => {
    const qty = row.quantity || row.qty || 1
    const name = esc(row.item?.name || row.name || 'Item')
    const price = mv(row.lineTotal)
    const unit = row.unitPrice ? `<div class="item-row"><span class="qty"></span><span class="note">@ ${mv(row.unitPrice)} each</span></div>` : ''
    const note = row.note ? `<div class="item-row"><span class="qty"></span><span class="note">Note: ${esc(row.note)}</span></div>` : ''
    return `<div class="item-row"><span class="qty">${qty}&times;</span><span class="name">${name}</span><span class="price">${price}</span></div>${unit}${note}`
  }).join('')

  const totalRows = []
  totalRows.push(`<div class="total-row"><span>Subtotal</span><span class="bold">${mv(totals.subtotal)}</span></div>`)
  if (Number(totals.discount) > 0) totalRows.push(`<div class="total-row"><span>Discount</span><span>${mv(totals.discount)}</span></div>`)
  if (Number(totals.serviceCharges) > 0) totalRows.push(`<div class="total-row"><span>Service Charge</span><span>${mv(totals.serviceCharges)}</span></div>`)
  if (Number(totals.tax) > 0) totalRows.push(`<div class="total-row"><span>Tax</span><span>${mv(totals.tax)}</span></div>`)
  totalRows.push(`<div class="total-row grand"><span>TOTAL</span><span>${mv(totals.total)}</span></div>`)
  totalRows.push(`<div class="info-row"><span class="label">Paid</span><span class="value">${mv(paid)}</span></div>`)
  if (change > 0) totalRows.push(`<div class="info-row"><span class="label">Change</span><span class="value">${mv(change)}</span></div>`)
  if (due > 0) totalRows.push(`<div class="info-row"><span class="label">Balance Due</span><span class="value bold">${mv(due)}</span></div>`)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Bill ${esc(data.billNumber || data.orderNumber || '')}</title>
<style>${thermalCss()}</style></head>
<body>
<div class="receipt">
  <div class="center">
    <div class="brand">${esc(data.restaurantName || s.restaurantName || 'Restaurant')}</div>
    ${s.branchName ? `<div class="subhead">${esc(s.branchName)}</div>` : ''}
    ${s.address ? `<div class="subhead">${esc(s.address)}</div>` : ''}
    ${s.phone ? `<div class="subhead">Tel: ${esc(s.phone)}</div>` : ''}
    ${s.taxNumber ? `<div class="subhead">Tax #: ${esc(s.taxNumber)}</div>` : ''}
    <div class="divider-double"></div>
    <div class="title-badge">Guest Check</div>
  </div>
  <div class="divider"></div>
  <div class="info-row"><span class="label">Order #</span><span class="value">${esc(data.orderNumber)}</span></div>
  <div class="info-row"><span class="label">Bill #</span><span class="value">${esc(data.billNumber || `BILL-${String(data.orderNumber || '').replace(/^#/, '')}`)}</span></div>
  <div class="info-row"><span class="label">Type</span><span class="value">${esc(data.orderType || 'Dine-in')}</span></div>
  <div class="info-row"><span class="label">Table</span><span class="value">${esc(data.table || '---')}</span></div>
  <div class="info-row"><span class="label">Guest</span><span class="value">${esc((data.customerName || 'Walk-in Guest').slice(0, 25))}</span></div>
  <div class="info-row"><span class="label">Date</span><span class="value">${esc(new Date(data.date || Date.now()).toLocaleString())}</span></div>
  <div class="divider"></div>
  ${itemsHtml}
  <div class="divider-solid"></div>
  ${totalRows.join('')}
  <div class="divider"></div>
  <div class="center">
    ${s.enableBillQr ? '<div class="qr-box">QR CODE</div>' : ''}
    <div class="bold">THANK YOU</div>
    <div class="subhead" style="margin-top:2px;">${esc(s.footerMessage || 'Please visit again')}</div>
    <div class="footer">NEXORA SOLUTION &copy; 2019-2026</div>
  </div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. MODERN 58mm KOT (KITCHEN ORDER TICKET)
// ═══════════════════════════════════════════════════════════════════════════════

export function buildModernKotThermalText(data = {}) {
  const s = data.settings || {}
  const W = 32
  const priority = String(data.priority || 'Normal').toUpperCase()

  const lines = [
    doubleDivider(W),
    padCenter('** KITCHEN COPY **', W),
    padCenter(data.restaurantName || s.restaurantName || 'RESTAURANT', W),
    doubleDivider(W),
    '',
    lineLR('KOT #', data.kotNumber || '---', W),
    lineLR('Order #', data.orderNumber || '---', W),
    lineLR('Type', data.orderType || 'Dine-in', W),
    lineLR('Table', data.table || '---', W),
    lineLR('Priority', priority, W),
    lineLR('Time', new Date(data.date || Date.now()).toLocaleString(), W),
    '',
    divider('=', W),
    padCenter('ITEMS', W),
    divider('=', W),
  ]

  for (const row of (data.rows || [])) {
    const qty = row.quantity || row.qty || 1
    const name = (row.item?.name || row.name || 'Item').slice(0, 24)
    lines.push(`[${qty}x] ${name}`)
    if (row.note) lines.push(`   >> ${String(row.note).slice(0, 24)}`)
  }

  lines.push('')
  if (data.notes) {
    lines.push(divider('-', W))
    lines.push('NOTES:')
    lines.push(String(data.notes).slice(0, 60))
  }

  lines.push('')
  lines.push(doubleDivider(W))
  lines.push(padCenter(`PRIORITY: ${priority}`, W))
  lines.push(padCenter('NEXORA KDS © 2019-2026', W))
  lines.push(doubleDivider(W))

  return lines.filter(Boolean).join('\n')
}

export function buildModernKotPrintHtml(data = {}) {
  const s = data.settings || {}
  const priority = String(data.priority || 'Normal').toUpperCase()

  const itemsHtml = (data.rows || []).map((row) => {
    const qty = row.quantity || row.qty || 1
    const name = esc(row.item?.name || row.name || 'Item')
    const note = row.note ? `<div class="note-box">${esc(row.note)}</div>` : ''
    return `<div class="item-row" style="font-size:11px;"><span class="qty" style="font-size:13px;">[${qty}]</span><span class="name" style="font-size:11px;">${name}</span></div>${note}`
  }).join('')

  const priorityColor = priority === 'HIGH' ? '#dc2626' : priority === 'MEDIUM' ? '#d97706' : '#2563eb'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>KOT ${esc(data.kotNumber || '')}</title>
<style>${thermalCss(`
  .priority-badge {
    display: inline-block; padding: 2px 10px; border-radius: 3px;
    font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
    background: ${priorityColor}; color: #fff;
  }
`)}</style></head>
<body>
<div class="receipt">
  <div class="center">
    <div class="brand" style="font-size:15px;">KITCHEN COPY</div>
    <div class="subhead" style="font-size:10px;font-weight:700;">${esc(data.restaurantName || s.restaurantName || 'Restaurant')}</div>
    ${s.branchName ? `<div class="subhead">${esc(s.branchName)}</div>` : ''}
    <div class="divider-double"></div>
  </div>
  <div class="info-row"><span class="label">KOT #</span><span class="value" style="font-size:12px;font-weight:900;">${esc(data.kotNumber)}</span></div>
  <div class="info-row"><span class="label">Order #</span><span class="value">${esc(data.orderNumber)}</span></div>
  <div class="info-row"><span class="label">Type / Table</span><span class="value">${esc(data.orderType || 'Dine-in')} / ${esc(data.table || '---')}</span></div>
  <div class="info-row"><span class="label">Time</span><span class="value">${esc(new Date(data.date || Date.now()).toLocaleString())}</span></div>
  <div class="info-row"><span class="label">Priority</span><span class="value"><span class="priority-badge">${priority}</span></span></div>
  <div class="divider-solid"></div>
  <div class="section-title">ORDER ITEMS</div>
  ${itemsHtml}
  ${data.notes ? `<div class="divider"></div><div class="note-box"><strong>Notes:</strong> ${esc(data.notes)}</div>` : ''}
  <div class="divider-double"></div>
  <div class="center">
    <div style="font-size:8px;color:#9ca3af;">NEXORA KDS &copy; 2019-2026</div>
  </div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. MODERN 58mm DAILY CLOSING REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function buildModernDailyClosingThermalText({
  model = {},
  restaurantName = 'Restaurant',
  dateRangeLabel = '',
  currency = 'PKR',
  generatedAt = '',
  settings = {},
} = {}) {
  const rc = model.cashReconciliation || {}
  const refundTotal = model.refunds?.total || 0
  const netSalesCalc = model.grossSales - model.discounts - refundTotal
  const W = 32

  const line = (label, value) => padRight(`${label}: ${value}`, W)
  const build = []

  // ══ HEADER ══
  build.push(
    doubleDivider(W),
    padCenter(restaurantName.toUpperCase(), W),
    padCenter('DAILY CLOSING REPORT', W),
    padCenter(dateRangeLabel, W),
    doubleDivider(W),
    '',
  )

  // ══ ORDERS & SALES ══
  build.push(
    padCenter('── ORDERS & SALES ──', W),
    line('Billed Orders', nv(model.billedOrders?.length || 0)),
    line('Cancelled', nv(model.cancellations?.count || 0)),
    line('Gross Sales', mv(model.grossSales, currency)),
    line('Discounts', mv(model.discounts, currency)),
    line('Refunds', mv(refundTotal, currency)),
    line('NET SALES', mv(netSalesCalc, currency)),
    line('Average Order', mv(model.averageOrderValue, currency)),
    line('Largest Bill', mv(model.largestBill, currency)),
  )

  // ══ PAYMENTS ══
  build.push(
    '',
    padCenter('── PAYMENTS ──', W),
    line('Cash Received', mv(model.cashReceived, currency)),
    line('Online Received', mv(model.onlineReceived, currency)),
    line('Total Collected', mv(model.collectedAmount, currency)),
    line('Outstanding', mv(model.outstandingAmount, currency)),
  )

  // Payment method breakdown
  if (model.collectionsByPaymentMethod && Object.keys(model.collectionsByPaymentMethod).length) {
    for (const [method, amount] of Object.entries(model.collectionsByPaymentMethod)) {
      if (Number(amount) > 0) build.push(line(`  ${method}`, mv(amount, currency)))
    }
  }

  // ══ TAX & CHARGES ══
  build.push(
    '',
    padCenter('── TAX & CHARGES ──', W),
    line('Tax', mv(model.tax, currency)),
    line('Service Charges', mv(model.serviceCharges, currency)),
  )

  // ══ ORDER TYPES ══
  if (model.salesByOrderType && Object.keys(model.salesByOrderType).length) {
    build.push('', padCenter('── ORDER TYPES ──', W))
    for (const [type, sales] of Object.entries(model.salesByOrderType)) {
      if (Number(sales) > 0) build.push(line(type, mv(sales, currency)))
    }
  }

  // ══ EXPENSES ══
  build.push(
    '',
    padCenter('── EXPENSES ──', W),
    line('Total Expenses', mv(model.approvedExpenses, currency)),
    line('Count', nv(model.expenseSummary?.count || 0)),
  )

  // ══ PROFIT ══
  build.push(
    '',
    padCenter('── PROFIT ──', W),
    line('COGS', mv(model.costOfGoodsSold, currency)),
    line('Gross Profit', mv(model.grossProfit, currency)),
    line('Net Profit', mv(model.netProfit, currency)),
  )

  // ══ CASH DRAWER ══
  build.push(
    '',
    padCenter('── CASH DRAWER ──', W),
    line('Opening Cash', mv(model.openingCash, currency)),
    line('Expected Cash', mv(rc.expectedCash || model.openingCash, currency)),
    line('Actual Cash', rc.actualClosingCash != null ? mv(rc.actualClosingCash, currency) : 'Not Recorded'),
    line('Difference', rc.cashDifference != null ? mv(rc.cashDifference, currency) : 'N/A'),
  )

  // ══ CATEGORIES ══
  if (model.categorySales && model.categorySales.length) {
    build.push('', padCenter('── TOP CATEGORIES ──', W))
    for (const cat of model.categorySales.slice(0, 5)) {
      build.push(line(cat.category.slice(0, 20), mv(cat.revenue, currency)))
    }
  }

  // ══ TOP ITEMS ══
  if (model.itemSales && model.itemSales.length) {
    build.push('', padCenter('── TOP ITEMS ──', W))
    for (const item of model.itemSales.slice(0, 5)) {
      build.push(line(`${item.name.slice(0, 18)} x${item.quantity}`, mv(item.revenue, currency)))
    }
  }

  // ══ CANCELLATIONS ══
  if (model.cancellations?.rows?.length) {
    build.push('', padCenter('── CANCELLATIONS ──', W))
    for (const row of model.cancellations.rows.slice(0, 5)) {
      build.push(line(row.cancelReason?.slice(0, 20) || 'No reason', mv(row.total, currency)))
    }
  }

  // ══ FOOTER ══
  build.push(
    '',
    doubleDivider(W),
    padCenter(`Generated: ${generatedAt}`, W),
    padCenter('NEXORA SOLUTION', W),
    padCenter('All rights reserved 2019-2026.', W),
    doubleDivider(W),
  )

  return build.filter(Boolean).join('\n')
}

/**
 * Modern 58mm Daily Closing as styled HTML for browser print.
 */
export function buildModernDailyClosingPrintHtml({
  model = {},
  restaurantName = 'Restaurant',
  dateRangeLabel = '',
  currency = 'PKR',
  generatedAt = '',
  settings = {},
} = {}) {
  const rc = model.cashReconciliation || {}
  const refundTotal = model.refunds?.total || 0
  const netSalesCalc = model.grossSales - model.discounts - refundTotal

  const kpiCard = (label, value) =>
    `<div class="kpi-card"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${esc(value)}</div></div>`

  let html = `
<div class="receipt">
  <div class="center">
    <div class="brand">${esc(restaurantName)}</div>
    <div class="title-badge" style="margin:5px 0;">Daily Closing</div>
    <div class="subhead">${esc(dateRangeLabel)}</div>
    <div class="subhead">Generated: ${esc(generatedAt)}</div>
  </div>
  <div class="divider-double"></div>

  <div class="section-title">Orders & Sales</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Billed Orders', nv(model.billedOrders?.length || 0))}
    ${kpiCard('Cancelled', nv(model.cancellations?.count || 0))}
    ${kpiCard('Gross Sales', mv(model.grossSales, currency))}
    ${kpiCard('Discounts', mv(model.discounts, currency))}
    ${kpiCard('Refunds', mv(refundTotal, currency))}
    ${kpiCard('NET SALES', mv(netSalesCalc, currency))}
  </div>

  <div class="section-title">Payments</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Cash', mv(model.cashReceived, currency))}
    ${kpiCard('Online', mv(model.onlineReceived, currency))}
    ${kpiCard('Collected', mv(model.collectedAmount, currency))}
    ${kpiCard('Outstanding', mv(model.outstandingAmount, currency))}
  </div>`

  // Payment breakdown
  if (model.collectionsByPaymentMethod && Object.keys(model.collectionsByPaymentMethod).length) {
    html += `<div class="section-title">Payment Methods</div>`
    for (const [method, amount] of Object.entries(model.collectionsByPaymentMethod)) {
      if (Number(amount) > 0) {
        html += `<div class="info-row"><span class="label">${esc(method)}</span><span class="value">${mv(amount, currency)}</span></div>`
      }
    }
  }

  html += `
  <div class="section-title">Tax & Charges</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Tax', mv(model.tax, currency))}
    ${kpiCard('Service Charges', mv(model.serviceCharges, currency))}
  </div>

  <div class="section-title">Expenses & Profit</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Expenses', mv(model.approvedExpenses, currency))}
    ${kpiCard('COGS', mv(model.costOfGoodsSold, currency))}
    ${kpiCard('Gross Profit', mv(model.grossProfit, currency))}
    ${kpiCard('Net Profit', mv(model.netProfit, currency))}
  </div>

  <div class="section-title">Cash Drawer</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Opening Cash', mv(model.openingCash, currency))}
    ${kpiCard('Expected', mv(rc.expectedCash || model.openingCash, currency))}
    ${kpiCard('Actual', rc.actualClosingCash != null ? mv(rc.actualClosingCash, currency) : 'N/A')}
    ${kpiCard('Difference', rc.cashDifference != null ? mv(rc.cashDifference, currency) : 'N/A')}
  </div>`

  // Top categories
  if (model.categorySales && model.categorySales.length) {
    html += `<div class="section-title">Top Categories</div>`
    for (const cat of model.categorySales.slice(0, 5)) {
      html += `<div class="info-row"><span class="label">${esc(cat.category)}</span><span class="value">${mv(cat.revenue, currency)}</span></div>`
    }
  }

  // Signatures
  html += `
  <div class="divider-solid" style="margin-top:8px;"></div>
  <div class="section-title">Sign-off</div>
  <div class="signature-line"></div>
  <div class="info-row"><span class="label">Prepared By (Cashier)</span></div>
  <div class="signature-line"></div>
  <div class="info-row"><span class="label">Reviewed By (Manager)</span></div>
  <div class="divider-double" style="margin-top:8px;"></div>
  <div class="center">
    <div class="footer">NEXORA SOLUTION &copy; 2019-2026</div>
  </div>
</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Daily Closing 58mm — ${esc(restaurantName)}</title>
<style>${thermalCss()}</style></head>
<body>${html}</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. MODERN 58mm CASH DRAWER RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════════

export function buildModernCashReconciliationThermalText({
  model = {},
  restaurantName = 'Restaurant',
  dateRangeLabel = '',
  currency = 'PKR',
  generatedAt = '',
} = {}) {
  const rc = model.cashReconciliation || {}
  const W = 32

  const line = (label, value) => padRight(`${label}: ${value}`, W)

  const build = [
    doubleDivider(W),
    padCenter(restaurantName.toUpperCase(), W),
    padCenter('CASH RECONCILIATION', W),
    padCenter(dateRangeLabel, W),
    doubleDivider(W),
    '',
    padCenter('── CASH MOVEMENT ──', W),
    line('Opening Cash', mv(model.openingCash, currency)),
    line('(+) Cash Sales', mv(rc.cashSales, currency)),
    line('(+) Deposits', mv(rc.cashDeposits || 0, currency)),
    line('(-) Refunds', mv(rc.cashRefunds, currency)),
    line('(-) Withdrawals', mv(rc.cashWithdrawals || 0, currency)),
    line('(-) Expenses', mv(rc.cashExpenses || 0, currency)),
    line('(-) Adjustments', mv(rc.cashAdjustments || 0, currency)),
    '',
    doubleDivider(W),
    line('EXPECTED CASH', mv(rc.expectedCash || model.openingCash, currency)),
    line('ACTUAL CASH', rc.actualClosingCash != null ? mv(rc.actualClosingCash, currency) : 'Not Recorded'),
    line('DIFFERENCE', rc.cashDifference != null ? mv(rc.cashDifference, currency) : 'N/A'),
    line('VARIANCE', rc.varianceStatus ? String(rc.varianceStatus).replace(/_/g, ' ') : 'N/A'),
    doubleDivider(W),
    '',
    line('Total Txns', nv(rc.totalTransactions || 0)),
    line('Avg Sale', mv(rc.averageSale, currency)),
    line('Largest Sale', mv(rc.largestSale, currency)),
    line('Largest Refund', mv(rc.largestRefund, currency)),
  ]

  // Settlements
  if (rc.settlementCounts?.total > 0) {
    build.push(
      '',
      padCenter('── SETTLEMENTS ──', W),
      line('Pending Review', nv(rc.settlementCounts.pendingReview || 0)),
      line('Approved', nv(rc.settlementCounts.approved || 0)),
      line('Rejected', nv(rc.settlementCounts.rejected || 0)),
      line('Locked', nv(rc.settlementCounts.locked || 0)),
    )
  }

  // Shift details
  const settledShifts = (rc.cashSessions || []).filter(
    (s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked'
  )
  if (settledShifts.length) {
    build.push('', padCenter('── SHIFT DETAILS ──', W))
    for (const shift of settledShifts.slice(0, 5)) {
      build.push(
        line(`Cashier: ${(shift.cashierName || '---').slice(0, 18)}`, ''),
        line('  Open/Close', `${mv(shift.openingCash, currency)} / ${mv(shift.actualClosingCash, currency)}`),
        line('  Diff', `${mv(shift.cashDifference, currency)} (${String(shift.varianceStatus || 'N/A').replace(/_/g, ' ')})`),
      )
    }
  }

  build.push(
    '',
    doubleDivider(W),
    padCenter(`Generated: ${generatedAt}`, W),
    padCenter('NEXORA SOLUTION', W),
    doubleDivider(W),
  )

  return build.filter(Boolean).join('\n')
}

export function buildModernCashReconciliationPrintHtml({
  model = {},
  restaurantName = 'Restaurant',
  dateRangeLabel = '',
  currency = 'PKR',
  generatedAt = '',
} = {}) {
  const rc = model.cashReconciliation || {}

  const kpiCard = (label, value, tone = '') =>
    `<div class="kpi-card${tone ? `" style="border-color:${tone}` : ''}"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${esc(value)}</div></div>`

  const diffColor = !rc.cashDifference ? '' : rc.cashDifference > 0 ? '#059669' : '#dc2626'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Cash Reconciliation 58mm — ${esc(restaurantName)}</title>
<style>${thermalCss()}</style></head>
<body>
<div class="receipt">
  <div class="center">
    <div class="brand">${esc(restaurantName)}</div>
    <div class="title-badge" style="margin:5px 0;">Cash Reconciliation</div>
    <div class="subhead">${esc(dateRangeLabel)}</div>
    <div class="subhead">Generated: ${esc(generatedAt)}</div>
  </div>
  <div class="divider-double"></div>

  <div class="section-title">Cash Movement</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Opening Cash', mv(model.openingCash, currency))}
    ${kpiCard('+ Cash Sales', mv(rc.cashSales, currency))}
    ${kpiCard('+ Deposits', mv(rc.cashDeposits || 0, currency))}
    ${kpiCard('- Refunds', mv(rc.cashRefunds, currency))}
    ${kpiCard('- Withdrawals', mv(rc.cashWithdrawals || 0, currency))}
    ${kpiCard('- Expenses', mv(rc.cashExpenses || 0, currency))}
    ${kpiCard('- Adjustments', mv(rc.cashAdjustments || 0, currency))}
  </div>

  <div class="divider-double"></div>
  <div class="section-title">Result</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Expected Cash', mv(rc.expectedCash || model.openingCash, currency))}
    ${kpiCard('Actual Cash', rc.actualClosingCash != null ? mv(rc.actualClosingCash, currency) : 'N/A')}
  </div>
  <div class="kpi-card" style="margin-top:4px;${diffColor ? `border:2px solid ${diffColor};` : ''}">
    <div class="kpi-label">Cash Difference</div>
    <div class="kpi-value" style="${diffColor ? `color:${diffColor};font-size:14px;` : ''}">${rc.cashDifference != null ? mv(rc.cashDifference, currency) : 'N/A'}</div>
  </div>
  <div class="info-row"><span class="label">Variance</span><span class="value">${esc(String(rc.varianceStatus || 'N/A').replace(/_/g, ' '))}</span></div>

  <div class="section-title">Stats</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
    ${kpiCard('Total Txns', nv(rc.totalTransactions || 0))}
    ${kpiCard('Avg Sale', mv(rc.averageSale, currency))}
    ${kpiCard('Largest Sale', mv(rc.largestSale, currency))}
    ${kpiCard('Largest Refund', mv(rc.largestRefund, currency))}
  </div>

  <div class="section-title">Sign-off</div>
  <div class="signature-line"></div>
  <div class="info-row"><span class="label">Prepared By (Cashier)</span></div>
  <div class="signature-line"></div>
  <div class="info-row"><span class="label">Approved By (Manager)</span></div>

  <div class="divider-double" style="margin-top:8px;"></div>
  <div class="center">
    <div class="footer">NEXORA SOLUTION &copy; 2019-2026</div>
  </div>
</div>
</body></html>`
}
