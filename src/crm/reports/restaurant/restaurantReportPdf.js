/**
 * Restaurant POS Professional PDF Engine
 *
 * Uses jsPDF + jspdf-autotable + QRCode (all installed) to generate
 * enterprise-grade PDF reports with watermarks, digital signatures,
 * security metadata, and multi-page support.
 *
 * No Firebase imports — pure client-side PDF generation.
 */


/* ─── Helpers ──────────────────────────────────────────────────────────── */

function money(value, currency = 'PKR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${currency} ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

function num(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString('en-PK')
}

function safeStr(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function addImageSafe(doc, dataUrl, x, y, w, h) {
  if (!dataUrl || !String(dataUrl).startsWith('data:image')) return false
  try { doc.addImage(dataUrl, 'PNG', x, y, w, h); return true } catch { return false }
}

/* ─── Watermark ─────────────────────────────────────────────────────────── */

const WATERMARK_TYPES = ['CONFIDENTIAL', 'DRAFT', 'FINAL', 'PAID', 'INTERNAL USE ONLY']

function addWatermark(doc, pageWidth, pageHeight, text = '') {
  if (!text) return
  const normalized = String(text).trim().toUpperCase()
  if (!WATERMARK_TYPES.includes(normalized)) return
  try {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.08 }))
    doc.setTextColor('#0f172a')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(48)
    doc.text(normalized, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: -30,
    })
    doc.restoreGraphicsState()
  } catch {
    // Watermark unsupported in this jsPDF version — skip silently
  }
}

/* ─── Signature Block ───────────────────────────────────────────────────── */

function addSignatureBlock(doc, startY, margin, pageWidth, signatures = {}) {
  const labels = ['Prepared By', 'Verified By', 'Manager Approval', 'Owner Approval']
  const sigs = signatures || {}
  const colW = (pageWidth - margin * 2) / 4

  doc.setDrawColor('#cbd5e1')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#64748b')

  labels.forEach((label, i) => {
    const x = margin + i * colW
    const sig = sigs[label.toLowerCase().replace(/\s+/g, '')] || ''
    doc.text(safeStr(label), x, startY)
    doc.line(x, startY + 4, x + colW - 10, startY + 4)
    if (sig) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor('#0f172a')
      doc.text(safeStr(sig), x, startY + 14)
    }
  })
  return startY + 28
}

/* ─── Metadata Footer ──────────────────────────────────────────────────── */

function addFooter(doc, pageWidth, pageHeight, margin, meta = {}) {
  const pageCount = doc.internal.getNumberOfPages?.() || 1
  const page = doc.internal.getCurrentPageInfo?.()?.pageNumber || 1

  doc.setDrawColor('#e2e8f0')
  doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#64748b')
  doc.text(
    safeStr(meta.footer, 'NEXORA SOLUTION — All rights reserved 2019-2026.'),
    margin, pageHeight - 20,
  )
  doc.text(
    `${safeStr(meta.reportId)} | ${safeStr(meta.generatedAt)} | Page ${page} of ${pageCount}`,
    pageWidth - margin, pageHeight - 20,
    { align: 'right' },
  )
}

/* ─── Table builder with totals ─────────────────────────────────────────── */

function addDataTable(doc, title, columns, rows, options = {}) {
  const { startY, margin = 40, pageWidth, showTotals = false, totalsKey = '' } = options
  if (!rows || !rows.length) return startY

  // Totals
  let foot = []
  if (showTotals && totalsKey) {
    const totalVal = rows.reduce((s, r) => s + (Number(r[totalsKey]) || 0), 0)
    foot = [columns.map((c, ci) => {
      if (c.key === totalsKey) return money(totalVal)
      if (ci === 0) return 'Total'
      return ''
    })]
  }

  // Column widths
  const colWidths = columns.map((c) => {
    if (c.width) return c.width
    if (c.numeric) return 55
    return Math.max(50, (pageWidth - margin * 2 - columns.filter((c2) => c2.numeric).length * 55) / columns.filter((c2) => !c2.numeric).length || 60)
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor('#0f172a')
  doc.text(safeStr(title), margin, startY)

  doc.autoTable({
    startY: startY + 8,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: '#0f172a', lineColor: '#e2e8f0', lineWidth: 0.5, overflow: 'linebreak' },
    headStyles: { fillColor: '#1e293b', textColor: '#ffffff', fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: '#f1f5f9', textColor: '#0f172a', fontStyle: 'bold', lineColor: '#0f172a', lineWidth: 0.6 },
    alternateRowStyles: { fillColor: '#f8fafc' },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.numeric) acc[i] = { halign: 'right', cellWidth: colWidths[i] }
      else acc[i] = { cellWidth: colWidths[i] }
      return acc
    }, {}),
    head: [columns.map((c) => safeStr(c.label))],
    body: rows.map((row) => columns.map((c) => {
      const val = typeof c.value === 'function' ? c.value(row) : row[c.key]
      return safeStr(val, '')
    })),
    foot: foot.length ? foot : undefined,
  })

  return doc.lastAutoTable.finalY + 12
}

