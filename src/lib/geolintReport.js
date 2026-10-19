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

// ---------------------------------------------------------------------------
// Independent re-check of a report's arithmetic, done in the browser from the
// numbers inside the report. The server runs the same kind of check; running it
// again here means a wrong or tampered total is caught before it is shown as fact.
// ---------------------------------------------------------------------------

const near = (a, b, tol = 0.11) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol
const r1 = (n) => Math.round(n * 10) / 10

/** The published JavaScript curve: 25 up to 20% gap, down to 10 at 60%, down to 0 at 90%. */
export function jsScoreForGap(gap) {
  const g = Math.min(1, Math.max(0, gap))
  if (g <= 0.2) return 25
  if (g <= 0.6) return r1(25 - ((g - 0.2) / 0.4) * 15)
  if (g < 0.9) return r1(10 - ((g - 0.6) / 0.3) * 10)
  return 0
}

export function verifyReportClient(report) {
  const checks = []
  const add = (id, label, ok, detail) => checks.push({ id, label, ok: Boolean(ok), detail })
  const modules = report?.modules || {}
  const list = ['botAccess', 'jsDifferential', 'bluf', 'facts'].map((k) => modules[k]).filter(Boolean)

  for (const m of list) {
    add(`range.${m.module}`, `${moduleName(m.module)} score is between 0 and its maximum`, Number.isFinite(m.score) && m.score >= 0 && m.score <= m.maxScore, `${m.score} of ${m.maxScore}`)
  }

  const b = modules.botAccess
  if (b?.breakdown) {
    const sum = r1(b.breakdown.robotsPoints + b.breakdown.httpPoints)
    add('bot.sum', 'Bot Access: robots points + HTTP points = module score', near(sum, b.score), `${b.breakdown.robotsPoints} + ${b.breakdown.httpPoints} = ${sum} (reported ${b.score})`)
    add('bot.max', 'Bot Access: the two maximums add up to the module maximum', b.breakdown.robotsMax + b.breakdown.httpMax === b.maxScore, `${b.breakdown.robotsMax} + ${b.breakdown.httpMax} = ${b.breakdown.robotsMax + b.breakdown.httpMax} (reported ${b.maxScore})`)
  }

  const js = modules.jsDifferential
  if (js?.status === 'ok' && js.metrics && js.metrics.gap != null) {
    const m = js.metrics
    const byWords = typeof m.sharedWords === 'number' && typeof m.coverageWords === 'number'
    const gap = byWords
      ? (m.coverageWords > 0 ? Math.min(1, Math.max(0, 1 - m.sharedWords / m.coverageWords)) : 0)
      : (m.renderedChars > 0 ? Math.min(1, Math.max(0, (m.renderedChars - m.staticChars) / m.renderedChars)) : 0)
    const shown = Math.round(gap * 1000) / 1000
    add('js.gap', byWords ? 'JavaScript check: gap = 1 - shared words / rendered words' : 'JavaScript check: gap = (rendered - raw) / rendered', near(gap, m.gap, 0.002), byWords ? `1 - ${m.sharedWords} / ${m.coverageWords} = ${shown} (reported ${m.gap})` : `(${m.renderedChars} - ${m.staticChars}) / ${m.renderedChars} = ${shown} (reported ${m.gap})`)
    add('js.score', 'JavaScript check: score follows the published gap curve', near(jsScoreForGap(js.metrics.gap), js.score), `gap ${js.metrics.gap} gives ${jsScoreForGap(js.metrics.gap)} (reported ${js.score})`)
  }

  const f = modules.facts
  if (f?.status === 'ok' && f.breakdown) {
    const k = f.breakdown
    const sum = r1(k.density.points + k.sources.points + k.schema.points + k.llmsTxt.points)
    add('facts.sum', 'Facts: density + sources + schema + llms.txt = module score', near(sum, f.score), `${sum} (reported ${f.score})`)
    add('facts.parts', 'Facts: no part is above its own maximum', k.density.points <= k.density.max && k.sources.points <= k.sources.max && k.schema.points <= k.schema.max && k.llmsTxt.points <= k.llmsTxt.max, `${k.density.points}/${k.density.max}, ${k.sources.points}/${k.sources.max}, ${k.schema.points}/${k.schema.max}, ${k.llmsTxt.points}/${k.llmsTxt.max}`)
  }

  const excluded = new Set(report?.score?.excludedModules || [])
  const counted = list.filter((m) => m.status !== 'unavailable' && !excluded.has(m.module))
  const earned = r1(counted.reduce((s, m) => s + m.score, 0))
  const max = counted.reduce((s, m) => s + m.maxScore, 0)
  add('total.earned', 'Total score = sum of the module scores that ran', near(earned, report?.score?.earned), `${earned} (reported ${report?.score?.earned})`)
  add('total.max', 'Total maximum = sum of the module maximums that ran', max === report?.score?.evaluatedMax, `${max} (reported ${report?.score?.evaluatedMax})`)
  add('total.partial', 'Partial flag matches the points that could be evaluated', Boolean(report?.partial) === (report?.score?.evaluatedMax < report?.score?.totalMax), `evaluated ${report?.score?.evaluatedMax} of ${report?.score?.totalMax}`)

  const failed = checks.filter((c) => !c.ok).length
  return { verified: failed === 0, checked: checks.length, failed, checks }
}

