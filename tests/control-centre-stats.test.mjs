import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FULL_LOAD_MAX,
  cappedCountLabel,
  collectPages,
  isActiveWorkspace,
  isBlockedWorkspace,
  isExpired,
  mergeRecordsById,
  pendingUpgradeCount,
  revenueKpis,
  todayLoginCount,
  workspaceKpis,
} from '../src/pages/admin/controlCentreStats.js'
import { buildModuleBreakdown, storedBusinessType } from '../src/pages/admin/controlCentreModules.js'

const NOW = new Date('2026-09-25T12:00:00Z')
const PAST = '2026-01-01T00:00:00Z'
const FUTURE = '2027-01-01T00:00:00Z'

// 450 workspaces in known buckets (more than the old 180-record live cap).
function mockWorkspaces() {
  const rows = []
  const add = (count, make) => {
    for (let index = 0; index < count; index += 1) rows.push({ id: `ws-${rows.length}`, ...make(index) })
  }
  add(150, () => ({ businessType: 'PharmaFlow', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE }))
  add(50, () => ({ businessType: 'Medical Store POS', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE }))
  add(100, () => ({ businessType: 'General CRM', subscriptionStatus: 'trial', isTrialActive: true, trialEndsAt: FUTURE }))
  add(60, () => ({ businessType: 'Restaurant POS', subscriptionStatus: 'trial', trialEndsAt: PAST }))
  add(40, () => ({ businessType: 'School ERP', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE, status: 'blocked' }))
  add(30, () => ({ businessType: 'Retail / POS', subscriptionStatus: 'active' }))
  add(20, () => ({ subscriptionStatus: 'Free Trial', accountStatus: 'blocked' }))
  return rows
}

test('KPIs on 450 workspaces equal the expected counts', () => {
  const rows = mockWorkspaces()
  assert.equal(rows.length, 450)
  assert.deepEqual(workspaceKpis(rows, NOW), {
    total: 450,
    // 150 + 50 active pharmacy + 100 live trials; blocked-by-status (40),
    // expired trials (60), missing-expiry paid (30) and blocked-by-accountStatus
    // (20) are excluded.
    active: 150 + 50 + 100,
    trial: 100 + 60 + 20,
    expired: 60 + 30,
    blocked: 40 + 20,
  })
})

test('the old first-180 view gave different totals (why paging matters)', () => {
  const rows = mockWorkspaces()
  assert.notDeepEqual(workspaceKpis(rows.slice(0, 180), NOW), workspaceKpis(rows, NOW))
})

test('module breakdown on the full list', () => {
  const rows = buildModuleBreakdown(mockWorkspaces().map(storedBusinessType))
  const byName = Object.fromEntries(rows.map((row) => [row.name, row.value]))
  assert.equal(byName.PharmaFlow, 200)
  assert.equal(byName['Nexora Sales Hub'], 100)
  assert.equal(byName['Restaurant POS'], 60)
  assert.equal(byName['School ERP'], 40)
  assert.equal(byName['Retail / POS'], 30)
  assert.equal(byName.Unrecognised, 20)
  assert.equal(rows.reduce((sum, row) => sum + row.value, 0), 450)
})

test('isExpired is safe to pass to Array#filter', () => {
  const rows = [{ trialEndsAt: PAST }, { trialEndsAt: '2999-01-01' }, { subscriptionStatus: 'expired' }]
  assert.equal(rows.filter(isExpired).length, 2)
})

test('todayLoginCount counts only logins on the current day', () => {
  const users = [
    { lastLoginAt: NOW.toISOString() },
    { lastLoginAt: new Date(NOW.getTime() - 2 * 86400000).toISOString() },
    {},
  ]
  assert.equal(todayLoginCount(users, NOW), 1)
})

function fakeCollection(total) {
  const docs = Array.from({ length: total }, (_, index) => ({ id: `doc-${String(index).padStart(5, '0')}` }))
  let reads = 0
  const fetchPage = async (cursor, size) => {
    const start = cursor ? docs.findIndex((doc) => doc.id === cursor.id) + 1 : 0
    const rows = docs.slice(start, start + size)
    reads += rows.length
    return { rows, cursor: rows[rows.length - 1] || null }
  }
  return { fetchPage, reads: () => reads }
}

test('collectPages reads everything below the cap, page by page', async () => {
  const source = fakeCollection(1234)
  const progress = []
  const result = await collectPages(source.fetchPage, { pageSize: 300, max: FULL_LOAD_MAX, onPage: (count) => progress.push(count) })
  assert.equal(result.rows.length, 1234)
  assert.equal(result.capped, false)
  assert.deepEqual(progress, [300, 600, 900, 1200, 1234])
  assert.equal(new Set(result.rows.map((row) => row.id)).size, 1234)
})

test('collectPages flags the cap when a collection exceeds it', async () => {
  const over = await collectPages(fakeCollection(5200).fetchPage, { pageSize: 300, max: 5000 })
  assert.equal(over.rows.length, 5000)
  assert.equal(over.capped, true)
  const exact = await collectPages(fakeCollection(5000).fetchPage, { pageSize: 300, max: 5000 })
  assert.equal(exact.rows.length, 5000)
  assert.equal(exact.capped, false)
  const empty = await collectPages(fakeCollection(0).fetchPage, { pageSize: 300, max: 5000 })
  assert.deepEqual([empty.rows.length, empty.capped], [0, false])
})

