/**
 * /api/site-probe?url=https://example.com/page
 *
 * The server-side half of the free speed test. Google PageSpeed measures how a page paints in a lab browser; it does
 * not report how the server and the network behave. This probe measures that from a Cloudflare edge location:
 * DNS time, the redirect chain, server answer time over several requests, compression / caching / CDN, security
 * headers, third-party domains in the HTML, and robots.txt / sitemap.xml.
 *
 * It never returns the page body, only numbers and header facts. It only fetches public http(s) hosts, follows at
 * most five redirects, reads at most 1.5 MB and is rate limited per visitor, so it cannot be used as an open proxy.
 */

export const PROBE_PATH = '/api/site-probe'
export const MAX_REDIRECTS = 5
export const MAX_HTML_BYTES = 1_500_000
export const SAMPLE_COUNT = 3
export const RATE_LIMIT = { windowMs: 60_000, max: 6 }
const REQUEST_TIMEOUT_MS = 8000
const DOH = 'https://cloudflare-dns.com/dns-query'

const buckets = new Map()

/** True when this visitor is over the limit. Best effort: the counter lives in one Worker instance. */
export function rateLimited(key, now = Date.now()) {
  for (const [k, v] of buckets) if (now - v.start > RATE_LIMIT.windowMs) buckets.delete(k)
  const bucket = buckets.get(key)
  if (!bucket) { buckets.set(key, { start: now, count: 1 }); return false }
  bucket.count += 1
  return bucket.count > RATE_LIMIT.max
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/** Loopback, private, link-local and other non-public addresses. */
export function isPrivateIp(ip) {
  const v4 = IPV4.exec(ip)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v6 = ip.toLowerCase()
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:')
}

/** A public http(s) page address, or null. IP literals, localhost, odd ports and embedded logins are refused. */
export function parseProbeUrl(raw) {
  let url
  try { url = new URL(String(raw ?? '').trim()) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '80' && url.port !== '443') return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.') || host.startsWith('[') || IPV4.test(host)) return null
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid)$/.test(host)) return null
  if (host.length > 253) return null
  return url
}

