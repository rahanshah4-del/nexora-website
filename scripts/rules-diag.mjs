/**
 * Firestore rules diagnostic — menuItems vs tables for cashier RAHS8C4-CSH-VQC7
 *
 * Seeds exact production-equivalent docs (workspace, user, permissions) then
 * tests every branch of the menuItems rule chain to isolate the failure point.
 *
 * Usage:
 *   node scripts/rules-diag.mjs
 * (emulator must already be running on EMULATOR_PORT)
 */

import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  collection, doc, getDoc, getDocs, query, orderBy,
  setDoc,
} from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Production identifiers ────────────────────────────────────────────────────
const WID          = 'iavDoFmCxCd0hbtEpb0D78zbKWo1'
const CASHIER_UID  = 'RAHS8C4-CSH-VQC7'
const OWNER_UID    = 'owner-prod-stub'
const EMULATOR_PORT = 8080

// ── Cashier's permission doc — exactly what's in prod (no menuManagement keys) ─
const CASHIER_PERMISSIONS = {
  'module.dashboard.view':    true,
  'module.orders.view':       true,
  'module.orders.create':     true,
  'module.orders.edit':       true,
  'module.ordersKot.view':    true,
  'module.ordersKot.create':  true,
  'module.ordersKot.edit':    true,
  'module.tables.view':       true,
  'module.tables.create':     true,
  'module.tables.edit':       true,
  'module.reservations.view': true,
  'module.reservations.create': true,
  'module.reservations.edit': true,
  // ← deliberately NO module.menuManagement.* keys
}

// ── Helpers ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0

async function check(label, expectSucceed, promise) {
  try {
    if (expectSucceed) {
      await assertSucceeds(promise)
      console.log(`  ✅ PASS  ${label}`)
      pass++
    } else {
      await assertFails(promise)
      console.log(`  ✅ PASS (correctly denied)  ${label}`)
      pass++
    }
  } catch (e) {
    const tag = expectSucceed ? 'UNEXPECTEDLY DENIED' : 'UNEXPECTEDLY ALLOWED'
    console.log(`  ❌ FAIL  ${label}`)
    console.log(`       → ${tag}: code=${e?.code} message=${e?.message?.slice(0,200)}`)
    fail++
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const rules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf-8')

const testEnv = await initializeTestEnvironment({
  projectId: 'nexora-business-suite',
  firestore: { rules, host: 'localhost', port: EMULATOR_PORT },
})

// ── Seed ──────────────────────────────────────────────────────────────────────
console.log('\n[seed] Writing workspace / user / permissions / collection docs...')
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()

  // Workspace doc (active, owner != cashier)
  await setDoc(doc(db, 'workspaces', WID), {
    ownerId: OWNER_UID, userId: OWNER_UID, createdBy: OWNER_UID,
    workspaceId: WID, status: 'active', accountStatus: 'active',
  })

  // VARIANT A: user doc with NO staffId → permissionDocId() falls back to request.auth.uid
  await setDoc(doc(db, 'users', CASHIER_UID), {
    uid: CASHIER_UID, workspaceId: WID, role: 'Cashier',
    status: 'active',
    // no staffId field
  })

  // Permission doc keyed by cashier uid (matching STAFF_ID in backfill script)
  await setDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID), CASHIER_PERMISSIONS)

  // One menuItems doc
  await setDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1'), {
    businessType: 'restaurant', name: 'Burger', status: 'Active',
    workspaceId: WID, createdBy: OWNER_UID, ownerId: WID,
  })

  // One tables doc
  await setDoc(doc(db, `workspaces/${WID}/tables`, 'table1'), {
    businessType: 'restaurant', name: 'T1', status: 'available',
    workspaceId: WID, createdBy: OWNER_UID, ownerId: WID,
  })
})
console.log('[seed] done\n')

// ── Auth contexts ─────────────────────────────────────────────────────────────
const cashierCtx = testEnv.authenticatedContext(CASHIER_UID, {
  email: 'cashier@example.com',
  email_verified: true,
})
const db = cashierCtx.firestore()

