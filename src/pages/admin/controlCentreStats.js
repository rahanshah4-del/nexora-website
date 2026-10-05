/**
 * Control Centre KPI logic and full-list paging (pure: no Firebase/React),
 * shared by ControlCentre.jsx and tests/control-centre-stats.test.mjs.
 *
 * The workspace predicates below were moved here unchanged from
 * ControlCentre.jsx so the dashboard KPIs can be tested on large lists.
 */

import { isTrialActive, trialEndDate } from '../../crm/data/moduleAccess.js'
import { workspaceBlockedForAccess, workspacePaidSubscriptionActive } from '../../crm/lib/workspaceAccessRules.js'

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

// ---- Workspace access buckets -------------------------------------------
// The admin classifies a workspace with the SAME rules the client app uses to
// grant or lock access (src/crm/lib/workspaceAccessRules.js, moduleAccess.js),
// so "Trial" in the Control Centre means the client really is on a live trial.
// Buckets are exclusive, checked in this order:
//   blocked  -> status/accountStatus blocked or inactive (client: locked out)
//   paid     -> paid status with future subscriptionExpiresAt + nextBillingDate
//   trial    -> trial plan (Free/Basic) whose trial end date is still ahead
//   expired  -> everything else: the client sees the expired / upgrade screen
export const WORKSPACE_BUCKET_LABELS = Object.freeze({
  blocked: 'Blocked',
  paid: 'Paid active',
  trial: 'Trial active',
  expired: 'Expired',
})

export function workspaceBucket(row = {}) {
  if (workspaceBlockedForAccess(row)) return 'blocked'
  if (workspacePaidSubscriptionActive(row)) return 'paid'
  if (isTrialActive(row)) return 'trial'
  return 'expired'
}

/** Trial end the client app uses: trialEndsAt, else start/createdAt + 30 days. */
export function workspaceTrialEnd(row = {}) {
  return trialEndDate(row)
}

export function isTrial(row = {}) {
  return workspaceBucket(row) === 'trial'
}

export function isPaidActive(row = {}) {
  return workspaceBucket(row) === 'paid'
}

// `now` is kept for call-site compatibility; the shared rules read the clock.
export function isExpiredAt(row = {}) {
  return workspaceBucket(row) === 'expired'
}

// Single-argument form, safe to pass straight to Array#filter.
export function isExpired(row = {}) {
  return isExpiredAt(row)
}

/** Blocked exactly as the client decides it (status blocked/inactive or accountStatus blocked). */
export function isBlockedWorkspace(row = {}) {
  return workspaceBucket(row) === 'blocked'
}

/** Active = the client currently has access: paid active or trial active. */
export function isActiveWorkspace(row = {}) {
  const bucket = workspaceBucket(row)
  return bucket === 'paid' || bucket === 'trial'
}

/** Workspace KPIs shared by the dashboard and the Clients tab (buckets never overlap). */
export function workspaceKpis(workspaces = []) {
  const counts = { total: workspaces.length, active: 0, paid: 0, trial: 0, expired: 0, blocked: 0 }
  workspaces.forEach((row) => {
    const bucket = workspaceBucket(row)
    counts[bucket] += 1
    if (bucket === 'paid' || bucket === 'trial') counts.active += 1
  })
  return counts
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

export function revenueDate(row = {}) {
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

/** Local-date key (YYYY-MM-DD in the browser's time zone, not UTC). */
export function localDayKey(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Daily revenue for the last `days` days in one currency (same rows as revenueKpis). */
export function revenueTrendDays(payments = [], upgradeRequests = [], { days = 14, now = new Date(), currency = DEFAULT_REVENUE_CURRENCY } = {}) {
  const out = Array.from({ length: days }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - 1 - index))
    return { key: localDayKey(date), label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0 }
  })
  const byKey = new Map(out.map((day) => [day.key, day]))
  revenueRows(payments, upgradeRequests).forEach((row) => {
    if (revenueCurrency(row, currency) !== currency) return
    const day = byKey.get(localDayKey(revenueDate(row)))
    if (day) day.revenue += amountValue(row)
  })
  return out
}

/** Pending upgrade requests (approvalStatus, else status, is 'pending'). */
export function pendingUpgradeCount(upgradeRequests = []) {
  return upgradeRequests.filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending').length
}

/** "80+" when a listener hit its limit, so a capped count is not shown as exact. */
export function cappedCountLabel(count, capped) {
  return capped ? `${count}+` : count
}
