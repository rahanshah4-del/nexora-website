// Rebuilds the public site (Cloudflare Workers Builds deploy hook for `main`)
// when a blog change affects it: a post is published, unpublished, deleted or
// edited while published, or a slug-rename redirect changes. The build reads
// published posts and redirects straight from Firestore, so a rebuild is all a
// CMS change needs to reach static HTML, the sitemap and _redirects.
//
// Rapid edits are batched with a trailing debounce: every relevant change
// stamps siteBuild/blog and enqueues a Cloud Task 120 s out; a task only calls
// the hook once changes have been quiet for 120 s (or have been pending for
// 10 min), so a burst of saves becomes one build. See blogRebuildLogic.js.
//
// BLOG_AUTO_REBUILD (functions/.env): off | dry-run | live. dry-run does
// everything except the hook call, which it logs instead.

/* global process */
import admin from 'firebase-admin'
import { getFunctions } from 'firebase-admin/functions'
import { logger } from 'firebase-functions'
import { defineSecret, defineString } from 'firebase-functions/params'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import {
  buildDeployHookRequest,
  classifyBlogPostChange,
  classifyRedirectChange,
  decideRebuild,
  DEBOUNCE_QUIET_MS,
} from './blogRebuildLogic.js'

const REGION = 'us-central1'
const STATE_DOC = 'siteBuild/blog'
const TASK_FUNCTION = 'blogRebuildTask'
const MAX_REASONS = 20

const CF_DEPLOY_HOOK_URL = defineSecret('CF_DEPLOY_HOOK_URL')
// Only needed when CF_DEPLOY_HOOK_URL is a Workers Builds *trigger* URL; an
// unauthenticated Deploy Hook URL ignores it. See buildDeployHookRequest.
const CF_API_TOKEN = defineSecret('CF_API_TOKEN')
const CF_BUILD_BRANCH = defineString('CF_BUILD_BRANCH', {
  default: 'main',
  description: 'Git branch a Workers Builds trigger should build (production branch)',
})
const BLOG_AUTO_REBUILD = defineString('BLOG_AUTO_REBUILD', {
  default: 'dry-run',
  description: 'Blog auto-rebuild mode: off, dry-run (log only) or live (call the Cloudflare deploy hook)',
})

const mode = () => {
  const value = String(BLOG_AUTO_REBUILD.value() || '').trim().toLowerCase()
  return ['off', 'dry-run', 'live'].includes(value) ? value : 'dry-run'
}
const nowTs = () => admin.firestore.Timestamp.fromMillis(Date.now())

async function queueRebuild(change) {
  if (mode() === 'off') {
    logger.info('blogRebuild: BLOG_AUTO_REBUILD=off, not queuing', change)
    return
  }
  const db = admin.firestore()
  const ref = db.doc(STATE_DOC)
  const at = nowTs()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = snap.exists ? snap.data() : {}
    const reasons = [...(state.pending ? state.reasons || [] : []), { ...change, at }].slice(-MAX_REASONS)
    tx.set(ref, {
      pending: true,
      pendingSince: state.pending && state.pendingSince ? state.pendingSince : at,
      lastChangeAt: at,
      reasons,
    }, { merge: true })
  })
  await getFunctions()
    .taskQueue(`locations/${REGION}/functions/${TASK_FUNCTION}`)
    .enqueue({ change }, { scheduleDelaySeconds: DEBOUNCE_QUIET_MS / 1000 })
  logger.info('blogRebuild: change queued', { ...change, debounceSeconds: DEBOUNCE_QUIET_MS / 1000 })
}

export const blogPostsWritten = onDocumentWritten(
  { region: REGION, document: 'blogPosts/{slug}', timeoutSeconds: 60, memory: '256MiB' },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null
    const after = event.data?.after?.exists ? event.data.after.data() : null
    const { action, reason } = classifyBlogPostChange(before, after)
    logger.info('blogPostsWritten', { slug: event.params.slug, action, reason })
    if (action === 'ignore') return
    await queueRebuild({ source: 'blogPosts', slug: event.params.slug, action })
  },
)

