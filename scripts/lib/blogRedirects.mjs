// Pure helpers that turn Firestore `blogRedirects` documents ({from, to}, one
// per old slug, written by the CMS when a published post is renamed) into
// _redirects lines, merged after the hand-written public/_redirects.
// Exercised by tests/blog-redirects.test.mjs.

// Cloudflare's _redirects limits (Workers static assets): 2,000 static and 100
// dynamic rules. See https://developers.cloudflare.com/workers/platform/limits/
export const MAX_STATIC_REDIRECTS = 2000
export const MAX_DYNAMIC_REDIRECTS = 100

const SLUG = /^[a-z0-9-]{3,120}$/

/**
 * Collapses chains and drops redirects that can't or mustn't be served.
 * @param {Array<{from: string, to: string}>} edges  one per `from` slug
 * @param {Set<string>|string[]} liveSlugs  slugs that have a built page
 * @returns {{ redirects: Array<{from: string, to: string}>, skipped: Array<{from: string, to: string, reason: string}> }}
 */
export function resolveBlogRedirects(edges, liveSlugs) {
  const live = liveSlugs instanceof Set ? liveSlugs : new Set(liveSlugs)
  const next = new Map()
  const skipped = []
  for (const edge of edges || []) {
    const from = String(edge?.from || '')
    const to = String(edge?.to || '')
    if (!SLUG.test(from) || !SLUG.test(to) || from === to) {
      skipped.push({ from, to, reason: 'invalid redirect document' })
      continue
    }
    next.set(from, to)
  }

  const redirects = []
  for (const [from, to] of [...next.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // The slug was reused: a real page lives there again and must win.
    if (live.has(from)) {
      skipped.push({ from, to, reason: 'source slug is a live article again' })
      continue
    }
    const seen = new Set([from])
    let target = to
    let cycle = false
    while (!live.has(target) && next.has(target)) {
      if (seen.has(target)) { cycle = true; break }
      seen.add(target)
      target = next.get(target)
    }
    if (cycle) {
      skipped.push({ from, to, reason: 'redirect cycle' })
    } else if (!live.has(target)) {
      // Redirecting to /blog/ instead would be a soft 404; an honest 404 is better.
      skipped.push({ from, to: target, reason: 'final target is not a published article' })
    } else {
      redirects.push({ from, to: target })
    }
  }
  return { redirects, skipped }
}

// Both request forms, mirroring the hand-written aliases in public/_redirects.
export function redirectRules({ from, to }) {
  return [
    { source: `/blog/${from}`, destination: `/blog/${to}/`, code: 301 },
    { source: `/blog/${from}/`, destination: `/blog/${to}/`, code: 301 },
  ]
}

function parseRedirectLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const [source, destination, code] = trimmed.split(/\s+/)
  if (!source || !destination) return null
  return { source, destination, code: code ? Number(code) : 302 }
}

const isDynamic = (source) => source.includes('*') || /(^|\/):[A-Za-z]/.test(source)

/**
 * Appends generated rules to the static _redirects text. Static rules come
 * first and win: a generated rule whose source is already there is dropped
 * (reported as a conflict when the destinations differ).
 */
export function mergeRedirectsFile(staticText, generatedRules) {
  const staticRules = String(staticText || '').split('\n').map(parseRedirectLine).filter(Boolean)
  const bySource = new Map(staticRules.map((rule) => [rule.source, rule]))
  const added = []
  const duplicates = []
  const conflicts = []
  for (const rule of generatedRules) {
    const existing = bySource.get(rule.source)
    if (existing) {
      if (existing.destination === rule.destination) duplicates.push(rule)
      else conflicts.push({ rule, existing })
      continue
    }
    bySource.set(rule.source, rule)
    added.push(rule)
  }

  const all = [...staticRules, ...added]
  const dynamicCount = all.filter((rule) => isDynamic(rule.source)).length
  const staticCount = all.length - dynamicCount

  let text = String(staticText || '').replace(/\s*$/, '\n')
  if (added.length) {
    text += '\n# ── Generated at build time from Firestore `blogRedirects` (CMS slug renames).\n'
    text += '# Do not edit here; see scripts/lib/blogRedirects.mjs.\n'
    for (const rule of added) text += `${rule.source} ${rule.destination} ${rule.code}\n`
  }
  return { text, added, duplicates, conflicts, staticCount, dynamicCount }
}
