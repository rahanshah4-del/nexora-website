import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'

const COLLECTION = 'customerReviews'

export async function submitReview({ name, businessName, businessType, country, rating, review, photo }) {
  if (!db) throw new Error('Firestore not available')
  if (!name?.trim() || !rating || rating < 1 || rating > 5) throw new Error('Name and rating (1-5) required')

  const docRef = await addDoc(collection(db, COLLECTION), {
    name: name.trim(),
    businessName: businessName?.trim() || '',
    businessType: businessType?.trim() || '',
    country: country?.trim() || 'Pakistan',
    rating: Number(rating),
    review: review?.trim() || '',
    photo: photo || '',
    status: 'pending',
    verified: false,
    helpful: 0,
    pinned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: docRef.id }
}

export async function getPublishedReviews({ limit: max = 20 } = {}) {
  if (!db) return []
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'approved'),
    orderBy('pinned', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getReviewStats() {
  if (!db) return { average: 5, total: 0 }
  const snap = await getDocs(query(collection(db, COLLECTION), where('status', '==', 'approved')))
  const reviews = snap.docs.map((d) => d.data())
  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total : 5
  return { average: Math.round(avg * 10) / 10, total }
}

export async function markHelpful(reviewId) {
  if (!db || !reviewId) return
  const ref = doc(db, COLLECTION, reviewId)
  await updateDoc(ref, { helpful: (await getDoc(ref)).data()?.helpful + 1 || 1 })
}

// Admin functions
export async function getPendingReviews() {
  if (!db) return []
  const snap = await getDocs(query(collection(db, COLLECTION), where('status', '==', 'pending'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllReviews() {
  if (!db) return []
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function approveReview(reviewId) {
  if (!db) return
  await updateDoc(doc(db, COLLECTION, reviewId), { status: 'approved', updatedAt: serverTimestamp() })
}

export async function rejectReview(reviewId) {
  if (!db) return
  await updateDoc(doc(db, COLLECTION, reviewId), { status: 'rejected', updatedAt: serverTimestamp() })
}

export async function deleteReview(reviewId) {
  if (!db) return
  await deleteDoc(doc(db, COLLECTION, reviewId))
}

export async function pinReview(reviewId, pinned) {
  if (!db) return
  await updateDoc(doc(db, COLLECTION, reviewId), { pinned, updatedAt: serverTimestamp() })
}

export async function verifyReview(reviewId) {
  if (!db) return
  await updateDoc(doc(db, COLLECTION, reviewId), { verified: true, updatedAt: serverTimestamp() })
}

export async function replyToReview(reviewId, reply) {
  if (!db) return
  await updateDoc(doc(db, COLLECTION, reviewId), { reply, updatedAt: serverTimestamp() })
}
