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

function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name || 'Untitled category',
    description: category.description || '',
    status: category.status || 'active',
    createdAt: category.createdAt || null,
    updatedAt: category.updatedAt || null,
  }
}

function sanitizeCategory(payload) {
  return {
    name: String(payload.name || '').trim(),
    description: String(payload.description || '').trim(),
    status: String(payload.status || 'active').trim() || 'active',
  }
}

export function useCategories() {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setCategories([])
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
      'categories',
      (rows) => {
        setCategories((Array.isArray(rows) ? rows : []).map(normalizeCategory))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load categories.'))
        setCategories([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, workspaceId])

  return useMemo(
    () => ({
      categories,
      loading,
      error,
      async createCategory(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const category = sanitizeCategory(payload)
        if (!category.name) return { ok: false, error: 'Category name is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'categories', { ...category, createdBy: userId }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Category created',
            module: 'Inventory',
            description: `${category.name} category was added.`,
            targetId: ref.id,
            targetName: category.name,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create category.') }
        }
      },
      async updateCategory(id, payload) {
        if (!id) return { ok: false, error: 'Category ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const category = sanitizeCategory(payload)
        if (!category.name) return { ok: false, error: 'Category name is required' }
        try {
          await patchUserDoc(workspaceId, 'categories', id, category, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Category updated',
            module: 'Inventory',
            description: `${category.name} category was updated.`,
            targetId: id,
            targetName: category.name,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update category.') }
        }
      },
      async deleteCategory(id) {
        if (!id) return { ok: false, error: 'Category ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const category = categories.find((item) => item.id === id)
        try {
          await removeUserDoc(workspaceId, 'categories', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Category deleted',
            module: 'Inventory',
            description: `${category?.name || id} category was deleted.`,
            targetId: id,
            targetName: category?.name || id,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete category.') }
        }
      },
    }),
    [categories, loading, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
