/**
 * nexora-temp-mail — free disposable inbox (https://nexorasolution.us/tools/temp-mail/).
 *
 * Receive only. Mail for <name>@mail.nexorasolution.us arrives through
 * Cloudflare Email Routing (catch-all -> this Worker) and is kept in KV. An
 * address is a short-lived "session": it is created through the API (random or
 * a name the visitor picks), is readable for MESSAGE_TTL_SECONDS, can be
 * extended MAX_EXTENSIONS times (default once) by one period each, never past MAX_LIFETIME_SECONDS, and mail for an
 * address that has no live session is rejected at SMTP time. Anyone who knows an
 * address can read its inbox, which is how disposable inboxes work.
 *
 * Attachments are kept in their own KV keys (size/count limits, risky types are
 * listed but not stored) and only ever served as a forced download.
 *
 * API (JSON):
 *   GET    /api/config
 *   GET    /api/domains
 *   POST   /api/address                       { local?, domain?, turnstileToken? }
 *   GET    /api/inbox/:address                -> { expiresAt, messages: [...] }
 *   POST   /api/inbox/:address/extend
 *   GET    /api/inbox/:address/:id            -> { message }
 *   GET    /api/inbox/:address/:id/attachment/:n   (download)
 *   DELETE /api/inbox/:address/:id
 *   DELETE /api/inbox/:address
 *   POST   /api/report                        { address, id, reason, details? }
 *   POST   /api/push                          { address, endpoint }   (web push; DELETE removes it)
 */
import PostalMime from 'postal-mime'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGES_PER_ADDRESS,
  MAX_RAW_EMAIL_BYTES,
  PROTECTED_SENDER_DOMAINS,
  addressKey,
  allowedDomains,
  allowedOrigins,
  attachmentKey,
  attachmentPrefix,
  blockedSenderDomains,
  buildMessageRecord,
  clean,
  corsHeaders,
  describeAttachment,
  domainListed,
  extendSession,
  inboxPrefix,
  isAllowedPushEndpoint,
  isLive,
  isTempMailDomain,
  isValidMessageId,
  kvTtlUntilHardCap,
  listMetadata,
  maxExtensions,
  maxLifetimeSeconds,
  messageKey,
  newSession,
  parseAddress,
  publicMessage,
  pushEnabled,
  pushKey,
  randomId,
  randomLocalPart,
  sendPush,
  senderDomain,
  ttlSeconds,
  validateCustomLocal,
  verifyTurnstile,
} from './lib.js'
import { assessRequest, banVisitor, detectSpray, markHuman, markVisit } from './defense.js'
import { adminOverview, applySettings, authorizeAdmin, bumpStats, getSettings, saveSettings } from './admin.js'

// Best-effort limits (KV is eventually consistent). Reads are not limited here:
// every KV write costs money, and polling must stay cheap.
const LIMITS = {
  create: { perMinute: 5, perHour: 20 },
  extend: { perMinute: 6, perHour: 30 },
  report: { perMinute: 3, perHour: 10 },
  push: { perMinute: 6, perHour: 20 },
}
const REPORT_REASONS = new Set(['spam', 'phishing', 'abuse', 'illegal', 'other'])
const AUTO_BLOCK_REPORTS = 3 // distinct addresses reporting one sender domain
const AUTO_BLOCK_SECONDS = 24 * 3600

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

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

/** Fixed-window counters per IP and action. Returns false once a limit is hit. */
async function underLimit(env, request, action, override) {
  const { perMinute, perHour } = { ...LIMITS[action], ...override }
  const ip = clientIp(request)
  const now = Date.now()
  const windows = [
    { key: `rl:${action}:m:${ip}:${Math.floor(now / 60000)}`, max: perMinute, ttl: 120 },
    { key: `rl:${action}:h:${ip}:${Math.floor(now / 3600000)}`, max: perHour, ttl: 7200 },
  ]
  const counts = await Promise.all(windows.map(async (w) => Number.parseInt((await env.TEMP_MAIL.get(w.key)) || '0', 10)))
  if (counts.some((count, i) => count >= windows[i].max)) return false
  await Promise.all(windows.map((w, i) => env.TEMP_MAIL.put(w.key, String(counts[i] + 1), { expirationTtl: w.ttl })))
  return true
}

/** Count an event for the Control Centre charts without slowing the response. */
function track(ctx, env, increments) {
  const work = bumpStats(env, increments)
  if (ctx?.waitUntil) { ctx.waitUntil(work); return undefined }
  return work
}

