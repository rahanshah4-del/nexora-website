import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS_TRIAL_DAYS, addDays, accessPlanForUser, daysUntil, isTrialActive, isTrialExpired, trialEndDate } from '../data/moduleAccess.js'

export const TRIAL_PLAN = 'Basic'
export const TRIAL_STATUS = 'trial'
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'paid', 'approved', 'current']
const EXPIRED_SUBSCRIPTION_STATUSES = ['expired', 'subscription expired', 'past due', 'cancelled', 'canceled']
const BLOCKED_WORKSPACE_STATUSES = ['blocked', 'inactive']

export function cleanWorkspaceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanStatus(value) {
  return cleanWorkspaceString(value).toLowerCase()
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function subscriptionStatus(source = {}) {
  return cleanStatus(source.subscriptionStatus || source.planStatus)
}

function subscriptionExpiryDates(source = {}) {
  return [source.subscriptionExpiresAt, source.expiresAt, source.nextBillingDate].map(toDate).filter(Boolean)
}

export function workspaceBlockedForAccess(source = {}) {
  return BLOCKED_WORKSPACE_STATUSES.includes(cleanStatus(source.status))
    || cleanStatus(source.accountStatus) === 'blocked'
}

export function workspacePaidSubscriptionActive(source = {}) {
  if (workspaceBlockedForAccess(source)) return false
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus(source))) return false
  return subscriptionExpiryDates(source).every((date) => date.getTime() >= Date.now())
}

export function workspaceSubscriptionExpired(source = {}) {
  if (workspaceBlockedForAccess(source)) return false
  const status = subscriptionStatus(source)
  if (EXPIRED_SUBSCRIPTION_STATUSES.includes(status)) return true
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(status)) return false
  return subscriptionExpiryDates(source).some((date) => date.getTime() < Date.now())
}

export function workspaceHasActiveSubscription(source = {}) {
  return !workspaceBlockedForAccess(source) && (isTrialActive(source) || workspacePaidSubscriptionActive(source))
}

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

export function workspaceAccessState(workspaceDoc = {}, fallbackUserDoc = {}, fallbackPlan = 'Free') {
  const source = { ...(fallbackUserDoc || {}), ...(workspaceDoc || {}) }
  const trialEndsAt = trialEndDate(source)
  const trialActive = isTrialActive(source)
  const trialExpired = isTrialExpired(source)
  const subscriptionExpired = workspaceSubscriptionExpired(source)
  const workspaceBlocked = workspaceBlockedForAccess(source)
  const hasActiveWorkspaceSubscription = workspaceHasActiveSubscription(source)
  const workspaceExpired = !workspaceBlocked
    && !hasActiveWorkspaceSubscription
    && (trialExpired || subscriptionExpired || source.onboardingCompleted === true)
  const plan = source.plan || fallbackPlan
  const accessPlan = hasActiveWorkspaceSubscription && !trialExpired ? accessPlanForUser(source, plan) : 'Free'
  const subscriptionStatus = source.subscriptionStatus || source.planStatus || (trialActive ? TRIAL_STATUS : '')

  return {
    source,
    plan,
    accessPlan,
    subscriptionStatus,
    isTrialActive: trialActive,
    isTrialExpired: trialExpired,
    isSubscriptionExpired: subscriptionExpired,
    isWorkspaceBlocked: workspaceBlocked,
    isWorkspaceExpired: workspaceExpired,
    hasActiveWorkspaceSubscription,
    trialEndsAt,
    trialDaysRemaining: trialActive ? daysUntil(trialEndsAt) : 0,
  }
}
