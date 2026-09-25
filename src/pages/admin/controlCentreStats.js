/**
 * Control Centre KPI logic and full-list paging (pure: no Firebase/React),
 * shared by ControlCentre.jsx and tests/control-centre-stats.test.mjs.
 *
 * The workspace predicates below were moved here unchanged from
 * ControlCentre.jsx so the dashboard KPIs can be tested on large lists.
 */

export const FULL_LOAD_PAGE_SIZE = 300
export const FULL_LOAD_MAX = 5000

export const paidSubscriptionStatuses = ['active', 'paid', 'approved', 'current']

export function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function statusValue(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

export function isPaidSubscriptionStatus(row = {}) {
  return paidSubscriptionStatuses.includes(statusValue(row.subscriptionStatus || row.planStatus))
}

export function hasMissingPaidSubscriptionExpiry(row = {}) {
  return isPaidSubscriptionStatus(row) && (!toDate(row.subscriptionExpiresAt) || !toDate(row.nextBillingDate))
}

export function isTrial(row = {}) {
  return row.isTrialActive === true || ['trial', 'free_trial'].includes(statusValue(row.subscriptionStatus || row.planStatus))
}

export function isExpiredAt(row = {}, now = new Date()) {
  if (hasMissingPaidSubscriptionExpiry(row)) return true
  const status = statusValue(row.subscriptionStatus || row.planStatus || row.status)
  const trialEndsAt = toDate(row.trialEndsAt)
  const expiresAt = toDate(row.subscriptionExpiresAt || row.expiresAt)
  return ['expired', 'cancelled', 'canceled', 'inactive'].includes(status) || (trialEndsAt && trialEndsAt < now) || (expiresAt && expiresAt < now)
}

// Single-argument form, safe to pass straight to Array#filter.
export function isExpired(row = {}) {
  return isExpiredAt(row, new Date())
}

/** Blocked when status OR accountStatus is 'blocked'. */
export function isBlockedWorkspace(row = {}) {
  return statusValue(row.status, '') === 'blocked' || statusValue(row.accountStatus, '') === 'blocked'
}

/** Active: not expired and not blocked (status, accountStatus, or subscriptionStatus when status is empty). */
export function isActiveWorkspace(row = {}, now = new Date()) {
  return !isExpiredAt(row, now) && !isBlockedWorkspace(row) && statusValue(row.status || row.subscriptionStatus) !== 'blocked'
}

/** Workspace KPIs shared by the dashboard and the Clients tab. */
export function workspaceKpis(workspaces = [], now = new Date()) {
  return {
    total: workspaces.length,
    active: workspaces.filter((row) => isActiveWorkspace(row, now)).length,
    trial: workspaces.filter(isTrial).length,
    expired: workspaces.filter((row) => isExpiredAt(row, now)).length,
    blocked: workspaces.filter(isBlockedWorkspace).length,
  }
}

/** Users whose lastLoginAt falls on `now`'s calendar day (local time). */
export function todayLoginCount(users = [], now = new Date()) {
  return users.filter((row) => {
    const date = toDate(row.lastLoginAt)
    return date && date.toDateString() === now.toDateString()
  }).length
}

/**
 * Full list = every paged row, with the live (real-time) rows overriding by
 * document id and live-only rows (e.g. created after paging) appended.
 */
export function mergeRecordsById(pagedRows, liveRows = []) {
  if (!Array.isArray(pagedRows)) return liveRows
  const live = new Map(liveRows.map((row) => [row.id, row]))
  const merged = pagedRows.map((row) => live.get(row.id) || row)
  const seen = new Set(pagedRows.map((row) => row.id))
  liveRows.forEach((row) => {
    if (!seen.has(row.id)) merged.push(row)
  })
  return merged
}

/**
 * Page through a collection. `fetchPage(cursor, pageSize)` returns
 * { rows, cursor } (cursor = last document, null when there is none).
 * Stops when a page is short, or at `max` rows (`capped: true`).
 */
export async function collectPages(fetchPage, { pageSize = FULL_LOAD_PAGE_SIZE, max = FULL_LOAD_MAX, onPage, isCancelled } = {}) {
  const rows = []
  let cursor = null
  for (;;) {
    const remaining = max - rows.length
    // Ask for one extra row at the cap so a collection of exactly `max` rows is not reported as capped.
    const size = Math.min(pageSize, remaining + 1)
    const page = await fetchPage(cursor, size)
    if (isCancelled?.()) return { rows, capped: false, cancelled: true }
    const pageRows = page?.rows || []
    rows.push(...pageRows.slice(0, remaining))
    onPage?.(rows.length)
    if (pageRows.length > remaining) return { rows, capped: true, cancelled: false }
    if (pageRows.length < size || !page?.cursor) return { rows, capped: false, cancelled: false }
    cursor = page.cursor
  }
}

// ---- Revenue / upgrades / presence ------------------------------------

export const DEFAULT_REVENUE_CURRENCY = 'PKR'

export function isPaid(row = {}) {
  return ['paid', 'approved', 'active', 'completed'].includes(statusValue(row?.paymentStatus || row?.approvalStatus || row?.status || row?.planStatus))
}

export function amountValue(row = {}) {
  return Number(row.amount ?? row.amountPaid ?? row.price ?? row.total ?? 0) || 0
}

export function revenueCurrency(row = {}, fallback = DEFAULT_REVENUE_CURRENCY) {
  return String(row.currency || row.billingCurrency || fallback).trim().toUpperCase() || fallback
}

function revenueDate(row = {}) {
  return toDate(row.paymentDate || row.paidAt || row.approvedAt || row.createdAt)
}

/**
 * Revenue rows: paid platformPayments, plus paid upgrade requests that have no
 * materialised platformPayments doc yet (matched by id / sourceId).
 */
export function revenueRows(payments = [], upgradeRequests = []) {
  const paidPayments = payments.filter(isPaid)
  const materializedUpgradeIds = new Set(
    paidPayments.flatMap((row) => [row.id, row.sourceId].filter(Boolean).map(String)),
  )
  const approvedUpgradeFallbacks = upgradeRequests.filter((row) => isPaid(row) && !materializedUpgradeIds.has(String(row.id)))
  return [...paidPayments, ...approvedUpgradeFallbacks]
}

/**
 * Monthly (calendar month of `now`, local time) and total revenue, kept
 * separate per currency — amounts in different currencies are never summed.
 */
export function revenueKpis(payments = [], upgradeRequests = [], now = new Date(), fallbackCurrency = DEFAULT_REVENUE_CURRENCY) {
  const byCurrency = {}
  revenueRows(payments, upgradeRequests).forEach((row) => {
    const currency = revenueCurrency(row, fallbackCurrency)
    const bucket = byCurrency[currency] || (byCurrency[currency] = { currency, monthly: 0, total: 0, count: 0 })
    const amount = amountValue(row)
    bucket.total += amount
    bucket.count += 1
    const date = revenueDate(row)
    if (date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) bucket.monthly += amount
  })
  const primary = byCurrency[fallbackCurrency] || { currency: fallbackCurrency, monthly: 0, total: 0, count: 0 }
  const others = Object.values(byCurrency).filter((bucket) => bucket.currency !== fallbackCurrency)
  return { primary, others, byCurrency }
}

/** Pending upgrade requests (approvalStatus, else status, is 'pending'). */
export function pendingUpgradeCount(upgradeRequests = []) {
  return upgradeRequests.filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending').length
}

/** "80+" when a listener hit its limit, so a capped count is not shown as exact. */
export function cappedCountLabel(count, capped) {
  return capped ? `${count}+` : count
}
