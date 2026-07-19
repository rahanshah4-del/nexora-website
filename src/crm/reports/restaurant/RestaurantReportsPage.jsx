import { useCallback, useMemo, useState } from 'react'
import {
  HiOutlinePresentationChartBar,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
  HiOutlineShoppingBag,
  HiOutlineReceiptPercent,
  HiOutlineTag,
  HiOutlineClipboardDocumentList,
  HiOutlineComputerDesktop,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlineChartBarSquare,
  HiOutlineCalculator,
  HiOutlineArrowUturnLeft,
  HiOutlineShieldCheck,
  HiOutlineFire,
  HiOutlineSparkles,
  HiOutlineSquaresPlus,
  HiOutlineRectangleStack,
} from 'react-icons/hi2'
import { buildRestaurantReportModel } from './restaurantReportCalculations.js'
import {
  RESTAURANT_REPORT_DEFINITIONS,
  RESTAURANT_REPORT_GROUPS,
  restaurantReportById,
} from './restaurantReportDefinitions.js'
import ReportShell from '../core/ReportShell.jsx'
import ReportFilters from '../core/ReportFilters.jsx'
import ReportKpiGrid from '../core/ReportKpiGrid.jsx'
import ReportDataTable from '../core/ReportDataTable.jsx'
import ReportChartCard from '../core/ReportChartCard.jsx'
import { normalizeRestaurantReportOrders } from './restaurantReportNormalizer.js'
import { restaurantBusinessDateKey, restaurantBusinessDayBounds } from '../../lib/restaurantBusinessDay.js'
import {
  printRestaurantA4Report,
  printRestaurantThermalClosing,
  printRestaurantThermal80mmClosing,
  exportRestaurantCsv,
  exportRestaurantExcel,
  exportRestaurantPdf,
} from './restaurantReportPrint.js'

const RESTAURANT_REPORT_ICONS = {
  'executive-summary': HiOutlinePresentationChartBar,
  'daily-closing': HiOutlineCalendarDays,
  'business-intelligence': HiOutlineSparkles,
  'orders': HiOutlineClipboardDocumentList,
  'item-sales': HiOutlineShoppingBag,
  'category-sales': HiOutlineSquaresPlus,
  'order-type-performance': HiOutlineFire,
  'hourly-sales': HiOutlineClock,
  'payment-collection': HiOutlineBanknotes,
  'due-partial-payments': HiOutlineArrowPath,
  'tax-service-charges': HiOutlineReceiptPercent,
  'discounts': HiOutlineTag,
  'table-performance': HiOutlineRectangleStack,
  'kot-performance': HiOutlineComputerDesktop,
  'cancellations': HiOutlineXCircle,
  'customer-sales': HiOutlineUserGroup,
  'cost-profit': HiOutlineCurrencyDollar,
  'expenses': HiOutlineDocumentText,
  'cash-drawer-reconciliation': HiOutlineCalculator,
  'shift-settlement-report': HiOutlineChartBarSquare,
  'refund-report': HiOutlineArrowUturnLeft,
  'staff-cashier-performance': HiOutlineShieldCheck,
}

const defaultFilters = {
  datePreset: 'today',
  startDate: '',
  endDate: '',
  orderType: 'All',
  paymentMethod: 'All',
  paymentStatus: 'All',
  orderStatus: 'All',
  source: 'All',
  table: 'All',
  customerSearch: '',
}

const moneyKeys = new Set([
  'grossSales',
  'discounts',
  'netSales',
  'totalSales',
  'collectedAmount',
  'outstandingAmount',
  'tax',
  'serviceCharges',
  'costOfGoodsSold',
  'grossProfit',
  'approvedExpenses',
  'netProfit',
  'cashReceived',
  'onlineReceived',
  'openingCash',
  'periodOrderOutstanding',
  'storedCustomerCreditBalance',
  'expectedCash',
  'cashDifference',
  'cashSales',
  'cashRefunds',
  'cashDeposits',
  'cashWithdrawals',
  'cashExpenses',
  'cashAdjustments',
  'averageSale',
  'largestSale',
  'largestRefund',
])

function validDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function selectedDateRange(filters, settings) {
  const now = new Date()
  const preset = filters.datePreset
  if (preset === 'today') return { ...restaurantBusinessDayBounds(settings, now), error: '' }
  if (preset === 'yesterday') {
    const today = restaurantBusinessDayBounds(settings, now)
    return { ...restaurantBusinessDayBounds(settings, addDays(today.start, -1)), error: '' }
  }
  if (preset === 'thisWeek' || preset === 'this_week') {
    const start = startOfDay(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return { start, end: endOfDay(now), error: '' }
  }
  if (preset === 'lastWeek' || preset === 'last_week') {
    const end = startOfDay(now)
    const day = end.getDay() || 7
    end.setDate(end.getDate() - day)
    const start = addDays(end, -6)
    return { start: startOfDay(start), end: endOfDay(end), error: '' }
  }
  if (preset === 'thisMonth' || preset === 'this_month') {
    return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now), error: '' }
  }
  if (preset === 'lastMonth' || preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: startOfDay(start), end: endOfDay(end), error: '' }
  }
  if (preset === 'custom') {
    const start = validDate(filters.startDate)
    const end = validDate(filters.endDate)
    if (!start || !end) return { start: null, end: null, error: 'Select a valid start and end date.' }
    if (start > end) return { start, end, error: 'Start date must be before or equal to end date.' }
    return { start: startOfDay(start), end: endOfDay(end), error: '' }
  }
  return { ...restaurantBusinessDayBounds(settings, now), error: '' }
}

function rangeLabel(range) {
  if (!range.start || !range.end) return 'No valid date range selected'
  return `${range.start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - ${range.end.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
}

function formatMoney(value, currency = 'PKR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable'
  return `${currency} ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable'
  return Number(value).toLocaleString('en-PK')
}

function objectBars(source = {}, currency = '') {
  return Object.entries(source)
    .filter(([, value]) => Number(value) !== 0)
    .map(([label, value]) => ({
      id: label,
      label,
      value,
      displayValue: currency ? formatMoney(value, currency) : formatNumber(value),
    }))
}

function hourLabel(hour) {
  const value = Number(hour)
  if (!Number.isFinite(value)) return 'Unknown'
  return `${String(value).padStart(2, '0')}:00`
}

function sortByHour(rows) {
  return Object.entries(rows || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, count]) => ({ id: hour, hour: hourLabel(hour), count }))
}

function orderDateKey(order, settings) {
  if (!order.createdAt) return ''
  return restaurantBusinessDateKey(order.createdAt, settings)
}

function filterOrdersForPage(orders, filters, range, settings) {
  if (range.error) return []
  const normalized = normalizeRestaurantReportOrders(orders, { settings })
  const startKey = range.start ? restaurantBusinessDateKey(range.start, settings) : ''
  const endKey = range.end ? restaurantBusinessDateKey(range.end, settings) : ''
  const query = String(filters.customerSearch || '').trim().toLowerCase()
  return normalized.filter((order) => {
    const key = orderDateKey(order, settings)
    if (startKey && (!key || key < startKey)) return false
    if (endKey && (!key || key > endKey)) return false
    if (filters.orderType !== 'All' && order.orderType !== filters.orderType) return false
    if (filters.paymentMethod !== 'All' && order.paymentMethod !== filters.paymentMethod) return false
    if (filters.paymentStatus !== 'All' && order.paymentStatus !== filters.paymentStatus) return false
    if (filters.orderStatus !== 'All' && order.orderStatus !== filters.orderStatus) return false
    if (filters.source !== 'All' && order.sourceKind !== filters.source) return false
    if (filters.table !== 'All' && order.table !== filters.table) return false
    if (query && !`${order.customerName} ${order.orderNumber} ${order.billNumber}`.toLowerCase().includes(query)) return false
    return true
  })
}

function uniqueValues(rows, key, fallback = ['All']) {
  return ['All', ...Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort()].filter((value, index, all) => all.indexOf(value) === index)
}

function kpi(key, label, value, helper = '') {
  return { key, label, value, type: moneyKeys.has(key) ? 'currency' : 'number', helper }
}

function unavailableKpi(key, label, helper) {
  return { key, label, value: null, type: 'currency', helper, unavailable: true }
}

function SectionCard({ title, children, note = '' }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 min-w-0">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {note ? <p className="mt-1 text-sm leading-5 text-slate-500">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

const orderColumns = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'createdAt', label: 'Date/Time', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Unavailable' },
  { key: 'sourceKind', label: 'Source' },
  { key: 'customerName', label: 'Customer' },
  { key: 'orderType', label: 'Type' },
  { key: 'table', label: 'Table', render: (row) => row.table || '-' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'paymentStatus', label: 'Payment' },
  { key: 'orderStatus', label: 'Order Status' },
  { key: 'total', label: 'Total', numeric: true, render: (row) => formatMoney(row.total, row.currency || 'PKR') },
  { key: 'paidAmount', label: 'Paid', numeric: true, render: (row) => formatMoney(row.paidAmount, row.currency || 'PKR') },
  { key: 'dueAmount', label: 'Due', numeric: true, render: (row) => formatMoney(row.dueAmount, row.currency || 'PKR') },
]

