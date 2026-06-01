import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Vite env vars (create a `.env` file at project root)
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
// VITE_FIREBASE_MEASUREMENT_ID=...

const env = import.meta.env

const publicFirebaseConfig = {
  apiKey: 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc',
  authDomain: 'nexora-business-suite.firebaseapp.com',
  projectId: 'nexora-business-suite',
  storageBucket: 'nexora-business-suite.firebasestorage.app',
  messagingSenderId: '342357218248',
  appId: '1:342357218248:web:8b934899dd55832f1666fd',
  measurementId: 'G-Y89E5YBWYE',
}

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || publicFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || publicFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || publicFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || publicFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || publicFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || publicFirebaseConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || publicFirebaseConfig.measurementId,
}

const authEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

export const missingFirebaseAuthEnvVars = authEnvVars.filter((key) => !env[key])
export const firebaseAuthEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
export const firebaseEnabled = Boolean(firebaseAuthEnabled)

if (missingFirebaseAuthEnvVars.length) {
  console.warn('[Nexora CRM Firebase] Using public Firebase web config fallback for missing environment variables.', {
    missing: missingFirebaseAuthEnvVars,
    required: authEnvVars,
    projectId: publicFirebaseConfig.projectId,
  })
}

export function getFirebaseEnvHint() {
  if (firebaseAuthEnabled) return null
  if (missingFirebaseAuthEnvVars.length) return `Firebase Authentication is missing production configuration: ${missingFirebaseAuthEnvVars.join(', ')}.`
  return 'Secure Cloud Sync is not available right now.'
}

export const app = firebaseAuthEnabled ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app && firebaseConfig.storageBucket ? getStorage(app) : null

export let analytics = null
if (app) {
  isSupported()
    .then((ok) => {
      analytics = ok ? getAnalytics(app) : null
    })
    .catch(() => {
      analytics = null
    })
}
