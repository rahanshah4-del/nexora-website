import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestoreDb as db } from './firebase.js'

export const BLOG_COMMENTS_COLLECTION = 'blogComments'

const RATE_LIMIT_KEY = 'nexora_blog_comment_ts'
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_COMMENT_LENGTH = 2000
const MAX_NAME_LENGTH = 80

/* ── Profanity filter ── */
const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'bastard',
  'piss', 'slut', 'whore', 'cock', 'cunt', 'douche', 'fag', 'nigger',
  'nigga', 'prick', 'twat', 'wanker', 'arse', 'skank', 'bollocks',
  'bloody', 'bugger', 'arsehole', 'motherfucker', 'asshole',
]

function containsProfanity(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  return BAD_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lower)
  })
}

/* ── Rate limiting (client-side) ── */
function checkRateLimit() {
  try {
    const last = Number(localStorage.getItem(RATE_LIMIT_KEY) || 0)
    if (Date.now() - last < RATE_LIMIT_WINDOW_MS) {
      return Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - last)) / 1000)
    }
  } catch { /* localStorage not available */ }
  return 0
}

function setRateLimit() {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

/* ── Spam detection ── */
function isSpam(text) {
  if (!text) return false
  const checks = [
    text.length > MAX_COMMENT_LENGTH,
    (text.match(/(https?:\/\/)/gi) || []).length > 2,
    (text.match(/\[url=/gi) || []).length > 0,
    (text.match(/\b(buy now|click here|free money|earn fast|subscribe to my)\b/gi) || []).length > 0,
  ]
  return checks.some(Boolean)
}

/* ── Validation ── */
export function validateComment({ authorName, comment }) {
  const errors = []
  if (!authorName || authorName.trim().length < 2) errors.push('Name must be at least 2 characters.')
  if (authorName && authorName.length > MAX_NAME_LENGTH) errors.push(`Name must be ${MAX_NAME_LENGTH} characters or less.`)
  if (!comment || comment.trim().length < 2) errors.push('Comment must be at least 2 characters.')
  if (comment && comment.length > MAX_COMMENT_LENGTH) errors.push(`Comment must be ${MAX_COMMENT_LENGTH} characters or less.`)
  if (!errors.length && containsProfanity(authorName)) errors.push('Please keep language respectful.')
  if (!errors.length && containsProfanity(comment)) errors.push('Please keep language respectful.')
  if (!errors.length && isSpam(comment)) errors.push('Comment looks like spam. Please remove promotional links.')
  const remaining = checkRateLimit()
  if (remaining > 0) errors.push(`Please wait ${remaining}s before posting again.`)
  return errors
}

/* ── Submit a comment ── */
export async function submitComment({ slug, parentId, authorName, authorEmail, comment, rating }) {
  if (!db) throw new Error('Database not available.')
  const wordCount = comment.split(/\s+/).filter(Boolean).length
  if (wordCount < 2) throw new Error('Comment is too short.')
  if (wordCount > 500) throw new Error('Comment is too long (max 500 words).')
  setRateLimit()
  const payload = {
    slug,
    authorName: authorName.trim().slice(0, MAX_NAME_LENGTH),
    authorEmail: authorEmail ? authorEmail.trim().slice(0, 254) : '',
    comment: comment.trim().slice(0, MAX_COMMENT_LENGTH),
    status: 'pending',
    pinned: false,
    isTeamReply: false,
    helpful: [],
    reported: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  // Only include parentId if it's a truthy string (Firestore rule requires string, rejects null)
  if (parentId) payload.parentId = parentId
  // Only include rating if it's a valid number (Firestore rule rejects null)
  if (rating && rating >= 1 && rating <= 5) payload.rating = rating
  const ref = await addDoc(collection(db, BLOG_COMMENTS_COLLECTION), payload)
  return ref.id
}

/* ── Listen to comments for a blog post ── */
export function listenBlogComments(slug, sortBy, onData, onError) {
  if (!db) {
    onData?.([])
    return () => {}
  }
  const orderField = sortBy === 'oldest' ? 'createdAt' : sortBy === 'highest' ? 'rating' : sortBy === 'helpful' ? 'helpfulCount' : 'createdAt'
  const orderDir = sortBy === 'oldest' ? 'asc' : 'desc'
  const constraints = [
    where('slug', '==', slug),
    where('status', 'in', ['approved', 'pending']),
    orderBy(orderField, orderDir),
    firestoreLimit(50),
  ]
  const q = query(collection(db, BLOG_COMMENTS_COLLECTION), ...constraints)
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData?.(comments)
    },
    (error) => {
      console.warn('[Blog Comments] Listener error:', error)
      onError?.(error)
      onData?.([])
    },
  )
}

/* ── Listen to all comments for admin (moderation) ── */
export function listenAllComments(slug, onData, onError) {
  if (!db) {
    onData?.([])
    return () => {}
  }
  const q = query(
    collection(db, BLOG_COMMENTS_COLLECTION),
    where('slug', '==', slug),
    orderBy('createdAt', 'desc'),
    firestoreLimit(100),
  )
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData?.(comments)
    },
    (error) => {
      console.warn('[Blog Comments] Admin listener error:', error)
      onError?.(error)
      onData?.([])
    },
  )
}

