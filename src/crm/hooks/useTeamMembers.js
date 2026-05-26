import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { permissionKeys } from '../data/teamDemo.js'
import { useUser } from './useUser.js'

function normalizeMember(m) {
  return {
    ...m,
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
  }
}

export function useTeamMembers() {
  const { userId } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('firestore')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('demo')
        setLoading(false)
      })
      return
    }
    if (!userId) {
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
      userId,
      'teamMembers',
      (data) => {
        const list = data.map(normalizeMember)
        setRows(list)
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load team members')
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [userId])

  const api = useMemo(
    () => ({
      members: rows,
      loading,
      source,
      error,
      permissionKeys,
      async addMember(payload) {
        if (!userId) return { ok: false, error: 'Please login first' }
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
          return { ok: false, error: 'Firestore is not configured' }
        }
        try {
          await createUserDoc(userId, 'teamMembers', {
            name,
            email,
            phone: docPayload.phone || '',
            role: docPayload.role || 'Sales Staff',
            status: docPayload.status || 'Invited',
            permissions: Array.isArray(docPayload.permissions) ? docPayload.permissions : [],
            joinedAt: docPayload.joinedAt,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to add team member' }
        }
      },
      async updateMember(id, patch) {
        setRows((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
        if (!db || !userId || source !== 'firestore') return
        await patchUserDoc(userId, 'teamMembers', id, patch)
      },
    }),
    [rows, loading, source, error, userId],
  )

  return api
}
