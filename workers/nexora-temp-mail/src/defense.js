/**
 * Bot defense for the temp-mail Worker: decides, per request, whether the visitor
 * looks like a person or a script, remembers what it saw, and bans repeat offenders.
 *
 * It is a scoring model, not a single rule. Each signal adds points; the total
 * becomes a verdict (human / suspicious / bot) and an action:
 *   human      -> normal limits
 *   suspicious -> much tighter limits (and the captcha, when enabled, still applies)
 *   bot        -> request refused and the visitor banned for a while (repeat offenders longer)
 * Modes: "enforce" acts, "monitor" only records what it would have done, "off" does nothing.
 *
 * Privacy: IPs are never stored in full. KV keys use a salted hash; the Control
 * Centre only shows a masked address (1.2.x.x).
 */
import { PROTECTED_SENDER_DOMAINS, clean } from './lib.js'

const HOSTING = /amazon|aws\b|google (cloud|llc)|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|vultr|contabo|scaleway|oracle|leaseweb|choopa|datacamp|m247|hostinger|godaddy|namecheap|alibaba|tencent|colocrossing|quadranet|psychz|serverius|zenlayer|kamatera|rackspace|upcloud|netcup|interserver|hosting|datacenter|data center|\bserver/i
const VPN = /\bvpn\b|proxy|mullvad|nordvpn|expressvpn|surfshark|proton ?(ag|vpn)|private internet|windscribe|cyberghost/i
const BOT_UA = /curl|wget|python|requests|aiohttp|httpx|axios|node-fetch|undici|go-http|java\/|okhttp|scrapy|httpclient|libwww|postman|insomnia|headless|phantom|selenium|puppeteer|playwright|bot\b|spider|crawler/i

