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
export const GSC_APP_NAME = 'geolint-gsc'
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

const shape = (user) => (user ? { uid: user.uid, email: user.email || '', name: user.displayName || '', photoUrl: user.photoURL || '', emailVerified: Boolean(user.emailVerified) } : null)

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
  if (code === 'auth/operation-not-allowed') return 'This sign-in method is not switched on yet.'
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') return 'The email or password is not right. If you signed up with Google, use the Google button.'
  if (code === 'auth/email-already-in-use') return 'There is already an account with this email. Use Sign in instead.'
  if (code === 'auth/weak-password') return 'Choose a password with at least 8 characters.'
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/too-many-requests') return 'Too many tries. Wait a few minutes and try again.'
  if (code === 'auth/user-disabled') return 'This account has been disabled. Contact us for help.'
  if (error instanceof GeoLintError) return error.message
  return 'Sign-in did not work. Try again.'
}

export async function signInWithGoogle() {
  const [auth, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([clientAuth(), import('firebase/auth')])
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  return shape(result.user)
}

// ---- email and password (the same client app, so the same separation from the CRM)

export function validateCredentials({ name, email, password, confirm }, mode) {
  const errors = {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim())) errors.email = 'Enter a valid email address.'
  if (mode === 'signup') {
    if (String(name || '').trim().length < 2) errors.name = 'Enter your name.'
    if (String(password || '').length < 8) errors.password = 'Use at least 8 characters.'
    else if (password !== confirm) errors.confirm = 'The two passwords are not the same.'
  } else if (!password) {
    errors.password = 'Enter your password.'
  }
  return errors
}

export async function signUpWithEmail({ name, email, password }) {
  const [auth, mod] = await Promise.all([clientAuth(), import('firebase/auth')])
  const cred = await mod.createUserWithEmailAndPassword(auth, email.trim(), password)
  await mod.updateProfile(cred.user, { displayName: name.trim() }).catch(() => {})
  await mod.sendEmailVerification(cred.user).catch(() => {})
  return shape(cred.user)
}

export async function signInWithEmail({ email, password }) {
  const [auth, mod] = await Promise.all([clientAuth(), import('firebase/auth')])
  const cred = await mod.signInWithEmailAndPassword(auth, email.trim(), password)
  return shape(cred.user)
}

export async function resendVerification() {
  const [auth, mod] = await Promise.all([clientAuth(), import('firebase/auth')])
  if (!auth.currentUser) throw new GeoLintError('Sign in to continue.', { status: 401, code: 'UNAUTHENTICATED' })
  await mod.sendEmailVerification(auth.currentUser)
}

/** After the person clicked the link in the email: reload the account and refresh the token so the engine sees it as verified. */
export async function refreshClient() {
  const auth = await clientAuth()
  if (!auth.currentUser) return null
  await auth.currentUser.reload()
  await auth.currentUser.getIdToken(true)
  return shape(auth.currentUser)
}

export async function sendResetEmail(email) {
  const [auth, mod] = await Promise.all([clientAuth(), import('firebase/auth')])
  await mod.sendPasswordResetEmail(auth, email.trim())
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
 * Asks Google for read-only Search Console access. The person picks ANY Google account (the one that
 * owns the site in Search Console does not have to be the one they ordered with). This runs in a third,
 * throw-away Firebase app that keeps nothing: the session is signed out again straight away, and the
 * access token lives only in memory for the one call that fetches the data. It is never saved.
 */
export async function requestSearchConsoleToken() {
  const [{ getApps, initializeApp }, { getAuth, inMemoryPersistence, setPersistence, GoogleAuthProvider, signInWithPopup, signOut }, { app: mainApp }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('./firebase.js'),
  ])
  if (!mainApp) throw new GeoLintError('Sign-in is not available right now.', { code: 'NO_AUTH' })
  const app = getApps().find((a) => a.name === GSC_APP_NAME) || initializeApp(mainApp.options, GSC_APP_NAME)
  const auth = getAuth(app)
  await setPersistence(auth, inMemoryPersistence)
  const provider = new GoogleAuthProvider()
  provider.addScope(GSC_SCOPE)
  provider.setCustomParameters({ prompt: 'select_account consent' })
  try {
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (!credential?.accessToken) throw new GeoLintError('Google did not give Search Console access.', { code: 'GSC_NO_TOKEN' })
    return credential.accessToken
  } finally {
    await signOut(auth).catch(() => {})
  }
}

// ---- engine calls

const call = (path, options = {}) => geolintRequest(path, { getToken: clientToken, ...options })

export const siteProfile = (url) => geolintRequest('/api/site-profile', { method: 'POST', payload: { url }, getToken: null })
export const getFixService = () => geolintRequest('/api/fix-service', { getToken: null })
export const placeOrder = (payload) => call('/api/orders', { method: 'POST', payload })
export const listMyOrders = () => call('/api/orders')
export const getMyOrder = (id) => call(`/api/orders/${encodeURIComponent(id)}`)
export const submitPayment = (id, payload) => call(`/api/orders/${encodeURIComponent(id)}/payment-submitted`, { method: 'POST', payload })
export const changeOrderPlan = (id, plan) => call(`/api/orders/${encodeURIComponent(id)}/plan`, { method: 'POST', payload: { plan } })
export const cancelMyOrder = (id) => call(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
/** Free weekly monitoring of the signed-in client's pages. */
export const listMonitors = () => call('/api/monitors')
export const addMonitor = ({ url, auditId }) => call('/api/monitors', { method: 'POST', payload: { url, ...(auditId ? { auditId } : {}) } })
export const removeMonitor = (id) => call(`/api/monitors/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const listGscProperties = (id, accessToken) => call(`/api/orders/${encodeURIComponent(id)}/gsc/properties`, { method: 'POST', payload: { accessToken } })
export const fetchGsc = (id, accessToken, siteUrl) => call(`/api/orders/${encodeURIComponent(id)}/gsc`, { method: 'POST', payload: { accessToken, ...(siteUrl ? { siteUrl } : {}) } })

// ---- card payment (Polar). The engine's webhook marks the order paid; the browser only opens the checkout.

/** Asks the engine for a hosted Polar checkout for this order and resolves its address. */
export async function startPolarCheckout(id) {
  const r = await call(`/api/orders/${encodeURIComponent(id)}/polar-checkout`, { method: 'POST' })
  if (!r?.url) throw new GeoLintError('The card checkout did not open. Please try again.', { code: 'NO_CHECKOUT_URL' })
  return r.url
}
