import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1'
const GOOGLE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FIREBASE_CUSTOM_TOKEN_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'

let jwkCache = { keys: null, expiresAt: 0 }
let serviceTokenCache = { token: '', expiresAt: 0 }

const clean = (value) => (typeof value === 'string' ? value.trim() : '')
const lower = (value) => clean(value).toLowerCase()
const nowIso = () => new Date().toISOString()

function firstString(...values) {
  return values.map(clean).find(Boolean) || ''
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
  })
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://nexorasolution.online,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const origins = allowedOrigins(env)
  return {
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0] || 'https://nexorasolution.online',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function bytesToBase64Url(bytes) {
  let binary = ''
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

function base64UrlToBytes(input) {
  const base64 = String(input || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function base64UrlToString(input) {
  return new TextDecoder().decode(base64UrlToBytes(input))
}

function normalizePrivateKey(raw = '') {
  let value = String(raw || '').trim()
  if (!value) return ''
  try {
    const parsed = JSON.parse(value)
    if (parsed?.private_key) value = parsed.private_key
  } catch {
    // The secret may be a raw PEM string, not JSON.
  }
  const pemMatch = value.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/)
  if (pemMatch) value = pemMatch[0]
  value = value
    .replace(/^private_key\s*=\s*/i, '')
    .replace(/^private_key\s*:\s*/i, '')
    .replace(/^["']|["'],?$/g, '')
    .replace(/\\n/g, '\n')
    .trim()
  return value
}

function pemToBytes(pem) {
  const normalized = normalizePrivateKey(pem)
  const base64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '')
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function signJwt(privateKey, payload, header = { alg: 'RS256', typ: 'JWT' }) {
  const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${bytesToBase64Url(signature)}`
}

async function getServiceAccessToken(env) {
  const now = Date.now()
  if (serviceTokenCache.token && now < serviceTokenCache.expiresAt) return serviceTokenCache.token
  const email = clean(env.FIREBASE_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY)
  if (!email || !privateKey) throw new Error('Firebase service account secrets are not configured.')
  const seconds = Math.floor(now / 1000)
  const assertion = await signJwt(privateKey, {
    iss: email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: OAUTH_TOKEN_URL,
    exp: seconds + 3600,
    iat: seconds,
  })
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) throw new Error(payload?.error_description || 'Firebase service auth failed.')
  serviceTokenCache = {
    token: payload.access_token,
    expiresAt: now + Math.max(300, Number(payload.expires_in || 3600) - 300) * 1000,
  }
  return serviceTokenCache.token
}

async function createFirebaseCustomToken(env, uid, claims = {}) {
  const email = clean(env.FIREBASE_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY)
  if (!email || !privateKey) throw new Error('Firebase service account secrets are not configured.')
  const seconds = Math.floor(Date.now() / 1000)
  return signJwt(privateKey, {
    iss: email,
    sub: email,
    aud: FIREBASE_CUSTOM_TOKEN_AUD,
    iat: seconds,
    exp: seconds + 3600,
    uid,
    claims,
  })
}

async function getGoogleJwks() {
  const now = Date.now()
  if (jwkCache.keys && now < jwkCache.expiresAt) return jwkCache.keys
  const response = await fetch(GOOGLE_JWK_URL)
  if (!response.ok) throw new Error('Could not fetch Google signing keys.')
  const data = await response.json()
  const keys = Object.fromEntries((data.keys || []).map((key) => [key.kid, key]))
  const maxAge = Number((response.headers.get('cache-control')?.match(/max-age=(\d+)/) || [])[1]) || 3600
  jwkCache = { keys, expiresAt: now + maxAge * 1000 }
  return keys
}

async function verifyFirebaseToken(token, env) {
  if (!token) throw new Error('Missing ID token.')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed ID token.')
  const header = JSON.parse(base64UrlToString(parts[0]))
  const payload = JSON.parse(base64UrlToString(parts[1]))
  const seconds = Math.floor(Date.now() / 1000)
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm.')
  if (!payload.sub || payload.exp <= seconds) throw new Error('ID token expired.')
  if (payload.aud !== env.FIREBASE_PROJECT_ID || payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) {
    throw new Error('Firebase token project mismatch.')
  }
  const jwk = (await getGoogleJwks())[header.kid]
  if (!jwk) throw new Error('Unknown signing key.')
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!valid) throw new Error('Invalid ID token signature.')
  return payload
}

function authToken(request) {
  return clean((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''))
}

function firestoreName(env, path) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

function firestoreUrl(env, path = '') {
  const encodedPath = String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${encodedPath ? `/${encodedPath}` : ''}`
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } }
  if (value && typeof value === 'object') return { mapValue: { fields: encodeFirestoreFields(value) } }
  return { stringValue: String(value) }
}

function encodeFirestoreFields(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeFirestoreValue(value)]),
  )
}

function decodeFirestoreValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue)
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue.fields || {})
  return undefined
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]))
}

function decodeFirestoreDocument(document) {
  if (!document?.fields) return null
  const id = String(document.name || '').split('/').pop()
  return { id, ...decodeFirestoreFields(document.fields) }
}

async function firestoreGet(env, token, path) {
  const response = await fetch(firestoreUrl(env, path), { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 404) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore read failed (${response.status}).`)
  return decodeFirestoreDocument(payload)
}

async function firestoreList(env, token, collection, pageSize = 500) {
  const url = new URL(firestoreUrl(env, collection))
  url.searchParams.set('pageSize', String(pageSize))
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 404) return []
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore list failed (${response.status}).`)
  return (payload.documents || []).map(decodeFirestoreDocument).filter(Boolean)
}

async function firestoreRunQuery(env, token, collection, field, op, value, limit = 100) {
  const response = await fetch(`${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op,
            value: encodeFirestoreValue(value),
          },
        },
        limit,
      },
    }),
  })
  const payload = await response.json().catch(() => [])
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore query failed (${response.status}).`)
  return payload.map((row) => decodeFirestoreDocument(row.document)).filter(Boolean)
}

function updateWrite(env, path, data, exists) {
  const write = {
    update: { name: firestoreName(env, path), fields: encodeFirestoreFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
  }
  if (typeof exists === 'boolean') write.currentDocument = { exists }
  return write
}

async function firestoreCommit(env, token, writes) {
  const response = await fetch(`${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore commit failed (${response.status}).`)
  return payload
}

async function firestoreDelete(env, token, path) {
  const response = await fetch(firestoreUrl(env, path), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.error?.message || `Firestore delete failed (${response.status}).`)
  }
}

function safeDocId(value) {
  const raw = clean(value)
  if (!raw) return crypto.randomUUID().replace(/-/g, '')
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}

function adminEmails(env) {
  return String(env.BACKEND_ADMIN_EMAILS || 'admin@nexora.com,rahanshah2@gmail.com,rahanshah4@gmail.com')
    .split(',')
    .map((email) => lower(email))
    .filter(Boolean)
}

function isAdmin(claims, env) {
  const role = lower(claims?.role || claims?.userRole)
  return adminEmails(env).includes(lower(claims?.email)) || claims?.admin === true || claims?.owner === true || ['admin', 'owner'].includes(role)
}

function browserFromUa(ua = '') {
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  if (/firefox/i.test(ua)) return 'Firefox'
  return 'Browser'
}

function platformFromUa(ua = '') {
  if (/windows/i.test(ua)) return 'Windows'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS'
  if (/mac os|macintosh/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Device'
}

function safeOrigin(value, env) {
  const origin = clean(value)
  try {
    const parsed = new URL(origin)
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) return parsed.origin
    return allowedOrigins(env).includes(parsed.origin) ? parsed.origin : ''
  } catch {
    return ''
  }
}

function rpIdForOrigin(origin, env) {
  try {
    const parsed = new URL(origin)
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) return parsed.hostname
  } catch {
    // ignore
  }
  return clean(env.PASSKEY_RP_ID) || 'nexorasolution.online'
}

function expectedOrigins(origin, env) {
  const origins = allowedOrigins(env)
  return origin && !origins.includes(origin) ? [...origins, origin] : origins
}

function requestIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return clean(request.headers.get('cf-connecting-ip') || forwarded.split(',')[0] || request.headers.get('x-real-ip'))
}

async function readJson(request) {
  if (request.method === 'GET') return {}
  return request.json().catch(() => ({}))
}

async function requireAuth(request, env) {
  const claims = await verifyFirebaseToken(authToken(request), env)
  return { uid: claims.sub, claims }
}

async function validatePasskeyUser(env, token, userId, claims = null) {
  const user = (await firestoreGet(env, token, `users/${userId}`)) || {}
  const workspaceId = firstString(user.workspaceId, user.ownerId, user.companyId, userId)
  const workspace = workspaceId ? ((await firestoreGet(env, token, `workspaces/${workspaceId}`)) || {}) : {}
  const role = lower(user.role || user.userRole || user.accountRole || claims?.role || 'owner')
  const subscriptionStatus = lower(workspace.subscriptionStatus || workspace.planStatus || user.subscriptionStatus || user.planStatus || 'trial')
  const trialDate = firstString(workspace.trialEndsAt, user.trialEndsAt)
  const trialExpired = trialDate && new Date(trialDate).getTime() < Date.now()
  const blocked = user.blocked === true || user.isBlocked === true || workspace.blocked === true || workspace.isBlocked === true || lower(user.status) === 'blocked' || lower(workspace.status) === 'blocked'
  const deleted = user.deleted === true || user.isDeleted === true || workspace.deleted === true || workspace.isDeleted === true || lower(user.status) === 'deleted' || lower(workspace.status) === 'deleted'
  const inactiveWorkspace = lower(workspace.status) === 'inactive' || workspace.active === false || workspace.enabled === false
  const emailVerified = claims?.email_verified === true || user.emailVerified === true || user.emailVerifiedCustom === true

  if (!emailVerified) throw new Error('Email verification is required before using passkey.')
  if (blocked) throw new Error('Account is blocked.')
  if (deleted) throw new Error('Account or workspace is deleted.')
  if (inactiveWorkspace) throw new Error('Workspace is not active.')
  if (!role || ['deleted', 'blocked', 'disabled'].includes(role)) throw new Error('User role is not valid.')
  if (['expired', 'cancelled', 'canceled'].includes(subscriptionStatus) && trialExpired) throw new Error('Subscription is not valid.')
  return { user, workspace, workspaceId, role }
}

async function writeLoginHistory(env, token, data) {
  const id = crypto.randomUUID()
  const userAgent = clean(data.userAgent)
  await firestoreCommit(env, token, [updateWrite(env, `loginHistory/${id}`, {
    id,
    userId: clean(data.userId),
    email: lower(data.email),
    workspaceId: clean(data.workspaceId),
    authenticationMethod: lower(data.method || 'password'),
    status: lower(data.status || 'success'),
    browser: browserFromUa(userAgent),
    os: platformFromUa(userAgent),
    platform: platformFromUa(userAgent),
    device: clean(data.deviceName) || platformFromUa(userAgent),
    userAgent,
    country: clean(data.country),
    ip: clean(data.ip),
    credentialId: clean(data.credentialId),
    error: clean(data.error),
    createdAt: nowIso(),
    date: nowIso(),
    time: nowIso(),
  }, false)])
}

function mapPasskey(row = {}) {
  return {
    id: row.id || safeDocId(row.credentialId),
    credentialId: row.credentialId || '',
    deviceName: row.deviceName || '',
    browser: row.browser || '',
    platform: row.platform || '',
    createdAt: row.createdAt || '',
    lastUsed: row.lastUsed || '',
    status: row.status || 'active',
    forcedReRegister: row.forcedReRegister === true,
  }
}

async function beginRegistration(request, env) {
  const body = await readJson(request)
  const { uid, claims } = await requireAuth(request, env)
  const token = await getServiceAccessToken(env)
  const { user, workspaceId } = await validatePasskeyUser(env, token, uid, claims)
  const origin = safeOrigin(body.origin, env) || allowedOrigins(env)[0]
  const rpID = rpIdForOrigin(origin, env)
  const existing = await firestoreRunQuery(env, token, 'userPasskeys', 'userId', 'EQUAL', uid, 50)
  const options = await generateRegistrationOptions({
    rpName: clean(env.PASSKEY_RP_NAME) || 'Nexora Business Suite',
    rpID,
    userID: new TextEncoder().encode(uid),
    userName: claims.email || user.email || uid,
    userDisplayName: firstString(user.fullName, user.name, user.displayName, claims.name, claims.email),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    excludeCredentials: existing.filter((row) => row.status === 'active').map((row) => ({ id: row.credentialId })),
  })
  await firestoreCommit(env, token, [updateWrite(env, `passkeyChallenges/${uid}_registration`, {
    userId: uid,
    workspaceId,
    challenge: options.challenge,
    type: 'registration',
    rpID,
    origin,
    createdAt: nowIso(),
    expiresAt: Date.now() + 5 * 60 * 1000,
  })])
  return jsonResponse(request, env, { options })
}

async function finishRegistration(request, env) {
  const body = await readJson(request)
  const { uid, claims } = await requireAuth(request, env)
  const token = await getServiceAccessToken(env)
  const { user, workspaceId } = await validatePasskeyUser(env, token, uid, claims)
  const challenge = await firestoreGet(env, token, `passkeyChallenges/${uid}_registration`)
  if (!challenge || challenge.type !== 'registration' || Number(challenge.expiresAt || 0) < Date.now()) {
    throw new Error('Passkey setup expired. Try again.')
  }
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: expectedOrigins(challenge.origin, env),
    expectedRPID: challenge.rpID || clean(env.PASSKEY_RP_ID),
    requireUserVerification: true,
  })
  if (!verification.verified || !verification.registrationInfo?.credential) {
    throw new Error('Passkey registration could not be verified.')
  }
  const credential = verification.registrationInfo.credential
  const credentialId = credential.id
  const id = safeDocId(credentialId)
  const userAgent = clean(body.userAgent || request.headers.get('user-agent'))
  const deviceName = clean(body.deviceName) || `${platformFromUa(userAgent)} ${browserFromUa(userAgent)}`
  await firestoreCommit(env, token, [updateWrite(env, `userPasskeys/${id}`, {
    id,
    userId: uid,
    email: claims.email || user.email || '',
    workspaceId,
    credentialId,
    publicKey: bytesToBase64Url(credential.publicKey),
    counter: credential.counter || 0,
    transports: body.response?.response?.transports || [],
    deviceName,
    browser: browserFromUa(userAgent),
    platform: platformFromUa(userAgent),
    userAgent,
    status: 'active',
    credentialDeviceType: verification.registrationInfo.credentialDeviceType || '',
    credentialBackedUp: verification.registrationInfo.credentialBackedUp === true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastUsed: '',
    forcedReRegister: false,
  })])
  await firestoreDelete(env, token, `passkeyChallenges/${uid}_registration`).catch(() => {})
  return jsonResponse(request, env, { success: true, passkey: { id, credentialId, deviceName, status: 'active' } })
}

async function beginAuthentication(request, env) {
  const body = await readJson(request)
  const token = await getServiceAccessToken(env)
  const origin = safeOrigin(body.origin, env) || allowedOrigins(env)[0]
  const rpID = rpIdForOrigin(origin, env)
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: [] })
  const challengeId = crypto.randomUUID().replace(/-/g, '')
  await firestoreCommit(env, token, [updateWrite(env, `passkeyChallenges/${challengeId}`, {
    challengeId,
    challenge: options.challenge,
    type: 'authentication',
    rpID,
    origin,
    createdAt: nowIso(),
    expiresAt: Date.now() + 5 * 60 * 1000,
  }, false)])
  return jsonResponse(request, env, { challengeId, options })
}

async function finishAuthentication(request, env) {
  const body = await readJson(request)
  const token = await getServiceAccessToken(env)
  const response = body.response
  const credentialId = clean(response?.id)
  const challengeId = clean(body.challengeId)
  const userAgent = clean(body.userAgent || request.headers.get('user-agent'))
  const ip = requestIp(request)
  const challenge = await firestoreGet(env, token, `passkeyChallenges/${challengeId}`)
  if (!challenge || challenge.type !== 'authentication' || Number(challenge.expiresAt || 0) < Date.now()) {
    throw new Error('Passkey login expired. Try again.')
  }
  const passkeys = await firestoreRunQuery(env, token, 'userPasskeys', 'credentialId', 'EQUAL', credentialId, 1)
  const passkey = passkeys[0]
  if (!passkey || passkey.status !== 'active') {
    await writeLoginHistory(env, token, { method: 'passkey', status: 'failed', userAgent, ip, credentialId, error: 'Passkey not registered or disabled.' }).catch(() => {})
    throw new Error('Passkey is not registered or has been disabled.')
  }
  const userContext = await validatePasskeyUser(env, token, passkey.userId, null)
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: expectedOrigins(challenge.origin, env),
    expectedRPID: challenge.rpID || clean(env.PASSKEY_RP_ID),
    credential: {
      id: passkey.credentialId,
      publicKey: base64UrlToBytes(passkey.publicKey),
      counter: Number(passkey.counter || 0),
      transports: passkey.transports || [],
    },
    requireUserVerification: true,
  })
  if (!verification.verified) {
    await writeLoginHistory(env, token, { userId: passkey.userId, email: passkey.email || '', workspaceId: passkey.workspaceId || '', method: 'passkey', status: 'failed', userAgent, ip, credentialId, error: 'Signature verification failed.' }).catch(() => {})
    throw new Error('Passkey verification failed.')
  }
  await firestoreCommit(env, token, [updateWrite(env, `userPasskeys/${passkey.id}`, {
    counter: verification.authenticationInfo.newCounter,
    lastUsed: nowIso(),
    updatedAt: nowIso(),
    browser: browserFromUa(userAgent),
    platform: platformFromUa(userAgent),
  }, true)])
  await firestoreDelete(env, token, `passkeyChallenges/${challengeId}`).catch(() => {})
  await writeLoginHistory(env, token, {
    userId: passkey.userId,
    email: passkey.email || userContext.user.email || '',
    workspaceId: userContext.workspaceId,
    method: 'passkey',
    status: 'success',
    userAgent,
    ip,
    credentialId,
    deviceName: passkey.deviceName || '',
  }).catch(() => {})
  const customToken = await createFirebaseCustomToken(env, passkey.userId, { authMethod: 'passkey', workspaceId: userContext.workspaceId })
  return jsonResponse(request, env, { success: true, token: customToken, userId: passkey.userId, workspaceId: userContext.workspaceId })
}

async function listMine(request, env) {
  const { uid } = await requireAuth(request, env)
  const token = await getServiceAccessToken(env)
  const rows = await firestoreRunQuery(env, token, 'userPasskeys', 'userId', 'EQUAL', uid, 100)
  return jsonResponse(request, env, { passkeys: rows.map(mapPasskey) })
}

async function renameMine(request, env) {
  const body = await readJson(request)
  const { uid } = await requireAuth(request, env)
  const token = await getServiceAccessToken(env)
  const id = safeDocId(body.id)
  const deviceName = clean(body.deviceName).slice(0, 80)
  if (!deviceName) throw new Error('Device name is required.')
  const passkey = await firestoreGet(env, token, `userPasskeys/${id}`)
  if (!passkey || passkey.userId !== uid) throw new Error('Passkey not found.')
  await firestoreCommit(env, token, [updateWrite(env, `userPasskeys/${id}`, { deviceName, updatedAt: nowIso() }, true)])
  return jsonResponse(request, env, { success: true })
}

async function removeMine(request, env) {
  const body = await readJson(request)
  const { uid } = await requireAuth(request, env)
  const token = await getServiceAccessToken(env)
  const id = safeDocId(body.id)
  const passkey = await firestoreGet(env, token, `userPasskeys/${id}`)
  if (!passkey || passkey.userId !== uid) throw new Error('Passkey not found.')
  await firestoreCommit(env, token, [updateWrite(env, `userPasskeys/${id}`, { status: 'removed', removedAt: nowIso(), updatedAt: nowIso() }, true)])
  return jsonResponse(request, env, { success: true })
}

async function adminList(request, env) {
  const body = await readJson(request)
  const { claims } = await requireAuth(request, env)
  if (!isAdmin(claims, env)) throw new Error('Admin access required.')
  const token = await getServiceAccessToken(env)
  const [keys, users, sessions, logins] = await Promise.all([
    firestoreList(env, token, 'userPasskeys', 1000),
    firestoreList(env, token, 'users', 1000),
    firestoreList(env, token, 'userSessions', 1000),
    firestoreList(env, token, 'loginHistory', 500),
  ])
  const userMap = new Map(users.map((user) => [user.id, user]))
  const search = lower(body.search)
  let passkeys = keys.map((row) => {
    const user = userMap.get(row.userId) || {}
    return {
      id: row.id,
      userId: row.userId || '',
      user: firstString(user.fullName, user.name, user.displayName, row.email, user.email),
      email: firstString(row.email, user.email),
      company: firstString(user.companyName, user.workspaceName, user.businessName),
      workspaceId: row.workspaceId || user.workspaceId || '',
      deviceName: row.deviceName || '',
      browser: row.browser || '',
      platform: row.platform || '',
      createdAt: row.createdAt || '',
      lastUsed: row.lastUsed || '',
      status: row.status || 'active',
      forcedReRegister: row.forcedReRegister === true,
    }
  })
  if (search) {
    passkeys = passkeys.filter((row) => [row.user, row.email, row.company, row.workspaceId, row.deviceName].some((value) => lower(value).includes(search)))
  }
  const loginHistory = logins
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 500)
  return jsonResponse(request, env, { passkeys, loginHistory, activeSessions: sessions })
}

