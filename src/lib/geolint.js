/**
 * Client for geolint-backend (the GeoLint audit engine on Cloud Run).
 * Admin calls only: every request carries the signed-in admin's Firebase ID token,
 * and the engine checks the UID against its own ADMIN_UIDS list.
 *
 * Firebase is loaded on demand so this module stays importable in plain Node tests.
 */

export const GEOLINT_API_URL = String(import.meta.env?.VITE_GEOLINT_API_URL || '').replace(/\/$/, '')

export class GeoLintError extends Error {
  constructor(message, { status = 0, code = '', unreachable = false } = {}) {
    super(message)
    this.name = 'GeoLintError'
    this.status = status
    this.code = code
    this.unreachable = unreachable
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

async function request(path) {
  if (!GEOLINT_API_URL) {
    throw new GeoLintError('GeoLint server URL is not set. Add VITE_GEOLINT_API_URL (see .env.example).', { code: 'NOT_CONFIGURED' })
  }
  const token = await currentIdToken()
  let response
  try {
    response = await fetch(`${GEOLINT_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
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
    throw new GeoLintError(geolintErrorMessage(response.status, code), { status: response.status, code })
  }
  return body
}

export function getGeoLintStats() {
  return request('/api/admin/stats')
}

export function listGeoLintAudits({ limit = 20, cursor = '' } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return request(`/api/admin/audits?${params.toString()}`)
}

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
