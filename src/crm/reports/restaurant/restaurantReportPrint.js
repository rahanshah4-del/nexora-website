/**
 * Restaurant Report Print/Export Adapter
 *
 * Pure functions that consume the same model shown in RestaurantReportsPage.
 * No recalculations — values come from the already-built model.
 * No Firestore or localStorage access.
 */

import { safePrintText, reportFileName } from '../../lib/printDocuments.js'
import { openBrowserPrintHtml, printThermalText, directPrinterAvailable } from '../../lib/printerService.js'

// ── Helpers ──────────────────────────────────────────────────────────────

function mv(value, currency = 'PKR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable'
  return `${currency} ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

function nv(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable'
  return Number(value).toLocaleString('en-PK')
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

function safeFilename(name) {
  return String(name || 'report').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 120) || 'report'
}

function safeDate(date) {
  if (!date) return 'Unavailable'
  try {
    return new Date(date).toLocaleString()
  } catch {
    return 'Unavailable'
  }
}

// ── A4 Print HTML Builder ────────────────────────────────────────────────

function buildA4SummaryCard(label, value) {
  const val = value === null || value === undefined || String(value).trim() === '' ? 'Unavailable' : String(value)
  return `<div class="summary-card"><p class="label">${esc(label)}</p><p class="value">${esc(val)}</p></div>`
}

function buildA4Table(title, columns, rows, emptyMessage = 'No data.') {
  if (!rows || !rows.length) {
    return `<div class="report-table"><h3>${esc(title)}</h3><p class="empty">${esc(emptyMessage)}</p></div>`
  }
  const header = columns.map((col) => `<th>${esc(col.label)}</th>`).join('')
  const body = rows.map((row) => {
    const cells = columns.map((col) => {
      const val = typeof col.value === 'function' ? col.value(row) : row[col.key]
      return `<td class="${col.numeric ? 'num' : ''}">${esc(String(val ?? ''))}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `
    <div class="report-table page-break-safe">
      <h3>${esc(title)}</h3>
      <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
    </div>
  `
}

/**
 * Build A4 printable HTML for a restaurant report.
 * Returns an HTML string ready for openBrowserPrintHtml.
 */
