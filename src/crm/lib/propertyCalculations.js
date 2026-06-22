// Property ERP — Maintenance & Contract calculations.
//
// Pure, side-effect-free helpers shared by the Property ERP hooks, pages, and
// the Property ERP dashboard section. Keeping the math in one place guarantees
// the table rows, stat cards, and dashboard tiles all agree.
import { normalizeCurrency, toNumber } from './calculations.js'

export { normalizeCurrency, toNumber }

export const MAINTENANCE_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const MAINTENANCE_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled']
export const MAINTENANCE_ASSIGNEE_TYPES = ['Staff', 'Vendor']

// Stored base status. The richer display status (Expiring Soon / Expired) is
// derived from the dates so it stays correct over time without a write.
export const CONTRACT_STATUSES = ['Draft', 'Active', 'Terminated']
export const CONTRACT_DISPLAY_STATUSES = ['Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated']
export const CONTRACT_LATE_FEE_TYPES = ['None', 'Flat', 'Percent']

export const EXPIRING_SOON_DAYS = 30
const DAY_MS = 86400000
const AVERAGE_DAYS_PER_MONTH = 30.4375

export function toDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date) {
  const next = new Date(date.getTime())
  next.setHours(0, 0, 0, 0)
  return next
}

function resolveNow(now) {
  return now instanceof Date ? now : now ? toDateValue(now) || new Date() : new Date()
}

