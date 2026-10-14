/** Pure helpers for the whole-site scan and the badge embed code (no network, no React). */

/** HTML and Markdown embed code for the score badge. */
export function badgeEmbed({ imageUrl, toolUrl, score }) {
  const alt = `GeoLint AI-readiness score ${score}/100`
  return {
    html: `<a href="${toolUrl}" target="_blank" rel="noopener"><img src="${imageUrl}" alt="${alt}" height="22"></a>`,
    markdown: `[![${alt}](${imageUrl})](${toolUrl})`,
  }
}

/** State for a streamed whole-site audit, built one event at a time. Pure. */
export function initialSiteState() {
  return { origin: '', maxPages: 0, sitemapUrls: 0, sitemapFiles: 0, site: null, pages: [], queued: 0, summary: null, crawl: null, durationMs: 0, savedId: '' }
}

export function reduceSiteEvent(state, e) {
  switch (e?.type) {
    case 'start': return { ...state, origin: e.origin, maxPages: e.maxPages }
    case 'discovered': return { ...state, sitemapUrls: e.sitemapUrls, sitemapFiles: e.sitemapFiles }
    case 'site': return { ...state, site: { botAccess: e.botAccess, domain: e.domain, llmsTxt: e.llmsTxt } }
    case 'page': return { ...state, pages: [...state.pages, e.page], queued: e.queued }
    case 'done': return { ...state, summary: e.summary, crawl: e.crawl, durationMs: e.durationMs, queued: 0 }
    case 'saved': return { ...state, savedId: e.id }
    default: return state
  }
}

/** Share of the work done, 0-100, while the crawl is running (the queue grows as links are found). */
export function siteProgress(state) {
  const done = state.pages.length
  const total = Math.min(state.maxPages || Infinity, done + state.queued)
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One row per audited page, for spreadsheets. */
export function pagesCsv(pages) {
  const head = ['URL', 'Status', 'Score %', 'Points', 'Max', 'Indexable', 'Rendered', 'Depth', 'In sitemap', 'Title', 'Words', 'Problems', 'Top problems']
  const rows = pages.map((p) => [
    p.finalUrl || p.url, p.status ?? '', p.score?.percent ?? '', p.score?.earned ?? '', p.score?.evaluatedMax ?? '',
    p.indexable ? 'yes' : 'no', p.rendered ? 'yes' : 'no', p.depth, p.inSitemap ? 'yes' : 'no', p.title ?? '', p.meta?.words ?? '',
    (p.problems || []).length, (p.problems || []).slice(0, 3).map((x) => x.title).join(' | ') || p.error || '',
  ])
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

/** Pages for the table: filtered, searched and sorted. */
export function filterPages(pages, { filter = 'all', query = '', sort = 'score-asc' } = {}) {
  const q = query.trim().toLowerCase()
  let list = pages.filter((p) => {
    if (filter === 'errors' && p.score) return false
    if (filter === 'poor' && !(p.score && p.score.percent < 50)) return false
    if (filter === 'indexable' && !p.indexable) return false
    if (q && !`${p.finalUrl || p.url} ${p.title || ''}`.toLowerCase().includes(q)) return false
    return true
  })
  const val = (p) => (p.score ? p.score.percent : -1)
  list = [...list].sort((a, b) => (sort === 'score-desc' ? val(b) - val(a) : sort === 'url' ? String(a.finalUrl || a.url).localeCompare(String(b.finalUrl || b.url)) : val(a) - val(b)))
  return list
}
