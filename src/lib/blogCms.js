import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { firestoreDb as db, storage } from './firebase.js'
import { mergeBlogArticles, normalizeBlogArticleDoc } from './blogData.js'

export const BLOG_POSTS_COLLECTION = 'blogPosts'
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

export async function saveBlogPost(slug, payload) {
  if (!db) throw new Error('Firebase is not configured.')
  await setDoc(doc(db, BLOG_POSTS_COLLECTION, slug), {
    ...payload,
    slug,
    updatedAt: serverTimestamp(),
    createdAt: payload.createdAt || serverTimestamp(),
  }, { merge: true })
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
