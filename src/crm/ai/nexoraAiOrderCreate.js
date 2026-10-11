/**
 * Nexora AI — turn a CONFIRMED order draft into a real POS order.
 *
 * The assistant only ever proposes (propose_order). This module runs when the
 * person taps "Confirm order", and it deliberately trusts nothing in the draft:
 *
 *  - the role must be allowed to create orders (same set as propose_order)
 *  - every line is re-resolved against the CURRENT menu (id first, then exact name)
 *  - prices and totals are recomputed with the POS calculator; if they no longer
 *    match what the person saw on the card, nothing is saved
 *  - dine-in needs a real table that has no other active unpaid order
 *  - delivery is not supported from chat (it needs an address and a rider)
 *  - the same draft cannot be saved twice
 *
 * The saved order is a KOT-style order, exactly like "Save KOT" in the POS:
 * status pending, payment due, nothing paid. Payment, stock deduction and
 * loyalty points still happen when staff settle the bill in the POS, so there
 * is no second accounting path here. Table occupancy is derived from orders.
 *
 * Persistence goes through the POS's own store functions, injected as `deps`.
 */

import { calculateRestaurantBill, restaurantChargeOptions } from '../lib/restaurantPosCalculations.js'
import { toolsAllowedForRole } from './restaurantAiTools.js'

const SEED = 45265
const MONEY_TOLERANCE = 0.01

const text = (v) => String(v ?? '').trim()
const norm = (v) => text(v).toLowerCase().replace(/\s+/g, ' ')
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

const confirmedRequests = new Set()
/** Test helper. */
export function resetConfirmedRequests() { confirmedRequests.clear() }

export function canRoleCreateAiOrder(role) {
  return toolsAllowedForRole(role).includes('propose_order')
}

/** 'dine in' / 'Dine-in' → 'Dine-in'; pickup/takeout → 'Takeaway'; '' → null (decided from table). */
export function normalizeAiOrderType(raw) {
  const v = norm(raw).replace(/[-_]/g, ' ')
  if (!v) return null
  if (v === 'dine in' || v === 'dinein' || v === 'table') return 'Dine-in'
  if (['takeaway', 'take away', 'takeout', 'take out', 'pickup', 'pick up'].includes(v)) return 'Takeaway'
  if (v === 'delivery') return 'Delivery'
  return 'unknown'
}