const rateLimited = (request, env) => json({ error: 'rate_limited' }, 429, request, env, { 'retry-after': '60' })

async function getSession(env, address) {
  return env.TEMP_MAIL.get(addressKey(address), 'json')
}

/** Delete everything stored for an address (messages, attachments, session). */
async function wipeAddress(env, address) {
  const [messages, files] = await Promise.all([
    env.TEMP_MAIL.list({ prefix: inboxPrefix(address), limit: 1000 }),
    env.TEMP_MAIL.list({ prefix: attachmentPrefix(address), limit: 1000 }),
  ])
  await Promise.all([...messages.keys, ...files.keys].map((k) => env.TEMP_MAIL.delete(k.name)))
  await env.TEMP_MAIL.delete(addressKey(address))
}

/** Live session for an address, or null (an expired one is wiped on the spot). */
async function liveSession(env, address) {
  const session = await getSession(env, address)
  if (!session) return null
  if (isLive(session)) return session
  await wipeAddress(env, address)
  return null
}

function sessionBody(session, env) {
  return {
    expiresAt: new Date(session.expiresAt).toISOString(),
    expiresInSeconds: Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)),
    canExtend: (session.extensions || 0) < maxExtensions(env) && session.expiresAt < session.hardExpiresAt,
    extensions: session.extensions || 0,
    totalSeconds: Math.round((session.expiresAt - session.createdAt) / 1000),
    periodSeconds: ttlSeconds(env),
  }
}

async function listSummaries(env, address) {
  const listed = await env.TEMP_MAIL.list({ prefix: inboxPrefix(address), limit: MAX_MESSAGES_PER_ADDRESS })
  const summaries = await Promise.all(listed.keys.map(async (k) => {
    if (k.metadata && k.metadata.id) return k.metadata
    const record = await env.TEMP_MAIL.get(k.name, 'json') // mail stored before list metadata existed
    return record ? listMetadata(record) : null
  }))
  return summaries.filter(Boolean).sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)))
}

async function handleCreateAddress(request, env, domains, settings, ctx) {
  if (!domains.length) return json({ error: 'no_domains' }, 503, request, env)
  if (!settings.creationEnabled) return json({ error: 'disabled' }, 503, request, env)
  let body = {}
  try { body = (await request.json()) || {} } catch { /* body is optional */ }

  // Bot defense first: a banned or obviously scripted visitor never reaches the captcha or KV writes.
  const assessment = await assessRequest(request, env, settings, clientIp(request))
  if (assessment.logged) {
    await track(ctx, env, { [`verdict_${assessment.verdict}`]: 1 })
  }
  if (assessment.action === 'block') {
    await banVisitor(env, assessment, assessment.reasons.join(', '))
    await track(ctx, env, { bans: 1 })
    return json({ error: 'blocked' }, 403, request, env)
  }

  if (clean(env.TURNSTILE_SECRET) && clean(env.TURNSTILE_SITE_KEY)) {
    if (!(await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET, clientIp(request)))) {
      await track(ctx, env, { captcha_failed: 1 })
      return json({ error: 'captcha_failed' }, 403, request, env)
    }
    await markHuman(env, clientIp(request))
  }
  const tight = assessment.action === 'tighten'
  const limits = tight
    ? { perMinute: Math.min(settings.createPerMinute, 2), perHour: Math.min(settings.createPerHour, 6) }
    : { perMinute: settings.createPerMinute, perHour: settings.createPerHour }
  if (!(await underLimit(env, request, 'create', limits))) {
    await track(ctx, env, { rate_limited: 1 })
    return rateLimited(request, env)
  }

  const wantedDomain = clean(body.domain).toLowerCase()
  const domain = domains.includes(wantedDomain) ? wantedDomain : domains[0]

  let local
  if (clean(body.local)) {
    if (!settings.customAddressEnabled) return json({ error: 'custom_disabled' }, 403, request, env)
    const checked = validateCustomLocal(body.local)
    if (!checked.ok) return json({ error: 'invalid_name', reason: checked.reason }, 400, request, env)
    local = checked.local
  }

  // Random names retry on a collision; a chosen name that is taken is an error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = local || randomLocalPart(10)
    const address = `${candidate}@${domain}`
    if (await liveSession(env, address)) {
      if (local) return json({ error: 'name_taken' }, 409, request, env)
      continue
    }
    const session = newSession(env)
    await env.TEMP_MAIL.put(addressKey(address), JSON.stringify(session), { expirationTtl: kvTtlUntilHardCap(session) })
    await track(ctx, env, { created: 1, ...(local ? { created_custom: 1 } : {}) })
    return json({ address, ...sessionBody(session, env) }, 201, request, env)
  }
  return json({ error: 'try_again' }, 503, request, env)
}

