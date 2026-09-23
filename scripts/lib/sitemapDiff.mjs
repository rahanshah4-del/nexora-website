// Which sitemap URLs to tell IndexNow about after a deploy, given the sitemap
// that was live before the deploy and the one just deployed.
// Exercised by tests/sitemap-diff.test.mjs.

export function parseSitemapEntries(xml) {
  const entries = new Map()
  if (!xml) return entries
  const urlRegex = /<url>([\s\S]*?)<\/url>/g
  let block
  while ((block = urlRegex.exec(xml))) {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block[1])?.[1]?.trim()
    if (!loc) continue
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block[1])?.[1]?.trim() || ''
    entries.set(loc, lastmod)
  }
  return entries
}

// /blog/<slug>/ — an article page, whose lastmod is its real updatedDate.
// Every other route's lastmod is just the build date, so a lastmod change there
// means nothing and resubmitting them would spam IndexNow on every rebuild.
const isArticleUrl = (loc) => /\/blog\/[^/]+\/$/.test(new URL(loc).pathname)
  && !/\/blog\/(page|category)\//.test(new URL(loc).pathname)

/**
 * @returns {{ added: string[], changed: string[], removed: string[], urls: string[] }}
 *   `urls` is the de-duplicated submission list: added + removed + articles
 *   whose lastmod moved, plus the /blog/ index whenever any article changed.
 */
export function diffSitemaps(previousXml, currentXml) {
  const previous = parseSitemapEntries(previousXml)
  const current = parseSitemapEntries(currentXml)
  const added = []
  const changed = []
  const removed = []
  for (const [loc, lastmod] of current) {
    if (!previous.has(loc)) added.push(loc)
    else if (previous.get(loc) !== lastmod && isArticleUrl(loc)) changed.push(loc)
  }
  for (const loc of previous.keys()) {
    if (!current.has(loc)) removed.push(loc)
  }
  const urls = new Set([...added, ...changed, ...removed])
  const blogTouched = [...urls].some((loc) => isArticleUrl(loc))
  if (blogTouched) {
    const blogIndex = [...current.keys()].find((loc) => new URL(loc).pathname === '/blog/')
    if (blogIndex) urls.add(blogIndex)
  }
  return { added, changed, removed, urls: [...urls] }
}
