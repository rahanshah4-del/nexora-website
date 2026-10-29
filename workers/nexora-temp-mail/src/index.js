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
 *
 * Premium (signed in with a Firebase ID token in the Authorization header; entitlement in KV `pm:<uid>`):
 *   GET    /api/me                            -> plan, limits and the owner's addresses (renews them with the plan)
 *   GET    /api/me/inbox                      -> mail of all the owner's addresses, newest first (each has .address)
 *   GET/POST /api/me/domains, POST /api/me/domains/:d/verify, DELETE /api/me/domains/:d, POST/DELETE .../forward[/verify]  custom domains
 *   POST   /api/resend/inbound                Resend Inbound webhook (signed) for custom-domain mail
 *   DELETE /api/me/address/:address           delete one of the owner's addresses
 *   POST   /api/forward                       { address, to }     send a 6-digit code to the destination
 *   POST   /api/forward/verify                { address, code }   turn forwarding on
 *   DELETE /api/forward                       { address }         turn forwarding off
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
  friendlyLocalPart,
  sendPush,
  senderDomain,
  ttlSeconds,
  validateCustomLocal,
  verifyTurnstile,
} from './lib.js'
import {
  MAX_CUSTOM_DOMAINS, bareAddress, customDomainKey, customForwardBody, customOwnerKey, customPendingKey, domainIsVerified, normalizeDomain,
  resendCreateDomain, resendDeleteDomain, resendGetDomain, resendGetReceived, resendVerifyDomain, shapeRecords, verifyWebhook,
} from './customdomain.js'
import { assessRequest, banVisitor, detectSpray, markHuman, markVisit } from './defense.js'
import { adminOverview, applySettings, authorizeAdmin, bumpStats, getSettings, isoDay, saveSettings } from './admin.js'
import {
  PREMIUM_LIMITS,
  entitlementKey,
  forwardBody,
  forwardKey,
  getEntitlement,
  grantEntitlement,
  hashCode,
  isPremiumActive,
  newPremiumSession,
  ownerKey,
  pendingForwardKey,
  premiumSessionUntil,
  randomCode,
  sendResendMail,
  forwardCodeEmail,
  userFromRequest,
  validForwardTarget,
} from './premium.js'

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
  await Promise.all([
    env.TEMP_MAIL.delete(addressKey(address)),
    env.TEMP_MAIL.delete(forwardKey(address)),
    env.TEMP_MAIL.delete(pendingForwardKey(address)),
  ])
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
  const premium = Boolean(session.premium)
  return {
    expiresAt: new Date(session.expiresAt).toISOString(),
    expiresInSeconds: Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)),
    // A premium address lives as long as the plan is paid and renews with it, so it has nothing to extend.
    canExtend: !premium && (session.extensions || 0) < maxExtensions(env) && session.expiresAt < session.hardExpiresAt,
    extensions: session.extensions || 0,
    totalSeconds: Math.round((session.expiresAt - session.createdAt) / 1000),
    periodSeconds: ttlSeconds(env),
    premium,
  }
}

