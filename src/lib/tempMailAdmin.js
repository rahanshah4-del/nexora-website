/**
 * Control Centre client for the temp-mail Worker's admin API. Every call carries
 * the signed-in admin's Firebase ID token; the Worker checks the UID against its
 * admin list. Firebase loads on demand so this stays importable in plain Node.
 */
export const TEMP_MAIL_ADMIN_URL = String(import.meta.env?.VITE_TEMP_MAIL_API_URL || 'https://nexora-temp-mail.rahanshah4.workers.dev').replace(/\/+$/, '')

export class TempMailAdminError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'TempMailAdminError'
    this.status = status
  }
}

async function idToken() {
  const { auth } = await import('./firebase.js')
  const user = auth?.currentUser
  if (!user) throw new TempMailAdminError('Sign in to the Control Centre first.', 401)
  return user.getIdToken()
}

export function adminErrorMessage(status, code) {
  if (status === 401) return 'Your sign-in was not accepted by the temp-mail server. Sign out and in again.'
  if (status === 403) return 'This account is not on the temp-mail admin list.'
  if (status === 404 && code === 'not_found') return 'The temp-mail server has no admin API yet. Deploy it: npm run temp-mail:deploy.'
  if (status === 429) return 'Too many requests. Wait a minute and refresh.'
  return `Temp-mail server error (${status}).`
}

async function request(path, { method = 'GET', body } = {}) {
  const token = await idToken()
  let response
  try {
    response = await fetch(`${TEMP_MAIL_ADMIN_URL}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new TempMailAdminError('The temp-mail server is not reachable (is it deployed, and is this site in its ALLOWED_ORIGINS?).')
  }
  let data = null
  try { data = await response.json() } catch { /* non-JSON */ }
  if (!response.ok) throw new TempMailAdminError(adminErrorMessage(response.status, data?.error), response.status)
  return data
}

export const getTempMailOverview = () => request('/api/admin/overview')
export const saveTempMailSettings = (patch) => request('/api/admin/settings', { method: 'PUT', body: patch })
export const removeTempMailAutoBlock = (domain) => request(`/api/admin/auto-block/${encodeURIComponent(domain)}`, { method: 'DELETE' })
