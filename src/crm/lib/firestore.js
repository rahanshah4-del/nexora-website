import { addDoc, collection, deleteDoc, doc, getDocs, limit as queryLimit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function safeError(error, fallback) {
  const next = new Error(clientSafeMessage(error, fallback, { context: fallback }))
  next.code = error?.code || ''
  next.originalError = error
  return next
}

// Firestore is configured with experimentalAutoDetectLongPolling (see
// src/lib/firebase.js) to survive hostile networks, but transport
// negotiation and transient backend conditions (confirmed via network
// capture: repeated 503s on the Write channel specifically, Listen
// unaffected) can still leave a write's promise pending far longer than a
// plain single-document write should ever take, or leave it permanently
// pending — neither resolved nor rejected — if a proxy/extension silently
// swallows the response instead of erroring it. This timeout bounds each
// individual attempt below (see CREATE_MAX_ATTEMPTS), surfacing a distinct
// 'client/timeout' code so it can never be mistaken for a real Firestore
// error code (e.g. 'permission-denied') in the logs.
const CREATE_ATTEMPT_TIMEOUT_MS = 8000

// createUserDoc retries a failed create automatically before ever reporting
// failure to the caller — see CREATE_RETRYABLE_CODES below for which
// failures qualify. Worst case before a genuine failure is reported:
// 3 attempts x 8s + 1s + 2s backoff between them = 27s.
const CREATE_MAX_ATTEMPTS = 3
const CREATE_RETRY_BACKOFF_MS = [1000, 2000]

// Error codes worth retrying: transient/transport-shaped failures where an
// identical retry is likely to succeed. 'unavailable' is explicitly
// documented by the SDK itself as "most likely a transient condition... may
// be corrected by retrying with a backoff". 'client/timeout' is our own
// code from withTimeout. This is deliberately an allow-list rather than
// "retry anything that isn't a permission/validation error" — codes like
// 'unimplemented'/'data-loss'/'out-of-range' can never succeed on retry, and
// a deny-list would still burn attempts and backoff time on them.
// 'cancelled'/'unknown'/'internal' are ambiguous enough that retrying isn't
// clearly safe, so they're treated as final rather than assumed transient.
const CREATE_RETRYABLE_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'aborted',
  'client/timeout',
])

function isRetryableCreateError(error) {
  return CREATE_RETRYABLE_CODES.has(error?.code || '')
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout(promise, ms, timeoutMessage) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(timeoutMessage), { code: 'client/timeout' }))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function logFirestoreAccessError(error, details = {}) {
  console.warn('[Firestore Access Error]', {
    currentUserUid: details.currentUserUid || details.userId || '',
    role: details.role || '',
    workspaceId: details.workspaceId || details.userId || '',
    collectionPath: details.collectionPath || '',
    collectionName: details.collectionName || '',
    operation: details.operation || 'read',
    firestoreErrorCode: error?.code || error?.originalError?.code || 'unknown',
    message: error?.message || '',
  })
}

function belongsToWorkspace(data, workspaceId) {
  return !data?.workspaceId || data.workspaceId === workspaceId
}

function legacyBusinessFallbackAllowed(row, options = {}) {
  if (options?.includeMissingBusinessType && !row?.businessType && !row?.selectedBusinessType) return true
  const fallbackBusinessTypes = Array.isArray(options?.businessTypeFallbacks)
    ? options.businessTypeFallbacks.map((item) => normalizeBusinessType(item))
    : []
  return Boolean(
    fallbackBusinessTypes.length &&
      (row?.businessType || row?.selectedBusinessType) &&
      fallbackBusinessTypes.includes(normalizeBusinessType(row.businessType || row.selectedBusinessType)),
  )
}

export function belongsToBusiness(data, businessType) {
  const currentBusinessType = normalizeBusinessType(businessType)
  if (!data?.businessType && !data?.selectedBusinessType) return false
  const rowBusinessType = normalizeBusinessType(data.businessType || data.selectedBusinessType)
  return rowBusinessType === currentBusinessType
}

function withWorkspaceFallback(id, data, workspaceId) {
  return {
    id,
    ...data,
    workspaceId: data.workspaceId || workspaceId,
    ownerId: data.ownerId || workspaceId,
    createdBy: data.createdBy || data.submittedBy || data.userId || workspaceId,
    businessType: data.businessType || data.selectedBusinessType || '',
    createdAt: data.createdAt || null,
  }
}

export function collectionRef(path) {
  if (!db) return null
  return collection(db, path)
}

