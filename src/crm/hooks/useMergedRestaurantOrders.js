/**
 * useMergedRestaurantOrders — Combines localStorage + Firestore restaurant orders.
 *
 * Returns the same shape as loadRestaurantOrders() so all existing screens
 * work without changes to display logic. Firestore orders are loaded async
 * and merged in the background. Deduplication by orderNumber.
 *
 * localStorage remains the source of truth for website-created orders;
 * Firestore orders supplement with desktop-created orders (D- prefix).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { loadFirestoreOrders } from '../data/restaurantFirestoreSync.js'
import { useUser } from './useUser.js'

export function useMergedRestaurantOrders() {
  const { workspaceId, firebaseUser } = useUser()
  const [firestoreOrders, setFirestoreOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0)

  // Reload Firestore orders when workspace changes or manually triggered
  const reloadFirestore = useCallback(async () => {
    if (!workspaceId || !firebaseUser) {
      setFirestoreOrders([])
      return
    }
    setLoading(true)
    try {
      const fsOrders = await loadFirestoreOrders(workspaceId)
      setFirestoreOrders(Array.isArray(fsOrders) ? fsOrders : [])
    } catch (err) {
      console.warn('[useMergedRestaurantOrders] Firestore load failed:', err?.message || err)
      setFirestoreOrders([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, firebaseUser])

  // Initial load + reload when workspace/auth changes
  useEffect(() => {
    reloadFirestore()
  }, [reloadFirestore])

  // Merge localStorage orders with Firestore orders, dedup by orderNumber.
  // Firestore orderNumbers have prefixes ('W-#45266', 'D-1007'); localStorage
  // orderNumbers have no prefix ('#45266'). Strip 'W-' prefix from Firestore
  // orderNumbers when comparing, so website orders appear once not twice.
  const orders = useMemo(() => {
    const localOrders = loadRestaurantOrders()
    // Build set of dedup keys from local orders.
    // Strip ALL known order-number prefixes (W- website, D- desktop, # local)
    // so "#1080", "D-1080", and "W-1080" are all recognized as the same logical order.
    const localDedupKeys = new Set(
      localOrders.map((o) => String(o.orderNumber || '').replace(/^(W-|D-|#)/, '')).filter(Boolean),
    )
    // Only include Firestore orders that don't already exist in localStorage.
    // Apply the SAME prefix stripping on both sides of the comparison.
    const newFirestoreOrders = firestoreOrders.filter((o) => {
      if (!o.orderNumber) return false
      const dedupKey = String(o.orderNumber).replace(/^(W-|D-|#)/, '')
      return !localDedupKeys.has(dedupKey)
    })
    return [...localOrders, ...newFirestoreOrders]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestoreOrders, version])

  return {
    orders,
    loading,
    firestoreCount: firestoreOrders.length,
    totalCount: orders.length,
    refresh: reloadFirestore,
    invalidate: () => setVersion((v) => v + 1),
  }
}