async function listSummaries(env, address, limit = MAX_MESSAGES_PER_ADDRESS) {
  const listed = await env.TEMP_MAIL.list({ prefix: inboxPrefix(address), limit })
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

  // A signed-in visitor with an active Premium plan is trusted: no captcha, higher limits, and the address
  // belongs to them (long life, up to PREMIUM_LIMITS.maxAddresses, forwarding). Everyone else is unchanged.
  const user = settings.premiumEnabled ? await userFromRequest(request, env) : null
  const entitlement = user ? await getEntitlement(env, user.uid) : null
  const premium = Boolean(user) && isPremiumActive(entitlement)

  if (premium) {
    if (!(await underLimit(env, request, 'create', { perMinute: 10, perHour: 60 }))) {
      await track(ctx, env, { rate_limited: 1 })
      return rateLimited(request, env)
    }
    const owned = await liveOwned(env, user.uid)
    if (owned.length >= PREMIUM_LIMITS.maxAddresses) {
      return json({ error: 'address_limit', limit: PREMIUM_LIMITS.maxAddresses }, 409, request, env)
    }
  } else {
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
  }

  const wantedDomain = clean(body.domain).toLowerCase()
  const domain = domains.includes(wantedDomain) ? wantedDomain : domains[0]

  let local
  if (clean(body.local)) {
    if (!settings.customAddressEnabled && !premium) return json({ error: 'custom_disabled' }, 403, request, env)
    const checked = validateCustomLocal(body.local)
    if (!checked.ok) return json({ error: 'invalid_name', reason: checked.reason }, 400, request, env)
    local = checked.local
  }

  // Random names retry on a collision; a chosen name that is taken is an error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = local || friendlyLocalPart()
    const address = `${candidate}@${domain}`
    if (await liveSession(env, address)) {
      if (local) return json({ error: 'name_taken' }, 409, request, env)
      continue
    }
    const session = premium ? newPremiumSession(entitlement, user.uid) : newSession(env)
    await env.TEMP_MAIL.put(addressKey(address), JSON.stringify(session), { expirationTtl: kvTtlUntilHardCap(session) })
    if (premium) {
      const owned = await readOwned(env, user.uid)
      owned.push({ address, createdAt: Date.now() })
      await env.TEMP_MAIL.put(ownerKey(user.uid), JSON.stringify(owned))
    }
    await track(ctx, env, { created: 1, ...(local ? { created_custom: 1 } : {}), ...(premium ? { premium_created: 1 } : {}) })
    return json({ address, ...sessionBody(session, env) }, 201, request, env)
  }
  return json({ error: 'try_again' }, 503, request, env)
}

// ------------------------------------------------------------------ premium

async function readOwned(env, uid) {
  return (await env.TEMP_MAIL.get(ownerKey(uid), 'json')) || []
}

/** The owner's addresses that are still alive; expired ones are dropped from the list. */
async function liveOwned(env, uid) {
  const list = await readOwned(env, uid)
  const live = []
  for (const entry of list) {
    if (await liveSession(env, entry.address)) live.push(entry)
  }
  if (live.length !== list.length) await env.TEMP_MAIL.put(ownerKey(uid), JSON.stringify(live))
  return live
}

/**
 * Rows for the owner's address list. While the plan is paid, each premium address is renewed to the end of the
 * paid period (plus grace), so a renewal needs no action from the owner.
 */
async function syncOwnedAddresses(env, uid, activeEntitlement) {
  const list = await readOwned(env, uid)
  const kept = []
  const rows = []
  const now = Date.now()
  for (const entry of list) {
    const session = await liveSession(env, entry.address)
    if (!session) continue
    kept.push(entry)
    let current = session
    if (activeEntitlement && session.premium) {
      const target = premiumSessionUntil(activeEntitlement, now)
      if (session.expiresAt < target - 60_000) {
        current = { ...session, expiresAt: target, hardExpiresAt: target }
        await env.TEMP_MAIL.put(addressKey(entry.address), JSON.stringify(current), { expirationTtl: kvTtlUntilHardCap(current) })
      }
    }
    const forward = await env.TEMP_MAIL.get(forwardKey(entry.address), 'json')
    rows.push({ address: entry.address, createdAt: entry.createdAt || 0, expiresAt: new Date(current.expiresAt).toISOString(), forwardTo: forward?.to || '' })
  }
  if (kept.length !== list.length) await env.TEMP_MAIL.put(ownerKey(uid), JSON.stringify(kept))
  return rows
}

async function handleMe(request, env) {
  const user = await userFromRequest(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401, request, env)
  const entitlement = await getEntitlement(env, user.uid)
  const active = isPremiumActive(entitlement)
  const addresses = await syncOwnedAddresses(env, user.uid, active ? entitlement : null)
  return json({
    email: user.email,
    premium: {
      active,
      status: entitlement?.status || 'none',
      cycle: entitlement?.cycle || '',
      source: entitlement?.source || '',
      expiresAt: entitlement?.expiresAt ? new Date(entitlement.expiresAt).toISOString() : '',
    },
    limits: {
      maxAddresses: PREMIUM_LIMITS.maxAddresses,
      maxMessages: PREMIUM_LIMITS.maxMessages,
      maxAttachmentBytes: PREMIUM_LIMITS.maxAttachmentBytes,
      forwardPerDay: PREMIUM_LIMITS.forwardPerDay,
    },
    forwardingReady: Boolean(clean(env.RESEND_API_KEY)),
    addresses,
  }, 200, request, env)
}

