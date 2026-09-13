#!/usr/bin/env node
/**
 * branchId backfill — DRY RUN. Reports only; writes nothing, ever.
 *
 * Scans the Medical/Pharmacy module's 10 branch-scoped collections across all
 * tenants and reports exactly what a real backfill would change.
 *
 * READ-ONLY INVARIANT: this file contains no .set(), .update(), .commit(),
 * .delete() or .create() call against Firestore, and deliberately does not
 * import FieldValue, so it cannot write even a timestamp. The only Firestore
 * methods used are .get(), .getAll() and query builders.
 *
 * USAGE (Google Cloud Shell, project nexora-business-suite):
 *
 *   npm i firebase-admin
 *   gcloud config set project nexora-business-suite
 *   node scripts/branchid-backfill-dryrun.mjs
 *
 * Or with an explicit service-account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/branchid-backfill-dryrun.mjs
 *
 * FLAGS
 *   --out=<dir>              output directory (default ./branchid-dryrun)
 *   --collections=a,b        limit to these collections (default: all 10)
 *   --page-size=<n>          documents per page (default 500)
 *   --max-docs=<n>           stop after N docs per collection (smoke test)
 *   --fresh                  ignore any existing checkpoint and restart
 *
 * The scan is resumable: progress is checkpointed after every page, so
 * re-running after an interruption continues where it stopped.
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldPath } from 'firebase-admin/firestore'
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const EXPECTED_PROJECT_ID = 'nexora-business-suite'

// Medical/Pharmacy module, branch-scoped. Deliberately excludes customers,
// suppliers, categories and every loyalty/sales-hub/school/property/
// restaurant/whatsapp collection.
const ALL_COLLECTIONS = [
  'medicineInventory',
  'medicalPosOrders',
  'inventoryTransactions',
  'purchases',
  'posWalletPayments',
  'medicalPosQueueJobs',
  'accountTransactions',
  'expenses',
  'invoices',
  'payments',
]

// The exact field shape the app's own auto-create writes for the Main branch
// (src/crm/context/UserContext.jsx:750-763). Reported here so the real run
// mirrors it rather than inventing fields. createdAt is serverTimestamp() and
// createdBy is the acting user's uid in the app; a server-side run has no
// acting user, so those two need an explicit decision before the real run.
const MAIN_BRANCH_SHAPE = {
  name: 'Main',
  region: '',
  status: 'active',
  isMain: true,
  workspaceId: '<workspaceId>',
  ownerId: '<workspaceDoc.ownerId || workspaceId>',
  createdAt: '<serverTimestamp()>',
  createdBy: '<acting user uid — no client user in a server run>',
}
const MAIN_BRANCH_WRITE_OPTS = '{ merge: true }'

const REASONS = ['absent', 'null', 'empty_string', 'dangling', 'invalid_type']

/* ------------------------------------------------------------------ */
/*  Args                                                               */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { flags: new Set(), values: {} }
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    if (value === undefined) out.flags.add(key)
    else out.values[key] = value
  }
  return out
}

const args = parseArgs(process.argv)
const OUT_DIR = resolve(process.cwd(), args.values.out || 'branchid-dryrun')
const PAGE_SIZE = Math.max(1, Number(args.values['page-size']) || 500)
const MAX_DOCS = Number(args.values['max-docs']) || Infinity
const FRESH = args.flags.has('fresh')
const COLLECTIONS = args.values.collections
  ? args.values.collections.split(',').map((s) => s.trim()).filter(Boolean)
  : ALL_COLLECTIONS

const FINDINGS_PATH = resolve(OUT_DIR, 'findings.jsonl')
const SUMMARY_PATH = resolve(OUT_DIR, 'summary.json')
const CHECKPOINT_PATH = resolve(OUT_DIR, 'checkpoint.json')

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function loadServiceAccount() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resolve(projectRoot, 'serviceAccount.json'),
    resolve(projectRoot, 'service-account.json'),
    resolve(projectRoot, 'firebase-service-account.json'),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      console.log(`Using service account file: ${candidate}`)
      return JSON.parse(readFileSync(candidate, 'utf-8'))
    }
  }
  return null
}

