import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestoreDb as db } from './firebase.js'

const VISITOR_KEY = 'nexoraVisitorId'
const SESSION_KEY = 'nexoraSessionId'
const SESSION_STARTED_KEY = 'nexoraSessionStartedAt'

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function getVisitorId() {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = randomId('visitor')
    window.localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

export function getSessionId() {
  if (typeof window === 'undefined') return ''
  let id = window.sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = randomId('session')
    window.sessionStorage.setItem(SESSION_KEY, id)
    window.sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()))
  }
  return id
}

export function getSessionDurationMs() {
  if (typeof window === 'undefined') return 0
  return Math.max(0, Date.now() - Number(window.sessionStorage.getItem(SESSION_STARTED_KEY) || Date.now()))
}

function deviceType() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  return 'desktop'
}

function browserName() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  if (/firefox/i.test(ua)) return 'Firefox'
  return 'unknown'
}

function osName() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os|macintosh/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'unknown'
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value || ''
}

function currentPagePath() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`
}

export async function trackAnalyticsEvent(eventType, data = {}) {
  if (!db || !eventType) return
  const visitorId = getVisitorId()
  const sessionId = getSessionId()
  const payload = {
    eventType,
    page: data.page || currentPagePath(),
    buttonLabel: clean(data.buttonLabel),
    moduleName: clean(data.moduleName),
    userId: clean(data.userId || data.uid),
    email: clean(data.email),
    phone: clean(data.phone),
    workspaceId: clean(data.workspaceId),
    businessType: clean(data.businessType),
    status: clean(data.status),
    sessionId,
    visitorId,
    referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    deviceType: deviceType(),
    browser: browserName(),
    os: osName(),
    country: clean(data.country),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
    sessionDurationMs: getSessionDurationMs(),
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  }

  let eventSaved = false
  try {
    await addDoc(collection(db, 'analyticsEvents'), payload)
    eventSaved = true
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[Nexora Analytics] event not saved', error)
  }

  try {
    await setDoc(
      doc(db, 'userSessions', sessionId),
      {
        sessionId,
        visitorId,
        userId: payload.userId,
        email: payload.email,
        phone: payload.phone,
        workspaceId: payload.workspaceId,
        businessType: payload.businessType,
        deviceType: payload.deviceType,
        browser: payload.browser,
        os: payload.os,
        userAgent: payload.userAgent,
        startedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        lastEventType: eventType,
        sessionDurationMs: payload.sessionDurationMs,
      },
      { merge: true },
    )
  } catch (error) {
    if (import.meta.env.DEV && eventSaved) console.warn('[Nexora Analytics] session not saved', error)
  }
}

export async function getUserAnalyticsContext(user) {
  if (!db || !user?.uid) return { userId: user?.uid || '', email: user?.email || '' }
  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const data = snap.exists() ? snap.data() : {}
    return {
      userId: user.uid,
      email: user.email || data.email || '',
      phone: data.phone || '',
      workspaceId: data.workspaceId || data.currentWorkspaceId || '',
      businessType: data.currentBusinessType || data.selectedBusinessType || data.businessType || '',
      country: data.country || '',
    }
  } catch {
    return { userId: user.uid, email: user.email || '' }
  }
}
