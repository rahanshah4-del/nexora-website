import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  HiOutlineDocumentArrowDown,
  HiOutlinePrinter,
  HiOutlineEnvelope,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineFunnel,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa'
import useAuth from '../../context/useAuth.js'
import { useUser } from '../hooks/useUser.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { formatCurrency } from '../utils/format.js'
import { listenToWorkspaceCollection } from '../lib/firestore.js'
import { activeStudent } from '../lib/schoolDashboardCalculations.js'
import {
  SCHOOL_REPORT_DEFS,
  buildSchoolReport,
  deriveClassOptions,
  deriveStudentOptions,
} from '../lib/schoolReports.js'
import { SCHOOL_PDF_TEMPLATES, calculateSchoolReportPdfTotal, generateSchoolReportPdf } from '../lib/schoolReportPdf.js'
import { buildReportThermalText, directPrinterAvailable, printThermalText } from '../lib/printerService.js'

const RANGE_PRESETS = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
]

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function resolveWindow(rangeKey, customStart, customEnd) {
  const now = new Date()
  if (rangeKey === 'today') return { start: startOfToday(), end: endOfToday() }
  if (rangeKey === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday() }
  if (rangeKey === 'year') return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday() }
  if (rangeKey === 'custom') {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null
    return { start: start && !Number.isNaN(start.getTime()) ? start : null, end: end && !Number.isNaN(end.getTime()) ? end : null }
  }
  return null
}

function rangeLabel(rangeKey, customStart, customEnd) {
  if (rangeKey === 'custom' && (customStart || customEnd)) return `${customStart || '…'} → ${customEnd || '…'}`
  return RANGE_PRESETS.find((r) => r.key === rangeKey)?.label || 'All time'
}

function genId() {
  return `SR-${Date.now().toString(36).toUpperCase()}`
}

function validationPassFor(report, total) {
  return report.amountKey
    ? Math.round(Number(total || 0)) === Math.round(Number(report.calculatedTotal || 0))
    : Number(total || 0) === Number(report.sourceCount || 0)
}

const CATEGORY_STYLES = {
  Fees: {
    icon: HiOutlineBanknotes,
    tone: 'from-emerald-50 to-white border-emerald-100 text-emerald-700',
    button: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  Collection: {
    icon: HiOutlineChartBarSquare,
    tone: 'from-sky-50 to-white border-sky-100 text-sky-700',
    button: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  Finance: {
    icon: HiOutlineCurrencyDollar,
    tone: 'from-amber-50 to-white border-amber-100 text-amber-700',
    button: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  Students: {
    icon: HiOutlineAcademicCap,
    tone: 'from-violet-50 to-white border-violet-100 text-violet-700',
    button: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  Attendance: {
    icon: HiOutlineCalendarDays,
    tone: 'from-rose-50 to-white border-rose-100 text-rose-700',
    button: 'bg-rose-50 text-rose-700 border-rose-100',
  },
}

function safePercent(value, total) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(total || 1)) * 100)))
}

function sortNewestAttendance(rows = []) {
  return [...rows].sort((a, b) => {
    const aDate = toSortableTime(a.createdAt || a.punchTime || a.date)
    const bDate = toSortableTime(b.createdAt || b.punchTime || b.date)
    return bDate - aDate
  })
}

