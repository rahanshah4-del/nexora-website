import { calculateRestaurantBill, safeMoney } from '../lib/restaurantPosCalculations.js'
import { migrateKey, notifyLocalDataChanged, scopedKey } from '../lib/localDataEvents.js'

const _BASE = 'nexora.restaurant.orders.v2'
/** @deprecated Use scopedKey() from localDataEvents instead. Kept for backward compat. */
export const restaurantOrdersStorageKey = _BASE

function _key() {
  const k = scopedKey(_BASE)
  if (k !== _BASE) {
    migrateKey(_BASE, k)
  }
  return k
}

/** In-memory cache: avoids re-parsing localStorage JSON on every call.
 * Invalidated whenever orders are written. */
let _cache = null
/** Normalized-orders cache: normalizeRestaurantOrder runs bill calculation and
 * date parsing per order, and loadRestaurantOrders is called from many hot
 * paths (render memos, click handlers). Cache the normalized result too. */
let _normalizedCache = null

function readStoredOrders() {
  if (typeof window === 'undefined') return []
  if (_cache) return _cache
  try {
    const stored = window.localStorage.getItem(_key())
    const parsed = stored ? JSON.parse(stored) : []
    _cache = Array.isArray(parsed) ? parsed : []
    return _cache
  } catch {
    return []
  }
}

function invalidateCache() { _cache = null; _normalizedCache = null }

/* Cross-tab safety: POS Till, KOT and Kitchen Display run in separate tabs.
 * When another tab writes orders, invalidate this tab's cache. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith(_BASE)) invalidateCache()
  })
}

export function loadRestaurantOrders() {
  if (_normalizedCache) return _normalizedCache
  _normalizedCache = readStoredOrders().map((order) => normalizeRestaurantOrder(order)).filter((order) => order.orderNumber)
  return _normalizedCache
}

export function saveRestaurantOrders(orders) {
  if (typeof window === 'undefined') return
  const k = _key()
  invalidateCache()
  window.localStorage.setItem(k, JSON.stringify(Array.isArray(orders) ? orders : []))
  notifyLocalDataChanged(k)
}

export function clearRestaurantOrders() {
  if (typeof window === 'undefined') return
  const k = _key()
  invalidateCache()
  window.localStorage.removeItem(k)
  notifyLocalDataChanged(k)
}

export function getNextRestaurantOrderNumber(seed = 45265) {
  const maxOrderNumber = readStoredOrders().reduce((max, order) => {
    const numeric = Number(String(order?.orderNumber || '').replace(/[^0-9]/g, ''))
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, seed)
  return `#${maxOrderNumber + 1}`
}

export function upsertRestaurantOrder(order) {
  if (!order?.orderNumber) return []
  const orders = readStoredOrders()
  const nextOrder = normalizeRestaurantOrder(order)
  const exists = orders.some((row) => row?.orderNumber === nextOrder.orderNumber)
  const nextOrders = exists
    ? orders.map((row) => (row?.orderNumber === nextOrder.orderNumber ? { ...row, ...nextOrder } : row))
    : [nextOrder, ...orders]
  saveRestaurantOrders(nextOrders)
  return nextOrders
}

export function normalizeRestaurantOrder(order = {}) {
  const rows = Array.isArray(order.rows) ? order.rows : Array.isArray(order.cartRows) ? order.cartRows : []
  const cartRows = rows.map((row) => ({
    itemId: row.itemId || row.item?.id || row.id,
    item: row.item || row,
    qty: Math.max(0, Number(row.qty ?? row.quantity ?? 0) || 0),
    note: row.note || '',
  })).filter((row) => row.item && row.qty > 0)
  const totals = order.totals?.total != null ? order.totals : calculateRestaurantBill(cartRows, order.calculationOptions || {})
  const total = safeMoney(totals.total)
  const paidAmount = safeMoney(order.paidAmount)
  const dueAmount = Math.max(0, total - paidAmount)
  const orderStatus = String(order.orderStatus || 'pending').toLowerCase()
  const paymentStatus = String(order.paymentStatus || (dueAmount > 0 ? (paidAmount > 0 ? 'partial' : 'due') : 'paid')).toLowerCase()
  const createdAt = order.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  return {
    id: order.id || `ORD-${String(order.orderNumber || '').replace(/^#/, '')}`,
    orderNumber: order.orderNumber,
    billNumber: order.billNumber || `BILL-${String(order.orderNumber || '').replace(/^#/, '')}`,
    kotNumber: order.kotNumber || `KOT-${String(order.orderNumber || '').replace(/^#/, '')}`,
    orderType: order.orderType || 'Dine-in',
    table: order.table || '',
    customerId: order.customerId || 'cust-walkin',
    customer: order.customer || order.customerName || 'Walk-in Guest',
    phone: order.phone || order.customerPhone || '',
    paymentMethod: order.paymentMethod || 'Cash',
    paymentStatus,
    orderStatus,
    dueAmount,
    paidAmount,
    prepTime: Math.max(0, Number(order.prepTime || 0) || 0),
    notes: order.notes || '',
    deliveryAddress: order.deliveryAddress || '',
    riderNotes: order.riderNotes || '',
    cancelReason: order.cancelReason || '',
    cancelledAt: order.cancelledAt || '',
    createdAt,
    date: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toISOString().slice(0, 10),
    time: Number.isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cartRows,
    items: cartRows.map((row) => `${row.qty}x ${row.item?.name || 'Menu item'}`),
    itemsCount: cartRows.reduce((sum, row) => sum + row.qty, 0),
    total,
    due: dueAmount,
    totals,
  }
}
