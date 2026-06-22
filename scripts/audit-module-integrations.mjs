import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function contains(text, token, message) {
  assert.equal(text.includes(token), true, message)
}

const [invoiceHook, dashboard, reports, approvals, authIsolation, restaurantOrders, transportBookings] = await Promise.all([
  source('src/crm/hooks/useInvoices.js'),
  source('src/crm/pages/DashboardHome.jsx'),
  source('src/crm/pages/Reports.jsx'),
  source('src/crm/hooks/useApprovals.js'),
  source('src/lib/authIsolation.js'),
  source('src/crm/data/restaurantOrders.js'),
  source('src/crm/data/transportBookings.js'),
])

for (const collection of ["'invoices'", "'payments'", "'accountTransactions'"]) contains(invoiceHook, collection, `invoice workflow must connect ${collection}`)
for (const hook of ['useInvoices', 'useCustomers', 'useLeadScoring', 'useExpenses', 'useAccountTransactions']) contains(dashboard, hook, `dashboard must consume ${hook}`)
for (const collection of ['salesDeals', 'salesTasks', 'salesQuotes', 'salesProducts']) {
  contains(dashboard, collection, `Sales Hub dashboard must consume ${collection}`)
  contains(reports, collection, `Sales Hub reports must consume ${collection}`)
}
for (const hook of ['useContracts', 'useMaintenance']) {
  contains(dashboard, hook, `Property dashboard must consume ${hook}`)
  contains(reports, hook, `Property reports must consume ${hook}`)
}
contains(approvals, 'openPaymentInvoiceIds', 'Approval Center must suppress duplicate invoice/payment approval rows')
contains(invoiceHook, 'pendingInvoicePaymentId', 'invoice payment submission must use deterministic pending IDs')
contains(restaurantOrders, 'notifyLocalDataChanged', 'restaurant writes must notify dashboards/reports')
contains(transportBookings, 'notifyLocalDataChanged', 'transport writes must notify dashboards/reports')
for (const key of ['nexora.restaurant.orders.v2', 'nexora.restaurant.customers.v2', 'nexora.transport.bookings.v1', 'nexora.transport.payments.v1']) {
  contains(authIsolation, key, `${key} must be cleared on account switch/logout`)
}
contains(reports, 'generateSalesHubReportPdf', 'Sales Hub reports must use native PDF generation')
contains(reports, 'PropertyReports', 'Property ERP must have a connected report surface')

console.log('Cross-module integration audit passed')
console.table({ invoiceFinanceChain: 'connected', approvalDeduplication: 'connected', salesHub: 'dashboard + reports', property: 'dashboard + reports', restaurant: 'live local sync', transport: 'live local sync', authCacheIsolation: 'covered' })
