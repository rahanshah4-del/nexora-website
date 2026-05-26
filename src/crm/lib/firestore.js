import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { clientSafeMessage } from '../utils/messages.js'

function safeError(error, fallback) {
  return new Error(clientSafeMessage(error, fallback))
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

export function subscribeUserCollection(userId, path, onData, onError) {
  const ref = userId ? collectionRef(workspaceCollectionPath(userId, path)) : null
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

export function subscribeOwnedCollection(path, userId, onData, onError, ownerField = 'userId') {
  const ref = userId ? collectionRef(path) : null
  if (!ref) {
    onData([])
    return () => {}
  }
  return onSnapshot(
    query(ref, where(ownerField, '==', userId)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
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

export async function createUserDoc(userId, path, payload) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const ref = collectionRef(workspaceCollectionPath(userId, path))
  if (!ref) throw new Error('Workspace not configured')
  try {
    return await addDoc(ref, {
      ...payload,
      ownerId: userId,
      userId,
      workspaceId: userId,
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

export async function patchUserDoc(userId, path, id, patch) {
  if (!db || !userId) throw new Error('Workspace not configured')
  const ref = doc(db, workspaceDocPath(userId, path, id))
  try {
    return await updateDoc(ref, {
      ...patch,
      ownerId: userId,
      userId,
      workspaceId: userId,
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
