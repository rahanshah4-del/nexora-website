/**
 * Nexora AI — restaurant tool executors (browser side).
 *
 * The gateway (workers/nexora-ai-gateway/src/aiTools.js) only knows the tool
 * SCHEMAS. This module runs them locally against a data snapshot the app
 * already holds under the signed-in user's own Firestore rules, so the AI can
 * never see another workspace's data.
 *
 * Pure: no React, no Firestore, no localStorage. Every number comes from the
 * same functions the Reports page uses (buildRestaurantReportModel,
 * computeInventoryValuation, calculateRestaurantBill). Nothing is recomputed
 * with new formulas here — only filtered, grouped and shaped for the model.
 *
 * Read-only. `propose_order` builds a DRAFT; saving it is a separate,
 * user-confirmed step in the UI.
 */

import { buildRestaurantReportModel } from '../reports/restaurant/restaurantReportCalculations.js'
import { normalizeRestaurantReportOrders } from '../reports/restaurant/restaurantReportNormalizer.js'
import { computeInventoryValuation, computeLowStockAlerts } from '../reports/restaurant/restaurantInventoryIntelligence.js'
import { calculateRestaurantBill, restaurantChargeOptions } from '../lib/restaurantPosCalculations.js'
import { DEFAULT_CURRENCY } from '../lib/workspaceCurrency.js'
import { occupiedTableKeys } from '../lib/restaurantTableOccupancy.js'
import { restaurantBusinessDateKey, restaurantBusinessDayBounds } from '../lib/restaurantBusinessDay.js'
import { normalizeRestaurantRole } from '../data/restaurantRoles.js'

export const AI_TOOL_RESULT_MAX_CHARS = 11000

const PERIODS = ['today', 'yesterday', '7d', '30d', 'all']
const GROUPINGS = ['day', 'hour', 'item', 'category', 'payment_method', 'order_type', 'staff']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ── Role access (UI-level guard; Firestore rules remain the real enforcement) ──

const ALL_TOOLS = [
  'get_business_summary', 'get_sales_report', 'list_orders', 'get_order_details', 'get_top_items',
  'get_inventory_status', 'get_customers_summary', 'get_tables_status', 'get_expenses_summary',
  'get_cash_session_summary', 'get_kitchen_status', 'propose_order',
]

const ROLE_TOOLS = Object.freeze({
  owner: ALL_TOOLS,
  admin: ALL_TOOLS,
  cashier: ['list_orders', 'get_order_details', 'get_top_items', 'get_tables_status', 'get_kitchen_status', 'get_cash_session_summary', 'propose_order'],
  waiter: ['list_orders', 'get_order_details', 'get_top_items', 'get_tables_status', 'get_kitchen_status', 'propose_order'],
  kitchen_staff: ['list_orders', 'get_order_details', 'get_tables_status', 'get_kitchen_status'],
})

export function toolsAllowedForRole(role) {
  // normalizeRestaurantRole falls back to 'cashier', so an unknown or missing
  // role gets the least-privileged tool set rather than the owner's.
  return ROLE_TOOLS[normalizeRestaurantRole(role)] || ROLE_TOOLS.cashier
}

// ── Small helpers ───────────────────────────────────────────────────────────

const r2 = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}
const arr = (value) => (Array.isArray(value) ? value : [])
const text = (value) => String(value ?? '').trim()
const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
const squash = (value) => text(value).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '')
const cap = (rows, n) => arr(rows).slice(0, n)

