export const LOCAL_DATA_CHANGED_EVENT = 'nexora:localDataChanged'

let _scopeWid = ''
let _scopeUid = ''

export function setStorageScope(workspaceId, userId) {
  _scopeWid = workspaceId || ''
  _scopeUid = userId || ''
}

export function getStorageScope() {
  return { workspaceId: _scopeWid, userId: _scopeUid }
}

/**
 * Returns a workspace+user-scoped storage key from a base key.
 * Format: {baseKey}.{workspaceId}.{userId}
 * If no scope is set, returns the base key unchanged (backward compat).
 */
export function scopedKey(baseKey, wid, uid) {
  const w = wid || _scopeWid
  const u = uid || _scopeUid
  if (!w || !u) return baseKey
  return `${baseKey}.${w}.${u}`
}

/**
 * Migrate data from oldKey to newKey (one-time copy then delete).
 * Returns the data that was in oldKey (or currently in newKey).
 */
export function migrateKey(oldKey, newKey) {
  if (typeof window === 'undefined') return null
  if (oldKey === newKey) {
    // Already migrated, just return existing data
    try {
      const raw = window.localStorage.getItem(newKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  try {
    const oldData = window.localStorage.getItem(oldKey)
    const existingNewData = window.localStorage.getItem(newKey)
    if (oldData !== null && existingNewData === null) {
      window.localStorage.setItem(newKey, oldData)
    }
    window.localStorage.removeItem(oldKey)
    try {
      const raw = window.localStorage.getItem(newKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  } catch {
    return null
  }
}

export function readScoped(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeScoped(key, data) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(data))
}

export function removeScoped(key) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

export function notifyLocalDataChanged(storageKey) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail: { storageKey } }))
}
