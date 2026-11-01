export const DEFAULT_WORKSPACE_NAME = 'Nexora Workspace'

const SHARED_WORKSPACE_NAME_KEY = 'nexoraWorkspaceName'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeWorkspaceName(value, fallback = DEFAULT_WORKSPACE_NAME) {
  return cleanString(value) || fallback
}

export function workspaceNameStorageKey(userId) {
  return userId ? `${SHARED_WORKSPACE_NAME_KEY}:${userId}` : SHARED_WORKSPACE_NAME_KEY
}

export function readStoredWorkspaceName(userId) {
  if (typeof window === 'undefined') return ''
  try {
    return cleanString(localStorage.getItem(workspaceNameStorageKey(userId))) || cleanString(localStorage.getItem(SHARED_WORKSPACE_NAME_KEY))
  } catch {
    return ''
  }
}

export function saveStoredWorkspaceName(userId, name) {
  const cleanName = normalizeWorkspaceName(name)
  if (typeof window === 'undefined') return cleanName

  try {
    localStorage.setItem(SHARED_WORKSPACE_NAME_KEY, cleanName)
    if (userId) localStorage.setItem(workspaceNameStorageKey(userId), cleanName)
  } catch {
    // Local persistence is a convenience fallback; failing here should not block UI updates.
  }

  return cleanName
}

/** "someone's Workspace" is the placeholder made at signup when no company was given; it should never beat a real name. */
export function isAutoWorkspaceName(value) {
  const text = cleanString(value)
  return !text || /['\u2019]s workspace$/i.test(text) || text.toLowerCase() === DEFAULT_WORKSPACE_NAME.toLowerCase()
}

/**
 * The name to show for a workspace. A real business name wins (the restaurant's name for a Restaurant POS, the shop's for
 * Retail, and so on, taken from Business settings when `businessName` is passed). The auto placeholder is only used when
 * nothing better exists, and then the owner's own name is shown instead of it.
 */
export function resolveWorkspaceName({ workspaceData, accountData, userDoc, userId, fallback, businessName, personName } = {}) {
  const stored = readStoredWorkspaceName(userId)
  const candidates = [
    businessName,
    workspaceData?.workspaceName, workspaceData?.companyName, workspaceData?.company, workspaceData?.name,
    accountData?.workspaceName, accountData?.companyName, accountData?.company,
    userDoc?.workspaceName, userDoc?.companyName, userDoc?.company,
    stored,
  ].map(cleanString).filter(Boolean)
  const real = candidates.find((name) => !isAutoWorkspaceName(name))
  if (real) return real
  const person = [accountData?.fullName, accountData?.name, accountData?.displayName, userDoc?.fullName, userDoc?.name, userDoc?.displayName, personName]
    .map(cleanString).find((name) => name && !name.includes('@'))
  if (person) return person
  return candidates[0] || cleanString(fallback) || DEFAULT_WORKSPACE_NAME
}
