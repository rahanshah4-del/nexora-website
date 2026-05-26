import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeCustomer(c) {
  return {
    id: c.id,
    name: c.name || '—',
    company: c.company || '—',
    email: c.email || '',
    plan: c.plan || 'Free',
    status: c.status || 'Active',
    spendUsd: Number(c.spendUsd ?? 0) || 0,
    createdAt: c.createdAt || null,
  }
}

export function useCustomers() {
  const { userId } = useUser()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Firestore is not configured.')
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
    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })
    const unsub = subscribeUserCollection(
      userId,
      'customers',
      (data) => {
        setRows((Array.isArray(data) ? data : []).map(normalizeCustomer))
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load customers')
        setRows([])
        setLoading(false)
      },
    )
    return () => unsub?.()
  }, [userId])

  const api = useMemo(
    () => ({
      customers: rows,
      loading,
      source,
      error,
      async createCustomer(payload) {
        if (!userId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim()
        const company = String(payload.company || '').trim()
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
        if (!company) return { ok: false, error: 'Company is required' }
        try {
          await createUserDoc(userId, 'customers', {
            name,
            email,
            company,
            plan: payload.plan || 'Free',
            status: payload.status || 'Active',
            spendUsd: Number(payload.spendUsd || 0),
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create customer' }
        }
      },
    }),
    [rows, loading, source, error, userId],
  )

  return api
}
