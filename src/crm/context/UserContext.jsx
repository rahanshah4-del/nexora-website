import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../hooks/useAuth.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { ensureUserWorkspace, isStaffWorkspaceProfile } from '../../lib/accountProvisioning.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { setStorageScope } from '../lib/localDataEvents.js'
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
import { readSelectedWorkspace, saveSelectedWorkspace } from '../lib/workspaceSession.js'

const UserContext = createContext(null)

const blockedStatuses = ['blocked', 'disabled', 'inactive']

function traceUserContext(event, payload = {}) {
  if (import.meta.env.DEV) {
    console.log(`[UserContextTrace] ${event}`, payload)
  }
}

function staffInviteEmailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'staff-email'
}

function normalizeRole(role) {
  const value = normalizeFinanceRole(role)
  return value === 'staff' && !role ? 'owner' : value
}

function permissionModuleKey(permissionKey) {
  const match = String(permissionKey || '').match(/^module\.([^.]+)\./)
  return match?.[1] || ''
}

function normalizeStaffModuleKey(moduleKey) {
  const value = String(moduleKey || '').trim()
  const lower = value.toLowerCase().replace(/[-\s]+/g, '_')
  if (lower === 'retail_pos' || lower === 'retail' || lower === 'pos') return 'pos'
  if (lower === 'pos_orders' || lower === 'retail_pos_orders') return 'posOrders'
  return value
}

function inferBusinessTypeFromStaffAccess(row = {}) {
  const modules = new Set((Array.isArray(row?.enabledModules) ? row.enabledModules : []).map(normalizeStaffModuleKey).filter(Boolean))
  Object.entries(row?.permissions && typeof row.permissions === 'object' ? row.permissions : {}).forEach(([key, value]) => {
    if (value === true && String(key).endsWith('.view')) {
      const moduleKey = normalizeStaffModuleKey(permissionModuleKey(key))
      if (moduleKey) modules.add(moduleKey)
    }
  })
  Object.entries(row && typeof row === 'object' ? row : {}).forEach(([key, value]) => {
    if (value === true && String(key).startsWith('module.') && String(key).endsWith('.view')) {
      const moduleKey = normalizeStaffModuleKey(permissionModuleKey(key))
      if (moduleKey) modules.add(moduleKey)
    }
  })
  Object.entries(row?.businessPermissions && typeof row.businessPermissions === 'object' ? row.businessPermissions : {}).forEach(([key, scoped]) => {
    const hasGrant = scoped && typeof scoped === 'object' && Object.values(scoped).some((value) => value === true)
    if (hasGrant && key === 'restaurant-pos') modules.add('orders')
    if (hasGrant && ['retail-pos', 'retail_pos', 'retail', 'pos'].includes(String(key))) modules.add('pos')
    if (scoped && typeof scoped === 'object') {
      Object.entries(scoped).forEach(([permissionKey, value]) => {
        if (value === true && String(permissionKey).startsWith('module.') && String(permissionKey).endsWith('.view')) {
          const moduleKey = normalizeStaffModuleKey(permissionModuleKey(permissionKey))
          if (moduleKey) modules.add(moduleKey)
        }
      })
    }
  })
  if (modules.has('orders') || modules.has('ordersKot') || modules.has('tables') || modules.has('kitchenDisplay') || modules.has('menuManagement')) return 'Restaurant POS'
  if (modules.has('pos') || modules.has('posOrders') || modules.has('posDiscounts') || modules.has('inventory')) return 'Retail / POS'
  return ''
}

