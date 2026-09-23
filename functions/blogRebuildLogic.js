// Pure decision logic for the blog auto-rebuild (see blogRebuild.js). Kept free
// of Firebase imports so tests/blog-rebuild-logic.test.mjs can exercise it
// directly with plain objects.

// Fields that change on every save without changing anything the build renders.
// updatedAt does feed dateModified / sitemap lastmod, but only at day
// granularity, and it is always accompanied by a real edit when it matters;
// a save that changes nothing else is a no-op for the site.
const IGNORED_FIELDS = new Set(['updatedAt', 'createdBy', 'createdByEmail'])

// Timestamps from the Admin SDK (toMillis), from the emulator / REST shape
// ({_seconds,_nanoseconds} or {seconds,nanoseconds}), and Dates all reduce to
// milliseconds so the fingerprint is stable across representations.
function normalizeValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value?.toMillis === 'function') return { $ts: value.toMillis() }
  if (value instanceof Date) return { $ts: value.getTime() }
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (typeof value === 'object') {
    if ('_seconds' in value && '_nanoseconds' in value && Object.keys(value).length === 2) {
      return { $ts: value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6) }
    }
    if ('seconds' in value && 'nanoseconds' in value && Object.keys(value).length === 2) {
      return { $ts: value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6) }
    }
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = normalizeValue(value[key])
    return out
  }
  return value
}

export function outputFingerprint(data) {
  if (!data) return ''
  const relevant = {}
  for (const key of Object.keys(data).sort()) {
    if (!IGNORED_FIELDS.has(key)) relevant[key] = data[key]
  }
  return JSON.stringify(normalizeValue(relevant))
}

const isPublished = (data) => data?.status === 'published'

/**
 * Decides whether a blogPosts write changes the public site.
 * @returns {{ action: 'ignore'|'publish'|'unpublish'|'delete'|'content-change', reason: string }}
 */
export function classifyBlogPostChange(before, after) {
  const was = isPublished(before)
  const is = isPublished(after)
  if (!was && !is) return { action: 'ignore', reason: 'draft-only change' }
  if (!was && is) return { action: 'publish', reason: before ? 'draft published' : 'created as published' }
  if (was && !after) return { action: 'delete', reason: 'published post deleted' }
  if (was && !is) return { action: 'unpublish', reason: `status ${after.status}` }
  if (outputFingerprint(before) === outputFingerprint(after)) {
    return { action: 'ignore', reason: 'published post saved without changes' }
  }
  return { action: 'content-change', reason: 'published post edited' }
}

// Any real change to a blogRedirects document changes dist/_redirects.
export function classifyRedirectChange(before, after) {
  if (!before && !after) return { action: 'ignore', reason: 'no-op' }
  if (before && after && before.from === after.from && before.to === after.to) {
    return { action: 'ignore', reason: 'redirect saved without changes' }
  }
  if (!after) return { action: 'redirect-change', reason: `redirect ${before.from} removed` }
  return { action: 'redirect-change', reason: `redirect ${after.from} → ${after.to}` }
}

export const DEBOUNCE_QUIET_MS = 120_000
export const DEBOUNCE_MAX_WAIT_MS = 10 * 60_000

const toMillis = (value) => (value == null ? null : typeof value === 'number' ? value : normalizeValue(value)?.$ts ?? null)

/**
 * Trailing debounce: fire once changes have been quiet for `quietMs`, or once
 * the oldest pending change is `maxWaitMs` old so continuous editing can't
 * starve the rebuild. Tasks that run earlier just exit — the task enqueued by
 * the latest change is still on its way.
 * @returns {'not-pending'|'wait'|'fire'}
 */
export function decideRebuild(state, nowMs, { quietMs = DEBOUNCE_QUIET_MS, maxWaitMs = DEBOUNCE_MAX_WAIT_MS } = {}) {
  if (!state?.pending) return 'not-pending'
  const last = toMillis(state.lastChangeAt)
  const first = toMillis(state.pendingSince) ?? last
  if (last == null) return 'fire'
  // Small tolerance: Cloud Tasks can dispatch a task slightly before its
  // scheduled time, and that task must not be the one that gives up.
  if (nowMs - last >= quietMs - 5_000) return 'fire'
  if (first != null && nowMs - first >= maxWaitMs) return 'fire'
  return 'wait'
}
