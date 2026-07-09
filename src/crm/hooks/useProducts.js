import { useEffect, useMemo, useRef, useState } from 'react'
import { arrayUnion, collection, doc, getDocs, limit, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

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
    seedSource: product.seedSource || '',
    seedKey: product.seedKey || '',
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
    seedSource: String(payload.seedSource || '').trim(),
    seedKey: String(payload.seedKey || '').trim(),
  }
}

/**
 * Check whether sku or barcode already exists on another product in the same
 * workspace + businessType scope.
 * @returns {string|undefined} error message, or undefined if both are clear.
 */
async function checkProductUniqueness({ workspaceId, businessType, sku, barcode, excludeId }) {
  const productColl = collection(db, workspaceCollectionPath(workspaceId, 'products'))

  if (sku) {
    const skuQuery = excludeId
      ? query(productColl, where('sku', '==', sku), where('businessType', '==', businessType), limit(2))
      : query(productColl, where('sku', '==', sku), where('businessType', '==', businessType), limit(1))
    const skuSnap = await getDocs(skuQuery)
    const skuMatch = skuSnap.docs.find((d) => d.id !== excludeId)
    if (skuMatch) return `SKU "${sku}" is already used by another product`
  }

  if (barcode) {
    const barcodeQuery = excludeId
      ? query(productColl, where('barcode', '==', barcode), where('businessType', '==', businessType), limit(2))
      : query(productColl, where('barcode', '==', barcode), where('businessType', '==', businessType), limit(1))
    const barcodeSnap = await getDocs(barcodeQuery)
    const barcodeMatch = barcodeSnap.docs.find((d) => d.id !== excludeId)
    if (barcodeMatch) return `Barcode "${barcode}" is already used by another product`
  }

  return undefined
}

