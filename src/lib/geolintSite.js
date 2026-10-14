/** Pure helpers for the whole-site scan and the badge embed code (no network, no React). */

const percent = (report) => {
  const max = report?.score?.evaluatedMax
  const earned = report?.score?.earned
  return typeof earned === 'number' && max > 0 ? Math.round((earned / max) * 1000) / 10 : null
}

const trimSlash = (u) => String(u || '').replace(/#.*$/, '').replace(/\/$/, '')

/** The pages still to audit: the sample minus the page that was already audited, in order. */
export function pagesToScan(plan, auditedUrl, limit = 8) {
  const done = trimSlash(auditedUrl)
  const seen = new Set([done])
  const out = []
  for (const page of plan?.pages || []) {
    const key = trimSlash(page)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(page)
    if (out.length >= limit - 1) break
  }
  return out
}

/** One row per page: score, grade-relevant counts and the top fixes. */
export function rowFromReport(url, report) {
  return {
    url,
    status: 'done',
    percent: percent(report),
    fixes: (Array.isArray(report?.remediation) ? report.remediation : []).slice(0, 3).map((r) => ({ id: r.id, title: r.title, priority: r.priority })),
  }
}

/** Site-wide summary of finished rows: average score, weakest pages and the fixes that repeat. */
export function summarizeSiteScan(rows) {
  const done = rows.filter((r) => r.status === 'done' && typeof r.percent === 'number')
  const failed = rows.filter((r) => r.status === 'failed').length
  if (done.length === 0) return { pages: 0, failed, average: null, weakest: [], repeated: [] }
  const average = Math.round((done.reduce((s, r) => s + r.percent, 0) / done.length) * 10) / 10
  const weakest = [...done].sort((a, b) => a.percent - b.percent).slice(0, 3)
  const counts = new Map()
  for (const row of done) for (const f of row.fixes) {
    const c = counts.get(f.id) || { id: f.id, title: f.title, pages: 0 }
    c.pages += 1
    counts.set(f.id, c)
  }
  const repeated = [...counts.values()].filter((c) => c.pages >= 2).sort((a, b) => b.pages - a.pages).slice(0, 4)
  return { pages: done.length, failed, average, weakest, repeated }
}

/** HTML and Markdown embed code for the score badge. */
export function badgeEmbed({ imageUrl, toolUrl, score }) {
  const alt = `GeoLint AI-readiness score ${score}/100`
  return {
    html: `<a href="${toolUrl}" target="_blank" rel="noopener"><img src="${imageUrl}" alt="${alt}" height="22"></a>`,
    markdown: `[![${alt}](${imageUrl})](${toolUrl})`,
  }
}