const COMBINED_PER_ADDRESS = 50
const COMBINED_TOTAL = 150

/**
 * GET /api/me/inbox: the mail of all the owner's live addresses in one newest-first list. Each message carries the
 * address it arrived at. Premium only. It reads one KV list per address, so the page polls it slowly.
 */
async function handleCombinedInbox(request, env) {
  const user = await userFromRequest(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401, request, env)
  if (!isPremiumActive(await getEntitlement(env, user.uid))) return json({ error: 'premium_required' }, 403, request, env)
  const owned = await readOwned(env, user.uid)
  const sessions = await Promise.all(owned.map(async (entry) => ({ entry, session: await getSession(env, entry.address) })))
  const live = sessions.filter(({ session }) => session && isLive(session)).map(({ entry }) => entry.address)
  const groups = await Promise.all(live.map(async (address) => {
    const summaries = await listSummaries(env, address, COMBINED_PER_ADDRESS)
    return summaries.map((m) => ({ ...m, address }))
  }))
  const messages = groups.flat().sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))).slice(0, COMBINED_TOTAL)
  return json({ addresses: live, messages }, 200, request, env)
}


// ------------------------------------------------------------ custom domains

const domainRow = (record) => ({
  domain: record.domain,
  status: record.verified ? 'verified' : 'pending',
  records: record.records || [],
  forwardTo: record.to || '',
  createdAt: record.createdAt || 0,
})

/** Signed-in owner of a custom domain (or an error Response). */
async function domainContext(request, env, domains, domainText, needPremium) {
  const user = await userFromRequest(request, env)
  if (!user) return { error: json({ error: 'unauthenticated' }, 401, request, env) }
  if (needPremium && !isPremiumActive(await getEntitlement(env, user.uid))) return { error: json({ error: 'premium_required' }, 403, request, env) }
  const parsed = normalizeDomain(domainText, domains)
  if (!parsed.ok) return { error: json({ error: parsed.reason }, 400, request, env) }
  const record = await env.TEMP_MAIL.get(customDomainKey(parsed.domain), 'json')
  if (!record || record.uid !== user.uid) return { error: json({ error: 'not_found' }, 404, request, env) }
  return { user, domain: parsed.domain, record }
}

async function handleDomainList(request, env) {
  const user = await userFromRequest(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401, request, env)
  const names = (await env.TEMP_MAIL.get(customOwnerKey(user.uid), 'json')) || []
  const records = (await Promise.all(names.map((name) => env.TEMP_MAIL.get(customDomainKey(name), 'json')))).filter(Boolean)
  return json({ limit: MAX_CUSTOM_DOMAINS, ready: Boolean(clean(env.RESEND_API_KEY) && clean(env.RESEND_WEBHOOK_SECRET)), domains: records.map(domainRow) }, 200, request, env)
}