function toSortableTime(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export default function SchoolReportsCenter() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { businessType, workspaceId, userDoc } = useUser()
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const invoicesApi = useInvoices({ limitCount: 500 })
  const expensesApi = useExpenses({ limitCount: 500 })
  const customersApi = useCustomers({ limitCount: 500 })

  const currency = settings.currency || userDoc?.currency || 'PKR'
  const workspaceName =
    settings.companyName || settings.schoolName || userDoc?.companyName || userDoc?.workspaceName || userDoc?.fullName || 'Nexora School'

  const requestedReportKey = searchParams.get('report')
  const [reportKey, setReportKey] = useState(() =>
    SCHOOL_REPORT_DEFS.some((def) => def.key === requestedReportKey) ? requestedReportKey : 'fee_collection',
  )
  const [template, setTemplate] = useState('modern')
  const [rangeKey, setRangeKey] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [studentFilter, setStudentFilter] = useState('All')
  const [approvedOnly, setApprovedOnly] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')
  const [pdfTotal, setPdfTotal] = useState(0)
  const [building, setBuilding] = useState(false)
  const [toast, setToast] = useState('')
  const [studentAttendance, setStudentAttendance] = useState([])
  const [staffAttendance, setStaffAttendance] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [payrollMembers, setPayrollMembers] = useState([])
  const [attendanceError, setAttendanceError] = useState('')
  const reportIdRef = useRef(genId())

  const fees = invoicesApi.invoices || []
  const payments = invoicesApi.payments || []
  const expenses = expensesApi.expenses || []
  const students = customersApi.customers || []
  const staff = payrollMembers

  const dateWindow = useMemo(() => resolveWindow(rangeKey, customStart, customEnd), [rangeKey, customStart, customEnd])
  const classOptions = useMemo(() => deriveClassOptions({ students, fees }), [students, fees])
  const studentOptions = useMemo(() => deriveStudentOptions({ students }), [students])

  useEffect(() => {
    if (SCHOOL_REPORT_DEFS.some((def) => def.key === requestedReportKey)) {
      setReportKey(requestedReportKey)
    }
  }, [requestedReportKey])

  useEffect(() => {
    if (!workspaceId) {
      setStudentAttendance([])
      setStaffAttendance([])
      setSalaryPayments([])
      setPayrollMembers([])
      setAttendanceError('')
      return undefined
    }
    const common = { workspaceId, businessType, orderByField: null, limitCount: 500 }
    const unsubs = [
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'studentAttendance',
        onData: (rows) => {
          setStudentAttendance(sortNewestAttendance(rows))
          setAttendanceError('')
        },
        onError: (error) => {
          console.warn('[School Reports] student attendance load failed', error)
          setStudentAttendance([])
          setAttendanceError('Attendance records could not be loaded.')
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'staffAttendance',
        onData: (rows) => {
          setStaffAttendance(sortNewestAttendance(rows))
          setAttendanceError('')
        },
        onError: (error) => {
          console.warn('[School Reports] staff attendance load failed', error)
          setStaffAttendance([])
          setAttendanceError('Attendance records could not be loaded.')
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'payrollMembers',
        onData: (rows) => {
          setPayrollMembers(rows)
        },
        onError: (error) => {
          console.warn('[School Reports] payroll members load failed', error)
          setPayrollMembers([])
        },
      }),
      listenToWorkspaceCollection({
        ...common,
        collectionName: 'staffSalaryPayments',
        onData: (rows) => {
          setSalaryPayments(sortNewestAttendance(rows))
        },
        onError: (error) => {
          console.warn('[School Reports] salary payments load failed', error)
          setSalaryPayments([])
        },
      }),
    ]
    return () => unsubs.forEach((unsub) => unsub?.())
  }, [businessType, workspaceId])

  const report = useMemo(
    () =>
      buildSchoolReport(reportKey, {
        fees,
        payments,
        expenses,
        students,
        staff,
        studentAttendance,
        staffAttendance,
        salaryPayments,
        dateWindow,
        classFilter,
        studentFilter,
        approvedOnly,
        currency,
      }),
    [reportKey, fees, payments, expenses, students, staff, studentAttendance, staffAttendance, salaryPayments, dateWindow, classFilter, studentFilter, approvedOnly, currency],
  )

  const reportValidations = useMemo(
    () =>
      SCHOOL_REPORT_DEFS.map((def) => {
        const item = buildSchoolReport(def.key, {
          fees,
          payments,
          expenses,
          students,
          staff,
          studentAttendance,
          staffAttendance,
          salaryPayments,
          dateWindow,
          classFilter,
          studentFilter,
          approvedOnly,
          currency,
        })
        const total = calculateSchoolReportPdfTotal(item)
        return {
          ...def,
          report: item,
          pdfTotal: total,
          pass: validationPassFor(item, total),
        }
      }),
    [approvedOnly, classFilter, currency, dateWindow, expenses, fees, payments, salaryPayments, staff, staffAttendance, studentAttendance, studentFilter, students],
  )

  const meta = useMemo(
    () => ({
      workspaceName,
      businessType: businessType || 'School ERP',
      dateRange: rangeLabel(rangeKey, customStart, customEnd),
      generatedAt: new Date().toLocaleString(),
      generatedBy: userDoc?.fullName || user?.email || 'Owner',
      reportId: reportIdRef.current,
      currency,
      approvedOnly,
      footer: 'NEXORA SOLUTION — All rights reserved 2019-2026.',
    }),
    [workspaceName, businessType, rangeKey, customStart, customEnd, userDoc, user, currency, approvedOnly],
  )

  // Regenerate the PDF preview (real PDF in an iframe) whenever inputs change.
  useEffect(() => {
    let cancelled = false
    let url = ''
    setBuilding(true)
    reportIdRef.current = genId()
    generateSchoolReportPdf(report, { ...meta, reportId: reportIdRef.current }, template)
      .then(({ doc, pdfTotal: total }) => {
        if (cancelled) return
        url = doc.output('bloburl')
        setPreviewUrl(String(url))
        setPdfTotal(total)
      })
      .catch(() => {
        if (!cancelled) setToast('Could not build PDF preview.')
      })
      .finally(() => {
        if (!cancelled) setBuilding(false)
      })
    return () => {
      cancelled = true
      if (url) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* noop */
        }
      }
    }
    // meta is derived from the same inputs; depend on report+template+key fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, template, workspaceName, approvedOnly])

  const validationPass = validationPassFor(report, pdfTotal)
  const selectedValidation = reportValidations.find((item) => item.key === reportKey)
  const validationSummary = reportValidations.reduce(
    (summary, item) => ({
      total: summary.total + 1,
      passed: summary.passed + (item.pass ? 1 : 0),
      records: summary.records + Number(item.report.sourceCount || 0),
    }),
    { total: 0, passed: 0, records: 0 },
  )

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function buildDoc() {
    const id = genId()
    reportIdRef.current = id
    return generateSchoolReportPdf(report, { ...meta, reportId: id }, template)
  }

  async function handleExport() {
    const { doc, fileName } = await buildDoc()
    doc.save(fileName)
    showToast('PDF downloaded')
  }

  async function handlePrint() {
    const { doc } = await buildDoc()
    doc.autoPrint()
    const blobUrl = doc.output('bloburl')
    const win = window.open(blobUrl)
    if (!win) showToast('Allow pop-ups to print')
  }

  async function handleThermalPrint() {
    if (directPrinterAvailable(settings)) {
      const direct = await printThermalText(buildReportThermalText({ report, meta, currency }), settings)
      if (direct.ok) {
        showToast('Sent to connected 58mm printer')
        return
      }
      if (direct.error) showToast(`${direct.error} Using Chrome print.`)
    }
    const id = genId()
    reportIdRef.current = id
    const { doc } = await generateSchoolReportPdf(report, { ...meta, reportId: id }, 'thermal')
    doc.autoPrint()
    const blobUrl = doc.output('bloburl')
    const win = window.open(blobUrl)
    if (!win) showToast('Allow pop-ups to print 58mm thermal report')
  }

  async function shareDoc(channel) {
    const { doc, fileName } = await buildDoc()
    const text = `${report.title} — ${workspaceName}\n${report.totalLabel}: ${formatCurrency(report.calculatedTotal, currency)}\nRecords: ${report.sourceCount} | ${meta.dateRange}`
    const blob = doc.output('blob')
    const file = new File([blob], fileName, { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: report.title, text })
        return
      } catch {
        /* user cancelled — fall through to link */
      }
    }
    // Fallback: download the PDF and open the channel with a text summary.
    doc.save(fileName)
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(report.title)}&body=${encodeURIComponent(`${text}\n\n(PDF attached from your downloads)`)}`
    }
    showToast('PDF downloaded — attach it to your message')
  }

  const grouped = useMemo(() => {
    const map = new Map()
    SCHOOL_REPORT_DEFS.forEach((def) => {
      if (!map.has(def.group)) map.set(def.group, [])
      map.get(def.group).push(def)
    })
    return Array.from(map.entries())
  }, [])

  const loading = invoicesApi.loading || expensesApi.loading || customersApi.loading

  const reportByKey = useMemo(() => {
    const map = new Map()
    reportValidations.forEach((item) => map.set(item.key, item.report))
    return map
  }, [reportValidations])

  const feeCollectionTotal = reportByKey.get('fee_collection')?.calculatedTotal || 0
  const pendingFeeTotal = reportByKey.get('pending_fee')?.calculatedTotal || 0
  const monthlyRows = reportByKey.get('monthly_collection')?.rows || []
  const expenseRows = reportByKey.get('expense')?.rows || []
  const salaryPaidTotal = reportByKey.get('salary')?.calculatedTotal || 0
  const attendanceRows = reportByKey.get('student_attendance')?.rows || []
  const maxMonthlyAmount = Math.max(1, ...monthlyRows.map((row) => Number(row.amount || 0)))
  const presentCount = attendanceRows.filter((row) => String(row.status || '').toLowerCase().includes('present')).length
  const lateCount = attendanceRows.filter((row) => String(row.status || '').toLowerCase().includes('late')).length
  const absentCount = Math.max(0, attendanceRows.length - presentCount - lateCount)
  const attendancePercent = safePercent(presentCount, attendanceRows.length)
  const expenseTotal = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const statCards = [
    { label: 'Total Students', value: students.filter(activeStudent).length.toLocaleString(), meta: 'Active student records', icon: HiOutlineUserGroup, tone: 'from-violet-50 to-white border-violet-100 text-violet-700' },
    { label: 'Total Teachers', value: staff.length.toLocaleString(), meta: 'Staff & teacher records', icon: HiOutlineAcademicCap, tone: 'from-emerald-50 to-white border-emerald-100 text-emerald-700' },
    { label: 'Fee Collection', value: formatCurrency(feeCollectionTotal, currency), meta: `${reportByKey.get('fee_collection')?.sourceCount || 0} source records`, icon: HiOutlineBanknotes, tone: 'from-sky-50 to-white border-sky-100 text-sky-700' },
    { label: 'Salary Paid', value: formatCurrency(salaryPaidTotal, currency), meta: `${reportByKey.get('salary')?.sourceCount || 0} payroll records`, icon: HiOutlineCurrencyDollar, tone: 'from-amber-50 to-white border-amber-100 text-amber-700' },
  ]

  return (
    <div className="space-y-5 pb-24">
      {toast ? (
        <div className="fixed right-3 top-3 z-[110] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-xl sm:right-5 sm:top-5">✅ {toast}</div>
      ) : null}

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">Nexora School ERP</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Reports Center</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Advanced reports with real PDF preview, filters, WhatsApp sharing, print, and 58mm thermal output.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400">
              {RANGE_PRESETS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400">
              {SCHOOL_PDF_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button type="button" onClick={handleExport} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700">
              <HiOutlineDocumentArrowDown className="h-5 w-5" /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${card.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{card.meta}</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-950">Fee Collection Trend</h2>
            <span className="text-xs font-bold text-slate-400">Monthly</span>
          </div>
          <div className="mt-4 flex h-44 items-end gap-3 border-b border-slate-100 px-2 pb-2">
            {(monthlyRows.slice(-7).length ? monthlyRows.slice(-7) : [{ bucket: 'No data', amount: 0 }]).map((row) => (
              <div key={row.bucket} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-indigo-500/80"
                  style={{ height: `${Math.max(8, safePercent(row.amount, maxMonthlyAmount) * 1.45)}px` }}
                  title={formatCurrency(row.amount || 0, currency)}
                />
                <span className="max-w-full truncate text-[10px] font-bold text-slate-400">{row.bucket}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-950">Attendance Overview</h2>
            <span className="text-xs font-bold text-emerald-600">{attendancePercent}% Present</span>
          </div>
          <div className="mt-5 flex items-center justify-center gap-5">
            <div
              className="grid h-32 w-32 place-items-center rounded-full"
              style={{ background: `conic-gradient(#22c55e ${attendancePercent}%, #f59e0b ${attendancePercent}% ${attendancePercent + safePercent(lateCount, attendanceRows.length)}%, #f43f5e 0)` }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-2xl font-black text-slate-950">{attendancePercent}%</p>
                  <p className="text-[10px] font-bold text-slate-400">Average</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs font-bold text-slate-600">
              <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present ({presentCount})</p>
              <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Late ({lateCount})</p>
              <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent ({absentCount})</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-950">Expense Overview</h2>
            <span className="text-xs font-bold text-slate-400">{formatCurrency(expenseTotal, currency)}</span>
          </div>
          <div className="mt-4 space-y-3">
            {(expenseRows.slice(0, 5).length ? expenseRows.slice(0, 5) : [{ category: 'No expenses', amount: 0 }]).map((row) => (
              <div key={`${row.category}-${row.amount}`}>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{row.category}</span>
                  <span>{formatCurrency(row.amount || 0, currency)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${safePercent(row.amount, expenseTotal)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Report Categories</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Select any report, then preview, export, print, email, or share it.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{validationSummary.passed}/{validationSummary.total} validations passed</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {grouped.map(([group, defs]) => {
            const style = CATEGORY_STYLES[group] || CATEGORY_STYLES.Fees
            const Icon = style.icon
            return (
              <div key={group} className={`rounded-2xl border bg-gradient-to-br p-4 ${style.tone}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">{group} Reports</h3>
                    <p className="text-xs font-bold text-slate-400">{defs.length} reports</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  {defs.map((def) => (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => setReportKey(def.key)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-black transition ${
                        reportKey === def.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/70 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="truncate">{def.label}</span>
                      <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] ${reportValidations.find((item) => item.key === def.key)?.pass ? style.button : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                        {reportValidations.find((item) => item.key === def.key)?.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <HiOutlineFunnel className="h-5 w-5 text-indigo-600" /> Advanced Filters
            </div>
            <div className="mt-4 space-y-3">
              {rangeKey === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    From
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-indigo-400" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    To
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-indigo-400" />
                  </label>
                </div>
              ) : null}
              <label className="block text-xs font-semibold text-slate-600">
                Class
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400">
                  {classOptions.map((c) => <option key={c} value={c}>{c === 'All' ? 'All classes' : c}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Student
                <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400">
                  {studentOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All students' : s}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black">
                <button type="button" onClick={() => setApprovedOnly(true)} className={`rounded-lg px-2 py-2 transition ${approvedOnly ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}>Approved Only</button>
                <button type="button" onClick={() => setApprovedOnly(false)} className={`rounded-lg px-2 py-2 transition ${!approvedOnly ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>All Records</button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <HiOutlineClipboardDocumentList className="h-5 w-5 text-indigo-600" /> Template Selector
            </div>
            <div className="mt-3 grid gap-2">
              {SCHOOL_PDF_TEMPLATES.map((t) => (
                <button key={t.key} type="button" onClick={() => setTemplate(t.key)} className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black transition ${template === t.key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {attendanceError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{attendanceError}</div>
          ) : null}
        </aside>

        <section className="space-y-5">
          {attendanceError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{attendanceError}</div>
          ) : null}

          {/* Validation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-3 gap-4 text-center sm:gap-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source records</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{report.sourceCount}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Calculated total</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{report.amountKey ? formatCurrency(report.calculatedTotal, currency) : report.calculatedTotal}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">PDF total</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{report.amountKey ? formatCurrency(pdfTotal, currency) : pdfTotal}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${validationPass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {validationPass ? <HiOutlineCheckBadge className="h-5 w-5" /> : <HiOutlineExclamationTriangle className="h-5 w-5" />}
                {validationPass ? 'VALIDATION PASS' : 'VALIDATION FAIL'}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-sm font-bold text-slate-700">{report.title} — Preview</p>
              <p className="text-xs text-slate-400">
                {building ? 'Rendering…' : `${SCHOOL_PDF_TEMPLATES.find((t) => t.key === template)?.label} · ${selectedValidation?.pass ? 'PASS' : 'FAIL'}`}
              </p>
            </div>
            {loading ? (
              <div className="grid h-[60vh] place-items-center text-sm text-slate-400">Loading workspace data…</div>
            ) : previewUrl ? (
              <iframe title="report-preview" src={previewUrl} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50" />
            ) : (
              <div className="grid h-[60vh] place-items-center text-sm text-slate-400">Building preview…</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">All Report Validation</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Source count, calculated total, PDF total, and PASS/FAIL for every report.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${validationSummary.passed === validationSummary.total ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {validationSummary.passed === validationSummary.total ? 'ALL PASS' : 'CHECK FAILURES'}
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Report', 'Source records', 'Calculated total', 'PDF total', 'Validation'].map((label) => (
                      <th key={label} className="border-b border-slate-200 px-3 py-2 font-black uppercase tracking-[0.12em]">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportValidations.map((item) => (
                    <tr key={item.key} className={`border-b border-slate-100 last:border-0 ${item.key === reportKey ? 'bg-indigo-50/60' : ''}`}>
                      <td className="px-3 py-2 font-black text-slate-800" data-label="Report">{item.report.title}</td>
                      <td className="px-3 py-2 font-semibold text-slate-600" data-label="Source records">{item.report.sourceCount}</td>
                      <td className="px-3 py-2 font-semibold text-slate-600" data-label="Calculated total">{item.report.amountKey ? formatCurrency(item.report.calculatedTotal, currency) : item.report.calculatedTotal}</td>
                      <td className="px-3 py-2 font-semibold text-slate-600" data-label="PDF total">{item.report.amountKey ? formatCurrency(item.pdfTotal, currency) : item.pdfTotal}</td>
                      <td className="px-3 py-2" data-label="Validation">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ${item.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {item.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(980px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <button type="button" onClick={handleExport} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100">
            <HiOutlineDocumentArrowDown className="h-5 w-5" /> Export PDF
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100">
            <HiOutlinePrinter className="h-5 w-5" /> Print
          </button>
          <button type="button" onClick={handleThermalPrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100">
            <HiOutlinePrinter className="h-5 w-5" /> 58mm Thermal
          </button>
          <button type="button" onClick={() => shareDoc('email')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-black text-sky-700 transition hover:bg-sky-100">
            <HiOutlineEnvelope className="h-5 w-5" /> Email
          </button>
          <button type="button" onClick={() => shareDoc('whatsapp')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-black text-green-700 transition hover:bg-green-100">
            <FaWhatsapp className="h-5 w-5" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
