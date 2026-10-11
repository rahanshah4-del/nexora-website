/**
 * Nexora AI — collects the restaurant data snapshot the tool executors read.
 *
 * Same sources as the Reports page (local orders + Firestore orders + invoice
 * orders, customers, expenses, menu, cash sessions, refunds), plus ingredients
 * and tables. Live listeners are only started while `enabled`, i.e. once the
 * owner opens the assistant, and everything is read through the signed-in
 * user's own Firestore rules.
 *
 * `getData()` returns a FRESH snapshot for each question: synchronous local
 * stores are re-read and Firestore orders are re-fetched, so the answer never
 * reflects a stale list from when the window was first opened.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useUser } from '../hooks/useUser.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useRestaurantCashSessions } from '../hooks/useRestaurantCashSessions.js'
import { useRestaurantRefunds } from '../hooks/useRestaurantRefunds.js'
import { useRestaurantIngredients } from '../hooks/useRestaurantRecipes.js'
import { loadRestaurantCustomers } from '../data/restaurantCustomers.js'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { loadRestaurantMenuItems } from '../data/restaurantMenu.js'
import { loadFirestoreOrders } from '../data/restaurantFirestoreSync.js'
import { normalizeInvoiceOrders } from '../data/restaurantInvoiceOrders.js'
import { normalizeRestaurantRole } from '../data/restaurantRoles.js'
import { mergeAiOrders } from './aiOrderMerge.js'
import { scopedKey } from '../lib/localDataEvents.js'
import { getActiveCurrencyCode } from '../lib/workspaceCurrency.js'

const TABLES_BASE_KEY = 'nexora.restaurant.tables.v1'

/** Flatten the stored floors → tables list. Never throws. */
export function readStoredTables() {
  if (typeof window === 'undefined') return []
  try {
    const stored = JSON.parse(window.localStorage.getItem(scopedKey(TABLES_BASE_KEY)) || '[]')
    const floors = Array.isArray(stored) ? stored : []
    return floors.flatMap((floor) => (Array.isArray(floor?.tables) ? floor.tables : []).map((table) => ({ ...table, floor: table.floor || floor.name })))
  } catch {
    return []
  }
}

function safeLoad(loader, fallback = []) {
  try {
    const rows = loader()
    return Array.isArray(rows) ? rows : fallback
  } catch {
    return fallback
  }
}

export function useRestaurantAiData({ enabled = true } = {}) {
  const { workspaceId, firebaseUser, userDoc, isOwner, isAdmin } = useUser()
  const settingsApi = useBusinessSettings()
  const settings = settingsApi.settings || {}
  const expensesApi = useExpenses({ limitCount: 500, enabled })
  const invoicesApi = useInvoices({ limitCount: 200, enabled })
  const { sessions } = useRestaurantCashSessions({ enabled, settings })
  const { refunds } = useRestaurantRefunds({ enabled, limitCount: 500 })
  const { ingredients } = useRestaurantIngredients({ enabled })

  const businessName = settings.businessName || userDoc?.workspaceName || userDoc?.company || 'Restaurant'
  const role = isOwner ? 'owner' : isAdmin ? 'admin' : normalizeRestaurantRole(userDoc?.restaurantRole || userDoc?.role)

  // Latest listener-backed values, read at question time instead of via stale closures.
  const live = useRef({})
  useEffect(() => {
    live.current = {
      settings,
      expenses: Array.isArray(expensesApi.expenses) ? expensesApi.expenses : [],
      invoices: Array.isArray(invoicesApi.invoices) ? invoicesApi.invoices : [],
      cashSessions: (Array.isArray(sessions) ? sessions : []).filter((s) => s.status === 'closed'),
      refunds: Array.isArray(refunds) ? refunds : [],
      ingredients: Array.isArray(ingredients) ? ingredients : [],
    }
  })

  const lastFirestoreOrders = useRef([])
  useEffect(() => { lastFirestoreOrders.current = [] }, [workspaceId])

  const getData = useCallback(async () => {
    let firestoreOrders = lastFirestoreOrders.current
    if (workspaceId && firebaseUser) {
      try {
        const fresh = await loadFirestoreOrders(workspaceId)
        if (Array.isArray(fresh)) {
          firestoreOrders = fresh
          lastFirestoreOrders.current = fresh
        }
      } catch {
        // Keep the previous successful fetch rather than answering from nothing.
      }
    }
    const current = live.current
    const s = current.settings || {}
    return {
      orders: mergeAiOrders(safeLoad(loadRestaurantOrders), firestoreOrders, normalizeInvoiceOrders(current.invoices)),
      customers: safeLoad(loadRestaurantCustomers),
      menuItems: safeLoad(loadRestaurantMenuItems),
      expenses: current.expenses,
      cashSessions: current.cashSessions,
      refunds: current.refunds,
      ingredients: current.ingredients,
      tables: readStoredTables(),
      settings: s,
      openingCash: Number(s.openingCash ?? s.cashDrawerOpening ?? s.openingBalance ?? s.cashInHand ?? 0) || 0,
      currency: getActiveCurrencyCode(),
    }
  }, [workspaceId, firebaseUser])

  return {
    getData,
    ready: Boolean(workspaceId && firebaseUser),
    workspaceId,
    businessName,
    role,
    settings,
    firebaseUser,
  }
}
