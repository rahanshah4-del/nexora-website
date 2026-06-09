import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import MaintenanceModal from '../components/property/MaintenanceModal.jsx'
import ConfirmDialog from '../components/property/ConfirmDialog.jsx'
import { useMaintenance } from '../hooks/useMaintenance.js'
import { useProducts } from '../hooks/useProducts.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { formatCompact, formatCurrency } from '../utils/format.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'
import { isMaintenanceOverdue, maintenanceStats } from '../lib/propertyCalculations.js'

const blankMaintenance = {
  title: '',
  category: 'General',
  propertyId: '',
  propertyName: '',
  unit: '',
  tenantId: '',
  tenantName: '',
  priority: 'Medium',
  status: 'Open',
  assignedTo: '',
  assigneeType: 'Staff',
  estimatedCost: '',
  actualCost: '',
  paidAmount: '',
  currency: 'PKR',
  dueDate: '',
  completionDate: '',
  notes: '',
  attachmentUrl: '',
  attachmentName: '',
}

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Completed', 'Cancelled', 'Overdue']

function priorityBadge(priority) {
  const value = String(priority || '').toLowerCase()
  if (value === 'urgent') return 'danger'
  if (value === 'high') return 'warning'
  if (value === 'low') return 'default'
  return 'info'
}

