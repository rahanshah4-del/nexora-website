import { finalItemPrice, safeMoney } from './restaurantPosCalculations.js'

function isBilledOrder(order = {}) {
  const status = String(order.orderStatus || '').toLowerCase()
  const paymentStatus = String(order.paymentStatus || '').toLowerCase()
  if (status === 'cancelled') return false
  // KOT orders that are still pending (not yet billed) should not count as revenue.
  // Only count orders that have been billed/paid.
  return ['paid', 'partial', 'due'].includes(paymentStatus)
}

function safeNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export function calculateRestaurantOrderSummary(orders = []) {
  const rows = Array.isArray(orders) ? orders : []
  const activeOrders = rows.filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled')
  const billedOrders = activeOrders.filter((order) => isBilledOrder(order))
  const totalSales = billedOrders.reduce((sum, order) => sum + safeMoney(order.total ?? order.totals?.total), 0)
  const paidAmount = activeOrders.reduce((sum, order) => sum + safeMoney(order.paidAmount), 0)
  const dueAmount = activeOrders.reduce((sum, order) => sum + safeMoney(order.dueAmount ?? order.due), 0)
  const discounts = billedOrders.reduce((sum, order) => sum + safeMoney(order.totals?.discount), 0)
  const tax = billedOrders.reduce((sum, order) => sum + safeMoney(order.totals?.tax), 0)
  const serviceCharges = billedOrders.reduce((sum, order) => sum + safeMoney(order.totals?.serviceCharges), 0)
  return {
    totalOrders: rows.length,
    activeOrders: activeOrders.length,
    cancelledOrders: rows.length - activeOrders.length,
    totalSales,
    paidAmount,
    dueAmount,
    discounts,
    tax,
    serviceCharges,
    averageOrderValue: billedOrders.length ? totalSales / billedOrders.length : 0,
  }
}