export function workspaceCollectionPath(userId, path) {
  if (!userId || !path) return ''
  return `workspaces/${userId}/${path}`
}

export function workspaceDocPath(userId, path, id) {
  if (!userId || !path || !id) return ''
  return `workspaces/${userId}/${path}/${id}`
}

export function subscribeCollection(path, onData, onError) {
  const ref = collectionRef(path)
  if (!ref) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      if (String(err?.code || err?.message || '').includes('permission-denied')) { onData([]); return }
      onError?.(safeError(err, 'Unable to load data.'))
    },
  )
}

export function subscribeUserCollection(userId, path, onData, onError, options = {}) {
  const collectionPath = workspaceCollectionPath(userId, path)
  const ref = userId ? collectionRef(collectionPath) : null
  const hasBusinessFilter = typeof options?.businessType !== 'undefined' && String(options.businessType || '').trim() !== ''
  const businessType = hasBusinessFilter ? normalizeBusinessType(options.businessType) : ''
  const fallbackBusinessTypes = Array.isArray(options?.businessTypeFallbacks)
    ? options.businessTypeFallbacks.map((item) => normalizeBusinessType(item))
    : []
  if (!ref) {
    onData([])
    return () => {}
  }
  const constraints = []
  if (options?.orderByField) constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'))
  if (Number.isFinite(Number(options?.limitCount)) && Number(options.limitCount) > 0) {
    constraints.push(queryLimit(Math.floor(Number(options.limitCount))))
  }
  const source = constraints.length ? query(ref, ...constraints) : ref

  return onSnapshot(
    source,
    // includeMetadataChanges makes the listener re-fire when a locally-applied
    // write is acknowledged by the server, so _pendingWrite below flips from
    // true to false instead of the row staying silently optimistic.
    { includeMetadataChanges: true },
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data(), _pendingWrite: d.metadata.hasPendingWrites }))
          .filter((row) => belongsToWorkspace(row, userId))
          .filter((row) => {
            if (!hasBusinessFilter) return true
            if (belongsToBusiness(row, businessType)) return true
            if (options?.includeMissingBusinessType && !row?.businessType && !row?.selectedBusinessType) return true
            if (fallbackBusinessTypes.length && (row?.businessType || row?.selectedBusinessType)) {
              return fallbackBusinessTypes.includes(normalizeBusinessType(row.businessType || row.selectedBusinessType))
            }
            return false
          })
          .map((row) => withWorkspaceFallback(row.id, row, userId)),
      ),
    (err) => {
      if (String(err?.code || err?.message || '').includes('permission-denied')) { onData?.([]); return }
      logFirestoreAccessError(err, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'read' })
      onError?.(safeError(err, 'Unable to load data.'))
    },
  )
}

function whereConstraintFromFilter(filter) {
  if (!filter) return null
  if (Array.isArray(filter)) {
    const [fieldPath, opStr = '==', value] = filter
    if (!fieldPath || typeof value === 'undefined') return null
    return where(fieldPath, opStr, value)
  }
  if (filter.field) {
    if (typeof filter.value === 'undefined') return null
    return where(filter.field, filter.op || '==', filter.value)
  }
  return filter
}

export function listenToWorkspaceCollection({
  workspaceId,
  collectionName,
  businessType,
  businessTypeFallbacks = [],
  includeMissingBusinessType = false,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  limitCount = 100,
  whereFilters = [],
  diagnostics = {},
  onData,
  onError,
} = {}) {
  if (!workspaceId || !collectionName) {
    onData?.([])
    return () => {}
  }

  const normalizedBusinessType = normalizeBusinessType(businessType)
  const hasLegacyFallback = includeMissingBusinessType || (Array.isArray(businessTypeFallbacks) && businessTypeFallbacks.length > 0)
  if (!normalizedBusinessType) {
    return subscribeUserCollection(workspaceId, collectionName, onData, onError, { businessType })
  }
  if (hasLegacyFallback && !whereFilters.length) {
    return subscribeUserCollection(workspaceId, collectionName, onData, onError, {
      businessType,
      businessTypeFallbacks,
      includeMissingBusinessType,
      orderByField,
      orderDirection,
      limitCount,
      diagnostics,
    })
  }

  const collectionPath = workspaceCollectionPath(workspaceId, collectionName)
  const ref = collectionRef(collectionPath)
  if (!ref) {
    onData?.([])
    return () => {}
  }

  const constraints = [
    where('businessType', '==', normalizedBusinessType),
    ...whereFilters.map(whereConstraintFromFilter).filter(Boolean),
  ]
  if (orderByField) constraints.push(orderBy(orderByField, orderDirection))
  if (Number.isFinite(Number(limitCount)) && Number(limitCount) > 0) {
    constraints.push(queryLimit(Math.floor(Number(limitCount))))
  }

  return onSnapshot(
    query(ref, ...constraints),
    // See subscribeUserCollection: metadata changes are what let _pendingWrite
    // settle to false once the server acknowledges the write.
    { includeMetadataChanges: true },
    (snap) =>
      onData?.(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data(), _pendingWrite: d.metadata.hasPendingWrites }))
          .filter((row) => belongsToWorkspace(row, workspaceId))
          .map((row) => withWorkspaceFallback(row.id, row, workspaceId)),
      ),
    (err) => {
      if (String(err?.code || err?.message || '').includes('permission-denied')) { onData?.([]); return }
      logFirestoreAccessError(err, { ...diagnostics, workspaceId, collectionName, collectionPath, operation: 'read' })
      onError?.(safeError(err, 'Unable to load data.'))
    },
  )
}

