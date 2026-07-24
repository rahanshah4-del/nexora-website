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
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 8.5px;
  line-height: 1.4;
  padding: 2.5mm 2mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.receipt { width: 100%; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: 700; }

/* ── Modern Brand Header ── */
.brand-header { text-align: center; padding: 6px 0 8px; border-bottom: 2px solid #1a1a1a; margin-bottom: 6px; }
.brand-logo { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.brand-sub { font-size: 7px; color: #666; font-weight: 500; margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }
.brand-tag { display: inline-block; font-size: 6.5px; font-weight: 700; background: #1a1a1a; color: #fff; padding: 2px 12px; border-radius: 10px; margin-top: 4px; letter-spacing: 0.08em; text-transform: uppercase; }

/* ── Dividers ── */
.divider { border-top: 1px dotted #ccc; margin: 5px 0; }
.divider-solid { border-top: 1px solid #333; margin: 5px 0; }
.divider-double { border-top: 2.5px solid #1a1a1a; margin: 5px 0; }
.divider-accent { border-top: 1.5px solid #1a1a1a; margin: 6px 0; width: 60%; margin-left: auto; margin-right: auto; }

/* ── Info Card ── */
.info-card { background: #f8f8f8; border-radius: 6px; padding: 5px 6px; margin: 4px 0; }
.info-row { display: flex; justify-content: space-between; gap: 6px; font-size: 8px; padding: 1.5px 0; }
.info-row .label { color: #777; font-weight: 500; white-space: nowrap; font-size: 7.5px; }
.info-row .value { text-align: right; font-weight: 600; color: #1a1a1a; font-size: 8px; }

/* ── Items ── */
.item-header { display: flex; gap: 4px; font-size: 7px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 0 2px; border-bottom: 1px solid #eee; margin-bottom: 2px; }
.item-header .iqty { width: 16px; text-align: center; }
.item-header .iname { flex: 1; }
.item-header .iprice { width: 52px; text-align: right; }
.item-row { display: flex; align-items: flex-start; gap: 4px; padding: 2.5px 0; font-size: 8.5px; border-bottom: 0.5px solid #f5f5f5; }
.item-row .qty { width: 16px; text-align: center; font-weight: 700; font-size: 8px; background: #f0f0f0; border-radius: 3px; padding: 1px 0; flex-shrink: 0; }
.item-row .name { flex: 1; font-weight: 600; min-width: 0; font-size: 8.5px; }
.item-row .price { text-align: right; font-weight: 700; flex-shrink: 0; white-space: nowrap; font-size: 8.5px; width: 52px; }
.item-row .note { font-size: 7px; color: #999; padding-left: 20px; font-style: italic; }
.item-variant { font-size: 7px; color: #888; padding-left: 20px; }

/* ── Totals ── */
.totals-block { margin-top: 5px; padding: 5px 6px; background: #fafafa; border-radius: 6px; }
.total-row { display: flex; justify-content: space-between; gap: 8px; font-size: 8.5px; padding: 2px 0; }
.total-row .tl { color: #666; font-weight: 500; }
.total-row .tv { font-weight: 700; color: #1a1a1a; }
.total-row.grand { font-size: 13px; font-weight: 800; border-top: 2px solid #1a1a1a; padding-top: 5px; margin-top: 3px; }
.total-row.grand .tl { color: #1a1a1a; font-weight: 800; }
.total-row.grand .tv { font-weight: 900; }

/* ── Payment Badge ── */
.pay-badge { display: inline-block; font-size: 7px; font-weight: 700; padding: 3px 10px; border-radius: 10px; margin: 4px 0; letter-spacing: 0.04em; }
.pay-cash { background: #e8f5e9; color: #2e7d32; }
.pay-card { background: #e3f2fd; color: #1565c0; }

/* ── KOT Styling ── */
.kot-header { background: #1a1a1a; color: #fff; text-align: center; padding: 8px 6px; border-radius: 8px; margin-bottom: 6px; }
.kot-header .kot-title { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.kot-header .kot-meta { font-size: 7px; color: #ccc; margin-top: 3px; font-weight: 500; }
.kot-urgent { border: 2px solid #1a1a1a !important; }
.kot-urgent .kot-header { background: #1a1a1a; }
.kot-item { display: flex; gap: 4px; padding: 3px 0; font-size: 9px; font-weight: 700; align-items: center; border-bottom: 0.5px solid #eee; }
.kot-item .kqty { font-size: 14px; font-weight: 900; min-width: 22px; text-align: center; }
.kot-item .kname { flex: 1; font-weight: 700; }
.kot-item .knote { font-size: 7px; font-weight: 500; color: #666; margin-left: 4px; }

/* ── Sections ── */
.section-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: #1a1a1a; color: #fff; padding: 4px 8px; border-radius: 5px; margin: 8px 0 4px; text-align: center; }
.section-chip { display: inline-block; font-size: 7px; font-weight: 700; border: 1px solid #ddd; border-radius: 8px; padding: 2px 8px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; }

/* ── Footer ── */
.footer { margin-top: 8px; padding-top: 5px; border-top: 1.5px solid #1a1a1a; text-align: center; font-size: 6.5px; color: #999; line-height: 1.5; }
.footer .thanks { font-size: 8px; font-weight: 700; color: #1a1a1a; margin-bottom: 3px; }
.stamp-box { border: 1.5px dashed #ccc; border-radius: 8px; padding: 6px; margin: 8px 0; text-align: center; font-size: 7px; color: #aaa; text-transform: uppercase; letter-spacing: 0.08em; }

/* ── QR ── */
.qr-box { width: 48px; height: 48px; margin: 6px auto; border: 1.5px solid #e0e0e0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: 700; color: #ccc; background: #fafafa; }
.note-box { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 5px 7px; font-size: 7px; color: #888; margin: 4px 0; }
.emoji-icon { font-size: 12px; }

/* ── KPI Cards ── */
.kpi-row { display: flex; gap: 3px; margin: 4px 0; }
.kpi-card { flex: 1; background: #fafafa; border-radius: 6px; padding: 4px 5px; text-align: center; border: 1px solid #f0f0f0; }
.kpi-card .kpi-label { font-size: 6px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-card .kpi-value { font-size: 11px; font-weight: 800; color: #1a1a1a; margin-top: 1px; }

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
  <div class="brand-header">
    <div class="brand-logo">${esc(data.restaurantName || s.restaurantName || 'RESTAURANT')}</div>
    ${s.branchName ? `<div class="brand-sub">${esc(s.branchName)}</div>` : ''}
    ${s.address ? `<div class="brand-sub">${esc(s.address)}</div>` : ''}
    ${s.phone ? `<div class="brand-sub">Tel: ${esc(s.phone)}</div>` : ''}
    ${s.taxNumber ? `<div class="brand-sub">NTN: ${esc(s.taxNumber)}</div>` : ''}
    <div class="brand-tag">🧾 Guest Check</div>
  </div>

  <div class="info-card">
    <div class="info-row"><span class="label">Order #</span><span class="value">${esc(data.orderNumber || '---')}</span></div>
    <div class="info-row"><span class="label">Bill #</span><span class="value">${esc(data.billNumber || `BILL-${String(data.orderNumber || '').replace(/^#/, '')}`)}</span></div>
    <div class="info-row"><span class="label">Type</span><span class="value">${esc(data.orderType || 'Dine-in')}</span></div>
    <div class="info-row"><span class="label">Table</span><span class="value">${esc(data.table || '---')}</span></div>
    <div class="info-row"><span class="label">Guest</span><span class="value">${esc((data.customerName || 'Walk-in Guest').slice(0, 25))}</span></div>
    <div class="info-row"><span class="label">Date</span><span class="value">${esc(new Date(data.date || Date.now()).toLocaleString())}</span></div>
  </div>

  <div class="item-header"><span class="iqty">QTY</span><span class="iname">ITEM</span><span class="iprice">AMOUNT</span></div>
  ${itemsHtml}

  <div class="totals-block">
  ${totalRows.join('')}
  <div class="info-row" style="margin-top:3px;"><span class="label">Payment</span><span class="value">${esc(data.paymentMethod || 'Cash')}</span></div>
  </div>

  <div class="center" style="margin-top:8px;">
    <span class="pay-badge ${(data.paymentMethod || '').toLowerCase().includes('card') ? 'pay-card' : 'pay-cash'}">${esc(data.paymentMethod || 'Cash')}</span>
    ${paid > 0 && change > 0 ? `<div class="info-row" style="justify-content:center;gap:4px;"><span class="label">Paid</span><span class="value">${mv(paid)}</span><span class="label">Change</span><span class="value">${mv(change)}</span></div>` : due > 0 ? `<div class="info-row" style="justify-content:center;"><span class="label">Balance Due</span><span class="value bold">${mv(due)}</span></div>` : ''}
  </div>

  <div class="divider-accent"></div>
  <div class="center">
    ${s.enableBillQr ? '<div class="qr-box">QR</div>' : ''}
    <div class="thanks">✨ Thank You!</div>
    <div class="subhead">${esc(s.footerMessage || 'Please visit again')}</div>
    <div class="footer">Powered by Nexora Solution</div>
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

  const priorityEmoji = priority === 'HIGH' ? '🔴' : priority === 'MEDIUM' ? '🟡' : '🔵'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>KOT ${esc(data.kotNumber || '')}</title>
<style>${thermalCss(`.priority-badge{display:inline-block;padding:3px 10px;border-radius:8px;font-size:8px;font-weight:800;letter-spacing:0.06em;background:${priorityColor};color:#fff;}`)}</style></head>
<body>
<div class="receipt ${priority === 'HIGH' ? 'kot-urgent' : ''}">
  <div class="kot-header">
    <div class="kot-title">🔥 KITCHEN ORDER</div>
    <div class="kot-meta">${esc(data.restaurantName || s.restaurantName || 'Restaurant')}${s.branchName ? ' · ' + esc(s.branchName) : ''}</div>
  </div>

  <div class="info-card">
    <div class="info-row"><span class="label">KOT #</span><span class="value" style="font-size:11px;font-weight:900;">${esc(data.kotNumber || '---')}</span></div>
    <div class="info-row"><span class="label">Order #</span><span class="value">${esc(data.orderNumber || '---')}</span></div>
    <div class="info-row"><span class="label">Table</span><span class="value">${esc(data.table || '---')} · ${esc(data.orderType || 'Dine-in')}</span></div>
    <div class="info-row"><span class="label">Time</span><span class="value">${esc(new Date(data.date || Date.now()).toLocaleString())}</span></div>
    <div class="info-row"><span class="label">Priority</span><span class="value"><span class="priority-badge">${priorityEmoji} ${priority}</span></span></div>
  </div>

  <div class="section-title">📋 Order Items</div>
  ${itemsHtml}

  ${data.notes ? `<div class="note-box"><strong>📝 Notes:</strong> ${esc(data.notes)}</div>` : ''}
  <div class="stamp-box">${priority === 'HIGH' ? '⚡ PREPARE IMMEDIATELY' : '✅ PREPARE IN ORDER'}</div>
  <div class="footer">Nexora KDS · ${new Date().toLocaleDateString()}</div>
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
