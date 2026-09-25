/**
 * Pure helpers for nexora-releases-api — no Cloudflare bindings, no network,
 * so they can be unit-tested under plain Node (tests/releases-api.test.mjs).
 */

export const PRODUCT_ID = 'restaurant-pos'
export const PART_SIZE = 10 * 1024 * 1024
// One full part plus a little slack for clients that round up.
export const MAX_PART_REQUEST_BYTES = PART_SIZE + 1024
export const MAX_PART_NUMBER = 10000
export const MIN_INSTALLER_BYTES = 1024 * 1024
export const MAX_INSTALLER_BYTES = 300 * 1024 * 1024
export const MAX_NOTES_LENGTH = 2000
export const INSTALLER_CONTENT_TYPE = 'application/vnd.microsoft.portable-executable'
export const INSTALLER_CACHE_CONTROL = 'public, max-age=31536000, immutable'
export const METADATA_CACHE_CONTROL = 'public, max-age=60'
export const LATEST_KEY = `${PRODUCT_ID}/latest.json`
export const RELEASES_KEY = `${PRODUCT_ID}/releases.json`
export const LEGACY_DOWNLOAD_URL = 'https://pub-d510223cafd94f76bf1559c431263a16.r2.dev/Nexora%20Solution%20POS-1.0.0-Setup.exe'

const SEMVER_PATTERN = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/
const INSTALLER_KEY_PATTERN = /^restaurant-pos\/((?:0|[1-9]\d{0,8})\.(?:0|[1-9]\d{0,8})\.(?:0|[1-9]\d{0,8}))\/nexora-pos-\1-setup\.exe$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/

export function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function lower(value) {
  return clean(value).toLowerCase()
}

/** Strict X.Y.Z — no "v" prefix, no leading zeros, no pre-release/build suffix. */
export function isStrictSemver(value) {
  return typeof value === 'string' && SEMVER_PATTERN.test(value)
}

/** Negative when a < b, positive when a > b, 0 when equal. Both must be strict semver. */
export function compareSemver(a, b) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

export function versionPrefix(version) {
  return `${PRODUCT_ID}/${version}/`
}

export function installerFileName(version) {
  return `nexora-pos-${version}-setup.exe`
}

export function installerKey(version) {
  return `${versionPrefix(version)}${installerFileName(version)}`
}

export function downloadFileName(version) {
  return `NexoraPOS-${version}-Setup.exe`
}

/** Returns the version encoded in an installer key, or '' when the key is not one of ours. */
export function versionFromInstallerKey(key) {
  if (typeof key !== 'string') return ''
  const match = INSTALLER_KEY_PATTERN.exec(key)
  return match ? match[1] : ''
}

export function isValidInstallerKey(key) {
  return versionFromInstallerKey(key) !== ''
}

export function isValidSha256(value) {
  return typeof value === 'string' && SHA256_PATTERN.test(value)
}

export function isValidInstallerSize(value) {
  return Number.isSafeInteger(value) && value >= MIN_INSTALLER_BYTES && value <= MAX_INSTALLER_BYTES
}

export function isValidPartNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_PART_NUMBER
}

export function adminEmails(env = {}) {
  return String(env.BACKEND_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => lower(email))
    .filter(Boolean)
}

/** Verified Firebase token claims → admin only when the email is listed AND verified. */
export function isAdminClaims(claims, env) {
  const email = lower(claims?.email)
  if (!email || claims?.email_verified !== true) return false
  return adminEmails(env).includes(email)
}

export function allowedOrigins(env = {}) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/** Every Windows PE executable starts with the DOS header magic "MZ". */
export function hasMzHeader(bytes) {
  if (!bytes || bytes.length < 2) return false
  return bytes[0] === 0x4d && bytes[1] === 0x5a
}

/**
 * Notes are stored and served as plain text: trimmed, control characters other
 * than newline and tab removed, CRLF normalised. Returns null when too long.
 */
export function sanitizeNotes(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .trim()
  return text.length > MAX_NOTES_LENGTH ? null : text
}

export function publicUrlForKey(baseUrl, key) {
  return `${String(baseUrl || '').replace(/\/+$/, '')}/${key}`
}

/**
 * Public release entry, served as latest.json and inside releases.json. It holds
 * no admin identity: who published is recorded in the Worker log only.
 */
export function buildLatestJson({ version, sizeBytes, sha256, releasedAt, notes, baseUrl }) {
  const key = installerKey(version)
  return {
    version,
    fileName: downloadFileName(version),
    key,
    url: publicUrlForKey(baseUrl, key),
    sizeBytes,
    sha256,
    releasedAt,
    notes,
  }
}

/** Insert or replace `entry` by version; result is newest version first, no duplicates. */
export function upsertRelease(releases, entry) {
  const list = Array.isArray(releases) ? releases.filter((item) => item && isStrictSemver(item.version)) : []
  const next = list.filter((item) => item.version !== entry.version)
  next.push(entry)
  return next.sort((a, b) => compareSemver(b.version, a.version))
}

export function parseReleasesJson(text) {
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
