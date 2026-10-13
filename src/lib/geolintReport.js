/**
 * Pure helpers for the GeoLint report page and the audit "scan console":
 * grading, plain-language labels, the scan checklist, and the one-report
 * hand-off between the audit page and the report page (sessionStorage, so a
 * reload of the report keeps working but nothing is kept beyond the tab).
 */

export const REPORT_STORAGE_KEY = 'geolint:last-report'

/** Checks the engine runs for every audit, in the order the console lists them. */
export const SCAN_STEPS = Object.freeze([
  { id: 'url', label: 'Validating the address and resolving the host', ms: 1100 },
  { id: 'robots', label: 'Reading robots.txt for each AI bot', ms: 1700 },
  { id: 'oai', label: 'Requesting the page as OAI-SearchBot', ms: 1800 },
  { id: 'chatgpt', label: 'Requesting the page as ChatGPT-User', ms: 1500 },
  { id: 'claude', label: 'Requesting the page as Claude-SearchBot', ms: 1500 },
  { id: 'perplexity', label: 'Requesting the page as PerplexityBot', ms: 1500 },
  { id: 'render', label: 'Loading the page in headless Chromium', ms: 4200 },
  { id: 'diff', label: 'Comparing raw HTML with the rendered text', ms: 2200 },
  { id: 'bluf', label: 'Checking answer-first structure under each heading', ms: 2200 },
  { id: 'facts', label: 'Counting facts, sources and structured data', ms: 2000 },
  { id: 'llms', label: 'Looking for /llms.txt', ms: 1400 },
  { id: 'score', label: 'Scoring and building your report', ms: 3000 },
])

export const GRADES = Object.freeze([
  { min: 90, letter: 'A', label: 'Excellent', tone: 'emerald' },
  { min: 75, letter: 'B', label: 'Good', tone: 'emerald' },
  { min: 60, letter: 'C', label: 'Fair', tone: 'amber' },
  { min: 40, letter: 'D', label: 'Weak', tone: 'orange' },
  { min: 0, letter: 'F', label: 'Poor', tone: 'rose' },
])

/** Grade for earned/evaluatedMax (a partial run is graded on what could be evaluated). */
export function gradeFor(earned, max) {
  const e = Number(earned)
  const m = Number(max)
  if (!Number.isFinite(e) || !Number.isFinite(m) || m <= 0) return { letter: '–', label: 'Not graded', tone: 'slate', percent: null }
  const percent = Math.max(0, Math.min(100, (e / m) * 100))
  const grade = GRADES.find((g) => percent >= g.min) || GRADES.at(-1)
  return { ...grade, percent: Math.round(percent * 10) / 10 }
}

/** Strength label for one module (score / maxScore). */
export function strengthOf(score, max, status) {
  if (status === 'unavailable') return { label: 'Could not run', tone: 'slate', ratio: null }
  const ratio = Number(max) > 0 ? Number(score) / Number(max) : NaN
  if (!Number.isFinite(ratio)) return { label: 'Not scored', tone: 'slate', ratio: null }
  if (ratio >= 0.85) return { label: 'Strong', tone: 'emerald', ratio }
  if (ratio >= 0.55) return { label: 'Needs work', tone: 'amber', ratio }
  return { label: 'Weak', tone: 'rose', ratio }
}

const ISSUE_LABELS = {
  no_answer_block: 'No answer under this heading',
  filler_intro: 'Opens with filler',
  too_short: 'Opening line too short',
  too_long: 'Opening paragraph too long',
  no_direct_statement: 'No direct statement or number',
}

export function issueLabel(code) {
  return ISSUE_LABELS[code] || String(code || '').replace(/_/g, ' ')
}

const VERDICT_LABELS = {
  ok: { label: 'Reachable', tone: 'emerald' },
  blocked: { label: 'Blocked', tone: 'rose' },
  challenge: { label: 'Challenge page', tone: 'rose' },
  not_found: { label: 'Not found', tone: 'amber' },
  http_error: { label: 'HTTP error', tone: 'amber' },
  error: { label: 'Failed', tone: 'rose' },
}

export function verdictInfo(verdict) {
  return VERDICT_LABELS[verdict] || { label: 'Unknown', tone: 'slate' }
}

/** One plain sentence about the whole run, built only from the report's own numbers. */
export function summarizeReport(report) {
  const modules = report?.modules || {}
  const parts = []
  const bots = modules.botAccess
  if (bots?.score != null && bots.maxScore) {
    parts.push(bots.score >= bots.maxScore ? 'Search bots can reach the page' : bots.score > 0 ? 'Some search bots are blocked' : 'Search bots cannot reach the page')
  }
  const js = modules.jsDifferential
  if (js?.status === 'ok' && js.metrics?.visibleWithoutJsPercent != null) {
    parts.push(js.isCsr ? 'most of the text needs JavaScript' : 'the text is already in the HTML')
  }
  const bluf = modules.bluf
  if (bluf?.status === 'ok' && bluf.maxScore) {
    parts.push(bluf.score / bluf.maxScore >= 0.7 ? 'headings open with answers' : 'headings need clearer opening answers')
  }
  if (!parts.length) return 'The audit finished, but too few checks could run to summarize it.'
  const text = parts.join(', ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

/** "example.com/path" for headings and file names. */
export function hostLabel(url) {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`.replace(/\/$/, '')
  } catch {
    return String(url || '')
  }
}

/** geolint-example-com-2026-10-13 (no extension). */
export function reportFileBase(report) {
  const host = hostLabel(report?.url).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'report'
  const day = String(report?.auditedAt || '').slice(0, 10) || 'audit'
  return `geolint-${host}-${day}`
}

/** True for a report object the page can render. */
export function isValidReport(report) {
  return Boolean(report && typeof report === 'object' && report.score && typeof report.score.earned === 'number' && report.modules && typeof report.modules === 'object')
}

export function saveReport(report) {
  try {
    sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report))
    return true
  } catch {
    return false
  }
}

// useSyncExternalStore needs the same object back while nothing changed, so the
// parsed report is cached against the raw string it came from.
let cachedRaw = null
let cachedReport = null

export function loadReport() {
  try {
    const raw = sessionStorage.getItem(REPORT_STORAGE_KEY)
    if (!raw) return null
    if (raw === cachedRaw) return cachedReport
    const report = JSON.parse(raw)
    cachedRaw = raw
    cachedReport = isValidReport(report) ? report : null
    return cachedReport
  } catch {
    return null
  }
}

export function clearReport() {
  try {
    sessionStorage.removeItem(REPORT_STORAGE_KEY)
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Progress (0-100) for the scan console: eases toward 92 while waiting, never claims done early. */
export function scanProgress(elapsedMs, totalMs = SCAN_STEPS.reduce((s, x) => s + x.ms, 0)) {
  const t = Math.max(0, elapsedMs) / totalMs
  return Math.min(92, Math.round((1 - Math.exp(-2.4 * t)) * 920) / 10)
}

/** Index of the step that is active after `elapsedMs`; stays on the last step while waiting. */
export function activeStepIndex(elapsedMs) {
  let acc = 0
  for (let i = 0; i < SCAN_STEPS.length; i += 1) {
    acc += SCAN_STEPS[i].ms
    if (elapsedMs < acc) return i
  }
  return SCAN_STEPS.length - 1
}
