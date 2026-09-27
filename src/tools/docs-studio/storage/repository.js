/**
 * Docs Studio repository: everything the editor saves, on top of a storage
 * backend (backends.js). All data stays in the browser.
 *
 * Documents are stored as their serializeDocument() JSON plus a few indexed
 * fields for listing; nothing computed is persisted except `total_minor`, a
 * convenience for history lists that is recomputed on every save.
 *
 * Numbering: counters are keyed by `${type}:${periodKey}` and advanced only by
 * SAVED documents (the number of a saved document, parsed with the type's
 * pattern, raises its counter). A new document shows the next number without
 * reserving it, so abandoned drafts and type switches leave no gaps.
 */

import {
  calculateDocument, deserializeDocument, generateId, getDocumentType, nextNumber, normalizeAppearance,
  normalizeParty, parseSeq, periodKey, serializeDocument, todayIso,
} from '../engine/index.js'

export const BACKUP_FORMAT = 'nexora-docs-studio-backup'
export const BACKUP_VERSION = 1
export const MAX_ASSET_BYTES = 2 * 1024 * 1024
export const ASSET_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/** Setting keys the app uses (and the only ones a backup may restore). */
export const SETTING_KEYS = Object.freeze({
  businessDefault: 'businessDefault', // { enabled: boolean, party: Party }
  preferences: 'preferences', // { currency, locale, accentColor, paperSize, wordsSystem }
  lastDocumentId: 'lastDocumentId',
  sampleSeen: 'sampleSeen',
})

const str = (value, max = 500) => (typeof value === 'string' ? value.slice(0, max) : '')
const int = (value) => (Number.isSafeInteger(value) ? value : 0)

export function numberingFor(type) {
  const config = getDocumentType(type) || getDocumentType('invoice')
  return { pattern: config.numberPattern, prefix: config.prefix }
}

const counterKey = (type, period) => `${type}:${period}`

function withoutData(record) {
  const meta = { ...record }
  delete meta.data
  return meta
}

/** Saved client (a Party plus bookkeeping fields). */
export function normalizeClient(raw, { now = Date.now(), idFactory = generateId } = {}) {
  const party = normalizeParty(raw)
  return {
    id: str(raw?.id, 100) || idFactory(),
    ...party,
    logoAssetId: '',
    nameLower: `${party.name} ${party.company}`.trim().toLowerCase(),
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : now,
  }
}

/** Saved product / service. Prices are in `currency` minor units. */
export function normalizeProduct(raw, { now = Date.now(), idFactory = generateId } = {}) {
  const description = str(raw?.description, 2000)
  const currency = typeof raw?.currency === 'string' && /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : 'USD'
  return {
    id: str(raw?.id, 100) || idFactory(),
    description,
    sku: str(raw?.sku, 100),
    unit: str(raw?.unit, 50),
    unitPrice_minor: int(raw?.unitPrice_minor),
    currency,
    nameLower: description.toLowerCase(),
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : now,
  }
}

function normalizePreferences(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const appearance = normalizeAppearance(p)
  return {
    currency: typeof p.currency === 'string' && /^[A-Z]{3}$/.test(p.currency) ? p.currency : 'USD',
    locale: str(p.locale, 35) || 'en-US',
    accentColor: appearance.accentColor,
    paperSize: appearance.paperSize,
    wordsSystem: p.wordsSystem === 'indian' ? 'indian' : 'western',
  }
}

function sanitizeSetting(key, value) {
  if (key === SETTING_KEYS.businessDefault) {
    return { enabled: value?.enabled === true, party: normalizeParty(value?.party) }
  }
  if (key === SETTING_KEYS.preferences) return normalizePreferences(value)
  if (key === SETTING_KEYS.lastDocumentId) return str(value, 100)
  if (key === SETTING_KEYS.sampleSeen) return value === true
  return undefined
}

