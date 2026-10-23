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

/** Fire-and-forget browser error report. Never throws, never blocks the page. */
export function reportBrowserError({ message, page, kind = 'error' }) {
  try {
    if (typeof fetch !== 'function') return
    fetch(`${SENTINEL_URL}/api/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: String(message || '').slice(0, 200), page: String(page || '/'), kind }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* reporting must never break the site */ }
}
