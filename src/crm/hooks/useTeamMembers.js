import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { permissionKeysForBusiness } from '../data/moduleAccess.js'

function normalizeMember(m) {
  return {
    ...m,
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
  }
}

const OWNER_PROTECTION_MESSAGE = 'Workspace owner cannot be disabled or downgraded.'

function staffInviteEmailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'staff-email'
}

async function removeStaffAccessRecords(workspaceId, member) {
  if (!db || !workspaceId || !member) return
  const ids = new Set([member.id, member.uid, member.userId, member.staffId].filter(Boolean).map(String))
  const email = String(member.email || '').trim().toLowerCase()
  const disabledProfileBase = {
    name: member.name || member.fullName || 'Staff User',
    fullName: member.fullName || member.name || 'Staff User',
    displayName: member.displayName || member.name || member.fullName || 'Staff User',
    email,
    username: member.username || '',
    usernameLower: String(member.username || '').trim().toLowerCase(),
    role: String(member.role || 'staff').trim().toLowerCase() === 'owner' ? 'staff' : String(member.role || 'staff').trim().toLowerCase(),
    status: 'disabled',
    createdBy: member.createdBy || '',
    inviteStatus: 'revoked',
    permissions: member.permissions && typeof member.permissions === 'object' && !Array.isArray(member.permissions) ? member.permissions : {},
    businessPermissions: member.businessPermissions && typeof member.businessPermissions === 'object' ? member.businessPermissions : {},
    businessType: member.businessType || '',
    selectedBusinessType: member.selectedBusinessType || member.businessType || '',
    currentBusinessType: member.currentBusinessType || member.businessType || '',
    primaryBusinessType: member.primaryBusinessType || member.businessType || '',
    allowedBusinessTypes: Array.isArray(member.allowedBusinessTypes) ? member.allowedBusinessTypes : [],
    selectedWorkspace: member.selectedWorkspace || '',
    enabledModules: Array.isArray(member.enabledModules) ? member.enabledModules : [],
    plan: member.plan || 'Free',
    planStatus: member.planStatus || 'active',
    billingCycle: member.billingCycle || 'monthly',
    provider: member.provider || 'password',
    emailVerifiedCustom: true,
    onboardingCompleted: true,
    workspaceId,
    ownerId: workspaceId,
    companyId: workspaceId,
  }
  const deletes = []

  for (const id of ids) {
    deletes.push(deleteDoc(doc(db, 'workspaces', workspaceId, 'staff', id)).catch(() => {}))
    deletes.push(deleteDoc(doc(db, 'workspaces', workspaceId, 'permissions', id)).catch(() => {}))
    deletes.push(deleteDoc(doc(db, 'staffInviteClaims', id)).catch(() => {}))
    deletes.push(setDoc(doc(db, 'users', id), {
      ...disabledProfileBase,
      uid: id,
      userId: id,
      staffId: id,
      email,
    }))
  }

  if (email) {
    deletes.push(deleteDoc(doc(db, 'staffInviteEmails', staffInviteEmailKey(email))).catch(() => {}))
    for (const collectionName of ['staff', 'permissions']) {
      const snap = await getDocs(query(collection(db, 'workspaces', workspaceId, collectionName), where('email', '==', email))).catch(() => null)
      snap?.docs?.forEach((item) => {
        deletes.push(deleteDoc(item.ref).catch(() => {}))
        const data = item.data() || {}
        ;[item.id, data.uid, data.userId, data.staffId].filter(Boolean).forEach((id) => ids.add(String(id)))
      })
    }
  }

  for (const id of ids) {
    deletes.push(deleteDoc(doc(db, 'staffInviteClaims', id)).catch(() => {}))
    deletes.push(setDoc(doc(db, 'users', id), {
      ...disabledProfileBase,
      uid: id,
      userId: id,
      staffId: id,
      email,
    }))
  }

  await Promise.all(deletes)
}

function logTeamPermissionIssue(error, details = {}) {
  console.warn('[Team Management Permission Debug]', {
    currentUserUid: details.userId || '',
    role: details.role || '',
    workspaceId: details.workspaceId || '',
    collectionPath: details.collectionPath || '',
    operation: details.operation || '',
    firestoreErrorCode: error?.code || error?.originalError?.code || 'unknown',
    message: error?.message || '',
  })
}

