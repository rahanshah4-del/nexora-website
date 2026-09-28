/**
 * Storage backends for Docs Studio. Both expose the same small interface, so
 * the repository neither knows nor cares which one it runs on:
 *
 *   get(table, key)  put(table, value)  bulkPut(table, values)  delete(table, key)
 *   getAll(table)    clear(table)       transaction(tables, fn)  close()
 *
 * IndexedDB (via Dexie) is the real one. When it cannot be opened — private
 * browsing modes that disable it, storage blocked by the user, a hung open —
 * the in-memory backend takes over and the UI warns that nothing persists.
 */

import Dexie from 'dexie'

export const DB_NAME = 'nexora-docs-studio'
export const TABLES = Object.freeze(['settings', 'clients', 'products', 'documents', 'counters', 'assets'])

/** Dexie schema, version 1. Only indexed fields are listed; records hold more. */
export const SCHEMA_V1 = Object.freeze({
  settings: 'key',
  clients: 'id, nameLower, updatedAt',
  products: 'id, nameLower, updatedAt',
  documents: 'id, type, [type+number], clientName, issueDate, status, updatedAt',
  counters: 'key',
  assets: 'id',
})

const OPEN_TIMEOUT_MS = 4000

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('IndexedDB open timed out')), ms) }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * @param {string} [name]
 * @returns {Promise<StorageBackend>}
 */
export async function openIndexedDbBackend(name = DB_NAME) {
  if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB is not available')
  const db = new Dexie(name)
  db.version(1).stores(SCHEMA_V1)
  try {
    await withTimeout(db.open(), OPEN_TIMEOUT_MS)
  } catch (error) {
    db.close()
    throw error
  }
  return {
    kind: 'indexeddb',
    get: (table, key) => db.table(table).get(key),
    put: (table, value) => db.table(table).put(value),
    bulkPut: (table, values) => db.table(table).bulkPut(values),
    delete: (table, key) => db.table(table).delete(key),
    getAll: (table) => db.table(table).toArray(),
    clear: (table) => db.table(table).clear(),
    transaction: (tables, fn) => db.transaction('rw', tables.map((t) => db.table(t)), fn),
    close: () => db.close(),
    destroy: () => db.delete(),
  }
}

/**
 * Same interface over Maps. Values are shallow-copied on the way in and out,
 * which (like IndexedDB) keeps callers from mutating stored records.
 * @returns {StorageBackend}
 */
export function createMemoryBackend() {
  const tables = new Map(TABLES.map((t) => [t, new Map()]))
  const keyOf = (table, value) => (table === 'settings' || table === 'counters' ? value.key : value.id)
  const copy = (value) => (value && typeof value === 'object' ? { ...value } : value)
  const tableOf = (name) => {
    const table = tables.get(name)
    if (!table) throw new Error(`Unknown table ${name}`)
    return table
  }
  return {
    kind: 'memory',
    get: async (table, key) => copy(tableOf(table).get(key)),
    put: async (table, value) => { tableOf(table).set(keyOf(table, value), copy(value)) },
    bulkPut: async (table, values) => { values.forEach((v) => tableOf(table).set(keyOf(table, v), copy(v))) },
    delete: async (table, key) => { tableOf(table).delete(key) },
    getAll: async (table) => [...tableOf(table).values()].map(copy),
    clear: async (table) => { tableOf(table).clear() },
    transaction: async (_tables, fn) => fn(),
    close: () => {},
    destroy: async () => { tables.forEach((t) => t.clear()) },
  }
}

/**
 * IndexedDB when possible, memory otherwise.
 * @returns {Promise<{ backend: StorageBackend, fallbackReason: string | null }>}
 */
export async function openStorageBackend({ name = DB_NAME } = {}) {
  try {
    return { backend: await openIndexedDbBackend(name), fallbackReason: null }
  } catch (error) {
    return { backend: createMemoryBackend(), fallbackReason: error?.name || error?.message || 'unavailable' }
  }
}

/**
 * @typedef {object} StorageBackend
 * @property {'indexeddb' | 'memory'} kind
 * @property {(table: string, key: string) => Promise<any>} get
 * @property {(table: string, value: object) => Promise<any>} put
 * @property {(table: string, values: object[]) => Promise<any>} bulkPut
 * @property {(table: string, key: string) => Promise<void>} delete
 * @property {(table: string) => Promise<object[]>} getAll
 * @property {(table: string) => Promise<void>} clear
 * @property {(tables: string[], fn: () => Promise<any>) => Promise<any>} transaction
 * @property {() => void} close
 * @property {() => Promise<void>} destroy
 */