export const DEFENSE_MODES = ['enforce', 'monitor', 'off']
const HOUR = 3600

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export async function hashIp(ip, env) {
  const data = new TextEncoder().encode(`${clean(env?.DEFENSE_SALT) || 'nexora-tm'}|${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function maskIp(ip) {
  const text = clean(ip)
  if (text.includes('.')) { const p = text.split('.'); return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : 'x' }
  if (text.includes(':')) return `${text.split(':').slice(0, 2).join(':')}::x`
  return 'x'
}

export function readSignals(request) {
  const h = request.headers
  const cf = request.cf || {}
  return {
    ua: h.get('user-agent') || '',
    lang: h.get('accept-language') || '',
    fetchMeta: h.get('sec-fetch-site') || '',
    origin: h.get('origin') || '',
    asn: Number(cf.asn) || 0,
    org: String(cf.asOrganization || ''),
    country: String(cf.country || ''),
  }
}

/** Pure scoring: signals + remembered behaviour in, { score 0-100, reasons[] } out. */
export function scoreSignals(sig, state = {}) {
  let score = 0
  const reasons = []
  const add = (points, why) => { score += points; reasons.push(why) }

  if (!sig.ua) add(45, 'no_user_agent')
  else if (BOT_UA.test(sig.ua)) add(55, 'automation_user_agent')
  else if (!/mozilla|opera/i.test(sig.ua)) add(30, 'non_browser_user_agent')
  if (!sig.lang) add(15, 'no_accept_language')
  if (!sig.fetchMeta) add(25, 'no_fetch_metadata')
  if (!sig.origin) add(20, 'no_origin')

  if (HOSTING.test(sig.org)) add(25, 'datacenter_network')
  else if (VPN.test(sig.org)) add(8, 'vpn_network')

  if (!state.visited) add(30, 'no_page_visit')
  else if (state.sinceVisitMs < 1500) add(20, 'instant_after_load')
  if (state.creates1h >= 15) add(30, 'many_creates')
  else if (state.creates1h >= 8) add(15, 'repeat_creates')
  if (state.asnCreates10m >= 25) add(25, 'network_burst')
  if (state.strikes > 0) add(20, 'previous_ban')
  if (state.trusted) add(-10, 'passed_captcha_recently')

  return { score: clamp(score, 0, 100), reasons }
}

export const verdictFor = (score, settings) => (score >= settings.botThreshold ? 'bot' : score >= settings.suspiciousThreshold ? 'suspicious' : 'human')

const invertedTime = () => String(9_999_999_999_999 - Date.now()).padStart(13, '0')
const bucket = (ms) => Math.floor(Date.now() / ms)

/** Record that this visitor loaded the page (needed to tell people from scripts that skip it). */
export async function markVisit(env, ip) {
  try {
    const key = `seen:${await hashIp(ip, env)}`
    const row = await env.TEMP_MAIL.get(key, 'json')
    if (!row || Date.now() - row.at > 10 * 60 * 1000) await env.TEMP_MAIL.put(key, JSON.stringify({ at: Date.now() }), { expirationTtl: 4 * HOUR })
  } catch { /* best effort */ }
}

export async function markHuman(env, ip) {
  try { await env.TEMP_MAIL.put(`human:${await hashIp(ip, env)}`, '1', { expirationTtl: 1800 }) } catch { /* best effort */ }
}

async function logEvent(env, event) {
  const meta = {
    at: new Date().toISOString(), ip: event.ipMask, h: event.ipHash.slice(0, 8), c: event.country, a: event.asn,
    o: event.org.slice(0, 40), v: event.verdict, s: event.score, r: event.reasons.join(','), x: event.action, k: event.kind || 'create', u: event.ua.slice(0, 50),
  }
  try { await env.TEMP_MAIL.put(`sec:evt:${invertedTime()}:${Math.random().toString(36).slice(2, 6)}`, '1', { expirationTtl: 3 * 24 * HOUR, metadata: meta }) } catch { /* best effort */ }
}

/**
 * Judge one address-creation request.
 * Returns { verdict, score, reasons, action: 'allow'|'tighten'|'block', limits, ipHash, ipMask, banned }.
 */
export async function assessRequest(request, env, settings, ip) {
  const sig = readSignals(request)
  const ipHash = await hashIp(ip, env)
  const base = { ipHash, ipMask: maskIp(ip), country: sig.country, asn: sig.asn, org: sig.org, ua: sig.ua }
  if (settings.defenseMode === 'off' || (settings.allowIps || []).includes(ip)) {
    return { ...base, verdict: 'human', score: 0, reasons: [settings.defenseMode === 'off' ? 'defense_off' : 'allowlisted'], action: 'allow', logged: false }
  }

  const ban = await env.TEMP_MAIL.get(`ban:${ipHash}`, 'json')
  const [visit, strikes, human, creates, asnRow] = await Promise.all([
    env.TEMP_MAIL.get(`seen:${ipHash}`, 'json'),
    env.TEMP_MAIL.get(`strike:${ipHash}`, 'json'),
    env.TEMP_MAIL.get(`human:${ipHash}`),
    env.TEMP_MAIL.get(`rl:create:h:${ip}:${bucket(HOUR * 1000)}`),
    sig.asn ? env.TEMP_MAIL.get(`asn:${sig.asn}:${bucket(600_000)}`) : null,
  ])
  const state = {
    visited: Boolean(visit),
    sinceVisitMs: visit ? Date.now() - visit.at : 0,
    creates1h: Number.parseInt(creates || '0', 10),
    asnCreates10m: Number.parseInt(asnRow || '0', 10),
    strikes: strikes?.n || 0,
    trusted: Boolean(human),
  }
  if (sig.asn) env.TEMP_MAIL.put(`asn:${sig.asn}:${bucket(600_000)}`, String(state.asnCreates10m + 1), { expirationTtl: 900 }).catch(() => {})

  let { score, reasons } = scoreSignals(sig, state)
  let verdict = verdictFor(score, settings)
  if (ban) { score = 100; verdict = 'bot'; reasons = ['banned', ...reasons] }
  const enforcing = settings.defenseMode === 'enforce'
  const action = !enforcing ? 'allow' : verdict === 'bot' ? 'block' : verdict === 'suspicious' ? 'tighten' : 'allow'
  const result = {
    ...base, verdict, score, reasons, action, banned: Boolean(ban), strikes: state.strikes, logged: true,
    wouldHave: !enforcing && verdict !== 'human' ? (verdict === 'bot' ? 'block' : 'tighten') : '',
  }
  await logEvent(env, { ...result, action: enforcing ? action : result.wouldHave ? `monitor:${result.wouldHave}` : 'allow' })
  return result
}

/** Ban a visitor; repeat offenders are banned for longer (1h, 4h, 16h ... up to 7 days). */
export async function banVisitor(env, assessment, reason) {
  const strikes = (assessment.strikes || 0) + 1
  const ttl = Math.min(7 * 24 * HOUR, HOUR * 4 ** (strikes - 1))
  const until = new Date(Date.now() + ttl * 1000).toISOString()
  const meta = { ip: assessment.ipMask, c: assessment.country, a: assessment.asn, o: assessment.org.slice(0, 40), until, n: strikes, why: reason.slice(0, 120), at: new Date().toISOString() }
  try {
    await Promise.all([
      env.TEMP_MAIL.put(`ban:${assessment.ipHash}`, '1', { expirationTtl: Math.max(60, ttl), metadata: meta }),
      env.TEMP_MAIL.put(`strike:${assessment.ipHash}`, JSON.stringify({ n: strikes }), { expirationTtl: 30 * 24 * HOUR }),
    ])
  } catch { /* best effort */ }
}

/**
 * Mail spray: one sender domain hitting many different temp inboxes in minutes is
 * bulk/abusive. When it reaches the limit the domain is blocked for 24 hours.
 * Returns true when the domain has just been (or already is) over the limit.
 */
export async function detectSpray(env, settings, domain, address) {
  if (!domain || settings.defenseMode === 'off' || PROTECTED_SENDER_DOMAINS.has(domain)) return false
  try {
    const key = `spray:${domain}:${bucket(600_000)}`
    const list = (await env.TEMP_MAIL.get(key, 'json')) || []
    if (!list.includes(address)) list.push(address)
    await env.TEMP_MAIL.put(key, JSON.stringify(list.slice(-300)), { expirationTtl: 900 })
    if (list.length < settings.sprayLimit) return false
    if (settings.defenseMode !== 'enforce') {
      await logEvent(env, { ipMask: domain, ipHash: '', country: '', asn: 0, org: '', verdict: 'bot', score: 90, reasons: ['mail_spray'], action: 'monitor:block', kind: 'spray', ua: '' })
      return false
    }
    await env.TEMP_MAIL.put(`bl:${domain}`, '1', { expirationTtl: 24 * HOUR })
    await logEvent(env, { ipMask: domain, ipHash: '', country: '', asn: 0, org: '', verdict: 'bot', score: 90, reasons: ['mail_spray', `${list.length}_inboxes`], action: 'block', kind: 'spray', ua: '' })
    return true
  } catch { return false }
}

function tally(rows, pick, n) {
  const counts = new Map()
  for (const row of rows) { const key = pick(row); if (key) counts.set(key, (counts.get(key) || 0) + 1) }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))
}

/** What the Control Centre shows: recent decisions, active bans and what the traffic looks like. */
export async function defenseOverview(env) {
  const [events, bans] = await Promise.all([
    env.TEMP_MAIL.list({ prefix: 'sec:evt:', limit: 200 }),
    env.TEMP_MAIL.list({ prefix: 'ban:', limit: 100 }),
  ])
  const rows = events.keys.map((k) => k.metadata).filter(Boolean)
  const createRows = rows.filter((r) => r.k !== 'spray')
  return {
    recent: rows.slice(0, 60),
    bans: bans.keys.map((k) => ({ hash: k.name.slice(4), ...(k.metadata || {}) })),
    topNetworks: tally(createRows.filter((r) => r.v !== 'human'), (r) => r.o || (r.a ? `AS${r.a}` : ''), 5),
    topCountries: tally(createRows.filter((r) => r.v !== 'human'), (r) => r.c, 5),
    topReasons: tally(rows.filter((r) => r.v !== 'human').flatMap((r) => String(r.r || '').split(',').filter(Boolean).map((why) => ({ why }))), (r) => r.why, 6),
    sample: createRows.length,
  }
}