export function useTeamMembers() {
  const { userId, workspaceId, businessType, userDoc, workspaceDoc, firebaseUser, accessPlan } = useUser()
  const currentRole = String(userDoc?.role || workspaceDoc?.role || '')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('firestore')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeUserCollection(
      workspaceId,
      'teamMembers',
      (data) => {
        const list = data.map(normalizeMember)
        setRows(list)
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        logTeamPermissionIssue(err, {
          userId,
          role: currentRole,
          workspaceId,
          collectionPath: `workspaces/${workspaceId}/teamMembers`,
          operation: 'read',
        })
        setError(clientSafeMessage(err, 'Unable to load team members.'))
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
      { businessType },
    )
    return () => unsub()
  }, [businessType, workspaceId])

  const api = useMemo(
    () => ({
      members: rows,
      loading,
      source,
      error,
      permissionKeys: permissionKeysForBusiness({ businessType, plan: accessPlan, teamOverride: true }).map((permission) => permission.label),
      async addMember(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const docPayload = {
          ...payload,
          status: payload.status || 'Invited',
          joinedAt: payload.joinedAt || new Date().toISOString().slice(0, 10),
          lastActive: payload.lastActive || '—',
          performanceScore: payload.performanceScore ?? 0,
        }
        const name = String(docPayload.name || '').trim()
        const email = String(docPayload.email || '').trim()
        const emailLower = email.toLowerCase()
        const currentEmail = String(firebaseUser?.email || userDoc?.email || '').trim().toLowerCase()
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
        if (currentEmail && emailLower === currentEmail) return { ok: false, error: 'Owner/admin email ko staff member ke tor par add nahi kar sakte. Separate staff email use karein.' }
        if (rows.some((item) => String(item.email || '').trim().toLowerCase() === emailLower)) return { ok: false, error: 'This email is already added as a team member.' }
        if (!db) {
          setRows((prev) => [{ id: `TM-${String(prev.length + 1).padStart(3, '0')}`, ...docPayload }, ...prev])
          return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        }
        try {
          const ref = await createUserDoc(workspaceId, 'teamMembers', {
            name,
            email,
            phone: docPayload.phone || '',
            role: docPayload.role || 'Sales Staff',
            status: docPayload.status || 'Invited',
            permissions: Array.isArray(docPayload.permissions) ? docPayload.permissions : [],
            joinedAt: docPayload.joinedAt,
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff created',
            module: 'Team',
            description: `${name} was added to the team.`,
            targetId: ref.id,
            targetName: name,
            metadata: { email, role: docPayload.role || 'Sales Staff' },
          })
          return { ok: true }
        } catch (e) {
          logTeamPermissionIssue(e, {
            userId,
            role: currentRole,
            workspaceId,
            collectionPath: `workspaces/${workspaceId}/teamMembers`,
            operation: 'create',
          })
          return { ok: false, error: clientSafeMessage(e, 'Unable to add team member.') }
        }
      },
      async updateMember(id, patch) {
        const member = rows.find((item) => item.id === id)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(id) === ownerId ||
          (String(id) === String(userId) && String(member?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        const safePatch = isOwnerSelf
          ? {
              ...patch,
              role: 'Owner',
              status: 'Active',
              permissions: permissionKeysForBusiness({ businessType, plan: accessPlan, teamOverride: true }).map((permission) => permission.label),
            }
          : patch
        setRows((prev) => prev.map((m) => (m.id === id ? { ...m, ...safePatch } : m)))
        if (!db || !workspaceId || !userId || source !== 'firestore') {
          return { ok: true, ...(isOwnerSelf ? { message: OWNER_PROTECTION_MESSAGE } : {}) }
        }
        try {
          await patchUserDoc(workspaceId, 'teamMembers', id, safePatch, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff updated',
            module: 'Team',
            description: `${member?.name || 'Team member'} was updated.`,
            targetId: id,
            targetName: member?.name || id,
            metadata: safePatch,
          })
          return { ok: true, ...(isOwnerSelf ? { message: OWNER_PROTECTION_MESSAGE } : {}) }
        } catch (e) {
          logTeamPermissionIssue(e, {
            userId,
            role: currentRole,
            workspaceId,
            collectionPath: `workspaces/${workspaceId}/teamMembers/${id}`,
            operation: 'update',
          })
          return { ok: false, error: clientSafeMessage(e, 'Unable to update team member.') }
        }
      },
      async deleteMember(id) {
        const member = rows.find((item) => item.id === id)
        const ownerId = String(workspaceDoc?.ownerId || workspaceId || userId || '')
        const isOwnerSelf =
          String(id) === ownerId ||
          (String(id) === String(userId) && String(member?.email || '').toLowerCase() === String(firebaseUser?.email || userDoc?.email || '').toLowerCase())
        if (isOwnerSelf) return { ok: false, error: OWNER_PROTECTION_MESSAGE }
        setRows((prev) => prev.filter((m) => m.id !== id))
        if (!db || !workspaceId || !userId || source !== 'firestore') return { ok: true }
        try {
          await removeStaffAccessRecords(workspaceId, member)
          await removeUserDoc(workspaceId, 'teamMembers', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff deleted',
            module: 'Team',
            description: `${member?.name || 'Team member'} was removed from the team and staff access board.`,
            targetId: id,
            targetName: member?.name || id,
            metadata: { email: member?.email || '' },
          })
          return { ok: true }
        } catch (e) {
          logTeamPermissionIssue(e, {
            userId,
            role: currentRole,
            workspaceId,
            collectionPath: `workspaces/${workspaceId}/teamMembers/${id}`,
            operation: 'delete',
          })
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete team member.') }
        }
      },
    }),
    [rows, loading, source, error, accessPlan, businessType, currentRole, firebaseUser, userDoc, userId, workspaceDoc, workspaceId],
  )

  return api
}