export async function fetchWorkspaceCollectionPage({
  workspaceId,
  collectionName,
  businessType,
  businessTypeFallbacks = [],
  includeMissingBusinessType = false,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  limitCount = 50,
  whereFilters = [],
  startAfterDoc = null,
  diagnostics = {},
} = {}) {
  if (!workspaceId || !collectionName) {
    return { rows: [], lastDoc: null, hasMore: false, size: 0 }
  }

  const collectionPath = workspaceCollectionPath(workspaceId, collectionName)
  const ref = collectionRef(collectionPath)
  if (!ref) {
    return { rows: [], lastDoc: null, hasMore: false, size: 0 }
  }

  const normalizedBusinessType = normalizeBusinessType(businessType)
  const hasLegacyFallback = includeMissingBusinessType || (Array.isArray(businessTypeFallbacks) && businessTypeFallbacks.length > 0)
  const pageLimit = Number.isFinite(Number(limitCount)) && Number(limitCount) > 0
    ? Math.floor(Number(limitCount))
    : 50
  const constraints = [
    ...(normalizedBusinessType && !hasLegacyFallback ? [where('businessType', '==', normalizedBusinessType)] : []),
    ...whereFilters.map(whereConstraintFromFilter).filter(Boolean),
  ]
  if (orderByField) constraints.push(orderBy(orderByField, orderDirection))
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc))
  constraints.push(queryLimit(pageLimit))

  try {
    const snap = await getDocs(query(ref, ...constraints))
    return {
      rows: snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => belongsToWorkspace(row, workspaceId))
        .filter((row) => !normalizedBusinessType || belongsToBusiness(row, normalizedBusinessType) || legacyBusinessFallbackAllowed(row, { businessTypeFallbacks, includeMissingBusinessType }))
        .map((row) => withWorkspaceFallback(row.id, row, workspaceId)),
      lastDoc: snap.docs.at(-1) || null,
      hasMore: snap.docs.length === pageLimit,
      size: snap.docs.length,
    }
  } catch (error) {
    if (String(error?.code || error?.message || '').includes('permission-denied')) {
      return { data: [], lastDoc: null, hasMore: false, size: 0 }
    }
    logFirestoreAccessError(error, { ...diagnostics, workspaceId, collectionName, collectionPath, operation: 'read_page' })
    throw safeError(error, 'Unable to load data.')
  }
}

export function subscribeOwnedCollection(path, userId, onData, onError, ownerField = 'userId', options = {}) {
  const ref = userId ? collectionRef(path) : null
  const businessType = normalizeBusinessType(options?.businessType)
  if (!ref) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    query(ref, where(ownerField, '==', userId)),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((row) => (options?.businessType ? belongsToBusiness(row, businessType) : true)),
      ),
    (err) => {
      if (String(err?.code || err?.message || '').includes('permission-denied')) { onData([]); return }
      onError?.(safeError(err, 'Unable to load data.'))
    },
  )
}

export async function createDoc(path, payload) {
  const ref = collectionRef(path)
  if (!ref) throw new Error('Workspace not configured')
  try {
    return await addDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  } catch (error) {
    throw safeError(error, 'Unable to save account data.')
  }
}

