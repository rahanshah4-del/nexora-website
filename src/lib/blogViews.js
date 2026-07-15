import { doc, increment, serverTimestamp, updateDoc, setDoc, getDoc } from 'firebase/firestore'
import { firestoreDb as db } from './firebase.js'

export const BLOG_VIEWS_COLLECTION = 'blogViews'

/* Increment view count for a blog post (fire-and-forget) */
export async function trackBlogView(slug) {
  if (!db || !slug) return
  try {
    const ref = doc(db, BLOG_VIEWS_COLLECTION, slug)
    await updateDoc(ref, { count: increment(1), updatedAt: serverTimestamp() })
  } catch (e) {
    if (e?.code === 'not-found') {
      try {
        await setDoc(doc(db, BLOG_VIEWS_COLLECTION, slug), {
          slug,
          count: 1,
          updatedAt: serverTimestamp(),
        })
      } catch {}
    }
  }
}

/* Get view count for a blog post */
export async function getBlogViewCount(slug) {
  if (!db || !slug) return 0
  try {
    const snap = await getDoc(doc(db, BLOG_VIEWS_COLLECTION, slug))
    if (snap.exists()) return Number(snap.data().count || 0)
  } catch {}
  return 0
}
