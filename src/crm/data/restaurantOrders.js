import { calculateRestaurantBill, safeMoney } from '../lib/restaurantPosCalculations.js'
import { notifyLocalDataChanged } from '../lib/localDataEvents.js'

export const restaurantOrdersStorageKey = 'nexora.restaurant.orders.v2'

function readStoredOrders() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(restaurantOrdersStorageKey)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadRestaurantOrders() {
  return readStoredOrders().map((order) => normalizeRestaurantOrder(order)).filter((order) => order.orderNumber)
}

export function saveRestaurantOrders(orders) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(restaurantOrdersStorageKey, JSON.stringify(Array.isArray(orders) ? orders : []))
  notifyLocalDataChanged(restaurantOrdersStorageKey)
}

export function clearRestaurantOrders() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(restaurantOrdersStorageKey)
  notifyLocalDataChanged(restaurantOrdersStorageKey)
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
