import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineDocumentCheck,
  HiOutlinePlus,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import ContractModal from '../components/property/ContractModal.jsx'
import ConfirmDialog from '../components/property/ConfirmDialog.jsx'
import { useContracts } from '../hooks/useContracts.js'
import { useProducts } from '../hooks/useProducts.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { formatCompact, formatCurrency } from '../utils/format.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'
import {
  contractDisplayStatus,
  contractDurationMonths,
  contractStats,
  daysUntilExpiry,
} from '../lib/propertyCalculations.js'

const blankContract = {
  reference: '',
  tenantId: '',
  tenantName: '',
  propertyId: '',
  propertyName: '',
  unit: '',
  startDate: '',
  endDate: '',
  monthlyRent: '',
  securityDeposit: '',
  advancePayment: '',
  paymentDueDay: '0',
  lateFeeType: 'None',
  lateFeeValue: '',
  gracePeriodDays: '',
  status: 'Draft',
  currency: 'PKR',
  notes: '',
  documentName: '',
  documentUrl: '',
  increasePercent: '',
}

const STATUS_FILTERS = ['All', 'Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated']

function statusBadge(displayStatus) {
  switch (displayStatus) {
    case 'Active':
      return 'success'
    case 'Expiring Soon':
      return 'warning'
    case 'Expired':
      return 'danger'
    case 'Draft':
      return 'info'
    default:
      return 'default'
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function expiryLabel(contract, displayStatus) {
  const days = daysUntilExpiry(contract.endDate)
  if (days === null) return ''
  if (displayStatus === 'Terminated') return 'Terminated'
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  return `in ${days}d`
}

function addMonthsISO(dateStr, months) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

const exportColumns = [
  { key: 'reference', label: 'Reference' },
  { key: 'tenantName', label: 'Tenant' },
  { key: 'propertyName', label: 'Property' },
  { key: 'unit', label: 'Unit' },
  { key: 'startDate', label: 'Start' },
  { key: 'endDate', label: 'End' },
  { key: 'durationMonths', label: 'Months' },
  { key: 'monthlyRent', label: 'Monthly Rent' },
  { key: 'totalContractValue', label: 'Total Value' },
  { key: 'securityDeposit', label: 'Deposit' },
  { key: 'advancePayment', label: 'Advance' },
  { key: 'currency', label: 'Currency' },
  { key: 'status', label: 'Status' },
]

export default function ContractsPage() {
  const contractsApi = useContracts()
  const productsApi = useProducts()
  const customersApi = useCustomers({ limitCount: 100 })

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('create')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankContract)
  const [terminateTarget, setTerminateTarget] = useState(null)
  const [terminateReason, setTerminateReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => contractStats(contractsApi.contracts), [contractsApi.contracts])

  const rows = useMemo(
    () => contractsApi.contracts.map((contract) => ({ ...contract, displayStatus: contractDisplayStatus(contract) })),
    [contractsApi.contracts],
  )

  const filteredRows = useMemo(() => {
    let list = filter === 'All' ? rows : rows.filter((row) => row.displayStatus === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((row) =>
        [row.tenantName, row.propertyName, row.unit, row.reference, row.displayStatus].some((value) =>
          String(value || '').toLowerCase().includes(q),
        ),
      )
    }
    return list
  }, [filter, search, rows])

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function openCreate() {
    setMode('create')
    setEditing(null)
    setDraft(blankContract)
    setModalOpen(true)
  }

  function fillDraftFromRow(row) {
    return {
      ...blankContract,
      ...row,
      monthlyRent: row.monthlyRent ? String(row.monthlyRent) : '',
      securityDeposit: row.securityDeposit ? String(row.securityDeposit) : '',
      advancePayment: row.advancePayment ? String(row.advancePayment) : '',
      paidAmount: row.paidAmount ? String(row.paidAmount) : '0',
      paymentDueDay: row.paymentDueDay ? String(row.paymentDueDay) : '0',
      lateFeeValue: row.lateFeeValue ? String(row.lateFeeValue) : '',
      gracePeriodDays: row.gracePeriodDays ? String(row.gracePeriodDays) : '',
      increasePercent: '',
    }
  }

  function openEdit(row) {
    setMode('edit')
    setEditing(row)
    setDraft(fillDraftFromRow(row))
    setModalOpen(true)
  }

  function openRenew(row) {
    setMode('renew')
    setEditing(row)
    const months = contractDurationMonths(row.startDate, row.endDate) || 12
    const newStart = row.endDate || new Date().toISOString().slice(0, 10)
    setDraft({
      ...fillDraftFromRow(row),
      status: 'Active',
      startDate: newStart,
      endDate: addMonthsISO(newStart, months),
      increasePercent: '',
    })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    let res
    if (mode === 'renew' && editing) res = await contractsApi.renewContract(editing.id, draft)
    else if (mode === 'edit' && editing) res = await contractsApi.updateContract(editing.id, draft)
    else res = await contractsApi.createContract(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', mode === 'renew' ? 'Lease renewed' : mode === 'edit' ? 'Lease updated' : 'Lease created')
      setModalOpen(false)
      setEditing(null)
      setDraft(blankContract)
    } else {
      showToast('error', res?.error || 'Unable to save lease', 2600)
    }
  }

  async function confirmTerminate() {
    if (!terminateTarget) return
    setBusy(true)
    const res = await contractsApi.terminateContract(terminateTarget, terminateReason)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Lease terminated')
      setTerminateTarget(null)
      setTerminateReason('')
    } else {
      showToast('error', res?.error || 'Unable to terminate lease', 2600)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await contractsApi.deleteContract(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Lease deleted')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete lease', 2600)
    }
  }

  const exportRows = useMemo(() => rows.map((row) => ({ ...row, status: row.displayStatus })), [rows])

  const columns = useMemo(
    () => [
      {
        key: 'tenantName',
        header: 'Tenant / Property',
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-950 dark:text-white">{row.tenantName || '—'}</p>
            <p className="text-xs text-slate-500">
              {row.propertyName || 'No property'}
              {row.unit ? ` · ${row.unit}` : ''}
              {row.reference ? ` · ${row.reference}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'term',
        header: 'Term',
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm text-slate-800 dark:text-slate-100">{formatDate(row.startDate)} → {formatDate(row.endDate)}</p>
            <p className="text-xs text-slate-500">{row.durationMonths} mo · {expiryLabel(row, row.displayStatus)}</p>
          </div>
        ),
      },
      { key: 'monthlyRent', header: 'Monthly Rent', cell: (row) => <span className="font-semibold">{formatCurrency(row.monthlyRent, row.currency)}</span> },
      { key: 'totalContractValue', header: 'Total Value', cell: (row) => formatCurrency(row.totalContractValue, row.currency) },
      { key: 'displayStatus', header: 'Status', cell: (row) => <Badge variant={statusBadge(row.displayStatus)}>{row.displayStatus}</Badge> },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => openEdit(row)}>
              Edit
            </Button>
            {row.displayStatus !== 'Terminated' ? (
              <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs text-sky-700" type="button" onClick={() => openRenew(row)}>
                Renew
              </Button>
            ) : null}
            {row.displayStatus !== 'Terminated' ? (
              <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs text-amber-700" type="button" onClick={() => { setTerminateTarget(row); setTerminateReason('') }}>
                Terminate
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
    [],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="Contracts & Leases"
        subtitle="Create, renew, and track tenancy agreements and rent value."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf('nexora-contracts.pdf', exportColumns, exportRows, 'Contracts')}>
              Export PDF
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-contracts.xls', exportColumns, exportRows)}>
              Excel
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-contracts.csv', exportColumns, exportRows)}>
              CSV
            </Button>
            <Button className="rounded-2xl" type="button" onClick={openCreate}>
              <HiOutlinePlus className="h-4 w-4" /> New lease
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active Contracts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(stats.active)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCompact(stats.draft)} draft · {formatCompact(stats.expired)} expired</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><HiOutlineDocumentCheck className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Expiring Soon</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(stats.expiringSoon)}</p>
              <p className="mt-1 text-xs text-slate-500">Within 30 days</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><HiOutlineCalendarDays className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Monthly Rent Expected</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.monthlyRentExpected, 'PKR')}</p>
              <p className="mt-1 text-xs text-slate-500">From active leases</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><HiOutlineBanknotes className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Contract Value</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.totalContractValue, 'PKR')}</p>
              <p className="mt-1 text-xs text-slate-500">Outstanding {formatCurrency(stats.outstandingTotal, 'PKR')}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700"><HiOutlineArrowPath className="h-5 w-5" /></span>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Contract history</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">All lease agreements for this workspace.</p>
          </div>
          <div className="flex w-full flex-wrap items-start gap-3 sm:w-auto">
            <PageSearch
              className="w-full sm:w-72"
              value={search}
              onChange={setSearch}
              placeholder="Search by tenant, property, unit..."
              resultCount={filteredRows.length}
              totalCount={rows.length}
            />
            <div className="w-44 shrink-0">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {STATUS_FILTERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {contractsApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading contracts...</div>
          ) : contractsApi.error ? (
            <EmptyState title="Couldn't load contracts" description={contractsApi.error} />
          ) : filteredRows.length ? (
            <Table columns={columns} rows={filteredRows} />
          ) : contractsApi.contracts.length ? (
            <EmptyState title="No matching contracts" description="Try a different status filter." />
          ) : (
            <EmptyState title="No contracts yet" description="Create your first lease agreement to track rent and renewals." actionLabel="New lease" onAction={openCreate} />
          )}
        </div>
      </Card>

      <ContractModal
        open={modalOpen}
        mode={mode}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onSubmit={submit}
        onClose={() => setModalOpen(false)}
        properties={productsApi.products}
        tenants={customersApi.customers}
      />

      <ConfirmDialog
        open={Boolean(terminateTarget)}
        tone="warning"
        badge="Terminate lease"
        title="Terminate this lease?"
        message={terminateTarget ? `The lease for ${terminateTarget.tenantName || 'this tenant'} will be marked Terminated.` : ''}
        confirmLabel="Terminate lease"
        cancelLabel="Keep active"
        busy={busy}
        onConfirm={confirmTerminate}
        onClose={() => { setTerminateTarget(null); setTerminateReason('') }}
      >
        <Input
          placeholder="Reason (optional)"
          value={terminateReason}
          onChange={(e) => setTerminateReason(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        badge="Delete lease"
        title="Delete this lease?"
        message={deleteTarget ? `The lease for ${deleteTarget.tenantName || 'this tenant'} will be permanently removed.` : ''}
        confirmLabel="Delete lease"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
