import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import { useBulkFees } from '../hooks/useBulkFees.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useFeeStructure } from '../hooks/useFeeStructure.js'
import { useUser } from '../hooks/useUser.js'
import { BULK_STATUS_LABELS, currentFeeMonth, dueDateFor, monthLabel, planBulkFees } from '../lib/bulkFees.js'
import { FEE_FREQUENCIES, classNames } from '../lib/schoolFees.js'
import { todayInput } from '../lib/invoiceHelpers.js'
import { getActiveCurrencyCode } from '../lib/workspaceCurrency.js'
import { formatCurrency } from '../utils/format.js'

const STATUS_VARIANT = { ready: 'success', exists: 'info', 'no-structure': 'warning', inactive: 'default', 'nothing-due': 'default' }
const EXTRA_FREQUENCIES = FEE_FREQUENCIES.filter((f) => f.value !== 'monthly')
const ROW_LIMIT = 150

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

function Tile({ label, value, tone = 'slate' }) {
  const color = { slate: 'text-slate-950', green: 'text-emerald-700', amber: 'text-amber-700' }[tone]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

export default function FeeGeneratePage() {
  const navigate = useNavigate()
  const { userDoc, workspaceDoc } = useUser()
  const settings = useBusinessSettings().settings || {}
  const currency = settings.currency || userDoc?.currency || workspaceDoc?.currency || getActiveCurrencyCode()
  const money = (value) => formatCurrency(value, currency)

  const fees = useFeeStructure()
  const customersApi = useCustomers({ limitCount: 3000 })
  const students = useMemo(() => customersApi.customers || [], [customersApi.customers])
  const bulk = useBulkFees()

  const [month, setMonth] = useState(currentFeeMonth())
  const [klass, setKlass] = useState('')
  const [extras, setExtras] = useState([])
  const [issueDate, setIssueDate] = useState(todayInput())
  const [dueDay, setDueDay] = useState(10)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (tone, message) => { setToast({ tone, message }); window.setTimeout(() => setToast(null), 3200) }

  // Bills that already exist for the chosen month (so a student is never billed twice).
  const [monthData, setMonthData] = useState({ month: '', billedIds: new Set(), numbers: new Set(), error: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const { loadMonth } = bulk
  useEffect(() => {
    let cancelled = false
    loadMonth(month).then((res) => {
      if (!cancelled) setMonthData({ month, billedIds: res.billedIds || new Set(), numbers: res.numbers || new Set(), error: res.ok ? '' : res.error || '' })
    })
    return () => { cancelled = true }
  }, [loadMonth, month, refreshKey])
  const checking = monthData.month !== month

  const classes = useMemo(() => classNames(fees.structures, students), [fees.structures, students])
  const frequencies = useMemo(() => ['monthly', ...extras], [extras])
  const plan = useMemo(
    () => planBulkFees({
      students,
      structures: fees.structures,
      concessions: fees.concessions,
      classes: klass ? [klass] : null,
      frequencies,
      billedIds: monthData.billedIds,
    }),
    [fees.concessions, fees.structures, frequencies, klass, monthData.billedIds, students],
  )
  const { summary } = plan
  const skipped = summary.total - summary.ready
  const visibleRows = useMemo(
    () => plan.rows.filter((row) => (filter === 'all' ? true : filter === 'ready' ? row.status === 'ready' : row.status !== 'ready')),
    [filter, plan.rows],
  )
  const shownRows = showAll ? visibleRows : visibleRows.slice(0, ROW_LIMIT)

  const [progress, setProgress] = useState(null) // { done, total }
  const [result, setResult] = useState(null)
  const [undoing, setUndoing] = useState(false)
  const loading = fees.loading || customersApi.loading
  const busy = Boolean(progress)

  async function generate() {
    if (!summary.ready || busy) return
    const scope = klass || 'the whole school'
    const ok = await confirmAction({
      title: `Create ${summary.ready} fee bills?`,
      message: `${monthLabel(month)} bills for ${scope}, total ${money(summary.amount)}. ${summary.exists ? `${summary.exists} students who already have a bill are skipped. ` : ''}You can undo this right after.`,
      confirmLabel: `Create ${summary.ready} bills`,
    })
    if (!ok) return
    setResult(null)
    setProgress({ done: 0, total: summary.ready })
    const res = await bulk.generate(
      plan.rows,
      { month, issueDate, dueDate: dueDateFor(month, dueDay), currency, needsApproval, prefix: settings.invoicePrefix || 'FEE', takenNumbers: monthData.numbers },
      (done, total) => setProgress({ done, total }),
    )
    setProgress(null)
    setResult(res)
    setRefreshKey((k) => k + 1)
    if (res.ok && !res.failed?.length) say('success', `${res.created} fee bills created.`)
    else if (res.ok) say('error', `${res.created} bills created, ${res.failed.length} failed. Press Generate again to retry the missing ones.`)
    else say('error', res.error || 'Unable to create fee bills.')
  }

  async function undo() {
    if (!result?.batchId || undoing) return
    const ok = await confirmAction({
      title: 'Undo this batch?',
      message: `The ${result.created} bills just created will be deleted. Bills that already received a payment are kept.`,
      confirmLabel: 'Delete these bills',
    })
    if (!ok) return
    setUndoing(true)
    const res = await bulk.undoBatch(result.batchId)
    setUndoing(false)
    if (res.ok) {
      say('success', `${res.removed} bills deleted${res.kept ? `, ${res.kept} kept because they have payments` : ''}.`)
      setResult(null)
      setRefreshKey((k) => k + 1)
    } else say('error', res.error)
  }

  const noStructures = !loading && !fees.structures.length

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4 pb-28">
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Generate Fee Bills"
        subtitle="Pick the month, check the preview, and create every student's fee bill in one click. Amounts come from Fee Structure, with discounts already applied."
        right={(
          <>
            <Link to="/app/fee-structure" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fee Structure</Link>
            <Link to="/app/invoices" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fee Bills</Link>
          </>
        )}
      />

      {noStructures ? (
        <EmptyState title="Set class fees first" description="Fee bills use the fee of each class. Add them once in Fee Structure, then come back here." actionLabel="Open Fee Structure" onAction={() => navigate('/app/fee-structure')} />
      ) : (
        <>
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="1. Fee month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value || currentFeeMonth())} /></Field>
              <Field label="2. Who">
                <Select value={klass} onChange={(e) => { setKlass(e.target.value); setShowAll(false) }}>
                  <option value="">Whole school</option>
                  {classes.map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
              </Field>
              <Field label="Bill date"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
              <Field label="Due on day of month" hint={`Due date: ${dueDateFor(month, dueDay) || '-'}`}><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
              <span className="text-xs font-bold text-slate-600">3. Fees to include</span>
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked disabled /> Monthly fees</label>
              {EXTRA_FREQUENCIES.map((f) => (
                <label key={f.value} className="flex items-center gap-2">
                  <input type="checkbox" checked={extras.includes(f.value)} onChange={(e) => setExtras((cur) => (e.target.checked ? [...cur, f.value] : cur.filter((v) => v !== f.value)))} />
                  {f.label}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" className="mt-1" checked={needsApproval} onChange={(e) => setNeedsApproval(e.target.checked)} />
              <span>Send the bills to Approval Center first <span className="text-slate-400">(off: bills are issued straight away)</span></span>
            </label>
          </Card>

          {monthData.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{monthData.error} Duplicates cannot be ruled out, so generating is paused.</p> : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Bills to create" value={checking || loading ? '…' : summary.ready} tone="green" />
            <Tile label="Total amount" value={checking || loading ? '…' : money(summary.amount)} />
            <Tile label="Discounts given" value={checking || loading ? '…' : money(summary.discount)} />
            <Tile label="Skipped" value={checking || loading ? '…' : skipped} tone={skipped ? 'amber' : 'slate'} />
          </div>

          {summary.byClass.length > 1 ? (
            <Card className="p-4">
              <h2 className="text-sm font-black text-slate-950">By class</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {summary.byClass.map((row) => (
                  <button key={row.className} type="button" onClick={() => { setKlass(row.className === 'No class' ? '' : row.className); setShowAll(false) }} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span className="font-bold text-slate-800">{row.className}</span>
                    <span className="text-xs text-slate-500">{row.ready}/{row.students} bills · {money(row.amount)}</span>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950">Preview · {monthLabel(month)}</h2>
              <Select value={filter} onChange={(e) => { setFilter(e.target.value); setShowAll(false) }} aria-label="Filter preview" className="!w-auto">
                <option value="all">All students ({summary.total})</option>
                <option value="ready">Will be created ({summary.ready})</option>
                <option value="skipped">Skipped ({skipped})</option>
              </Select>
            </div>

            {loading || checking ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-500">Checking students and existing bills…</p>
            ) : !visibleRows.length ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-500">{summary.total ? 'Nothing to show for this filter.' : 'No students found. Add students first in Students/Parents.'}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Class</th>
                      <th className="py-2 pr-3 text-right">Fee</th><th className="py-2 pr-3 text-right">Discount</th><th className="py-2 pr-3 text-right">To pay</th><th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((row) => (
                      <tr key={row.student.id} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-3 font-semibold text-slate-900">{row.name}{row.student.admissionNo ? <span className="ml-1 text-xs font-normal text-slate-400">#{row.student.admissionNo}</span> : null}</td>
                        <td className="py-2 pr-3 text-slate-600">{row.className}{row.student.section ? ` - ${row.student.section}` : ''}</td>
                        <td className="py-2 pr-3 text-right text-slate-600">{row.gross ? money(row.gross) : '-'}</td>
                        <td className="py-2 pr-3 text-right text-emerald-700">{row.discount ? `-${money(row.discount)}` : '-'}</td>
                        <td className="py-2 pr-3 text-right font-black text-slate-950">{row.status === 'ready' ? money(row.total) : '-'}</td>
                        <td className="py-2">
                          <Badge variant={STATUS_VARIANT[row.status]}>{BULK_STATUS_LABELS[row.status]}</Badge>
                          {row.reason ? <span className="mt-0.5 block text-[11px] text-slate-400">{row.reason}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleRows.length > shownRows.length ? (
                  <div className="pt-3 text-center"><Button type="button" variant="subtle" className="rounded-xl" onClick={() => setShowAll(true)}>Show all {visibleRows.length} students</Button></div>
                ) : null}
              </div>
            )}
          </Card>

          {result ? (
            <Card className="border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-900">{result.ok ? `${result.created} fee bills created for ${monthLabel(month)} (${money(result.amount || 0)}).` : result.error}</p>
              {result.failed?.length ? (
                <div className="mt-2 text-xs text-rose-700">
                  <p className="font-bold">{result.failed.length} could not be saved. Press Generate again to retry only these:</p>
                  <p className="mt-1">{result.failed.slice(0, 8).map((f) => f.name).join(', ')}{result.failed.length > 8 ? '…' : ''}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/invoices" className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">View fee bills</Link>
                {result.ok && result.batchId ? <Button type="button" variant="subtle" className="rounded-xl" disabled={undoing} onClick={undo}>{undoing ? 'Deleting…' : 'Undo this batch'}</Button> : null}
              </div>
            </Card>
          ) : null}
        </>
      )}

      {!noStructures ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-[var(--sidebar-width,0px)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            {busy ? (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">Creating bills… {progress.done} of {progress.total}. Please keep this page open.</p>
                <ProgressBar value={(progress.done / Math.max(progress.total, 1)) * 100} tone="emerald" className="mt-2" />
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-600">{summary.ready ? `${summary.ready} bills · ${money(summary.amount)} · ${klass || 'whole school'} · ${monthLabel(month)}` : 'No bill to create for this selection.'}</p>
            )}
            {!busy ? (
              <Button type="button" onClick={generate} disabled={!summary.ready || checking || loading || Boolean(monthData.error) || !bulk.canGenerate} className="rounded-xl bg-emerald-600 px-6 hover:bg-emerald-700">
                Create {summary.ready || ''} fee bills
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