export function buildRestaurantPrintableReport({
  report = {},
  model = {},
  activeReport = {},
  filters = {},
  rangeLabel: dateRangeLabel = '',
  restaurantName = 'Restaurant',
  workspaceLabel = '',
  currency = 'PKR',
  generatedAt = '',
  limitationMessage = '',
} = {}) {
  const blocked = activeReport.capability === 'blocked'
  const title = activeReport.title || 'Restaurant Report'
  const subtitle = activeReport.description || ''
  const hasData = model.orders?.length > 0 || model.billedOrders?.length > 0
  const activeFilterLabels = Object.entries(filters)
    .filter(([, v]) => v && v !== 'All')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')

  let summaryCards = ''
  let tables = ''

  if (blocked || !hasData) {
    summaryCards = `<p class="empty-message">${esc(activeReport.limitationMessage || 'No data available for this report.')}</p>`
  } else {
    // ── KPIs ──
    const kpis = []
    if (activeReport.id === 'executive-summary') {
      kpis.push(['Gross Sales', mv(model.grossSales, currency)], ['Discounts', mv(model.discounts, currency)], ['Net Sales', mv(model.netSales, currency)], ['Collected', mv(model.collectedAmount, currency)], ['Outstanding', mv(model.outstandingAmount, currency)], ['Billed Orders', nv(model.billedOrders?.length)], ['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)], ['Expenses', mv(model.approvedExpenses, currency)], ['Net Profit', mv(model.netProfit, currency)])
    }
    if (activeReport.id === 'daily-closing') {
      kpis.push(['Billed Orders', nv(model.billedOrders?.length)], ['Cancelled', nv(model.cancellations?.count)], ['Gross Sales', mv(model.grossSales, currency)], ['Discounts', mv(model.discounts, currency)], ['Net Sales', mv(model.netSales, currency)], ['Cash', mv(model.cashReceived, currency)], ['Online', mv(model.onlineReceived, currency)], ['Outstanding', mv(model.outstandingAmount, currency)], ['Tax', mv(model.tax, currency)], ['Service Charges', mv(model.serviceCharges, currency)], ['Expenses', mv(model.approvedExpenses, currency)], ['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)], ['Net Profit', mv(model.netProfit, currency)])
      kpis.push(['Cash Difference', 'Unavailable — actual closing cash, refunds, withdrawals, and reliable cash-expense data are not stored.'])
    }
    if (activeReport.id === 'orders') {
      kpis.push(['Billed Orders', nv(model.billedOrders?.length)], ['Total Sales', mv(model.totalSales, currency)], ['Average Value', mv(model.averageOrderValue, currency)], ['Cancelled', nv(model.cancellations?.count)])
    }
    if (activeReport.id === 'payment-collection') {
      kpis.push(['Collected', mv(model.collectedAmount, currency)], ['Cash', mv(model.cashReceived, currency)], ['Online', mv(model.onlineReceived, currency)])
    }
    if (activeReport.id === 'due-partial-payments') {
      const dueRows = (model.billedOrders || []).filter((o) => o.isPartial || o.isDue)
      const dueTotal = dueRows.reduce((s, o) => s + o.total, 0)
      const duePaid = dueRows.reduce((s, o) => s + o.paidAmount, 0)
      const dueDue = dueRows.reduce((s, o) => s + o.dueAmount, 0)
      kpis.push(['Billed', mv(dueTotal, currency)], ['Paid', mv(duePaid, currency)], ['Due', mv(dueDue, currency)])
    }
    if (activeReport.id === 'tax-service-charges') {
      kpis.push(['Tax', mv(model.tax, currency)], ['Service Charges', mv(model.serviceCharges, currency)])
    }
    if (activeReport.id === 'discounts') {
      kpis.push(['Total Discounts', mv(model.discounts, currency)])
    }
    if (activeReport.id === 'cancellations') {
      kpis.push(['Cancelled Orders', nv(model.cancellations?.count)])
    }
    if (activeReport.id === 'cost-profit') {
      kpis.push(['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)], ['Expenses', mv(model.approvedExpenses, currency)], ['Net Profit', mv(model.netProfit, currency)])
    }
    if (activeReport.id === 'item-sales') {
      kpis.push(['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)])
    }
    if (activeReport.id === 'category-sales') {
      kpis.push(['Net Sales', mv(model.netSales, currency)], ['Gross Profit', mv(model.grossProfit, currency)])
    }
    if (activeReport.id === 'table-performance') {
      kpis.push(['Net Sales', mv(model.netSales, currency)], ['Collected', mv(model.collectedAmount, currency)])
    }
    if (activeReport.id === 'kot-performance') {
      kpis.push(['Pending', nv(model.kotStatus?.pending)], ['Preparing', nv(model.kotStatus?.preparing)], ['Ready', nv(model.kotStatus?.ready)], ['Served', nv(model.kotStatus?.served)])
    }
    if (activeReport.id === 'order-type-performance') {
      kpis.push(['Net Sales', mv(model.netSales, currency)], ['Total Sales', mv(model.totalSales, currency)])
    }
    if (activeReport.id === 'hourly-sales') {
      kpis.push(['Billed Orders', nv(model.billedOrders?.length)], ['Net Sales', mv(model.netSales, currency)])
    }
    if (activeReport.id === 'customer-sales') {
      kpis.push(['Period Outstanding', mv(model.periodOrderOutstanding, currency)], ['Stored Credit', mv(model.storedCustomerCreditBalance, currency)])
    }
    if (activeReport.id === 'expenses') {
      kpis.push(['Approved Expenses', mv(model.approvedExpenses, currency)], ['Net Profit', mv(model.netProfit, currency)])
    }
    summaryCards = kpis.map(([label, value]) => buildA4SummaryCard(label, value)).join('')

    // ── Tables ──
    if (activeReport.id === 'orders' || activeReport.id === 'payment-collection' || activeReport.id === 'due-partial-payments') {
      const tableRows = activeReport.id === 'due-partial-payments'
        ? (model.billedOrders || []).filter((o) => o.isPartial || o.isDue)
        : model.billedOrders || []
      tables += buildA4Table('Orders', [
        { key: 'orderNumber', label: 'Order' },
        { key: 'customerName', label: 'Customer' },
        { key: 'orderType', label: 'Type' },
        { key: 'table', label: 'Table' },
        { key: 'paymentStatus', label: 'Payment' },
        { key: 'paidAmount', label: 'Paid', numeric: true, value: (r) => mv(r.paidAmount, currency) },
        { key: 'dueAmount', label: 'Due', numeric: true, value: (r) => mv(r.dueAmount, currency) },
        { key: 'total', label: 'Total', numeric: true, value: (r) => mv(r.total, currency) },
      ], tableRows, 'No order rows for this report.')
    }
    if (activeReport.id === 'item-sales') {
      tables += buildA4Table('Item Sales', [
        { key: 'name', label: 'Item' },
        { key: 'quantity', label: 'Qty', numeric: true, value: (r) => nv(r.quantity) },
        { key: 'revenue', label: 'Net Sales', numeric: true, value: (r) => mv(r.revenue, currency) },
        { key: 'discount', label: 'Discount', numeric: true, value: (r) => mv(r.discount, currency) },
        { key: 'cost', label: 'Cost', numeric: true, value: (r) => mv(r.cost, currency) },
      ], model.itemSales, 'No item sales data.')
    }
    if (activeReport.id === 'category-sales') {
      tables += buildA4Table('Category Sales', [
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Qty', numeric: true, value: (r) => nv(r.quantity) },
        { key: 'revenue', label: 'Net Sales', numeric: true, value: (r) => mv(r.revenue, currency) },
        { key: 'cost', label: 'Cost', numeric: true, value: (r) => mv(r.cost, currency) },
      ], model.categorySales, 'No category sales data.')
    }
    if (activeReport.id === 'cancellations') {
      tables += buildA4Table('Cancellations', [
        { key: 'orderNumber', label: 'Order' },
        { key: 'customerName', label: 'Customer' },
        { key: 'cancelReason', label: 'Reason' },
        { key: 'total', label: 'Total before cancel', numeric: true, value: (r) => mv(r.total, currency) },
      ], model.cancellations?.rows, 'No cancellations.')
    }
    if (activeReport.id === 'table-performance') {
      tables += buildA4Table('Table Performance', [
        { key: 'table', label: 'Table' },
        { key: 'orders', label: 'Orders', numeric: true, value: (r) => nv(r.orders) },
        { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
        { key: 'collected', label: 'Collected', numeric: true, value: (r) => mv(r.collected, currency) },
      ], model.tablePerformance, 'No table performance data.')
    }
    if (activeReport.id === 'customer-sales') {
      tables += buildA4Table('Customer Sales', [
        { key: 'name', label: 'Customer' },
        { key: 'billedOrders', label: 'Billed Orders', numeric: true, value: (r) => nv(r.billedOrders) },
        { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
        { key: 'paid', label: 'Paid', numeric: true, value: (r) => mv(r.paid, currency) },
        { key: 'periodOrderOutstanding', label: 'Due', numeric: true, value: (r) => mv(r.periodOrderOutstanding, currency) },
        { key: 'storedCustomerCreditBalance', label: 'Credit', numeric: true, value: (r) => mv(r.storedCustomerCreditBalance, currency) },
      ], model.customerPerformance, 'No customer sales data.')
    }
    if (activeReport.id === 'discounts') {
      tables += buildA4Table('Discounts', [
        { key: 'orderNumber', label: 'Order' },
        { key: 'customerName', label: 'Customer' },
        { key: 'discount', label: 'Discount', numeric: true, value: (r) => mv(r.discount, currency) },
        { key: 'total', label: 'Total', numeric: true, value: (r) => mv(r.total, currency) },
      ], model.discountRows, 'No discount data.')
    }
    if (activeReport.id === 'tax-service-charges') {
      tables += buildA4Table('Tax Rows', [
        { key: 'orderNumber', label: 'Order' },
        { key: 'tax', label: 'Tax', numeric: true, value: (r) => mv(r.tax, currency) },
      ], model.taxRows, 'No tax rows.')
      tables += buildA4Table('Service Charge Rows', [
        { key: 'orderNumber', label: 'Order' },
        { key: 'serviceCharges', label: 'Service', numeric: true, value: (r) => mv(r.serviceCharges, currency) },
      ], model.serviceChargeRows, 'No service charge rows.')
    }
    if (activeReport.id === 'kot-performance') {
      tables += buildA4Table('KOT Status', [
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Count', numeric: true },
      ], [
        { status: 'Pending', count: model.kotStatus?.pending || 0 },
        { status: 'Preparing', count: model.kotStatus?.preparing || 0 },
        { status: 'Ready', count: model.kotStatus?.ready || 0 },
        { status: 'Served', count: model.kotStatus?.served || 0 },
      ], 'No KOT data.')
    }
    if (activeReport.id === 'hourly-sales') {
      const hourly = Object.entries(model.ordersByHour || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
      tables += buildA4Table('Hourly Sales', [
        { key: 'hour', label: 'Hour' },
        { key: 'count', label: 'Orders', numeric: true, value: (r) => nv(r.count) },
      ], hourly, 'No hourly data.')
    }
    if (activeReport.id === 'order-type-performance') {
      const rows = Object.entries(model.salesByOrderType || {}).map(([type, sales]) => ({ type, sales }))
      tables += buildA4Table('Order Type Performance', [
        { key: 'type', label: 'Type' },
        { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
      ], rows, 'No order type data.')
    }
    if (activeReport.id === 'executive-summary') {
      const typeRows = Object.entries(model.salesByOrderType || {}).map(([type, sales]) => ({ type, sales }))
      tables += buildA4Table('Sales by Order Type', [
        { key: 'type', label: 'Type' },
        { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
      ], typeRows, 'No order type sales.')
    }
  }

  const limitationHtml = limitationMessage
    ? `<div class="limitation"><p>${esc(limitationMessage)}</p></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(title)} — ${esc(restaurantName)}</title>
<style>
  @page { margin: 20pt 30pt; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.5; padding: 0; margin: 0; }
  .page-break-safe { page-break-inside: avoid; }
  h1 { font-size: 20pt; font-weight: 900; margin: 0 0 2pt; letter-spacing: -0.02em; color: #0f172a; }
  h2 { font-size: 13pt; font-weight: 700; margin: 0; color: #334155; }
  h3 { font-size: 12pt; font-weight: 700; margin: 20pt 0 8pt; color: #0f172a; }
  .header { border-bottom: 2pt solid #0f172a; padding-bottom: 12pt; margin-bottom: 16pt; }
  .header .nexora { font-size: 9pt; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #6366f1; }
  .meta { display: flex; flex-wrap: wrap; gap: 8pt 20pt; font-size: 9pt; color: #475569; margin-bottom: 16pt; }
  .meta span { font-size: 9pt; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8pt; margin-bottom: 20pt; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 8pt; padding: 10pt; background: #f8fafc; page-break-inside: avoid; }
  .summary-card .label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 4pt; }
  .summary-card .value { font-size: 11pt; font-weight: 900; color: #0f172a; margin: 0; word-break: break-word; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 12pt; }
  th { background: #f1f5f9; color: #334155; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; padding: 7pt 8pt; border-bottom: 1pt solid #e2e8f0; font-size: 7.5pt; }
  td { padding: 6pt 8pt; border-bottom: 1pt solid #e2e8f0; color: #0f172a; vertical-align: top; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty, .empty-message { border: 1pt dashed #cbd5e1; border-radius: 8pt; padding: 20pt; text-align: center; font-size: 10pt; color: #64748b; }
  .limitation { border: 1pt solid #fde68a; border-radius: 8pt; background: #fffbeb; padding: 8pt 12pt; margin-bottom: 12pt; font-size: 9pt; color: #92400e; }
  .footer { margin-top: 24pt; padding-top: 10pt; border-top: 1pt solid #e2e8f0; font-size: 8pt; color: #64748b; }
  @media print { .page-break-safe { page-break-inside: avoid; } }
</style></head>
<body>
  <div class="header page-break-safe">
    <p class="nexora">Nexora Business Suite</p>
    <h1>${esc(restaurantName)}</h1>
    <h2>${esc(title)}</h2>
    <p style="margin:4pt 0 0;font-size:9pt;color:#475569">${esc(subtitle)}</p>
  </div>
  <div class="meta page-break-safe">
    <span><b>Workspace:</b> ${esc(workspaceLabel)}</span>
    <span><b>Date range:</b> ${esc(dateRangeLabel)}</span>
    <span><b>Generated:</b> ${esc(generatedAt)}</span>
    ${activeFilterLabels ? `<span><b>Filters:</b> ${esc(activeFilterLabels)}</span>` : ''}
  </div>
  ${limitationHtml}
  <div class="summary-grid page-break-safe">${summaryCards || '<p class="empty-message">' + esc(activeReport.limitationMessage || 'No data for the selected report and filters.') + '</p>'}</div>
  <div>${tables}</div>
  <div class="footer page-break-safe">
    <span>Nexora Business Suite — ${esc(restaurantName)} — ${esc(workspaceLabel)}</span>
    <span style="float:right">${esc(activeReport.exportLabel || title)} | ${esc(dateRangeLabel)}</span>
  </div>
</body></html>`

  return { html, title: `${safeFilename(title)}-${safeFilename(restaurantName)}` }
}

// ── A4 Print ─────────────────────────────────────────────────────────────

export function printRestaurantA4Report(options = {}) {
  const { html } = buildRestaurantPrintableReport(options)
  const opened = openBrowserPrintHtml(html, { width: 820, height: 900 })
  if (!opened) return { ok: false, error: 'Print window was blocked. Please allow pop-ups and try again.' }
  return { ok: true }
}

// ── 58mm Daily Closing ───────────────────────────────────────────────────

function buildDailyClosingThermalText({
  model = {},
  restaurantName = 'Restaurant',
  dateRangeLabel = '',
  currency = 'PKR',
  generatedAt = '',
} = {}) {
  const line = (label, value) => `${label}: ${value}`
  return [
    restaurantName,
    'DAILY CLOSING',
    dateRangeLabel,
    '-'.repeat(32),
    line('Billed Orders', nv(model.billedOrders?.length)),
    line('Cancelled Orders', nv(model.cancellations?.count)),
    line('Gross Sales', mv(model.grossSales, currency)),
    line('Discounts', mv(model.discounts, currency)),
    line('Net Sales', mv(model.netSales, currency)),
    line('Cash Collection', mv(model.cashReceived, currency)),
    line('Online Collection', mv(model.onlineReceived, currency)),
    line('Outstanding', mv(model.outstandingAmount, currency)),
    line('Tax', mv(model.tax, currency)),
    line('Service Charges', mv(model.serviceCharges, currency)),
    line('COGS', mv(model.costOfGoodsSold, currency)),
    line('Approved Expenses', mv(model.approvedExpenses, currency)),
    line('Gross Profit', mv(model.grossProfit, currency)),
    line('Net Profit', mv(model.netProfit, currency)),
    '-'.repeat(32),
    'Cash reconciliation unavailable:',
    'actual closing cash, refunds,',
    'withdrawals, and reliable',
    'cash-expense data are not stored.',
    '-'.repeat(32),
    `Generated: ${generatedAt}`,
    `NEXORA SOLUTION - ${restaurantName}`,
    'All rights reserved 2019-2026.',
  ].filter(Boolean).join('\n')
}

export async function printRestaurantThermalClosing(options = {}) {
  const { model = {}, restaurantName = 'Restaurant', settings = {} } = options
  if (!model.billedOrders && !model.orders) {
    return { ok: false, error: 'No daily closing data to print.' }
  }
  const text = buildDailyClosingThermalText(options)

  if (directPrinterAvailable(settings)) {
    const result = await printThermalText(text, settings)
    if (result.ok) return { ok: true }
    return { ok: false, error: result.error || 'Direct printer failed. Ensure the printer is connected and try again.' }
  }

  // Fallback: open a small browser window for thermal-sized print preview
  const previewHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Daily Closing 58mm</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; padding: 4mm; margin: 0; white-space: pre-wrap; color: #000; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
</style></head>
<body><pre>${esc(text)}</pre></body></html>`

  const opened = openBrowserPrintHtml(previewHtml, { width: 280, height: 700 })
  if (!opened) return { ok: false, error: 'Print window was blocked. Please allow pop-ups and try again.' }
  return { ok: true, fallback: true, message: 'Thermal printer not connected. Opening browser print preview instead.' }
}

// ── CSV Export ────────────────────────────────────────────────────────────

function buildReportCsvContent({ model = {}, activeReport = {}, currency = 'PKR', dateRangeLabel = '', restaurantName = '', workspaceLabel = '', generatedAt = '' } = {}) {
  const header = [
    ['Report', activeReport.exportLabel || activeReport.title || 'Restaurant Report'],
    ['Restaurant', restaurantName],
    ['Workspace', workspaceLabel],
    ['Date Range', dateRangeLabel],
    ['Generated', generatedAt],
    [],
  ]

  const rows = []
  const addKpi = (label, value) => rows.push([csvCell(label), csvCell(value)])
  const addTable = (title, cols, data) => {
    if (!data || !data.length) return
    rows.push([])
    rows.push([csvCell(title)])
    rows.push(cols.map((c) => csvCell(c.label)))
    data.forEach((row) => {
      rows.push(cols.map((c) => {
        const val = typeof c.value === 'function' ? c.value(row) : row[c.key]
        return csvCell(val ?? '')
      }))
    })
  }

  if (activeReport.capability === 'blocked') {
    addKpi('Blocked', activeReport.limitationMessage || 'This report cannot be exported.')
    return rows.map((r) => r.join(',')).join('\n')
  }

  // KPIs
  addKpi('Gross Sales', mv(model.grossSales, currency))
  addKpi('Discounts', mv(model.discounts, currency))
  addKpi('Net Sales', mv(model.netSales, currency))
  addKpi('Collected Amount', mv(model.collectedAmount, currency))
  addKpi('Outstanding Amount', mv(model.outstandingAmount, currency))
  addKpi('Tax', mv(model.tax, currency))
  addKpi('Service Charges', mv(model.serviceCharges, currency))
  addKpi('COGS', mv(model.costOfGoodsSold, currency))
  addKpi('Gross Profit', mv(model.grossProfit, currency))
  addKpi('Approved Expenses', mv(model.approvedExpenses, currency))
  addKpi('Net Profit', mv(model.netProfit, currency))
  addKpi('Billed Orders', nv(model.billedOrders?.length))
  addKpi('Cancelled Orders', nv(model.cancellations?.count))

  // Tables
  if (activeReport.id === 'item-sales' || activeReport.id === 'executive-summary') {
    addTable('Item Sales', [
      { label: 'Item', key: 'name' },
      { label: 'Qty', key: 'quantity' },
      { label: 'Net Sales', key: 'revenue' },
      { label: 'Discount', key: 'discount' },
      { label: 'Cost', key: 'cost' },
    ], model.itemSales)
  }
  if (activeReport.id === 'category-sales') {
    addTable('Category Sales', [
      { label: 'Category', key: 'category' },
      { label: 'Qty', key: 'quantity' },
      { label: 'Net Sales', key: 'revenue' },
      { label: 'Cost', key: 'cost' },
    ], model.categorySales)
  }
  if (activeReport.id === 'orders' || activeReport.id === 'payment-collection' || activeReport.id === 'due-partial-payments') {
    const orderRows = activeReport.id === 'due-partial-payments'
      ? (model.billedOrders || []).filter((o) => o.isPartial || o.isDue)
      : model.billedOrders || []
    addTable('Orders', [
      { label: 'Order', key: 'orderNumber' },
      { label: 'Customer', key: 'customerName' },
      { label: 'Type', key: 'orderType' },
      { label: 'Payment', key: 'paymentStatus' },
      { label: 'Total', key: 'total' },
      { label: 'Paid', key: 'paidAmount' },
      { label: 'Due', key: 'dueAmount' },
    ], orderRows)
  }
  if (activeReport.id === 'table-performance') {
    addTable('Table Performance', [
      { label: 'Table', key: 'table' },
      { label: 'Orders', key: 'orders' },
      { label: 'Sales', key: 'sales' },
      { label: 'Collected', key: 'collected' },
    ], model.tablePerformance)
  }
  if (activeReport.id === 'customer-sales') {
    addTable('Customer Sales', [
      { label: 'Customer', key: 'name' },
      { label: 'Billed Orders', key: 'billedOrders' },
      { label: 'Sales', key: 'sales' },
      { label: 'Paid', key: 'paid' },
      { label: 'Due', key: 'periodOrderOutstanding' },
      { label: 'Credit', key: 'storedCustomerCreditBalance' },
    ], model.customerPerformance)
  }
  if (activeReport.id === 'cancellations') {
    addTable('Cancellations', [
      { label: 'Order', key: 'orderNumber' },
      { label: 'Customer', key: 'customerName' },
      { label: 'Reason', key: 'cancelReason' },
      { label: 'Total', key: 'total' },
    ], model.cancellations?.rows)
  }
  if (activeReport.id === 'discounts') {
    addTable('Discounts', [
      { label: 'Order', key: 'orderNumber' },
      { label: 'Customer', key: 'customerName' },
      { label: 'Discount', key: 'discount' },
    ], model.discountRows)
  }

  return [...header, ...rows].map((r) => r.join(',')).join('\n')
}

export function exportRestaurantCsv(options = {}) {
  const { activeReport = {}, dateRangeLabel = '', restaurantName = '' } = options
  const title = safeFilename(activeReport.exportLabel || activeReport.title || 'report')
  const range = safeFilename(dateRangeLabel || 'date')
  const filename = `${title}_${range}.csv`
  const content = buildReportCsvContent(options)
  downloadText(filename, '\uFEFF' + content, 'text/csv;charset=utf-8;')
  return { ok: true }
}

// ── Excel Export (HTML-based XLS) ─────────────────────────────────────────

function buildExcelHtml(options = {}) {
  const { activeReport = {}, model = {}, restaurantName = '', workspaceLabel = '', dateRangeLabel = '', generatedAt = '', currency = 'PKR', limitationMessage = '' } = options
  const blocked = activeReport.capability === 'blocked'
  const cells = (label, value) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`
  const header = `${esc(restaurantName)} — ${esc(activeReport.exportLabel || activeReport.title || 'Report')}`

  let body = ''
  if (blocked) {
    body = `<tr><td>${esc(activeReport.limitationMessage || 'This report is blocked.')}</td></tr>`
  } else {
    body = [
      cells('Gross Sales', mv(model.grossSales, currency)),
      cells('Discounts', mv(model.discounts, currency)),
      cells('Net Sales', mv(model.netSales, currency)),
      cells('Collected Amount', mv(model.collectedAmount, currency)),
      cells('Outstanding Amount', mv(model.outstandingAmount, currency)),
      cells('Tax', mv(model.tax, currency)),
      cells('Service Charges', mv(model.serviceCharges, currency)),
      cells('COGS', mv(model.costOfGoodsSold, currency)),
      cells('Gross Profit', mv(model.grossProfit, currency)),
      cells('Approved Expenses', mv(model.approvedExpenses, currency)),
      cells('Net Profit', mv(model.netProfit, currency)),
      cells('Billed Orders', nv(model.billedOrders?.length)),
      cells('Cancelled Orders', nv(model.cancellations?.count)),
    ].join('\n')
  }

  const limitation = limitationMessage ? `<tr><td colspan="2" style="background:#fffbeb;color:#92400e">${esc(limitationMessage)}</td></tr>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(header)}</title></head>
<body>
  <h1>${esc(header)}</h1>
  <p>${esc(workspaceLabel)} | ${esc(dateRangeLabel)} | Generated: ${esc(generatedAt)}</p>
  ${limitation}
  <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:10pt">
    <thead><tr style="background:#f1f5f9;font-weight:800"><th>KPI</th><th>Value</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p style="font-size:8pt;color:#64748b">Nexora Business Suite — ${esc(restaurantName)} | All rights reserved 2019-2026.</p>
</body></html>`
}

export function exportRestaurantExcel(options = {}) {
  const { activeReport = {}, dateRangeLabel = '', restaurantName = '' } = options
  const title = safeFilename(activeReport.exportLabel || activeReport.title || 'report')
  const range = safeFilename(dateRangeLabel || 'date')
  const filename = `${title}_${range}.xls`
  const html = buildExcelHtml(options)
  downloadText(filename, html, 'application/vnd.ms-excel;charset=utf-8;')
  return { ok: true }
}

// ── PDF Export (deferred) ────────────────────────────────────────────────

/**
 * PDF is deferred: the existing exportReportPdf helper in reportGenerator.js
 * depends on jsPDF + jspdf-autotable + QRCode, which are installed and working.
 * However, it expects a report format (summary[], tables[]) that doesn't
 * match the restaurant report model directly. Conversion is possible but
 * adds complexity — PDF will be connected in a follow-up when the format
 * bridge is stable.
 */
export function exportRestaurantPdf(/* options = {} */) {
  return { ok: false, error: 'PDF export is deferred. The report model bridge to the existing PDF generator needs additional validation before it can produce guaranteed-accurate restaurant reports.' }
}
