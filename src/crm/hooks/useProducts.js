import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name || 'Unnamed product',
    sku: product.sku || '',
    category: product.category || 'General',
    price: Number(product.price ?? 0) || 0,
    currency: product.currency || 'PKR',
    stockQuantity: Number(product.stockQuantity ?? product.stock ?? 0) || 0,
    status: product.status || 'active',
    createdBy: product.createdBy || product.userId || '',
    createdAt: product.createdAt || null,
  }
}

function sanitizeProduct(payload) {
  return {
    name: String(payload.name || '').trim(),
    sku: String(payload.sku || '').trim(),
    category: String(payload.category || 'General').trim(),
    price: Number(payload.price ?? 0) || 0,
    currency: String(payload.currency || 'PKR').trim() || 'PKR',
    stockQuantity: Number(payload.stockQuantity ?? 0) || 0,
    status: String(payload.status || 'active').trim() || 'active',
  }
}

export function useProducts() {
  const { userId, workspaceId } = useUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setProducts([])
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }

    if (!workspaceId) {
      Promise.resolve().then(() => {
        setProducts([])
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
      'products',
      (rows) => {
        setProducts((Array.isArray(rows) ? rows : []).map(normalizeProduct))
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load products')
        setProducts([])
        setLoading(false)
      },
    )

    return () => unsub?.()
  }, [workspaceId])

  return useMemo(
    () => ({
      products,
      loading,
      source,
      error,
      async createProduct(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const product = sanitizeProduct(payload)
        if (!product.name) return { ok: false, error: 'Product name is required' }
        if (!product.sku) return { ok: false, error: 'SKU is required' }
        try {
          await createUserDoc(workspaceId, 'products', {
            ...product,
            createdBy: userId,
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to create product' }
        }
      },
      async updateProduct(id, payload) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        const product = sanitizeProduct(payload)
        if (!product.name) return { ok: false, error: 'Product name is required' }
        if (!product.sku) return { ok: false, error: 'SKU is required' }
        try {
          await patchUserDoc(workspaceId, 'products', id, product)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to update product' }
        }
      },
      async deleteProduct(id) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Firestore is not configured' }
        try {
          await removeUserDoc(workspaceId, 'products', id)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e?.message || 'Failed to delete product' }
        }
      },
    }),
    [products, loading, source, error, userId, workspaceId],
  )
}
