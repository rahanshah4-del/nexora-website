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
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
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
import PrintableReport from '../components/print/PrintableReport.jsx'
import { supportedCurrencies } from '../data/currency.js'
import { labelForBusinessType, normalizeBusinessType } from '../data/moduleAccess.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { REPORT_SECTION_OPTIONS, useReports } from '../hooks/useReports.js'
import { useUser } from '../hooks/useUser.js'
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
import { calculateDealMetrics, calculatePipelineMetrics, calculateProductMetrics, calculateTaskMetrics } from '../lib/salesCalculations.js'
import { loadRestaurantCustomers } from '../data/restaurantCustomers.js'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { normalizeInvoiceOrders } from '../data/restaurantInvoiceOrders.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { finalItemPrice, formatRestaurantCurrency } from '../lib/restaurantPosCalculations.js'
import { loadTransportBookings } from '../data/transportBookings.js'
import { loadTransportVehicles } from '../data/transportVehicles.js'
import { loadTransportCustomers } from '../data/transportCustomers.js'
import { loadTransportPayments } from '../data/transportPayments.js'
import {
  buildTransportFinanceSummary,
  formatTransportCurrency,
  formatTransportSignedCurrency,
  isTransportRefundPayment,
} from '../lib/transportCalculations.js'
import {
  restaurantBusinessDayWindow,
  restaurantPreviousBusinessDayWindow,
} from '../lib/restaurantBusinessDay.js'
import { directPrinterAvailable, printThermalText } from '../lib/printerService.js'

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

  return (
    <div className="overflow-x-auto rounded-[1.1rem] border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.id || `${columns[0]?.key || 'row'}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : safeText(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function GenericReports() {
  const { profile, currency: preferredCurrency } = usePreferences()
  const businessSettingsApi = useBusinessSettings()
  const { userDoc, firebaseUser, workspaceId, businessType, plan } = useUser()
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
  const selectedReportSectionLabel = REPORT_SECTION_OPTIONS.find((item) => item.value === reportSection)?.label || 'Overview'

  const reportData = useMemo(() => {
    const filtered = (list) => (Array.isArray(list) ? list.filter((item) => withinDateWindow(item, activeWindow)) : [])
    const invoices = filtered(reports.data.invoices)
    const payments = filtered(reports.data.payments)
    const expenses = filtered(reports.data.expenses)
    const customers = filtered(reports.data.customers)
    const leads = filtered(reports.data.leads)
    const deals = filtered(reports.data.pipelines)
    const tasks = filtered(reports.data.tasks)
    const tickets = filtered(reports.data.supportTickets)
    const activityLogs = filtered(reports.data.activityLogs)
    const staff = filtered([...(reports.data.teamMembers || []), ...(reports.data.staff || [])])

    const paidInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'paid')
    const paidPayments = payments.filter(isPaidRecord)
    const approvedExpenses = expenses.filter((expense) => ['approved', 'paid', 'completed'].includes(String(expense.approvalStatus || expense.status || '').toLowerCase()))
    const pendingInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'pending')
    const overdueInvoices = invoices.filter((invoice) => getInvoiceStatus(invoice) === 'overdue')
    const activeCustomers = customers.filter((customer) => String(customer.status || '').toLowerCase() === 'active')
    const hotLeads = leads.filter((lead) => safeNumber(lead.score) >= 80 || String(lead.scoreType || '').toLowerCase().includes('hot'))
    const openTickets = tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'open')
    const completedTasks = tasks.filter((task) => String(task.status || '').toLowerCase() === 'completed')
    const totalRevenueUsd = calculateRevenue({ invoices, payments })
    const paymentRevenueUsd = paidPayments.reduce((sum, payment) => sum + paymentValue(payment), 0)
    const expensesUsd = calculateApprovedExpenses(expenses)
    const profitUsd = calculateProfit({ revenue: totalRevenueUsd, expenses: expensesUsd })
    const pipelineUsd = deals.reduce((sum, deal) => sum + dealValue(deal), 0)
    const customerSpendUsd = customers.reduce((sum, customer) => sum + safeNumber(customer.spendUsd ?? customer.spend ?? customer.totalSpendUsd), 0)

    return {
      invoices,
      payments,
      expenses,
      customers,
      leads,
      deals,
      tasks,
      tickets,
      activityLogs,
      staff,
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
        staff.length,
    }
  }, [reports.data, activeWindow])

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
        <div className="no-print fixed right-4 top-4 z-[70] max-w-[calc(100vw-2rem)] rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-800 shadow-sm">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={HiOutlineCurrencyDollar}
            label="Revenue report"
            value={formatMoney(reportData.totalRevenueUsd || reportData.paymentRevenueUsd, filters.currency)}
            helper={`${reportData.paidInvoices.length} paid invoices - ${reportData.pendingInvoices.length} pending`}
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
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ReportSection title="Executive summary" badge="Summary">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Lead pipeline" value={`${reportData.leads.length} leads / ${reportData.hotLeads.length} hot`} />
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
  const dealsApi = useSalesHubCollection('salesDeals')
  const tasksApi = useSalesHubCollection('salesTasks')
  const quotesApi = useSalesHubCollection('salesQuotes')
  const productsApi = useSalesHubCollection('salesProducts')
  const dealMetrics = calculateDealMetrics(dealsApi.rows)
  const pipelineMetrics = calculatePipelineMetrics(dealsApi.rows)
  const taskMetrics = calculateTaskMetrics(tasksApi.rows)
  const productMetrics = calculateProductMetrics(productsApi.rows)
  const reports = [
    ['Sales Report', dealMetrics.wonValue],
    ['Pipeline Report', pipelineMetrics.pipelineValue],
    ['Deals Report', dealMetrics.totalDeals],
    ['Lead Conversion Report', `${pipelineMetrics.conversionRate}%`],
    ['Customer Report', 'Use Customers module'],
    ['Quotation Report', quotesApi.rows.length],
    ['Invoice Report', 'Use Invoices module'],
    ['Expense Report', 'Use Expenses module'],
    ['Team Performance Report', `${taskMetrics.completionRate}% completion`],
    ['Forecast Report', dealMetrics.forecastRevenue],
  ]

  function exportCsv() {
    const csv = ['Report,Value', ...reports.map(([name, value]) => `${name},${value}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'nexora-sales-hub-reports.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Sales Hub Reports"
        subtitle="Sales, pipeline, deals, lead conversion, customer, quotation, invoice, expense, team performance, and forecast reports."
        right={
          <>
            <Button className="rounded-2xl" type="button" onClick={() => window.print()}><HiOutlinePrinter className="h-4 w-4" />Print / PDF</Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={exportCsv}><HiOutlineArrowDownTray className="h-4 w-4" />Export Excel CSV</Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {reports.map(([name, value]) => (
          <Card key={name} className="p-4">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{name}</p>
            <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {typeof value === 'number' ? formatCurrency(value, 'PKR') : value}
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Calculation Summary</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DataPill label="Expected Revenue" value={formatCurrency(dealMetrics.expectedRevenue, 'PKR')} />
          <DataPill label="Weighted Pipeline" value={formatCurrency(pipelineMetrics.weightedPipeline, 'PKR')} />
          <DataPill label="Overdue Tasks" value={taskMetrics.overdueTasks} />
          <DataPill label="Catalog Margin" value={`${productMetrics.marginPercent}%`} />
        </div>
      </Card>
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

const restaurantReportRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom date range' },
]

const restaurantOrderTypes = ['All', 'Dine-in', 'Takeaway', 'Delivery', 'Invoice Order']
const restaurantPaymentMethods = ['All', 'Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank', 'Due', 'Invoice']

function RestaurantReports() {
  const { invoices } = useInvoices({ limitCount: 50 })
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const expensesApi = useExpenses({ limitCount: 200 })
  const customers = useMemo(() => loadRestaurantCustomers(), [])
  const [filters, setFilters] = useState({
    range: 'today',
    startDate: '',
    endDate: '',
    orderType: 'All',
    paymentMethod: 'All',
  })

  const reportOrders = useMemo(() => [...loadRestaurantOrders(), ...normalizeInvoiceOrders(invoices)], [invoices])
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
  if (filters.range === 'today') return restaurantBusinessDayWindow(settings, now)
  if (filters.range === 'yesterday') {
    return restaurantPreviousBusinessDayWindow(settings, now)
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

function buildRestaurantReport(orders, customers, options = {}) {
  // openingCash + expenses come from real workspace data (business settings cash
  // drawer + approved expenses). They used to be hardcoded (25000 / 18500),
  // which showed fake cash figures on brand-new accounts.
  const openingCash = Math.max(0, safeNumber(options.openingCash))
  const realExpenses = Math.max(0, safeNumber(options.expenses))
  const onlineMethods = new Set(['Card', 'JazzCash', 'Easypaisa', 'Bank'])
  const base = {
    'Dine-in': 0,
    Takeaway: 0,
    Delivery: 0,
  }
  const salesByType = { ...base }
  const salesByPayment = { Cash: 0, Card: 0, JazzCash: 0, Easypaisa: 0, Bank: 0, Due: 0 }
  const itemMap = new Map()
  const tableMap = new Map()
  const customerMap = new Map()
  let totalSales = 0
  let paidAmount = 0
  let dueAmount = 0
  let discounts = 0
  let tax = 0
  let serviceCharges = 0
  let itemCost = 0
  let cancelledOrders = 0
  let simpleOrderSales = 0
  let invoiceOrderSales = 0

  orders.forEach((order) => {
    const isCancelled = String(order.orderStatus || '').toLowerCase() === 'cancelled'
    const isInvoiceOrder = order.sourceKind === 'invoice'
    const total = order.totals.total
    if (!isCancelled) totalSales += total
    if (!isCancelled && isInvoiceOrder) invoiceOrderSales += total
    if (!isCancelled && !isInvoiceOrder) simpleOrderSales += total
    paidAmount += order.paidAmount
    dueAmount += order.dueAmount
    discounts += order.totals.discount
    tax += order.totals.tax
    serviceCharges += order.totals.serviceCharges
    salesByType[order.orderType] = safeNumber(salesByType[order.orderType]) + (isCancelled ? 0 : total)
    salesByPayment[order.paymentMethod] = safeNumber(salesByPayment[order.paymentMethod]) + (isCancelled ? 0 : total)
    if (isCancelled) cancelledOrders += 1

    order.cartRows.forEach((row) => {
      const item = row.item
      const quantity = Math.max(0, Number(row.qty || row.quantity || 0))
      const current = itemMap.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0, discount: 0 }
      const unitPrice = finalItemPrice(item)
      current.quantity += quantity
      current.revenue += isCancelled ? 0 : unitPrice * quantity
      current.discount += Math.max(0, safeNumber(item.price) - unitPrice) * quantity
      itemMap.set(item.id, current)
      itemCost += isCancelled ? 0 : safeNumber(item.costPrice) * quantity
    })

    if (order.table) {
      const current = tableMap.get(order.table) || { id: order.table, table: order.table, orders: 0, sales: 0, status: 'available' }
      current.orders += 1
      current.sales += isCancelled ? 0 : total
      current.status = String(order.orderStatus || '').toLowerCase() === 'served' ? 'occupied' : order.orderStatus
      tableMap.set(order.table, current)
    }

    const customer = customers.find((item) => item.id === order.customerId)
    const key = order.customerId || 'walk-in'
    const current = customerMap.get(key) || { id: key, name: customer?.name || 'Walk-in Guest', orders: 0, paid: 0, due: 0 }
    current.orders += 1
    current.paid += isCancelled ? 0 : order.paidAmount
    current.due += isCancelled ? 0 : order.dueAmount + safeNumber(customer?.creditBalance)
    customerMap.set(key, current)
  })

  const totalExpenses = realExpenses
  const netSales = Math.max(0, totalSales - discounts)
  const estimatedProfit = Math.max(0, netSales - itemCost - totalExpenses)
  const itemRows = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .map((row, index, rows) => ({ ...row, rank: index < 3 ? 'Top selling' : index >= rows.length - 2 ? 'Low selling' : 'Steady' }))

  const kot = {
    total: orders.length,
    pending: orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'pending').length,
    preparing: orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'preparing').length,
    ready: orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'ready').length,
    served: orders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'served').length,
    averagePreparationTime: orders.length ? Math.round(orders.reduce((sum, order) => sum + safeNumber(order.prepTime), 0) / orders.length) : 0,
  }
  const tableRows = Array.from(tableMap.values()).sort((a, b) => b.orders - a.orders)
  const customerRows = Array.from(customerMap.values()).sort((a, b) => b.orders - a.orders)
  const cashReceived = orders.filter((order) => order.paymentMethod === 'Cash').reduce((sum, order) => sum + order.paidAmount, 0)
  const onlineReceived = orders.filter((order) => onlineMethods.has(order.paymentMethod)).reduce((sum, order) => sum + order.paidAmount, 0)

  return {
    totalSales,
    grossSales: totalSales + discounts,
    netSales,
    totalOrders: orders.length,
    simpleOrders: orders.filter((order) => order.sourceKind !== 'invoice').length,
    invoiceOrders: orders.filter((order) => order.sourceKind === 'invoice').length,
    simpleOrderSales,
    invoiceOrderSales,
    paidAmount,
    dueAmount,
    discounts,
    tax,
    serviceCharges,
    cancelledOrders,
    averageOrderValue: orders.length ? totalSales / orders.length : 0,
    salesByType,
    salesByPayment,
    onlineSales: Array.from(onlineMethods).reduce((sum, method) => sum + safeNumber(salesByPayment[method]), 0),
    duePartialSales: orders.filter((order) => ['due', 'partial'].includes(String(order.paymentStatus || '').toLowerCase())).reduce((sum, order) => sum + order.totals.total, 0),
    itemRows,
    kot,
    occupiedTables: tableRows.filter((row) => row.status === 'occupied').length,
    mostUsedTable: tableRows[0]?.table || '',
    tableRows,
    newCustomers: customerRows.filter((row) => row.orders === 1 && row.id !== 'cust-walkin').length,
    repeatCustomers: customerRows.filter((row) => row.orders > 1 && row.id !== 'cust-walkin').length,
    customersWithDue: customerRows.filter((row) => row.due > 0).length,
    customerOrderHistory: customerRows.reduce((sum, row) => sum + row.orders, 0),
    customerRows,
    totalExpenses,
    estimatedProfit,
    profitAfterAdjustments: Math.max(0, totalSales - itemCost - totalExpenses),
    closing: {
      openingCash,
      cashReceived,
      onlineReceived,
      duePayments: dueAmount,
      expenses: totalExpenses,
      closingCash: openingCash + cashReceived - totalExpenses,
      difference: 0,
    },
  }
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
  const vehicles = useMemo(() => loadTransportVehicles(), [])
  const allBookings = useMemo(() => loadTransportBookings(), [])
  const customers = useMemo(() => loadTransportCustomers(), [])
  const allPayments = useMemo(() => loadTransportPayments(), [])
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
        <div className="no-print fixed right-4 top-4 z-[70] rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 shadow-sm">
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

function buildTransportReport({ vehicles = [], bookings = [], customers = [], payments = [] } = {}) {
  const activeBookings = bookings.filter((booking) => booking.status === 'active')
  const reservedBookings = bookings.filter((booking) => booking.status === 'reserved')
  const returnedBookings = bookings.filter((booking) => booking.status === 'returned')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled')
  const finance = buildTransportFinanceSummary({ bookings, payments })
  const liveBookings = finance.activeBookings
  const totalRevenue = finance.netCollected
  const bookingRevenue = finance.activeBookingValue
  const paidAmount = finance.paidAmount
  const outstandingDues = finance.outstandingDues
  const securityDeposits = liveBookings.reduce((sum, booking) => sum + safeNumber(booking.securityDeposit), 0)
  const driverCharges = liveBookings.reduce((sum, booking) => sum + safeNumber(booking.totals?.driverCharges || booking.driverRate * booking.units), 0)
  const methodRows = Object.values(finance.activePayments.filter((payment) => !isTransportRefundPayment(payment)).reduce((map, payment) => {
    const method = payment.method || 'Cash'
    map[method] = map[method] || { method, count: 0, amount: 0 }
    map[method].count += 1
    map[method].amount += safeNumber(payment.amount)
    return map
  }, {})).sort((a, b) => b.amount - a.amount)
  const refundRows = payments.filter((payment) => isTransportRefundPayment(payment))
  const cancelledRows = cancelledBookings.map((booking) => ({
    ...booking,
    refundAmount: safeNumber(booking.refundAmount),
    refundMethod: booking.refundMethod || refundRows.find((payment) => payment.bookingNumber === booking.bookingNumber)?.method || '',
  }))
  const vehicleRows = vehicles.map((vehicle) => {
    const vehicleBookings = bookings.filter((booking) => booking.vehicleId === vehicle.id && booking.status !== 'cancelled')
    return {
      ...vehicle,
      bookings: vehicleBookings.length,
      revenue: vehicleBookings.reduce((sum, booking) => sum + safeNumber(booking.total), 0),
      due: vehicleBookings.reduce((sum, booking) => sum + safeNumber(booking.dueAmount), 0),
    }
  }).sort((a, b) => b.revenue - a.revenue)
  const customerRows = customers.map((customer) => ({
    ...customer,
    due: safeNumber(customer.creditBalance),
    paid: safeNumber(customer.paidAmount),
    bookings: Array.isArray(customer.bookingHistory) ? customer.bookingHistory.length : 0,
  })).sort((a, b) => b.due - a.due)

  return {
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'available').length,
    rentedVehicles: vehicles.filter((vehicle) => vehicle.status === 'rented').length,
    maintenanceVehicles: vehicles.filter((vehicle) => vehicle.status === 'maintenance').length,
    totalBookings: bookings.length,
    activeBookings: activeBookings.length,
    reservedBookings: reservedBookings.length,
    returnedBookings: returnedBookings.length,
    cancelledBookings: cancelledBookings.length,
    totalCustomers: customers.length,
    dueCustomers: customerRows.filter((customer) => customer.due > 0).length,
    totalRevenue,
    bookingRevenue,
    paidAmount,
    outstandingDues,
    grossCollected: finance.grossCollected,
    totalRefunds: finance.totalRefunds,
    cancelledRefunds: finance.cancelledRefunds,
    cancelledBookingValue: finance.cancelledBookingValue,
    cancelledPaidAmount: finance.cancelledPaidAmount,
    securityDeposits,
    driverCharges,
    utilization: vehicles.length ? Math.round(((activeBookings.length + reservedBookings.length) / vehicles.length) * 100) : 0,
    methodRows,
    vehicleRows,
    customerRows,
    bookingRows: bookings,
    paymentRows: payments,
    activePaymentRows: finance.activePayments,
    refundRows,
    cancelledRows,
  }
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
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white text-slate-500">
            <tr>
              {columns.map(([label]) => <th key={label} className="border-b border-slate-200 px-3 py-2 font-black uppercase tracking-[0.12em]">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={row.id || row.bookingNumber || row.name || index} className="border-b border-slate-100 last:border-0">
                {columns.map(([label, render]) => <td key={label} className="px-3 py-2 font-semibold text-slate-700">{render(row)}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="px-3 py-4 text-center font-semibold text-slate-400">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Route by business type: WhatsApp CRM gets dedicated WhatsApp-only reports;
// Sales Hub gets enterprise Sales Hub reports; every other business type keeps
// the existing generic workspace reports.
export default function ReportsPage() {
  const { businessType } = useUser()
  if (normalizeBusinessType(businessType) === 'WhatsApp CRM') {
    return <WhatsappReports />
  }
  if (normalizeBusinessType(businessType) === 'General CRM') {
    return <SalesHubReports />
  }
  if (normalizeBusinessType(businessType) === 'Restaurant POS') {
    return <RestaurantReports />
  }
  if (normalizeBusinessType(businessType) === 'School ERP') {
    return <Navigate to="/app/school-reports" replace />
  }
  if (normalizeBusinessType(businessType) === 'Transport / Rental') {
    return <TransportReports />
  }
  return <GenericReports />
}
