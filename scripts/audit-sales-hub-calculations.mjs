import assert from 'node:assert/strict'
import {
  calculateDealMetrics,
  calculatePipelineMetrics,
  calculateProductMetrics,
  calculateQuoteTotals,
  calculateTaskMetrics,
  dealProbability,
} from '../src/crm/lib/salesCalculations.js'
import {
  calculateConversionRate,
  calculatePipelineValue,
  calculateRevenue,
  getDashboardStats,
} from '../src/crm/lib/calculations.js'
import { buildSalesHubReport, calculateSalesHubReportMetrics } from '../src/crm/lib/salesHubReports.js'

function closeTo(actual, expected, label) {
  assert.equal(Math.round(Number(actual) * 100) / 100, expected, label)
}

const products = [
  { name: 'CRM Starter', unitPrice: 10000, costPrice: 4000, status: 'Active' },
  { name: 'CRM Pro', price: 20000, costPrice: 8000, status: 'Active' },
  { name: 'Old Package', unitPrice: 5000, costPrice: 1000, status: 'Archived' },
]

const customers = [
  { name: 'Alpha Traders', status: 'active' },
  { name: 'Beta Store', status: 'Active' },
  { name: 'Old Customer', status: 'archived' },
]

const leads = [
  { name: 'Hot Lead', expectedValuePkr: 50000, status: 'Qualified', score: 91 },
  { name: 'Converted Lead', expectedValuePkr: 30000, status: 'Converted', score: 88 },
  { name: 'Lost Lead', expectedValuePkr: 15000, status: 'Lost', score: 35 },
]

const deals = [
  { title: 'New POS Deal', value: 100000, stage: 'Proposal', probability: 40 },
  { title: 'Won CRM Deal', value: 50000, stage: 'Won', probability: 20 },
  { title: 'Lost School Deal', value: 25000, status: 'Lost', probability: 60 },
  { title: 'Status Won Deal', value: 12000, stage: 'Negotiation', status: 'Won', probability: 15 },
]

const quoteItems = [
  { name: 'CRM Starter', qty: 2, unitPrice: 10000 },
  { name: 'Setup', quantity: 1, price: 5000 },
]

const tasks = [
  { title: 'Call Alpha', dueDate: new Date(Date.now() - 86400000).toISOString(), status: 'Upcoming', owner: 'Farhan' },
  { title: 'Send proposal', dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'Upcoming', owner: 'Farhan' },
  { title: 'Close won deal', dueDate: new Date().toISOString(), status: 'Completed', owner: 'Admin' },
]

const invoices = [
  { id: 'inv-1', invoiceNumber: 'INV-1', total: 10000, amountPaid: 10000, status: 'paid', customerName: 'Alpha Traders' },
  { id: 'inv-2', invoiceNumber: 'INV-2', total: 8000, amountPaid: 2000, status: 'partial_paid', customerName: 'Beta Store' },
  { id: 'inv-3', invoiceNumber: 'INV-3', total: 12000, amountPaid: 0, status: 'rejected', customerName: 'Old Customer' },
]

const payments = [
  { id: 'pay-1', invoiceId: 'inv-1', amount: 10000, status: 'paid' },
  { id: 'pay-2', invoiceId: 'inv-2', amount: 2000, status: 'paid' },
]

const expenses = [
  { amount: 1500, status: 'approved' },
  { amount: 700, status: 'pending' },
]

const productMetrics = calculateProductMetrics(products)
assert.equal(productMetrics.totalProducts, 2, 'archived products should not count')
closeTo(productMetrics.grossMargin, 18000, 'gross margin should be price minus cost')
closeTo(productMetrics.marginPercent, 60, 'margin percent should be gross margin over revenue')
closeTo(productMetrics.averagePrice, 15000, 'average price should use active products')

const quoteTotals = calculateQuoteTotals(quoteItems, 10, 5)
closeTo(quoteTotals.subtotal, 25000, 'quote subtotal')
closeTo(quoteTotals.discountTotal, 2500, 'quote discount')
closeTo(quoteTotals.taxTotal, 1125, 'quote tax')
closeTo(quoteTotals.grandTotal, 23625, 'quote grand total')

const pipelineMetrics = calculatePipelineMetrics(deals)
closeTo(pipelineMetrics.pipelineValue, 100000, 'pipeline value should include open deals only')
closeTo(pipelineMetrics.weightedPipeline, 40000, 'weighted pipeline should include open weighted value only')
closeTo(pipelineMetrics.wonValue, 62000, 'won value should include stage or status won')
closeTo(pipelineMetrics.lostValue, 25000, 'lost value should include stage or status lost')
closeTo(pipelineMetrics.conversionRate, 66.67, 'conversion rate should be won over closed deals')
assert.equal(dealProbability(deals[1]), 100, 'won stage probability is forced to 100')
assert.equal(dealProbability(deals[2]), 0, 'lost status probability is forced to 0')