async function handleDomainAdd(request, env, domains) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const user = await userFromRequest(request, env)
  if (!user) return json({ error: 'unauthenticated' }, 401, request, env)
  if (!isPremiumActive(await getEntitlement(env, user.uid))) return json({ error: 'premium_required' }, 403, request, env)
  if (!clean(env.RESEND_API_KEY) || !clean(env.RESEND_WEBHOOK_SECRET)) return json({ error: 'domains_unavailable' }, 503, request, env)
  const parsed = normalizeDomain(body?.domain, domains)
  if (!parsed.ok) return json({ error: parsed.reason }, 400, request, env)
  if (!(await underLimit(env, request, 'domain', { perMinute: 3, perHour: 10 }))) return rateLimited(request, env)

  const names = (await env.TEMP_MAIL.get(customOwnerKey(user.uid), 'json')) || []
  if (names.length >= MAX_CUSTOM_DOMAINS) return json({ error: 'domain_limit', limit: MAX_CUSTOM_DOMAINS }, 409, request, env)
  if (await env.TEMP_MAIL.get(customDomainKey(parsed.domain), 'json')) return json({ error: 'domain_taken' }, 409, request, env)

  const created = await resendCreateDomain(env, parsed.domain)
  if (!created.ok || !created.data?.id) return json({ error: created.status === 403 || created.status === 422 || created.status === 409 ? 'domain_unavailable' : 'send_failed' }, created.status === 403 || created.status === 422 || created.status === 409 ? 409 : 502, request, env)
  const record = { domain: parsed.domain, uid: user.uid, resendId: created.data.id, verified: false, records: shapeRecords(created.data.records), to: '', createdAt: Date.now() }
  await env.TEMP_MAIL.put(customDomainKey(parsed.domain), JSON.stringify(record))
  await env.TEMP_MAIL.put(customOwnerKey(user.uid), JSON.stringify([...names, parsed.domain]))
  return json({ domain: domainRow(record) }, 201, request, env)
}

async function handleDomainVerify(request, env, domains, domainText) {
  const ctx = await domainContext(request, env, domains, domainText, true)
  if (ctx.error) return ctx.error
  if (!(await underLimit(env, request, 'domain', { perMinute: 6, perHour: 40 }))) return rateLimited(request, env)
  await resendVerifyDomain(env, ctx.record.resendId)
  const fresh = await resendGetDomain(env, ctx.record.resendId)
  if (!fresh.ok || !fresh.data) return json({ error: 'send_failed' }, 502, request, env)
  const next = { ...ctx.record, records: shapeRecords(fresh.data.records).length ? shapeRecords(fresh.data.records) : ctx.record.records, verified: domainIsVerified(fresh.data) }
  await env.TEMP_MAIL.put(customDomainKey(ctx.domain), JSON.stringify(next))
  return json({ domain: domainRow(next) }, 200, request, env)
}

async function handleDomainDelete(request, env, domains, domainText) {
  const ctx = await domainContext(request, env, domains, domainText, false)
  if (ctx.error) return ctx.error
  await resendDeleteDomain(env, ctx.record.resendId)
  const names = ((await env.TEMP_MAIL.get(customOwnerKey(ctx.user.uid), 'json')) || []).filter((name) => name !== ctx.domain)
  await env.TEMP_MAIL.put(customOwnerKey(ctx.user.uid), JSON.stringify(names))
  await Promise.all([env.TEMP_MAIL.delete(customDomainKey(ctx.domain)), env.TEMP_MAIL.delete(customPendingKey(ctx.domain))])
  return json({ ok: true }, 200, request, env)
}

/** POST /api/me/domains/:domain/forward { to }: a 6-digit code goes to the mailbox that will receive the domain's mail. */
async function handleDomainForwardStart(request, env, domains, domainText) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const ctx = await domainContext(request, env, domains, domainText, true)
  if (ctx.error) return ctx.error
  if (!ctx.record.verified) return json({ error: 'domain_not_verified' }, 409, request, env)
  const target = validForwardTarget(body?.to, domains)
  if (!target.ok) return json({ error: 'invalid_destination', reason: target.reason }, 400, request, env)
  const hourKey = `fwr:${ctx.user.uid}:${Math.floor(Date.now() / 3600000)}`
  const sent = Number.parseInt((await env.TEMP_MAIL.get(hourKey)) || '0', 10)
  if (sent >= PREMIUM_LIMITS.forwardCodesPerHour) return rateLimited(request, env)
  await env.TEMP_MAIL.put(hourKey, String(sent + 1), { expirationTtl: 7200 })
  const code = randomCode()
  const salt = randomId()
  await env.TEMP_MAIL.put(customPendingKey(ctx.domain), JSON.stringify({ to: target.to, salt, hash: await hashCode(code, salt), tries: 0 }), { expirationTtl: FORWARD_CODE_TTL })
  const ok = await sendResendMail(env, { to: target.to, ...forwardCodeEmail({ code, address: `anything@${ctx.domain}`, minutes: FORWARD_CODE_TTL / 60 }) })
  if (!ok) {
    await env.TEMP_MAIL.delete(customPendingKey(ctx.domain))
    return json({ error: 'send_failed' }, 502, request, env)
  }
  return json({ ok: true, to: target.to, expiresInSeconds: FORWARD_CODE_TTL }, 200, request, env)
}