export async function createUserDoc(userId, path, payload, options = {}) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const collectionPath = workspaceCollectionPath(userId, path)
  const ref = collectionRef(collectionPath)
  if (!ref) throw new Error('Workspace not configured')
  const businessType = normalizeBusinessType(options?.businessType || payload.businessType)
  const recordUserId = path === 'teamMembers'
    ? (payload.userId || payload.uid || payload.staffId || payload.email || '')
    : userId
  const data = {
    ...payload,
    ownerId: payload.ownerId || userId,
    userId: recordUserId || userId,
    workspaceId: userId,
    businessType,
    createdBy: payload.createdBy || payload.submittedBy || userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  // One document ID, generated once and reused across every attempt below —
  // NOT addDoc(), which mints a fresh random ID per call. A retry can follow
  // a 'deadline-exceeded', which the SDK's own docs say "may be returned
  // even if the operation has completed successfully" — addDoc() would risk
  // creating a second, duplicate document if the timed-out attempt actually
  // landed server-side. setDoc() against this same pre-generated ID makes
  // every retry an idempotent overwrite of the same document instead.
  const docRef = doc(ref)
  // Explicit opt-out for the POS offline-queue path (usePosOrders.js,
  // useMedicalPosOrders.js): that path already has its own fail-fast-then-
  // retry-on-reconnect design and must keep failing at one attempt's
  // timeout, not absorb this function's retry loop on top of its own.
  const retryEnabled = options?.retryOnTransientError !== false

  let lastError = null
  for (let attempt = 1; attempt <= CREATE_MAX_ATTEMPTS; attempt += 1) {
    try {
      // Awaiting setDoc waits for the server's write acknowledgement, not
      // just the local-cache write, so callers can report a real
      // success/failure instead of optimistically closing over a write that
      // never landed.
      await withTimeout(
        setDoc(docRef, data),
        CREATE_ATTEMPT_TIMEOUT_MS,
        'Request timed out — check your network connection and try again.',
      )
      return docRef
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt === CREATE_MAX_ATTEMPTS
      if (!retryEnabled || isLastAttempt || !isRetryableCreateError(error)) break
      const backoffMs = CREATE_RETRY_BACKOFF_MS[attempt - 1]
      console.warn('[Firestore Create Retry]', {
        collectionPath,
        attempt,
        maxAttempts: CREATE_MAX_ATTEMPTS,
        errorCode: error?.code || '',
        errorMessage: error?.message || '',
        retryInMs: backoffMs,
      })
      // Lets ProductModal (and anything else watching) swap its "Saving…"
      // label to "Retrying…" without every caller having to thread a
      // progress callback down through its own create function.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexora:firestore-create-retry', {
          detail: { collectionPath, attempt, maxAttempts: CREATE_MAX_ATTEMPTS },
        }))
      }
      await delay(backoffMs)
    }
  }

  logFirestoreAccessError(lastError, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'create' })
  throw safeError(lastError, 'Unable to save account data.')
}

export async function patchDoc(path, id, patch) {
  if (!db) throw new Error('Workspace not configured')
  const ref = doc(db, path, id)
  try {
    return await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() })
  } catch (error) {
    throw safeError(error, 'Unable to update account data.')
  }
}

export async function patchUserDoc(userId, path, id, patch, options = {}) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const collectionPath = workspaceCollectionPath(userId, path)
  const ref = doc(db, workspaceDocPath(userId, path, id))
  const businessType = normalizeBusinessType(options?.businessType || patch.businessType)
  const recordUserId = path === 'teamMembers'
    ? (patch.userId || patch.uid || patch.staffId || id)
    : userId
  try {
    return await updateDoc(ref, {
      ...patch,
      ownerId: patch.ownerId || userId,
      userId: recordUserId || userId,
      workspaceId: userId,
      businessType,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logFirestoreAccessError(error, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'update' })
    throw safeError(error, 'Unable to update account data.')
  }
}

export async function removeDoc(path, id) {
  if (!db) throw new Error('Workspace not configured')
  const ref = doc(db, path, id)
  try {
    return await deleteDoc(ref)
  } catch (error) {
    throw safeError(error, 'Unable to remove account data.')
  }
}

export async function removeUserDoc(userId, path, id, options = {}) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const collectionPath = workspaceCollectionPath(userId, path)
  const ref = doc(db, workspaceDocPath(userId, path, id))
  try {
    return await deleteDoc(ref)
  } catch (error) {
    logFirestoreAccessError(error, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'delete' })
    throw safeError(error, 'Unable to remove account data.')
  }
}
