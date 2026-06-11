import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
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
import { useExpenses } from '../hooks/useExpenses.js'
import { formatCurrency, formatCompact, toFiniteNumber } from '../utils/format.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'

const expenseCategories = ['Office', 'Salary', 'Fuel', 'Marketing', 'Software', 'Maintenance', 'Travel', 'Other']
const paymentMethods = ['Cash', 'Bank Transfer', 'Card', 'Wallet', 'Cheque', 'Other']

const blankExpense = {
  title: '',
  category: 'Office',
  amount: '',
  currency: 'PKR',
  paymentMethod: 'Cash',
  paidBy: '',
  notes: '',
  receiptReference: '',
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function statusBadge(expense) {
  const value = String(expense.approvalStatus || expense.status || 'pending').toLowerCase()
  if (value === 'paid') return { label: 'Paid', variant: 'success' }
  if (value === 'approved') return { label: 'Approved', variant: 'success' }
  if (value === 'rejected') return { label: 'Rejected', variant: 'danger' }
  return { label: 'Pending Approval', variant: 'warning' }
}

function isApprovedExpense(expense) {
  return ['approved', 'paid', 'completed'].includes(String(expense.approvalStatus || expense.status || '').toLowerCase())
}

function isPendingExpense(expense) {
  return String(expense.approvalStatus || expense.status || 'pending').toLowerCase() === 'pending'
}

function thisMonth(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  const now = new Date()
  return date && !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function ExpenseForm({ draft, setDraft, busy, mode = 'create', onSubmit, onCancel }) {
  return (
    <form className="mt-4 space-y-3" onSubmit={onSubmit}>
      <Input
        placeholder="Expense title"
        value={draft.title}
        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
          {expenseCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}>
          {paymentMethods.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <Input
          inputMode="decimal"
          placeholder="Amount"
          value={draft.amount}
          onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
        />
        <Select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}>
          <option>PKR</option>
          <option>USD</option>
          <option>AED</option>
          <option>SAR</option>
          <option>INR</option>
        </Select>
      </div>
      <Input
        placeholder="Paid by"
        value={draft.paidBy}
        onChange={(event) => setDraft((current) => ({ ...current, paidBy: event.target.value }))}
      />
      <Input
        placeholder="Receipt reference optional"
        value={draft.receiptReference}
        onChange={(event) => setDraft((current) => ({ ...current, receiptReference: event.target.value }))}
      />
      <Input
        placeholder="Notes"
        value={draft.notes}
        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
      />
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-2xl" type="submit" disabled={busy}>
          {busy ? 'Saving...' : mode === 'edit' ? 'Save Expense' : 'Add Expense'}
        </Button>
        {onCancel ? (
          <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function DeleteModal({ expense, busy, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {expense ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-5">
              <Badge variant="danger">Remove Expense</Badge>
              <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Remove this expense?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {expense.title} will be removed from this workspace.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl bg-rose-600 hover:bg-rose-700" type="button" disabled={busy} onClick={onConfirm}>
                  {busy ? 'Removing...' : 'Remove Expense'}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function ExpensesPage() {
  const expensesApi = useExpenses()
  const [draft, setDraft] = useState(blankExpense)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return expensesApi.expenses
    return expensesApi.expenses.filter((expense) =>
      [expense.title, expense.category, expense.paidBy, expense.paymentMethod, expense.status, expense.approvalStatus, expense.notes, String(expense.amount)].some((value) =>
        String(value || '').toLowerCase().includes(q),
      ),
    )
  }, [expensesApi.expenses, search])

  const stats = useMemo(() => {
    const total = expensesApi.expenses.reduce((sum, expense) => sum + toFiniteNumber(expense.amount), 0)
    const approved = expensesApi.expenses.filter(isApprovedExpense)
    const pending = expensesApi.expenses.filter(isPendingExpense)
    const monthly = expensesApi.expenses.filter((expense) => thisMonth(expense.createdAt))
    return {
      total,
      pending: pending.length,
      approved: approved.reduce((sum, expense) => sum + toFiniteNumber(expense.amount), 0),
      monthly: monthly.reduce((sum, expense) => sum + toFiniteNumber(expense.amount), 0),
    }
  }, [expensesApi.expenses])

  const columns = useMemo(
    () => [
      { key: 'title', header: 'Expense', cell: (row) => <span className="font-semibold">{row.title}</span> },
      { key: 'category', header: 'Category', cell: (row) => <Badge variant="info">{row.category}</Badge> },
      { key: 'paidBy', header: 'Paid By', cell: (row) => row.paidBy || '—' },
      { key: 'paymentMethod', header: 'Method' },
      { key: 'amount', header: 'Amount', cell: (row) => <span className="font-semibold">{formatCurrency(row.amount, row.currency)}</span> },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => {
          const badge = statusBadge(row)
          return <Badge variant={badge.variant}>{badge.label}</Badge>
        },
      },
      { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="subtle"
              className="h-8 rounded-xl px-3 text-xs"
              type="button"
              onClick={() => {
                setEditing(row)
                setDraft({ ...blankExpense, ...row, amount: String(row.amount || '') })
              }}
            >
              Edit
            </Button>
            <Button
              variant="subtle"
              className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-700 hover:border-rose-300"
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
  const exportColumns = [
    { key: 'title', label: 'Expense' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'paidBy', label: 'Paid By' },
    { key: 'approvalStatus', label: 'Approval Status' },
    { key: 'status', label: 'Status' },
  ]

  function showToast(tone, message, delay = 2000) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  async function submitExpense(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing ? await expensesApi.updateExpense(editing.id, draft) : await expensesApi.createExpense(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Expense saved successfully' : 'Expense submitted for approval')
      setDraft(blankExpense)
      setEditing(null)
    } else {
      showToast('error', res?.error || 'Unable to save expense', 2600)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await expensesApi.deleteExpense(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Expense removed successfully')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to remove expense', 2600)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Expenses"
        subtitle="Track, review, and approve workspace spending."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf('nexora-expenses.pdf', exportColumns, expensesApi.expenses, 'Expenses')}>
              Export PDF
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-expenses.xls', exportColumns, expensesApi.expenses)}>
              Excel
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-expenses.csv', exportColumns, expensesApi.expenses)}>
              CSV
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.total, 'PKR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(stats.pending)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Approved Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.approved, 'PKR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">This Month Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(stats.monthly, 'PKR')}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Expense' : 'Add Expense'}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">New expenses enter Pending Approval.</p>
            </div>
            <Badge variant="purple">Finance</Badge>
          </div>
          <ExpenseForm
            draft={draft}
            setDraft={setDraft}
            busy={busy}
            mode={editing ? 'edit' : 'create'}
            onSubmit={submitExpense}
            onCancel={
              editing
                ? () => {
                    setEditing(null)
                    setDraft(blankExpense)
                  }
                : null
            }
          />
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Expense List</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Approved expenses count in reports, profit, and wallet controls.</p>
            </div>
            <Badge variant={expensesApi.source === 'firestore' ? 'success' : 'default'}>
              {expensesApi.loading ? 'Loading...' : expensesApi.source === 'firestore' ? 'Live Sync' : 'Account Data'}
            </Badge>
          </div>

          <div className="mt-4">
            <PageSearch
              className="sm:max-w-md"
              value={search}
              onChange={setSearch}
              placeholder="Search expenses by title, category, method..."
              resultCount={filteredExpenses.length}
              totalCount={expensesApi.expenses.length}
            />
          </div>

          <div className="mt-4">
            {expensesApi.loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading expenses...
              </div>
            ) : filteredExpenses.length ? (
              <Table columns={columns} rows={filteredExpenses} />
            ) : expensesApi.expenses.length ? (
              <EmptyState title="No matching expenses" description="Try a different search term." />
            ) : (
              <EmptyState title="No expenses yet" description="Add your first record to track profit accurately." />
            )}
          </div>
        </Card>
      </div>

      <DeleteModal expense={deleteTarget} busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </motion.div>
  )
}
