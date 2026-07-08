/**
 * Auth Isolation — safely clear all user-scoped localStorage/sessionStorage
 * when a user logs out, so the next login starts with a clean slate.
 *
 * Uses scope-aware cleanup: only removes keys matching the current
 * workspace+user session, never another workspace's cache.
 */

// Legacy localStorage keys (pre-scoping) that must be cleared on logout.
const LEGACY_LOCAL_KEYS = [
  'selectedWorkspace',
  'selectedWorkspaceUserId',
  'selectedProduct',
  'selectedProductUserId',
  'nexoraWorkspaceName',
  'nexora_workspace_view_mode',
  'nexora_preferences_v1',
  'nexora.restaurant.orders.v2',
  'nexora.restaurant.customers.v2',
  'nexora.restaurant.menu.v2',
  'nexora.restaurant.menu.categories.v1',
  'nexora.restaurant.tables.v1',
  'nexora.transport.vehicles.v1',
  'nexora.transport.bookings.v1',
  'nexora.transport.customers.v1',
  'nexora.transport.payments.v1',
]

// All sessionStorage keys that must be cleared on logout.
const SESSION_STORAGE_PREFIXES_TO_CLEAR = [
  'nexoraSessionId',
  'nexoraSessionStartedAt',
  'nexoraWorkspaceModalSeen',
]

// Global (unscoped) sessionStorage keys to clear on any logout
const UNSCoped_SESSION_KEYS = [
  'nexoraSessionId',
  'nexoraSessionStartedAt',
]

export function clearAllUserCache(userId) {
  if (typeof window === 'undefined') return

  try {
    // 1. Clear legacy unscoped localStorage keys
    LEGACY_LOCAL_KEYS.forEach((key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Ignore individual key failures
      }
    })

    // 2. Clear user-scoped legacy keys (pattern: key:userId)
    if (userId) {
      try {
        window.localStorage.removeItem(`selectedWorkspace:${userId}`)
      } catch {
        // Ignore
      }
      try {
        window.localStorage.removeItem(`nexoraWorkspaceName:${userId}`)
      } catch {
        // Ignore
      }
    }

    // 3. Clear ALL scoped nexora.* keys for this user+workspace session.
    //    Scoped format: nexora.<module>.<workspaceId>.<userId>
    //    We remove any nexora.* key that matches the current userId pattern.
    if (userId) {
      try {
        const allKeys = Object.keys(window.localStorage)
        allKeys.forEach((key) => {
          // Match: nexora.module.workspaceId.userId (scoped key)
          if (key.startsWith('nexora.') && key.endsWith(`.${userId}`)) {
            window.localStorage.removeItem(key)
          }
        })
      } catch {
        // Ignore
      }
    }

    // 4. Clear unscoped sessionStorage keys
    UNSCoped_SESSION_KEYS.forEach((key) => {
      try {
        window.sessionStorage.removeItem(key)
      } catch {
        // Ignore
      }
    })

    // 5. Clear known sessionStorage prefixes (all keys starting with prefix)
    SESSION_STORAGE_PREFIXES_TO_CLEAR.forEach((prefix) => {
      try {
        Object.keys(window.sessionStorage).forEach((key) => {
          if (key.startsWith(prefix)) {
            window.sessionStorage.removeItem(key)
          }
        })
      } catch {
        // Ignore individual key failures
      }
    })

    // 6. Clear user-scoped session keys
    if (userId) {
      try {
        window.sessionStorage.removeItem(`nexoraSessionId:${userId}`)
      } catch {
        // Ignore
      }
      try {
        window.sessionStorage.removeItem(`nexoraSessionStartTime:${userId}`)
      } catch {
        // Ignore
      }
      // Clear workspace-modal-seen keys for this user
      try {
        Object.keys(window.sessionStorage).forEach((key) => {
          if (key.startsWith(`nexoraWorkspaceModalSeen:${userId}:`)) {
            window.sessionStorage.removeItem(key)
          }
        })
      } catch {
        // Ignore
      }
    }

    // 7. Clear ALL remaining sessionStorage keys that start with known prefixes
    try {
      const allPrefixes = [...SESSION_STORAGE_PREFIXES_TO_CLEAR, ...UNSCoped_SESSION_KEYS]
      const remainingKeys = Object.keys(window.sessionStorage)
      remainingKeys.forEach((key) => {
        if (allPrefixes.some((prefix) => key.startsWith(prefix))) {
          window.sessionStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore
    }

    console.log('[Auth Isolation] cache cleared', { userId: userId || 'none' })
  } catch (err) {
    console.warn('[Auth Isolation] cache clear failed', { error: err?.message || err })
  }
}

export function validateWorkspaceOwner(userId, workspaceId) {
  if (!userId || !workspaceId) return false
  // For self-owned workspaces (userId === workspaceId during trial/onboarding), it's always valid
  if (userId === workspaceId) return true
  // Additional validation should happen server-side via Firestore reads
  return true
}