export const blogRedirectsWritten = onDocumentWritten(
  { region: REGION, document: 'blogRedirects/{fromSlug}', timeoutSeconds: 60, memory: '256MiB' },
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null
    const after = event.data?.after?.exists ? event.data.after.data() : null
    const { action, reason } = classifyRedirectChange(before, after)
    logger.info('blogRedirectsWritten', { fromSlug: event.params.fromSlug, action, reason })
    if (action === 'ignore') return
    await queueRebuild({ source: 'blogRedirects', slug: event.params.fromSlug, action })
  },
)

async function callDeployHook() {
  const url = String(CF_DEPLOY_HOOK_URL.value() || '').trim()
  // Only ever POST to Cloudflare's API host, whatever the secret holds. The
  // emulator points this at a local stub, so only the deployed path is held to
  // the two real Cloudflare shapes.
  const request = process.env.FUNCTIONS_EMULATOR
    ? { url, kind: 'emulator', init: { method: 'POST' } }
    : buildDeployHookRequest(url, {
      token: CF_API_TOKEN.value(),
      branch: CF_BUILD_BRANCH.value(),
    })
  const response = await fetch(request.url, { ...request.init, signal: AbortSignal.timeout(20_000) })
  const body = (await response.text()).slice(0, 500)
  if (!response.ok) throw new Error(`deploy hook HTTP ${response.status} (${request.kind}): ${body}`)
  return { status: response.status, body, kind: request.kind }
}

export const blogRebuildTask = onTaskDispatched(
  {
    region: REGION,
    secrets: [CF_DEPLOY_HOOK_URL, CF_API_TOKEN],
    retryConfig: { maxAttempts: 5, minBackoffSeconds: 60, maxBackoffSeconds: 600 },
    // One at a time, so two tasks can never both decide to fire.
    rateLimits: { maxConcurrentDispatches: 1 },
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore()
    const ref = db.doc(STATE_DOC)
    const firingAt = nowTs()
    const { decision, batch } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const state = snap.exists ? snap.data() : null
      const result = decideRebuild(state, firingAt.toMillis())
      if (result !== 'fire') return { decision: result, batch: null }
      const fired = { reasons: state.reasons || [], pendingSince: state.pendingSince || null }
      tx.set(ref, { pending: false, pendingSince: null, reasons: [], firingAt, firingReasons: fired.reasons }, { merge: true })
      return { decision: result, batch: fired }
    })
    if (decision !== 'fire') {
      logger.info(`blogRebuildTask: ${decision === 'wait' ? 'newer change pending, its task will fire' : 'nothing pending'}`)
      return
    }

    const attempt = (request.retryCount ?? 0) + 1
    if (mode() !== 'live') {
      logger.info(`blogRebuildTask: BLOG_AUTO_REBUILD=${mode()} — would call the deploy hook now`, { reasons: batch.reasons })
      await ref.set({ lastRebuildAt: firingAt, lastRebuildStatus: mode(), lastError: null, lastErrorAt: null }, { merge: true })
      return
    }
    try {
      const result = await callDeployHook()
      logger.info('blogRebuildTask: deploy hook called', { ...result, attempt, reasons: batch.reasons })
      // lastErrorAt goes with lastError: leaving the timestamp behind makes a
      // cleared error look like a fresh one to anything reading it on its own.
      await ref.set({ lastRebuildAt: firingAt, lastRebuildStatus: result.status, lastError: null, lastErrorAt: null }, { merge: true })
    } catch (err) {
      const message = err?.message || String(err)
      logger.error('blogRebuildTask: deploy hook failed; Cloud Tasks will retry', { message, attempt })
      // Put the batch back so the retry fires it (or a newer change's task does),
      // without disturbing a change that arrived in the meantime.
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const state = snap.exists ? snap.data() : {}
        tx.set(ref, {
          pending: true,
          pendingSince: state.pending ? state.pendingSince : batch.pendingSince || firingAt,
          lastChangeAt: state.pending ? state.lastChangeAt : admin.firestore.Timestamp.fromMillis(firingAt.toMillis() - DEBOUNCE_QUIET_MS),
          reasons: [...batch.reasons, ...(state.pending ? state.reasons || [] : [])].slice(-MAX_REASONS),
          lastError: message,
          lastErrorAt: firingAt,
        }, { merge: true })
      })
      throw err
    }
  },
)
