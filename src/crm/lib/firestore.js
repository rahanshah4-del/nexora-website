import { addDoc, collection, deleteDoc, doc, limit as queryLimit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { clientSafeMessage } from '../utils/messages.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function safeError(error, fallback) {
  return new Error(clientSafeMessage(error, fallback, { context: fallback }))
}

function belongsToWorkspace(data, workspaceId) {
  return !data?.workspaceId || data.workspaceId === workspaceId
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
  const ref = userId ? collectionRef(workspaceCollectionPath(userId, path)) : null
  const businessType = normalizeBusinessType(options?.businessType)
  if (!ref) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    ref,
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((row) => belongsToWorkspace(row, userId))
          .filter((row) => belongsToBusiness(row, businessType))
          .map((row) => withWorkspaceFallback(row.id, row, userId)),
      ),
    (err) => onError?.(safeError(err, 'Unable to load account data.')),
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
  orderByField = 'createdAt',
  orderDirection = 'desc',
  limitCount = 100,
  whereFilters = [],
  onData,
  onError,
} = {}) {
  if (!workspaceId || !collectionName) {
    onData?.([])
    return () => {}
  }

  const normalizedBusinessType = normalizeBusinessType(businessType)
  if (!normalizedBusinessType) {
    return subscribeUserCollection(workspaceId, collectionName, onData, onError, { businessType })
  }

  const ref = collectionRef(workspaceCollectionPath(workspaceId, collectionName))
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
    // TODO: Add cursor-based pagination once list screens expose page controls.
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
    (err) => onError?.(safeError(err, 'Unable to load account data.')),
  )
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
  const ref = collectionRef(workspaceCollectionPath(userId, path))
  if (!ref) throw new Error('Workspace not configured')
  const businessType = normalizeBusinessType(options?.businessType || payload.businessType)
  try {
    return await addDoc(ref, {
      ...payload,
      ownerId: payload.ownerId || userId,
      userId,
      workspaceId: userId,
      businessType,
      createdBy: payload.createdBy || payload.submittedBy || userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
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
  const ref = doc(db, workspaceDocPath(userId, path, id))
  const businessType = normalizeBusinessType(options?.businessType || patch.businessType)
  try {
    return await updateDoc(ref, {
      ...patch,
      ownerId: patch.ownerId || userId,
      userId,
      workspaceId: userId,
      businessType,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
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

export async function removeUserDoc(userId, path, id) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const ref = doc(db, workspaceDocPath(userId, path, id))
  try {
    return await deleteDoc(ref)
  } catch (error) {
    throw safeError(error, 'Unable to remove account data.')
  }
}
