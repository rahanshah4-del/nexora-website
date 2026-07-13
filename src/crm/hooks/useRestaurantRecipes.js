/**
 * Firestore-backed Restaurant POS recipe/BOM engine hook.
 *
 * workspaceId-scoped collections:
 *   workspaces/{workspaceId}/restaurantIngredients  — ingredient stock ledger
 *   workspaces/{workspaceId}/restaurantRecipes      — recipe/BOM definitions
 *   workspaces/{workspaceId}/restaurantDeductions   — ingredient deduction log
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  limit as queryLimit,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceCollectionPath, listenToWorkspaceCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'
import {
  createIngredientRecord,
  createRecipeRecord,
  createDeductionRecord,
  validateIngredient,
  validateRecipe,
} from '../data/restaurantRecipeData.js'
import { clientSafeMessage } from '../utils/messages.js'

/* ─── Helpers ──────────────────────────────────────────────────── */

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function rawNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/* ─── Constants ────────────────────────────────────────────────── */

const DEFAULT_LIMIT = 200
const MAXIMUM_LIMIT = 500
const SUBMITTING_LOCK = { current: false }

/* ─── Hook: useRestaurantIngredients ───────────────────────────── */

export function useRestaurantIngredients(options = {}) {
  const { workspaceId, businessType, staffId, userId, firebaseUser } = useUser()
  const enabled = options.enabled !== false

  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !db || !workspaceId) {
      setIngredients([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'restaurantIngredients',
      businessType,
      orderByField: 'name',
      orderDirection: 'asc',
      limitCount: MAXIMUM_LIMIT,
      onData: (rows) => { setIngredients(Array.isArray(rows) ? rows : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err)); setIngredients([]); setLoading(false) },
    })
    return () => unsub?.()
  }, [enabled, workspaceId, businessType])

  const addIngredient = useCallback(async (input = {}) => {
    if (!db || !workspaceId || !firebaseUser) return { ok: false, error: 'Authentication required.' }
    const record = createIngredientRecord({
      ...input, workspaceId, businessType,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    const validation = validateIngredient(record)
    if (!validation.valid) return { ok: false, error: validation.errors.join('; ') }
    try {
      const path = workspaceCollectionPath(workspaceId, 'restaurantIngredients')
      const ref = doc(collection(db, path))
      await runTransaction(db, async (txn) => {
        txn.set(ref, { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
      return { ok: true, ingredient: { id: ref.id, ...record } }
    } catch (err) {
      return { ok: false, error: clientSafeMessage(err, 'Failed to add ingredient.') }
    }
  }, [workspaceId, businessType, firebaseUser])

  const updateIngredient = useCallback(async (id, patch = {}) => {
    if (!db || !workspaceId) return { ok: false, error: 'Not connected.' }
    try {
      const path = workspaceCollectionPath(workspaceId, 'restaurantIngredients')
      const ref = doc(db, path, id)
      await runTransaction(db, async (txn) => {
        txn.update(ref, { ...patch, updatedAt: serverTimestamp() })
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: clientSafeMessage(err, 'Failed to update ingredient.') }
    }
  }, [workspaceId])

  return useMemo(() => ({
    ingredients, loading, error,
    addIngredient, updateIngredient,
    canManage: Boolean(db && workspaceId && firebaseUser),
  }), [ingredients, loading, error, addIngredient, updateIngredient])
}

/* ─── Hook: useRestaurantRecipes ───────────────────────────────── */

export function useRestaurantRecipes(options = {}) {
  const { workspaceId, businessType, staffId, userId, firebaseUser } = useUser()
  const enabled = options.enabled !== false

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !db || !workspaceId) {
      setRecipes([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'restaurantRecipes',
      businessType,
      orderByField: 'menuItemName',
      orderDirection: 'asc',
      limitCount: MAXIMUM_LIMIT,
      onData: (rows) => { setRecipes(Array.isArray(rows) ? rows : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err)); setRecipes([]); setLoading(false) },
    })
    return () => unsub?.()
  }, [enabled, workspaceId, businessType])

  const saveRecipe = useCallback(async (input = {}) => {
    if (!db || !workspaceId || !firebaseUser) return { ok: false, error: 'Authentication required.' }
    const now = new Date().toISOString()
    const record = createRecipeRecord({
      ...input, workspaceId, businessType,
      updatedAt: now,
      createdAt: input.createdAt || now,
    })
    const validation = validateRecipe(record)
    if (!validation.valid) return { ok: false, error: validation.errors.join('; ') }
    try {
      const path = workspaceCollectionPath(workspaceId, 'restaurantRecipes')
      // Upsert: use menuItemId as doc id
      const ref = doc(db, path, record.menuItemId)
      await runTransaction(db, async (txn) => {
        txn.set(ref, {
          ...record,
          version: (input.version || 0) + 1,
          updatedAt: serverTimestamp(),
          createdAt: input.createdAt ? serverTimestamp() : undefined,
        }, { merge: true })
      })
      return { ok: true, recipe: record }
    } catch (err) {
      return { ok: false, error: clientSafeMessage(err, 'Failed to save recipe.') }
    }
  }, [workspaceId, businessType, firebaseUser])

  const deleteRecipe = useCallback(async (menuItemId) => {
    if (!db || !workspaceId) return { ok: false, error: 'Not connected.' }
    try {
      const path = workspaceCollectionPath(workspaceId, 'restaurantRecipes')
      await runTransaction(db, async (txn) => {
        txn.delete(doc(db, path, menuItemId))
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: clientSafeMessage(err, 'Failed to delete recipe.') }
    }
  }, [workspaceId])

  return useMemo(() => ({
    recipes, loading, error,
    saveRecipe, deleteRecipe,
    canManage: Boolean(db && workspaceId && firebaseUser),
  }), [recipes, loading, error, saveRecipe, deleteRecipe])
}

/* ─── Hook: useRestaurantDeductions ────────────────────────────── */

export function useRestaurantDeductions(options = {}) {
  const { workspaceId, businessType, staffId, userId, firebaseUser } = useUser()
  const { orderNumber, businessDay, enabled = true } = options

  const [deductions, setDeductions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const whereFilters = useMemo(() => {
    const filters = []
    if (orderNumber) filters.push(['orderNumber', '==', orderNumber])
    if (businessDay) filters.push(['businessDay', '==', businessDay])
    return filters
  }, [orderNumber, businessDay])

  useEffect(() => {
    if (!enabled || !db || !workspaceId) {
      setDeductions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'restaurantDeductions',
      businessType,
      orderByField: 'deductedAt',
      orderDirection: 'desc',
      limitCount: DEFAULT_LIMIT,
      whereFilters,
      onData: (rows) => { setDeductions(Array.isArray(rows) ? rows : []); setLoading(false) },
      onError: (err) => { setError(clientSafeMessage(err)); setDeductions([]); setLoading(false) },
    })
    return () => unsub?.()
  }, [enabled, workspaceId, businessType, whereFilters])

  return useMemo(() => ({
    deductions, loading, error,
  }), [deductions, loading, error])
}

/* ─── Auto-deduction engine ────────────────────────────────────── */

/**
 * Auto-deduct ingredient stock when an order is paid.
 * Called from RestaurantOrders on payment confirm.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.businessType
 * @param {string} params.orderNumber
 * @param {Array} params.cartRows — items sold { itemId, item: { id, name }, qty }
 * @param {Array} params.recipes — recipe records from Firestore
 * @param {Array} params.ingredients — ingredient stock records
 * @param {Object} params.staff — { id, name }
 * @returns {Promise<Array>} results — per-deduction { ok, ingredientId, ingredientName, error }
 */
export async function autoDeductIngredients({
  workspaceId,
  businessType,
  orderNumber,
  cartRows = [],
  recipes = [],
  ingredients = [],
  staff = {},
  settings = {},
} = {}) {
  if (!db || !workspaceId || !orderNumber) return []
  if (!cartRows.length) return []

  const businessDay = restaurantBusinessDateKey(new Date(), settings)
  const now = new Date().toISOString()
  const results = []

  // Build recipe map by menuItemId
  const recipeMap = {}
  recipes.forEach((r) => { recipeMap[r.menuItemId] = r })

  // Build ingredient map by id
  const ingredientMap = {}
  ingredients.forEach((i) => { ingredientMap[i.id || i.ingredientId] = i })

  for (const cartItem of cartRows) {
    const itemId = cartItem.itemId || cartItem.item?.id || cartItem.menuItemId
    const qty = Math.max(1, Math.floor(Number(cartItem.qty) || 1))
    const recipe = recipeMap[itemId]
    if (!recipe || !recipe.ingredients?.length) continue

    for (const ing of recipe.ingredients) {
      const ingredientId = ing.ingredientId
      const stockIngredient = ingredientMap[ingredientId]
      if (!stockIngredient) {
        results.push({ ok: false, ingredientId, ingredientName: ing.name, error: 'Ingredient not found in stock.' })
        continue
      }

      const requiredQty = safeMoney(ing.quantity) * qty
      const currentStock = safeMoney(stockIngredient.stockQuantity)

      try {
        const ingPath = workspaceCollectionPath(workspaceId, 'restaurantIngredients')
        const ingRef = doc(db, ingPath, ingredientId)
        const dedPath = workspaceCollectionPath(workspaceId, 'restaurantDeductions')
        const dedRef = doc(collection(db, dedPath))

        await runTransaction(db, async (txn) => {
          const newStock = Math.max(0, currentStock - requiredQty)
          txn.update(ingRef, { stockQuantity: newStock, updatedAt: serverTimestamp() })

          const dedRecord = createDeductionRecord({
            workspaceId,
            businessType,
            orderNumber,
            menuItemId: itemId,
            menuItemName: cartItem.item?.name || recipe.menuItemName || '',
            quantity: qty,
            ingredientId,
            ingredientName: ing.name,
            ingredientQty: requiredQty,
            unit: ing.unit,
            costAtDeduction: ing.costPerUnit,
            status: 'completed',
            businessDay,
            deductedAt: now,
          })
          txn.set(dedRef, {
            ...dedRecord,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        })

        results.push({ ok: true, ingredientId, ingredientName: ing.name, deducted: requiredQty, newStock: Math.max(0, currentStock - requiredQty) })
      } catch (err) {
        results.push({ ok: false, ingredientId, ingredientName: ing.name, error: err?.message || 'Deduction failed.' })
      }
    }
  }

  return results
}
