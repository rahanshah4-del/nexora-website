import { motion } from 'framer-motion'
import { useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { formatCurrency } from '../utils/format.js'

const blankExpense = {
  title: '',
  category: 'General',
  amount: '',
  currency: 'PKR',
  notes: '',
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function statusBadge(expense) {
  const value = String(expense.approvalStatus || expense.status || 'pending').toLowerCase()
  if (value === 'approved' || value === 'paid' || value === 'completed') return { label: 'Approved', variant: 'success' }
  if (value === 'rejected') return { label: 'Rejected', variant: 'danger' }
  return { label: 'Pending Approval', variant: 'warning' }
}

export default function ExpensesPage() {
  const expensesApi = useExpenses()
  const [draft, setDraft] = useState(blankExpense)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const columns = [
    { key: 'title', header: 'Expense', cell: (row) => <span className="font-semibold">{row.title}</span> },
    { key: 'category', header: 'Category' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount, row.currency) },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const badge = statusBadge(row)
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
  ]

  async function submitExpense(event) {
    event.preventDefault()
    setBusy(true)
    const res = await expensesApi.createExpense(draft)
    setBusy(false)
    if (res?.ok) {
      setToast({ tone: 'success', message: 'Expense submitted for approval' })
      setDraft(blankExpense)
      window.setTimeout(() => setToast(null), 1800)
    } else {
      setToast({ tone: 'error', message: res?.error || 'Unable to save expense' })
      window.setTimeout(() => setToast(null), 2400)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Expenses" subtitle="Submit workspace expenses for approval and profit reporting." />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Add Expense</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">New expenses enter Pending Approval.</p>
            </div>
            <Badge variant="purple">Expense</Badge>
          </div>

          <form className="mt-4 space-y-3" onSubmit={submitExpense}>
            <Input
              placeholder="Expense title"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
            <Input
              placeholder="Category"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            />
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
              placeholder="Notes"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
            <Button className="w-full rounded-2xl" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Submit Expense'}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Expense List</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Approved expenses count in reports and profit.</p>
            </div>
            <Badge variant={expensesApi.source === 'firestore' ? 'success' : 'default'}>
              {expensesApi.loading ? 'Loading…' : expensesApi.source === 'firestore' ? 'Live Sync' : 'No data yet'}
            </Badge>
          </div>

          <div className="mt-4">
            {expensesApi.loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading expenses…
              </div>
            ) : expensesApi.expenses.length ? (
              <Table columns={columns} rows={expensesApi.expenses} />
            ) : (
              <EmptyState title="No expenses yet" description="Add your first record to track profit accurately." />
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
