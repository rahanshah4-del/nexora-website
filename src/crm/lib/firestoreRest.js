/**
 * Plain-HTTPS Firestore writes (REST `documents:commit`), used as a second road next to the Firestore SDK.
 *
 * The SDK writes through one long-lived "Write channel" connection. On some networks (ISP filtering, VPN, proxy,
 * antivirus) that channel answers 503 or never answers, so a save is never confirmed and the data is lost on reload.
 * A normal HTTPS request does not depend on that channel, so the same write can still get through. Security rules are
 * identical: the request carries the signed-in user's ID token.
 *
 * Pure module (no Firebase imports) so it can be tested; the caller passes the token getter and the fetch function.
 */

export class RestUnsupportedError extends Error {
  constructor(message) {
    super(message)
    this.code = 'client/rest-unsupported'
  }
}

const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]' && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
const isServerTimestamp = (v) => Boolean(v) && typeof v === 'object' && String(v._methodName || '') === 'serverTimestamp'
const isOtherSentinel = (v) => Boolean(v) && typeof v === 'object' && typeof v._methodName === 'string' && !isServerTimestamp(v)
const SIMPLE_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/
export const quoteFieldPath = (key) => (SIMPLE_KEY.test(key) ? key : `\`${String(key).replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``)

/** JS value -> Firestore REST value. Throws RestUnsupportedError for anything it cannot represent faithfully. */
export function toValue(v, path, transforms, inArray = false) {
  if (v === null) return { nullValue: null }
  if (v === undefined) throw new RestUnsupportedError('undefined value')
  if (isServerTimestamp(v)) {
    if (inArray) throw new RestUnsupportedError('server timestamp inside an array')
    transforms.push({ fieldPath: path, setToServerValue: 'REQUEST_TIME' })
    return undefined
  }
  if (isOtherSentinel(v)) throw new RestUnsupportedError(`field value ${v._methodName}`)
  switch (typeof v) {
    case 'boolean': return { booleanValue: v }
    case 'string': return { stringValue: v }
    case 'number':
      if (!Number.isFinite(v)) throw new RestUnsupportedError('non-finite number')
      return Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER ? { integerValue: String(v) } : { doubleValue: v }
    case 'object': break
    default: throw new RestUnsupportedError(`type ${typeof v}`)
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (typeof v.toDate === 'function' && typeof v.seconds === 'number') return { timestampValue: v.toDate().toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map((item) => toValue(item, path, transforms, true)) } }
  if (isPlainObject(v)) return { mapValue: { fields: toFields(v, path, transforms, inArray) } }
  throw new RestUnsupportedError('unsupported object')
}

/** Object -> { fields } map; server-timestamp sentinels are moved into `transforms` (dotted path). */
export function toFields(obj, basePath, transforms, inArray = false) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    const path = basePath ? `${basePath}.${quoteFieldPath(key)}` : quoteFieldPath(key)
    const converted = toValue(value, path, transforms, inArray)
    if (converted !== undefined) fields[key] = converted
  }
  return fields
}

const docName = (projectId, docPath) => `projects/${projectId}/databases/(default)/documents/${docPath}`

/** setDoc equivalent: create or fully replace one document. */
export function buildSetBody({ projectId, docPath, data }) {
  const transforms = []
  const fields = toFields(data, '', transforms)
  return { writes: [{ update: { name: docName(projectId, docPath), fields }, ...(transforms.length ? { updateTransforms: transforms } : {}) }] }
}

/** updateDoc equivalent: change only the given top-level fields; fails if the document does not exist. */
export function buildPatchBody({ projectId, docPath, patch }) {
  if (Object.keys(patch).some((key) => key.includes('.'))) throw new RestUnsupportedError('dotted field path')
  const transforms = []
  const fields = toFields(patch, '', transforms)
  const maskPaths = Object.keys(patch).filter((key) => patch[key] !== undefined && !isServerTimestamp(patch[key])).map(quoteFieldPath)
  return {
    writes: [{
      update: { name: docName(projectId, docPath), fields },
      updateMask: { fieldPaths: maskPaths },
      currentDocument: { exists: true },
      ...(transforms.length ? { updateTransforms: transforms } : {}),
    }],
  }
}

export function buildDeleteBody({ projectId, docPath }) {
  return { writes: [{ delete: docName(projectId, docPath) }] }
}

const CODE_BY_STATUS = { 400: 'invalid-argument', 401: 'unauthenticated', 403: 'permission-denied', 404: 'not-found', 409: 'aborted', 429: 'resource-exhausted', 499: 'cancelled', 500: 'internal', 501: 'unimplemented', 503: 'unavailable', 504: 'deadline-exceeded' }

export function restErrorFromStatus(status, text = '') {
  let message
  try { message = JSON.parse(text)?.error?.message } catch { /* not JSON */ }
  const code = CODE_BY_STATUS[status] || (status >= 500 ? 'unavailable' : 'unknown')
  const error = new Error(message || `Server answered ${status}`)
  error.code = code
  error.status = status
  return error
}

/** POST one commit. Resolves on success, rejects with an Error carrying a Firestore-style `code`. */
export async function restCommit({ projectId, body, getToken, fetchImpl = globalThis.fetch, signal }) {
  const token = await getToken()
  if (!token) throw Object.assign(new Error('Not signed in'), { code: 'unauthenticated' })
  let res
  try {
    res = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    throw Object.assign(new Error(err?.message || 'Network error'), { code: 'unavailable' })
  }
  if (!res.ok) throw restErrorFromStatus(res.status, await res.text().catch(() => ''))
  return true
}