export function useProducts(options = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : null
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

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
      {
        businessType,
        orderByField: limitCount ? 'createdAt' : '',
        orderDirection: 'desc',
        limitCount,
      },
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

        // Double-click guard
        if (submittingRef.current) {
          return { ok: false, error: 'Product is already being saved. Please wait.' }
        }
        submittingRef.current = true

        try {
          // SKU / barcode uniqueness
          const uniquenessError = await checkProductUniqueness({
            workspaceId,
            businessType,
            sku: product.sku,
            barcode: product.barcode,
          })
          if (uniquenessError) return { ok: false, error: uniquenessError }

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
        } finally {
          submittingRef.current = false
        }
      },
      async loadSeedProducts(seedProducts = [], seedSource = '') {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const source = String(seedSource || '').trim()
        const incoming = Array.isArray(seedProducts) ? seedProducts : []
        if (!source || !incoming.length) return { ok: false, error: 'Product seed list is empty' }
        const existingKeys = new Set(
          products
            .filter((item) => item.seedSource === source)
            .map((item) => item.seedKey || item.sku || item.name),
        )
        const rows = incoming
          .map((item) => sanitizeProduct({ ...item, seedSource: source }))
          .filter((item) => item.name && item.sku)
          .filter((item) => !existingKeys.has(item.seedKey || item.sku || item.name))
        if (!rows.length) return { ok: true, added: 0, skipped: incoming.length }
        try {
          const batch = writeBatch(db)
          const productCollection = collection(db, workspaceCollectionPath(workspaceId, 'products'))
          rows.forEach((product) => {
            const ref = doc(productCollection)
            batch.set(ref, {
              ...product,
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType,
              createdBy: userId,
              stockHistory: [
                {
                  type: 'seeded',
                  quantity: product.stockQuantity,
                  note: 'Loaded from Pakistan shop starter catalog',
                  createdAt: new Date().toISOString(),
                  createdBy: userId,
                },
              ],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          })
          await batch.commit()
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Starter products loaded',
            module: 'Inventory',
            description: `${rows.length} Pakistan shop starter products were loaded.`,
            metadata: { seedSource: source, count: rows.length },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Starter inventory loaded',
            message: `${rows.length} Pakistan shop products were added.`,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true, added: rows.length, skipped: incoming.length - rows.length }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to load starter products.') }
        }
      },
      async unloadSeedProducts(seedSource = '') {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const source = String(seedSource || '').trim()
        if (!source) return { ok: false, error: 'Seed source is required' }
        const seededProducts = products.filter((item) => item.seedSource === source)
        if (!seededProducts.length) return { ok: true, removed: 0 }
        try {
          const batch = writeBatch(db)
          seededProducts.forEach((product) => {
            batch.delete(doc(db, workspaceCollectionPath(workspaceId, 'products'), product.id))
          })
          await batch.commit()
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Starter products unloaded',
            module: 'Inventory',
            description: `${seededProducts.length} Pakistan shop starter products were removed.`,
            metadata: { seedSource: source, count: seededProducts.length },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Inventory',
            priority: 'low',
            title: 'Starter inventory unloaded',
            message: `${seededProducts.length} starter products were removed.`,
            route: '/app/inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true, removed: seededProducts.length }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to unload starter products.') }
        }
      },
      async updateProduct(id, payload) {
        if (!id) return { ok: false, error: 'Product ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const product = sanitizeProduct(payload)
        if (!product.name) return { ok: false, error: 'Product name is required' }
        if (!product.sku) return { ok: false, error: 'SKU is required' }

        // Double-click guard
        if (submittingRef.current) {
          return { ok: false, error: 'Product is already being saved. Please wait.' }
        }
        submittingRef.current = true

        try {
          // SKU / barcode uniqueness (ignore current product)
          const uniquenessError = await checkProductUniqueness({
            workspaceId,
            businessType,
            sku: product.sku,
            barcode: product.barcode,
            excludeId: id,
          })
          if (uniquenessError) return { ok: false, error: uniquenessError }

          const newQty = Number(product.stockQuantity) || 0

          // ── Always read fresh stock from Firestore before deciding ──
          // We use runTransaction to atomically read the current stock,
          // compare with the submitted value, and update both the product
          // and the inventoryTransactions ledger. This eliminates stale
          // local-state races when another tab/user has changed stock.
          const productRef = doc(db, workspaceCollectionPath(workspaceId, 'products'), id)
          const ledgerRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions')))
          const normalizedBT = normalizeBusinessType(businessType)
          const now = new Date().toISOString()

          await runTransaction(db, async (txn) => {
            const snap = await txn.get(productRef)
            if (!snap.exists()) throw new Error('Product not found')
            const freshPrev = Number(snap.data().stockQuantity ?? snap.data().stock ?? 0)
            const delta = newQty - freshPrev
            const stockChanged = delta !== 0

            txn.update(productRef, {
              ...product,
              stockQuantity: newQty,
              ...(stockChanged
                ? {
                    stockHistory: arrayUnion({
                      type: 'manual_adjustment',
                      previousQuantity: freshPrev,
                      quantity: newQty,
                      delta,
                      note: 'Product workspace update',
                      createdAt: now,
                      createdBy: userId,
                    }),
                  }
                : {}),
              ownerId: workspaceId,
              userId: workspaceId,
              workspaceId,
              businessType: normalizedBT,
              updatedAt: serverTimestamp(),
            })

            // ── Write ledger entry only when stock actually changes ──
            if (stockChanged) {
              txn.set(ledgerRef, {
                type: 'adjustment',
                productId: id,
                productName: product.name,
                sku: product.sku,
                quantity: newQty,
                delta,
                previousQuantity: freshPrev,
                newQuantity: newQty,
                unitCost: 0,
                totalCost: 0,
                note: `Manual adjustment from ${freshPrev} to ${newQty}`,
                reference: '',
                referenceId: '',
                supplierId: '',
                supplierName: '',
                fromBranch: '',
                toBranch: '',
                createdBy: userId,
                ownerId: workspaceId,
                userId: workspaceId,
                workspaceId,
                businessType: normalizedBT,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            }
          })

          const currentProduct = products.find((item) => item.id === id)
          const stockChangedHint = newQty !== (currentProduct ? Number(currentProduct.stockQuantity) || 0 : 0)
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
            priority: stockChangedHint && product.stockQuantity <= product.minStockAlert ? 'high' : 'low',
            title: stockChangedHint ? 'Product stock updated' : 'Product updated',
            message: `${product.name} was updated.`,
            relatedId: id,
            route: '/app/products',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update product.') }
        } finally {
          submittingRef.current = false
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
          stockQuantity: 0,
          status: 'active',
        })
        try {
          const ref = await createUserDoc(workspaceId, 'products', {
            ...product,
            stockHistory: [
              {
                type: 'duplicated',
                quantity: 0,
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
