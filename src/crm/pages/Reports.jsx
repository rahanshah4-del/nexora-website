import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  HiOutlineArrowDownTray,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineBuildingStorefront,
  HiOutlineCalculator,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineFire,
  HiOutlineKey,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
  HiOutlineShoppingBag,
  HiOutlineTableCells,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import PrintableReport from '../components/print/PrintableReport.jsx'
import { supportedCurrencies } from '../data/currency.js'
import { labelForBusinessType, normalizeBusinessType } from '../data/moduleAccess.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { REPORT_SECTION_OPTIONS, useReports } from '../hooks/useReports.js'
import { useUser } from '../hooks/useUser.js'
import { usePosOrders } from '../hooks/usePosOrders.js'
import { usePosWalletPayments } from '../hooks/usePosWalletPayments.js'
import {
  calculateApprovedExpenses,
  calculateProfit,
  calculateRevenue,
  expenseValue,
  getInvoiceStatus,
  invoiceValue,
  isPaidRecord,
  paymentValue,
} from '../lib/calculations.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { buildReportId, exportReportCsv, exportReportExcel, exportReportPdf } from '../lib/reportGenerator.js'
import WhatsappReports from '../components/reports/WhatsappReports.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { buildSalesHubReport, calculateSalesHubReportMetrics, SALES_REPORT_TYPES } from '../lib/salesHubReports.js'
import { generateSalesHubReportPdf, SALES_PDF_TEMPLATES } from '../lib/salesHubReportPdf.js'
import { loadRestaurantCustomers } from '../data/restaurantCustomers.js'
import { restaurantCustomersStorageKey } from '../data/restaurantCustomers.js'
import { loadRestaurantOrders, restaurantOrdersStorageKey } from '../data/restaurantOrders.js'
import { normalizeInvoiceOrders } from '../data/restaurantInvoiceOrders.js'
import RestaurantReportsPage from '../reports/restaurant/RestaurantReportsPage.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useContracts } from '../hooks/useContracts.js'
import { useMaintenance } from '../hooks/useMaintenance.js'
import {
  calculateTotalPayables,
  calculateSuppliersPayableSummary,
  calculateWalletBalance,
  calculateCashBalance,
  calculateBankBalance,
} from '../lib/financeCalculations.js'
import { calculateSupplierBalance } from '../lib/financeCalculations.js'
import { contractDisplayStatus, contractOutstandingBalance, contractStats, maintenanceBalanceDue, maintenanceStats } from '../lib/propertyCalculations.js'
import { formatRestaurantCurrency } from '../lib/restaurantPosCalculations.js'
import { buildRestaurantReport } from '../lib/restaurantReports.js'
import { useRestaurantCashSessions } from '../hooks/useRestaurantCashSessions.js'
import { useRestaurantRefunds } from '../hooks/useRestaurantRefunds.js'
import { loadRestaurantMenuItems } from '../data/restaurantMenu.js'
import { loadTransportBookings, transportBookingsStorageKey } from '../data/transportBookings.js'
import { loadTransportVehicles, transportVehiclesStorageKey } from '../data/transportVehicles.js'
import { loadTransportCustomers, transportCustomersStorageKey } from '../data/transportCustomers.js'
import { loadTransportPayments, transportPaymentsStorageKey } from '../data/transportPayments.js'
import { useLocalData } from '../hooks/useLocalData.js'
import {
  buildTransportReport,
  formatTransportCurrency,
  formatTransportSignedCurrency,
  isTransportRefundPayment,
} from '../lib/transportCalculations.js'
import {
  restaurantBusinessDayBounds,
} from '../lib/restaurantBusinessDay.js'
import { directPrinterAvailable, printHtmlDocument, printThermalText } from '../lib/printerService.js'

const NEXORA_LOGO = '/nexora-brand-logo.png'

const reportLabelByBusiness = {
  'General CRM': 'Sales Report',
  'School ERP': 'Fee Collection Report',
  'Property ERP': 'Rent Report',
  'Retail / POS': 'Sales Report',
  'Restaurant POS': 'Bill/Revenue Report',
  'WhatsApp CRM': 'Lead/Support Report',
}

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom date range' },
]

function safeNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function safeText(value, fallback = 'No data yet') {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
  return text || fallback
}

