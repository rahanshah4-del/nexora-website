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

function buildA4SummaryCard(label, value, { tone = 'default', subtitle = '' } = {}) {
  const val = value === null || value === undefined || String(value).trim() === '' ? 'Unavailable' : String(value)
  const toneBorder = tone === 'success' ? 'border-emerald-200 bg-emerald-50' : tone === 'warning' ? 'border-amber-200 bg-amber-50' : tone === 'danger' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
  const toneLabel = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'danger' ? 'text-rose-600' : 'text-slate-400'
  const toneValue = tone === 'success' ? 'text-emerald-900' : tone === 'danger' ? 'text-rose-900' : 'text-slate-950'
  return `<div class="summary-card ${toneBorder}"><p class="label ${toneLabel}">${esc(label)}</p><p class="value ${toneValue}">${val}</p>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}</div>`
}

function buildA4Table(title, columns, rows, emptyMessage = 'No data.', { pageBreakSafe = true, showRowNumbers = true, totalsKey = '', totalsLabel = '' } = {}) {
  if (!rows || !rows.length) {
    return `<div class="report-table"><h3>${esc(title)}</h3><p class="empty">${esc(emptyMessage)}</p></div>`
  }

  let headerCells = ''
  if (showRowNumbers) headerCells += '<th class="rn">#</th>'
  headerCells += columns.map((col) => {
    const align = col.numeric ? ' style="text-align:right"' : ''
    return `<th${align}>${esc(col.label)}</th>`
  }).join('')

  const bodyRows = rows.map((row, idx) => {
    const rowNum = showRowNumbers ? `<td class="rn">${idx + 1}</td>` : ''
    const cells = columns.map((col) => {
      const val = typeof col.value === 'function' ? col.value(row) : row[col.key]
      const align = col.numeric ? ' class="num"' : ''
      return `<td${align}>${esc(String(val ?? ''))}</td>`
    }).join('')
    const alt = idx % 2 === 0 ? ' class="alt"' : ''
    return `<tr${alt}>${rowNum}${cells}</tr>`
  }).join('')

  // Totals row
  let totalsRow = ''
  if (totalsKey) {
    const totalVal = rows.reduce((sum, row) => sum + (Number(row[totalsKey]) || 0), 0)
    const totalDisplay = Number.isFinite(totalVal)
      ? Number(totalVal).toLocaleString('en-PK', { maximumFractionDigits: 2 })
      : String(totalVal)
    totalsRow = `<tr class="totals">${showRowNumbers ? '<td class="rn"></td>' : ''}`
    columns.forEach((col, ci) => {
      if (col.key === totalsKey) {
        totalsRow += `<td class="num">${totalDisplay}</td>`
      } else if (ci === 0) {
        totalsRow += `<td>${totalsLabel || 'Total'}</td>`
      } else {
        totalsRow += '<td></td>'
      }
    })
    totalsRow += '</tr>'
  }

  const safeClass = pageBreakSafe ? ' page-break-safe' : ''
  return `
    <div class="report-table${safeClass}">
      <h3>${esc(title)}</h3>
      <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalsRow}</tbody></table>
    </div>
  `
}