async function handleDomainForwardVerify(request, env, domains, domainText) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const ctx = await domainContext(request, env, domains, domainText, true)
  if (ctx.error) return ctx.error
  const pending = await env.TEMP_MAIL.get(customPendingKey(ctx.domain), 'json')
  if (!pending) return json({ error: 'no_pending' }, 404, request, env)
  if ((pending.tries || 0) >= FORWARD_CODE_TRIES) {
    await env.TEMP_MAIL.delete(customPendingKey(ctx.domain))
    return json({ error: 'too_many_tries' }, 429, request, env)
  }
  if ((await hashCode(clean(body?.code).replace(/\s+/g, ''), pending.salt)) !== pending.hash) {
    await env.TEMP_MAIL.put(customPendingKey(ctx.domain), JSON.stringify({ ...pending, tries: (pending.tries || 0) + 1 }), { expirationTtl: FORWARD_CODE_TTL })
    return json({ error: 'wrong_code' }, 400, request, env)
  }
  const next = { ...ctx.record, to: pending.to, forwardVerifiedAt: new Date().toISOString() }
  await env.TEMP_MAIL.put(customDomainKey(ctx.domain), JSON.stringify(next))
  await env.TEMP_MAIL.delete(customPendingKey(ctx.domain))
  return json({ domain: domainRow(next) }, 200, request, env)
}

async function handleDomainForwardStop(request, env, domains, domainText) {
  const ctx = await domainContext(request, env, domains, domainText, false)
  if (ctx.error) return ctx.error
  const next = { ...ctx.record, to: '' }
  await env.TEMP_MAIL.put(customDomainKey(ctx.domain), JSON.stringify(next))
  await env.TEMP_MAIL.delete(customPendingKey(ctx.domain))
  return json({ domain: domainRow(next) }, 200, request, env)
}

/** POST /api/resend/inbound: Resend tells us mail arrived at a customer's domain. We forward it to their verified mailbox. */
async function handleInboundWebhook(request, env) {
  const raw = await request.text()
  if (!(await verifyWebhook(env.RESEND_WEBHOOK_SECRET, request.headers, raw))) return json({ error: 'bad_signature' }, 401, request, env)
  let event
  try { event = JSON.parse(raw) } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  if (event?.type !== 'email.received' || !event.data?.email_id) return json({ ok: true, ignored: true }, 200, request, env)

  const recipients = [...new Set((event.data.to || []).map(bareAddress).filter((a) => a.includes('@')))]
  const targets = []
  for (const recipient of recipients) {
    const domain = recipient.split('@')[1]
    const record = await env.TEMP_MAIL.get(customDomainKey(domain), 'json')
    if (!record?.verified || !record.to) continue
    if (!isPremiumActive(await getEntitlement(env, record.uid))) continue
    const countKey = `fwc:cd:${domain}:${isoDay()}`
    const count = Number.parseInt((await env.TEMP_MAIL.get(countKey)) || '0', 10)
    if (count >= PREMIUM_LIMITS.forwardPerDay) continue
    targets.push({ recipient, record, countKey, count })
  }
  if (!targets.length) return json({ ok: true, forwarded: 0 }, 200, request, env)

  const received = await resendGetReceived(env, event.data.email_id)
  if (!received.ok || !received.data) return json({ error: 'fetch_failed' }, 502, request, env) // Resend retries
  let forwarded = 0
  for (const { recipient, record, countKey, count } of targets) {
    await env.TEMP_MAIL.put(countKey, String(count + 1), { expirationTtl: 2 * 86400 })
    const mail = customForwardBody(received.data, recipient)
    const replyTo = SIMPLE_EMAIL.test(bareAddress(received.data.from)) ? bareAddress(received.data.from) : ''
    if (await sendResendMail(env, { to: record.to, ...mail, replyTo })) forwarded += 1
  }
  if (forwarded) await bumpStats(env, { forwarded })
  return json({ ok: true, forwarded }, 200, request, env)
}

