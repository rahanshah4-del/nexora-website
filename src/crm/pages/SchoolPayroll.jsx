import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineCheckBadge,
  HiOutlineDocumentChartBar,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useSchoolPayroll, calculateSalaryPayment } from '../hooks/useSchoolPayroll.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { useUser } from '../hooks/useUser.js'
import { formatCurrency } from '../utils/format.js'

function currentMonthInput() {
  return new Date().toISOString().slice(0, 7)
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function statusBadge(row = {}) {
  const value = String(row.approvalStatus || row.status || 'pending').toLowerCase()
  if (value === 'approved' || value === 'paid') return { label: 'Approved / Paid', variant: 'success' }
  if (value === 'rejected') return { label: 'Rejected', variant: 'danger' }
  return { label: 'Pending Approval', variant: 'warning' }
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function printSalarySlip(payment, currency, workspaceName = 'Nexora School') {
  const win = window.open('', '_blank', 'width=760,height=860')
  if (!win) return false
  const rows = [
    ['Status', statusBadge(payment).label],
    ['Staff', payment.staffName],
    ['Role', payment.role],
    ['Salary Month', payment.salaryMonth],
    ['Payment Date', payment.paymentDate],
    ['Base Salary', formatCurrency(payment.baseSalary, currency)],
    ['Allowance', formatCurrency(payment.allowance, currency)],
    ['Bonus', formatCurrency(payment.bonus, currency)],
    ['Deduction', formatCurrency(payment.deduction, currency)],
    ['Net Pay', formatCurrency(payment.netPay ?? payment.amount, currency)],
    ['Method', payment.paymentMethod],
    ['Reference', payment.transactionRef || '-'],
    ['Remarks', payment.remarks || '-'],
  ]
  win.document.write(`<!doctype html><html><head><title>Salary Slip</title><style>
    body{font-family:Inter,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
    .slip{max-width:680px;margin:28px auto;background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:28px;box-shadow:0 24px 70px rgba(15,23,42,.12)}
    .top{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:18px}
    .badge{display:inline-block;border-radius:999px;background:#dcfce7;color:#047857;padding:7px 12px;font-weight:800;font-size:12px}
    h1{margin:8px 0 0;font-size:28px}.muted{color:#64748b}
    table{width:100%;border-collapse:collapse;margin-top:22px}td{padding:12px;border-bottom:1px solid #eef2f7;font-size:14px}
    td:first-child{font-weight:800;color:#475569;width:38%}td:last-child{text-align:right;font-weight:800}.total td{font-size:18px;background:#f8fafc;color:#020617}
    @media print{body{background:#fff}.slip{box-shadow:none;margin:0;border:0;border-radius:0}}
  </style></head><body><main class="slip">
    <div class="top"><div><span class="badge">${escapeHtml(statusBadge(payment).label)}</span><h1>Salary Slip</h1><p class="muted">${escapeHtml(workspaceName)}</p></div><p class="muted">${escapeHtml(payment.id || '')}</p></div>
    <table>${rows.map(([label, value]) => `<tr class="${label === 'Net Pay' ? 'total' : ''}"><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table>
  </main><script>window.onload=()=>window.print()</script></body></html>`)
  win.document.close()
  return true
}

function whatsappShare(row, currency, workspaceName) {
  const text = [
    `${workspaceName} Salary Transaction`,
    `Staff: ${row.staffName || 'Staff'}`,
    `Month: ${row.salaryMonth || '-'}`,
    `Net Pay: ${formatCurrency(row.netPay ?? row.amount, currency)}`,
    `Status: ${statusBadge(row).label}`,
  ].join('\n')
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

function StatCard({ icon: Icon, label, value, helper, tone }) {
  return (
    <Card className={`border bg-gradient-to-br p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </Card>
  )
}

export default function SchoolPayrollPage() {
  const { userDoc, workspaceDoc } = useUser()
  const teamApi = useTeamMembers()
  const settingsApi = useBusinessSettings()
  const members = teamApi.members || []
  const payroll = useSchoolPayroll({ members })
  const settings = settingsApi.settings || {}
  const currency = settings.currency || userDoc?.currency || workspaceDoc?.currency || 'PKR'
  const workspaceName = settings.schoolName || settings.companyName || workspaceDoc?.schoolName || userDoc?.companyName || 'Nexora School'
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [profile, setProfile] = useState({ salary: '', salaryType: 'monthly', salaryStatus: 'active', department: '', designation: '', salaryNotes: '' })
  const [payment, setPayment] = useState({
    salaryMonth: currentMonthInput(),
    paymentDate: todayInput(),
    baseSalary: '',
    allowance: '',
    bonus: '',
    deduction: '',
    paymentMethod: 'Cash',
    transactionRef: '',
    remarks: '',
  })

  const activeMembers = useMemo(() => members.filter((member) => String(member.status || '').toLowerCase() !== 'blocked'), [members])
  const selectedMember = activeMembers.find((member) => member.id === selectedId) || activeMembers[0] || {}

  useEffect(() => {
    if (!selectedId && activeMembers[0]?.id) setSelectedId(activeMembers[0].id)
  }, [activeMembers, selectedId])

  useEffect(() => {
    if (!selectedMember?.id || editing) return
    const baseSalary = payroll.salaryOf(selectedMember)
    setProfile({
      salary: baseSalary ? String(baseSalary) : '',
      salaryType: selectedMember.salaryType || 'monthly',
      salaryStatus: selectedMember.salaryStatus || 'active',
      department: selectedMember.department || '',
      designation: selectedMember.designation || selectedMember.role || '',
      salaryNotes: selectedMember.salaryNotes || '',
    })
    setPayment((current) => ({ ...current, baseSalary: baseSalary ? String(baseSalary) : '' }))
  }, [editing, payroll, selectedMember])

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return payroll.payments
    return payroll.payments.filter((row) =>
      [row.staffName, row.role, row.salaryMonth, row.paymentMethod, row.approvalStatus, row.status, row.transactionRef, row.remarks].some((value) =>
        String(value || '').toLowerCase().includes(q),
      ),
    )
  }, [payroll.payments, search])

  const stats = useMemo(() => {
    const approved = payroll.payments.filter((row) => ['approved', 'paid'].includes(String(row.approvalStatus || row.status || '').toLowerCase()))
    const pending = payroll.payments.filter((row) => String(row.approvalStatus || row.status || 'pending').toLowerCase() === 'pending')
    const rejected = payroll.payments.filter((row) => String(row.approvalStatus || row.status || '').toLowerCase() === 'rejected')
    return {
      approvedTotal: approved.reduce((sum, row) => sum + Number(row.netPay || row.amount || 0), 0),
      pendingTotal: pending.reduce((sum, row) => sum + Number(row.netPay || row.amount || 0), 0),
      pendingCount: pending.length,
      rejectedCount: rejected.length,
    }
  }, [payroll.payments])

  const calculation = calculateSalaryPayment(payment)

  function showToast(tone, message, delay = 2400) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function loadEdit(row) {
    setEditing(row)
    setSelectedId(row.staffId || '')
    setPayment({
      salaryMonth: row.salaryMonth || currentMonthInput(),
      paymentDate: row.paymentDate || todayInput(),
      baseSalary: String(row.baseSalary || ''),
      allowance: String(row.allowance || ''),
      bonus: String(row.bonus || ''),
      deduction: String(row.deduction || ''),
      paymentMethod: row.paymentMethod || 'Cash',
      transactionRef: row.transactionRef || '',
      remarks: row.remarks || '',
    })
  }

  async function saveProfile() {
    setBusy(true)
    const res = await payroll.saveSalaryProfile(selectedMember.id, profile)
    setBusy(false)
    if (res.ok) showToast('success', 'Salary profile saved')
    else showToast('error', res.error || 'Unable to save salary profile')
  }

  async function submitPayment() {
    setBusy(true)
    const res = editing
      ? await payroll.updateSalaryPayment(editing.id, payment)
      : await payroll.recordSalaryPayment({ ...payment, staffId: selectedMember.id })
    setBusy(false)
    if (res.ok) {
      showToast('success', editing ? 'Salary request updated' : 'Salary sent to approval center')
      setEditing(null)
      setPayment((current) => ({ ...current, bonus: '', deduction: '', transactionRef: '', remarks: '' }))
    } else {
      showToast('error', res.error || 'Unable to save salary payment')
    }
  }

  async function deletePayment(row) {
    if (!window.confirm(`Delete salary request for ${row.staffName || 'staff'}?`)) return
    setBusy(true)
    const res = await payroll.deleteSalaryPayment(row)
    setBusy(false)
    if (res.ok) showToast('success', 'Salary request deleted')
    else showToast('error', res.error || 'Unable to delete salary request')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4 pb-24">
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Salary / Payroll"
        subtitle="Teacher and staff salary profiles, approval-based payroll transactions, reports, print, and WhatsApp sharing."
        right={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/approvals" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300">
              Approval Center
            </Link>
            <Link to="/app/school-reports?report=salary" className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700">
              <HiOutlineDocumentChartBar className="h-4 w-4" /> Salary Report
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HiOutlineUserGroup} label="Staff with salary" value={payroll.staffWithSalary.length} helper={`${members.length} total staff`} tone="from-sky-50 to-white border-sky-100 text-sky-700" />
        <StatCard icon={HiOutlineBanknotes} label="Monthly payroll" value={formatCurrency(payroll.monthlyPayroll, currency)} helper="salary profile total" tone="from-emerald-50 to-white border-emerald-100 text-emerald-700" />
        <StatCard icon={HiOutlineCalendarDays} label="Pending approval" value={formatCurrency(stats.pendingTotal, currency)} helper={`${stats.pendingCount} requests`} tone="from-amber-50 to-white border-amber-100 text-amber-700" />
        <StatCard icon={HiOutlineCheckBadge} label="Approved paid" value={formatCurrency(stats.approvedTotal, currency)} helper={`${stats.rejectedCount} rejected`} tone="from-violet-50 to-white border-violet-100 text-violet-700" />
      </div>

      {!activeMembers.length ? (
        <EmptyState title="No teacher or staff records yet" description="Add teachers and staff in Team Management, then payroll will become active here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">Salary profile</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Default salary data for teacher/staff.</p>
                </div>
                <Badge variant="info">Profile</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                <Field label="Teacher / Staff">
                  <Select value={selectedMember.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
                    {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>)}
                  </Select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monthly salary">
                    <Input type="number" min="0" value={profile.salary} onChange={(event) => setProfile((current) => ({ ...current, salary: event.target.value }))} />
                  </Field>
                  <Field label="Salary type">
                    <Select value={profile.salaryType} onChange={(event) => setProfile((current) => ({ ...current, salaryType: event.target.value }))}>
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Department">
                    <Input value={profile.department} onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))} />
                  </Field>
                  <Field label="Designation">
                    <Input value={profile.designation} onChange={(event) => setProfile((current) => ({ ...current, designation: event.target.value }))} />
                  </Field>
                </div>
                <Field label="Notes">
                  <Input value={profile.salaryNotes} onChange={(event) => setProfile((current) => ({ ...current, salaryNotes: event.target.value }))} />
                </Field>
                <Button type="button" className="rounded-2xl" disabled={busy} onClick={saveProfile}>Save Salary Profile</Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{editing ? 'Edit salary request' : 'New salary request'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">New requests go to Approval Center before becoming paid.</p>
                </div>
                <Badge variant="success">{formatCurrency(calculation.netPay, currency)}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Month">
                    <Input type="month" value={payment.salaryMonth} onChange={(event) => setPayment((current) => ({ ...current, salaryMonth: event.target.value }))} />
                  </Field>
                  <Field label="Payment date">
                    <Input type="date" value={payment.paymentDate} onChange={(event) => setPayment((current) => ({ ...current, paymentDate: event.target.value }))} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Base">
                    <Input type="number" min="0" value={payment.baseSalary} onChange={(event) => setPayment((current) => ({ ...current, baseSalary: event.target.value }))} />
                  </Field>
                  <Field label="Method">
                    <Select value={payment.paymentMethod} onChange={(event) => setPayment((current) => ({ ...current, paymentMethod: event.target.value }))}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Allowance"><Input type="number" min="0" value={payment.allowance} onChange={(event) => setPayment((current) => ({ ...current, allowance: event.target.value }))} /></Field>
                  <Field label="Bonus"><Input type="number" min="0" value={payment.bonus} onChange={(event) => setPayment((current) => ({ ...current, bonus: event.target.value }))} /></Field>
                  <Field label="Deduction"><Input type="number" min="0" value={payment.deduction} onChange={(event) => setPayment((current) => ({ ...current, deduction: event.target.value }))} /></Field>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  Gross {formatCurrency(calculation.grossPay, currency)} · Deduction {formatCurrency(calculation.deduction, currency)} · Net {formatCurrency(calculation.netPay, currency)}
                </div>
                <Field label="Transaction reference"><Input value={payment.transactionRef} onChange={(event) => setPayment((current) => ({ ...current, transactionRef: event.target.value }))} /></Field>
                <Field label="Remarks"><Input value={payment.remarks} onChange={(event) => setPayment((current) => ({ ...current, remarks: event.target.value }))} /></Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={submitPayment}>
                    {busy ? 'Saving...' : editing ? 'Update Request' : 'Send To Approval'}
                  </Button>
                  {editing ? <Button type="button" variant="subtle" className="rounded-2xl" onClick={() => setEditing(null)}>Cancel Edit</Button> : null}
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">Payroll transactions</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Approved salary mirrors into Expenses as Salary category.</p>
              </div>
              <Badge variant={payroll.loading ? 'default' : 'success'}>{payroll.loading ? 'Loading...' : `${payroll.payments.length} records`}</Badge>
            </div>
            <div className="mt-4">
              <PageSearch value={search} onChange={setSearch} placeholder="Search salary transactions..." resultCount={filteredPayments.length} totalCount={payroll.payments.length} />
            </div>

            <div className="mt-4 overflow-x-auto">
              {filteredPayments.length ? (
                <table className="min-w-[62rem] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Deduction</th>
                      <th className="px-4 py-3">Net</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((row) => {
                      const badge = statusBadge(row)
                      const locked = ['approved', 'paid'].includes(String(row.approvalStatus || row.status || '').toLowerCase())
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-950">{row.staffName || 'Staff'}</p>
                            <p className="text-xs font-semibold text-slate-500">{row.role || row.paymentMethod || '-'}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.salaryMonth || '-'}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(row.grossPay ?? row.baseSalary, currency)}</td>
                          <td className="px-4 py-3 font-semibold text-rose-700">{formatCurrency(row.deduction, currency)}</td>
                          <td className="px-4 py-3 font-black text-emerald-700">{formatCurrency(row.netPay ?? row.amount, currency)}</td>
                          <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button type="button" variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => printSalarySlip(row, currency, workspaceName) || showToast('error', 'Allow pop-ups to print salary slip')}>
                                <HiOutlinePrinter className="h-4 w-4" /> Print
                              </Button>
                              <Button type="button" variant="subtle" className="h-8 rounded-xl px-3 text-xs text-emerald-700" onClick={() => whatsappShare(row, currency, workspaceName)}>
                                <FaWhatsapp className="h-4 w-4" /> WhatsApp
                              </Button>
                              <Button type="button" variant="subtle" className="h-8 rounded-xl px-3 text-xs" disabled={locked} onClick={() => loadEdit(row)}>
                                <HiOutlinePencilSquare className="h-4 w-4" /> Edit
                              </Button>
                              <Button type="button" variant="subtle" className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-700" disabled={locked} onClick={() => deletePayment(row)}>
                                <HiOutlineTrash className="h-4 w-4" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : payroll.loading ? (
                <div className="grid min-h-[16rem] place-items-center text-sm text-slate-600">Loading payroll...</div>
              ) : (
                <EmptyState title="No payroll transactions yet" description="Create a salary request and approve it from Approval Center." />
              )}
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
