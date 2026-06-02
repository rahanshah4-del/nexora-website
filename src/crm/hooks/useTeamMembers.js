import { useEffect, useMemo, useState } from 'react'
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

export function useTeamMembers() {
  const { userId, workspaceId, businessType, userDoc, workspaceDoc, firebaseUser, accessPlan } = useUser()
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
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
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
          await removeUserDoc(workspaceId, 'teamMembers', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Staff deleted',
            module: 'Team',
            description: `${member?.name || 'Team member'} was removed from the team.`,
            targetId: id,
            targetName: member?.name || id,
            metadata: { email: member?.email || '' },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete team member.') }
        }
      },
    }),
    [rows, loading, source, error, accessPlan, businessType, firebaseUser, userDoc, userId, workspaceDoc, workspaceId],
  )

  return api
}