export function UserProvider({ children }) {
  const { user, ready, logout } = useAuth()
  const { profile, plan: localPlan } = usePreferences()
  const [userDoc, setUserDoc] = useState(null)
  const [staffAccessStatus, setStaffAccessStatus] = useState('')
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState('')
  const [workspaceDoc, setWorkspaceDoc] = useState(null)
  const [workspaceAccessDenied, setWorkspaceAccessDenied] = useState(false)
  const [profileStatusReady, setProfileStatusReady] = useState(false)
  const [staffAccessStatusReady, setStaffAccessStatusReady] = useState(true)
  const [workspaceStatusReady, setWorkspaceStatusReady] = useState(false)
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
        setProfileStatusReady(true)
        setStaffAccessStatusReady(true)
        setWorkspaceStatusReady(true)
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
        setProfileStatusReady(false)
        setStaffAccessStatusReady(true)
        setWorkspaceStatusReady(false)
        setLoading(false)
      })
      return
    }

    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfileStatusReady(true)
        if (!snap.exists()) {
          console.warn('[User Profile] missing profile; waiting for signup or staff invite provisioning', {
            uid: user.uid,
            email: user.email || '',
          })
          Promise.all([
            getDoc(doc(db, 'staffInviteClaims', user.uid)).catch(() => null),
            getDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(user.email))).catch(() => null),
          ])
            .then(async (claimSnap) => {
              const claim = claimSnap
                .map((snap) => (snap?.exists?.() ? snap.data() : null))
                .find((item) => isStaffWorkspaceProfile(item, user.uid) || String(item?.email || '').trim().toLowerCase() === String(user.email || '').trim().toLowerCase())
              if (!isStaffWorkspaceProfile(claim, user.uid)) return
              const repairPayload = {
                ...claim,
                uid: user.uid,
                userId: user.uid,
                staffId: String(claim.staffId || claim.uid || claim.userId || user.uid),
                email: user.email || claim.email || '',
                emailVerifiedCustom: true,
                onboardingCompleted: true,
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
              }
              await setDoc(ref, repairPayload, { merge: true })
              setUserDoc(repairPayload)
            })
            .catch(() => {})
          setUserDoc(null)
        } else {
          const nextUserDoc = snap.data()
          traceUserContext('userDoc-update', {
            uid: user.uid,
            role: nextUserDoc?.role || '',
            staffId: nextUserDoc?.staffId || '',
            workspaceId: nextUserDoc?.workspaceId || '',
            ownerId: nextUserDoc?.ownerId || '',
            businessType: nextUserDoc?.businessType || nextUserDoc?.selectedBusinessType || '',
            enabledModules: Array.isArray(nextUserDoc?.enabledModules) ? nextUserDoc.enabledModules : [],
          })
          setUserDoc(nextUserDoc)
          const roleValue = normalizeRole(nextUserDoc?.role)
          const selfWorkspaceProfile =
            roleValue !== 'owner' &&
            user.uid &&
            String(nextUserDoc?.workspaceId || '').trim() === user.uid &&
            nextUserDoc?.isStaff !== true
          if (selfWorkspaceProfile) {
            Promise.all([
              getDoc(doc(db, 'staffInviteClaims', user.uid)).catch(() => null),
              getDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(user.email))).catch(() => null),
            ])
              .then(async (claimSnap) => {
                const claim = claimSnap
                  .map((claimDoc) => (claimDoc?.exists?.() ? claimDoc.data() : null))
                  .find((item) => item?.isStaff === true || (String(item?.workspaceId || '').trim() && String(item?.workspaceId || '').trim() !== user.uid))
                if (!claim) return
                const repairPayload = {
                  ...claim,
                  uid: user.uid,
                  userId: user.uid,
                  staffId: String(claim.staffId || claim.uid || claim.userId || user.uid),
                  email: user.email || claim.email || '',
                  isStaff: true,
                  isOwner: false,
                  isAdmin: false,
                  emailVerifiedCustom: true,
                  onboardingCompleted: true,
                  updatedAt: serverTimestamp(),
                  lastLoginAt: serverTimestamp(),
                }
                await setDoc(ref, repairPayload, { merge: true })
                setUserDoc(repairPayload)
              })
              .catch(() => {})
          }
          if (provisionedUserRef.current !== user.uid) {
            provisionedUserRef.current = user.uid
            const currentProfile = profileRef.current
            console.log('[Auth Isolation] profile source', {
              uid: user.uid,
              email: user.email || '',
              fullName: currentProfile.ownerName || user.displayName || '',
              staffProfile: isStaffWorkspaceProfile(nextUserDoc, user.uid),
            })
            ensureUserWorkspace(user, {
              fullName: currentProfile.ownerName,
              email: currentProfile.email || user.email || '',
              provider: user.providerData?.[0]?.providerId || 'password',
            }).catch(() => {})
          }
        }
        setLoading(false)
      },
      () => {
        setUserDoc(null)
        setProfileStatusReady(true)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [ready, user])

  useEffect(() => {
    if (!ready || !db || !user || loading || !userDoc) {
      Promise.resolve().then(() => {
        setStaffAccessStatus('')
        setStaffAccessStatusReady(true)
      })
      return undefined
    }

    const staffWorkspaceProfile = isStaffWorkspaceProfile(userDoc, user.uid)
    const rawWorkspaceId = String(userDoc.workspaceId || '').trim()
    const nextWorkspaceId = staffWorkspaceProfile
      ? [userDoc?.ownerId, userDoc?.companyId, userDoc?.createdBy, rawWorkspaceId]
          .map((value) => String(value || '').trim())
          .find((value) => value && value !== user.uid) || rawWorkspaceId || user.uid
      : rawWorkspaceId || user.uid
    const nextStaffId = userDoc.staffId || user.uid
    const nextRole = normalizeRole(userDoc.role)
    if (!nextWorkspaceId || !nextStaffId || nextRole === 'owner') {
      Promise.resolve().then(() => {
        setStaffAccessStatus('')
        setStaffAccessStatusReady(true)
      })
      return undefined
    }

    setStaffAccessStatusReady(false)
    const ref = doc(db, 'workspaces', nextWorkspaceId, 'staff', nextStaffId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setStaffAccessStatusReady(true)
        if (snap.exists()) {
          traceUserContext('staff-status-update', {
            staffId: nextStaffId,
            workspaceId: nextWorkspaceId,
            status: snap.data()?.status || '',
          })
          setStaffAccessStatus(String(snap.data()?.status || ''))
          return
        }
        setStaffAccessStatus('')
        if (String(userDoc.status || '').trim().toLowerCase() === 'active') {
          setDoc(ref, {
            ...userDoc,
            uid: nextStaffId,
            staffId: nextStaffId,
            userId: nextStaffId,
            workspaceId: nextWorkspaceId,
            ownerId: nextWorkspaceId,
            companyId: nextWorkspaceId,
            status: 'active',
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {})
        }
      },
      () => {
        setStaffAccessStatus('')
        setStaffAccessStatusReady(true)
      },
    )

    return () => unsub()
  }, [loading, ready, user, userDoc])

  const role = normalizeRole(userDoc?.role)
  const staffProfile = isStaffWorkspaceProfile(userDoc, user?.uid)
  const userDocWorkspaceId = userDoc?.workspaceId || ''
  const staffOwnerWorkspaceId = staffProfile && user?.uid
    ? [userDoc?.ownerId, userDoc?.companyId, userDoc?.createdBy]
        .map((value) => String(value || '').trim())
        .find((value) => value && value !== user.uid) || ''
    : ''
  const repairedStaffWorkspaceId = staffProfile
    ? staffOwnerWorkspaceId || userDocWorkspaceId
    : userDocWorkspaceId
  const workspaceId = repairedStaffWorkspaceId || user?.uid || null
  const developerOverride = isDeveloperOwnerAccount(userDoc, user)
  const allowedBusinessTypes = Array.from(new Set((
    staffProfile
      ? (Array.isArray(userDoc?.allowedBusinessTypes) ? userDoc.allowedBusinessTypes : [])
      : [
          ...(Array.isArray(workspaceDoc?.allowedBusinessTypes) ? workspaceDoc.allowedBusinessTypes : []),
          ...(Array.isArray(userDoc?.allowedBusinessTypes) ? userDoc.allowedBusinessTypes : []),
        ]
  ).filter(Boolean).map(normalizeBusinessType)))
  const allModulesAccess = staffProfile ? false : workspaceDoc?.allModulesAccess === true || userDoc?.allModulesAccess === true
  const specialModuleAccess = staffProfile ? false : allModulesAccess || workspaceDoc?.specialModuleAccess === true || userDoc?.specialModuleAccess === true
  const staffAccessBusinessType = staffProfile ? inferBusinessTypeFromStaffAccess(userDoc) : ''
  // CRITICAL: lockedBusinessType must resolve ONLY from Firestore primary fields.
  // selectedBusinessType and currentBusinessType are UI/temp fields that must
  // never participate in primary module identity. If primary is missing, we
  // fall back to businessType (the field set during onboarding) — never guess.
  const lockedBusinessType = staffProfile
    ? staffAccessBusinessType ||
      userDoc?.primaryBusinessType ||
      workspaceDoc?.primaryBusinessType ||
      userDoc?.businessType ||
      workspaceDoc?.businessType
    : userDoc?.primaryBusinessType ||
      workspaceDoc?.primaryBusinessType ||
      userDoc?.businessType ||
      workspaceDoc?.businessType
  // CRITICAL: requestedBusinessType must derive only from businessType
  // (set during onboarding), never from selectedBusinessType or
  // currentBusinessType which are UI/temp fields that can overwrite
  // the locked primary module.
  const requestedBusinessType = normalizeBusinessType(
    workspaceDoc?.businessType ||
      userDoc?.businessType,
  )
  const requestedBusinessAllowed = allModulesAccess || allowedBusinessTypes.includes(requestedBusinessType) || requestedBusinessType === normalizeBusinessType(lockedBusinessType)
  const storedBusinessWorkspace = businessWorkspaceForSelection(selectedBusinessWorkspace)
  const storedBusinessType = normalizeBusinessType(storedBusinessWorkspace?.type)
  const storedBusinessAllowed = Boolean(selectedBusinessWorkspace) && (
    allModulesAccess ||
    allowedBusinessTypes.includes(storedBusinessType) ||
    storedBusinessType === normalizeBusinessType(lockedBusinessType)
  )
  // CRITICAL: selectedWorkspace (e.g. "general-crm") must NEVER enter this chain.
  // It is a UI workspace ID, not a business type. Passing it through
  // businessWorkspaceForSelection() would incorrectly resolve to Nexora Sales Hub,
  // overwriting Transport/Rental and other primary modules.
  // Similarly, selectedBusinessType and currentBusinessType are UI/temp fields
  // that must never decide the locked primary module.
  const selectedBusiness = businessWorkspaceForSelection(
    staffProfile
      ? lockedBusinessType || userDoc?.businessType
      : developerOverride
      ? selectedBusinessWorkspace || userDoc?.businessType
      : storedBusinessAllowed && storedBusinessType === normalizeBusinessType(lockedBusinessType)
        ? selectedBusinessWorkspace
      : specialModuleAccess && requestedBusinessAllowed
        ? requestedBusinessType
        : lockedBusinessType,
  )
  // CRITICAL: Guard against defaulting to "General CRM" when no primary exists.
  // normalizeBusinessType('') or normalizeBusinessType(null) always returns
  // "General CRM" via default fallback. We must return empty instead.
  const rawBusinessType =
    (staffProfile
      ? selectedBusiness?.type ||
        lockedBusinessType ||
        userDoc?.businessType ||
        workspaceDoc?.businessType
      : selectedBusiness?.type ||
        lockedBusinessType ||
        workspaceDoc?.businessType ||
        userDoc?.businessType) || ''
  const businessType = rawBusinessType
    ? normalizeBusinessType(rawBusinessType)
    : ''
  const primaryBusinessTypeMissing = !rawBusinessType
  const businessWorkspaceId = businessType
    ? (selectedBusiness?.id || businessWorkspaceForType(businessType).id)
    : ''
  const staffId = userDoc?.staffId || user?.uid || null
  const isPlatformAdmin = isPlatformAdminDoc({ email: user?.email || '' })
  const userStatus = String(userDoc?.status || '').trim().toLowerCase()
  const staffStatus = String(staffAccessStatus || '').trim().toLowerCase()
  const workspaceStatus = String(workspaceDoc?.status || '').trim().toLowerCase()
  const workspaceAccountStatus = String(workspaceDoc?.accountStatus || '').trim().toLowerCase()
  const workspaceBlocked = workspaceAccessDenied || workspaceStatus === 'blocked' || workspaceStatus === 'inactive' || workspaceAccountStatus === 'blocked'
  const accountStatus = workspaceBlocked ? 'blocked' : staffStatus || userStatus || 'active'
  const isBlocked = workspaceBlocked || blockedStatuses.includes(userStatus) || blockedStatuses.includes(staffStatus)
  const ownsWorkspace = !staffProfile && Boolean(
    user?.uid && (
      user.uid === workspaceId ||
      user.uid === userDoc?.ownerId ||
      user.uid === workspaceOwnerId ||
      user.uid === workspaceDoc?.ownerId ||
      user.uid === workspaceDoc?.createdBy
    ),
  )
  const isOwner = !staffProfile && (role === 'owner' || ownsWorkspace)
  const isAdmin = isOwner || role === 'admin'
  const isStaff = staffProfile || !isAdmin

  // Activate scoped localStorage once both user.uid and workspaceId are confirmed.
  useEffect(() => {
    if (user?.uid && workspaceId) {
      setStorageScope(workspaceId, user.uid)
    }
  }, [user?.uid, workspaceId])

  useEffect(() => {
    if (!ready || loading || !user?.uid || !isBlocked || !isStaff) return
    try {
      window.sessionStorage.setItem('nexora:loginNotice', 'Your staff access was disabled by the workspace owner. Please contact your administrator.')
    } catch {
      // Non-fatal in private browsing.
    }
    logout?.()
  }, [isBlocked, isStaff, loading, logout, ready, user?.uid])

  useEffect(() => {
    console.log('[Role Access] role', role)
    console.log('[Role Access] isOwnerAdmin', isAdmin)
    console.log('[Role Access] isStaff', isStaff)
    console.log('[Permission Debug]', {
      currentWorkspaceId: workspaceId || '',
      currentWorkspaceOwnerId: workspaceDoc?.ownerId || workspaceOwnerId || '',
      currentWorkspaceCreatedBy: workspaceDoc?.createdBy || '',
      uid: user?.uid || '',
      role,
      isOwner,
      isAdmin,
      collectionPathCustomers: workspaceId ? `workspaces/${workspaceId}/customers` : '',
      collectionPathLeads: workspaceId ? `workspaces/${workspaceId}/leads` : '',
    })
  }, [isAdmin, isOwner, isStaff, role, user?.uid, workspaceDoc?.createdBy, workspaceDoc?.ownerId, workspaceId, workspaceOwnerId])

  useEffect(() => {
    if (loading) return
    console.log('[Workspace Read]', {
      source: 'UserContext',
      userPath: user?.uid ? `users/${user.uid}` : '',
      workspacePath: workspaceId ? `workspaces/${workspaceId}` : '',
      user: {
        onboardingCompleted: userDoc?.onboardingCompleted === true,
        selectedWorkspace: userDoc?.selectedWorkspace || '',
        selectedBusinessType: userDoc?.selectedBusinessType || '',
        currentBusinessType: userDoc?.currentBusinessType || '',
        businessType: userDoc?.businessType || '',
        allowedBusinessTypes: Array.isArray(userDoc?.allowedBusinessTypes) ? userDoc.allowedBusinessTypes : [],
        enabledModules: Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : [],
      },
        workspace: {
          onboardingCompleted: workspaceDoc?.onboardingCompleted === true,
          id: workspaceId || '',
          ownerId: workspaceDoc?.ownerId || '',
          createdBy: workspaceDoc?.createdBy || '',
          selectedWorkspace: workspaceDoc?.selectedWorkspace || '',
          selectedBusinessType: workspaceDoc?.selectedBusinessType || '',
        currentBusinessType: workspaceDoc?.currentBusinessType || '',
        businessType: workspaceDoc?.businessType || '',
        allowedBusinessTypes: Array.isArray(workspaceDoc?.allowedBusinessTypes) ? workspaceDoc.allowedBusinessTypes : [],
        enabledModules: Array.isArray(workspaceDoc?.enabledModules) ? workspaceDoc.enabledModules : [],
      },
      resolved: {
        businessType,
        businessWorkspaceId,
        allowedBusinessTypes,
        lockedBusinessType: normalizeBusinessType(lockedBusinessType),
      },
    })
    console.log('[Workspace Access]', {
      source: 'UserContext',
      selectedBusinessWorkspace,
      storedBusinessType,
      storedBusinessAllowed,
      requestedBusinessType,
      requestedBusinessAllowed,
      allModulesAccess,
      specialModuleAccess,
      allowedBusinessTypes,
    })
    console.log('[Business Type]', {
      source: 'UserContext',
      businessType,
      lockedBusinessType: normalizeBusinessType(lockedBusinessType),
      requestedBusinessType,
      storedBusinessType,
    })
    console.log('[Current Business Type]', {
      source: 'UserContext',
      workspaceCurrentBusinessType: workspaceDoc?.currentBusinessType || '',
      userCurrentBusinessType: userDoc?.currentBusinessType || '',
      resolvedBusinessType: businessType,
    })
    console.log('[Selected Workspace]', {
      source: 'UserContext',
      selectedBusinessWorkspace,
      selectedBusinessWorkspaceId: businessWorkspaceId,
      workspaceSelectedWorkspace: workspaceDoc?.selectedWorkspace || '',
      userSelectedWorkspace: userDoc?.selectedWorkspace || '',
    })
  }, [
    allowedBusinessTypes,
    allModulesAccess,
    businessType,
    businessWorkspaceId,
    loading,
    lockedBusinessType,
    requestedBusinessAllowed,
    requestedBusinessType,
    selectedBusinessWorkspace,
    specialModuleAccess,
    storedBusinessAllowed,
    storedBusinessType,
    user?.uid,
    userDoc,
    workspaceDoc,
    workspaceId,
  ])

  useEffect(() => {
    if (!ready || !db || !user?.uid || loading || !workspaceId) {
      Promise.resolve().then(() => {
        setWorkspaceDoc(null)
        setWorkspaceOwnerId('')
        setWorkspaceAccessDenied(false)
        setWorkspaceStatusReady(false)
      })
      return undefined
    }

    setWorkspaceDoc(null)
    setWorkspaceOwnerId('')
    setWorkspaceAccessDenied(false)
    setWorkspaceStatusReady(false)
    const ref = doc(db, 'workspaces', workspaceId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setWorkspaceStatusReady(true)
        const data = snap.exists() ? snap.data() : null
        traceUserContext('workspaceDoc-update', {
          workspaceId,
          ownerId: data?.ownerId || '',
          businessType: data?.businessType || data?.selectedBusinessType || '',
          status: data?.status || '',
        })
        setWorkspaceDoc(data)
        setWorkspaceOwnerId(data ? String(data?.ownerId || '') : '')
        setWorkspaceAccessDenied(false)
        console.log('[Auth Isolation] workspace validated', {
          uid: user?.uid || '',
          workspaceId,
          workspaceOwnerId: data?.ownerId || '',
          ownerMatchesUser: !data || data.ownerId === user?.uid || data.ownerId === workspaceId,
        })
        if (data) ensureWorkspaceAccessFields(workspaceId, data.ownerId || user.uid).catch(() => {})
      },
      (error) => {
        setWorkspaceDoc(null)
        setWorkspaceOwnerId('')
        setWorkspaceAccessDenied(error?.code === 'permission-denied')
        setWorkspaceStatusReady(true)
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

  // ── Module / Workspace isolation health check ──────────────────────
  // Detects and reports conflict between:
  //   - Firestore primary module (source of truth)
  //   - localStorage selected (UI selection)
  //   - Resolved businessType
  // Also surfaces:
  //   - Missing primary (no primaryBusinessType or businessType on Firestore)
  //   - Dangerous fields (selectedWorkspace, selectedBusinessType,
  //     currentBusinessType) that should never affect module identity.
  // When conflict is found, localStorage is reset to prevent override.
  useEffect(() => {
    if (!user?.uid || !workspaceId || !userDoc || !workspaceDoc || loading || !profileStatusReady) return

    const healthIssues = []

    // --- Dangerous field detection: Firestore must not hold these as identity ---
    const dangerousFields = []
    if (userDoc?.selectedWorkspace && businessType && !isStaffWorkspaceProfile(userDoc, user.uid)) {
      dangerousFields.push(`users/{uid}.selectedWorkspace = "${String(userDoc.selectedWorkspace).slice(0, 40)}"`)
    }
    if (workspaceDoc?.selectedWorkspace) {
      dangerousFields.push(`workspaces/{wid}.selectedWorkspace = "${String(workspaceDoc.selectedWorkspace).slice(0, 40)}"`)
    }
    if (userDoc?.selectedBusinessType) {
      dangerousFields.push(`users/{uid}.selectedBusinessType = "${userDoc.selectedBusinessType}"`)
    }
    if (workspaceDoc?.selectedBusinessType) {
      dangerousFields.push(`workspaces/{wid}.selectedBusinessType = "${workspaceDoc.selectedBusinessType}"`)
    }
    if (userDoc?.currentBusinessType) {
      dangerousFields.push(`users/{uid}.currentBusinessType = "${userDoc.currentBusinessType}"`)
    }
    if (workspaceDoc?.currentBusinessType) {
      dangerousFields.push(`workspaces/{wid}.currentBusinessType = "${workspaceDoc.currentBusinessType}"`)
    }
    if (dangerousFields.length > 0) {
      healthIssues.push({
        type: 'DANGEROUS_FIRESTORE_FIELDS',
        detail: `Fields that can overwrite primary module identity found: ${dangerousFields.join(', ')}`,
        severity: 'WARNING',
        fields: dangerousFields,
      })
    }

    // --- Primary module source of truth ---
    const firestorePrimary =
      userDoc?.primaryBusinessType ||
      workspaceDoc?.primaryBusinessType ||
      workspaceDoc?.businessType ||
      userDoc?.businessType

    if (!firestorePrimary) {
      healthIssues.push({
        type: 'PRIMARY_MODULE_MISSING',
        detail: 'No primaryBusinessType or businessType found on Firestore user or workspace doc. Cannot determine locked primary module.',
        severity: 'CRITICAL',
      })
      console.error('[System Health] Primary module missing — no fallback to default', {
        uid: user.uid,
        workspaceId,
        timestamp: new Date().toISOString(),
      })
      window.dispatchEvent(new CustomEvent('nexora:healthCheckFailed', {
        detail: { issues: healthIssues, uid: user.uid, workspaceId },
      }))
      return
    }

    const firestoreNormalized = normalizeBusinessType(firestorePrimary)
    const resolvedNormalized = normalizeBusinessType(businessType)
    const storedSelected = readSelectedWorkspace(user.uid)
    const storedSelectedType = storedSelected
      ? normalizeBusinessType(businessWorkspaceForSelection(storedSelected)?.type)
      : ''

    // --- localStorage vs Firestore conflict ---
    if (storedSelectedType && storedSelectedType !== firestoreNormalized) {
      healthIssues.push({
        type: 'LOCALSTORAGE_CONFLICT',
        detail: `localStorage selected module "${storedSelectedType}" conflicts with Firestore primary "${firestoreNormalized}"`,
        severity: 'CRITICAL',
      })
      // Reset localStorage — UI selection must never override Firestore primary.
      const correctWorkspace = businessWorkspaceForType(firestoreNormalized).id
      saveSelectedWorkspace(user.uid, correctWorkspace)
      console.warn('[System Health] localStorage selectedWorkspace reset to Firestore primary', {
        from: storedSelected,
        to: correctWorkspace,
        firestorePrimary: firestoreNormalized,
      })
    }

    // --- Resolved module vs Firestore mismatch ---
    if (resolvedNormalized !== firestoreNormalized) {
      healthIssues.push({
        type: 'MODULE_ISOLATION_MISMATCH',
        detail: `Resolved module "${resolvedNormalized}" does not match Firestore primary "${firestoreNormalized}"`,
        severity: 'CRITICAL',
      })
    }

    if (healthIssues.length > 0) {
      console.error('[System Health] Module isolation violation detected', {
        issues: healthIssues,
        uid: user.uid,
        workspaceId,
        firestorePrimary: firestoreNormalized,
        resolvedBusinessType: resolvedNormalized,
        localStorageSelectedModule: storedSelectedType || '(none)',
        dangerousFields: dangerousFields.length > 0 ? dangerousFields : '(none)',
        timestamp: new Date().toISOString(),
      })
      window.dispatchEvent(new CustomEvent('nexora:healthCheckFailed', {
        detail: { issues: healthIssues, uid: user.uid, workspaceId },
      }))
    } else {
      window.dispatchEvent(new CustomEvent('nexora:healthCheckPassed', {
        detail: { uid: user.uid, workspaceId },
      }))
    }
  }, [businessType, loading, profileStatusReady, user?.uid, userDoc, workspaceDoc, workspaceId])

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
  const accessStatusReady = !user?.uid || Boolean(
    profileStatusReady &&
      (!workspaceId || workspaceStatusReady) &&
      (!staffProfile || staffAccessStatusReady)
  )

  useEffect(() => {
    if (!user?.uid || !workspaceId || loading || loggedLoginRef.current === user.uid) return
    loggedLoginRef.current = user.uid
    const { userName, userEmail } = userActivityInfo(userDoc, user)
    const now = serverTimestamp()
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
    // Team/staff PIN login is backend-owned. Avoid duplicate client writes here;
    // Firestore rules intentionally deny normal clients from changing staff access state.
  }, [loading, role, staffId, user, userDoc, workspaceId])

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
      accessStatusReady,
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
      primaryBusinessTypeMissing,
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
      primaryBusinessTypeMissing,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserContext
