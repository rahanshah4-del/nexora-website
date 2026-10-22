// Pure logic for scheduled blog publishing (see blogScheduler.js). No Firebase
// imports, so tests/blog-scheduler-logic.test.mjs can run it with plain objects.
//
// A post saved with status 'scheduled' and a scheduledAt time stays private
// (firestore.rules only lets the public read status 'published'). The scheduler
// flips it to 'published' shortly before scheduledAt. That write is an ordinary
// draft → published change, so the existing blogPostsWritten trigger queues the
// Cloudflare rebuild; nothing else needs to know about scheduling.

// A rebuild takes a few minutes (2 min debounce in blogRebuild.js plus the
// Cloudflare build), so posts are flipped this long before their time to be
// live at about the time the author chose.
export const PUBLISH_LEAD_MS = 5 * 60_000

export function toMillis(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  if (typeof value.seconds === 'number') return value.seconds * 1000
  if (typeof value._seconds === 'number') return value._seconds * 1000
  return null
}

/**
 * @param {{slug: string, data: object}[]} posts documents with status 'scheduled'
 * @returns {{slug: string, scheduledAtMs: number}[]} due posts, earliest first
 */
export function selectDuePosts(posts, nowMs, leadMs = PUBLISH_LEAD_MS) {
  return posts
    .map(({ slug, data }) => ({ slug, status: data?.status, scheduledAtMs: toMillis(data?.scheduledAt) }))
    .filter((post) => post.status === 'scheduled' && post.scheduledAtMs !== null && post.scheduledAtMs - leadMs <= nowMs)
    .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)
    .map(({ slug, scheduledAtMs }) => ({ slug, scheduledAtMs }))
}
