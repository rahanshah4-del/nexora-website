/**
 * Health of the receiving domains (mail.nexorasolution.us, mail.nexorasolution.online, ...).
 *
 * Two things can take a domain out of rotation for NEW addresses:
 *   - an admin switched it off in the Control Centre (settings.disabledDomains), or
 *   - its DNS no longer points at Cloudflare Email Routing (the MX check below fails).
 * Inboxes that already exist on such a domain keep working: receiving is never restricted here.
 *
 * Pure apart from the injected fetch and the KV binding, so tests run in plain Node.
 */

export const HEALTH_TTL_MS = 5 * 60 * 1000
const MX_HOST = 'mx.cloudflare.net'

const healthKey = (domain) => `domhealth:${domain}`
const statKey = (domain) => `domstat:${domain}`

/** True for the DNS answers Cloudflare Email Routing publishes ("28 route3.mx.cloudflare.net."). */
export function hasCloudflareMx(answers) {
  return Array.isArray(answers) && answers.some((a) => a?.type === 15 && String(a.data || '').toLowerCase().includes(MX_HOST))
}

/**
 * Ask Cloudflare's DNS-over-HTTPS resolver for the domain's MX records.
 * ok: true  = Email Routing records found
 * ok: false = DNS answered and they are missing (the domain would not receive mail)
 * ok: null  = could not find out (resolver down): never treated as a failure
 */
export async function checkMx(domain, fetchFn = fetch) {
  try {
    const res = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, { headers: { accept: 'application/dns-json' } })
    if (!res.ok) return { ok: null, detail: `DNS lookup failed (HTTP ${res.status})` }
    const body = await res.json()
    if (hasCloudflareMx(body?.Answer)) return { ok: true, detail: 'Email Routing records found' }
    return { ok: false, detail: body?.Status === 3 ? 'Domain not found in DNS' : 'No Cloudflare Email Routing MX records' }
  } catch (error) {
    return { ok: null, detail: `DNS lookup failed (${String(error?.message || error).slice(0, 60)})` }
  }
}

export async function readHealth(env, domains) {
  const out = {}
  await Promise.all(domains.map(async (d) => {
    try { out[d] = (await env.TEMP_MAIL.get(healthKey(d), 'json')) || null } catch { out[d] = null }
  }))
  return out
}

/** Re-check every domain whose last check is older than HEALTH_TTL_MS (or all of them with force). Never throws. */
export async function refreshHealth(env, domains, { fetchFn = fetch, force = false, now = Date.now() } = {}) {
  const current = await readHealth(env, domains)
  await Promise.all(domains.map(async (d) => {
    const prev = current[d]
    if (!force && prev && now - Number(prev.checkedAt || 0) < HEALTH_TTL_MS) return
    const result = await checkMx(d, fetchFn)
    // An inconclusive check keeps the previous verdict instead of flipping the domain.
    const ok = result.ok === null ? (prev?.ok ?? null) : result.ok
    const next = { ok, detail: result.detail, checkedAt: now, failingSince: ok === false ? (prev?.ok === false ? prev.failingSince || now : now) : null }
    current[d] = next
    try { await env.TEMP_MAIL.put(healthKey(d), JSON.stringify(next), { expirationTtl: 7 * 24 * 3600 }) } catch { /* best effort */ }
  }))
  return current
}

/**
 * Domains that new addresses may be created on: not switched off by hand and not failing the DNS check.
 * If that leaves nothing, fall back so the tool never stops creating addresses because of the rules above:
 * first to the domains not switched off, then to all of them.
 */
export function pickableDomains(domains, settings = {}, health = {}) {
  const off = new Set((settings.disabledDomains || []).map((d) => String(d).toLowerCase()))
  const enabled = domains.filter((d) => !off.has(d))
  const healthy = enabled.filter((d) => health[d]?.ok !== false)
  if (healthy.length) return healthy
  return enabled.length ? enabled : domains
}

export function pickDomain(domains, rng = Math.random) {
  return domains[Math.floor(rng() * domains.length)]
}

/** Remember that a message arrived on this domain (last time and today's count). Never throws. */
export async function recordMail(env, domain, now = Date.now()) {
  try {
    const day = new Date(now).toISOString().slice(0, 10)
    const row = (await env.TEMP_MAIL.get(statKey(domain), 'json')) || {}
    const next = { lastMailAt: now, day, today: row.day === day ? (row.today || 0) + 1 : 1, total: (row.total || 0) + 1 }
    await env.TEMP_MAIL.put(statKey(domain), JSON.stringify(next), { expirationTtl: 100 * 24 * 3600 })
  } catch { /* stats must never break mail */ }
}

/** Count a new address created on this domain. Never throws. */
export async function recordCreated(env, domain, now = Date.now()) {
  try {
    const day = new Date(now).toISOString().slice(0, 10)
    const row = (await env.TEMP_MAIL.get(statKey(domain), 'json')) || {}
    const next = { ...row, createdDay: day, createdToday: row.createdDay === day ? (row.createdToday || 0) + 1 : 1 }
    await env.TEMP_MAIL.put(statKey(domain), JSON.stringify(next), { expirationTtl: 100 * 24 * 3600 })
  } catch { /* stats must never break the API */ }
}

/** Everything the Control Centre card and the Sentinel need, one row per domain. */
export async function domainReport(env, domains, settings, { fetchFn = fetch, force = false, now = Date.now() } = {}) {
  const health = await refreshHealth(env, domains, { fetchFn, force, now })
  const off = new Set((settings.disabledDomains || []).map((d) => String(d).toLowerCase()))
  const stats = await Promise.all(domains.map(async (d) => {
    try { return (await env.TEMP_MAIL.get(statKey(d), 'json')) || {} } catch { return {} }
  }))
  const day = new Date(now).toISOString().slice(0, 10)
  const rows = domains.map((domain, i) => {
    const h = health[domain] || {}
    const s = stats[i] || {}
    return {
      domain,
      switchedOff: off.has(domain),
      dnsOk: h.ok ?? null,
      detail: h.detail || 'Not checked yet',
      checkedAt: h.checkedAt ? new Date(h.checkedAt).toISOString() : '',
      failingSince: h.failingSince ? new Date(h.failingSince).toISOString() : '',
      lastMailAt: s.lastMailAt ? new Date(s.lastMailAt).toISOString() : '',
      mailToday: s.day === day ? s.today || 0 : 0,
      mailTotal: s.total || 0,
      createdToday: s.createdDay === day ? s.createdToday || 0 : 0,
      inRotation: pickableDomains(domains, settings, health).includes(domain),
    }
  })
  return {
    rows,
    // Sentinel alerts on this: a domain that is meant to be live but its DNS check fails.
    allHealthy: rows.every((r) => r.switchedOff || r.dnsOk !== false),
    rotationCount: rows.filter((r) => r.inRotation).length,
  }
}