// ── base64 for backup assets ──

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToBytes(text) {
  try {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/**
 * @param {import('./backends.js').StorageBackend} backend
 * @param {{ now?: () => number, idFactory?: () => string }} [options]
 */
export function createRepository(backend, { now = () => Date.now(), idFactory = generateId } = {}) {
  const repo = {
    kind: backend.kind,
    persistent: backend.kind === 'indexeddb',

    // ── Settings ──
    async getSetting(key, fallback = null) {
      const record = await backend.get('settings', key)
      return record ? record.value : fallback
    },
    async setSetting(key, value) {
      await backend.put('settings', { key, value })
    },

    // ── Numbering ──
    async peekNextNumber(type, date = todayIso()) {
      const { pattern, prefix } = numberingFor(type)
      const record = await backend.get('counters', counterKey(type, periodKey(pattern, date)))
      return nextNumber(pattern, record?.lastSeq || 0, date, { prefix })
    },
    /** Raises the type's counter to the sequence in `number`, if it matches the pattern. */
    async syncCounter(type, number, date = todayIso()) {
      const { pattern, prefix } = numberingFor(type)
      const seq = parseSeq(number, pattern, { prefix })
      if (seq === null) return null
      const key = counterKey(type, periodKey(pattern, date))
      const record = await backend.get('counters', key)
      if (!record || record.lastSeq < seq) {
        await backend.put('counters', { key, type, period: periodKey(pattern, date), lastSeq: seq })
      }
      return seq
    },

    // ── Documents ──
    async saveDocument(doc) {
      const data = serializeDocument(doc)
      const stored = JSON.parse(data)
      return backend.transaction(['documents', 'counters'], async () => {
        const existing = await backend.get('documents', stored.id)
        const record = {
          id: stored.id,
          type: stored.type,
          number: stored.number,
          status: stored.status,
          clientName: stored.client.name || stored.client.company,
          currency: stored.currency,
          issueDate: stored.issueDate || '',
          total_minor: calculateDocument(stored).total,
          createdAt: existing?.createdAt ?? now(),
          updatedAt: now(),
          data,
        }
        await backend.put('documents', record)
        if (stored.number) await repo.syncCounter(stored.type, stored.number, stored.issueDate || todayIso())
        return withoutData(record)
      })
    },
    /** @returns {Promise<{ ok: true, document: object } | { ok: false, error: object } | null>} */
    async getDocument(id) {
      const record = await backend.get('documents', id)
      return record ? deserializeDocument(record.data) : null
    },
    /** Metadata only (no document body), newest first. */
    async listDocuments({ type, limit = 200 } = {}) {
      const all = await backend.getAll('documents')
      return all
        .filter((r) => !type || r.type === type)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit)
        .map(withoutData)
    },
    async countDocuments() {
      return (await backend.getAll('documents')).length
    },
    async deleteDocument(id) {
      await backend.delete('documents', id)
    },

    // ── Clients ──
    /** Upserts by id, else by same name + email; returns the stored client. */
    async saveClient(party) {
      const all = await backend.getAll('clients')
      const candidate = normalizeClient(party, { now: now(), idFactory })
      const match = party?.id
        ? all.find((c) => c.id === party.id)
        : all.find((c) => c.nameLower === candidate.nameLower && c.email.toLowerCase() === candidate.email.toLowerCase())
      const record = { ...candidate, id: match?.id || candidate.id, updatedAt: now() }
      await backend.put('clients', record)
      return record
    },
    async listClients() {
      return (await backend.getAll('clients')).sort((a, b) => b.updatedAt - a.updatedAt)
    },
    async searchClients(query, limit = 8) {
      const q = String(query || '').trim().toLowerCase()
      const all = await repo.listClients()
      return (q ? all.filter((c) => c.nameLower.includes(q) || c.email.toLowerCase().includes(q)) : all).slice(0, limit)
    },
    async deleteClient(id) {
      await backend.delete('clients', id)
    },

    // ── Products ──
    async saveProduct(fields) {
      const all = await backend.getAll('products')
      const candidate = normalizeProduct(fields, { now: now(), idFactory })
      const match = fields?.id ? all.find((p) => p.id === fields.id) : all.find((p) => p.nameLower === candidate.nameLower)
      const record = { ...candidate, id: match?.id || candidate.id, updatedAt: now() }
      await backend.put('products', record)
      return record
    },
    async listProducts() {
      return (await backend.getAll('products')).sort((a, b) => b.updatedAt - a.updatedAt)
    },
    async searchProducts(query, limit = 8) {
      const q = String(query || '').trim().toLowerCase()
      const all = await repo.listProducts()
      return (q ? all.filter((p) => p.nameLower.includes(q) || p.sku.toLowerCase().includes(q)) : all).slice(0, limit)
    },
    async deleteProduct(id) {
      await backend.delete('products', id)
    },

    // ── Assets (logos) ──
    async putAsset({ blob, width = 0, height = 0 }) {
      if (!blob || !ASSET_TYPES.includes(blob.type)) throw new Error('Unsupported image type')
      if (blob.size > MAX_ASSET_BYTES) throw new Error('Image too large')
      const id = idFactory()
      await backend.put('assets', { id, blob, mime: blob.type, width, height, createdAt: now() })
      return id
    },
    async getAsset(id) {
      return id ? (await backend.get('assets', id)) || null : null
    },
    async deleteAsset(id) {
      await backend.delete('assets', id)
    },

    // ── Backup ──
    async exportBackup() {
      const [settings, clients, products, counters, documents, assets] = await Promise.all(
        ['settings', 'clients', 'products', 'counters', 'documents', 'assets'].map((t) => backend.getAll(t)),
      )
      return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date(now()).toISOString(),
        settings: settings.filter((s) => Object.values(SETTING_KEYS).includes(s.key)),
        clients,
        products,
        counters,
        documents: documents.map((d) => JSON.parse(d.data)),
        assets: await Promise.all(assets.map(async (a) => ({ id: a.id, mime: a.mime, width: a.width, height: a.height, data: await blobToBase64(a.blob) }))),
      }
    },

    /**
     * Restores a backup (merging by id), or recognises a single exported
     * document. Every record is validated: documents through
     * deserializeDocument (migration + normalizeDocument), everything else
     * through its normalizer. Never throws on bad input.
     * @param {string | object} input
     */
    async importBackup(input) {
      let data = input
      if (typeof input === 'string') {
        try {
          data = JSON.parse(input)
        } catch {
          return { ok: false, error: { code: 'invalid_json', message: 'This file is not valid JSON.' } }
        }
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: { code: 'invalid_backup', message: 'This file is not a Docs Studio backup.' } }
      }
      if (data.format !== BACKUP_FORMAT) {
        const single = deserializeDocument(data)
        if (single.ok) return { ok: true, kind: 'document', document: single.document }
        return { ok: false, error: { code: 'invalid_backup', message: 'This file is not a Docs Studio backup or document.' } }
      }
      if (!Number.isInteger(data.version) || data.version > BACKUP_VERSION) {
        return { ok: false, error: { code: 'unsupported_backup_version', message: 'This backup was made by a newer version of the tool.' } }
      }
      const list = (value) => (Array.isArray(value) ? value : [])
      const counts = { documents: 0, clients: 0, products: 0, assets: 0, settings: 0 }
      let skipped = 0

      for (const raw of list(data.assets)) {
        const bytes = typeof raw?.data === 'string' ? base64ToBytes(raw.data) : null
        const id = str(raw?.id, 100)
        if (!id || !bytes || !ASSET_TYPES.includes(raw.mime) || bytes.length > MAX_ASSET_BYTES) { skipped++; continue }
        await backend.put('assets', { id, blob: new Blob([bytes], { type: raw.mime }), mime: raw.mime, width: int(raw.width), height: int(raw.height), createdAt: now() })
        counts.assets++
      }
      for (const raw of list(data.clients)) {
        if (!raw || typeof raw !== 'object') { skipped++; continue }
        await backend.put('clients', normalizeClient(raw, { now: now(), idFactory }))
        counts.clients++
      }
      for (const raw of list(data.products)) {
        if (!raw || typeof raw !== 'object') { skipped++; continue }
        await backend.put('products', normalizeProduct(raw, { now: now(), idFactory }))
        counts.products++
      }
      for (const raw of list(data.settings)) {
        const value = raw && Object.values(SETTING_KEYS).includes(raw.key) ? sanitizeSetting(raw.key, raw.value) : undefined
        if (value === undefined) { skipped++; continue }
        await backend.put('settings', { key: raw.key, value })
        counts.settings++
      }
      for (const raw of list(data.counters)) {
        const [type, period] = String(raw?.key || '').split(':')
        if (!getDocumentType(type) || !period || !Number.isSafeInteger(raw.lastSeq) || raw.lastSeq < 0) { skipped++; continue }
        const existing = await backend.get('counters', raw.key)
        if (!existing || existing.lastSeq < raw.lastSeq) await backend.put('counters', { key: raw.key, type, period, lastSeq: raw.lastSeq })
      }
      for (const raw of list(data.documents)) {
        const result = deserializeDocument(raw)
        if (!result.ok) { skipped++; continue }
        await repo.saveDocument(result.document)
        counts.documents++
      }
      return { ok: true, kind: 'backup', counts, skipped }
    },

    async clearAll() {
      for (const table of ['settings', 'clients', 'products', 'documents', 'counters', 'assets']) await backend.clear(table)
    },
  }
  return repo
}
