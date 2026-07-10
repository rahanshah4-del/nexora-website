import { buildRestaurantReportModel } from '../reports/restaurant/restaurantReportCalculations.js'

function safeNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

function salesByTypeWithDefaults(values = {}) {
  return {
    'Dine-in': safeNumber(values['Dine-in']),
    Takeaway: safeNumber(values.Takeaway),
    Delivery: safeNumber(values.Delivery),
    'Invoice Order': safeNumber(values['Invoice Order']),
    ...values,
  }
}

function collectionsByMethodWithDefaults(values = {}) {
  return {
    Cash: safeNumber(values.Cash),
    Card: safeNumber(values.Card),
    JazzCash: safeNumber(values.JazzCash),
    Easypaisa: safeNumber(values.Easypaisa),
    Bank: safeNumber(values.Bank),
    Due: safeNumber(values.Due),
    Invoice: safeNumber(values.Invoice),
    ...values,
  }
}

export function calculateRestaurantOrderSummary(orders = []) {
  const model = buildRestaurantReportModel({ orders })
  return {
    totalOrders: model.orders.length,
    activeOrders: model.orders.length - model.cancellations.count,
    cancelledOrders: model.cancellations.count,
    totalSales: model.totalSales,
    grossSales: model.grossSales,
    netSales: model.netSales,
    paidAmount: model.collectedAmount,
    dueAmount: model.outstandingAmount,
    discounts: model.discounts,
    tax: model.tax,
    serviceCharges: model.serviceCharges,
    averageOrderValue: model.averageOrderValue,
  }
}

export function buildRestaurantReport(orders = [], customers = [], options = {}) {
  const model = buildRestaurantReportModel({
    orders,
    customers,
    expenses: options.expenses,
    openingCash: options.openingCash,
    filters: options.filters,
    settings: options.settings,
  })
  const salesByType = salesByTypeWithDefaults(model.salesByOrderType)
  const salesByPayment = collectionsByMethodWithDefaults(model.collectionsByPaymentMethod)
  const onlineSales = ['Card', 'JazzCash', 'Easypaisa', 'Bank'].reduce((sum, method) => sum + safeNumber(salesByPayment[method]), 0)
  const duePartialSales = model.billedOrders
    .filter((order) => order.isPartial || order.isDue)
    .reduce((sum, order) => sum + order.total, 0)

  return {
    ...calculateRestaurantOrderSummary(orders),
    model,
    normalizedOrders: model.orders,
    totalOrders: model.orders.length,
    simpleOrders: model.orders.filter((order) => !order.isInvoice).length,
    invoiceOrders: model.orders.filter((order) => order.isInvoice).length,
    simpleOrderSales: model.invoiceVsNormal.normalOrderSales,
    invoiceOrderSales: model.invoiceVsNormal.invoiceOrderSales,
    salesByType,
    salesByPayment,
    onlineSales,
    duePartialSales,
    itemRows: model.itemSales,
    categoryRows: model.categorySales,
    kot: model.kotStatus,
    occupiedTables: model.tablePerformance.filter((row) => row.status === 'occupied').length,
    mostUsedTable: model.tablePerformance[0]?.table || '',
    tableRows: model.tablePerformance,
    newCustomers: model.customerPerformance.filter((row) => row.billedOrders === 1 && !['cust-walkin', 'walk-in'].includes(row.id)).length,
    repeatCustomers: model.customerPerformance.filter((row) => row.billedOrders > 1 && !['cust-walkin', 'walk-in'].includes(row.id)).length,
    customersWithDue: model.customerPerformance.filter((row) => row.periodOrderOutstanding > 0 || row.storedCustomerCreditBalance > 0).length,
    customerOrderHistory: model.customerPerformance.reduce((sum, row) => sum + safeNumber(row.orders), 0),
    customerRows: model.customerPerformance.map((row) => ({
      ...row,
      paid: row.paid,
      due: row.periodOrderOutstanding,
    })),
    totalExpenses: model.approvedExpenses,
    estimatedProfit: model.netProfit,
    profitAfterAdjustments: model.netProfit,
    costOfGoodsSold: model.costOfGoodsSold,
    grossProfit: model.grossProfit,
    netProfit: model.netProfit,
    periodOrderOutstanding: model.periodOrderOutstanding,
    storedCustomerCreditBalance: model.storedCustomerCreditBalance,
    cashReconciliation: model.cashReconciliation,
    closing: {
      openingCash: model.openingCash,
      cashReceived: model.cashReceived,
      onlineReceived: model.onlineReceived,
      duePayments: null,
      expenses: model.approvedExpenses,
      closingCash: null,
      difference: null,
      expectedCash: null,
      actualClosingCash: null,
      cashDifference: null,
      cashReconciliationAvailable: false,
      unavailableReason: model.cashReconciliation.unavailableReason,
    },
  }
}
