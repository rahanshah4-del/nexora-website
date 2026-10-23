/** Admin auth for the Sentinel: a Firebase ID token whose UID is on the platform admin list. */
const clean = (value) => String(value ?? '').trim()

// Platform admins, by Firebase Auth UID — never by email.
export const ADMIN_UIDS = Object.freeze(['oR66tNaNw5Z5kXYdTa2Egco9Uv22'])
const DEFAULT_PROJECT_ID = 'nexora-business-suite'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

function b64urlToString(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + (padded.length % 4 ? '='.repeat(4 - (padded.length % 4)) : ''))
}
function b64urlToBytes(input) {
  const binary = b64urlToString(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Verify a Firebase ID token (RS256). Returns the payload or throws. */
export async function verifyFirebaseIdToken(idToken, projectId = DEFAULT_PROJECT_ID, fetchFn = fetch) {
  const parts = String(idToken || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [h, p, s] = parts
  const header = JSON.parse(b64urlToString(h))
  const payload = JSON.parse(b64urlToString(p))
  if (payload.aud !== projectId) throw new Error('Invalid audience')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer')
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (!payload.sub) throw new Error('Invalid subject')
  const jwks = await (await fetchFn(JWKS_URL)).json()
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('Signing key not found')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) throw new Error('Invalid signature')
  return payload
}

/** { ok: true, uid } or { ok: false, status, error }. */
export async function authorizeAdmin(request, env, fetchFn = fetch) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return { ok: false, status: 401, error: 'unauthenticated' }
  try {
    const claims = await verifyFirebaseIdToken(token, clean(env.FIREBASE_PROJECT_ID) || DEFAULT_PROJECT_ID, fetchFn)
    if (!ADMIN_UIDS.includes(claims.sub)) return { ok: false, status: 403, error: 'forbidden' }
    return { ok: true, uid: claims.sub }
  } catch {
    return { ok: false, status: 401, error: 'unauthenticated' }
  }
}

