/**
 * The extra Google PageSpeed data beyond the performance score: the four Lighthouse scores, the real-user
 * Core Web Vitals verdict, the screenshot and filmstrip, what slows the page, the page weight and the file fixes.
 * Every reader is defensive: PageSpeed leaves audits out when they do not apply, and its shape changes between versions.
 */
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null)
const arr = (v) => (Array.isArray(v) ? v : [])
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const round = (n) => (n === null ? null : Math.round(n))
const IMG = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/

const CAT_KEYS = [['performance', 'performance'], ['accessibility', 'accessibility'], ['best-practices', 'bestPractices'], ['seo', 'seo']]

export function parseCategories(lh) {
  const cats = obj(lh?.categories) || {}
  const out = {}
  for (const [id, key] of CAT_KEYS) {
    const s = num(obj(cats[id])?.score)
    out[key] = s === null ? null : Math.round(s * 100)
  }
  return out
}

/** "example.com/img/hero.jpg?x=1" - short enough for a phone screen, never a data: URI. */
export function shortUrl(u) {
  const s = String(u ?? '')
  if (!s || /^data:/i.test(s)) return ''
  try {
    const x = new URL(s)
    const path = (x.pathname === '/' ? '' : x.pathname).replace(/\/+$/, '')
    const tail = path.length > 38 ? `/…${path.slice(-36)}` : path
    return `${x.hostname.replace(/^www\./, '')}${tail}`
  } catch {
    return clip(s, 60)
  }
}

const VITALS = [['lcp', 'LARGEST_CONTENTFUL_PAINT_MS'], ['inp', 'INTERACTION_TO_NEXT_PAINT'], ['cls', 'CUMULATIVE_LAYOUT_SHIFT_SCORE'], ['fcp', 'FIRST_CONTENTFUL_PAINT_MS'], ['ttfb', 'EXPERIMENTAL_TIME_TO_FIRST_BYTE']]
const CAT = { FAST: 'good', AVERAGE: 'needs-improvement', SLOW: 'poor' }

/** Real-user data (Chrome UX Report): the pass/fail verdict and the good / needs work / poor share of visits per metric. */
export function parseFieldVitals(root) {
  let src = obj(root?.loadingExperience)
  let origin = false
  if (!obj(src?.metrics) || Object.keys(src.metrics).length === 0) {
    src = obj(root?.originLoadingExperience)
    origin = true
  }
  const fm = obj(src?.metrics)
  if (!fm || Object.keys(fm).length === 0) return null
  const metrics = {}
  for (const [key, api] of VITALS) {
    const m = obj(fm[api])
    if (!m) continue
    const d = arr(m.distributions).map((x) => num(obj(x)?.proportion))
    if (d.length < 3 || d.slice(0, 3).some((x) => x === null)) continue
    const pct = d.slice(0, 3).map((x) => Math.round(x * 100))
    const p = num(m.percentile)
    metrics[key] = { good: pct[0], mid: pct[1], poor: pct[2], p75: key === 'cls' ? (p === null ? null : Math.round(p) / 100) : p, rating: CAT[String(m.category ?? '').toUpperCase()] || null }
  }
  if (Object.keys(metrics).length === 0) return null
  const core = ['lcp', 'inp', 'cls'].filter((k) => metrics[k]?.rating)
  // Google passes a page only when every Core Web Vital it has data for is good (and LCP and CLS are present)
  const passed = metrics.lcp?.rating && metrics.cls?.rating ? core.every((k) => metrics[k].rating === 'good') : null
  return { passed, origin, metrics }
}

export function parseMedia(audits) {
  const shot = obj(obj(audits['final-screenshot'])?.details)
  const screenshot = typeof shot?.data === 'string' && IMG.test(shot.data) ? shot.data : null
  const items = arr(obj(obj(audits['screenshot-thumbnails'])?.details)?.items)
  const filmstrip = items
    .map((i) => ({ ms: round(num(obj(i)?.timing)), data: obj(i)?.data }))
    .filter((f) => f.ms !== null && typeof f.data === 'string' && IMG.test(f.data))
    .slice(0, 10)
  return screenshot || filmstrip.length ? { screenshot, filmstrip } : null
}

const nodeOf = (n) => {
  const node = obj(n)
  if (!node) return null
  const label = clip(node.nodeLabel || node.selector || node.snippet, 90)
  return label ? { label, selector: clip(node.selector, 120), snippet: clip(node.snippet, 160) } : null
}
const firstNode = (details) => {
  for (const it of arr(details?.items)) {
    const direct = nodeOf(obj(it)?.node)
    if (direct) return direct
    for (const sub of arr(obj(it)?.items)) { const n = nodeOf(obj(sub)?.node); if (n) return n }
  }
  return null
}
const entityName = (e) => clip(typeof e === 'string' ? e : obj(e)?.text ?? obj(e)?.url, 60)

