import { useEffect, useMemo, useRef, useState } from 'react'
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection, workspaceCollectionPath } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { createWorkspaceNotification } from '../lib/notifications.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function normalizeMedicine(medicine) {
  return {
    id: medicine.id,
    imageUrl: medicine.imageUrl || '',
    name: medicine.name || 'Unnamed medicine',
    sku: medicine.sku || '',
    barcode: medicine.barcode || '',
    category: medicine.category || 'General',
    brand: medicine.brand || '',
    batchNumber: medicine.batchNumber || '',
    expiryDate: medicine.expiryDate || '',
    manufacturer: medicine.manufacturer || '',
    requiresPrescription: medicine.requiresPrescription === true,
    costPrice: Number(medicine.costPrice ?? 0) || 0,
    price: Number(medicine.price ?? medicine.sellingPrice ?? 0) || 0,
    currency: medicine.currency || 'PKR',
    stockQuantity: Number(medicine.stockQuantity ?? medicine.stock ?? 0) || 0,
    minStockAlert: Number(medicine.minStockAlert ?? medicine.reorderPoint ?? 5) || 0,
    taxRate: Number(medicine.taxRate ?? medicine.tax ?? 0) || 0,
    discount: Number(medicine.discount ?? 0) || 0,
    productType: medicine.productType || medicine.type || 'product',
    description: medicine.description || '',
    warehouse: medicine.warehouse || '',
    branch: medicine.branch || '',
    supplier: medicine.supplier || '',
    stockHistory: Array.isArray(medicine.stockHistory) ? medicine.stockHistory : [],
    status: medicine.status || 'active',
    seedSource: medicine.seedSource || '',
    seedKey: medicine.seedKey || '',
    createdBy: medicine.createdBy || medicine.userId || '',
    createdAt: medicine.createdAt || null,
    updatedAt: medicine.updatedAt || null,
  }
}

