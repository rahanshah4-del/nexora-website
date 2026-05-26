import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

export const SELECTED_WORKSPACE_KEY = 'selectedWorkspace'
export const SELECTED_WORKSPACE_USER_KEY = 'selectedWorkspaceUserId'
const LEGACY_PRODUCT_KEY = 'selectedProduct'
const LEGACY_PRODUCT_USER_KEY = 'selectedProductUserId'

export function isValidWorkspace(workspace) {
  return workspace === 'restaurant-pos' || workspace === 'crm'
}

export function workspaceLabel(workspace) {
  if (workspace === 'restaurant-pos') return 'Nexora Restaurant POS'
  if (workspace === 'crm') return 'Nexora CRM'
  return 'Not selected'
}

export function workspaceRoute(workspace) {
  return workspace === 'restaurant-pos' ? '/app/restaurant-pos' : '/app/dashboard'
}

export function scopedWorkspaceKey(userId) {
  return `selectedWorkspace:${userId}`
}

export function readSelectedWorkspace(userId) {
  if (!userId) return null

  const scoped = localStorage.getItem(scopedWorkspaceKey(userId))
  if (isValidWorkspace(scoped)) return scoped

  const sharedUser = localStorage.getItem(SELECTED_WORKSPACE_USER_KEY)
  const shared = localStorage.getItem(SELECTED_WORKSPACE_KEY)
  if (sharedUser === userId && isValidWorkspace(shared)) return shared

  const legacyUser = localStorage.getItem(LEGACY_PRODUCT_USER_KEY)
  const legacy = localStorage.getItem(LEGACY_PRODUCT_KEY)
  return legacyUser === userId && isValidWorkspace(legacy) ? legacy : null
}

export function saveSelectedWorkspace(userId, workspace) {
  if (!userId || !isValidWorkspace(workspace)) return

  localStorage.setItem(SELECTED_WORKSPACE_KEY, workspace)
  localStorage.setItem(SELECTED_WORKSPACE_USER_KEY, userId)
  localStorage.setItem(scopedWorkspaceKey(userId), workspace)

  // Keep the previous key alive for older dashboard code or open tabs.
  localStorage.setItem(LEGACY_PRODUCT_KEY, workspace)
  localStorage.setItem(LEGACY_PRODUCT_USER_KEY, userId)
}

export function getSessionId(userId) {
  if (!userId) return ''
  const key = `nexoraSessionId:${userId}`
  const existing = sessionStorage.getItem(key)
  if (existing) return existing

  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  sessionStorage.setItem(key, id)
  return id
}

export function getSessionStartTime(userId) {
  if (!userId) return new Date().toISOString()
  const key = `nexoraSessionStartTime:${userId}`
  const existing = sessionStorage.getItem(key)
  if (existing) return existing

  const value = new Date().toISOString()
  sessionStorage.setItem(key, value)
  return value
}

export function formatSessionTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Current session'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function buildWorkspaceSession({ user, userDoc, selectedWorkspace }) {
  const userId = user?.uid ?? ''
  const sessionStartTime = getSessionStartTime(userId)
  const email = user?.email || userDoc?.email || ''
  const planType = userDoc?.plan || 'Free'
  const trialStatus = userDoc?.planStatus || 'trial'

  return {
    userId,
    email,
    clientName: userDoc?.fullName || userDoc?.name || user?.displayName || email?.split('@')?.[0] || 'Nexora Client',
    loginTime: sessionStartTime,
    lastLogin: userDoc?.lastLogin || userDoc?.lastLoginAt || sessionStartTime,
    selectedWorkspace: isValidWorkspace(selectedWorkspace) ? selectedWorkspace : 'not-selected',
    selectedWorkspaceLabel: workspaceLabel(selectedWorkspace),
    sessionId: getSessionId(userId),
    sessionStartTime,
    planType,
    trialStatus,
  }
}

export async function persistWorkspaceSession(session) {
  if (!db || !session?.userId) return

  const uid = session.userId
  const sessionId = session.sessionId || getSessionId(uid)
  const selectedWorkspace = isValidWorkspace(session.selectedWorkspace) ? session.selectedWorkspace : 'not-selected'
  const payload = {
    userId: uid,
    ownerId: uid,
    workspaceId: uid,
    email: session.email || '',
    loginTime: session.loginTime || session.sessionStartTime,
    lastLogin: session.lastLogin || session.loginTime || session.sessionStartTime,
    selectedWorkspace,
    sessionStartTime: session.sessionStartTime,
    planType: session.planType || 'Free',
    trialStatus: session.trialStatus || 'trial',
    updatedAt: serverTimestamp(),
  }

  await Promise.all([
    setDoc(
      doc(db, 'users', uid, 'sessions', sessionId),
      {
        ...payload,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      doc(db, 'workspaces', uid),
      {
        ownerId: uid,
        userId: uid,
        workspaceId: uid,
        selectedWorkspace,
        currentSessionId: sessionId,
        sessionStartTime: session.sessionStartTime,
        planType: payload.planType,
        trialStatus: payload.trialStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      doc(db, 'users', uid),
      {
        selectedWorkspace,
        lastLogin: payload.lastLogin,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ])
}