/** What makes the page slow, in plain things: the biggest element, what jumps, third parties, blocking files. */
export function parseCauses(audits) {
  const lcpDetails = obj(obj(audits['largest-contentful-paint-element'])?.details)
  const lcpEl = firstNode(lcpDetails)
  let lcpPhases = []
  for (const it of arr(lcpDetails?.items)) {
    const rows = arr(obj(it)?.items).filter((r) => typeof obj(r)?.phase === 'string' && num(obj(r)?.timing) !== null)
    if (rows.length) lcpPhases = rows.map((r) => ({ phase: clip(r.phase, 40), ms: Math.round(r.timing) }))
  }
  const shiftAudit = obj(audits['layout-shifts']) || obj(audits['layout-shift-elements'])
  const shifts = arr(obj(shiftAudit?.details)?.items)
    .map((i) => ({ el: nodeOf(obj(i)?.node), score: num(obj(i)?.score) }))
    .filter((s) => s.el)
    .slice(0, 3)
    .map((s) => ({ ...s.el, score: s.score === null ? null : Math.round(s.score * 1000) / 1000 }))
  const third = arr(obj(obj(audits['third-party-summary'])?.details)?.items)
    .map((i) => { const x = obj(i) || {}; return { name: entityName(x.entity), blockingMs: round(num(x.blockingTime)), mainThreadMs: round(num(x.mainThreadTime)), kb: num(x.transferSize) === null ? null : Math.round(x.transferSize / 1024) } })
    .filter((t) => t.name)
    .sort((a, b) => (b.blockingMs ?? 0) - (a.blockingMs ?? 0) || (b.mainThreadMs ?? 0) - (a.mainThreadMs ?? 0))
    .filter((t) => (t.blockingMs ?? 0) > 0 || (t.mainThreadMs ?? 0) >= 50)
    .slice(0, 5)
  const blockAudit = obj(audits['render-blocking-resources']) || obj(audits['render-blocking-insight'])
  const blocking = arr(obj(blockAudit?.details)?.items)
    .map((i) => { const x = obj(i) || {}; return { url: shortUrl(x.url), ms: round(num(x.wastedMs)), kb: num(x.totalBytes) === null ? null : Math.round(x.totalBytes / 1024) } })
    .filter((b) => b.url)
    .slice(0, 5)
  const any = lcpEl || shifts.length || third.length || blocking.length
  return any ? { lcpElement: lcpEl, lcpPhases, shifts, thirdParty: third, blocking } : null
}

/** How heavy the page is: bytes, requests, script time, DOM size and where the main thread spends its time. */
export function parseWeight(audits) {
  const val = (id) => num(obj(audits[id])?.numericValue)
  const bytes = val('total-byte-weight')
  const requests = arr(obj(obj(audits['network-requests'])?.details)?.items).length || null
  const scriptMs = val('bootup-time')
  const dom = val('dom-size')
  const groups = arr(obj(obj(audits['mainthread-work-breakdown'])?.details)?.items)
    .map((i) => ({ label: clip(obj(i)?.groupLabel || obj(i)?.group, 40), ms: round(num(obj(i)?.duration)) }))
    .filter((g) => g.label && g.ms !== null && g.ms > 0)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)
  if (bytes === null && requests === null && scriptMs === null && dom === null && groups.length === 0) return null
  return { totalKb: bytes === null ? null : Math.round(bytes / 1024), requests, scriptMs: round(scriptMs), domNodes: round(dom), mainThread: groups }
}

const FIX_IDS = [
  ['modern-image-formats', 'Images in an old format (use WebP or AVIF)'],
  ['uses-optimized-images', 'Images that are not compressed enough'],
  ['uses-responsive-images', 'Images bigger than the screen needs'],
  ['offscreen-images', 'Images loaded before they are needed'],
  ['unused-javascript', 'JavaScript that is never used'],
  ['unused-css-rules', 'CSS that is never used'],
  ['uses-text-compression', 'Text files sent without compression'],
  ['uses-long-cache-ttl', 'Files that are not cached for long'],
  ['unminified-javascript', 'JavaScript that is not minified'],
  ['unminified-css', 'CSS that is not minified'],
  ['efficient-animated-content', 'Heavy animated GIFs'],
]

/** The file-level fixes Lighthouse found, with the biggest offending files. Only audits that actually failed are returned. */
export function parseFixes(audits) {
  const out = []
  for (const [id, label] of FIX_IDS) {
    const a = obj(audits[id])
    if (!a) continue
    const score = num(a.score)
    const d = obj(a.details)
    const items = arr(d?.items)
    const kb = num(d?.overallSavingsBytes)
    const ms = num(d?.overallSavingsMs)
    const failed = (score !== null && score < 0.9) || ((kb ?? 0) >= 10240) || ((ms ?? 0) >= 100)
    if (!failed || items.length === 0) continue
    out.push({
      id, label,
      count: items.length,
      savingsKb: kb === null ? null : Math.round(kb / 1024),
      savingsMs: ms === null ? null : Math.round(ms),
      files: items.map((i) => shortUrl(obj(i)?.url)).filter(Boolean).slice(0, 3),
    })
  }
  return out.sort((x, y) => (y.savingsKb ?? 0) - (x.savingsKb ?? 0))
}

/** A copy without the screenshots: the history in localStorage keeps scores and numbers only (pictures would fill the quota). */
export function stripMedia(run) {
  if (!run || typeof run !== 'object' || !('media' in run)) return run
  const { media, ...rest } = run // eslint-disable-line no-unused-vars
  return rest
}
