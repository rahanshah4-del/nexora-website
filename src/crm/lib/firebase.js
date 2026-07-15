// Re-exports from the single Firebase source of truth (src/lib/firebase.js)
// This file exists to provide backward-compatible imports for all CRM hooks.
// Every Firebase service (app, auth, Firestore with persistent cache, storage,
// analytics, functions) is initialized once in src/lib/firebase.js.
export {
  app,
  auth,
  authPersistenceReady,
  db,
  firestoreDb,
  storage,
  analytics,
  firebaseAuthEnabled,
  firebaseEnabled,
  missingFirebaseAuthEnvVars,
  getFirebaseAuthConfigMessage,
  assertFirebaseReady,
} from '../../lib/firebase.js'

import { missingFirebaseAuthEnvVars, firebaseAuthEnabled } from '../../lib/firebase.js'

// CRM-specific helpers that don't belong in the shared Firebase init file.
export function getFirebaseEnvHint() {
  if (firebaseAuthEnabled) return null
  if (missingFirebaseAuthEnvVars.length) return `Firebase Authentication is missing production configuration: ${missingFirebaseAuthEnvVars.join(', ')}.`
  return 'Secure Cloud Sync is not available right now.'
}
