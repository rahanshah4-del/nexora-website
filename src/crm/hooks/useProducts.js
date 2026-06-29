import { useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'

function normalizeProduct(product) {
  return {
    id: product.id,
    imageUrl: product.imageUrl || '',
    name: product.name || 'Unnamed product',
    sku: product.sku || '',
    barcode: product.barcode || '',
    category: product.category || 'General',
    brand: product.brand || '',
    costPrice: Number(product.costPrice ?? 0) || 0,
    price: Number(product.price ?? product.sellingPrice ?? 0) || 0,
    currency: product.currency || 'PKR',
    stockQuantity: Number(product.stockQuantity ?? product.stock ?? 0) || 0,
    minStockAlert: Number(product.minStockAlert ?? product.reorderPoint ?? 5) || 0,
    taxRate: Number(product.taxRate ?? product.tax ?? 0) || 0,
    discount: Number(product.discount ?? 0) || 0,
    productType: product.productType || product.type || 'product',
    description: product.description || '',
    warehouse: product.warehouse || '',
    branch: product.branch || '',
    supplier: product.supplier || '',
    stockHistory: Array.isArray(product.stockHistory) ? product.stockHistory : [],
    status: product.status || 'active',
    createdBy: product.createdBy || product.userId || '',
    createdAt: product.createdAt || null,
    updatedAt: product.updatedAt || null,
  }
}

function sanitizeProduct(payload) {
  return {
    imageUrl: String(payload.imageUrl || '').trim(),
    name: String(payload.name || '').trim(),
    sku: String(payload.sku || '').trim(),
    barcode: String(payload.barcode || '').trim(),
    category: String(payload.category || 'General').trim(),
    brand: String(payload.brand || '').trim(),
    costPrice: Number(payload.costPrice ?? 0) || 0,
    price: Number(payload.price ?? payload.sellingPrice ?? 0) || 0,
    currency: String(payload.currency || 'PKR').trim() || 'PKR',
    stockQuantity: Number(payload.stockQuantity ?? 0) || 0,
    minStockAlert: Number(payload.minStockAlert ?? 0) || 0,
    taxRate: Number(payload.taxRate ?? payload.tax ?? 0) || 0,
    discount: Number(payload.discount ?? 0) || 0,
    productType: String(payload.productType || payload.type || 'product').trim() || 'product',
    description: String(payload.description || '').trim(),
    warehouse: String(payload.warehouse || '').trim(),
    branch: String(payload.branch || '').trim(),
    supplier: String(payload.supplier || '').trim(),
    status: String(payload.status || 'active').trim() || 'active',
  }
}

export function useProducts(options = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : null
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setProducts([])
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setProducts([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
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
        setError(clientSafeMessage(err, 'Unable to load products.'))
        setProducts([])
        setLoading(false)
      },
      { businessType, orderByField: limitCount ? 'createdAt' : '', orderDirection: 'desc', limitCount },
    )

    return () => unsub?.()
  }, [businessType, enabled, limitCount, workspaceId])

  return useMemo(
    () => ({
      products,
      loading,
      source,
      error,
      async createProduct(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const product = sanitizeProduct(payload)
        if (!product.name) return { ok: false, error: 'Product name is required' }
        if (!product.sku) return { ok: false, error: 'SKU is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'products', {
            ...product,
            stockHistory: [
              {
                type: 'created',
                quantity: product.stockQuantity,
                note: 'Initial stock',
                createdAt: new Date().toISOString(),
                createdBy: userId,
              },
            ],
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Product created',
            module: 'Products',
            description: `${product.name} was added to products.`,
            targetId: ref.id,
            targetName: product.name,
            metadata: { sku: product.sku, category: product.category, price: product.price, productType: product.productType },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: product.stockQuantity <= product.minStockAlert ? 'high' : 'low',
            title: 'Product created',
            message: `${product.name} was added to products.`,
            relatedId: ref.id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create product.') }
        }
      },
      async updateProduct(id, payload) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const product = sanitizeProduct(payload)
        if (!product.name) return { ok: false, error: 'Product name is required' }
        if (!product.sku) return { ok: false, error: 'SKU is required' }
        try {
          const current = products.find((item) => item.id === id)
          const stockChanged = current && Number(current.stockQuantity) !== Number(product.stockQuantity)
          await patchUserDoc(workspaceId, 'products', id, {
            ...product,
            updatedAt: serverTimestamp(),
            ...(stockChanged
              ? {
                  stockHistory: [
                    ...(current.stockHistory || []),
                    {
                      type: 'manual_adjustment',
                      previousQuantity: Number(current.stockQuantity) || 0,
                      quantity: product.stockQuantity,
                      delta: product.stockQuantity - (Number(current.stockQuantity) || 0),
                      note: 'Product workspace update',
                      createdAt: new Date().toISOString(),
                      createdBy: userId,
                    },
                  ],
                }
              : {}),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Product updated',
            module: 'Products',
            description: `${product.name} was updated.`,
            targetId: id,
            targetName: product.name,
            metadata: { sku: product.sku, category: product.category, price: product.price, productType: product.productType },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: stockChanged && product.stockQuantity <= product.minStockAlert ? 'high' : 'low',
            title: stockChanged ? 'Product stock updated' : 'Product updated',
            message: `${product.name} was updated.`,
            relatedId: id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update product.') }
        }
      },
      async deleteProduct(id) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const product = products.find((item) => item.id === id)
        try {
          await removeUserDoc(workspaceId, 'products', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Product deleted',
            module: 'Products',
            description: `${product?.name || id} was deleted.`,
            targetId: id,
            targetName: product?.name || id,
            metadata: { sku: product?.sku || '' },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Product deleted',
            message: `${product?.name || id} was deleted.`,
            relatedId: id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete product.') }
        }
      },
      async duplicateProduct(id) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const original = products.find((item) => item.id === id)
        if (!original) return { ok: false, error: 'Product not found' }
        const product = sanitizeProduct({
          ...original,
          name: `${original.name} Copy`,
          sku: original.sku ? `${original.sku}-COPY` : '',
          status: 'active',
        })
        try {
          const ref = await createUserDoc(workspaceId, 'products', {
            ...product,
            stockHistory: [
              {
                type: 'duplicated',
                quantity: product.stockQuantity,
                note: `Duplicated from ${original.name}`,
                createdAt: new Date().toISOString(),
                createdBy: userId,
              },
            ],
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Product duplicated',
            module: 'Products',
            description: `${original.name} was duplicated.`,
            targetId: ref.id,
            targetName: product.name,
            metadata: { sourceId: id, sku: product.sku },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Product duplicated',
            message: `${original.name} was duplicated.`,
            relatedId: ref.id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to duplicate product.') }
        }
      },
      async archiveProduct(id) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const product = products.find((item) => item.id === id)
        try {
          await patchUserDoc(workspaceId, 'products', id, {
            status: 'archived',
            updatedAt: serverTimestamp(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Product archived',
            module: 'Products',
            description: `${product?.name || id} was archived.`,
            targetId: id,
            targetName: product?.name || id,
            metadata: { sku: product?.sku || '' },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Product archived',
            message: `${product?.name || id} was archived.`,
            relatedId: id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to archive product.') }
        }
      },
    }),
    [products, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
