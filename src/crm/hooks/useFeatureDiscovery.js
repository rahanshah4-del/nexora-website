import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from './useUser.js'
import { allFeatureKeys, featureByKey } from '../lib/featureRegistry.js'

const LS_PREFIX = 'nexora.feature.seen.'

// ─── Legacy features (shipped before this system) ───────────────────────────
// Auto-marked as seen for all users on first load.
const LEGACY_FEATURES = [
  'inventory-intelligence-v1',
  'business-intelligence-v1',
  'shift-settlement-v1',
  'restaurant-settlement-v1',
]

// ─── LocalStorage helpers (fallback + performance cache) ─────────────────────

function lsKey(userId, featureKey) {
  return `${LS_PREFIX}${userId}.${featureKey}`
}

function storedVersion(userId, featureKey) {
  try {
    const raw = window.localStorage.getItem(lsKey(userId, featureKey))
    return raw ? String(raw).trim() : ''
  } catch { return '' }
}

function markLsSeen(userId, featureKey, version) {
  try { window.localStorage.setItem(lsKey(userId, featureKey), version) } catch { /* noop */ }
}

function clearLs(userId) {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(`${LS_PREFIX}${userId}.`))
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch { /* noop */ }
}

// ─── Firestore path ─────────────────────────────────────────────────────────

function seenDocRef(workspaceId, userId) {
  return doc(db, 'workspaces', workspaceId, 'featureSeen', userId)
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useFeatureDiscovery
 *
 * Returns per-feature "new" status and a markSeen callback.
 *
 * Usage:
 *   const { isNew, markSeen } = useFeatureDiscovery()
 *   if (isNew('delivery-v1')) ...show badge...
 *   onClick = () => markSeen('delivery-v1')
 */
export function useFeatureDiscovery({ enabled = true } = {}) {
  const { userId, workspaceId } = useUser()
  const [firestoreSeen, setFirestoreSeen] = useState(null)   // null = not loaded yet
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  // Load from Firestore once, merge into memory + localStorage
  useEffect(() => {
    if (!enabled || !db || !workspaceId || !userId) {
      setFirestoreSeen({})
      setLoading(false)
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true

    setLoading(true)
    getDoc(seenDocRef(workspaceId, userId))
      .then((snap) => {
        const data = snap.exists() ? (snap.data().seen || {}) : {}
        // Auto-mark legacy features as seen
        let needsPersist = false
        const merged = { ...data }
        LEGACY_FEATURES.forEach((key) => {
          const entry = featureByKey(key)
          if (entry && !merged[key]) {
            merged[key] = entry.version
            markLsSeen(userId, key, entry.version)
            needsPersist = true
          }
        })
        setFirestoreSeen(merged)
        if (needsPersist) {
          // Persist legacy marks to Firestore
          const patch = {}
          LEGACY_FEATURES.forEach((key) => {
            const entry = featureByKey(key)
            if (entry) patch[key] = entry.version
          })
          setDoc(seenDocRef(workspaceId, userId), { seen: patch, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => {
        // Firestore read failed; rely on localStorage fallback
        setFirestoreSeen({})
        setLoading(false)
      })
  }, [enabled, userId, workspaceId])

  // Merge Firestore + localStorage into a single seen map
  const seenMap = useMemo(() => {
    const map = { ...(firestoreSeen || {}) }
    if (userId) {
      // Fallback: any key in localStorage but not in Firestore
      allFeatureKeys().forEach((key) => {
        if (!map[key]) {
          const lsVer = storedVersion(userId, key)
          if (lsVer) map[key] = lsVer
        }
      })
    }
    return map
  }, [firestoreSeen, userId])

  /**
   * Check whether a feature key is "new" (unseen or version mismatch).
   */
  const isFeatureNew = useCallback(
    (featureKey) => {
      if (!featureKey) return false
      const entry = featureByKey(featureKey)
      if (!entry) return false
      const seenVersion = seenMap[featureKey]
      // New if never seen or if the stored version is older
      return !seenVersion || seenVersion !== entry.version
    },
    [seenMap],
  )

  /**
   * Mark a feature as seen (current version). Persists to Firestore +
   * localStorage immediately.
   */
  const markFeatureSeen = useCallback(
    async (featureKey) => {
      if (!featureKey || !userId) return
      const entry = featureByKey(featureKey)
      if (!entry) return

      const version = entry.version

      // Immediate local update (no refresh needed)
      setFirestoreSeen((prev) => ({ ...(prev || {}), [featureKey]: version }))
      markLsSeen(userId, featureKey, version)

      // Firestore persist (fire-and-forget)
      if (db && workspaceId) {
        try {
          await setDoc(seenDocRef(workspaceId, userId), { seen: { [featureKey]: version }, updatedAt: serverTimestamp() }, { merge: true })
        } catch { /* silent */ }
      }
    },
    [userId, workspaceId],
  )

  /**
   * Single call that checks and marks in one shot. Useful for onClick handlers.
   */
  const checkAndMark = useCallback(
    (featureKey) => {
      const isNew = isFeatureNew(featureKey)
      if (isNew) markFeatureSeen(featureKey)
      return isNew
    },
    [isFeatureNew, markFeatureSeen],
  )

  /**
   * Reset all seen data for the current user (dev / testing).
   */
  const resetFeatures = useCallback(async () => {
    if (!userId) return
    clearLs(userId)
    setFirestoreSeen({})
    if (db && workspaceId) {
      try { await setDoc(seenDocRef(workspaceId, userId), { seen: {}, updatedAt: serverTimestamp() }) } catch { /* silent */ }
    }
  }, [userId, workspaceId])

  /**
   * Batch-mark multiple features (e.g. on app load for legacy features).
   */
  const markMultipleSeen = useCallback(
    (featureKeys) => {
      if (!Array.isArray(featureKeys) || !userId) return
      featureKeys.forEach((key) => {
        const entry = featureByKey(key)
        if (entry) {
          markLsSeen(userId, key, entry.version)
          setFirestoreSeen((prev) => ({ ...(prev || {}), [key]: entry.version }))
        }
      })
      // Firestore persist (batched)
      if (db && workspaceId) {
        const patch = {}
        featureKeys.forEach((key) => {
          const entry = featureByKey(key)
          if (entry) patch[key] = entry.version
        })
        if (Object.keys(patch).length > 0) {
          setDoc(seenDocRef(workspaceId, userId), { seen: patch, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
        }
      }
    },
    [userId, workspaceId],
  )

  return useMemo(
    () => ({
      /** Check if a feature key is new for this user. */
      isNew: isFeatureNew,
      /** Mark a single feature as seen. */
      markSeen: markFeatureSeen,
      /** Check + mark in one call; returns true if it was new. */
      checkAndMark,
      /** Reset all seen data. */
      reset: resetFeatures,
      /** Batch-mark features. */
      markMultipleSeen,
      /** True while loading from Firestore. */
      loading,
    }),
    [isFeatureNew, markFeatureSeen, checkAndMark, resetFeatures, markMultipleSeen, loading],
  )
}
