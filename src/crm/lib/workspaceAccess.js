import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS_TRIAL_DAYS, addDays } from '../data/moduleAccess.js'
import { TRIAL_PLAN, TRIAL_STATUS, cleanWorkspaceString } from './workspaceAccessRules.js'

export * from './workspaceAccessRules.js'


export function workspaceAccessFields(startDate = new Date()) {
  return {
    plan: TRIAL_PLAN,
    planStatus: TRIAL_STATUS,
    subscriptionStatus: TRIAL_STATUS,
    status: 'active',
    trialDays: BUSINESS_TRIAL_DAYS,
    trialStartAt: serverTimestamp(),
    trialStartedAt: serverTimestamp(),
    trialEndsAt: addDays(startDate, BUSINESS_TRIAL_DAYS),
    isTrialActive: true,
  }
}

export function activeWorkspaceIdForUser(user, userDoc) {
  return cleanWorkspaceString(userDoc?.workspaceId) || cleanWorkspaceString(user?.uid) || ''
}

export async function getWorkspaceDoc(workspaceId) {
  if (!db || !workspaceId) return null
  const snap = await getDoc(doc(db, 'workspaces', workspaceId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function ensureWorkspaceAccessFields(workspaceId, ownerId) {
  if (!db || !workspaceId || !ownerId) return null
  const ref = doc(db, 'workspaces', workspaceId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  const patch = {}
  if (!cleanWorkspaceString(data.workspaceId)) patch.workspaceId = workspaceId
  if (!cleanWorkspaceString(data.ownerId)) patch.ownerId = ownerId
  if (!cleanWorkspaceString(data.userId)) patch.userId = workspaceId
  if (!cleanWorkspaceString(data.plan)) patch.plan = TRIAL_PLAN
  if (!cleanWorkspaceString(data.planStatus)) patch.planStatus = TRIAL_STATUS
  if (!cleanWorkspaceString(data.subscriptionStatus)) patch.subscriptionStatus = cleanWorkspaceString(data.planStatus) || TRIAL_STATUS
  if (!cleanWorkspaceString(data.status)) patch.status = 'active'
  if (!data.trialDays) patch.trialDays = BUSINESS_TRIAL_DAYS
  if (!data.trialStartAt && !data.trialStartedAt) patch.trialStartAt = serverTimestamp()
  if (!data.trialStartedAt && !data.trialStartAt) patch.trialStartedAt = serverTimestamp()
  if (!data.trialEndsAt) patch.trialEndsAt = addDays(data.trialStartAt || data.trialStartedAt || data.createdAt || new Date(), BUSINESS_TRIAL_DAYS)
  if (Object.keys(patch).length) {
    await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true })
  }
  return { id: workspaceId, ...data, ...patch }
}

