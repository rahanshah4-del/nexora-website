import { httpsCallable } from 'firebase/functions'
import { app, functions } from './firebase.js'

// Web Push certificate (public key): Firebase Console > Project settings > Cloud Messaging.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
const SW_URL = '/firebase-messaging-sw.js'
const TOKEN_KEY = 'nexora.push.token'
const DISMISS_KEY = 'nexora.push.dismissedAt'
const DISMISS_DAYS = 14

function read(key) {
  try { return window.localStorage.getItem(key) || '' } catch { return '' }
}
function write(key, value) {
  try { if (value) window.localStorage.setItem(key, value); else window.localStorage.removeItem(key) } catch { /* private mode */ }
}

export const pushConfigured = Boolean(VAPID_KEY && app && functions)

/** True when this browser can do web push (iPhone Safari needs the site added to the Home Screen first). */
export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function pushPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export function isPushDismissed() {
  const at = Number(read(DISMISS_KEY))
  return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86400000
}

export function dismissPushPrompt() {
  write(DISMISS_KEY, String(Date.now()))
}

export function hasStoredPushToken() {
  return Boolean(read(TOKEN_KEY))
}

function deviceInfo() {
  const ua = navigator.userAgent || ''
  const browser = /edg\//i.test(ua) ? 'edge' : /chrome|crios/i.test(ua) ? 'chrome' : /firefox|fxios/i.test(ua) ? 'firefox' : /safari/i.test(ua) ? 'safari' : 'other'
  const platform = /android/i.test(ua) ? 'android' : /iphone|ipad/i.test(ua) ? 'ios' : /windows/i.test(ua) ? 'windows' : /mac/i.test(ua) ? 'mac' : /linux/i.test(ua) ? 'linux' : 'other'
  return { browser, platform }
}

async function messagingFor() {
  const module = await import('firebase/messaging')
  if (!(await module.isSupported())) return null
  return { messaging: module.getMessaging(app), getToken: module.getToken, deleteToken: module.deleteToken }
}

/** Ask permission (must be called from a click), get this device's token and register it. */
export async function enablePush() {
  if (!pushConfigured) throw new Error('Alerts are not set up yet.')
  if (!pushSupported()) throw new Error('This browser does not support alerts.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Alerts are blocked in your browser settings.' : 'Alerts were not turned on.')
  const api = await messagingFor()
  if (!api) throw new Error('This browser does not support alerts.')
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/firebase-cloud-messaging-push-scope' })
  await navigator.serviceWorker.ready
  const token = await api.getToken(api.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Could not get a device token. Try again.')
  await httpsCallable(functions, 'registerPushToken')({ token, ...deviceInfo() })
  write(TOKEN_KEY, token)
  write(DISMISS_KEY, '')
  return token
}

/** Turn alerts off for this device. */
export async function disablePush() {
  const token = read(TOKEN_KEY)
  if (token && functions) await httpsCallable(functions, 'unregisterPushToken')({ token }).catch(() => {})
  try {
    const api = await messagingFor()
    if (api) await api.deleteToken(api.messaging)
  } catch { /* already gone */ }
  write(TOKEN_KEY, '')
}

/**
 * Quietly keep the server's record fresh for a device that already allowed alerts
 * (tokens rotate). Never prompts.
 */
export async function refreshPushRegistration() {
  if (!pushConfigured || !pushSupported() || Notification.permission !== 'granted') return
  const api = await messagingFor()
  if (!api) return
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/firebase-cloud-messaging-push-scope' })
  const token = await api.getToken(api.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (token) {
    await httpsCallable(functions, 'registerPushToken')({ token, ...deviceInfo() })
    write(TOKEN_KEY, token)
  }
}
