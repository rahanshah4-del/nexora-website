export function safeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function moneyRound(value) {
  return Math.round(safeNumber(value) * 100) / 100
}

export function clampPercent(value) {
  return Math.min(100, Math.max(0, safeNumber(value)))
}

export function dealAmount(deal = {}) {
  return Math.max(0, safeNumber(deal.value ?? deal.amount ?? deal.dealValueUsd ?? deal.dealValue ?? deal.total))
}

export function dealProbability(deal = {}) {
  if (String(deal.stage || '').toLowerCase() === 'won') return 100
  if (String(deal.stage || '').toLowerCase() === 'lost') return 0
  return clampPercent(deal.probability ?? deal.winProbability)
}

export function calculateDealMetrics(deals = []) {
  const rows = Array.isArray(deals) ? deals : []
  const openDeals = rows.filter((deal) => !['won', 'lost'].includes(String(deal.stage || deal.status || '').toLowerCase()))
  const wonDeals = rows.filter((deal) => String(deal.stage || deal.status || '').toLowerCase() === 'won')
  const lostDeals = rows.filter((deal) => String(deal.stage || deal.status || '').toLowerCase() === 'lost')
  const openValue = moneyRound(openDeals.reduce((sum, deal) => sum + dealAmount(deal), 0))
  const wonValue = moneyRound(wonDeals.reduce((sum, deal) => sum + dealAmount(deal), 0))
  const lostValue = moneyRound(lostDeals.reduce((sum, deal) => sum + dealAmount(deal), 0))
  const expectedRevenue = moneyRound(rows.reduce((sum, deal) => sum + (dealAmount(deal) * dealProbability(deal)) / 100, 0))
  const averageDealValue = rows.length ? moneyRound(rows.reduce((sum, deal) => sum + dealAmount(deal), 0) / rows.length) : 0
  return {
    totalDeals: rows.length,
    openDeals: openDeals.length,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    expectedRevenue,
    openValue,
    wonValue,
    lostValue,
    forecastRevenue: expectedRevenue,
    averageDealValue,
  }
}

export function calculatePipelineMetrics(deals = []) {
  const rows = Array.isArray(deals) ? deals : []
  const pipelineValue = moneyRound(rows.filter((deal) => String(deal.stage || '').toLowerCase() !== 'lost').reduce((sum, deal) => sum + dealAmount(deal), 0))
  const weightedPipeline = moneyRound(rows.reduce((sum, deal) => sum + (dealAmount(deal) * dealProbability(deal)) / 100, 0))
  const wonValue = moneyRound(rows.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').reduce((sum, deal) => sum + dealAmount(deal), 0))
  const lostValue = moneyRound(rows.filter((deal) => String(deal.stage || '').toLowerCase() === 'lost').reduce((sum, deal) => sum + dealAmount(deal), 0))
  const averageDealValue = rows.length ? moneyRound(rows.reduce((sum, deal) => sum + dealAmount(deal), 0) / rows.length) : 0
  const closed = rows.filter((deal) => ['won', 'lost'].includes(String(deal.stage || '').toLowerCase())).length
  const conversionRate = closed ? moneyRound((rows.filter((deal) => String(deal.stage || '').toLowerCase() === 'won').length / closed) * 100) : 0
  return { pipelineValue, weightedPipeline, wonValue, lostValue, averageDealValue, conversionRate }
}

export function calculateQuoteTotals(items = [], discountPercent = 0, taxPercent = 0) {
  const subtotal = moneyRound((Array.isArray(items) ? items : []).reduce((sum, item) => {
    return sum + Math.max(0, safeNumber(item.qty ?? item.quantity)) * Math.max(0, safeNumber(item.unitPrice ?? item.price))
  }, 0))
  const discountRate = clampPercent(discountPercent)
  const taxRate = clampPercent(taxPercent)
  const discountTotal = moneyRound((subtotal * discountRate) / 100)
  const taxable = Math.max(0, subtotal - discountTotal)
  const taxTotal = moneyRound((taxable * taxRate) / 100)
  const grandTotal = moneyRound(Math.max(0, taxable + taxTotal))
  return { subtotal, discountRate, discountTotal, taxRate, taxTotal, grandTotal }
}

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function calculateTaskMetrics(tasks = []) {
  const rows = Array.isArray(tasks) ? tasks : []
  const now = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const completed = rows.filter((task) => String(task.status || '').toLowerCase() === 'completed')
  const overdue = rows.filter((task) => {
    const due = toDate(task.dueDate)
    return due && due < now && String(task.status || '').toLowerCase() !== 'completed'
  })
  const today = rows.filter((task) => {
    const due = toDate(task.dueDate)
    return due && due >= start && due <= end && String(task.status || '').toLowerCase() !== 'completed'
  })
  const upcoming = rows.filter((task) => {
    const due = toDate(task.dueDate)
    return due && due > end && String(task.status || '').toLowerCase() !== 'completed'
  })
  const workloadMap = new Map()
  rows.forEach((task) => {
    const owner = String(task.owner || task.assignedTo || task.assignee || 'Unassigned').trim() || 'Unassigned'
    workloadMap.set(owner, (workloadMap.get(owner) || 0) + 1)
  })
  return {
    totalTasks: rows.length,
    todayTasks: today.length,
    upcomingTasks: upcoming.length,
    overdueTasks: overdue.length,
    completedTasks: completed.length,
    completionRate: rows.length ? moneyRound((completed.length / rows.length) * 100) : 0,
    overdueRate: rows.length ? moneyRound((overdue.length / rows.length) * 100) : 0,
    agentWorkload: Array.from(workloadMap.entries()).map(([owner, count]) => ({ owner, count })),
  }
}

export function calculateProductMetrics(products = []) {
  const rows = Array.isArray(products) ? products : []
  const active = rows.filter((product) => String(product.status || 'active').toLowerCase() !== 'archived')
  const revenue = active.reduce((sum, product) => sum + Math.max(0, safeNumber(product.unitPrice ?? product.price)), 0)
  const cost = active.reduce((sum, product) => sum + Math.max(0, safeNumber(product.costPrice)), 0)
  const grossMargin = moneyRound(Math.max(0, revenue - cost))
  const averagePrice = active.length ? moneyRound(revenue / active.length) : 0
  return {
    totalProducts: active.length,
    grossMargin,
    marginPercent: revenue ? moneyRound((grossMargin / revenue) * 100) : 0,
    averagePrice,
  }
}
