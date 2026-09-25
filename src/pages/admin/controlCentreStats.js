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

export function isBlockedWorkspace(row = {}) {
  return statusValue(row.status || row.accountStatus) === 'blocked'
}

// "Active" keeps its existing definition: not expired, and status /
// subscriptionStatus is not 'blocked' (note: it does not look at accountStatus,
// unlike isBlockedWorkspace).
export function isActiveWorkspace(row = {}, now = new Date()) {
  return !isExpiredAt(row, now) && statusValue(row.status || row.subscriptionStatus) !== 'blocked'
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
