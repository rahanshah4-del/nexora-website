/**
 * Dashboard, Orders/KOT, Reports and Nexora AI must read order money the same
 * way. Regression: desktop-POS orders saved as 'unpaid' were dropped from total
 * sales and from the amount due, so the Dashboard showed less than Orders.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateRestaurantOrderSummary } from '../src/crm/lib/restaurantReports.js'
import { normalizeRestaurantPaymentStatus } from '../src/crm/lib/restaurantPaymentStatus.js'
import { restaurantDashboardMetrics, calculateRestaurantBill, restaurantChargeOptions } from '../src/crm/lib/restaurantPosCalculations.js'
import { normalizeRestaurantOrder } from '../src/crm/data/restaurantOrders.js'
import { runRestaurantAiTool } from '../src/crm/ai/restaurantAiTools.js'

const NOW = new Date(2026, 9, 12, 12, 0, 0)
const at = (h) => new Date(2026, 9, 12, h, 0, 0).toISOString()
const row = (name, qty, price) => ({ itemId: name, item: { id: name, name, price }, qty })

// Same shape as the screenshot: paid orders, two 'unpaid' served orders, one cancelled.
const orders = [
  { orderNumber: '45266', createdAt: at(10), orderType: 'Takeaway', paymentStatus: 'paid', orderStatus: 'served', total: 300, paidAmount: 300, cartRows: [row('Cone', 1, 300)] },
  { orderNumber: '1004', createdAt: at(11), orderType: 'Dine-in', table: 'T-1', paymentStatus: 'paid', orderStatus: 'pending', total: 933, paidAmount: 933, cartRows: [row('Sundae', 3, 311)] },
  { orderNumber: '1011', createdAt: at(12), orderType: 'Dine-in', table: 'T-1', paymentStatus: 'unpaid', orderStatus: 'served', total: 526, paidAmount: 0, dueAmount: 526, cartRows: [row('Shake', 2, 263)] },
  { orderNumber: '1010', createdAt: at(12), orderType: 'Dine-in', table: 'T-1', paymentStatus: 'unpaid', orderStatus: 'served', total: 316, paidAmount: 0, dueAmount: 316, cartRows: [row('Falooda', 1, 316)] },
  { orderNumber: '1012', createdAt: at(12), orderType: 'Dine-in', table: 'T-2', paymentStatus: 'due', orderStatus: 'cancelled', total: 999, paidAmount: 0, dueAmount: 999, cartRows: [row('Cake', 1, 999)] },
]

test('payment status vocabulary maps desktop and legacy values', () => {
  assert.equal(normalizeRestaurantPaymentStatus('unpaid'), 'due')
  assert.equal(normalizeRestaurantPaymentStatus('Partially Paid'), 'partial')
  assert.equal(normalizeRestaurantPaymentStatus('completed'), 'paid')
  assert.equal(normalizeRestaurantPaymentStatus('canceled'), 'cancelled')
  assert.equal(normalizeRestaurantPaymentStatus('pending'), 'pending')
  assert.equal(normalizeRestaurantPaymentStatus('', 'due'), 'due')
})

test("'unpaid' orders count as sales and as due (Dashboard = Orders page)", () => {
  const s = calculateRestaurantOrderSummary(orders)
  assert.equal(s.totalSales, 300 + 933 + 526 + 316)
  assert.equal(s.paidAmount, 300 + 933)
  assert.equal(s.dueAmount, 526 + 316)
  assert.equal(s.paidAmount + s.dueAmount, s.totalSales)
  assert.equal(s.pendingBills, 2)
  assert.equal(s.cancelledOrders, 1)
})

test('cancelled orders never count as pending bills or due', () => {
  const m = restaurantDashboardMetrics({ bills: [{ status: 'paid' }, { status: 'unpaid' }, { status: 'cancelled' }, { status: 'partial' }] })
  assert.equal(m.pendingBills, 2)
})

test('a bill marked paid is settled in full even without a stored paid amount', () => {
  const s = calculateRestaurantOrderSummary([{ orderNumber: '1', createdAt: at(10), paymentStatus: 'paid', orderStatus: 'served', total: 500, cartRows: [row('X', 1, 500)] }])
  assert.equal(s.paidAmount, 500)
  assert.equal(s.dueAmount, 0)
  const local = normalizeRestaurantOrder({ orderNumber: '#1', paymentStatus: 'paid', paidAmount: 0, cartRows: [row('X', 1, 500)] })
  assert.equal(local.paidAmount, 500)
  assert.equal(local.dueAmount, 0)
})

test('due bill with no stored due amount owes total minus paid', () => {
  const s = calculateRestaurantOrderSummary([{ orderNumber: '1', createdAt: at(10), paymentStatus: 'partial', orderStatus: 'served', total: 500, paidAmount: 200, cartRows: [row('X', 1, 500)] }])
  assert.equal(s.dueAmount, 300)
})

test('Nexora AI reads the same numbers as the Dashboard', () => {
  const data = { orders, settings: {}, currency: 'PKR', menuItems: [] }
  const ai = runRestaurantAiTool('get_business_summary', { period: 'all' }, data, { role: 'owner', now: NOW }).result
  const s = calculateRestaurantOrderSummary(orders)
  assert.equal(ai.sales.total, s.totalSales)
  assert.equal(ai.payments.outstanding, s.dueAmount)
  assert.equal(ai.payments.collected, s.paidAmount)
  const unpaid = runRestaurantAiTool('list_orders', { period: 'all', paymentStatus: 'unpaid' }, data, { role: 'owner', now: NOW }).result
  assert.equal(unpaid.matched, 2)
})

test('bill totals: tax and service charge are rounded per line and add up exactly', () => {
  const rows = [row('A', 3, 311), row('B', 1, 199)]
  for (const rest of [{ enableTax: true, taxPercentage: 16 }, { enableTax: true, taxPercentage: 5, enableServiceCharge: true, serviceChargePercentage: 10 }, {}]) {
    const t = calculateRestaurantBill(rows, restaurantChargeOptions(rest))
    assert.equal(t.total, t.netSubtotal + t.serviceCharges + t.tax)
    assert.equal(t.subtotal, 3 * 311 + 199)
    assert.ok(Number.isInteger(t.tax) && Number.isInteger(t.serviceCharges))
  }
  assert.equal(calculateRestaurantBill(rows, restaurantChargeOptions({})).tax, 0)
  assert.equal(calculateRestaurantBill(rows, restaurantChargeOptions({ enableTax: true, taxPercentage: 16 })).tax, Math.round(1132 * 0.16))
})

test('table occupancy: served-but-unpaid still holds the table; paid, cancelled and takeaway do not', async () => {
  const { orderHoldsTable, occupiedTableKeys } = await import('../src/crm/lib/restaurantTableOccupancy.js')
  assert.equal(orderHoldsTable({ orderType: 'Dine-in', table: 'T-1', orderStatus: 'served', paymentStatus: 'unpaid' }), true)
  assert.equal(orderHoldsTable({ orderType: 'Dine-in', table: 'T-1', orderStatus: 'preparing', paymentStatus: 'due' }), true)
  assert.equal(orderHoldsTable({ orderType: 'Dine-in', table: 'T-1', orderStatus: 'served', paymentStatus: 'paid' }), false)
  assert.equal(orderHoldsTable({ orderType: 'Dine-in', table: 'T-1', orderStatus: 'cancelled', paymentStatus: 'due' }), false)
  assert.equal(orderHoldsTable({ orderType: 'Takeaway', table: 'T-1', orderStatus: 'pending', paymentStatus: 'due' }), false)
  assert.deepEqual([...occupiedTableKeys(orders)], ['T-1'])
})

test('Nexora AI table status follows open orders, not only the stored table flag', () => {
  const data = { orders, settings: {}, tables: [{ id: 'T-1', name: 'T-1', status: 'available' }, { id: 'T-2', name: 'T-2', status: 'available' }] }
  const r = runRestaurantAiTool('get_tables_status', {}, data, { role: 'owner', now: NOW }).result
  assert.deepEqual(r.occupied.map((t) => t.name), ['T-1'])
  assert.deepEqual(r.available, ['T-2'])
})
