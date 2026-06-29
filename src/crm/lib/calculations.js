const paidStatuses = new Set(['paid', 'complete', 'completed', 'verified'])
const rejectedStatuses = new Set(['rejected', 'cancelled', 'canceled'])
const pendingStatuses = new Set(['pending', 'pending_verification', 'pending_partial', 'partial_pending', 'pending_approval'])
const approvedStatuses = new Set(['approved', 'paid', 'complete', 'completed', 'verified'])
const revenueInvoiceStatuses = new Set(['approved', 'paid'])
const incomeTransactionTypes = new Set(['income'])
const expenseTransactionTypes = new Set(['expense', 'cash_payment'])
const inactivePipelineStatuses = new Set(['converted', 'customer', 'won', 'lost', 'closed', 'rejected', 'paid', 'completed', 'cancelled', 'canceled'])
const inactivePipelineTerms = Array.from(inactivePipelineStatuses)

export function statusValue(value, fallback = 'pending') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

export function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export function warnInvalidData() {}

export function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase()
  return currency || 'PKR'
}

export function normalizeInvoiceItem(item = {}) {
  const quantity = Math.max(toNumber(item.quantity ?? item.qty, 0), 0)
  const price = Math.max(toNumber(item.price ?? item.rate ?? item.priceUsd, 0), 0)
  const lineSubtotal = quantity * price
  const discountPercent = Math.min(Math.max(toNumber(item.discountPercent ?? item.discountRate, 0), 0), 100)
  const percentDiscount = lineSubtotal * (discountPercent / 100)
  const absoluteDiscount =
    item.discountPercent !== undefined || item.discountRate !== undefined
      ? percentDiscount
      : Math.min(Math.max(toNumber(item.discount, 0), 0), lineSubtotal)
  const taxableAmount = Math.max(lineSubtotal - absoluteDiscount, 0)
  const taxRate = Math.max(toNumber(item.taxRate ?? item.taxPercent, 0), 0)
  const taxAmount = taxableAmount * (taxRate / 100)
  const lineTotal = taxableAmount + taxAmount
  if (item.price === undefined && item.rate === undefined && item.priceUsd === undefined) warnInvalidData('Invoice item is missing price.', item)
  return {
    ...item,
    quantity,
    qty: quantity,
    price,
    rate: price,
    discountPercent,
    discountAmount: absoluteDiscount,
    taxableAmount,
    taxRate,
    taxAmount,
    lineSubtotal,
    lineTotal,
  }
}

export function calculateBalanceDue(total = 0, amountPaid = 0) {
  return Math.max(toNumber(total, 0) - toNumber(amountPaid, 0), 0)
}

export function calculateInvoiceTotals(input = {}) {
  const items = Array.isArray(input.items) ? input.items.map(normalizeInvoiceItem) : []
  const hasLineDiscounts = items.some((item) => toNumber(item.discountAmount, 0) > 0)
  const hasLineTaxes = items.some((item) => toNumber(item.taxRate, 0) > 0 || toNumber(item.taxAmount, 0) > 0)
  const subtotal = items.length
    ? items.reduce((sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity ?? item.qty, 0), 0)
    : Math.max(toNumber(input.subtotal ?? input.subtotalUsd, 0), 0)
  const lineDiscount = items.reduce((sum, item) => sum + toNumber(item.discountAmount, 0), 0)
  const inputDiscount = Math.max(toNumber(input.discountTotal ?? input.discount, 0), 0)
  const discountSource = hasLineDiscounts ? lineDiscount : inputDiscount
  const taxableAmount = items.length
    ? Math.max(subtotal - discountSource, 0)
    : Math.max(toNumber(input.taxableAmount ?? subtotal - discountSource, 0), 0)
  const taxRate = Math.max(toNumber(input.taxRate, 0), 0)
  const lineTax = items.reduce((sum, item) => sum + toNumber(item.taxAmount, 0), 0)
  const taxAmount =
    hasLineTaxes
      ? lineTax
      : items.length || input.taxAmount === undefined
        ? taxableAmount * (taxRate / 100)
        : Math.max(toNumber(input.taxAmount ?? input.taxTotal, 0), 0)
  const maxDiscount = Math.max(subtotal, 0)
  const discount = Math.min(discountSource, maxDiscount)
  const roundOff = toNumber(input.roundOff, 0)
  const calculatedTotal = Math.max(taxableAmount + taxAmount + roundOff, 0)
  const total = items.length || input.total === undefined ? calculatedTotal : Math.max(toNumber(input.total ?? input.totalUsd, calculatedTotal), 0)
  const amountPaid = Math.min(Math.max(toNumber(input.amountPaid ?? input.partialPaidAmount, 0), 0), total)
  const balanceDue = calculateBalanceDue(total, amountPaid)

  if (!Number.isFinite(total)) warnInvalidData('Invoice total is invalid.', input)
  if (!String(input.currency || '').trim()) warnInvalidData('Invoice is missing currency.', input)
  if (!input.customerName && !input.customerEmail && !input.clientName) warnInvalidData('Invoice is missing customer details.', input)

  return {
    items,
    subtotal,
    taxableAmount,
    taxRate,
    taxAmount,
    taxTotal: taxAmount,
    discount,
    discountTotal: discount,
    roundOff,
    total,
    amountPaid,
    partialPaidAmount: amountPaid,
    balanceDue,
    currency: normalizeCurrency(input.currency),
  }
}

