/**
 * Google PageSpeed Insights straight from the visitor's browser. Used when the GeoLint server cannot run the test
 * (not deployed, no API key, shared quota used up). Google allows browser calls, and each visitor has their own quota.
 * Returns the same shape as the server: { url, testedAt, mobile, desktop }.
 */
const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const THRESHOLDS = { lcpMs: [2500, 4000], fcpMs: [1800, 3000], tbtMs: [200, 600], cls: [0.1, 0.25], speedIndexMs: [3400, 5800], ttfbMs: [800, 1800] }

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const rate = (k, v) => (v === null ? null : v <= THRESHOLDS[k][0] ? 'good' : v > THRESHOLDS[k][1] ? 'poor' : 'needs-improvement')

export function parsePageSpeed(raw) {
  const root = obj(raw)
  const lh = obj(root?.lighthouseResult)
  const score = num(obj(obj(lh?.categories)?.performance)?.score)
  if (!lh || score === null) return null
  const audits = obj(lh.audits) || {}
  const val = (id) => num(obj(audits[id])?.numericValue)
  const round = (n) => (n === null ? null : Math.round(n))
  const cls = val('cumulative-layout-shift')
  const metrics = {
    lcpMs: round(val('largest-contentful-paint')),
    fcpMs: round(val('first-contentful-paint')),
    tbtMs: round(val('total-blocking-time')),
    cls: cls === null ? null : Math.round(cls * 1000) / 1000,
    speedIndexMs: round(val('speed-index')),
    ttfbMs: round(val('server-response-time')),
  }
  const ratings = Object.fromEntries(Object.keys(metrics).map((k) => [k, rate(k, metrics[k])]))
  const opportunities = []
  for (const a of Object.values(audits)) {
    const audit = obj(a)
    const details = obj(audit?.details)
    if (!audit || details?.type !== 'opportunity') continue
    const ms = num(details.overallSavingsMs)
    const bytes = num(details.overallSavingsBytes)
    if ((ms ?? 0) < 100 && (bytes ?? 0) < 10000) continue
    opportunities.push({ title: clip(audit.title, 120), savingsMs: ms === null ? null : Math.round(ms), savingsKb: bytes === null ? null : Math.round(bytes / 1024) })
  }
  opportunities.sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
  const le = obj(root?.loadingExperience)
  const fm = obj(le?.metrics)
  let field = null
  if (fm && Object.keys(fm).length > 0) {
    const p = (k) => num(obj(fm[k])?.percentile)
    const clsRaw = p('CUMULATIVE_LAYOUT_SHIFT_SCORE')
    const cat = String(le?.overall_category ?? '').toLowerCase()
    field = { category: ['fast', 'average', 'slow'].includes(cat) ? cat : null, lcpMs: p('LARGEST_CONTENTFUL_PAINT_MS'), inpMs: p('INTERACTION_TO_NEXT_PAINT'), cls: clsRaw === null ? null : Math.round(clsRaw) / 100 }
  }
  return { score: Math.round(score * 100), metrics, ratings, opportunities: opportunities.slice(0, 6), field }
}

async function runStrategy(url, strategy, timeoutMs) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ url, strategy, category: 'performance' })}`, { signal: ctl.signal })
    if (res.status === 429) throw new Error('Google\'s speed test is busy right now. Try again in a minute.')
    if (!res.ok) throw new Error('Google could not test this page.')
    const run = parsePageSpeed(await res.json())
    if (!run) throw new Error('Google could not measure this page. Check that the site is online and public.')
    return run
  } finally {
    clearTimeout(timer)
  }
}

export async function runBrowserSpeedTest(url, { timeoutMs = 80000 } = {}) {
  const target = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`
  const [m, d] = await Promise.allSettled([runStrategy(target, 'mobile', timeoutMs), runStrategy(target, 'desktop', timeoutMs)])
  if (m.status === 'rejected' && d.status === 'rejected') throw m.reason
  return { url: target, testedAt: new Date().toISOString(), mobile: m.status === 'fulfilled' ? m.value : null, desktop: d.status === 'fulfilled' ? d.value : null }
}
