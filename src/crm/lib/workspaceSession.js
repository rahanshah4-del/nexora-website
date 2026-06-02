import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { accessPlanForUser, businessWorkspaceCatalog, businessWorkspaceForId, businessWorkspaceForSelection, businessWorkspaceForType } from '../data/moduleAccess.js'

export const SELECTED_WORKSPACE_KEY = 'selectedWorkspace'
export const SELECTED_WORKSPACE_USER_KEY = 'selectedWorkspaceUserId'
const LEGACY_PRODUCT_KEY = 'selectedProduct'
const LEGACY_PRODUCT_USER_KEY = 'selectedProductUserId'

export function isValidWorkspace(workspace) {
  return workspace === 'crm' || Boolean(businessWorkspaceForId(workspace))
}

export function workspaceLabel(workspace) {
  if (workspace === 'crm') return 'General CRM'
  const business = businessWorkspaceForId(workspace)
  if (business) return business.title
  return 'Not selected'
}

export function workspaceRoute(workspace) {
  return businessWorkspaceForSelection(workspace)?.route || '/app/dashboard'
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
  if (sharedUser === userId && shared === 'restaurant-pos') return 'restaurant-pos'

  const legacyUser = localStorage.getItem(LEGACY_PRODUCT_USER_KEY)
  const legacy = localStorage.getItem(LEGACY_PRODUCT_KEY)
  if (legacyUser === userId && legacy === 'restaurant-pos') return 'restaurant-pos'
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

  window.dispatchEvent(new CustomEvent('nexora:selectedWorkspaceChanged', { detail: { userId, workspace } }))
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

export function buildWorkspaceSession({ user, userDoc, selectedWorkspace, workspaceId: explicitWorkspaceId }) {
  const userId = user?.uid ?? ''
  const sessionStartTime = getSessionStartTime(userId)
  const email = user?.email || userDoc?.email || ''
  const planType = accessPlanForUser(userDoc || {}, userDoc?.plan || 'Free')
  const trialStatus = userDoc?.planStatus || 'trial'
  const workspaceId = explicitWorkspaceId || userDoc?.workspaceId || userId
  const ownerId = userDoc?.ownerId || workspaceId

  return {
    userId,
    ownerId,
    workspaceId,
    email,
    clientName: userDoc?.fullName || userDoc?.name || user?.displayName || email?.split('@')?.[0] || 'Nexora Client',
    loginTime: sessionStartTime,
    lastLogin: userDoc?.lastLogin || userDoc?.lastLoginAt || sessionStartTime,
    selectedWorkspace: isValidWorkspace(selectedWorkspace) ? selectedWorkspace : businessWorkspaceForType(userDoc?.businessType).id,
    selectedWorkspaceLabel: workspaceLabel(isValidWorkspace(selectedWorkspace) ? selectedWorkspace : businessWorkspaceForType(userDoc?.businessType).id),
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
  const selectedWorkspace = isValidWorkspace(session.selectedWorkspace) ? session.selectedWorkspace : businessWorkspaceCatalog[0].id
  const businessType = businessWorkspaceForSelection(selectedWorkspace)?.type || businessWorkspaceCatalog[0].type
  const workspaceId = session.workspaceId || uid
  const ownerId = session.ownerId || workspaceId
  const payload = {
    userId: uid,
    ownerId,
    workspaceId,
    email: session.email || '',
    loginTime: session.loginTime || session.sessionStartTime,
    lastLogin: session.lastLogin || session.loginTime || session.sessionStartTime,
    selectedWorkspace,
    businessType,
    selectedBusinessType: businessType,
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
        createdBy: uid,
      },
      { merge: true },
    ),
    setDoc(
      doc(db, 'workspaces', workspaceId),
      {
        ownerId,
        userId: workspaceId,
        workspaceId,
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
