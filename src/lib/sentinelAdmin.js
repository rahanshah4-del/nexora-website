/**
 * Control Centre client for the nexora-sentinel Worker (platform watchdog) and the
 * tiny reporter the public site uses to send browser errors to it.
 */
export const SENTINEL_URL = String(import.meta.env?.VITE_SENTINEL_URL || 'https://nexora-sentinel.rahanshah4.workers.dev').replace(/\/+$/, '')

export class SentinelError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'SentinelError'
    this.status = status
  }
}

export function sentinelErrorMessage(status, code) {
  if (status === 401) return 'Your sign-in was not accepted by the Sentinel. Sign out and in again.'
  if (status === 403) return 'This account is not on the Sentinel admin list.'
  if (status === 404 && code === 'not_found') return 'Sentinel is not deployed yet. Run: npm run sentinel:deploy'
  if (status === 500 && code === 'server_error') return 'The Sentinel hit an internal error (often its KV storage). Details are in Cloudflare > Workers > nexora-sentinel > Logs.'
  if (status === 429 && code === 'too_soon') return 'A check ran less than a minute ago. Wait a moment and try again.'
  if (status === 502) return 'The test email could not be sent. Check the Email Routing setup in workers/nexora-sentinel/README.md.'
  return `Sentinel error (${status}).`
}

async function request(path, method = 'GET') {
  const { auth } = await import('./firebase.js')
  const user = auth?.currentUser
  if (!user) throw new SentinelError('Sign in to the Control Centre first.', 401)
  const token = await user.getIdToken()
  let response
  try {
    response = await fetch(`${SENTINEL_URL}${path}`, { method, headers: { authorization: `Bearer ${token}` } })
  } catch {
    throw new SentinelError('Sentinel is not reachable. Is it deployed (npm run sentinel:deploy)?')
  }
  let data = null
  try { data = await response.json() } catch { /* non-JSON */ }
  if (!response.ok) throw new SentinelError(sentinelErrorMessage(response.status, data?.error), response.status)
  return data
}

export const getSentinelStatus = () => request('/api/admin/status')
export const runSentinelNow = () => request('/api/admin/run', 'POST')
export const sendSentinelTestEmail = () => request('/api/admin/test-email', 'POST')

/** Builds and emails the daily PDF report right now (Firebase function, admin only). */
export async function sendDailyReportNow() {
  const [{ functions }, { httpsCallable }] = await Promise.all([import('./firebase.js'), import('firebase/functions')])
  if (!functions) throw new SentinelError('Firebase is not configured.')
  try {
    const result = await httpsCallable(functions, 'sendDailyReportNow', { timeout: 300000 })()
    return result.data
  } catch (error) {
    if (error?.code === 'functions/not-found') throw new SentinelError('The report function is not deployed yet: firebase deploy --only functions:sendDailyReport,functions:sendDailyReportNow')
    throw new SentinelError(error?.message || 'The report could not be sent.')
  }
}

/** Personal data must not leave the browser inside an error message. */
export function redactForReport(value) {
  return String(value ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[id]')
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{12,}\b/gi, '[id]')
    .replace(/\d{6,}/g, '[number]')
    .slice(0, 200)
}

/**
 * Fire-and-forget browser error report from the live site. Never throws, never
 * blocks the page, skipped on localhost. Sent as text/plain so the browser makes
 * one simple request instead of a CORS preflight plus the request.
 */
export function reportBrowserError({ message, page, kind = 'error' }) {
  try {
    if (typeof fetch !== 'function' || typeof location === 'undefined') return
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return
    fetch(`${SENTINEL_URL}/api/report`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ message: redactForReport(message), page: redactForReport(String(page || '/').split(/[?#]/)[0]), kind }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* reporting must never break the site */ }
}