/* ── Get average rating from comments array ── */
export function calculateAverageRating(comments) {
  const withRating = comments.filter((c) => c.rating && c.rating >= 1 && c.rating <= 5 && !c.parentId && c.status === 'approved')
  if (!withRating.length) return { average: 0, count: 0 }
  const sum = withRating.reduce((acc, c) => acc + c.rating, 0)
  return { average: sum / withRating.length, count: withRating.length }
}

/* ── Admin: Approve a comment ── */
export async function approveComment(commentId) {
  if (!db) throw new Error('Database not available.')
  await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  })
}

/* ── Admin: Reject a comment ── */
export async function rejectComment(commentId) {
  if (!db) throw new Error('Database not available.')
  await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  })
}

/* ── Admin: Delete a comment ── */
export async function deleteComment(commentId) {
  if (!db) throw new Error('Database not available.')
  await deleteDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId))
}

/* ── Admin: Hide/Unhide a comment ── */
export async function hideComment(commentId, hidden) {
  if (!db) throw new Error('Database not available.')
  await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
    status: hidden ? 'hidden' : 'approved',
    updatedAt: serverTimestamp(),
  })
}

/* ── Admin: Pin/Unpin a comment ── */
export async function pinComment(commentId, pinned) {
  if (!db) throw new Error('Database not available.')
  await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
    pinned,
    updatedAt: serverTimestamp(),
  })
}

/* ── Admin: Reply as Nexora Team ── */
export async function teamReply({ slug, parentId, comment }) {
  if (!db) throw new Error('Database not available.')
  await addDoc(collection(db, BLOG_COMMENTS_COLLECTION), {
    slug,
    parentId,
    authorName: 'Nexora Team',
    authorEmail: '',
    comment: comment.trim().slice(0, MAX_COMMENT_LENGTH),
    rating: null,
    status: 'approved',
    pinned: false,
    isTeamReply: true,
    helpful: [],
    reported: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/* ── Public: Mark comment as helpful ── */
export async function markHelpful(commentId) {
  if (!db) throw new Error('Database not available.')
  const ref = doc(db, BLOG_COMMENTS_COLLECTION, commentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data()
  const helpful = Array.isArray(data.helpful) ? data.helpful : []
  await updateDoc(ref, {
    helpful: [...helpful, 'visitor'],
    updatedAt: serverTimestamp(),
  })
}

/* ── Public: Report a comment ── */
export async function reportComment(commentId) {
  if (!db) throw new Error('Database not available.')
  await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
    reported: true,
    updatedAt: serverTimestamp(),
  })
}
