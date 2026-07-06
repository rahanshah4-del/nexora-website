import { addDoc, collection, deleteDoc, doc, getDocs, limit as queryLimit, onSnapshot, orderBy, query, serverTimestamp, startAfter, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function safeError(error, fallback) {
  const next = new Error(clientSafeMessage(error, fallback, { context: fallback }))
  next.code = error?.code || ''
  next.originalError = error
  return next
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
    (err) => onError?.(safeError(err, 'Unable to load account data.')),
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
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
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
      logFirestoreAccessError(err, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'read' })
      onError?.(safeError(err, 'Unable to load account data.'))
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
    (snap) =>
      onData?.(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((row) => belongsToWorkspace(row, workspaceId))
          .map((row) => withWorkspaceFallback(row.id, row, workspaceId)),
      ),
    (err) => {
      logFirestoreAccessError(err, { ...diagnostics, workspaceId, collectionName, collectionPath, operation: 'read' })
      onError?.(safeError(err, 'Unable to load account data.'))
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
    logFirestoreAccessError(error, { ...diagnostics, workspaceId, collectionName, collectionPath, operation: 'read_page' })
    throw safeError(error, 'Unable to load account data.')
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
    (err) => onError?.(safeError(err, 'Unable to load account data.')),
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
  try {
    return await addDoc(ref, {
      ...payload,
      ownerId: payload.ownerId || userId,
      userId: recordUserId || userId,
      workspaceId: userId,
      businessType,
      createdBy: payload.createdBy || payload.submittedBy || userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logFirestoreAccessError(error, { ...options.diagnostics, userId, workspaceId: userId, collectionName: path, collectionPath, operation: 'create' })
    throw safeError(error, 'Unable to save account data.')
  }
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
