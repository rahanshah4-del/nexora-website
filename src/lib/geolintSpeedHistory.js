/**
 * Remembers the last speed tests of a page in this browser, so the next test can show the difference
 * ("was 41, now 72"). Nothing leaves the browser. Storage can be blocked, so every access is guarded.
 */

const PREFIX = 'geolint:speed:'

/** The same page written in different ways shares one key: host and path, lower case, no www and no trailing slash. */
export function speedKey(url) {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`)
    return `${PREFIX}${u.hostname.replace(/^www\./i, '').toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}`
  } catch {
    return `${PREFIX}${String(url || '').toLowerCase()}`
  }
}

const defaultStorage = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null } }

/**
 * Takes a finished test and returns what to show: `after` is this test and `before` the one before it (or null).
 * A repeated result (same testedAt, e.g. served from the server's cache) does not push itself into the past.
 */
export function compareWithPrevious(url, result, storage = defaultStorage()) {
  const key = speedKey(url)
  let saved = { last: null, prev: null }
  try {
    const raw = JSON.parse(storage?.getItem(key) || 'null')
    if (raw && typeof raw === 'object') saved = { last: raw.last || null, prev: raw.prev || null }
  } catch { /* unreadable: start fresh */ }
  const same = saved.last && saved.last.testedAt === result.testedAt
  const next = same ? saved : { last: result, prev: saved.last }
  if (!same) { try { storage?.setItem(key, JSON.stringify(next)) } catch { /* private mode: no history, the test still shows */ } }
  return { before: next.prev, after: result }
}