const round = (n) => Math.round(n)
const median = (list) => { const s = [...list].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

async function timed(fetchImpl, input, init = {}) {
  const started = Date.now()
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetchImpl(input, { ...init, signal: ctl.signal })
    return { response, ms: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

async function dnsLookup(fetchImpl, host) {
  const ask = async (type, name = host) => {
    try {
      const { response, ms } = await timed(fetchImpl, `${DOH}?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' } })
      if (!response.ok) return { ms, answers: [] }
      const json = await response.json()
      return { ms, answers: Array.isArray(json?.Answer) ? json.Answer : [] }
    } catch { return { ms: null, answers: [] } }
  }
  const [a, aaaa] = await Promise.all([ask('A'), ask('AAAA')])
  const v4 = a.answers.filter((x) => x.type === 1).map((x) => String(x.data))
  const v6 = aaaa.answers.filter((x) => x.type === 28).map((x) => String(x.data))
  // name servers live on the registered domain: try the host, then its parents (never a bare TLD)
  const labels = host.split('.')
  let nameservers = []
  for (let i = 0; i <= labels.length - 2 && !nameservers.length; i += 1) {
    const r = await ask('NS', labels.slice(i).join('.'))
    nameservers = r.answers.filter((x) => x.type === 2).map((x) => String(x.data).replace(/\.$/, '').toLowerCase())
  }
  return { ms: a.ms, ipv4: v4.length, ipv6: v6.length, addresses: [...v4, ...v6], nameservers: nameservers.slice(0, 4) }
}

/** Follows redirects by hand so every hop is timed and re-checked against the public-host rules. */
async function followChain(fetchImpl, startUrl) {
  const hops = []
  let current = startUrl
  let final = null
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const { response, ms } = await timed(fetchImpl, current.href, { redirect: 'manual', headers: { 'user-agent': 'NexoraSpeedProbe/1.0 (+https://nexorasolution.us/tools/website-speed-test/)', accept: 'text/html,*/*;q=0.8' } })
    const location = response.headers.get('location')
    hops.push({ url: current.href, status: response.status, ms })
    if (response.status >= 300 && response.status < 400 && location) {
      let next
      try { next = parseProbeUrl(new URL(location, current).href) } catch { next = null }
      if (!next) return { hops, final: null, blocked: true }
      try { response.body?.cancel() } catch { /* nothing to cancel */ }
      current = next
      continue
    }
    final = { response, url: current, ms }
    break
  }
  return { hops, final, blocked: false, tooMany: !final && hops.length > MAX_REDIRECTS }
}

async function readCapped(response) {
  const reader = response.body?.getReader()
  if (!reader) return { text: '', bytes: 0, truncated: false }
  const chunks = []
  let bytes = 0
  let truncated = false
  const started = Date.now()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    chunks.push(value)
    if (bytes >= MAX_HTML_BYTES) { truncated = true; try { await reader.cancel() } catch { /* ignore */ } break }
  }
  const merged = new Uint8Array(bytes)
  let offset = 0
  for (const c of chunks) { merged.set(c, offset); offset += c.byteLength }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(merged), bytes, truncated, downloadMs: Date.now() - started }
}

const CDN_SIGNS = [
  ['cf-ray', 'Cloudflare'], ['x-vercel-id', 'Vercel'], ['x-amz-cf-id', 'Amazon CloudFront'], ['x-nf-request-id', 'Netlify'],
  ['x-served-by', 'Fastly'], ['x-azure-ref', 'Azure Front Door'], ['x-sucuri-id', 'Sucuri'], ['x-cdn', 'CDN'], ['x-bunny-cache', 'Bunny CDN'],
]

export function analyseHeaders(headers) {
  const get = (name) => headers.get(name) || ''
  const server = get('server')
  let cdn = ''
  for (const [header, label] of CDN_SIGNS) if (get(header)) { cdn = label; break }
  if (!cdn && /cloudflare/i.test(server)) cdn = 'Cloudflare'
  if (!cdn && /akamai/i.test(server)) cdn = 'Akamai'
  const cacheControl = get('cache-control')
  const maxAge = /max-age=(\d+)/i.exec(cacheControl)
  const cookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie().length : (get('set-cookie') ? 1 : 0)
  return {
    server: server.slice(0, 60),
    poweredBy: get('x-powered-by').slice(0, 60),
    cdn,
    http3: /\bh3\b/i.test(get('alt-svc')),
    compression: get('content-encoding').toLowerCase().slice(0, 20),
    cacheControl: cacheControl.slice(0, 120),
    cacheMaxAgeSec: maxAge ? Number(maxAge[1]) : null,
    noStore: /no-store/i.test(cacheControl),
    validators: Boolean(get('etag') || get('last-modified')),
    cacheStatus: (get('cf-cache-status') || get('x-cache') || get('x-vercel-cache') || get('x-cache-status')).slice(0, 40),
    ageSec: get('age') && Number.isFinite(Number(get('age'))) ? Number(get('age')) : null,
    cookies,
    contentType: get('content-type').slice(0, 80),
    security: {
      hsts: Boolean(get('strict-transport-security')),
      csp: Boolean(get('content-security-policy') || get('content-security-policy-report-only')),
      noSniff: /nosniff/i.test(get('x-content-type-options')),
      frameProtection: Boolean(get('x-frame-options') || /frame-ancestors/i.test(get('content-security-policy'))),
      referrerPolicy: Boolean(get('referrer-policy')),
      permissionsPolicy: Boolean(get('permissions-policy')),
    },
  }
}

const ATTR = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null }

/** Counts and third-party hosts from the HTML text. Regex based and approximate by design; it is labelled that way. */
export function analyseHtml(html, pageUrl) {
  const head = /<head[\s>][\s\S]*?<\/head>/i.exec(html)?.[0] || ''
  const tags = (re, source = html) => source.match(re) || []
  const scripts = tags(/<script\b[^>]*>/gi)
  const externalScripts = scripts.filter((t) => ATTR(t, 'src'))
  const headScripts = tags(/<script\b[^>]*>/gi, head).filter((t) => ATTR(t, 'src'))
  const blocking = headScripts.filter((t) => !/\b(async|defer)\b/i.test(t) && !/type\s*=\s*["']?module/i.test(t))
  const styles = tags(/<link\b[^>]*>/gi).filter((t) => /stylesheet/i.test(ATTR(t, 'rel') || ''))
  const images = tags(/<img\b[^>]*>/gi)
  const hosts = new Map()
  const note = (value) => {
    if (!value) return
    let u
    try { u = new URL(value, pageUrl) } catch { return }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    const reg = (h) => h.split('.').slice(-2).join('.')
    if (reg(u.hostname) === reg(pageUrl.hostname)) return
    hosts.set(u.hostname, (hosts.get(u.hostname) || 0) + 1)
  }
  for (const t of [...externalScripts, ...styles, ...images, ...tags(/<iframe\b[^>]*>/gi)]) note(ATTR(t, 'src') || ATTR(t, 'href'))
  return {
    scripts: externalScripts.length,
    inlineScripts: scripts.length - externalScripts.length,
    renderBlockingScripts: blocking.length,
    stylesheets: styles.length,
    images: images.length,
    lazyImages: images.filter((t) => /\bloading\s*=\s*["']?lazy/i.test(t)).length,
    imagesWithoutSize: images.filter((t) => !(ATTR(t, 'width') && ATTR(t, 'height'))).length,
    iframes: tags(/<iframe\b[^>]*>/gi).length,
    preloads: tags(/<link\b[^>]*>/gi).filter((t) => /\b(preload|preconnect|dns-prefetch)\b/i.test(ATTR(t, 'rel') || '')).length,
    viewport: /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html),
    thirdPartyHosts: [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([host, count]) => ({ host, count })),
    thirdPartyHostCount: hosts.size,
  }
}

async function exists(fetchImpl, url) {
  try {
    const { response, ms } = await timed(fetchImpl, url, { redirect: 'follow', headers: { 'user-agent': 'NexoraSpeedProbe/1.0' } })
    try { response.body?.cancel() } catch { /* ignore */ }
    return { ok: response.ok, status: response.status, ms }
  } catch { return { ok: false, status: 0, ms: null } }
}

/** Runs the whole probe. `fetchImpl` is injected so tests do not touch the network. */
export async function runProbe(startUrl, { fetchImpl = fetch, colo = '' } = {}) {
  const dns = await dnsLookup(fetchImpl, startUrl.hostname)
  if (!dns.addresses.length) return { ok: false, error: 'dns', message: 'This address does not resolve. Check the spelling and that the site is online.' }
  if (dns.addresses.some(isPrivateIp)) return { ok: false, error: 'blocked', message: 'Only public websites can be tested.' }

  const [chain, httpCheck, robots, sitemap] = await Promise.all([
    followChain(fetchImpl, startUrl).catch(() => null),
    startUrl.protocol === 'https:' ? followChain(fetchImpl, new URL(`http://${startUrl.hostname}/`)).catch(() => null) : Promise.resolve(null),
    exists(fetchImpl, `${startUrl.origin}/robots.txt`),
    exists(fetchImpl, `${startUrl.origin}/sitemap.xml`),
  ])
  try { httpCheck?.final?.response.body?.cancel() } catch { /* ignore */ }
  if (!chain) return { ok: false, error: 'fetch', message: 'The server did not answer in time.' }
  if (chain.blocked) return { ok: false, error: 'blocked', message: 'The page redirects somewhere that cannot be tested.' }
  if (!chain.final) return { ok: false, error: 'redirects', message: 'The page redirects too many times, which is a problem in itself.', redirects: chain.hops }

  const { response: finalResponse, url: finalUrl } = chain.final
  const headers = analyseHeaders(finalResponse.headers)
  const body = await readCapped(finalResponse)
  const isHtml = /html/i.test(headers.contentType) || /^\s*<(!doctype|html)/i.test(body.text)
  const html = isHtml ? analyseHtml(body.text, finalUrl) : null

  // Server answer time over several fresh requests: one number hides a slow cold start or a flaky origin.
  const samples = [chain.final.ms]
  for (let i = 1; i < SAMPLE_COUNT; i += 1) {
    try {
      const { response, ms } = await timed(fetchImpl, finalUrl.href, { redirect: 'follow', headers: { 'user-agent': 'NexoraSpeedProbe/1.0', 'cache-control': 'no-cache' } })
      try { response.body?.cancel() } catch { /* ignore */ }
      samples.push(ms)
    } catch { /* a failed sample is simply not counted */ }
  }

  const httpsRedirect = httpCheck?.final || httpCheck?.hops?.length
    ? { checked: true, redirectsToHttps: Boolean(httpCheck.hops?.length > 1 && /^https:/i.test(httpCheck.hops[httpCheck.hops.length - 1].url)), hops: httpCheck.hops.length }
    : { checked: false, redirectsToHttps: null, hops: 0 }

  return {
    ok: true,
    url: finalUrl.href,
    testedAt: new Date().toISOString(),
    from: colo || '',
    dns,
    redirects: chain.hops.map((h) => ({ url: h.url, status: h.status, ms: h.ms })),
    https: { secure: finalUrl.protocol === 'https:', httpRedirectsToHttps: httpsRedirect.redirectsToHttps },
    response: { status: finalResponse.status, samples: samples.map(round), minMs: round(Math.min(...samples)), medianMs: round(median(samples)), maxMs: round(Math.max(...samples)) },
    transfer: { htmlBytes: body.bytes, truncated: body.truncated, downloadMs: body.downloadMs ?? null },
    headers,
    html,
    files: { robots, sitemap },
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

const ALLOWED_ORIGIN = /^https:\/\/(nexorasolution\.us|[a-z0-9-]+\.nexora[a-z0-9-]*\.workers\.dev|[a-z0-9-]+\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

/** Handles GET /api/site-probe. Returns null for any other path so normal routing continues. */
export async function handleSiteProbe(request, { fetchImpl = fetch } = {}) {
  const requestUrl = new URL(request.url)
  if (requestUrl.pathname !== PROBE_PATH) return null
  if (request.method !== 'GET') return json({ ok: false, error: 'method', message: 'Use GET.' }, 405)
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if ((origin && !ALLOWED_ORIGIN.test(origin)) || site === 'cross-site') return json({ ok: false, error: 'origin', message: 'Not allowed from this site.' }, 403)
  const target = parseProbeUrl(requestUrl.searchParams.get('url'))
  if (!target) return json({ ok: false, error: 'url', message: 'Enter a public page address such as https://example.com/page.' }, 400)
  if (rateLimited(request.headers.get('cf-connecting-ip') || 'anon')) return json({ ok: false, error: 'rate', message: 'Too many tests in a minute. Wait a moment and try again.' }, 429)
  try {
    const result = await runProbe(target, { fetchImpl, colo: request.cf?.colo || '' })
    return json(result, result.ok ? 200 : 422)
  } catch {
    return json({ ok: false, error: 'fetch', message: 'The server check could not finish. Try again.' }, 502)
  }
}
