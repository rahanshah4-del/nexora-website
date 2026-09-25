import { buildModernBillThermalText, buildModernKotThermalText } from './restaurantThermalTemplates.js'
import { formatMoney } from './workspaceCurrency.js'

export function safeMoney(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

/** Fallback tax line name when no label is configured (or tax isn't charged). */
export const DEFAULT_RESTAURANT_TAX_LABEL = 'Tax'
/** Receipt lines are 32 chars wide — keep labels short enough to render. */
export const RESTAURANT_TAX_LABEL_MAX = 24
/** Provincial revenue authorities. Suggestions only — free text is allowed. */
export const RESTAURANT_TAX_LABEL_SUGGESTIONS = [
  'GST',
  'PRA Sales Tax',
  'SRB Sales Tax',
  'KPRA Sales Tax',
  'BRA Sales Tax',
]

/** Percentages are stored as plain numbers; clamp to a sane 0–100 band. */
export function normalizeTaxRate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(100, Math.max(0, numeric))
}

export function normalizeTaxLabel(value) {
  const label = String(value ?? '').trim().slice(0, RESTAURANT_TAX_LABEL_MAX).trim()
  return label || DEFAULT_RESTAURANT_TAX_LABEL
}

/**
 * Resolve a workspace's `restaurantPos` settings block into the option shape
 * calculateRestaurantBill expects.
 *
 * Single source of truth for every path that creates a NEW order, and for the
 * Settings receipt preview — so the preview is the real bill. Deliberately
 * defensive: businessSettings docs saved before these keys existed are merged
 * shallowly in useBusinessSettings, so `restaurantPos` can be present but
 * missing individual keys.
 *
 * Tax defaults OFF (`enableTax === true` required). Service charge keeps its
 * existing `!== false` default-on semantics.
 */
export function restaurantChargeOptions(restaurantSettings = {}) {
  const settings = restaurantSettings || {}
  return {
    taxEnabled: settings.enableTax === true,
    taxRate: normalizeTaxRate(settings.taxPercentage),
    taxLabel: normalizeTaxLabel(settings.taxLabel),
    serviceChargeEnabled: settings.enableServiceCharge !== false,
    serviceRate: normalizeTaxRate(settings.serviceChargePercentage),
  }
}

export function normalizeDiscountType(value) {
  const type = String(value || 'none').toLowerCase()
  if (type === 'percentage' || type === 'fixed') return type
  if (type === 'fixed amount') return 'fixed'
  return 'none'
}

export function itemDiscountAmount(item = {}) {
  const price = safeMoney(item.price)
  const discountValue = safeMoney(item.discountValue)
  const type = normalizeDiscountType(item.discountType)
  if (!price || !discountValue || type === 'none') return 0
  if (type === 'percentage') return Math.min(price, (price * Math.min(discountValue, 100)) / 100)
  return Math.min(price, discountValue)
}

export function finalItemPrice(item = {}) {
  return Math.max(0, safeMoney(item.price) - itemDiscountAmount(item))
}

/**
 * @param {Array}  cartRows
 * @param {object} options
 *   discount              — order-level discount, a fixed amount (not a %)
 *   taxEnabled            — false (or a settings-resolved non-true) zeroes tax
 *   taxRate  | tax        — percentage, 0–100
 *   taxLabel              — receipt line name, e.g. "GST"
 *   serviceChargeEnabled  — false zeroes the service charge
 *   serviceRate | serviceCharges — percentage, 0–100
 *
 * Use restaurantChargeOptions(settings.restaurantPos) to build these from a
 * workspace's configured settings.
 */
