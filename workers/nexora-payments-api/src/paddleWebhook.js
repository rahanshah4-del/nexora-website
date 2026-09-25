/**
 * Paddle webhook verification and amount helpers (pure; tested in
 * tests/paddle-webhook.test.mjs).
 *
 * Paddle-Signature header: "ts=<unix seconds>;h1=<hex HMAC-SHA256>" (h1 may
 * repeat during secret rotation). The signed payload is `${ts}:${rawBody}`.
 */

export const PADDLE_SIGNATURE_MAX_AGE_SECONDS = 5 * 60
export const PADDLE_SIGNATURE_MAX_FUTURE_SECONDS = 60

// Paddle currencies without minor units; every other supported currency has 2.
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW'])

/** Parse the Paddle-Signature header; null when missing or malformed. */
export function parsePaddleSignature(header) {
  const text = String(header || '').trim()
  if (!text) return null
  let ts = ''
  const h1 = []
  for (const part of text.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) return null
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key === 'ts') ts = value
    else if (key === 'h1') h1.push(value.toLowerCase())
  }
  if (!/^\d{1,12}$/.test(ts) || !h1.length || !h1.every((value) => /^[0-9a-f]{64}$/.test(value))) return null
  return { ts: Number(ts), h1 }
}

/** Constant-time comparison of two equal-length hex strings. */
export function timingSafeEqualHex(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return diff === 0
}

async function hmacSha256Hex(secret, message, cryptoImpl) {
  const encoder = new TextEncoder()
  const key = await cryptoImpl.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await cryptoImpl.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Fail-closed verification. Resolves { ok: true } or { ok: false, reason }
 * with reason one of: secret-not-configured, signature-missing,
 * signature-malformed, timestamp-stale, timestamp-future, signature-mismatch.
 */
export async function verifyPaddleSignature({ secret, header, rawBody, now = Date.now(), cryptoImpl = globalThis.crypto } = {}) {
  if (!secret) return { ok: false, reason: 'secret-not-configured' }
  if (!String(header || '').trim()) return { ok: false, reason: 'signature-missing' }
  const parsed = parsePaddleSignature(header)
  if (!parsed) return { ok: false, reason: 'signature-malformed' }
  const nowSeconds = Math.floor(now / 1000)
  if (nowSeconds - parsed.ts > PADDLE_SIGNATURE_MAX_AGE_SECONDS) return { ok: false, reason: 'timestamp-stale' }
  if (parsed.ts - nowSeconds > PADDLE_SIGNATURE_MAX_FUTURE_SECONDS) return { ok: false, reason: 'timestamp-future' }
  const expected = await hmacSha256Hex(secret, `${parsed.ts}:${rawBody ?? ''}`, cryptoImpl)
  const matches = parsed.h1.some((candidate) => timingSafeEqualHex(candidate, expected))
  return matches ? { ok: true } : { ok: false, reason: 'signature-mismatch' }
}

/** Paddle amounts are strings in the smallest unit (cents); convert to normal units. */
export function paddleMinorToUnits(minor, currency = 'USD') {
  const numeric = Number(minor)
  if (!Number.isFinite(numeric)) return 0
  return ZERO_DECIMAL_CURRENCIES.has(String(currency || '').toUpperCase()) ? numeric : numeric / 100
}

/** Transaction total (incl. tax) from data.details.totals, in normal units. */
export function paddleTransactionTotal(eventData = {}) {
  const currency = String(eventData.currency_code || eventData.details?.totals?.currency_code || 'USD').toUpperCase()
  const minor = eventData.details?.totals?.total
  return { amount: minor === undefined || minor === null ? 0 : paddleMinorToUnits(minor, currency), currency }
}
