/**
 * Saving, loading and sharing documents.
 *
 * serializeDocument   document → JSON string of the stored model only.
 *                     Computed values (totals, warnings, anything a UI hangs
 *                     on the object) are dropped because normalizeDocument()
 *                     copies known model fields only.
 * deserializeDocument JSON string / object → { ok, document } after
 *                     schemaVersion migration and strict normalization. Safe
 *                     for untrusted input; never throws.
 * encodeForShareLink  document → "1" + base64url(deflate-raw(JSON)), for a URL
 * decodeShareLink     fragment (#…), so the data never reaches a server.
 */

import { deflateRaw, inflateRaw } from './deflate.js'
import { getDocumentType } from './documentTypes.js'
import { SCHEMA_VERSION, normalizeDocument } from './model.js'

/** Longest share-link payload accepted or produced (characters). */
export const SHARE_LINK_MAX_LENGTH = 8000
/** Largest decompressed payload accepted (bytes); guards against zip bombs. */
export const SHARE_LINK_MAX_JSON_BYTES = 1_000_000
const SHARE_FORMAT = '1'

/**
 * schemaVersion → function upgrading a raw object from that version to the
 * next. Empty while the schema is at version 1; add `1: (raw) => ({ ...raw,
 * schemaVersion: 2, … })` when version 2 ships.
 * @type {Record<number, (raw: object) => object>}
 */
const MIGRATIONS = {}

/**
 * Brings a raw stored object up to SCHEMA_VERSION. Records without a version
 * predate versioning and are treated as version 1.
 * @returns {{ ok: true, value: object } | { ok: false, error: { code: string, message: string } }}
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: { code: 'invalid_document', message: 'Not a document.' } }
  }
  let version = raw.schemaVersion === undefined ? 1 : raw.schemaVersion
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, error: { code: 'invalid_schema_version', message: 'Invalid schema version.' } }
  }
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: { code: 'unsupported_schema_version', message: 'This document was saved by a newer version of the tool.' } }
  }
  let value = raw
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) return { ok: false, error: { code: 'missing_migration', message: `No migration from version ${version}.` } }
    value = step(value)
    version += 1
  }
  return { ok: true, value }
}

/** @returns {string} */
export function serializeDocument(doc) {
  return JSON.stringify(normalizeDocument(doc))
}

/**
 * @param {string | object} input
 * @returns {{ ok: true, document: import('./model.js').DocsDocument } | { ok: false, error: { code: string, message: string } }}
 */
export function deserializeDocument(input) {
  let raw = input
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input)
    } catch {
      return { ok: false, error: { code: 'invalid_json', message: 'The data is not valid JSON.' } }
    }
  }
  const migrated = migrate(raw)
  if (!migrated.ok) return migrated
  if (!getDocumentType(migrated.value.type)) {
    return { ok: false, error: { code: 'unknown_document_type', message: 'Unknown document type.' } }
  }
  return { ok: true, document: normalizeDocument(migrated.value) }
}

// ── Share links ──────────────────────────────────────────────────────────────

function base64UrlEncode(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function streamAvailable(Kind) {
  try {
    return typeof globalThis[Kind] === 'function' && Boolean(new globalThis[Kind]('deflate-raw'))
  } catch {
    return false
  }
}

async function pipeThroughStream(bytes, stream, maxOutput) {
  const writer = stream.writable.getWriter()
  const writing = writer.write(bytes).then(() => writer.close()).catch(() => {})
  const reader = stream.readable.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxOutput) {
      await reader.cancel().catch(() => {})
      throw new Error('output too large')
    }
    chunks.push(value)
  }
  await writing
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

async function compress(bytes, pureJs) {
  if (!pureJs && streamAvailable('CompressionStream')) {
    return pipeThroughStream(bytes, new CompressionStream('deflate-raw'), Infinity)
  }
  return deflateRaw(bytes)
}

async function decompress(bytes, pureJs) {
  if (!pureJs && streamAvailable('DecompressionStream')) {
    return pipeThroughStream(bytes, new DecompressionStream('deflate-raw'), SHARE_LINK_MAX_JSON_BYTES)
  }
  return inflateRaw(bytes, { maxOutput: SHARE_LINK_MAX_JSON_BYTES })
}

/**
 * @param {object} doc
 * @param {{ maxLength?: number, pureJs?: boolean }} [options]  pureJs: skip CompressionStream (tests)
 * @returns {Promise<{ ok: true, value: string } | { ok: false, error: { code: string, message: string, length?: number } }>}
 */
export async function encodeForShareLink(doc, { maxLength = SHARE_LINK_MAX_LENGTH, pureJs = false } = {}) {
  try {
    const bytes = new TextEncoder().encode(serializeDocument(doc))
    const value = SHARE_FORMAT + base64UrlEncode(await compress(bytes, pureJs))
    if (value.length > maxLength) {
      return { ok: false, error: { code: 'share_link_too_long', message: `This document is too large to share as a link (${value.length} of ${maxLength} characters).`, length: value.length } }
    }
    return { ok: true, value }
  } catch {
    return { ok: false, error: { code: 'share_link_failed', message: 'The share link could not be created.' } }
  }
}

/**
 * @param {string} text  the encoded payload (without "#" or any "key=" prefix)
 * @param {{ maxLength?: number, pureJs?: boolean }} [options]
 * @returns {Promise<{ ok: true, document: object } | { ok: false, error: { code: string, message: string } }>}
 */
export async function decodeShareLink(text, { maxLength = SHARE_LINK_MAX_LENGTH, pureJs = false } = {}) {
  const value = String(text ?? '').trim()
  if (value.length > maxLength) return { ok: false, error: { code: 'share_link_too_long', message: 'The link is too long.' } }
  if (!value || value[0] !== SHARE_FORMAT) {
    return { ok: false, error: { code: value ? 'share_link_unsupported_version' : 'share_link_invalid', message: 'This link was not made by this tool, or by a newer version of it.' } }
  }
  const bytes = base64UrlDecode(value.slice(1))
  if (!bytes) return { ok: false, error: { code: 'share_link_invalid', message: 'The link is damaged.' } }
  let json
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(await decompress(bytes, pureJs))
  } catch {
    return { ok: false, error: { code: 'share_link_invalid', message: 'The link is damaged or too large.' } }
  }
  return deserializeDocument(json)
}
