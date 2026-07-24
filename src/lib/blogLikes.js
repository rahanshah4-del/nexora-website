/**
 * Blog Like/Dislike — Firestore-backed with localStorage for per-user tracking.
 * Likes persist across reloads for all users. Each user can only react once per blog.
 */

const BLOG_LIKES_COLLECTION = 'blogLikes'
const USER_REACTIONS_KEY = 'nexora:blog:reactions' // { slug: 'liked' | 'disliked' }

function getUserReactions() {
  try {
    return JSON.parse(localStorage.getItem(USER_REACTIONS_KEY) || '{}')
  } catch { return {} }
}

function setUserReaction(slug, type) {
  const reactions = getUserReactions()
  if (type) reactions[slug] = type
  else delete reactions[slug]
  try { localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(reactions)) } catch {}
}

export function getUserReaction(slug) {
  return getUserReactions()[slug] || null
}

/**
 * Fetch like/dislike counts from Firestore.
 */
export async function fetchBlogLikes(slug) {
  if (!slug) return { likes: 0, dislikes: 0 }
  try {
    const { firestoreDb } = await import('./firebase.js')
    if (!firestoreDb) return { likes: 0, dislikes: 0 }
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(firestoreDb, BLOG_LIKES_COLLECTION, slug))
    if (!snap.exists()) return { likes: 0, dislikes: 0 }
    const data = snap.data()
    return { likes: data.likes || 0, dislikes: data.dislikes || 0 }
  } catch {
    return { likes: 0, dislikes: 0 }
  }
}

/**
 * Toggle like/dislike. Updates Firestore count and localStorage user tracking.
 * Returns new counts.
 */
export async function toggleBlogReaction(slug, type) {
  if (!slug) return { likes: 0, dislikes: 0, userReaction: null }
  const currentReaction = getUserReaction(slug)
  let likesDelta = 0
  let dislikesDelta = 0
  let newUserReaction = null

  if (currentReaction === type) {
    // Undo reaction
    if (type === 'liked') likesDelta = -1
    else dislikesDelta = -1
    setUserReaction(slug, null)
    newUserReaction = null
  } else {
    // New reaction (undo old first)
    if (currentReaction === 'liked') likesDelta = -1
    else if (currentReaction === 'disliked') dislikesDelta = -1
    if (type === 'liked') likesDelta += 1
    else dislikesDelta += 1
    setUserReaction(slug, type)
    newUserReaction = type
  }

  // Update Firestore
  try {
    const { firestoreDb } = await import('./firebase.js')
    if (!firestoreDb) throw new Error('No DB')
    const { doc, getDoc, setDoc, serverTimestamp, increment } = await import('firebase/firestore')
    const ref = doc(firestoreDb, BLOG_LIKES_COLLECTION, slug)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      const { updateDoc } = await import('firebase/firestore')
      await updateDoc(ref, {
        likes: increment(likesDelta),
        dislikes: increment(dislikesDelta),
        updatedAt: serverTimestamp(),
      })
    } else {
      await setDoc(ref, {
        slug,
        likes: Math.max(0, likesDelta),
        dislikes: Math.max(0, dislikesDelta),
        updatedAt: serverTimestamp(),
      })
    }

    const updated = await getDoc(ref)
    const data = updated.data()
    return {
      likes: Math.max(0, data?.likes || 0),
      dislikes: Math.max(0, data?.dislikes || 0),
      userReaction: newUserReaction,
    }
  } catch {
    // Fallback: return local-only counts
    return {
      likes: Math.max(0, likesDelta),
      dislikes: Math.max(0, dislikesDelta),
      userReaction: newUserReaction,
    }
  }
}
