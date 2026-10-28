/**
 * Client for geolint-backend (the GeoLint audit engine on Cloud Run).
 * Admin calls only: every request carries the signed-in admin's Firebase ID token,
 * and the engine checks the UID against its own ADMIN_UIDS list.
 *
 * Firebase is loaded on demand so this module stays importable in plain Node tests.
 */

export const GEOLINT_API_URL = String(import.meta.env?.VITE_GEOLINT_API_URL || '').replace(/\/$/, '')

export class GeoLintError extends Error {
  constructor(message, { status = 0, code = '', unreachable = false, resetAt = '' } = {}) {
    super(message)
    this.name = 'GeoLintError'
    this.status = status
    this.code = code
    this.unreachable = unreachable
    this.resetAt = resetAt
  }
}

const ERROR_MESSAGES = {
  ADMIN_DISABLED: 'The GeoLint admin API is switched off (ADMIN_UIDS is empty on the server).',
  STORE_DISABLED: 'Audit history is switched off on the server (set AUDIT_STORE=firestore).',
  UNAUTHENTICATED: 'Your sign-in was not accepted by the GeoLint server. Sign out and in again.',
  FORBIDDEN: 'This account is not on the GeoLint admin list (ADMIN_UIDS).',
  NOT_FOUND: 'That audit was not found. It may have expired.',
}

export function geolintErrorMessage(status, code) {
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  if (status === 429) return 'Too many requests. Wait a minute and refresh.'
  if (status >= 500) return `GeoLint server error (${status}).`
  return `GeoLint request failed (${status}).`
}

async function currentIdToken() {
  const { auth } = await import('./firebase.js')
  const user = auth?.currentUser
  if (!user) throw new GeoLintError('Sign in to the Control Centre first.', { status: 401, code: 'UNAUTHENTICATED' })
  return user.getIdToken()
}

/**
 * One request to the engine. By default it carries the signed-in admin's token; the client-facing
 * fix service passes its own `getToken` (a separate Firebase app, so clients never touch the CRM's sign-in).
 * `getToken: null` sends no token (public endpoints).
 */
