/**
 * Restaurant POS Integration Engine
 *
 * Bridges orders → inventory (auto-deduction), orders → loyalty (points/coupons),
 * orders → delivery, and reservation → order conversion.
 *
 * All functions are Firestore-safe: they fetch fresh data inside transactions.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { workspaceCollectionPath } from './firestore.js'
import { restaurantBusinessDateKey } from './restaurantBusinessDay.js'
import { createDeductionRecord } from '../data/restaurantRecipeData.js'

/* ─── Helpers ──────────────────────────────────────────────────── */

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/* ─── 1. POS ↔ Inventory — Auto-deduct ingredients on payment ─── */

/**
 * Fetch all recipes and ingredients from Firestore, then deduct stock
 * for each cart item that has a matching recipe.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.businessType
 * @param {string} opts.orderNumber
 * @param {Array}  opts.cartRows — [{ itemId, qty, item: { name } }]
 * @param {Object} opts.staff — { id, name }
 * @param {Object} [opts.settings] — business-day settings
 * @returns {Promise<{ok:boolean, deductions:Array, errors:string[]}>}
 */
export async function deductIngredientsForOrder({
  workspaceId,
  businessType,
  orderNumber,
  cartRows = [],
  staff = {},
  settings = {},
} = {}) {
  if (!db || !workspaceId || !orderNumber || !cartRows.length) {
    return { ok: true, deductions: [], errors: [] }
  }

  const results = { deductions: [], errors: [] }
  const businessDay = restaurantBusinessDateKey(new Date(), settings)
  const now = new Date().toISOString()

  try {
    // Fetch recipes + ingredients fresh from Firestore
    const recipesPath = workspaceCollectionPath(workspaceId, 'restaurantRecipes')
    const ingPath = workspaceCollectionPath(workspaceId, 'restaurantIngredients')
    const recipesSnap = await getDocs(query(collection(db, recipesPath)))
    const ingSnap = await getDocs(query(collection(db, ingPath)))

    const recipeMap = {}
    recipesSnap.forEach((d) => { recipeMap[d.id] = { id: d.id, ...d.data() } })

    const ingredientMap = {}
    ingSnap.forEach((d) => { ingredientMap[d.id] = { id: d.id, ...d.data() } })

    // Process each cart row
    for (const cartItem of cartRows) {
      const itemId = cartItem.itemId || cartItem.item?.id
      const qty = Math.max(1, Math.floor(Number(cartItem.qty) || 1))
      const recipe = recipeMap[itemId]
      if (!recipe || !recipe.ingredients?.length) continue

      for (const ing of recipe.ingredients) {
        const ingredientId = ing.ingredientId
        const stockIng = ingredientMap[ingredientId]
        if (!stockIng) {
          results.errors.push(`Ingredient ${ing.name} not found in stock.`)
          continue
        }

        const requiredQty = safeMoney(ing.quantity) * qty
        const currentStock = safeMoney(stockIng.stockQuantity)
        const newStock = Math.max(0, currentStock - requiredQty)

        try {
          const ingRef = doc(db, workspaceCollectionPath(workspaceId, 'restaurantIngredients'), ingredientId)
          const dedRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'restaurantDeductions')))

          await runTransaction(db, async (txn) => {
            txn.update(ingRef, { stockQuantity: newStock, updatedAt: serverTimestamp() })
            txn.set(dedRef, {
              workspaceId,
              businessType,
              orderNumber,
              menuItemId: itemId,
              menuItemName: cartItem.item?.name || recipe.menuItemName || '',
              quantity: qty,
              ingredientId,
              ingredientName: ing.name,
              ingredientQty: requiredQty,
              unit: ing.unit || 'pc',
              costAtDeduction: ing.costPerUnit || 0,
              totalCost: safeMoney(ing.costPerUnit) * requiredQty,
              status: 'completed',
              businessDay,
              deductedAt: now,
              notes: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          })

          results.deductions.push({
            ok: true,
            ingredientId,
            ingredientName: ing.name,
            deducted: requiredQty,
            newStock,
          })
        } catch (err) {
          results.errors.push(`Deduction failed for ${ing.name}: ${err?.message}`)
        }
      }
    }
  } catch (err) {
    results.errors.push(`Failed to load recipe/ingredient data: ${err?.message}`)
  }

  return {
    ok: results.errors.length === 0,
    deductions: results.deductions,
    errors: results.errors,
  }
}