test('collectPages stops when cancelled', async () => {
  let cancelled = false
  const result = await collectPages(fakeCollection(1000).fetchPage, { pageSize: 300, onPage: () => { cancelled = true }, isCancelled: () => cancelled })
  assert.equal(result.cancelled, true)
})

test('mergeRecordsById: live rows override paged rows; live-only rows appended', () => {
  const paged = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }]
  const live = [{ id: 'b', v: 2 }, { id: 'c', v: 2 }]
  assert.deepEqual(mergeRecordsById(paged, live), [{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'c', v: 2 }])
  assert.equal(mergeRecordsById(null, live), live)
})

test('blocked by accountStatus (or status) is never Active; Blocked uses the same rule', () => {
  const byAccount = { status: 'active', accountStatus: 'blocked', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE }
  const byStatus = { status: 'Blocked', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE }
  const ok = { status: 'active', accountStatus: 'active', subscriptionStatus: 'active', subscriptionExpiresAt: FUTURE, nextBillingDate: FUTURE }
  assert.equal(isActiveWorkspace(byAccount, NOW), false)
  assert.equal(isActiveWorkspace(byStatus, NOW), false)
  assert.equal(isActiveWorkspace(ok, NOW), true)
  assert.equal(isBlockedWorkspace(byAccount), true)
  assert.equal(isBlockedWorkspace(byStatus), true)
  assert.equal(isBlockedWorkspace(ok), false)
  // Before/after on the 450 mock workspaces: the 20 accountStatus-blocked
  // workspaces moved out of Active (320 -> 300); Blocked stays 60.
  const kpis = workspaceKpis(mockWorkspaces(), NOW)
  assert.equal(kpis.active, 300)
  assert.equal(kpis.blocked, 60)
})

// 250 payments over two months with mixed statuses and currencies.
function mockPayments() {
  const rows = []
  const add = (count, make) => {
    for (let index = 0; index < count; index += 1) rows.push({ id: `pay-${rows.length}`, ...make(index) })
  }
  add(100, () => ({ status: 'paid', paymentStatus: 'paid', amount: 1000, currency: 'PKR', paymentDate: '2026-09-10T10:00:00Z' })) // this month
  add(60, () => ({ paymentStatus: 'Approved', amount: '3000', currency: 'pkr', approvedAt: '2026-08-20T10:00:00Z' })) // last month, string amount
  add(40, () => ({ status: 'pending', amount: 5000, currency: 'PKR', paymentDate: '2026-09-11T10:00:00Z' })) // not paid
  add(30, () => ({ status: 'rejected', amount: 5000, currency: 'PKR', paymentDate: '2026-09-11T10:00:00Z' })) // not paid
  add(15, () => ({ status: 'paid', amount: 20, currency: 'USD', paymentDate: '2026-09-12T10:00:00Z' })) // other currency
  add(5, () => ({ status: 'paid', amount: 500, paymentDate: '2026-09-13T10:00:00Z' })) // no currency -> PKR
  return rows
}

test('revenue on 250 mock payments: paid only, month split, currencies kept apart', () => {
  const payments = mockPayments()
  assert.equal(payments.length, 250)
  const upgradeRequests = [
    { id: 'pay-0', status: 'approved', amount: 999999 }, // already materialised as payment pay-0
    { id: 'req-x', approvalStatus: 'approved', amount: 2000, currency: 'PKR', approvedAt: '2026-09-15T10:00:00Z' }, // fallback
    { id: 'req-y', status: 'pending', amount: 7000 }, // not paid
  ]
  const revenue = revenueKpis(payments, upgradeRequests, NOW, 'PKR')
  assert.equal(revenue.primary.total, 100 * 1000 + 60 * 3000 + 5 * 500 + 2000)
  assert.equal(revenue.primary.monthly, 100 * 1000 + 5 * 500 + 2000)
  assert.deepEqual(revenue.others.map((bucket) => [bucket.currency, bucket.monthly, bucket.total]), [['USD', 300, 300]])
})

test('revenue matches the previous logic for single-currency data', () => {
  const payments = mockPayments().filter((row) => row.currency !== 'USD')
  const revenue = revenueKpis(payments, [], NOW, 'PKR')
  // Previous logic: sum amountValue over isPaid rows (no currency split).
  const previousTotal = payments
    .filter((row) => ['paid', 'approved', 'active', 'completed'].includes(String(row.paymentStatus || row.approvalStatus || row.status || row.planStatus || 'unknown').trim().toLowerCase()))
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  assert.equal(revenue.primary.total, previousTotal)
})

test('pending upgrade count is exact beyond the 80-record listener', () => {
  const requests = [
    ...Array.from({ length: 130 }, (_, index) => ({ id: `p${index}`, approvalStatus: 'Pending' })),
    ...Array.from({ length: 20 }, (_, index) => ({ id: `s${index}`, status: 'pending' })),
    ...Array.from({ length: 50 }, (_, index) => ({ id: `a${index}`, approvalStatus: 'approved', status: 'pending' })),
  ]
  assert.equal(pendingUpgradeCount(requests), 150)
  assert.equal(pendingUpgradeCount(requests.slice(0, 80)), 80)
})

test('cappedCountLabel shows 80+ only when the listener hit its limit', () => {
  assert.equal(cappedCountLabel(80, true), '80+')
  assert.equal(cappedCountLabel(12, true), '12+')
  assert.equal(cappedCountLabel(12, false), 12)
})