function moduleName(key) {
  return { botAccess: 'Bot Access', jsDifferential: 'JavaScript check', bluf: 'Answer-first structure', facts: 'Facts' }[key] || key
}

export const CONFIDENCE_LABELS = Object.freeze({
  confirmed: { label: 'Confirmed', tone: 'emerald', hint: 'Measured directly on your page.' },
  likely: { label: 'Likely', tone: 'amber', hint: 'Measured, but the cause is inferred.' },
  heuristic: { label: 'Rule of thumb', tone: 'slate', hint: 'A guideline, not a proven ranking rule.' },
})

export const PRIORITY_LABELS = Object.freeze({
  critical: { label: 'Critical', tone: 'rose' },
  high: { label: 'High', tone: 'orange' },
  medium: { label: 'Medium', tone: 'amber' },
  low: { label: 'Optional', tone: 'slate' },
})

export const LEVEL_LABELS = Object.freeze({
  high: { label: 'High confidence', tone: 'emerald' },
  medium: { label: 'Medium confidence', tone: 'amber' },
  low: { label: 'Low confidence', tone: 'rose' },
})

// ---------------------------------------------------------------------------
// Domain and reach card (information only, never part of the score)
// ---------------------------------------------------------------------------

/** 144 -> "4 months, 22 days"; 800 -> "2 years, 2 months". */
export function formatAge(days) {
  if (days === null || days === undefined || days === '') return null
  const d = Number(days)
  if (!Number.isFinite(d) || d < 0) return null
  if (d < 31) return `${d} ${d === 1 ? 'day' : 'days'}`
  const years = Math.floor(d / 365)
  const months = Math.floor((d - years * 365) / 30.4)
  if (years >= 1) return months > 0 ? `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}` : `${years} ${years === 1 ? 'year' : 'years'}`
  const rest = Math.round(d - months * 30.4)
  return rest > 0 ? `${months} ${months === 1 ? 'month' : 'months'}, ${rest} ${rest === 1 ? 'day' : 'days'}` : `${months} ${months === 1 ? 'month' : 'months'}`
}

const TIER_LABELS = { top_10k: 'Top 10,000 sites', top_100k: 'Top 100,000 sites', top_1m: 'Top 1 million sites', unlisted: 'Below the top 1 million' }

