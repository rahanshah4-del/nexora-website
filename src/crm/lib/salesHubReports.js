import {
  calculateApprovedExpenses,
  calculateRevenue,
  getInvoiceStatus,
} from './calculations.js'
import {
  calculateDealMetrics,
  calculatePipelineMetrics,
  calculateProductMetrics,
  calculateQuoteTotals,
  calculateTaskMetrics,
  dealAmount,
  dealProbability,
  moneyRound,
  safeNumber,
} from './salesCalculations.js'

export const SALES_REPORT_TYPES = [
  { value: 'executive', label: 'Executive Summary' },
  { value: 'pipeline', label: 'Pipeline & Deals' },
  { value: 'leads', label: 'Lead Conversion' },
  { value: 'quotes', label: 'Quotations' },
  { value: 'invoices', label: 'Invoices & Collections' },
  { value: 'expenses', label: 'Approved Expenses' },
  { value: 'team', label: 'Team Performance' },
  { value: 'forecast', label: 'Revenue Forecast' },
  { value: 'customers', label: 'Customers' },
  { value: 'products', label: 'Products & Services' },
]

function status(value, fallback = '') {
  return String(value || fallback).trim().toLowerCase().replaceAll(' ', '_')
}

function dateText(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB') : '-'
}

function quoteValue(quote = {}) {
  const stored = safeNumber(quote.grandTotal ?? quote.total)
  if (stored > 0) return stored
  return calculateQuoteTotals(quote.items || [], quote.discountPercent, quote.taxPercent).grandTotal
}

function invoiceTotal(invoice = {}) {
  return Math.max(0, safeNumber(invoice.total ?? invoice.totalUsd ?? invoice.grandTotal))
}

function invoicePaid(invoice = {}) {
  return Math.max(0, safeNumber(invoice.amountPaid ?? invoice.partialPaidAmount))
}

function invoiceBalance(invoice = {}) {
  return Math.max(0, safeNumber(invoice.balanceDue, invoiceTotal(invoice) - invoicePaid(invoice)))
}

function financialInvoice(invoice = {}) {
  return !['rejected', 'cancelled', 'void'].includes(status(getInvoiceStatus(invoice)))
}

function activeCustomer(customer = {}) {
  return !['archived', 'inactive', 'deleted'].includes(status(customer.status, 'active'))
}

function leadConverted(lead = {}) {
  return ['converted', 'won', 'customer'].includes(status(lead.status || lead.stage))
}

function leadLost(lead = {}) {
  return ['lost', 'rejected', 'disqualified'].includes(status(lead.status || lead.stage))
}

export function calculateSalesHubReportMetrics(data = {}) {
  const deals = data.deals || []
  const tasks = data.tasks || []
  const quotes = data.quotes || []
  const products = data.products || []
  const invoices = data.invoices || []
  const payments = data.payments || []
  const expenses = data.expenses || []
  const customers = data.customers || []
  const leads = data.leads || []
  const dealMetrics = calculateDealMetrics(deals)
  const pipelineMetrics = calculatePipelineMetrics(deals)
  const taskMetrics = calculateTaskMetrics(tasks)
  const productMetrics = calculateProductMetrics(products)
  const revenue = moneyRound(calculateRevenue({ invoices, payments }))
  const approvedExpenses = moneyRound(calculateApprovedExpenses(expenses, []))
  const profit = moneyRound(revenue - approvedExpenses)
  const activeInvoices = invoices.filter(financialInvoice)
  const invoiceTotalValue = moneyRound(activeInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0))
  const outstanding = moneyRound(activeInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0))
  const paidInvoices = activeInvoices.filter((invoice) => getInvoiceStatus(invoice) === 'paid').length
  const overdueInvoices = activeInvoices.filter((invoice) => getInvoiceStatus(invoice) === 'overdue').length
  const convertedLeads = leads.filter(leadConverted).length
  const lostLeads = leads.filter(leadLost).length
  const activeLeads = Math.max(0, leads.length - convertedLeads - lostLeads)
  const leadConversionRate = leads.length ? moneyRound((convertedLeads / leads.length) * 100) : 0
  const acceptedQuotes = quotes.filter((quote) => status(quote.status) === 'accepted')
  const quoteValueTotal = moneyRound(quotes.reduce((sum, quote) => sum + quoteValue(quote), 0))
  const acceptedQuoteValue = moneyRound(acceptedQuotes.reduce((sum, quote) => sum + quoteValue(quote), 0))
  const activeCustomers = customers.filter(activeCustomer).length

  return {
    dealMetrics,
    pipelineMetrics,
    taskMetrics,
    productMetrics,
    revenue,
    approvedExpenses,
    profit,
    invoiceTotalValue,
    outstanding,
    paidInvoices,
    overdueInvoices,
    totalInvoices: invoices.length,
    totalLeads: leads.length,
    activeLeads,
    convertedLeads,
    lostLeads,
    leadConversionRate,
    totalQuotes: quotes.length,
    acceptedQuotes: acceptedQuotes.length,
    quoteValueTotal,
    acceptedQuoteValue,
    totalCustomers: customers.length,
    activeCustomers,
  }
}

