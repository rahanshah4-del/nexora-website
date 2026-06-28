import { signInWithCustomToken } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import { auth, functions } from './firebase.js'

const PASSKEY_WORKER_URL = (
  import.meta.env.VITE_PASSKEY_WORKER_URL ||
  'https://nexora-passkeys-api.rahanshah4.workers.dev'
).replace(/\/+$/, '')

function callable(name) {
  if (!functions) throw new Error('Passkey backend is not configured.')
  return httpsCallable(functions, name)
}

function workerEnabled() {
  return Boolean(PASSKEY_WORKER_URL)
}

async function workerRequest(path, { method = 'POST', body, authRequired = true } = {}) {
  if (!workerEnabled()) throw new Error('Passkey Worker URL is not configured.')
  const headers = { 'Content-Type': 'application/json' }
  if (authRequired) {
    const token = await auth?.currentUser?.getIdToken?.()
    if (!token) throw new Error('Please sign in before using passkeys.')
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${PASSKEY_WORKER_URL}${path}`, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) || body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || 'Passkey request failed.')
  return data
}

async function callBackend(name, data = {}, options = {}) {
  const workerRoutes = {
    passkeyBeginRegistration: ['/api/passkeys/registration/options', 'POST', true],
    passkeyFinishRegistration: ['/api/passkeys/registration/verify', 'POST', true],
    passkeyBeginAuthentication: ['/api/passkeys/authentication/options', 'POST', false],
    passkeyFinishAuthentication: ['/api/passkeys/authentication/verify', 'POST', false],
    listMyPasskeys: ['/api/passkeys/me', 'GET', true],
    renameMyPasskey: ['/api/passkeys/me/rename', 'PATCH', true],
    removeMyPasskey: ['/api/passkeys/me/remove', 'PATCH', true],
    adminListPasskeySecurity: ['/api/passkeys/admin/security', 'POST', true],
    adminUpdatePasskey: ['/api/passkeys/admin/update', 'PATCH', true],
    adminForceLogoutUser: ['/api/passkeys/admin/force-logout', 'POST', true],
    recordLoginHistory: ['/api/passkeys/login-history', 'POST', false],
  }
  if (workerEnabled() && workerRoutes[name]) {
    const [path, method, authRequired] = workerRoutes[name]
    return workerRequest(path, { method, body: data, authRequired: options.authRequired ?? authRequired })
  }
  const res = await callable(name)(data)
  return res.data
}

export function passkeysSupported() {
  return typeof window !== 'undefined' && browserSupportsWebAuthn()
}

export async function platformPasskeyAvailable() {
  if (!passkeysSupported()) return false
  try {
    return await platformAuthenticatorIsAvailable()
  } catch {
    return false
  }
}

export function deviceMeta() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Browser'
  const platform = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iPhone / iPad' : /mac os|macintosh/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Device'
  return {
    userAgent: ua,
    browser,
    platform,
    deviceName: `${platform} ${browser}`,
    origin: typeof window === 'undefined' ? '' : window.location.origin,
  }
}

function passkeySetupErrorMessage(error) {
  const name = String(error?.name || '')
  const message = String(error?.message || error || '')
  const combined = `${name} ${message}`.toLowerCase()
  if (combined.includes('quota')) {
    return 'Your device passkey storage is full. Remove an old saved passkey for Nexora from your browser/device password settings, then try again. Password login will still work.'
  }
  if (combined.includes('invalidstate') || combined.includes('previously registered') || combined.includes('already registered')) {
    return 'A passkey for this account already exists on this device. Use “Sign in with Passkey” next time, or remove the old passkey from Settings > Security before registering again.'
  }
  if (combined.includes('notallowed') || combined.includes('cancel') || combined.includes('abort')) {
    return 'Passkey setup was cancelled or timed out. You can try again from Settings > Security.'
  }
  if (combined.includes('not supported') || combined.includes('unsupported')) {
    return 'Passkeys are not supported on this browser or device. Please use password login or try Chrome, Edge, Safari, Android, iPhone, or Windows Hello.'
  }
  return message || 'Passkey setup failed. You can try again from Settings > Security.'
}

export async function listMyPasskeys() {
  const data = await callBackend('listMyPasskeys')
  return data?.passkeys || []
}

export async function registerPasskey() {
  try {
    if (!passkeysSupported()) throw new Error('Passkeys are not supported on this browser.')
    const meta = deviceMeta()
    const begin = await callBackend('passkeyBeginRegistration', { origin: meta.origin })
    const response = await startRegistration({ optionsJSON: begin.options })
    return callBackend('passkeyFinishRegistration', { response, ...meta })
  } catch (error) {
    throw new Error(passkeySetupErrorMessage(error))
  }
}

export async function signInWithPasskey() {
  if (!auth) throw new Error('Authentication is not configured.')
  if (!passkeysSupported()) throw new Error('Passkeys are not supported on this browser.')
  const meta = deviceMeta()
  const begin = await callBackend('passkeyBeginAuthentication', { origin: meta.origin }, { authRequired: false })
  const response = await startAuthentication({ optionsJSON: begin.options })
  const finish = await callBackend('passkeyFinishAuthentication', {
    challengeId: begin.challengeId,
    response,
    ...meta,
  }, { authRequired: false })
  if (!finish?.token) throw new Error('Passkey login token was not returned.')
  const credentials = await signInWithCustomToken(auth, finish.token)
  return { credentials, result: finish }
}

export async function renamePasskey(id, deviceName) {
  return callBackend('renameMyPasskey', { id, deviceName })
}

export async function removePasskey(id) {
  return callBackend('removeMyPasskey', { id })
}

export async function adminListPasskeySecurity(search = '') {
  return callBackend('adminListPasskeySecurity', { search }) || { passkeys: [], loginHistory: [], activeSessions: [] }
}

export async function adminUpdatePasskey(id, action) {
  return callBackend('adminUpdatePasskey', { id, action })
}

export async function adminForceLogoutUser(userId) {
  return callBackend('adminForceLogoutUser', { userId })
}

export async function recordLoginHistory({ method, status, userId = '', email = '', workspaceId = '', error = '' }) {
  return callBackend('recordLoginHistory', {
    method,
    status,
    userId,
    email,
    workspaceId,
    error,
    ...deviceMeta(),
  }, { authRequired: Boolean(auth?.currentUser) })
}
