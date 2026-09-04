import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const publicFirebaseConfig = {
  apiKey: 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc',
  authDomain: 'nexora-business-suite.firebaseapp.com',
  projectId: 'nexora-business-suite',
  storageBucket: 'nexora-business-suite.firebasestorage.app',
  messagingSenderId: '342357218248',
  appId: '1:342357218248:web:8b934899dd55832f1666fd',
  measurementId: 'G-Y89E5YBWYE',
}

// IMPORTANT:
// Create a `.env` file and set these Vite env vars to your Firebase project values.
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || publicFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || publicFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || publicFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || publicFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || publicFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || publicFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || publicFirebaseConfig.measurementId,
}

const authEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

export const missingFirebaseAuthEnvVars = authEnvVars.filter((key) => !import.meta.env[key])
export const firebaseAuthEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
export const firebaseEnabled = Boolean(firebaseAuthEnabled)

if (missingFirebaseAuthEnvVars.length) {
  console.warn('[Nexora CRM Firebase] Using public Firebase web config fallback for missing environment variables.', {
    missing: missingFirebaseAuthEnvVars,
    required: authEnvVars,
    projectId: publicFirebaseConfig.projectId,
  })
}

function createFirestoreClient(firebaseApp) {
  // Some ISPs / VPNs / corporate proxies / antivirus tools interfere with the
  // WebSocket-based channel the Firestore SDK prefers, and the SDK's own
  // auto-detection of that failure can take 30-60s+ before it falls back —
  // every read/write feels "stuck" for that long. Forcing auto-detection up
  // front (instead of the plain getFirestore() default) makes that fallback
  // near-instant on networks where it's needed, with no downside on networks
  // where it isn't.
  try {
    return initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true })
  } catch (error) {
    // initializeFirestore throws if Firestore was already initialized for
    // this app (e.g. hot-reload during dev) — fall back to the existing instance.
    console.warn('[Nexora CRM Firebase] initializeFirestore failed, falling back to getFirestore.', error?.message || error)
    return getFirestore(firebaseApp)
  }
}

export const app = firebaseAuthEnabled ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? createFirestoreClient(app) : null
export const storage = app && firebaseConfig.storageBucket ? getStorage(app) : null

export function getFirebaseEnvHint() {
  if (firebaseAuthEnabled) return null
  if (missingFirebaseAuthEnvVars.length) return `Firebase Authentication is missing production configuration: ${missingFirebaseAuthEnvVars.join(', ')}.`
  return 'Secure Cloud Sync is not available right now.'
}
