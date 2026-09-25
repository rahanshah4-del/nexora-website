/**
 * nexora-releases-api — desktop installer releases for Nexora Restaurant POS.
 *
 * The installer (~104 MB) is larger than Cloudflare's 100 MB request-body
 * limit, so the admin browser uploads it through this Worker as an R2 multipart
 * upload in 10 MiB parts; each part is its own request, well under the limit.
 * No S3 keys, presigned URLs or bucket CORS are involved: everything goes
 * through the RELEASES binding.
 *
 * Release metadata lives next to the installers in the same bucket:
 *   restaurant-pos/latest.json    — the release /download/restaurant-pos shows
 *   restaurant-pos/releases.json  — every published release, newest first
 *
 * Upload and publish are separate steps, so an uploaded installer can be
 * downloaded and tested from its version URL before it becomes "latest".
 * Publishing an older version again is how a rollback is done.
 */
import {
  INSTALLER_CACHE_CONTROL,
  INSTALLER_CONTENT_TYPE,
  LATEST_KEY,
  LEGACY_DOWNLOAD_URL,
  MAX_PART_NUMBER,
  MAX_PART_REQUEST_BYTES,
  METADATA_CACHE_CONTROL,
  PART_SIZE,
  PRODUCT_ID,
  RELEASES_KEY,
  allowedOrigins,
  buildLatestJson,
  clean,
  downloadFileName,
  hasMzHeader,
  installerKey,
  isAdminClaims,
  isStrictSemver,
  isValidInstallerKey,
  isValidInstallerSize,
  isValidPartNumber,
  isValidSha256,
  lower,
  parseReleasesJson,
  sanitizeNotes,
  upsertRelease,
  versionFromInstallerKey,
  versionPrefix,
} from './lib.js'

const GOOGLE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const MAX_JSON_BODY_BYTES = 16 * 1024
const MAX_UPLOAD_ID_LENGTH = 1024

let jwkCache = { keys: null, expiresAt: 0 }

class HttpError extends Error {
  constructor(status, error, message) {
    super(message)
    this.status = status
    this.error = error
  }
}

// ── Firebase ID token verification (copied from nexora-payments-api) ─────────

function base64UrlToBytes(input) {
  const base64 = String(input).replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function base64UrlToString(input) {
  return new TextDecoder().decode(base64UrlToBytes(input))
}

async function getGoogleJwks() {
  const now = Date.now()
  if (jwkCache.keys && now < jwkCache.expiresAt) return jwkCache.keys
  const response = await fetch(GOOGLE_JWK_URL)
  if (!response.ok) throw new HttpError(503, 'auth_unavailable', 'Could not load Firebase signing keys. Try again shortly.')
  const payload = await response.json()
  const keys = Object.fromEntries((payload.keys || []).map((key) => [key.kid, key]))
  const maxAge = Number((response.headers.get('cache-control')?.match(/max-age=(\d+)/) || [])[1]) || 3600
  jwkCache = { keys, expiresAt: now + maxAge * 1000 }
  return keys
}

async function verifyFirebaseToken(token, env) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed Firebase token.')
  const header = JSON.parse(base64UrlToString(parts[0]))
  const payload = JSON.parse(base64UrlToString(parts[1]))
  const now = Math.floor(Date.now() / 1000)
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected Firebase token algorithm.')
  if (!payload.sub || payload.exp <= now || payload.iat > now + 300) throw new Error('Expired or invalid Firebase token.')
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error('Firebase token audience mismatch.')
  if (payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) throw new Error('Firebase token issuer mismatch.')
  const jwk = (await getGoogleJwks())[header.kid]
  if (!jwk) throw new Error('Unknown Firebase signing key.')
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
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
  if (!valid) throw new Error('Invalid Firebase token signature.')
  return payload
}

function bearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  const match = /^Bearer\s+(\S+)$/i.exec(header)
  return match ? match[1] : ''
}

/** Resolves to the admin's email, or throws 401 (no/invalid token) / 403 (not admin). */
async function requireAdmin(request, env) {
  const token = bearerToken(request)
  if (!token) throw new HttpError(401, 'unauthorized', 'Sign in as the backend admin to manage releases.')
  let claims
  try {
    claims = await verifyFirebaseToken(token, env)
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, 'unauthorized', 'Invalid or expired sign-in token. Sign in again.')
  }
  if (!isAdminClaims(claims, env)) {
    throw new HttpError(403, 'forbidden', 'Only the verified backend admin can manage desktop releases.')
  }
  return lower(claims.email)
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function corsHeaders(request, env, isPublic) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '86400',
  }
  if (isPublic) return { ...headers, 'Access-Control-Allow-Origin': '*' }
  const origin = request.headers.get('Origin') || ''
  return {
    ...headers,
    ...(allowedOrigins(env).includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  }
}

function jsonResponse(request, env, body, status = 200, { isPublic = false, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env, isPublic),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

async function readJsonBody(request) {
  const text = await request.text()
  if (text.length > MAX_JSON_BODY_BYTES) throw new HttpError(413, 'payload_too_large', 'Request body is too large.')
  try {
    const body = JSON.parse(text || '{}')
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object')
    return body
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be a JSON object.')
  }
}

function logAdminAction(action, email, details = {}) {
  console.log(JSON.stringify({ service: 'nexora-releases-api', action, email, ...details }))
}

function requireStorage(env) {
  if (!env.RELEASES) throw new HttpError(500, 'storage_not_configured', 'Release storage is not configured.')
}

function requireInstallerKey(value) {
  const key = clean(value)
  if (!isValidInstallerKey(key)) throw new HttpError(400, 'invalid_key', 'Upload key is not a valid installer key.')
  return key
}

function requireUploadId(value) {
  const uploadId = clean(value)
  if (!uploadId || uploadId.length > MAX_UPLOAD_ID_LENGTH) throw new HttpError(400, 'invalid_upload_id', 'Upload id is missing or invalid.')
  return uploadId
}

async function readReleases(env) {
  const object = await env.RELEASES.get(RELEASES_KEY)
  return object ? parseReleasesJson(await object.text()) : []
}

async function readLatest(env) {
  const object = await env.RELEASES.get(LATEST_KEY)
  if (!object) return null
  try {
    return JSON.parse(await object.text())
  } catch {
    return null
  }
}

async function putJson(env, key, value, cacheControl) {
  await env.RELEASES.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl },
  })
}

// ── Admin routes ─────────────────────────────────────────────────────────────

async function createUpload(request, env) {
  const email = await requireAdmin(request, env)
  const body = await readJsonBody(request)
  const version = clean(body.version)
  const sizeBytes = body.sizeBytes
  const sha256 = lower(body.sha256)
  if (!isStrictSemver(version)) throw new HttpError(400, 'invalid_version', 'Version must be X.Y.Z, for example 1.0.1 (no "v" prefix).')
  if (!isValidInstallerSize(sizeBytes)) throw new HttpError(400, 'invalid_size', 'Installer size must be between 1 MB and 300 MB.')
  if (!isValidSha256(sha256)) throw new HttpError(400, 'invalid_sha256', 'sha256 must be 64 hexadecimal characters.')

  const releases = await readReleases(env)
  if (releases.some((entry) => entry?.version === version)) {
    throw new HttpError(409, 'version_exists', `Version ${version} has already been published.`)
  }
  const existing = await env.RELEASES.list({ prefix: versionPrefix(version), limit: 1 })
  if (existing.objects.length > 0) {
    throw new HttpError(409, 'version_exists', `An installer for version ${version} is already uploaded.`)
  }

  const key = installerKey(version)
  const upload = await env.RELEASES.createMultipartUpload(key, {
    httpMetadata: {
      contentType: INSTALLER_CONTENT_TYPE,
      contentDisposition: `attachment; filename="${downloadFileName(version)}"`,
      cacheControl: INSTALLER_CACHE_CONTROL,
    },
    customMetadata: { version, sha256, sizeBytes: String(sizeBytes), uploadedBy: email },
  })
  logAdminAction('upload_created', email, { version, sizeBytes })
  return jsonResponse(request, env, { key, uploadId: upload.uploadId, partSize: PART_SIZE })
}

async function uploadPart(request, env, url, uploadIdParam, partNumberParam) {
  const email = await requireAdmin(request, env)
  const key = requireInstallerKey(url.searchParams.get('key'))
  const uploadId = requireUploadId(uploadIdParam)
  const partNumber = /^\d{1,5}$/.test(partNumberParam) ? Number(partNumberParam) : NaN
  if (!isValidPartNumber(partNumber)) throw new HttpError(400, 'invalid_part_number', `Part number must be 1–${MAX_PART_NUMBER}.`)

  // R2 needs a known length to accept a streamed body, and it caps the part.
  const lengthHeader = request.headers.get('Content-Length')
  if (!lengthHeader) throw new HttpError(411, 'length_required', 'Content-Length is required for part uploads.')
  const contentLength = Number(lengthHeader)
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) throw new HttpError(400, 'invalid_length', 'Part body is empty or has an invalid length.')
  if (contentLength > MAX_PART_REQUEST_BYTES) throw new HttpError(413, 'part_too_large', 'Each part must be at most 10 MiB.')
  if (!request.body) throw new HttpError(400, 'invalid_length', 'Part body is empty.')

  let part
  try {
    part = await env.RELEASES.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, request.body)
  } catch (error) {
    console.error('[releases] uploadPart failed', error?.message)
    throw new HttpError(400, 'upload_part_failed', 'Could not store this part. The upload may have expired or been aborted.')
  }
  if (partNumber === 1 || partNumber % 5 === 0) logAdminAction('upload_part', email, { version: versionFromInstallerKey(key), partNumber })
  return jsonResponse(request, env, { partNumber: part.partNumber, etag: part.etag })
}

async function completeUpload(request, env, uploadIdParam) {
  const email = await requireAdmin(request, env)
  const uploadId = requireUploadId(uploadIdParam)
  const body = await readJsonBody(request)
  const key = requireInstallerKey(body.key)
  const version = versionFromInstallerKey(key)

  const parts = Array.isArray(body.parts) ? body.parts : null
  if (!parts || parts.length < 1 || parts.length > MAX_PART_NUMBER) throw new HttpError(400, 'invalid_parts', 'parts must be a non-empty list.')
  const seen = new Set()
  const normalizedParts = parts.map((item) => {
    const partNumber = item?.partNumber
    const etag = clean(item?.etag)
    if (!isValidPartNumber(partNumber) || !etag || etag.length > 256 || seen.has(partNumber)) {
      throw new HttpError(400, 'invalid_parts', 'Each part needs a unique partNumber and an etag.')
    }
    seen.add(partNumber)
    return { partNumber, etag }
  }).sort((a, b) => a.partNumber - b.partNumber)

  try {
    await env.RELEASES.resumeMultipartUpload(key, uploadId).complete(normalizedParts)
  } catch (error) {
    console.error('[releases] complete failed', error?.message)
    throw new HttpError(400, 'complete_failed', 'Could not complete the upload. Check that every part was uploaded.')
  }

  const head = await env.RELEASES.head(key)
  if (!head) throw new HttpError(500, 'complete_failed', 'The completed installer could not be found.')
  const expectedSize = Number(head.customMetadata?.sizeBytes)
  if (head.customMetadata?.version !== version || !Number.isSafeInteger(expectedSize) || head.size !== expectedSize) {
    await env.RELEASES.delete(key)
    logAdminAction('upload_rejected', email, { version, reason: 'size_mismatch', size: head.size, expectedSize })
    throw new HttpError(422, 'size_mismatch', `Uploaded size ${head.size} does not match the expected ${expectedSize} bytes. The upload was discarded.`)
  }

  const start = await env.RELEASES.get(key, { range: { offset: 0, length: 2 } })
  const startBytes = start ? new Uint8Array(await start.arrayBuffer()) : new Uint8Array()
  if (!hasMzHeader(startBytes)) {
    await env.RELEASES.delete(key)
    logAdminAction('upload_rejected', email, { version, reason: 'not_windows_executable' })
    throw new HttpError(422, 'not_windows_executable', 'The uploaded file is not a Windows executable. The upload was discarded.')
  }

  logAdminAction('upload_completed', email, { version, sizeBytes: head.size })
  return jsonResponse(request, env, {
    key,
    version,
    sizeBytes: head.size,
    sha256: head.customMetadata?.sha256 || '',
    published: false,
  })
}

async function abortUpload(request, env, url, uploadIdParam) {
  const email = await requireAdmin(request, env)
  const key = requireInstallerKey(url.searchParams.get('key'))
  const uploadId = requireUploadId(uploadIdParam)
  try {
    await env.RELEASES.resumeMultipartUpload(key, uploadId).abort()
  } catch (error) {
    console.error('[releases] abort failed', error?.message)
    throw new HttpError(400, 'abort_failed', 'Could not abort this upload. It may already be completed or aborted.')
  }
  logAdminAction('upload_aborted', email, { version: versionFromInstallerKey(key) })
  return jsonResponse(request, env, { aborted: true })
}

async function publishRelease(request, env) {
  const email = await requireAdmin(request, env)
  const body = await readJsonBody(request)
  const version = clean(body.version)
  if (!isStrictSemver(version)) throw new HttpError(400, 'invalid_version', 'Version must be X.Y.Z, for example 1.0.1.')
  const notes = sanitizeNotes(body.notes)
  if (notes === null) throw new HttpError(400, 'invalid_notes', 'Release notes must be plain text of at most 2000 characters.')

  const head = await env.RELEASES.head(installerKey(version))
  if (!head) throw new HttpError(404, 'installer_not_found', `No completed installer exists for version ${version}.`)

  const releases = await readReleases(env)
  const previous = releases.find((entry) => entry?.version === version)
  const latest = buildLatestJson({
    version,
    sizeBytes: head.size,
    sha256: head.customMetadata?.sha256 || previous?.sha256 || '',
    // A re-publish (rollback) keeps the original release date; omitted notes keep the old ones.
    releasedAt: previous?.releasedAt || new Date().toISOString(),
    notes: body.notes === undefined && previous ? previous.notes || '' : notes,
    baseUrl: env.PUBLIC_DOWNLOAD_BASE_URL,
  })

  // History first, then latest: a failure in between leaves the old release live.
  const nextReleases = upsertRelease(releases, latest)
  await putJson(env, RELEASES_KEY, nextReleases, 'no-store')
  await putJson(env, LATEST_KEY, latest, METADATA_CACHE_CONTROL)

  logAdminAction(previous ? 'release_republished' : 'release_published', email, { version })
  return jsonResponse(request, env, { latest, releases: nextReleases })
}

async function listReleases(request, env) {
  await requireAdmin(request, env)
  const [releases, latest] = await Promise.all([readReleases(env), readLatest(env)])
  return jsonResponse(request, env, { releases, latestVersion: latest?.version || null })
}

// ── Public routes ────────────────────────────────────────────────────────────

async function getLatest(request, env) {
  const object = await env.RELEASES.get(LATEST_KEY)
  if (!object) {
    return jsonResponse(request, env, { error: 'no_release', message: 'No desktop release has been published yet.' }, 404, { isPublic: true })
  }
  return new Response(object.body, {
    status: 200,
    headers: {
      ...corsHeaders(request, env, true),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': METADATA_CACHE_CONTROL,
    },
  })
}

async function redirectToDownload(request, env) {
  const latest = await readLatest(env)
  const base = clean(env.PUBLIC_DOWNLOAD_BASE_URL).replace(/\/+$/, '')
  const url = typeof latest?.url === 'string' && base && latest.url.startsWith(`${base}/`) ? latest.url : LEGACY_DOWNLOAD_URL
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders(request, env, true),
      Location: url,
      'Cache-Control': METADATA_CACHE_CONTROL,
    },
  })
}

// ── Router ───────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = new Set(['latest', 'download'])

function decodeSegments(pathname) {
  try {
    return pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment))
  } catch {
    return null
  }
}

async function route(request, env, url) {
  const method = request.method
  const segments = decodeSegments(url.pathname)
  if (!segments) throw new HttpError(400, 'invalid_path', 'Malformed URL path.')

  if (method === 'GET' && segments.length === 1 && segments[0] === 'health') {
    return jsonResponse(request, env, { ok: true, service: 'nexora-releases-api', storageConfigured: Boolean(env.RELEASES) }, 200, { isPublic: true })
  }
  if (segments[0] !== 'releases' || segments[1] !== PRODUCT_ID) throw new HttpError(404, 'not_found', 'Route not found.')

  requireStorage(env)
  const [first, second, third, fourth] = segments.slice(2)
  const count = segments.length - 2
  const notAllowed = () => new HttpError(405, 'method_not_allowed', 'Method not allowed for this route.')

  if (count === 1 && first === 'uploads') {
    if (method === 'POST') return createUpload(request, env)
    throw notAllowed()
  }
  if (count === 4 && first === 'uploads' && third === 'parts') {
    if (method === 'PUT') return uploadPart(request, env, url, second, fourth)
    throw notAllowed()
  }
  if (count === 3 && first === 'uploads' && third === 'complete') {
    if (method === 'POST') return completeUpload(request, env, second)
    throw notAllowed()
  }
  if (count === 2 && first === 'uploads') {
    if (method === 'DELETE') return abortUpload(request, env, url, second)
    throw notAllowed()
  }
  if (count === 1 && first === 'publish') {
    if (method === 'POST') return publishRelease(request, env)
    throw notAllowed()
  }
  if (count === 1 && first === 'releases') {
    if (method === 'GET') return listReleases(request, env)
    throw notAllowed()
  }
  if (count === 1 && first === 'latest') {
    if (method === 'GET' || method === 'HEAD') return getLatest(request, env)
    throw notAllowed()
  }
  if (count === 1 && first === 'download') {
    if (method === 'GET' || method === 'HEAD') return redirectToDownload(request, env)
    throw notAllowed()
  }
  throw new HttpError(404, 'not_found', 'Route not found.')
}

function isPublicPath(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 1 && segments[0] === 'health') return true
  return segments.length === 3 && segments[0] === 'releases' && segments[1] === PRODUCT_ID && PUBLIC_ROUTES.has(segments[2])
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const isPublic = isPublicPath(url.pathname)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env, isPublic) })
    }
    try {
      return await route(request, env, url)
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse(request, env, { error: error.error, message: error.message }, error.status, { isPublic })
      }
      console.error('[releases] unhandled error', error?.message)
      return jsonResponse(request, env, { error: 'internal_error', message: 'Unexpected server error.' }, 500, { isPublic })
    }
  },
}
