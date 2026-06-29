import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firestoreDb as db } from '../lib/firebase.js'
import { getMaintenanceState, normalizeMaintenanceConfig } from '../lib/maintenanceMode.js'

const MAINTENANCE_CACHE_KEY = 'nexora-platform-maintenance-cache-v1'
const MAINTENANCE_CACHE_TTL_MS = 2 * 60 * 1000

function configFromData(data = {}) {
  return normalizeMaintenanceConfig(data.maintenanceConfig || {
    enabled: data.maintenanceMode === true,
    target: 'workspace',
  })
}

function readCachedConfig() {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(MAINTENANCE_CACHE_KEY) || 'null')
    if (!cached?.at || !cached?.config) return null
    if (Date.now() - cached.at > MAINTENANCE_CACHE_TTL_MS) return null
    return normalizeMaintenanceConfig(cached.config)
  } catch {
    return null
  }
}

function writeCachedConfig(config) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify({ at: Date.now(), config }))
  } catch {
    // Best-effort cache only.
  }
}

export default function usePlatformMaintenance(context) {
  const [config, setConfig] = useState(() => readCachedConfig() || normalizeMaintenanceConfig())

  useEffect(() => {
    if (!db) return undefined
    let cancelled = false
    async function loadConfig() {
      const cached = readCachedConfig()
      if (cached) {
        setConfig(cached)
        return
      }
      try {
        const snapshot = await getDoc(doc(db, 'platformSettings', 'main'))
        if (cancelled) return
        const next = configFromData(snapshot.exists() ? snapshot.data() : {})
        setConfig(next)
        writeCachedConfig(next)
      } catch {
        if (!cancelled) setConfig(normalizeMaintenanceConfig())
      }
    }
    loadConfig()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => getMaintenanceState(config, context), [config, context])
}
