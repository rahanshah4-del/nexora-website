import { normalizeRestaurantReportOrders, restaurantReportNumber } from './restaurantReportNormalizer.js'

const onlineMethods = new Set(['Card', 'JazzCash', 'Easypaisa', 'Bank'])

function money(value) {
  return restaurantReportNumber(value)
}

function emptyObject(keys = []) {
  return Object.fromEntries(keys.map((key) => [key, 0]))
}

function addToMap(map, key, patch) {
  const id = key || 'unknown'
  const current = map.get(id) || { id, ...patch.initial }
  Object.entries(patch.values || {}).forEach(([field, value]) => {
    current[field] = money(current[field]) + money(value)
  })
  Object.entries(patch.text || {}).forEach(([field, value]) => {
    if (!current[field]) current[field] = value
  })
  map.set(id, current)
  return current
}

function expenseAmount(expenses) {
  if (typeof expenses === 'number') return money(expenses)
  return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const status = String(expense?.approvalStatus || expense?.status || '').toLowerCase()
    if (status && !['approved', 'paid', 'complete', 'completed', 'verified'].includes(status)) return sum
    return sum + money(expense?.amount ?? expense?.total)
  }, 0)
}

function passesFilters(order, filters = {}) {
  if (!filters || !Object.keys(filters).length) return true
  if (filters.dateKey && order.dateKey !== filters.dateKey) return false
  if (filters.startDate && order.dateKey && order.dateKey < filters.startDate) return false
  if (filters.endDate && order.dateKey && order.dateKey > filters.endDate) return false
  if (filters.orderType && filters.orderType !== 'All' && order.orderType !== filters.orderType) return false
  if (filters.paymentMethod && filters.paymentMethod !== 'All' && order.paymentMethod !== filters.paymentMethod) return false
  if (filters.sourceKind && filters.sourceKind !== 'All' && order.sourceKind !== filters.sourceKind) return false
  return true
}

function rankItemRows(rows) {
  return rows
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .map((row, index, allRows) => ({
      ...row,
      rank: index < 3 ? 'Top selling' : index >= allRows.length - 2 ? 'Low selling' : 'Steady',
    }))
}

