#!/usr/bin/env node
/**
 * branchId backfill — REAL RUN. THIS SCRIPT WRITES TO PRODUCTION FIRESTORE.
 *
 * Write-enabled counterpart to scripts/branchid-backfill-dryrun.mjs. Structure,
 * detection logic and the collectionGroup/tenant-enumeration approach are
 * mirrored from that script deliberately — the dry run is the specification.
 *
 * There is NO --dry-run flag here on purpose. If you want a dry run, run the
 * other file. This one always writes.
 *
 * WHAT IT DOES, IN ORDER:
 *   STEP 1  Create workspaces/{workspaceId}/branches/main (merge:true) in every
 *           workspace that does not already have it — re-detected live at run
 *           time, never from a cached list.
 *   STEP 2  For every document in the 10 branch-scoped collections that needs
 *           backfill, update() branchId -> 'main'. No other field is touched.
 *
 * USAGE (Google Cloud Shell, project nexora-business-suite):
 *
 *   npm i firebase-admin
 *   gcloud config set project nexora-business-suite
 *   node scripts/branchid-backfill-run.mjs
 *
 * Or with an explicit service-account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/branchid-backfill-run.mjs
 *
 * FLAGS
 *   --out=<dir>              output directory (default ./branchid-backfill)
 *   --collections=a,b        limit to these collections (default: all 10)
 *   --page-size=<n>          documents per page (default 500)
 *   --max-docs=<n>           stop after N docs per collection (smoke test)
 *   --fresh                  ignore any existing checkpoint and restart
 *   --skip-main-branches     skip STEP 1 entirely (STEP 2 only)
 *
 * RESUMABILITY: progress is checkpointed after every page, and the checkpoint
 * is only advanced once the writes for that page have been committed. Beyond
 * that, the detection rule is itself idempotent — a document already carrying
 * a branchId that resolves to a real branch is classified as stamped and is
 * never rewritten — so re-running after an interruption cannot double-write.
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore'
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const EXPECTED_PROJECT_ID = 'nexora-business-suite'

// Medical/Pharmacy module, branch-scoped. Same 10, same order as the dry run.
// Deliberately excludes customers, suppliers, categories and every
// loyalty/sales-hub/school/property/restaurant/whatsapp collection.
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

// The branchId every backfilled document receives, and the branch document ID
// STEP 1 creates. The literal string "main" in both cases.
const TARGET_BRANCH_ID = 'main'

// Firestore's hard limit is 500 operations per batch; 400 leaves headroom.
const BATCH_LIMIT = 400

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
const OUT_DIR = resolve(process.cwd(), args.values.out || 'branchid-backfill')
const PAGE_SIZE = Math.max(1, Number(args.values['page-size']) || 500)
const MAX_DOCS = Number(args.values['max-docs']) || Infinity
const FRESH = args.flags.has('fresh')
const SKIP_MAIN_BRANCHES = args.flags.has('skip-main-branches')
const COLLECTIONS = args.values.collections
  ? args.values.collections.split(',').map((s) => s.trim()).filter(Boolean)
  : ALL_COLLECTIONS

const WRITE_LOG_PATH = resolve(OUT_DIR, 'writes.jsonl')
const ERROR_LOG_PATH = resolve(OUT_DIR, 'errors.jsonl')
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

/**
 * Hard gate. The dry run only warns on a project mismatch because it cannot
 * write; this script aborts before performing a single operation. Both the
 * resolved project id AND the initialised app's own project id (when it has
 * one) must match, so an env var cannot mask credentials pointing elsewhere.
 */