/** Resolve the signed-in owner of an address, or an error Response. `needPremium` also requires an active plan. */
async function ownerContext(request, env, domains, addressText, needPremium) {
  const user = await userFromRequest(request, env)
  if (!user) return { error: json({ error: 'unauthenticated' }, 401, request, env) }
  if (needPremium && !isPremiumActive(await getEntitlement(env, user.uid))) return { error: json({ error: 'premium_required' }, 403, request, env) }
  const parsed = parseAddress(clean(addressText), domains)
  if (!parsed) return { error: json({ error: 'invalid_address' }, 400, request, env) }
  const owned = await readOwned(env, user.uid)
  if (!owned.some((entry) => entry.address === parsed.address)) return { error: json({ error: 'not_found' }, 404, request, env) }
  return { user, address: parsed.address, owned }
}

async function handleDeleteOwned(request, env, domains, encodedAddress) {
  let decoded
  try { decoded = decodeURIComponent(encodedAddress) } catch { return json({ error: 'invalid_address' }, 400, request, env) }
  const ctx = await ownerContext(request, env, domains, decoded, false)
  if (ctx.error) return ctx.error
  await wipeAddress(env, ctx.address)
  await env.TEMP_MAIL.put(ownerKey(ctx.user.uid), JSON.stringify(ctx.owned.filter((entry) => entry.address !== ctx.address)))
  return json({ ok: true }, 200, request, env)
}

const FORWARD_CODE_TTL = 900
const FORWARD_CODE_TRIES = 5

/** POST /api/forward { address, to }: email a 6-digit code to the destination to prove it belongs to the owner. */
async function handleForwardStart(request, env, domains) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const ctx = await ownerContext(request, env, domains, body?.address, true)
  if (ctx.error) return ctx.error
  if (!clean(env.RESEND_API_KEY)) return json({ error: 'forwarding_unavailable' }, 503, request, env)
  const target = validForwardTarget(body?.to, domains)
  if (!target.ok) return json({ error: 'invalid_destination', reason: target.reason }, 400, request, env)

  // A few codes per hour per account: this endpoint sends mail to an address the owner typed.
  const hourKey = `fwr:${ctx.user.uid}:${Math.floor(Date.now() / 3600000)}`
  const sent = Number.parseInt((await env.TEMP_MAIL.get(hourKey)) || '0', 10)
  if (sent >= PREMIUM_LIMITS.forwardCodesPerHour) return rateLimited(request, env)
  await env.TEMP_MAIL.put(hourKey, String(sent + 1), { expirationTtl: 7200 })

  const code = randomCode()
  const salt = randomId()
  await env.TEMP_MAIL.put(pendingForwardKey(ctx.address), JSON.stringify({ to: target.to, salt, hash: await hashCode(code, salt), tries: 0 }), { expirationTtl: FORWARD_CODE_TTL })
  const ok = await sendResendMail(env, { to: target.to, ...forwardCodeEmail({ code, address: ctx.address, minutes: FORWARD_CODE_TTL / 60 }) })
  if (!ok) {
    await env.TEMP_MAIL.delete(pendingForwardKey(ctx.address))
    return json({ error: 'send_failed' }, 502, request, env)
  }
  return json({ ok: true, to: target.to, expiresInSeconds: FORWARD_CODE_TTL }, 200, request, env)
}

