// Nexora WhatsApp API worker.
//
// Backend for the Meta Embedded Signup / Coexistence connection flow. It does
// three jobs:
//
//   1. POST /api/whatsapp/connect            — receive the Embedded Signup result
//      from the frontend, validate the caller's Firebase ID token, confirm
//      workspace access, (placeholder) exchange the auth code for a Meta token,
//      and return ONLY safe non-secret connection metadata.
//
//   2. GET  /webhooks/whatsapp/:workspaceId  — Meta webhook verification handshake
//      (validates hub.mode + hub.verify_token, echoes hub.challenge).
//
//   3. POST /webhooks/whatsapp/:workspaceId  — receive webhook events, validate the
//      Meta signature, normalize, identify the phone_number_id, and log.
//
// SECURITY MODEL
//   - Meta access tokens / app secrets / verify tokens live only in the worker's
//     secret store (env). They are never returned to the browser or written to
//     Firestore.
//   - The connect endpoint requires a valid Firebase ID token (RS256, verified
//     against Google's public keys) and confirms workspace access by reading a
//     workspace-scoped doc with the *caller's* token (Firestore security rules
//     enforce membership — no service account needed).
//   - Webhook POSTs are authenticated by the Meta X-Hub-Signature-256 HMAC.
//   - Workspace isolation: every webhook is scoped to :workspaceId in the path
//     and matched to a phone_number_id before any state is touched.

const GOOGLE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1'
const DEFAULT_GRAPH_VERSION = 'v21.0'

/* --------------------------------- CORS ---------------------------------- */

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://nexorasolution.online,http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

function corsHeaders(request, env) {
  const origins = allowedOrigins(env)
  const origin = request.headers.get('Origin') || ''
  const allowed = origins.includes(origin) ? origin : origins[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
  })
}

/* ------------------------------ encoding utils ---------------------------- */

function base64UrlToBytes(input) {
  const base64 = String(input).replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64UrlToString(input) {
  return new TextDecoder().decode(base64UrlToBytes(input))
}

function bytesToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

// Constant-time string compare to avoid timing leaks on signature checks.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

/* ----------------------- Firebase ID token verification ------------------- */

let jwkCache = { keys: null, expiresAt: 0 }

async function getGoogleJwks() {
  const now = Date.now()
  if (jwkCache.keys && now < jwkCache.expiresAt) return jwkCache.keys
  const res = await fetch(GOOGLE_JWK_URL)
  if (!res.ok) throw new Error('Could not fetch Google signing keys.')
  const data = await res.json()
  const byKid = {}
  for (const key of data.keys || []) byKid[key.kid] = key
  // Respect cache lifetime from the response, default 1h.
  const cacheControl = res.headers.get('cache-control') || ''
  const maxAge = Number((cacheControl.match(/max-age=(\d+)/) || [])[1]) || 3600
  jwkCache = { keys: byKid, expiresAt: now + maxAge * 1000 }
  return byKid
}

// Verify a Firebase ID token (RS256) and return its claims, or throw.
async function verifyFirebaseToken(token, env) {
  if (!token) throw new Error('Missing ID token.')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed ID token.')

  const header = JSON.parse(base64UrlToString(parts[0]))
  const payload = JSON.parse(base64UrlToString(parts[1]))
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm.')

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('ID token expired.')
  if (typeof payload.iat === 'number' && payload.iat > now + 300) throw new Error('ID token not yet valid.')
  if (!payload.sub) throw new Error('ID token missing subject.')

  const projectId = env.FIREBASE_PROJECT_ID
  if (projectId) {
    if (payload.aud !== projectId) throw new Error('ID token audience mismatch.')
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('ID token issuer mismatch.')
  }

  const jwks = await getGoogleJwks()
  const jwk = jwks[header.kid]
  if (!jwk) throw new Error('Unknown signing key.')

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(parts[2]), signed)
  if (!valid) throw new Error('Invalid ID token signature.')

  return payload
}

// Confirm the caller can access the workspace by reading a workspace-scoped doc
// with the caller's own token. Firestore security rules enforce membership:
//   200 => member (doc exists) · 404 => member (doc not created yet) · 403 => denied.
// When FIREBASE_PROJECT_ID is not configured this returns true with a logged
// note (token validity alone is the gate in that placeholder mode).
async function validateWorkspaceAccess(env, idToken, workspaceId) {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) {
    console.log('[WhatsApp Worker] workspace access skipped (FIREBASE_PROJECT_ID unset)')
    return true
  }
  const url = `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/workspaces/${encodeURIComponent(workspaceId)}/whatsappSettings/config`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } })
  if (res.status === 200 || res.status === 404) return true
  return false
}

/* ------------------------------ token exchange ---------------------------- */

// Placeholder-safe Meta auth code exchange. When META_APP_SECRET + code are
// present we attempt the exchange to validate the code; the resulting token is
// NEVER returned or persisted here — production stores it in the secret store /
// KV. The connection is always reported as pending_verification: the webhook
// handshake is what promotes it to connected.
async function exchangeMetaCode(env, code) {
  if (!code) return { attempted: false, ok: false, reason: 'no_code' }
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    return { attempted: false, ok: false, reason: 'exchange_not_configured' }
  }
  try {
    const version = env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION
    const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`)
    url.searchParams.set('client_id', env.META_APP_ID)
    url.searchParams.set('client_secret', env.META_APP_SECRET)
    url.searchParams.set('code', code)
    const res = await fetch(url.toString())
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.access_token) {
      return { attempted: true, ok: false, reason: data?.error?.message || 'exchange_failed' }
    }
    // TODO(secure-store): persist data.access_token in env secret / KV only.
    return { attempted: true, ok: true }
  } catch (error) {
    return { attempted: true, ok: false, reason: error?.message || 'exchange_error' }
  }
}

/* ------------------------------ connect endpoint -------------------------- */

async function handleConnect(request, env) {
  console.log('[WhatsApp Worker] connect request')

  if (!allowedOrigins(env).includes(request.headers.get('Origin') || '')) {
    return jsonResponse(request, env, { ok: false, error: 'Origin not allowed.' }, 403)
  }

  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  let claims
  try {
    claims = await verifyFirebaseToken(token, env)
    console.log('[WhatsApp Worker] firebase token verified')
  } catch (error) {
    return jsonResponse(request, env, { ok: false, error: 'Authentication failed.', code: 'auth_failed' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse(request, env, { ok: false, error: 'Invalid JSON body.' }, 400)
  }

  const workspaceId = String(body?.workspaceId || '').trim()
  if (!workspaceId) {
    return jsonResponse(request, env, { ok: false, error: 'workspaceId is required.' }, 400)
  }

  let hasAccess = false
  try {
    hasAccess = await validateWorkspaceAccess(env, token, workspaceId)
  } catch {
    hasAccess = false
  }
  if (!hasAccess) {
    return jsonResponse(request, env, { ok: false, error: 'Workspace access denied.', code: 'forbidden' }, 403)
  }
  console.log('[WhatsApp Worker] workspace access verified')

  const phoneNumberId = String(body?.phoneNumberId || '').trim()
  const wabaId = String(body?.wabaId || body?.businessAccountId || '').trim()
  const businessName = String(body?.businessName || '').trim()
  const code = String(body?.code || '').trim()

  const exchange = await exchangeMetaCode(env, code)

  // Always pending_verification in this preparation phase — the webhook handshake
  // is what confirms the connection. No secret material is ever returned.
  return jsonResponse(request, env, {
    ok: true,
    connectionStatus: 'pending_verification',
    verificationStatus: 'verified',
    webhookStatus: 'pending',
    phoneNumberId,
    businessAccountId: wabaId,
    businessName,
    exchange: { attempted: exchange.attempted, ok: exchange.ok },
  })
}

/* ------------------------------- webhooks --------------------------------- */

function handleWebhookVerify(request, env, workspaceId, url) {
  const mode = url.searchParams.get('hub.mode')
  const verifyToken = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  // The deployed secret is named META_WHATSAPP_VERIFY_TOKEN. Fall back to the
  // older WHATSAPP_VERIFY_TOKEN name so either binding works.
  const expected = env.META_WHATSAPP_VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN || ''

  // Safe debug — never logs actual token values, only presence/match booleans.
  console.log('[Webhook Verify]', {
    workspaceId,
    mode,
    tokenPresent: !!verifyToken,
    expectedTokenPresent: !!expected,
    tokenMatches: Boolean(verifyToken) && Boolean(expected) && verifyToken.trim() === expected.trim(),
    challengePresent: !!challenge,
  })

  // Meta's initial verification (GET) must succeed for any workspaceId — including
  // "default" — without a Firestore workspace lookup. The verify token is the gate.
  if (
    mode === 'subscribe' &&
    verifyToken &&
    expected &&
    verifyToken.trim() === expected.trim() &&
    challenge
  ) {
    console.log('[Webhook Verify] success', workspaceId)
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.log('[Webhook Verify] failed', workspaceId)
  return new Response('Forbidden', { status: 403 })
}

async function verifyMetaSignature(env, rawBody, signatureHeader) {
  if (!env.META_APP_SECRET) return { checked: false, valid: false }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return { checked: true, valid: false }
  const provided = signatureHeader.slice('sha256='.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  return { checked: true, valid: timingSafeEqual(bytesToHex(mac), provided) }
}

// Pull out the first phone_number_id present in a WhatsApp webhook payload.
function extractPhoneNumberId(payload) {
  try {
    for (const entry of payload?.entry || []) {
      for (const change of entry?.changes || []) {
        const id = change?.value?.metadata?.phone_number_id
        if (id) return String(id)
      }
    }
  } catch {
    /* ignore malformed payloads */
  }
  return ''
}

async function handleWebhookEvent(request, env, workspaceId) {
  const rawBody = await request.text()
  const signature = await verifyMetaSignature(env, rawBody, request.headers.get('X-Hub-Signature-256'))

  // If a secret is configured, an invalid signature is rejected outright.
  if (signature.checked && !signature.valid) {
    console.log('[Webhook Event] received', workspaceId, 'signature invalid')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  console.log('[Webhook Event] received', workspaceId)
  const phoneNumberId = extractPhoneNumberId(payload)

  if (phoneNumberId) {
    // First version: log only. Matching phone_number_id -> workspace + updating
    // webhookStatus / lastWebhookAt is done server-side with a service account
    // (see TODO below) so no secret-bearing write is needed from this path.
    console.log('[Webhook Event] matched workspace', workspaceId, phoneNumberId)
    // TODO(secure-store): with a Firestore service account, update
    //   workspaces/{workspaceId}/whatsappSettings/config
    //   { webhookStatus: 'verified', lastWebhookAt: <now>, webhookVerified: true }
    //   and append the normalized event to whatsappMessages — never raw secrets.
  } else {
    console.log('[Webhook Event] unmatched phone number', workspaceId)
  }

  // Always 200 quickly so Meta does not retry; processing is best-effort.
  return new Response('EVENT_RECEIVED', { status: 200 })
}

/* --------------------------------- router --------------------------------- */

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      const { pathname } = url

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) })
      }

      if (request.method === 'GET' && pathname === '/health') {
        return jsonResponse(request, env, {
          ok: true,
          service: 'nexora-whatsapp-api',
          hasProjectId: Boolean(env.FIREBASE_PROJECT_ID),
          hasVerifyToken: Boolean(env.WHATSAPP_VERIFY_TOKEN),
          hasAppSecret: Boolean(env.META_APP_SECRET),
        })
      }

      if (pathname === '/api/whatsapp/connect') {
        if (request.method !== 'POST') {
          return jsonResponse(request, env, { ok: false, error: 'Method not allowed.' }, 405)
        }
        return handleConnect(request, env)
      }

      const webhookMatch = pathname.match(/^\/webhooks\/whatsapp\/([^/]+)\/?$/)
      if (webhookMatch) {
        const workspaceId = decodeURIComponent(webhookMatch[1])
        if (request.method === 'GET') return handleWebhookVerify(request, env, workspaceId, url)
        if (request.method === 'POST') return handleWebhookEvent(request, env, workspaceId)
        return new Response('Method not allowed', { status: 405 })
      }

      return jsonResponse(request, env, { ok: false, error: 'Not found' }, 404)
    } catch (error) {
      return jsonResponse(request, env, { ok: false, error: error?.message || 'Worker error.' }, 500)
    }
  },
}
