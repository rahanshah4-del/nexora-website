const paidStatuses = new Set(['paid', 'complete', 'completed', 'verified'])
const rejectedStatuses = new Set(['rejected', 'cancelled', 'canceled'])
const pendingStatuses = new Set(['pending', 'pending_verification', 'pending_partial', 'partial_pending', 'pending_approval'])
const approvedStatuses = new Set(['approved', 'paid', 'complete', 'completed'])
const inactivePipelineStatuses = new Set(['converted', 'customer', 'won', 'lost', 'closed', 'rejected', 'paid', 'completed', 'cancelled', 'canceled'])
const inactivePipelineTerms = Array.from(inactivePipelineStatuses)

export function statusValue(value, fallback = 'pending') {
  return String(value || fallback).trim().toLowerCase()
}

export function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export function warnInvalidData(message, record = {}) {
  if (typeof console === 'undefined') return
  const id = record?.id || record?.invoiceNumber || record?.reference || record?.name || ''
  console.warn('[Nexora CRM data warning]', message, id ? { id } : record)
}

export function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase()
  return currency || 'PKR'
}

export function normalizeInvoiceItem(item = {}) {
  const quantity = Math.max(toNumber(item.quantity ?? item.qty, 0), 0)
  const price = Math.max(toNumber(item.price ?? item.priceUsd, 0), 0)
  if (item.price === undefined && item.priceUsd === undefined) warnInvalidData('Invoice item is missing price.', item)
  return {
    ...item,
    quantity,
    qty: quantity,
    price,
  }
}

export function calculateBalanceDue(total = 0, amountPaid = 0) {
  return Math.max(toNumber(total, 0) - toNumber(amountPaid, 0), 0)
}

export function calculateInvoiceTotals(input = {}) {
  const items = Array.isArray(input.items) ? input.items.map(normalizeInvoiceItem) : []
  const subtotal = items.length
    ? items.reduce((sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity ?? item.qty, 0), 0)
    : Math.max(toNumber(input.subtotal ?? input.subtotalUsd, 0), 0)
  const taxRate = Math.max(toNumber(input.taxRate, 0), 0)
  const taxAmount = items.length || input.taxAmount === undefined ? subtotal * (taxRate / 100) : Math.max(toNumber(input.taxAmount, 0), 0)
  const maxDiscount = Math.max(subtotal + taxAmount, 0)
  const discount = Math.min(Math.max(toNumber(input.discount, 0), 0), maxDiscount)
  const calculatedTotal = Math.max(subtotal + taxAmount - discount, 0)
  const total = items.length || input.total === undefined ? calculatedTotal : Math.max(toNumber(input.total ?? input.totalUsd, calculatedTotal), 0)
  const amountPaid = Math.min(Math.max(toNumber(input.amountPaid ?? input.partialPaidAmount, 0), 0), total)
  const balanceDue = calculateBalanceDue(total, amountPaid)

  if (!Number.isFinite(total)) warnInvalidData('Invoice total is invalid.', input)
  if (!String(input.currency || '').trim()) warnInvalidData('Invoice is missing currency.', input)
  if (!input.customerName && !input.customerEmail && !input.clientName) warnInvalidData('Invoice is missing customer details.', input)

  return {
    items,
    subtotal,
    taxableAmount: subtotal,
    taxRate,
    taxAmount,
    discount,
    total,
    amountPaid,
    partialPaidAmount: amountPaid,
    balanceDue,
    currency: normalizeCurrency(input.currency),
  }
}

export function getInvoiceStatus(invoice = {}) {
  const status = statusValue(invoice.status, '')
  const paymentStatus = statusValue(invoice.paymentStatus, '')
  const total = toNumber(invoice.total ?? invoice.totalUsd, 0)
  const amountPaid = toNumber(invoice.amountPaid ?? invoice.partialPaidAmount, 0)
  const balanceDue = calculateBalanceDue(total, amountPaid)
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null

  if (rejectedStatuses.has(status) || rejectedStatuses.has(paymentStatus)) return 'rejected'
  if (paidStatuses.has(status) || paidStatuses.has(paymentStatus) || (total > 0 && balanceDue <= 0)) return 'paid'
  if (amountPaid > 0 && balanceDue > 0) return 'partial'
  if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) return 'overdue'
  if (pendingStatuses.has(status) || pendingStatuses.has(paymentStatus)) return 'pending'
  return status || paymentStatus || 'pending'
}

export function isPaidRecord(record = {}) {
  return paidStatuses.has(statusValue(record.paymentStatus || record.status, ''))
}

export function isApprovedExpense(expense = {}) {
  const approvalStatus = statusValue(expense.approvalStatus, '')
  const status = statusValue(expense.status, '')
  return approvedStatuses.has(approvalStatus) || approvedStatuses.has(status)
}

export function amountValue(record = {}) {
  const value = record.amount ?? record.amountPaid ?? record.total ?? record.totalUsd ?? record.planPrice ?? record.value
  if (value === undefined || value === null || value === '') warnInvalidData('Record amount is missing.', record)
  return Math.max(toNumber(value, 0), 0)
}

export function invoiceValue(invoice = {}) {
  return Math.max(toNumber(invoice.total ?? invoice.totalUsd ?? invoice.amount ?? invoice.amountUsd, 0), 0)
}

export function paymentValue(payment = {}) {
  return Math.max(toNumber(payment.amount ?? payment.amountUsd ?? payment.amountPaid, 0), 0)
}

export function expenseValue(expense = {}) {
  return Math.max(toNumber(expense.amount ?? expense.total ?? expense.amountUsd ?? expense.totalUsd, 0), 0)
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

export function calculateRevenue({ invoices = [], payments = [] } = {}) {
  const paidPayments = payments.filter(isPaidRecord)
  const paymentInvoiceIds = new Set(paidPayments.map((payment) => payment.invoiceId).filter(Boolean))
  const paymentRevenue = paidPayments.reduce((sum, payment) => sum + paymentValue(payment), 0)
  const invoiceRevenue = invoices
    .filter((invoice) => getInvoiceStatus(invoice) === 'paid')
    .filter((invoice) => !paymentInvoiceIds.has(invoice.id) && !paymentInvoiceIds.has(invoice.invoiceNumber))
    .reduce((sum, invoice) => sum + invoiceValue(invoice), 0)

  return paymentRevenue + invoiceRevenue
}

export function calculateApprovedExpenses(expenses = []) {
  return expenses.filter(isApprovedExpense).reduce((sum, expense) => sum + expenseValue(expense), 0)
}

export function calculateProfit({ revenue = 0, expenses = 0 } = {}) {
  return toNumber(revenue, 0) - toNumber(expenses, 0)
}

export function getDashboardStats({ invoices = [], payments = [], customers = [], leads = [], expenses = [] } = {}) {
  const totalRevenue = calculateRevenue({ invoices, payments })
  const totalExpenses = calculateApprovedExpenses(expenses)
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
    pendingInvoices: invoices.filter((invoice) => getInvoiceStatus(invoice) === 'pending').length,
    monthlySales,
    expenses: totalExpenses,
    profit: calculateProfit({ revenue: totalRevenue, expenses: totalExpenses }),
  }
}
