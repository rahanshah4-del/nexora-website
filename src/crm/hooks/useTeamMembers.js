import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { permissionKeys } from '../data/teamDemo.js'
import { useUser } from './useUser.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'

function normalizeMember(m) {
  return {
    ...m,
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
  }
}

export function useTeamMembers() {
  const { userId, workspaceId, userDoc, firebaseUser } = useUser()
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
    )
    return () => unsub()
  }, [workspaceId])

  const api = useMemo(
    () => ({
      members: rows,
      loading,
      source,
      error,
      permissionKeys,
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
          })
          await logActivity({
            workspaceId,
            userId,
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
        setRows((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
        if (!db || !workspaceId || !userId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'teamMembers', id, patch)
        const member = rows.find((item) => item.id === id)
        await logActivity({
          workspaceId,
          userId,
          ...userActivityInfo(userDoc, firebaseUser),
          action: 'Staff updated',
          module: 'Team',
          description: `${member?.name || 'Team member'} was updated.`,
          targetId: id,
          targetName: member?.name || id,
          metadata: patch,
        })
      },
    }),
    [rows, loading, source, error, firebaseUser, userDoc, userId, workspaceId],
  )

  return api
}
