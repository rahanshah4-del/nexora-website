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

export function resolveWorkspaceName({ workspaceData, accountData, userDoc, userId, fallback } = {}) {
  const stored = readStoredWorkspaceName(userId)
  return (
    cleanString(workspaceData?.workspaceName) ||
    cleanString(workspaceData?.companyName) ||
    cleanString(workspaceData?.company) ||
    cleanString(workspaceData?.name) ||
    cleanString(accountData?.workspaceName) ||
    cleanString(accountData?.companyName) ||
    cleanString(accountData?.company) ||
    cleanString(userDoc?.workspaceName) ||
    cleanString(userDoc?.companyName) ||
    cleanString(userDoc?.company) ||
    stored ||
    cleanString(fallback) ||
    DEFAULT_WORKSPACE_NAME
  )
}
