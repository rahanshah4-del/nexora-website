import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics'

const publicFirebaseConfig = {
  apiKey: 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc',
  authDomain: 'nexora-business-suite.firebaseapp.com',
  projectId: 'nexora-business-suite',
  storageBucket: 'nexora-business-suite.firebasestorage.app',
  messagingSenderId: '342357218248',
  appId: '1:342357218248:web:8b934899dd55832f1666fd',
  measurementId: 'G-Y89E5YBWYE',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || publicFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || publicFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || publicFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || publicFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || publicFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || publicFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || publicFirebaseConfig.measurementId,
}

const requiredAuthEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

export const missingFirebaseAuthEnvVars = requiredAuthEnvVars.filter((key) => !import.meta.env[key])
const hasAuthConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
const hasStorageConfig = Boolean(firebaseConfig.storageBucket)

if (missingFirebaseAuthEnvVars.length) {
  console.warn('[Nexora Firebase] Using public Firebase web config fallback for missing environment variables.', {
    missing: missingFirebaseAuthEnvVars,
    required: requiredAuthEnvVars,
    projectId: publicFirebaseConfig.projectId,
  })
}

export const app = hasAuthConfig ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app && hasStorageConfig ? getStorage(app) : null
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

export const firebaseAuthEnabled = Boolean(app && auth)
export const firebaseEnabled = Boolean(app && auth && db)

export function getFirebaseAuthConfigMessage() {
  if (firebaseAuthEnabled) return null
  if (missingFirebaseAuthEnvVars.length) {
    return `Firebase Authentication is missing production configuration: ${missingFirebaseAuthEnvVars.join(', ')}.`
  }
  return 'Firebase Authentication failed to initialize. Check Firebase production configuration.'
}

export function assertFirebaseReady() {
  if (!firebaseEnabled) {
    throw new Error(
      getFirebaseAuthConfigMessage() || 'Firebase is not configured. Set VITE_FIREBASE_* env vars, then restart dev server.',
    )
  }
}