async function handleReport(request, env, domains, ctx) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const parsed = parseAddress(body?.address, domains)
  const reason = clean(body?.reason).toLowerCase()
  if (!parsed || !REPORT_REASONS.has(reason) || !isValidMessageId(body?.id)) return json({ error: 'invalid_report' }, 400, request, env)
  if (!(await underLimit(env, request, 'report'))) return rateLimited(request, env)

  const record = await env.TEMP_MAIL.get(messageKey(parsed.address, body.id), 'json')
  if (!record) return json({ error: 'not_found' }, 404, request, env)

  const domain = senderDomain(record.fromAddress)
  const report = {
    at: new Date().toISOString(),
    reason,
    details: clean(body.details).slice(0, 500),
    address: parsed.address,
    messageId: record.id,
    fromAddress: record.fromAddress,
    subject: record.subject,
  }
  await env.TEMP_MAIL.put(`report:${report.at}:${randomId()}`, JSON.stringify(report), { expirationTtl: 30 * 24 * 3600 })
  await track(ctx, env, { reports: 1 })

  // A sender domain reported from several different inboxes is blocked for a day.
  // From headers can be forged, so big mail providers are never auto-blocked.
  if (domain && !PROTECTED_SENDER_DOMAINS.has(domain)) {
    const key = `rep:${domain}`
    const reporters = (await env.TEMP_MAIL.get(key, 'json')) || []
    if (!reporters.includes(parsed.address)) reporters.push(parsed.address)
    await env.TEMP_MAIL.put(key, JSON.stringify(reporters.slice(-20)), { expirationTtl: AUTO_BLOCK_SECONDS })
    if (reporters.length >= AUTO_BLOCK_REPORTS) await env.TEMP_MAIL.put(`bl:${domain}`, '1', { expirationTtl: AUTO_BLOCK_SECONDS })
  }
  return json({ ok: true }, 200, request, env)
}

async function handlePush(request, env, domains, ctx) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const parsed = parseAddress(body?.address, domains)
  if (!parsed) return json({ error: 'invalid_address' }, 400, request, env)
  if (request.method === 'DELETE') {
    await env.TEMP_MAIL.delete(pushKey(parsed.address))
    return json({ ok: true }, 200, request, env)
  }
  if (!pushEnabled(env)) return json({ error: 'push_disabled' }, 503, request, env)
  if (!isAllowedPushEndpoint(body?.endpoint)) return json({ error: 'invalid_endpoint' }, 400, request, env)
  if (!(await underLimit(env, request, 'push'))) return rateLimited(request, env)
  const session = await liveSession(env, parsed.address)
  if (!session) return json({ error: 'expired' }, 404, request, env)
  await env.TEMP_MAIL.put(pushKey(parsed.address), JSON.stringify({ endpoint: body.endpoint }), { expirationTtl: kvTtlUntilHardCap(session) })
  await track(ctx, env, { push_enabled: 1 })
  return json({ ok: true }, 200, request, env)
}

async function handleAttachment(request, env, parsed, id, indexText) {
  const n = Number.parseInt(indexText, 10)
  if (!isValidMessageId(id) || !Number.isInteger(n) || n < 0 || n > 20) return json({ error: 'invalid_id' }, 400, request, env)
  if (!(await liveSession(env, parsed.address))) return json({ error: 'expired' }, 404, request, env)
  const record = await env.TEMP_MAIL.get(messageKey(parsed.address, id), 'json')
  const meta = record?.attachments?.find((a) => a.index === n)
  if (!meta || !meta.available) return json({ error: 'not_found' }, 404, request, env)
  const bytes = await env.TEMP_MAIL.get(attachmentKey(parsed.address, id, n), 'arrayBuffer')
  if (!bytes) return json({ error: 'not_found' }, 404, request, env)
  // Always a forced download of opaque bytes: never rendered by the browser.
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${meta.filename.replace(/[^\x20-\x7e]/g, '_')}"`,
      'content-security-policy': "default-src 'none'; sandbox",
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      ...corsHeaders(request.headers.get('origin'), allowedOrigins(env)),
    },
  })
}

