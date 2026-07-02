import { useEffect, useMemo, useState } from 'react'
import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, firebaseConfig, firebaseEnabled } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess, workspacePermissionKeysForBusiness } from './useWorkspaceAccess.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { businessPermissionKey, businessWorkspaceForType, mapLegacyPermissionToModule, normalizeBusinessType } from '../data/moduleAccess.js'
import { sendWorkerEmail, staffInvitationEmail } from '../../lib/transactionalEmail.js'

function defaultPermissions(permissionKeys) {
  return Object.fromEntries(permissionKeys.map((item) => [item.key, false]))
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function staffInviteEmailKey(email) {
  return slug(email) || 'staff-email'
}

function normalizeStaffRole(role) {
  const value = String(role || 'staff').trim().toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'accountant') return 'accountant'
  if (value === 'manager') return 'manager'
  if (value === 'support' || value === 'support agent') return 'support'
  if (value === 'sales' || value === 'sales staff' || value === 'staff') return 'sales'
  return 'staff'
}

function normalizePermissionSet(raw = {}, permissionKeys = []) {
  const next = defaultPermissions(permissionKeys)
  for (const item of permissionKeys) {
    if (typeof raw[item.key] === 'boolean') {
      next[item.key] = raw[item.key]
    } else {
      next[item.key] = mapLegacyPermissionToModule(raw, item.moduleKey, item.action)
    }
  }
  return next
}

function permissionsForBusiness(row = {}, businessType, permissionKeys) {
  const key = businessPermissionKey(businessType)
  if (row.businessPermissions && typeof row.businessPermissions === 'object') {
    return { ...normalizePermissionSet(row.businessPermissions[key] || {}, permissionKeys), __businessPermissions: row.businessPermissions }
  }
  return key === 'general-crm' ? { ...normalizePermissionSet(row, permissionKeys), __businessPermissions: {} } : { ...defaultPermissions(permissionKeys), __businessPermissions: {} }
}

function rootPermissionUnion(existing = {}, nextBusinessPermissions = {}, permissionKeys = []) {
  const merged = defaultPermissions(permissionKeys)
  for (const key of permissionKeys.map((item) => item.key)) {
    merged[key] = Boolean(existing[key])
  }
  for (const permissions of Object.values(nextBusinessPermissions || {})) {
    for (const key of permissionKeys.map((item) => item.key)) {
      merged[key] = Boolean(merged[key] || permissions?.[key])
    }
  }
  return merged
}

function hasViewPermission(permissions = {}, permissionKeys = []) {
  return permissionKeys.some((item) => item.action === 'view' && Boolean(permissions?.[item.key]))
}

function permissionsFromEnabledModules(enabledModules = [], permissionKeys = []) {
  const enabled = new Set(Array.isArray(enabledModules) ? enabledModules : [])
  if (!enabled.size) return {}
  return Object.fromEntries(
    permissionKeys
      .filter((item) => item.action === 'view' && enabled.has(item.moduleKey))
      .map((item) => [item.key, true]),
  )
}

function permissionsWithModuleFallback(permissions = {}, enabledModules = [], permissionKeys = []) {
  return hasViewPermission(permissions, permissionKeys)
    ? permissions
    : { ...permissions, ...permissionsFromEnabledModules(enabledModules, permissionKeys) }
}

function setIfKnown(next, knownKeys, key, value = true) {
  if (knownKeys.has(key)) next[key] = Boolean(value)
}

function applyPermissionDependencies(permissions = {}, permissionKeys = []) {
  const next = { ...permissions }
  const knownKeys = new Set(permissionKeys.map((item) => item.key))
  const hasAny = (...keys) => keys.some((key) => next[key] === true)

  const posEnabled = hasAny(
    'module.pos.view',
    'module.pos.create',
    'module.pos.edit',
    'module.pos.approve',
    'module.posOrders.view',
    'module.posOrders.create',
    'module.posOrders.edit',
    'module.posOrders.approve',
  )
  if (posEnabled) {
    setIfKnown(next, knownKeys, 'module.pos.view')
    setIfKnown(next, knownKeys, 'module.posOrders.view')
    setIfKnown(next, knownKeys, 'module.inventory.view')
    setIfKnown(next, knownKeys, 'module.products.view')
  }

  if (hasAny('module.pos.create', 'module.pos.edit', 'module.posOrders.create', 'module.posOrders.edit')) {
    setIfKnown(next, knownKeys, 'module.pos.create')
    setIfKnown(next, knownKeys, 'module.posOrders.create')
    setIfKnown(next, knownKeys, 'module.inventory.edit')
    setIfKnown(next, knownKeys, 'module.products.edit')
  }

  if (hasAny('module.inventory.create', 'module.inventory.edit')) {
    setIfKnown(next, knownKeys, 'module.inventory.view')
    setIfKnown(next, knownKeys, 'module.products.view')
    setIfKnown(next, knownKeys, 'module.products.edit')
  }

  return next
}