async function adminUpdate(request, env) {
  const body = await readJson(request)
  const { claims } = await requireAuth(request, env)
  if (!isAdmin(claims, env)) throw new Error('Admin access required.')
  const token = await getServiceAccessToken(env)
  const id = safeDocId(body.id)
  const action = lower(body.action)
  const passkey = await firestoreGet(env, token, `userPasskeys/${id}`)
  if (!passkey) throw new Error('Passkey not found.')
  let update = null
  if (action === 'disable') update = { status: 'disabled', updatedAt: nowIso() }
  if (action === 'delete') update = { status: 'deleted', deletedAt: nowIso(), updatedAt: nowIso() }
  if (action === 'force-re-register') update = { forcedReRegister: true, status: 'disabled', updatedAt: nowIso() }
  if (!update) throw new Error('Unsupported passkey action.')
  await firestoreCommit(env, token, [updateWrite(env, `userPasskeys/${id}`, update, true)])
  return jsonResponse(request, env, { success: true })
}

async function adminForceLogout(request, env) {
  const body = await readJson(request)
  const { claims } = await requireAuth(request, env)
  if (!isAdmin(claims, env)) throw new Error('Admin access required.')
  const token = await getServiceAccessToken(env)
  const userId = clean(body.userId)
  if (!userId) throw new Error('User ID is required.')
  await firestoreCommit(env, token, [updateWrite(env, `users/${userId}`, { forceLogoutAt: nowIso(), updatedAt: nowIso() }, true)])
  return jsonResponse(request, env, { success: true })
}

async function recordHistory(request, env) {
  const body = await readJson(request)
  const token = await getServiceAccessToken(env)
  let claims = null
  const bearer = authToken(request)
  if (bearer) claims = await verifyFirebaseToken(bearer, env).catch(() => null)
  await writeLoginHistory(env, token, {
    method: lower(body.method || 'password'),
    status: lower(body.status || 'success'),
    userId: clean(body.userId || claims?.sub),
    email: lower(body.email || claims?.email),
    workspaceId: clean(body.workspaceId),
    userAgent: clean(body.userAgent || request.headers.get('user-agent')),
    ip: requestIp(request),
    error: clean(body.error),
  })
  return jsonResponse(request, env, { success: true })
}

async function route(request, env) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request, env) })
  if (url.pathname === '/health') return jsonResponse(request, env, { ok: true, service: 'nexora-passkeys-api' })
  if (url.pathname === '/api/passkeys/registration/options' && request.method === 'POST') return beginRegistration(request, env)
  if (url.pathname === '/api/passkeys/registration/verify' && request.method === 'POST') return finishRegistration(request, env)
  if (url.pathname === '/api/passkeys/authentication/options' && request.method === 'POST') return beginAuthentication(request, env)
  if (url.pathname === '/api/passkeys/authentication/verify' && request.method === 'POST') return finishAuthentication(request, env)
  if (url.pathname === '/api/passkeys/me' && request.method === 'GET') return listMine(request, env)
  if (url.pathname === '/api/passkeys/me/rename' && request.method === 'PATCH') return renameMine(request, env)
  if (url.pathname === '/api/passkeys/me/remove' && request.method === 'PATCH') return removeMine(request, env)
  if (url.pathname === '/api/passkeys/admin/security' && request.method === 'POST') return adminList(request, env)
  if (url.pathname === '/api/passkeys/admin/update' && request.method === 'PATCH') return adminUpdate(request, env)
  if (url.pathname === '/api/passkeys/admin/force-logout' && request.method === 'POST') return adminForceLogout(request, env)
  if (url.pathname === '/api/passkeys/login-history' && request.method === 'POST') return recordHistory(request, env)
  return jsonResponse(request, env, { error: 'Not found.' }, 404)
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env)
    } catch (error) {
      return jsonResponse(request, env, { error: error?.message || 'Passkey worker failed.' }, 400)
    }
  },
}
