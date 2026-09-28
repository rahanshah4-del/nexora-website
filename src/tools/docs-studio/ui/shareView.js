/**
 * The share view page's decoder: URL fragment → document, or a reason for a
 * friendly error screen. The fragment is untrusted input: it goes through
 * decodeShareLink (size-capped inflate, schema migration) → normalizeDocument
 * (known fields only) → validateDocument, and local asset references are
 * dropped (a link never carries a logo or letterhead).
 */

import { SHARE_LINK_MAX_LENGTH, decodeShareLink, normalizeDocument, validateDocument } from '../engine/index.js'
import { documentForShareLink } from './share.js'

/**
 * @param {string} hash  location.hash ("#…") or the bare payload
 * @returns {Promise<{ ok: true, doc: object, issues: object[] } | { ok: false, reason: 'empty' | 'broken' | 'too-large' | 'future', code?: string }>}
 */
export async function decodeShareView(hash, { pureJs = false } = {}) {
  const payload = String(hash || '').replace(/^#/, '').trim()
  if (!payload) return { ok: false, reason: 'empty' }
  if (payload.length > SHARE_LINK_MAX_LENGTH) return { ok: false, reason: 'too-large', code: 'share_link_too_long' }
  const decoded = await decodeShareLink(payload, { pureJs })
  if (!decoded.ok) {
    const { code } = decoded.error
    // An unknown format letter on an otherwise well-formed payload, or a newer
    // schema version: made by a newer version of the tool.
    const future = code === 'unsupported_schema_version' || (code === 'share_link_unsupported_version' && /^[A-Za-z0-9][A-Za-z0-9_-]{16,}$/.test(payload))
    const reason = code === 'share_link_too_long' ? 'too-large' : future ? 'future' : 'broken'
    return { ok: false, reason, code }
  }
  const doc = documentForShareLink(normalizeDocument(decoded.document))
  return { ok: true, doc, issues: validateDocument(doc) }
}
