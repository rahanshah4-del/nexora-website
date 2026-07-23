import { scopedKey } from '../lib/localDataEvents.js'

const HISTORY_BASE = 'nexora.restaurant.menu.import-history.v1'
const MAX_ENTRIES = 20

function _historyKey() {
  return scopedKey(HISTORY_BASE)
}

/**
 * @typedef {Object} ImportHistoryEntry
 * @property {string} id
 * @property {string} fileName
 * @property {number} fileSize
 * @property {string} fileType
 * @property {string} imageUrl
 * @property {number} totalExtracted
 * @property {number} totalImported
 * @property {number} skipped
 * @property {string[]} newCategories
 * @property {number} processingTimeMs
 * @property {string} modelUsed
 * @property {string} timestamp ISO string
 */

/** @returns {ImportHistoryEntry[]} */
export function loadImportHistory() {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(_historyKey())
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * @param {ImportHistoryEntry} entry
 */
export function saveImportHistoryEntry(entry) {
  if (typeof window === 'undefined') return
  const history = loadImportHistory()
  history.unshift(entry)
  const trimmed = history.slice(0, MAX_ENTRIES)
  try {
    window.localStorage.setItem(_historyKey(), JSON.stringify(trimmed))
  } catch { /* Ignore quota errors */ }
}

export function clearImportHistory() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(_historyKey())
  } catch { /* Ignore */ }
}

/**
 * Build a history entry from a successful import.
 * @param {Object} params
 * @returns {ImportHistoryEntry}
 */
export function buildHistoryEntry({ fileName, fileSize, fileType, imageUrl, stats, imported, skipped, newCategories }) {
  return {
    id: `import-${Date.now()}`,
    fileName: fileName || 'unknown',
    fileSize: fileSize || 0,
    fileType: fileType || 'image/png',
    imageUrl: imageUrl || '',
    totalExtracted: stats?.total || 0,
    totalImported: imported || 0,
    skipped: skipped || 0,
    newCategories: newCategories || [],
    processingTimeMs: stats?.processingTimeMs || 0,
    modelUsed: stats?.modelUsed || '',
    timestamp: new Date().toISOString(),
  }
}
