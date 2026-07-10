import { finalItemPrice } from '../../lib/restaurantPosCalculations.js'
import { restaurantBusinessDateKey } from '../../lib/restaurantBusinessDay.js'

const billedPaymentStatuses = new Set(['paid', 'partial', 'due'])
const pendingKotStatuses = new Set(['pending', 'preparing', 'ready'])

function numberValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

function textValue(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function statusValue(value, fallback = '') {
  return textValue(value, fallback).toLowerCase().replace(/\s+/g, '_')
}

function dateValue(value) {
  if (!value) return null
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKeyValue(date, settings) {
  if (!date) return ''
  return restaurantBusinessDateKey(date, settings) || ''
}

function hourValue(date) {
  if (!date) return ''
  return date.getHours()
}

function normalizeItem(row = {}, index = 0, order = {}) {
  const item = row.item || row
  const quantity = numberValue(row.quantity ?? row.qty)
  const sellingPrice = numberValue(row.sellingPrice ?? row.unitPrice ?? row.price ?? item.sellingPrice ?? item.unitPrice ?? item.price)
  const grossPrice = numberValue(row.grossUnitPrice ?? item.grossUnitPrice ?? item.price ?? sellingPrice)
  const finalPrice = sellingPrice || finalItemPrice(item)
  const costPrice = numberValue(row.costPrice ?? item.costPrice ?? item.cost ?? item.purchasePrice)
  const discount = numberValue(row.itemDiscount ?? row.discount ?? item.discountAmount)
  const lineTotal = numberValue(row.lineTotal ?? finalPrice * quantity)
  const id = textValue(row.itemId || row.id || item.id || item.productId || item.name || `item-${index}`)

  return {
    id,
    itemId: id,
    productId: textValue(row.productId || item.productId || item.id || id),
    name: textValue(row.name || item.name || item.itemName || item.productName, 'Menu item'),
    category: textValue(row.category || item.category),
    quantity,
    sellingPrice: finalPrice,
    grossPrice,
    costPrice,
    discount,
    lineTotal,
    note: textValue(row.note || item.note || row.description),
    orderId: textValue(order.id),
    orderNumber: textValue(order.orderNumber),
  }
}

function orderRows(order = {}) {
  if (Array.isArray(order.cartRows)) return order.cartRows
  if (Array.isArray(order.rows)) return order.rows
  if (Array.isArray(order.totals?.rows)) return order.totals.rows
  if (Array.isArray(order.items) && typeof order.items[0] === 'object') return order.items
  return []
}

export function normalizeRestaurantReportOrder(order = {}, options = {}) {
  const sourceKind = textValue(order.sourceKind, order.invoice ? 'invoice' : 'restaurant')
  const isInvoice = sourceKind === 'invoice'
  const createdDate = dateValue(order.createdAt || order.date)
  const paymentStatus = statusValue(order.paymentStatus, 'pending')
  const orderStatus = statusValue(order.orderStatus || order.status, 'pending')
  const isCancelled = orderStatus === 'cancelled' || paymentStatus === 'cancelled'
  const isBilled = !isCancelled && billedPaymentStatuses.has(paymentStatus)
  const isPendingKot = !isInvoice && !isBilled && pendingKotStatuses.has(orderStatus)
  const paidAmount = isBilled ? numberValue(order.paidAmount) : 0
  const total = numberValue(order.total ?? order.totals?.total)
  const dueAmount = isBilled ? numberValue(order.dueAmount ?? order.due ?? Math.max(0, total - paidAmount)) : 0
  const items = orderRows(order).map((row, index) => normalizeItem(row, index, order)).filter((item) => item.quantity > 0)

  return {
    id: textValue(order.id || order.orderNumber || order.billNumber),
    sourceKind,
    sourceLabel: textValue(order.sourceLabel, isInvoice ? 'Invoice Order' : 'Restaurant POS Order'),
    orderNumber: textValue(order.orderNumber),
    billNumber: textValue(order.billNumber),
    kotNumber: textValue(order.kotNumber),
    createdAt: createdDate ? createdDate.toISOString() : '',
    dateKey: dateKeyValue(createdDate, options.settings),
    hour: hourValue(createdDate),
    orderType: textValue(order.orderType, isInvoice ? 'Invoice Order' : 'Dine-in'),
    table: textValue(order.table),
    customerId: textValue(order.customerId, isInvoice ? 'invoice-customer' : 'cust-walkin'),
    customerName: textValue(order.customerName || order.customer || order.clientName || order.invoice?.customerName, 'Walk-in Guest'),
    paymentMethod: textValue(order.paymentMethod, isInvoice ? 'Invoice' : 'Cash'),
    paymentStatus,
    orderStatus,
    subtotal: numberValue(order.subtotal ?? order.totals?.subtotal),
    discount: numberValue(order.discount ?? order.totals?.discount),
    tax: numberValue(order.tax ?? order.totals?.tax),
    serviceCharges: numberValue(order.serviceCharges ?? order.serviceCharge ?? order.totals?.serviceCharges),
    total,
    paidAmount,
    dueAmount,
    items,
    cancelReason: textValue(order.cancelReason),
    prepTime: numberValue(order.prepTime),
    notes: textValue(order.notes),
    isCancelled,
    isBilled,
    isPendingKot,
    isPaid: isBilled && paymentStatus === 'paid',
    isPartial: isBilled && paymentStatus === 'partial',
    isDue: isBilled && paymentStatus === 'due',
    isInvoice,
    contributesToRevenue: isBilled,
    contributesToCollection: isBilled && paidAmount > 0,
    contributesToInventorySales: isBilled,
  }
}

export function normalizeRestaurantReportOrders(orders = [], options = {}) {
  return (Array.isArray(orders) ? orders : []).map((order) => normalizeRestaurantReportOrder(order, options))
}

export { numberValue as restaurantReportNumber }