async function handleAdmin(request, env, pathname, domains) {
  const auth = await authorizeAdmin(request, env)
  if (!auth.ok) return json({ error: auth.error }, auth.status, request, env)

  if (pathname === '/api/admin/overview' && request.method === 'GET') {
    return json(await adminOverview(env, { domains, pushOn: pushEnabled(env) }), 200, request, env)
  }
  if (pathname === '/api/admin/settings' && request.method === 'PUT') {
    let patch
    try { patch = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
    return json({ settings: await saveSettings(env, patch || {}) }, 200, request, env)
  }
  if (pathname.startsWith('/api/admin/ban/') && request.method === 'DELETE') {
    const hash = pathname.slice('/api/admin/ban/'.length)
    if (!/^[0-9a-f]{16}$/.test(hash)) return json({ error: 'invalid_hash' }, 400, request, env)
    await Promise.all([env.TEMP_MAIL.delete(`ban:${hash}`), env.TEMP_MAIL.delete(`strike:${hash}`)])
    return json({ ok: true }, 200, request, env)
  }
  if (pathname.startsWith('/api/admin/auto-block/') && request.method === 'DELETE') {
    const domain = decodeURIComponent(pathname.slice('/api/admin/auto-block/'.length)).toLowerCase()
    if (!/^[a-z0-9.-]{3,100}$/.test(domain)) return json({ error: 'invalid_domain' }, 400, request, env)
    await Promise.all([env.TEMP_MAIL.delete(`bl:${domain}`), env.TEMP_MAIL.delete(`rep:${domain}`)])
    return json({ ok: true }, 200, request, env)
  }
  return json({ error: 'not_found' }, 404, request, env)
}

export async function handleRequest(request, rawEnv, ctx) {
  const url = new URL(request.url)
  const { pathname } = url
  const domains = allowedDomains(rawEnv)

  if (request.method === 'OPTIONS') return json(null, 204, request, rawEnv)
  if (!pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, request, rawEnv)
  if (pathname.startsWith('/api/admin/')) return handleAdmin(request, rawEnv, pathname, domains)

  // Runtime settings (Control Centre) sit on top of the deploy-time vars.
  const settings = await getSettings(rawEnv)
  const env = applySettings(rawEnv, settings)

  if (pathname === '/api/domains' && request.method === 'GET') return json({ domains }, 200, request, env)

  if (pathname === '/api/config' && request.method === 'GET') {
    await track(ctx, env, { visits: 1 })
    await markVisit(env, clientIp(request))
    return json({
      creationEnabled: settings.creationEnabled,
      customAddressEnabled: settings.customAddressEnabled,
      attachmentsEnabled: settings.attachmentsEnabled,
      notice: settings.notice,
      domains,
      periodSeconds: ttlSeconds(env),
      maxLifetimeSeconds: maxLifetimeSeconds(env),
      captchaRequired: Boolean(clean(env.TURNSTILE_SECRET)) && Boolean(clean(env.TURNSTILE_SITE_KEY)),
      turnstileSiteKey: clean(env.TURNSTILE_SITE_KEY),
      vapidPublicKey: pushEnabled(env) ? clean(env.VAPID_PUBLIC_KEY) : '',
      maxAttachmentBytes: MAX_ATTACHMENT_BYTES,
    }, 200, request, env)
  }

  if (pathname === '/api/address' && request.method === 'POST') return handleCreateAddress(request, env, domains, settings, ctx)
  if (pathname === '/api/report' && request.method === 'POST') return handleReport(request, env, domains)
  if (pathname === '/api/push' && (request.method === 'POST' || request.method === 'DELETE')) return handlePush(request, env, domains)

  const parts = pathname.split('/').filter(Boolean) // ['api','inbox',address,id?,'attachment'?,n?]
  if (parts[1] === 'inbox' && parts.length >= 3 && parts.length <= 6) {
    let decoded
    try { decoded = decodeURIComponent(parts[2]) } catch { return json({ error: 'invalid_address' }, 400, request, env) }
    const parsed = parseAddress(decoded, domains)
    if (!parsed) return json({ error: 'invalid_address' }, 400, request, env)
    const second = parts[3]

    if (parts.length === 4 && second === 'extend' && request.method === 'POST') {
      if (!(await underLimit(env, request, 'extend'))) return rateLimited(request, env)
      const session = await liveSession(env, parsed.address)
      if (!session) return json({ error: 'expired' }, 404, request, env)
      if ((session.extensions || 0) >= maxExtensions(env)) return json({ error: 'max_extensions', ...sessionBody(session, env) }, 409, request, env)
      if (session.expiresAt >= session.hardExpiresAt) return json({ error: 'max_lifetime', ...sessionBody(session, env) }, 409, request, env)
      const next = extendSession(session, env)
      await env.TEMP_MAIL.put(addressKey(parsed.address), JSON.stringify(next), { expirationTtl: kvTtlUntilHardCap(next) })
      await track(ctx, env, { extended: 1 })
      return json({ address: parsed.address, ...sessionBody(next, env) }, 200, request, env)
    }

    if (parts.length === 6 && parts[4] === 'attachment' && request.method === 'GET') {
      return handleAttachment(request, env, parsed, second, parts[5])
    }
    if (parts.length > 4) return json({ error: 'not_found' }, 404, request, env)

    const id = second
    if (request.method === 'GET' && !id) {
      const session = await liveSession(env, parsed.address)
      if (!session) return json({ error: 'expired' }, 404, request, env)
      const messages = await listSummaries(env, parsed.address)
      return json({ address: parsed.address, ...sessionBody(session, env), messages }, 200, request, env)
    }
    if (request.method === 'GET' && id) {
      if (!isValidMessageId(id)) return json({ error: 'invalid_id' }, 400, request, env)
      if (!(await liveSession(env, parsed.address))) return json({ error: 'expired' }, 404, request, env)
      const record = await env.TEMP_MAIL.get(messageKey(parsed.address, id), 'json')
      if (!record) return json({ error: 'not_found' }, 404, request, env)
      return json({ message: publicMessage(record) }, 200, request, env)
    }
    if (request.method === 'DELETE' && id) {
      if (!isValidMessageId(id)) return json({ error: 'invalid_id' }, 400, request, env)
      const record = await env.TEMP_MAIL.get(messageKey(parsed.address, id), 'json')
      await env.TEMP_MAIL.delete(messageKey(parsed.address, id))
      await Promise.all((record?.attachments || []).map((a) => env.TEMP_MAIL.delete(attachmentKey(parsed.address, id, a.index))))
      return json({ ok: true }, 200, request, env)
    }
    if (request.method === 'DELETE' && !id) {
      // Empties the inbox but keeps the address (and its timer) so mail can still arrive.
      const [messages, files] = await Promise.all([
        env.TEMP_MAIL.list({ prefix: inboxPrefix(parsed.address), limit: 1000 }),
        env.TEMP_MAIL.list({ prefix: attachmentPrefix(parsed.address), limit: 1000 }),
      ])
      await Promise.all([...messages.keys, ...files.keys].map((k) => env.TEMP_MAIL.delete(k.name)))
      return json({ ok: true, deleted: messages.keys.length }, 200, request, env)
    }
  }
  return json({ error: 'not_found' }, 404, request, env)
}

async function isDomainBlocked(env, domain, settings) {
  if (!domain) return false
  if (domainListed(domain, blockedSenderDomains(env))) return true
  if (domainListed(domain, settings?.blockedDomains || [])) return true
  return Boolean(await env.TEMP_MAIL.get(`bl:${domain}`))
}

/**
 * Store one message for a temp-mail address. Throws on parse/KV errors.
 */
async function storeTempMessage(message, env, parsedTo, ctx, settings) {
  const session = await liveSession(env, parsedTo.address)
  if (!session) {
    message.setReject('Unknown recipient')
    await track(ctx, env, { mail_rejected: 1 })
    return
  }
  if (message.rawSize > MAX_RAW_EMAIL_BYTES) {
    message.setReject('Message too large')
    await track(ctx, env, { mail_rejected: 1 })
    return
  }
  if (await isDomainBlocked(env, senderDomain(message.from), settings)) {
    message.setReject('Sender blocked')
    await track(ctx, env, { mail_rejected: 1, mail_blocked_sender: 1 })
    return
  }
  const existing = await env.TEMP_MAIL.list({ prefix: inboxPrefix(parsedTo.address), limit: MAX_MESSAGES_PER_ADDRESS })
  if (existing.keys.length >= MAX_MESSAGES_PER_ADDRESS) {
    message.setReject('Mailbox full')
    await track(ctx, env, { mail_rejected: 1 })
    return
  }
  const raw = await new Response(message.raw).arrayBuffer()
  const parsed = await PostalMime.parse(raw)
  // Abuse reports and the static list work on the visible From domain, which often
  // differs from the envelope sender, so check it again once the mail is parsed.
  if (await isDomainBlocked(env, senderDomain(parsed.from?.address), settings)) {
    message.setReject('Sender blocked')
    await track(ctx, env, { mail_rejected: 1, mail_blocked_sender: 1 })
    return
  }
  if (await detectSpray(env, settings, senderDomain(parsed.from?.address) || senderDomain(message.from), parsedTo.address)) {
    message.setReject('Sender blocked')
    await track(ctx, env, { mail_rejected: 1, mail_blocked_sender: 1, spray_blocks: 1 })
    return
  }
  const id = randomId()
  const ttl = kvTtlUntilHardCap(session)

  let used = 0
  const attachments = (parsed.attachments || []).map((att, index) => {
    const described = describeAttachment(att, index, used)
    const info = settings.attachmentsEnabled || !described.available ? described : { ...described, available: false, reason: 'blocked_type' }
    if (info.available) used += info.size
    return { info, att }
  })
  await Promise.all(attachments.filter((a) => a.info.available).map(({ info, att }) => (
    env.TEMP_MAIL.put(attachmentKey(parsedTo.address, id, info.index), att.content, { expirationTtl: ttl })
  )))

  const record = buildMessageRecord(parsed, {
    id,
    to: parsedTo.address,
    receivedAt: new Date().toISOString(),
    rawSize: message.rawSize,
    attachments: attachments.map((a) => a.info),
  })
  const meta = listMetadata(record)
  await env.TEMP_MAIL.put(messageKey(parsedTo.address, id), JSON.stringify(record), { expirationTtl: ttl, metadata: meta })
  await track(ctx, env, {
    mail_received: 1,
    ...(meta.code ? { codes_found: 1 } : {}),
    ...(attachments.some((a) => a.info.available) ? { attachments_stored: 1 } : {}),
  })
  const pushed = notifyPush(env, parsedTo.address)
  if (ctx?.waitUntil) ctx.waitUntil(pushed)
  else await pushed
}

/** Wake the visitor's browser (if they enabled alerts) so it can show the new mail. Never throws. */
async function notifyPush(env, address) {
  if (!pushEnabled(env)) return
  try {
    const sub = await env.TEMP_MAIL.get(pushKey(address), 'json')
    if (!sub?.endpoint) return
    const result = await sendPush(sub.endpoint, env)
    if (result.gone) await env.TEMP_MAIL.delete(pushKey(address))
  } catch (error) {
    console.warn('temp-mail push failed', String(error?.message || error).slice(0, 120))
  }
}

/**
 * Cloudflare Email Routing entry point.
 *
 * The zone has ONE catch-all rule (it covers nexorasolution.us and every
 * subdomain), and it points at this Worker. So this Worker also sits in front of
 * Nexora's real mailbox: anything that is not for a temp-mail domain is
 * forwarded untouched to FORWARD_TO, and so is anything that fails here, so a bug
 * in the temp-mail path can never swallow real mail.
 */
export async function handleEmail(message, rawEnv, ctx) {
  const domains = allowedDomains(rawEnv)
  const env = rawEnv
  const forwardTo = clean(env.FORWARD_TO)

  if (!isTempMailDomain(message.to, domains)) {
    if (!forwardTo) {
      message.setReject('Mailbox unavailable')
      return
    }
    await message.forward(forwardTo)
    return
  }

  const parsedTo = parseAddress(message.to, domains)
  if (!parsedTo) {
    message.setReject('Unknown recipient')
    return
  }
  try {
    const settings = await getSettings(rawEnv)
    if (!settings.receivingEnabled) {
      message.setReject('Temporarily unavailable')
      return
    }
    await storeTempMessage(message, applySettings(rawEnv, settings), parsedTo, ctx, settings)
  } catch (error) {
    // A temp-mail failure drops that one disposable message at most. It does not
    // touch real mail, which never reaches this branch.
    console.warn('temp-mail store failed', String(error?.message || error).slice(0, 200))
  }
}

export default {
  fetch: (request, env, ctx) => handleRequest(request, env, ctx),
  email: handleEmail,
}