const dealMetrics = calculateDealMetrics(deals)
assert.equal(dealMetrics.openDeals, 1, 'open deal count')
assert.equal(dealMetrics.wonDeals, 2, 'won deal count')
assert.equal(dealMetrics.lostDeals, 1, 'lost deal count')
closeTo(dealMetrics.expectedRevenue, 102000, 'expected revenue includes won at 100%, lost at 0%, and open weighted')

closeTo(calculatePipelineValue({ leads, deals: [] }), 50000, 'lead pipeline should exclude converted and lost leads')
closeTo(calculateConversionRate(leads), 33.33, 'lead conversion rate')

const taskMetrics = calculateTaskMetrics(tasks)
assert.equal(taskMetrics.totalTasks, 3, 'task total')
assert.equal(taskMetrics.completedTasks, 1, 'completed task count')
assert.equal(taskMetrics.overdueTasks, 1, 'overdue task count')
closeTo(taskMetrics.completionRate, 33.33, 'task completion rate')

closeTo(calculateRevenue({ invoices, payments }), 12000, 'revenue should not double count paid invoices that have payment rows')
closeTo(calculateRevenue({
  invoices: [invoices[0]],
  transactions: [
    { id: 'income-invoice-inv-1', invoiceId: 'inv-1', amount: 10000, type: 'income', status: 'approved' },
    { id: 'income-payment-duplicate', invoiceId: 'inv-1', paymentId: 'duplicate', amount: 10000, type: 'income', status: 'approved' },
  ],
}), 10000, 'duplicate linked income transactions must be capped to invoice total')
closeTo(calculateRevenue({
  invoices: [invoices[0]],
  transactions: [
    { id: 'income-part-1', invoiceId: 'inv-1', paymentId: 'part-1', amount: 4000, type: 'income', status: 'approved' },
    { id: 'income-part-2', invoiceId: 'inv-1', paymentId: 'part-2', amount: 6000, type: 'income', status: 'approved' },
  ],
}), 10000, 'legitimate partial income transactions must sum to invoice total')
const dashboardStats = getDashboardStats({ invoices, payments, customers, leads, expenses })
assert.equal(dashboardStats.totalCustomers, 2, 'active customer count')
assert.equal(dashboardStats.activeLeads, 1, 'active lead count')
assert.equal(dashboardStats.pendingInvoices, 1, 'pending invoice count')
closeTo(dashboardStats.expenses, 1500, 'approved expenses only')
closeTo(dashboardStats.profit, 10500, 'profit should be revenue minus approved expenses')

const reportMetrics = calculateSalesHubReportMetrics({
  deals,
  tasks,
  quotes: [{ quoteNumber: 'QT-1', status: 'Accepted', items: quoteItems, discountPercent: 10, taxPercent: 5 }],
  products,
  invoices,
  payments,
  expenses,
  customers,
  leads,
})
closeTo(reportMetrics.revenue, 12000, 'report revenue should not double count invoice payments')
closeTo(reportMetrics.approvedExpenses, 1500, 'report expenses should include approved only')
closeTo(reportMetrics.profit, 10500, 'report profit should use collected revenue minus approved expenses')
closeTo(reportMetrics.outstanding, 6000, 'report outstanding should exclude rejected invoices')
closeTo(reportMetrics.leadConversionRate, 33.33, 'report lead conversion should use converted over all leads')
closeTo(reportMetrics.acceptedQuoteValue, 23625, 'report accepted quote value should use quote totals')
const invoiceReport = buildSalesHubReport('invoices', { invoices, payments, expenses, deals, tasks, leads, customers, products, quotes: [] }, { currency: 'PKR' })
closeTo(invoiceReport.totalValue, 18000, 'invoice report total should exclude rejected invoices from financial total')

console.log('Sales Hub calculation audit passed')
console.table({
  products: productMetrics.totalProducts,
  quoteGrandTotal: quoteTotals.grandTotal,
  pipelineValue: pipelineMetrics.pipelineValue,
  weightedPipeline: pipelineMetrics.weightedPipeline,
  wonValue: pipelineMetrics.wonValue,
  revenue: dashboardStats.totalRevenue,
  profit: dashboardStats.profit,
})