function sanitizeMedicine(payload) {
  return {
    imageUrl: String(payload.imageUrl || '').trim(),
    name: String(payload.name || '').trim(),
    sku: String(payload.sku || '').trim(),
    barcode: String(payload.barcode || '').trim(),
    category: String(payload.category || 'General').trim(),
    brand: String(payload.brand || '').trim(),
    batchNumber: String(payload.batchNumber || '').trim(),
    expiryDate: String(payload.expiryDate || '').trim(),
    manufacturer: String(payload.manufacturer || '').trim(),
    requiresPrescription: payload.requiresPrescription === true,
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
 * Check whether sku or barcode already exists on another medicine in the same
 * workspace + businessType scope.
 * @returns {string|undefined} error message, or undefined if both are clear.
 */
async function checkMedicineUniqueness({ workspaceId, businessType, sku, barcode, excludeId }) {
  const medicineColl = collection(db, workspaceCollectionPath(workspaceId, 'medicineInventory'))

  if (sku) {
    const skuQuery = excludeId
      ? query(medicineColl, where('sku', '==', sku), where('businessType', '==', businessType), limit(2))
      : query(medicineColl, where('sku', '==', sku), where('businessType', '==', businessType), limit(1))
    const skuSnap = await getDocs(skuQuery)
    const skuMatch = skuSnap.docs.find((d) => d.id !== excludeId)
    if (skuMatch) return `SKU "${sku}" is already used by another medicine`
  }

  if (barcode) {
    const barcodeQuery = excludeId
      ? query(medicineColl, where('barcode', '==', barcode), where('businessType', '==', businessType), limit(2))
      : query(medicineColl, where('barcode', '==', barcode), where('businessType', '==', businessType), limit(1))
    const barcodeSnap = await getDocs(barcodeQuery)
    const barcodeMatch = barcodeSnap.docs.find((d) => d.id !== excludeId)
    if (barcodeMatch) return `Barcode "${barcode}" is already used by another medicine`
  }

  return undefined
}

export function useMedicineInventory(options = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const enabled = options.enabled !== false
  const limitCount = Number.isFinite(Number(options.limitCount)) && Number(options.limitCount) > 0 ? Math.floor(Number(options.limitCount)) : null
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const listenerIdRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setMedicines([])
        setSource(db ? 'firestore' : 'none')
        setError('')
        setLoading(false)
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setMedicines([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }

    if (!workspaceId) {
      Promise.resolve().then(() => {
        setMedicines([])
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

    listenerIdRef.current += 1
    const currentListenerId = listenerIdRef.current
    console.log('[DIAG] useMedicineInventory: SUBSCRIBING listener', {
      listenerId: currentListenerId,
      workspaceId,
      businessType,
      limitCount,
      timestamp: new Date().toISOString(),
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      'medicineInventory',
      (rows) => {
        console.log('[DIAG] useMedicineInventory: onSnapshot FIRED', {
          listenerId: currentListenerId,
          workspaceId,
          businessType,
          rowCount: Array.isArray(rows) ? rows.length : -1,
          rowsSummary: Array.isArray(rows)
            ? rows.map((r) => ({ id: r.id, businessType: r.businessType, workspaceId: r.workspaceId, selectedBusinessType: r.selectedBusinessType, sku: r.sku, name: r.name }))
            : rows,
          rows: Array.isArray(rows) ? JSON.parse(JSON.stringify(rows)) : rows,
          timestamp: new Date().toISOString(),
        })
        setMedicines((Array.isArray(rows) ? rows : []).map(normalizeMedicine))
        setLoading(false)
      },
      (err) => {
        console.error('[DIAG] useMedicineInventory: onSnapshot ERROR', {
          listenerId: currentListenerId,
          workspaceId,
          businessType,
          errorCode: err?.code,
          errorMessage: err?.message,
          error: err,
          timestamp: new Date().toISOString(),
        })
        setError(clientSafeMessage(err, 'Unable to load medicine inventory.'))
        setMedicines([])
        setLoading(false)
      },
      {
        businessType,
        orderByField: limitCount ? 'createdAt' : '',
        orderDirection: 'desc',
        limitCount,
      },
    )

    return () => {
      console.log('[DIAG] useMedicineInventory: UNSUBSCRIBING listener', {
        listenerId: currentListenerId,
        workspaceId,
        businessType,
        timestamp: new Date().toISOString(),
      })
      unsub?.()
    }
  }, [businessType, enabled, limitCount, workspaceId])

  return useMemo(
    () => ({
      medicines,
      loading,
      source,
      error,
      async createMedicine(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const medicine = sanitizeMedicine(payload)
        console.log('[DIAG] createMedicine: called', {
          userId,
          workspaceId,
          businessType,
          rawPayload: JSON.parse(JSON.stringify(payload)),
          sanitizedMedicine: JSON.parse(JSON.stringify(medicine)),
          timestamp: new Date().toISOString(),
        })
        if (!medicine.name) return { ok: false, error: 'Medicine name is required' }
        if (!medicine.sku) return { ok: false, error: 'SKU is required' }

        // Double-click guard
        if (submittingRef.current) {
          return { ok: false, error: 'Medicine is already being saved. Please wait.' }
        }
        submittingRef.current = true

        try {
          // SKU / barcode uniqueness
          const uniquenessError = await checkMedicineUniqueness({
            workspaceId,
            businessType,
            sku: medicine.sku,
            barcode: medicine.barcode,
          })
          if (uniquenessError) {
            console.error('[DIAG] createMedicine: blocked by uniqueness check', { workspaceId, businessType, sku: medicine.sku, barcode: medicine.barcode, uniquenessError })
            return { ok: false, error: uniquenessError }
          }

          const collectionPath = workspaceCollectionPath(workspaceId, 'medicineInventory')
          const createPayload = {
            ...medicine,
            stockHistory: [
              {
                type: 'created',
                quantity: medicine.stockQuantity,
                note: 'Initial stock',
                createdAt: new Date().toISOString(),
                createdBy: userId,
              },
            ],
            createdBy: userId,
          }
          console.log('[DIAG] createMedicine: about to write (createUserDoc -> addDoc)', {
            collectionPath,
            workspaceId,
            businessTypeOptionPassed: businessType,
            createPayload,
            timestamp: new Date().toISOString(),
          })

          const ref = await createUserDoc(workspaceId, 'medicineInventory', createPayload, { businessType })

          console.log('[DIAG] createMedicine: write returned a ref', {
            newDocId: ref?.id,
            newDocPath: ref?.path,
            collectionPath,
            timestamp: new Date().toISOString(),
          })

          // Read the doc straight back (bypassing any local cache/listener) to
          // confirm what Firestore actually persisted, and from where.
          try {
            const confirmSnap = await getDoc(ref)
            console.log('[DIAG] createMedicine: read-back immediately after write', {
              newDocId: ref?.id,
              exists: confirmSnap.exists(),
              data: confirmSnap.exists() ? confirmSnap.data() : null,
              fromCache: confirmSnap.metadata?.fromCache,
              hasPendingWrites: confirmSnap.metadata?.hasPendingWrites,
              timestamp: new Date().toISOString(),
            })
          } catch (readBackErr) {
            console.error('[DIAG] createMedicine: read-back immediately after write FAILED', {
              newDocId: ref?.id,
              errorCode: readBackErr?.code,
              errorMessage: readBackErr?.message,
              errorFull: readBackErr,
              timestamp: new Date().toISOString(),
            })
          }

          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Medicine created',
            module: 'Medicine Inventory',
            description: `${medicine.name} was added to medicine inventory.`,
            targetId: ref.id,
            targetName: medicine.name,
            metadata: { sku: medicine.sku, category: medicine.category, price: medicine.price, batchNumber: medicine.batchNumber, expiryDate: medicine.expiryDate },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Medical Inventory',
            priority: medicine.stockQuantity <= medicine.minStockAlert ? 'high' : 'low',
            title: 'Medicine created',
            message: `${medicine.name} was added to medicine inventory.`,
            relatedId: ref.id,
            route: '/app/medical-inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          console.log('[DIAG] createMedicine: completed successfully', { timestamp: new Date().toISOString() })
          return { ok: true }
        } catch (e) {
          console.error('[DIAG] createMedicine: CAUGHT ERROR (full object, not just message)', {
            workspaceId,
            businessType,
            errorCode: e?.code,
            errorMessage: e?.message,
            errorName: e?.name,
            errorStack: e?.stack,
            errorFull: e,
            timestamp: new Date().toISOString(),
          })
          return { ok: false, error: clientSafeMessage(e, 'Unable to create medicine.') }
        } finally {
          submittingRef.current = false
        }
      },
      async updateMedicine(id, payload) {
        if (!id) return { ok: false, error: 'Medicine ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const medicine = sanitizeMedicine(payload)
        console.log('[DIAG] updateMedicine: called', {
          id,
          workspaceId,
          businessType,
          rawPayload: JSON.parse(JSON.stringify(payload)),
          sanitizedMedicine: JSON.parse(JSON.stringify(medicine)),
          timestamp: new Date().toISOString(),
        })
        if (!medicine.name) return { ok: false, error: 'Medicine name is required' }
        if (!medicine.sku) return { ok: false, error: 'SKU is required' }

        // Double-click guard
        if (submittingRef.current) {
          return { ok: false, error: 'Medicine is already being saved. Please wait.' }
        }
        submittingRef.current = true

        try {
          // SKU / barcode uniqueness (ignore current medicine)
          const uniquenessError = await checkMedicineUniqueness({
            workspaceId,
            businessType,
            sku: medicine.sku,
            barcode: medicine.barcode,
            excludeId: id,
          })
          if (uniquenessError) return { ok: false, error: uniquenessError }

          const newQty = Number(medicine.stockQuantity) || 0

          // ── Always read fresh stock from Firestore before deciding ──
          // We use runTransaction to atomically read the current stock,
          // compare with the submitted value, and update both the medicine
          // and the inventoryTransactions ledger. This eliminates stale
          // local-state races when another tab/user has changed stock.
          const medicineRef = doc(db, workspaceCollectionPath(workspaceId, 'medicineInventory'), id)
          const ledgerRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'inventoryTransactions')))
          const normalizedBT = normalizeBusinessType(businessType)
          const now = new Date().toISOString()

          console.log('[DIAG] updateMedicine: about to runTransaction', {
            id,
            medicineRefPath: medicineRef.path,
            ledgerRefPath: ledgerRef.path,
            workspaceId,
            businessType,
            normalizedBT,
            newQty,
            timestamp: new Date().toISOString(),
          })

          await runTransaction(db, async (txn) => {
            const snap = await txn.get(medicineRef)
            console.log('[DIAG] updateMedicine: txn.get result', {
              id,
              medicineRefPath: medicineRef.path,
              exists: snap.exists(),
              data: snap.exists() ? snap.data() : null,
              timestamp: new Date().toISOString(),
            })
            if (!snap.exists()) {
              console.error('[DIAG] updateMedicine: document NOT FOUND at txn.get — this is the exact point a stale/wrong id would surface', {
                id,
                medicineRefPath: medicineRef.path,
              })
              throw new Error('Medicine not found')
            }
            const freshPrev = Number(snap.data().stockQuantity ?? snap.data().stock ?? 0)
            const delta = newQty - freshPrev
            const stockChanged = delta !== 0

            const updatePayload = {
              ...medicine,
              stockQuantity: newQty,
              ...(stockChanged
                ? {
                    stockHistory: arrayUnion({
                      type: 'manual_adjustment',
                      previousQuantity: freshPrev,
                      quantity: newQty,
                      delta,
                      note: 'Medicine workspace update',
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
            }
            console.log('[DIAG] updateMedicine: about to txn.update', {
              id,
              medicineRefPath: medicineRef.path,
              stockChanged,
              freshPrev,
              delta,
              updatePayload,
              updatePayloadKeys: Object.keys(updatePayload),
              timestamp: new Date().toISOString(),
            })

            txn.update(medicineRef, updatePayload)

            // ── Write ledger entry only when stock actually changes ──
            if (stockChanged) {
              txn.set(ledgerRef, {
                type: 'adjustment',
                productId: id,
                productName: medicine.name,
                sku: medicine.sku,
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

          const currentMedicine = medicines.find((item) => item.id === id)
          const stockChangedHint = newQty !== (currentMedicine ? Number(currentMedicine.stockQuantity) || 0 : 0)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Medicine updated',
            module: 'Medicine Inventory',
            description: `${medicine.name} was updated.`,
            targetId: id,
            targetName: medicine.name,
            metadata: { sku: medicine.sku, category: medicine.category, price: medicine.price, batchNumber: medicine.batchNumber, expiryDate: medicine.expiryDate },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Medical Inventory',
            priority: stockChangedHint && medicine.stockQuantity <= medicine.minStockAlert ? 'high' : 'low',
            title: stockChangedHint ? 'Medicine stock updated' : 'Medicine updated',
            message: `${medicine.name} was updated.`,
            relatedId: id,
            route: '/app/medical-inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          console.log('[DIAG] updateMedicine: transaction + post-transaction writes committed successfully', {
            id,
            timestamp: new Date().toISOString(),
          })
          return { ok: true }
        } catch (e) {
          console.error('[DIAG] updateMedicine: CAUGHT ERROR (full object, not just message)', {
            id,
            workspaceId,
            businessType,
            errorCode: e?.code,
            errorMessage: e?.message,
            errorName: e?.name,
            errorStack: e?.stack,
            errorFull: e,
            timestamp: new Date().toISOString(),
          })
          return { ok: false, error: clientSafeMessage(e, 'Unable to update medicine.') }
        } finally {
          submittingRef.current = false
        }
      },
      async deleteMedicine(id) {
        if (!id) return { ok: false, error: 'Medicine ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const medicine = medicines.find((item) => item.id === id)
        try {
          await removeUserDoc(workspaceId, 'medicineInventory', id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Medicine deleted',
            module: 'Medicine Inventory',
            description: `${medicine?.name || id} was deleted.`,
            targetId: id,
            targetName: medicine?.name || id,
            metadata: { sku: medicine?.sku || '' },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Medical Inventory',
            priority: 'low',
            title: 'Medicine deleted',
            message: `${medicine?.name || id} was deleted.`,
            relatedId: id,
            route: '/app/medical-inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete medicine.') }
        }
      },
      async duplicateMedicine(id) {
        if (!id) return { ok: false, error: 'Medicine ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const original = medicines.find((item) => item.id === id)
        if (!original) return { ok: false, error: 'Medicine not found' }
        const existingSkus = new Set(medicines.map((item) => String(item.sku || '').trim()).filter(Boolean))
        const baseSku = original.sku ? `${original.sku}-COPY` : ''
        let nextSku = baseSku
        let copyIndex = 2
        while (nextSku && existingSkus.has(nextSku)) {
          nextSku = `${baseSku}-${copyIndex}`
          copyIndex += 1
        }
        const medicine = sanitizeMedicine({
          ...original,
          name: `${original.name} Copy`,
          sku: nextSku,
          barcode: '',
          batchNumber: '',
          stockQuantity: 0,
          status: 'active',
        })
        if (!medicine.sku) return { ok: false, error: 'Original medicine must have a SKU before it can be duplicated' }
        try {
          const uniquenessError = await checkMedicineUniqueness({
            workspaceId,
            businessType,
            sku: medicine.sku,
            barcode: medicine.barcode,
          })
          if (uniquenessError) return { ok: false, error: uniquenessError }

          const ref = await createUserDoc(workspaceId, 'medicineInventory', {
            ...medicine,
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
            action: 'Medicine duplicated',
            module: 'Medicine Inventory',
            description: `${original.name} was duplicated.`,
            targetId: ref.id,
            targetName: medicine.name,
            metadata: { sourceId: id, sku: medicine.sku },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Medical Inventory',
            priority: 'low',
            title: 'Medicine duplicated',
            message: `${original.name} was duplicated.`,
            relatedId: ref.id,
            route: '/app/medical-inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to duplicate medicine.') }
        }
      },
      async archiveMedicine(id) {
        if (!id) return { ok: false, error: 'Medicine ID is required' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const medicine = medicines.find((item) => item.id === id)
        try {
          await patchUserDoc(workspaceId, 'medicineInventory', id, {
            status: 'archived',
            updatedAt: serverTimestamp(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Medicine archived',
            module: 'Medicine Inventory',
            description: `${medicine?.name || id} was archived.`,
            targetId: id,
            targetName: medicine?.name || id,
            metadata: { sku: medicine?.sku || '' },
          })
          await createWorkspaceNotification({
            workspaceId,
            userId,
            businessType,
            type: 'Medical Inventory',
            priority: 'low',
            title: 'Medicine archived',
            message: `${medicine?.name || id} was archived.`,
            relatedId: id,
            route: '/app/medical-inventory',
            createdBy: userId,
            createdByEmail: firebaseUser?.email || userDoc?.email || '',
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to archive medicine.') }
        }
      },
    }),
    [medicines, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
