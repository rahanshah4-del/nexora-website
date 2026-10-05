/**
 * Pure workspace access rules (no Firebase): what the client app uses to decide
 * trial / paid / expired / blocked, shared with the admin Control Centre so the
 * admin's numbers always match what clients actually experience.
 */
import { accessPlanForUser, daysUntil, isTrialActive, isTrialExpired, trialEndDate } from '../data/moduleAccess.js'

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

function hasField(source = {}, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

function subscriptionExpiryState(source = {}) {
  const subscriptionExpiresAt = toDate(source.subscriptionExpiresAt)
  const nextBillingDate = toDate(source.nextBillingDate)
  const expiresAt = toDate(source.expiresAt)
  const hasExpiresAt = hasField(source, 'expiresAt') && source.expiresAt !== null && source.expiresAt !== undefined
  const expiresAtConflict = hasExpiresAt && (
    !expiresAt ||
    !subscriptionExpiresAt ||
    expiresAt.getTime() !== subscriptionExpiresAt.getTime()
  )

  return {
    subscriptionExpiresAt,
    nextBillingDate,
    expiresAt,
    hasExpiresAt,
    expiresAtConflict,
    missingRequired: !subscriptionExpiresAt || !nextBillingDate,
  }
}

function subscriptionExpiryFuture(source = {}) {
  const expiry = subscriptionExpiryState(source)
  const now = Date.now()
  if (expiry.missingRequired || expiry.expiresAtConflict) return false
  return expiry.subscriptionExpiresAt.getTime() >= now
    && expiry.nextBillingDate.getTime() >= now
    && (!expiry.hasExpiresAt || expiry.expiresAt.getTime() >= now)
}

function subscriptionExpiryExpiredOrInvalid(source = {}) {
  const expiry = subscriptionExpiryState(source)
  const now = Date.now()
  if (expiry.missingRequired || expiry.expiresAtConflict) return true
  return expiry.subscriptionExpiresAt.getTime() < now
    || expiry.nextBillingDate.getTime() < now
    || (expiry.hasExpiresAt && expiry.expiresAt.getTime() < now)
}

export function workspaceBlockedForAccess(source = {}) {
  return BLOCKED_WORKSPACE_STATUSES.includes(cleanStatus(source.status))
    || cleanStatus(source.accountStatus) === 'blocked'
}

export function workspacePaidSubscriptionActive(source = {}) {
  if (workspaceBlockedForAccess(source)) return false
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus(source))) return false
  return subscriptionExpiryFuture(source)
}

export function workspaceSubscriptionExpired(source = {}) {
  if (workspaceBlockedForAccess(source)) return false
  const status = subscriptionStatus(source)
  if (EXPIRED_SUBSCRIPTION_STATUSES.includes(status)) return true
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(status)) return false
  return subscriptionExpiryExpiredOrInvalid(source)
}

export function workspaceHasActiveSubscription(source = {}) {
  return !workspaceBlockedForAccess(source) && (isTrialActive(source) || workspacePaidSubscriptionActive(source))
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
