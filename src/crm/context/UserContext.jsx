import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { normalizeFinanceRole } from '../lib/financeAccess.js'
import { accessPlanForUser, daysUntil, isTrialActive, normalizePlan, trialEndDate } from '../data/moduleAccess.js'

const UserContext = createContext(null)

const defaultUserDoc = {
  name: 'Nexora User',
  email: 'user@nexora.solutions',
  plan: 'Free',
  role: 'owner', // owner | admin | staff
  planStatus: 'trial',
  upgradedAt: null,
}

function normalizeRole(role) {
  const value = normalizeFinanceRole(role)
  return value === 'staff' && !role ? 'owner' : value
}

export function UserProvider({ children }) {
  const { user, ready } = useAuth()
  const { profile, plan: localPlan } = usePreferences()
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const provisionedUserRef = useRef('')
  const loggedLoginRef = useRef('')
  const profileRef = useRef(profile)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    if (!ready) return
    if (!db) {
      Promise.resolve().then(() => {
        setUserDoc(null)
        setLoading(false)
      })
      return
    }
    if (!user) {
      Promise.resolve().then(() => {
        provisionedUserRef.current = ''
        setUserDoc(null)
        setLoading(false)
      })
      return
    }

    const ref = doc(db, 'users', user.uid)
    if (provisionedUserRef.current !== user.uid) {
      provisionedUserRef.current = user.uid
      const currentProfile = profileRef.current
      ensureUserWorkspace(user, {
        fullName: currentProfile.ownerName,
        email: currentProfile.email || user.email || '',
        provider: user.providerData?.[0]?.providerId || 'password',
      }).catch(() => {})
    }

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          const currentProfile = profileRef.current
          setDoc(
            ref,
            {
              ...defaultUserDoc,
              uid: user.uid,
              ownerId: user.uid,
              userId: user.uid,
              workspaceId: user.uid,
              name: currentProfile.ownerName || user.displayName || user.email?.split('@')?.[0] || defaultUserDoc.name,
              fullName: currentProfile.ownerName || user.displayName || '',
              email: currentProfile.email || user.email || defaultUserDoc.email,
              provider: user.providerData?.[0]?.providerId || 'password',
              role: 'owner',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch(() => {})
          setUserDoc(null)
        } else {
          setUserDoc(snap.data())
        }
        setLoading(false)
      },
      () => {
        setUserDoc(null)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [ready, user])

  const effectivePlan = normalizePlan(userDoc?.plan ?? (db ? 'Free' : localPlan ?? 'Free'))
  const accessPlan = accessPlanForUser(userDoc || {}, effectivePlan)
  const trialActive = isTrialActive(userDoc || {})
  const trialEndsAt = trialEndDate(userDoc || {})
  const trialDaysRemaining = trialActive ? daysUntil(trialEndsAt) : 0
  const role = normalizeRole(userDoc?.role)
  const workspaceId = userDoc?.workspaceId || user?.uid || null
  const staffId = userDoc?.staffId || user?.uid || null

  useEffect(() => {
    if (!user?.uid || !workspaceId || loading || loggedLoginRef.current === user.uid) return
    loggedLoginRef.current = user.uid
    const { userName, userEmail } = userActivityInfo(userDoc, user)
    logActivity({
      workspaceId,
      userId: user.uid,
      userName,
      userEmail,
      action: 'Login',
      module: 'Auth',
      description: `${userEmail || userName} logged in.`,
      targetId: user.uid,
      targetName: userName,
      metadata: { role },
    }).catch(() => {})
  }, [loading, role, user, userDoc, workspaceId])

  const value = useMemo(
    () => ({
      userId: user?.uid ?? null,
      workspaceId,
      staffId,
      firebaseUser: user ?? null,
      userDoc,
      loading,
      plan: effectivePlan,
      accessPlan,
      isTrialActive: trialActive,
      trialEndsAt,
      trialDaysRemaining,
      role,
      isOwner: role === 'owner',
      isStaff: role === 'staff',
      isAdmin: role === 'admin' || role === 'owner',
      isAccountant: role === 'accountant',
      isManager: role === 'manager',
    }),
    [user, workspaceId, staffId, userDoc, loading, effectivePlan, accessPlan, trialActive, trialEndsAt, trialDaysRemaining, role],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserContext
