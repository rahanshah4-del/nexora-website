import { initializeApp, getApps } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

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

// Firebase persists the signed-in user under a `firebase:authUser:...` key
// once any tab has ever called setPersistence()/signed in. Detecting that key
// lets a newly-opened tab skip re-invoking setPersistence() when a session is
// already active browser-wide — calling it again on every tab/page load was
// causing Firebase's persistence manager to briefly re-migrate that shared
// key, which other open tabs' onAuthStateChanged listeners could momentarily
// read as a sign-out (surfacing as a flicker through /login to /workspace).
function hasPersistedFirebaseAuthSession() {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('firebase:authUser:')) return true
    }
  } catch {
    return false
  }
  return false
}

export const app = hasAuthConfig ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const authPersistenceReady = auth
  ? (hasPersistedFirebaseAuthSession()
      // A session is already persisted browser-wide (from this tab's own
      // earlier load or another open tab) — browserLocalPersistence is
      // already in effect, so re-calling setPersistence() here would only
      // repeat the redundant migrate/rewrite that causes the cross-tab
      // flicker. Skip it; auth still initializes from the existing session.
      ? Promise.resolve()
      : setPersistence(auth, browserLocalPersistence).catch((error) => {
          console.warn('[Firebase Auth] persistence setup failed', {
            mode: 'browserLocalPersistence',
            code: error?.code || '',
            message: error?.message || '',
          })
        }))
  : Promise.resolve()
export const db = app
  ? initializeFirestore(app, {
      localCache: memoryLocalCache(),
      // Some ISPs / VPNs / corporate proxies / antivirus tools interfere with
      // the WebSocket-based channel Firestore prefers by default. Force
      // long-polling instead of only auto-detecting it — auto-detection still
      // attempts the WebSocket channel first and can take 30s+ to give up on
      // a hostile network before falling back, and every read/write feels
      // "stuck" for that long. Forcing it skips that detection delay
      // entirely, at the cost of marginally higher latency on networks that
      // didn't need it.
      experimentalForceLongPolling: true,
    })
  : null
export const firestoreDb = db
export const storage = app && hasStorageConfig ? getStorage(app) : null
export const functions = app ? getFunctions(app, 'us-central1') : null
export let analytics = null

async function initializeAnalytics(appInstance) {
  if (!appInstance || typeof window === 'undefined') return null
  try {
    const { getAnalytics, isSupported: analyticsIsSupported } = await import('firebase/analytics')
    if (await analyticsIsSupported()) {
      return getAnalytics(appInstance)
    }
  } catch {
    return null
  }
  return null
}

if (app && typeof window !== 'undefined') {
  // Defer analytics to idle to avoid blocking FCP/TBT
  const init = () => initializeAnalytics(app).then((instance) => { if (instance) analytics = instance })
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 4000 })
  } else {
    setTimeout(init, 2000)
  }
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
