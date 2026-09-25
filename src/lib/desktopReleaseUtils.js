/**
 * Pure helpers for Desktop App Releases — shared by the Control Centre tab,
 * the public download page and tests/desktop-releases.test.mjs. No Firebase,
 * no network, no import.meta.env, so they run under plain Node.
 *
 * The limits mirror workers/nexora-releases-api/src/lib.js, which re-checks
 * everything server-side.
 */

export const MIN_INSTALLER_BYTES = 1024 * 1024
export const MAX_INSTALLER_BYTES = 300 * 1024 * 1024
export const MAX_NOTES_LENGTH = 2000
export const DEFAULT_PART_SIZE = 10 * 1024 * 1024
export const UPLOAD_CONCURRENCY = 3
export const PART_RETRIES = 3

const SEMVER_PATTERN = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/

/** Strict X.Y.Z — no "v" prefix, no leading zeros, no suffix. */
export function isStrictSemver(value) {
  return typeof value === 'string' && SEMVER_PATTERN.test(value)
}

/** Negative when a < b, positive when a > b, 0 when equal. Both must be strict semver. */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

/** Highest strict-semver version among the given values, or '' when none. */
export function highestVersion(versions = []) {
  return versions
    .filter(isStrictSemver)
    .reduce((best, version) => (!best || compareVersions(version, best) > 0 ? version : best), '')
}

/** '' when valid, otherwise a message for the version field. */
export function versionError(version, currentVersion = '') {
  const value = String(version || '').trim()
  if (!value) return 'Enter a version, for example 1.0.1.'
  if (/^v/i.test(value)) return 'Leave out the "v" — enter 1.0.1, not v1.0.1.'
  if (!isStrictSemver(value)) return 'Version must be X.Y.Z, for example 1.0.1.'
  if (currentVersion && isStrictSemver(currentVersion) && compareVersions(value, currentVersion) <= 0) {
    return `Version must be newer than ${currentVersion}.`
  }
  return ''
}

/** '' when the file name and size are acceptable, otherwise a message. */
export function installerFileError({ name, size } = {}) {
  if (!name) return 'Choose the Windows installer (.exe).'
  if (!/\.exe$/i.test(String(name))) return 'The installer must be a .exe file.'
  if (!Number.isFinite(size) || size < MIN_INSTALLER_BYTES) return 'The file is smaller than 1 MB — is it the right installer?'
  if (size > MAX_INSTALLER_BYTES) return 'The file is larger than 300 MB.'
  return ''
}

/** Every Windows PE executable starts with the DOS header magic "MZ". */
export function hasMzHeader(bytes) {
  if (!bytes || bytes.length < 2) return false
  return bytes[0] === 0x4d && bytes[1] === 0x5a
}

/** Split `size` bytes into 1-based parts of `partSize` bytes: [{partNumber, start, end}] (end exclusive). */
export function planParts(size, partSize = DEFAULT_PART_SIZE) {
  if (!Number.isSafeInteger(size) || size <= 0) return []
  if (!Number.isSafeInteger(partSize) || partSize <= 0) throw new Error('partSize must be a positive integer.')
  const parts = []
  for (let start = 0, partNumber = 1; start < size; start += partSize, partNumber += 1) {
    parts.push({ partNumber, start, end: Math.min(start + partSize, size) })
  }
  return parts
}

/** Backoff before retry `attempt` (1-based): 1s, 2s, 4s. */
export function retryDelayMs(attempt) {
  return 1000 * 2 ** Math.max(0, attempt - 1)
}

/** Network errors, timeouts, rate limits and 5xx are worth retrying; other 4xx are not. */
export function isRetriableStatus(status) {
  return !status || status === 408 || status === 429 || status >= 500
}

/** "~104 MB" — binary megabytes, as Windows Explorer shows file sizes. */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) return `~${Math.round(mb)} MB`
  if (mb >= 1) return `~${mb.toFixed(1).replace(/\.0$/, '')} MB`
  return `~${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** "September 2026" from an ISO timestamp; '' when invalid. */
export function formatReleaseMonth(iso) {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "25 Sep 2026" from an ISO timestamp; '' when invalid. */
export function formatReleaseDay(iso) {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Validates a latest.json payload before the public page trusts it. Returns
 * the release or null, so a malformed or non-https entry never becomes a link.
 */
export function normalizeLatestRelease(payload) {
  if (!payload || typeof payload !== 'object') return null
  const { version, url, sizeBytes, releasedAt, notes, sha256, fileName, key } = payload
  if (!isStrictSemver(version)) return null
  if (typeof url !== 'string' || !/^https:\/\/[^\s]+$/.test(url)) return null
  return {
    version,
    url,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
    releasedAt: typeof releasedAt === 'string' ? releasedAt : '',
    notes: typeof notes === 'string' ? notes : '',
    sha256: typeof sha256 === 'string' ? sha256 : '',
    fileName: typeof fileName === 'string' ? fileName : '',
    key: typeof key === 'string' ? key : '',
  }
}

/** Human message for a failed releases-api call. */
export function releaseErrorMessage(status, payload = {}) {
  switch (status) {
    case 401:
      return 'Please log in again.'
    case 403:
      return 'Only admin@nexora.com can upload desktop releases.'
    case 409:
      return 'This version already exists. Choose a newer version number.'
    case 411:
    case 413:
      return 'An upload part was rejected as too large. Refresh the page and try again.'
    case 422:
      return payload?.error === 'size_mismatch'
        ? 'The uploaded file size did not match. The upload was discarded — please try again.'
        : 'File is not a valid Windows installer.'
    default:
      break
  }
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (message) return message
  if (status >= 500) return 'The release service had a problem. Please try again.'
  return 'The release request failed. Please try again.'
}
