import { useCallback, useMemo, useState } from 'react'
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
  buildRestaurantPrintableReport,
  printRestaurantA4Report,
  printRestaurantThermalClosing,
  exportRestaurantCsv,
  exportRestaurantExcel,
  exportRestaurantPdf,
} from './restaurantReportPrint.js'

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
}) {
  const [activeReportId, setActiveReportId] = useState('executive-summary')
  const [filters, setFilters] = useState(defaultFilters)
  const [actionStatus, setActionStatus] = useState(null) // { type: 'loading' | 'success' | 'error', message: '' }
  const activeReport = restaurantReportById(activeReportId)
  const range = useMemo(() => selectedDateRange(filters, settings), [filters, settings])
  const allNormalizedOrders = useMemo(() => normalizeRestaurantReportOrders(orders, { settings }), [orders, settings])
  const filteredOrders = useMemo(() => filterOrdersForPage(orders, filters, range, settings), [orders, filters, range, settings])
  const model = useMemo(
    () => buildRestaurantReportModel({ orders: filteredOrders, customers, expenses, openingCash, settings }),
    [customers, expenses, filteredOrders, openingCash, settings],
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
  const isDailyClosing = activeReport.id === 'daily-closing'

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

  const actions = [
    !isBlocked ? ['Print A4', handlePrint] : null,
    !isBlocked ? ['CSV', handleCsv] : null,
    !isBlocked ? ['Excel', handleExcel] : null,
    isDailyClosing ? ['58mm Closing', handleThermal] : null,
  ].filter(Boolean)

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function resetFilters() {
    setFilters(defaultFilters)
  }

  function reportActions() {
    if (!actions.length) return null
    const isLoading = actionStatus?.type === 'loading'
    return (
      <div className="flex flex-wrap items-center gap-2">
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
    return (
      <div className="space-y-4">
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
    return (
      <div className="space-y-4">
        <SectionCard title="Selected business day" note={rangeLabel(range)}>
          <ReportKpiGrid
            currency={currency}
            kpis={[
              kpi('openingCash', 'Opening Cash', model.openingCash),
              kpi('billedOrders', 'Billed Orders', model.billedOrders.length),
              kpi('cancelledOrders', 'Cancelled Orders', model.cancellations.count),
              kpi('grossSales', 'Gross Sales', model.grossSales),
              kpi('discounts', 'Discounts', model.discounts),
              kpi('netSales', 'Net Sales', model.netSales),
              kpi('cashReceived', 'Cash Collection', model.cashReceived),
              kpi('onlineReceived', 'Online Collection', model.onlineReceived),
              kpi('outstandingAmount', 'Outstanding Amount', model.outstandingAmount),
              kpi('tax', 'Tax', model.tax),
              kpi('serviceCharges', 'Service Charges', model.serviceCharges),
              kpi('approvedExpenses', 'Expenses', model.approvedExpenses),
              kpi('costOfGoodsSold', 'COGS', model.costOfGoodsSold),
              kpi('grossProfit', 'Gross Profit', model.grossProfit),
              kpi('netProfit', 'Net Profit', model.netProfit),
              unavailableKpi('cashDifference', 'Cash Difference', 'Unavailable — actual closing cash, refunds, withdrawals, and reliable cash-expense source are not stored.'),
            ]}
          />
        </SectionCard>
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

  function renderReport() {
    if (activeReport.capability === 'blocked') return renderBlocked()
    if (activeReport.id === 'executive-summary') return renderExecutive()
    if (activeReport.id === 'daily-closing') return renderDailyClosing()
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
    return renderExecutive()
  }

  return (
    <ReportShell
      title={`${restaurantName} Reports`}
      description={`${workspaceLabel} - selected range: ${rangeLabel(range)}`}
      groups={RESTAURANT_REPORT_GROUPS}
      reports={RESTAURANT_REPORT_DEFINITIONS}
      activeReportId={activeReport.id}
      onReportChange={setActiveReportId}
      actions={reportActions()}
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
    </ReportShell>
  )
}
