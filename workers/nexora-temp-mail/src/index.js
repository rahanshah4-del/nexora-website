/**
 * nexora-temp-mail — free disposable inbox (https://nexorasolution.us/tools/temp-mail/).
 *
 * Receive only. Mail for <random>@mail.nexorasolution.us arrives through
 * Cloudflare Email Routing (catch-all -> this Worker) and is kept in KV for
 * MESSAGE_TTL_SECONDS, then expires on its own. Anyone who knows an address can
 * read its inbox, which is how disposable inboxes work; addresses are random.
 *
 * Attachments are never stored (only a count). Mail over MAX_RAW_EMAIL_BYTES is
 * rejected at SMTP time.
 *
 * API (JSON):
 *   GET    /api/domains
 *   POST   /api/address                 -> { address, expiresInSeconds }
 *   GET    /api/inbox/:address          -> { messages: [...] }
 *   GET    /api/inbox/:address/:id      -> { message }
 *   DELETE /api/inbox/:address/:id
 *   DELETE /api/inbox/:address
 */
import PostalMime from 'postal-mime'
import {
  MAX_MESSAGES_PER_ADDRESS,
  MAX_RAW_EMAIL_BYTES,
  allowedDomains,
  allowedOrigins,
  buildMessageRecord,
  corsHeaders,
  inboxPrefix,
  isValidMessageId,
  messageKey,
  parseAddress,
  publicMessage,
  randomId,
  randomLocalPart,
  summary,
  ttlSeconds,
} from './lib.js'

const CREATE_LIMIT_PER_MINUTE = 10

function json(body, status, request, env, extra = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...corsHeaders(request.headers.get('origin'), allowedOrigins(env)),
      ...extra,
    },
  })
}

async function listRecords(env, address) {
  const listed = await env.TEMP_MAIL.list({ prefix: inboxPrefix(address), limit: MAX_MESSAGES_PER_ADDRESS })
  const records = await Promise.all(listed.keys.map((k) => env.TEMP_MAIL.get(k.name, 'json')))
  return records.filter(Boolean).sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)))
}

/** Best-effort per-IP limit on new addresses (KV is eventually consistent). */
async function underCreateLimit(env, request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:create:${ip}:${Math.floor(Date.now() / 60000)}`
  const count = Number.parseInt((await env.TEMP_MAIL.get(key)) || '0', 10)
  if (count >= CREATE_LIMIT_PER_MINUTE) return false
  await env.TEMP_MAIL.put(key, String(count + 1), { expirationTtl: 120 })
  return true
}

export async function handleRequest(request, env) {
  const url = new URL(request.url)
  const { pathname } = url
  const domains = allowedDomains(env)

  if (request.method === 'OPTIONS') return json(null, 204, request, env)
  if (!pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, request, env)

  if (pathname === '/api/domains' && request.method === 'GET') {
    return json({ domains }, 200, request, env)
  }

  if (pathname === '/api/address' && request.method === 'POST') {
    if (!domains.length) return json({ error: 'no_domains' }, 503, request, env)
    if (!(await underCreateLimit(env, request))) return json({ error: 'rate_limited' }, 429, request, env, { 'retry-after': '60' })
    let wanted = ''
    try { wanted = (await request.json())?.domain || '' } catch { /* body is optional */ }
    const domain = domains.includes(String(wanted).toLowerCase()) ? String(wanted).toLowerCase() : domains[0]
    return json({ address: `${randomLocalPart(10)}@${domain}`, expiresInSeconds: ttlSeconds(env) }, 201, request, env)
  }

  const parts = pathname.split('/').filter(Boolean) // ['api','inbox',address,id?]
  if (parts[1] === 'inbox' && parts.length >= 3 && parts.length <= 4) {
    const parsed = parseAddress(decodeURIComponent(parts[2]), domains)
    if (!parsed) return json({ error: 'invalid_address' }, 400, request, env)
    const id = parts[3]

    if (request.method === 'GET' && !id) {
      const records = await listRecords(env, parsed.address)
      return json({ address: parsed.address, expiresInSeconds: ttlSeconds(env), messages: records.map(summary) }, 200, request, env)
    }
    if (request.method === 'GET' && id) {
      if (!isValidMessageId(id)) return json({ error: 'invalid_id' }, 400, request, env)
      const record = await env.TEMP_MAIL.get(messageKey(parsed.address, id), 'json')
      if (!record) return json({ error: 'not_found' }, 404, request, env)
      return json({ message: publicMessage(record) }, 200, request, env)
    }
    if (request.method === 'DELETE' && id) {
      if (!isValidMessageId(id)) return json({ error: 'invalid_id' }, 400, request, env)
      await env.TEMP_MAIL.delete(messageKey(parsed.address, id))
      return json({ ok: true }, 200, request, env)
    }
    if (request.method === 'DELETE' && !id) {
      const listed = await env.TEMP_MAIL.list({ prefix: inboxPrefix(parsed.address), limit: MAX_MESSAGES_PER_ADDRESS })
      await Promise.all(listed.keys.map((k) => env.TEMP_MAIL.delete(k.name)))
      return json({ ok: true, deleted: listed.keys.length }, 200, request, env)
    }
  }
  return json({ error: 'not_found' }, 404, request, env)
}

/** Cloudflare Email Routing entry point. */
export async function handleEmail(message, env) {
  const parsedTo = parseAddress(message.to, allowedDomains(env))
  if (!parsedTo) {
    message.setReject('Unknown recipient')
    return
  }
  if (message.rawSize > MAX_RAW_EMAIL_BYTES) {
    message.setReject('Message too large')
    return
  }
  const existing = await env.TEMP_MAIL.list({ prefix: inboxPrefix(parsedTo.address), limit: MAX_MESSAGES_PER_ADDRESS })
  if (existing.keys.length >= MAX_MESSAGES_PER_ADDRESS) {
    message.setReject('Mailbox full')
    return
  }
  const raw = await new Response(message.raw).arrayBuffer()
  const parsed = await PostalMime.parse(raw)
  const id = randomId()
  const record = buildMessageRecord(parsed, { id, to: parsedTo.address, receivedAt: new Date().toISOString(), rawSize: message.rawSize })
  await env.TEMP_MAIL.put(messageKey(parsedTo.address, id), JSON.stringify(record), { expirationTtl: ttlSeconds(env) })
}

export default {
  fetch: handleRequest,
  email: handleEmail,
}