function dateLabel(iso) {
  const t = Date.parse(iso || '')
  return Number.isNaN(t) ? '' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Tiles for the Domain card, built only from what the engine returned. A source
 * that did not answer says so; nothing is estimated.
 */
export function domainTiles(domain) {
  if (!domain || typeof domain !== 'object') return []
  const reg = domain.registration || {}
  const pop = domain.popularity || {}
  const auth = domain.authority || {}
  const tiles = []

  const age = reg.state === 'ok' ? formatAge(reg.ageDays) : null
  tiles.push({
    id: 'age',
    label: 'Domain age',
    value: age || 'Not available',
    sub: age ? (reg.registeredAt ? `Registered ${dateLabel(reg.registeredAt)}` : '') : reg.note || 'The registry did not share this.',
    tone: 'slate',
  })

  if (pop.state === 'ok') {
    tiles.push({ id: 'popularity', label: 'Popularity rank', value: `#${Number(pop.rank).toLocaleString('en-US')}`, sub: `${TIER_LABELS[pop.tier] || 'Ranked'} (Tranco)`, tone: 'emerald' })
  } else if (pop.state === 'not_listed') {
    tiles.push({ id: 'popularity', label: 'Popularity rank', value: 'Not ranked', sub: 'Below the top 1 million sites, which have no public ranking.', tone: 'slate' })
  } else {
    tiles.push({ id: 'popularity', label: 'Popularity rank', value: 'Not available', sub: pop.note || 'The ranking source did not answer.', tone: 'slate' })
  }

  if (auth.state === 'ok') {
    tiles.push({ id: 'authority', label: 'Authority (PageRank)', value: `${auth.pageRank} / 10`, sub: 'Open PageRank, from links', tone: auth.pageRank >= 5 ? 'emerald' : auth.pageRank >= 3 ? 'amber' : 'orange' })
  } else {
    tiles.push({ id: 'authority', label: 'Authority (DR)', value: 'Not connected', sub: auth.state === 'not_listed' ? auth.note : 'Ahrefs-style Domain Rating is paid data and is not guessed.', tone: 'slate' })
  }

  const days = reg.state === 'ok' ? reg.daysToExpiry : null
  tiles.push({
    id: 'expiry',
    label: 'Registration expires',
    value: days === null ? 'Not available' : days < 0 ? 'Expired' : `${days} ${days === 1 ? 'day' : 'days'}`,
    sub: reg.registrar ? `Registrar: ${reg.registrar}` : reg.expiresAt ? dateLabel(reg.expiresAt) : '',
    tone: days !== null && days < 60 ? 'rose' : 'slate',
  })
  return tiles
}

// ---------------------------------------------------------------------------
// Overview dashboard (charts at the top of the report)
// ---------------------------------------------------------------------------

const OVERVIEW_MODULES = ['botAccess', 'jsDifferential', 'bluf', 'facts']
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']

/**
 * Chart-ready numbers built only from the report itself: issues by priority,
 * points earned and lost per area, the biggest wins, answer-first headings and
 * search-bot reachability. Nothing here is estimated.
 */
export function buildOverview(report) {
  const modules = report?.modules || {}
  const excluded = new Set(report?.score?.excludedModules || [])
  const remediation = Array.isArray(report?.remediation) ? report.remediation : []

  const issues = PRIORITY_ORDER.map((id) => ({
    id,
    label: PRIORITY_LABELS[id].label,
    tone: PRIORITY_LABELS[id].tone,
    value: remediation.filter((item) => (PRIORITY_LABELS[item.priority] ? item.priority : 'medium') === id).length,
  }))

  const areas = OVERVIEW_MODULES
    .filter((key) => modules[key] && modules[key].status !== 'unavailable' && !excluded.has(key) && Number(modules[key].maxScore) > 0)
    .map((key) => {
      const earned = Math.max(0, Number(modules[key].score) || 0)
      const max = Number(modules[key].maxScore)
      return { id: key, earned, max, lost: Math.max(0, max - earned), tone: strengthOf(earned, max, modules[key].status).tone }
    })

  const winBack = remediation
    .filter((item) => Number(item.upTo) > 0)
    .map((item) => ({ id: item.id, title: item.title, module: item.module, upTo: Number(item.upTo), priority: item.priority }))
    .sort((a, b) => b.upTo - a.upTo)
    .slice(0, 6)

  const summary = modules.bluf?.summary
  const headings = summary && Number(summary.headings) > 0
    ? [
        { id: 'passed', label: 'Open with an answer', tone: 'emerald', value: Number(summary.passed) || 0 },
        { id: 'partial', label: 'Partly there', tone: 'amber', value: Number(summary.partial) || 0 },
        { id: 'failed', label: 'No direct answer', tone: 'rose', value: Number(summary.failed) || 0 },
      ]
    : null

  const scoredBots = Array.isArray(modules.botAccess?.bots) ? modules.botAccess.bots.filter((bot) => bot.scored) : []
  const bots = scoredBots.length
    ? [
        { id: 'reachable', label: 'Reachable', tone: 'emerald', value: scoredBots.filter((b) => b.robots?.allowed !== false && b.http?.verdict === 'ok').length },
        { id: 'blocked', label: 'Blocked', tone: 'rose', value: scoredBots.filter((b) => b.robots?.allowed === false || ['blocked', 'challenge'].includes(b.http?.verdict)).length },
      ]
    : null
  const unverified = bots ? Math.max(0, scoredBots.length - bots[0].value - bots[1].value) : 0
  if (unverified > 0) bots.push({ id: 'other', label: 'Unverified', tone: 'slate', value: unverified })

  const botList = scoredBots.map((bot) => {
    const blocked = bot.robots?.allowed === false || ['blocked', 'challenge'].includes(bot.http?.verdict)
    const ok = !blocked && bot.robots?.allowed !== false && bot.http?.verdict === 'ok'
    return { name: bot.bot, tone: ok ? 'emerald' : blocked ? 'rose' : 'slate', label: ok ? 'Reachable' : blocked ? (bot.robots?.allowed === false ? 'Blocked in robots.txt' : verdictInfo(bot.http?.verdict).label) : 'Unverified' }
  })

  return { issues, issueTotal: issues.reduce((sum, row) => sum + row.value, 0), areas, winBack, headings, bots, botList }
}

const GENERIC_STEPS = {
  botAccess: [
    'Open your robots.txt and remove any Disallow rule that matches OAI-SearchBot, ChatGPT-User, Claude-SearchBot or PerplexityBot.',
    'If you use Cloudflare, a firewall or a security plugin, allow these bots by user-agent in its bot or WAF settings.',
    'Run the audit again to confirm each bot now gets a normal page.',
  ],
  jsDifferential: [
    'Server-render the page (SSR or static generation) so the main text is already in the HTML the bot downloads.',
    'Keep headings, paragraphs and key facts out of scripts that run after load.',
    'Run the audit again and check that the share of text visible without JavaScript went up.',
  ],
  bluf: [
    'Rewrite the first sentence under each weak heading so it states the answer: what it is, how much, or how long.',
    'Keep that opening to roughly 30-60 words and move greetings and background after it.',
    'Run the audit again to see the failed headings turn into passed ones.',
  ],
  facts: [
    'Add concrete numbers, dates or prices where the page makes a claim.',
    'Link to 3 or more trusted outside sources, and add JSON-LD structured data that matches the page.',
    'Optionally publish a short /llms.txt that points to your most important pages.',
  ],
}

/** The fix steps for a finding; a plain default for its area when the report carries none, so no problem is shown without a way out. */
export function solutionSteps(item) {
  if (Array.isArray(item?.steps) && item.steps.length) return item.steps
  return GENERIC_STEPS[item?.module] || ['Review this finding on the page, make the change, then run the audit again to confirm it is fixed.']
}
