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
const incomeTypes = new Set(['income'])
const expenseTypes = new Set(['expense', 'cash_payment'])
const withdrawalTypes = new Set(['cash_withdrawal'])
const bankTransferTypes = new Set(['bank_transfer'])
const supplierPaymentTypes = new Set(['supplier_payment'])
const refundTypes = new Set(['refund'])

// All outflow types — used by wallet balance and outflow guard.
export const OUTFLOW_TYPES = new Set([
  ...expenseTypes,
  ...withdrawalTypes,
  ...bankTransferTypes,
  ...supplierPaymentTypes,
  ...refundTypes,
])

export { isApprovedTransaction, transactionAmount }

export function isPendingTransaction(transaction = {}) {
  return pendingStatuses.has(transactionStatusValue(transaction))
}

export function isRejectedTransaction(transaction = {}) {
  return rejectedStatuses.has(transactionStatusValue(transaction))
}

export function isOutflowTransaction(transaction = {}) {
  return OUTFLOW_TYPES.has(transactionTypeValue(transaction))
}

export function calculateTotalRevenue({ invoices = [], payments = [], transactions = [] } = {}) {
  return calculateRevenueBreakdown({ invoices, payments, transactions }).totalRevenue
}

export function calculateTotalExpenses({ expenses = [], transactions = [] } = {}) {
  return calculateExpenseBreakdown({ expenses, transactions }).totalExpenses
}