/** POST /api/forward/verify { address, code }: the right code turns forwarding on for that address. */
async function handleForwardVerify(request, env, domains) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const ctx = await ownerContext(request, env, domains, body?.address, true)
  if (ctx.error) return ctx.error
  const pending = await env.TEMP_MAIL.get(pendingForwardKey(ctx.address), 'json')
  if (!pending) return json({ error: 'no_pending' }, 404, request, env)
  if ((pending.tries || 0) >= FORWARD_CODE_TRIES) {
    await env.TEMP_MAIL.delete(pendingForwardKey(ctx.address))
    return json({ error: 'too_many_tries' }, 429, request, env)
  }
  const guess = clean(body?.code).replace(/\s+/g, '')
  if ((await hashCode(guess, pending.salt)) !== pending.hash) {
    await env.TEMP_MAIL.put(pendingForwardKey(ctx.address), JSON.stringify({ ...pending, tries: (pending.tries || 0) + 1 }), { expirationTtl: FORWARD_CODE_TTL })
    return json({ error: 'wrong_code' }, 400, request, env)
  }
  await env.TEMP_MAIL.put(forwardKey(ctx.address), JSON.stringify({ to: pending.to, uid: ctx.user.uid, verifiedAt: new Date().toISOString() }))
  await env.TEMP_MAIL.delete(pendingForwardKey(ctx.address))
  return json({ ok: true, forwardTo: pending.to }, 200, request, env)
}

async function handleForwardStop(request, env, domains) {
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
  const ctx = await ownerContext(request, env, domains, body?.address, false)
  if (ctx.error) return ctx.error
  await Promise.all([env.TEMP_MAIL.delete(forwardKey(ctx.address)), env.TEMP_MAIL.delete(pendingForwardKey(ctx.address))])
  return json({ ok: true }, 200, request, env)
}

const SIMPLE_EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/