export function calculateRestaurantBill(cartRows = [], options = {}) {
  const discountInput = safeMoney(options.discount)
  const serviceRate = options.serviceChargeEnabled === false ? 0 : normalizeTaxRate(options.serviceRate ?? options.serviceCharges ?? 0)
  const taxRate = options.taxEnabled === false ? 0 : normalizeTaxRate(options.taxRate ?? options.tax ?? 0)

  const rows = cartRows.map((row) => {
    const item = row.item || row
    const quantity = Math.max(0, Number(row.qty ?? row.quantity ?? 0) || 0)
    const unitPrice = finalItemPrice(item)
    const grossUnitPrice = safeMoney(item.price)
    const itemDiscount = Math.max(0, grossUnitPrice - unitPrice) * quantity
    return {
      ...row,
      item,
      quantity,
      unitPrice,
      grossUnitPrice,
      itemDiscount,
      lineTotal: unitPrice * quantity,
    }
  })

  const subtotal = rows.reduce((sum, row) => sum + row.grossUnitPrice * row.quantity, 0)
  const itemDiscountTotal = rows.reduce((sum, row) => sum + row.itemDiscount, 0)
  const orderDiscount = Math.min(Math.max(0, subtotal - itemDiscountTotal), discountInput)
  const discount = itemDiscountTotal + orderDiscount
  const netSubtotal = Math.max(0, subtotal - discount)
  /* Rounded to whole rupees per line — never at the total — so the printed
     SUBTOTAL / SVC / TAX lines always add up to the printed TOTAL exactly. */
  const serviceCharges = Math.round((netSubtotal * serviceRate) / 100)
  const tax = Math.round((netSubtotal * taxRate) / 100)
  const total = Math.max(0, netSubtotal + serviceCharges + tax)

  return {
    rows,
    subtotal,
    discount,
    netSubtotal,
    serviceCharges,
    tax,
    total,
    /* Snapshot of the rate/label actually applied, so a reprint months later
       reproduces this bill rather than today's settings. */
    taxRate,
    taxLabel: taxRate > 0 ? normalizeTaxLabel(options.taxLabel) : DEFAULT_RESTAURANT_TAX_LABEL,
  }
}

export function restaurantDashboardMetrics({ cartRows = [], tables = [], kotRows = [], bills = [] } = {}) {
  const bill = calculateRestaurantBill(cartRows)
  const occupiedTables = tables.filter((table) => table.status === 'occupied').length
  return {
    todayOrders: bills.length,
    activeKot: kotRows.filter((row) => ['pending', 'preparing'].includes(row.status)).length,
    kitchenReady: kotRows.filter((row) => row.status === 'ready').length,
    pendingBills: bills.filter((row) => row.status !== 'paid').length,
    occupiedTables,
    totalTables: tables.length,
    todaySales: bill.total,
  }
}

export function formatRestaurantCurrency(value) {
  return formatMoney(Math.round(safeMoney(value)))
}

export function buildBillPrintData({
  restaurantName = 'Nexora Restaurant',
  orderNumber = '#45266',
  billNumber,
  table = '12',
  orderType = 'Dine-in',
  customerName = 'Walk-in Guest',
  customerPhone = '',
  rows = [],
  totals = {},
  paidAmount,
  paymentMethod = 'Cash',
  date = new Date(),
  settings = {},
} = {}) {
  return {
    type: 'bill',
    restaurantName: settings.restaurantName || restaurantName,
    address: settings.address || '',
    phone: settings.phone || '',
    taxNumber: settings.taxNumber || '',
    orderNumber,
    billNumber: billNumber || `BILL-${String(orderNumber || '').replace(/^#/, '')}`,
    table,
    orderType,
    customerName,
    customerPhone,
    rows,
    totals,
    paidAmount,
    paymentMethod,
    date,
    settings,
  }
}

export function buildKotPrintData({
  restaurantName = 'Nexora Restaurant',
  orderNumber = '#45266',
  kotNumber = 'KOT-45266',
  table = '12',
  orderType = 'Dine-in',
  rows = [],
  notes = '',
  priority = 'Normal',
  date = new Date(),
  settings = {},
} = {}) {
  return {
    type: 'kot',
    restaurantName: settings.restaurantName || restaurantName,
    orderNumber,
    kotNumber,
    table,
    orderType,
    rows,
    notes,
    priority,
    date,
    settings,
  }
}

export function buildBillPrintTemplate(input = {}) {
  return buildModernBillThermalText(input)
}

export function buildKotPrintTemplate(input = {}) {
  return buildModernKotThermalText(input)
}