export function getInvoiceStatus(invoice = {}) {
  const safe = invoice || {}
  const status = statusValue(safe.status, '')
  const paymentStatus = statusValue(safe.paymentStatus, '')
  const total = toNumber(safe.total ?? safe.totalUsd, 0)
  const amountPaid = toNumber(safe.amountPaid ?? safe.partialPaidAmount, 0)
  const balanceDue = calculateBalanceDue(total, amountPaid)
  const dueDate = safe.dueDate ? new Date(safe.dueDate) : null
  const approvalStatus = statusValue(safe.approvalStatus, '')

  if (rejectedStatuses.has(status) || rejectedStatuses.has(paymentStatus) || rejectedStatuses.has(approvalStatus)) return 'rejected'
  if (paidStatuses.has(status) || paidStatuses.has(paymentStatus) || (total > 0 && balanceDue <= 0)) return 'paid'
  if (amountPaid > 0 && balanceDue > 0) return 'partial_paid'
  if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) return 'overdue'
  if (approvalStatus === 'approved' || status === 'approved') return 'approved'
  if (status === 'sent') return 'sent'
  if (approvalStatus === 'pending' || approvalStatus === 'pending_approval' || status === 'pending_approval') return 'pending_approval'
  if (pendingStatuses.has(status) || pendingStatuses.has(paymentStatus)) return 'pending'
  return status || paymentStatus || 'pending'
}

export function isPaidRecord(record = {}) {
  const safe = record || {}
  const status = statusValue(safe.paymentStatus || safe.status, '')
  const approvalStatus = statusValue(safe.approvalStatus, '')
  if (isRejectedRecord(safe)) return false
  return paidStatuses.has(status) || approvedStatuses.has(status) || approvedStatuses.has(approvalStatus)
}

export function isRejectedRecord(record = {}) {
  const safe = record || {}
  return [safe.status, safe.paymentStatus, safe.approvalStatus]
    .map((value) => statusValue(value, ''))
    .some((status) => rejectedStatuses.has(status))
}

export function transactionStatusValue(transaction = {}) {
  const safe = transaction || {}
  return statusValue(safe.approvalStatus || safe.status, 'pending')
}

export function transactionTypeValue(transaction = {}) {
  return statusValue(transaction?.type, 'adjustment')
}

export function isApprovedTransaction(transaction = {}) {
  return !isRejectedRecord(transaction) && approvedStatuses.has(transactionStatusValue(transaction))
}

export function transactionAmount(transaction = {}) {
  const safe = transaction || {}
  return Math.max(toNumber(safe.amount ?? safe.amountPaid ?? safe.total, 0), 0)
}

export function isApprovedExpense(expense = {}) {
  const safe = expense || {}
  const approvalStatus = statusValue(safe.approvalStatus, '')
  const status = statusValue(safe.status, '')
  return !isRejectedRecord(safe) && (approvedStatuses.has(approvalStatus) || approvedStatuses.has(status))
}

export function amountValue(record = {}) {
  const safe = record || {}
  const value = safe.amount ?? safe.amountPaid ?? safe.total ?? safe.totalUsd ?? safe.planPrice ?? safe.value
  if (value === undefined || value === null || value === '') warnInvalidData('Record amount is missing.', safe)
  return Math.max(toNumber(value, 0), 0)
}

export function invoiceValue(invoice = {}) {
  return Math.max(toNumber(invoice.total ?? invoice.totalUsd ?? invoice.amount ?? invoice.amountUsd, 0), 0)
}

export function invoicePaidValue(invoice = {}) {
  return Math.min(Math.max(toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0), 0), invoiceValue(invoice))
}

export function invoiceBalanceDue(invoice = {}) {
  return Math.max(toNumber(invoice.balanceDue, calculateBalanceDue(invoiceValue(invoice), invoicePaidValue(invoice))), 0)
}

export function isOutstandingInvoice(invoice = {}) {
  const status = getInvoiceStatus(invoice)
  return !['paid', 'rejected', 'cancelled', 'canceled'].includes(status) && invoiceBalanceDue(invoice) > 0
}