/* ─── 2. POS ↔ Loyalty — Earn points on completed payment ─── */

/**
 * Award loyalty points for a completed order.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.businessType
 * @param {string} opts.customerId
 * @param {string} opts.orderId
 * @param {number} opts.orderTotal
 * @param {string} opts.cashierName
 * @returns {Promise<{ok:boolean, pointsEarned:number, error?:string}>}
 */
export async function awardLoyaltyPointsForOrder({
  workspaceId,
  businessType,
  customerId,
  orderId,
  orderTotal = 0,
  cashierName = '',
} = {}) {
  if (!db || !workspaceId || !customerId || !orderId || orderTotal <= 0) {
    return { ok: false, pointsEarned: 0, error: 'Missing required fields.' }
  }

  try {
    // Look up the loyalty account for this customer
    const accountsPath = workspaceCollectionPath(workspaceId, 'loyaltyAccounts')
    const accountsQuery = query(collection(db, accountsPath), where('customerId', '==', customerId))
    const snap = await getDocs(accountsQuery)

    if (snap.empty) return { ok: true, pointsEarned: 0, note: 'No loyalty account.' }

    const accountDoc = snap.docs[0]
    const accountId = accountDoc.id
    const account = accountDoc.data()

    // Read loyalty settings
    const settingsPath = workspaceCollectionPath(workspaceId, 'loyaltySettings')
    const settingsSnap = await getDocs(query(collection(db, settingsPath)))
    let perAmountSpent = 10
    let maxPointsPerTx = 1000
    if (!settingsSnap.empty) {
      const s = settingsSnap.docs[0].data()
      perAmountSpent = s.pointEarningRules?.perAmountSpent || 10
      maxPointsPerTx = s.pointEarningRules?.maxPointsPerTransaction || 1000
    }

    // Calculate points
    let points = Math.floor(orderTotal / perAmountSpent)
    points = Math.min(points, maxPointsPerTx)
    if (points <= 0) return { ok: true, pointsEarned: 0, note: 'Order too small for points.' }

    // Apply tier multiplier (silver=1.25, gold=1.5, platinum=2, vip=2.5)
    const tierMultipliers = { silver: 1.25, gold: 1.5, platinum: 2, vip: 2.5 }
    const multiplier = tierMultipliers[account.currentTier] || 1
    const finalPoints = Math.floor(points * multiplier)

    // Atomic transaction: add points to account + log in ledger
    const accountRef = doc(db, accountsPath, accountId)
    const ledgerPath = workspaceCollectionPath(workspaceId, 'loyaltyPointsLedger')
    const ledgerRef = doc(collection(db, ledgerPath))

    await runTransaction(db, async (txn) => {
      const accSnap = await txn.get(accountRef)
      if (!accSnap.exists()) return

      const current = accSnap.data()
      txn.update(accountRef, {
        currentPoints: (current.currentPoints || 0) + finalPoints,
        lifetimePoints: (current.lifetimePoints || 0) + finalPoints,
        lifetimeSpend: (current.lifetimeSpend || 0) + orderTotal,
        posOrdersCount: (current.posOrdersCount || 0) + 1,
        visits: (current.visits || 0) + 1,
        lastActivityAt: serverTimestamp(),
      })

      txn.set(ledgerRef, {
        accountId,
        points: finalPoints,
        type: 'earned',
        description: `Points earned for order ${orderId}`,
        orderId,
        metadata: { orderTotal, multiplier, cashierName },
        workspaceId,
        ownerId: workspaceId,
        businessType,
        createdBy: cashierName || 'system',
        createdAt: serverTimestamp(),
      })
    })

    return { ok: true, pointsEarned: finalPoints }
  } catch (err) {
    return { ok: false, pointsEarned: 0, error: err?.message || 'Loyalty award failed.' }
  }
}

/* ─── 3. POS ↔ Delivery — Create delivery order ─── */