function assertExpectedProject() {
  const resolved = resolveProjectId()
  const appProjectId = getApps()[0]?.options?.projectId || ''

  if (resolved !== EXPECTED_PROJECT_ID) {
    console.error(`\nABORTED — connected project is "${resolved}", expected "${EXPECTED_PROJECT_ID}".`)
    console.error('Nothing was written. Set the correct project and re-run:')
    console.error(`  gcloud config set project ${EXPECTED_PROJECT_ID}`)
    process.exit(1)
  }
  if (appProjectId && appProjectId !== EXPECTED_PROJECT_ID) {
    console.error(`\nABORTED — credentials resolve to project "${appProjectId}", expected "${EXPECTED_PROJECT_ID}".`)
    console.error('Nothing was written.')
    process.exit(1)
  }
  return resolved
}

/* ------------------------------------------------------------------ */
/*  Audit log                                                          */
/* ------------------------------------------------------------------ */

// appendFileSync opens, writes and closes per call, so every line is on disk
// before the next write is attempted. That is the point: if the process dies
// mid-run the log still describes exactly what landed.
function logWrite(entry) {
  appendFileSync(WRITE_LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`)
}

function logError(entry) {
  appendFileSync(ERROR_LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`)
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
    backfilled: 0,
    failed: 0,
  }
}

function emptyCheckpoint() {
  return {
    startedAt: new Date().toISOString(),
    mainBranches: { done: false, created: [] },
    collections: {},
  }
}

