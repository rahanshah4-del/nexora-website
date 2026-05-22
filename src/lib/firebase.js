import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
)

export const app = hasFirebaseConfig ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export let analytics = null

async function initializeAnalytics(appInstance) {
  if (!appInstance || typeof window === 'undefined') return null
  try {
    if (await analyticsIsSupported()) {
      return getAnalytics(appInstance)
    }
  } catch {
    return null
  }
  return null
}

if (app) {
  initializeAnalytics(app).then((analyticsInstance) => {
    if (analyticsInstance) {
      analytics = analyticsInstance
    }
  })
}

export const firebaseEnabled = Boolean(app && auth && db && storage)

export function assertFirebaseReady() {
  if (!firebaseEnabled) {
    throw new Error(
      'Firebase is not configured. Set VITE_FIREBASE_API_KEY and other VITE_FIREBASE_* env vars, then restart dev server.',
    )
  }
}