export default function RestaurantReportsPage({
  orders = [],
  customers = [],
  expenses = [],
  openingCash = 0,
  currency = 'PKR',
  restaurantName = 'Restaurant',
  workspaceLabel = 'Workspace',
  loading = false,
  error = '',
  sourceLimitations = '',
  settings = {},
  cashSessions = [],
  refunds = [],
  menuItems = [],
}) {
  const [activeReportId, setActiveReportId] = useState('executive-summary')
  const [filters, setFilters] = useState(defaultFilters)
  const [actionStatus, setActionStatus] = useState(null)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfSignatures, setPdfSignatures] = useState({})
  const [pdfWatermark, setPdfWatermark] = useState('')
  const [pdfSubmitting, setPdfSubmitting] = useState(false) // { type: 'loading' | 'success' | 'error', message: '' }
  const activeReport = restaurantReportById(activeReportId)
  const range = useMemo(() => selectedDateRange(filters, settings), [filters, settings])
  const allNormalizedOrders = useMemo(() => normalizeRestaurantReportOrders(orders, { settings }), [orders, settings])
  const filteredOrders = useMemo(() => filterOrdersForPage(orders, filters, range, settings), [orders, filters, range, settings])
  const model = useMemo(
    () => buildRestaurantReportModel({ orders: filteredOrders, customers, expenses, openingCash, settings, cashSessions, refunds, menuItems }),
    [customers, expenses, filteredOrders, openingCash, settings, cashSessions, refunds, menuItems],
  )
  const hasSourceData = allNormalizedOrders.length > 0
  const hasFilteredData = model.orders.length > 0
  const filterOptions = useMemo(() => ({
    orderType: uniqueValues(allNormalizedOrders, 'orderType'),
    paymentMethod: uniqueValues(allNormalizedOrders, 'paymentMethod'),
    paymentStatus: ['All', 'paid', 'partial', 'due'],
    orderStatus: ['All', 'pending', 'preparing', 'ready', 'served', 'cancelled'],
    source: ['All', 'restaurant', 'invoice'],
    table: uniqueValues(allNormalizedOrders, 'table'),
  }), [allNormalizedOrders])
  const rangeLabelText = useMemo(() => rangeLabel(range), [range])

  function buildPrintOpts() {
    return {
      report: {},
      model,
      activeReport,
      filters,
      dateRangeLabel: rangeLabelText,
      restaurantName,
      workspaceLabel,
      currency,
      generatedAt: new Date().toLocaleString(),
      limitationMessage: activeReport.limitationMessage || '',
      settings,
    }
  }

  const isBlocked = activeReport.capability === 'blocked'
  const isDailyClosing = activeReport.id === 'daily-closing' || activeReport.id === 'cash-drawer-reconciliation'
  const isExecutiveSummary = activeReport.id === 'executive-summary'

  const handleQuickDailyClosing = useCallback(() => {
    setActiveReportId('daily-closing')
  }, [])

  const handlePrint = useCallback(() => {
    const opts = buildPrintOpts()
    const result = printRestaurantA4Report(opts)
    if (!result.ok) setActionStatus({ type: 'error', message: result.error || 'Print failed.' })
    else setActionStatus({ type: 'success', message: 'A4 print opened.' })
    setTimeout(() => setActionStatus(null), 4000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency])

  const handleCsv = useCallback(() => {
    const opts = buildPrintOpts()
    const result = exportRestaurantCsv(opts)
    if (!result.ok) setActionStatus({ type: 'error', message: result.error || 'CSV export failed.' })
    else setActionStatus({ type: 'success', message: 'CSV downloaded.' })
    setTimeout(() => setActionStatus(null), 4000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency])

  const handleExcel = useCallback(() => {
    const opts = buildPrintOpts()
    const result = exportRestaurantExcel(opts)
    if (!result.ok) setActionStatus({ type: 'error', message: result.error || 'Excel export failed.' })
    else setActionStatus({ type: 'success', message: 'Excel downloaded.' })
    setTimeout(() => setActionStatus(null), 4000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency])

  const handleThermal = useCallback(() => {
    const opts = buildPrintOpts()
    setActionStatus({ type: 'loading', message: 'Sending to 58mm printer...' })
    printRestaurantThermalClosing(opts).then((result) => {
      if (result.ok && !result.fallback) setActionStatus({ type: 'success', message: '58mm closing printed.' })
      else if (result.ok && result.fallback) setActionStatus({ type: 'success', message: result.message || '58mm preview opened.' })
      else setActionStatus({ type: 'error', message: result.error || '58mm print failed.' })
    }).catch(() => {
      setActionStatus({ type: 'error', message: '58mm print encountered an unexpected error.' })
    })
    setTimeout(() => setActionStatus(null), 6000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency])

  const handleThermal80mm = useCallback(() => {
    const opts = buildPrintOpts()
    setActionStatus({ type: 'loading', message: 'Sending to 80mm printer...' })
    printRestaurantThermal80mmClosing(opts).then((result) => {
      if (result.ok && !result.fallback) setActionStatus({ type: 'success', message: '80mm closing printed.' })
      else if (result.ok && result.fallback) setActionStatus({ type: 'success', message: result.message || '80mm preview opened.' })
      else setActionStatus({ type: 'error', message: result.error || '80mm print failed.' })
    }).catch(() => {
      setActionStatus({ type: 'error', message: '80mm print encountered an unexpected error.' })
    })
    setTimeout(() => setActionStatus(null), 6000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency])

  const handlePdfOpen = useCallback(() => {
    setPdfDialogOpen(true)
    setPdfSignatures({})
    setPdfWatermark('')
    setPdfSubmitting(false)
  }, [])

  const handlePdfExport = useCallback(async () => {
    setPdfSubmitting(true)
    setActionStatus({ type: 'loading', message: 'Generating PDF...' })
    try {
      const opts = {
        ...buildPrintOpts(),
        signatures: pdfSignatures,
        watermark: pdfWatermark,
      }
      const result = await exportRestaurantPdf(opts)
      if (result.ok) {
        setPdfDialogOpen(false)
        setActionStatus({ type: 'success', message: 'PDF downloaded.' })
      } else {
        setActionStatus({ type: 'error', message: result.error || 'PDF export failed.' })
      }
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.message || 'PDF export failed.' })
    } finally {
      setPdfSubmitting(false)
    }
    setTimeout(() => setActionStatus(null), 4000)
  }, [model, activeReport, filters, rangeLabelText, restaurantName, workspaceLabel, currency, pdfSignatures, pdfWatermark])

  const actions = [
    !isBlocked ? ['Print A4', handlePrint] : null,
    !isBlocked ? ['PDF', handlePdfOpen] : null,
    !isBlocked ? ['CSV', handleCsv] : null,
    !isBlocked ? ['Excel', handleExcel] : null,
    isDailyClosing ? ['58mm Thermal', handleThermal] : null,
    isDailyClosing ? ['80mm Thermal', handleThermal80mm] : null,
  ].filter(Boolean)

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function resetFilters() {
    setFilters(defaultFilters)
  }

  function reportActions() {
    if (!actions.length && !isExecutiveSummary) return null
    const isLoading = actionStatus?.type === 'loading'
    return (
      <div className="flex flex-wrap items-center gap-2">
        {isExecutiveSummary && !isBlocked ? (
          <button
            type="button"
            onClick={handleQuickDailyClosing}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-300"
          >
            Daily Closing
          </button>
        ) : null}
        {actions.map(([label, action]) => (
          <button
            key={label}
            type="button"
            onClick={action}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {label}
          </button>
        ))}
        {actionStatus ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              actionStatus.type === 'loading' ? 'bg-sky-50 text-sky-700' :
              actionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
              'bg-rose-50 text-rose-700'
            }`}
          >
            {actionStatus.message}
          </span>
        ) : null}
      </div>
    )
  }

  function baseKpis() {
    return [
      kpi('grossSales', 'Gross Sales', model.grossSales),
      kpi('discounts', 'Discounts', model.discounts),
      kpi('netSales', 'Net Sales', model.netSales),
      kpi('collectedAmount', 'Collected Amount', model.collectedAmount),
      kpi('outstandingAmount', 'Outstanding Amount', model.outstandingAmount),
      kpi('billedOrders', 'Billed Orders', model.billedOrders.length),
      kpi('averageOrderValue', 'Average Order Value', model.averageOrderValue),
      kpi('costOfGoodsSold', 'COGS', model.costOfGoodsSold),
      kpi('grossProfit', 'Gross Profit', model.grossProfit),
      kpi('approvedExpenses', 'Approved Expenses', model.approvedExpenses),
      kpi('netProfit', 'Net Profit', model.netProfit),
    ]
  }

  function renderBlocked() {
    return (
      <SectionCard title={activeReport.title} note={activeReport.limitationMessage}>
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm font-semibold text-rose-700">
          {activeReport.limitationMessage}
        </div>
      </SectionCard>
    )
  }

  function renderExecutive() {
    const bi = model.businessIntelligence
    const health = bi?.health
    const forecast = bi?.forecast
    const alerts = bi?.alerts || []
    const executive = bi?.executive
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
    const warningAlerts = alerts.filter((a) => a.severity === 'warning')

    const healthTone = health?.level === 'Excellent' ? 'border-emerald-300 bg-emerald-50' : health?.level === 'Good' ? 'border-sky-300 bg-sky-50' : health?.level === 'Warning' ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50'
    const healthText = health?.level === 'Excellent' ? 'text-emerald-800' : health?.level === 'Good' ? 'text-sky-800' : health?.level === 'Warning' ? 'text-amber-800' : 'text-rose-800'

    const highlights = [
      model.bestSellingItem ? { label: 'Best Selling Item', value: model.bestSellingItem.name, sub: `${model.bestSellingItem.quantity} units` } : null,
      model.bestCategory ? { label: 'Best Category', value: model.bestCategory.category, sub: formatMoney(model.bestCategory.revenue, currency) } : null,
      model.peakSalesHour?.hour ? { label: 'Peak Sales Hour', value: model.peakSalesHour.hour, sub: `${model.peakSalesHour.orders} orders` } : null,
      model.mostUsedPaymentMethod ? { label: 'Top Payment Method', value: model.mostUsedPaymentMethod } : null,
      model.largestBill > 0 ? { label: 'Largest Bill', value: formatMoney(model.largestBill, currency) } : null,
      model.largestDiscount > 0 ? { label: 'Largest Discount', value: formatMoney(model.largestDiscount, currency) } : null,
      model.averageOrderValue > 0 ? { label: 'Average Order', value: formatMoney(model.averageOrderValue, currency) } : null,
      model.averageCustomerSpend > 0 ? { label: 'Avg Customer Spend', value: formatMoney(model.averageCustomerSpend, currency) } : null,
    ].filter(Boolean)

    return (
      <div className="space-y-4">
        {highlights.length > 0 ? (
          <SectionCard title="Today&#39;s Highlights">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((h) => (
                <div key={h.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{h.label}</p>
                  <p className="mt-1 text-base font-bold text-slate-950">{h.value}</p>
                  {h.sub ? <p className="mt-0.5 text-xs text-slate-500">{h.sub}</p> : null}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Upgraded Executive Dashboard ── */}
        {health ? (
          <SectionCard title="Executive Dashboard">
            {/* Health Score + Sub-scores */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className={`min-w-0 rounded-xl border p-4 ${healthTone}`}>
                <p className={`text-xs font-black uppercase tracking-[0.1em] ${healthText}`}>Business Health</p>
                <p className={`mt-1 text-3xl font-black ${healthText}`}>{health.score}/100</p>
                <p className={`text-sm font-bold ${healthText}`}>{health.level}</p>
                {executive?.summary ? <p className="mt-1 text-[10px] text-slate-500">{executive.summary}</p> : null}
              </div>

              {/* Growth Score */}
              {health.subScores ? (
                <div className="min-w-0 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-indigo-700">Growth Score</p>
                  <p className="mt-1 text-2xl font-black text-indigo-800">{health.subScores.growth}/100</p>
                  <p className="text-[10px] text-indigo-600">Sales + customer growth</p>
                </div>
              ) : null}

              {/* Profit Score */}
              {health.subScores ? (
                <div className="min-w-0 rounded-xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-teal-700">Profit Score</p>
                  <p className="mt-1 text-2xl font-black text-teal-800">{health.subScores.profit}/100</p>
                  <p className="text-[10px] text-teal-600">Margin + expense control</p>
                </div>
              ) : null}

              {/* Customer Score */}
              {health.subScores ? (
                <div className="min-w-0 rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-violet-700">Customer Score</p>
                  <p className="mt-1 text-2xl font-black text-violet-800">{health.subScores.customer}/100</p>
                  <p className="text-[10px] text-violet-600">Retention + satisfaction</p>
                </div>
              ) : null}

              {/* Operations Score */}
              {health.subScores ? (
                <div className="min-w-0 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-cyan-700">Operations Score</p>
                  <p className="mt-1 text-2xl font-black text-cyan-800">{health.subScores.operations}/100</p>
                  <p className="text-[10px] text-cyan-600">Cash + payment efficiency</p>
                </div>
              ) : null}

              {/* Risk Score */}
              {health.subScores ? (
                <div className={`min-w-0 rounded-xl border p-4 ${executive?.riskLevel === 'High' ? 'border-rose-200 bg-rose-50' : executive?.riskLevel === 'Medium' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.1em] ${executive?.riskLevel === 'High' ? 'text-rose-700' : executive?.riskLevel === 'Medium' ? 'text-amber-700' : 'text-emerald-700'}`}>Risk Score</p>
                  <p className={`mt-1 text-2xl font-black ${executive?.riskLevel === 'High' ? 'text-rose-800' : executive?.riskLevel === 'Medium' ? 'text-amber-800' : 'text-emerald-800'}`}>{health.subScores.risk}/100</p>
                  <p className="text-[10px] text-slate-500">{criticalAlerts.length} critical &middot; {warningAlerts.length} warnings</p>
                </div>
              ) : null}
            </div>

            {/* ── Trend Cards ── */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Sales Trend</p>
                <p className={`mt-0.5 text-sm font-bold ${bi?.trends?.salesTrendLabel === 'increasing' ? 'text-emerald-600' : bi?.trends?.salesTrendLabel === 'decreasing' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {bi?.trends?.salesTrendArrow || ''} {bi?.trends?.salesTrendLabel || 'N/A'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Sales Momentum</p>
                <p className={`mt-0.5 text-sm font-bold ${bi?.trends?.salesMomentumLabel === 'strong' ? 'text-emerald-600' : bi?.trends?.salesMomentumLabel === 'moderate' ? 'text-amber-600' : 'text-slate-600'}`}>
                  {bi?.trends?.salesMomentum || 0}/100
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Revenue Velocity</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{bi?.trends?.revenueVelocity ? formatMoney(bi.trends.revenueVelocity, currency) : 'N/A'}/day</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Customer Growth</p>
                <p className={`mt-0.5 text-sm font-bold ${bi?.trends?.customerGrowthLabel === 'high' ? 'text-emerald-600' : bi?.trends?.customerGrowthLabel === 'medium' ? 'text-amber-600' : 'text-slate-600'}`}>
                  {bi?.trends?.customerGrowthLabel || 'N/A'}
                </p>
              </div>
            </div>

            {/* ── Forecast Cards ── */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forecast?.tomorrow ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-sky-700">Tomorrow</p>
                  <p className="text-sm font-bold text-sky-900">{formatMoney(forecast.tomorrow.sales, currency)}</p>
                  <p className="text-[10px] text-sky-600">{forecast.tomorrow.orders} orders</p>
                </div>
              ) : null}
              {forecast?.nextWeek ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-700">Next 7 Days</p>
                  <p className="text-sm font-bold text-indigo-900">{formatMoney(forecast.nextWeek.expectedRevenue, currency)}</p>
                  <p className="text-[10px] text-indigo-600">{forecast.nextWeek.expectedOrders} orders</p>
                </div>
              ) : null}
              {forecast?.nextMonth ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-violet-700">Next 30 Days</p>
                  <p className="text-sm font-bold text-violet-900">{formatMoney(forecast.nextMonth.expectedRevenue, currency)}</p>
                  <p className="text-[10px] text-violet-600">{forecast.nextMonth.expectedCustomers} customers</p>
                </div>
              ) : null}
            </div>

            {/* ── Priority Alerts ── */}
            {executive?.priorityAlerts?.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Priority Alerts</p>
                <div className="space-y-1">
                  {executive.priorityAlerts.map((a, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${a.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      <span className={`grid h-4 w-4 place-items-center rounded-full text-[8px] font-black text-white ${a.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}>!</span>
                      {a.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── Recommendations ── */}
            {executive?.recommendations?.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Recommendations</p>
                <div className="grid gap-1">
                  {executive.recommendations.slice(0, 4).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-indigo-100 text-[8px] font-black text-indigo-600">{i + 1}</span>
                      <p className="text-xs text-slate-600">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        <ReportKpiGrid kpis={baseKpis()} currency={currency} />
        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChartCard title="Sales by order type" barData={objectBars(model.salesByOrderType, currency)} />
          <ReportChartCard title="Collections by payment method" barData={objectBars(model.collectionsByPaymentMethod, currency)} />
          <ReportChartCard title="Hourly sales" barData={sortByHour(model.ordersByHour).map((row) => ({ id: row.id, label: row.hour, value: row.count, displayValue: formatNumber(row.count) }))} />
          <ReportChartCard title="Top items" barData={model.itemSales.slice(0, 8).map((row) => ({ id: row.id, label: row.name, value: row.revenue, displayValue: formatMoney(row.revenue, currency) }))} />
        </div>
      </div>
    )
  }

  function renderDailyClosing() {
    const rc = model.cashReconciliation || {}
    const hasCashReconciliation = rc.actualClosingCash != null
    const hasExpenses = model.approvedExpenses > 0
    const hasCancellations = model.cancellations?.rows?.length > 0
    const hasCategories = model.categorySales?.length > 0
    const hasItems = model.itemSales?.length > 0
    const hasPayments = model.collectionsByPaymentMethod && Object.keys(model.collectionsByPaymentMethod).length > 0
    const hasOrderTypes = model.salesByOrderType && Object.keys(model.salesByOrderType).length > 0
    const hasRefunds = model.refunds?.count > 0 || model.refunds?.total > 0
    const hasSettlements = rc.cashSessions?.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked').length > 0

    // Net Sales = Gross Sales - Discounts - Refunds
    const refundTotal = model.refunds?.total || 0
    const netSalesCalc = model.grossSales - model.discounts - refundTotal
    // Final Closing Balance = Opening Cash + Net Sales + Cash Deposits - Cash Withdrawals - Expenses
    const finalClosingBalance = model.openingCash + (model.cashReceived || 0) + (rc.cashDeposits || 0) - (rc.cashWithdrawals || 0) - (rc.cashExpenses || 0) - model.approvedExpenses

    return (
      <div className="space-y-4">
        {/* ── Business Day Header ── */}
        <SectionCard title="Daily Closing Report" note={rangeLabel(range)}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Restaurant</p>
              <p className="mt-1 text-base font-bold text-slate-950">{restaurantName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Workspace</p>
              <p className="mt-1 text-base font-bold text-slate-950">{workspaceLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Report Period</p>
              <p className="mt-1 text-base font-bold text-slate-950">{rangeLabel(range)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Generated At</p>
              <p className="mt-1 text-base font-bold text-slate-950">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Orders & Sales Summary ── */}
        <SectionCard title="Orders & Sales">
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('billedOrders', 'Billed Orders', model.billedOrders?.length || 0),
              kpi('cancelledOrders', 'Cancelled Orders', model.cancellations?.count || 0),
              kpi('grossSales', 'Gross Sales', model.grossSales),
              kpi('discounts', 'Discounts', model.discounts),
              kpi('refunds', 'Refunds', refundTotal),
              kpi('netSales', 'Net Sales', netSalesCalc),
              kpi('tax', 'Tax Collected', model.tax),
              kpi('serviceCharges', 'Service Charges', model.serviceCharges),
              kpi('averageOrderValue', 'Average Order', model.averageOrderValue),
              kpi('largestBill', 'Largest Bill', model.largestBill),
            ].filter(Boolean)}
          />
        </SectionCard>

        {/* ── Order Type Summary ── */}
        {hasOrderTypes ? (
          <SectionCard title="Order Type Summary">
            <ReportChartCard title="Sales by Order Type" barData={objectBars(model.salesByOrderType, currency)} />
          </SectionCard>
        ) : null}

        {/* ── Payment Method Summary ── */}
        {hasPayments ? (
          <SectionCard title="Payment Method Summary">
            <ReportChartCard title="Collections by Payment Method" barData={objectBars(model.collectionsByPaymentMethod, currency)} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(model.collectionsByPaymentMethod || {}).map(([method, amount]) => (
                <div key={method} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{method}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{formatMoney(amount, currency)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Category-wise Sales ── */}
        {hasCategories ? (
          <SectionCard title="Category-wise Sales">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {model.categorySales.slice(0, 8).map((cat) => (
                <div key={cat.category} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{cat.category}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{formatMoney(cat.revenue, currency)}</p>
                  <p className="text-xs text-slate-500">{cat.quantity} items sold</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Product-wise Sales ── */}
        {hasItems ? (
          <SectionCard title="Product-wise Sales (Top 10)">
            <ReportDataTable
              rows={model.itemSales.slice(0, 10)}
              emptyState="No item sales for this period."
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'quantity', label: 'Qty Sold', numeric: true, render: (row) => formatNumber(row.quantity) },
                { key: 'revenue', label: 'Revenue', numeric: true, render: (row) => formatMoney(row.revenue, currency) },
                { key: 'discount', label: 'Discount', numeric: true, render: (row) => formatMoney(row.discount || 0, currency) },
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── Cancellations ── */}
        {hasCancellations ? (
          <SectionCard title={`Cancellations (${model.cancellations.count} orders)`}>
            <ReportDataTable
              rows={model.cancellations.rows}
              emptyState="No cancellations."
              columns={[
                { key: 'orderNumber', label: 'Order #' },
                { key: 'customerName', label: 'Customer' },
                { key: 'cancelReason', label: 'Cancellation Reason', render: (row) => row.cancelReason || '-' },
                { key: 'total', label: 'Total', numeric: true, render: (row) => formatMoney(row.total, currency) },
                { key: 'createdAt', label: 'Cancelled At', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── Refunds ── */}
        {hasRefunds ? (
          <SectionCard title="Refund Summary">
            <ReportKpiGrid
              currency={currency}
              kpis={[
                kpi('refundCount', 'Refund Count', model.refunds?.count || 0),
                kpi('refundTotal', 'Total Refunded', refundTotal),
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── Cash In / Cash Out & Expenses ── */}
        <SectionCard title="Cash Flow & Expenses">
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('openingCash', 'Opening Cash', model.openingCash),
              kpi('cashReceived', 'Cash In (Sales)', model.cashReceived || 0),
              kpi('onlineReceived', 'Online Received', model.onlineReceived || 0),
              kpi('cashDeposits', 'Deposits', rc.cashDeposits || 0),
              kpi('cashWithdrawals', 'Withdrawals', rc.cashWithdrawals || 0),
              kpi('approvedExpenses', 'Expenses', model.approvedExpenses),
              kpi('cashExpenses', 'Cash Expenses', rc.cashExpenses || 0),
              kpi('cashRefunds', 'Cash Refunded', rc.cashRefunds || 0),
            ].filter(Boolean)}
          />
        </SectionCard>

        {/* ── Expense Breakdown ── */}
        {hasExpenses && model.expenseSummary ? (
          <SectionCard title="Expense Breakdown">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Total Expenses</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{formatMoney(model.approvedExpenses, currency)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Expense Count</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{model.expenseSummary?.count || 0}</p>
              </div>
              {model.expenseSummary?.byCategory ? (
                Object.entries(model.expenseSummary.byCategory).slice(0, 6).map(([cat, amount]) => (
                  <div key={cat} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{cat}</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{formatMoney(amount, currency)}</p>
                  </div>
                ))
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Reservation Summary ── */}
        {model.reservations?.count > 0 || model.reservations?.total > 0 ? (
          <SectionCard title="Reservation Summary">
            <ReportKpiGrid
              currency={currency}
              kpis={[
                kpi('reservationCount', 'Reservations', model.reservations?.count || 0),
                kpi('reservationRevenue', 'Reservation Revenue', model.reservations?.total || 0),
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── Tips ── */}
        {model.tipsTotal > 0 ? (
          <SectionCard title="Tips">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Total Tips</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{formatMoney(model.tipsTotal, currency)}</p>
            </div>
          </SectionCard>
        ) : null}

        {/* ── Cash Drawer Reconciliation ── */}
        <SectionCard title="Cash Drawer Reconciliation">
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('openingCash', 'Opening Cash', model.openingCash),
              kpi('expectedCash', 'Expected Cash', rc.expectedCash || model.openingCash),
              hasCashReconciliation
                ? kpi('actualClosingCash', 'Actual Closing Cash', rc.actualClosingCash)
                : unavailableKpi('actualClosingCash', 'Actual Cash', 'Not recorded — close shifts to capture actual cash.'),
              hasCashReconciliation && rc.cashDifference != null
                ? kpi('cashDifference', 'Cash Difference', rc.cashDifference)
                : unavailableKpi('cashDifference', 'Cash Difference', 'Unavailable — settle shifts to see variance.'),
              kpi('finalClosingBalance', 'Final Closing Balance', finalClosingBalance),
              kpi('netSalesCalc', 'Net Sales', netSalesCalc),
              kpi('totalExpenses', 'Total Expenses', model.approvedExpenses),
            ].filter(Boolean)}
          />
          {hasCashReconciliation ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-amber-800">
                Variance: <span className={rc.cashDifference === 0 ? 'text-emerald-700' : rc.cashDifference > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A'}
                </span>
                {rc.actualClosingCash != null ? <span className="ml-2">· Actual: {formatMoney(rc.actualClosingCash, currency)}</span> : null}
              </p>
            </div>
          ) : null}
        </SectionCard>

        {/* ── Shift Settlements ── */}
        {hasSettlements ? (
          <SectionCard title="Shift Settlements">
            <ReportDataTable
              rows={rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked')}
              columns={[
                { key: 'cashierName', label: 'Cashier / Staff' },
                { key: 'openingCash', label: 'Opening', numeric: true, render: (row) => formatMoney(row.openingCash, currency) },
                { key: 'expectedCash', label: 'Expected', numeric: true, render: (row) => formatMoney(row.expectedCash, currency) },
                { key: 'actualClosingCash', label: 'Actual', numeric: true, render: (row) => formatMoney(row.actualClosingCash, currency) },
                { key: 'cashDifference', label: 'Difference', numeric: true, render: (row) => formatMoney(row.cashDifference, currency) },
                { key: 'totalTransactions', label: 'Txns', numeric: true, render: (row) => String(row.totalTransactions || 0) },
                { key: 'varianceStatus', label: 'Variance', render: (row) => String(row.varianceStatus || '').replace(/_/g, ' ') || '-' },
                { key: 'settlementStatus', label: 'Settlement', render: (row) => String(row.settlementStatus || row.status || '').replace(/_/g, ' ') || '-' },
                { key: 'settledBy', label: 'Settled By', render: (row) => row.settledBy || '-' },
                { key: 'approvedBy', label: 'Approved By', render: (row) => row.approvedBy || '-' },
                { key: 'differenceReason', label: 'Reason', render: (row) => row.differenceReason ? row.differenceReason.replace(/_/g, ' ') : '-' },
              ]}
              emptyState="No closed sessions in this period."
            />
          </SectionCard>
        ) : null}

        {/* ── Signature Area ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-400 mb-4">Sign-off & Approval</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="border-b-2 border-slate-300 pb-2 pt-8">
              <p className="text-xs font-bold text-slate-700">Prepared By (Cashier / Staff)</p>
              <p className="text-[10px] text-slate-400 mt-1">Name &amp; Signature</p>
            </div>
            <div className="border-b-2 border-slate-300 pb-2 pt-8">
              <p className="text-xs font-bold text-slate-700">Reviewed By (Manager / Supervisor)</p>
              <p className="text-[10px] text-slate-400 mt-1">Name &amp; Signature</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Date</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Time</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{new Date().toLocaleTimeString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Report ID</p>
              <p className="mt-1 text-sm font-bold text-slate-700 font-mono">RPT-DC-{new Date().getTime().toString(36).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderCashDrawerReconciliation() {
    const rc = model.cashReconciliation
    const varianceLabel = rc.varianceStatus ? rc.varianceStatus.replace(/_/g, ' ') : 'N/A'
    const varianceTone = !rc.cashDifference || rc.cashDifference === 0 ? 'text-slate-600' : rc.cashDifference > 0 ? 'text-emerald-700' : 'text-rose-700'
    const hasActualCash = rc.actualClosingCash !== null && rc.actualClosingCash !== undefined
    return (
      <div className="space-y-4">
        <SectionCard title="Cash Drawer Reconciliation" note={rangeLabel(range)}>
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('openingCash', 'Opening Cash', model.openingCash),
              kpi('cashReceived', 'Cash Sales', rc.cashSales),
              kpi('cashRefunds', 'Cash Refunds', rc.cashRefunds),
              kpi('cashDeposits', 'Cash Deposits', rc.cashDeposits),
              kpi('cashWithdrawals', 'Cash Withdrawals', rc.cashWithdrawals),
              kpi('cashExpenses', 'Cash Expenses', rc.cashExpenses),
              kpi('cashAdjustments', 'Cash Adjustments', rc.cashAdjustments),
              kpi('expectedCash', 'Expected Cash', rc.expectedCash),
              kpi('cashDifference', 'Actual vs Expected', hasActualCash ? rc.cashDifference : 0),
              kpi('totalTransactions', 'Total Transactions', rc.totalTransactions || 0),
              kpi('averageSale', 'Average Sale', rc.averageSale),
              kpi('largestSale', 'Largest Sale', rc.largestSale),
              kpi('largestRefund', 'Largest Refund', rc.largestRefund),
            ]}
          />
          {hasActualCash ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-amber-800">
                Variance: <span className={varianceTone}>{varianceLabel}</span> · Actual: {formatMoney(rc.actualClosingCash, currency)}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Values aggregated from {rc.cashSessions?.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked').length || 0} settled shift(s).
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-amber-800">
                Variance: <span className={varianceTone}>{varianceLabel}</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Session-level data per shift appears below. Closed sessions store actual closing cash, variance, and settlement details.
              </p>
            </div>
          )}
        </SectionCard>
        {rc.cashSessions && rc.cashSessions.length > 0 ? (
          <SectionCard title="Shift Settlements">
            <ReportDataTable
              rows={rc.cashSessions.filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked')}
              columns={[
                { key: 'cashierName', label: 'Cashier' },
                { key: 'openingCash', label: 'Opening', numeric: true, render: (row) => formatMoney(row.openingCash, currency) },
                { key: 'expectedCash', label: 'Expected', numeric: true, render: (row) => formatMoney(row.expectedCash, currency) },
                { key: 'actualClosingCash', label: 'Actual', numeric: true, render: (row) => formatMoney(row.actualClosingCash, currency) },
                { key: 'cashDifference', label: 'Difference', numeric: true, render: (row) => formatMoney(row.cashDifference, currency) },
                { key: 'totalTransactions', label: 'Txns', numeric: true, render: (row) => String(row.totalTransactions || 0) },
                { key: 'averageSale', label: 'Avg Sale', numeric: true, render: (row) => formatMoney(row.averageSale, currency) },
                { key: 'largestSale', label: 'Largest', numeric: true, render: (row) => formatMoney(row.largestSale, currency) },
                { key: 'settlementStatus', label: 'Settlement', render: (row) => String(row.settlementStatus || row.status || '').replace(/_/g, ' ') || '-' },
                { key: 'varianceStatus', label: 'Variance', render: (row) => String(row.varianceStatus || '').replace(/_/g, ' ') || '-' },
                { key: 'settlementCompletedAt', label: 'Settled At', render: (row) => row.settlementCompletedAt ? new Date(row.settlementCompletedAt).toLocaleString() : '-' },
                { key: 'settledBy', label: 'Settled By', render: (row) => row.settledBy || '-' },
                { key: 'approvedBy', label: 'Approved By', render: (row) => row.approvedBy || '-' },
                { key: 'rejectedBy', label: 'Rejected By', render: (row) => row.rejectedBy || '-' },
                { key: 'lockedBy', label: 'Locked By', render: (row) => row.lockedBy || '-' },
                { key: 'differenceReason', label: 'Diff Reason', render: (row) => row.differenceReason ? row.differenceReason.replace(/_/g, ' ') : '-' },
                { key: 'managerNotes', label: 'Manager Notes', render: (row) => row.managerNotes || '-' },
              ]}
              emptyState="No closed sessions in this period."
            />
          </SectionCard>
        ) : null}

        {/* Settlement summary KPIs */}
        {rc.settlementCounts?.total > 0 ? (
          <SectionCard title="Settlement Summary">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">Pending Review</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{rc.settlementCounts.pendingReview || 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Approved</p>
                <p className="mt-1 text-xl font-bold text-emerald-900">{rc.settlementCounts.approved || 0}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">Rejected</p>
                <p className="mt-1 text-xl font-bold text-rose-900">{rc.settlementCounts.rejected || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">Locked</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{rc.settlementCounts.locked || 0}</p>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {/* Variance Classifications */}
        {rc.settlementVarianceClassifications?.length > 0 ? (
          <SectionCard title="Variance Classification">
            <ReportDataTable
              rows={rc.settlementVarianceClassifications}
              columns={[
                { key: 'cashierName', label: 'Cashier' },
                { key: 'cashDifference', label: 'Difference', numeric: true, render: (row) => formatMoney(row.cashDifference, currency) },
                { key: 'classification', label: 'Classification', render: (row) => row.classification?.label || '-' },
              ]}
              emptyState="No variance data."
            />
          </SectionCard>
        ) : null}
      </div>
    )
  }

  function renderOrders(rows = model.orders, empty = 'No order rows for the selected filters.') {
    return <ReportDataTable rows={rows} columns={orderColumns.map((column) => ({ ...column, render: column.render && ((row) => column.render({ ...row, currency })) }))} emptyState={empty} />
  }

  function renderPaymentCollection() {
    return (
      <div className="space-y-4">
        <ReportKpiGrid currency={currency} kpis={[kpi('collectedAmount', 'Total Collected', model.collectedAmount), kpi('cashReceived', 'Cash Collected', model.cashReceived), kpi('onlineReceived', 'Online Collected', model.onlineReceived)]} />
        <ReportChartCard title="Collection by payment method" barData={objectBars(model.collectionsByPaymentMethod, currency)} />
        {renderOrders(model.billedOrders.filter((order) => order.contributesToCollection), 'No collected payment rows for the selected filters.')}
      </div>
    )
  }

  function renderDuePartial() {
    const rows = model.billedOrders.filter((order) => order.isPartial || order.isDue)
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Outstanding due is not a recovered payment.</p>
        <ReportKpiGrid currency={currency} kpis={[kpi('totalSales', 'Billed Amount', rows.reduce((sum, row) => sum + row.total, 0)), kpi('collectedAmount', 'Paid Amount', rows.reduce((sum, row) => sum + row.paidAmount, 0)), kpi('outstandingAmount', 'Due Amount', rows.reduce((sum, row) => sum + row.dueAmount, 0))]} />
        {renderOrders(rows, 'No due or partial payment rows for the selected filters.')}
      </div>
    )
  }

  function renderCancellations() {
    return (
      <div className="space-y-4">
        <ReportKpiGrid currency={currency} kpis={[kpi('cancellations', 'Cancelled Orders', model.cancellations.count)]} />
        <ReportDataTable
          rows={model.cancellations.rows}
          emptyState="No cancellations for the selected filters."
          columns={[
            { key: 'orderNumber', label: 'Order' },
            { key: 'customerName', label: 'Customer' },
            { key: 'total', label: 'Total before cancellation', numeric: true, render: (row) => formatMoney(row.total, currency) },
            { key: 'cancelReason', label: 'Cancel reason', render: (row) => row.cancelReason || '-' },
            { key: 'createdAt', label: 'Cancelled/Created date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Unavailable' },
          ]}
        />
      </div>
    )
  }

  function renderItemSales() {
    return (
      <ReportDataTable
        rows={model.itemSales}
        emptyState="No item sales for the selected filters."
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'quantity', label: 'Qty', numeric: true },
          { key: 'revenue', label: 'Net Sales', numeric: true, render: (row) => formatMoney(row.revenue, currency) },
          { key: 'discount', label: 'Discount', numeric: true, render: (row) => formatMoney(row.discount, currency) },
          { key: 'cost', label: 'Cost', numeric: true, render: (row) => formatMoney(row.cost, currency) },
          { key: 'profit', label: 'Profit', numeric: true, render: (row) => formatMoney(Number(row.revenue || 0) - Number(row.cost || 0), currency) },
        ]}
      />
    )
  }

  function renderCategorySales() {
    return (
      <ReportDataTable
        rows={model.categorySales}
        emptyState="No category sales for the selected filters."
        columns={[
          { key: 'category', label: 'Category' },
          { key: 'quantity', label: 'Qty', numeric: true },
          { key: 'revenue', label: 'Net Sales', numeric: true, render: (row) => formatMoney(row.revenue, currency) },
          { key: 'cost', label: 'Cost', numeric: true, render: (row) => formatMoney(row.cost, currency) },
          { key: 'profit', label: 'Profit', numeric: true, render: (row) => formatMoney(Number(row.revenue || 0) - Number(row.cost || 0), currency) },
        ]}
      />
    )
  }

  function renderTablePerformance() {
    return (
      <ReportDataTable
        rows={model.tablePerformance.map((row) => ({ ...row, averageValue: row.orders ? row.sales / row.orders : 0 }))}
        emptyState="No table performance for the selected filters."
        columns={[
          { key: 'table', label: 'Table' },
          { key: 'orders', label: 'Billed Orders', numeric: true },
          { key: 'sales', label: 'Sales', numeric: true, render: (row) => formatMoney(row.sales, currency) },
          { key: 'averageValue', label: 'Average Value', numeric: true, render: (row) => formatMoney(row.averageValue, currency) },
        ]}
      />
    )
  }

  function renderOrderTypePerformance() {
    const rows = objectBars(model.salesByOrderType, currency).map((row) => ({ id: row.id, type: row.label, sales: row.value }))
    return (
      <div className="space-y-4">
        <ReportChartCard title="Order type sales" barData={objectBars(model.salesByOrderType, currency)} />
        <ReportDataTable rows={rows} columns={[{ key: 'type', label: 'Order Type' }, { key: 'sales', label: 'Sales', numeric: true, render: (row) => formatMoney(row.sales, currency) }]} emptyState="No order type performance for the selected filters." />
      </div>
    )
  }

  function renderKotPerformance() {
    const rows = ['pending', 'preparing', 'ready', 'served'].map((key) => ({ id: key, status: key, count: model.kotStatus[key] }))
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Average preparation time depends on prepTime being stored on source rows.</p>
        <ReportKpiGrid kpis={[kpi('pending', 'Pending', model.kotStatus.pending), kpi('preparing', 'Preparing', model.kotStatus.preparing), kpi('ready', 'Ready', model.kotStatus.ready), kpi('served', 'Served', model.kotStatus.served), { key: 'averagePreparationTime', label: 'Average Prep Time', value: `${model.kotStatus.averagePreparationTime} min`, type: 'text' }]} />
        <ReportDataTable rows={rows} columns={[{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count', numeric: true }]} />
      </div>
    )
  }

  function renderHourlySales() {
    const rows = sortByHour(model.ordersByHour)
    return (
      <div className="space-y-4">
        <ReportChartCard title="Hourly sales" description="Shows normalized order count by created hour." barData={rows.map((row) => ({ id: row.id, label: row.hour, value: row.count }))} />
        <ReportDataTable rows={rows} columns={[{ key: 'hour', label: 'Hour' }, { key: 'count', label: 'Orders', numeric: true }]} emptyState="No hourly data for the selected filters." />
      </div>
    )
  }

  function renderCustomerSales() {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">Stored customer credit may include historical balances and is separate from report-period order outstanding.</p>
        <ReportDataTable
          rows={model.customerPerformance}
          emptyState="No customer sales for the selected filters."
          columns={[
            { key: 'name', label: 'Customer' },
            { key: 'billedOrders', label: 'Billed Orders', numeric: true },
            { key: 'sales', label: 'Sales', numeric: true, render: (row) => formatMoney(row.sales, currency) },
            { key: 'paid', label: 'Paid', numeric: true, render: (row) => formatMoney(row.paid, currency) },
            { key: 'periodOrderOutstanding', label: 'Period Due', numeric: true, render: (row) => formatMoney(row.periodOrderOutstanding, currency) },
            { key: 'storedCustomerCreditBalance', label: 'Stored Credit', numeric: true, render: (row) => formatMoney(row.storedCustomerCreditBalance, currency) },
          ]}
        />
      </div>
    )
  }

  function renderCostProfit() {
    return <ReportKpiGrid currency={currency} kpis={[kpi('costOfGoodsSold', 'COGS', model.costOfGoodsSold), kpi('grossProfit', 'Gross Profit', model.grossProfit), kpi('approvedExpenses', 'Approved Expenses', model.approvedExpenses), kpi('netProfit', 'Net Profit', model.netProfit)]} />
  }

  function renderDiscounts() {
    return (
      <div className="space-y-4">
        <ReportKpiGrid currency={currency} kpis={[
          kpi('grossSales', 'Gross Sales', model.grossSales),
          kpi('discounts', 'Discounts', model.discounts),
          kpi('netSales', 'Net Sales', model.netSales),
        ]} />
        <ReportDataTable rows={model.discountRows} columns={orderColumns.map((column) => ({ ...column, render: column.render && ((row) => column.render({ ...row, currency })) }))} emptyState="No discount rows for the selected filters." />
      </div>
    )
  }

  function renderTaxServiceCharges() {
    return (
      <div className="space-y-4">
        <ReportKpiGrid currency={currency} kpis={[
          kpi('tax', 'Tax', model.tax),
          kpi('serviceCharges', 'Service Charges', model.serviceCharges),
          kpi('netSales', 'Net Sales', model.netSales),
        ]} />
        <SectionCard title="Tax Rows">
          <ReportDataTable rows={model.taxRows} columns={[
            { key: 'orderNumber', label: 'Order' },
            { key: 'customerName', label: 'Customer' },
            { key: 'orderType', label: 'Type' },
            { key: 'tax', label: 'Tax', numeric: true, render: (row) => formatMoney(row.tax, currency) },
            { key: 'total', label: 'Total', numeric: true, render: (row) => formatMoney(row.total, currency) },
          ]} emptyState="No tax rows for the selected filters." />
        </SectionCard>
        <SectionCard title="Service Charge Rows">
          <ReportDataTable rows={model.serviceChargeRows} columns={[
            { key: 'orderNumber', label: 'Order' },
            { key: 'customerName', label: 'Customer' },
            { key: 'orderType', label: 'Type' },
            { key: 'serviceCharges', label: 'Service Charges', numeric: true, render: (row) => formatMoney(row.serviceCharges, currency) },
            { key: 'total', label: 'Total', numeric: true, render: (row) => formatMoney(row.total, currency) },
          ]} emptyState="No service charge rows for the selected filters." />
        </SectionCard>
      </div>
    )
  }

  function renderExpenses() {
    return (
      <div className="space-y-4">
        <ReportKpiGrid currency={currency} kpis={[kpi('approvedExpenses', 'Approved Expense Total', model.approvedExpenses), kpi('netProfit', 'Net Profit', model.netProfit)]} />
      </div>
    )
  }

  function renderRefundReport() {
    const ra = model.refundAnalysis
    if (!ra || ra.count === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          No refunds recorded for the selected period.
        </div>
      )
    }

    const reasonBars = Object.entries(ra.reasons || {}).map(([reason, amount]) => ({
      id: reason, label: reason, value: amount, displayValue: formatMoney(amount, currency),
    })).sort((a, b) => b.value - a.value)

    const methodBars = Object.entries(ra.byPaymentMethod || {}).map(([method, amount]) => ({
      id: method, label: method, value: amount, displayValue: formatMoney(amount, currency),
    })).sort((a, b) => b.value - a.value)

    return (
      <div className="space-y-4">
        {/* ── Refund Overview ── */}
        <SectionCard title="Refund Overview">
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('refundCount', 'Total Refunds', ra.count),
              kpi('refundAmount', 'Total Refunded', ra.totalAmount),
              kpi('refundRate', 'Refund Rate', `${ra.refundPercentage?.toFixed(1) || 0}%`),
            ]}
          />
        </SectionCard>

        {/* ── Refund by Reason ── */}
        {reasonBars.length > 0 ? (
          <SectionCard title="Refunds by Reason">
            <ReportChartCard title="Reason Breakdown" barData={reasonBars} />
          </SectionCard>
        ) : null}

        {/* ── Refund by Payment Method ── */}
        {methodBars.length > 0 ? (
          <SectionCard title="Refunds by Payment Method">
            <ReportChartCard title="Method Breakdown" barData={methodBars} />
          </SectionCard>
        ) : null}

        {/* ── Refund by Staff ── */}
        {ra.byStaff?.length > 0 ? (
          <SectionCard title="Refunds by Staff">
            <ReportDataTable
              rows={ra.byStaff}
              emptyState="No staff refund data."
              columns={[
                { key: 'name', label: 'Staff/Cashier' },
                { key: 'count', label: 'Refunds', numeric: true, render: (row) => formatNumber(row.count) },
                { key: 'total', label: 'Amount', numeric: true, render: (row) => formatMoney(row.total, currency) },
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── Refund by Customer ── */}
        {ra.byCustomer?.length > 0 ? (
          <SectionCard title="Refunds by Customer">
            <ReportDataTable
              rows={ra.byCustomer?.slice(0, 10)}
              emptyState="No customer refund data."
              columns={[
                { key: 'name', label: 'Customer' },
                { key: 'count', label: 'Refunds', numeric: true, render: (row) => formatNumber(row.count) },
                { key: 'total', label: 'Amount', numeric: true, render: (row) => formatMoney(row.total, currency) },
              ]}
            />
          </SectionCard>
        ) : null}

        {/* ── All Refund Records ── */}
        {ra.rows?.length > 0 ? (
          <SectionCard title={`Refund Records (${ra.rows.length})`}>
            <ReportDataTable
              rows={ra.rows}
              emptyState="No refund records."
              columns={[
                { key: 'customerName', label: 'Customer' },
                { key: 'reason', label: 'Reason' },
                { key: 'refundMethod', label: 'Method' },
                { key: 'refundTotal', label: 'Amount', numeric: true, render: (row) => formatMoney(row.refundTotal, currency) },
                { key: 'cashierName', label: 'Processed By', render: (row) => row.cashierName || '-' },
                { key: 'createdAt', label: 'Date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
              ]}
            />
          </SectionCard>
        ) : null}
      </div>
    )
  }

  function renderStaffCashierPerformance() {
    const sp = model.staffPerformance
    if (!sp || !sp.rows?.length) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          No staff/cashier performance data available for the selected period.
        </div>
      )
    }

    const ranked = sp.rows.sort((a, b) => b.sales - a.sales)
    const topPerformer = ranked[0]
    const lowestPerformer = ranked[ranked.length - 1]

    return (
      <div className="space-y-4">
        {/* ── Top & Bottom Performers ── */}
        <SectionCard title="Performance Highlights">
          <div className="grid gap-3 sm:grid-cols-2">
            {topPerformer ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Top Performer</p>
                <p className="mt-1 text-lg font-black text-emerald-900">{topPerformer.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-emerald-600">Sales</p><p className="text-sm font-bold text-emerald-800">{formatMoney(topPerformer.sales, currency)}</p></div>
                  <div><p className="text-[10px] text-emerald-600">Orders</p><p className="text-sm font-bold text-emerald-800">{formatNumber(topPerformer.orders)}</p></div>
                  <div><p className="text-[10px] text-emerald-600">Avg Ticket</p><p className="text-sm font-bold text-emerald-800">{formatMoney(topPerformer.averageTicket, currency)}</p></div>
                  <div><p className="text-[10px] text-emerald-600">Share</p><p className="text-sm font-bold text-emerald-800">{topPerformer.performancePct?.toFixed(1)}%</p></div>
                </div>
              </div>
            ) : null}
            {lowestPerformer && lowestPerformer.staffId !== topPerformer?.staffId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">Needs Attention</p>
                <p className="mt-1 text-lg font-black text-amber-900">{lowestPerformer.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-amber-600">Sales</p><p className="text-sm font-bold text-amber-800">{formatMoney(lowestPerformer.sales, currency)}</p></div>
                  <div><p className="text-[10px] text-amber-600">Orders</p><p className="text-sm font-bold text-amber-800">{formatNumber(lowestPerformer.orders)}</p></div>
                  <div><p className="text-[10px] text-amber-600">Avg Ticket</p><p className="text-sm font-bold text-amber-800">{formatMoney(lowestPerformer.averageTicket, currency)}</p></div>
                  <div><p className="text-[10px] text-amber-600">Share</p><p className="text-sm font-bold text-amber-800">{lowestPerformer.performancePct?.toFixed(1)}%</p></div>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        {/* ── Performance Ranking Table ── */}
        <SectionCard title={`Staff/Cashier Ranking (${ranked.length})`}>
          <ReportDataTable
            rows={ranked}
            emptyState="No staff data."
            columns={[
              { key: 'name', label: 'Staff/Cashier' },
              { key: 'orders', label: 'Orders', numeric: true, render: (row) => formatNumber(row.orders) },
              { key: 'sales', label: 'Sales', numeric: true, render: (row) => formatMoney(row.sales, currency) },
              { key: 'discounts', label: 'Discounts', numeric: true, render: (row) => formatMoney(row.discounts, currency) },
              { key: 'refunds', label: 'Refunds', numeric: true, render: (row) => formatMoney(row.refunds, currency) },
              { key: 'collected', label: 'Collected', numeric: true, render: (row) => formatMoney(row.collected, currency) },
              { key: 'averageTicket', label: 'Avg Ticket', numeric: true, render: (row) => formatMoney(row.averageTicket, currency) },
              { key: 'performancePct', label: 'Share %', numeric: true, render: (row) => `${row.performancePct?.toFixed(1)}%` },
            ]}
          />
        </SectionCard>
      </div>
    )
  }

  function renderBusinessIntelligence() {
    const bi = model.businessIntelligence
    if (!bi) {
      return (
        <SectionCard title="Business Intelligence" note="No BI data available for this period.">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
            BI data requires at least one billed order.
          </div>
        </SectionCard>
      )
    }

    const health = bi.health
    const forecast = bi.forecast
    const alerts = bi.alerts || []
    const trends = bi.trends
    const productIntelligence = bi.productIntelligence
    const customerIntelligence = bi.customerIntelligence
    const executive = bi.executive

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
    const warningAlerts = alerts.filter((a) => a.severity === 'warning')

    return (
      <div className="space-y-4">
        {/* ── Executive Health Score ── */}
        {health ? (
          <SectionCard title="Business Health Score">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className={`rounded-xl border p-4 ${
                health.level === 'Excellent' ? 'border-emerald-300 bg-emerald-50' :
                health.level === 'Good' ? 'border-sky-300 bg-sky-50' :
                health.level === 'Warning' ? 'border-amber-300 bg-amber-50' :
                'border-rose-300 bg-rose-50'
              }`}>
                <p className={`text-xs font-black uppercase tracking-[0.1em] ${
                  health.level === 'Excellent' ? 'text-emerald-700' :
                  health.level === 'Good' ? 'text-sky-700' :
                  health.level === 'Warning' ? 'text-amber-700' : 'text-rose-700'
                }`}>Overall Health</p>
                <p className={`mt-1 text-3xl font-black ${
                  health.level === 'Excellent' ? 'text-emerald-800' :
                  health.level === 'Good' ? 'text-sky-800' :
                  health.level === 'Warning' ? 'text-amber-800' : 'text-rose-800'
                }`}>{health.score}/100</p>
                <p className={`text-sm font-bold ${
                  health.level === 'Excellent' ? 'text-emerald-700' :
                  health.level === 'Good' ? 'text-sky-700' :
                  health.level === 'Warning' ? 'text-amber-700' : 'text-rose-700'
                }`}>{health.level}</p>
              </div>

              {/* Sub-scores */}
              {health.subScores ? (
                <>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-700">Growth Score</p>
                    <p className="text-lg font-bold text-indigo-900">{health.subScores.growth}/100</p>
                  </div>
                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-700">Profit Score</p>
                    <p className="text-lg font-bold text-teal-900">{health.subScores.profit}/100</p>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-violet-700">Customer Score</p>
                    <p className="text-lg font-bold text-violet-900">{health.subScores.customer}/100</p>
                  </div>
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-700">Operations Score</p>
                    <p className="text-lg font-bold text-cyan-900">{health.subScores.operations}/100</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-700">Risk Score</p>
                    <p className="text-lg font-bold text-rose-900">{health.subScores.risk}/100</p>
                  </div>
                </>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Trends ── */}
        {trends ? (
          <SectionCard title="Trend Analysis">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Sales Trend</p>
                <p className={`mt-1 text-lg font-bold ${trends.salesTrendLabel === 'increasing' ? 'text-emerald-600' : trends.salesTrendLabel === 'decreasing' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {trends.salesTrendArrow} {trends.salesTrendLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Profit Trend</p>
                <p className={`mt-1 text-lg font-bold ${trends.profitTrendLabel === 'increasing' ? 'text-emerald-600' : trends.profitTrendLabel === 'decreasing' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {trends.profitTrendArrow} {trends.profitTrendLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Sales Momentum</p>
                <p className={`mt-1 text-lg font-bold ${trends.salesMomentumLabel === 'strong' ? 'text-emerald-600' : trends.salesMomentumLabel === 'moderate' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {trends.salesMomentum}/100 — {trends.salesMomentumLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Revenue Velocity</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(trends.revenueVelocity, currency)}/day</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Peak Hour</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{trends.peakHour}</p>
                <p className="text-xs text-slate-500">{trends.peakHourOrders} orders</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Repeat Customer Rate</p>
                <p className={`mt-1 text-lg font-bold ${trends.repeatCustomerRate > 0.3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {Math.round(trends.repeatCustomerRate * 100)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Customer Growth</p>
                <p className={`mt-1 text-lg font-bold ${trends.customerGrowthLabel === 'high' ? 'text-emerald-600' : trends.customerGrowthLabel === 'medium' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {trends.customerGrowthLabel}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Avg Ticket</p>
                <p className={`mt-1 text-lg font-bold ${trends.avgTicketTrendLabel === 'increasing' ? 'text-emerald-600' : trends.avgTicketTrendLabel === 'decreasing' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {formatMoney(trends.averageTicket, currency)} {trends.avgTicketTrendArrow}
                </p>
              </div>
            </div>
            {trends.peakHours.length > 1 ? (
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Top Peak Hours</p>
                <div className="grid gap-1.5">
                  {trends.peakHours.map((ph) => (
                    <div key={ph.hour} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                      <span className="text-xs font-semibold text-slate-700">{ph.hour}</span>
                      <span className="text-xs text-slate-500">{ph.orders} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Forecast Cards ── */}
        {forecast?.tomorrow ? (
          <SectionCard title="Sales Forecast">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">Tomorrow</p>
                <p className="mt-0.5 text-lg font-bold text-sky-900">{formatMoney(forecast.tomorrow.sales, currency)}</p>
                <p className="text-xs text-sky-600">{forecast.tomorrow.orders} orders &middot; {forecast.tomorrow.customers} customers</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-700">Next 7 Days</p>
                <p className="mt-0.5 text-lg font-bold text-indigo-900">{formatMoney(forecast.nextWeek.expectedRevenue, currency)}</p>
                <p className="text-xs text-indigo-600">{forecast.nextWeek.expectedOrders} orders &middot; {forecast.nextWeek.expectedCustomers} customers</p>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">Next 30 Days</p>
                <p className="mt-0.5 text-lg font-bold text-violet-900">{formatMoney(forecast.nextMonth.expectedRevenue, currency)}</p>
                <p className="text-xs text-violet-600">{forecast.nextMonth.expectedOrders} orders &middot; {forecast.nextMonth.expectedCustomers} customers</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Confidence: {forecast.confidenceLabel} ({forecast.confidenceScore}%)</span>
              <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${
                  forecast.confidenceScore >= 70 ? 'bg-emerald-500' :
                  forecast.confidenceScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                }`} style={{ width: `${forecast.confidenceScore}%` }} />
              </div>
              {forecast.note ? <span className="text-[10px] text-slate-400">{forecast.note}</span> : null}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Product Intelligence ── */}
        {productIntelligence && productIntelligence.itemCount > 0 ? (
          <SectionCard title="Product Intelligence">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Best Selling */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Best Selling</p>
                {productIntelligence.bestSelling.slice(0, 5).map((item) => (
                  <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-900 truncate">{item.rank}. {item.name}</span>
                    <span className="text-emerald-700">{item.quantity} units &middot; {formatMoney(item.revenue, currency)}</span>
                  </div>
                ))}
              </div>
              {/* Worst Selling */}
              {productIntelligence.worstSelling.length > 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-700">Worst Selling</p>
                  {productIntelligence.worstSelling.map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-900 truncate">{item.name}</span>
                      <span className="text-rose-700">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Highest Profit */}
              {productIntelligence.highestProfit.length > 0 ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-teal-700">Highest Profit</p>
                  {productIntelligence.highestProfit.slice(0, 5).map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-teal-900 truncate">{item.name}</span>
                      <span className="text-teal-700">{formatMoney(item.profit, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Lowest Profit */}
              {productIntelligence.lowestProfit.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Lowest Profit</p>
                  {productIntelligence.lowestProfit.map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 truncate">{item.name}</span>
                      <span className="text-amber-700">{formatMoney(item.profit, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Fastest Growing */}
              {productIntelligence.fastestGrowing.length > 0 ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-sky-700">Fastest Growing (unit price)</p>
                  {productIntelligence.fastestGrowing.slice(0, 5).map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-900 truncate">{item.name}</span>
                      <span className="text-sky-700">{formatMoney(item.unitPrice, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Highest Discount */}
              {productIntelligence.highestDiscount.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Highest Discount</p>
                  {productIntelligence.highestDiscount.slice(0, 5).map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 truncate">{item.name}</span>
                      <span className="text-amber-700">{item.discountPct.toFixed(1)}% off</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* Slow Moving */}
              {productIntelligence.slowMoving.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-700">Slow Moving</p>
                  {productIntelligence.slowMoving.map((item) => (
                    <div key={item.id} className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 truncate">{item.name}</span>
                      <span className="text-slate-600">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {/* Category Performance */}
            {productIntelligence.categoryPerformance.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Category Performance</p>
                <div className="grid gap-1.5">
                  {productIntelligence.categoryPerformance.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{cat.rank}. {cat.category}</span>
                        <span className="text-[10px] text-slate-400">{cat.quantity} units</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">{formatMoney(cat.revenue, currency)}</span>
                        <span className={`text-[10px] font-semibold ${cat.profitMargin >= 20 ? 'text-emerald-600' : cat.profitMargin > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {cat.profitMargin.toFixed(1)}% margin
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Customer Intelligence ── */}
        {customerIntelligence && customerIntelligence.totalCustomers > 0 ? (
          <SectionCard title="Customer Intelligence">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Total Customers</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{customerIntelligence.totalCustomers}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">VIP Customers</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{customerIntelligence.vip.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Returning</p>
                <p className="mt-1 text-lg font-bold text-emerald-900">{customerIntelligence.returning.length}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-sky-700">New</p>
                <p className="mt-1 text-lg font-bold text-sky-900">{customerIntelligence.newCustomers.length}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Avg Visits</p>
                <p className="text-sm font-bold text-slate-900">{customerIntelligence.averageVisits.toFixed(1)}x</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Avg Spend</p>
                <p className="text-sm font-bold text-slate-900">{formatMoney(customerIntelligence.averageSpend, currency)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Est. Lifetime Value</p>
                <p className="text-sm font-bold text-slate-900">{formatMoney(customerIntelligence.estimatedLifetimeValue, currency)}</p>
              </div>
            </div>
            {/* Top VIPs */}
            {customerIntelligence.vip.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Top VIP Customers</p>
                <div className="grid gap-1">
                  {customerIntelligence.vip.slice(0, 5).map((v, i) => (
                    <div key={v.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-[9px] font-black text-amber-700">{i + 1}</span>
                        {v.name}
                      </span>
                      <span className="text-xs text-slate-500">{v.orders} orders &middot; {formatMoney(v.sales, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Smart Alerts ── */}
        {alerts.length > 0 ? (
          <SectionCard title="Smart Alerts & Anomalies">
            <div className="space-y-1.5">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  a.severity === 'critical' ? 'bg-rose-50 text-rose-800' :
                  a.severity === 'warning' ? 'bg-amber-50 text-amber-800' :
                  'bg-sky-50 text-sky-800'
                }`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black text-white ${
                    a.severity === 'critical' ? 'bg-rose-500' :
                    a.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                  }`}>!</span>
                  <div className="min-w-0">
                    <p>{a.message}</p>
                    <p className="mt-0.5 text-[10px] opacity-70 capitalize">{a.category} &middot; {a.severity}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Recommendations ── */}
        {executive?.recommendations?.length > 0 ? (
          <SectionCard title="Recommendations">
            <div className="grid gap-1.5">
              {executive.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">{i + 1}</span>
                  <p className="text-xs text-slate-700">{r}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* ── Base KPIs ── */}
        <ReportKpiGrid kpis={baseKpis()} currency={currency} />
      </div>
    )
  }

  function renderReport() {
    if (activeReport.capability === 'blocked') return renderBlocked()
    if (activeReport.id === 'executive-summary') return renderExecutive()
    if (activeReport.id === 'business-intelligence') return renderBusinessIntelligence()
    if (activeReport.id === 'daily-closing') return renderDailyClosing()
    if (activeReport.id === 'cash-drawer-reconciliation') return renderCashDrawerReconciliation()
    if (activeReport.id === 'shift-settlement-report') return renderCashDrawerReconciliation()
    if (activeReport.id === 'orders') return renderOrders()
    if (activeReport.id === 'payment-collection') return renderPaymentCollection()
    if (activeReport.id === 'due-partial-payments') return renderDuePartial()
    if (activeReport.id === 'tax-service-charges') return renderTaxServiceCharges()
    if (activeReport.id === 'discounts') return renderDiscounts()
    if (activeReport.id === 'cancellations') return renderCancellations()
    if (activeReport.id === 'item-sales') return renderItemSales()
    if (activeReport.id === 'category-sales') return renderCategorySales()
    if (activeReport.id === 'table-performance') return renderTablePerformance()
    if (activeReport.id === 'order-type-performance') return renderOrderTypePerformance()
    if (activeReport.id === 'kot-performance') return renderKotPerformance()
    if (activeReport.id === 'hourly-sales') return renderHourlySales()
    if (activeReport.id === 'customer-sales') return renderCustomerSales()
    if (activeReport.id === 'cost-profit') return renderCostProfit()
    if (activeReport.id === 'expenses') return renderExpenses()
    if (activeReport.id === 'refund-report') return renderRefundReport()
    if (activeReport.id === 'staff-cashier-performance') return renderStaffCashierPerformance()
    return renderExecutive()
  }

  return (
    <ReportShell
      title={`${restaurantName} Reports`}
      description={`${workspaceLabel}`}
      groups={RESTAURANT_REPORT_GROUPS}
      reports={RESTAURANT_REPORT_DEFINITIONS}
      activeReportId={activeReport.id}
      onReportChange={setActiveReportId}
      actions={reportActions()}
      reportIcons={RESTAURANT_REPORT_ICONS}
      rangeLabel={rangeLabelText}
    >
      <div className="space-y-4">
        <ReportFilters supportedFilters={activeReport.supportedFilters} values={filters} options={filterOptions} onChange={updateFilter} onReset={resetFilters} />

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">Loading restaurant reports...</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
        {range.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{range.error}</div> : null}
        {sourceLimitations ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{sourceLimitations}</div> : null}
        {!loading && !error && !hasSourceData ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">No Restaurant data available yet.</div> : null}
        {!loading && !error && hasSourceData && !hasFilteredData && !range.error ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">No data for the selected filters.</div> : null}

        {!loading && !error && !range.error && (hasFilteredData || activeReport.capability === 'blocked') ? renderReport() : null}
      </div>

      {/* ── PDF Export Dialog ── */}
      {pdfDialogOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Export PDF</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">PDF Export Options</h2>
              </div>
              <button type="button" onClick={() => setPdfDialogOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close">&times;</button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-xs font-semibold text-slate-500">Digital Signatures (optional)</p>
              {['preparedBy', 'verifiedBy', 'managerApproval', 'ownerApproval'].map((field) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <input
                    value={pdfSignatures[field] || ''}
                    onChange={(e) => setPdfSignatures((s) => ({ ...s, [field]: e.target.value }))}
                    className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300"
                    placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Watermark</span>
                <select value={pdfWatermark} onChange={(e) => setPdfWatermark(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300">
                  <option value="">None</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="FINAL">FINAL</option>
                  <option value="PAID">PAID</option>
                  <option value="INTERNAL USE ONLY">INTERNAL USE ONLY</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <button type="button" onClick={() => setPdfDialogOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handlePdfExport} disabled={pdfSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 disabled:pointer-events-none disabled:opacity-60">
                {pdfSubmitting ? 'Generating...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ReportShell>
  )
}
