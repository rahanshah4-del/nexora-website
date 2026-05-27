import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useAccountTransactions } from '../hooks/useAccountTransactions.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useUser } from '../hooks/useUser.js'
import { financePermissions } from '../lib/financeAccess.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'
import { calculateFinanceSummary } from '../lib/financeCalculations.js'
import { formatCurrency } from '../utils/format.js'

function dateValue(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function dateLabel(value) {
  return dateValue(value)?.toLocaleDateString() || '-'
}

function inRange(value, range) {
  if (range === 'all') return true
  const date = dateValue(value)
  if (!date) return false
  const now = new Date()
  if (range === 'today') return date.toDateString() === now.toDateString()
  if (range === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  if (range === 'year') return date.getFullYear() === now.getFullYear()
  return true
}

function typeLabel(type) {
  const map = {
    income: 'Income',
    expense: 'Expense',
    bank_transfer: 'Bank Transfer',
    cash_withdrawal: 'Cash Withdrawal',
    cash_payment: 'Cash Payment',
    adjustment: 'Adjustment',
  }
  return map[String(type || '').toLowerCase()] || 'Transaction'
}

export default function AccountStatementsPage() {
  const { role, userDoc } = useUser()
  const permissions = useMemo(() => financePermissions(userDoc?.role || role), [role, userDoc?.role])
  const accounts = useAccountTransactions()
  const invoicesApi = useInvoices()
  const expensesApi = useExpenses()
  const [filters, setFilters] = useState({ range: 'month', type: 'all', user: 'all', status: 'all' })

  const rows = useMemo(() => {
    const transactionRows = accounts.transactions.map((transaction) => ({
      id: `transaction:${transaction.id}`,
      rawId: transaction.id,
      source: 'Transaction',
      type: transaction.type,
      label: transaction.title,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.approvalStatus || transaction.status,
      user: transaction.createdBy || '-',
      date: transaction.createdAt,
    }))
    const invoiceRows = invoicesApi.invoices.map((invoice) => ({
      id: `invoice:${invoice.id}`,
      rawId: invoice.id,
      source: 'Invoice',
      type: 'income',
      label: invoice.invoiceNumber || invoice.customerName || 'Invoice',
      amount: invoice.total || invoice.totalUsd || 0,
      currency: invoice.currency || 'PKR',
      status: invoice.paymentStatus || invoice.status,
      user: invoice.createdBy || '-',
      date: invoice.createdAt || invoice.paidAt,
    }))
    const expenseRows = expensesApi.expenses.map((expense) => ({
      id: `expense:${expense.id}`,
      rawId: expense.id,
      source: 'Expense',
      type: 'expense',
      label: expense.title,
      amount: expense.amount,
      currency: expense.currency || 'PKR',
      status: expense.approvalStatus || expense.status,
      user: expense.createdBy || '-',
      date: expense.createdAt || expense.approvedAt,
    }))
    return [...transactionRows, ...invoiceRows, ...expenseRows]
      .filter((row) => inRange(row.date, filters.range))
      .filter((row) => filters.type === 'all' || row.type === filters.type)
      .filter((row) => filters.status === 'all' || String(row.status || '').toLowerCase() === filters.status)
      .filter((row) => filters.user === 'all' || row.user === filters.user)
      .sort((a, b) => (dateValue(b.date)?.getTime() || 0) - (dateValue(a.date)?.getTime() || 0))
  }, [accounts.transactions, expensesApi.expenses, filters, invoicesApi.invoices])

  const users = useMemo(() => Array.from(new Set(rows.map((row) => row.user).filter(Boolean))), [rows])
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

  const exportColumns = [
    { key: 'source', label: 'Source' },
    { key: 'type', label: 'Type', value: (row) => typeLabel(row.type) },
    { key: 'label', label: 'Title' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'user', label: 'User' },
    { key: 'date', label: 'Date', value: (row) => dateLabel(row.date) },
  ]

  const columns = [
    { key: 'source', header: 'Statement', cell: (row) => <Badge variant="info">{row.source}</Badge> },
    { key: 'type', header: 'Type', cell: (row) => typeLabel(row.type) },
    { key: 'label', header: 'Title', cell: (row) => <span className="font-semibold">{row.label}</span> },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount, row.currency) },
    { key: 'status', header: 'Status', cell: (row) => <Badge variant={String(row.status).includes('rejected') ? 'danger' : 'default'}>{row.status || '-'}</Badge> },
    { key: 'user', header: 'User' },
    { key: 'date', header: 'Date', cell: (row) => dateLabel(row.date) },
  ]

  if (!permissions.canViewWallet) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <PageHeader title="Account Statements" subtitle="Income, expense, and transaction statements." />
        <Card className="p-6 text-center">
          <Badge variant="warning">Restricted</Badge>
          <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Statement access is restricted for your role.</p>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <PageHeader
        title="Account Statements"
        subtitle="Income statements, expense statements, and transaction history exports."
        right={
          permissions.canExportReports ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf()}>
                Export PDF
              </Button>
              <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-account-statements.xls', exportColumns, rows)}>
                Export Excel
              </Button>
              <Button className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-account-statements.csv', exportColumns, rows)}>
                Export CSV
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Income Statement</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.totalRevenue, 'PKR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Expense Statement</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.totalExpenses, 'PKR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Net Profit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.netProfit, 'PKR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{rows.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>
            <option value="today">Today</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </Select>
          <Select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash_withdrawal">Cash Withdrawal</option>
            <option value="cash_payment">Cash Payment</option>
          </Select>
          <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Select value={filters.user} onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))}>
            <option value="all">All users</option>
            {users.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </Select>
        </div>

        <div className="mt-4">
          {accounts.loading || invoicesApi.loading || expensesApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading statements...</div>
          ) : rows.length ? (
            <Table columns={columns} rows={rows} />
          ) : (
            <EmptyState title="No statement records yet" description="Income, expenses, and account transactions will appear here." />
          )}
        </div>
      </Card>
    </motion.div>
  )
}