function statusBadge(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'success'
  if (value === 'in progress') return 'warning'
  if (value === 'cancelled') return 'default'
  return 'info'
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

const exportColumns = [
  { key: 'title', label: 'Title' },
  { key: 'propertyName', label: 'Property' },
  { key: 'unit', label: 'Unit' },
  { key: 'tenantName', label: 'Tenant' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'estimatedCost', label: 'Estimated' },
  { key: 'actualCost', label: 'Actual' },
  { key: 'paidAmount', label: 'Paid' },
  { key: 'balanceDue', label: 'Balance Due' },
  { key: 'currency', label: 'Currency' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'completionDate', label: 'Completion Date' },
]

export default function MaintenancePage() {
  const maintenanceApi = useMaintenance()
  const productsApi = useProducts()
  const customersApi = useCustomers({ limitCount: 100 })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankMaintenance)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => maintenanceStats(maintenanceApi.requests), [maintenanceApi.requests])

  const filteredRequests = useMemo(() => {
    const rows = maintenanceApi.requests
    if (filter === 'All') return rows
    if (filter === 'Overdue') return rows.filter((row) => isMaintenanceOverdue(row))
    return rows.filter((row) => row.status === filter)
  }, [filter, maintenanceApi.requests])

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function openCreate() {
    setEditing(null)
    setDraft(blankMaintenance)
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setDraft({
      ...blankMaintenance,
      ...row,
      estimatedCost: row.estimatedCost ? String(row.estimatedCost) : '',
      actualCost: row.actualCost ? String(row.actualCost) : '',
      paidAmount: row.paidAmount ? String(row.paidAmount) : '',
    })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing
      ? await maintenanceApi.updateRequest(editing.id, draft)
      : await maintenanceApi.createRequest(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Request updated' : 'Request added')
      setModalOpen(false)
      setEditing(null)
      setDraft(blankMaintenance)
    } else {
      showToast('error', res?.error || 'Unable to save request', 2600)
    }
  }

  async function quickStatus(row, status) {
    setBusy(true)
    const res = await maintenanceApi.setStatus(row, status)
    setBusy(false)
    showToast(res?.ok ? 'success' : 'error', res?.ok ? `Marked ${status}` : res?.error || 'Unable to update', 2200)
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setBusy(true)
    const res = await maintenanceApi.setStatus(cancelTarget, 'Cancelled')
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Request cancelled')
      setCancelTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to cancel request', 2600)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await maintenanceApi.deleteRequest(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Request deleted')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete request', 2600)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Request',
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-950 dark:text-white">{row.title}</p>
            <p className="text-xs text-slate-500">
              {row.propertyName || '—'}
              {row.unit ? ` · ${row.unit}` : ''}
            </p>
          </div>
        ),
      },
      { key: 'tenantName', header: 'Tenant', cell: (row) => row.tenantName || '—' },
      { key: 'priority', header: 'Priority', cell: (row) => <Badge variant={priorityBadge(row.priority)}>{row.priority}</Badge> },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant={statusBadge(row.status)}>{row.status}</Badge>
            {isMaintenanceOverdue(row) ? <Badge variant="danger">Overdue</Badge> : null}
          </div>
        ),
      },
      { key: 'assignedTo', header: 'Assigned', cell: (row) => (row.assignedTo ? `${row.assignedTo}` : '—') },
      { key: 'actualCost', header: 'Actual', cell: (row) => formatCurrency(row.actualCost, row.currency) },
      { key: 'balanceDue', header: 'Balance', cell: (row) => <span className="font-semibold">{formatCurrency(row.balanceDue, row.currency)}</span> },
      {
        key: 'dueDate',
        header: 'Due',
        cell: (row) => (
          <span className={isMaintenanceOverdue(row) ? 'font-semibold text-rose-600' : ''}>{formatDate(row.dueDate)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => openEdit(row)}>
              Edit
            </Button>
            {row.status !== 'Completed' && row.status !== 'Cancelled' ? (
              <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs text-emerald-700" type="button" disabled={busy} onClick={() => quickStatus(row, 'Completed')}>
                Complete
              </Button>
            ) : null}
            {row.status !== 'Cancelled' && row.status !== 'Completed' ? (
              <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs text-amber-700" type="button" onClick={() => setCancelTarget(row)}>
                Cancel
              </Button>
            ) : null}
            <Button
              variant="subtle"
              className="h-8 rounded-xl border-rose-200 px-2.5 text-xs text-rose-700 hover:border-rose-300"
              type="button"
              onClick={() => setDeleteTarget(row)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="Maintenance"
        subtitle="Log, assign, and track property maintenance and repair costs."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf('nexora-maintenance.pdf', exportColumns, maintenanceApi.requests, 'Maintenance')}>
              Export PDF
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-maintenance.xls', exportColumns, maintenanceApi.requests)}>
              Excel
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-maintenance.csv', exportColumns, maintenanceApi.requests)}>
              CSV
            </Button>
            <Button className="rounded-2xl" type="button" onClick={openCreate}>
              <HiOutlinePlus className="h-4 w-4" /> Add request
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Open Requests</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(stats.pending)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCompact(stats.completed)} completed</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><HiOutlineWrenchScrewdriver className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Overdue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(stats.overdue)}</p>
              <p className="mt-1 text-xs text-slate-500">Past due date, still open</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"><HiOutlineExclamationTriangle className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Cost</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.pendingCost, 'PKR')}</p>
              <p className="mt-1 text-xs text-slate-500">Unpaid balance on open jobs</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><HiOutlineCurrencyDollar className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">This Month Cost</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.monthlyCost, 'PKR')}</p>
              <p className="mt-1 text-xs text-slate-500">Recorded this month</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700"><HiOutlineClipboardDocumentList className="h-5 w-5" /></span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Maintenance history</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">All logged requests for this workspace.</p>
            </div>
            <div className="w-40">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {STATUS_FILTERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4">
            {maintenanceApi.loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading maintenance...</div>
            ) : maintenanceApi.error ? (
              <EmptyState title="Couldn't load maintenance" description={maintenanceApi.error} />
            ) : filteredRequests.length ? (
              <Table columns={columns} rows={filteredRequests} />
            ) : maintenanceApi.requests.length ? (
              <EmptyState title="No matching requests" description="Try a different status filter." />
            ) : (
              <EmptyState title="No maintenance requests yet" description="Log your first request to start tracking repairs and costs." actionLabel="Add request" onAction={openCreate} />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Vendor / staff costs</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Actual cost tracked per assignee.</p>
          <div className="mt-4 space-y-2">
            {stats.byAssignee.length ? (
              stats.byAssignee.slice(0, 8).map((row) => (
                <div key={row.assignee} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{row.assignee}</p>
                    <p className="text-xs text-slate-500">{row.assigneeType} · {formatCompact(row.jobs)} job(s)</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(row.actualCost, 'PKR')}</span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-6 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5">
                Assign requests to staff or vendors to see cost tracking here.
              </p>
            )}
          </div>
        </Card>
      </div>

      <MaintenanceModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onSubmit={submit}
        onClose={() => setModalOpen(false)}
        properties={productsApi.products}
        tenants={customersApi.customers}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        tone="warning"
        badge="Cancel request"
        title="Cancel this maintenance request?"
        message={cancelTarget ? `${cancelTarget.title} will be marked Cancelled. You can still edit or delete it later.` : ''}
        confirmLabel="Cancel request"
        cancelLabel="Keep open"
        busy={busy}
        onConfirm={confirmCancel}
        onClose={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        badge="Delete request"
        title="Delete this maintenance request?"
        message={deleteTarget ? `${deleteTarget.title} will be permanently removed from this workspace.` : ''}
        confirmLabel="Delete request"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
