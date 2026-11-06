// The speed test's server-side probe (worker/siteProbe.js): the public-host rules that keep it from being an open
// proxy, the header and HTML analysis, and a full run against a faked network.

import assert from 'node:assert/strict'
import test from 'node:test'

import { RATE_LIMIT, analyseHeaders, analyseHtml, handleSiteProbe, isPrivateIp, parseProbeUrl, rateLimited, runProbe } from '../worker/siteProbe.js'

test('only public http(s) page addresses are accepted', () => {
  assert.equal(parseProbeUrl('https://example.com/page').hostname, 'example.com')
  for (const bad of ['', 'ftp://example.com', 'https://localhost/', 'http://127.0.0.1/', 'https://10.0.0.5/', 'https://user:pw@example.com/', 'https://example.com:8080/', 'https://intranet/', 'https://router.local/', 'javascript:alert(1)', 'https://[::1]/']) {
    assert.equal(parseProbeUrl(bad), null, bad)
  }
})

test('private and loopback addresses are recognised', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '169.254.1.1', '100.64.0.1', '::1', 'fd00::1', 'fe80::1']) assert.equal(isPrivateIp(ip), true, ip)
  for (const ip of ['8.8.8.8', '104.21.5.9', '2606:4700::1111']) assert.equal(isPrivateIp(ip), false, ip)
})

test('rate limit lets a visitor run a handful of tests a minute, then stops them', () => {
  const t0 = 1_000_000
  for (let i = 0; i < RATE_LIMIT.max; i += 1) assert.equal(rateLimited('visitor-a', t0 + i), false)
  assert.equal(rateLimited('visitor-a', t0 + 10), true)
  assert.equal(rateLimited('visitor-b', t0 + 10), false)
  assert.equal(rateLimited('visitor-a', t0 + RATE_LIMIT.windowMs + 100), false)
})

test('header analysis reads CDN, caching, HTTP/3 and security headers', () => {
  const h = new Headers({
    server: 'cloudflare', 'cf-ray': 'abc-KHI', 'cf-cache-status': 'HIT', age: '42', 'cache-control': 'public, max-age=600',
    'alt-svc': 'h3=":443"; ma=86400', 'content-encoding': 'br', 'content-type': 'text/html; charset=utf-8', etag: '"x"',
    'strict-transport-security': 'max-age=31536000', 'x-content-type-options': 'nosniff', 'content-security-policy': "frame-ancestors 'self'",
  })
  const a = analyseHeaders(h)
  assert.equal(a.cdn, 'Cloudflare')
  assert.equal(a.http3, true)
  assert.equal(a.compression, 'br')
  assert.equal(a.cacheMaxAgeSec, 600)
  assert.equal(a.cacheStatus, 'HIT')
  assert.equal(a.ageSec, 42)
  assert.equal(a.validators, true)
  assert.deepEqual(a.security, { hsts: true, csp: true, noSniff: true, frameProtection: true, referrerPolicy: false, permissionsPolicy: false })
})