export function buildRestaurantReport(orders = [], customers = [], options = {}) {
  const orderRows = Array.isArray(orders) ? orders : []
  const customerRowsSource = Array.isArray(customers) ? customers : []
  const openingCash = Math.max(0, safeNumber(options.openingCash))
  const realExpenses = Math.max(0, safeNumber(options.expenses))
  const onlineMethods = new Set(['Card', 'JazzCash', 'Easypaisa', 'Bank'])
  const salesByType = { 'Dine-in': 0, Takeaway: 0, Delivery: 0 }
  const salesByPayment = { Cash: 0, Card: 0, JazzCash: 0, Easypaisa: 0, Bank: 0, Due: 0, Invoice: 0 }
  const itemMap = new Map()
  const tableMap = new Map()
  const customerMap = new Map()
  const creditedCustomers = new Set()
  let itemCost = 0
  let simpleOrderSales = 0
  let invoiceOrderSales = 0

  const summary = calculateRestaurantOrderSummary(orderRows)

  orderRows.forEach((order) => {
    const isCancelled = String(order.orderStatus || '').toLowerCase() === 'cancelled'
    const isKotOnly = !isCancelled && !isBilledOrder(order)
    const isInvoiceOrder = order.sourceKind === 'invoice'
    const total = safeMoney(order.total ?? order.totals?.total)
    const paidAmount = isCancelled || isKotOnly ? 0 : safeMoney(order.paidAmount)
    const dueAmount = isCancelled || isKotOnly ? 0 : safeMoney(order.dueAmount ?? order.due)

    if (!isCancelled && isInvoiceOrder) invoiceOrderSales += total
    if (!isCancelled && !isKotOnly && !isInvoiceOrder) simpleOrderSales += total
    if (!isCancelled && !isKotOnly) {
      salesByType[order.orderType] = safeNumber(salesByType[order.orderType]) + total
      salesByPayment[order.paymentMethod] = safeNumber(salesByPayment[order.paymentMethod]) + total
    }

    ;(order.cartRows || []).forEach((row) => {
      const item = row.item || row
      const id = item.id || row.itemId || item.name || 'item'
      const quantity = Math.max(0, Number(row.qty || row.quantity || 0))
      const current = itemMap.get(id) || { id, name: item.name || 'Menu item', quantity: 0, revenue: 0, discount: 0 }
      const unitPrice = finalItemPrice(item)
      current.quantity += quantity
      current.revenue += isCancelled || isKotOnly ? 0 : unitPrice * quantity
      current.discount += isCancelled || isKotOnly ? 0 : Math.max(0, safeNumber(item.price) - unitPrice) * quantity
      itemMap.set(id, current)
      itemCost += isCancelled || isKotOnly ? 0 : safeNumber(item.costPrice) * quantity
    })

    if (order.table) {
      const current = tableMap.get(order.table) || { id: order.table, table: order.table, orders: 0, sales: 0, status: 'available' }
      current.orders += isCancelled || isKotOnly ? 0 : 1
      current.sales += isCancelled || isKotOnly ? 0 : total
      current.status = String(order.orderStatus || '').toLowerCase() === 'served' ? 'occupied' : order.orderStatus
      tableMap.set(order.table, current)
    }

    const customer = customerRowsSource.find((item) => item.id === order.customerId)
    const key = order.customerId || 'walk-in'
    const current = customerMap.get(key) || { id: key, name: customer?.name || order.customer || 'Walk-in Guest', orders: 0, paid: 0, due: 0 }
    current.orders += isCancelled ? 0 : 1
    current.paid += paidAmount
    current.due += dueAmount
    if (customer?.creditBalance && !creditedCustomers.has(key)) {
      current.due += safeMoney(customer.creditBalance)
      creditedCustomers.add(key)
    }
    customerMap.set(key, current)
  })

  const totalExpenses = realExpenses
  const netSales = Math.max(0, summary.totalSales - summary.discounts)
  const estimatedProfit = Math.max(0, netSales - itemCost - totalExpenses)
  const itemRows = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .map((row, index, rows) => ({ ...row, rank: index < 3 ? 'Top selling' : index >= rows.length - 2 ? 'Low selling' : 'Steady' }))
  const kotOrders = orderRows.filter((order) => order.sourceKind !== 'invoice' && String(order.orderStatus || '').toLowerCase() !== 'cancelled')
  const kot = {
    total: kotOrders.length,
    pending: kotOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'pending').length,
    preparing: kotOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'preparing').length,
    ready: kotOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'ready').length,
    served: kotOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'served').length,
    averagePreparationTime: kotOrders.length ? Math.round(kotOrders.reduce((sum, order) => sum + safeNumber(order.prepTime), 0) / kotOrders.length) : 0,
  }
  const tableRows = Array.from(tableMap.values()).filter((row) => row.orders > 0).sort((a, b) => b.orders - a.orders)
  const customerRows = Array.from(customerMap.values()).filter((row) => row.orders > 0 || row.due > 0).sort((a, b) => b.orders - a.orders)
  const cashReceived = orderRows.filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled' && order.paymentMethod === 'Cash').reduce((sum, order) => sum + safeMoney(order.paidAmount), 0)
  const onlineReceived = orderRows.filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled' && onlineMethods.has(order.paymentMethod)).reduce((sum, order) => sum + safeMoney(order.paidAmount), 0)

  return {
    ...summary,
    grossSales: summary.totalSales + summary.discounts,
    totalOrders: orderRows.length,
    simpleOrders: orderRows.filter((order) => order.sourceKind !== 'invoice').length,
    invoiceOrders: orderRows.filter((order) => order.sourceKind === 'invoice').length,
    simpleOrderSales,
    invoiceOrderSales,
    salesByType,
    salesByPayment,
    onlineSales: Array.from(onlineMethods).reduce((sum, method) => sum + safeNumber(salesByPayment[method]), 0),
    duePartialSales: orderRows
      .filter((order) => isBilledOrder(order) && ['due', 'partial'].includes(String(order.paymentStatus || '').toLowerCase()))
      .reduce((sum, order) => sum + safeMoney(order.totals?.total ?? order.total), 0),
    itemRows,
    kot,
    occupiedTables: tableRows.filter((row) => row.status === 'occupied').length,
    mostUsedTable: tableRows[0]?.table || '',
    tableRows,
    newCustomers: customerRows.filter((row) => row.orders === 1 && !['cust-walkin', 'walk-in'].includes(row.id)).length,
    repeatCustomers: customerRows.filter((row) => row.orders > 1 && !['cust-walkin', 'walk-in'].includes(row.id)).length,
    customersWithDue: customerRows.filter((row) => row.due > 0).length,
    customerOrderHistory: customerRows.reduce((sum, row) => sum + row.orders, 0),
    customerRows,
    totalExpenses,
    estimatedProfit,
    profitAfterAdjustments: Math.max(0, summary.totalSales - itemCost - totalExpenses),
    closing: {
      openingCash,
      cashReceived,
      onlineReceived,
      duePayments: summary.dueAmount,
      expenses: totalExpenses,
      closingCash: openingCash + cashReceived - totalExpenses,
      difference: 0,
    },
  }
}