export function buildRestaurantReportModel({
  orders = [],
  customers = [],
  expenses = [],
  openingCash = 0,
  filters = {},
  settings = {},
} = {}) {
  const normalizedOrders = normalizeRestaurantReportOrders(orders, { settings }).filter((order) => passesFilters(order, filters))
  const customerRowsSource = Array.isArray(customers) ? customers : []
  const billedOrders = normalizedOrders.filter((order) => order.contributesToRevenue)
  const normalBilledOrders = billedOrders.filter((order) => !order.isInvoice)
  const invoiceBilledOrders = billedOrders.filter((order) => order.isInvoice)
  const approvedExpenses = expenseAmount(expenses)

  const salesByOrderType = {}
  const collectionsByPaymentMethod = {}
  const billedOrdersByStatus = emptyObject(['paid', 'partial', 'due'])
  const ordersByHour = {}
  const itemMap = new Map()
  const categoryMap = new Map()
  const tableMap = new Map()
  const customerMap = new Map()
  const discountRows = []
  const taxRows = []
  const serviceChargeRows = []
  const cancellationRows = []
  let costOfGoodsSold = 0

  normalizedOrders.forEach((order) => {
    if (order.isCancelled) cancellationRows.push(order)
    if (order.hour !== '') ordersByHour[order.hour] = money(ordersByHour[order.hour]) + 1
    if (order.isBilled) billedOrdersByStatus[order.paymentStatus] = money(billedOrdersByStatus[order.paymentStatus]) + 1

    if (order.contributesToRevenue) {
      salesByOrderType[order.orderType] = money(salesByOrderType[order.orderType]) + order.total
      collectionsByPaymentMethod[order.paymentMethod] = money(collectionsByPaymentMethod[order.paymentMethod]) + order.paidAmount
      if (order.discount > 0) discountRows.push(order)
      if (order.tax > 0) taxRows.push(order)
      if (order.serviceCharges > 0) serviceChargeRows.push(order)
    }

    order.items.forEach((item) => {
      if (!order.contributesToInventorySales) return
      const revenue = item.sellingPrice * item.quantity
      const cost = item.costPrice * item.quantity
      costOfGoodsSold += cost
      addToMap(itemMap, item.id, {
        initial: { name: item.name, category: item.category, quantity: 0, revenue: 0, discount: 0, cost: 0 },
        text: { name: item.name, category: item.category },
        values: { quantity: item.quantity, revenue, discount: item.discount, cost },
      })
      if (item.category) {
        addToMap(categoryMap, item.category, {
          initial: { category: item.category, quantity: 0, revenue: 0, cost: 0 },
          text: { category: item.category },
          values: { quantity: item.quantity, revenue, cost },
        })
      }
    })

    if (order.table && order.contributesToRevenue) {
      addToMap(tableMap, order.table, {
        initial: { table: order.table, orders: 0, sales: 0, collected: 0 },
        text: { table: order.table, status: order.orderStatus },
        values: { orders: 1, sales: order.total, collected: order.paidAmount },
      })
    }

    const customer = customerRowsSource.find((item) => item?.id === order.customerId)
    const customerKey = order.customerId || 'walk-in'
    const row = addToMap(customerMap, customerKey, {
      initial: {
        name: customer?.name || order.customerName || 'Walk-in Guest',
        orders: 0,
        billedOrders: 0,
        sales: 0,
        paid: 0,
        periodOrderOutstanding: 0,
        storedCustomerCreditBalance: money(customer?.creditBalance),
      },
      text: { name: customer?.name || order.customerName || 'Walk-in Guest' },
      values: {
        orders: order.isCancelled ? 0 : 1,
        billedOrders: order.isBilled ? 1 : 0,
        sales: order.contributesToRevenue ? order.total : 0,
        paid: order.contributesToCollection ? order.paidAmount : 0,
        periodOrderOutstanding: order.contributesToRevenue ? order.dueAmount : 0,
      },
    })
    row.storedCustomerCreditBalance = money(customer?.creditBalance)
  })

  const grossSales = billedOrders.reduce((sum, order) => sum + order.subtotal, 0)
  const discounts = billedOrders.reduce((sum, order) => sum + order.discount, 0)
  const netSales = grossSales - discounts
  const collectedAmount = billedOrders.reduce((sum, order) => sum + order.paidAmount, 0)
  const outstandingAmount = billedOrders.reduce((sum, order) => sum + order.dueAmount, 0)
  const tax = billedOrders.reduce((sum, order) => sum + order.tax, 0)
  const serviceCharges = billedOrders.reduce((sum, order) => sum + order.serviceCharges, 0)
  const grossProfit = netSales - costOfGoodsSold
  const netProfit = grossProfit - approvedExpenses
  const totalSales = billedOrders.reduce((sum, order) => sum + order.total, 0)
  const cashReceived = billedOrders.filter((order) => order.paymentMethod === 'Cash').reduce((sum, order) => sum + order.paidAmount, 0)
  const onlineReceived = billedOrders.filter((order) => onlineMethods.has(order.paymentMethod)).reduce((sum, order) => sum + order.paidAmount, 0)
  const itemRows = rankItemRows(Array.from(itemMap.values()))
  const tableRows = Array.from(tableMap.values()).sort((a, b) => b.sales - a.sales)
  const customerRows = Array.from(customerMap.values()).sort((a, b) => b.sales - a.sales)
  const kotOrders = normalizedOrders.filter((order) => !order.isInvoice && !order.isCancelled)
  const normalOrderSales = normalBilledOrders.reduce((sum, order) => sum + order.total, 0)
  const invoiceOrderSales = invoiceBilledOrders.reduce((sum, order) => sum + order.total, 0)

  return {
    orders: normalizedOrders,
    billedOrders,
    grossSales,
    discounts,
    netSales,
    totalSales,
    collectedAmount,
    outstandingAmount,
    tax,
    serviceCharges,
    costOfGoodsSold,
    grossProfit,
    netProfit,
    averageOrderValue: billedOrders.length ? netSales / billedOrders.length : 0,
    approvedExpenses,
    openingCash: money(openingCash),
    salesByOrderType,
    collectionsByPaymentMethod,
    billedOrdersByStatus,
    ordersByHour,
    itemSales: itemRows,
    categorySales: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue),
    tablePerformance: tableRows,
    customerPerformance: customerRows,
    kotStatus: {
      total: kotOrders.length,
      pending: kotOrders.filter((order) => order.orderStatus === 'pending').length,
      preparing: kotOrders.filter((order) => order.orderStatus === 'preparing').length,
      ready: kotOrders.filter((order) => order.orderStatus === 'ready').length,
      served: kotOrders.filter((order) => order.orderStatus === 'served').length,
      averagePreparationTime: kotOrders.length ? Math.round(kotOrders.reduce((sum, order) => sum + order.prepTime, 0) / kotOrders.length) : 0,
    },
    invoiceVsNormal: {
      normalOrders: normalBilledOrders.length,
      invoiceOrders: invoiceBilledOrders.length,
      normalOrderSales,
      invoiceOrderSales,
    },
    cancellations: {
      count: cancellationRows.length,
      rows: cancellationRows,
    },
    discountRows,
    taxRows,
    serviceChargeRows,
    expenses: {
      total: approvedExpenses,
      rows: Array.isArray(expenses) ? expenses : [],
    },
    profitability: {
      grossSales,
      discounts,
      netSales,
      costOfGoodsSold,
      grossProfit,
      approvedExpenses,
      netProfit,
    },
    cashReconciliation: {
      expectedCash: null,
      actualClosingCash: null,
      cashDifference: null,
      cashReconciliationAvailable: false,
      unavailableReason: 'Actual closing cash, reliable cash expense source, cash refunds, and cash withdrawals are not stored in the Restaurant report source data.',
    },
    cashReceived,
    onlineReceived,
    periodOrderOutstanding: outstandingAmount,
    storedCustomerCreditBalance: customerRows.reduce((sum, row) => sum + money(row.storedCustomerCreditBalance), 0),
  }
}