function loadCheckpoint() {
  if (FRESH || !existsSync(CHECKPOINT_PATH)) return emptyCheckpoint()
  try {
    const parsed = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf-8'))
    console.log(`Resuming from checkpoint written ${parsed.updatedAt || parsed.startedAt}`)
    if (!parsed.mainBranches) parsed.mainBranches = { done: false, created: [] }
    if (!parsed.collections) parsed.collections = {}
    return parsed
  } catch {
    console.log('Checkpoint unreadable — starting fresh.')
    return emptyCheckpoint()
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

/* ------------------------------------------------------------------ */
/*  Batched writer                                                     */
/* ------------------------------------------------------------------ */

/**
 * Accumulates operations and commits them in batches of at most BATCH_LIMIT.
 * STEP 1 and STEP 2 share one instance, so Main-branch creates and branchId
 * updates count toward the same batch size.
 *
 * A Firestore batch is atomic: one bad operation rejects the whole commit. To
 * honour "log and continue past a single failed write", a failed batch is
 * retried operation-by-operation so the good ones still land and only the
 * genuinely bad ones are recorded as failures.
 */
class BatchWriter {
  constructor(db, stats) {
    this.db = db
    this.stats = stats
    this.ops = []
    this.committedOps = 0
    this.batches = 0
  }

  get pending() {
    return this.ops.length
  }

  async add(op) {
    this.ops.push(op)
    if (this.ops.length >= BATCH_LIMIT) await this.flush()
  }

  async flush() {
    if (!this.ops.length) return
    const ops = this.ops
    this.ops = []

    const batch = this.db.batch()
    for (const op of ops) {
      if (op.kind === 'set') batch.set(op.ref, op.data, op.options || {})
      else batch.update(op.ref, op.data)
    }

    try {
      await batch.commit()
      this.batches += 1
      this.committedOps += ops.length
      for (const op of ops) this.recordSuccess(op)
      console.log(`  committed batch #${this.batches} (${ops.length} ops, ${this.committedOps} total)`)
    } catch (error) {
      console.warn(`  batch commit failed (${ops.length} ops) — retrying individually: ${error?.message || error}`)
      for (const op of ops) await this.commitSingle(op)
    }
  }

  async commitSingle(op) {
    try {
      if (op.kind === 'set') await op.ref.set(op.data, op.options || {})
      else await op.ref.update(op.data)
      this.committedOps += 1
      this.recordSuccess(op)
    } catch (error) {
      this.recordFailure(op, error)
    }
  }

  recordSuccess(op) {
    logWrite(op.log)
    op.onCommitted?.()
  }

  recordFailure(op, error) {
    const failure = {
      ...op.log,
      ok: false,
      errorCode: error?.code || '',
      errorMessage: error?.message || String(error),
    }
    logError(failure)
    this.stats.errors.push(failure)
    op.onFailed?.()
    console.warn(`  WRITE FAILED ${op.log.path}: ${failure.errorMessage}`)
  }
}

/* ------------------------------------------------------------------ */
/*  STEP 1 — Main branch creation                                      */
/* ------------------------------------------------------------------ */

/**
 * Enumerate EVERY workspace, not just those already carrying branch-scoped
 * data. listDocuments() is used rather than a .get() listing because a
 * workspace parent document that holds only subcollections is a "missing"
 * document in Firestore and would not appear in a normal collection read —
 * the dry run flagged exactly that case.
 */
async function enumerateWorkspaces(db) {
  const refs = await db.collection('workspaces').listDocuments()
  const workspaces = []
  const CHUNK = 300
  for (let i = 0; i < refs.length; i += CHUNK) {
    const chunk = refs.slice(i, i + CHUNK)
    const snaps = await db.getAll(...chunk)
    snaps.forEach((snap, idx) => {
      const data = snap.exists ? snap.data() || {} : {}
      workspaces.push({
        workspaceId: chunk[idx].id,
        parentDocExists: snap.exists,
        // Mirrors the app: ownerId falls back to the workspace's own id.
        ownerId: data.ownerId || chunk[idx].id,
      })
    })
  }
  return workspaces
}

async function createMissingMainBranches(db, writer, checkpoint, stats) {
  console.log(`\n${'='.repeat(100)}`)
  console.log('STEP 1 — create missing branches/main documents')
  console.log('='.repeat(100))

  if (SKIP_MAIN_BRANCHES) {
    console.log('--skip-main-branches set — STEP 1 skipped entirely.')
    return
  }

  const workspaces = await enumerateWorkspaces(db)
  stats.workspacesDiscovered = workspaces.length
  console.log(`Workspaces discovered: ${workspaces.length}`)

  // Live re-detection. The dry run's missingMainBranchIds list is NOT trusted;
  // existence is re-read here, at run time, one bulk getAll over the candidate
  // branches/main refs.
  const mainRefs = workspaces.map((ws) =>
    db.collection('workspaces').doc(ws.workspaceId).collection('branches').doc(TARGET_BRANCH_ID),
  )
  const existing = new Set()
  const CHUNK = 300
  for (let i = 0; i < mainRefs.length; i += CHUNK) {
    const chunk = mainRefs.slice(i, i + CHUNK)
    const snaps = await db.getAll(...chunk)
    snaps.forEach((snap) => {
      if (snap.exists) existing.add(snap.ref.parent.parent.id)
    })
  }

  const alreadyCreated = new Set(checkpoint.mainBranches.created || [])
  const missing = workspaces.filter(
    (ws) => !existing.has(ws.workspaceId) && !alreadyCreated.has(ws.workspaceId),
  )

  stats.mainBranchesAlreadyPresent = existing.size
  console.log(`  already have branches/main : ${existing.size}`)
  console.log(`  missing branches/main      : ${missing.length}`)

  if (!missing.length) {
    checkpoint.mainBranches.done = true
    saveCheckpoint(checkpoint)
    console.log('Nothing to create.')
    return
  }

  for (const ws of missing) {
    const ref = db
      .collection('workspaces')
      .doc(ws.workspaceId)
      .collection('branches')
      .doc(TARGET_BRANCH_ID)

    await writer.add({
      kind: 'set',
      ref,
      // Field shape mirrored from src/crm/context/UserContext.jsx:750-763.
      // createdBy has no acting user in a server run, so it takes the same
      // value as ownerId — the decision the dry run flagged as outstanding.
      data: {
        name: 'Main',
        region: '',
        status: 'active',
        isMain: true,
        workspaceId: ws.workspaceId,
        ownerId: ws.ownerId,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: ws.ownerId,
      },
      options: { merge: true },
      log: {
        type: 'create_main_branch',
        workspaceId: ws.workspaceId,
        path: ref.path,
        parentDocExists: ws.parentDocExists,
        ownerId: ws.ownerId,
        ok: true,
      },
      onCommitted: () => {
        stats.mainBranchesCreated += 1
        checkpoint.mainBranches.created.push(ws.workspaceId)
        // Keep the branch cache honest for STEP 2 in case it was already warm.
        if (branchCache.has(ws.workspaceId)) branchCache.get(ws.workspaceId).add(TARGET_BRANCH_ID)
        console.log(`  created ${ref.path} (${stats.mainBranchesCreated}/${missing.length})`)
      },
      onFailed: () => {
        stats.mainBranchesFailed += 1
      },
    })
  }

  // Hard ordering constraint: STEP 1 must be durably committed before STEP 2
  // reads any branch list. STEP 2 classifies against the branches that exist
  // in Firestore, so if these creates were still sitting in an uncommitted
  // batch, a document already carrying branchId 'main' would be read as
  // 'dangling'. The final branchId would come out the same either way, but the
  // audit log's reason field would be wrong — so the batch is flushed here
  // rather than being topped up by STEP 2's operations.
  await writer.flush()
  checkpoint.mainBranches.done = true
  saveCheckpoint(checkpoint)
  console.log(`STEP 1 complete: ${stats.mainBranchesCreated} created, ${stats.mainBranchesFailed} failed.`)
}

/* ------------------------------------------------------------------ */
/*  Classification — identical rule to the dry run                     */
/* ------------------------------------------------------------------ */

/**
 * A document is correctly stamped ONLY IF branchId is a non-empty string AND
 * a branch document with that ID exists for the workspace. Everything else
 * needs backfill. Stamped documents are never rewritten.
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
/*  STEP 2 — backfill                                                  */
/* ------------------------------------------------------------------ */

/**
 * Derive the workspaceId from a document's own path, and confirm the path is
 * genuinely workspaces/{workspaceId}/<collection>/{docId}. A collectionGroup
 * query matches a subcollection with that ID at ANY depth, so a same-named
 * subcollection nested elsewhere would otherwise be miscounted — and, here,
 * wrongly written to.
 */
function workspaceIdFromPath(path, collectionName) {
  const segments = path.split('/')
  if (segments.length !== 4) return null
  if (segments[0] !== 'workspaces' || segments[2] !== collectionName) return null
  return segments[1] || null
}

async function backfillCollection(db, writer, collectionName, checkpoint, stats) {
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

  console.log(`\n[${collectionName}] backfilling${state.lastPath ? ` (resuming after ${state.lastPath})` : ''}...`)
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

    for (const doc of snap.docs) {
      const workspaceId = workspaceIdFromPath(doc.ref.path, collectionName)
      if (!workspaceId) {
        state.counts.skippedForeignPath += 1
        continue
      }

      state.counts.scanned += 1
      const branchIds = await getBranchIds(db, workspaceId)
      const verdict = classify(doc.data() || {}, branchIds)

      if (verdict.stamped) {
        state.counts.stamped += 1
        continue
      }

      state.counts[verdict.reason] += 1
      await writer.add({
        kind: 'update',
        ref: doc.ref,
        // update(), not set() — a single targeted field. Every other field on
        // the document is left exactly as it is.
        data: { branchId: TARGET_BRANCH_ID },
        log: {
          type: 'backfill_branch_id',
          workspaceId,
          collection: collectionName,
          docId: doc.id,
          path: doc.ref.path,
          oldValue: verdict.value === undefined ? null : verdict.value,
          newValue: TARGET_BRANCH_ID,
          reason: verdict.reason,
          ok: true,
        },
        onCommitted: () => {
          state.counts.backfilled += 1
          stats.totalBackfilled += 1
        },
        onFailed: () => {
          state.counts.failed += 1
          stats.totalFailed += 1
        },
      })
    }

    // Commit before checkpointing: lastPath must never advance past documents
    // whose writes have not landed, or a resume would skip them.
    await writer.flush()

    state.lastPath = snap.docs[snap.docs.length - 1].ref.path
    pagesThisRun += 1
    docsThisRun += snap.docs.length
    saveCheckpoint(checkpoint)

    console.log(
      `  page ${pagesThisRun}: ${state.counts.scanned} scanned, ` +
        `${state.counts.stamped} already stamped, ${state.counts.backfilled} backfilled, ` +
        `${state.counts.failed} failed (${Math.round((Date.now() - started) / 1000)}s)`,
    )

    if (snap.docs.length < PAGE_SIZE) break
    if (docsThisRun >= MAX_DOCS) {
      console.log(`  stopping early at --max-docs=${MAX_DOCS} (collection left incomplete)`)
      saveCheckpoint(checkpoint)
      return state
    }
  }

  await writer.flush()
  state.done = true
  saveCheckpoint(checkpoint)
  console.log(
    `[${collectionName}] complete: ${state.counts.backfilled} backfilled of ${state.counts.scanned} scanned ` +
      `in ${Math.round((Date.now() - started) / 1000)}s`,
  )
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
  const headers = ['collection', 'scanned', 'stamped', 'absent', 'null', 'empty', 'dangling', 'badType', 'WRITTEN', 'failed']
  const widths = [24, 9, 9, 8, 7, 7, 9, 8, 9, 7]
  console.log(`\n${'='.repeat(110)}`)
  console.log('PER-COLLECTION RESULTS')
  console.log('='.repeat(110))
  console.log(headers.map((h, i) => pad(h, widths[i], i > 0)).join(' '))
  console.log('-'.repeat(110))

  const totals = emptyCounts()
  for (const [name, counts] of perCollection) {
    const row = [
      name,
      counts.scanned,
      counts.stamped,
      counts.absent,
      counts.null,
      counts.empty_string,
      counts.dangling,
      counts.invalid_type,
      counts.backfilled,
      counts.failed,
    ]
    console.log(row.map((cell, i) => pad(cell, widths[i], i > 0)).join(' '))
    for (const key of Object.keys(totals)) totals[key] += counts[key] || 0
  }

  console.log('-'.repeat(110))
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
      totals.backfilled,
      totals.failed,
    ]
      .map((cell, i) => pad(cell, widths[i], i > 0))
      .join(' '),
  )
  return totals
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  initFirebase()
  // Gate before anything else touches Firestore.
  const projectId = assertExpectedProject()

  console.log('='.repeat(100))
  console.log('branchId BACKFILL — REAL RUN. THIS WILL WRITE TO FIRESTORE.')
  console.log('='.repeat(100))
  console.log(`Firebase project : ${projectId}  (verified)`)
  console.log(`Collections      : ${COLLECTIONS.join(', ')}`)
  console.log(`Page size        : ${PAGE_SIZE}${MAX_DOCS === Infinity ? '' : `  (max ${MAX_DOCS} docs/collection)`}`)
  console.log(`Batch size       : ${BATCH_LIMIT} ops`)
  console.log(`Target branchId  : ${TARGET_BRANCH_ID}`)
  console.log(`Output directory : ${OUT_DIR}`)
  console.log('='.repeat(100))

  const db = getFirestore()
  const checkpoint = loadCheckpoint()

  if (FRESH) {
    writeFileSync(WRITE_LOG_PATH, '')
    writeFileSync(ERROR_LOG_PATH, '')
  }
  // Append-only: an existing log from a partial run is preserved, never reset.
  if (!existsSync(WRITE_LOG_PATH)) writeFileSync(WRITE_LOG_PATH, '')
  if (!existsSync(ERROR_LOG_PATH)) writeFileSync(ERROR_LOG_PATH, '')

  const stats = {
    mainBranchesCreated: 0,
    mainBranchesFailed: 0,
    mainBranchesAlreadyPresent: 0,
    workspacesDiscovered: 0,
    totalBackfilled: 0,
    totalFailed: 0,
    errors: [],
  }

  const writer = new BatchWriter(db, stats)

  // ── STEP 1 ─────────────────────────────────────────────────────────
  await createMissingMainBranches(db, writer, checkpoint, stats)

  // ── STEP 2 ─────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(100)}`)
  console.log('STEP 2 — backfill branchId across the 10 branch-scoped collections')
  console.log('='.repeat(100))

  const perCollection = []
  for (const collectionName of COLLECTIONS) {
    const state = await backfillCollection(db, writer, collectionName, checkpoint, stats)
    perCollection.push([collectionName, state.counts])
  }

  await writer.flush()

  // ── Summary ────────────────────────────────────────────────────────
  const totals = printCollectionTable(perCollection)

  console.log(`\n${'='.repeat(100)}`)
  console.log('FINAL SUMMARY')
  console.log('='.repeat(100))
  console.log(`Workspaces discovered              : ${stats.workspacesDiscovered}`)
  console.log(`Main branches already present      : ${stats.mainBranchesAlreadyPresent}`)
  console.log(`Main branches CREATED              : ${stats.mainBranchesCreated}`)
  console.log(`Main branches failed               : ${stats.mainBranchesFailed}`)
  console.log(`Documents BACKFILLED               : ${stats.totalBackfilled}`)
  console.log(`Documents failed                   : ${stats.totalFailed}`)
  console.log(`Batches committed                  : ${writer.batches}`)
  console.log(`Total operations committed         : ${writer.committedOps}`)

  console.log('\nBackfilled per collection:')
  for (const [name, counts] of perCollection) {
    console.log(`  ${pad(name, 24)} ${pad(counts.backfilled, 6, true)}`)
  }

  if (stats.errors.length) {
    console.log(`\nERRORS (${stats.errors.length}) — these documents were NOT written:`)
    stats.errors.slice(0, 50).forEach((err) => {
      console.log(`  ${err.path}  [${err.errorCode || 'error'}] ${err.errorMessage}`)
    })
    if (stats.errors.length > 50) console.log(`  ...and ${stats.errors.length - 50} more (see ${ERROR_LOG_PATH})`)
  } else {
    console.log('\nErrors: none.')
  }

  const summary = {
    dryRun: false,
    projectId,
    generatedAt: new Date().toISOString(),
    pageSize: PAGE_SIZE,
    batchLimit: BATCH_LIMIT,
    targetBranchId: TARGET_BRANCH_ID,
    collectionsProcessed: COLLECTIONS,
    mainBranches: {
      workspacesDiscovered: stats.workspacesDiscovered,
      alreadyPresent: stats.mainBranchesAlreadyPresent,
      created: stats.mainBranchesCreated,
      failed: stats.mainBranchesFailed,
      createdIds: checkpoint.mainBranches.created,
    },
    perCollection: Object.fromEntries(perCollection.map(([name, counts]) => [name, { ...counts }])),
    totals,
    documentsBackfilled: stats.totalBackfilled,
    documentsFailed: stats.totalFailed,
    batchesCommitted: writer.batches,
    operationsCommitted: writer.committedOps,
    errors: stats.errors,
    files: { writeLog: WRITE_LOG_PATH, errorLog: ERROR_LOG_PATH, checkpoint: CHECKPOINT_PATH },
  }
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2))

  console.log(`\nSummary written : ${SUMMARY_PATH}`)
  console.log(`Write audit log : ${WRITE_LOG_PATH}`)
  console.log(`Error log       : ${ERROR_LOG_PATH}`)
  console.log('\nBACKFILL COMPLETE.')

  if (stats.mainBranchesFailed || stats.totalFailed) {
    console.log('\nSome writes failed — re-run to retry them (already-stamped documents are skipped).')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('\nBACKFILL FAILED')
  console.error(error)
  console.error('\nProgress was checkpointed — re-run to resume from the last committed page.')
  console.error(`Everything written so far is recorded in ${WRITE_LOG_PATH}`)
  process.exit(1)
})
