#!/usr/bin/env node
/**
 * Backfill cashier reservations permissions for a single existing staff doc.
 *
 * USAGE (choose one):
 *
 *   Option A – with a service-account key file:
 *     GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/backfill-cashier-reservations.mjs
 *
 *   Option B – from the Firebase Console:
 *     1. Go to Firestore Database → workspaces → iavDoFmCxCd0hbtEpb0D78zbKWo1 → permissions
 *     2. Click the doc RAHS8C4-CSH-VQC7
 *     3. Add these three boolean fields (all true):
 *          module.reservations.view   = true
 *          module.reservations.create = true
 *          module.reservations.edit   = true
 *     4. Click Update / Save
 *
 *   Option C – run this script with a Service Account key:
 *     node scripts/backfill-cashier-reservations.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ────────────────────────────────────────────────────────────────────────────
// CONFIG – add more entries here if other cashiers need backfill
// ────────────────────────────────────────────────────────────────────────────

const WORKSPACE_ID = 'iavDoFmCxCd0hbtEpb0D78zbKWo1'
const STAFF_ID = 'RAHS8C4-CSH-VQC7'

const REQUIRED_FIELDS = {
  'module.reservations.view': true,
  'module.reservations.create': true,
  'module.reservations.edit': true,
}

// ────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP
// ────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function loadServiceAccount() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resolve(projectRoot, 'serviceAccount.json'),
    resolve(projectRoot, 'service-account.json'),
    resolve(projectRoot, 'firebase-service-account.json'),
    resolve(projectRoot, 'functions', 'serviceAccount.json'),
  ].filter(Boolean)

  for (const c of candidates) {
    if (existsSync(c)) {
      console.log(`🔑 Using service account: ${c}`)
      return JSON.parse(readFileSync(c, 'utf-8'))
    }
  }
  return null
}

function initFirebase() {
  if (getApps().length) return
  const sa = loadServiceAccount()
  if (sa) {
    initializeApp({ credential: cert(sa) })
  } else {
    console.log('⚠️  No service-account file found.')
    console.log('   Set GOOGLE_APPLICATION_CREDENTIALS, or place serviceAccount.json in the project root.')
    initializeApp() // try ADC
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  initFirebase()
  const db = getFirestore()

  const docRef = db
    .collection('workspaces')
    .doc(WORKSPACE_ID)
    .collection('permissions')
    .doc(STAFF_ID)

  console.log(`\n📄 Target: workspaces/${WORKSPACE_ID}/permissions/${STAFF_ID}`)

  const snap = await docRef.get()
  if (!snap.exists) {
    console.error('❌ Document not found!')
    process.exit(1)
  }

  const existing = snap.data() || {}
  const missing = Object.entries(REQUIRED_FIELDS).filter(([k, v]) => existing[k] !== v)
  const already = Object.entries(REQUIRED_FIELDS).filter(([k, v]) => existing[k] === v)

  if (missing.length === 0) {
    console.log('✅ All reservation permissions already set:')
    for (const [k] of already) console.log(`   ${k}: true`)
    return
  }

  const patch = Object.fromEntries(missing)
  await docRef.set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

  for (const [k, v] of missing) console.log(`   + ${k}: ${v}`)
  for (const [k] of already) console.log(`   ✓ ${k}: true (already set)`)
  console.log('\n✅ Backfill complete.')
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
