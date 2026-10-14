/**
 * Client side of the GeoLint fix service.
 *
 * Clients sign in with Google in their OWN Firebase app instance ("geolint-client"), not the app the
 * CRM and Control Centre use. That keeps two things apart on purpose:
 *   - a client never becomes a CRM user (no users/{uid} presence document, no logged-in header, no workspace);
 *   - signing in or out here never touches the Control Centre session.
 * Both apps belong to the same Firebase project, so the engine verifies the tokens the same way.
 *
 * Firebase is loaded on demand so this module stays importable in plain Node tests.
 */
import { GeoLintError, geolintRequest } from './geolint.js'

export const CLIENT_APP_NAME = 'geolint-client'
export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

let authPromise = null

async function clientAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const [{ getApps, initializeApp }, { getAuth, browserLocalPersistence, setPersistence }, { app: mainApp }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('./firebase.js'),
      ])
      if (!mainApp) throw new GeoLintError('Sign-in is not available right now.', { code: 'NO_AUTH' })
      const existing = getApps().find((a) => a.name === CLIENT_APP_NAME)
      const app = existing || initializeApp(mainApp.options, CLIENT_APP_NAME)
      const auth = getAuth(app)
      await setPersistence(auth, browserLocalPersistence).catch(() => {})
      return auth
    })().catch((error) => {
      authPromise = null
      throw error
    })
  }
  return authPromise
}

const shape = (user) => (user ? { uid: user.uid, email: user.email || '', name: user.displayName || '', photoUrl: user.photoURL || '' } : null)

/** Calls back with the signed-in client (or null) now and on every change. Returns an unsubscribe function. */
export function watchClient(callback) {
  let stop = () => {}
  let cancelled = false
  clientAuth()
    .then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth')
      if (cancelled) return
      stop = onAuthStateChanged(auth, (user) => callback(shape(user)))
    })
    .catch(() => callback(null))
  return () => {
    cancelled = true
    stop()
  }
}

export function clientSignInMessage(error) {
  const code = String(error?.code || '')
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled. Press the button to try again.'
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.'
  if (code === 'auth/network-request-failed') return 'No internet connection. Check it and try again.'
  if (code === 'auth/unauthorized-domain') return 'Sign-in is not enabled for this web address yet.'
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is not switched on yet.'
  if (error instanceof GeoLintError) return error.message
  return 'Google sign-in did not work. Try again.'
}

export async function signInWithGoogle() {
  const [auth, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([clientAuth(), import('firebase/auth')])
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  return shape(result.user)
}

export async function signOutClient() {
  const [auth, { signOut }] = await Promise.all([clientAuth(), import('firebase/auth')])
  await signOut(auth)
}

async function clientToken() {
  const auth = await clientAuth()
  if (!auth.currentUser) throw new GeoLintError('Sign in to continue.', { status: 401, code: 'UNAUTHENTICATED' })
  return auth.currentUser.getIdToken()
}

/**
 * Asks Google for read-only Search Console access for the account that is signed in.
 * The access token lives only in memory for the one call that fetches the data; it is never saved.
 */
export async function requestSearchConsoleToken() {
  const [auth, { GoogleAuthProvider, reauthenticateWithPopup }] = await Promise.all([clientAuth(), import('firebase/auth')])
  if (!auth.currentUser) throw new GeoLintError('Sign in to continue.', { status: 401, code: 'UNAUTHENTICATED' })
  const provider = new GoogleAuthProvider()
  provider.addScope(GSC_SCOPE)
  provider.setCustomParameters({ login_hint: auth.currentUser.email || '' })
  const result = await reauthenticateWithPopup(auth.currentUser, provider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) throw new GeoLintError('Google did not give Search Console access.', { code: 'GSC_NO_TOKEN' })
  return credential.accessToken
}

// ---- engine calls

const call = (path, options = {}) => geolintRequest(path, { getToken: clientToken, ...options })

export const getFixService = () => geolintRequest('/api/fix-service', { getToken: null })
export const placeOrder = (payload) => call('/api/orders', { method: 'POST', payload })
export const listMyOrders = () => call('/api/orders')
export const getMyOrder = (id) => call(`/api/orders/${encodeURIComponent(id)}`)
export const submitPayment = (id, payload) => call(`/api/orders/${encodeURIComponent(id)}/payment-submitted`, { method: 'POST', payload })
export const cancelMyOrder = (id) => call(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
export const listGscProperties = (id, accessToken) => call(`/api/orders/${encodeURIComponent(id)}/gsc/properties`, { method: 'POST', payload: { accessToken } })
export const fetchGsc = (id, accessToken, siteUrl) => call(`/api/orders/${encodeURIComponent(id)}/gsc`, { method: 'POST', payload: { accessToken, ...(siteUrl ? { siteUrl } : {}) } })