/** Send a plain-text copy of a stored message to the owner's verified mailbox. Never throws. */
async function forwardMessage(env, session, address, record) {
  try {
    const [forward, entitlement] = await Promise.all([
      env.TEMP_MAIL.get(forwardKey(address), 'json'),
      getEntitlement(env, session.owner),
    ])
    if (!forward?.to || !isPremiumActive(entitlement)) return
    const countKey = `fwc:${address}:${isoDay()}`
    const count = Number.parseInt((await env.TEMP_MAIL.get(countKey)) || '0', 10)
    if (count >= PREMIUM_LIMITS.forwardPerDay) return
    await env.TEMP_MAIL.put(countKey, String(count + 1), { expirationTtl: 2 * 86400 })
    const mail = forwardBody(record, address)
    const sent = await sendResendMail(env, { to: forward.to, ...mail, replyTo: SIMPLE_EMAIL.test(record.fromAddress || '') ? record.fromAddress : '' })
    if (sent) await bumpStats(env, { forwarded: 1 })
  } catch (error) {
    console.warn('temp-mail forward failed', String(error?.message || error).slice(0, 120))
  }
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
    try {
      return json(await adminOverview(env, { domains, pushOn: pushEnabled(env) }), 200, request, env)
    } catch (error) {
      return json({ error: 'overview_failed', detail: String(error?.message || error).slice(0, 200) }, 500, request, env)
    }
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
  if (pathname === '/api/admin/premium' && request.method === 'PUT') {
    let body
    try { body = await request.json() } catch { return json({ error: 'invalid_body' }, 400, request, env) }
    const uid = clean(body?.uid)
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return json({ error: 'invalid_uid' }, 400, request, env)
    const entitlement = grantEntitlement({ days: body?.days, email: body?.email })
    await env.TEMP_MAIL.put(entitlementKey(uid), JSON.stringify(entitlement))
    return json({ ok: true, uid, entitlement }, 200, request, env)
  }
  if (pathname.startsWith('/api/admin/premium/') && request.method === 'DELETE') {
    const uid = decodeURIComponent(pathname.slice('/api/admin/premium/'.length))
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return json({ error: 'invalid_uid' }, 400, request, env)
    await env.TEMP_MAIL.put(entitlementKey(uid), JSON.stringify({ status: 'revoked', cycle: '', expiresAt: 0, source: 'admin', updatedAt: new Date().toISOString() }))
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
      // Display only: the real prices are the Polar products. Off until the Control Centre switches it on.
      premium: {
        enabled: settings.premiumEnabled,
        monthlyPrice: clean(env.PREMIUM_PRICE_MONTHLY) || '3.99',
        yearlyPrice: clean(env.PREMIUM_PRICE_YEARLY) || '29',
        maxAddresses: PREMIUM_LIMITS.maxAddresses,
        maxAttachmentBytes: PREMIUM_LIMITS.maxAttachmentBytes,
        forwardingReady: Boolean(clean(env.RESEND_API_KEY)),
      },
    }, 200, request, env)
  }

  if (pathname === '/api/resend/inbound' && request.method === 'POST') return handleInboundWebhook(request, env)
  if (pathname === '/api/me/domains' && request.method === 'GET') return handleDomainList(request, env)
  if (pathname === '/api/me/domains' && request.method === 'POST') return handleDomainAdd(request, env, domains)
  if (pathname.startsWith('/api/me/domains/')) {
    const rest = pathname.slice('/api/me/domains/'.length).split('/')
    let name
    try { name = decodeURIComponent(rest[0]) } catch { return json({ error: 'invalid_domain' }, 400, request, env) }
    if (rest.length === 1 && request.method === 'DELETE') return handleDomainDelete(request, env, domains, name)
    if (rest.length === 2 && rest[1] === 'verify' && request.method === 'POST') return handleDomainVerify(request, env, domains, name)
    if (rest.length === 2 && rest[1] === 'forward' && request.method === 'POST') return handleDomainForwardStart(request, env, domains, name)
    if (rest.length === 2 && rest[1] === 'forward' && request.method === 'DELETE') return handleDomainForwardStop(request, env, domains, name)
    if (rest.length === 3 && rest[1] === 'forward' && rest[2] === 'verify' && request.method === 'POST') return handleDomainForwardVerify(request, env, domains, name)
    return json({ error: 'not_found' }, 404, request, env)
  }
  if (pathname === '/api/me' && request.method === 'GET') return handleMe(request, env)
  if (pathname === '/api/me/inbox' && request.method === 'GET') return handleCombinedInbox(request, env)
  if (pathname.startsWith('/api/me/address/') && request.method === 'DELETE') {
    return handleDeleteOwned(request, env, domains, pathname.slice('/api/me/address/'.length))
  }
  if (pathname === '/api/forward' && request.method === 'POST') return handleForwardStart(request, env, domains)
  if (pathname === '/api/forward/verify' && request.method === 'POST') return handleForwardVerify(request, env, domains)
  if (pathname === '/api/forward' && request.method === 'DELETE') return handleForwardStop(request, env, domains)

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
      if (session.premium) return json({ error: 'max_extensions', ...sessionBody(session, env) }, 409, request, env)
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
      const messages = await listSummaries(env, parsed.address, session.premium ? PREMIUM_LIMITS.maxMessages : MAX_MESSAGES_PER_ADDRESS)
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
  const premium = Boolean(session.premium)
  const maxMessages = premium ? PREMIUM_LIMITS.maxMessages : MAX_MESSAGES_PER_ADDRESS
  if (message.rawSize > (premium ? PREMIUM_LIMITS.maxRawEmailBytes : MAX_RAW_EMAIL_BYTES)) {
    message.setReject('Message too large')
    await track(ctx, env, { mail_rejected: 1 })
    return
  }
  if (await isDomainBlocked(env, senderDomain(message.from), settings)) {
    message.setReject('Sender blocked')
    await track(ctx, env, { mail_rejected: 1, mail_blocked_sender: 1 })
    return
  }
  const existing = await env.TEMP_MAIL.list({ prefix: inboxPrefix(parsedTo.address), limit: maxMessages })
  if (existing.keys.length >= maxMessages) {
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
  const attachmentLimits = premium
    ? { maxCount: PREMIUM_LIMITS.maxAttachmentsPerMessage, maxBytes: PREMIUM_LIMITS.maxAttachmentBytes, maxTotalBytes: PREMIUM_LIMITS.maxAttachmentTotalBytes }
    : {}
  const attachments = (parsed.attachments || []).map((att, index) => {
    const described = describeAttachment(att, index, used, attachmentLimits)
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
  if (premium && session.owner) {
    const forwarded = forwardMessage(env, session, parsedTo.address, record)
    if (ctx?.waitUntil) ctx.waitUntil(forwarded)
    else await forwarded
  }
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
