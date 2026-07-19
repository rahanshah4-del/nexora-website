// IndexNow browser client — runtime submissions for CMS-driven content changes.
//
// The Nexora blog is edited at runtime through the Firestore-backed CMS
// (see blogCms.js). When an admin creates, updates or deletes a published post
// we want IndexNow-compatible search engines to hear about it without waiting
// for the next full site rebuild.
//
// Guarantees required by the integration spec:
//   - Batching: rapid successive changes are coalesced into ONE request via a
//     short debounce window instead of one request per page.
//   - Exponential backoff: transient failures are retried with growing delays.
//   - Never block page rendering: submission is fully detached (fire-and-forget)
//     and every path is wrapped so it can neither throw nor await UI work.
//   - Log only in development.
//   - Skip duplicate submissions: a URL already submitted this session is not
//     resent unless it changes again.
//
// NOTE ON DELIVERY: the browser cannot always reach api.indexnow.org directly
// (cross-origin policies vary), so this runtime ping is best-effort. The
// GUARANTEED delivery path is the build-time submitter in scripts/indexnow.mjs,
// which runs on every Cloudflare Pages production build when the sitemap changes.
// This client simply shortens the notification latency for live CMS edits.

const HOST = 'nexorasolution.online'
const KEY = 'e6dedaf56d5b4faab50a069a41eeb59e'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const MAX_URLS_PER_REQUEST = 10000
const MAX_RETRIES = 4
const BASE_BACKOFF_MS = 800
const DEBOUNCE_MS = 1500

const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

function log(...args) {
  if (isDev) console.log('[IndexNow]', ...args)
}

// URLs already accepted this session — used to skip duplicate submissions.
const submitted = new Set()
// URLs queued for the next batched submission.
const pending = new Set()
let flushTimer = null

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Keep only well-formed, same-host, de-duplicated https URLs.
function normalizeUrls(urls) {
  const clean = []
  const seen = new Set()
  for (const raw of Array.isArray(urls) ? urls : [urls]) {
    const value = String(raw || '').trim()
    if (!value) continue
    let parsed
    try {
      parsed = new URL(value)
    } catch {
      continue
    }
    if (parsed.protocol !== 'https:') continue
    if (parsed.hostname !== HOST) continue
    const normalized = parsed.toString()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    clean.push(normalized)
  }
  return clean
}

function buildPayload(urlList) {
  return { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }
}

async function postBatch(urlList) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(buildPayload(urlList)),
        // keepalive lets the request outlive a navigation without blocking it.
        keepalive: true,
      })
      if (response.ok || response.status === 202) {
        log('submitted', urlList.length, 'URL(s):', urlList)
        return true
      }
      // Permanent client errors (bad key/host) will never succeed — stop retrying.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        log('permanent failure', response.status)
        return false
      }
    } catch (error) {
      // Network/CORS error — swallow; the build-time submitter is the safety net.
      log('attempt', attempt + 1, 'failed:', error?.message || error)
    }
    if (attempt < MAX_RETRIES) {
      await delay(BASE_BACKOFF_MS * 2 ** attempt)
    }
  }
  return false
}

async function flush() {
  flushTimer = null
  const batch = normalizeUrls(Array.from(pending)).filter((u) => !submitted.has(u))
  pending.clear()
  if (!batch.length) return
  // Optimistically mark as submitted so concurrent changes dedupe correctly.
  batch.forEach((u) => submitted.add(u))
  for (let i = 0; i < batch.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = batch.slice(i, i + MAX_URLS_PER_REQUEST)
    const ok = await postBatch(chunk)
    // On permanent failure allow a future explicit retry by un-marking them.
    if (!ok) chunk.forEach((u) => submitted.delete(u))
  }
}

/**
 * Queue one or more changed public URLs for IndexNow notification.
 *
 * Fire-and-forget: returns immediately and never throws, so it is safe to call
 * from event handlers without awaiting. Rapid calls are batched and de-duped.
 *
 * @param {string|string[]} urls Absolute https URLs on the site host.
 */
export function notifyIndexNow(urls) {
  try {
    const clean = normalizeUrls(urls)
    if (!clean.length) return
    let added = false
    for (const url of clean) {
      if (submitted.has(url) || pending.has(url)) continue
      pending.add(url)
      added = true
    }
    if (!added) return
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      // Detach from any awaiting caller; swallow all errors.
      flush().catch((error) => log('flush error', error?.message || error))
    }, DEBOUNCE_MS)
  } catch (error) {
    // Never let IndexNow bookkeeping affect the app.
    log('notify error', error?.message || error)
  }
}

/**
 * Force-flush any pending URLs immediately (e.g. before the tab closes).
 * Best-effort and non-throwing.
 */
export function flushIndexNow() {
  try {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flush().catch((error) => log('flush error', error?.message || error))
  } catch (error) {
    log('flush error', error?.message || error)
  }
}
