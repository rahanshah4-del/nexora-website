import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import {
  BUSINESS_TRIAL_DAYS,
  addDays,
  businessWorkspaceForType,
  getRecommendedModules,
  labelForBusinessModule,
  normalizeBusinessType,
} from '../crm/data/moduleAccess.js'

export const FREE_TRIAL_PLAN = 'Basic'
export const FREE_TRIAL_STATUS = 'trial'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function removeUndefinedFields(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null))
}

function normalizePhone(raw) {
  if (!raw) return ''
  let cleaned = raw.replace(/[\s().-]/g, '')
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }
  if (!cleaned.startsWith('+') && !cleaned.startsWith('0')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

function userDisplayName(user, fallback = '') {
  return cleanString(fallback) || cleanString(user?.displayName) || cleanString(user?.email?.split('@')?.[0]) || 'Nexora User'
}

function explicitProfileName(user, overrides = {}) {
  return cleanString(overrides.fullName) || cleanString(overrides.name) || cleanString(user?.displayName)
}

function isPasswordOnlyUser(user, provider) {
  const providers = Array.isArray(user?.providerData) ? user.providerData.map((item) => item?.providerId).filter(Boolean) : []
  return provider === 'password' || providers.includes('password')
}

export function isStaffWorkspaceProfile(profile, uid = '') {
  if (!profile || typeof profile !== 'object') return false
  const role = cleanString(profile.role).toLowerCase()
  const workspaceId = cleanString(profile.workspaceId)
  const ownerId = cleanString(profile.ownerId || profile.companyId || profile.createdBy)
  const staffId = cleanString(profile.staffId || profile.uid || profile.userId)
  const currentUid = cleanString(uid)
  if (!workspaceId || role === 'owner') return false
  if (profile.isStaff === true) return workspaceId !== currentUid || (Boolean(ownerId) && ownerId !== currentUid)
  return [
    'admin',
    'accountant',
    'manager',
    'cashier',
    'sales',
    'sales_staff',
    'support',
    'support_staff',
    'data_entry',
    'viewer',
    'staff',
  ].includes(role) && workspaceId !== currentUid && Boolean(staffId)
}

export async function createSignupUserProfile(user, overrides = {}) {
  if (!db || !user?.uid) {
    const error = new Error(!db ? 'Firestore is not initialized.' : 'Firebase Auth user is missing uid.')
    console.error('[Signup Provisioning] fail', {
      code: !db ? 'missing-db' : 'missing-uid',
      message: error.message,
    })
    throw error
  }

  const userRef = doc(db, 'users', user.uid)
  const now = serverTimestamp()
  const fullName = userDisplayName(user, overrides.fullName || overrides.name)
  const email = (cleanString(overrides.email) || cleanString(user.email)).toLowerCase()
  const phoneRaw = cleanString(overrides.phone)
  const phoneNormalized = cleanString(overrides.phoneNormalized) || normalizePhone(phoneRaw)
  console.log('[User Profile] fullName', fullName)
  console.log('[User Profile] displayName', fullName)
  console.log('[User Profile] profile source', cleanString(overrides.fullName) ? 'signup.fullName' : cleanString(user?.displayName) ? 'firebase.displayName' : 'email_prefix')
  const payload = removeUndefinedFields({
    uid: user.uid,
    email,
    fullName,
    displayName: fullName,
    name: fullName,
    company: cleanString(overrides.company),
    phone: phoneRaw,
    phoneNormalized,
    provider: cleanString(overrides.provider) || user?.providerData?.[0]?.providerId || 'password',
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
    role: 'owner',
    status: 'active',
    emailVerifiedCustom: false,
    userId: user.uid,
    ownerId: user.uid,
    workspaceId: user.uid,
    plan: FREE_TRIAL_PLAN,
    planStatus: FREE_TRIAL_STATUS,
    subscriptionStatus: FREE_TRIAL_STATUS,
    trialDays: BUSINESS_TRIAL_DAYS,
    isAdmin: false,
    onboardingCompleted: false,
    allowedBusinessTypes: [],
    enabledModules: [],
    selectedFeatures: [],
    specialModuleAccess: false,
    allModulesAccess: false,
  })

  console.log('[Onboarding] default module source', {
    source: 'signup-profile',
    businessType: null,
    selectedBusinessType: null,
    onboardingCompleted: false,
  })

  console.log('[Signup Provisioning] start', { path: `users/${user.uid}`, uid: user.uid })
  console.log('[Signup Provisioning] payload', payload)

  try {
    await setDoc(userRef, payload, { merge: true })
    const snap = await getDoc(userRef)
    if (!snap.exists()) {
      throw new Error('Signup profile was not created')
    }

    // Register phone number to prevent duplicates — best-effort, do not block signup
    if (phoneNormalized) {
      try {
        await setDoc(doc(db, 'phoneRegistry', phoneNormalized), {
          userId: user.uid,
          phoneNormalized,
          createdAt: now,
        })
        console.log('[Phone Registry] created', { phoneNormalized, userId: user.uid })
      } catch (registryError) {
        console.warn('[Phone Registry] write failed (non-blocking)', {
          phoneNormalized,
          userId: user.uid,
          code: registryError?.code || '',
          message: registryError?.message || '',
        })
      }
    }

    console.log('[Signup] user profile created')
    console.log('[Signup Provisioning] success', { path: `users/${user.uid}`, exists: snap.exists() })
    return { id: snap.id, ...snap.data() }
  } catch (error) {
    console.error("[Signup Provisioning] fail", {
      code: error?.code,
      message: error?.message,
      payload,
      uid: user?.uid,
      email: user?.email,
    })
    throw error
  }
}

// In-flight de-duplication: AuthProvider, Login, VerifyEmail, and the CRM
// AuthContext can each request provisioning for the same uid at nearly the same
// moment. Without a guard those concurrent writers race on workspaces/{uid},
// which is the root cause of "workspace creation sometimes fails". Returning the
// same in-flight promise for a uid serializes them into a single write.
const inFlightWorkspaceEnsures = new Map()

export function ensureUserWorkspace(user, overrides = {}) {
  if (!db || !user?.uid) return Promise.resolve(null)

  const uid = user.uid
  const existing = inFlightWorkspaceEnsures.get(uid)
  if (existing) {
    console.log('[Workspace Bootstrap] reused in-flight ensure', { uid })
    return existing
  }

  const promise = ensureUserWorkspaceInternal(user, overrides).finally(() => {
    inFlightWorkspaceEnsures.delete(uid)
  })
  inFlightWorkspaceEnsures.set(uid, promise)
  return promise
}

async function ensureUserWorkspaceInternal(user, overrides = {}) {
  if (!db || !user?.uid) return null

  const uid = user.uid
  const now = serverTimestamp()
  const trialEndsAt = addDays(new Date(), BUSINESS_TRIAL_DAYS)
  const email = (cleanString(overrides.email) || cleanString(user.email)).toLowerCase()
  const phoneRaw = cleanString(overrides.phone)
  const phoneNormalized = cleanString(overrides.phoneNormalized) || normalizePhone(phoneRaw)
  const fullName = userDisplayName(user, overrides.fullName || overrides.name)
  const explicitName = explicitProfileName(user, overrides)
  console.log('[User Profile] fullName', explicitName || fullName)
  console.log('[User Profile] displayName', explicitName || fullName)
  console.log('[User Profile] profile source', explicitName ? 'explicit_full_name' : cleanString(user?.displayName) ? 'firebase.displayName' : 'email_prefix')
  const company = cleanString(overrides.company)
  const hasBusinessSelection = Boolean(cleanString(overrides.businessType))
  const businessType = hasBusinessSelection ? normalizeBusinessType(overrides.businessType) : ''
  const enabledModules = hasBusinessSelection ? getRecommendedModules(businessType) : []
  const selectedFeatures = hasBusinessSelection ? enabledModules.map((key) => labelForBusinessModule(key, businessType)) : []
  const provider = cleanString(overrides.provider) || user?.providerData?.[0]?.providerId || 'password'
  const allowUnverifiedProfile = overrides.allowUnverifiedProfile === true

  const userRef = doc(db, 'users', uid)
  const workspaceRef = doc(db, 'workspaces', uid)
  const [userSnap, workspaceSnap] = await Promise.all([getDoc(userRef), getDoc(workspaceRef)])
  const existingUser = userSnap.exists() ? userSnap.data() : null
  const emailVerified = Boolean(user.emailVerified || existingUser?.emailVerifiedCustom === true)
  const canCreateWorkspace = emailVerified || !isPasswordOnlyUser(user, provider)
  console.log("[Workspace Bootstrap]", {
    firebaseEmailVerified: user.emailVerified,
    customEmailVerified: existingUser?.emailVerifiedCustom,
    canCreateWorkspace,
  })
  const existingWorkspaceId = cleanString(existingUser?.workspaceId)
  const effectiveWorkspaceId = existingWorkspaceId || (canCreateWorkspace ? uid : '')
  const effectiveOwnerId = cleanString(existingUser?.ownerId) || effectiveWorkspaceId
  const existingWorkspace = workspaceSnap.exists() ? workspaceSnap.data() : null
  const onboardingCompleted = existingUser?.onboardingCompleted === true || existingWorkspace?.onboardingCompleted === true

  if (isStaffWorkspaceProfile(existingUser, uid)) {
    await setDoc(
      userRef,
      {
        uid,
        userId: uid,
        staffId: cleanString(existingUser.staffId) || uid,
        workspaceId: existingWorkspaceId,
        ownerId: effectiveOwnerId || existingWorkspaceId,
        email,
        emailVerifiedCustom: true,
        onboardingCompleted: true,
        provider,
        updatedAt: now,
        lastLoginAt: now,
      },
      { merge: true },
    )
    return { uid, workspaceId: existingWorkspaceId, onboardingCompleted: true, staff: true }
  }

  console.log('[Onboarding] default module source', {
    source: 'ensureUserWorkspace',
    hasBusinessSelection,
    businessType: hasBusinessSelection ? businessType : null,
    selectedWorkspace: hasBusinessSelection ? businessWorkspaceForType(businessType).id : null,
    onboardingCompleted,
  })

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
      displayName: fullName,
      name: fullName,
      company,
      email,
      phone: phoneRaw,
      phoneNormalized,
      ...(hasBusinessSelection
        ? {
            businessType,
            selectedBusinessType: businessType,
            currentBusinessType: businessType,
            selectedWorkspace: businessWorkspaceForType(businessType).id,
            selectedFeatures,
            enabledModules,
            plan: FREE_TRIAL_PLAN,
            planStatus: FREE_TRIAL_STATUS,
            subscriptionStatus: FREE_TRIAL_STATUS,
            trialDays: BUSINESS_TRIAL_DAYS,
            billingCycle: 'monthly',
            trialStartAt: now,
            trialStartedAt: now,
            trialEndsAt,
            trialBusinessType: businessType,
            isTrialActive: true,
          }
        : {}),
      onboardingCompleted: false,
      workspaceName: company || `${fullName}'s Workspace`,
      photoURL: cleanString(overrides.photoURL) || cleanString(user.photoURL),
      provider,
      emailVerified,
      role: 'owner',
      status: 'active',
      isAdmin: false,
      createdAt: existingUser?.createdAt || now,
      createdBy: uid,
      updatedAt: now,
      lastLoginAt: now,
    })
      if (phoneNormalized) {
        try {
          await setDoc(doc(db, 'phoneRegistry', phoneNormalized), {
            userId: uid,
            phoneNormalized,
            createdAt: now,
          })
          console.log('[Phone Registry] created', { phoneNormalized, userId: uid })
        } catch (registryError) {
          console.warn('[Phone Registry] write failed (non-blocking)', {
            phoneNormalized,
            userId: uid,
            code: registryError?.code || '',
            message: registryError?.message || '',
          })
        }
      }
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
    if (explicitName) {
      update.fullName = explicitName
      update.displayName = explicitName
      update.name = explicitName
    }
    if (company) update.company = company
    if (phoneRaw) update.phone = phoneRaw
    if (phoneNormalized) update.phoneNormalized = phoneNormalized
    if (cleanString(overrides.businessType)) {
      update.businessType = businessType
      update.selectedFeatures = selectedFeatures
      update.enabledModules = enabledModules
    }
    await setDoc(userRef, update, { merge: true })
    if (phoneNormalized) {
      try {
        const phoneRegRef = doc(db, 'phoneRegistry', phoneNormalized)
        const phoneRegSnap = await getDoc(phoneRegRef)
        if (!phoneRegSnap.exists()) {
          await setDoc(phoneRegRef, {
            userId: uid,
            phoneNormalized,
            createdAt: now,
          })
          console.log('[Phone Registry] created (existing user)', { phoneNormalized, userId: uid })
        }
      } catch (registryError) {
        console.warn('[Phone Registry] write failed (non-blocking)', {
          phoneNormalized,
          userId: uid,
          code: registryError?.code || '',
          message: registryError?.message || '',
        })
      }
    }
  }

  if (!canCreateWorkspace) {
    return { uid, workspaceId: effectiveWorkspaceId || '', onboardingCompleted }
  }

  if (effectiveWorkspaceId !== uid) {
    return { uid, workspaceId: effectiveWorkspaceId, onboardingCompleted }
  }

  console.log('[Workspace Bootstrap] workspace exists', { workspaceId: uid, exists: workspaceSnap.exists() })

  if (!workspaceSnap.exists()) {
    const workspaceCreatePayload = {
      ownerId: uid,
      userId: uid,
      workspaceId: uid,
      name: company || `${fullName}'s Workspace`,
      workspaceName: company || `${fullName}'s Workspace`,
      email,
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
      specialModuleAccess: false,
      allModulesAccess: false,
      primaryBusinessType: '',
      ...(hasBusinessSelection
        ? {
            businessType,
            selectedBusinessType: businessType,
            currentBusinessType: businessType,
            selectedWorkspace: businessWorkspaceForType(businessType).id,
            selectedFeatures,
            enabledModules,
            trialBusinessType: businessType,
          }
        : {}),
      onboardingCompleted: false,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      lastAccessedAt: now,
    }
    console.log('[Workspace Bootstrap] create payload', workspaceCreatePayload)
    try {
      await setDoc(workspaceRef, workspaceCreatePayload)
      console.log('[Workspace Bootstrap] create success', { workspaceId: uid })
    } catch (error) {
      console.error('[Workspace Bootstrap] create fail', {
        workspaceId: uid,
        code: error?.code,
        message: error?.message,
        payload: workspaceCreatePayload,
      })
      const failedUserSnap = await getDoc(doc(db, 'users', uid))
      console.log('[Workspace Bootstrap] user exists', failedUserSnap.exists())
      console.log('[Workspace Bootstrap] user data', failedUserSnap.data())
      const failedWorkspaceSnap = await getDoc(doc(db, 'workspaces', uid))
      console.log('[Workspace Bootstrap] workspace exists after fail', failedWorkspaceSnap.exists())
      throw error
    }
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

  return { uid, workspaceId: effectiveWorkspaceId, onboardingCompleted }
}