function initFirebase() {
  if (getApps().length) return
  const sa = loadServiceAccount()
  if (sa) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id })
    return
  }
  console.log('No service-account file found — using Application Default Credentials.')
  initializeApp({ credential: applicationDefault() })
}

function resolveProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    getApps()[0]?.options?.projectId ||
    '(unknown)'
  )
}

/* ------------------------------------------------------------------ */
/*  Checkpoint                                                         */
/* ------------------------------------------------------------------ */

function emptyCounts() {
  return {
    scanned: 0,
    stamped: 0,
    absent: 0,
    null: 0,
    empty_string: 0,
    dangling: 0,
    invalid_type: 0,
    skippedForeignPath: 0,
  }
}

function loadCheckpoint() {
  if (FRESH || !existsSync(CHECKPOINT_PATH)) {
    return { startedAt: new Date().toISOString(), collections: {} }
  }
  try {
    const parsed = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf-8'))
    console.log(`Resuming from checkpoint written ${parsed.updatedAt || parsed.startedAt}`)
    return parsed
  } catch {
    console.log('Checkpoint unreadable — starting fresh.')
    return { startedAt: new Date().toISOString(), collections: {} }
  }
}

function saveCheckpoint(checkpoint) {
  checkpoint.updatedAt = new Date().toISOString()
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2))
}

/* ------------------------------------------------------------------ */
/*  Caches                                                             */
/* ------------------------------------------------------------------ */

const branchCache = new Map() // workspaceId -> Set<branchId>
const parentDocCache = new Map() // workspaceId -> boolean

async function getBranchIds(db, workspaceId) {
  if (branchCache.has(workspaceId)) return branchCache.get(workspaceId)
  // Keys-only query: .select() with no fields returns document refs without
  // field data, so this stays cheap even for workspaces with many branches.
  const snap = await db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('branches')
    .select()
    .get()
  const ids = new Set(snap.docs.map((d) => d.id))
  branchCache.set(workspaceId, ids)
  return ids
}

async function resolveParentDocs(db, workspaceIds) {
  const pending = workspaceIds.filter((id) => !parentDocCache.has(id))
  const CHUNK = 300
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    const refs = chunk.map((id) => db.collection('workspaces').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((snap, idx) => parentDocCache.set(chunk[idx], snap.exists))
  }
}

/* ------------------------------------------------------------------ */
/*  Classification                                                     */
/* ------------------------------------------------------------------ */

/**
 * A document is correctly stamped ONLY IF branchId is a non-empty string AND
 * a branch document with that ID exists for the workspace. Everything else
 * needs backfill.
 */
function classify(data, branchIds) {
  if (!Object.prototype.hasOwnProperty.call(data, 'branchId')) {
    return { stamped: false, reason: 'absent', value: undefined }
  }
  const value = data.branchId
  if (value === null) return { stamped: false, reason: 'null', value: null }
  if (typeof value !== 'string') {
    return { stamped: false, reason: 'invalid_type', value: `${typeof value}:${String(value)}` }
  }
  if (value === '') return { stamped: false, reason: 'empty_string', value: '' }
  if (!branchIds.has(value)) return { stamped: false, reason: 'dangling', value }
  return { stamped: true, reason: null, value }
}

/* ------------------------------------------------------------------ */
/*  Scan                                                               */
/* ------------------------------------------------------------------ */

/**
 * Derive the workspaceId from a document's own path, and confirm the path is
 * genuinely workspaces/{workspaceId}/<collection>/{docId}. A collectionGroup
 * query matches a subcollection with that ID at ANY depth, so a same-named
 * subcollection nested elsewhere would otherwise be miscounted.
 */
function workspaceIdFromPath(path, collectionName) {
  const segments = path.split('/')
  if (segments.length !== 4) return null
  if (segments[0] !== 'workspaces' || segments[2] !== collectionName) return null
  return segments[1] || null
}