/* ─── KPI Grid (summary cards) ─────────────────────────────────────────── */

function addKpiGrid(doc, kpis, startY, margin, pageWidth) {
  if (!kpis.length) return startY
  const cols = 4
  const colW = (pageWidth - margin * 2) / cols
  const rowH = 28
  const gap = 4

  doc.setFontSize(7)
  kpis.forEach((kpi, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = margin + col * colW
    const y = startY + row * (rowH + gap)

    // Card background
    doc.setFillColor('#f8fafc')
    doc.setDrawColor('#e2e8f0')
    doc.roundedRect(x, y, colW - gap, rowH, 3, 3, 'FD')

    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor('#64748b')
    doc.text(safeStr(kpi[0]), x + 4, y + 8)

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor('#0f172a')
    doc.text(safeStr(kpi[1]), x + 4, y + 22)
  })

  const totalRows = Math.ceil(kpis.length / cols)
  return startY + totalRows * (rowH + gap)
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN PDF EXPORT
   ══════════════════════════════════════════════════════════════════════ */

export async function exportRestaurantPdf({
  model = {},
  activeReport = {},
  filters = {},
  rangeLabel: dateRangeLabel = '',
  restaurantName = 'Restaurant',
  workspaceLabel = '',
  currency = 'PKR',
  generatedAt = '',
  signatures = {},
  watermark = '',
  settings = {},
} = {}) {
  // ── Lazy load PDF deps ─────────────────────────────────────────
  const [{ default: QRCode }, { jsPDF }, autoTableModule] = await Promise.all([
    import('qrcode'),
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default

  const reportId = `RPT-${activeReport.id || 'report'}-${new Date().getTime().toString(36).toUpperCase()}`
  const now = new Date()
  const generatedAtStr = generatedAt || now.toLocaleString()
  const title = activeReport.title || 'Restaurant Report'
  const hasData = model.orders?.length > 0 || model.billedOrders?.length > 0
  const blocked = activeReport.capability === 'blocked'

  // Orientation: landscape for wide reports
  const wideReports = ['item-sales', 'customer-sales', 'orders']
  const landscape = wideReports.includes(activeReport.id)
  const orientation = landscape ? 'landscape' : 'portrait'
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = margin + 40

  // ── QR Code ─────────────────────────────────────────────────────
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(JSON.stringify({
      reportId, workspaceLabel, restaurantName, dateRangeLabel, generatedAt: generatedAtStr,
      reportType: activeReport.id,
    }), { errorCorrectionLevel: 'M', margin: 1, width: 100, color: { dark: '#0f172a', light: '#ffffff' } })
  } catch { /* qr optional */ }

  // ── Header ───────────────────────────────────────────────────────
  addImageSafe(doc, qrDataUrl, pageWidth - margin - 56, margin - 30, 56, 56)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor('#6366f1')
  doc.text('NEXORA BUSINESS SUITE', margin, margin - 20)

  doc.setFontSize(18)
  doc.setTextColor('#0f172a')
  doc.text(safeStr(restaurantName), margin, margin)

  doc.setFontSize(12)
  doc.setTextColor('#334155')
  doc.text(safeStr(title), margin, margin + 18)

  // ── Security metadata ────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor('#475569')
  const metaY = margin + 40
  const metaCols = [
    ['Report ID', reportId],
    ['Workspace', safeStr(workspaceLabel)],
    ['Business Date', safeStr(dateRangeLabel)],
    ['Generated', safeStr(generatedAtStr)],
    ['Business Type', 'Restaurant POS'],
    ['Template Ver', '2.0'],
  ]
  doc.setFillColor('#f8fafc')
  doc.setDrawColor('#e2e8f0')
  doc.roundedRect(margin, metaY - 6, pageWidth - margin * 2, 42, 4, 4, 'FD')

  const metaColW = (pageWidth - margin * 2) / 3
  metaCols.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = margin + col * metaColW + 8
    const my = metaY + row * 18
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor('#64748b')
    doc.text(safeStr(label) + ':', x, my)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor('#0f172a')
    doc.text(safeStr(value), x + (label.length > 10 ? 60 : 50), my)
  })

  y = metaY + 48

  // ── Watermark ────────────────────────────────────────────────────
  if (watermark) {
    addWatermark(doc, pageWidth, pageHeight, watermark)
  }

  // ── Summary KPIs ─────────────────────────────────────────────────
  const kpis = []
  if (!blocked && hasData) {
    if (activeReport.id === 'executive-summary') {
      kpis.push(
        ['Gross Sales', money(model.grossSales, currency)],
        ['Net Sales', money(model.netSales, currency)],
        ['Collected', money(model.collectedAmount, currency)],
        ['Outstanding', money(model.outstandingAmount, currency)],
        ['Billed Orders', num(model.billedOrders?.length)],
        ['Avg Order', money(model.averageOrderValue, currency)],
        ['Gross Profit', money(model.grossProfit, currency)],
        ['Net Profit', money(model.netProfit, currency)],
        ['Cash Received', money(model.cashReceived, currency)],
        ['Expenses', money(model.approvedExpenses, currency)],
        ['Customers', num(model.customerCount || 0)],
        ['Cancelled', num(model.cancellations?.count)],
      )
    }
    if (activeReport.id === 'daily-closing') {
      kpis.push(
        ['Gross Sales', money(model.grossSales, currency)],
        ['Net Sales', money(model.netSales, currency)],
        ['Collected', money(model.collectedAmount, currency)],
        ['Cash', money(model.cashReceived, currency)],
        ['Online', money(model.onlineReceived, currency)],
        ['Billed Orders', num(model.billedOrders?.length)],
        ['Cancelled', num(model.cancellations?.count)],
        ['Tax', money(model.tax, currency)],
        ['Service Chg', money(model.serviceCharges, currency)],
        ['Discounts', money(model.discounts, currency)],
        ['Gross Profit', money(model.grossProfit, currency)],
        ['Net Profit', money(model.netProfit, currency)],
      )
      const rc = model.cashReconciliation || {}
      if (rc.actualClosingCash != null) {
        kpis.push(
          ['Expected Cash', money(rc.expectedCash, currency)],
          ['Cash Diff', money(rc.cashDifference, currency)],
          ['Variance', safeStr(rc.varianceStatus || 'N/A')],
        )
      }
    }
    if (activeReport.id === 'cash-drawer-reconciliation') {
      const rc = model.cashReconciliation || {}
      kpis.push(
        ['Opening Cash', money(model.openingCash, currency)],
        ['Cash Sales', money(rc.cashSales, currency)],
        ['Cash Refunds', money(rc.cashRefunds, currency)],
        ['Cash Deposits', money(rc.cashDeposits, currency)],
        ['Cash Withdrawals', money(rc.cashWithdrawals, currency)],
        ['Cash Expenses', money(rc.cashExpenses, currency)],
        ['Cash Adj', money(rc.cashAdjustments, currency)],
        ['Expected Cash', money(rc.expectedCash, currency)],
        ['Actual Cash', money(rc.actualClosingCash, currency)],
        ['Difference', money(rc.cashDifference, currency)],
        ['Variance', safeStr(rc.varianceStatus || 'N/A')],
        ['Total Txns', num(rc.totalTransactions || 0)],
        ['Avg Sale', money(rc.averageSale, currency)],
        ['Largest Sale', money(rc.largestSale, currency)],
        ['Largest Refund', money(rc.largestRefund, currency)],
      )
    }
    if (activeReport.id === 'orders') {
      kpis.push(
        ['Billed Orders', num(model.billedOrders?.length)],
        ['Total Sales', money(model.totalSales, currency)],
        ['Avg Value', money(model.averageOrderValue, currency)],
        ['Cancelled', num(model.cancellations?.count)],
      )
    }
    if (activeReport.id === 'payment-collection') {
      kpis.push(
        ['Collected', money(model.collectedAmount, currency)],
        ['Cash', money(model.cashReceived, currency)],
        ['Online', money(model.onlineReceived, currency)],
      )
    }
    if (activeReport.id === 'item-sales') {
      kpis.push(
        ['COGS', money(model.costOfGoodsSold, currency)],
        ['Gross Profit', money(model.grossProfit, currency)],
      )
    }
    if (activeReport.id === 'cost-profit') {
      kpis.push(
        ['COGS', money(model.costOfGoodsSold, currency)],
        ['Gross Profit', money(model.grossProfit, currency)],
        ['Expenses', money(model.approvedExpenses, currency)],
        ['Net Profit', money(model.netProfit, currency)],
      )
    }
    if (activeReport.id === 'business-intelligence') {
      const bi = model.businessIntelligence || {}
      const health = bi.health
      if (health) {
        kpis.push(
          ['Health Score', `${health.score}/100 ${health.level}`],
          ['Growth Score', `${health.subScores?.growth || 0}/100`],
          ['Profit Score', `${health.subScores?.profit || 0}/100`],
          ['Customer Score', `${health.subScores?.customer || 0}/100`],
          ['Ops Score', `${health.subScores?.operations || 0}/100`],
          ['Risk Score', `${health.subScores?.risk || 0}/100`],
        )
      }
      const tr = bi.trends || {}
      if (tr.salesTrendLabel) kpis.push(['Sales Trend', tr.salesTrendLabel])
      if (tr.salesMomentum) kpis.push(['Momentum', `${tr.salesMomentum}/100`])
      if (tr.revenueVelocity) kpis.push(['Velocity', money(tr.revenueVelocity, currency)])
      if (tr.repeatCustomerRate) kpis.push(['Repeat Rate', `${Math.round(tr.repeatCustomerRate * 100)}%`])
      if (tr.peakHour) kpis.push(['Peak Hour', `${tr.peakHour} (${tr.peakHourOrders} orders)`])
      const fc = bi.forecast || {}
      if (fc.tomorrow) kpis.push(['Forecast Tomorrow', money(fc.tomorrow.sales, currency)])
      if (fc.confidenceScore) kpis.push(['Confidence', `${fc.confidenceScore}%`])
      const ci = bi.customerIntelligence || {}
      if (ci.totalCustomers) kpis.push(['Total Customers', num(ci.totalCustomers)])
      if (ci.averageSpend) kpis.push(['Avg Spend', money(ci.averageSpend, currency)])
      if (ci.estimatedLifetimeValue) kpis.push(['Est. LTV', money(ci.estimatedLifetimeValue, currency)])
      if (bi.productIntelligence?.itemCount) kpis.push(['Items Tracked', num(bi.productIntelligence.itemCount)])
      const alertCounts = bi.alerts?.filter((a) => a.severity === 'critical').length || 0
      const warnCounts = bi.alerts?.filter((a) => a.severity === 'warning').length || 0
      kpis.push(['Critical Alerts', num(alertCounts)], ['Warnings', num(warnCounts)], ['Risk Level', bi.executive?.riskLevel || 'N/A'])
    }
  }

  if (kpis.length) {
    const kpiH = addKpiGrid(doc, kpis, y, margin, pageWidth)
    if (kpiH > pageHeight - 100) { doc.addPage(); y = margin + 10 } else { y = kpiH }
  }

  // ── Tables ───────────────────────────────────────────────────────
  if (!blocked && hasData) {
    const tryTable = (title, cols, rows, opts = {}) => {
      if (!rows || !rows.length) return
      if (y > pageHeight - 80) { doc.addPage(); y = margin + 10 }
      y = addDataTable(doc, title, cols, rows, { ...opts, startY: y, margin, pageWidth }) || y
    }

    if (activeReport.id === 'executive-summary') {
      // Sales by order type
      const typeRows = Object.entries(model.salesByOrderType || {}).map(([type, sales]) => ({ type, sales }))
      tryTable('Sales by Order Type', [
        { label: 'Type', key: 'type' },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
      ], typeRows, { showTotals: true, totalsKey: 'sales' })

      // Top 10 items
      tryTable('Top 10 Items', [
        { label: 'Item', key: 'name' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
      ], (model.itemSales || []).slice(0, 10), { showTotals: true, totalsKey: 'revenue' })

      // Category sales
      tryTable('Category Sales', [
        { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
      ], model.categorySales, { showTotals: true, totalsKey: 'revenue' })

      // Payment breakdown
      const pmtRows = Object.entries(model.collectionsByPaymentMethod || {}).map(([method, amount]) => ({ method, amount }))
      tryTable('Payment Breakdown', [
        { label: 'Method', key: 'method' },
        { label: 'Amount', key: 'amount', numeric: true, value: (r) => money(r.amount, currency) },
      ], pmtRows, { showTotals: true, totalsKey: 'amount' })

      // Cancellations
      if (model.cancellations?.rows?.length) {
        tryTable('Cancelled Orders', [
          { label: 'Order', key: 'orderNumber' },
          { label: 'Reason', key: 'cancelReason' },
          { label: 'Total', key: 'total', numeric: true, value: (r) => money(r.total, currency) },
        ], model.cancellations.rows)
      }

      // Expense summary
      if (model.approvedExpenses > 0) {
        tryTable('Expenses', [
          { label: 'Total Expenses', key: 'total', numeric: true, value: () => money(model.approvedExpenses, currency) },
          { label: 'Count', key: 'count', numeric: true, value: () => num(model.expenseSummary?.count || 0) },
        ], [{ total: model.approvedExpenses, count: model.expenseSummary?.count || 0 }])
      }

      // Customer summary
      tryTable('Customer Summary (Top 10)', [
        { label: 'Customer', key: 'name' },
        { label: 'Orders', key: 'billedOrders', numeric: true, value: (r) => num(r.billedOrders) },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
        { label: 'Paid', key: 'paid', numeric: true, value: (r) => money(r.paid, currency) },
      ], (model.customerPerformance || []).slice(0, 10), { showTotals: true, totalsKey: 'sales' })
    }

    if (activeReport.id === 'daily-closing') {
      const rc = model.cashReconciliation || {}

      // Payment summary
      const pmtRows = Object.entries(model.collectionsByPaymentMethod || {}).map(([method, amount]) => ({ method, amount }))
      tryTable('Payment Summary', [
        { label: 'Method', key: 'method' },
        { label: 'Amount', key: 'amount', numeric: true, value: (r) => money(r.amount, currency) },
      ], pmtRows, { showTotals: true, totalsKey: 'amount' })

      // Category summary
      tryTable('Category Summary', [
        { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
      ], model.categorySales, { showTotals: true, totalsKey: 'revenue' })

      // Top 10 items
      tryTable('Top 10 Items', [
        { label: 'Item', key: 'name' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
      ], (model.itemSales || []).slice(0, 10), { showTotals: true, totalsKey: 'revenue' })

      // Cancellations
      if (model.cancellations?.rows?.length) {
        tryTable('Cancelled Orders & Reasons', [
          { label: 'Order', key: 'orderNumber' },
          { label: 'Reason', key: 'cancelReason' },
          { label: 'Total', key: 'total', numeric: true, value: (r) => money(r.total, currency) },
        ], model.cancellations.rows)
      }

      // Cash drawer
      tryTable('Cash Drawer Summary', [
        { label: 'Opening', key: 'opening', numeric: true, value: () => money(model.openingCash, currency) },
        { label: 'Cash Sales', key: 'sales', numeric: true, value: () => money(rc.cashSales, currency) },
        { label: 'Expected', key: 'expected', numeric: true, value: () => money(rc.expectedCash || model.openingCash, currency) },
        { label: 'Difference', key: 'diff', numeric: true, value: () => rc.cashDifference != null ? money(rc.cashDifference, currency) : '—' },
        { label: 'Status', key: 'varianceStatus' },
      ], [{
        opening: model.openingCash, sales: rc.cashSales,
        expected: rc.expectedCash || model.openingCash,
        diff: rc.cashDifference, varianceStatus: rc.varianceStatus || 'N/A',
      }])

      // Shift summary
      if (rc.cashSessions?.length) {
        tryTable('Shift Summary', [
          { label: 'Cashier', key: 'cashierName' },
          { label: 'Opening', key: 'openingCash', numeric: true, value: (r) => money(r.openingCash, currency) },
          { label: 'Expected', key: 'expectedCash', numeric: true, value: (r) => money(r.expectedCash, currency) },
          { label: 'Actual', key: 'actualClosingCash', numeric: true, value: (r) => money(r.actualClosingCash, currency) },
          { label: 'Diff', key: 'cashDifference', numeric: true, value: (r) => money(r.cashDifference, currency) },
          { label: 'Status', key: 'varianceStatus', value: (r) => String(r.varianceStatus || '').replace(/_/g, ' ') || '-' },
          { label: 'Settlement', key: 'settlementStatus', value: (r) => String(r.settlementStatus || r.status || '').replace(/_/g, ' ') || '-' },
        ], rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked'))
      }

      // Customer stats
      tryTable('Customer Statistics', [
        { label: 'Customer', key: 'name' },
        { label: 'Orders', key: 'billedOrders', numeric: true, value: (r) => num(r.billedOrders) },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
        { label: 'Paid', key: 'paid', numeric: true, value: (r) => money(r.paid, currency) },
      ], (model.customerPerformance || []).slice(0, 10), { showTotals: true, totalsKey: 'sales' })
    }

    // ── Standard report tables ─────────────────────────────────────
    if (activeReport.id === 'orders' || activeReport.id === 'payment-collection' || activeReport.id === 'due-partial-payments') {
      const tableRows = activeReport.id === 'due-partial-payments'
        ? (model.billedOrders || []).filter((o) => o.isPartial || o.isDue)
        : model.billedOrders || []
      tryTable('Orders', [
        { label: 'Order', key: 'orderNumber' },
        { label: 'Customer', key: 'customerName' },
        { label: 'Type', key: 'orderType' },
        { label: 'Payment', key: 'paymentStatus' },
        { label: 'Total', key: 'total', numeric: true, value: (r) => money(r.total, currency) },
        { label: 'Paid', key: 'paidAmount', numeric: true, value: (r) => money(r.paidAmount, currency) },
        { label: 'Due', key: 'dueAmount', numeric: true, value: (r) => money(r.dueAmount, currency) },
      ], tableRows, { showTotals: true, totalsKey: 'total' })
    }

    if (activeReport.id === 'item-sales') {
      tryTable('Item Sales', [
        { label: 'Item', key: 'name' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
        { label: 'Discount', key: 'discount', numeric: true, value: (r) => money(r.discount, currency) },
        { label: 'Cost', key: 'cost', numeric: true, value: (r) => money(r.cost, currency) },
      ], model.itemSales, { showTotals: true, totalsKey: 'revenue' })
    }

    if (activeReport.id === 'category-sales') {
      tryTable('Category Sales', [
        { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
        { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
        { label: 'Cost', key: 'cost', numeric: true, value: (r) => money(r.cost, currency) },
      ], model.categorySales, { showTotals: true, totalsKey: 'revenue' })
    }

    if (activeReport.id === 'cancellations') {
      tryTable('Cancellations', [
        { label: 'Order', key: 'orderNumber' },
        { label: 'Customer', key: 'customerName' },
        { label: 'Reason', key: 'cancelReason' },
        { label: 'Total', key: 'total', numeric: true, value: (r) => money(r.total, currency) },
      ], model.cancellations?.rows, { showTotals: true, totalsKey: 'total' })
    }

    if (activeReport.id === 'table-performance') {
      tryTable('Table Performance', [
        { label: 'Table', key: 'table' },
        { label: 'Orders', key: 'orders', numeric: true, value: (r) => num(r.orders) },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
        { label: 'Collected', key: 'collected', numeric: true, value: (r) => money(r.collected, currency) },
      ], model.tablePerformance, { showTotals: true, totalsKey: 'sales' })
    }

    if (activeReport.id === 'customer-sales') {
      tryTable('Customer Sales', [
        { label: 'Customer', key: 'name' },
        { label: 'Orders', key: 'billedOrders', numeric: true, value: (r) => num(r.billedOrders) },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
        { label: 'Paid', key: 'paid', numeric: true, value: (r) => money(r.paid, currency) },
        { label: 'Due', key: 'periodOrderOutstanding', numeric: true, value: (r) => money(r.periodOrderOutstanding, currency) },
      ], model.customerPerformance, { showTotals: true, totalsKey: 'sales' })
    }

    if (activeReport.id === 'discounts') {
      tryTable('Discounts', [
        { label: 'Order', key: 'orderNumber' },
        { label: 'Customer', key: 'customerName' },
        { label: 'Discount', key: 'discount', numeric: true, value: (r) => money(r.discount, currency) },
        { label: 'Total', key: 'total', numeric: true, value: (r) => money(r.total, currency) },
      ], model.discountRows, { showTotals: true, totalsKey: 'discount' })
    }

    if (activeReport.id === 'tax-service-charges') {
      tryTable('Tax Rows', [
        { label: 'Order', key: 'orderNumber' },
        { label: 'Tax', key: 'tax', numeric: true, value: (r) => money(r.tax, currency) },
      ], model.taxRows, { showTotals: true, totalsKey: 'tax' })
      tryTable('Service Charge Rows', [
        { label: 'Order', key: 'orderNumber' },
        { label: 'Service Chg', key: 'serviceCharges', numeric: true, value: (r) => money(r.serviceCharges, currency) },
      ], model.serviceChargeRows, { showTotals: true, totalsKey: 'serviceCharges' })
    }

    if (activeReport.id === 'kot-performance') {
      tryTable('KOT Status', [
        { label: 'Status', key: 'status' },
        { label: 'Count', key: 'count', numeric: true },
      ], [
        { status: 'Pending', count: model.kotStatus?.pending || 0 },
        { status: 'Preparing', count: model.kotStatus?.preparing || 0 },
        { status: 'Ready', count: model.kotStatus?.ready || 0 },
        { status: 'Served', count: model.kotStatus?.served || 0 },
      ], { showTotals: true, totalsKey: 'count' })
    }

    if (activeReport.id === 'hourly-sales') {
      const hourly = Object.entries(model.ordersByHour || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, count]) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }))
      tryTable('Hourly Sales', [
        { label: 'Hour', key: 'hour' },
        { label: 'Orders', key: 'count', numeric: true, value: (r) => num(r.count) },
      ], hourly, { showTotals: true, totalsKey: 'count' })
    }

    if (activeReport.id === 'order-type-performance') {
      const rows = Object.entries(model.salesByOrderType || {}).map(([type, sales]) => ({ type, sales }))
      tryTable('Order Type Performance', [
        { label: 'Type', key: 'type' },
        { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
      ], rows, { showTotals: true, totalsKey: 'sales' })
    }

    // ═══ Business Intelligence PDF tables ═══
    if (activeReport.id === 'business-intelligence') {
      const bi = model.businessIntelligence || {}
      const pi = bi.productIntelligence || {}
      const ci = bi.customerIntelligence || {}
      const fc = bi.forecast || {}

      if (pi.bestSelling?.length) {
        tryTable('Best Selling Items (Top 10)', [
          { label: 'Rank', key: 'rank', numeric: true },
          { label: 'Item', key: 'name' },
          { label: 'Cat', key: 'category' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
          { label: 'Profit', key: 'profit', numeric: true, value: (r) => money(r.profit, currency) },
        ], pi.bestSelling)
      }
      if (pi.highestProfit?.length) {
        tryTable('Highest Profit Items', [
          { label: 'Item', key: 'name' },
          { label: 'Profit', key: 'profit', numeric: true, value: (r) => money(r.profit, currency) },
          { label: 'Margin', key: 'profitMargin', numeric: true, value: (r) => `${r.profitMargin.toFixed(1)}%` },
        ], pi.highestProfit.slice(0, 10))
      }
      if (pi.categoryPerformance?.length) {
        tryTable('Category Performance', [
          { label: 'Category', key: 'category' },
          { label: 'Qty', key: 'quantity', numeric: true, value: (r) => num(r.quantity) },
          { label: 'Revenue', key: 'revenue', numeric: true, value: (r) => money(r.revenue, currency) },
          { label: 'Profit', key: 'profit', numeric: true, value: (r) => money(r.profit, currency) },
          { label: 'Margin', key: 'profitMargin', numeric: true, value: (r) => `${r.profitMargin.toFixed(1)}%` },
          { label: 'Share', key: 'share', numeric: true, value: (r) => `${r.share.toFixed(1)}%` },
        ], pi.categoryPerformance)
      }
      if (ci.vip?.length) {
        tryTable('VIP Customers (Top 10)', [
          { label: 'Name', key: 'name' },
          { label: 'Orders', key: 'orders', numeric: true, value: (r) => num(r.orders) },
          { label: 'Sales', key: 'sales', numeric: true, value: (r) => money(r.sales, currency) },
          { label: 'Paid', key: 'paid', numeric: true, value: (r) => money(r.paid, currency) },
        ], ci.vip.slice(0, 10))
      }
      if (fc.tomorrow) {
        tryTable('Sales Forecast', [
          { label: 'Period', key: 'period' },
          { label: 'Revenue', key: 'revenue', numeric: true },
          { label: 'Orders', key: 'orders', numeric: true },
          { label: 'Customers', key: 'customers', numeric: true },
        ], [
          { period: 'Tomorrow', revenue: money(fc.tomorrow.sales, currency), orders: num(fc.tomorrow.orders), customers: num(fc.tomorrow.customers) },
          { period: 'Next 7 Days', revenue: money(fc.nextWeek?.expectedRevenue, currency), orders: num(fc.nextWeek?.expectedOrders), customers: num(fc.nextWeek?.expectedCustomers) },
          { period: 'Next 30 Days', revenue: money(fc.nextMonth?.expectedRevenue, currency), orders: num(fc.nextMonth?.expectedOrders), customers: num(fc.nextMonth?.expectedCustomers) },
        ])
      }
      if (bi.alerts?.length) {
        tryTable('Smart Alerts', [
          { label: 'Severity', key: 'severity' },
          { label: 'Category', key: 'category' },
          { label: 'Message', key: 'message' },
        ], bi.alerts.map((a) => ({ severity: a.severity.toUpperCase(), category: a.category, message: a.message })))
      }
    }

    if (activeReport.id === 'cash-drawer-reconciliation' || activeReport.id === 'shift-settlement-report') {
      const rc = model.cashReconciliation || {}
      if (rc.cashSessions?.length) {
        tryTable('Shift Settlements', [
          { label: 'Cashier', key: 'cashierName' },
          { label: 'Opening', key: 'openingCash', numeric: true, value: (r) => money(r.openingCash, currency) },
          { label: 'Expected', key: 'expectedCash', numeric: true, value: (r) => money(r.expectedCash, currency) },
          { label: 'Actual', key: 'actualClosingCash', numeric: true, value: (r) => money(r.actualClosingCash, currency) },
          { label: 'Diff', key: 'cashDifference', numeric: true, value: (r) => money(r.cashDifference, currency) },
          { label: 'Txns', key: 'totalTransactions', numeric: true, value: (r) => num(r.totalTransactions || 0) },
          { label: 'Status', key: 'varianceStatus', value: (r) => String(r.varianceStatus || '').replace(/_/g, ' ') || '-' },
          { label: 'Settlement', key: 'settlementStatus', value: (r) => String(r.settlementStatus || r.status || '').replace(/_/g, ' ') || '-' },
          { label: 'ApprovedBy', key: 'approvedBy', value: (r) => String(r.approvedBy || '-') },
          { label: 'RejectedBy', key: 'rejectedBy', value: (r) => String(r.rejectedBy || '-') },
          { label: 'LockedBy', key: 'lockedBy', value: (r) => String(r.lockedBy || '-') },
        ], rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked'), { showTotals: true, totalsKey: 'cashDifference' })
      }
    }

    // ── Signature block ────────────────────────────────────────────
    if (activeReport.id === 'daily-closing' || activeReport.id === 'executive-summary') {
      if (y > pageHeight - 120) { doc.addPage(); y = margin + 10 }
      y = addSignatureBlock(doc, y, margin, pageWidth, signatures) || y
    }
  }

  // ── Footer on every page ───────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    addFooter(doc, pageWidth, pageHeight, margin, {
      footer: 'NEXORA SOLUTION — All rights reserved 2019-2026.',
      reportId,
      generatedAt: generatedAtStr,
    })
  }

  // ── Save ────────────────────────────────────────────────────────
  const filename = `${safeStr(activeReport.exportLabel || activeReport.title || 'report').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return { ok: true, filename, reportId }
}
