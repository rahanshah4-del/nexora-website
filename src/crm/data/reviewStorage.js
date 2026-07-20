/**
 * Review storage — saves client reviews to Firestore.
 * Reviews are stored in: reviews/{reviewId}
 * Each review has: userId, userName, userEmail, workspaceId, rating (1-5),
 *   comment, module, status (pending/approved/rejected), createdAt
 */

import { addDoc, collection, getDocs, limit, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const REVIEW_COLLECTION = 'reviews'

export const REVIEW_PROMPT_KEY = 'nexora.review.prompt.v1'

export function hasReviewBeenPrompted() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(REVIEW_PROMPT_KEY) === 'shown'
  } catch { return false }
}

export function markReviewPrompted() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REVIEW_PROMPT_KEY, 'shown')
  } catch { /* noop */ }
}

export function hasReviewBeenSubmitted() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(REVIEW_PROMPT_KEY) === 'submitted'
  } catch { return false }
}

export function markReviewSubmitted() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REVIEW_PROMPT_KEY, 'submitted')
  } catch { /* noop */ }
}

/**
 * Check if user should see the review prompt:
 * - Has been active for at least 3 days (first activity recorded 3+ days ago)
 * - Has not already been prompted
 * - Has not already submitted a review
 */
export function shouldShowReviewPrompt(firstActivityMs) {
  if (hasReviewBeenPrompted() || hasReviewBeenSubmitted()) return false
  if (!firstActivityMs) return false
  const daysSinceFirstActivity = (Date.now() - firstActivityMs) / 86400000
  return daysSinceFirstActivity >= 3
}

export async function submitReview({
  userId,
  userName,
  userEmail,
  workspaceId,
  workspaceName,
  module,
  rating,
  comment = '',
}) {
  if (!db) throw new Error('Firestore is not available.')
  if (!userId) throw new Error('User ID is required.')
  if (!rating || rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')

  const review = {
    userId,
    userName: String(userName || userEmail || 'Nexora User').trim(),
    userEmail: String(userEmail || '').trim().toLowerCase(),
    workspaceId: String(workspaceId || ''),
    workspaceName: String(workspaceName || ''),
    module: String(module || 'General'),
    rating: Number(rating),
    comment: String(comment || '').trim(),
    status: 'pending', // pending, approved, rejected
    isPublic: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, REVIEW_COLLECTION), review)
  markReviewSubmitted()
  return { id: docRef.id, ...review }
}

/**
 * Load approved reviews for public display
 */
export async function loadPublicReviews(maxCount = 12) {
  if (!db) return []
  try {
    const q = query(
      collection(db, REVIEW_COLLECTION),
      where('status', '==', 'approved'),
      where('isPublic', '==', true),
      limit(maxCount),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

/**
 * Update review status (admin action)
 */
export async function updateReviewStatus(reviewId, status, isPublic = false) {
  if (!db || !reviewId) return
  await updateDoc(doc(db, REVIEW_COLLECTION, reviewId), {
    status,
    isPublic: status === 'approved' ? isPublic : false,
    updatedAt: serverTimestamp(),
  })
}
