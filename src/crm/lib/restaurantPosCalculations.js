import { buildModernBillThermalText, buildModernKotThermalText } from './restaurantThermalTemplates.js'

export function safeMoney(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
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

export function calculateRestaurantBill(cartRows = [], options = {}) {
  const discountInput = safeMoney(options.discount)
  const serviceRate = options.serviceChargeEnabled === false ? 0 : safeMoney(options.serviceRate ?? options.serviceCharges ?? 0)
  const taxRate = options.taxEnabled === false ? 0 : safeMoney(options.taxRate ?? options.tax ?? 0)

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
  const serviceCharges = (netSubtotal * serviceRate) / 100
  const tax = (netSubtotal * taxRate) / 100
  const total = Math.max(0, netSubtotal + serviceCharges + tax)

  return {
    rows,
    subtotal,
    discount,
    netSubtotal,
    serviceCharges,
    tax,
    total,
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
  return `PKR ${Math.round(safeMoney(value)).toLocaleString('en-PK')}`
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