// ── Test suite ────────────────────────────────────────────────────────────────

console.log('='.repeat(60))
console.log('BLOCK 1 — BASELINE: tables should succeed (first OR branch passes)')
console.log('='.repeat(60))
await check(
  'tables collection orderBy(name) — expects SUCCESS',
  true,
  getDocs(query(collection(db, `workspaces/${WID}/tables`), orderBy('name'))),
)
await check(
  'tables single-doc get — expects SUCCESS',
  true,
  getDoc(doc(db, `workspaces/${WID}/tables`, 'table1')),
)

console.log('\n' + '='.repeat(60))
console.log('BLOCK 2 — menuItems: plain reads (no filters, just control query)')
console.log('='.repeat(60))
await check(
  'menuItems single-doc get item1 — expects SUCCESS (orders fallback)',
  true,
  getDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1')),
)
await check(
  'menuItems collection orderBy(name) only — expects SUCCESS',
  true,
  getDocs(query(collection(db, `workspaces/${WID}/menuItems`), orderBy('name'))),
)

console.log('\n' + '='.repeat(60))
console.log('BLOCK 3 — Seed VARIANT B: user doc WITH staffId == cashierUid (same doc, explicit)')
console.log('  (permissionDocId() returns staffId — should resolve to the same permission doc)')
console.log('='.repeat(60))
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'users', CASHIER_UID), {
    uid: CASHIER_UID, staffId: CASHIER_UID, workspaceId: WID,
    role: 'Cashier', status: 'active',
  })
})
await check(
  'menuItems single-doc get with staffId set — expects SUCCESS',
  true,
  getDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1')),
)

console.log('\n' + '='.repeat(60))
console.log('BLOCK 4 — Remove permission doc entirely: all reads should be denied')
console.log('  (sanity check that the permission doc lookup is the gating factor)')
console.log('='.repeat(60))
// Temporarily delete the permission doc
const { deleteDoc } = await import('firebase/firestore')
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await deleteDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID))
})
await check(
  'tables with no permission doc — expects DENY',
  false,
  getDoc(doc(db, `workspaces/${WID}/tables`, 'table1')),
)
await check(
  'menuItems with no permission doc — expects DENY',
  false,
  getDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1')),
)

// Restore permission doc
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID), CASHIER_PERMISSIONS)
})

console.log('\n' + '='.repeat(60))
console.log('BLOCK 5 — Add module.menuManagement.view=true: menuItems should still succeed')
console.log('  (verifies the rule works when the first branch passes)')
console.log('='.repeat(60))
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID), {
    ...CASHIER_PERMISSIONS,
    'module.menuManagement.view': true,
  })
})
await check(
  'menuItems with menuManagement.view=true — expects SUCCESS',
  true,
  getDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1')),
)

// Restore to no-menuManagement state
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID), CASHIER_PERMISSIONS)
})

console.log('\n' + '='.repeat(60))
console.log('BLOCK 6 — Remove ONLY orders.view: menuItems should now be denied')
console.log('  (verifies the orders fallback is the real grant path when menuManagement absent)')
console.log('='.repeat(60))
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  const { 'module.orders.view': _removed, ...rest } = CASHIER_PERMISSIONS
  await setDoc(doc(db, `workspaces/${WID}/permissions`, CASHIER_UID), rest)
})
await check(
  'menuItems with orders.view removed — expects DENY',
  false,
  getDoc(doc(db, `workspaces/${WID}/menuItems`, 'item1')),
)
await check(
  'tables with orders.view removed — still expects SUCCESS (tables.view still present)',
  true,
  getDoc(doc(db, `workspaces/${WID}/tables`, 'table1')),
)

// ── Summary ───────────────────────────────────────────────────────────────────
await testEnv.cleanup()

console.log('\n' + '='.repeat(60))
console.log(`RESULTS: ${pass} passed, ${fail} failed`)
console.log('='.repeat(60))
if (fail > 0) process.exit(1)