async function scanCollection(db, collectionName, checkpoint, workspaceDocCounts) {
  const state = checkpoint.collections[collectionName] || {
    done: false,
    lastPath: null,
    counts: emptyCounts(),
  }
  checkpoint.collections[collectionName] = state

  if (state.done) {
    console.log(`\n[${collectionName}] already complete (${state.counts.scanned} docs) — skipping.`)
    return state
  }

  console.log(`\n[${collectionName}] scanning${state.lastPath ? ` (resuming after ${state.lastPath})` : ''}...`)
  const started = Date.now()
  let pagesThisRun = 0
  let docsThisRun = 0

  for (;;) {
    let query = db
      .collectionGroup(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (state.lastPath) query = query.startAfter(db.doc(state.lastPath))

    const snap = await query.get()
    if (snap.empty) break

    const pageWorkspaceIds = new Set()
    for (const doc of snap.docs) {
      const workspaceId = workspaceIdFromPath(doc.ref.path, collectionName)
      if (workspaceId) pageWorkspaceIds.add(workspaceId)
    }
    await resolveParentDocs(db, [...pageWorkspaceIds])

    const lines = []
    for (const doc of snap.docs) {
      const workspaceId = workspaceIdFromPath(doc.ref.path, collectionName)
      if (!workspaceId) {
        state.counts.skippedForeignPath += 1
        continue
      }

      state.counts.scanned += 1
      const branchIds = await getBranchIds(db, workspaceId)
      const verdict = classify(doc.data() || {}, branchIds)

      if (!workspaceDocCounts.has(workspaceId)) {
        workspaceDocCounts.set(workspaceId, { total: 0, needsBackfill: 0 })
      }
      const wsCounts = workspaceDocCounts.get(workspaceId)
      wsCounts.total += 1

      if (verdict.stamped) {
        state.counts.stamped += 1
      } else {
        state.counts[verdict.reason] += 1
        wsCounts.needsBackfill += 1
        lines.push(
          JSON.stringify({
            workspaceId,
            collection: collectionName,
            docId: doc.id,
            path: doc.ref.path,
            currentBranchId: verdict.value === undefined ? null : verdict.value,
            branchIdPresent: verdict.reason !== 'absent',
            reason: verdict.reason,
          }),
        )
      }
    }

    if (lines.length) appendFileSync(FINDINGS_PATH, `${lines.join('\n')}\n`)

    state.lastPath = snap.docs[snap.docs.length - 1].ref.path
    pagesThisRun += 1
    docsThisRun += snap.docs.length
    saveCheckpoint(checkpoint)

    const needs =
      state.counts.absent +
      state.counts.null +
      state.counts.empty_string +
      state.counts.dangling +
      state.counts.invalid_type
    console.log(
      `  page ${pagesThisRun}: ${state.counts.scanned} scanned, ` +
        `${state.counts.stamped} stamped, ${needs} need backfill ` +
        `(${Math.round((Date.now() - started) / 1000)}s)`,
    )

    if (snap.docs.length < PAGE_SIZE) break
    if (docsThisRun >= MAX_DOCS) {
      console.log(`  stopping early at --max-docs=${MAX_DOCS} (collection left incomplete)`)
      saveCheckpoint(checkpoint)
      return state
    }
  }

  state.done = true
  saveCheckpoint(checkpoint)
  console.log(`[${collectionName}] complete: ${state.counts.scanned} docs in ${Math.round((Date.now() - started) / 1000)}s`)
  return state
}

/* ------------------------------------------------------------------ */
/*  Reporting                                                          */
/* ------------------------------------------------------------------ */

function pad(value, width, right = false) {
  const str = String(value)
  return right ? str.padStart(width) : str.padEnd(width)
}

function printCollectionTable(perCollection) {
  const headers = ['collection', 'scanned', 'stamped', 'absent', 'null', 'empty', 'dangling', 'badType', 'NEEDS']
  const widths = [24, 9, 9, 8, 7, 7, 9, 8, 9]
  console.log(`\n${'='.repeat(100)}`)
  console.log('PER-COLLECTION SUMMARY')
  console.log('='.repeat(100))
  console.log(headers.map((h, i) => pad(h, widths[i], i > 0)).join(' '))
  console.log('-'.repeat(100))

  const totals = emptyCounts()
  for (const [name, counts] of perCollection) {
    const needs =
      counts.absent + counts.null + counts.empty_string + counts.dangling + counts.invalid_type
    const row = [
      name,
      counts.scanned,
      counts.stamped,
      counts.absent,
      counts.null,
      counts.empty_string,
      counts.dangling,
      counts.invalid_type,
      needs,
    ]
    console.log(row.map((cell, i) => pad(cell, widths[i], i > 0)).join(' '))
    for (const key of Object.keys(totals)) totals[key] += counts[key] || 0
  }

  const grandNeeds =
    totals.absent + totals.null + totals.empty_string + totals.dangling + totals.invalid_type
  console.log('-'.repeat(100))
  console.log(
    [
      'TOTAL',
      totals.scanned,
      totals.stamped,
      totals.absent,
      totals.null,
      totals.empty_string,
      totals.dangling,
      totals.invalid_type,
      grandNeeds,
    ]
      .map((cell, i) => pad(cell, widths[i], i > 0))
      .join(' '),
  )
  return { totals, grandNeeds }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  initFirebase()
  const projectId = resolveProjectId()

  console.log('='.repeat(100))
  console.log('branchId BACKFILL — DRY RUN (no writes will be performed)')
  console.log('='.repeat(100))
  console.log(`Firebase project : ${projectId}`)
  if (projectId !== EXPECTED_PROJECT_ID) {
    console.log(`WARNING: expected project "${EXPECTED_PROJECT_ID}" — verify before the real run.`)
  }
  console.log(`Collections      : ${COLLECTIONS.join(', ')}`)
  console.log(`Page size        : ${PAGE_SIZE}${MAX_DOCS === Infinity ? '' : `  (max ${MAX_DOCS} docs/collection)`}`)
  console.log(`Output directory : ${OUT_DIR}`)
  console.log('='.repeat(100))

  const db = getFirestore()
  const checkpoint = loadCheckpoint()
  if (FRESH && existsSync(FINDINGS_PATH)) writeFileSync(FINDINGS_PATH, '')
  if (!existsSync(FINDINGS_PATH)) writeFileSync(FINDINGS_PATH, '')

  const workspaceDocCounts = new Map()
  const perCollection = []

  for (const collectionName of COLLECTIONS) {
    const state = await scanCollection(db, collectionName, checkpoint, workspaceDocCounts)
    perCollection.push([collectionName, state.counts])
  }

  const { totals, grandNeeds } = printCollectionTable(perCollection)

  // ── Workspace-level summary ────────────────────────────────────────
  const allWorkspaceIds = [...new Set([...workspaceDocCounts.keys(), ...branchCache.keys()])]
  await resolveParentDocs(db, allWorkspaceIds)

  const missingMain = []
  const missingParentDoc = []
  const noBranchesAtAll = []
  for (const workspaceId of allWorkspaceIds) {
    const branchIds = await getBranchIds(db, workspaceId)
    if (!branchIds.has('main')) missingMain.push(workspaceId)
    if (branchIds.size === 0) noBranchesAtAll.push(workspaceId)
    if (parentDocCache.get(workspaceId) === false) missingParentDoc.push(workspaceId)
  }

  console.log(`\n${'='.repeat(100)}`)
  console.log('WORKSPACE SUMMARY')
  console.log('='.repeat(100))
  console.log(`Distinct workspaceIds discovered (from document paths) : ${allWorkspaceIds.length}`)
  console.log(`  ...with NO workspaces/{workspaceId} parent document  : ${missingParentDoc.length}`)
  console.log(`  ...with NO branches subcollection documents at all    : ${noBranchesAtAll.length}`)
  console.log(`  ...missing branches/main                              : ${missingMain.length}`)

  if (missingParentDoc.length) {
    console.log(`\nWorkspaces with data but no parent doc (signal, not an error):`)
    missingParentDoc.slice(0, 20).forEach((id) => console.log(`  ${id}`))
    if (missingParentDoc.length > 20) console.log(`  ...and ${missingParentDoc.length - 20} more`)
  }

  if (missingMain.length) {
    console.log(`\nWorkspaces missing branches/main (first 20):`)
    missingMain.slice(0, 20).forEach((id) => console.log(`  ${id}`))
    if (missingMain.length > 20) console.log(`  ...and ${missingMain.length - 20} more`)
  }

  const topWorkspaces = [...workspaceDocCounts.entries()]
    .map(([workspaceId, counts]) => ({ workspaceId, ...counts }))
    .filter((row) => row.needsBackfill > 0)
    .sort((a, b) => b.needsBackfill - a.needsBackfill)
    .slice(0, 10)

  console.log(`\nTop ${topWorkspaces.length} workspaces by documents needing backfill:`)
  console.log(`${pad('workspaceId', 34)} ${pad('needsBackfill', 14, true)} ${pad('totalScanned', 13, true)}`)
  console.log('-'.repeat(64))
  for (const row of topWorkspaces) {
    console.log(`${pad(row.workspaceId, 34)} ${pad(row.needsBackfill, 14, true)} ${pad(row.total, 13, true)}`)
  }

  // ── Main branch shape (mirrored from the app, not invented) ────────
  console.log(`\n${'='.repeat(100)}`)
  console.log('MAIN BRANCH DOCUMENT SHAPE — mirrored from src/crm/context/UserContext.jsx:750-763')
  console.log('='.repeat(100))
  console.log(`Path        : workspaces/{workspaceId}/branches/main   (document ID is the literal "main")`)
  console.log(`Write opts  : ${MAIN_BRANCH_WRITE_OPTS}`)
  console.log(JSON.stringify(MAIN_BRANCH_SHAPE, null, 2))
  console.log(
    '\nNote: the app sets createdAt via serverTimestamp() and createdBy to the acting\n' +
      "user's uid. A server-side run has no acting user, so createdBy needs an explicit\n" +
      'decision (e.g. the workspace ownerId) before the real run. This dry run created nothing.',
  )

  // ── Grand total ────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(100)}`)
  console.log(`GRAND TOTAL — documents a real run would write : ${grandNeeds}`)
  console.log(`  branch documents a real run would create     : ${missingMain.length} (branches/main)`)
  console.log('='.repeat(100))

  const summary = {
    dryRun: true,
    projectId,
    generatedAt: new Date().toISOString(),
    pageSize: PAGE_SIZE,
    collectionsScanned: COLLECTIONS,
    perCollection: Object.fromEntries(
      perCollection.map(([name, counts]) => [
        name,
        {
          ...counts,
          needsBackfill:
            counts.absent + counts.null + counts.empty_string + counts.dangling + counts.invalid_type,
        },
      ]),
    ),
    totals: { ...totals, needsBackfill: grandNeeds },
    workspaces: {
      discovered: allWorkspaceIds.length,
      missingParentDoc: missingParentDoc.length,
      missingParentDocIds: missingParentDoc,
      noBranchesAtAll: noBranchesAtAll.length,
      noBranchesAtAllIds: noBranchesAtAll,
      missingMainBranch: missingMain.length,
      missingMainBranchIds: missingMain,
      topByNeedsBackfill: topWorkspaces,
    },
    mainBranchShape: { path: 'workspaces/{workspaceId}/branches/main', writeOptions: MAIN_BRANCH_WRITE_OPTS, fields: MAIN_BRANCH_SHAPE },
    reasons: REASONS,
    files: { findings: FINDINGS_PATH, checkpoint: CHECKPOINT_PATH },
  }
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2))

  console.log(`\nSummary written  : ${SUMMARY_PATH}`)
  console.log(`Per-document list: ${FINDINGS_PATH}`)
  console.log('  (line-delimited JSON — one finding per line, so the scan stays memory-safe')
  console.log('   and resumable. Inspect with: jq -s \'.\' findings.jsonl, or')
  console.log("   jq 'select(.reason==\"dangling\")' findings.jsonl)")
  console.log('\nDRY RUN COMPLETE — nothing was written to Firestore.')
}

main().catch((error) => {
  console.error('\nDRY RUN FAILED')
  console.error(error)
  console.error('\nProgress was checkpointed — re-run to resume from the last completed page.')
  process.exit(1)
})
