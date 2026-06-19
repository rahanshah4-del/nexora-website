import assert from 'node:assert/strict'
import { calculateRestaurantBill, finalItemPrice, itemDiscountAmount } from '../src/crm/lib/restaurantPosCalculations.js'
import { buildRestaurantReport, calculateRestaurantOrderSummary } from '../src/crm/lib/restaurantReports.js'
import { normalizeRestaurantOrder } from '../src/crm/data/restaurantOrders.js'
import { normalizeInvoiceOrder } from '../src/crm/data/restaurantInvoiceOrders.js'

function closeTo(actual, expected, label) {
  assert.equal(Math.round(Number(actual) * 100) / 100, expected, label)
}

const menu = {
  burger: { id: 'm-1', name: 'Burger', price: 1000, costPrice: 450, discountType: 'percentage', discountValue: 10 },
  fries: { id: 'm-2', name: 'Fries', price: 400, costPrice: 150, discountType: 'fixed', discountValue: 50 },
  pizza: { id: 'm-3', name: 'Pizza', price: 2000, costPrice: 900 },
}

assert.equal(itemDiscountAmount(menu.burger), 100, 'percentage item discount')
assert.equal(finalItemPrice(menu.fries), 350, 'fixed item discount final price')

const bill = calculateRestaurantBill(
  [
    { item: menu.burger, qty: 2 },
    { item: menu.fries, qty: 3 },
  ],
  { discount: 100, serviceRate: 5, taxRate: 10 },
)
closeTo(bill.subtotal, 3200, 'restaurant bill subtotal')
closeTo(bill.discount, 450, 'restaurant bill total discount')
closeTo(bill.netSubtotal, 2750, 'restaurant bill net subtotal')
closeTo(bill.serviceCharges, 137.5, 'restaurant bill service')
closeTo(bill.tax, 275, 'restaurant bill tax')
closeTo(bill.total, 3162.5, 'restaurant bill total')

const dineIn = normalizeRestaurantOrder({
  orderNumber: '#1001',
  orderType: 'Dine-in',
  table: 'T-1',
  customerId: 'cust-1',
  customer: 'Ali',
  paymentMethod: 'Cash',
  paidAmount: 3000,
  orderStatus: 'served',
  createdAt: '2026-06-19T18:00:00.000Z',
  rows: [
    { item: menu.burger, qty: 2 },
    { item: menu.fries, qty: 3 },
  ],
  calculationOptions: { discount: 100, serviceRate: 5, taxRate: 10 },
})

const delivery = normalizeRestaurantOrder({
  orderNumber: '#1002',
  orderType: 'Delivery',
  table: '',
  customerId: 'cust-1',
  customer: 'Ali',
  paymentMethod: 'Card',
  paidAmount: 2500,
  orderStatus: 'ready',
  prepTime: 18,
  createdAt: '2026-06-19T19:00:00.000Z',
  rows: [{ item: menu.pizza, qty: 1 }],
  calculationOptions: { serviceRate: 0, taxRate: 0 },
})

const cancelled = normalizeRestaurantOrder({
  orderNumber: '#1003',
  orderType: 'Takeaway',
  customerId: 'cust-2',
  customer: 'Sara',
  paymentMethod: 'Cash',
  paidAmount: 5000,
  orderStatus: 'cancelled',
  createdAt: '2026-06-19T20:00:00.000Z',
  rows: [{ item: menu.pizza, qty: 2 }],
  calculationOptions: { serviceRate: 0, taxRate: 0 },
})

const invoiceOrder = normalizeInvoiceOrder({
  id: 'inv-1',
  invoiceNumber: 'RINV-1',
  customerName: 'Office Order',
  total: 1500,
  amountPaid: 1000,
  balanceDue: 500,
  status: 'partial_paid',
  paymentMethod: 'Invoice',
  createdAt: '2026-06-19T21:00:00.000Z',
  items: [{ name: 'Tea Flask', quantity: 3, price: 500, costPrice: 200 }],
})

const orders = [dineIn, delivery, cancelled, invoiceOrder]
const customers = [{ id: 'cust-1', name: 'Ali', creditBalance: 300 }]
const summary = calculateRestaurantOrderSummary(orders)
closeTo(summary.totalSales, 6662.5, 'summary excludes cancelled total')
closeTo(summary.paidAmount, 6500, 'summary excludes cancelled paid')
closeTo(summary.dueAmount, 662.5, 'summary excludes cancelled due')
closeTo(summary.discounts, 450, 'summary excludes cancelled discounts')
assert.equal(summary.cancelledOrders, 1, 'cancelled order count')
closeTo(summary.averageOrderValue, 2220.83, 'average order value uses active orders')

const report = buildRestaurantReport(orders, customers, { openingCash: 10000, expenses: 700 })
closeTo(report.totalSales, 6662.5, 'report total sales')
closeTo(report.simpleOrderSales, 5162.5, 'simple order sales')
closeTo(report.invoiceOrderSales, 1500, 'invoice order sales')
closeTo(report.paidAmount, 6500, 'report paid amount')
closeTo(report.dueAmount, 662.5, 'report due amount')
closeTo(report.totalExpenses, 700, 'real approved expenses')
closeTo(report.estimatedProfit, 2662.5, 'estimated profit')
closeTo(report.closing.closingCash, 12300, 'closing cash')
assert.equal(report.simpleOrders, 3, 'simple order count includes cancelled simple order for audit visibility')
assert.equal(report.invoiceOrders, 1, 'invoice order count')
assert.equal(report.cancelledOrders, 1, 'cancelled count')
assert.equal(report.kot.ready, 1, 'ready KOT count')
assert.equal(report.kot.served, 1, 'served KOT count')
assert.equal(report.tableRows.length, 1, 'table report rows')
assert.equal(report.tableRows[0].table, 'T-1', 'table id')
closeTo(report.tableRows[0].sales, 3162.5, 'table sales')
assert.equal(report.itemRows[0].name, 'Fries', 'top selling item by quantity')
assert.equal(report.customerRows[0].name, 'Ali', 'customer report name')
assert.equal(report.customerRows[0].orders, 2, 'customer order count excludes cancelled')
closeTo(report.customerRows[0].due, 462.5, 'customer due includes order dues plus credit balance once')
closeTo(report.salesByType['Dine-in'], 3162.5, 'dine-in sales')
closeTo(report.salesByType.Delivery, 2000, 'delivery sales')
closeTo(report.salesByType.Takeaway, 0, 'cancelled takeaway excluded')
closeTo(report.salesByPayment.Cash, 3162.5, 'cash sales excludes cancelled')
closeTo(report.onlineSales, 2000, 'online sales')
closeTo(report.duePartialSales, 4662.5, 'due/partial active order sales')

console.log('Restaurant POS calculation audit passed')
console.table({
  totalSales: report.totalSales,
  simpleOrders: report.simpleOrders,
  invoiceOrders: report.invoiceOrders,
  paidAmount: report.paidAmount,
  dueAmount: report.dueAmount,
  cancelledOrders: report.cancelledOrders,
  estimatedProfit: report.estimatedProfit,
  closingCash: report.closing.closingCash,
})
