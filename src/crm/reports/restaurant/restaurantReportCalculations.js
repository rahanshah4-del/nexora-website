import { normalizeRestaurantReportOrders, restaurantReportNumber } from './restaurantReportNormalizer.js'
import { computeBusinessIntelligence } from './restaurantBusinessIntelligence.js'
import { classifyDetailedRestaurantCashVariance } from '../../data/restaurantCashData.js'

const onlineMethods = new Set(['Card', 'JazzCash', 'Easypaisa', 'Bank'])

function money(value) {
  return restaurantReportNumber(value)
}

function rawNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
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
  menuItems = [],           // for category resolution
  refunds = [],             // Firestore restaurantRefunds records
  cashSessions = [],        // closed sessions with reconciliation data
  cashRefundsTotal,     // (legacy) overridden by cashSessions if present
  cashWithdrawalsTotal, // (legacy) overridden by cashSessions if present
  cashExpensesTotal,    // (legacy) overridden by cashSessions if present
  cashAdjustmentsTotal, // (legacy) overridden by cashSessions if present
  cashDepositsTotal,    // (legacy) overridden by cashSessions if present
} = {}) {
  const normalizedOrders = normalizeRestaurantReportOrders(orders, { settings, menuItems }).filter((order) => passesFilters(order, filters))
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
      // ── Wallet payment attribution ──
      // Split (Wallet + Cash) orders: attribute wallet portion to "Wallet",
      // remainder to the other method (defaulting to "Cash"). Full-wallet
      // orders attribute 100% to "Wallet".
      const pm = order.paymentMethod || 'Cash'
      const walletUsed = money(order.walletAmountUsed)
      if (pm === 'Wallet') {
        collectionsByPaymentMethod['Wallet'] = money(collectionsByPaymentMethod['Wallet']) + order.paidAmount
      } else if (pm.startsWith('Split') && walletUsed > 0) {
        collectionsByPaymentMethod['Wallet'] = money(collectionsByPaymentMethod['Wallet']) + walletUsed
        const remainder = Math.max(0, order.paidAmount - walletUsed)
        collectionsByPaymentMethod['Cash'] = money(collectionsByPaymentMethod['Cash']) + remainder
      } else {
        collectionsByPaymentMethod[pm] = money(collectionsByPaymentMethod[pm]) + order.paidAmount
      }
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
  const cardReceived = billedOrders.filter((order) => order.paymentMethod === 'Card').reduce((sum, order) => sum + order.paidAmount, 0)
  const digitalPayments = billedOrders.filter((order) => ['JazzCash', 'Easypaisa', 'Bank', 'Card'].includes(order.paymentMethod)).reduce((sum, order) => sum + order.paidAmount, 0)
  const itemRows = rankItemRows(Array.from(itemMap.values()))
  const tableRows = Array.from(tableMap.values()).sort((a, b) => b.sales - a.sales)
  const customerRows = Array.from(customerMap.values()).sort((a, b) => b.sales - a.sales)
  const kotOrders = normalizedOrders.filter((order) => !order.isInvoice && !order.isCancelled)
  const normalOrderSales = normalBilledOrders.reduce((sum, order) => sum + order.total, 0)
  const invoiceOrderSales = invoiceBilledOrders.reduce((sum, order) => sum + order.total, 0)
  const expenseSummary = {
    total: approvedExpenses,
    count: Array.isArray(expenses) ? expenses.filter((e) => {
      const status = String(e?.approvalStatus || e?.status || '').toLowerCase()
      return !status || ['approved', 'paid', 'complete', 'completed', 'verified'].includes(status)
    }).length : 0,
  }

  // ── Refund analysis ─────────────────────────────────────────
  const refundAnalysis = (() => {
    const rows = Array.isArray(refunds) ? refunds : []
    const completedRefunds = rows.filter((r) => {
      const s = String(r.status || r.approvalStatus || '').toLowerCase()
      return s === 'completed' || s === 'approved'
    })
    const totalRefundAmount = completedRefunds.reduce((sum, r) => sum + money(r.refundTotal), 0)
    const refundReasons = {}
    const refundByMethod = {}
    const refundByCustomer = {}
    const refundByStaff = {}
    completedRefunds.forEach((r) => {
      const reason = textValue(r.reason || 'Other')
      refundReasons[reason] = money(refundReasons[reason]) + money(r.refundTotal)
      const method = textValue(r.refundMethod || r.paymentMethod || 'Unknown')
      refundByMethod[method] = money(refundByMethod[method]) + money(r.refundTotal)
      const cKey = r.customerId || 'unknown'
      const cName = r.customerName || textValue(r.customer || r.customerName || 'Unknown')
      refundByCustomer[cKey] = { name: cName, total: money(refundByCustomer[cKey]?.total || 0) + money(r.refundTotal), count: (refundByCustomer[cKey]?.count || 0) + 1 }
      const sKey = r.cashierId || r.createdBy || 'unknown'
      refundByStaff[sKey] = { name: r.cashierName || sKey, total: money(refundByStaff[sKey]?.total || 0) + money(r.refundTotal), count: (refundByStaff[sKey]?.count || 0) + 1 }
    })
    return {
      count: completedRefunds.length,
      totalAmount: totalRefundAmount,
      refundPercentage: totalSales > 0 ? (totalRefundAmount / totalSales) * 100 : 0,
      reasons: refundReasons,
      byPaymentMethod: refundByMethod,
      byCustomer: Object.entries(refundByCustomer).map(([id, v]) => ({ customerId: id, ...v })),
      byStaff: Object.entries(refundByStaff).map(([id, v]) => ({ staffId: id, ...v })),
      rows: completedRefunds.map((r) => ({
        id: r.id, refundTotal: money(r.refundTotal), reason: r.reason || 'Other',
        refundMethod: r.refundMethod || r.paymentMethod || 'Cash',
        customerName: r.customerName || r.customer || 'Unknown',
        cashierName: r.cashierName || '', createdAt: r.createdAt || '',
        refundType: r.refundType || 'full',
      })),
      monthlyTrend: (() => {
        const months = {}
        completedRefunds.forEach((r) => {
          const d = dateValue(r.createdAt)
          if (!d) return
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          months[key] = money(months[key]) + money(r.refundTotal)
        })
        return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }))
      })(),
    }
  })()

  // ── Staff / Cashier performance ─────────────────────────────
  const staffPerformance = (() => {
    const staffMap = new Map()
    normalizedOrders.forEach((o) => {
      const sid = o.cashierId || o.staffId || ''
      if (!sid) return
      const sname = o.cashierName || o.staffName || sid
      const staff = staffMap.get(sid) || { staffId: sid, name: sname, sales: 0, orders: 0, refunds: 0, discounts: 0, collected: 0 }
      if (o.contributesToRevenue) { staff.sales += o.total; staff.collected += o.paidAmount; staff.discounts += o.discount }
      if (o.isBilled) staff.orders += 1
      staffMap.set(sid, staff)
    })
    // merge refunds by cashier
    if (Array.isArray(refunds)) {
      refunds.forEach((r) => {
        const sid = r.cashierId || r.createdBy || ''
        if (!sid || !staffMap.has(sid)) return
        staffMap.get(sid).refunds += money(r.refundTotal)
      })
    }
    const rows = Array.from(staffMap.values()).sort((a, b) => b.sales - a.sales)
    const totalSalesForRank = rows.reduce((s, r) => s + r.sales, 0) || 1
    return {
      rows: rows.map((r) => ({
        ...r,
        averageTicket: r.orders > 0 ? r.sales / r.orders : 0,
        performancePct: (r.sales / totalSalesForRank) * 100,
      })),
      topCashier: rows.length > 0 ? rows[0] : null,
      slowestCashier: rows.length > 0 ? rows[rows.length - 1] : null,
    }
  })()

  // ── Expense breakdown by status ─────────────────────────────
  const expenseBreakdown = (() => {
    const rows = Array.isArray(expenses) ? expenses : []
    const byStatus = { approved: 0, pending: 0, rejected: 0, other: 0 }
    const byCategory = {}
    const byDay = {}
    const byMonth = {}
    rows.forEach((e) => {
      const status = String(e?.approvalStatus || e?.status || '').toLowerCase()
      const amount = money(e?.amount ?? e?.total)
      if (['approved', 'paid', 'complete', 'completed', 'verified'].includes(status)) byStatus.approved += amount
      else if (status === 'pending' || status === 'draft') byStatus.pending += amount
      else if (status === 'rejected' || status === 'cancelled') byStatus.rejected += amount
      else byStatus.other += amount
      const cat = textValue(e.category || e.expenseCategory || 'Other')
      byCategory[cat] = money(byCategory[cat]) + amount
      const d = dateValue(e.date || e.createdAt)
      if (d) {
        const dayKey = d.toISOString().slice(0, 10)
        byDay[dayKey] = money(byDay[dayKey]) + amount
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[monthKey] = money(byMonth[monthKey]) + amount
      }
    })
    const total = byStatus.approved + byStatus.pending + byStatus.rejected + byStatus.other
    return { byStatus, byCategory, byDay, byMonth, total, approvedCount: expenseSummary.count }
  })()

  // ── Customer unified summary ────────────────────────────────
  const customerUnified = (() => {
    const merged = new Map()
    // Add refund totals per customer
    const refundTotals = {}
    if (Array.isArray(refunds)) {
      refunds.forEach((r) => {
        const cid = r.customerId || 'cust-walkin'
        refundTotals[cid] = money(refundTotals[cid]) + money(r.refundTotal)
      })
    }
    customerRows.forEach((c) => {
      const cid = c.id
      const refundTotal = refundTotals[cid] || 0
      merged.set(cid, {
        ...c,
        totalRefunds: refundTotal,
        netSales: money(c.sales) - refundTotal,
        lifetimeValue: money(c.sales) - refundTotal + money(c.storedCustomerCreditBalance || 0),
        averageOrderValue: c.billedOrders > 0 ? (c.sales || 0) / c.billedOrders : 0,
        visits: c.orders || 0,
      })
    })
    return Array.from(merged.values()).sort((a, b) => b.sales - a.sales)
  })()

  // ── Payment progress / recovery history ─────────────────────
  const paymentProgress = (() => {
    const paid = billedOrders.filter((o) => o.isPaid)
    const partial = billedOrders.filter((o) => o.isPartial)
    const due = billedOrders.filter((o) => o.isDue)
    const totalBilled = billedOrders.length || 1
    return {
      fullyPaid: { count: paid.length, amount: paid.reduce((s, o) => s + o.total, 0), pct: (paid.length / totalBilled) * 100 },
      partiallyPaid: { count: partial.length, amount: partial.reduce((s, o) => s + o.paidAmount, 0), remaining: partial.reduce((s, o) => s + o.dueAmount, 0), pct: (partial.length / totalBilled) * 100 },
      due: { count: due.length, amount: due.reduce((s, o) => s + o.total, 0), pct: (due.length / totalBilled) * 100 },
      collectionRate: outstandingAmount + collectedAmount > 0 ? (collectedAmount / (outstandingAmount + collectedAmount)) * 100 : 100,
    }
  })()

  // ── Cash reconciliation ─────────────────────────────────────
  const cashReconciliation = (() => {
    const closedSessions = (Array.isArray(cashSessions) ? cashSessions : []).filter((s) => s.status === 'closed' || s.status === 'approved' || s.status === 'locked')
    const hasSessions = closedSessions.length > 0

    const aggCashSales = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashSales), 0) : money(cashReceived)
    const aggCashRefunds = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashRefunds), 0) : money(cashRefundsTotal || 0)
    const aggCashDeposits = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashDeposits), 0) : money(cashDepositsTotal || 0)
    const aggCashWithdrawals = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashWithdrawals), 0) : money(cashWithdrawalsTotal || 0)
    const aggCashExpenses = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashExpenses), 0) : money(cashExpensesTotal || 0)
    const aggCashAdjustments = hasSessions ? closedSessions.reduce((sum, s) => sum + money(s.cashAdjustments), 0) : money(cashAdjustmentsTotal || 0)

    const latest = closedSessions[0] || {}
    const expectedCash = money(openingCash) + aggCashSales + aggCashDeposits - aggCashRefunds - aggCashWithdrawals - aggCashExpenses + aggCashAdjustments
    const actualClosingCash = latest.actualClosingCash != null ? rawNumber(latest.actualClosingCash) : null
    const cashDifference = actualClosingCash != null ? actualClosingCash - expectedCash : null
    const varianceStatus = latest.varianceStatus || null

    return {
      expectedCash, actualClosingCash, cashDifference,
      cashReconciliationAvailable: true, unavailableReason: '',
      cashSales: aggCashSales, cashRefunds: aggCashRefunds, cashDeposits: aggCashDeposits,
      cashWithdrawals: aggCashWithdrawals, cashExpenses: aggCashExpenses, cashAdjustments: aggCashAdjustments,
      varianceStatus, openingCash: money(openingCash),
      cashSessions: Array.isArray(cashSessions) ? cashSessions : [],
      totalTransactions: hasSessions ? closedSessions.reduce((sum, s) => sum + (Number(s.totalTransactions) || 0), 0) : 0,
      averageSale: latest.averageSale || null, largestSale: latest.largestSale || null, largestRefund: latest.largestRefund || null,

      // ── Settlement summary fields ───────────────────────────
      settlementCounts: hasSessions
        ? {
            total: closedSessions.length,
            pendingReview: closedSessions.filter((s) => (s.settlementStatus || s.status) === 'pending_review' || (s.status === 'closed' && !s.settlementStatus)).length,
            approved: closedSessions.filter((s) => s.settlementStatus === 'approved').length,
            rejected: closedSessions.filter((s) => s.settlementStatus === 'rejected').length,
            locked: closedSessions.filter((s) => s.settlementStatus === 'locked').length,
          }
        : { total: 0, pendingReview: 0, approved: 0, rejected: 0, locked: 0 },
      settlementReviewers: hasSessions
        ? closedSessions
            .filter((s) => s.settledBy || s.approvedBy)
            .map((s) => ({ cashier: s.cashierName, settledBy: s.settledBy, approvedBy: s.approvedBy, rejectedBy: s.rejectedBy, lockedBy: s.lockedBy }))
        : [],
      settlementVarianceClassifications: hasSessions
        ? closedSessions
            .filter((s) => s.cashDifference)
            .map((s) => ({
              sessionId: s.id,
              cashierName: s.cashierName,
              cashDifference: rawNumber(s.cashDifference),
              classification: classifyDetailedRestaurantCashVariance({
                cashDifference: s.cashDifference,
                cashSales: s.cashSales,
                cashRefunds: s.cashRefunds,
                cashExpenses: s.cashExpenses,
                cashDeposits: s.cashDeposits,
              }),
            }))
        : [],
    }
  })()

  // ── Build return object ─────────────────────────────────────
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
    kotStatus: (() => {
      const prepTimes = kotOrders.map((o) => o.prepTime).filter((t) => t > 0)
      const avg = prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0
      return {
        total: kotOrders.length,
        pending: kotOrders.filter((o) => o.orderStatus === 'pending').length,
        preparing: kotOrders.filter((o) => o.orderStatus === 'preparing').length,
        ready: kotOrders.filter((o) => o.orderStatus === 'ready').length,
        served: kotOrders.filter((o) => o.orderStatus === 'served').length,
        averagePreparationTime: avg,
        fastestPrepTime: prepTimes.length ? Math.min(...prepTimes) : 0,
        slowestPrepTime: prepTimes.length ? Math.max(...prepTimes) : 0,
        kitchenUtilization: kotOrders.length && normalBilledOrders.length
          ? Math.round((kotOrders.length / normalBilledOrders.length) * 100) : 0,
      }
    })(),
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
    // ── Auto-aggregate from closed cash sessions ────────────────
    cashReconciliation,
    cashReceived,
    onlineReceived,
    cardReceived,
    digitalPayments,
    periodOrderOutstanding: outstandingAmount,
    storedCustomerCreditBalance: customerRows.reduce((sum, row) => sum + money(row.storedCustomerCreditBalance), 0),

    // ── Executive insights ──────────────────────────────────────
    averageCustomerSpend: customerRows.length > 0
      ? totalSales / customerRows.length
      : 0,
    mostUsedPaymentMethod: (() => {
      const counts = {}
      billedOrders.forEach((o) => {
        const m = o.paymentMethod || 'Unknown'
        counts[m] = (counts[m] || 0) + 1
      })
      let maxCount = 0
      let mode = 'N/A'
      Object.entries(counts).forEach(([method, count]) => {
        if (count > maxCount) { maxCount = count; mode = method }
      })
      return mode
    })(),
    peakSalesHour: (() => {
      const entries = Object.entries(ordersByHour || {})
      if (!entries.length) return { hour: 'N/A', orders: 0 }
      let maxOrders = 0
      let peakHour = 'N/A'
      entries.forEach(([hour, count]) => {
        if (count > maxOrders) { maxOrders = Number(count); peakHour = hour }
      })
      return { hour: `${String(peakHour).padStart(2, '0')}:00`, orders: maxOrders }
    })(),
    largestDiscount: discountRows.length > 0
      ? Math.max(...discountRows.map((o) => money(o.discount)))
      : 0,
    largestBill: billedOrders.length > 0
      ? Math.max(...billedOrders.map((o) => money(o.total)))
      : 0,
    bestSellingItem: (() => {
      const sorted = [...itemRows].sort((a, b) => b.quantity - a.quantity)
      return sorted.length > 0 ? sorted[0] : null
    })(),
    bestCategory: (() => {
      const cats = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue)
      return cats.length > 0 ? cats[0] : null
    })(),
    fastestSellingItem: (() => {
      const sorted = [...itemRows].sort((a, b) => b.quantity - a.quantity)
      return sorted.length > 0 ? sorted[0] : null
    })(),
    paymentMethodBreakdown: (() => {
      const total = collectedAmount || 1
      const breakdown = {}
      Object.entries(collectionsByPaymentMethod).forEach(([method, amount]) => {
        breakdown[method] = {
          amount: money(amount),
          percentage: (money(amount) / total) * 100,
        }
      })
      return breakdown
    })(),
    expenseSummary,
    expenseBreakdown,
    customerCount: customerRows.length,
    customerUnified,
    refundAnalysis,
    staffPerformance,
    paymentProgress,

    // ── Business Intelligence ─────────────────────────────────────
    businessIntelligence: computeBusinessIntelligence({
      billedOrders: { length: billedOrders.length },
      orders: { length: normalizedOrders.length },
      netSales,
      averageOrderValue: billedOrders.length ? netSales / billedOrders.length : 0,
      collectedAmount,
      outstandingAmount,
      approvedExpenses,
      netProfit,
      discounts,
      cashReceived,
      cancellations: { count: cancellationRows.length },
      cashReconciliation: {
        cashRefunds: cashReconciliation?.cashRefunds || 0,
        cashDifference: cashReconciliation?.cashDifference || 0,
        expectedCash: cashReconciliation?.expectedCash || 0,
        cashSales: cashReconciliation?.cashSales || 0,
      },
      customerPerformance: Array.from(customerMap.values()).map((c) => ({
        billedOrders: c.billedOrders,
        sales: c.sales,
        paid: c.paid,
      })),
    }),
  }
}