export function paymentValue(payment = {}) {
  return Math.max(toNumber(payment.amount ?? payment.amountUsd ?? payment.amountPaid, 0), 0)
}

export function expenseValue(expense = {}) {
  return Math.max(toNumber(expense.amount ?? expense.total ?? expense.amountUsd ?? expense.totalUsd, 0), 0)
}

function recordKeys(record = {}) {
  return [
    record.id,
    record.invoiceId,
    record.invoiceNumber,
    record.paymentId,
    record.expenseId,
    record.relatedId,
    record.sourceId,
    record.reference,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function approvedTransactionsByType(transactions = [], typeSet = incomeTransactionTypes) {
  return transactions.filter((transaction) => isApprovedTransaction(transaction) && typeSet.has(transactionTypeValue(transaction)))
}

function coveredKeys(transactions = []) {
  const keys = new Set()
  transactions.forEach((transaction) => {
    recordKeys(transaction).forEach((key) => keys.add(key))
  })
  return keys
}

function isCovered(record, keys) {
  return recordKeys(record).some((key) => keys.has(key))
}

function linkedRecordLookup(records = []) {
  const lookup = new Map()
  records.forEach((record) => recordKeys(record).forEach((key) => lookup.set(key, record)))
  return lookup
}

function sumLinkedAmountsWithCap(rows = [], sourceRecords = [], rowAmount, sourceAmount) {
  const lookup = linkedRecordLookup(sourceRecords)
  const appliedBySource = new Map()
  return rows.reduce((sum, row) => {
    const sourceKey = recordKeys(row).find((key) => lookup.has(key))
    const amount = Math.max(toNumber(rowAmount(row), 0), 0)
    if (!sourceKey) return sum + amount
    const source = lookup.get(sourceKey)
    const canonicalKey = recordKeys(source)[0] || sourceKey
    const limit = Math.max(toNumber(sourceAmount(source), 0), 0)
    if (!limit) return sum + amount
    const alreadyApplied = appliedBySource.get(canonicalKey) || 0
    const applied = Math.min(amount, Math.max(0, limit - alreadyApplied))
    appliedBySource.set(canonicalKey, alreadyApplied + applied)
    return sum + applied
  }, 0)
}

export function pipelineItemValue(item = {}) {
  return Math.max(
    toNumber(
      item.expectedValue ??
        item.expectedValuePkr ??
        item.expectedValueUsd ??
        item.dealValue ??
        item.dealValueUsd ??
        item.value ??
        item.valueUsd ??
        item.amount,
      0,
    ),
    0,
  )
}

export function isActivePipelineItem(item = {}) {
  const status = statusValue(item.status || item.stage || item.pipelineStatus, 'active')
  return !inactivePipelineTerms.some((term) => status === term || status.includes(term))
}

export function isConvertedLead(lead = {}) {
  const status = statusValue(lead.status || lead.stage || lead.pipelineStatus, '')
  return ['converted', 'customer', 'won', 'paid', 'completed'].some((term) => status.includes(term))
}

export function calculatePipelineValue({ leads = [], deals = [] } = {}) {
  return [...leads, ...deals]
    .filter(isActivePipelineItem)
    .reduce((sum, item) => sum + pipelineItemValue(item), 0)
}

export function calculateConversionRate(leads = []) {
  if (!leads.length) return 0
  const convertedLeads = leads.filter(isConvertedLead).length
  return (convertedLeads / leads.length) * 100
}

export function calculateRevenueBreakdown({ invoices = [], payments = [], transactions = [] } = {}) {
  const rejectedInvoiceKeys = coveredKeys(invoices.filter(isRejectedRecord))
  const rejectedPaymentKeys = coveredKeys(payments.filter(isRejectedRecord))
  const rejectedSourceKeys = new Set([...rejectedInvoiceKeys, ...rejectedPaymentKeys])
  const incomeTransactions = approvedTransactionsByType(transactions, incomeTransactionTypes)
    .filter((transaction) => !isCovered(transaction, rejectedSourceKeys))
  const incomeCoveredKeys = coveredKeys(incomeTransactions)
  const transactionRevenue = sumLinkedAmountsWithCap(incomeTransactions, invoices, transactionAmount, invoiceValue)

  const paidPayments = payments
    .filter(isPaidRecord)
    .filter((payment) => !isCovered(payment, rejectedSourceKeys))
    .filter((payment) => !isCovered(payment, incomeCoveredKeys))
  const paymentInvoiceIds = new Set(paidPayments.flatMap(recordKeys))
  const paymentRevenue = sumLinkedAmountsWithCap(paidPayments, invoices, paymentValue, invoiceValue)
  const invoiceRevenue = invoices
    .filter((invoice) => revenueInvoiceStatuses.has(getInvoiceStatus(invoice)))
    .filter((invoice) => !isCovered(invoice, incomeCoveredKeys))
    .filter((invoice) => !recordKeys(invoice).some((key) => paymentInvoiceIds.has(key)))
    .reduce((sum, invoice) => sum + invoiceValue(invoice), 0)

  return {
    invoiceRevenue,
    paymentRevenue,
    transactionRevenue,
    totalRevenue: invoiceRevenue + paymentRevenue + transactionRevenue,
  }
}

export function calculateRejectedRevenueBreakdown({ invoices = [], payments = [], transactions = [] } = {}) {
  const rejectedIncomeTransactions = transactions
    .filter((transaction) => incomeTransactionTypes.has(transactionTypeValue(transaction)) && isRejectedRecord(transaction))
  const rejectedTransactionKeys = coveredKeys(rejectedIncomeTransactions)
  const transactionRejected = rejectedIncomeTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)

  const rejectedPayments = payments
    .filter(isRejectedRecord)
    .filter((payment) => !isCovered(payment, rejectedTransactionKeys))
  const rejectedPaymentKeys = coveredKeys(rejectedPayments)
  const paymentRejected = rejectedPayments.reduce((sum, payment) => sum + paymentValue(payment), 0)

  const invoiceRejected = invoices
    .filter(isRejectedRecord)
    .filter((invoice) => !isCovered(invoice, rejectedTransactionKeys))
    .filter((invoice) => !recordKeys(invoice).some((key) => rejectedPaymentKeys.has(key)))
    .reduce((sum, invoice) => sum + invoiceValue(invoice), 0)

  return {
    invoiceRejected,
    paymentRejected,
    transactionRejected,
    totalRejected: invoiceRejected + paymentRejected + transactionRejected,
  }
}

export function calculateRevenue({ invoices = [], payments = [], transactions = [] } = {}) {
  return calculateRevenueBreakdown({ invoices, payments, transactions }).totalRevenue
}

export function calculateExpenseBreakdown({ expenses = [], transactions = [] } = {}) {
  const expenseTransactions = approvedTransactionsByType(transactions, expenseTransactionTypes)
  const expenseCoveredKeys = coveredKeys(expenseTransactions)
  const transactionExpenses = sumLinkedAmountsWithCap(expenseTransactions, expenses, transactionAmount, expenseValue)
  const approvedExpenses = expenses
    .filter(isApprovedExpense)
    .filter((expense) => !isCovered(expense, expenseCoveredKeys))
    .reduce((sum, expense) => sum + expenseValue(expense), 0)

  return {
    approvedExpenses,
    transactionExpenses,
    totalExpenses: approvedExpenses + transactionExpenses,
  }
}

export function calculateApprovedExpenses(expenses = [], transactions = []) {
  return calculateExpenseBreakdown({ expenses, transactions }).totalExpenses
}

export function calculateProfit({ revenue = 0, expenses = 0 } = {}) {
  return toNumber(revenue, 0) - toNumber(expenses, 0)
}

export function getDashboardStats({ invoices = [], payments = [], customers = [], leads = [], expenses = [], transactions = [] } = {}) {
  const totalRevenue = calculateRevenue({ invoices, payments, transactions })
  const totalExpenses = calculateApprovedExpenses(expenses, transactions)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const paidPayments = payments.filter(isPaidRecord)
  const paymentInvoiceIds = new Set(paidPayments.map((payment) => payment.invoiceId).filter(Boolean))
  const isCurrentMonth = (value) => {
    const date = value?.toDate?.() || new Date(value || '')
    return date && !Number.isNaN(date.getTime()) && date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }
  const monthlyPaidPayments = paidPayments.filter((payment) => isCurrentMonth(payment.paidAt || payment.createdAt)).length
  const monthlyPaidInvoices = invoices.filter((invoice) => {
    if (getInvoiceStatus(invoice) !== 'paid') return false
    if (paymentInvoiceIds.has(invoice.id) || paymentInvoiceIds.has(invoice.invoiceNumber)) return false
    return isCurrentMonth(invoice.paidAt || invoice.createdAt || invoice.dueDate)
  }).length
  const monthlySales = monthlyPaidPayments + monthlyPaidInvoices

  return {
    totalRevenue,
    totalCustomers: customers.filter((customer) => !['inactive', 'archived', 'deleted', 'rejected'].includes(statusValue(customer.status, 'active'))).length,
    activeLeads: leads.filter(isActivePipelineItem).length,
    pendingInvoices: invoices.filter(isOutstandingInvoice).length,
    monthlySales,
    expenses: totalExpenses,
    profit: calculateProfit({ revenue: totalRevenue, expenses: totalExpenses }),
  }
}
