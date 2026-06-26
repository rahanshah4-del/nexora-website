const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1'
const GOOGLE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'

let jwkCache = { keys: null, expiresAt: 0 }
let serviceTokenCache = { token: '', expiresAt: 0 }

function getString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://nexorasolution.online,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function corsHeaders(request, env) {
  const origins = allowedOrigins(env)
  const origin = request.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
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

function bytesToBase64Url(bytes) {
  let binary = ''
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

async function getGoogleJwks() {
  const now = Date.now()
  if (jwkCache.keys && now < jwkCache.expiresAt) return jwkCache.keys
  const response = await fetch(GOOGLE_JWK_URL)
  if (!response.ok) throw new Error('Could not fetch Google signing keys.')
  const data = await response.json()
  const keys = {}
  ;(data.keys || []).forEach((key) => {
    keys[key.kid] = key
  })
  const cacheControl = response.headers.get('cache-control') || ''
  const maxAge = Number((cacheControl.match(/max-age=(\d+)/) || [])[1]) || 3600
  jwkCache = { keys, expiresAt: now + maxAge * 1000 }
  return keys
}

async function verifyFirebaseToken(token, env) {
  if (!token) throw new Error('Missing ID token.')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed ID token.')

  const header = JSON.parse(base64UrlToString(parts[0]))
  const payload = JSON.parse(base64UrlToString(parts[1]))
  const now = Math.floor(Date.now() / 1000)
  const projectId = getString(env.FIREBASE_PROJECT_ID)

  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm.')
  if (projectId && (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`)) {
    throw new Error('Firebase token project mismatch.')
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('ID token expired.')

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

function normalizePrivateKey(raw = '') {
  return String(raw).replace(/\\n/g, '\n').trim()
}

function pemToBytes(pem) {
  const base64 = normalizePrivateKey(pem)
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function signServiceJwt(env) {
  const email = getString(env.FIREBASE_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY)
  if (!email || !privateKey) throw new Error('Firebase service account is not configured.')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }
  const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(claim))}`
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
  const assertion = await signServiceJwt(env)
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

function firestoreName(env, path) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

function firestoreUrl(env, path) {
  const encoded = String(path || '').split('/').map(encodeURIComponent).join('/')
  return `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${encoded}`
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
  return document?.fields ? decodeFirestoreFields(document.fields) : null
}

async function firestoreGet(env, token, path) {
  const response = await fetch(firestoreUrl(env, path), { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 404) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore read failed (${response.status}).`)
  return decodeFirestoreDocument(payload)
}

async function firestorePatch(env, token, path, data, exists = true) {
  const fields = encodeFirestoreFields(data)
  const fieldPaths = Object.keys(data)
  const response = await fetch(`${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [{
        update: { name: firestoreName(env, path), fields },
        updateMask: { fieldPaths },
        currentDocument: { exists },
      }],
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Firestore update failed (${response.status}).`)
  return payload
}

async function assertUserCanReadJob(env, idToken, workspaceId, jobId) {
  const path = `workspaces/${encodeURIComponent(workspaceId)}/queueJobs/${encodeURIComponent(jobId)}`
  const response = await fetch(`${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (response.status === 200) return true
  return false
}

function nowIso() {
  return new Date().toISOString()
}

function jobPath(workspaceId, jobId) {
  return `workspaces/${workspaceId}/queueJobs/${jobId}`
}

async function markJob(env, workspaceId, jobId, patch) {
  const token = await getServiceAccessToken(env)
  await firestorePatch(env, token, jobPath(workspaceId, jobId), { ...patch, updatedAt: nowIso() }, true)
}

async function sendResendEmail(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing.')
  const fromName = getString(env.FROM_NAME) || 'Nexora Solution'
  const fromEmail = getString(env.FROM_EMAIL) || 'support@nexorasolution.online'
  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to, subject, html, text: text || undefined }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message || data?.error || data?.errors?.[0]?.message || 'Email could not be sent.')
  return data
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function applyPersonalization(value, recipient) {
  return String(value || '')
    .replaceAll('{{name}}', recipient?.name || '')
    .replaceAll('{{email}}', recipient?.email || '')
    .replaceAll('{{company}}', recipient?.company || '')
}

async function processEmailCampaign(env, job, workspaceId, jobId) {
  const recipients = Array.isArray(job.payload?.recipients) ? job.payload.recipients : []
  const subject = getString(job.payload?.subject)
  const html = getString(job.payload?.bodyHtml || job.payload?.html)
  const text = getString(job.payload?.bodyText || job.payload?.text)
  if (!subject || !html || !recipients.length) throw new Error('Campaign requires subject, bodyHtml, and recipients.')

  let sent = 0
  let failed = 0
  const batchSize = Math.min(Math.max(Number(job.payload?.batchSize) || 20, 1), 50)

  for (const group of chunk(recipients, batchSize)) {
    const settled = await Promise.all(group.map(async (recipient) => {
      try {
        await sendResendEmail(env, {
          to: getString(recipient.email),
          subject: applyPersonalization(subject, recipient),
          html: applyPersonalization(html, recipient),
          text: text ? applyPersonalization(text, recipient) : '',
        })
        return true
      } catch {
        return false
      }
    }))
    sent += settled.filter(Boolean).length
    failed += settled.filter((ok) => !ok).length
    await markJob(env, workspaceId, jobId, {
      progress: { total: recipients.length, completed: sent + failed, sent, failed },
      status: 'processing',
    })
  }

  const token = await getServiceAccessToken(env)
  if (job.payload?.campaignId) {
    await firestorePatch(env, token, `marketingCampaigns/${job.payload.campaignId}`, {
      status: 'completed',
      sentCount: sent,
      failedCount: failed,
      sentAt: nowIso(),
      updatedAt: nowIso(),
    }, true).catch(() => {})
  }

  return { sentCount: sent, failedCount: failed }
}

async function processWhatsAppBulk(env, job) {
  const recipients = Array.isArray(job.payload?.recipients) ? job.payload.recipients : []
  if (!recipients.length) return { skipped: true, reason: 'No WhatsApp recipients provided.' }
  if (!env.WHATSAPP_BULK_ENDPOINT) {
    return { queued: true, skippedProvider: true, recipients: recipients.length }
  }
  const response = await fetch(env.WHATSAPP_BULK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.WHATSAPP_BULK_TOKEN ? { Authorization: `Bearer ${env.WHATSAPP_BULK_TOKEN}` } : {}),
    },
    body: JSON.stringify(job.payload),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || `WhatsApp provider failed (${response.status}).`)
  return data || { ok: true }
}

async function createNotification(env, job) {
  const payload = job.payload || {}
  const userIds = Array.isArray(payload.userIds) && payload.userIds.length ? payload.userIds : [payload.userId || job.createdBy].filter(Boolean)
  const token = await getServiceAccessToken(env)
  await Promise.all(userIds.map((targetUserId) => {
    const id = `${payload.dedupeKey || crypto.randomUUID()}-${targetUserId}`.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 140)
    return firestorePatch(env, token, `workspaces/${job.workspaceId}/notifications/${id}`, {
      workspaceId: job.workspaceId,
      ownerId: job.workspaceId,
      userId: targetUserId,
      businessType: job.businessType || payload.businessType || '',
      type: payload.type || 'System',
      priority: payload.priority || 'medium',
      title: payload.title || 'Notification',
      message: payload.message || payload.title || 'Notification',
      relatedId: payload.relatedId || '',
      route: payload.route || '',
      metadata: payload.metadata || {},
      read: false,
      createdBy: payload.createdBy || job.createdBy || '',
      createdByEmail: payload.createdByEmail || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }, false).catch(async () => firestorePatch(env, token, `workspaces/${job.workspaceId}/notifications/${id}`, {
      message: payload.message || payload.title || 'Notification',
      updatedAt: nowIso(),
    }, true))
  }))
  return { count: userIds.length }
}

async function processJob(env, workspaceId, jobId) {
  const token = await getServiceAccessToken(env)
  const job = await firestoreGet(env, token, jobPath(workspaceId, jobId))
  if (!job) throw new Error('Queue job document was not found.')
  await markJob(env, workspaceId, jobId, {
    status: 'processing',
    attempts: Number(job.attempts || 0) + 1,
    startedAt: nowIso(),
    error: '',
  })

  let result
  if (job.type === 'email.campaign') result = await processEmailCampaign(env, job, workspaceId, jobId)
  else if (job.type === 'email.send') result = await sendResendEmail(env, job.payload || {})
  else if (job.type === 'notification.generate') result = await createNotification(env, job)
  else if (job.type === 'whatsapp.campaign' || job.type === 'whatsapp.bulk') result = await processWhatsAppBulk(env, job)
  else if (String(job.type || '').startsWith('restaurant.')) result = { acknowledged: true, browserLocalSave: true }
  else result = { acknowledged: true }

  await markJob(env, workspaceId, jobId, {
    status: 'completed',
    completedAt: nowIso(),
    result,
    progress: { ...(job.progress || {}), completed: job.progress?.total || job.progress?.completed || 1 },
  })
}

async function enqueueJob(request, env) {
  if (!allowedOrigins(env).includes(request.headers.get('Origin') || '')) {
    return jsonResponse(request, env, { success: false, error: 'Origin not allowed.' }, 403)
  }
  const auth = request.headers.get('Authorization') || ''
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  try {
    await verifyFirebaseToken(idToken, env)
  } catch {
    return jsonResponse(request, env, { success: false, error: 'Authentication failed.' }, 401)
  }

  const body = await request.json().catch(() => null)
  const workspaceId = getString(body?.workspaceId)
  const jobId = getString(body?.jobId)
  if (!workspaceId || !jobId) return jsonResponse(request, env, { success: false, error: 'workspaceId and jobId are required.' }, 400)
  if (!await assertUserCanReadJob(env, idToken, workspaceId, jobId)) {
    return jsonResponse(request, env, { success: false, error: 'Queue job access denied.' }, 403)
  }
  if (!env.BACKGROUND_QUEUE) return jsonResponse(request, env, { success: false, error: 'Queue binding is not configured.' }, 500)

  await env.BACKGROUND_QUEUE.send({ workspaceId, jobId }, { delaySeconds: 0 })
  await markJob(env, workspaceId, jobId, { status: 'pending', queuedAt: nowIso(), error: '' }).catch(() => {})
  return jsonResponse(request, env, { success: true, jobId, status: 'pending' })
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) })
      if (request.method === 'POST' && url.pathname === '/api/jobs/enqueue') return enqueueJob(request, env)
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse(request, env, {
          success: true,
          status: 'ok',
          service: 'nexora-background-jobs',
          queueConfigured: Boolean(env.BACKGROUND_QUEUE),
        })
      }
      return jsonResponse(request, env, { success: false, error: 'Not found.' }, 404)
    } catch (error) {
      return jsonResponse(request, env, { success: false, error: error?.message || 'Background worker failed.' }, 500)
    }
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      const { workspaceId, jobId } = message.body || {}
      try {
        if (!workspaceId || !jobId) throw new Error('Queue message missing workspaceId/jobId.')
        await processJob(env, workspaceId, jobId)
        message.ack()
      } catch (error) {
        const attempts = Number(message.attempts || 1)
        const maxAttempts = 5
        if (workspaceId && jobId) {
          await markJob(env, workspaceId, jobId, {
            status: attempts >= maxAttempts ? 'failed' : 'pending',
            error: error?.message || 'Background job failed.',
            failedAt: attempts >= maxAttempts ? nowIso() : '',
            nextRetryAt: attempts >= maxAttempts ? '' : new Date(Date.now() + Math.min(900, 30 * attempts) * 1000).toISOString(),
          }).catch(() => {})
        }
        if (attempts >= maxAttempts) message.ack()
        else message.retry({ delaySeconds: Math.min(900, 30 * attempts) })
      }
    }
  },
}
