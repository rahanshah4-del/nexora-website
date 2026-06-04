import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { ensureUserWorkspace } from '../../lib/accountProvisioning.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { normalizeFinanceRole } from '../lib/financeAccess.js'
import { isPlatformAdminDoc } from '../../lib/roles.js'
import {
  accessPlanForUser,
  businessWorkspaceForSelection,
  businessWorkspaceForType,
  daysUntil,
  isDeveloperOwnerAccount,
  isTrialExpired,
  normalizeBusinessType,
  normalizePlan,
  trialEndDate,
} from '../data/moduleAccess.js'
import { ensureWorkspaceAccessFields, workspaceAccessState } from '../lib/workspaceAccess.js'
import { readSelectedWorkspace } from '../lib/workspaceSession.js'

const UserContext = createContext(null)

const defaultUserDoc = {
  name: 'Nexora User',
  email: 'user@nexora.solutions',
  plan: 'Free',
  role: 'owner', // owner | admin | staff
  planStatus: 'trial',
  upgradedAt: null,
}

const blockedStatuses = ['blocked', 'disabled', 'inactive']

function normalizeRole(role) {
  const value = normalizeFinanceRole(role)
  return value === 'staff' && !role ? 'owner' : value
}

export function UserProvider({ children }) {
  const { user, ready } = useAuth()
  const { profile, plan: localPlan } = usePreferences()
  const [userDoc, setUserDoc] = useState(null)
  const [staffAccessStatus, setStaffAccessStatus] = useState('')
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState('')
  const [workspaceDoc, setWorkspaceDoc] = useState(null)
  const [workspaceAccessDenied, setWorkspaceAccessDenied] = useState(false)
  const [selectedBusinessWorkspace, setSelectedBusinessWorkspace] = useState(null)
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
        setStaffAccessStatus('')
        setWorkspaceOwnerId('')
        setWorkspaceAccessDenied(false)
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

  useEffect(() => {
    if (!ready || !db || !user || loading || !userDoc) {
      Promise.resolve().then(() => setStaffAccessStatus(''))
      return undefined
    }

    const nextWorkspaceId = userDoc.workspaceId || user.uid
    const nextStaffId = userDoc.staffId || user.uid
    const nextRole = normalizeRole(userDoc.role)
    if (!nextWorkspaceId || !nextStaffId || nextRole === 'owner') {
      Promise.resolve().then(() => setStaffAccessStatus(''))
      return undefined
    }

    const ref = doc(db, 'workspaces', nextWorkspaceId, 'staff', nextStaffId)
    const unsub = onSnapshot(
      ref,
      (snap) => setStaffAccessStatus(snap.exists() ? String(snap.data()?.status || '') : ''),
      () => setStaffAccessStatus(''),
    )

    return () => unsub()
  }, [loading, ready, user, userDoc])

  const role = normalizeRole(userDoc?.role)
  const workspaceId = userDoc?.workspaceId || user?.uid || null
  const developerOverride = isDeveloperOwnerAccount(userDoc, user)
  const allowedBusinessTypes = Array.from(new Set([
    ...(Array.isArray(workspaceDoc?.allowedBusinessTypes) ? workspaceDoc.allowedBusinessTypes : []),
    ...(Array.isArray(userDoc?.allowedBusinessTypes) ? userDoc.allowedBusinessTypes : []),
  ].filter(Boolean).map(normalizeBusinessType)))
  const allModulesAccess = workspaceDoc?.allModulesAccess === true || userDoc?.allModulesAccess === true
  const specialModuleAccess = allModulesAccess || workspaceDoc?.specialModuleAccess === true || userDoc?.specialModuleAccess === true
  const lockedBusinessType =
    userDoc?.primaryBusinessType || workspaceDoc?.primaryBusinessType || userDoc?.selectedBusinessType || userDoc?.businessType || workspaceDoc?.selectedBusinessType || workspaceDoc?.businessType
  const requestedBusinessType = normalizeBusinessType(userDoc?.selectedBusinessType || userDoc?.currentBusinessType || userDoc?.businessType)
  const requestedBusinessAllowed = allModulesAccess || allowedBusinessTypes.includes(requestedBusinessType) || requestedBusinessType === normalizeBusinessType(lockedBusinessType)
  const selectedBusiness = businessWorkspaceForSelection(
    developerOverride
      ? selectedBusinessWorkspace || userDoc?.selectedWorkspace || userDoc?.selectedBusinessType || userDoc?.businessType
      : specialModuleAccess && requestedBusinessAllowed
        ? requestedBusinessType
        : lockedBusinessType || userDoc?.selectedWorkspace,
  )
  const businessType = normalizeBusinessType(selectedBusiness?.type || userDoc?.selectedBusinessType || userDoc?.businessType)
  const businessWorkspaceId = selectedBusiness?.id || businessWorkspaceForType(businessType).id
  const staffId = userDoc?.staffId || user?.uid || null
  const isPlatformAdmin = isPlatformAdminDoc({ email: user?.email || '' })
  const userStatus = String(userDoc?.status || '').trim().toLowerCase()
  const staffStatus = String(staffAccessStatus || '').trim().toLowerCase()
  const workspaceStatus = String(workspaceDoc?.status || '').trim().toLowerCase()
  const workspaceAccountStatus = String(workspaceDoc?.accountStatus || '').trim().toLowerCase()
  const workspaceBlocked = workspaceAccessDenied || workspaceStatus === 'blocked' || workspaceStatus === 'inactive' || workspaceAccountStatus === 'blocked'
  const accountStatus = workspaceBlocked ? 'blocked' : staffStatus || userStatus || 'active'
  const isBlocked = workspaceBlocked || blockedStatuses.includes(userStatus) || blockedStatuses.includes(staffStatus)
  const ownsWorkspace = Boolean(
    user?.uid && (user.uid === workspaceId || user.uid === userDoc?.ownerId || user.uid === workspaceOwnerId),
  )
  const isOwner = role === 'owner' || ownsWorkspace
  const isAdmin = isOwner || role === 'admin'
  const isStaff = !isAdmin

  useEffect(() => {
    console.log('[Role Access] role', role)
    console.log('[Role Access] isOwnerAdmin', isAdmin)
    console.log('[Role Access] isStaff', isStaff)
  }, [isAdmin, isStaff, role])

  useEffect(() => {
    if (!ready || !db || !user?.uid || loading || !workspaceId) {
      Promise.resolve().then(() => {
        setWorkspaceOwnerId('')
        setWorkspaceAccessDenied(false)
      })
      return undefined
    }

    const ref = doc(db, 'workspaces', workspaceId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null
        setWorkspaceDoc(data)
        setWorkspaceOwnerId(data ? String(data?.ownerId || '') : '')
        setWorkspaceAccessDenied(false)
        if (data) ensureWorkspaceAccessFields(workspaceId, data.ownerId || user.uid).catch(() => {})
      },
      (error) => {
        setWorkspaceDoc(null)
        setWorkspaceOwnerId('')
        setWorkspaceAccessDenied(error?.code === 'permission-denied')
      },
    )

    return () => unsub()
  }, [loading, ready, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid) {
      Promise.resolve().then(() => setSelectedBusinessWorkspace(null))
      return undefined
    }

    const syncSelectedWorkspace = () => {
      setSelectedBusinessWorkspace(readSelectedWorkspace(user.uid))
    }

    syncSelectedWorkspace()
    window.addEventListener('storage', syncSelectedWorkspace)
    window.addEventListener('nexora:selectedWorkspaceChanged', syncSelectedWorkspace)
    return () => {
      window.removeEventListener('storage', syncSelectedWorkspace)
      window.removeEventListener('nexora:selectedWorkspaceChanged', syncSelectedWorkspace)
    }
  }, [user?.uid])

  const accessState = workspaceAccessState(workspaceDoc || {}, userDoc || {}, db ? 'Free' : localPlan ?? 'Free')
  const effectivePlan = normalizePlan(accessState.plan ?? (db ? 'Free' : localPlan ?? 'Free'))
  const accessPlan = accessState.accessPlan || accessPlanForUser(userDoc || {}, effectivePlan)
  const trialActive = accessState.isTrialActive
  const trialEndsAt = accessState.trialEndsAt || trialEndDate(userDoc || {})
  const trialDaysRemaining = trialActive ? accessState.trialDaysRemaining || daysUntil(trialEndsAt) : 0
  const trialExpired = accessState.isTrialExpired || isTrialExpired(userDoc || {})
  const isSubscriptionExpired = accessState.isSubscriptionExpired
  const isWorkspaceExpired = !workspaceBlocked && accessState.isWorkspaceExpired
  const hasActiveWorkspaceSubscription = !workspaceBlocked && accessState.hasActiveWorkspaceSubscription

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
      businessType,
      allowedBusinessTypes,
      specialModuleAccess,
      allModulesAccess,
      businessWorkspaceId,
      selectedBusinessWorkspace: businessWorkspaceId,
      staffId,
      firebaseUser: user ?? null,
      userDoc,
      workspaceDoc,
      workspaceAccessDenied,
      loading,
      plan: effectivePlan,
      accessPlan,
      isTrialActive: trialActive,
      isTrialExpired: trialExpired,
      isSubscriptionExpired,
      isWorkspaceExpired,
      hasActiveWorkspaceSubscription,
      trialEndsAt,
      trialDaysRemaining,
      role,
      isOwner,
      isStaff,
      isAdmin,
      isPlatformAdmin,
      accountStatus,
      isBlocked,
      workspaceBlocked,
      isAccountant: role === 'accountant',
      isManager: role === 'manager',
      isSales: role === 'sales',
    }),
    [
      user,
      workspaceId,
      businessType,
      allowedBusinessTypes,
      specialModuleAccess,
      allModulesAccess,
      businessWorkspaceId,
      staffId,
      userDoc,
      workspaceDoc,
      workspaceAccessDenied,
      loading,
      effectivePlan,
      accessPlan,
      trialActive,
      trialExpired,
      isSubscriptionExpired,
      isWorkspaceExpired,
      hasActiveWorkspaceSubscription,
      trialEndsAt,
      trialDaysRemaining,
      role,
      isPlatformAdmin,
      accountStatus,
      isBlocked,
      workspaceBlocked,
      ownsWorkspace,
      workspaceOwnerId,
      isOwner,
      isAdmin,
      isStaff,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserContext
