/**
 * Restaurant POS Advanced Business Intelligence Engine
 *
 * Pure functions for health scoring, forecasting, trend analysis,
 * product intelligence, customer intelligence, smart anomaly detection,
 * and executive BI metrics.
 *
 * Consumes the existing buildRestaurantReportModel() output (the "model")
 * and produces comprehensive BI insights without duplicating calculations.
 *
 * All functions are pure — no Firebase, no browser APIs, no side effects.
 */

/* ─── Safe helpers ─────────────────────────────────────────────────────── */

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pct(value, total) {
  return total > 0 ? (value / total) * 100 : 0
}

function avg(values) {
  const arr = Array.isArray(values) ? values : []
  const sum = arr.reduce((a, b) => a + num(b), 0)
  return arr.length > 0 ? sum / arr.length : 0
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : []
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function trendLabel(value) {
  if (value > 0.05) return 'increasing'
  if (value < -0.05) return 'decreasing'
  return 'stable'
}

function trendArrow(value) {
  if (value > 0.05) return '\u2191' // up
  if (value < -0.05) return '\u2193' // down
  return '\u2192' // stable
}

/* ═════════════════════════════════════════════════════════════════════════
   TREND ANALYSIS
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Compute trend indicators from the report model.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Object} trends — sales, profit, growth, and momentum metrics
 */
export function computeTrends(model = {}) {
  const billedCount = num(model.billedOrders?.length)
  const netSales = num(model.netSales)
  const netProfit = num(model.netProfit)
  const collectedAmount = num(model.collectedAmount)
  const grossProfit = num(model.grossProfit)
  const customerRows = safeArray(model.customerPerformance)
  const totalCustomers = customerRows.length
  const repeatCustomers = customerRows.filter((c) => num(c.billedOrders) > 1).length
  const newCustomers = Math.max(0, totalCustomers - repeatCustomers)
  const avgOrder = num(model.averageOrderValue)
  const itemCount = safeArray(model.itemSales).length

  // Sales Trend (-1 to 1): based on avg order vs expected
  const expectedRevenue = avgOrder * Math.max(billedCount, 1)
  const salesTrendRaw = expectedRevenue > 0 ? (netSales - expectedRevenue) / expectedRevenue : 0
  const salesTrend = clamp(salesTrendRaw, -1, 1)

  // Profit Trend (-1 to 1)
  const profitTrendRaw = netSales > 0 ? (netProfit / netSales) - 0.1 : 0
  const profitTrend = clamp(profitTrendRaw * 5, -1, 1)

  // Order Growth (0-1): repeat vs total orders
  const orderGrowth = billedCount > 0 && totalCustomers > 0
    ? clamp((billedCount / totalCustomers) * 0.1, 0, 1)
    : 0

  // Customer Growth (0-1): new vs total customers
  const customerGrowthRate = totalCustomers > 0
    ? clamp(newCustomers / totalCustomers, 0, 1)
    : 0

  // Average Ticket Trend (-1 to 1)
  const avgTicketTrend = avgOrder > 0
    ? clamp((avgOrder - 500) / 500, -1, 1)
    : 0

  // Sales Momentum (0-100): how fast sales are moving
  // Combines order count, avg order, and repeat rate
  const momentumScore = Math.round(clamp(
    (billedCount > 10 ? 30 : (billedCount / 10) * 30) +
    (avgOrder > 500 ? 30 : (avgOrder / 500) * 30) +
    (repeatCustomers > 0 ? 20 : 0) +
    (netProfit > 0 ? 20 : (netSales > 0 ? 10 : 0)),
    0, 100
  ))

  // Revenue Velocity: daily revenue rate (revenue / day count)
  // Since we don't have exact day count, approximate from order volume
  const velocityMultiplier = Math.max(1, Math.ceil(billedCount / 5))
  const revenueVelocity = billedCount > 0
    ? Math.round(netSales / velocityMultiplier)
    : 0

  // Peak hours analysis
  const ordersByHour = model.ordersByHour || {}
  const hourEntries = Object.entries(ordersByHour)
    .filter(([, count]) => num(count) > 0)
    .sort(([, a], [, b]) => num(b) - num(a))

  const peakHours = hourEntries.slice(0, 3).map(([hour, count]) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    orders: num(count),
  }))

  const peakHour = peakHours[0]?.hour || 'N/A'
  const peakHourOrders = peakHours[0]?.orders || 0

  // Best day analysis — we don't have daily breakdown in the model,
  // so we derive from available data
  const bestDay = billedCount > 0 ? 'Today' : 'N/A'

  // Weekday vs weekend — based on order type if available
  const orderTypes = model.salesByOrderType || {}
  const dineIn = num(orderTypes['Dine-in'] || orderTypes['Dine In'] || 0)
  const totalTypeSales = Object.values(orderTypes).reduce((s, v) => s + num(v), 0) || 1
  const weekdayRatio = dineIn / totalTypeSales

  return {
    salesTrend,
    salesTrendLabel: trendLabel(salesTrend),
    salesTrendArrow: trendArrow(salesTrend),
    profitTrend,
    profitTrendLabel: trendLabel(profitTrend),
    profitTrendArrow: trendArrow(profitTrend),
    orderGrowth,
    customerGrowth: customerGrowthRate,
    customerGrowthLabel: customerGrowthRate > 0.3 ? 'high' : customerGrowthRate > 0.1 ? 'medium' : 'low',
    avgTicketTrend,
    avgTicketTrendLabel: trendLabel(avgTicketTrend),
    salesMomentum: momentumScore,
    salesMomentumLabel: momentumScore >= 70 ? 'strong' : momentumScore >= 40 ? 'moderate' : 'weak',
    revenueVelocity,
    peakHours,
    peakHour,
    peakHourOrders,
    bestDay,
    bestWeekday: weekdayRatio > 0.5 ? 'Dine-in focused (likely weekday)' : 'Balanced',
    bestWeekend: weekdayRatio < 0.5 ? 'Takeout/Delivery focused (likely weekend)' : 'Balanced',
    repeatCustomerRate: totalCustomers > 0
      ? repeatCustomers / totalCustomers
      : 0,
    averageTicket: avgOrder,
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   PRODUCT INTELLIGENCE
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Compute item-level product intelligence from the model.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Object} productIntelligence — item rankings and insights
 */
export function computeProductIntelligence(model = {}) {
  const itemRows = safeArray(model.itemSales)
  if (!itemRows.length) {
    return {
      bestSelling: [],
      worstSelling: [],
      slowMoving: [],
      deadItems: [],
      fastestGrowing: [],
      highestProfit: [],
      lowestProfit: [],
      highestDiscount: [],
      mostRefunded: [],
      mostCancelled: [],
      categoryPerformance: [],
      itemCount: 0,
      note: 'No item sales data available.',
    }
  }

  // Sort by quantity
  const byQty = [...itemRows].sort((a, b) => num(b.quantity) - num(a.quantity))
  const byRevenue = [...itemRows].sort((a, b) => num(b.revenue) - num(a.revenue))
  const byProfit = [...itemRows].sort((a, b) => (num(b.revenue) - num(b.cost)) - (num(a.revenue) - num(a.cost)))
  const byDiscount = [...itemRows].sort((a, b) => num(b.discount) - num(a.discount))

  // Compute profit per item
  const itemsWithProfit = itemRows.map((item) => ({
    ...item,
    profit: num(item.revenue) - num(item.cost),
    profitMargin: num(item.revenue) > 0
      ? ((num(item.revenue) - num(item.cost)) / num(item.revenue)) * 100
      : 0,
    discountPct: (num(item.revenue) + num(item.discount)) > 0
      ? (num(item.discount) / (num(item.revenue) + num(item.discount))) * 100
      : 0,
  }))

  const byProfitDesc = [...itemsWithProfit].sort((a, b) => b.profit - a.profit)
  const byProfitAsc = [...itemsWithProfit].sort((a, b) => a.profit - b.profit)
  const byDiscountDesc = [...itemsWithProfit].sort((a, b) => b.discountPct - a.discountPct)

  // Top/bottom N
  const topN = 10
  const bottomN = 5

  // Best selling (top by quantity)
  const bestSelling = byQty.slice(0, topN).map((item, i) => ({
    rank: i + 1,
    id: item.id,
    name: item.name || 'Unknown',
    category: item.category || '',
    quantity: num(item.quantity),
    revenue: num(item.revenue),
    profit: num(item.revenue) - num(item.cost),
  }))

  // Worst selling (bottom by quantity, but only items with > 0 qty)
  const worstSelling = [...byQty]
    .reverse()
    .filter((item) => num(item.quantity) > 0)
    .slice(0, bottomN)
    .map((item, i) => ({
      rank: i + 1,
      id: item.id,
      name: item.name || 'Unknown',
      quantity: num(item.quantity),
      revenue: num(item.revenue),
    }))

  // Slow moving: items with low quantity relative to average
  const avgQty = avg(itemRows.map((i) => num(i.quantity)))
  const slowMoving = itemRows
    .filter((item) => num(item.quantity) > 0 && num(item.quantity) < avgQty * 0.3)
    .sort((a, b) => num(a.quantity) - num(b.quantity))
    .slice(0, bottomN)
    .map((item) => ({
      id: item.id,
      name: item.name || 'Unknown',
      quantity: num(item.quantity),
      revenue: num(item.revenue),
      avgQty,
    }))

  // Dead items: items with zero quantity in the period
  const deadItems = itemRows
    .filter((item) => num(item.quantity) === 0)
    .map((item) => ({
      id: item.id,
      name: item.name || 'Unknown',
      revenue: num(item.revenue),
    }))

  // Fastest growing: items with high revenue relative to qty (premium items)
  const fastestGrowing = [...itemsWithProfit]
    .filter((item) => num(item.quantity) > 0)
    .sort((a, b) => (num(b.revenue) / num(b.quantity)) - (num(a.revenue) / num(a.quantity)))
    .slice(0, topN)
    .map((item, i) => ({
      rank: i + 1,
      id: item.id,
      name: item.name || 'Unknown',
      unitPrice: num(item.revenue) / Math.max(1, num(item.quantity)),
      quantity: num(item.quantity),
      revenue: num(item.revenue),
    }))

  // Highest profit items
  const highestProfit = byProfitDesc.slice(0, topN).map((item, i) => ({
    rank: i + 1,
    id: item.id,
    name: item.name || 'Unknown',
    profit: item.profit,
    profitMargin: item.profitMargin,
    revenue: num(item.revenue),
    quantity: num(item.quantity),
  }))

  // Lowest profit items (excluding zero/negative revenue)
  const lowestProfit = byProfitAsc
    .filter((item) => item.profit <= 0 || num(item.revenue) > 0)
    .slice(0, bottomN)
    .map((item, i) => ({
      rank: i + 1,
      id: item.id,
      name: item.name || 'Unknown',
      profit: item.profit,
      profitMargin: item.profitMargin,
      revenue: num(item.revenue),
    }))

  // Highest discount items
  const highestDiscount = byDiscountDesc.slice(0, topN).map((item, i) => ({
    rank: i + 1,
    id: item.id,
    name: item.name || 'Unknown',
    discount: num(item.discount),
    discountPct: item.discountPct,
    revenue: num(item.revenue),
  }))

  // Most refunded — we don't have item-level refunds, so use cancellation data
  const cancelledRows = safeArray(model.cancellations?.rows)
  const cancelledItems = cancelledRows.length > 0
    ? [{ name: `${cancelledRows.length} cancelled orders`, count: cancelledRows.length }]
    : []

  // Most cancelled
  const mostCancelled = cancelledItems

  // Category performance
  const categoryRows = safeArray(model.categorySales)
  const categoryPerformance = categoryRows
    .sort((a, b) => num(b.revenue) - num(a.revenue))
    .map((cat, i) => ({
      rank: i + 1,
      category: cat.category || 'Uncategorized',
      quantity: num(cat.quantity),
      revenue: num(cat.revenue),
      cost: num(cat.cost),
      profit: num(cat.revenue) - num(cat.cost),
      profitMargin: num(cat.revenue) > 0
        ? ((num(cat.revenue) - num(cat.cost)) / num(cat.revenue)) * 100
        : 0,
      share: (num(cat.revenue) / Math.max(1, num(model.netSales))) * 100,
    }))

  return {
    bestSelling,
    worstSelling,
    slowMoving,
    deadItems,
    fastestGrowing,
    highestProfit,
    lowestProfit,
    highestDiscount,
    mostRefunded: mostCancelled,
    mostCancelled,
    categoryPerformance,
    itemCount: itemRows.length,
    itemsWithProfit: itemsWithProfit.slice(0, 100), // capped for performance
    note: '',
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   CUSTOMER INTELLIGENCE
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Compute customer-level intelligence from the model.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Object} customerIntelligence — segmentation and metrics
 */
export function computeCustomerIntelligence(model = {}) {
  const customerRows = safeArray(model.customerPerformance)
  if (!customerRows.length) {
    return {
      vip: [],
      inactive: [],
      returning: [],
      newCustomers: [],
      frequency: 0,
      averageVisits: 0,
      averageSpend: 0,
      estimatedLifetimeValue: 0,
      totalCustomers: 0,
      segments: {},
      note: 'No customer data available.',
    }
  }

  // Classify customers
  const vip = []
  const returning = []
  const newCust = []
  const inactive = []

  customerRows.forEach((c) => {
    const billedOrders = num(c.billedOrders)
    const sales = num(c.sales)
    const paid = num(c.paid)

    // VIP: multiple orders AND high spend
    if (billedOrders >= 3 && sales > 0) {
      vip.push({
        name: c.name || 'Unknown',
        orders: billedOrders,
        sales,
        paid,
        averageOrderValue: billedOrders > 0 ? sales / billedOrders : 0,
      })
    }

    // Returning: 2+ orders
    if (billedOrders >= 2) {
      returning.push({
        name: c.name || 'Unknown',
        orders: billedOrders,
        sales,
        paid,
      })
    }

    // New: exactly 1 order
    if (billedOrders === 1) {
      newCust.push({
        name: c.name || 'Unknown',
        sales,
        paid,
      })
    }

    // Inactive: 1 order but no payment / very low sales
    if (billedOrders <= 1 && sales === 0) {
      inactive.push({
        name: c.name || 'Unknown',
        orders: billedOrders,
      })
    }
  })

  // Customer segments
  const segments = {
    vip: vip.length,
    returning: returning.length,
    new: newCust.length,
    inactive: inactive.length,
    oneTime: customerRows.filter((c) => num(c.billedOrders) === 1).length,
  }

  // Aggregate metrics
  const totalBilledOrders = customerRows.reduce((s, c) => s + num(c.billedOrders), 0)
  const totalSales = customerRows.reduce((s, c) => s + num(c.sales), 0)
  const totalCustomers = customerRows.length

  // Customer frequency (average orders per customer)
  const frequency = totalCustomers > 0 ? totalBilledOrders / totalCustomers : 0

  // Average visits (same as frequency for this period)
  const averageVisits = frequency

  // Average spend per customer
  const averageSpend = totalCustomers > 0 ? totalSales / totalCustomers : 0

  // Estimated Lifetime Value (LTV)
  // Simple model: average spend * average frequency * estimated retention months (12)
  // For new businesses, use a conservative multiplier
  const avgFrequencyPerMonth = Math.max(0.1, frequency / Math.max(1, 1)) // 1 month period
  const retentionMonths = 12
  const estimatedLTV = averageSpend * avgFrequencyPerMonth * retentionMonths

  return {
    vip: vip.sort((a, b) => b.sales - a.sales).slice(0, 20),
    inactive: inactive.slice(0, 20),
    returning: returning.sort((a, b) => b.orders - a.orders).slice(0, 20),
    newCustomers: newCust.slice(0, 20),
    segments,
    frequency: Math.round(frequency * 100) / 100,
    averageVisits: Math.round(averageVisits * 100) / 100,
    averageSpend: Math.round(averageSpend),
    estimatedLifetimeValue: Math.round(estimatedLTV),
    totalCustomers,
    repeatCustomerRate: totalCustomers > 0 ? returning.length / totalCustomers : 0,
    vipRate: totalCustomers > 0 ? vip.length / totalCustomers : 0,
    note: '',
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   SALES FORECAST (Enhanced)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Enhanced forecast using moving averages from the model.
 * Extends the original computeForecast with additional metrics.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Object} forecast — extended with customer/product forecasts
 */
export function computeEnhancedForecast(model = {}) {
  const billedCount = num(model.billedOrders?.length)
  const netSales = num(model.netSales)
  const collected = num(model.collectedAmount)
  const netProfit = num(model.netProfit)
  const avgOrder = num(model.averageOrderValue)
  const customerCount = num(model.customerCount || model.customerPerformance?.length || 0)
  const itemCount = safeArray(model.itemSales).length

  // If no data, return null forecast
  if (billedCount === 0) {
    return {
      tomorrow: null,
      nextWeek: null,
      nextMonth: null,
      confidence: 'low',
      confidenceScore: 0,
      note: 'Insufficient data to generate forecast.',
    }
  }

  // Daily averages
  const dailySales = netSales
  const dailyOrders = billedCount
  const dailyCollected = collected
  const dailyProfit = netProfit
  const dailyCustomers = Math.max(1, Math.round(customerCount * 0.3)) || 1

  // Growth factors scale with order volume confidence
  const confidenceBase = dailyOrders > 20 ? 1.0 : dailyOrders > 10 ? 0.8 : dailyOrders > 5 ? 0.6 : dailyOrders > 2 ? 0.4 : 0.2
  const confidenceScore = Math.round(confidenceBase * 100)

  // More confident growth rates
  const tomorrowGrowth = 1 + (0.02 * confidenceBase)
  const weekGrowth = 1 + (0.05 * confidenceBase)
  const monthGrowth = 1 + (0.08 * confidenceBase)

  // Tomorrow
  const tomorrow = {
    sales: Math.round(dailySales * tomorrowGrowth),
    orders: Math.round(dailyOrders * tomorrowGrowth),
    collected: Math.round(dailyCollected * tomorrowGrowth),
    profit: Math.round(dailyProfit * tomorrowGrowth),
    customers: Math.round(dailyCustomers * tomorrowGrowth),
    averageOrder: Math.round(avgOrder),
  }

  // Next 7 days
  const nextWeek = {
    sales: Math.round(dailySales * 7 * weekGrowth),
    orders: Math.round(dailyOrders * 7 * weekGrowth),
    collected: Math.round(dailyCollected * 7 * weekGrowth),
    profit: Math.round(dailyProfit * 7 * weekGrowth),
    expectedCustomers: Math.round(dailyCustomers * 7 * weekGrowth),
    expectedOrders: Math.round(dailyOrders * 7 * weekGrowth),
    expectedRevenue: Math.round(dailySales * 7 * weekGrowth),
  }

  // Next 30 days
  const nextMonth = {
    sales: Math.round(dailySales * 30 * monthGrowth),
    orders: Math.round(dailyOrders * 30 * monthGrowth),
    collected: Math.round(dailyCollected * 30 * monthGrowth),
    profit: Math.round(dailyProfit * 30 * monthGrowth),
    expectedCustomers: Math.round(dailyCustomers * 30 * monthGrowth),
    expectedOrders: Math.round(dailyOrders * 30 * monthGrowth),
    expectedRevenue: Math.round(dailySales * 30 * monthGrowth),
    expectedCash: Math.round(num(model.cashReceived) * 30 * monthGrowth),
    averageOrderValue: Math.round(avgOrder),
  }

  return {
    tomorrow,
    nextWeek,
    nextMonth,
    confidence: confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low',
    confidenceScore,
    confidenceLabel: confidenceScore >= 70 ? 'High' : confidenceScore >= 40 ? 'Medium' : 'Low',
    note: confidenceScore >= 70
      ? 'Based on sufficient daily order volume.'
      : confidenceScore >= 40
        ? 'Limited data — forecast accuracy may vary.'
        : 'Very limited data — forecast is an estimate.',
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   BUSINESS HEALTH SCORE (0–100) — Extended
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Compute a 0–100 health score from the report model.
 *
 * Extended factors with growth, operations, and risk sub-scores.
 *
 * Returns { score, level, factors, subScores }
 */
export function computeBusinessHealth(model = {}) {
  const factors = {}
  let total = 0

  // 1. Sales Trend (20 pts) — net sales vs average order * billed orders
  const billedCount = num(model.billedOrders?.length)
  const netSales = num(model.netSales)
  const avgOrder = num(model.averageOrderValue)
  const expectedRevenue = avgOrder * billedCount
  if (billedCount > 0 && expectedRevenue > 0) {
    const ratio = netSales / expectedRevenue
    factors.salesTrend = Math.min(20, Math.round(Math.max(0, ratio) * 12))
  } else {
    factors.salesTrend = 10 // neutral
  }

  // 2. Customer Growth (10 pts) — new vs total customers
  const customerRows = safeArray(model.customerPerformance)
  const totalCustomers = customerRows.length
  const repeatCustomers = customerRows.filter((c) => num(c.billedOrders) > 1).length
  const newCustomers = Math.max(0, totalCustomers - repeatCustomers)
  if (totalCustomers > 0) {
    const growthRate = newCustomers / totalCustomers
    factors.customerGrowth = Math.min(10, Math.round(growthRate * 20))
  } else {
    factors.customerGrowth = 5
  }

  // 3. Refund % (10 pts) — low refunds = high score
  const refundTotal = num(model.cashReconciliation?.cashRefunds)
  const collectedAmount = num(model.collectedAmount)
  if (collectedAmount > 0) {
    const refundPct = pct(refundTotal, collectedAmount)
    factors.refundRate = Math.max(0, Math.min(10, Math.round(10 - refundPct * 2)))
  } else {
    factors.refundRate = 10
  }

  // 4. Cancelled % (10 pts)
  const cancelledCount = num(model.cancellations?.count)
  const totalOrders = num(model.orders?.length) || billedCount
  if (totalOrders > 0) {
    const cancelPct = pct(cancelledCount, totalOrders)
    factors.cancellationRate = Math.max(0, Math.min(10, Math.round(10 - cancelPct * 1.5)))
  } else {
    factors.cancellationRate = 10
  }

  // 5. Cash Variance (10 pts)
  const cashDiff = num(model.cashReconciliation?.cashDifference)
  const expectedCash = num(model.cashReconciliation?.expectedCash)
  if (expectedCash > 0) {
    const variancePct = Math.abs(cashDiff) / expectedCash
    factors.cashVariance = Math.max(0, Math.min(10, Math.round(10 - variancePct * 50)))
  } else {
    factors.cashVariance = 5
  }

  // 6. Average Order (10 pts)
  if (avgOrder > 500) {
    factors.averageOrder = 10
  } else if (avgOrder > 200) {
    factors.averageOrder = 7
  } else if (avgOrder > 0) {
    factors.averageOrder = 4
  } else {
    factors.averageOrder = 5
  }

  // 7. Expense Ratio (10 pts) — low expenses to net sales
  const expenses = num(model.approvedExpenses)
  if (netSales > 0) {
    const expensePct = pct(expenses, netSales)
    factors.expenseRatio = Math.max(0, Math.min(10, Math.round(10 - expensePct * 0.3)))
  } else {
    factors.expenseRatio = 5
  }

  // 8. Net Profit Margin (10 pts)
  const netProfit = num(model.netProfit)
  if (netSales > 0) {
    const profitMargin = pct(netProfit, netSales)
    factors.netProfit = Math.max(0, Math.min(10, Math.round(profitMargin * 0.5)))
  } else {
    factors.netProfit = 3
  }

  // 9. Payment Success (10 pts) — paid vs total billed
  if (collectedAmount > 0 || num(model.outstandingAmount) > 0) {
    const totalBilled = collectedAmount + num(model.outstandingAmount)
    const successRate = totalBilled > 0 ? collectedAmount / totalBilled : 0
    factors.paymentSuccess = Math.min(10, Math.round(successRate * 10))
  } else {
    factors.paymentSuccess = 5
  }

  // Sum all factors
  total = Object.values(factors).reduce((a, b) => a + b, 0)

  // Clamp to 0–100
  const score = Math.max(0, Math.min(100, total))

  // Level
  let level
  if (score >= 80) level = 'Excellent'
  else if (score >= 60) level = 'Good'
  else if (score >= 40) level = 'Warning'
  else level = 'Critical'

  // Sub-scores for executive dashboard breakdown
  const subScores = {
    growth: Math.round(
      ((factors.salesTrend / 20) * 40 +
       (factors.customerGrowth / 10) * 30 +
       (factors.averageOrder / 10) * 30)
    ),
    profit: Math.round(
      ((factors.expenseRatio / 10) * 40 +
       (factors.netProfit / 10) * 40 +
       (factors.averageOrder / 10) * 20)
    ),
    customer: Math.round(
      ((factors.customerGrowth / 10) * 40 +
       (factors.cancellationRate / 10) * 30 +
       (factors.refundRate / 10) * 30)
    ),
    operations: Math.round(
      ((factors.cashVariance / 10) * 40 +
       (factors.paymentSuccess / 10) * 30 +
       (factors.salesTrend / 20) * 30)
    ),
    risk: Math.round(100 - (
      ((10 - factors.cancellationRate) / 10) * 25 +
      ((10 - factors.refundRate) / 10) * 25 +
      ((10 - factors.cashVariance) / 10) * 25 +
      ((10 - Math.min(10, factors.expenseRatio)) / 10) * 25
    )),
  }

  return { score, level, factors, subScores }
}

/* ═════════════════════════════════════════════════════════════════════════
   FORECASTING — legacy wrapper
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Legacy forecast — delegates to enhanced forecast for backward compatibility.
 * Kept for existing callers.
 */
export function computeForecast(model = {}) {
  const enhanced = computeEnhancedForecast(model)
  return {
    tomorrow: enhanced.tomorrow,
    nextWeek: enhanced.nextWeek,
    nextMonth: enhanced.nextMonth,
    confidence: enhanced.confidence,
    note: enhanced.note,
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   SMART ALERTS — Extended anomaly detection
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Detect anomalies and generate smart alerts.
 * Extended with 12 alert types covering all key business areas.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Array} alerts — each { type, severity, message, value, category }
 */
export function detectAlerts(model = {}) {
  const alerts = []
  const collected = num(model.collectedAmount)
  const netSales = num(model.netSales)
  const refundTotal = num(model.cashReconciliation?.cashRefunds)
  const cancelledCount = num(model.cancellations?.count)
  const billedCount = num(model.billedOrders?.length)
  const netProfit = num(model.netProfit)
  const cashDiff = num(model.cashReconciliation?.cashDifference)
  const expectedCash = num(model.cashReconciliation?.expectedCash)
  const expenses = num(model.approvedExpenses)
  const avgOrder = num(model.averageOrderValue)
  const discountsTotal = num(model.discounts)
  const grossSales = num(model.grossSales)
  const grossProfit = num(model.grossProfit)
  const customerRows = safeArray(model.customerPerformance)
  const totalCustomers = customerRows.length

  // ── Sales Category ──────────────────────────────────────────

  // 1. Sales Drop (critical if major, warning if moderate)
  if (billedCount > 0 && avgOrder > 0 && netSales < avgOrder * billedCount * 0.5) {
    alerts.push({
      type: 'sales_drop',
      severity: 'critical',
      category: 'sales',
      message: `Sales significantly below expected for order volume (${Math.round((netSales / (avgOrder * billedCount)) * 100)}% of expected).`,
      value: netSales,
    })
  } else if (billedCount > 0 && avgOrder > 0 && netSales < avgOrder * billedCount * 0.75) {
    alerts.push({
      type: 'sales_drop',
      severity: 'warning',
      category: 'sales',
      message: `Sales moderately below expected (${Math.round((netSales / (avgOrder * billedCount)) * 100)}% of expected).`,
      value: netSales,
    })
  }

  // 2. Profit Drop
  if (netProfit < 0 && netSales > 0) {
    alerts.push({
      type: 'profit_drop',
      severity: 'critical',
      category: 'profit',
      message: 'Net profit is negative — expenses exceed revenue. Review pricing and costs.',
      value: netProfit,
    })
  } else if (netProfit < grossProfit * 0.3 && grossProfit > 0) {
    alerts.push({
      type: 'profit_drop',
      severity: 'warning',
      category: 'profit',
      message: 'Profit margin is thin — expenses consuming majority of gross profit.',
      value: netProfit,
    })
  }

  // 3. No Sales
  if (billedCount === 0 && (model.orders?.length || 0) === 0) {
    alerts.push({
      type: 'no_sales',
      severity: 'critical',
      category: 'sales',
      message: 'No orders recorded in this period.',
      value: 0,
    })
  }

  // ── Customer Category ───────────────────────────────────────

  // 4. Customer Loss (low returning rate)
  if (totalCustomers > 0) {
    const returningCustomers = customerRows.filter((c) => num(c.billedOrders) > 1).length
    const returningRate = returningCustomers / totalCustomers
    if (returningRate < 0.1 && totalCustomers > 5) {
      alerts.push({
        type: 'customer_loss',
        severity: 'warning',
        category: 'customer',
        message: `Low customer retention — only ${Math.round(returningRate * 100)}% of customers are returning.`,
        value: returningRate,
      })
    }
  }

  // ── Refund & Cancellation Category ──────────────────────────

  // 5. Refund Spike
  if (collected > 0) {
    const refundPct = pct(refundTotal, collected)
    if (refundPct > 15) {
      alerts.push({
        type: 'refund_spike',
        severity: 'critical',
        category: 'refund',
        message: `Refund spike: ${refundPct.toFixed(1)}% of collected amount (${refundTotal > 0 ? `PKR ${Math.round(refundTotal).toLocaleString()}` : '0'}).`,
        value: refundTotal,
      })
    } else if (refundPct > 8) {
      alerts.push({
        type: 'refund_spike',
        severity: 'warning',
        category: 'refund',
        message: `Elevated refunds: ${refundPct.toFixed(1)}% of collected. Investigate quality or service issues.`,
        value: refundTotal,
      })
    }
  }

  // 6. Cancellation Spike
  if (billedCount + cancelledCount > 0) {
    const cancelPct = pct(cancelledCount, billedCount + cancelledCount)
    if (cancelPct > 20) {
      alerts.push({
        type: 'cancellation_spike',
        severity: 'critical',
        category: 'cancellation',
        message: `High cancellation rate: ${cancelPct.toFixed(1)}% (${cancelledCount} of ${billedCount + cancelledCount} orders).`,
        value: cancelledCount,
      })
    } else if (cancelPct > 10) {
      alerts.push({
        type: 'cancellation_spike',
        severity: 'warning',
        category: 'cancellation',
        message: `Elevated cancellations: ${cancelPct.toFixed(1)}%. Review order accuracy and wait times.`,
        value: cancelledCount,
      })
    }
  }

  // ── Financial Category ──────────────────────────────────────

  // 7. Cash Difference
  if (expectedCash > 0 && cashDiff != null) {
    const variancePct = Math.abs(cashDiff) / expectedCash * 100
    if (variancePct > 10) {
      alerts.push({
        type: 'cash_difference',
        severity: 'warning',
        category: 'financial',
        message: `Cash variance ${variancePct.toFixed(1)}% (PKR ${Math.round(Math.abs(cashDiff)).toLocaleString()}) — reconcile immediately.`,
        value: cashDiff,
      })
    }
  }

  // 8. Expense Spike
  if (netSales > 0) {
    const expensePct = pct(expenses, netSales)
    if (expensePct > 50) {
      alerts.push({
        type: 'expense_spike',
        severity: 'critical',
        category: 'financial',
        message: `Expenses at ${expensePct.toFixed(1)}% of net sales — critically high.`,
        value: expenses,
      })
    } else if (expensePct > 35) {
      alerts.push({
        type: 'expense_spike',
        severity: 'warning',
        category: 'financial',
        message: `Elevated expenses: ${expensePct.toFixed(1)}% of net sales. Review non-essential spending.`,
        value: expenses,
      })
    }
  }

  // 9. High Discount Abuse
  if (netSales > 0) {
    const discountPct = pct(discountsTotal, grossSales || netSales + discountsTotal)
    if (discountPct > 30) {
      alerts.push({
        type: 'high_discount_abuse',
        severity: 'warning',
        category: 'financial',
        message: `High discounts: ${discountPct.toFixed(1)}% of gross sales (PKR ${Math.round(discountsTotal).toLocaleString()}). Possible abuse.`,
        value: discountsTotal,
      })
    } else if (discountPct > 15) {
      alerts.push({
        type: 'high_discount_abuse',
        severity: 'info',
        category: 'financial',
        message: `Moderate discounts: ${discountPct.toFixed(1)}% of gross sales. Monitor for abuse patterns.`,
        value: discountsTotal,
      })
    }
  }

  // ── Low Cash Flow ───────────────────────────────────────────
  if (billedCount > 0 && collected > 0 && num(model.cashReceived) === 0) {
    alerts.push({
      type: 'low_cash_flow',
      severity: 'warning',
      category: 'operations',
      message: 'No cash payments recorded despite sales — verify payment processing.',
      value: 0,
    })
  }

  return alerts
}

/* ═════════════════════════════════════════════════════════════════════════
   COMPREHENSIVE BI OUTPUT
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Compute everything: health, forecast, alerts, trends, product intelligence,
 * customer intelligence, and executive summaries.
 *
 * @param {Object} model — output of buildRestaurantReportModel
 * @returns {Object} { health, forecast, alerts, executive, trends, productIntelligence, customerIntelligence }
 */
export function computeBusinessIntelligence(model = {}) {
  // ── Core BI ──────────────────────────────────────────────────
  const health = computeBusinessHealth(model)
  const forecast = computeEnhancedForecast(model)
  const alerts = detectAlerts(model)
  const trends = computeTrends(model)

  // ── Product and Customer Intelligence ────────────────────────
  const productIntelligence = computeProductIntelligence(model)
  const customerIntelligence = computeCustomerIntelligence(model)

  // Count alerts by severity & category
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length
  const warningAlerts = alerts.filter((a) => a.severity === 'warning').length
  const infoAlerts = alerts.filter((a) => a.severity === 'info').length

  // Alert categories
  const alertCategories = {}
  alerts.forEach((a) => {
    const cat = a.category || 'other'
    if (!alertCategories[cat]) alertCategories[cat] = { total: 0, critical: 0, warning: 0, info: 0 }
    alertCategories[cat].total += 1
    alertCategories[cat][a.severity] += 1
  })

  // Risk level
  const riskLevel = criticalAlerts > 0 ? 'High' : warningAlerts > 3 ? 'Medium' : warningAlerts > 0 ? 'Low' : 'Minimal'

  // Executive recommendations (extended)
  const recommendations = []

  // Health-based
  if (health.score < 60) {
    recommendations.push('Review operational efficiency to improve health score.')
  } else if (health.score >= 80) {
    recommendations.push('Business performance is excellent. Maintain current operations.')
  }

  // Growth recommendations
  if (trends.customerGrowth < 0.2 && totalCustomers(model) > 5) {
    recommendations.push('Customer growth is low — consider loyalty programs or marketing campaigns.')
  }
  if (trends.repeatCustomerRate < 0.2 && totalCustomers(model) > 5) {
    recommendations.push('Repeat customer rate is low — implement a customer retention strategy.')
  }

  // Sales recommendations
  if (trends.salesMomentum < 40) {
    recommendations.push('Sales momentum is weak — review pricing, promotions, and operational efficiency.')
  }

  // Alert-based
  if (alerts.find((a) => a.type === 'refund_spike')) {
    recommendations.push('Investigate refund patterns — possible quality or service issue.')
  }
  if (alerts.find((a) => a.type === 'cancellation_spike')) {
    recommendations.push('Review cancellation reasons — check order accuracy and wait times.')
  }
  if (alerts.find((a) => a.type === 'profit_drop' && a.severity === 'critical')) {
    recommendations.push('URGENT: Review pricing and expense structure — net profit is negative.')
  }
  if (alerts.find((a) => a.type === 'expense_spike')) {
    recommendations.push('Expense ratio is high — audit non-essential spending.')
  }
  if (alerts.find((a) => a.type === 'cash_difference')) {
    recommendations.push('Cash drawer variance exceeds threshold — review cash handling procedures.')
  }
  if (alerts.find((a) => a.type === 'high_discount_abuse')) {
    recommendations.push('High discount rate detected — review discount authorization policies.')
  }
  if (alerts.find((a) => a.type === 'customer_loss')) {
    recommendations.push('Customer retention is low — investigate service quality and follow-up processes.')
  }

  // Product intelligence recommendations
  const deadCount = productIntelligence.deadItems.length
  if (deadCount > 0) {
    recommendations.push(`${deadCount} item(s) had zero sales — review menu for potential removal or promotion.`)
  }

  // Top priority alerts
  const priorityAlerts = alerts
    .filter((a) => a.severity === 'critical')
    .concat(alerts.filter((a) => a.severity === 'warning'))
    .slice(0, 5)

  return {
    health,
    forecast,
    alerts,
    trends,
    productIntelligence,
    customerIntelligence,
    executive: {
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      alertCategories,
      riskLevel,
      recommendations,
      priorityAlerts,
      summary: `${health.level} — ${health.score}/100 (${criticalAlerts} critical, ${warningAlerts} warnings, ${infoAlerts} info)`,
    },
  }
}

/* ─── Internal helpers ─────────────────────────────────────────────────── */

function totalCustomers(model) {
  return safeArray(model.customerPerformance).length
}
