import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import {
  createUserDoc,
  patchUserDoc,
  removeUserDoc,
  subscribeUserCollection,
} from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function normalizeSupplier(supplier) {
  return {
    id: supplier.id,
    name: supplier.name || 'Unnamed supplier',
    company: supplier.company || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    taxId: supplier.taxId || '',
    openingBalance: Number(supplier.openingBalance ?? 0) || 0,
    notes: supplier.notes || '',
    status: supplier.status || 'active',
    createdAt: supplier.createdAt || null,
    updatedAt: supplier.updatedAt || null,
  }
}

function sanitizeSupplier(payload) {
  return {
    name: String(payload.name || '').trim(),
    company: String(payload.company || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    address: String(payload.address || '').trim(),
    taxId: String(payload.taxId || '').trim(),
    openingBalance: Number(payload.openingBalance ?? 0) || 0,
    notes: String(payload.notes || '').trim(),
    status: String(payload.status || 'active').trim() || 'active',
  }
}

export function useSuppliers() {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setSuppliers([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      'suppliers',
      (rows) => {
        setSuppliers((Array.isArray(rows) ? rows : []).map(normalizeSupplier))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load suppliers.'))
        setSuppliers([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, workspaceId])

  return useMemo(
    () => ({
      suppliers,
      loading,
      error,
      async createSupplier(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const supplier = sanitizeSupplier(payload)
        if (!supplier.name) return { ok: false, error: 'Supplier name is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'suppliers', { ...supplier, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Supplier created',
            module: 'Inventory',
            description: `${supplier.name} was added to suppliers.`,
            targetId: ref.id,
            targetName: supplier.name,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create supplier.') }
        }
      },
      async updateSupplier(id, payload) {
        if (!id) return { ok: false, error: 'Supplier ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const supplier = sanitizeSupplier(payload)
        if (!supplier.name) return { ok: false, error: 'Supplier name is required' }
        try {
          await patchUserDoc(workspaceId, 'suppliers', id, supplier, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Supplier updated',
            module: 'Inventory',
            description: `${supplier.name} supplier was updated.`,
            targetId: id,
            targetName: supplier.name,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update supplier.') }
        }
      },
      async deleteSupplier(id) {
        if (!id) return { ok: false, error: 'Supplier ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const supplier = suppliers.find((item) => item.id === id)
        try {
          await removeUserDoc(workspaceId, 'suppliers', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Supplier deleted',
            module: 'Inventory',
            description: `${supplier?.name || id} supplier was deleted.`,
            targetId: id,
            targetName: supplier?.name || id,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete supplier.') }
        }
      },
    }),
    [suppliers, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