test('HTML analysis counts assets, render-blocking scripts and third-party hosts', () => {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width">
    <link rel="stylesheet" href="/a.css"><link rel="preconnect" href="https://fonts.gstatic.com">
    <script src="/app.js"></script><script src="https://cdn.example.net/x.js" async></script><script>var a=1</script></head>
    <body><img src="/1.png" width="10" height="10" loading="lazy"><img src="https://img.other.com/2.png"><iframe src="https://www.youtube.com/embed/x"></iframe></body></html>`
  const r = analyseHtml(html, new URL('https://www.site.com/'))
  assert.equal(r.scripts, 2)
  assert.equal(r.inlineScripts, 1)
  assert.equal(r.renderBlockingScripts, 1)
  assert.equal(r.stylesheets, 1)
  assert.equal(r.images, 2)
  assert.equal(r.lazyImages, 1)
  assert.equal(r.imagesWithoutSize, 1)
  assert.equal(r.preloads, 1)
  assert.equal(r.viewport, true)
  assert.deepEqual(r.thirdPartyHosts.map((x) => x.host).sort(), ['cdn.example.net', 'img.other.com', 'www.youtube.com'])
})

function fakeNetwork({ ip = '104.21.5.9' } = {}) {
  return async (input) => {
    const u = String(input)
    if (u.startsWith('https://cloudflare-dns.com/')) {
      const type = new URL(u).searchParams.get('type')
      const Answer = type === 'A' ? [{ type: 1, data: ip }] : type === 'NS' ? [{ type: 2, data: 'ns1.example.net.' }] : []
      return new Response(JSON.stringify({ Answer }), { status: 200 })
    }
    if (u === 'http://example.com/') return new Response(null, { status: 301, headers: { location: 'https://example.com/' } })
    if (u.endsWith('/robots.txt')) return new Response('User-agent: *', { status: 200 })
    if (u.endsWith('/sitemap.xml')) return new Response('nope', { status: 404 })
    return new Response('<!doctype html><html><head><title>t</title></head><body>hi</body></html>', { status: 200, headers: { 'content-type': 'text/html', server: 'nginx' } })
  }
}

test('a full probe reports DNS, response timing, redirects and file checks', async () => {
  const r = await runProbe(new URL('https://example.com/'), { fetchImpl: fakeNetwork(), colo: 'KHI' })
  assert.equal(r.ok, true)
  assert.equal(r.from, 'KHI')
  assert.equal(r.dns.ipv4, 1)
  assert.equal(r.dns.ipv6, 0)
  assert.deepEqual(r.dns.nameservers, ['ns1.example.net'])
  assert.equal(r.response.samples.length, 3)
  assert.equal(r.https.httpRedirectsToHttps, true)
  assert.equal(r.files.robots.ok, true)
  assert.equal(r.files.sitemap.ok, false)
  assert.equal(r.headers.server, 'nginx')
  assert.equal(r.html.scripts, 0)
})

test('a host that resolves to a private address is refused', async () => {
  const r = await runProbe(new URL('https://example.com/'), { fetchImpl: fakeNetwork({ ip: '10.0.0.8' }) })
  assert.equal(r.ok, false)
  assert.equal(r.error, 'blocked')
})

test('the endpoint ignores other paths, rejects bad input and cross-site calls', async () => {
  assert.equal(await handleSiteProbe(new Request('https://nexorasolution.us/about/')), null)
  const bad = await handleSiteProbe(new Request('https://nexorasolution.us/api/site-probe?url=http://127.0.0.1/'))
  assert.equal(bad.status, 400)
  const cross = await handleSiteProbe(new Request('https://nexorasolution.us/api/site-probe?url=https://example.com/', { headers: { origin: 'https://evil.example' } }))
  assert.equal(cross.status, 403)
  const post = await handleSiteProbe(new Request('https://nexorasolution.us/api/site-probe', { method: 'POST' }))
  assert.equal(post.status, 405)
  const ok = await handleSiteProbe(new Request('https://nexorasolution.us/api/site-probe?url=https://example.com/', { headers: { 'cf-connecting-ip': '9.9.9.9' } }), { fetchImpl: fakeNetwork() })
  assert.equal(ok.status, 200)
  assert.equal((await ok.json()).ok, true)
})

import { buildProbeGroups, kb, responseTone } from '../src/lib/siteProbe.js'

test('the panel groups turn a probe result into toned plain-language rows', async () => {
  const probe = await runProbe(new URL('https://example.com/'), { fetchImpl: fakeNetwork(), colo: 'KHI' })
  const groups = buildProbeGroups(probe)
  assert.deepEqual(groups.map((g) => g.id), ['server', 'network', 'delivery', 'html', 'security', 'crawl'])
  for (const g of groups) for (const r of g.rows) assert.ok(['good', 'warn', 'bad', 'info'].includes(r.tone), `${g.id}/${r.label}`)
  assert.equal(groups.find((g) => g.id === 'crawl').rows[1].tone, 'info')
  assert.equal(responseTone(300), 'good')
  assert.equal(responseTone(700), 'warn')
  assert.equal(responseTone(1500), 'bad')
  assert.equal(kb(2048), '2 KB')
})
