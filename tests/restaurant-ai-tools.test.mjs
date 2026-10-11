/**
 * Nexora AI browser-side tool executors. Pure functions over a data snapshot;
 * dates are built from local-time parts so the suite is timezone independent.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_TOOL_RESULT_MAX_CHARS,
  resolveRange,
  runRestaurantAiTool,
  serializeToolResult,
  toolsAllowedForRole,
} from '../src/crm/ai/restaurantAiTools.js'
import { AI_TOOL_NAMES } from '../workers/nexora-ai-gateway/src/aiTools.js'
import { calculateRestaurantBill } from '../src/crm/lib/restaurantPosCalculations.js'

const NOW = new Date(2026, 9, 11, 17, 0, 0) // Sun 11 Oct 2026, 17:00 local
const at = (dayOffset, h, m = 0) => new Date(2026, 9, 11 + dayOffset, h, m, 0).toISOString()

// Same-day schedule so the business day rolls over at midnight in every timezone.
const settings = { restaurantPos: { openingTime: '09:00', closingTime: '23:00', enableTax: true, taxPercentage: 16, taxLabel: 'GST', enableServiceCharge: false } }

const line = (name, quantity, price, category = 'Food') => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, quantity, price, sellingPrice: price, category })

const orders = [
  { id: 'o1', orderNumber: 'D-1001', createdAt: at(0, 13), orderType: 'Dine-in', table: 'T1', paymentStatus: 'paid', orderStatus: 'served', paymentMethod: 'Cash', items: [line('Zinger Burger', 2, 450)], subtotal: 900, total: 1000, paidAmount: 1000, dueAmount: 0, customerName: 'Walk-in Guest', cashierId: 'u1', cashierName: 'Ali' },
  { id: 'o2', orderNumber: 'D-1002', createdAt: at(0, 14), orderType: 'Takeaway', paymentStatus: 'partial', orderStatus: 'ready', paymentMethod: 'Cash', items: [line('Chicken Karahi', 1, 1200, 'Mains'), line('Cold Drink', 2, 100, 'Drinks')], subtotal: 1400, total: 1200, paidAmount: 700, dueAmount: 500, customerName: 'Bilal', customerId: 'c1', cashierId: 'u1', cashierName: 'Ali' },
  { id: 'o3', orderNumber: 'D-1003', createdAt: at(0, 15), orderType: 'Dine-in', table: 'T2', paymentStatus: 'pending', orderStatus: 'cancelled', items: [line('Fries', 1, 300)], subtotal: 300, total: 300, paidAmount: 0, cancelReason: 'Customer left' },
  { id: 'o4', orderNumber: 'D-1004', createdAt: at(0, 16, 30), orderType: 'Dine-in', table: 'T3', paymentStatus: 'pending', orderStatus: 'preparing', items: [line('Zinger Burger', 1, 450)], subtotal: 450, total: 450, paidAmount: 0 },
  { id: 'o5', orderNumber: 'D-0999', createdAt: at(-1, 20), orderType: 'Delivery', paymentStatus: 'paid', orderStatus: 'served', paymentMethod: 'JazzCash', items: [line('Zinger Burger', 2, 400)], subtotal: 800, total: 800, paidAmount: 800, dueAmount: 0, customerName: 'Sara', customerId: 'c2', cashierId: 'u1', cashierName: 'Ali' },
]

const menuItems = [
  { id: 'm1', name: 'Zinger Burger', price: 450, category: 'Burgers' },
  { id: 'm2', name: 'Beef Burger', price: 500, category: 'Burgers' },
  { id: 'm3', name: 'Chicken Karahi', price: 1200, category: 'Mains' },
  { id: 'm4', name: 'Cold Drink', price: 100, category: 'Drinks' },
  { id: 'm5', name: 'Seekh Kebab', price: 350, category: 'Grill', available: false },
]

const data = {
  orders,
  customers: [{ id: 'c1', name: 'Bilal' }, { id: 'c2', name: 'Sara' }],
  expenses: [
    { id: 'e1', amount: 200, category: 'Gas', status: 'approved', date: at(0, 10) },
    { id: 'e2', amount: 999, category: 'Rent', status: 'approved', date: at(-3, 10) },
  ],
  menuItems,
  cashSessions: [],
  refunds: [],
  ingredients: [
    { id: 'i1', name: 'Chicken', stockQuantity: 2, minStockAlert: 5, costPerUnit: 600, unit: 'kg' },
    { id: 'i2', name: 'Buns', stockQuantity: 0, minStockAlert: 20, costPerUnit: 20, unit: 'pc' },
    { id: 'i3', name: 'Oil', stockQuantity: 30, minStockAlert: 5, costPerUnit: 400, unit: 'l' },
  ],
  tables: [
    { id: 't1', name: 'T1', floor: 'Ground', status: 'occupied', seats: 4 },
    { id: 't2', name: 'T2', floor: 'Ground', status: 'available', seats: 2 },
    { id: 't3', name: 'T3', floor: 'Ground', status: 'occupied', seats: 6 },
  ],
  settings,
  openingCash: 0,
  currency: 'PKR',
}

const run = (name, args = {}, opts = {}) => runRestaurantAiTool(name, args, data, { role: 'owner', now: NOW, ...opts })

test('every gateway tool has an executor and role lists only name real tools', () => {
  for (const name of AI_TOOL_NAMES) {
    const out = run(name, name === 'get_order_details' ? { orderNumber: 'x' } : name === 'propose_order' ? { items: [{ name: 'Cold Drink', quantity: 1 }], orderType: 'dine_in' } : {})
    assert.notEqual(out.result.error, 'unknown_tool', name)
  }
  for (const role of ['owner', 'admin', 'cashier', 'waiter', 'kitchen_staff']) {
    for (const tool of toolsAllowedForRole(role)) assert.ok(AI_TOOL_NAMES.includes(tool), `${role}:${tool}`)
  }
})

test('business summary for today uses the report model numbers', () => {
  const { ok, result } = run('get_business_summary', { period: 'today' })
  assert.equal(ok, true)
  assert.equal(result.period, 'today')
  assert.equal(result.orders.billed, 2)
  assert.equal(result.orders.cancelled, 1)
  assert.equal(result.sales.total, 2200)
  assert.equal(result.payments.collected, 1700)
  assert.equal(result.payments.outstanding, 500)
  assert.equal(result.expensesApproved, 200)
  assert.equal(result.topItem.name, 'Zinger Burger')
  assert.match(result.profit.note, /cost prices/i)
  assert.equal(result.currency, 'PKR')
})

test('periods: yesterday, 7d and all include the right orders', () => {
  assert.equal(run('get_business_summary', { period: 'yesterday' }).result.sales.total, 800)
  assert.equal(run('get_business_summary', { period: '7d' }).result.sales.total, 3000)
  assert.equal(run('get_business_summary', { period: 'all' }).result.sales.total, 3000)
  const custom = run('get_business_summary', { from: '2026-10-10', to: '2026-10-10' }).result
  assert.equal(custom.sales.total, 800)
})

test('bad periods and dates are rejected with a clear error, not guessed', () => {
  assert.equal(run('get_business_summary', { period: 'last_century' }).result.error, 'invalid_period')
  assert.equal(run('get_business_summary', { from: '10/10/2026' }).result.error, 'invalid_date')
  assert.equal(run('get_business_summary', { from: '2026-10-12', to: '2026-10-01' }).result.error, 'invalid_range')
  assert.equal(resolveRange({}, settings, NOW).label, 'today')
})

test('list_orders filters, orders newest first and clamps the limit', () => {
  const all = run('list_orders', { period: 'today' }).result
  assert.equal(all.matched, 4)
  assert.equal(all.orders[0].orderNumber, 'D-1004')
  assert.equal(run('list_orders', { period: 'today', orderType: 'takeaway' }).result.matched, 1)
  assert.deepEqual(run('list_orders', { period: 'today', paymentStatus: 'partial' }).result.orders.map((o) => o.orderNumber), ['D-1002'])
  assert.equal(run('list_orders', { period: 'today', status: 'cancelled' }).result.matched, 1)
  assert.equal(run('list_orders', { period: 'all', limit: 9999 }).result.showing, 5)
  assert.equal(run('list_orders', { period: 'all', limit: 2 }).result.showing, 2)
  assert.equal(run('list_orders', { period: 'all', limit: 'abc' }).result.showing, 5)
})

test('get_order_details finds an order across prefixes and returns the card payload', () => {
  for (const q of ['D-1002', '#1002', '1002', 'w-1002']) {
    const { result } = run('get_order_details', { orderNumber: q })
    assert.equal(result.found, true, q)
    assert.equal(result.card, 'order')
    assert.equal(result.order.total, 1200)
    assert.equal(result.order.due, 500)
    assert.deepEqual(result.order.items.map((i) => i.name), ['Chicken Karahi', 'Cold Drink'])
  }
  assert.equal(run('get_order_details', { orderNumber: '424242' }).result.found, false)
  assert.equal(run('get_order_details', {}).result.error, 'orderNumber_required')
})

test('top items and sales report groupings', () => {
  const top = run('get_top_items', { period: 'all', limit: 2, by: 'quantity' }).result
  assert.equal(top.items[0].name, 'Zinger Burger')
  assert.equal(top.items.length, 2)
  // Today: Karahi 1200 beats Zinger 900. All time: Zinger 1700 (incl. yesterday) beats Karahi.
  assert.equal(run('get_top_items', { period: 'today', by: 'revenue' }).result.items[0].name, 'Chicken Karahi')
  assert.equal(run('get_top_items', { period: 'all', by: 'revenue' }).result.items[0].name, 'Zinger Burger')

  const byDay = run('get_sales_report', { period: '7d', groupBy: 'day' }).result
  assert.deepEqual(byDay.rows.map((r) => [r.date, r.sales]), [['2026-10-10', 800], ['2026-10-11', 2200]])
  assert.ok(run('get_sales_report', { period: 'all', groupBy: 'hour' }).result.rows.length >= 2)
  assert.ok(run('get_sales_report', { period: 'all', groupBy: 'payment_method' }).result.rows.some((r) => r.method === 'JazzCash'))
  assert.equal(run('get_sales_report', { period: 'all', groupBy: 'item' }).result.rows[0].item, 'Zinger Burger')
  assert.equal(run('get_sales_report', { period: 'all', groupBy: 'staff' }).result.rows[0].staff, 'Ali')
  assert.equal(run('get_sales_report', { period: 'all', groupBy: 'zodiac' }).result.error, 'invalid_groupBy')
  assert.equal(run('get_sales_report', { period: 'today' }).result.rows, undefined)
})

test('inventory, tables, expenses, customers, kitchen', () => {
  const inv = run('get_inventory_status', {}).result
  assert.equal(inv.tracked, true)
  assert.equal(inv.lowStockCount, 1)
  assert.equal(inv.outOfStockCount, 1)
  assert.deepEqual(inv.alerts.map((a) => a.ingredient).sort(), ['Buns', 'Chicken'])
  assert.equal(run('get_inventory_status', { lowStockOnly: true }).result.inventoryValue, undefined)
  assert.equal(runRestaurantAiTool('get_inventory_status', {}, { ...data, ingredients: [] }, { role: 'owner', now: NOW }).result.tracked, false)

  const tables = run('get_tables_status').result
  assert.equal(tables.total, 3)
  assert.equal(tables.counts.occupied, 2)
  assert.deepEqual(tables.available, ['T2'])

  const exp = run('get_expenses_summary', { period: 'today' }).result
  assert.equal(exp.approvedTotal, 200, 'the 3-day-old rent expense is outside today')
  assert.equal(run('get_expenses_summary', { period: 'all' }).result.approvedTotal, 1199)
  assert.match(exp.note, /does not subtract/)

  const cust = run('get_customers_summary', { period: 'all', topN: 5 }).result
  assert.equal(cust.namedCustomers, 2)
  assert.equal(cust.topCustomers[0].name, 'Bilal')
  assert.equal(cust.totalOutstandingFromCustomers, 500)

  const kitchen = run('get_kitchen_status').result
  assert.equal(kitchen.active, 2)
  assert.equal(kitchen.preparing, 1)
  assert.equal(kitchen.ready, 1)
  assert.equal(kitchen.longestWaiting[0].orderNumber, 'D-1002')
})

test('cash session summary reports "none" instead of inventing figures', () => {
  const { result } = run('get_cash_session_summary', { period: 'today' })
  assert.equal(result.closedSessions, 0)
  assert.equal(result.countedCash, null)
  assert.match(result.note, /No closed cash sessions/)
})

test('propose_order builds a draft with the app\'s own bill maths and never claims to save', () => {
  const { result } = run('propose_order', { items: [{ name: 'zinger', quantity: 2 }, { name: 'cold drink', quantity: 1, note: 'no ice' }], orderType: 'dine_in', tableName: 'T2' })
  assert.equal(result.card, 'order_draft')
  assert.equal(result.needsConfirmation, true)
  assert.equal(result.readyToConfirm, true)
  assert.match(result.note, /nothing has been saved/i)
  assert.deepEqual(result.draft.lines.map((l) => [l.name, l.quantity, l.lineTotal]), [['Zinger Burger', 2, 900], ['Cold Drink', 1, 100]])
  assert.equal(result.draft.lines[1].note, 'no ice')

  const expected = calculateRestaurantBill([{ item: menuItems[0], qty: 2 }, { item: menuItems[3], qty: 1 }], { taxEnabled: true, taxRate: 16, taxLabel: 'GST', serviceChargeEnabled: false })
  assert.equal(result.draft.totals.total, expected.total)
  assert.equal(result.draft.totals.tax, 160)
  assert.equal(result.draft.totals.taxLabel, 'GST')
  assert.equal(result.draft.totals.total, 1160)
})

test('propose_order flags ambiguous, unknown and unavailable items instead of guessing', () => {
  const { result } = run('propose_order', { items: [{ name: 'burger', quantity: 1 }, { name: 'sushi platter', quantity: 1 }, { name: 'seekh kebab', quantity: 1 }, { name: 'cold drink', quantity: 1 }], orderType: 'takeaway' })
  assert.equal(result.readyToConfirm, false)
  assert.deepEqual(result.unmatched.map((u) => u.requested), ['burger', 'sushi platter'])
  assert.ok(result.unmatched[0].suggestions.includes('Zinger Burger') && result.unmatched[0].suggestions.includes('Beef Burger'))
  assert.deepEqual(result.unavailable.map((u) => u.item), ['Seekh Kebab'])
  assert.deepEqual(result.draft.lines.map((l) => l.name), ['Cold Drink'])
  assert.equal(run('propose_order', { items: [], orderType: 'dine_in' }).result.error, 'items_required')
  assert.equal(runRestaurantAiTool('propose_order', { items: [{ name: 'x', quantity: 1 }], orderType: 'dine_in' }, { ...data, menuItems: [] }, { role: 'owner' }).result.error, 'menu_empty')
  const big = run('propose_order', { items: [{ name: 'cold drink', quantity: 100000 }], orderType: 'dine_in' }).result
  assert.equal(big.draft.lines[0].quantity, 99, 'quantity is clamped')
})

test('role gating: least privilege and unknown roles fall back to cashier level', () => {
  assert.equal(run('get_business_summary', {}, { role: 'kitchen_staff' }).result.error, 'not_permitted')
  assert.equal(run('get_expenses_summary', { period: 'today' }, { role: 'waiter' }).ok, false)
  assert.equal(run('get_kitchen_status', {}, { role: 'kitchen_staff' }).ok, true)
  assert.equal(run('propose_order', { items: [{ name: 'cold drink', quantity: 1 }], orderType: 'dine_in' }, { role: 'waiter' }).ok, true)
  assert.equal(run('get_business_summary', {}, { role: 'hacker' }).ok, false)
  assert.equal(run('get_business_summary', {}, { role: undefined }).ok, false)
  assert.equal(run('get_business_summary', {}, { role: 'Manager' }).ok, true, 'manager maps to admin')
})

test('unknown tools and junk arguments fail safely', () => {
  assert.equal(run('drop_database').result.error, 'unknown_tool')
  assert.equal(runRestaurantAiTool('get_tables_status', [1, 2, 3], data, { role: 'owner' }).ok, true)
  assert.equal(runRestaurantAiTool('get_business_summary', null, data, { role: 'owner', now: NOW }).ok, true)
  assert.equal(runRestaurantAiTool('get_business_summary', {}, {}, { role: 'owner', now: NOW }).result.orders.billed, 0)
})

test('tools are read-only: the data snapshot is never mutated', () => {
  const before = JSON.stringify(data)
  for (const name of AI_TOOL_NAMES) {
    run(name, { period: 'all', orderNumber: '1002', items: [{ name: 'zinger', quantity: 1 }], orderType: 'dine_in' })
  }
  assert.equal(JSON.stringify(data), before)
})

test('results are JSON safe and oversized ones are truncated with a hint', () => {
  for (const name of AI_TOOL_NAMES) {
    const json = serializeToolResult(run(name, { period: 'all', orderNumber: '1002' }).result)
    assert.ok(json.length <= AI_TOOL_RESULT_MAX_CHARS + 400, name)
    JSON.parse(json)
  }
  const huge = JSON.parse(serializeToolResult({ rows: 'x'.repeat(AI_TOOL_RESULT_MAX_CHARS * 2) }))
  assert.equal(huge.truncated, true)
  assert.match(huge.note, /narrower/)
})