/**
 * Build A4 printable HTML — professional executive template used by ALL restaurant reports.
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
  settings = {},
} = {}) {
  const blocked = activeReport.capability === 'blocked'
  const title = activeReport.title || 'Restaurant Report'
  const subtitle = activeReport.description || ''
  const hasData = model.orders?.length > 0 || model.billedOrders?.length > 0
  const activeFilterLabels = Object.entries(filters)
    .filter(([, v]) => v && v !== 'All')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')
  const reportId = `RPT-${activeReport.id || 'report'}-${new Date().getTime().toString(36).toUpperCase()}`
  const now = new Date()
  const printedDate = now.toLocaleDateString('en-GB')
  const printedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  let summaryCards = ''
  let tables = ''

  if (blocked || !hasData) {
    summaryCards = `<p class="empty-message">${esc(activeReport.limitationMessage || 'No data available for this report.')}</p>`
  } else {
    // ── KPIs — each report defines its own ──
    const kpis = []
    if (activeReport.id === 'executive-summary') {
      kpis.push(['Gross Sales', mv(model.grossSales, currency)], ['Discounts', mv(model.discounts, currency)], ['Net Sales', mv(model.netSales, currency)], ['Collected', mv(model.collectedAmount, currency)], ['Outstanding', mv(model.outstandingAmount, currency)], ['Billed Orders', nv(model.billedOrders?.length)], ['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)], ['Expenses', mv(model.approvedExpenses, currency)], ['Net Profit', mv(model.netProfit, currency)])
    }
    if (activeReport.id === 'daily-closing') {
      kpis.push(['Billed Orders', nv(model.billedOrders?.length)], ['Cancelled', nv(model.cancellations?.count)], ['Gross Sales', mv(model.grossSales, currency)], ['Discounts', mv(model.discounts, currency)], ['Net Sales', mv(model.netSales, currency)], ['Cash', mv(model.cashReceived, currency)], ['Online', mv(model.onlineReceived, currency)], ['Outstanding', mv(model.outstandingAmount, currency)], ['Tax', mv(model.tax, currency)], ['Service Charges', mv(model.serviceCharges, currency)], ['Expenses', mv(model.approvedExpenses, currency)], ['COGS', mv(model.costOfGoodsSold, currency)], ['Gross Profit', mv(model.grossProfit, currency)], ['Net Profit', mv(model.netProfit, currency)])
      const rc = model.cashReconciliation || {}
      if (rc.actualClosingCash != null) {
        kpis.push(['Cash Difference', mv(rc.cashDifference, currency)], ['Expected Cash', mv(rc.expectedCash, currency)], ['Variance', rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A'])
      } else {
        kpis.push(['Cash Difference', 'Unavailable — settle shifts to see cash reconciliation.'])
      }
    }
    if (activeReport.id === 'cash-drawer-reconciliation' || activeReport.id === 'shift-settlement-report') {
      const rc = model.cashReconciliation || {}
      kpis.push(['Opening Cash', mv(model.openingCash, currency)], ['Cash Sales', mv(rc.cashSales, currency)], ['Cash Refunds', mv(rc.cashRefunds, currency)], ['Cash Deposits', mv(rc.cashDeposits, currency)], ['Cash Withdrawals', mv(rc.cashWithdrawals, currency)], ['Cash Expenses', mv(rc.cashExpenses, currency)], ['Cash Adjustments', mv(rc.cashAdjustments, currency)], ['Expected Cash', mv(rc.expectedCash, currency)], ['Cash Difference', mv(rc.cashDifference, currency)], ['Variance', rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A'], ['Total Transactions', nv(rc.totalTransactions || 0)], ['Average Sale', mv(rc.averageSale, currency)], ['Largest Sale', mv(rc.largestSale, currency)], ['Largest Refund', mv(rc.largestRefund, currency)])
      if (rc.settlementCounts?.total > 0) {
        kpis.push(['Pending Review', nv(rc.settlementCounts.pendingReview || 0)], ['Approved', nv(rc.settlementCounts.approved || 0)], ['Rejected', nv(rc.settlementCounts.rejected || 0)], ['Locked', nv(rc.settlementCounts.locked || 0)])
      }
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
    if (activeReport.id === 'business-intelligence') {
      const bi = model.businessIntelligence || {}
      if (bi.health) {
        kpis.push(['Health Score', `${bi.health.score}/100 ${bi.health.level}`], ['Growth Score', `${bi.health.subScores?.growth || 0}/100`], ['Profit Score', `${bi.health.subScores?.profit || 0}/100`], ['Customer Score', `${bi.health.subScores?.customer || 0}/100`], ['Operations Score', `${bi.health.subScores?.operations || 0}/100`], ['Risk Score', `${bi.health.subScores?.risk || 0}/100`])
      }
      if (bi.trends) {
        kpis.push(['Sales Trend', bi.trends.salesTrendLabel], ['Profit Trend', bi.trends.profitTrendLabel], ['Sales Momentum', `${bi.trends.salesMomentum}/100`], ['Revenue Velocity', mv(bi.trends.revenueVelocity, currency)], ['Repeat Customer Rate', `${Math.round(bi.trends.repeatCustomerRate * 100)}%`])
      }
      if (bi.forecast?.tomorrow) {
        kpis.push(['Forecast Tomorrow', mv(bi.forecast.tomorrow.sales, currency)], ['Forecast 7 Days', mv(bi.forecast.nextWeek?.expectedRevenue, currency)], ['Forecast 30 Days', mv(bi.forecast.nextMonth?.expectedRevenue, currency)], ['Forecast Confidence', `${bi.forecast.confidenceScore || 0}%`])
      }
      if (bi.customerIntelligence) {
        kpis.push(['Total Customers', nv(bi.customerIntelligence.totalCustomers || 0)], ['VIP Customers', nv(bi.customerIntelligence.vip?.length || 0)], ['Returning', nv(bi.customerIntelligence.returning?.length || 0)], ['Avg Spend', mv(bi.customerIntelligence.averageSpend, currency)], ['Est. LTV', mv(bi.customerIntelligence.estimatedLifetimeValue, currency)])
      }
      if (bi.productIntelligence) {
        kpis.push(['Items Tracked', nv(bi.productIntelligence.itemCount || 0)], ['Best Seller', bi.productIntelligence.bestSelling[0]?.name || 'N/A'], ['Slow Movers', nv(bi.productIntelligence.slowMoving.length)])
      }
      const alertCounts = bi.alerts?.filter((a) => a.severity === 'critical').length || 0
      const warnCounts = bi.alerts?.filter((a) => a.severity === 'warning').length || 0
      kpis.push(['Critical Alerts', nv(alertCounts)], ['Warnings', nv(warnCounts)], ['Risk Level', bi.executive?.riskLevel || 'N/A'])
    }

    // ── Smart sections: enhanced KPIs for Executive Summary ──
    if (activeReport.id === 'executive-summary' && hasData) {
      kpis.push(['Cash Received', mv(model.cashReceived, currency)], ['Card Sales', mv(model.cardReceived > 0 ? model.cardReceived : 0, currency)], ['Average Order', mv(model.averageOrderValue, currency)], ['Customers', nv(model.customerCount || 'N/A')], ['Peak Hour', model.peakSalesHour?.hour || 'N/A'], ['Top Category', model.bestCategory?.category || 'N/A'], ['Top Item', model.bestSellingItem?.name || 'N/A'])
    }

    summaryCards = kpis.map(([label, value]) => buildA4SummaryCard(label, value)).join('')

    // ── Tables ──
    if (activeReport.id === 'executive-summary' && hasData) {
      // Smart sections: only add when data exists
      if (model.salesByOrderType && Object.keys(model.salesByOrderType).length) {
        const typeRows = Object.entries(model.salesByOrderType).map(([type, sales]) => ({ type, sales }))
        tables += buildA4Table('Sales by Order Type', [
          { label: 'Type', key: 'type' },
          { label: 'Sales', key: 'sales', numeric: true, value: (r) => mv(r.sales, currency) },
        ], typeRows, 'No order type data.', { totalsKey: 'sales' })
      }
      if (model.itemSales && model.itemSales.length) {
        tables += buildA4Table('Top 10 Items', [
          { label: 'Item', key: 'name' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
        ], model.itemSales.slice(0, 10), 'No item sales.', { totalsKey: 'revenue' })
      }
      if (model.categorySales && model.categorySales.length) {
        tables += buildA4Table('Category Sales', [
          { label: 'Category', key: 'category' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
          { label: 'Cost', key: 'cost', numeric: true, value: (r) => mv(r.cost, currency) },
        ], model.categorySales, 'No category sales.', { totalsKey: 'revenue' })
      }
      if (model.collectionsByPaymentMethod && Object.keys(model.collectionsByPaymentMethod).length) {
        const pmtRows = Object.entries(model.collectionsByPaymentMethod).map(([method, amount]) => ({ method, amount }))
        tables += buildA4Table('Payment Breakdown', [
          { label: 'Method', key: 'method' },
          { label: 'Amount', key: 'amount', numeric: true, value: (r) => mv(r.amount, currency) },
        ], pmtRows, 'No payment data.', { totalsKey: 'amount' })
      }
      if (model.cancellations?.rows?.length) {
        tables += buildA4Table('Cancelled Orders', [
          { label: 'Order', key: 'orderNumber' },
          { label: 'Reason', key: 'cancelReason' },
          { label: 'Total', key: 'total', numeric: true, value: (r) => mv(r.total, currency) },
        ], model.cancellations.rows, 'No cancellations.', { showRowNumbers: true })
      }
      if (model.expenses?.total > 0) {
        tables += buildA4Table('Expense Summary', [
          { label: 'Total Expenses', key: 'total', numeric: true, value: () => mv(model.approvedExpenses, currency) },
          { label: 'Count', key: 'count', numeric: true, value: () => nv(model.expenseSummary?.count || 0) },
        ], [{ total: model.approvedExpenses, count: model.expenseSummary?.count || 0 }], 'No expenses.', { showRowNumbers: false })
      }
      if (model.customerPerformance && model.customerPerformance.length) {
        tables += buildA4Table('Customer Summary (Top 10)', [
          { label: 'Customer', key: 'name' },
          { label: 'Orders', key: 'billedOrders', numeric: true, value: (r) => nv(r.billedOrders) },
          { label: 'Sales', key: 'sales', numeric: true, value: (r) => mv(r.sales, currency) },
          { label: 'Paid', key: 'paid', numeric: true, value: (r) => mv(r.paid, currency) },
        ], model.customerPerformance.slice(0, 10), 'No customer data.', { totalsKey: 'sales' })
      }
    }

    if (activeReport.id === 'daily-closing' && hasData) {
      // Comprehensive daily closing with all sections
      const rc = model.cashReconciliation || {}

      // Executive Summary KPIs
      tables += `<div class="section-title"><span>Executive Summary</span></div>`
      tables += `<div class="summary-grid page-break-safe">`
      const execKpis = [
        ['Gross Sales', mv(model.grossSales, currency)],
        ['Net Sales', mv(model.netSales, currency)],
        ['Billed Orders', nv(model.billedOrders?.length)],
        ['Collected', mv(model.collectedAmount, currency)],
        ['Outstanding', mv(model.outstandingAmount, currency)],
        ['Cash Received', mv(model.cashReceived, currency)],
        ['Online Received', mv(model.onlineReceived, currency)],
        ['Average Order', mv(model.averageOrderValue, currency)],
        ['Tax', mv(model.tax, currency)],
        ['Service Charges', mv(model.serviceCharges, currency)],
        ['Discounts', mv(model.discounts, currency)],
        ['Gross Profit', mv(model.grossProfit, currency)],
        ['Expenses', mv(model.approvedExpenses, currency)],
        ['Net Profit', mv(model.netProfit, currency)],
        ['Customers', nv(model.customerCount || 0)],
        ['Cancelled', nv(model.cancellations?.count)],
      ]
      tables += execKpis.map(([l, v]) => buildA4SummaryCard(l, v)).join('')
      tables += `</div>`

      // Payment Summary
      if (model.collectionsByPaymentMethod && Object.keys(model.collectionsByPaymentMethod).length) {
        const pmtRows = Object.entries(model.collectionsByPaymentMethod).map(([method, amount]) => ({ method, amount }))
        tables += buildA4Table('Payment Summary', [
          { label: 'Method', key: 'method' },
          { label: 'Amount', key: 'amount', numeric: true, value: (r) => mv(r.amount, currency) },
        ], pmtRows, 'No payment data.', { totalsKey: 'amount' })
      }

      // Sales by Category
      if (model.categorySales && model.categorySales.length) {
        tables += buildA4Table('Category Summary', [
          { label: 'Category', key: 'category' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
        ], model.categorySales, 'No category sales.', { totalsKey: 'revenue' })
      }

      // Top 10 Items
      if (model.itemSales && model.itemSales.length) {
        tables += buildA4Table('Top 10 Items', [
          { label: 'Item', key: 'name' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
        ], model.itemSales.slice(0, 10), 'No item sales.', { totalsKey: 'revenue' })
      }

      // Cancelled Orders
      if (model.cancellations?.rows?.length) {
        tables += buildA4Table('Cancelled Orders & Reasons', [
          { label: 'Order', key: 'orderNumber' },
          { label: 'Reason', key: 'cancelReason' },
          { label: 'Total', key: 'total', numeric: true, value: (r) => mv(r.total, currency) },
        ], model.cancellations.rows, 'No cancellations.')
      }

      // Cash Drawer Summary
      tables += buildA4Table('Cash Drawer Summary', [
        { label: 'Opening Cash', key: 'opening', numeric: true, value: () => mv(model.openingCash, currency) },
        { label: 'Cash Sales', key: 'sales', numeric: true, value: () => mv(rc.cashSales, currency) },
        { label: 'Expected Cash', key: 'expected', numeric: true, value: () => mv(rc.expectedCash || model.openingCash, currency) },
        { label: 'Difference', key: 'diff', numeric: true, value: () => rc.cashDifference != null ? mv(rc.cashDifference, currency) : 'N/A' },
        { label: 'Status', key: 'status', value: () => rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A' },
      ], [{
        opening: model.openingCash,
        sales: rc.cashSales,
        expected: rc.expectedCash || model.openingCash,
        diff: rc.cashDifference,
        status: rc.varianceStatus,
      }], 'No cash drawer data.', { showRowNumbers: false })

      // Shift Summary (from closed sessions)
      if (rc.cashSessions && rc.cashSessions.length) {
        tables += buildA4Table('Shift Summary', [
          { label: 'Cashier', key: 'cashierName' },
          { label: 'Opening', key: 'openingCash', numeric: true, value: (r) => mv(r.openingCash, currency) },
          { label: 'Expected', key: 'expectedCash', numeric: true, value: (r) => mv(r.expectedCash, currency) },
          { label: 'Actual', key: 'actualClosingCash', numeric: true, value: (r) => mv(r.actualClosingCash, currency) },
          { label: 'Diff', key: 'cashDifference', numeric: true, value: (r) => mv(r.cashDifference, currency) },
          { label: 'Variance', key: 'varianceStatus', value: (r) => String(r.varianceStatus || '').replace(/_/g, ' ') || '-' },
          { label: 'Settlement', key: 'settlementStatus', value: (r) => String(r.settlementStatus || r.status || '').replace(/_/g, ' ') || '-' },
        ], rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked'), 'No settled shifts.')
      }

      // Expense Summary
      if (model.approvedExpenses > 0) {
        tables += buildA4Table('Expense Summary', [
          { label: 'Description', key: 'desc', value: () => 'Total Approved Expenses' },
          { label: 'Amount', key: 'amount', numeric: true, value: () => mv(model.approvedExpenses, currency) },
          { label: 'Count', key: 'count', numeric: true, value: () => nv(model.expenseSummary?.count || 0) },
        ], [{ desc: 'Approved Expenses', amount: model.approvedExpenses, count: model.expenseSummary?.count || 0 }], 'No expenses.', { showRowNumbers: false })
      }

      // Customer Statistics
      if (model.customerPerformance && model.customerPerformance.length) {
        tables += buildA4Table('Customer Statistics', [
          { label: 'Customer', key: 'name' },
          { label: 'Orders', key: 'billedOrders', numeric: true, value: (r) => nv(r.billedOrders) },
          { label: 'Sales', key: 'sales', numeric: true, value: (r) => mv(r.sales, currency) },
          { label: 'Paid', key: 'paid', numeric: true, value: (r) => mv(r.paid, currency) },
        ], model.customerPerformance.slice(0, 10), 'No customer data.', { totalsKey: 'sales' })
      }
    }

    // Standard tables for other reports
    if (activeReport.id !== 'executive-summary' && activeReport.id !== 'daily-closing') {
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
        ], tableRows, 'No order rows for this report.', { totalsKey: 'total' })
      }
      if (activeReport.id === 'item-sales') {
        tables += buildA4Table('Item Sales', [
          { key: 'name', label: 'Item' },
          { key: 'quantity', label: 'Qty', numeric: true, value: (r) => nv(r.quantity) },
          { key: 'revenue', label: 'Net Sales', numeric: true, value: (r) => mv(r.revenue, currency) },
          { key: 'discount', label: 'Discount', numeric: true, value: (r) => mv(r.discount, currency) },
          { key: 'cost', label: 'Cost', numeric: true, value: (r) => mv(r.cost, currency) },
        ], model.itemSales, 'No item sales data.', { totalsKey: 'revenue' })
      }
      if (activeReport.id === 'category-sales') {
        tables += buildA4Table('Category Sales', [
          { key: 'category', label: 'Category' },
          { key: 'quantity', label: 'Qty', numeric: true, value: (r) => nv(r.quantity) },
          { key: 'revenue', label: 'Net Sales', numeric: true, value: (r) => mv(r.revenue, currency) },
          { key: 'cost', label: 'Cost', numeric: true, value: (r) => mv(r.cost, currency) },
        ], model.categorySales, 'No category sales data.', { totalsKey: 'revenue' })
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
        ], model.tablePerformance, 'No table performance data.', { totalsKey: 'sales' })
      }
      if (activeReport.id === 'customer-sales') {
        tables += buildA4Table('Customer Sales', [
          { key: 'name', label: 'Customer' },
          { key: 'billedOrders', label: 'Billed Orders', numeric: true, value: (r) => nv(r.billedOrders) },
          { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
          { key: 'paid', label: 'Paid', numeric: true, value: (r) => mv(r.paid, currency) },
          { key: 'periodOrderOutstanding', label: 'Due', numeric: true, value: (r) => mv(r.periodOrderOutstanding, currency) },
          { key: 'storedCustomerCreditBalance', label: 'Credit', numeric: true, value: (r) => mv(r.storedCustomerCreditBalance, currency) },
        ], model.customerPerformance, 'No customer sales data.', { totalsKey: 'sales' })
      }
      if (activeReport.id === 'discounts') {
        tables += buildA4Table('Discounts', [
          { key: 'orderNumber', label: 'Order' },
          { key: 'customerName', label: 'Customer' },
          { key: 'discount', label: 'Discount', numeric: true, value: (r) => mv(r.discount, currency) },
          { key: 'total', label: 'Total', numeric: true, value: (r) => mv(r.total, currency) },
        ], model.discountRows, 'No discount data.', { totalsKey: 'discount' })
      }
      if (activeReport.id === 'tax-service-charges') {
        tables += buildA4Table('Tax Rows', [
          { key: 'orderNumber', label: 'Order' },
          { key: 'tax', label: 'Tax', numeric: true, value: (r) => mv(r.tax, currency) },
        ], model.taxRows, 'No tax rows.', { totalsKey: 'tax' })
        tables += buildA4Table('Service Charge Rows', [
          { key: 'orderNumber', label: 'Order' },
          { key: 'serviceCharges', label: 'Service', numeric: true, value: (r) => mv(r.serviceCharges, currency) },
        ], model.serviceChargeRows, 'No service charge rows.', { totalsKey: 'serviceCharges' })
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
        ], 'No KOT data.', { totalsKey: 'count' })
      }
      if (activeReport.id === 'hourly-sales') {
        const hourly = Object.entries(model.ordersByHour || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
        tables += buildA4Table('Hourly Sales', [
          { key: 'hour', label: 'Hour' },
          { key: 'count', label: 'Orders', numeric: true, value: (r) => nv(r.count) },
        ], hourly, 'No hourly data.', { totalsKey: 'count' })
      }
      if (activeReport.id === 'order-type-performance') {
        const rows = Object.entries(model.salesByOrderType || {}).map(([type, sales]) => ({ type, sales }))
        tables += buildA4Table('Order Type Performance', [
          { key: 'type', label: 'Type' },
          { key: 'sales', label: 'Sales', numeric: true, value: (r) => mv(r.sales, currency) },
        ], rows, 'No order type data.', { totalsKey: 'sales' })
      }
      // ═══ Business Intelligence Report ═══
      if (activeReport.id === 'business-intelligence') {
        const bi = model.businessIntelligence || {}
        const pi = bi.productIntelligence || {}
        const ci = bi.customerIntelligence || {}
        const tr = bi.trends || {}
        const fc = bi.forecast || {}

        // Product Intelligence tables
        if (pi.bestSelling?.length) {
          tables += buildA4Table('Best Selling Items (Top 10)', [
            { label: 'Rank', key: 'rank', numeric: true },
            { label: 'Item', key: 'name' },
            { label: 'Category', key: 'category' },
            { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
            { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
            { label: 'Profit', key: 'profit', numeric: true, value: (r) => mv(r.profit, currency) },
          ], pi.bestSelling, 'No best-selling data.', { showTotals: false })
        }
        if (pi.highestProfit?.length) {
          tables += buildA4Table('Highest Profit Items', [
            { label: 'Rank', key: 'rank', numeric: true },
            { label: 'Item', key: 'name' },
            { label: 'Profit', key: 'profit', numeric: true, value: (r) => mv(r.profit, currency) },
            { label: 'Margin', key: 'profitMargin', numeric: true, value: (r) => `${r.profitMargin.toFixed(1)}%` },
          ], pi.highestProfit.slice(0, 10), 'No profit data.', { showTotals: false })
        }
        if (pi.categoryPerformance?.length) {
          tables += buildA4Table('Category Performance', [
            { label: 'Rank', key: 'rank', numeric: true },
            { label: 'Category', key: 'category' },
            { label: 'Qty', key: 'quantity', numeric: true, value: (r) => nv(r.quantity) },
            { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => mv(r.revenue, currency) },
            { label: 'Profit', key: 'profit', numeric: true, value: (r) => mv(r.profit, currency) },
            { label: 'Margin', key: 'profitMargin', numeric: true, value: (r) => `${r.profitMargin.toFixed(1)}%` },
            { label: 'Share', key: 'share', numeric: true, value: (r) => `${r.share.toFixed(1)}%` },
          ], pi.categoryPerformance, 'No category data.', { showTotals: false })
        }

        // Customer Intelligence tables
        if (ci.vip?.length) {
          tables += buildA4Table('VIP Customers (Top 10)', [
            { label: 'Name', key: 'name' },
            { label: 'Orders', key: 'orders', numeric: true, value: (r) => nv(r.orders) },
            { label: 'Sales', key: 'sales', numeric: true, value: (r) => mv(r.sales, currency) },
            { label: 'Paid', key: 'paid', numeric: true, value: (r) => mv(r.paid, currency) },
          ], ci.vip.slice(0, 10), 'No VIP customers.', { showTotals: false })
        }
        if (ci.returning?.length) {
          tables += buildA4Table('Returning Customers', [
            { label: 'Name', key: 'name' },
            { label: 'Orders', key: 'orders', numeric: true, value: (r) => nv(r.orders) },
            { label: 'Sales', key: 'sales', numeric: true, value: (r) => mv(r.sales, currency) },
          ], ci.returning.slice(0, 10), 'No returning customers.', { showTotals: false })
        }

        // Forecast table
        if (fc.tomorrow) {
          tables += buildA4Table('Sales Forecast', [
            { label: 'Period', key: 'period' },
            { label: 'Revenue', key: 'revenue', numeric: true },
            { label: 'Orders', key: 'orders', numeric: true },
            { label: 'Customers', key: 'customers', numeric: true },
          ], [
            { period: 'Tomorrow', revenue: mv(fc.tomorrow.sales, currency), orders: nv(fc.tomorrow.orders), customers: nv(fc.tomorrow.customers) },
            { period: 'Next 7 Days', revenue: mv(fc.nextWeek?.expectedRevenue, currency), orders: nv(fc.nextWeek?.expectedOrders), customers: nv(fc.nextWeek?.expectedCustomers) },
            { period: 'Next 30 Days', revenue: mv(fc.nextMonth?.expectedRevenue, currency), orders: nv(fc.nextMonth?.expectedOrders), customers: nv(fc.nextMonth?.expectedCustomers) },
          ], 'No forecast data.', { showRowNumbers: false })
        }

        // Smart Alerts table
        const activeAlerts = bi.alerts?.filter((a) => a.severity !== 'info') || []
        if (activeAlerts.length) {
          tables += buildA4Table('Smart Alerts', [
            { label: 'Severity', key: 'severity' },
            { label: 'Category', key: 'category' },
            { label: 'Message', key: 'message' },
          ], activeAlerts.map((a) => ({ severity: a.severity.toUpperCase(), category: a.category, message: a.message })), 'No alerts.', { showRowNumbers: false })
        }
      }

      if (activeReport.id === 'cash-drawer-reconciliation' || activeReport.id === 'shift-settlement-report') {
        const rc = model.cashReconciliation || {}
        if (rc.cashSessions && rc.cashSessions.length) {
          tables += buildA4Table('Shift Settlements', [
            { label: 'Cashier', key: 'cashierName' },
            { label: 'Opening', key: 'openingCash', numeric: true, value: (r) => mv(r.openingCash, currency) },
            { label: 'Expected', key: 'expectedCash', numeric: true, value: (r) => mv(r.expectedCash, currency) },
            { label: 'Actual', key: 'actualClosingCash', numeric: true, value: (r) => mv(r.actualClosingCash, currency) },
            { label: 'Diff', key: 'cashDifference', numeric: true, value: (r) => mv(r.cashDifference, currency) },
            { label: 'Txns', key: 'totalTransactions', numeric: true, value: (r) => nv(r.totalTransactions || 0) },
            { label: 'Status', key: 'varianceStatus', value: (r) => String(r.varianceStatus || '').replace(/_/g, ' ') || '-' },
            { label: 'Settlement', key: 'settlementStatus', value: (r) => String(r.settlementStatus || r.status || '').replace(/_/g, ' ') || '-' },
            { label: 'ApprovedBy', key: 'approvedBy', value: (r) => r.approvedBy || '-' },
            { label: 'RejectedBy', key: 'rejectedBy', value: (r) => r.rejectedBy || '-' },
            { label: 'LockedBy', key: 'lockedBy', value: (r) => r.lockedBy || '-' },
          ], rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked'), 'No settled shifts.', { totalsKey: 'cashDifference' })

          // Settlement summary section
          if (rc.settlementCounts?.total > 0) {
            tables += `<div class="report-table page-break-safe"><h3>Settlement Summary</h3></div>`
            tables += `<div class="summary-grid page-break-safe">`
            tables += buildA4SummaryCard('Pending Review', String(rc.settlementCounts.pendingReview || 0), { tone: 'warning' })
            tables += buildA4SummaryCard('Approved', String(rc.settlementCounts.approved || 0), { tone: 'success' })
            tables += buildA4SummaryCard('Rejected', String(rc.settlementCounts.rejected || 0), { tone: 'danger' })
            tables += buildA4SummaryCard('Locked', String(rc.settlementCounts.locked || 0))
            tables += `</div>`
          }
        }
      }
    }
  }

  // ── Signature / approval area (daily closing) ──
  let signatureArea = ''
  if (activeReport.id === 'daily-closing' && hasData) {
    signatureArea = `
      <div class="signature-area page-break-safe">
        <div class="sig-line"><span>Prepared By</span><span class="sig-space"></span></div>
        <div class="sig-line"><span>Reviewed By</span><span class="sig-space"></span></div>
        <div class="sig-line"><span>Approved By</span><span class="sig-space"></span></div>
        <div class="sig-line notes"><span>Manager Notes</span><span class="sig-space" style="min-height:60px"></span></div>
      </div>`
  }

  const limitationHtml = limitationMessage
    ? `<div class="limitation"><p>${esc(limitationMessage)}</p></div>`
    : ''

  // ── Executive template HTML ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(title)} — ${esc(restaurantName)}</title>
<style>
  @page { margin: 22pt 32pt; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.5; padding: 0; margin: 0; }
  .page-break-safe { page-break-inside: avoid; }
  .section-title { font-size: 11pt; font-weight: 900; color: #0f172a; margin: 18pt 0 8pt; padding-bottom: 4pt; border-bottom: 1.5pt solid #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Header */
  .header { border-bottom: 2pt solid #0f172a; padding-bottom: 10pt; margin-bottom: 14pt; }
  .header .brand { font-size: 8pt; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #6366f1; }
  .header h1 { font-size: 18pt; font-weight: 900; margin: 2pt 0 0; letter-spacing: -0.02em; color: #0f172a; line-height: 1.2; }
  .header h2 { font-size: 12pt; font-weight: 700; margin: 0; color: #334155; }

  /* Meta */
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2pt 20pt; font-size: 8.5pt; color: #475569; margin-bottom: 14pt; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6pt; padding: 8pt 12pt; }
  .meta span { }
  .meta .report-id { font-weight: 800; color: #6366f1; letter-spacing: 0.04em; }

  /* KPI Summary Grid */
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 6pt; margin-bottom: 16pt; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 6pt; padding: 8pt 10pt; background: #fff; page-break-inside: avoid; }
  .summary-card .label { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 3pt; }
  .summary-card .value { font-size: 11pt; font-weight: 900; margin: 0; word-break: break-word; }
  .summary-card .subtitle { font-size: 6.5pt; color: #64748b; margin: 2pt 0 0; }

  /* Tables */
  .report-table { margin-bottom: 14pt; }
  .report-table h3 { font-size: 10pt; font-weight: 800; color: #0f172a; margin: 0 0 6pt; text-transform: uppercase; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 0; }
  thead { display: table-header-group; }
  th { background: #1e293b; color: #fff; font-weight: 700; text-align: left; padding: 6pt 7pt; border: none; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em; }
  th.rn { width: 28px; text-align: center; color: #94a3b8; }
  td { padding: 5pt 7pt; border-bottom: 1pt solid #e2e8f0; color: #0f172a; vertical-align: top; }
  td.rn { text-align: center; color: #94a3b8; font-size: 7.5pt; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.alt td { background: #f8fafc; }
  tr.totals td { font-weight: 800; border-top: 1.5pt solid #0f172a; border-bottom: 2.5pt double #0f172a; background: #f1f5f9; padding: 6pt 7pt; }

  /* Signature */
  .signature-area { margin-top: 20pt; padding-top: 12pt; border-top: 1pt solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 16pt 24pt; }
  .sig-line { display: flex; flex-direction: column; gap: 4pt; font-size: 9pt; font-weight: 600; color: #334155; }
  .sig-space { border-bottom: 1pt solid #cbd5e1; min-height: 32px; margin-top: 2pt; }

  /* Empty / Limitation */
  .empty, .empty-message { border: 1pt dashed #cbd5e1; border-radius: 6pt; padding: 16pt; text-align: center; font-size: 9pt; color: #64748b; }
  .limitation { border: 1pt solid #fde68a; border-radius: 6pt; background: #fffbeb; padding: 6pt 10pt; margin-bottom: 10pt; font-size: 8.5pt; color: #92400e; }

  /* Footer */
  .footer { margin-top: 18pt; padding-top: 8pt; border-top: 1pt solid #e2e8f0; font-size: 7.5pt; color: #64748b; display: flex; justify-content: space-between; }

  @media print { .page-break-safe { page-break-inside: avoid; } thead { display: table-header-group; } }
</style></head>
<body>
  <!-- Executive Header -->
  <div class="header page-break-safe">
    <p class="brand">Nexora Business Suite</p>
    <h1>${esc(restaurantName)}</h1>
    <h2>${esc(title)}</h2>
    <p style="margin:3pt 0 0;font-size:8.5pt;color:#475569">${esc(subtitle)}</p>
  </div>

  <!-- Meta Information -->
  <div class="meta page-break-safe">
    <span><b>Report ID:</b> <span class="report-id">${esc(reportId)}</span></span>
    <span><b>Workspace:</b> ${esc(workspaceLabel)}</span>
    <span><b>Business Date:</b> ${esc(dateRangeLabel)}</span>
    <span><b>Printed:</b> ${esc(printedDate)} at ${esc(printedTime)}</span>
    <span><b>Prepared By:</b> System Generated</span>
    <span><b>Business Type:</b> Restaurant POS</span>
    ${activeFilterLabels ? `<span style="grid-column:1/-1"><b>Filters:</b> ${esc(activeFilterLabels)}</span>` : ''}
  </div>

  ${limitationHtml}

  <!-- Summary KPIs -->
  <div class="summary-grid page-break-safe">${summaryCards || `<p class="empty-message">${esc(activeReport.limitationMessage || 'No data for the selected report and filters.')}</p>`}</div>

  <!-- Tables -->
  <div>${tables}</div>

  <!-- Signature / Approval -->
  ${signatureArea}

  <!-- Footer -->
  <div class="footer page-break-safe">
    <span>Nexora Business Suite — ${esc(restaurantName)}</span>
    <span>${esc(activeReport.exportLabel || title)} | ${esc(dateRangeLabel)}</span>
    <span>Page 1 of 1</span>
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
  isCashReconciliation = false,
} = {}) {
  const rc = model.cashReconciliation || {}
  const line = (label, value) => `${label}: ${value}`
  const header = isCashReconciliation ? 'CASH RECONCILIATION' : 'DAILY CLOSING'

  const base = [
    restaurantName,
    header,
    dateRangeLabel,
    '-'.repeat(32),
  ]

  if (isCashReconciliation) {
    base.push(
      line('Opening Cash', mv(model.openingCash, currency)),
      line('Cash Sales', mv(rc.cashSales, currency)),
      line('Cash Refunds', mv(rc.cashRefunds, currency)),
      line('Cash Deposits', mv(rc.cashDeposits, currency)),
      line('Cash Withdrawals', mv(rc.cashWithdrawals, currency)),
      line('Cash Expenses', mv(rc.cashExpenses, currency)),
      line('Cash Adjustments', mv(rc.cashAdjustments, currency)),
      line('Expected Cash', mv(rc.expectedCash, currency)),
      line('Difference', mv(rc.cashDifference, currency)),
      line('Variance', rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A'),
    )
    if (rc.settlementCounts?.total > 0) {
      base.push(
        '-'.repeat(32),
        'SETTLEMENT SUMMARY',
        line('Pending Review', nv(rc.settlementCounts.pendingReview || 0)),
        line('Approved', nv(rc.settlementCounts.approved || 0)),
        line('Rejected', nv(rc.settlementCounts.rejected || 0)),
        line('Locked', nv(rc.settlementCounts.locked || 0)),
      )
    }
  } else {
    base.push(
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
    )
  }

  if (!isCashReconciliation) {
    base.push(
      '-'.repeat(32),
      'Cash reconciliation unavailable:',
      'actual closing cash, refunds,',
      'withdrawals, and reliable',
      'cash-expense data are not stored.',
    )
  }

  return base.concat([
    '-'.repeat(32),
    `Generated: ${generatedAt}`,
    `NEXORA SOLUTION - ${restaurantName}`,
    'All rights reserved 2019-2026.',
  ]).filter(Boolean).join('\n')
}

export async function printRestaurantThermalClosing(options = {}) {
  const { model = {}, restaurantName = 'Restaurant', settings = {}, activeReport = {} } = options
  if (!model.billedOrders && !model.orders) {
    return { ok: false, error: 'No daily closing data to print.' }
  }

  const isCashReconciliation = activeReport.id === 'cash-drawer-reconciliation' || activeReport.id === 'shift-settlement-report'
  // Ensure activeReport.id is available on the options for thermal text builders
  const text = buildDailyClosingThermalText({ ...options, isCashReconciliation })

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
  // ── Business Intelligence CSV ──
  if (activeReport.id === 'business-intelligence') {
    const bi = model.businessIntelligence || {}
    const pi = bi.productIntelligence || {}
    const ci = bi.customerIntelligence || {}
    const tr = bi.trends || {}
    const fc = bi.forecast || {}
    const health = bi.health

    if (health) {
      addKpi('Health Score', `${health.score}/100 ${health.level}`)
      addKpi('Growth Score', `${health.subScores?.growth || 0}/100`)
      addKpi('Profit Score', `${health.subScores?.profit || 0}/100`)
      addKpi('Customer Score', `${health.subScores?.customer || 0}/100`)
      addKpi('Operations Score', `${health.subScores?.operations || 0}/100`)
      addKpi('Risk Score', `${health.subScores?.risk || 0}/100`)
    }
    if (tr.salesTrendLabel) addKpi('Sales Trend', tr.salesTrendLabel)
    if (tr.profitTrendLabel) addKpi('Profit Trend', tr.profitTrendLabel)
    if (tr.salesMomentum) addKpi('Sales Momentum', `${tr.salesMomentum}/100`)
    if (tr.revenueVelocity) addKpi('Revenue Velocity', mv(tr.revenueVelocity, currency))
    if (tr.repeatCustomerRate) addKpi('Repeat Customer Rate', `${Math.round(tr.repeatCustomerRate * 100)}%`)
    if (tr.peakHour) addKpi('Peak Hour', tr.peakHour)
    if (fc.tomorrow) addKpi('Forecast Tomorrow', mv(fc.tomorrow.sales, currency))
    if (fc.nextWeek) addKpi('Forecast 7 Days', mv(fc.nextWeek.expectedRevenue, currency))
    if (fc.nextMonth) addKpi('Forecast 30 Days', mv(fc.nextMonth.expectedRevenue, currency))
    if (fc.confidenceScore) addKpi('Forecast Confidence', `${fc.confidenceScore}%`)
    if (ci.totalCustomers) addKpi('Total Customers', nv(ci.totalCustomers))
    if (ci.vip) addKpi('VIP Customers', nv(ci.vip.length))
    if (ci.returning) addKpi('Returning Customers', nv(ci.returning.length))
    if (ci.averageSpend) addKpi('Avg Customer Spend', mv(ci.averageSpend, currency))
    if (ci.estimatedLifetimeValue) addKpi('Est. Lifetime Value', mv(ci.estimatedLifetimeValue, currency))
    if (pi.itemCount) addKpi('Items Tracked', nv(pi.itemCount))

    if (pi.bestSelling?.length) {
      addTable('Best Selling Items', [
        { label: 'Rank', key: 'rank' },
        { label: 'Item', key: 'name' },
        { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity' },
        { label: 'Revenue', key: 'revenue' },
        { label: 'Profit', key: 'profit' },
      ], pi.bestSelling)
    }
    if (pi.highestProfit?.length) {
      addTable('Highest Profit Items', [
        { label: 'Item', key: 'name' },
        { label: 'Profit', key: 'profit' },
        { label: 'Margin', key: 'profitMargin' },
      ], pi.highestProfit.slice(0, 10))
    }
    if (pi.categoryPerformance?.length) {
      addTable('Category Performance', [
        { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity' },
        { label: 'Revenue', key: 'revenue' },
        { label: 'Profit', key: 'profit' },
        { label: 'Margin', key: 'profitMargin' },
      ], pi.categoryPerformance)
    }
    if (ci.vip?.length) {
      addTable('VIP Customers', [
        { label: 'Name', key: 'name' },
        { label: 'Orders', key: 'orders' },
        { label: 'Sales', key: 'sales' },
        { label: 'Paid', key: 'paid' },
      ], ci.vip.slice(0, 10))
    }
    if (bi.alerts?.length) {
      addTable('Smart Alerts', [
        { label: 'Severity', key: 'severity' },
        { label: 'Category', key: 'category' },
        { label: 'Message', key: 'message' },
      ], bi.alerts.map((a) => ({ severity: a.severity, category: a.category, message: a.message })))
    }
  }

  if (activeReport.id === 'cash-drawer-reconciliation' || activeReport.id === 'shift-settlement-report') {
    const rc = model.cashReconciliation || {}
    addKpi('Opening Cash', mv(model.openingCash, currency))
    addKpi('Cash Sales', mv(rc.cashSales, currency))
    addKpi('Cash Refunds', mv(rc.cashRefunds, currency))
    addKpi('Cash Deposits', mv(rc.cashDeposits, currency))
    addKpi('Cash Withdrawals', mv(rc.cashWithdrawals, currency))
    addKpi('Cash Expenses', mv(rc.cashExpenses, currency))
    addKpi('Cash Adjustments', mv(rc.cashAdjustments, currency))
    addKpi('Expected Cash', mv(rc.expectedCash, currency))
    addKpi('Cash Difference', mv(rc.cashDifference, currency))
    addKpi('Variance', rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A')
    addKpi('Total Transactions', nv(rc.totalTransactions || 0))
    addKpi('Average Sale', mv(rc.averageSale, currency))
    addKpi('Largest Sale', mv(rc.largestSale, currency))
    addKpi('Largest Refund', mv(rc.largestRefund, currency))
    if (rc.settlementCounts?.total > 0) {
      addKpi('Pending Review', nv(rc.settlementCounts.pendingReview || 0))
      addKpi('Approved', nv(rc.settlementCounts.approved || 0))
      addKpi('Rejected', nv(rc.settlementCounts.rejected || 0))
      addKpi('Locked', nv(rc.settlementCounts.locked || 0))
    }
    if (rc.cashSessions && rc.cashSessions.length) {
      addTable('Shift Settlements', [
        { label: 'Cashier', key: 'cashierName' },
        { label: 'Opening', key: 'openingCash' },
        { label: 'Expected', key: 'expectedCash' },
        { label: 'Actual', key: 'actualClosingCash' },
        { label: 'Difference', key: 'cashDifference' },
        { label: 'Txns', key: 'totalTransactions' },
        { label: 'Avg', key: 'averageSale' },
        { label: 'Status', key: 'varianceStatus' },
        { label: 'Settlement', key: 'settlementStatus' },
        { label: 'ApprovedBy', key: 'approvedBy' },
        { label: 'RejectedBy', key: 'rejectedBy' },
        { label: 'LockedBy', key: 'lockedBy' },
        { label: 'DiffReason', key: 'differenceReason' },
        { label: 'ManagerNotes', key: 'managerNotes' },
      ], rc.cashSessions)
    }
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

    // ── Business Intelligence Excel rows ──
    if (activeReport.id === 'business-intelligence') {
      const bi = model.businessIntelligence || {}
      const pi = bi.productIntelligence || {}
      const ci = bi.customerIntelligence || {}
      const tr = bi.trends || {}
      const fc = bi.forecast || {}
      const health = bi.health

      const biRows = []
      if (health) {
        biRows.push(cells('Health Score', `${health.score}/100 ${health.level}`),
          cells('Growth Score', `${health.subScores?.growth || 0}/100`),
          cells('Profit Score', `${health.subScores?.profit || 0}/100`),
          cells('Customer Score', `${health.subScores?.customer || 0}/100`),
          cells('Operations Score', `${health.subScores?.operations || 0}/100`),
          cells('Risk Score', `${health.subScores?.risk || 0}/100`))
      }
      if (tr.salesTrendLabel) biRows.push(cells('Sales Trend', tr.salesTrendLabel))
      if (tr.profitTrendLabel) biRows.push(cells('Profit Trend', tr.profitTrendLabel))
      if (tr.salesMomentum) biRows.push(cells('Sales Momentum', `${tr.salesMomentum}/100`))
      if (tr.revenueVelocity) biRows.push(cells('Revenue Velocity', mv(tr.revenueVelocity, currency)))
      if (tr.repeatCustomerRate) biRows.push(cells('Repeat Customer Rate', `${Math.round(tr.repeatCustomerRate * 100)}%`))
      if (fc.tomorrow) biRows.push(cells('Forecast Tomorrow', mv(fc.tomorrow.sales, currency)))
      if (fc.nextWeek) biRows.push(cells('Forecast 7 Days', mv(fc.nextWeek.expectedRevenue, currency)))
      if (fc.nextMonth) biRows.push(cells('Forecast 30 Days', mv(fc.nextMonth.expectedRevenue, currency)))
      if (fc.confidenceScore) biRows.push(cells('Forecast Confidence', `${fc.confidenceScore}%`))
      if (ci.totalCustomers) biRows.push(cells('Total Customers', nv(ci.totalCustomers)))
      if (ci.averageSpend) biRows.push(cells('Avg Customer Spend', mv(ci.averageSpend, currency)))
      if (ci.estimatedLifetimeValue) biRows.push(cells('Est. Lifetime Value', mv(ci.estimatedLifetimeValue, currency)))
      if (pi.itemCount) biRows.push(cells('Items Tracked', nv(pi.itemCount)))

      body += '\n' + biRows.join('\n')
    }
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
 * PDF Export — delegates to the dedicated PDF engine.
 *
 * Passes the restaurant model + signatures + watermark + metadata
 * to restaurantReportPdf.js for professional PDF generation.
 */
export async function exportRestaurantPdf(options = {}) {
  try {
    const { exportRestaurantPdf: pdfEngine } = await import('./restaurantReportPdf.js')
    const result = await pdfEngine(options)
    return result
  } catch (err) {
    return { ok: false, error: `PDF export failed: ${err?.message || 'Unknown error'}` }
  }
}
