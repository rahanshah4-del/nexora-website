import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { firestoreDb as db, storage } from './firebase.js'
import { mergeBlogArticles, normalizeBlogArticleDoc } from './blogData.js'
import { planPostDates, SERVER_TIME } from './blogPostDates.js'

export const BLOG_POSTS_COLLECTION = 'blogPosts'
// Old slug → new slug for renamed published posts. The site build turns these
// into 301s (scripts/lib/blogRedirects.mjs); publishing a post at a slug that
// has one removes it, since a live page must win over a redirect.
export const BLOG_REDIRECTS_COLLECTION = 'blogRedirects'
const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const BLOG_IMAGE_UPLOAD_TIMEOUT_MS = 60000

export function listenPublishedBlogPosts(onRows, onError) {
  if (!db) {
    onRows?.([])
    return () => {}
  }
  const q = query(collection(db, BLOG_POSTS_COLLECTION), where('status', '==', 'published'), limit(100))
  return onSnapshot(
    q,
    (snap) => onRows?.(mergeBlogArticles(snap.docs.map((docSnap) => normalizeBlogArticleDoc(docSnap.id, docSnap.data())))),
    (error) => {
      console.warn('[Blog CMS] Published blog listener failed; using static fallback.', error)
      onError?.(error)
      onRows?.(mergeBlogArticles([]))
    },
  )
}

export function listenAdminBlogPosts(onRows, onError) {
  if (!db) {
    onRows?.([])
    return () => {}
  }
  return onSnapshot(
    query(collection(db, BLOG_POSTS_COLLECTION), limit(200)),
    (snap) => onRows?.(snap.docs.map((docSnap) => normalizeBlogArticleDoc(docSnap.id, docSnap.data()))),
    (error) => {
      onError?.(error)
      onRows?.([])
    },
  )
}

export async function getBlogPost(slug) {
  if (!db || !slug) return null
  const snap = await getDoc(doc(db, BLOG_POSTS_COLLECTION, slug))
  return snap.exists() ? normalizeBlogArticleDoc(snap.id, snap.data()) : null
}

// Dates come from the document as stored (read inside the transaction), never
// from the editor: createdAt and publishDate are set once and then kept — see
// blogPostDates.js. updatedAt moves on every save and is what dateModified and
// the sitemap lastmod follow.
function withDates(payload, stored) {
  const { createdAt, publishDate } = planPostDates(stored, payload.status)
  const rest = { ...payload }
  delete rest.createdAt
  delete rest.publishDate
  return {
    ...rest,
    createdAt: createdAt === SERVER_TIME ? serverTimestamp() : createdAt,
    publishDate: publishDate === SERVER_TIME ? serverTimestamp() : publishDate,
    updatedAt: serverTimestamp(),
  }
}

async function hasRedirectToClear(redirectRef, status) {
  if (status !== 'published') return false
  return (await getDoc(redirectRef)).exists()
}

export async function saveBlogPost(slug, payload) {
  if (!db) throw new Error('Firebase is not configured.')
  const postRef = doc(db, BLOG_POSTS_COLLECTION, slug)
  const redirectRef = doc(db, BLOG_REDIRECTS_COLLECTION, slug)
  // A published page at this slug replaces any redirect away from it. Checked
  // outside the transaction: a read-only document inside one is re-verified at
  // commit, which shows up as a (no-op) write event on blogRedirects.
  const clearRedirect = await hasRedirectToClear(redirectRef, payload.status)
  await runTransaction(db, async (transaction) => {
    const stored = await transaction.get(postRef)
    transaction.set(postRef, { ...withDates(payload, stored.exists() ? stored.data() : null), slug }, { merge: true })
    if (clearRedirect) transaction.delete(redirectRef)
  })
}

// Renames a CMS post in one atomic step: the post moves to newSlug keeping its
// createdAt/publishDate, the old document is deleted and — if the old URL was
// public — a redirect old → new is recorded for the site build.
export async function renameBlogPost(oldSlug, newSlug, payload) {
  if (!db) throw new Error('Firebase is not configured.')
  if (!oldSlug || !newSlug || oldSlug === newSlug) throw new Error('Rename needs two different slugs.')
  const oldRef = doc(db, BLOG_POSTS_COLLECTION, oldSlug)
  const newRef = doc(db, BLOG_POSTS_COLLECTION, newSlug)
  const newRedirectRef = doc(db, BLOG_REDIRECTS_COLLECTION, newSlug)
  const clearRedirect = await hasRedirectToClear(newRedirectRef, payload.status)
  await runTransaction(db, async (transaction) => {
    const oldSnap = await transaction.get(oldRef)
    const newSnap = await transaction.get(newRef)
    if (newSnap.exists()) throw new Error(`Slug "${newSlug}" is already used by another post.`)
    const stored = oldSnap.exists() ? oldSnap.data() : null
    transaction.set(newRef, { ...withDates(payload, stored), slug: newSlug })
    if (oldSnap.exists()) transaction.delete(oldRef)
    if (stored?.status === 'published') {
      transaction.set(doc(db, BLOG_REDIRECTS_COLLECTION, oldSlug), {
        from: oldSlug,
        to: newSlug,
        createdAt: serverTimestamp(),
        createdBy: payload.createdBy || '',
      })
    }
    if (clearRedirect) transaction.delete(newRedirectRef)
  })
}

export async function deleteBlogPost(slug) {
  if (!db) throw new Error('Firebase is not configured.')
  await deleteDoc(doc(db, BLOG_POSTS_COLLECTION, slug))
}

export async function uploadBlogImage(slug, file, onProgress) {
  if (!storage) throw new Error('Firebase Storage is not configured.')
  if (!file) throw new Error('Select an image first.')
  if (!String(file.type || '').startsWith('image/')) throw new Error('Only image files are supported.')
  if (Number(file.size || 0) > BLOG_IMAGE_MAX_BYTES) throw new Error('Image must be 5MB or smaller.')
  const safeSlug = String(slug || 'blog').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 80) || 'blog'
  const safeName = String(file.name || 'image').replace(/[^a-z0-9._-]+/gi, '-').toLowerCase().slice(-80)
  const objectPath = `public-blog/${safeSlug}/${Date.now()}-${safeName}`
  const fileRef = ref(storage, objectPath)
  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public,max-age=31536000,immutable',
    })
    const timeout = window.setTimeout(() => {
      task.cancel()
      reject(new Error('Image upload timed out. Check Firebase Storage rules and internet connection.'))
    }, BLOG_IMAGE_UPLOAD_TIMEOUT_MS)
    task.on(
      'state_changed',
      (snapshot) => {
        const total = Number(snapshot.totalBytes || 0)
        const transferred = Number(snapshot.bytesTransferred || 0)
        if (total > 0) onProgress?.(Math.round((transferred / total) * 100))
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      },
      () => {
        window.clearTimeout(timeout)
        onProgress?.(100)
        resolve()
      },
    )
  })
  return getDownloadURL(fileRef)
}
