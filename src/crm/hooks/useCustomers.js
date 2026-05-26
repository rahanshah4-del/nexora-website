import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeCustomer(c) {
  return {
    id: c.id,
    name: c.name || 'No name',
    email: c.email || '',
    phone: c.phone || '',
    company: c.company || '',
    customerType: c.customerType || 'General',
    status: c.status || 'Active',
    notes: c.notes || '',
    createdBy: c.createdBy || c.userId || '',
    createdAt: c.createdAt || null,
  }
}

export function useCustomers() {
  const { userId, workspaceId } = useUser()
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
    if (!workspaceId) {
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
      workspaceId,
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
  }, [workspaceId])

  const api = useMemo(
    () => ({
      customers: rows,
      loading,
      source,
      error,
      async createCustomer(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const name = String(payload.name || '').trim()
        const email = String(payload.email || '').trim()
        const phone = String(payload.phone || '').trim()
        const company = String(payload.company || '').trim()
        const customerType = String(payload.customerType || 'General').trim()
        const status = String(payload.status || 'Active').trim()
        const notes = String(payload.notes || '').trim()
        if (!name) return { ok: false, error: 'Name is required' }
        if (!email) return { ok: false, error: 'Email is required' }
        try {
          await createUserDoc(workspaceId, 'customers', {
            name,
            email,
            phone,
            company,
            customerType: customerType || 'General',
            status: status || 'Active',
            notes,
            createdBy: userId,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create customer' }
        }
      },
    }),
    [rows, loading, source, error, userId, workspaceId],
  )

  return api
}
