import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  HiOutlineArrowDownTray,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { supportedCurrencies } from '../data/currency.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useReports } from '../hooks/useReports.js'
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
import { convertFromUsd } from '../utils/currency.js'
import { formatCurrency } from '../utils/format.js'
import { buildReportId, exportReportCsv, exportReportExcel, exportReportPdf } from '../lib/reportGenerator.js'

const NEXORA_LOGO = '/nexora-logo.jpg'

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

function formatMoney(usdValue, currency) {
  return formatCurrency(convertFromUsd(safeNumber(usdValue), currency), currency)
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
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 132,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
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

export default function ReportsPage() {
  const reports = useReports()
  const { profile, currency: preferredCurrency } = usePreferences()
  const businessSettingsApi = useBusinessSettings()
  const { userDoc, firebaseUser, workspaceId, businessType, plan } = useUser()
  const [filters, setFilters] = useState({
    range: 'month',
    startDate: '',
    endDate: '',
    currency: preferredCurrency,
  })
  const [notice, setNotice] = useState('')

  const activeWindow = useMemo(() => dateWindow(filters), [filters])

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

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const activeBusinessType = normalizeBusinessType(businessType)
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
      businessType: activeBusinessType,
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
  }, [activeBusinessType, branding, businessSettingsApi.settings.reportPrefix, dateRangeLabel, filters.currency, reportData, reportTitle, workspaceId])

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
          <Badge variant="purple">Updated: {reports.lastUpdatedLabel}</Badge>
        </div>
      </div>

      <Card className="no-print p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto_auto] xl:items-end">
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
          <Button variant="subtle" className="h-10 rounded-2xl" type="button" onClick={() => window.print()}>
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

      <section className="printable-report space-y-5">
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
              <SummaryRow label="Support tickets" value={`${reportData.tickets.length} total / ${reportData.openTickets.length} open`} />
              <SummaryRow label="Follow-up completion" value={`${reportData.completedTasks.length} completed / ${reportData.tasks.length} tasks`} />
              <SummaryRow label="Activity events" value={String(reportData.activityLogs.length)} />
              <SummaryRow label="Team members" value={String(reportData.staff.length)} />
              <SummaryRow label="Sync status" value={reports.source === 'firestore' ? 'Live Sync' : 'No data yet'} />
            </div>
          </ReportSection>

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
        </div>

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
            <span>{branding.receiptFooter || 'Powered by Nexora Solutions'}</span>
            <span>Module: {activeBusinessType}</span>
            <span><HiOutlineCalendarDays className="mr-1 inline h-4 w-4" />{reportDate}</span>
            <span><HiOutlineBuildingOffice2 className="mr-1 inline h-4 w-4" />{branding.companyName}</span>
          </div>
        </Card>
      </section>
    </motion.div>
  )
}