function moneyColumn(key, label) {
  return { key, label, numeric: true, money: true }
}

function teamRows(tasks = []) {
  const map = new Map()
  tasks.forEach((task) => {
    const owner = String(task.owner || task.assignedTo || task.assignee || 'Unassigned').trim() || 'Unassigned'
    const current = map.get(owner) || { owner, total: 0, completed: 0, overdue: 0 }
    current.total += 1
    if (status(task.status) === 'completed') current.completed += 1
    const due = task.dueDate ? new Date(task.dueDate) : null
    if (due && !Number.isNaN(due.getTime()) && due < new Date() && status(task.status) !== 'completed') current.overdue += 1
    map.set(owner, current)
  })
  return Array.from(map.values()).map((row) => ({ ...row, completion: row.total ? moneyRound((row.completed / row.total) * 100) : 0 }))
}

export function buildSalesHubReport(type, data = {}, options = {}) {
  const currency = options.currency || 'PKR'
  const metrics = calculateSalesHubReportMetrics(data)
  const common = {
    type,
    currency,
    summary: [
      { label: 'Revenue', value: metrics.revenue, money: true },
      { label: 'Profit', value: metrics.profit, money: true },
      { label: 'Pipeline', value: metrics.pipelineMetrics.pipelineValue, money: true },
      { label: 'Conversion', value: `${metrics.leadConversionRate}%` },
    ],
  }

  if (type === 'pipeline') return { ...common, title: 'Pipeline & Deals Report', rows: data.deals || [], columns: [
    { key: 'title', label: 'Deal' }, { key: 'customerName', label: 'Customer' }, { key: 'stage', label: 'Stage' }, moneyColumn('value', 'Value'), { key: 'probability', label: 'Probability', value: (row) => `${dealProbability(row)}%` }, { key: 'expectedCloseDate', label: 'Close Date', value: (row) => dateText(row.expectedCloseDate) },
  ], amountKey: 'value', totalLabel: 'Deal value', totalValue: (data.deals || []).reduce((sum, row) => sum + dealAmount(row), 0) }

  if (type === 'leads') return { ...common, title: 'Lead Conversion Report', rows: data.leads || [], columns: [
    { key: 'name', label: 'Lead', value: (row) => row.name || row.leadName || row.title || '-' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'Status' }, { key: 'source', label: 'Source' }, { ...moneyColumn('expectedValuePkr', 'Expected Value'), value: (row) => row.expectedValuePkr ?? row.expectedValue ?? row.value ?? 0 },
  ], amountKey: 'expectedValuePkr', totalLabel: 'Expected lead value', totalValue: (data.leads || []).reduce((sum, row) => sum + safeNumber(row.expectedValuePkr ?? row.expectedValue ?? row.value), 0) }

  if (type === 'quotes') return { ...common, title: 'Quotation Report', rows: (data.quotes || []).map((row) => ({ ...row, reportTotal: quoteValue(row) })), columns: [
    { key: 'quoteNumber', label: 'Quote' }, { key: 'customerName', label: 'Customer' }, { key: 'status', label: 'Status' }, moneyColumn('reportTotal', 'Total'), { key: 'validUntil', label: 'Valid Until', value: (row) => dateText(row.validUntil) },
  ], amountKey: 'reportTotal', totalLabel: 'Quotation value', totalValue: metrics.quoteValueTotal }

  if (type === 'invoices') return { ...common, title: 'Invoices & Collections Report', rows: (data.invoices || []).filter(financialInvoice).map((row) => ({ ...row, reportTotal: invoiceTotal(row), reportPaid: invoicePaid(row), reportBalance: invoiceBalance(row), reportStatus: getInvoiceStatus(row) })), columns: [
    { key: 'invoiceNumber', label: 'Invoice' }, { key: 'customerName', label: 'Customer' }, { key: 'reportStatus', label: 'Status' }, moneyColumn('reportTotal', 'Total'), moneyColumn('reportPaid', 'Paid'), moneyColumn('reportBalance', 'Balance'),
  ], amountKey: 'reportTotal', totalLabel: 'Invoice value', totalValue: metrics.invoiceTotalValue }

  if (type === 'expenses') return { ...common, title: 'Approved Expenses Report', rows: (data.expenses || []).filter((row) => ['approved', 'paid', 'completed'].includes(status(row.approvalStatus || row.status))), columns: [
    { key: 'title', label: 'Expense', value: (row) => row.title || row.name || row.category || '-' }, { key: 'category', label: 'Category' }, { key: 'paymentMethod', label: 'Method' }, moneyColumn('amount', 'Amount'), { key: 'createdAt', label: 'Date', value: (row) => dateText(row.approvedAt || row.createdAt) },
  ], amountKey: 'amount', totalLabel: 'Approved expenses', totalValue: metrics.approvedExpenses }

  if (type === 'team') return { ...common, title: 'Team Performance Report', rows: teamRows(data.tasks || []), columns: [
    { key: 'owner', label: 'Team Member' }, { key: 'total', label: 'Tasks', numeric: true }, { key: 'completed', label: 'Completed', numeric: true }, { key: 'overdue', label: 'Overdue', numeric: true }, { key: 'completion', label: 'Completion', value: (row) => `${row.completion}%` },
  ], totalLabel: 'Team members', totalValue: teamRows(data.tasks || []).length }

  if (type === 'forecast') return { ...common, title: 'Revenue Forecast Report', rows: (data.deals || []).filter((row) => !['won', 'lost'].includes(status(row.stage || row.status))).map((row) => ({ ...row, expected: moneyRound((dealAmount(row) * dealProbability(row)) / 100) })), columns: [
    { key: 'title', label: 'Deal' }, { key: 'stage', label: 'Stage' }, moneyColumn('value', 'Value'), { key: 'probability', label: 'Probability', value: (row) => `${dealProbability(row)}%` }, moneyColumn('expected', 'Weighted'), { key: 'expectedCloseDate', label: 'Close Date', value: (row) => dateText(row.expectedCloseDate) },
  ], amountKey: 'expected', totalLabel: 'Weighted forecast', totalValue: metrics.pipelineMetrics.weightedPipeline }

  if (type === 'customers') return { ...common, title: 'Customer Report', rows: data.customers || [], columns: [
    { key: 'name', label: 'Customer' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'Status' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
  ], totalLabel: 'Customers', totalValue: metrics.totalCustomers }

  if (type === 'products') {
    const activeProducts = (data.products || []).filter((row) => status(row.status, 'active') !== 'archived')
    return { ...common, title: 'Products & Services Report', rows: activeProducts, columns: [
    { key: 'name', label: 'Product / Service', value: (row) => row.name || row.title || '-' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }, { ...moneyColumn('unitPrice', 'Price'), value: (row) => row.unitPrice ?? row.price ?? 0 }, moneyColumn('costPrice', 'Cost'),
    ], amountKey: 'unitPrice', totalLabel: 'Catalog price total', totalValue: activeProducts.reduce((sum, row) => sum + safeNumber(row.unitPrice ?? row.price), 0) }
  }

  const rows = [
    ['Revenue collected', metrics.revenue, true], ['Approved expenses', metrics.approvedExpenses, true], ['Net profit', metrics.profit, true], ['Open pipeline', metrics.pipelineMetrics.pipelineValue, true], ['Weighted forecast', metrics.pipelineMetrics.weightedPipeline, true], ['Won deal value', metrics.dealMetrics.wonValue, true], ['Outstanding invoices', metrics.outstanding, true], ['Lead conversion', `${metrics.leadConversionRate}%`, false], ['Active customers', metrics.activeCustomers, false], ['Completed tasks', metrics.taskMetrics.completedTasks, false],
  ].map(([metric, value, money]) => ({ metric, value, money }))
  return { ...common, title: 'Sales Hub Executive Summary', rows, columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value', value: (row) => row.money ? `${currency} ${safeNumber(row.value).toLocaleString()}` : row.value }], totalLabel: 'Report metrics', totalValue: rows.length }
}