export async function geolintRequest(path, { method = 'GET', payload, getToken = currentIdToken } = {}) {
  if (!GEOLINT_API_URL) {
    throw new GeoLintError('GeoLint server URL is not set. Add VITE_GEOLINT_API_URL (see .env.example).', { code: 'NOT_CONFIGURED' })
  }
  const token = getToken ? await getToken() : ''
  let response
  try {
    response = await fetch(`${GEOLINT_API_URL}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
  } catch {
    throw new GeoLintError('GeoLint server is not reachable. Is geolint-backend running and CORS set for this site?', { unreachable: true })
  }
  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : ''
    const useServer = body?.message && (code === 'INVALID_BODY' || SERVER_MESSAGE_CODES.has(code))
    const error = new GeoLintError(useServer ? body.message : geolintErrorMessage(response.status, code), { status: response.status, code })
    if (typeof body?.orderId === 'string') error.orderId = body.orderId
    throw error
  }
  return body
}

/** A file as base64 text (no data: prefix), for sending inside a JSON request. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new GeoLintError('This file could not be read.'))
    reader.readAsDataURL(file)
  })
}

/** Downloads a private file from the engine with the caller's token and resolves its Blob. */
export async function geolintBlob(path, { getToken = currentIdToken } = {}) {
  if (!GEOLINT_API_URL) throw new GeoLintError('GeoLint server URL is not set.', { code: 'NOT_CONFIGURED' })
  const token = getToken ? await getToken() : ''
  let response
  try {
    response = await fetch(`${GEOLINT_API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new GeoLintError('GeoLint server is not reachable.', { unreachable: true })
  }
  if (!response.ok) throw new GeoLintError('This file could not be opened.', { status: response.status })
  return response.blob()
}

const request = geolintRequest

/** Errors whose server text is already written for the client (fix service). */
const SERVER_MESSAGE_CODES = new Set([
  'NO_SECRETS', 'DUPLICATE', 'TOO_MANY_OPEN', 'ORDERS_DISABLED', 'WRONG_STATE', 'BAD_TRANSITION', 'USE_PAYMENT', 'WRONG_SITE', 'AUDIT_NOT_FOUND',
  'USE_SITE_AUDIT', 'UNREADABLE', 'INVALID_URL', 'AUDIT_FAILED', 'UNVERIFIED_EMAIL', 'EMAIL_NOT_VERIFIED',
  'GSC_TOKEN_REJECTED', 'GSC_NO_ACCESS', 'GSC_RATE_LIMITED', 'GSC_FAILED', 'GSC_NO_PROPERTY', 'GSC_CHOOSE_PROPERTY',
  'CHAT_CLOSED', 'BAD_FILE', 'TOO_MANY_FILES', 'MONITOR_LIMIT', 'DAILY_LIMIT', 'ENGINE_ERROR', 'HOST_BLOCKED', 'BLOCKED', 'BUSY', 'CRAWL_FAILED', 'NOT_A_SITE_AUDIT', 'SPEED_QUOTA', 'SPEED_FAILED',
])

// ---- fix orders (Control Centre)

export const listFixOrders = (status = 'open') => request(`/api/admin/orders?status=${encodeURIComponent(status)}`)
export const getFixOrder = (id) => request(`/api/admin/orders/${encodeURIComponent(id)}`)
export const getFixConfig = () => request('/api/admin/orders/config')
export const saveFixConfig = (patch) => request('/api/admin/orders/config', { method: 'PUT', payload: patch })
const orderAct = (id, action, payload) => request(`/api/admin/orders/${encodeURIComponent(id)}/${action}`, { method: 'POST', payload })
export const setFixStatus = (id, status, note = '', visible = true) => orderAct(id, 'status', { status, note, visible })
export const markFixPaid = (id, method, reference = '', note = '') => orderAct(id, 'payment', { method, reference, note })
export const addFixNote = (id, note, visible = false) => orderAct(id, 'note', { note, visible })
/** Chat with the client: the team writes, and opening the chat marks the client's messages as read. */
export const sendFixMessage = (id, { text = '', files = [] }) => orderAct(id, 'messages', files.length ? { text, files } : { text })
export async function uploadFixFile(id, file) {
  const r = await orderAct(id, 'files', { name: file.name, data: await fileToBase64(file) })
  return r.file
}
export const fetchFixFile = (id, fileId) => geolintBlob(`/api/admin/orders/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`)
export const markFixMessagesRead = (id) => orderAct(id, 'messages/read', {})
export const attachFixAudit = (id, as, auditId) => orderAct(id, 'attach', { as, auditId })
export const recheckFixOrder = (id, as) => orderAct(id, 'recheck', { as })
/** Runs a Google PageSpeed test (phone and desktop) on the client's site and keeps it as the before or after result. */
export const runFixSpeed = (id, as) => orderAct(id, 'speed', { as })
/** Crawls every page of the client's website (can take several minutes) and stores the result on the order for the PDF report. */
export const crawlFixSite = (id, maxPages = 100) => orderAct(id, 'crawl', { maxPages })
/** Uses an already saved whole-site audit instead of crawling again. */
export const attachFixCrawl = (id, auditId) => orderAct(id, 'crawl/attach', { auditId })

export function getGeoLintStats() {
  return request('/api/admin/stats')
}

export function listGeoLintAudits({ limit = 20, cursor = '' } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return request(`/api/admin/audits?${params.toString()}`)
}

// ---- access control (Control Centre): page allowance, blocking, extra pages ----

export const getAccessConfig = () => request('/api/admin/access/config')
export const saveAccessConfig = (patch) => request('/api/admin/access/config', { method: 'PUT', payload: patch })
export function listAccessClients({ filter = 'all', q = '', limit = 100 } = {}) {
  const params = new URLSearchParams({ filter, limit: String(limit) })
  if (q.trim()) params.set('q', q.trim())
  return request(`/api/admin/access/clients?${params.toString()}`)
}
/** action: block | unblock | grant | reset | exempt | unexempt. target: { key } or { ip }. */
export const actOnClient = (target, action, extra = {}) => request('/api/admin/access/act', { method: 'POST', payload: { ...target, action, ...extra } })
export const listAccessEvents = () => request('/api/admin/access/events')

export function getGeoLintAudit(id) {
  return request(`/api/admin/audits/${encodeURIComponent(id)}`)
}

// ---- pure display helpers (tested in tests/geolint-admin.test.mjs) ----

/** Colour band for a 0-100 score. */
export function scoreTone(percent) {
  const value = Number(percent)
  if (!Number.isFinite(value)) return 'slate'
  if (value >= 80) return 'emerald'
  if (value >= 50) return 'amber'
  return 'rose'
}

/** "75.9 / 100", or "60 / 80" when a module could not run. */
export function scoreLabel(earned, evaluatedMax) {
  const e = Number(earned)
  const m = Number(evaluatedMax)
  if (!Number.isFinite(e) || !Number.isFinite(m)) return '—'
  return `${Math.round(e * 10) / 10} / ${m}`
}

export const MODULE_LABELS = {
  botAccess: 'Bot Access',
  jsDifferential: 'JavaScript',
  bluf: 'BLUF Structure',
  facts: 'Facts & Schema',
}

export function moduleLabel(key) {
  return MODULE_LABELS[key] || key
}

/** Merges a newly loaded page into the list, dropping repeats by id. */
export function appendAudits(existing, incoming) {
  const seen = new Set(existing.map((row) => row.id))
  return [...existing, ...incoming.filter((row) => row && !seen.has(row.id))]
}

/** Short "example.com/path" for table cells. */
export function shortUrl(url, max = 56) {
  const text = String(url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// ---- public audit (the /tools/geo-audit page) ----

/**
 * Turns what a visitor typed into an http(s) URL string, or null. Adds https://
 * when there is no scheme. Anything with credentials or a non-http scheme is
 * rejected here; the engine re-validates and blocks private addresses itself.
 */
export function normalizeAuditUrl(input) {
  const raw = String(input ?? '').trim()
  if (!raw || /\s/.test(raw)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (!url.hostname.includes('.')) return null
  return url.toString()
}

const PUBLIC_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'The audit service is not switched on yet. Please try again soon.',
  INVALID_BODY: 'Enter a full page address, for example https://example.com/page.',
  INVALID_URL: 'That does not look like a valid web address.',
  BLOCKED_HOST: 'GeoLint can only audit public websites.',
  RATE_LIMITED: 'Too many audits from your connection. Wait a minute and try again.',
  BUSY: 'Another whole-site audit is running. Please try again in a few minutes.',
  DISABLED: 'Whole-site audits are switched off for now. Please try again later.',
  HOST_BLOCKED: 'This website cannot be audited here. Its owner asked us not to, or it was blocked for abuse.',
}

/** "9 Oct 2026, 14:30" in the visitor's own time zone. */
export function formatLocalTime(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Message for a visitor who used all their pages. */
export function quotaExceededMessage({ limit, resetAt } = {}) {
  const when = resetAt ? formatLocalTime(resetAt) : ''
  return `You have used all ${limit || ''} pages of your daily allowance.${when ? ` It is full again on ${when}.` : ' Please come back in 24 hours.'}`.replace('all  pages', 'all pages')
}

/** Visitor-facing message for a failed public audit. */
export function publicAuditErrorMessage(status, code, serverMessage = '', details = {}) {
  if (code === 'QUOTA_EXCEEDED') return quotaExceededMessage(details)
  if (code === 'BLOCKED') return serverMessage || 'Access from your network has been blocked. Contact us if you think this is a mistake.'
  if (PUBLIC_ERROR_MESSAGES[code]) return PUBLIC_ERROR_MESSAGES[code]
  if (status === 429) return PUBLIC_ERROR_MESSAGES.RATE_LIMITED
  if (status >= 400 && status < 500 && serverMessage) return serverMessage
  return 'The audit could not finish. Check the address and try again.'
}

/** Runs a public audit. Resolves to the engine's report; throws GeoLintError. */
export async function runGeoAudit(rawUrl, { signal } = {}) {
  if (!GEOLINT_API_URL) throw new GeoLintError(publicAuditErrorMessage(0, 'NOT_CONFIGURED'), { code: 'NOT_CONFIGURED' })
  const url = normalizeAuditUrl(rawUrl)
  if (!url) throw new GeoLintError(publicAuditErrorMessage(0, 'INVALID_URL'), { code: 'INVALID_URL' })
  let response
  try {
    response = await fetch(`${GEOLINT_API_URL}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new GeoLintError('The audit service could not be reached. Please try again.', { unreachable: true })
  }
  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const code = typeof body?.error === 'string' ? body.error : ''
    throw new GeoLintError(publicAuditErrorMessage(response.status, code, body?.message, body || {}), { status: response.status, code, resetAt: body?.resetAt || '' })
  }
  return body
}

/** Findings from every module, errors first, deduped, for the "fix first" list. */
export function collectFindings(report, limit = 8) {
  const rank = { error: 0, warning: 1, info: 2 }
  const seen = new Set()
  const out = []
  for (const key of ['botAccess', 'jsDifferential', 'bluf', 'facts']) {
    for (const m of report?.modules?.[key]?.messages || []) {
      if (!m?.message || m.severity === 'info') continue
      const id = `${key}:${m.message}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ module: key, severity: m.severity, message: m.message })
    }
  }
  return out.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)).slice(0, limit)
}

/** Public badge image for a saved audit, or '' when the server or id is missing. */
export function geoBadgeUrl(id) {
  return GEOLINT_API_URL && typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id) ? `${GEOLINT_API_URL}/api/badge/${id}.svg` : ''
}