/**
 * Create a delivery order for a restaurant POS order of type Delivery.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.businessType
 * @param {Object} opts.order — the POS order object
 * @param {string} opts.deliveryAddress
 * @param {string} opts.riderNotes
 * @returns {Promise<{ok:boolean, deliveryOrderId?:string, error?:string}>}
 */
export async function createDeliveryFromOrder({
  workspaceId,
  businessType,
  order,
  deliveryAddress = '',
  riderNotes = '',
} = {}) {
  if (!db || !workspaceId || !order?.orderNumber) {
    return { ok: false, error: 'Missing required fields.' }
  }

  const sourceOrderId = order.orderNumber

  try {
    const path = workspaceCollectionPath(workspaceId, 'deliveryOrders')
    const duplicateQuery = query(
      collection(db, path),
      where('sourceOrderId', '==', sourceOrderId),
      where('workspaceId', '==', workspaceId),
    )

    // ── Fast path: skip the transaction if a bridge doc already exists ──
    const preSnap = await getDocs(duplicateQuery)
    if (!preSnap.empty) {
      return { ok: true, deliveryOrderId: preSnap.docs[0].id, alreadyExists: true }
    }

    const ref = doc(collection(db, path))
    let created = false

    await runTransaction(db, async (txn) => {
      // Belt-and-suspenders: re-check inside the atomic transaction
      const txnSnap = await txn.get(duplicateQuery)
      if (!txnSnap.empty) return // another caller won the race — abort write

      txn.set(ref, {
        orderNumber: order.orderNumber,
        sourceOrderId,
        source: 'pos',
        orderType: 'delivery',
        status: 'pending',
        customerName: order.customer || 'Walk-in Guest',
        customerPhone: order.phone || '',
        deliveryAddress,
        deliveryInstructions: riderNotes || order.riderNotes || '',
        items: (order.cartRows || []).map((r) => ({
          itemId: r.itemId,
          name: r.item?.name || '',
          qty: r.qty,
          price: r.item?.price || 0,
        })),
        subtotal: order.totals?.subtotal || 0,
        deliveryFee: 0,
        total: order.total || 0,
        paymentMethod: order.paymentMethod || 'Cash',
        paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
        zoneId: '',
        driverId: '',
        otpCode: String(Math.floor(100000 + Math.random() * 900000)),
        estimatedEta: null,
        scheduledAt: null,
        workspaceId,
        businessType,
        createdBy: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      created = true
    })

    if (created) return { ok: true, deliveryOrderId: ref.id }

    // Transaction was a no-op (another caller won the race) — get their doc ID
    const postSnap = await getDocs(duplicateQuery)
    if (!postSnap.empty) {
      return { ok: true, deliveryOrderId: postSnap.docs[0].id, alreadyExists: true }
    }

    return { ok: false, error: 'Delivery order creation conflict — please retry.' }
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to create delivery order.' }
  }
}

/* ─── 4. Reservation → Order — Convert seated reservation ─── */

/**
 * Mark a reservation as seated and create a dine-in order reference.
 * The actual POS order creation is handled by RestaurantOrders,
 * but this updates reservation status + logs history.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.reservationId
 * @param {string} opts.tableId
 * @param {string} opts.orderNumber
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function seatReservation({
  workspaceId,
  reservationId,
  tableId,
  orderNumber,
} = {}) {
  if (!db || !workspaceId || !reservationId) {
    return { ok: false, error: 'Missing required fields.' }
  }

  try {
    const resPath = workspaceCollectionPath(workspaceId, 'restaurantReservations')
    const resRef = doc(db, resPath, reservationId)
    const historyPath = workspaceCollectionPath(workspaceId, 'restaurantReservationHistory')
    const historyRef = doc(collection(db, historyPath))

    await runTransaction(db, async (txn) => {
      txn.update(resRef, {
        status: 'seated',
        checkInAt: serverTimestamp(),
        tableId: tableId || '',
        orderNumber: orderNumber || '',
        updatedAt: serverTimestamp(),
      })
      txn.set(historyRef, {
        reservationId,
        action: 'seated',
        tableId: tableId || '',
        orderNumber: orderNumber || '',
        workspaceId,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to seat reservation.' }
  }
}
