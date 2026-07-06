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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firestoreDb as db, storage } from './firebase.js'
import { mergeBlogArticles, normalizeBlogArticleDoc } from './blogData.js'

export const BLOG_POSTS_COLLECTION = 'blogPosts'

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

export async function uploadBlogImage(slug, file) {
  if (!storage) throw new Error('Firebase Storage is not configured.')
  if (!file) throw new Error('Select an image first.')
  if (!String(file.type || '').startsWith('image/')) throw new Error('Only image files are supported.')
  const safeSlug = String(slug || 'blog').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 80) || 'blog'
  const safeName = String(file.name || 'image').replace(/[^a-z0-9._-]+/gi, '-').toLowerCase().slice(-80)
  const objectPath = `public-blog/${safeSlug}/${Date.now()}-${safeName}`
  const fileRef = ref(storage, objectPath)
  await uploadBytes(fileRef, file, { contentType: file.type || 'image/jpeg' })
  return getDownloadURL(fileRef)
}
