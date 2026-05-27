import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useAccountTransactions } from '../hooks/useAccountTransactions.js'
import { useApprovals } from '../hooks/useApprovals.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useInvoices } from '../hooks/useInvoices.js'
import {
  calculateFinanceSummary,
  isPendingTransaction,
} from '../lib/financeCalculations.js'
import { formatCurrency, formatCompact, toFiniteNumber } from '../utils/format.js'

const actionDefaults = {
  bank_transfer: { amount: '', bankName: '', accountTitle: '', accountNumber: '', notes: '' },
  cash_withdrawal: { amount: '', receiverName: '', reason: '', notes: '' },
  cash_payment: { amount: '', paidTo: '', reason: '', notes: '' },
  expense: { expenseId: '', amount: '', paymentMethod: 'Cash', notes: '' },
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function statusBadge(status) {
  const value = String(status || '').toLowerCase()
  if (['approved', 'completed', 'paid'].includes(value)) return { label: 'Approved', variant: 'success' }
  if (value === 'rejected') return { label: 'Rejected', variant: 'danger' }
  return { label: 'Pending Approval', variant: 'warning' }
}

function typeLabel(type) {
  const map = {
    income: 'Income',
    expense: 'Expense Payment',
    bank_transfer: 'Bank Transfer',
    cash_withdrawal: 'Cash Withdrawal',
    cash_payment: 'Cash Payment',
    adjustment: 'Adjustment',
  }
  return map[String(type || '').toLowerCase()] || 'Transaction'
}

function ActionCard({ title, description, children }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function FieldLabel({ children }) {
  return <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{children}</label>
}

export default function AccountManagementPage() {
  const accounts = useAccountTransactions()
  const invoicesApi = useInvoices()
  const expensesApi = useExpenses()
  const approvals = useApprovals()
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState('')
  const [filters, setFilters] = useState({ type: 'all', status: 'all', method: 'all', dateRange: 'all' })
  const [drafts, setDrafts] = useState(actionDefaults)

  const summary = useMemo(
    () =>
      calculateFinanceSummary({
        invoices: invoicesApi.invoices,
        payments: invoicesApi.payments,
        expenses: expensesApi.expenses,
        transactions: accounts.transactions,
      }),
    [accounts.transactions, expensesApi.expenses, invoicesApi.invoices, invoicesApi.payments],
  )

  const loading = accounts.loading || invoicesApi.loading || expensesApi.loading
  const pendingApprovalCount = approvals.summary.total || summary.pendingApprovals
  const pendingTransactions = useMemo(() => accounts.transactions.filter(isPendingTransaction), [accounts.transactions])

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return accounts.transactions.filter((transaction) => {
      if (filters.type !== 'all' && transaction.type !== filters.type) return false
      if (filters.status !== 'all' && transaction.status !== filters.status && transaction.approvalStatus !== filters.status) return false
      if (filters.method !== 'all' && transaction.method !== filters.method) return false
      if (filters.dateRange !== 'all') {
        const date = transaction.createdAt?.toDate?.() || (transaction.createdAt ? new Date(transaction.createdAt) : null)
        if (!date || Number.isNaN(date.getTime())) return false
        if (filters.dateRange === 'today' && date.toDateString() !== now.toDateString()) return false
        if (filters.dateRange === 'month' && (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear())) return false
      }
      return true
    })
  }, [accounts.transactions, filters])

  const revenueSources = useMemo(() => {
    const paymentRows = invoicesApi.payments
      .filter((payment) => String(payment.paymentStatus || payment.status || '').toLowerCase() === 'paid')
      .slice(0, 5)
      .map((payment) => ({
        id: payment.id,
        title: payment.customerName || payment.invoiceNumber || 'Invoice payment',
        amount: payment.amount || payment.amountPaid,
        currency: payment.currency || 'PKR',
        date: payment.paidAt || payment.createdAt,
      }))
    const transactionRows = accounts.transactions
      .filter((transaction) => transaction.type === 'income' && ['approved', 'paid', 'completed'].includes(String(transaction.status || transaction.approvalStatus || '').toLowerCase()))
      .slice(0, 5)
      .map((transaction) => ({
        id: transaction.id,
        title: transaction.customerName || transaction.title,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.approvedAt || transaction.createdAt,
      }))
    return [...paymentRows, ...transactionRows].slice(0, 6)
  }, [accounts.transactions, invoicesApi.payments])

  const transactionColumns = useMemo(
    () => [
      { key: 'title', header: 'Transaction', cell: (row) => <span className="font-semibold">{row.title}</span> },
      { key: 'type', header: 'Type', cell: (row) => <Badge variant="info">{typeLabel(row.type)}</Badge> },
      { key: 'amount', header: 'Amount', cell: (row) => <span className="font-semibold">{formatCurrency(row.amount, row.currency)}</span> },
      { key: 'method', header: 'Method' },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => {
          const badge = statusBadge(row.approvalStatus || row.status)
          return <Badge variant={badge.variant}>{badge.label}</Badge>
        },
      },
      { key: 'createdAt', header: 'Date', cell: (row) => formatDate(row.createdAt) },
    ],
    [],
  )

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  function setDraft(type, patch) {
    setDrafts((current) => ({ ...current, [type]: { ...current[type], ...patch } }))
  }

  async function createTransaction(type, payload) {
    setBusy(type)
    const res = await accounts.createTransaction(payload)
    setBusy('')
    if (res?.ok) {
      setDrafts((current) => ({ ...current, [type]: actionDefaults[type] }))
      showToast('success', 'Transaction submitted for approval')
    } else {
      showToast('error', res?.error || 'Unable to submit transaction', 2600)
    }
  }

  async function submitBankTransfer(event) {
    event.preventDefault()
    const draft = drafts.bank_transfer
    await createTransaction('bank_transfer', {
      type: 'bank_transfer',
      amount: draft.amount,
      method: 'Bank Transfer',
      title: `Transfer to ${draft.bankName || 'bank'}`,
      description: draft.notes,
      bankName: draft.bankName,
      accountTitle: draft.accountTitle,
      accountNumber: draft.accountNumber,
      notes: draft.notes,
    })
  }

  async function submitCashWithdrawal(event) {
    event.preventDefault()
    const draft = drafts.cash_withdrawal
    await createTransaction('cash_withdrawal', {
      type: 'cash_withdrawal',
      amount: draft.amount,
      method: 'Cash',
      title: `Cash withdrawal for ${draft.receiverName || 'receiver'}`,
      description: draft.reason,
      receiverName: draft.receiverName,
      reason: draft.reason,
      notes: draft.notes,
    })
  }

  async function submitCashPayment(event) {
    event.preventDefault()
    const draft = drafts.cash_payment
    await createTransaction('cash_payment', {
      type: 'cash_payment',
      amount: draft.amount,
      method: 'Cash',
      title: `Cash payment to ${draft.paidTo || 'recipient'}`,
      description: draft.reason,
      paidTo: draft.paidTo,
      reason: draft.reason,
      notes: draft.notes,
    })
  }

  async function submitExpensePayment(event) {
    event.preventDefault()
    const draft = drafts.expense
    const expense = expensesApi.expenses.find((item) => item.id === draft.expenseId)
    await createTransaction('expense', {
      type: 'expense',
      amount: draft.amount || expense?.amount || 0,
      method: draft.paymentMethod,
      title: expense ? `Pay expense: ${expense.title}` : 'Expense payment',
      description: draft.notes,
      relatedId: draft.expenseId,
      expenseId: draft.expenseId,
      notes: draft.notes,
    })
  }

  async function handleApproval(row, action) {
    if (!approvals.canApprove) {
      showToast('error', 'You do not have permission to approve requests')
      return
    }
    setBusy(`${action}:${row.id}`)
    const res = action === 'approve' ? await approvals.approve(row) : await approvals.reject(row)
    setBusy('')
    if (res?.ok) {
      showToast('success', action === 'approve' ? 'Approval completed' : 'Approval rejected')
    } else {
      showToast('error', res?.error || 'Approval action failed', 2600)
    }
  }

  const approvalColumns = [
    { key: 'type', header: 'Type', cell: (row) => <span className="font-semibold">{row.type}</span> },
    { key: 'customer', header: 'Customer/Client' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount, row.currency) },
    { key: 'status', header: 'Status', cell: (row) => <Badge variant="warning">{row.status || 'pending'}</Badge> },
    { key: 'submittedBy', header: 'Submitted By' },
    { key: 'dateLabel', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button className="h-8 rounded-xl px-3 text-xs" type="button" onClick={() => handleApproval(row, 'approve')}>
            Approve
          </Button>
          <Button
            variant="subtle"
            className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-700 hover:border-rose-300"
            type="button"
            onClick={() => handleApproval(row, 'reject')}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Account Management" subtitle="Control wallet balance, income, expenses, transfers, and approvals." />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Wallet Balance', summary.walletBalance],
          ['Cash Balance', summary.cashBalance],
          ['Bank Balance', summary.bankBalance],
          ['Pending Revenue', summary.pendingRevenue],
          ['Total Revenue', summary.totalRevenue],
          ['Total Expenses', summary.totalExpenses],
          ['Pending Approvals', pendingApprovalCount, 'count'],
          ['Monthly Income', summary.monthlyIncome],
          ['Monthly Expenses', summary.monthlyExpenses],
          ['Net Profit', summary.netProfit],
        ].map(([label, value, type]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {type === 'count' ? formatCompact(value) : formatCurrency(value, 'PKR')}
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <ActionCard title="Transfer to Bank" description="Move approved wallet funds to a bank account.">
          <form className="space-y-3" onSubmit={submitBankTransfer}>
            <Input placeholder="Amount" inputMode="decimal" value={drafts.bank_transfer.amount} onChange={(event) => setDraft('bank_transfer', { amount: event.target.value })} />
            <Input placeholder="Bank name" value={drafts.bank_transfer.bankName} onChange={(event) => setDraft('bank_transfer', { bankName: event.target.value })} />
            <Input placeholder="Account title" value={drafts.bank_transfer.accountTitle} onChange={(event) => setDraft('bank_transfer', { accountTitle: event.target.value })} />
            <Input placeholder="Account number" value={drafts.bank_transfer.accountNumber} onChange={(event) => setDraft('bank_transfer', { accountNumber: event.target.value })} />
            <Input placeholder="Notes" value={drafts.bank_transfer.notes} onChange={(event) => setDraft('bank_transfer', { notes: event.target.value })} />
            <Button className="w-full rounded-2xl" type="submit" disabled={busy === 'bank_transfer'}>
              {busy === 'bank_transfer' ? 'Submitting...' : 'Request Transfer'}
            </Button>
          </form>
        </ActionCard>

        <ActionCard title="Cash Withdrawal" description="Record a cash withdrawal request for approval.">
          <form className="space-y-3" onSubmit={submitCashWithdrawal}>
            <Input placeholder="Amount" inputMode="decimal" value={drafts.cash_withdrawal.amount} onChange={(event) => setDraft('cash_withdrawal', { amount: event.target.value })} />
            <Input placeholder="Receiver name" value={drafts.cash_withdrawal.receiverName} onChange={(event) => setDraft('cash_withdrawal', { receiverName: event.target.value })} />
            <Input placeholder="Reason" value={drafts.cash_withdrawal.reason} onChange={(event) => setDraft('cash_withdrawal', { reason: event.target.value })} />
            <Input placeholder="Notes" value={drafts.cash_withdrawal.notes} onChange={(event) => setDraft('cash_withdrawal', { notes: event.target.value })} />
            <Button className="w-full rounded-2xl" type="submit" disabled={busy === 'cash_withdrawal'}>
              {busy === 'cash_withdrawal' ? 'Submitting...' : 'Request Withdrawal'}
            </Button>
          </form>
        </ActionCard>

        <ActionCard title="Cash Payment" description="Submit cash paid to suppliers, staff, or vendors.">
          <form className="space-y-3" onSubmit={submitCashPayment}>
            <Input placeholder="Amount" inputMode="decimal" value={drafts.cash_payment.amount} onChange={(event) => setDraft('cash_payment', { amount: event.target.value })} />
            <Input placeholder="Paid to" value={drafts.cash_payment.paidTo} onChange={(event) => setDraft('cash_payment', { paidTo: event.target.value })} />
            <Input placeholder="Reason" value={drafts.cash_payment.reason} onChange={(event) => setDraft('cash_payment', { reason: event.target.value })} />
            <Input placeholder="Notes" value={drafts.cash_payment.notes} onChange={(event) => setDraft('cash_payment', { notes: event.target.value })} />
            <Button className="w-full rounded-2xl" type="submit" disabled={busy === 'cash_payment'}>
              {busy === 'cash_payment' ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </form>
        </ActionCard>

        <ActionCard title="Pay Expense" description="Create an expense payment request connected to an expense.">
          <form className="space-y-3" onSubmit={submitExpensePayment}>
            <Select value={drafts.expense.expenseId} onChange={(event) => {
              const expense = expensesApi.expenses.find((item) => item.id === event.target.value)
              setDraft('expense', { expenseId: event.target.value, amount: expense ? String(expense.amount || '') : drafts.expense.amount })
            }}>
              <option value="">Select expense</option>
              {expensesApi.expenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.title} - {formatCurrency(expense.amount, expense.currency)}
                </option>
              ))}
            </Select>
            <Input placeholder="Amount" inputMode="decimal" value={drafts.expense.amount} onChange={(event) => setDraft('expense', { amount: event.target.value })} />
            <Select value={drafts.expense.paymentMethod} onChange={(event) => setDraft('expense', { paymentMethod: event.target.value })}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Wallet</option>
            </Select>
            <Input placeholder="Notes" value={drafts.expense.notes} onChange={(event) => setDraft('expense', { notes: event.target.value })} />
            <Button className="w-full rounded-2xl" type="submit" disabled={busy === 'expense'}>
              {busy === 'expense' ? 'Submitting...' : 'Request Expense Payment'}
            </Button>
          </form>
        </ActionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Transaction History</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Income, expense, transfer, and cash movement records.</p>
            </div>
            <Badge variant={accounts.source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading...' : 'Live Sync'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select className="mt-1" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash_withdrawal">Cash Withdrawal</option>
                <option value="cash_payment">Cash Payment</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select className="mt-1" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Method</FieldLabel>
              <Select className="mt-1" value={filters.method} onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}>
                <option value="all">All</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Card</option>
                <option>Wallet</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Date Range</FieldLabel>
              <Select className="mt-1" value={filters.dateRange} onChange={(event) => setFilters((current) => ({ ...current, dateRange: event.target.value }))}>
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="month">This month</option>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading account data...</div>
            ) : filteredTransactions.length ? (
              <Table columns={transactionColumns} rows={filteredTransactions} />
            ) : (
              <EmptyState title="No transactions yet" description="Approved payments and account actions will appear here." />
            )}
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Pending Approvals</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Finance requests waiting for review.</p>
              </div>
              <Badge variant="warning">{formatCompact(approvals.summary.total || pendingTransactions.length)}</Badge>
            </div>
            <div className="mt-4">
              {approvals.loading ? (
                <div className="grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading approvals...</div>
              ) : approvals.approvals.length ? (
                <Table columns={approvalColumns} rows={approvals.approvals.slice(0, 6)} />
              ) : (
                <EmptyState title="No approvals pending" description="New payment and account requests will appear here." />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Sources</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Paid invoice income feeding the wallet.</p>
            <div className="mt-4 space-y-3">
              {revenueSources.length ? (
                revenueSources.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-slate-100 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-950 dark:text-white">{source.title}</p>
                      <p className="shrink-0 text-sm font-semibold text-emerald-700">{formatCurrency(toFiniteNumber(source.amount), source.currency)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(source.date)}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No revenue sources yet" description="Paid invoices will appear here." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