function toDate(value) {
  if (!value) return null
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function stripOrderPrefix(value) {
  return text(value).replace(/^(w-|d-|#)+/i, '').toLowerCase()
}

// ── Period handling ─────────────────────────────────────────────────────────

/** Resolve a period or explicit dates to business-date keys (YYYY-MM-DD). */
export function resolveRange(args = {}, settings = {}, now = new Date()) {
  const from = text(args.from)
  const to = text(args.to)
  if (from || to) {
    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return { error: 'invalid_date', message: 'Dates must be YYYY-MM-DD.' }
    if (from && to && from > to) return { error: 'invalid_range', message: '"from" must be on or before "to".' }
    return { startKey: from, endKey: to, label: `${from || '…'} to ${to || '…'}` }
  }

  const period = text(args.period) || 'today'
  if (!PERIODS.includes(period)) return { error: 'invalid_period', message: `period must be one of ${PERIODS.join(', ')}` }
  if (period === 'all') return { startKey: '', endKey: '', label: 'all time' }

  const bounds = restaurantBusinessDayBounds(settings, now)
  const keyDaysBack = (days) => {
    const d = new Date(bounds.start)
    d.setDate(d.getDate() - days)
    return restaurantBusinessDateKey(d, settings)
  }
  const todayKey = restaurantBusinessDateKey(now, settings)
  if (period === 'today') return { startKey: todayKey, endKey: todayKey, label: 'today' }
  if (period === 'yesterday') {
    const key = keyDaysBack(1)
    return { startKey: key, endKey: key, label: 'yesterday' }
  }
  if (period === '7d') return { startKey: keyDaysBack(6), endKey: todayKey, label: 'last 7 days' }
  return { startKey: keyDaysBack(29), endKey: todayKey, label: 'last 30 days' }
}

function inRange(dateLike, range, settings) {
  if (!range.startKey && !range.endKey) return true
  const d = toDate(dateLike)
  if (!d) return false
  const key = restaurantBusinessDateKey(d, settings)
  if (range.startKey && key < range.startKey) return false
  if (range.endKey && key > range.endKey) return false
  return true
}

function buildModel(data, range) {
  const settings = data.settings || {}
  return buildRestaurantReportModel({
    orders: arr(data.orders),
    customers: arr(data.customers),
    expenses: arr(data.expenses).filter((e) => inRange(e.date || e.createdAt, range, settings)),
    openingCash: data.openingCash || 0,
    filters: { startDate: range.startKey || '', endDate: range.endKey || '' },
    settings,
    menuItems: arr(data.menuItems),
    refunds: arr(data.refunds).filter((r) => inRange(r.createdAt, range, settings)),
    cashSessions: arr(data.cashSessions).filter((s) => inRange(s.closedAt || s.openedAt || s.createdAt, range, settings)),
  })
}

function orderRow(o) {
  return {
    orderNumber: o.orderNumber,
    time: o.createdAt,
    type: o.orderType,
    table: o.table || '',
    customer: o.customerName,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    total: r2(o.total),
    paid: r2(o.paidAmount),
    due: r2(o.dueAmount),
    itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

// ── Tools ───────────────────────────────────────────────────────────────────

function getBusinessSummary(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const m = buildModel(data, range)
  const top = m.itemSales[0]
  const costKnown = m.costOfGoodsSold > 0
  return {
    period: range.label,
    range: { from: range.startKey, to: range.endKey },
    currency: data.currency,
    sales: {
      total: r2(m.totalSales), net: r2(m.netSales), gross: r2(m.grossSales), discounts: r2(m.discounts),
      tax: r2(m.tax), serviceCharges: r2(m.serviceCharges), averageOrderValue: r2(m.averageOrderValue),
    },
    orders: {
      billed: m.billedOrders.length,
      all: m.orders.length,
      cancelled: m.cancellations.count,
      paid: m.billedOrdersByStatus.paid || 0,
      partial: m.billedOrdersByStatus.partial || 0,
      due: m.billedOrdersByStatus.due || 0,
    },
    payments: { collected: r2(m.collectedAmount), outstanding: r2(m.outstandingAmount), byMethod: m.collectionsByPaymentMethod },
    salesByOrderType: m.salesByOrderType,
    expensesApproved: r2(m.approvedExpenses),
    profit: costKnown
      ? { grossProfit: r2(m.grossProfit), netProfit: r2(m.netProfit), costOfGoodsSold: r2(m.costOfGoodsSold) }
      : { note: 'Item cost prices are not set, so profit cannot be calculated reliably.' },
    topItem: top ? { name: top.name, quantity: r2(top.quantity), revenue: r2(top.revenue) } : null,
    peakHour: m.peakSalesHour,
    kitchen: { pending: m.kotStatus.pending, preparing: m.kotStatus.preparing, ready: m.kotStatus.ready, served: m.kotStatus.served },
    refunds: { count: m.refundAnalysis.count, amount: r2(m.refundAnalysis.totalAmount) },
  }
}

function groupBilled(orders, keyFn) {
  const map = new Map()
  for (const o of orders) {
    const key = keyFn(o)
    if (key === '' || key == null) continue
    const row = map.get(key) || { key, orders: 0, sales: 0 }
    row.orders += 1
    row.sales += o.total
    map.set(key, row)
  }
  return Array.from(map.values()).map((r) => ({ ...r, sales: r2(r.sales) }))
}

function getSalesReport(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const groupBy = text(args.groupBy)
  if (groupBy && !GROUPINGS.includes(groupBy)) return { error: 'invalid_groupBy', message: `groupBy must be one of ${GROUPINGS.join(', ')}` }
  const m = buildModel(data, range)
  const base = {
    period: range.label,
    range: { from: range.startKey, to: range.endKey },
    currency: data.currency,
    totalSales: r2(m.totalSales), netSales: r2(m.netSales), billedOrders: m.billedOrders.length,
  }
  if (!groupBy) return base

  let rows
  if (groupBy === 'day') rows = groupBilled(m.billedOrders, (o) => o.dateKey).sort((a, b) => a.key.localeCompare(b.key)).map((r) => ({ date: r.key, orders: r.orders, sales: r.sales }))
  else if (groupBy === 'hour') rows = groupBilled(m.billedOrders, (o) => o.hour).sort((a, b) => a.key - b.key).map((r) => ({ hour: `${String(r.key).padStart(2, '0')}:00`, orders: r.orders, sales: r.sales }))
  else if (groupBy === 'item') rows = m.itemSales.map((i) => ({ item: i.name, category: i.category, quantity: r2(i.quantity), revenue: r2(i.revenue) }))
  else if (groupBy === 'category') rows = m.categorySales.map((c) => ({ category: c.category, quantity: r2(c.quantity), revenue: r2(c.revenue) }))
  else if (groupBy === 'payment_method') rows = Object.entries(m.collectionsByPaymentMethod).map(([method, collected]) => ({ method, collected: r2(collected) }))
  else if (groupBy === 'order_type') rows = Object.entries(m.salesByOrderType).map(([type, sales]) => ({ type, sales: r2(sales) }))
  else rows = m.staffPerformance.rows.map((s) => ({ staff: s.name, orders: s.orders, sales: r2(s.sales), averageTicket: r2(s.averageTicket) }))

  return { ...base, groupBy, rowCount: rows.length, rows: cap(rows, 40) }
}

const TYPE_ALIASES = { dine_in: 'dinein', takeaway: 'takeaway', delivery: 'delivery' }

function listOrders(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const m = buildModel(data, range)
  const limit = clampInt(args.limit, 1, 50, 20)
  const wantType = TYPE_ALIASES[text(args.orderType)] || ''
  const wantStatus = text(args.status).toLowerCase().replace(/\s+/g, '_')
  const wantPayment = text(args.paymentStatus)

  const matched = m.orders.filter((o) => {
    if (wantType && squash(o.orderType) !== wantType) return false
    if (wantStatus && o.orderStatus !== wantStatus) return false
    if (wantPayment && o.isCancelled && wantStatus !== 'cancelled') return false // a cancelled order owes nothing
    if (wantPayment === 'paid' && !o.isPaid) return false
    if (wantPayment === 'partial' && !o.isPartial) return false
    if (wantPayment === 'unpaid' && !(o.paymentStatus === 'due' || o.paymentStatus === 'pending')) return false
    return true
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  return {
    period: range.label,
    currency: data.currency,
    matched: matched.length,
    showing: Math.min(limit, matched.length),
    orders: matched.slice(0, limit).map(orderRow),
  }
}

function getOrderDetails(args, data) {
  const wanted = stripOrderPrefix(args.orderNumber)
  if (!wanted) return { error: 'orderNumber_required' }
  const all = normalizeRestaurantReportOrders(arr(data.orders), { settings: data.settings, menuItems: arr(data.menuItems) })
  const matches = all.filter((o) => stripOrderPrefix(o.orderNumber) === wanted || stripOrderPrefix(o.billNumber) === wanted)
  if (!matches.length) return { found: false, orderNumber: text(args.orderNumber), hint: 'No order with that number. Use list_orders to look it up.' }
  const o = matches[0]
  return {
    found: true,
    card: 'order',
    currency: data.currency,
    order: {
      orderNumber: o.orderNumber, billNumber: o.billNumber, kotNumber: o.kotNumber, time: o.createdAt,
      type: o.orderType, table: o.table, customer: o.customerName, cashier: o.cashierName,
      orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
      items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: r2(i.sellingPrice), lineTotal: r2(i.sellingPrice * i.quantity), discount: r2(i.discount) })),
      subtotal: r2(o.subtotal), discount: r2(o.discount), serviceCharges: r2(o.serviceCharges), tax: r2(o.tax),
      total: r2(o.total), paid: r2(o.paidAmount), due: r2(o.dueAmount),
      notes: o.notes, cancelReason: o.cancelReason, prepTimeMinutes: o.prepTime || null,
    },
  }
}

function getTopItems(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const by = text(args.by) === 'revenue' ? 'revenue' : 'quantity'
  const limit = clampInt(args.limit, 1, 20, 10)
  const m = buildModel(data, range)
  const rows = [...m.itemSales].sort((a, b) => (by === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity))
  return {
    period: range.label, currency: data.currency, rankedBy: by,
    items: rows.slice(0, limit).map((i, idx) => ({ rank: idx + 1, name: i.name, category: i.category, quantity: r2(i.quantity), revenue: r2(i.revenue) })),
    slowest: rows.slice(-3).reverse().map((i) => ({ name: i.name, quantity: r2(i.quantity) })),
  }
}

function getInventoryStatus(args, data) {
  const ingredients = arr(data.ingredients)
  if (!ingredients.length) return { tracked: false, note: 'No ingredients are tracked in this workspace yet.' }
  const valuation = computeInventoryValuation(ingredients)
  const alerts = computeLowStockAlerts(ingredients)
  const base = {
    tracked: true, currency: data.currency,
    lowStockCount: valuation.lowStockItems, outOfStockCount: valuation.outOfStockItems,
    alerts: cap(alerts, 25).map((a) => ({ ingredient: a.ingredientName, severity: a.severity, stock: a.currentStock, minStock: a.minStock, unit: a.unit })),
  }
  if (args.lowStockOnly === true) return base
  return { ...base, totalItems: valuation.totalItems, inventoryValue: valuation.totalValue, valueByCategory: cap(valuation.valueBreakdown, 10) }
}

function getCustomersSummary(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const topN = clampInt(args.topN, 1, 20, 5)
  const m = buildModel(data, range)
  const walkIn = (c) => c.id === 'cust-walkin' || /walk-?in/i.test(c.name || '')
  const named = m.customerUnified.filter((c) => !walkIn(c))
  const walkInSales = m.customerUnified.filter(walkIn).reduce((sum, c) => sum + c.sales, 0)
  return {
    period: range.label, currency: data.currency,
    namedCustomers: named.length,
    repeatCustomers: named.filter((c) => c.orders >= 2).length,
    walkInSales: r2(walkInSales),
    topCustomers: named.slice(0, topN).map((c) => ({ name: c.name, orders: c.orders, sales: r2(c.sales), averageOrderValue: r2(c.averageOrderValue), outstanding: r2(c.periodOrderOutstanding) })),
    totalOutstandingFromCustomers: r2(named.reduce((sum, c) => sum + c.periodOrderOutstanding, 0)),
  }
}

function getTablesStatus(_args, data) {
  const tables = arr(data.tables)
  if (!tables.length) return { tracked: false, note: 'No tables are set up in this workspace.' }
  // Open dine-in orders hold their table (same rule as the Tables page and Dashboard).
  const held = occupiedTableKeys(arr(data.orders))
  const rows = tables.map((t) => ({
    name: text(t.name || t.label || t.number || t.id),
    floor: text(t.floor),
    seats: Number(t.seats || t.capacity) || null,
    status: held.has(text(t.id)) || held.has(text(t.name || t.label || t.number)) ? 'occupied' : text(t.status || 'available').toLowerCase(),
  }))
  const counts = {}
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1
  return {
    total: rows.length,
    counts,
    occupied: rows.filter((r) => r.status === 'occupied').map((r) => ({ name: r.name, floor: r.floor })),
    available: rows.filter((r) => r.status === 'available' || r.status === 'free').map((r) => r.name),
  }
}

function getExpensesSummary(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const m = buildModel(data, range)
  const eb = m.expenseBreakdown
  const categories = Object.entries(eb.byCategory).map(([category, amount]) => ({ category, amount: r2(amount) })).sort((a, b) => b.amount - a.amount)
  return {
    period: range.label, currency: data.currency,
    approvedTotal: r2(m.approvedExpenses),
    byStatus: { approved: r2(eb.byStatus.approved), pending: r2(eb.byStatus.pending), rejected: r2(eb.byStatus.rejected) },
    topCategories: cap(categories, 10),
    salesMinusExpenses: r2(m.netSales - m.approvedExpenses),
    note: 'salesMinusExpenses is net sales minus approved expenses only; it does not subtract the cost of ingredients or goods sold.',
  }
}

function getCashSessionSummary(args, data, now) {
  const range = resolveRange(args, data.settings, now)
  if (range.error) return range
  const m = buildModel(data, range)
  const cr = m.cashReconciliation
  const sessions = arr(cr.cashSessions)
  return {
    period: range.label, currency: data.currency,
    closedSessions: sessions.length,
    expectedCash: r2(cr.expectedCash),
    countedCash: cr.actualClosingCash == null ? null : r2(cr.actualClosingCash),
    difference: cr.cashDifference == null ? null : r2(cr.cashDifference),
    cashSales: r2(cr.cashSales), cashRefunds: r2(cr.cashRefunds), cashDeposits: r2(cr.cashDeposits),
    cashWithdrawals: r2(cr.cashWithdrawals), cashExpenses: r2(cr.cashExpenses),
    sessions: cap(sessions, 10).map((s) => ({
      cashier: text(s.cashierName), closedAt: s.closedAt || '', status: text(s.status),
      cashSales: r2(s.cashSales), counted: s.actualClosingCash == null ? null : r2(s.actualClosingCash), difference: s.cashDifference == null ? null : r2(s.cashDifference),
    })),
    note: sessions.length ? '' : 'No closed cash sessions in this period.',
  }
}

function getKitchenStatus(_args, data, now) {
  const range = resolveRange({ period: 'today' }, data.settings, now)
  const m = buildModel(data, range)
  const active = m.orders.filter((o) => !o.isInvoice && !o.isCancelled && ['pending', 'preparing', 'ready'].includes(o.orderStatus))
  const waiting = active.map((o) => {
    const created = toDate(o.createdAt)
    return { orderNumber: o.orderNumber, status: o.orderStatus, table: o.table, waitingMinutes: created ? Math.max(0, Math.round((now.getTime() - created.getTime()) / 60000)) : null }
  }).sort((a, b) => (b.waitingMinutes ?? 0) - (a.waitingMinutes ?? 0))
  return {
    active: active.length,
    pending: active.filter((o) => o.orderStatus === 'pending').length,
    preparing: active.filter((o) => o.orderStatus === 'preparing').length,
    ready: active.filter((o) => o.orderStatus === 'ready').length,
    averagePrepMinutesToday: m.kotStatus.averagePreparationTime,
    longestWaiting: cap(waiting, 5),
  }
}

// ── propose_order (draft only) ──────────────────────────────────────────────

function similarity(query, name) {
  const q = squash(query)
  const n = squash(name)
  if (!q || !n) return 0
  if (q === n) return 1
  if (n.startsWith(q) || q.startsWith(n)) return 0.9
  if (n.includes(q) || q.includes(n)) return 0.8
  const qt = new Set(text(query).toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(Boolean))
  const nt = new Set(text(name).toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(Boolean))
  if (!qt.size || !nt.size) return 0
  let shared = 0
  for (const t of qt) if (nt.has(t)) shared += 1
  return shared / Math.max(qt.size, nt.size)
}

function proposeOrder(args, data) {
  const requested = arr(args.items).slice(0, 30)
  if (!requested.length) return { error: 'items_required' }
  const menu = arr(data.menuItems).filter((m) => text(m.name))
  if (!menu.length) return { error: 'menu_empty', message: 'The menu has no items, so an order cannot be drafted.' }

  const lines = []
  const unmatched = []
  const unavailable = []
  for (const req of requested) {
    const name = text(req?.name)
    const quantity = clampInt(req?.quantity, 1, 99, 1)
    if (!name) continue
    const ranked = menu.map((item) => ({ item, score: similarity(name, item.name) })).sort((a, b) => b.score - a.score)
    const best = ranked[0]
    const second = ranked[1]
    const clear = best && best.score >= 0.6 && (best.score === 1 || !second || best.score - second.score >= 0.1)
    if (!clear) {
      unmatched.push({ requested: name, suggestions: ranked.filter((r) => r.score >= 0.3).slice(0, 3).map((r) => r.item.name) })
      continue
    }
    if (best.item.available === false || best.item.isAvailable === false) {
      unavailable.push({ requested: name, item: best.item.name })
      continue
    }
    lines.push({ item: best.item, quantity, note: text(req?.note).slice(0, 120) })
  }

  const charges = restaurantChargeOptions(data.settings?.restaurantPos)
  const bill = calculateRestaurantBill(lines.map((l) => ({ item: l.item, qty: l.quantity })), charges)

  return {
    card: 'order_draft',
    needsConfirmation: true,
    note: 'Draft only. Nothing has been saved or sent to the kitchen until the owner confirms.',
    currency: data.currency,
    draft: {
      orderType: text(args.orderType),
      tableName: text(args.tableName),
      customerName: text(args.customerName),
      customerPhone: text(args.customerPhone),
      lines: bill.rows.map((row, i) => ({
        menuItemId: row.item.id ?? row.item.itemId ?? null,
        name: row.item.name,
        quantity: row.quantity,
        unitPrice: r2(row.unitPrice),
        lineTotal: r2(row.lineTotal),
        note: lines[i]?.note || '',
      })),
      totals: {
        subtotal: r2(bill.subtotal), discount: r2(bill.discount), serviceCharges: r2(bill.serviceCharges),
        tax: r2(bill.tax), taxLabel: bill.taxLabel, taxRate: bill.taxRate, total: r2(bill.total),
      },
    },
    unmatched,
    unavailable,
    readyToConfirm: bill.rows.length > 0 && !unmatched.length && !unavailable.length,
  }
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

const EXECUTORS = Object.freeze({
  get_business_summary: getBusinessSummary,
  get_sales_report: getSalesReport,
  list_orders: listOrders,
  get_order_details: getOrderDetails,
  get_top_items: getTopItems,
  get_inventory_status: getInventoryStatus,
  get_customers_summary: getCustomersSummary,
  get_tables_status: getTablesStatus,
  get_expenses_summary: getExpensesSummary,
  get_cash_session_summary: getCashSessionSummary,
  get_kitchen_status: getKitchenStatus,
  propose_order: proposeOrder,
})

/**
 * Run one tool.
 * @param {string} name   tool name from the gateway
 * @param {object} args   model-supplied arguments (treated as untrusted)
 * @param {object} data   { orders, customers, expenses, menuItems, cashSessions, refunds,
 *                          ingredients, tables, settings, openingCash, currency }
 * @param {object} opts   { role, now }
 * @returns {{ ok: boolean, result: object }}  result is JSON-serialisable
 */
export function runRestaurantAiTool(name, args, data = {}, opts = {}) {
  const executor = EXECUTORS[name]
  if (!executor) return { ok: false, result: { error: 'unknown_tool', tool: text(name) } }
  if (!toolsAllowedForRole(opts.role).includes(name)) {
    return { ok: false, result: { error: 'not_permitted', message: 'This role is not allowed to use this information.', tool: name } }
  }
  const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {}
  const snapshot = { ...data, currency: data.currency || DEFAULT_CURRENCY, settings: data.settings || {} }
  try {
    return { ok: true, result: executor(safeArgs, snapshot, opts.now instanceof Date ? opts.now : new Date()) }
  } catch (error) {
    return { ok: false, result: { error: 'tool_failed', tool: name, message: text(error?.message).slice(0, 160) } }
  }
}

/** JSON for the tool message sent back to the gateway, bounded in size. */
export function serializeToolResult(result) {
  const json = JSON.stringify(result)
  if (json.length <= AI_TOOL_RESULT_MAX_CHARS) return json
  return JSON.stringify({ truncated: true, note: 'Result was too large; ask for a narrower period or fewer rows.', preview: json.slice(0, AI_TOOL_RESULT_MAX_CHARS - 200) })
}
