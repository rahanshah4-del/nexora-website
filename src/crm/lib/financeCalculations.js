import {
  calculateApprovedExpenses,
  expenseValue,
  getInvoiceStatus,
  isApprovedExpense,
  isPaidRecord,
  invoiceValue,
  normalizeCurrency,
  paymentValue,
  statusValue,
  toNumber,
} from './calculations.js'

const approvedStatuses = new Set(['approved', 'paid', 'completed', 'complete', 'verified'])
const pendingStatuses = new Set(['pending', 'pending_approval', 'pending_verification', 'requested'])
const rejectedStatuses = new Set(['rejected', 'cancelled', 'canceled'])
const incomeTypes = new Set(['income'])
const expenseTypes = new Set(['expense', 'cash_payment'])
const withdrawalTypes = new Set(['cash_withdrawal'])
const bankTransferTypes = new Set(['bank_transfer'])

function transactionStatus(transaction = {}) {
  return statusValue(transaction.approvalStatus || transaction.status, 'pending')
}

export function transactionAmount(transaction = {}) {
  return Math.max(toNumber(transaction.amount ?? transaction.amountPaid ?? transaction.total, 0), 0)
}

export function isApprovedTransaction(transaction = {}) {
  return approvedStatuses.has(transactionStatus(transaction))
}

export function isPendingTransaction(transaction = {}) {
  return pendingStatuses.has(transactionStatus(transaction))
}

export function isRejectedTransaction(transaction = {}) {
  return rejectedStatuses.has(transactionStatus(transaction))
}

function transactionType(transaction = {}) {
  return statusValue(transaction.type, 'adjustment')
}

function recordKeys(record = {}) {
  return [
    record.id,
    record.invoiceId,
    record.invoiceNumber,
    record.paymentId,
    record.relatedId,
    record.sourceId,
    record.reference,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function coveredKeys(transactions = [], typeSet = incomeTypes) {
  const keys = new Set()
  transactions
    .filter((transaction) => isApprovedTransaction(transaction) && typeSet.has(transactionType(transaction)))
    .forEach((transaction) => {
      recordKeys(transaction).forEach((key) => keys.add(key))
    })
  return keys
}

function isCovered(record, keys) {
  return recordKeys(record).some((key) => keys.has(key))
}

export function calculateTotalRevenue({ invoices = [], payments = [], transactions = [] } = {}) {
  const incomeTransactions = transactions.filter((transaction) => isApprovedTransaction(transaction) && incomeTypes.has(transactionType(transaction)))
  const transactionRevenue = incomeTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
  const covered = coveredKeys(incomeTransactions)

  const paidPayments = payments.filter(isPaidRecord).filter((payment) => !isCovered(payment, covered))
  const paidPaymentInvoiceKeys = new Set(paidPayments.flatMap(recordKeys))
  const paymentRevenue = paidPayments.reduce((sum, payment) => sum + paymentValue(payment), 0)

  const invoiceRevenue = invoices
    .filter((invoice) => getInvoiceStatus(invoice) === 'paid')
    .filter((invoice) => !isCovered(invoice, covered))
    .filter((invoice) => !recordKeys(invoice).some((key) => paidPaymentInvoiceKeys.has(key)))
    .reduce((sum, invoice) => sum + invoiceValue(invoice), 0)

  return transactionRevenue + paymentRevenue + invoiceRevenue
}

export function calculateTotalExpenses({ expenses = [], transactions = [] } = {}) {
  const expenseTransactions = transactions.filter((transaction) => isApprovedTransaction(transaction) && expenseTypes.has(transactionType(transaction)))
  const covered = coveredKeys(expenseTransactions, expenseTypes)
  const transactionExpenses = expenseTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
  const approvedExpenses = expenses
    .filter(isApprovedExpense)
    .filter((expense) => !isCovered(expense, covered))
    .reduce((sum, expense) => sum + expenseValue(expense), 0)

  return transactionExpenses + approvedExpenses
}

export function calculateBankBalance(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && bankTransferTypes.has(transactionType(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

export function calculateCashOut(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && withdrawalTypes.has(transactionType(transaction)))
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
  const totalRevenue = calculateTotalRevenue({ invoices, payments, transactions })
  const totalExpenses = calculateTotalExpenses({ expenses, transactions })
  const pendingRevenue = invoices
    .filter((invoice) => getInvoiceStatus(invoice) === 'pending')
    .reduce((sum, invoice) => sum + invoiceValue(invoice), 0)
  return {
    walletBalance: calculateWalletBalance({ invoices, payments, expenses, transactions }),
    cashBalance: calculateCashBalance({ invoices, payments, expenses, transactions }),
    bankBalance: calculateBankBalance(transactions),
    pendingRevenue,
    totalRevenue,
    totalExpenses,
    netProfit: calculateNetProfit({ revenue: totalRevenue, expenses: totalExpenses }),
    pendingApprovals: calculatePendingApprovals({ invoices, payments, expenses, transactions, upgradeRequests }),
    monthlyIncome: calculateMonthlyIncome({ invoices, payments, transactions }),
    monthlyExpenses: calculateMonthlyExpenses({ expenses, transactions }),
    approvedExpenses: calculateApprovedExpenses(expenses),
  }
}
