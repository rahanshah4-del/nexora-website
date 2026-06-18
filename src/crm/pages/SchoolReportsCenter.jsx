import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HiOutlineDocumentArrowDown,
  HiOutlinePrinter,
  HiOutlineEnvelope,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa'
import useAuth from '../../context/useAuth.js'
import { useUser } from '../hooks/useUser.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { formatCurrency } from '../utils/format.js'
import {
  SCHOOL_REPORT_DEFS,
  buildSchoolReport,
  deriveClassOptions,
  deriveStudentOptions,
} from '../lib/schoolReports.js'
import { SCHOOL_PDF_TEMPLATES, generateSchoolReportPdf } from '../lib/schoolReportPdf.js'

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

export default function SchoolReportsCenter() {
  const { user } = useAuth()
  const { businessType, workspaceId, userDoc } = useUser()
  const businessSettingsApi = useBusinessSettings()
  const settings = businessSettingsApi.settings || {}
  const invoicesApi = useInvoices({ limitCount: 500 })
  const expensesApi = useExpenses({ limitCount: 500 })
  const customersApi = useCustomers({ limitCount: 500 })
  const teamApi = useTeamMembers()

  const currency = settings.currency || userDoc?.currency || 'PKR'
  const workspaceName =
    settings.companyName || settings.schoolName || userDoc?.companyName || userDoc?.workspaceName || userDoc?.fullName || 'Nexora School'

  const [reportKey, setReportKey] = useState('fee_collection')
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
  const reportIdRef = useRef(genId())

  const fees = invoicesApi.invoices || []
  const payments = invoicesApi.payments || []
  const expenses = expensesApi.expenses || []
  const students = customersApi.customers || []
  const staff = teamApi.members || []

  const dateWindow = useMemo(() => resolveWindow(rangeKey, customStart, customEnd), [rangeKey, customStart, customEnd])
  const classOptions = useMemo(() => deriveClassOptions({ students, fees }), [students, fees])
  const studentOptions = useMemo(() => deriveStudentOptions({ students }), [students])

  const report = useMemo(
    () =>
      buildSchoolReport(reportKey, {
        fees,
        payments,
        expenses,
        students,
        staff,
        studentAttendance: [],
        staffAttendance: [],
        dateWindow,
        classFilter,
        studentFilter,
        approvedOnly,
        currency,
      }),
    [reportKey, fees, payments, expenses, students, staff, dateWindow, classFilter, studentFilter, approvedOnly, currency],
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

  const validationPass = report.amountKey
    ? Math.round(pdfTotal) === Math.round(report.calculatedTotal)
    : pdfTotal === report.sourceCount

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

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{toast}</div>
      ) : null}

      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100">School ERP</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Reports Center</h1>
        <p className="mt-1 text-sm text-indigo-100">Real PDF reports · multiple templates · validated totals.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Report list */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Reports</p>
            <div className="space-y-3">
              {grouped.map(([group, defs]) => (
                <div key={group}>
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</p>
                  <div className="mt-1 space-y-0.5">
                    {defs.map((def) => (
                      <button
                        key={def.key}
                        type="button"
                        onClick={() => setReportKey(def.key)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition ${
                          reportKey === def.key ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {def.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="space-y-5">
          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <HiOutlineAdjustmentsHorizontal className="h-5 w-5 text-indigo-600" /> Filters
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block text-xs font-semibold text-slate-600">
                Date range
                <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] font-medium text-slate-800 outline-none focus:border-indigo-400">
                  {RANGE_PRESETS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </label>
              {rangeKey === 'custom' ? (
                <>
                  <label className="block text-xs font-semibold text-slate-600">
                    From
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-indigo-400" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    To
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] text-slate-800 outline-none focus:border-indigo-400" />
                  </label>
                </>
              ) : null}
              <label className="block text-xs font-semibold text-slate-600">
                Class
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] font-medium text-slate-800 outline-none focus:border-indigo-400">
                  {classOptions.map((c) => <option key={c} value={c}>{c === 'All' ? 'All classes' : c}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Student
                <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] font-medium text-slate-800 outline-none focus:border-indigo-400">
                  {studentOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All students' : s}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* Approved toggle */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] font-bold">
                <button type="button" onClick={() => setApprovedOnly(true)} className={`rounded-md px-3 py-1.5 transition ${approvedOnly ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>Approved Only</button>
                <button type="button" onClick={() => setApprovedOnly(false)} className={`rounded-md px-3 py-1.5 transition ${!approvedOnly ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>All Records</button>
              </div>
              {/* Template selector */}
              <div className="inline-flex flex-wrap gap-1.5">
                {SCHOOL_PDF_TEMPLATES.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTemplate(t.key)} className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition ${template === t.key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>

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

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
              <HiOutlineDocumentArrowDown className="h-5 w-5" /> Export PDF
            </button>
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <HiOutlinePrinter className="h-5 w-5" /> Print
            </button>
            <button type="button" onClick={() => shareDoc('email')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <HiOutlineEnvelope className="h-5 w-5" /> Email
            </button>
            <button type="button" onClick={() => shareDoc('whatsapp')} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-100">
              <FaWhatsapp className="h-5 w-5" /> WhatsApp
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-sm font-bold text-slate-700">{report.title} — Preview</p>
              <p className="text-xs text-slate-400">{building ? 'Rendering…' : `${SCHOOL_PDF_TEMPLATES.find((t) => t.key === template)?.label}`}</p>
            </div>
            {loading ? (
              <div className="grid h-[60vh] place-items-center text-sm text-slate-400">Loading workspace data…</div>
            ) : previewUrl ? (
              <iframe title="report-preview" src={previewUrl} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50" />
            ) : (
              <div className="grid h-[60vh] place-items-center text-sm text-slate-400">Building preview…</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
