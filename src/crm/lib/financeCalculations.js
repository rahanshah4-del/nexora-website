import {
  calculateExpenseBreakdown,
  calculateRejectedRevenueBreakdown,
  calculateRevenueBreakdown,
  invoiceBalanceDue,
  isOutstandingInvoice,
  isApprovedTransaction,
  normalizeCurrency,
  statusValue,
  toNumber,
  transactionAmount,
  transactionStatusValue,
  transactionTypeValue,
} from './calculations.js'

const pendingStatuses = new Set(['pending', 'pending_approval', 'pending_verification', 'requested'])
const rejectedStatuses = new Set(['rejected', 'cancelled', 'canceled'])
const withdrawalTypes = new Set(['cash_withdrawal'])
const bankTransferTypes = new Set(['bank_transfer'])

export { isApprovedTransaction, transactionAmount }

export function isPendingTransaction(transaction = {}) {
  return pendingStatuses.has(transactionStatusValue(transaction))
}

export function isRejectedTransaction(transaction = {}) {
  return rejectedStatuses.has(transactionStatusValue(transaction))
}

export function calculateTotalRevenue({ invoices = [], payments = [], transactions = [] } = {}) {
  return calculateRevenueBreakdown({ invoices, payments, transactions }).totalRevenue
}

export function calculateTotalExpenses({ expenses = [], transactions = [] } = {}) {
  return calculateExpenseBreakdown({ expenses, transactions }).totalExpenses
}

export function calculateBankBalance(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && bankTransferTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

export function calculateCashOut(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && withdrawalTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

export function calculateWalletBalance({ invoices = [], payments = [], expenses = [], transactions = [] } = {}) {
  const revenue = calculateTotalRevenue({ invoices, payments, transactions })
  const expenseTotal = calculateTotalExpenses({ expenses, transactions })
  const bankTransfers = calculateBankBalance(transactions)
  const withdrawals = calculateCashOut(transactions)
  return revenue - expenseTotal - bankTransfers - withdrawals
}

export function calculateCashBalance(input = {}) {
  return calculateWalletBalance(input)
}

export function calculateNetProfit({ revenue = 0, expenses = 0 } = {}) {
  return toNumber(revenue, 0) - toNumber(expenses, 0)
}

export function calculatePendingApprovals({ invoices = [], payments = [], expenses = [], transactions = [], upgradeRequests = [] } = {}) {
  const pendingInvoices = invoices.filter((invoice) => {
    const status = statusValue(invoice.approvalStatus || invoice.paymentStatus || invoice.status, 'pending')
    return invoice.requiresApproval === true || pendingStatuses.has(status)
  }).length
  const pendingPayments = payments.filter((payment) => pendingStatuses.has(statusValue(payment.paymentStatus || payment.status, 'pending'))).length
  const pendingExpenses = expenses.filter((expense) => pendingStatuses.has(statusValue(expense.approvalStatus || expense.status, 'pending'))).length
  const pendingTransactions = transactions.filter(isPendingTransaction).length
  const pendingUpgrades = upgradeRequests.filter((request) => pendingStatuses.has(statusValue(request.approvalStatus || request.paymentStatus, 'pending'))).length

  return pendingInvoices + pendingPayments + pendingExpenses + pendingTransactions + pendingUpgrades
}

export function calculateMonthlyIncome({ payments = [], invoices = [], transactions = [], now = new Date() } = {}) {
  const month = now.getMonth()
  const year = now.getFullYear()
  const inMonth = (value) => {
    const date = value?.toDate?.() || (value ? new Date(value) : null)
    return date && !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year
  }
  return calculateTotalRevenue({
    payments: payments.filter((payment) => inMonth(payment.paidAt || payment.createdAt)),
    invoices: invoices.filter((invoice) => inMonth(invoice.paidAt || invoice.createdAt || invoice.dueDate)),
    transactions: transactions.filter((transaction) => inMonth(transaction.approvedAt || transaction.createdAt)),
  })
}

export function calculateMonthlyExpenses({ expenses = [], transactions = [], now = new Date() } = {}) {
  const month = now.getMonth()
  const year = now.getFullYear()
  const inMonth = (value) => {
    const date = value?.toDate?.() || (value ? new Date(value) : null)
    return date && !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year
  }
  return calculateTotalExpenses({
    expenses: expenses.filter((expense) => inMonth(expense.approvedAt || expense.createdAt)),
    transactions: transactions.filter((transaction) => inMonth(transaction.approvedAt || transaction.createdAt)),
  })
}

export function normalizeFinanceCurrency(value) {
  return normalizeCurrency(value || 'PKR')
}

export function calculateFinanceSummary({ invoices = [], payments = [], expenses = [], transactions = [], upgradeRequests = [] } = {}) {
  const revenueBreakdown = calculateRevenueBreakdown({ invoices, payments, transactions })
  const rejectedRevenueBreakdown = calculateRejectedRevenueBreakdown({ invoices, payments, transactions })
  const expenseBreakdown = calculateExpenseBreakdown({ expenses, transactions })
  const totalRevenue = revenueBreakdown.totalRevenue
  const totalExpenses = expenseBreakdown.totalExpenses
  const bankBalance = calculateBankBalance(transactions)
  const cashOut = calculateCashOut(transactions)
  const pendingRevenue = invoices
    .filter(isOutstandingInvoice)
    .reduce((sum, invoice) => sum + invoiceBalanceDue(invoice), 0)
  return {
    walletBalance: totalRevenue - totalExpenses - bankBalance - cashOut,
    cashBalance: calculateCashBalance({ invoices, payments, expenses, transactions }),
    bankBalance,
    cashOut,
    pendingRevenue,
    totalRevenue,
    rejectedRevenue: rejectedRevenueBreakdown.totalRejected,
    totalExpenses,
    netProfit: calculateNetProfit({ revenue: totalRevenue, expenses: totalExpenses }),
    pendingApprovals: calculatePendingApprovals({ invoices, payments, expenses, transactions, upgradeRequests }),
    monthlyIncome: calculateMonthlyIncome({ invoices, payments, transactions }),
    monthlyExpenses: calculateMonthlyExpenses({ expenses, transactions }),
    approvedExpenses: expenseBreakdown.approvedExpenses,
    revenueBreakdown,
    rejectedRevenueBreakdown,
    expenseBreakdown,
  }
}