function toDateValue(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function itemDate(item) {
  return (
    toDateValue(item?.createdAt) ||
    toDateValue(item?.updatedAt) ||
    toDateValue(item?.date) ||
    toDateValue(item?.dueDate) ||
    toDateValue(item?.invoiceDate) ||
    toDateValue(item?.lastContactDate)
  )
}

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function dateWindow(filters) {
  const now = new Date()
  if (filters.range === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (filters.range === 'week') {
    const start = startOfDay(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return { start, end: endOfDay(now) }
  }
  if (filters.range === 'custom') {
    return {
      start: filters.startDate ? startOfDay(new Date(filters.startDate)) : null,
      end: filters.endDate ? endOfDay(new Date(filters.endDate)) : null,
    }
  }
  const start = startOfDay(now)
  start.setDate(1)
  return { start, end: endOfDay(now) }
}

function withinDateWindow(item, rangeWindow) {
  const date = itemDate(item)
  if (!date) return true
  if (rangeWindow.start && date < rangeWindow.start) return false
  if (rangeWindow.end && date > rangeWindow.end) return false
  return true
}

function formatDate(value) {
  const date = toDateValue(value)
  if (!date) return 'No data yet'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

function formatMoney(value, currency) {
  // Amounts are already stored/aggregated in the workspace currency (e.g. PKR) —
  // the same values the Dashboard formats directly. Do NOT run convertFromUsd
  // here: that multiplied by the FX rate (~278.5) and inflated revenue (3000 ->
  // 835,500). Format the raw value to match the Dashboard.
  return formatCurrency(safeNumber(value), currency)
}

function percent(part, total) {
  const denominator = safeNumber(total)
  if (!denominator) return '0%'
  return `${Math.round((safeNumber(part) / denominator) * 100)}%`
}

function dealValue(deal) {
  return safeNumber(deal.dealValueUsd ?? deal.dealValue ?? deal.valueUsd ?? deal.value)
}

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = safeText(cell, '')
          return `"${value.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function MetricCard({ icon: Icon, label, value, helper, tone = 'sky' }) {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <Card className="print-break-inside-avoid p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function ReportSection({ title, badge, children }) {
  return (
    <Card className="print-break-inside-avoid p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">Workspace report data</p>
        </div>
        <Badge variant="purple">{badge}</Badge>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2">
      <span className="min-w-0 truncate text-xs font-medium text-slate-500">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-slate-950">{value}</span>
    </div>
  )
}

function DataTable({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div className="grid min-h-[10rem] place-items-center rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">No report data yet</p>
          <p className="mt-1 text-sm text-slate-500">{empty}</p>
        </div>
      </div>
    )
  }

  const responsiveColumns = columns.map((column) => ({
    key: column.key,
    header: column.label,
    cell: (row) => (column.render ? column.render(row) : safeText(row[column.key])),
  }))

  return (
    <Table
      columns={responsiveColumns}
      rows={rows}
      className="rounded-[1.1rem] border-slate-200 bg-white"
    />
  )
}

function ReportQrCode({ payload }) {
  const [src, setSrc] = useState('')
  const value = useMemo(() => JSON.stringify(payload || {}), [payload])

  useEffect(() => {
    let active = true
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(value, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 132,
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      )
      .then((dataUrl) => {
        if (active) setSrc(dataUrl)
      })
      .catch(() => {
        if (active) setSrc('')
      })
    return () => {
      active = false
    }
  }, [value])

  if (!src) return <div className="grid h-24 w-24 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">QR</div>
  return <img src={src} alt="Report QR code" className="h-24 w-24 rounded-2xl border border-slate-200 bg-white p-1" />
}

function htmlEscape(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function receiptLine(label, value) {
  const left = String(label || '').slice(0, 14)
  const right = String(value ?? '').slice(0, 17)
  return `${left.padEnd(14, ' ')}${right.padStart(18, ' ')}`
}

function buildRetailClosingThermalText({ report, branding, dateRangeLabel, generatedAt, currency }) {
  const rows = [
    branding.companyName || 'NEXORA SOLUTION',
    branding.phone || '',
    branding.address || '',
    '-'.repeat(32),
    'RETAIL POS CLOSING',
    receiptLine('Range', dateRangeLabel),
    receiptLine('Generated', generatedAt),
    '-'.repeat(32),
    receiptLine('Orders', report.orderCount),
    receiptLine('Items sold', report.itemCount),
    receiptLine('Gross', formatMoney(report.grossSales, currency)),
    receiptLine('Discount', `-${formatMoney(report.discount, currency)}`),
    receiptLine('Tax', formatMoney(report.tax, currency)),
    receiptLine('Net sales', formatMoney(report.netSales, currency)),
    receiptLine('Collected', formatMoney(report.collected, currency)),
    receiptLine('Due', formatMoney(report.dueAmount, currency)),
    receiptLine('Settled due', formatMoney(report.walletSettled, currency)),
    receiptLine('Profit', formatMoney(report.profit, currency)),
    '-'.repeat(32),
    'PAYMENT METHODS',
    ...report.methodRows.slice(0, 8).map((row) => receiptLine(row.method, `${row.count} / ${formatMoney(row.amount, currency)}`)),
    '-'.repeat(32),
    'TOP ITEMS',
    ...report.itemRows.slice(0, 8).map((row) => receiptLine(`${row.name} x${row.qty}`, formatMoney(row.amount, currency))),
    '-'.repeat(32),
    branding.receiptFooter || 'NEXORA SOLUTION',
  ]
  return rows.filter(Boolean).join('\n')
}

function buildRetailClosing58mmHtml({ report, branding, dateRangeLabel, generatedAt, currency }) {
  const money = (value) => htmlEscape(formatMoney(value, currency))
  const row = (label, value) => `<div class="row"><span>${htmlEscape(label)}</span><strong>${htmlEscape(value)}</strong></div>`
  return `<!doctype html>
<html>
  <head>
    <title>Retail POS Closing</title>
    <style>
      @page { size: 58mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; width: 58mm; background: #fff; color: #111827; font-family: Arial, sans-serif; font-size: 10px; }
      .receipt { width: 58mm; padding: 8px 7px; }
      .center { text-align: center; }
      h1 { margin: 0; font-size: 13px; line-height: 1.25; text-transform: uppercase; }
      .muted { color: #4b5563; font-size: 9px; line-height: 1.35; }
      .rule { border-top: 1px dashed #111827; margin: 7px 0; }
      .row { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; }
      .row span { min-width: 0; overflow-wrap: anywhere; }
      .row strong { text-align: right; white-space: nowrap; }
      .section { margin: 6px 0 3px; font-weight: 800; text-transform: uppercase; font-size: 9px; letter-spacing: .04em; }
      @media print { body { width: 58mm; } }
    </style>
  </head>
  <body>
    <main class="receipt">
      <div class="center">
        <h1>${htmlEscape(branding.companyName || 'NEXORA SOLUTION')}</h1>
        <div class="muted">${htmlEscape(branding.phone)}</div>
        <div class="muted">${htmlEscape(branding.address)}</div>
      </div>
      <div class="rule"></div>
      <div class="center"><strong>RETAIL POS CLOSING</strong></div>
      ${row('Range', dateRangeLabel)}
      ${row('Generated', generatedAt)}
      <div class="rule"></div>
      ${row('Orders', report.orderCount)}
      ${row('Items sold', report.itemCount)}
      ${row('Gross', money(report.grossSales))}
      ${row('Discount', `-${formatMoney(report.discount, currency)}`)}
      ${row('Tax', money(report.tax))}
      ${row('Net sales', money(report.netSales))}
      ${row('Collected', money(report.collected))}
      ${row('Due', money(report.dueAmount))}
      ${row('Settled due', money(report.walletSettled))}
      ${row('Profit', money(report.profit))}
      <div class="rule"></div>
      <div class="section">Payment Methods</div>
      ${report.methodRows.slice(0, 8).map((item) => row(`${item.method} (${item.count})`, formatMoney(item.amount, currency))).join('')}
      <div class="section">Top Items</div>
      ${report.itemRows.slice(0, 8).map((item) => row(`${item.name} x${item.qty}`, formatMoney(item.amount, currency))).join('')}
      <div class="rule"></div>
      <div class="center muted">${htmlEscape(branding.receiptFooter || 'NEXORA SOLUTION')}</div>
    </main>
  </body>
</html>`
}

function RetailPOSReports() {
  const { profile, currency: preferredCurrency } = usePreferences()
  const { userDoc, firebaseUser, plan } = useUser()
  const businessSettingsApi = useBusinessSettings()
  const [filters, setFilters] = useState({ range: 'today', startDate: '', endDate: '', currency: preferredCurrency || 'PKR' })
  const [detailLoaded, setDetailLoaded] = useState(false)
  const [notice, setNotice] = useState('')
  const activeWindow = useMemo(() => dateWindow(filters), [filters])
  const limitCount = detailLoaded ? 500 : 150
  const posOrdersApi = usePosOrders({ enabled: true, limitCount })
  const walletApi = usePosWalletPayments({ enabled: true, limitCount })
  const reports = useReports({ section: 'finance', limitCount, dateWindow: activeWindow })

  const branding = useMemo(() => ({
    companyName: safeText(businessSettingsApi.settings.businessName || profile.companyName || userDoc?.company || userDoc?.workspaceName, 'Nexora Retail POS'),
    ownerName: safeText(profile.ownerName || userDoc?.fullName || userDoc?.name || firebaseUser?.displayName, 'Workspace Owner'),
    email: safeText(businessSettingsApi.settings.email || profile.email || userDoc?.email || firebaseUser?.email, 'No email yet'),
    phone: safeText(businessSettingsApi.settings.phone || profile.phone, ''),
    address: safeText(businessSettingsApi.settings.address || profile.address || [profile.city, profile.country].filter(Boolean).join(', '), ''),
    receiptFooter: businessSettingsApi.settings.receiptFooter || 'Thank you',
    logo: businessSettingsApi.settings.logoUrl || profile.avatarDataUrl || NEXORA_LOGO,
  }), [businessSettingsApi.settings, firebaseUser?.displayName, firebaseUser?.email, profile, userDoc])

  const retailReport = useMemo(() => {
    const inRange = (rows) => (Array.isArray(rows) ? rows.filter((row) => withinDateWindow(row, activeWindow)) : [])
    const rawOrders = inRange(posOrdersApi.orders)
    // Exclude refunded/cancelled/deleted from active financials
    const orders = rawOrders.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt && o.status !== 'refunded' && o.paymentStatus !== 'refunded')
    const refundedOrders = rawOrders.filter((o) => o.refundStatus === 'refunded' || o.refundedAt || o.status === 'refunded' || o.paymentStatus === 'refunded')
    const walletPayments = inRange(walletApi.payments)
    const expenses = inRange(reports.data.expenses)
    const customers = inRange(reports.data.customers)
    const methodMap = new Map()
    const itemMap = new Map()
    let itemCount = 0

    orders.forEach((order) => {
      const method = safeText(order.paymentMethod, 'Cash')
      const methodRow = methodMap.get(method) || { method, count: 0, amount: 0 }
      methodRow.count += 1
      methodRow.amount += safeNumber(order.paidAmount)
      methodMap.set(method, methodRow)

      ;(order.items || []).forEach((item) => {
        const name = safeText(item.name || item.productName || item.sku, 'Item')
        const qty = safeNumber(item.quantity ?? item.qty, 1)
        const price = safeNumber(item.lineTotal ?? item.total ?? qty * safeNumber(item.price ?? item.rate))
        const itemRow = itemMap.get(name) || { name, qty: 0, amount: 0 }
        itemRow.qty += qty
        itemRow.amount += price
        itemCount += qty
        itemMap.set(name, itemRow)
      })
    })

    walletPayments.forEach((payment) => {
      const method = `${safeText(payment.paymentMethod, 'Cash')} due`
      const methodRow = methodMap.get(method) || { method, count: 0, amount: 0 }
      methodRow.count += 1
      methodRow.amount += safeNumber(payment.amount)
      methodMap.set(method, methodRow)
    })

    const grossSales = orders.reduce((sum, order) => sum + safeNumber(order.subtotal || order.total), 0)
    const discount = orders.reduce((sum, order) => sum + safeNumber(order.discount), 0)
    const tax = orders.reduce((sum, order) => sum + safeNumber(order.tax), 0)
    const netSales = orders.reduce((sum, order) => sum + safeNumber(order.total), 0)
    const collected = orders.reduce((sum, order) => sum + safeNumber(order.paidAmount), 0)
    const dueAmount = orders.reduce((sum, order) => sum + safeNumber(order.dueAmount), 0)
    const walletSettled = walletPayments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0)
    const cost = orders.reduce((sum, order) => sum + safeNumber(order.cost), 0)
    const profit = orders.reduce((sum, order) => sum + safeNumber(order.profit), 0)
    const refundCount = refundedOrders.length
    const refundTotal = refundedOrders.reduce((sum, o) => sum + safeNumber(o.refundAmount || o.paidAmount || o.total), 0)
    const expensesAmount = calculateApprovedExpenses(expenses)

    return {
      orders,
      refundedOrders,
      walletPayments,
      customers,
      expenses,
      orderCount: orders.length,
      orderCountIncRefunds: rawOrders.length,
      refundCount,
      refundTotal,
      settlementCount: walletPayments.length,
      itemCount,
      grossSales,
      discount,
      tax,
      netSales,
      collected,
      dueAmount,
      walletSettled,
      cost,
      profit,
      expensesAmount,
      netAfterExpense: profit - expensesAmount,
      averageOrder: orders.length ? netSales / orders.length : 0,
      methodRows: Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount),
      itemRows: Array.from(itemMap.values()).sort((a, b) => b.amount - a.amount),
      recentRows: orders.slice(0, 12),
      hasData: orders.length || walletPayments.length,
    }
  }, [activeWindow, posOrdersApi.orders, reports.data.customers, reports.data.expenses, walletApi.payments])

  const dateRangeLabel = filters.range === 'custom'
    ? `${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`
    : rangeOptions.find((option) => option.value === filters.range)?.label || 'Today'
  const generatedAt = new Date().toLocaleString()
  const loading = posOrdersApi.loading || walletApi.loading || reports.loading
  const error = posOrdersApi.error || walletApi.error || reports.error

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  async function print58mmClosing() {
    const thermalText = buildRetailClosingThermalText({ report: retailReport, branding, dateRangeLabel, generatedAt, currency: filters.currency })
    const html = buildRetailClosing58mmHtml({ report: retailReport, branding, dateRangeLabel, generatedAt, currency: filters.currency })
    const result = await printHtmlDocument({
      html,
      thermalText,
      settings: businessSettingsApi.settings,
      paperSize: '58mm',
      fallbackOptions: { width: 300, height: 820 },
    })
    showNotice(result.ok ? (result.fallback ? '58mm browser print opened.' : 'Sent to 58mm printer.') : result.error || 'Unable to print 58mm report.')
  }

  function exportRetailCsv() {
    downloadCsv([
      ['Retail POS Closing', branding.companyName, dateRangeLabel, generatedAt],
      ['Metric', 'Value'],
      ['Orders', retailReport.orderCount],
      ['Items sold', retailReport.itemCount],
      ['Gross sales', retailReport.grossSales],
      ['Discount', retailReport.discount],
      ['Tax', retailReport.tax],
      ['Net sales', retailReport.netSales],
      ['Collected', retailReport.collected],
      ['Due amount', retailReport.dueAmount],
      ['Due settled', retailReport.walletSettled],
      ['Profit', retailReport.profit],
      [],
      ['Order', 'Customer', 'Payment', 'Items', 'Total', 'Paid', 'Due', 'Profit', 'Date'],
      ...retailReport.orders.map((row) => [
        row.orderNumber || row.id,
        row.customerName,
        row.paymentMethod,
        row.itemCount,
        row.total,
        row.paidAmount,
        row.dueAmount,
        row.profit,
        formatDate(row.createdAt),
      ]),
    ], `retail-pos-report-${Date.now()}.csv`)
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {notice ? (
        <div className="fixed left-1/2 top-1/2 z-[110] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-xl">
          {notice}
        </div>
      ) : null}

      <PageHeader
        title="Retail POS Reports"
        subtitle="Daily closing, sales, payments, products, profit, due settlements, and 58mm thermal reports generated from POS orders."
        right={
          <>
            <Button type="button" className="rounded-2xl" onClick={print58mmClosing}>
              <HiOutlinePrinter className="h-4 w-4" />
              58mm Daily Closing
            </Button>
            <Button type="button" variant="subtle" className="rounded-2xl" onClick={exportRetailCsv}>
              <HiOutlineArrowDownTray className="h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="text-xs font-semibold text-slate-600">Date range<Select className="mt-1.5" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>{rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          <label className="text-xs font-semibold text-slate-600">Start<Input className="mt-1.5" type="date" disabled={filters.range !== 'custom'} value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} /></label>
          <label className="text-xs font-semibold text-slate-600">End<Input className="mt-1.5" type="date" disabled={filters.range !== 'custom'} value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} /></label>
          <label className="text-xs font-semibold text-slate-600">Currency<Select className="mt-1.5" value={filters.currency} onChange={(event) => setFilters((current) => ({ ...current, currency: event.target.value }))}>{supportedCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</Select></label>
          <Button type="button" variant={detailLoaded ? 'subtle' : 'primary'} className="h-10 rounded-2xl" disabled={detailLoaded} onClick={() => setDetailLoaded(true)}>
            <HiOutlineChartBar className="h-4 w-4" />
            {detailLoaded ? 'Detailed loaded' : 'Load more'}
          </Button>
        </div>
      </Card>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

      <Card className="overflow-hidden border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Badge variant={loading ? 'warning' : 'success'}>{loading ? 'Syncing' : 'Live POS data'}</Badge>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{branding.companyName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{dateRangeLabel} · Plan {plan || 'Free'}</p>
              </div>
              <img src={branding.logo} alt="Business logo" className="h-14 w-14 rounded-2xl border border-slate-200 object-cover" onError={(event) => { event.currentTarget.src = NEXORA_LOGO }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReportMiniStat label="Net sales" value={formatMoney(retailReport.netSales, filters.currency)} />
              <ReportMiniStat label="Collected" value={formatMoney(retailReport.collected + retailReport.walletSettled, filters.currency)} />
              <ReportMiniStat label="Profit" value={formatMoney(retailReport.profit, filters.currency)} />
              <ReportMiniStat label="Due amount" value={formatMoney(retailReport.dueAmount, filters.currency)} />
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Closing Summary</p>
            <div className="mt-4 space-y-2">
              <SummaryRow label="Orders" value={`${retailReport.orderCount} bills`} />
              <SummaryRow label="Items sold" value={retailReport.itemCount} />
              <SummaryRow label="Gross sales" value={formatMoney(retailReport.grossSales, filters.currency)} />
              <SummaryRow label="Discounts" value={`-${formatMoney(retailReport.discount, filters.currency)}`} />
              <SummaryRow label="Tax collected" value={formatMoney(retailReport.tax, filters.currency)} />
              <SummaryRow label="Average order" value={formatMoney(retailReport.averageOrder, filters.currency)} />
              <SummaryRow label="Approved expenses" value={formatMoney(retailReport.expensesAmount, filters.currency)} />
              <SummaryRow label="Net after expense" value={formatMoney(retailReport.netAfterExpense, filters.currency)} />
            </div>
          </div>
        </div>
      </Card>

      {!loading && !retailReport.hasData ? (
        <Card className="p-8 text-center">
          <HiOutlineBuildingStorefront className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-lg font-semibold text-slate-950">No POS report data yet</p>
          <p className="mt-2 text-sm text-slate-500">Create bills in POS Billing and this report will fill automatically.</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={HiOutlineReceiptPercent} label="Orders" value={retailReport.orderCount} helper={`${retailReport.itemCount} items sold · ${retailReport.refundCount} refunded`} tone="sky" />
        <MetricCard icon={HiOutlineBanknotes} label="Cashflow" value={formatMoney(retailReport.collected + retailReport.walletSettled, filters.currency)} helper={`${retailReport.settlementCount} due settlements included`} tone="emerald" />
        <MetricCard icon={HiOutlineCalculator} label="Tax & Discount" value={formatMoney(retailReport.tax - retailReport.discount, filters.currency)} helper={`${formatMoney(retailReport.tax, filters.currency)} tax minus ${formatMoney(retailReport.discount, filters.currency)} discount`} tone="amber" />
        <MetricCard icon={HiOutlineChartPie} label="Cost / Profit" value={formatMoney(retailReport.profit, filters.currency)} helper={`${formatMoney(retailReport.cost, filters.currency)} product cost`} tone="violet" />
        {retailReport.refundCount > 0 ? (
          <MetricCard icon={HiOutlineDocumentText} label="Refunds" value={`-${formatMoney(retailReport.refundTotal, filters.currency)}`} helper={`${retailReport.refundCount} orders refunded`} tone="rose" />
        ) : (
          <MetricCard icon={HiOutlineDocumentText} label="Refunds" value="0" helper="No refunds this period" tone="default" />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ReportTable title="Payment Method Report" rows={retailReport.methodRows} columns={[
          ['Method', (row) => row.method],
          ['Bills', (row) => row.count],
          ['Amount', (row) => formatMoney(row.amount, filters.currency)],
        ]} />
        <ReportTable title="Top Selling Items" rows={retailReport.itemRows.slice(0, 20)} columns={[
          ['Item', (row) => row.name],
          ['Qty', (row) => row.qty],
          ['Sales', (row) => formatMoney(row.amount, filters.currency)],
        ]} />
      </div>

      <ReportTable title="Recent POS Bills" rows={retailReport.recentRows} columns={[
        ['Bill', (row) => row.orderNumber || row.id],
        ['Customer', (row) => row.customerName],
        ['Method', (row) => row.paymentMethod],
        ['Total', (row) => formatMoney(row.total, filters.currency)],
        ['Paid', (row) => formatMoney(row.paidAmount, filters.currency)],
        ['Due', (row) => formatMoney(row.dueAmount, filters.currency)],
        ['Profit', (row) => formatMoney(row.profit, filters.currency)],
      ]} />

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">58mm print is receipt-text based</p>
            <p className="mt-1 text-sm text-slate-500">Daily closing uses direct thermal text when WebUSB printer is connected, otherwise a 58mm browser print document opens. No screenshot printing is used.</p>
          </div>
          <Button type="button" className="rounded-2xl" onClick={print58mmClosing}>
            <HiOutlinePrinter className="h-4 w-4" />
            Print 58mm
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

function GenericReports() {
  const { profile, currency: preferredCurrency } = usePreferences()
  const businessSettingsApi = useBusinessSettings()
  const { userDoc, firebaseUser, workspaceId, businessType, plan } = useUser()
  const isRetailReport = normalizeBusinessType(businessType) === 'Retail / POS'
  const [filters, setFilters] = useState({
    range: 'month',
    startDate: '',
    endDate: '',
    currency: preferredCurrency,
  })
  const [reportSection, setReportSection] = useState('overview')
  const [detailedReportLoaded, setDetailedReportLoaded] = useState(false)
  const [notice, setNotice] = useState('')

  const activeWindow = useMemo(() => dateWindow(filters), [filters])
  const detailLimit = detailedReportLoaded ? 250 : 100
  const reports = useReports({ section: reportSection, limitCount: detailLimit, dateWindow: activeWindow })
  const posOrdersApi = usePosOrders({ enabled: isRetailReport, limitCount: detailLimit })
  const posWalletPaymentsApi = usePosWalletPayments({ enabled: isRetailReport, limitCount: detailLimit })
  const selectedReportSectionLabel = REPORT_SECTION_OPTIONS.find((item) => item.value === reportSection)?.label || 'Overview'

  const reportData = useMemo(() => {
    const filtered = (list) => (Array.isArray(list) ? list.filter((item) => withinDateWindow(item, activeWindow)) : [])
    const invoices = filtered(reports.data.invoices)
    const payments = filtered(reports.data.payments)
    const expenses = filtered(reports.data.expenses)
    const transactions = filtered(reports.data.accountTransactions)
    const customers = filtered(reports.data.customers)
    const leads = filtered(reports.data.leads)
    const deals = filtered(reports.data.pipelines)
    const tasks = filtered(reports.data.tasks)
    const tickets = filtered(reports.data.supportTickets)
    const activityLogs = filtered(reports.data.activityLogs)
    const staff = filtered([...(reports.data.teamMembers || []), ...(reports.data.staff || [])])
    const purchases = filtered(reports.data.purchases || [])
    const suppliers = filtered(reports.data.suppliers || [])
    const posOrdersRaw = filtered(posOrdersApi.orders)
    // Exclude refunded/cancelled from active financial counts
    const posOrders = posOrdersRaw.filter((o) => o.refundStatus !== 'refunded' && !o.refundedAt && o.status !== 'refunded' && o.paymentStatus !== 'refunded')
    const posRefundedOrders = posOrdersRaw.filter((o) => o.refundStatus === 'refunded' || o.refundedAt || o.status === 'refunded' || o.paymentStatus === 'refunded')
    const posWalletPayments = filtered(posWalletPaymentsApi.payments)

    const paidInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'paid')
    const paidPayments = payments.filter(isPaidRecord)
    const approvedExpenses = expenses.filter((expense) => ['approved', 'paid', 'completed'].includes(String(expense.approvalStatus || expense.status || '').toLowerCase()))
    const pendingInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'pending')
    const overdueInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'overdue')
    const activeCustomers = customers.filter((customer) => String(customer.status || '').toLowerCase() === 'active')
    const hotLeads = leads.filter((lead) => safeNumber(lead.score) >= 80 || String(lead.scoreType || '').toLowerCase().includes('hot'))
    const openTickets = tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'open')
    const completedTasks = tasks.filter((task) => String(task.status || '').toLowerCase() === 'completed')
    const totalRevenueUsd = calculateRevenue({ invoices, payments, transactions })
    const paymentRevenueUsd = paidPayments.reduce((sum, payment) => sum + paymentValue(payment), 0)
    const expensesUsd = calculateApprovedExpenses(expenses, transactions)
    const profitUsd = calculateProfit({ revenue: totalRevenueUsd, expenses: expensesUsd })
    const pipelineUsd = deals.reduce((sum, deal) => sum + dealValue(deal), 0)
    const customerSpendUsd = customers.reduce((sum, customer) => sum + safeNumber(customer.spendUsd ?? customer.spend ?? customer.totalSpendUsd), 0)
    const posSalesUsd = posOrders.reduce((sum, order) => sum + safeNumber(order.paidAmount), 0) + posWalletPayments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0)
    const posRefundTotal = posRefundedOrders.reduce((sum, o) => sum + safeNumber(o.refundAmount || o.paidAmount || o.total), 0)
    const posNetSales = posSalesUsd - posRefundTotal
    const posProfitUsd = posOrders.reduce((sum, order) => sum + safeNumber(order.profit), 0)
    const posCostUsd = posOrders.reduce((sum, order) => sum + safeNumber(order.cost), 0)

    // Wallet / Cash / Bank balances from accountTransactions
    const walletBalance = calculateWalletBalance({ invoices, payments, expenses, transactions })
    const cashBalance = calculateCashBalance({ invoices, payments, expenses, transactions })
    const bankBalance = calculateBankBalance(transactions)

    return {
      invoices,
      payments,
      expenses,
      transactions,
      customers,
      leads,
      deals,
      tasks,
      tickets,
      activityLogs,
      staff,
      posOrders,
      posWalletPayments,
      paidInvoices,
      paidPayments,
      approvedExpenses,
      pendingInvoices,
      overdueInvoices,
      activeCustomers,
      hotLeads,
      openTickets,
      completedTasks,
      totalRevenueUsd,
      paymentRevenueUsd,
      expensesUsd,
      profitUsd,
      pipelineUsd,
      customerSpendUsd,
      posSalesUsd,
      posRefundTotal,
      posNetSales,
      posProfitUsd,
      posCostUsd,
      posRefundedOrders,
      purchases,
      suppliers,
      walletBalance,
      cashBalance,
      bankBalance,
      hasData:
        invoices.length ||
        payments.length ||
        expenses.length ||
        customers.length ||
        leads.length ||
        deals.length ||
        tasks.length ||
        tickets.length ||
        activityLogs.length ||
        staff.length ||
        purchases.length ||
        suppliers.length ||
        posOrders.length ||
        posWalletPayments.length,
    }
  }, [reports.data, activeWindow, posOrdersApi.orders, posWalletPaymentsApi.payments])

  const branding = useMemo(
    () => ({
      companyName: safeText(businessSettingsApi.settings.businessName || profile.companyName || userDoc?.company || userDoc?.workspaceName, 'Nexora Workspace'),
      businessName: safeText(businessSettingsApi.settings.businessName || profile.companyName || userDoc?.company || userDoc?.workspaceName, 'Nexora Workspace'),
      ownerName: safeText(profile.ownerName || userDoc?.fullName || userDoc?.name || firebaseUser?.displayName, 'Workspace Owner'),
      email: safeText(businessSettingsApi.settings.email || profile.email || userDoc?.email || firebaseUser?.email, 'No email yet'),
      phone: safeText(businessSettingsApi.settings.phone || profile.phone, 'No phone yet'),
      address: safeText(businessSettingsApi.settings.address || profile.address || [profile.city, profile.country].filter(Boolean).join(', '), 'No address yet'),
      receiptFooter: businessSettingsApi.settings.receiptFooter || '',
      signatureUrl: businessSettingsApi.settings.signatureUrl || '',
      logo: businessSettingsApi.settings.logoUrl || profile.avatarDataUrl || NEXORA_LOGO,
      logoUrl: businessSettingsApi.settings.logoUrl || profile.avatarDataUrl || '',
    }),
    [businessSettingsApi.settings, firebaseUser?.displayName, firebaseUser?.email, profile, userDoc],
  )

  const reportDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  const invoiceRows = reportData.invoices.slice(0, 8)
  const expenseRows = reportData.expenses.slice(0, 8)
  const leadRows = reportData.leads.slice(0, 8)
  const customerRows = reportData.customers.slice(0, 8)
  const activityRows = reportData.activityLogs.slice(0, 8)
  const staffRows = reportData.staff.slice(0, 8)
  const ticketRows = reportData.tickets.slice(0, 8)
  const totalPayables = useMemo(() => calculateTotalPayables(reportData.purchases || []), [reportData.purchases])
  const supplierPayableRows = useMemo(
    () => calculateSuppliersPayableSummary(reportData.suppliers || [], reportData.purchases || []),
    [reportData.suppliers, reportData.purchases],
  )
  const showFinanceSections = reportSection === 'overview' || reportSection === 'finance'
  const showSalesSections = reportSection === 'overview' || reportSection === 'sales'
  const showActivitySections = reportSection === 'activity'
  const showSupportSections = reportSection === 'support'

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  async function printReport() {
    if (directPrinterAvailable(businessSettingsApi.settings)) {
      const directText = [
        reportExport.workspaceName || 'NEXORA SOLUTION',
        reportExport.title || reportTitle,
        `Range: ${reportExport.dateRange || dateRangeLabel}`,
        `Generated: ${reportExport.generatedAt}`,
        `Revenue: ${formatMoney(reportData.totalRevenueUsd, filters.currency)}`,
        `Expenses: ${formatMoney(reportData.expensesUsd, filters.currency)}`,
        `Profit: ${formatMoney(reportData.profitUsd, filters.currency)}`,
        `Invoices: ${reportData.invoices.length}`,
        `Customers: ${reportData.customers.length}`,
      ].join('\n')
      const res = await printThermalText(directText, businessSettingsApi.settings)
      if (res.ok) {
        showNotice('Sent to connected printer.')
        return
      }
      if (res.error) showNotice(`${res.error} Using Chrome print.`)
    }
    window.setTimeout(() => window.print(), 180)
  }

  const activeBusinessType = normalizeBusinessType(businessType)
  const activeBusinessTypeLabel = labelForBusinessType(activeBusinessType)
  const reportTitle = reportLabelByBusiness[activeBusinessType] || 'Workspace Report'
  const dateRangeLabel = filters.range === 'custom'
    ? `${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`
    : rangeOptions.find((option) => option.value === filters.range)?.label || 'This month'

  const reportExport = useMemo(() => {
    const generatedAt = new Date().toLocaleString()
    const reportId = buildReportId(businessSettingsApi.settings.reportPrefix || 'RPT')
    const invoiceColumns = [
      { label: 'Invoice/Fee/Rent/Bill', value: (row) => row.invoiceNumber || row.id || '' },
      { label: 'Customer/Student/Tenant', value: (row) => row.customerName || row.studentName || row.tenantName || '' },
      { label: 'Status', value: (row) => row.status || row.paymentStatus || '' },
      { label: 'Total', value: (row) => formatMoney(invoiceValue(row), filters.currency) },
      { label: 'Due Date', value: (row) => row.dueDate || '' },
    ]
    const expenseColumns = [
      { label: 'Expense', value: (row) => row.title || row.name || row.category || 'Expense' },
      { label: 'Category', value: (row) => row.category || 'General' },
      { label: 'Status', value: (row) => row.approvalStatus || row.status || '' },
      { label: 'Amount', value: (row) => formatMoney(expenseValue(row), filters.currency) },
    ]

    return {
      reportId,
      title: reportTitle,
      workspaceId,
      workspaceName: branding.companyName,
      businessType: activeBusinessTypeLabel,
      dateRange: dateRangeLabel,
      generatedBy: branding.ownerName,
      generatedAt,
      branding,
      summary: [
        { label: 'Total revenue', value: formatMoney(reportData.totalRevenueUsd, filters.currency) },
        { label: 'Paid amount', value: formatMoney(reportData.paymentRevenueUsd, filters.currency) },
        { label: 'Outstanding', value: String(reportData.pendingInvoices.length + reportData.overdueInvoices.length) },
        { label: 'Expenses', value: formatMoney(reportData.expensesUsd, filters.currency) },
        { label: 'Net amount', value: formatMoney(reportData.profitUsd, filters.currency) },
        { label: 'Customers / Students / Tenants', value: String(reportData.customers.length) },
        { label: 'Pending approvals', value: String(reportData.pendingInvoices.length) },
        { label: 'Team members', value: String(reportData.staff.length) },
      ],
      tables: [
        { title: `${reportTitle} - Billing Rows`, columns: invoiceColumns, rows: reportData.invoices },
        { title: 'Expense Rows', columns: expenseColumns, rows: reportData.expenses },
      ],
      qrPayload: {
        reportId,
        workspaceId,
        businessType: activeBusinessType,
        dateRange: dateRangeLabel,
        generatedAt,
        totalRevenue: reportData.totalRevenueUsd,
        totalExpense: reportData.expensesUsd,
        netAmount: reportData.profitUsd,
      },
    }
  }, [activeBusinessType, activeBusinessTypeLabel, branding, businessSettingsApi.settings.reportPrefix, dateRangeLabel, filters.currency, reportData, reportTitle, workspaceId])

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {notice ? (
        <div className="no-print fixed left-1/2 top-1/2 z-[110] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-800 shadow-xl">
          {notice}
        </div>
      ) : null}

      <div className="no-print flex flex-col gap-4 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <HiOutlineDocumentText className="h-4 w-4" />
            Workspace reports
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{reportTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Revenue, billing, payments, expenses, accounts, and activity reports for {activeBusinessType} only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={reports.loading ? 'warning' : 'success'}>{reports.loading ? 'Loading' : 'Live data'}</Badge>
          <Badge variant="default">Plan: {plan || 'Free'}</Badge>
          <Badge variant="info">{selectedReportSectionLabel} - {reports.limitCount} recent rows</Badge>
          <Badge variant="purple">Updated: {reports.lastUpdatedLabel}</Badge>
        </div>
      </div>

      <Card className="no-print p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <div>
            <label className="text-xs font-semibold text-slate-600">Date filter</label>
            <Select className="mt-1.5" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Start date</label>
            <Input
              className="mt-1.5"
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">End date</label>
            <Input
              className="mt-1.5"
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Currency</label>
            <Select className="mt-1.5 xl:w-40" value={filters.currency} onChange={(event) => setFilters((current) => ({ ...current, currency: event.target.value }))}>
              {supportedCurrencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Report section</label>
            <Select
              className="mt-1.5"
              value={reportSection}
              onChange={(event) => {
                setReportSection(event.target.value)
                setDetailedReportLoaded(false)
              }}
            >
              {REPORT_SECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={detailedReportLoaded ? 'subtle' : 'primary'}
            className="h-10 rounded-2xl"
            type="button"
            disabled={detailedReportLoaded}
            onClick={() => setDetailedReportLoaded(true)}
          >
            <HiOutlineChartBar className="h-4 w-4" />
            {detailedReportLoaded ? 'Detailed loaded' : 'Load detailed report'}
          </Button>
          <Button variant="subtle" className="h-10 rounded-2xl" type="button" onClick={printReport}>
            <HiOutlinePrinter className="h-4 w-4" />
            Print Report
          </Button>
          <Button
            variant="subtle"
            className="h-10 rounded-2xl"
            type="button"
            onClick={async () => {
              try {
                await exportReportPdf(reportExport)
              } catch (error) {
                showNotice(error.message || 'Unable to export PDF.')
              }
            }}
          >
            <HiOutlineDocumentText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            className="h-10 rounded-2xl xl:col-start-6"
            type="button"
            onClick={() => exportReportCsv(reportExport)}
          >
            <HiOutlineArrowDownTray className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="subtle"
            className="h-10 rounded-2xl"
            type="button"
            onClick={() => exportReportExcel(reportExport)}
          >
            Excel
          </Button>
        </div>
      </Card>

      <PrintableReport report={reportExport} className="print-only" />

      <section className="no-print space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={branding.logo}
                alt="Company logo"
                className="h-16 w-16 shrink-0 rounded-3xl border border-slate-200 bg-white object-cover shadow-sm"
                onError={(event) => {
                  event.currentTarget.src = NEXORA_LOGO
                }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client report</p>
                <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{branding.companyName}</h2>
                <p className="mt-1 text-sm text-slate-500">{branding.ownerName} - {branding.email}</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:text-right">
              <div className="ml-auto">
                <ReportQrCode payload={reportExport.qrPayload} />
              </div>
              <p><span className="font-semibold text-slate-950">Report ID:</span> {reportExport.reportId}</p>
              <p><span className="font-semibold text-slate-950">Report date:</span> {reportDate}</p>
              <p><span className="font-semibold text-slate-950">Phone:</span> {branding.phone}</p>
              <p><span className="font-semibold text-slate-950">Address:</span> {branding.address}</p>
            </div>
          </div>
        </Card>

        {reports.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {reports.error}
          </div>
        ) : null}

        {!reports.loading && !reportData.hasData ? (
          <Card className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-600">
              <HiOutlineDocumentText className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">No report data yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Start by adding customers, leads, invoices, follow-ups, or team activity. Your printable reports will populate automatically.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-${isRetailReport ? 5 : 4}">
          <MetricCard
            icon={HiOutlineCurrencyDollar}
            label={isRetailReport ? 'POS collection report' : 'Revenue report'}
            value={formatMoney(isRetailReport ? reportData.posSalesUsd : (reportData.totalRevenueUsd || reportData.paymentRevenueUsd), filters.currency)}
            helper={isRetailReport ? `${reportData.posOrders.length} POS orders - ${reportData.posWalletPayments.length} due settlements` : `${reportData.paidInvoices.length} paid invoices - ${reportData.pendingInvoices.length} pending`}
            tone="sky"
          />
          <MetricCard
            icon={HiOutlineChartBar}
            label="Sales report"
            value={formatMoney(reportData.pipelineUsd, filters.currency)}
            helper={`${reportData.deals.length} pipeline deals in this period`}
            tone="violet"
          />
          <MetricCard
            icon={HiOutlineUserGroup}
            label="Customer report"
            value={String(reportData.customers.length)}
            helper={`${reportData.activeCustomers.length} active customers - ${formatMoney(reportData.customerSpendUsd, filters.currency)} spend`}
            tone="emerald"
          />
          <MetricCard
            icon={HiOutlineDocumentText}
            label="Invoices report"
            value={String(reportData.invoices.length)}
            helper={`${percent(reportData.paidInvoices.length, reportData.invoices.length)} paid - ${reportData.overdueInvoices.length} overdue`}
            tone="amber"
          />
          {isRetailReport ? (
            <MetricCard
              icon={HiOutlineExclamationTriangle}
              label="POS Refunds"
              value={formatMoney(reportData.posRefundTotal, filters.currency)}
              helper={`${reportData.posRefundedOrders.length} orders refunded · Net POS: ${formatMoney(reportData.posNetSales, filters.currency)}`}
              tone="rose"
            />
          ) : null}
        </div>

        {/* Wallet / Cash / Bank balance cards */}
        {showFinanceSections ? (
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={HiOutlineBanknotes}
              label="Wallet Balance"
              value={formatMoney(reportData.walletBalance, filters.currency)}
              helper="All revenue minus all outflows (expenses, bank transfers, cash withdrawals, supplier payments, refunds)"
              tone="emerald"
            />
            <MetricCard
              icon={HiOutlineBanknotes}
              label="Cash Balance"
              value={formatMoney(reportData.cashBalance, filters.currency)}
              helper="Wallet balance plus bank transfers — what's physically in the cash drawer"
              tone="sky"
            />
            <MetricCard
              icon={HiOutlineBuildingStorefront}
              label="Bank Balance"
              value={formatMoney(reportData.bankBalance, filters.currency)}
              helper="Total approved bank transfers (money moved out of wallet to bank)"
              tone="violet"
            />
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ReportSection title="Executive summary" badge="Summary">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Lead pipeline" value={`${reportData.leads.length} leads / ${reportData.hotLeads.length} hot`} />
              {isRetailReport ? <SummaryRow label="POS collected" value={`${formatMoney(reportData.posSalesUsd, filters.currency)} / ${reportData.posOrders.length} orders`} /> : null}
              {isRetailReport ? <SummaryRow label="POS refunds" value={formatMoney(reportData.posRefundTotal, filters.currency)} /> : null}
              {isRetailReport ? <SummaryRow label="POS net sales" value={formatMoney(reportData.posNetSales, filters.currency)} /> : null}
              {isRetailReport ? <SummaryRow label="Wallet due settled" value={`${formatMoney(reportData.posWalletPayments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0), filters.currency)} / ${reportData.posWalletPayments.length} payments`} /> : null}
              {isRetailReport ? <SummaryRow label="Invoice sale" value={formatMoney(reportData.totalRevenueUsd, filters.currency)} /> : null}
              {isRetailReport ? <SummaryRow label="POS profit" value={formatMoney(reportData.posProfitUsd, filters.currency)} /> : null}
              <SummaryRow label="Revenue" value={formatMoney(reportData.totalRevenueUsd, filters.currency)} />
              <SummaryRow label="Approved expenses" value={formatMoney(reportData.expensesUsd, filters.currency)} />
              <SummaryRow label="Profit" value={formatMoney(reportData.profitUsd, filters.currency)} />
              {showSupportSections ? <SummaryRow label="Support tickets" value={`${reportData.tickets.length} total / ${reportData.openTickets.length} open`} /> : null}
              {showActivitySections ? <SummaryRow label="Follow-up completion" value={`${reportData.completedTasks.length} completed / ${reportData.tasks.length} tasks`} /> : null}
              {showActivitySections ? <SummaryRow label="Activity events" value={String(reportData.activityLogs.length)} /> : null}
              {showActivitySections ? <SummaryRow label="Team members" value={String(reportData.staff.length)} /> : null}
              <SummaryRow label="Sync status" value={reports.source === 'firestore' ? 'Live Sync' : 'No data yet'} />
            </div>
          </ReportSection>

          {showFinanceSections ? (
            <ReportSection title="Revenue and invoices" badge="Finance">
              <DataTable
                rows={invoiceRows}
                empty="Create invoices to generate finance reports."
                columns={[
                  { key: 'invoiceNumber', label: 'Invoice', render: (row) => safeText(row.invoiceNumber || row.id) },
                  { key: 'customerName', label: 'Customer', render: (row) => safeText(row.customerName) },
                  { key: 'status', label: 'Status', render: (row) => <Badge variant={String(row.status).toLowerCase() === 'paid' ? 'success' : 'warning'}>{safeText(row.status, 'Pending')}</Badge> },
                  { key: 'total', label: 'Total', render: (row) => formatMoney(invoiceValue(row), filters.currency) },
                  { key: 'dueDate', label: 'Due', render: (row) => safeText(row.dueDate, 'No date') },
                ]}
              />
            </ReportSection>
          ) : null}
        </div>

        {showFinanceSections ? (
          <ReportSection title="Expenses and profit" badge="Profit">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <SummaryRow label="Revenue" value={formatMoney(reportData.totalRevenueUsd, filters.currency)} />
              <SummaryRow label="Expenses" value={formatMoney(reportData.expensesUsd, filters.currency)} />
              <SummaryRow label="Profit" value={formatMoney(reportData.profitUsd, filters.currency)} />
            </div>
            <DataTable
              rows={expenseRows}
              empty="Approved expenses will appear here once submitted and reviewed."
              columns={[
                { key: 'title', label: 'Expense', render: (row) => safeText(row.title || row.name || row.category, 'Expense') },
                { key: 'category', label: 'Category', render: (row) => safeText(row.category, 'General') },
                { key: 'approvalStatus', label: 'Status', render: (row) => safeText(row.approvalStatus || row.status, 'Pending') },
                { key: 'amount', label: 'Amount', render: (row) => formatMoney(expenseValue(row), filters.currency) },
              ]}
            />
          </ReportSection>
        ) : null}

        {showFinanceSections ? (
          <ReportSection title="Supplier payables" badge="AP">
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <SummaryRow label="Total purchases" value={formatMoney(totalPayables.totalPurchases, filters.currency)} />
              <SummaryRow label="Total paid" value={formatMoney(totalPayables.totalPaid, filters.currency)} />
              <SummaryRow label="Total due" value={formatMoney(totalPayables.totalDue, filters.currency)} />
              <SummaryRow label="Status" value={`${totalPayables.unpaidCount} unpaid / ${totalPayables.partialCount} partial / ${totalPayables.paidCount} paid`} />
            </div>
            <DataTable
              rows={supplierPayableRows}
              empty="No supplier data yet."
              columns={[
                { key: 'name', label: 'Supplier', render: (row) => row.name },
                { key: 'totalPurchases', label: 'Purchases', render: (row) => formatMoney(row.totalPurchases, filters.currency) },
                { key: 'totalPaid', label: 'Paid', render: (row) => formatMoney(row.totalPaid, filters.currency) },
                { key: 'balanceDue', label: 'Balance due', render: (row) => (
                  <span className={row.balanceDue > 0 ? 'font-semibold text-rose-600' : ''}>{formatMoney(row.balanceDue, filters.currency)}</span>
                ) },
              ]}
            />
          </ReportSection>
        ) : null}

        {showSalesSections ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <ReportSection title="Leads report" badge="Leads">
              <DataTable
                rows={leadRows}
                empty="Add leads to see score and pipeline quality."
                columns={[
                  { key: 'name', label: 'Lead', render: (row) => safeText(row.name || row.customerName || row.company) },
                  { key: 'priority', label: 'Priority', render: (row) => safeText(row.priority || row.scoreType, 'No score yet') },
                  { key: 'score', label: 'Score', render: (row) => `${safeNumber(row.score)}%` },
                  { key: 'dealValue', label: 'Value', render: (row) => formatMoney(dealValue(row), filters.currency) },
                ]}
              />
            </ReportSection>

            <ReportSection title="Customer report" badge="Customers">
              <DataTable
                rows={customerRows}
                empty="Add customers to build a customer report."
                columns={[
                  { key: 'name', label: 'Customer', render: (row) => safeText(row.name) },
                  { key: 'company', label: 'Company', render: (row) => safeText(row.company) },
                  { key: 'status', label: 'Status', render: (row) => safeText(row.status, 'Active') },
                  { key: 'spendUsd', label: 'Spend', render: (row) => formatMoney(row.spendUsd ?? row.spend, filters.currency) },
                ]}
              />
            </ReportSection>
          </div>
        ) : null}

        {showActivitySections ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <ReportSection title="Activity report" badge="Activity">
              <DataTable
                rows={activityRows}
                empty="Activity will appear after users perform workspace actions."
                columns={[
                  { key: 'module', label: 'Module', render: (row) => safeText(row.module, 'System') },
                  { key: 'action', label: 'Action', render: (row) => safeText(row.action) },
                  { key: 'userName', label: 'User', render: (row) => safeText(row.userName || row.userEmail, 'Workspace user') },
                  { key: 'createdAt', label: 'Date', render: (row) => formatDate(row.createdAt || row.updatedAt) },
                ]}
              />
            </ReportSection>

            <ReportSection title="Staff/team report" badge="Team">
              <DataTable
                rows={staffRows}
                empty="Create staff members in Team Management to see team reporting."
                columns={[
                  { key: 'name', label: 'Name', render: (row) => safeText(row.name) },
                  { key: 'email', label: 'Email', render: (row) => safeText(row.email, 'No email yet') },
                  { key: 'role', label: 'Role', render: (row) => safeText(row.role, 'staff') },
                  { key: 'status', label: 'Status', render: (row) => safeText(row.status, 'Active') },
                ]}
              />
            </ReportSection>
          </div>
        ) : null}

        {showSupportSections ? (
          <ReportSection title="Support report" badge="Support">
            <DataTable
              rows={ticketRows}
              empty="Support tickets will appear here when support access is enabled."
              columns={[
                { key: 'ticketNumber', label: 'Ticket', render: (row) => safeText(row.ticketNumber || row.id) },
                { key: 'customerName', label: 'Customer', render: (row) => safeText(row.customerName || row.customerEmail) },
                { key: 'subject', label: 'Subject', render: (row) => safeText(row.subject || row.message) },
                { key: 'status', label: 'Status', render: (row) => safeText(row.status, 'Open') },
              ]}
            />
          </ReportSection>
        ) : null}

        <Card className="print-break-inside-avoid p-5">
          <div className="grid gap-5 md:grid-cols-[1fr_260px] md:items-end">
            <div>
              <p className="text-sm font-semibold text-slate-950">Report notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This report is generated from workspace-scoped CRM data for the authenticated client only. Missing values are shown as zero or "No data yet".
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signature</p>
              <div className="mt-8 border-t border-slate-300 pt-2 text-sm font-semibold text-slate-700">{branding.ownerName}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <span>{branding.receiptFooter || 'NEXORA SOLUTION — All rights reserved 2019-2026.'}</span>
            <span>Module: {activeBusinessType}</span>
            <span><HiOutlineCalendarDays className="mr-1 inline h-4 w-4" />{reportDate}</span>
            <span><HiOutlineBuildingOffice2 className="mr-1 inline h-4 w-4" />{branding.companyName}</span>
          </div>
        </Card>
      </section>
    </motion.div>
  )
}

function SalesHubReports() {
  const { currency: preferredCurrency } = usePreferences()
  const { userDoc, workspaceId } = useUser()
  const businessSettingsApi = useBusinessSettings()
  const dealsApi = useSalesHubCollection('salesDeals')
  const tasksApi = useSalesHubCollection('salesTasks')
  const quotesApi = useSalesHubCollection('salesQuotes')
  const productsApi = useSalesHubCollection('salesProducts')
  const invoicesApi = useInvoices({ limitCount: 250 })
  const expensesApi = useExpenses({ limitCount: 250 })
  const [filters, setFilters] = useState({ range: 'month', startDate: '', endDate: '' })
  const [reportType, setReportType] = useState('executive')
  const [paper, setPaper] = useState('a4')
  const [template, setTemplate] = useState('modern')
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')
  const activeWindow = useMemo(() => dateWindow(filters), [filters])
  const salesDataApi = useReports({ section: 'sales', limitCount: 250, dateWindow: activeWindow })
  const currency = preferredCurrency || businessSettingsApi.settings?.currency || 'PKR'
  const companyName = businessSettingsApi.settings?.businessName || userDoc?.workspaceName || userDoc?.company || 'Nexora Workspace'

  const reportData = useMemo(() => {
    const filtered = (rows) => (Array.isArray(rows) ? rows.filter((row) => withinDateWindow(row, activeWindow)) : [])
    return {
      deals: filtered(dealsApi.rows),
      tasks: filtered(tasksApi.rows),
      quotes: filtered(quotesApi.rows),
      products: filtered(productsApi.rows),
      invoices: filtered(invoicesApi.invoices),
      payments: filtered(invoicesApi.payments),
      expenses: filtered(expensesApi.expenses),
      customers: filtered(salesDataApi.data.customers),
      leads: filtered(salesDataApi.data.leads),
    }
  }, [activeWindow, dealsApi.rows, expensesApi.expenses, invoicesApi.invoices, invoicesApi.payments, productsApi.rows, quotesApi.rows, salesDataApi.data.customers, salesDataApi.data.leads, tasksApi.rows])

  const metrics = useMemo(() => calculateSalesHubReportMetrics(reportData), [reportData])
  const selectedReport = useMemo(() => buildSalesHubReport(reportType, reportData, { currency }), [currency, reportData, reportType])
  const loading = dealsApi.loading || tasksApi.loading || quotesApi.loading || productsApi.loading || invoicesApi.loading || expensesApi.loading || salesDataApi.loading
  const error = dealsApi.error || tasksApi.error || quotesApi.error || productsApi.error || invoicesApi.error || expensesApi.error || salesDataApi.error
  const dateRangeLabel = filters.range === 'custom'
    ? `${filters.startDate || 'Start'} to ${filters.endDate || 'Today'}`
    : rangeOptions.find((option) => option.value === filters.range)?.label || 'This month'

  function reportMeta() {
    return {
      workspaceName: companyName,
      dateRange: dateRangeLabel,
      reportId: buildReportId(businessSettingsApi.settings?.reportPrefix || 'SAL'),
      generatedAt: new Date().toLocaleString(),
      currency,
      workspaceId,
    }
  }

  async function createPdf(mode) {
    setExporting(true)
    setNotice('')
    const previewWindow = mode === 'print' ? window.open('', '_blank') : null
    if (previewWindow) previewWindow.opener = null
    try {
      const pdfTemplate = paper === 'thermal' ? 'thermal' : template
      const { doc, fileName } = await generateSalesHubReportPdf(selectedReport, reportMeta(), pdfTemplate)
      if (mode === 'print') {
        doc.autoPrint()
        const url = doc.output('bloburl')
        if (previewWindow) previewWindow.location.href = url
        else window.open(url, '_blank', 'noopener,noreferrer')
        setNotice(`${paper === 'thermal' ? '58mm' : 'A4'} print-ready PDF opened.`)
      } else {
        doc.save(fileName)
        setNotice(`${paper === 'thermal' ? '58mm' : 'A4'} PDF downloaded.`)
      }
    } catch (pdfError) {
      previewWindow?.close()
      console.error('[Sales Hub Reports] PDF generation failed', pdfError)
      setNotice('Unable to generate this report PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  function exportCsv() {
    const columns = selectedReport.columns
    const rows = [
      columns.map((column) => column.label),
      ...selectedReport.rows.map((row) => columns.map((column) => {
        const value = typeof column.value === 'function' ? column.value(row) : row[column.key]
        return column.money ? `${currency} ${safeNumber(value).toLocaleString()}` : value
      })),
    ]
    downloadCsv(rows, `${reportType}-${Date.now()}.csv`)
  }

  const previewColumns = selectedReport.columns.map((column) => ({
    key: column.key,
    label: column.label,
    render: (row) => {
      const value = typeof column.value === 'function' ? column.value(row) : row[column.key]
      if (column.money) return formatMoney(value, currency)
      if (column.numeric) return safeNumber(value).toLocaleString()
      return safeText(value)
    },
  }))

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Sales Hub Reports"
        subtitle="Live sales intelligence with accurate finance, pipeline, conversion, task, and forecast calculations."
        right={
          <>
            <Button type="button" disabled={exporting} onClick={() => createPdf('download')}><HiOutlineArrowDownTray className="h-4 w-4" />{exporting ? 'Preparing...' : 'Download PDF'}</Button>
            <Button variant="subtle" type="button" disabled={exporting} onClick={() => createPdf('print')}><HiOutlinePrinter className="h-4 w-4" />Print Report</Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="text-xs font-semibold text-slate-600">Report template<Select className="mt-1.5" value={reportType} onChange={(event) => setReportType(event.target.value)}>{SALES_REPORT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          <label className="text-xs font-semibold text-slate-600">Date range<Select className="mt-1.5" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>{rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          {filters.range === 'custom' ? <label className="text-xs font-semibold text-slate-600">From<Input className="mt-1.5" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} /></label> : <div />}
          {filters.range === 'custom' ? <label className="text-xs font-semibold text-slate-600">To<Input className="mt-1.5" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} /></label> : <div />}
          <label className="text-xs font-semibold text-slate-600">A4 design<Select className="mt-1.5" value={template} disabled={paper === 'thermal'} onChange={(event) => setTemplate(event.target.value)}>{SALES_PDF_TEMPLATES.filter((option) => option.value !== 'thermal').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
          <div className="inline-flex h-10 rounded-xl bg-slate-100 p-1">
            <button type="button" className={`rounded-lg px-3 text-xs font-bold ${paper === 'a4' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`} onClick={() => setPaper('a4')}>A4</button>
            <button type="button" className={`rounded-lg px-3 text-xs font-bold ${paper === 'thermal' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`} onClick={() => setPaper('thermal')}>58mm</button>
          </div>
        </div>
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">{notice}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={HiOutlineBanknotes} label="Collected Revenue" value={formatMoney(metrics.revenue, currency)} helper="Approved paid invoices/payments without double counting" tone="emerald" />
        <MetricCard icon={HiOutlineReceiptPercent} label="Approved Expenses" value={formatMoney(metrics.approvedExpenses, currency)} helper="Rejected and pending expenses excluded" tone="amber" />
        <MetricCard icon={HiOutlineChartBar} label="Net Profit" value={formatMoney(metrics.profit, currency)} helper="Collected revenue minus approved expenses" tone="sky" />
        <MetricCard icon={HiOutlineCurrencyDollar} label="Outstanding" value={formatMoney(metrics.outstanding, currency)} helper={`${metrics.paidInvoices} paid · ${metrics.overdueInvoices} overdue invoices`} tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div><p className="text-sm font-semibold text-slate-950">Sales performance</p><p className="mt-1 text-xs text-slate-500">Closed results, open pipeline, and weighted forecast</p></div>
            <Badge variant="info">{loading ? 'Syncing' : 'Live data'}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DataPill label="Won revenue" value={formatMoney(metrics.dealMetrics.wonValue, currency)} />
            <DataPill label="Open pipeline" value={formatMoney(metrics.pipelineMetrics.pipelineValue, currency)} />
            <DataPill label="Weighted forecast" value={formatMoney(metrics.pipelineMetrics.weightedPipeline, currency)} />
            <DataPill label="Lead conversion" value={`${metrics.leadConversionRate}%`} />
            <DataPill label="Accepted quotes" value={`${metrics.acceptedQuotes} · ${formatMoney(metrics.acceptedQuoteValue, currency)}`} />
            <DataPill label="Task completion" value={`${metrics.taskMetrics.completionRate}%`} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950">Record coverage</p>
          <div className="mt-4 space-y-2">
            <SummaryRow label="Deals" value={metrics.dealMetrics.totalDeals} />
            <SummaryRow label="Leads / converted" value={`${metrics.totalLeads} / ${metrics.convertedLeads}`} />
            <SummaryRow label="Active customers" value={metrics.activeCustomers} />
            <SummaryRow label="Quotations" value={metrics.totalQuotes} />
            <SummaryRow label="Invoices" value={metrics.totalInvoices} />
            <SummaryRow label="Tasks / overdue" value={`${metrics.taskMetrics.totalTasks} / ${metrics.taskMetrics.overdueTasks}`} />
          </div>
        </Card>
      </div>

      <ReportSection title={`${selectedReport.title} Preview`} badge={paper === 'thermal' ? '58mm' : template.toUpperCase()}>
        <DataTable rows={selectedReport.rows.slice(0, 100)} columns={previewColumns} empty="Records for the selected date range will appear here." />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{selectedReport.totalLabel}</p><p className="mt-1 text-xl font-semibold text-slate-950">{selectedReport.amountKey ? formatMoney(selectedReport.totalValue, currency) : safeNumber(selectedReport.totalValue).toLocaleString()}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="subtle" type="button" onClick={exportCsv}><HiOutlineTableCells className="h-4 w-4" />CSV</Button><Button type="button" disabled={exporting} onClick={() => createPdf('download')}><HiOutlineArrowDownTray className="h-4 w-4" />{paper === 'thermal' ? '58mm PDF' : 'A4 PDF'}</Button></div>
        </div>
      </ReportSection>
    </motion.div>
  )
}

function DataPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  )
}

function PropertyReports() {
  const { currency: preferredCurrency } = usePreferences()
  const contractsApi = useContracts()
  const maintenanceApi = useMaintenance()
  const currency = preferredCurrency || 'PKR'
  const contracts = useMemo(() => contractsApi.contracts || [], [contractsApi.contracts])
  const requests = useMemo(() => maintenanceApi.requests || [], [maintenanceApi.requests])
  const contractsSummary = useMemo(() => contractStats(contracts), [contracts])
  const maintenanceSummary = useMemo(() => maintenanceStats(requests), [requests])
  const loading = contractsApi.loading || maintenanceApi.loading
  const error = contractsApi.error || maintenanceApi.error

  function exportPropertyCsv() {
    downloadCsv([
      ['Type', 'Reference', 'Party / Property', 'Status', 'Amount', 'Balance'],
      ...contracts.map((row) => ['Contract', row.reference || row.id, `${row.tenantName || '-'} / ${row.propertyName || '-'}`, contractDisplayStatus(row), row.monthlyRent, contractOutstandingBalance(row)]),
      ...requests.map((row) => ['Maintenance', row.id, `${row.title || '-'} / ${row.propertyName || '-'}`, row.status, row.actualCost || row.estimatedCost, maintenanceBalanceDue(row)]),
    ], `property-erp-report-${Date.now()}.csv`)
  }

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader title="Property ERP Reports" subtitle="Live lease, rent expectation, deposits, outstanding balances, and maintenance performance." right={<Button variant="subtle" type="button" onClick={exportPropertyCsv}><HiOutlineArrowDownTray className="h-4 w-4" />Export CSV</Button>} />
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={HiOutlineBuildingOffice2} label="Active Contracts" value={contractsSummary.active} helper={`${contractsSummary.expiringSoon} expiring soon · ${contractsSummary.draft} draft`} tone="sky" />
        <MetricCard icon={HiOutlineBanknotes} label="Monthly Rent Expected" value={formatMoney(contractsSummary.monthlyRentExpected, currency)} helper="Active and expiring-soon contracts only" tone="emerald" />
        <MetricCard icon={HiOutlineCurrencyDollar} label="Contract Outstanding" value={formatMoney(contractsSummary.outstandingTotal, currency)} helper="Contract value minus advance and collected amount" tone="violet" />
        <MetricCard icon={HiOutlineKey} label="Security Deposits Held" value={formatMoney(contractsSummary.depositHeld, currency)} helper="Active contracts only" tone="amber" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DataPill label="Maintenance requests" value={maintenanceSummary.total} />
        <DataPill label="Pending / overdue" value={`${maintenanceSummary.pending} / ${maintenanceSummary.overdue}`} />
        <DataPill label="Actual maintenance cost" value={formatMoney(maintenanceSummary.actualTotal, currency)} />
        <DataPill label="Pending maintenance cost" value={formatMoney(maintenanceSummary.pendingCost, currency)} />
      </div>
      <ReportSection title="Lease & Contract Report" badge={loading ? 'Syncing' : 'Live'}>
        <DataTable rows={contracts} empty="Contracts will appear after they are created in Property ERP." columns={[
          { key: 'reference', label: 'Reference', render: (row) => safeText(row.reference || row.id) },
          { key: 'tenant', label: 'Tenant', render: (row) => safeText(row.tenantName) },
          { key: 'property', label: 'Property / Unit', render: (row) => safeText([row.propertyName, row.unit].filter(Boolean).join(' / ')) },
          { key: 'status', label: 'Status', render: (row) => contractDisplayStatus(row) },
          { key: 'rent', label: 'Monthly Rent', render: (row) => formatMoney(row.monthlyRent, row.currency || currency) },
          { key: 'outstanding', label: 'Outstanding', render: (row) => formatMoney(contractOutstandingBalance(row), row.currency || currency) },
          { key: 'endDate', label: 'End Date', render: (row) => formatDate(row.endDate) },
        ]} />
      </ReportSection>
      <ReportSection title="Maintenance Cost Report" badge="Operations">
        <DataTable rows={requests} empty="Maintenance requests will appear after they are logged." columns={[
          { key: 'title', label: 'Request', render: (row) => safeText(row.title) },
          { key: 'property', label: 'Property', render: (row) => safeText(row.propertyName) },
          { key: 'priority', label: 'Priority' },
          { key: 'status', label: 'Status' },
          { key: 'actual', label: 'Actual Cost', render: (row) => formatMoney(row.actualCost, row.currency || currency) },
          { key: 'paid', label: 'Paid', render: (row) => formatMoney(row.paidAmount, row.currency || currency) },
          { key: 'balance', label: 'Balance', render: (row) => formatMoney(maintenanceBalanceDue(row), row.currency || currency) },
        ]} />
      </ReportSection>
    </motion.div>
  )
}

const restaurantReportRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom date range' },
]

const restaurantOrderTypes = ['All', 'Dine-in', 'Takeaway', 'Delivery', 'Invoice Order']
const restaurantPaymentMethods = ['All', 'Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank', 'Due', 'Invoice']

const RESTAURANT_REPORT_INVOICE_LIMIT = 50
const RESTAURANT_REPORT_EXPENSE_LIMIT = 1000
const RESTAURANT_REPORT_SOURCE_LIMITATION = 'Restaurant invoice and expense totals are based on the records currently loaded. Very large date ranges may require server-side report summaries.'

function restaurantReportDedupeKey(order = {}, index = 0) {
  const sourceKind = String(order.sourceKind || (order.invoice ? 'invoice' : 'restaurant')).trim().toLowerCase() || 'restaurant'
  const identity = String(
    order.id ||
    order.invoice?.id ||
    order.orderNumber ||
    order.invoiceNumber ||
    order.billNumber ||
    order.number ||
    '',
  ).trim()
  return identity ? `${sourceKind}:${identity}` : `${sourceKind}:row-${index}`
}

function dedupeRestaurantReportOrders(normalOrders = [], invoiceOrders = []) {
  const seen = new Set()
  return [...normalOrders, ...invoiceOrders].filter((order, index) => {
    const key = restaurantReportDedupeKey(order, index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function RestaurantReports() {
  const { profile, currency: preferredCurrency } = usePreferences()
  const { userDoc, workspaceId: reportsWorkspaceId } = useUser()
  const invoicesApi = useInvoices({ limitCount: RESTAURANT_REPORT_INVOICE_LIMIT })
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const expensesApi = useExpenses({ limitCount: RESTAURANT_REPORT_EXPENSE_LIMIT })
  const { data: customers = [] } = useLocalData(loadRestaurantCustomers, [restaurantCustomersStorageKey])
  const { data: savedRestaurantOrders = [] } = useLocalData(loadRestaurantOrders, [restaurantOrdersStorageKey])
  const invoiceOrders = useMemo(() => normalizeInvoiceOrders(invoicesApi.invoices), [invoicesApi.invoices])
  const [firestoreOrders, setFirestoreOrders] = useState([])
  useEffect(() => {
    if (!reportsWorkspaceId) return
    loadFirestoreOrders(reportsWorkspaceId).then((fs) => setFirestoreOrders(Array.isArray(fs) ? fs : [])).catch(() => {})
  }, [reportsWorkspaceId])
  const reportOrders = useMemo(
    () => dedupeRestaurantReportOrders([...savedRestaurantOrders, ...firestoreOrders], invoiceOrders),
    [invoiceOrders, savedRestaurantOrders, firestoreOrders],
  )
  const openingCash = safeNumber(
    settings.openingCash ?? settings.cashDrawerOpening ?? settings.openingBalance ?? settings.cashInHand ?? 0,
  )
  const { sessions: cashSessions } = useRestaurantCashSessions({
    enabled: true,
    settings,
  })
  const { refunds } = useRestaurantRefunds({ enabled: true, limitCount: 500 })
  const { data: menuItems = [] } = useLocalData(loadRestaurantMenuItems, [])
  const sourceWarnings = [
    RESTAURANT_REPORT_SOURCE_LIMITATION,
    invoicesApi.error ? `Invoice data warning: ${invoicesApi.error}` : '',
    expensesApi.error ? `Expense data warning: ${expensesApi.error}` : '',
    businessSettingsApi.error ? `Settings warning: ${businessSettingsApi.error}` : '',
  ].filter(Boolean).join(' ')
  const currency = preferredCurrency || settings.currency || 'PKR'
  const restaurantName = settings.businessName || profile?.companyName || userDoc?.company || userDoc?.workspaceName || 'Restaurant'
  const workspaceLabel = userDoc?.workspaceName || userDoc?.company || settings.businessName || 'Workspace'

  return (
    <RestaurantReportsPage
      orders={reportOrders}
      customers={Array.isArray(customers) ? customers : []}
      expenses={Array.isArray(expensesApi.expenses) ? expensesApi.expenses : []}
      openingCash={openingCash}
      currency={currency}
      restaurantName={restaurantName}
      workspaceLabel={workspaceLabel}
      loading={businessSettingsApi.loading || invoicesApi.loading || expensesApi.loading}
      error=""
      sourceLimitations={sourceWarnings}
      settings={settings}
      cashSessions={Array.isArray(cashSessions) ? cashSessions.filter((s) => s.status === 'closed') : []}
      refunds={Array.isArray(refunds) ? refunds : []}
      menuItems={Array.isArray(menuItems) ? menuItems : []}
    />
  )
}

function LegacyRestaurantReports() {
  const { invoices } = useInvoices({ limitCount: 50 })
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const expensesApi = useExpenses({ limitCount: 200 })
  const { data: customers } = useLocalData(loadRestaurantCustomers, [restaurantCustomersStorageKey])
  const { data: savedRestaurantOrders } = useLocalData(loadRestaurantOrders, [restaurantOrdersStorageKey])
  const [filters, setFilters] = useState({
    range: 'today',
    startDate: '',
    endDate: '',
    orderType: 'All',
    paymentMethod: 'All',
  })

  const reportOrders = useMemo(() => [...savedRestaurantOrders, ...normalizeInvoiceOrders(invoices)], [invoices, savedRestaurantOrders])
  const windowRange = useMemo(() => restaurantDateWindow(filters, settings), [filters, settings])
  const orders = useMemo(
    () =>
      reportOrders.filter((order) => {
        const orderDate = new Date(order.createdAt)
        const inDate = (!windowRange.start || orderDate >= windowRange.start) && (!windowRange.end || orderDate <= windowRange.end)
        const inType = filters.orderType === 'All' || order.orderType === filters.orderType
        const inPayment = filters.paymentMethod === 'All' || order.paymentMethod === filters.paymentMethod
        return inDate && inType && inPayment
      }),
    [filters.orderType, filters.paymentMethod, reportOrders, windowRange],
  )

  // Real approved expenses within the selected date window (no fake 18500).
  const windowExpenses = useMemo(() => {
    const approved = calculateApprovedExpenses(
      (expensesApi.expenses || []).filter((expense) => {
        const date = toDateValue(expense.createdAt || expense.date)
        if (windowRange.start && (!date || date < windowRange.start)) return false
        if (windowRange.end && (!date || date > windowRange.end)) return false
        return true
      }),
    )
    return approved
  }, [expensesApi.expenses, windowRange])

  // Opening cash from the business cash-drawer setting (no fake 25000).
  const openingCash = safeNumber(
    settings.openingCash ?? settings.cashDrawerOpening ?? settings.openingBalance ?? settings.cashInHand ?? 0,
  )

  const report = useMemo(
    () => buildRestaurantReport(orders, customers, { openingCash, expenses: windowExpenses }),
    [customers, orders, openingCash, windowExpenses],
  )

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
    <motion.div className="no-print" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Restaurant POS Reports"
        subtitle={`Sales, KOT, table, customer, expense, profit, and daily closing reports. Today follows restaurant timing: ${(settings.restaurantPos?.openingTime || '16:00')} to ${(settings.restaurantPos?.closingTime || '03:00')}.`}
        right={
          <>
            <Button type="button" className="rounded-2xl" onClick={() => window.print()}>
              <HiOutlinePrinter className="h-4 w-4" />
              Print A4 Report
            </Button>
            <Button type="button" variant="subtle" className="rounded-2xl">
              <HiOutlineArrowDownTray className="h-4 w-4" />
              Export PDF
            </Button>
            <Button type="button" variant="subtle" className="rounded-2xl">
              <HiOutlineDocumentText className="h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report Range</label>
            <Select className="mt-1" value={filters.range} onChange={(event) => updateFilter('range', event.target.value)}>
              {restaurantReportRanges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Start Date</label>
            <Input className="mt-1" type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} disabled={filters.range !== 'custom'} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End Date</label>
            <Input className="mt-1" type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} disabled={filters.range !== 'custom'} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Order Type</label>
            <Select className="mt-1" value={filters.orderType} onChange={(event) => updateFilter('orderType', event.target.value)}>
              {restaurantOrderTypes.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payment Method</label>
            <Select className="mt-1" value={filters.paymentMethod} onChange={(event) => updateFilter('paymentMethod', event.target.value)}>
              {restaurantPaymentMethods.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard icon={HiOutlineCurrencyDollar} label="Total Sales" value={formatRestaurantCurrency(report.totalSales)} helper="Gross restaurant order value" tone="emerald" />
        <MetricCard icon={HiOutlineShoppingBag} label="Simple Orders" value={report.simpleOrders} helper="POS dine-in, takeaway, delivery" tone="sky" />
        <MetricCard icon={HiOutlineDocumentText} label="Invoice Orders" value={report.invoiceOrders} helper="A4 invoice bills in this range" tone="violet" />
        <MetricCard icon={HiOutlineBanknotes} label="Paid Amount" value={formatRestaurantCurrency(report.paidAmount)} helper="Cash, card, wallet, and bank received" tone="emerald" />
        <MetricCard icon={HiOutlineReceiptPercent} label="Due Amount" value={formatRestaurantCurrency(report.dueAmount)} helper="Unpaid or partial customer balance" tone="amber" />
        <MetricCard icon={HiOutlineChartBar} label="Avg Order Value" value={formatRestaurantCurrency(report.averageOrderValue)} helper="Sales divided by completed orders" tone="violet" />
        <MetricCard icon={HiOutlineCalculator} label="Discounts" value={formatRestaurantCurrency(report.discounts)} helper="Item and bill discounts applied" tone="amber" />
        <MetricCard icon={HiOutlineChartPie} label="Tax Collected" value={formatRestaurantCurrency(report.tax)} helper="Tax from filtered orders" tone="sky" />
        <MetricCard icon={HiOutlineBuildingStorefront} label="Service Charges" value={formatRestaurantCurrency(report.serviceCharges)} helper="Service charges from restaurant bills" tone="violet" />
        <MetricCard icon={HiOutlineCheckCircle} label="Cancelled Orders" value={report.cancelledOrders} helper="Orders cancelled in selected range" tone="amber" />
        <MetricCard icon={HiOutlineFire} label="Estimated Profit" value={formatRestaurantCurrency(report.estimatedProfit)} helper="Net sales minus item cost and expenses" tone="emerald" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ReportSection title="Sales Breakdown" badge="Sales">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow label="Dine-in sales" value={formatRestaurantCurrency(report.salesByType['Dine-in'])} />
            <SummaryRow label="Takeaway sales" value={formatRestaurantCurrency(report.salesByType.Takeaway)} />
            <SummaryRow label="Delivery sales" value={formatRestaurantCurrency(report.salesByType.Delivery)} />
            <SummaryRow label="Simple order sales" value={formatRestaurantCurrency(report.simpleOrderSales)} />
            <SummaryRow label="Invoice order sales" value={formatRestaurantCurrency(report.invoiceOrderSales)} />
            <SummaryRow label="Cash sales" value={formatRestaurantCurrency(report.salesByPayment.Cash)} />
            <SummaryRow label="Online/Card sales" value={formatRestaurantCurrency(report.onlineSales)} />
            <SummaryRow label="Due/partial payment sales" value={formatRestaurantCurrency(report.duePartialSales)} />
          </div>
        </ReportSection>

        <ReportSection title="Expense & Profit" badge="Profit">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow label="Total expenses" value={formatRestaurantCurrency(report.totalExpenses)} />
            <SummaryRow label="Gross sales" value={formatRestaurantCurrency(report.grossSales)} />
            <SummaryRow label="Net sales" value={formatRestaurantCurrency(report.netSales)} />
            <SummaryRow label="Estimated profit" value={formatRestaurantCurrency(report.estimatedProfit)} />
            <SummaryRow label="Profit after discount/tax/service" value={formatRestaurantCurrency(report.profitAfterAdjustments)} />
          </div>
        </ReportSection>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ReportSection title="Item Reports" badge="Menu">
          <DataTable
            rows={report.itemRows}
            empty="Menu item sales will appear here when orders are created."
            columns={[
              { key: 'name', label: 'Item' },
              { key: 'quantity', label: 'Qty Sold' },
              { key: 'revenue', label: 'Revenue', render: (row) => formatRestaurantCurrency(row.revenue) },
              { key: 'discount', label: 'Discount', render: (row) => formatRestaurantCurrency(row.discount) },
              { key: 'rank', label: 'Movement' },
            ]}
          />
        </ReportSection>

        <ReportSection title="KOT / Kitchen Reports" badge="Kitchen">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow label="Total KOT" value={report.kot.total} />
            <SummaryRow label="Pending KOT" value={report.kot.pending} />
            <SummaryRow label="Preparing KOT" value={report.kot.preparing} />
            <SummaryRow label="Ready KOT" value={report.kot.ready} />
            <SummaryRow label="Served KOT" value={report.kot.served} />
            <SummaryRow label="Average preparation time" value={`${report.kot.averagePreparationTime} min`} />
          </div>
        </ReportSection>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ReportSection title="Table Reports" badge="Floor">
          <DataTable
            rows={report.tableRows}
            empty="Table-wise sales will appear here for dine-in orders."
            columns={[
              { key: 'table', label: 'Table' },
              { key: 'orders', label: 'Orders' },
              { key: 'sales', label: 'Sales', render: (row) => formatRestaurantCurrency(row.sales) },
              { key: 'status', label: 'Status' },
            ]}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <SummaryRow label="Occupied tables" value={report.occupiedTables} />
            <SummaryRow label="Most used table" value={report.mostUsedTable || 'No data yet'} />
          </div>
        </ReportSection>

        <ReportSection title="Customer Reports" badge="Customers">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow label="New customers" value={report.newCustomers} />
            <SummaryRow label="Repeat customers" value={report.repeatCustomers} />
            <SummaryRow label="Customers with due balance" value={report.customersWithDue} />
            <SummaryRow label="Customer order history" value={`${report.customerOrderHistory} tracked orders`} />
          </div>
          <div className="mt-3">
            <DataTable
              rows={report.customerRows}
              empty="Customer history appears after customer orders are saved."
              columns={[
                { key: 'name', label: 'Customer' },
                { key: 'orders', label: 'Orders' },
                { key: 'paid', label: 'Paid', render: (row) => formatRestaurantCurrency(row.paid) },
                { key: 'due', label: 'Due', render: (row) => formatRestaurantCurrency(row.due) },
              ]}
            />
          </div>
        </ReportSection>
      </div>

      <ReportSection title="Daily Closing Report" badge="Closing">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <SummaryRow label="Opening cash" value={formatRestaurantCurrency(report.closing.openingCash)} />
          <SummaryRow label="Cash received" value={formatRestaurantCurrency(report.closing.cashReceived)} />
          <SummaryRow label="Online received" value={formatRestaurantCurrency(report.closing.onlineReceived)} />
          <SummaryRow label="Due payments" value={formatRestaurantCurrency(report.closing.duePayments)} />
          <SummaryRow label="Expenses" value={formatRestaurantCurrency(report.closing.expenses)} />
          <SummaryRow label="Closing cash" value={formatRestaurantCurrency(report.closing.closingCash)} />
          <SummaryRow label="Difference / shortage" value={formatRestaurantCurrency(report.closing.difference)} />
          <SummaryRow label="58mm summary" value="Ready to print" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="subtle" className="rounded-2xl"><HiOutlinePrinter className="h-4 w-4" />58mm Daily Closing</Button>
          <Button type="button" variant="subtle" className="rounded-2xl"><HiOutlineTruck className="h-4 w-4" />Delivery Collection Summary</Button>
        </div>
      </ReportSection>

    </motion.div>
    <RestaurantPrintableReport report={report} filters={filters} />
    </>
  )
}

function RestaurantPrintableReport({ report, filters }) {
  const generatedAt = new Date().toLocaleString()
  return (
    <article className="print-only print-document mx-auto bg-white text-slate-950">
      <header className="print-avoid-break border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">NEXORA SOLUTION</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Restaurant POS Report</h1>
            <p className="mt-2 text-sm text-slate-600">
              Range: {filters.range} / Order type: {filters.orderType} / Payment: {filters.paymentMethod}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-bold text-slate-950">Generated</p>
            <p>{generatedAt}</p>
          </div>
        </div>
      </header>

      <section className="print-avoid-break mt-5 grid grid-cols-3 gap-3 text-sm">
        <PrintMetric label="Total Sales" value={formatRestaurantCurrency(report.totalSales)} />
        <PrintMetric label="Simple Orders" value={report.simpleOrders} />
        <PrintMetric label="Invoice Orders" value={report.invoiceOrders} />
        <PrintMetric label="Paid Amount" value={formatRestaurantCurrency(report.paidAmount)} />
        <PrintMetric label="Due Amount" value={formatRestaurantCurrency(report.dueAmount)} />
        <PrintMetric label="Discounts" value={formatRestaurantCurrency(report.discounts)} />
        <PrintMetric label="Tax Collected" value={formatRestaurantCurrency(report.tax)} />
        <PrintMetric label="Service Charges" value={formatRestaurantCurrency(report.serviceCharges)} />
        <PrintMetric label="Cancelled Orders" value={report.cancelledOrders} />
        <PrintMetric label="Average Order Value" value={formatRestaurantCurrency(report.averageOrderValue)} />
      </section>

      <section className="print-avoid-break mt-5 grid grid-cols-2 gap-4">
        <PrintBox title="Sales Breakdown" rows={[
          ['Dine-in sales', formatRestaurantCurrency(report.salesByType['Dine-in'])],
          ['Takeaway sales', formatRestaurantCurrency(report.salesByType.Takeaway)],
          ['Delivery sales', formatRestaurantCurrency(report.salesByType.Delivery)],
          ['Simple order sales', formatRestaurantCurrency(report.simpleOrderSales)],
          ['Invoice order sales', formatRestaurantCurrency(report.invoiceOrderSales)],
          ['Cash sales', formatRestaurantCurrency(report.salesByPayment.Cash)],
          ['Online/Card sales', formatRestaurantCurrency(report.onlineSales)],
          ['Due/partial sales', formatRestaurantCurrency(report.duePartialSales)],
        ]} />
        <PrintBox title="Daily Closing" rows={[
          ['Opening cash', formatRestaurantCurrency(report.closing.openingCash)],
          ['Cash received', formatRestaurantCurrency(report.closing.cashReceived)],
          ['Online received', formatRestaurantCurrency(report.closing.onlineReceived)],
          ['Due payments', formatRestaurantCurrency(report.closing.duePayments)],
          ['Expenses', formatRestaurantCurrency(report.closing.expenses)],
          ['Closing cash', formatRestaurantCurrency(report.closing.closingCash)],
        ]} />
      </section>

      <PrintTable
        title="Top / Low Selling Items"
        rows={report.itemRows}
        columns={[
          ['Item', (row) => row.name],
          ['Qty', (row) => row.quantity],
          ['Revenue', (row) => formatRestaurantCurrency(row.revenue)],
          ['Discount', (row) => formatRestaurantCurrency(row.discount)],
          ['Movement', (row) => row.rank],
        ]}
      />
      <PrintTable
        title="Table-wise Sales"
        rows={report.tableRows}
        columns={[
          ['Table', (row) => row.table],
          ['Orders', (row) => row.orders],
          ['Sales', (row) => formatRestaurantCurrency(row.sales)],
          ['Status', (row) => row.status],
        ]}
      />
      <PrintTable
        title="Customer Summary"
        rows={report.customerRows}
        columns={[
          ['Customer', (row) => row.name],
          ['Orders', (row) => row.orders],
          ['Paid', (row) => formatRestaurantCurrency(row.paid)],
          ['Due', (row) => formatRestaurantCurrency(row.due)],
        ]}
      />

      <footer className="print-avoid-break mt-6 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500">
        NEXORA SOLUTION - All rights reserved 2019-2026.
      </footer>
    </article>
  )
}

function PrintMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  )
}

function PrintBox({ title, rows }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <div className="mt-2 space-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-t border-slate-100 pt-1">
            <span className="text-slate-600">{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrintTable({ title, rows, columns }) {
  return (
    <section className="mt-5">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <table className="mt-2 w-full border-collapse text-left text-xs">
        <thead className="bg-slate-950 text-white">
          <tr>{columns.map(([label]) => <th key={label} className="px-2 py-2">{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.slice(0, 18).map((row, index) => (
            <tr key={row.id || index} className="border-b border-slate-200">
              {columns.map(([label, value]) => <td key={label} className="px-2 py-2">{value(row)}</td>)}
            </tr>
          )) : (
            <tr><td className="px-2 py-3 text-slate-500" colSpan={columns.length}>No saved restaurant data yet.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function restaurantDateWindow(filters, settings = {}) {
  const now = new Date()
  if (filters.range === 'today') return restaurantBusinessDayBounds(settings, now)
  if (filters.range === 'yesterday') {
    const todayBounds = restaurantBusinessDayBounds(settings, now)
    const previousReference = new Date(todayBounds.start)
    previousReference.setMinutes(previousReference.getMinutes() - 1)
    return restaurantBusinessDayBounds(settings, previousReference)
  }
  if (filters.range === 'week') {
    const start = startOfDay(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return { start, end: endOfDay(now) }
  }
  if (filters.range === 'custom') {
    return {
      start: filters.startDate ? startOfDay(new Date(filters.startDate)) : null,
      end: filters.endDate ? endOfDay(new Date(filters.endDate)) : null,
    }
  }
  const start = startOfDay(now)
  start.setDate(1)
  return { start, end: endOfDay(now) }
}

const transportReportTemplates = [
  {
    id: 'fleet-summary',
    name: 'Fleet Summary',
    label: 'Operations + utilization',
    description: 'Best for daily fleet overview, active rentals, vehicle status, and top vehicles.',
  },
  {
    id: 'rental-ledger',
    name: 'Rental Ledger',
    label: 'Bookings + dues',
    description: 'Best for booking list, customer balances, due follow-up, and payment status.',
  },
  {
    id: 'financial-closing',
    name: 'Financial Closing',
    label: 'Revenue + payments',
    description: 'Best for cash/card/bank totals, dues, deposits, and closing summary.',
  },
]

function TransportReports() {
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const savedTemplate = settings.transportRental?.reportTemplate || 'fleet-summary'
  const [selectedTemplate, setSelectedTemplate] = useState(savedTemplate)
  const [filters, setFilters] = useState({
    range: 'month',
    startDate: '',
    endDate: '',
  })
  const [notice, setNotice] = useState('')
  const { data: vehicles } = useLocalData(loadTransportVehicles, [transportVehiclesStorageKey])
  const { data: allBookings } = useLocalData(loadTransportBookings, [transportBookingsStorageKey])
  const { data: customers } = useLocalData(loadTransportCustomers, [transportCustomersStorageKey])
  const { data: allPayments } = useLocalData(loadTransportPayments, [transportPaymentsStorageKey])
  const activeWindow = useMemo(() => dateWindow(filters), [filters])
  const dateRangeLabel = filters.range === 'custom'
    ? `${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`
    : rangeOptions.find((option) => option.value === filters.range)?.label || 'This month'
  const bookings = useMemo(
    () => allBookings.filter((booking) => withinDateWindow(booking, activeWindow)),
    [activeWindow, allBookings],
  )
  const payments = useMemo(
    () => allPayments.filter((payment) => withinDateWindow(payment, activeWindow)),
    [activeWindow, allPayments],
  )
  const report = useMemo(() => buildTransportReport({ vehicles, bookings, customers, payments }), [vehicles, bookings, customers, payments])
  const template = transportReportTemplates.find((item) => item.id === selectedTemplate) || transportReportTemplates[0]
  const pdfReport = useMemo(
    () => buildTransportPdfReport({
      template,
      report,
      settings,
      dateRangeLabel,
      workspaceId: settings.workspaceId || '',
    }),
    [dateRangeLabel, report, settings, template],
  )

  useEffect(() => {
    setSelectedTemplate(savedTemplate)
  }, [savedTemplate])

  async function saveTemplate() {
    const res = await businessSettingsApi.saveSettings({
      transportRental: {
        ...(settings.transportRental || {}),
        reportTemplate: selectedTemplate,
      },
    })
    setNotice(res.ok ? 'Report template saved.' : res.error || 'Unable to save template.')
    window.setTimeout(() => setNotice(''), 2200)
  }

  async function generatePdf() {
    try {
      await exportReportPdf(pdfReport)
      setNotice('PDF report generated.')
    } catch (error) {
      setNotice(error.message || 'Unable to generate PDF report.')
    }
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {notice ? (
        <div className="no-print fixed left-1/2 top-1/2 z-[110] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 shadow-xl">
          {notice}
        </div>
      ) : null}

      <PageHeader
        title="Transport / Rental Reports"
        subtitle="Choose a professional report template for fleet, bookings, dues, and rental revenue."
        right={(
          <>
            <Button type="button" variant="subtle" className="rounded-2xl" onClick={saveTemplate}>
              <HiOutlineCheckCircle className="h-4 w-4" />
              Save Template
            </Button>
            <Button type="button" className="rounded-2xl bg-cyan-600 hover:bg-cyan-700" onClick={generatePdf}>
              <HiOutlineDocumentText className="h-4 w-4" />
              Generate PDF
            </Button>
          </>
        )}
      />

      <Card className="no-print p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div>
            <label className="text-xs font-semibold text-slate-600">Date Filter</label>
            <Select className="mt-1.5" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>
              {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Start Date</label>
            <Input
              className="mt-1.5"
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">End Date</label>
            <Input
              className="mt-1.5"
              type="date"
              disabled={filters.range !== 'custom'}
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
          <Button type="button" variant="subtle" className="h-10 rounded-2xl" onClick={() => window.print()}>
            <HiOutlinePrinter className="h-4 w-4" />
            Print Template
          </Button>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          PDF is generated from the selected report template and filtered data. It does not use a screen capture.
        </p>
      </Card>

      <Card className="no-print overflow-hidden rounded-[1.6rem] border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Template Settings</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Advanced transport report templates</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Client can select one default template. Printing uses the selected design, not a screenshot of the screen.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {transportReportTemplates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTemplate(item.id)}
                className={cn(
                  'min-w-0 rounded-2xl border p-4 text-left transition',
                  selectedTemplate === item.id
                    ? 'border-cyan-300 bg-white shadow-sm ring-2 ring-cyan-100'
                    : 'border-slate-200 bg-white/70 hover:border-cyan-200 hover:bg-white',
                )}
              >
                <span className="inline-flex rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">{item.label}</span>
                <p className="mt-3 text-sm font-black text-slate-950">{item.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="no-print grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={HiOutlineTruck} label="Total Fleet" value={report.totalVehicles} helper={`${report.availableVehicles} available now`} tone="sky" />
        <MetricCard icon={HiOutlineKey} label="Active Rentals" value={report.activeBookings} helper={`${report.reservedBookings} reserved`} tone="amber" />
        <MetricCard icon={HiOutlineBanknotes} label="Net Revenue" value={formatTransportCurrency(report.totalRevenue)} helper={`${formatTransportCurrency(report.totalRefunds)} refunded`} tone="emerald" />
        <MetricCard icon={HiOutlineUserGroup} label="Customers" value={report.totalCustomers} helper={`${report.dueCustomers} with dues`} tone="violet" />
      </div>

      <section className="no-print">
        <TransportTemplatePreview template={template} report={report} settings={settings} dateRangeLabel={dateRangeLabel} />
      </section>

      <section className="print-only">
        <TransportPrintableTemplate template={template} report={report} settings={settings} dateRangeLabel={dateRangeLabel} />
      </section>
    </motion.div>
  )
}

function buildTransportPdfReport({ template, report, settings = {}, dateRangeLabel = 'This month', workspaceId = '' } = {}) {
  const reportId = buildReportId(settings.reportPrefix || 'TRP')
  const companyName = settings.businessName || settings.transportRental?.companyName || 'Nexora Transport'
  const generatedAt = new Date().toLocaleString()
  const common = {
    reportId,
    title: `${template.name} Report`,
    workspaceId,
    workspaceName: companyName,
    businessType: 'Transport / Rental',
    dateRange: dateRangeLabel,
    generatedBy: settings.ownerName || companyName,
    generatedAt,
    branding: {
      companyName,
      businessName: companyName,
      logo: settings.logoUrl || NEXORA_LOGO,
      logoUrl: settings.logoUrl || '',
      receiptFooter: settings.transportRental?.reportFooter || 'NEXORA SOLUTION - All rights reserved 2019-2026.',
    },
    qrPayload: {
      reportId,
      businessType: 'Transport / Rental',
      template: template.id,
      dateRange: dateRangeLabel,
      generatedAt,
      totalRevenue: report.totalRevenue,
      grossCollected: report.grossCollected,
      totalRefunds: report.totalRefunds,
      outstandingDues: report.outstandingDues,
    },
  }

  if (template.id === 'rental-ledger') {
    return {
      ...common,
      summary: [
        { label: 'Total bookings', value: report.totalBookings },
        { label: 'Active bookings', value: report.activeBookings },
        { label: 'Returned bookings', value: report.returnedBookings },
        { label: 'Cancelled bookings', value: report.cancelledBookings },
        { label: 'Paid amount', value: formatTransportCurrency(report.paidAmount) },
        { label: 'Outstanding dues', value: formatTransportCurrency(report.outstandingDues) },
        { label: 'Refunded', value: formatTransportCurrency(report.totalRefunds) },
      ],
      tables: [
        {
          title: 'Booking Ledger',
          columns: [
            { label: 'Booking', value: (row) => row.bookingNumber },
            { label: 'Customer', value: (row) => row.customer },
            { label: 'Vehicle', value: (row) => row.vehicleName },
            { label: 'Pickup', value: (row) => row.pickupDate },
            { label: 'Return', value: (row) => row.returnDate },
            { label: 'Status', value: (row) => row.status },
            { label: 'Total', value: (row) => formatTransportCurrency(row.total) },
            { label: 'Due', value: (row) => formatTransportCurrency(row.dueAmount) },
            { label: 'Refund', value: (row) => row.refundAmount > 0 ? formatTransportCurrency(row.refundAmount) : '-' },
          ],
          rows: report.bookingRows,
        },
        {
          title: 'Cancelled & Refunded Bookings',
          columns: [
            { label: 'Booking', value: (row) => row.bookingNumber },
            { label: 'Customer', value: (row) => row.customer },
            { label: 'Vehicle', value: (row) => row.vehicleName },
            { label: 'Paid', value: (row) => formatTransportCurrency(row.advancePaid) },
            { label: 'Fine', value: (row) => row.cancellationFine > 0 ? formatTransportCurrency(row.cancellationFine) : '-' },
            { label: 'Refunded', value: (row) => row.refundAmount > 0 ? formatTransportCurrency(row.refundAmount) : '-' },
            { label: 'Reason', value: (row) => row.cancelReason || '-' },
          ],
          rows: report.cancelledRows,
        },
        {
          title: 'Customer Balance',
          columns: [
            { label: 'Customer', value: (row) => row.name },
            { label: 'Phone', value: (row) => row.phone },
            { label: 'Bookings', value: (row) => row.bookings },
            { label: 'Paid', value: (row) => formatTransportCurrency(row.paid) },
            { label: 'Due', value: (row) => formatTransportCurrency(row.due) },
          ],
          rows: report.customerRows,
        },
      ],
    }
  }

  if (template.id === 'financial-closing') {
    return {
      ...common,
      summary: [
        { label: 'Net collected', value: formatTransportCurrency(report.totalRevenue) },
        { label: 'Gross active collected', value: formatTransportCurrency(report.grossCollected) },
        { label: 'Refunded amount', value: formatTransportCurrency(report.totalRefunds) },
        { label: 'Cancellation fines', value: formatTransportCurrency(report.cancellationFines) },
        { label: 'Active booking value', value: formatTransportCurrency(report.bookingRevenue) },
        { label: 'Cancelled booking value', value: formatTransportCurrency(report.cancelledBookingValue) },
        { label: 'Paid amount', value: formatTransportCurrency(report.paidAmount) },
        { label: 'Outstanding dues', value: formatTransportCurrency(report.outstandingDues) },
        { label: 'Security deposits', value: formatTransportCurrency(report.securityDeposits) },
        { label: 'Driver charges', value: formatTransportCurrency(report.driverCharges) },
      ],
      tables: [
        {
          title: 'Payment Methods',
          columns: [
            { label: 'Method', value: (row) => row.method },
            { label: 'Count', value: (row) => row.count },
            { label: 'Amount', value: (row) => formatTransportCurrency(row.amount) },
          ],
          rows: report.methodRows,
        },
        {
          title: 'Refund Ledger',
          columns: [
            { label: 'Payment', value: (row) => row.id },
            { label: 'Booking', value: (row) => row.bookingNumber },
            { label: 'Customer', value: (row) => row.customer },
            { label: 'Method', value: (row) => row.method },
            { label: 'Refund', value: (row) => formatTransportCurrency(row.amount) },
            { label: 'Date', value: (row) => row.date },
          ],
          rows: report.refundRows,
        },
        {
          title: 'Payment Ledger',
          columns: [
            { label: 'Payment', value: (row) => row.id },
            { label: 'Booking', value: (row) => row.bookingNumber },
            { label: 'Customer', value: (row) => row.customer },
            { label: 'Method', value: (row) => row.method },
            { label: 'Type', value: (row) => row.type },
            { label: 'Amount', value: (row) => isTransportRefundPayment(row) ? formatTransportSignedCurrency(-row.amount) : formatTransportCurrency(row.amount) },
            { label: 'Date', value: (row) => row.date },
          ],
          rows: report.paymentRows,
        },
      ],
    }
  }

  return {
    ...common,
    summary: [
      { label: 'Total fleet', value: report.totalVehicles },
      { label: 'Available vehicles', value: report.availableVehicles },
      { label: 'Rented vehicles', value: report.rentedVehicles },
      { label: 'Maintenance vehicles', value: report.maintenanceVehicles },
      { label: 'Active/reserved', value: report.activeBookings + report.reservedBookings },
      { label: 'Utilization', value: `${report.utilization}%` },
      { label: 'Revenue', value: formatTransportCurrency(report.totalRevenue) },
      { label: 'Outstanding dues', value: formatTransportCurrency(report.outstandingDues) },
    ],
    tables: [
      {
        title: 'Fleet Performance',
        columns: [
          { label: 'Vehicle', value: (row) => `${row.name} (${row.registration})` },
          { label: 'Category', value: (row) => row.category },
          { label: 'Status', value: (row) => row.status },
          { label: 'Bookings', value: (row) => row.bookings },
          { label: 'Revenue', value: (row) => formatTransportCurrency(row.revenue) },
          { label: 'Due', value: (row) => formatTransportCurrency(row.due) },
        ],
        rows: report.vehicleRows,
      },
    ],
  }
}

function TransportTemplatePreview({ template, report, settings, dateRangeLabel }) {
  return (
    <Card className="overflow-hidden rounded-[1.6rem] p-0">
      <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Selected Template</p>
        <h2 className="mt-1 text-xl font-black">{template.name}</h2>
      </div>
      <div className="p-5">
        <TransportPrintableTemplate template={template} report={report} settings={settings} dateRangeLabel={dateRangeLabel} preview />
      </div>
    </Card>
  )
}

function TransportPrintableTemplate({ template, report, settings, dateRangeLabel, preview = false }) {
  const companyName = settings.businessName || settings.transportRental?.companyName || 'Nexora Transport'
  const generatedAt = new Date().toLocaleString()
  return (
    <div className={cn('mx-auto bg-white text-slate-950', preview ? 'max-w-5xl rounded-2xl border border-slate-200 p-5 shadow-sm' : 'print-report-page p-8')}>
      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-950 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Transport / Rental</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">{companyName}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">{settings.address || 'Fleet, bookings, payments, and customer dues report'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black">{template.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Range: {dateRangeLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{generatedAt}</p>
          <p className="mt-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">Powered by Nexora</p>
        </div>
      </div>

      {template.id === 'fleet-summary' ? <TransportFleetTemplate report={report} /> : null}
      {template.id === 'rental-ledger' ? <TransportLedgerTemplate report={report} /> : null}
      {template.id === 'financial-closing' ? <TransportFinancialTemplate report={report} /> : null}

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] font-semibold text-slate-500">
        <span>{settings.transportRental?.reportFooter || 'NEXORA SOLUTION'}</span>
        <span>ALL RIGHTS RESERVED 2019-2026</span>
      </div>
    </div>
  )
}

function TransportFleetTemplate({ report }) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ReportMiniStat label="Fleet" value={report.totalVehicles} />
        <ReportMiniStat label="Available" value={report.availableVehicles} />
        <ReportMiniStat label="Active/Reserved" value={report.activeBookings + report.reservedBookings} />
        <ReportMiniStat label="Utilization" value={`${report.utilization}%`} />
      </div>
      <ReportTable
        title="Top Vehicles"
        rows={report.vehicleRows.slice(0, 8)}
        columns={[
          ['Vehicle', (row) => `${row.name} (${row.registration})`],
          ['Status', (row) => row.status],
          ['Bookings', (row) => row.bookings],
          ['Revenue', (row) => formatTransportCurrency(row.revenue)],
          ['Due', (row) => formatTransportCurrency(row.due)],
        ]}
      />
    </div>
  )
}

function TransportLedgerTemplate({ report }) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ReportMiniStat label="Bookings" value={report.totalBookings} />
        <ReportMiniStat label="Active" value={report.activeBookings} />
        <ReportMiniStat label="Returned" value={report.returnedBookings} />
        <ReportMiniStat label="Cancelled" value={report.cancelledBookings} />
      </div>
      <ReportTable
        title="Booking Ledger"
        rows={report.bookingRows}
        columns={[
          ['Booking', (row) => row.bookingNumber],
          ['Customer', (row) => row.customer],
          ['Vehicle', (row) => row.vehicleName],
          ['Status', (row) => row.status],
          ['Total', (row) => formatTransportCurrency(row.total)],
          ['Due', (row) => formatTransportCurrency(row.dueAmount)],
          ['Refund', (row) => row.refundAmount > 0 ? formatTransportCurrency(row.refundAmount) : '-'],
        ]}
      />
      <ReportTable
        title="Cancelled / Refunded Bookings"
        rows={report.cancelledRows}
        columns={[
          ['Booking', (row) => row.bookingNumber],
          ['Customer', (row) => row.customer],
          ['Paid', (row) => formatTransportCurrency(row.advancePaid)],
          ['Fine', (row) => row.cancellationFine > 0 ? formatTransportCurrency(row.cancellationFine) : '-'],
          ['Refunded', (row) => row.refundAmount > 0 ? formatTransportCurrency(row.refundAmount) : '-'],
          ['Reason', (row) => row.cancelReason || '-'],
        ]}
      />
      <ReportTable
        title="Customers With Balance"
        rows={report.customerRows.slice(0, 8)}
        columns={[
          ['Customer', (row) => row.name],
          ['Phone', (row) => row.phone],
          ['Bookings', (row) => row.bookings],
          ['Paid', (row) => formatTransportCurrency(row.paid)],
          ['Due', (row) => formatTransportCurrency(row.due)],
        ]}
      />
    </div>
  )
}

function TransportFinancialTemplate({ report }) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <ReportMiniStat label="Net Collected" value={formatTransportCurrency(report.totalRevenue)} />
        <ReportMiniStat label="Gross Active" value={formatTransportCurrency(report.grossCollected)} />
        <ReportMiniStat label="Refunded" value={formatTransportCurrency(report.totalRefunds)} />
        <ReportMiniStat label="Outstanding" value={formatTransportCurrency(report.outstandingDues)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ReportTable
          title="Payment Methods"
          rows={report.methodRows}
          columns={[
            ['Method', (row) => row.method],
            ['Count', (row) => row.count],
            ['Amount', (row) => formatTransportCurrency(row.amount)],
          ]}
        />
        <ReportTable
          title="Refund Ledger"
          rows={report.refundRows}
          columns={[
            ['Payment', (row) => row.id],
            ['Booking', (row) => row.bookingNumber],
            ['Customer', (row) => row.customer],
            ['Method', (row) => row.method],
            ['Refund', (row) => formatTransportCurrency(row.amount)],
          ]}
        />
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Closing Summary</p>
          <div className="mt-4 space-y-2 text-sm">
            <SummaryRow label="Gross active collected" value={formatTransportCurrency(report.grossCollected)} />
            <SummaryRow label="Refunded amount" value={formatTransportCurrency(report.totalRefunds)} />
            <SummaryRow label="Cancellation fines" value={formatTransportCurrency(report.cancellationFines)} />
            <SummaryRow label="Paid amount" value={formatTransportCurrency(report.paidAmount)} />
            <SummaryRow label="Due amount" value={formatTransportCurrency(report.outstandingDues)} />
            <SummaryRow label="Driver charges" value={formatTransportCurrency(report.driverCharges)} />
            <SummaryRow label="Net collected" value={formatTransportCurrency(report.totalRevenue)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportMiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

function ReportTable({ title, rows = [], columns = [] }) {
  const responsiveColumns = columns.map(([label, render], index) => ({
    key: `${label}-${index}`,
    header: label,
    cell: (row) => render(row),
  }))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">{title}</p>
      </div>
      {rows.length ? (
        <Table columns={responsiveColumns} rows={rows} className="rounded-none border-0 bg-white text-xs" />
      ) : (
        <div className="px-3 py-4 text-center text-xs font-semibold text-slate-400">No data yet</div>
      )}
    </div>
  )
}

// Route by business type: WhatsApp CRM gets dedicated WhatsApp-only reports;
// Sales Hub gets enterprise Sales Hub reports; every other business type keeps
// the existing generic workspace reports.
export default function ReportsPage() {
  const { businessType } = useUser()
  const normalized = normalizeBusinessType(businessType)
  if (normalized === 'WhatsApp CRM') {
    return <WhatsappReports />
  }
  if (normalized === 'General CRM') {
    return <SalesHubReports />
  }
  if (normalized === 'Retail / POS') {
    return <RetailPOSReports />
  }
  if (normalized === 'Restaurant POS') {
    return <RestaurantReports />
  }
  if (normalized === 'Property ERP') {
    return <PropertyReports />
  }
  if (normalized === 'School ERP') {
    return <Navigate to="/app/school-reports" replace />
  }
  if (normalized === 'Transport / Rental') {
    return <TransportReports />
  }
  return <GenericReports />
}
