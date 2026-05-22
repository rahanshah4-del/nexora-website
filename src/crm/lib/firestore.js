import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'

export function collectionRef(path) {
  if (!db) return null
  return collection(db, path)
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
    (err) => onError?.(err),
  )
}

export async function createDoc(path, payload) {
  const ref = collectionRef(path)
  if (!ref) throw new Error('Firestore not configured')
  return addDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function patchDoc(path, id, patch) {
  if (!db) throw new Error('Firestore not configured')
  const ref = doc(db, path, id)
  return updateDoc(ref, { ...patch, updatedAt: serverTimestamp() })
}

export async function removeDoc(path, id) {
  if (!db) throw new Error('Firestore not configured')
  const ref = doc(db, path, id)
  return deleteDoc(ref)
}