async function createSecondaryAuthUser(email, password) {
  if (!firebaseEnabled) return { ok: false, error: 'Secure account creation is not available right now.' }
  const secondaryApp = initializeApp(firebaseConfig, `staff-create-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    console.warn('[AUTO LOGOUT TRACE]', {
      file: 'src/crm/hooks/useStaffPermissions.js',
      function: 'createSecondaryAuthUser',
      reason: 'secondary_auth_cleanup_after_staff_user_create',
      route: window.location.pathname,
      uid: secondaryAuth?.currentUser?.uid,
      email: secondaryAuth?.currentUser?.email,
      time: new Date().toISOString(),
      stack: new Error().stack,
    })
    await signOut(secondaryAuth).catch(() => {})
    return { ok: true, uid: credentials.user.uid }
  } catch (error) {
    const code = error?.code || ''
    const emailInUse = code === 'auth/email-already-in-use'
    return {
      ok: false,
      code,
      emailInUse,
      error: emailInUse
        ? 'This email already exists in Firebase Auth. Delete old staff access completely or use another email.'
        : clientSafeMessage(error, 'Unable to create staff account.'),
    }
  } finally {
    await deleteApp(secondaryApp).catch(() => {})
  }
}

export function useStaffPermissions() {
  const { userId, workspaceId, businessType, userDoc, workspaceDoc, firebaseUser, plan, accessPlan } = useUser()
  const access = useWorkspaceAccess()
  const currentPermissionKeys = useMemo(() => workspacePermissionKeysForBusiness(businessType, accessPlan || plan), [accessPlan, businessType, plan])
  const [staff, setStaff] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !userId || !access.isAdmin) {
      Promise.resolve().then(() => {
        setStaff([])
        setPermissions({})
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const staffRef = collection(db, 'workspaces', workspaceId, 'staff')
    const permissionsRef = collection(db, 'workspaces', workspaceId, 'permissions')
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        setStaff(snap.docs.map((item) => ({ id: item.id, ...item.data() })))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load staff.'))
        setStaff([])
        setLoading(false)
      },
    )
    const unsubPermissions = onSnapshot(
      permissionsRef,
      (snap) => {
        setPermissions(Object.fromEntries(snap.docs.map((item) => [item.id, permissionsForBusiness(item.data(), businessType, currentPermissionKeys)])))
      },
      () => setPermissions({}),
    )

    return () => {
      unsubStaff()
      unsubPermissions()
    }
  }, [access.isAdmin, businessType, currentPermissionKeys, userId, workspaceId])

  return useMemo(
    () => ({
      staff,
      permissions,
      loading,
      error,
      canManage: access.isAdmin,
      permissionKeys: currentPermissionKeys,
      async createStaff(payload) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can create staff.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }

        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim().toLowerCase()
        const username = String(payload.username || '').trim()
        const usernameLower = username.toLowerCase()
        const password = String(payload.password || '')
        const confirmPassword = String(payload.confirmPassword || '')
        const role = normalizeStaffRole(payload.role)
        const status = String(payload.status || 'active').trim().toLowerCase() || 'active'
        const currentEmail = String(firebaseUser?.email || userDoc?.email || '').trim().toLowerCase()
        if (!name) return { ok: false, error: 'Staff name is required.' }
        if (!email) return { ok: false, error: 'Staff email is required.' }
        if (currentEmail && email === currentEmail) return { ok: false, error: 'Owner/admin email ko staff invite me use nahi kar sakte. Staff ke liye separate email use karein.' }
        if (!password) return { ok: false, error: 'Password is required.' }
        if (password !== confirmPassword) return { ok: false, error: 'Passwords do not match.' }
        if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

        const authResult = await createSecondaryAuthUser(email, password)
        if (!authResult.ok) return { ok: false, error: authResult.error || 'Unable to create Firebase login for this staff email.', code: authResult.code || '' }
        const staffId = authResult.uid || payload.staffId || `staff-${slug(email) || Date.now()}`
        const basePermissions = applyPermissionDependencies({ ...defaultPermissions(currentPermissionKeys), ...(payload.permissions || {}) }, currentPermissionKeys)
        const businessKey = businessPermissionKey(businessType)
        const now = serverTimestamp()
        const workspaceName = workspaceDoc?.companyName || workspaceDoc?.schoolName || workspaceDoc?.name || userDoc?.companyName || 'Nexora Workspace'
        const invitedBy = userDoc?.fullName || userDoc?.name || firebaseUser?.displayName || firebaseUser?.email || 'Workspace admin'
        const normalizedBusinessType = normalizeBusinessType(businessType)
        const selectedWorkspace = businessWorkspaceForType(normalizedBusinessType).id
        const allowedModules = currentPermissionKeys
          .filter((item) => item.action === 'view' && basePermissions[item.key])
          .map((item) => item.moduleLabel || item.label)
          .filter(Boolean)
        const enabledModules = Array.from(new Set(
          currentPermissionKeys
            .filter((item) => item.action === 'view' && basePermissions[item.key])
            .map((item) => item.moduleKey)
            .filter(Boolean),
        ))
        const emailTemplate = staffInvitationEmail({
          staffName: name,
          staffEmail: email,
          temporaryPassword: password,
          role,
          workspaceName,
          businessType: normalizedBusinessType,
          invitedBy,
          modules: allowedModules,
          loginUrl: `${window.location.origin}/login`,
        })
        const baseStaff = {
          uid: staffId,
          staffId,
          name,
          email,
          username,
          usernameLower,
          role,
          status,
          isStaff: true,
          isOwner: false,
          isAdmin: false,
          permissions: basePermissions,
          businessType: normalizedBusinessType,
          selectedBusinessType: normalizedBusinessType,
          currentBusinessType: normalizedBusinessType,
          primaryBusinessType: normalizedBusinessType,
          allowedBusinessTypes: [normalizedBusinessType],
          selectedWorkspace,
          enabledModules,
          businessPermissions: { [businessKey]: basePermissions },
          ownerId: workspaceId,
          companyId: workspaceId,
          workspaceId,
          userId: staffId,
          createdBy: userId,
          passwordSetPending: false,
          inviteStatus: 'sent',
          emailVerifiedCustom: true,
          onboardingCompleted: true,
          invitedAt: now,
          invitedBy: userId,
          authCreated: authResult.ok,
          createdAt: now,
          updatedAt: now,
        }
        const staffUserProfile = {
          ...baseStaff,
          fullName: name,
          displayName: name,
          plan: userDoc?.plan || plan || 'Free',
          planStatus: userDoc?.planStatus || 'active',
          billingCycle: userDoc?.billingCycle || 'monthly',
          provider: 'password',
        }

        const writes = [
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), baseStaff, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), baseStaff, { merge: true }),
          setDoc(doc(db, 'staffInviteClaims', staffId), baseStaff, { merge: true }),
          setDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(email)), baseStaff, { merge: true }),
          setDoc(
            doc(db, 'workspaces', workspaceId, 'permissions', staffId),
            {
              ...basePermissions,
              businessType: normalizeBusinessType(businessType),
              businessPermissions: { [businessKey]: basePermissions },
              staffId,
              email,
              ownerId: workspaceId,
              workspaceId,
              userId: staffId,
              updatedBy: userId,
              updatedAt: now,
            },
            { merge: true },
          ),
        ]

        if (authResult.ok) {
          writes.push(
            setDoc(
              doc(db, 'users', staffId),
              staffUserProfile,
              { merge: true },
            ),
          )
        }

        await Promise.all(writes)
        const inviteEmail = authResult.ok
          ? await sendWorkerEmail({ to: email, ...emailTemplate })
          : { ok: false, error: authResult.error || 'Auth user was not created.' }
        const inviteEmailPatch = {
          inviteEmailStatus: inviteEmail.ok ? 'sent' : 'failed',
          inviteEmailError: inviteEmail.ok ? '' : inviteEmail.error || 'Email could not be sent.',
          inviteEmailSentAt: inviteEmail.ok ? serverTimestamp() : null,
          updatedAt: serverTimestamp(),
        }
        const inviteProfilePatch = { ...staffUserProfile, ...inviteEmailPatch }
        await Promise.all([
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), inviteEmailPatch, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), inviteEmailPatch, { merge: true }),
          setDoc(doc(db, 'staffInviteClaims', staffId), inviteProfilePatch, { merge: true }),
          setDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(email)), inviteProfilePatch, { merge: true }),
          authResult.ok ? setDoc(doc(db, 'users', staffId), inviteProfilePatch, { merge: true }) : Promise.resolve(),
        ])

        await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff invite sent',
            module: 'Team',
            description: `${name} was invited as ${role}.`,
            targetId: staffId,
            targetName: name,
            metadata: { email, username, role, authCreated: authResult.ok, emailSent: inviteEmail.ok === true, emailError: inviteEmail.ok ? '' : inviteEmail.error || '' },
        })
        return {
          ok: true,
          message: authResult.ok
            ? inviteEmail.ok
              ? 'Invite email sent. Staff can log in from their email.'
              : 'Staff login created, but invitation email could not be sent.'
            : 'Invite saved. Full login activation may require account approval.',
          emailSent: inviteEmail.ok === true,
          emailError: inviteEmail.ok ? '' : inviteEmail.error || '',
        }
      },
      async setStaffPermission(staffId, key, value) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff permissions.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        if (!currentPermissionKeys.some((item) => item.key === key)) return { ok: false, error: 'Unknown permission.' }
        const staffRow = staff.find((item) => item.id === staffId)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(staffId) === ownerId ||
          (String(staffId) === String(userId) && String(staffRow?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf && value === false) {
          return { ok: false, error: 'Workspace owner cannot be disabled or downgraded.' }
        }
        const existing = permissions[staffId] || {}
        const { __businessPermissions, ...existingCurrentPermissions } = existing
        const businessKey = businessPermissionKey(businessType)
        const existingBusinessPermissions = __businessPermissions || staffRow?.businessPermissions || {}
        const nextCurrentPermissions = applyPermissionDependencies(
          {
            ...defaultPermissions(currentPermissionKeys),
            ...existingCurrentPermissions,
            [key]: Boolean(value),
          },
          currentPermissionKeys,
        )
        const nextBusinessPermissions = {
          ...existingBusinessPermissions,
          [businessKey]: nextCurrentPermissions,
        }
        await setDoc(
          doc(db, 'workspaces', workspaceId, 'permissions', staffId),
          {
            ...rootPermissionUnion(existing, nextBusinessPermissions, currentPermissionKeys),
            businessType: normalizeBusinessType(businessType),
            businessPermissions: nextBusinessPermissions,
            staffId,
            email: staffRow?.email || '',
            ownerId: workspaceId,
            workspaceId,
            userId: staffId,
            updatedBy: userId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        await logActivity({
          workspaceId,
          userId,
          businessType,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Staff permission updated',
          module: 'Team',
          description: `${key} permission ${value ? 'enabled' : 'disabled'} for ${staffRow?.name || staffId}.`,
          targetId: staffId,
          targetName: staffRow?.name || staffId,
          metadata: { permission: key, enabled: Boolean(value) },
        })
        return { ok: true }
      },
      async resendStaffInvite(staffId) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can resend staff invites.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        if (!staffRow) return { ok: false, error: 'Staff record was not found.' }
        const email = String(staffRow.email || '').trim().toLowerCase()
        if (!email) return { ok: false, error: 'Staff email is missing.' }

        const resolvedRowPermissions = applyPermissionDependencies(
          permissionsWithModuleFallback(permissions[staffId] || staffRow.permissions || {}, staffRow.enabledModules, currentPermissionKeys),
          currentPermissionKeys,
        )
        const { __businessPermissions: _businessPermissionsMarker, ...rowPermissions } = resolvedRowPermissions
        const workspaceName = workspaceDoc?.companyName || workspaceDoc?.schoolName || workspaceDoc?.name || userDoc?.companyName || 'Nexora Workspace'
        const invitedBy = userDoc?.fullName || userDoc?.name || firebaseUser?.displayName || firebaseUser?.email || 'Workspace admin'
        const allowedModules = currentPermissionKeys
          .filter((item) => item.action === 'view' && rowPermissions[item.key])
          .map((item) => item.moduleLabel || item.label)
          .filter(Boolean)
        const emailTemplate = staffInvitationEmail({
          staffName: staffRow.name || 'Staff User',
          staffEmail: email,
          temporaryPassword: '',
          role: normalizeStaffRole(staffRow.role),
          workspaceName,
          businessType: normalizeBusinessType(businessType),
          invitedBy,
          modules: allowedModules,
          loginUrl: `${window.location.origin}/login`,
        })
        const inviteEmail = await sendWorkerEmail({ to: email, ...emailTemplate })
        const inviteEmailPatch = {
          inviteEmailStatus: inviteEmail.ok ? 'sent' : 'failed',
          inviteEmailError: inviteEmail.ok ? '' : inviteEmail.error || 'Email could not be sent.',
          inviteEmailSentAt: inviteEmail.ok ? serverTimestamp() : null,
          inviteStatus: 'sent',
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        }
        const normalizedBusinessType = normalizeBusinessType(staffRow.businessType || businessType)
        const businessKey = businessPermissionKey(normalizedBusinessType)
        const selectedWorkspace = staffRow.selectedWorkspace || businessWorkspaceForType(normalizedBusinessType).id
        const inviteProfilePatch = {
          ...staffRow,
          uid: staffId,
          staffId,
          userId: staffId,
          email,
          role: normalizeStaffRole(staffRow.role),
          status: String(staffRow.status || 'active').trim().toLowerCase() || 'active',
          isStaff: true,
          isOwner: false,
          isAdmin: false,
          permissions: rowPermissions,
          businessPermissions: staffRow.businessPermissions || { [businessKey]: rowPermissions },
          businessType: normalizedBusinessType,
          selectedBusinessType: staffRow.selectedBusinessType || normalizedBusinessType,
          currentBusinessType: staffRow.currentBusinessType || normalizedBusinessType,
          primaryBusinessType: staffRow.primaryBusinessType || normalizedBusinessType,
          allowedBusinessTypes: Array.isArray(staffRow.allowedBusinessTypes) && staffRow.allowedBusinessTypes.length ? staffRow.allowedBusinessTypes : [normalizedBusinessType],
          selectedWorkspace,
          ownerId: workspaceId,
          companyId: workspaceId,
          workspaceId,
          emailVerifiedCustom: true,
          onboardingCompleted: true,
          ...inviteEmailPatch,
        }
        await Promise.all([
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), inviteEmailPatch, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), inviteEmailPatch, { merge: true }),
          setDoc(
            doc(db, 'workspaces', workspaceId, 'permissions', staffId),
            {
              ...rootPermissionUnion(rowPermissions, { [businessKey]: rowPermissions }, currentPermissionKeys),
              businessType: normalizedBusinessType,
              businessPermissions: { ...(staffRow.businessPermissions || {}), [businessKey]: rowPermissions },
              staffId,
              email,
              ownerId: workspaceId,
              workspaceId,
              userId: staffId,
              updatedBy: userId,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          setDoc(doc(db, 'staffInviteClaims', staffId), inviteProfilePatch, { merge: true }),
          setDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(email)), inviteProfilePatch, { merge: true }),
          setDoc(doc(db, 'users', staffId), inviteProfilePatch, { merge: true }),
          logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: inviteEmail.ok ? 'Staff invite email resent' : 'Staff invite email failed',
            module: 'Team',
            description: `${staffRow.name || email} invite email ${inviteEmail.ok ? 'resent' : 'failed to resend'}.`,
            targetId: staffId,
            targetName: staffRow.name || email,
            metadata: { email, emailSent: inviteEmail.ok === true, emailError: inviteEmail.ok ? '' : inviteEmail.error || '' },
          }),
        ])
        return inviteEmail.ok
          ? { ok: true, message: 'Invite email resent.' }
          : { ok: false, error: inviteEmail.error || 'Unable to resend invite email.' }
      },
      async setStaffStatus(staffId, status) {
        if (!access.isAdmin) return { ok: false, error: 'Only an owner or admin can update staff access.' }
        if (!db || !workspaceId || !userId) return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
        const staffRow = staff.find((item) => item.id === staffId)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(staffId) === ownerId ||
          (String(staffId) === String(userId) && String(staffRow?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf) {
          const now = serverTimestamp()
          await Promise.all([
            setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), { role: 'owner', status: 'active', updatedAt: now, updatedBy: userId }, { merge: true }),
            setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), { role: 'Owner', status: 'Active', updatedAt: now, updatedBy: userId }, { merge: true }),
            setDoc(doc(db, 'users', staffId), { role: 'owner', status: 'active', updatedAt: now, updatedBy: userId }, { merge: true }),
          ])
          return { ok: false, error: 'Workspace owner cannot be disabled or downgraded.' }
        }
        const nextStatus = String(status || 'active').trim().toLowerCase()
        const now = serverTimestamp()
        await Promise.all([
          setDoc(doc(db, 'workspaces', workspaceId, 'staff', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          setDoc(doc(db, 'users', staffId), { status: nextStatus, updatedAt: now, updatedBy: userId }, { merge: true }),
          logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: nextStatus === 'blocked' ? 'Staff blocked' : 'Staff access updated',
            module: 'Team',
            description: `${staffRow?.name || staffId} access set to ${nextStatus}.`,
            targetId: staffId,
            targetName: staffRow?.name || staffId,
            metadata: { status: nextStatus },
          }),
        ])
        return { ok: true }
      },
    }),
    [access, businessType, currentPermissionKeys, error, firebaseUser, loading, permissions, plan, staff, userDoc, userId, workspaceDoc, workspaceId],
  )
}
