/**
 * Client for workers/nexora-releases-api (Desktop App Releases).
 *
 * Public calls (getLatestRelease, the stable download link) are used by the
 * public download page, so this module does not import Firebase statically:
 * admin calls load it on demand to get a fresh ID token.
 */
import {
  PART_RETRIES,
  UPLOAD_CONCURRENCY,
  isRetriableStatus,
  normalizeLatestRelease,
  planParts,
  releaseErrorMessage,
  retryDelayMs,
} from './desktopReleaseUtils.js'

export const RELEASES_WORKER_URL = String(
  import.meta.env.VITE_RELEASES_WORKER_URL || 'https://nexora-releases-api.rahanshah4.workers.dev',
).replace(/\/$/, '')

export const RELEASES_DOWNLOAD_BASE_URL = String(
  import.meta.env.VITE_RELEASES_DOWNLOAD_BASE_URL || 'https://downloads.nexorasolution.online',
).replace(/\/$/, '')

const PRODUCT_BASE = `${RELEASES_WORKER_URL}/releases/restaurant-pos`

/** Always resolves to the current installer (302), or the legacy v1.0.0 link before the first publish. */
export const STABLE_DOWNLOAD_URL = `${PRODUCT_BASE}/download`

const UNREACHABLE_MESSAGE = 'Release service not reachable — has nexora-releases-api been deployed?'

export class ReleaseServiceError extends Error {
  constructor(message, { status = 0, code = '', unreachable = false } = {}) {
    super(message)
    this.name = 'ReleaseServiceError'
    this.status = status
    this.code = code
    this.unreachable = unreachable
  }
}

function cancelledError() {
  return new ReleaseServiceError('Upload cancelled.', { code: 'cancelled' })
}

async function adminIdToken() {
  const { auth } = await import('./firebase.js')
  const user = auth?.currentUser
  if (!user) throw new ReleaseServiceError('Please log in again.', { status: 401, code: 'unauthorized' })
  return user.getIdToken()
}

async function request(path, { method = 'GET', body, admin = false, signal } = {}) {
  const headers = {}
  if (admin) headers.Authorization = `Bearer ${await adminIdToken()}`
  let payload = body
  if (body !== undefined && !(body instanceof Blob)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let response
  try {
    response = await fetch(`${PRODUCT_BASE}${path}`, { method, headers, body: payload, signal })
  } catch (error) {
    if (signal?.aborted) throw cancelledError()
    throw new ReleaseServiceError(UNREACHABLE_MESSAGE, { unreachable: true, code: error?.name || 'network_error' })
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ReleaseServiceError(releaseErrorMessage(response.status, data), { status: response.status, code: data?.error || '' })
  }
  return data
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(cancelledError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Latest published release, or null when none has been published yet (404 no_release). */
export async function getLatestRelease({ signal } = {}) {
  try {
    return normalizeLatestRelease(await request('/latest', { signal }))
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
}

export async function listReleases({ signal } = {}) {
  const data = await request('/releases', { admin: true, signal })
  return {
    releases: Array.isArray(data.releases) ? data.releases : [],
    latestVersion: typeof data.latestVersion === 'string' ? data.latestVersion : '',
  }
}

export function publishRelease({ version, notes }) {
  return request('/publish', { method: 'POST', admin: true, body: { version, notes } })
}

export function abortUpload({ uploadId, key }) {
  return request(`/uploads/${encodeURIComponent(uploadId)}?key=${encodeURIComponent(key)}`, { method: 'DELETE', admin: true })
}

export function installerTestUrl(key) {
  return `${RELEASES_DOWNLOAD_BASE_URL}/${key}`
}

/** Reads the first bytes of a File/Blob (for the "MZ" check before uploading). */
export async function readFileHead(file, length = 2) {
  return new Uint8Array(await file.slice(0, length).arrayBuffer())
}

async function sha256Hex(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function uploadPartWithRetry({ file, part, uploadId, key, signal }) {
  const path = `/uploads/${encodeURIComponent(uploadId)}/parts/${part.partNumber}?key=${encodeURIComponent(key)}`
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await request(path, { method: 'PUT', admin: true, body: file.slice(part.start, part.end), signal })
      return { partNumber: result.partNumber, etag: result.etag }
    } catch (error) {
      if (signal?.aborted || error?.code === 'cancelled') throw cancelledError()
      if (attempt >= PART_RETRIES || !isRetriableStatus(error?.status)) throw error
      await sleep(retryDelayMs(attempt + 1), signal)
    }
  }
}

/**
 * Hash → create multipart upload → upload parts (3 at a time, each retried up
 * to 3 times) → complete. Cancelling via `signal`, or any failure, aborts the
 * multipart upload on the server. Does not publish.
 *
 * onProgress({ stage: 'hashing' | 'uploading' | 'verifying' | 'done', percent })
 */
export async function uploadInstaller({ file, version, onProgress = () => {}, signal }) {
  if (signal?.aborted) throw cancelledError()
  onProgress({ stage: 'hashing', percent: 0 })
  const sha256 = await sha256Hex(file)
  if (signal?.aborted) throw cancelledError()

  const created = await request('/uploads', { method: 'POST', admin: true, body: { version, sizeBytes: file.size, sha256 }, signal })
  const { key, uploadId, partSize } = created
  const parts = planParts(file.size, partSize)

  // One controller for every in-flight part: a failed part or a user cancel stops the rest.
  const controller = new AbortController()
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  const uploaded = []
  let uploadedBytes = 0
  let nextIndex = 0
  onProgress({ stage: 'uploading', percent: 0 })

  try {
    const runLane = async () => {
      while (nextIndex < parts.length && !controller.signal.aborted) {
        const part = parts[nextIndex]
        nextIndex += 1
        uploaded.push(await uploadPartWithRetry({ file, part, uploadId, key, signal: controller.signal }))
        uploadedBytes += part.end - part.start
        onProgress({ stage: 'uploading', percent: Math.min(100, Math.round((uploadedBytes / file.size) * 100)) })
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, parts.length) }, runLane))
    } catch (error) {
      controller.abort()
      throw error
    }
    if (signal?.aborted) throw cancelledError()

    onProgress({ stage: 'verifying', percent: 100 })
    const sortedParts = [...uploaded].sort((a, b) => a.partNumber - b.partNumber)
    const result = await request(`/uploads/${encodeURIComponent(uploadId)}/complete`, {
      method: 'POST',
      admin: true,
      body: { key, parts: sortedParts },
    })
    onProgress({ stage: 'done', percent: 100 })
    return { ...result, testUrl: installerTestUrl(result.key || key) }
  } catch (error) {
    // Best effort: free the stored parts. Fails harmlessly if already completed.
    await abortUpload({ uploadId, key }).catch(() => {})
    if (signal?.aborted) throw cancelledError()
    throw error
  } finally {
    signal?.removeEventListener('abort', forwardAbort)
  }
}
