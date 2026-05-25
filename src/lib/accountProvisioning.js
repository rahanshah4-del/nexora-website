import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

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
  const email = (cleanString(overrides.email) || cleanString(user.email)).toLowerCase()
  const fullName = userDisplayName(user, overrides.fullName || overrides.name)
  const company = cleanString(overrides.company)
  const provider = cleanString(overrides.provider) || user?.providerData?.[0]?.providerId || 'password'

  const userRef = doc(db, 'users', uid)
  const workspaceRef = doc(db, 'workspaces', uid)
  const [userSnap, workspaceSnap] = await Promise.all([getDoc(userRef), getDoc(workspaceRef)])

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
      businessType: cleanString(overrides.businessType),
      photoURL: cleanString(overrides.photoURL) || cleanString(user.photoURL),
      provider,
      role: 'user',
      isAdmin: false,
      plan: FREE_TRIAL_PLAN,
      planStatus: FREE_TRIAL_STATUS,
      billingCycle: 'monthly',
      trialStartedAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    })
  } else {
    const update = {
      uid,
      ownerId: uid,
      userId: uid,
      workspaceId: uid,
      email,
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
    if (cleanString(overrides.businessType)) update.businessType = cleanString(overrides.businessType)
    await setDoc(userRef, update, { merge: true })
  }

  if (!workspaceSnap.exists()) {
    await setDoc(workspaceRef, {
      ownerId: uid,
      userId: uid,
      workspaceId: uid,
      name: company || `${fullName}'s Workspace`,
      email,
      plan: FREE_TRIAL_PLAN,
      planStatus: FREE_TRIAL_STATUS,
      billingCycle: 'monthly',
      trialStartedAt: now,
      createdAt: now,
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

  // TODO: Premium plan changes must be verified by an admin/backend payment webhook.
  // The frontend may display plan state, but it must never be the source of truth for unlocking paid access.
  return { uid, workspaceId: uid }
}