/** The visitor's own page allowance, or null when the server cannot be reached. Never throws. */
export async function getQuota({ signal } = {}) {
  if (!GEOLINT_API_URL) return null
  try {
    const response = await fetch(`${GEOLINT_API_URL}/api/quota`, { signal })
    if (!response.ok) return null
    const q = await response.json()
    return Number.isFinite(q?.limit) && Number.isFinite(q?.remaining) ? q : null
  } catch {
    return null
  }
}

/**
 * Runs a whole-site audit. The engine streams newline-delimited JSON events
 * (start, discovered, site, page..., done); each one is passed to onEvent as it
 * arrives. Resolves when the stream ends; throws GeoLintError on failure.
 */
export async function streamSiteAudit(rawUrl, { maxPages = 500, signal, onEvent } = {}) {
  if (!GEOLINT_API_URL) throw new GeoLintError(publicAuditErrorMessage(0, 'NOT_CONFIGURED'), { code: 'NOT_CONFIGURED' })
  let response
  try {
    response = await fetch(`${GEOLINT_API_URL}/api/site-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl, maxPages }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new GeoLintError('The audit service could not be reached. Please try again.', { unreachable: true })
  }
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    const code = typeof body?.error === 'string' ? body.error : ''
    throw new GeoLintError(publicAuditErrorMessage(response.status, code, body?.message, body || {}), { status: response.status, code, resetAt: body?.resetAt || '' })
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawDone = false
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      let event
      try { event = JSON.parse(line) } catch { continue }
      if (event?.type === 'done') sawDone = true
      if (event?.type === 'error') throw new GeoLintError(event.message || 'The site audit stopped unexpectedly.')
      onEvent?.(event)
    }
  }
  if (!sawDone) throw new GeoLintError('The connection closed before the site audit finished. Please try again.')
}

/** AI citation check (public): whether it is on, and one check of up to 3 questions. */
/** The free audit's speed test: Google PageSpeed on the page, phone and desktop. `fresh` skips the server's short-lived saved result. */
export async function checkSpeed(url, { fresh = false } = {}) {
  // the GeoLint server first (shared, cached); if it cannot do it, Google PageSpeed straight from the browser
  if (GEOLINT_API_URL) {
    try {
      const r = await geolintRequest('/api/speed', { method: 'POST', payload: { url, ...(fresh ? { fresh: true } : {}) }, getToken: null })
      if (r?.speed && (r.speed.mobile || r.speed.desktop)) return r
    } catch { /* fall through to the browser test */ }
  }
  const { runBrowserSpeedTest } = await import('./geolintPageSpeed.js')
  return { speed: await runBrowserSpeedTest(url), cached: false }
}
export const getCitationStatus = () => geolintRequest('/api/ai-citations', { getToken: null })
export const checkCitations = ({ url, queries, brand }) => geolintRequest('/api/ai-citations', { method: 'POST', payload: { url, queries, ...(brand ? { brand } : {}) }, getToken: null })

/**
 * Three starter questions for the citation check, from the page itself: what the brand is, and the
 * category question a buyer would ask. The person can edit them before checking.
 */
export function suggestCitationQueries({ host = '', title = '' } = {}) {
  const label = String(host).replace(/^www\./, '').split('.')[0] || ''
  const brand = label ? label.charAt(0).toUpperCase() + label.slice(1) : 'this website'
  const topic = String(title).split(/[|\u2013\u2014:-]/)[0].trim().replace(/^(the|a|an)\s+/i, '')
  const out = [`What is ${brand} and is it any good?`]
  if (topic && topic.length >= 4 && topic.toLowerCase() !== label.toLowerCase()) out.push(`What is the best ${topic.toLowerCase()}?`)
  out.push(`Which websites do you recommend for ${topic ? topic.toLowerCase() : `${brand} alternatives`}?`)
  return out.slice(0, 3)
}