function orderNumberValue(order) {
  const n = Number(String(order?.orderNumber || '').replace(/[^0-9]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Next '#NNNNN' above every order we can see (local + cloud) and the POS's own counter. */
export function nextAiOrderNumber(orders = [], posNext = '') {
  const max = (Array.isArray(orders) ? orders : []).reduce((m, o) => Math.max(m, orderNumberValue(o)), SEED)
  const fromPos = orderNumberValue({ orderNumber: posNext })
  return `#${Math.max(max + 1, fromPos)}`
}

/** Same rule the POS uses to stop two unpaid orders sharing a table. */
export function isTableBusy(tableId, orders = []) {
  return (Array.isArray(orders) ? orders : []).some((order) => {
    if (text(order?.table) !== tableId) return false
    const status = norm(order.orderStatus)
    const payment = norm(order.paymentStatus)
    if (status === 'cancelled') return false
    if (payment === 'paid' && (status === 'served' || status === 'ready')) return false
    return true
  })
}

function findTable(tables, wanted) {
  const w = norm(wanted)
  return (Array.isArray(tables) ? tables : []).find((t) => norm(t?.id) === w || norm(t?.name) === w || norm(t?.label) === w) || null
}

function findMenuItem(menu, line) {
  const id = line.menuItemId
  if (id !== null && id !== undefined && id !== '') {
    const byId = menu.find((m) => String(m.id ?? m.itemId) === String(id))
    if (byId) return byId
  }
  const matches = menu.filter((m) => norm(m.name) === norm(line.name))
  return matches.length === 1 ? matches[0] : null
}

function fail(code, message, extra = {}) {
  return { ok: false, code, message, ...extra }
}

/**
 * @param {object} draft   the draft shown on the card (from propose_order)
 * @param {object} opts
 * @param {object} opts.data         fresh snapshot: { orders, customers, menuItems, tables, settings }
 * @param {string} opts.role
 * @param {string} opts.workspaceId
 * @param {string} opts.userId
 * @param {string} [opts.requestId]  stable id of this draft card, blocks double-confirm
 * @param {object} opts.deps         { upsertOrder(order, ws, uid), syncOrder(ws, uid, order), posNextOrderNumber(), now?() }
 * @returns {{ok: true, order: object, orderNumber: string} | {ok: false, code: string, message: string}}
 */
export function confirmAiOrderDraft(draft, { data = {}, role, workspaceId, userId, requestId = '', deps = {} } = {}) {
  if (!canRoleCreateAiOrder(role)) return fail('not_permitted', 'This role cannot create orders.')
  if (!workspaceId || !userId) return fail('not_signed_in', 'Sign in again to save orders.')
  if (!draft || !Array.isArray(draft.lines) || !draft.lines.length) return fail('empty', 'The draft has no items.')
  if (requestId && confirmedRequests.has(requestId)) return fail('duplicate', 'This draft was already confirmed.')

  // 1. Order type + table
  let orderType = normalizeAiOrderType(draft.orderType)
  if (orderType === 'unknown') return fail('bad_order_type', 'Unknown order type.')
  if (orderType === 'Delivery') return fail('delivery_unsupported', 'Delivery orders need an address, so create them from the POS.')
  const tableWanted = text(draft.tableName)
  if (!orderType) orderType = tableWanted ? 'Dine-in' : 'Takeaway'

  let tableId = ''
  if (orderType === 'Dine-in') {
    if (!tableWanted) return fail('table_required', 'Which table is this order for?')
    const table = findTable(data.tables, tableWanted)
    if (!table) {
      const options = (data.tables || []).map((t) => t.id || t.name).filter(Boolean).slice(0, 8)
      return fail('table_not_found', `Table "${tableWanted}" was not found.`, { options })
    }
    tableId = text(table.id || table.name)
    if (isTableBusy(tableId, data.orders)) return fail('table_busy', `Table ${tableId} already has an active unpaid order.`, { table: tableId })
  }

  // 2. Re-resolve every line against the CURRENT menu and recompute with the POS calculator
  const menu = (Array.isArray(data.menuItems) ? data.menuItems : []).filter((m) => text(m?.name))
  const cartRows = []
  for (const line of draft.lines.slice(0, 40)) {
    const item = findMenuItem(menu, line)
    if (!item) return fail('item_missing', `"${text(line.name)}" is no longer on the menu.`, { item: text(line.name) })
    if (item.available === false || item.isAvailable === false) return fail('item_unavailable', `"${item.name}" is not available right now.`, { item: item.name })
    const rawQty = Math.trunc(Number(line.quantity))
    if (!(rawQty >= 1)) return fail('bad_quantity', `Invalid quantity for "${item.name}".`)
    const qty = Math.min(99, rawQty)
    cartRows.push({ itemId: item.id ?? item.itemId, item, qty, note: text(line.note).slice(0, 120) })
  }
  const totals = calculateRestaurantBill(cartRows.map((r) => ({ item: r.item, qty: r.qty })), restaurantChargeOptions(data.settings?.restaurantPos))
  const shown = Number(draft.totals?.total)
  if (!Number.isFinite(shown) || Math.abs(round2(totals.total) - round2(shown)) > MONEY_TOLERANCE) {
    return fail('price_changed', 'Menu prices or charges changed since this draft. Please ask again.', { was: shown, now: round2(totals.total) })
  }

  // 3. Customer: link to an existing customer only on an exact phone match, else walk-in
  const phone = text(draft.customerPhone)
  const known = phone ? (data.customers || []).find((c) => text(c?.phone) === phone) : null
  const customerName = known?.name || text(draft.customerName) || 'Walk-in Guest'

  // 4. Build the KOT-style order and save through the POS's own functions
  const now = (deps.now ? deps.now() : new Date())
  const orderNumber = nextAiOrderNumber(data.orders, deps.posNextOrderNumber?.() || '')
  const itemNotes = cartRows.filter((r) => r.note).map((r) => `${r.item.name}: ${r.note}`)
  const order = {
    orderNumber,
    orderType,
    table: tableId,
    customerId: known?.id || 'cust-walkin',
    customer: customerName,
    phone,
    paymentMethod: 'Cash',
    paymentStatus: 'due',
    orderStatus: 'pending',
    paidAmount: 0,
    notes: ['[Nexora AI]', ...itemNotes].join(' '),
    cartRows: cartRows.map((r) => ({ itemId: r.itemId, item: r.item, qty: r.qty, note: r.note })),
    totals,
    createdAt: now.toISOString(),
  }

  try {
    const saved = deps.upsertOrder(order, workspaceId, userId)
    deps.syncOrder?.(workspaceId, userId, order)
    if (!Array.isArray(saved) && saved !== undefined) return fail('save_failed', 'The order could not be saved.')
  } catch (error) {
    return fail('save_failed', text(error?.message).slice(0, 120) || 'The order could not be saved.')
  }
  if (requestId) confirmedRequests.add(requestId)
  return { ok: true, orderNumber, order, total: round2(totals.total), table: tableId, orderType }
}
