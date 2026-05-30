import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { BUSINESS_TRIAL_DAYS, addDays, getRecommendedModules, moduleCatalog, normalizeBusinessType } from '../crm/data/moduleAccess.js'

export const FREE_TRIAL_PLAN = 'Free'
export const FREE_TRIAL_STATUS = 'trial'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function userDisplayName(user, fallback = '') {
  return cleanString(fallback) || cleanString(user?.displayName) || cleanString(user?.email?.split('@')?.[0]) || 'Nexora User'
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
  const selectedFeatures = enabledModules.map(
    (key) => moduleCatalog.find((module) => module.key === key)?.label || key,
  )
  const provider = cleanString(overrides.provider) || user?.providerData?.[0]?.providerId || 'password'

  const userRef = doc(db, 'users', uid)
  const workspaceRef = doc(db, 'workspaces', uid)
  const [userSnap, workspaceSnap] = await Promise.all([getDoc(userRef), getDoc(workspaceRef)])
  const existingUser = userSnap.exists() ? userSnap.data() : null
  const effectiveWorkspaceId = cleanString(existingUser?.workspaceId) || uid
  const effectiveOwnerId = cleanString(existingUser?.ownerId) || effectiveWorkspaceId

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid,
      ownerId: uid,
      userId: uid,
      workspaceId: uid,
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
      emailVerified: Boolean(user.emailVerified),
      role: 'owner',
      isAdmin: false,
      plan: FREE_TRIAL_PLAN,
      planStatus: FREE_TRIAL_STATUS,
      billingCycle: 'monthly',
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
      emailVerified: Boolean(user.emailVerified),
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
      billingCycle: 'monthly',
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
