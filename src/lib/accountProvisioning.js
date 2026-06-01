import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS_TRIAL_DAYS, addDays, getRecommendedModules, labelForBusinessModule, normalizeBusinessType } from '../crm/data/moduleAccess.js'

export const FREE_TRIAL_PLAN = 'Basic'
export const FREE_TRIAL_STATUS = 'trial'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function userDisplayName(user, fallback = '') {
  return cleanString(fallback) || cleanString(user?.displayName) || cleanString(user?.email?.split('@')?.[0]) || 'Nexora User'
}

function isPasswordOnlyUser(user, provider) {
  const providers = Array.isArray(user?.providerData) ? user.providerData.map((item) => item?.providerId).filter(Boolean) : []
  return provider === 'password' || providers.includes('password')
}

export async function ensureUserWorkspace(user, overrides = {}) {
  if (!db || !user?.uid) return null

  const uid = user.uid
  const now = serverTimestamp()
  const trialEndsAt = addDays(new Date(), BUSINESS_TRIAL_DAYS)
  const email = (cleanString(overrides.email) || cleanString(user.email)).toLowerCase()
  const fullName = userDisplayName(user, overrides.fullName || overrides.name)
  const company = cleanString(overrides.company)
  const businessType = normalizeBusinessType(overrides.businessType)
  const enabledModules = getRecommendedModules(businessType)
  const selectedFeatures = enabledModules.map((key) => labelForBusinessModule(key, businessType))
  const provider = cleanString(overrides.provider) || user?.providerData?.[0]?.providerId || 'password'
  const emailVerified = Boolean(user.emailVerified)
  const allowUnverifiedProfile = overrides.allowUnverifiedProfile === true
  const canCreateWorkspace = emailVerified || !isPasswordOnlyUser(user, provider)

  const userRef = doc(db, 'users', uid)
  const workspaceRef = doc(db, 'workspaces', uid)
  const [userSnap, workspaceSnap] = await Promise.all([getDoc(userRef), getDoc(workspaceRef)])
  const existingUser = userSnap.exists() ? userSnap.data() : null
  const existingWorkspaceId = cleanString(existingUser?.workspaceId)
  const effectiveWorkspaceId = existingWorkspaceId || (canCreateWorkspace ? uid : '')
  const effectiveOwnerId = cleanString(existingUser?.ownerId) || effectiveWorkspaceId

  if (!userSnap.exists()) {
    if (!canCreateWorkspace && !allowUnverifiedProfile) {
      return null
    }
    await setDoc(userRef, {
      uid,
      ownerId: canCreateWorkspace ? uid : '',
      userId: uid,
      workspaceId: canCreateWorkspace ? uid : '',
      fullName,
      name: fullName,
      company,
      email,
      phone: cleanString(overrides.phone),
      businessType,
      selectedFeatures,
      enabledModules,
      onboardingCompleted: false,
      workspaceName: company || `${fullName}'s Workspace`,
      photoURL: cleanString(overrides.photoURL) || cleanString(user.photoURL),
      provider,
      emailVerified,
      role: 'owner',
      status: 'active',
      isAdmin: false,
      plan: FREE_TRIAL_PLAN,
      planStatus: FREE_TRIAL_STATUS,
      subscriptionStatus: FREE_TRIAL_STATUS,
      trialDays: BUSINESS_TRIAL_DAYS,
      billingCycle: 'monthly',
      trialStartAt: now,
      trialStartedAt: now,
      trialEndsAt,
      isTrialActive: true,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      lastLoginAt: now,
    })
  } else {
    const update = {
      uid,
      ownerId: effectiveOwnerId,
      userId: uid,
      workspaceId: effectiveWorkspaceId,
      email,
      emailVerified,
      photoURL: cleanString(overrides.photoURL) || cleanString(user.photoURL),
      provider,
      updatedAt: now,
      lastLoginAt: now,
    }
    if (fullName) {
      update.fullName = fullName
      update.name = fullName
    }
    if (company) update.company = company
    if (cleanString(overrides.phone)) update.phone = cleanString(overrides.phone)
    if (cleanString(overrides.businessType)) {
      update.businessType = businessType
      update.selectedFeatures = selectedFeatures
      update.enabledModules = enabledModules
    }
    await setDoc(userRef, update, { merge: true })
  }

  if (!canCreateWorkspace) {
    return { uid, workspaceId: effectiveWorkspaceId || '' }
  }

  if (effectiveWorkspaceId !== uid) {
    return { uid, workspaceId: effectiveWorkspaceId }
  }

  if (!workspaceSnap.exists()) {
    await setDoc(workspaceRef, {
      ownerId: uid,
      userId: uid,
      workspaceId: uid,
      name: company || `${fullName}'s Workspace`,
      workspaceName: company || `${fullName}'s Workspace`,
      email,
      businessType,
      selectedFeatures,
      enabledModules,
      onboardingCompleted: false,
      plan: FREE_TRIAL_PLAN,
      planStatus: FREE_TRIAL_STATUS,
      subscriptionStatus: FREE_TRIAL_STATUS,
      status: 'active',
      billingCycle: 'monthly',
      trialStartAt: now,
      trialDays: BUSINESS_TRIAL_DAYS,
      trialStartedAt: now,
      trialEndsAt,
      isTrialActive: true,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      lastAccessedAt: now,
    })
  } else {
    await setDoc(
      workspaceRef,
      {
        ownerId: uid,
        userId: uid,
        workspaceId: uid,
        email,
        updatedAt: now,
        lastAccessedAt: now,
      },
      { merge: true },
    )
  }

  return { uid, workspaceId: effectiveWorkspaceId }
}