/** Sum of all approved bank_transfer transactions (outflows to bank). */
export function calculateBankBalance(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && bankTransferTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

/** Sum of all approved cash_withdrawal transactions (cash out of wallet). */
export function calculateCashOut(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && withdrawalTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

/** Sum of all approved supplier_payment transactions. */
export function calculateSupplierPayments(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && supplierPaymentTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

/** Sum of all approved refund transactions (outflows from refunded orders/invoices). */
export function calculateRefundTotal(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && refundTypes.has(transactionTypeValue(transaction)))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

/** Sum of all approved outflow transactions (everything that leaves the wallet). */
export function calculateTotalOutflows(transactions = []) {
  return transactions
    .filter((transaction) => isApprovedTransaction(transaction) && isOutflowTransaction(transaction))
    .reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
}

/**
 * Wallet balance = all revenue minus ALL approved outflow transactions.
 * This correctly subtracts expenses, bank transfers, cash withdrawals,
 * supplier payments, and refunds.
 */
export function calculateWalletBalance({ invoices = [], payments = [], expenses = [], transactions = [] } = {}) {
  const revenue = calculateTotalRevenue({ invoices, payments, transactions })
  const expenseTotal = calculateTotalExpenses({ expenses, transactions })
  const bankTransfers = calculateBankBalance(transactions)
  const withdrawals = calculateCashOut(transactions)
  const supplierPayments = calculateSupplierPayments(transactions)
  const refunds = calculateRefundTotal(transactions)
  return revenue - expenseTotal - bankTransfers - withdrawals - supplierPayments - refunds
}

/**
 * Cash balance = wallet balance minus outflows that moved money to bank
 * (bank_transfer) or to suppliers (supplier_payment) — i.e. what's
 * physically in the cash drawer after all operations.
 *
 * This is deliberately different from walletBalance: cashBalance tracks
 * physical cash only (withdrawals, expenses, refunds that went out as cash).
 * bank_transfer and supplier_payment move money elsewhere.
 */
export function calculateCashBalance({ invoices = [], payments = [], expenses = [], transactions = [] } = {}) {
  const wallet = calculateWalletBalance({ invoices, payments, expenses, transactions })
  const bankTransfers = calculateBankBalance(transactions)
  return wallet + bankTransfers // Add back bank transfers since they left the cash drawer
}

export function calculateNetProfit({ revenue = 0, expenses = 0 } = {}) {
  return toNumber(revenue, 0) - toNumber(expenses, 0)
}

export function calculatePendingApprovals({ invoices = [], payments = [], expenses = [], transactions = [], upgradeRequests = [] } = {}) {
  const pendingInvoices = invoices.filter((invoice) => {
    const safe = invoice || {}
    const status = statusValue(safe.approvalStatus || safe.paymentStatus || safe.status, 'pending')
    return safe.requiresApproval === true || pendingStatuses.has(status)
  }).length
  const pendingPayments = payments.filter((payment) => pendingStatuses.has(statusValue(payment?.paymentStatus || payment?.status, 'pending'))).length
  const pendingExpenses = expenses.filter((expense) => pendingStatuses.has(statusValue(expense?.approvalStatus || expense?.status, 'pending'))).length
  const pendingTransactions = transactions.filter(isPendingTransaction).length
  const pendingUpgrades = upgradeRequests.filter((request) => pendingStatuses.has(statusValue(request?.approvalStatus || request?.paymentStatus || request?.status, 'pending'))).length

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

// ── Purchase Payment Helpers ──

/**
 * Calculate the remaining balance due for a purchase.
 * @returns {number}
 */
export function calculatePurchaseBalanceDue(purchase = {}) {
  const total = toNumber(purchase.total, 0)
  const paid = toNumber(purchase.paidAmount, 0)
  const returned = toNumber(purchase.returnedAmount, 0)
  return Math.max(total - paid - returned, 0)
}

/**
 * Derive payment status from paid vs total amounts.
 * @returns {'unpaid' | 'partial' | 'paid'}
 */
export function calculatePurchasePaymentStatus(purchase = {}) {
  const total = toNumber(purchase.total, 0)
  const paid = toNumber(purchase.paidAmount, 0)
  const returned = toNumber(purchase.returnedAmount, 0)
  const netDue = total - returned
  if (paid <= 0 && netDue <= 0) return 'paid'
  if (paid <= 0) return 'unpaid'
  if (paid >= netDue) return 'paid'
  return 'partial'
}

/**
 * Normalize or enrich a purchase object with computed payment fields.
 * Fields that exist on the Firestore doc take precedence; computed
 * fields fill in when the doc is missing them.
 */
export function normalizePurchasePayment(purchase = {}) {
  const paidAmount = toNumber(purchase.paidAmount, 0)
  const total = toNumber(purchase.total, 0)
  const returnedAmount = toNumber(purchase.returnedAmount, 0)
  const balanceDue = toNumber(purchase.balanceDue, calculatePurchaseBalanceDue(purchase))
  const paymentStatus = purchase.paymentStatus || calculatePurchasePaymentStatus({ ...purchase, paidAmount, total, returnedAmount })
  return {
    paidAmount,
    returnedAmount,
    balanceDue,
    paymentStatus,
    lastPaymentAt: purchase.lastPaymentAt || null,
  }
}

/**
 * Calculate a supplier's outstanding balance from its opening balance
 * and its linked purchases.
 *
 * Supplier Balance = openingBalance + sum(purchase totals) - sum(purchase payments)
 *
 * @param {Object} supplier  – supplier doc with openingBalance
 * @param {Array}  purchases – linked purchase objects (must have supplierId, total, paidAmount)
 * @returns {number}
 */
export function calculateSupplierBalance(supplier = {}, purchases = []) {
  const openingBalance = toNumber(supplier.openingBalance, 0)
  const supplierPurchases = (purchases || []).filter(
    (p) => p.supplierId === supplier.id || p.supplierName === supplier.name,
  )
  const purchaseTotal = supplierPurchases.reduce((sum, p) => sum + toNumber(p.total, 0), 0)
  const paidTotal = supplierPurchases.reduce((sum, p) => sum + toNumber(p.paidAmount, 0), 0)
  const returnedTotal = supplierPurchases.reduce((sum, p) => sum + toNumber(p.returnedAmount, 0), 0)
  return openingBalance + purchaseTotal - paidTotal - returnedTotal
}

/**
 * Calculate the maximum returnable amount for a purchase.
 * Cannot exceed the received value minus what's already been returned.
 * Does NOT prevent return beyond paid amount — the supplier still owes
 * or the user chooses to treat overpayment as credit.
 */
export function calculatePurchaseReturnableAmount(purchase = {}) {
  const total = toNumber(purchase.total, 0)
  const returnedAmount = toNumber(purchase.returnedAmount, 0)
  return Math.max(total - returnedAmount, 0)
}

/**
 * Build a payable summary for every supplier based on their linked purchases.
 *
 * @param {Array} suppliers
 * @param {Array} purchases
 * @returns {Array<{supplier, totalPurchases, totalPaid, totalDue, balanceDue, unpaid, partial, paid, purchaseCount}>}
 */
export function calculateSuppliersPayableSummary(suppliers = [], purchases = []) {
  return suppliers.map((supplier) => {
    const linked = (purchases || []).filter(
      (p) => p.supplierId === supplier.id || p.supplierName === supplier.name,
    )
    const totalPurchases = linked.reduce((s, p) => s + toNumber(p.total, 0), 0)
    const totalPaid = linked.reduce((s, p) => s + toNumber(p.paidAmount, 0), 0)
    const totalDue = totalPurchases - totalPaid
    const unpaidPurchases = linked.filter((p) => calculatePurchasePaymentStatus(p) === 'unpaid').length
    const partialPurchases = linked.filter((p) => calculatePurchasePaymentStatus(p) === 'partial').length
    const paidPurchases = linked.filter((p) => calculatePurchasePaymentStatus(p) === 'paid').length
    return {
      supplier,
      totalPurchases,
      totalPaid,
      totalDue,
      balanceDue: totalDue + toNumber(supplier.openingBalance, 0),
      unpaid: unpaidPurchases,
      partial: partialPurchases,
      paid: paidPurchases,
      purchaseCount: linked.length,
    }
  })
}

/**
 * Build statement rows for a single supplier, ordered chronologically.
 *
 * Each row is either a purchase (debit: supplier owes this amount) or
 * a supplier_payment transaction (credit: reduces the balance).
 *
 * @param {Object} supplier
 * @param {Array}  purchases
 * @param {Array}  transactions – accountTransactions with type 'supplier_payment'
 * @returns {Array<{date, type, reference, description, debit, credit, balance}>}
 */
export function calculateSupplierStatement(supplier = {}, purchases = [], transactions = []) {
  const linkedIds = new Set()
  const linkedPurchases = (purchases || []).filter((p) => {
    const match = p.supplierId === supplier.id || p.supplierName === supplier.name
    if (match) linkedIds.add(p.id)
    return match
  })

  const supplierPayments = (transactions || []).filter(
    (t) =>
      String(t.type || '').toLowerCase() === 'supplier_payment' &&
      (t.supplierName === supplier.name ||
        t.paidTo === supplier.name ||
        t.supplierId === supplier.id ||
        linkedIds.has(t.relatedId)),
  )

  const rows = []

  // Opening balance row
  const openingBalance = toNumber(supplier.openingBalance, 0)
  if (openingBalance !== 0) {
    rows.push({
      date: null,
      type: 'opening_balance',
      reference: '',
      description: 'Opening balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    })
  }

  linkedPurchases.forEach((p) => {
    const date = p.createdAt?.toDate?.() || p.createdAt || null
    rows.push({
      date,
      type: 'purchase',
      reference: p.reference || p.id,
      description: `Purchase order — ${p.reference || p.id} (${p.items?.length || 0} items)`,
      debit: toNumber(p.total, 0),
      credit: 0,
    })
  })

  supplierPayments.forEach((t) => {
    const date = t.createdAt?.toDate?.() || t.createdAt || null
    rows.push({
      date,
      type: 'payment',
      reference: t.reference || t.id,
      description: t.title || `Supplier payment — ${toNumber(t.amount, 0)}`,
      debit: 0,
      credit: toNumber(t.amount, 0),
    })
  })

  // Sort chronologically
  rows.sort((a, b) => {
    const ta = a.date?.getTime?.() || new Date(a.date || 0).getTime() || 0
    const tb = b.date?.getTime?.() || new Date(b.date || 0).getTime() || 0
    if (ta !== tb) return ta - tb
    // Debits (purchases) before credits (payments) on same date
    if (a.type !== b.type) return a.type === 'purchase' ? -1 : 1
    return 0
  })

  // Running balance
  let runningBalance = openingBalance
  rows.forEach((row) => {
    runningBalance = runningBalance + row.debit - row.credit
    row.balance = runningBalance
  })

  return rows
}

/**
 * Calculate total payables across all purchases.
 * @returns {{ totalPurchases, totalPaid, totalDue, unpaidCount, partialCount, paidCount }}
 */
export function calculateTotalPayables(purchases = []) {
  const totalPurchases = purchases.reduce((s, p) => s + toNumber(p.total, 0), 0)
  const totalPaid = purchases.reduce((s, p) => s + toNumber(p.paidAmount, 0), 0)
  const unpaidCount = purchases.filter((p) => calculatePurchasePaymentStatus(p) === 'unpaid').length
  const partialCount = purchases.filter((p) => calculatePurchasePaymentStatus(p) === 'partial').length
  const paidCount = purchases.filter((p) => calculatePurchasePaymentStatus(p) === 'paid').length
  return {
    totalPurchases,
    totalPaid,
    totalDue: totalPurchases - totalPaid,
    unpaidCount,
    partialCount,
    paidCount,
  }
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
  const supplierPayments = calculateSupplierPayments(transactions)
  const refunds = calculateRefundTotal(transactions)
  return {
    walletBalance: totalRevenue - totalExpenses - bankBalance - cashOut - supplierPayments - refunds,
    cashBalance: calculateCashBalance({ invoices, payments, expenses, transactions }),
    bankBalance,
    cashOut,
    supplierPayments,
    refunds,
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
