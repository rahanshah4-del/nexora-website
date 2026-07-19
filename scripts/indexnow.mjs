// IndexNow build-time submitter (Node / build environment).
//
// Notifies IndexNow-compatible search engines (Bing, Yandex, Seznam, Naver…)
// whenever the generated sitemap changes at build time. This is the reliable,
// CORS-free integration point for a static Cloudflare Pages / Vite site: the
// sitemap generator computes which public URLs were added, updated or removed
// and hands them here for a single batched submission.
//
// Design goals (see requirements):
//   - Batch every changed URL into ONE request (chunked at the API limit).
//   - Retry failed requests with exponential backoff + jitter.
//   - Never throw into the build: submission is best-effort, failures are logged.
//   - Log only in development / when submission is skipped-for-preview.
//   - Skip duplicate submissions: identical URL is only ever sent once per run.

export const INDEXNOW_HOST = 'nexorasolution.online'
export const INDEXNOW_KEY = 'e6dedaf56d5b4faab50a069a41eeb59e'
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

// IndexNow allows up to 10 000 URLs per request; stay comfortably under.
const MAX_URLS_PER_REQUEST = 10000
const MAX_RETRIES = 4
const BASE_BACKOFF_MS = 500

// Actual network submission is enabled on the Cloudflare Pages production build
// (CF_PAGES is set in that environment) or when explicitly requested locally via
// INDEXNOW_SUBMIT=true. It can always be turned off with INDEXNOW_DISABLE=true.
// Everywhere else we run in "dry-run" mode so local dev builds never ping the API.
function submissionEnabled() {
  if (String(process.env.INDEXNOW_DISABLE || '').toLowerCase() === 'true') return false
  if (String(process.env.INDEXNOW_SUBMIT || '').toLowerCase() === 'true') return true
  return Boolean(process.env.CF_PAGES) || process.env.NODE_ENV === 'production'
}

function isDev() {
  return !submissionEnabled()
}

function log(...args) {
  if (isDev()) console.log('[IndexNow]', ...args)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Keep only well-formed, same-host, de-duplicated URLs. IndexNow rejects a batch
// outright if any URL belongs to a different host than the key's host.
export function normalizeUrls(urls) {
  const seen = new Set()
  const clean = []
  for (const raw of Array.isArray(urls) ? urls : []) {
    const value = String(raw || '').trim()
    if (!value) continue
    let parsed
    try {
      parsed = new URL(value)
    } catch {
      continue
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue
    if (parsed.hostname !== INDEXNOW_HOST) continue
    const normalized = parsed.toString()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    clean.push(normalized)
  }
  return clean
}

function buildPayload(urlList) {
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  }
}

async function postBatch(urlList) {
  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify(buildPayload(urlList)),
      })
      // 200 (accepted) and 202 (accepted, pending) are both success.
      // 4xx are permanent client errors — retrying will not help, so stop.
      if (response.ok || response.status === 202) {
        return { ok: true, status: response.status }
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { ok: false, status: response.status, permanent: true }
      }
      lastError = new Error(`IndexNow responded ${response.status}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < MAX_RETRIES) {
      const backoff = BASE_BACKOFF_MS * 2 ** attempt
      const jitter = Math.floor(backoff * 0.25 * ((attempt % 3) + 1) / 3)
      await delay(backoff + jitter)
    }
  }
  return { ok: false, error: lastError }
}

// Submit a set of changed URLs to IndexNow. Best-effort: resolves with a summary
// and never throws, so it can be awaited inside the build without breaking it.
export async function submitIndexNow(urls, { reason = 'sitemap' } = {}) {
  const urlList = normalizeUrls(urls)
  if (!urlList.length) {
    log(`Nothing to submit (${reason}); skipping.`)
    return { ok: true, submitted: 0, skipped: true }
  }

  if (!submissionEnabled()) {
    log(`Dry-run (${reason}): would submit ${urlList.length} URL(s):`)
    urlList.forEach((u) => log(`  • ${u}`))
    return { ok: true, submitted: 0, dryRun: true, urlList }
  }

  let submitted = 0
  let failed = 0
  for (let i = 0; i < urlList.length; i += MAX_URLS_PER_REQUEST) {
    const batch = urlList.slice(i, i + MAX_URLS_PER_REQUEST)
    const result = await postBatch(batch)
    if (result.ok) {
      submitted += batch.length
    } else {
      failed += batch.length
      // Never fail the build — record and move on.
      console.warn(`[IndexNow] Batch submission failed (${reason}):`, result.status || result.error?.message || 'unknown error')
    }
  }
  return { ok: failed === 0, submitted, failed, reason }
}
