/**
 * Auth Isolation — safely clear all user-scoped localStorage/sessionStorage
 * when a user logs out, so the next login starts with a clean slate.
 */

// All localStorage keys that are user-scoped and must be cleared on logout.
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  'selectedWorkspace',
  'selectedWorkspaceUserId',
  'selectedProduct',
  'selectedProductUserId',
  'nexoraWorkspaceName',
  'nexora_workspace_view_mode',
  'nexora_preferences_v1',
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
    // Clear known user-scoped localStorage keys
    LOCAL_STORAGE_KEYS_TO_CLEAR.forEach((key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Ignore individual key failures
      }
    })

    // Clear user-scoped localStorage keys (pattern: key:userId)
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

    // Clear unscoped sessionStorage keys (no userId prefix)
    UNSCoped_SESSION_KEYS.forEach((key) => {
      try {
        window.sessionStorage.removeItem(key)
      } catch {
        // Ignore
      }
    })

    // Clear known sessionStorage prefixes (all keys starting with prefix)
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

    // Clear user-scoped session keys
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

    // Clear ALL remaining sessionStorage keys that start with known prefixes
    // (catch any wildcard keys that survived the targeted clears)
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
