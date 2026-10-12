/**
 * Which orders keep a dine-in table occupied. One rule shared by the Tables
 * page, the Dashboard and Nexora AI so the three never disagree.
 *
 * A dine-in order holds its table until it is cancelled/closed or paid in full.
 * (An order that was served but not yet paid still holds the table — the guests
 * are still there and the bill is open.)
 */

import { normalizeRestaurantPaymentStatus } from './restaurantPaymentStatus.js'

const RELEASED_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'closed'])

export function orderHoldsTable(order) {
  if (!order || !order.table) return false
  if (String(order.orderType || '').trim().toLowerCase() !== 'dine-in') return false
  if (RELEASED_ORDER_STATUSES.has(String(order.orderStatus || '').trim().toLowerCase())) return false
  const payment = normalizeRestaurantPaymentStatus(order.paymentStatus, '')
  return payment !== 'paid' && payment !== 'cancelled'
}

/** Set of table ids/names currently held by an open dine-in order. */
export function occupiedTableKeys(orders = []) {
  return new Set((Array.isArray(orders) ? orders : []).filter(orderHoldsTable).map((order) => String(order.table).trim()))
}