function isCurrentMonth(value, now = new Date()) {
  const date = toDateValue(value)
  if (!date) return false
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

/* ----------------------------- Maintenance ----------------------------- */

export function maintenanceEstimatedCost(record = {}) {
  return Math.max(toNumber(record.estimatedCost ?? record.estimate, 0), 0)
}

export function maintenanceActualCost(record = {}) {
  return Math.max(toNumber(record.actualCost ?? record.cost, 0), 0)
}

export function maintenancePaidAmount(record = {}) {
  const paid = Math.max(toNumber(record.paidAmount, 0), 0)
  const actual = maintenanceActualCost(record)
  // Never report more paid than the actual cost once an actual cost exists.
  return actual > 0 ? Math.min(paid, actual) : paid
}

// balanceDue = actualCost - paidAmount (floored at 0)
export function maintenanceBalanceDue(record = {}) {
  return Math.max(maintenanceActualCost(record) - maintenancePaidAmount(record), 0)
}

export function isMaintenanceClosed(record = {}) {
  return ['completed', 'cancelled', 'canceled'].includes(
    String(record.status || '').trim().toLowerCase(),
  )
}

export function isMaintenanceOpen(record = {}) {
  return ['open', 'in progress', 'in_progress'].includes(
    String(record.status || 'open').trim().toLowerCase(),
  )
}

// overdue when the due date has passed and the request is not completed/cancelled.
export function isMaintenanceOverdue(record = {}, now = new Date()) {
  if (isMaintenanceClosed(record)) return false
  const due = toDateValue(record.dueDate)
  if (!due) return false
  return startOfDay(due).getTime() < startOfDay(resolveNow(now)).getTime()
}

export function maintenanceStats(records = [], now = new Date()) {
  const reference = resolveNow(now)
  const list = Array.isArray(records) ? records : []

  let estimatedTotal = 0
  let actualTotal = 0
  let paidTotal = 0
  let balanceTotal = 0
  let monthlyCost = 0
  let completed = 0
  let pending = 0
  let overdue = 0
  const byAssignee = new Map()

  for (const record of list) {
    const estimated = maintenanceEstimatedCost(record)
    const actual = maintenanceActualCost(record)
    const paid = maintenancePaidAmount(record)
    const balance = maintenanceBalanceDue(record)

    estimatedTotal += estimated
    actualTotal += actual
    paidTotal += paid
    balanceTotal += balance

    if (isMaintenanceClosed(record)) {
      if (!['cancelled', 'canceled'].includes(String(record.status || '').toLowerCase())) completed += 1
    } else {
      pending += 1
    }
    if (isMaintenanceOverdue(record, reference)) overdue += 1

    // Monthly maintenance cost total — spend recorded in the current month.
    if (isCurrentMonth(record.completionDate || record.createdAt, reference)) {
      monthlyCost += actual || estimated
    }

    // Vendor / staff cost tracking.
    const assignee = String(record.assignedTo || '').trim()
    if (assignee) {
      const current = byAssignee.get(assignee) || {
        assignee,
        assigneeType: record.assigneeType || 'Staff',
        actualCost: 0,
        paidAmount: 0,
        balanceDue: 0,
        jobs: 0,
      }
      current.actualCost += actual
      current.paidAmount += paid
      current.balanceDue += balance
      current.jobs += 1
      byAssignee.set(assignee, current)
    }
  }

  // pendingCost = outstanding balance on every request that is still open.
  const pendingCost = list
    .filter((record) => !isMaintenanceClosed(record))
    .reduce((sum, record) => sum + maintenanceBalanceDue(record), 0)

  return {
    total: list.length,
    estimatedTotal,
    actualTotal,
    paidTotal,
    balanceTotal,
    monthlyCost,
    pendingCost,
    completed,
    pending,
    overdue,
    byAssignee: Array.from(byAssignee.values()).sort((a, b) => b.actualCost - a.actualCost),
  }
}

/* ------------------------------ Contracts ------------------------------ */

// Whole-month duration between start and end, rounded to the nearest month.
export function contractDurationMonths(startDate, endDate) {
  const start = toDateValue(startDate)
  const end = toDateValue(endDate)
  if (!start || !end) return 0
  const diffDays = (end.getTime() - start.getTime()) / DAY_MS
  if (diffDays <= 0) return 0
  return Math.max(1, Math.round(diffDays / AVERAGE_DAYS_PER_MONTH))
}

export function contractMonthlyRent(contract = {}) {
  return Math.max(toNumber(contract.monthlyRent ?? contract.rent, 0), 0)
}

export function contractSecurityDeposit(contract = {}) {
  return Math.max(toNumber(contract.securityDeposit ?? contract.deposit, 0), 0)
}

export function contractAdvancePayment(contract = {}) {
  return Math.max(toNumber(contract.advancePayment ?? contract.advance, 0), 0)
}

// totalContractValue = monthlyRent * contractDurationMonths
export function contractTotalValue(contract = {}) {
  const months = contractDurationMonths(contract.startDate, contract.endDate)
  return contractMonthlyRent(contract) * months
}

// outstandingBalance — total rent value minus what has already been collected
// (advance payment + any recorded rent payments). Floored at 0.
export function contractOutstandingBalance(contract = {}) {
  const total = contractTotalValue(contract)
  const collected = contractAdvancePayment(contract) + Math.max(toNumber(contract.paidAmount, 0), 0)
  return Math.max(total - collected, 0)
}

// Signed day count to the end date — negative once the contract has expired.
export function daysUntilExpiry(endDate, now = new Date()) {
  const end = toDateValue(endDate)
  if (!end) return null
  return Math.ceil((startOfDay(end).getTime() - startOfDay(resolveNow(now)).getTime()) / DAY_MS)
}

export function isContractTerminated(contract = {}) {
  return String(contract.status || '').trim().toLowerCase() === 'terminated'
}

export function isContractDraft(contract = {}) {
  return String(contract.status || '').trim().toLowerCase() === 'draft'
}

export function isContractExpired(contract = {}, now = new Date()) {
  if (isContractTerminated(contract) || isContractDraft(contract)) return false
  const days = daysUntilExpiry(contract.endDate, now)
  return days !== null && days < 0
}

export function isContractExpiringSoon(contract = {}, now = new Date()) {
  if (isContractTerminated(contract) || isContractDraft(contract)) return false
  const days = daysUntilExpiry(contract.endDate, now)
  return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS
}

// Draft / Active / Expiring Soon / Expired / Terminated
export function contractDisplayStatus(contract = {}, now = new Date()) {
  if (isContractTerminated(contract)) return 'Terminated'
  if (isContractDraft(contract)) return 'Draft'
  if (isContractExpired(contract, now)) return 'Expired'
  if (isContractExpiringSoon(contract, now)) return 'Expiring Soon'
  return 'Active'
}

// An "active" contract for revenue purposes — currently running, not draft,
// terminated, or expired.
export function isContractActive(contract = {}, now = new Date()) {
  const status = contractDisplayStatus(contract, now)
  return status === 'Active' || status === 'Expiring Soon'
}

// lateFee — charged when rent for the current period is past the payment due day
// (plus any grace days) on a running contract.
export function contractLateFee(contract = {}, now = new Date()) {
  const type = String(contract.lateFeeType || 'None').trim().toLowerCase()
  if (type === 'none' || !type) return 0
  if (!isContractActive(contract, now)) return 0

  const dueDay = Math.min(Math.max(Math.floor(toNumber(contract.paymentDueDay, 0)), 0), 31)
  if (!dueDay) return 0
  const grace = Math.max(Math.floor(toNumber(contract.gracePeriodDays, 0)), 0)
  const reference = resolveNow(now)
  if (reference.getDate() <= dueDay + grace) return 0

  const value = Math.max(toNumber(contract.lateFeeValue, 0), 0)
  if (type === 'percent') return contractMonthlyRent(contract) * (value / 100)
  return value
}

// Renewal value for a proposed renewal term, optionally applying a rent increase.
export function contractRenewalValue({ monthlyRent = 0, durationMonths = 0, startDate, endDate, increasePercent = 0 } = {}) {
  const months = durationMonths || contractDurationMonths(startDate, endDate)
  const rent = Math.max(toNumber(monthlyRent, 0), 0)
  const increase = Math.max(toNumber(increasePercent, 0), 0)
  return rent * (1 + increase / 100) * months
}

export function contractStats(contracts = [], now = new Date()) {
  const reference = resolveNow(now)
  const list = Array.isArray(contracts) ? contracts : []

  let active = 0
  let expiringSoon = 0
  let expired = 0
  let terminated = 0
  let draft = 0
  let monthlyRentExpected = 0
  let totalContractValue = 0
  let outstandingTotal = 0
  let depositHeld = 0

  for (const contract of list) {
    const status = contractDisplayStatus(contract, reference)
    if (status === 'Active' || status === 'Expiring Soon') {
      active += 1
      monthlyRentExpected += contractMonthlyRent(contract)
      depositHeld += contractSecurityDeposit(contract)
      outstandingTotal += contractOutstandingBalance(contract)
    }
    if (status === 'Expiring Soon') expiringSoon += 1
    if (status === 'Expired') expired += 1
    if (status === 'Terminated') terminated += 1
    if (status === 'Draft') draft += 1
    totalContractValue += contractTotalValue(contract)
  }

  return {
    total: list.length,
    active,
    expiringSoon,
    expired,
    terminated,
    draft,
    monthlyRentExpected,
    totalContractValue,
    outstandingTotal,
    depositHeld,
  }
}
