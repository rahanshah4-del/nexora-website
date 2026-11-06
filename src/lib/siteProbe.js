/**
 * Client side of the speed test's "server and delivery" check (worker/siteProbe.js). It asks the site's own Worker
 * for facts Google PageSpeed does not report, and turns them into plain-language rows with a good / warning / problem tone.
 */

export async function fetchSiteProbe(url, { signal } = {}) {
  const res = await fetch(`/api/site-probe?url=${encodeURIComponent(url)}`, { signal, headers: { accept: 'application/json' } })
  let body = null
  try { body = await res.json() } catch { /* handled below */ }
  if (!body || body.ok !== true) throw new Error(body?.message || 'The server check could not run.')
  return body
}

export const kb = (bytes) => (bytes >= 1024 * 1024 ? `${Math.round(bytes / 1024 / 104.8576) / 10} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
export const ms = (n) => (n === null || n === undefined ? '-' : n >= 1000 ? `${Math.round(n / 100) / 10} s` : `${Math.round(n)} ms`)

const row = (label, value, tone, note) => ({ label, value, tone, note })

/** Server answer time as measured from the edge (no phone or mobile network in it), so the bands are tighter than Google's. */
export function responseTone(medianMs) {
  return medianMs <= 400 ? 'good' : medianMs <= 800 ? 'warn' : 'bad'
}

/** Groups of rows for the panel. Every row says what was measured and what to do when it is not good. */
export function buildProbeGroups(p) {
  const r = p.response
  const h = p.headers
  const spread = r.maxMs - r.minMs
  const groups = []

  groups.push({
    id: 'server', title: 'Server answer time', lead: `${r.samples.length} separate requests, measured from ${p.from ? `a Cloudflare server (${p.from})` : 'a Cloudflare server'}.`,
    rows: [
      row('Median answer time', ms(r.medianMs), responseTone(r.medianMs), r.medianMs <= 400 ? 'The server replies quickly.' : 'Slow replies delay everything that comes after. Caching, a faster host or a CDN usually fixes this.'),
      row('Fastest to slowest', `${ms(r.minMs)} to ${ms(r.maxMs)}`, spread > 600 ? 'warn' : 'good', spread > 600 ? 'The answer time jumps around. That points to a cold start or an overloaded server.' : 'Steady from request to request.'),
      row('Page download', p.transfer.downloadMs === null ? '-' : ms(p.transfer.downloadMs), 'info', `${kb(p.transfer.htmlBytes)} of HTML${p.transfer.truncated ? ' (read up to the limit)' : ''}.`),
    ],
  })

  const hops = p.redirects
  const redirectCount = hops.length - 1
  groups.push({
    id: 'network', title: 'DNS, redirects and HTTPS', lead: 'What happens before the page starts to load.',
    rows: [
      row('DNS lookup', p.dns.ms === null ? '-' : ms(p.dns.ms), p.dns.ms !== null && p.dns.ms > 300 ? 'warn' : 'good', p.dns.nameservers.length ? `Name servers: ${p.dns.nameservers.join(', ')}.` : 'Time to find the server address through a public resolver.'),
      row('IPv6', p.dns.ipv6 > 0 ? 'Supported' : 'Not set up', p.dns.ipv6 > 0 ? 'good' : 'info', p.dns.ipv6 > 0 ? 'Visitors on IPv6 networks connect directly.' : 'Optional, but a growing share of mobile networks use IPv6.'),
      row('Redirects before the page', redirectCount === 0 ? 'None' : `${redirectCount} redirect${redirectCount > 1 ? 's' : ''}`, redirectCount === 0 ? 'good' : redirectCount === 1 ? 'info' : 'bad', redirectCount >= 2 ? `Each redirect adds a full round trip. Link straight to the final address instead: ${hops[hops.length - 1].url}` : redirectCount === 1 ? `Goes to ${hops[hops.length - 1].url}.` : 'The address you entered is the final address.'),
      row('Secure connection', p.https.secure ? 'HTTPS' : 'Not HTTPS', p.https.secure ? 'good' : 'bad', p.https.secure ? 'The page loads over HTTPS.' : 'Browsers warn visitors about pages without HTTPS and search engines prefer secure pages.'),
      row('http:// goes to https://', p.https.httpRedirectsToHttps === null ? 'Not checked' : p.https.httpRedirectsToHttps ? 'Yes' : 'No', p.https.httpRedirectsToHttps === false ? 'bad' : p.https.httpRedirectsToHttps ? 'good' : 'info', p.https.httpRedirectsToHttps === false ? 'The insecure address does not send visitors to the secure one, so the site can be reached in two versions.' : ''),
    ],
  })

  const maxAge = h.cacheMaxAgeSec
  groups.push({
    id: 'delivery', title: 'Delivery and caching', lead: 'How the page is served and whether a repeat visit can reuse it.',
    rows: [
      row('Content delivery network', h.cdn || 'Not detected', h.cdn ? 'good' : 'info', h.cdn ? 'Pages are served from a server close to the visitor.' : 'No CDN headers seen. A CDN shortens the distance to far-away visitors.'),
      row('Newest web protocol (HTTP/3)', h.http3 ? 'Advertised' : 'Not advertised', h.http3 ? 'good' : 'info', 'HTTP/3 recovers faster on weak mobile connections.'),
      row('Text compression', h.compression ? h.compression : 'Not confirmed', h.compression ? 'good' : 'info', h.compression ? 'The HTML is sent compressed.' : 'The server did not report compression. Gzip or Brotli usually cuts HTML size by 70% or more.'),
      row('Browser caching', h.noStore ? 'Disabled (no-store)' : maxAge !== null ? `${maxAge >= 3600 ? `${Math.round(maxAge / 360) / 10} h` : `${maxAge} s`}` : h.cacheControl ? 'Set' : 'No policy', h.noStore ? 'warn' : maxAge !== null && maxAge >= 300 ? 'good' : 'info', h.cacheControl ? `Cache-Control: ${h.cacheControl}` : 'No Cache-Control header, so browsers have to guess.'),
      row('Server cache result', h.cacheStatus || 'Not reported', 'info', h.ageSec !== null ? `The copy served was ${h.ageSec} seconds old.` : ''),
      row('Cookies set on first visit', String(h.cookies), h.cookies > 3 ? 'warn' : 'good', h.cookies > 3 ? 'Many cookies on the first response add headers to every later request.' : ''),
      ...(h.server || h.poweredBy ? [row('Server software', [h.server, h.poweredBy].filter(Boolean).join(' / '), 'info', h.poweredBy ? 'The X-Powered-By header tells attackers what you run. It is safe to remove.' : '')] : []),
    ],
  })

  if (p.html) {
    const x = p.html
    groups.push({
      id: 'html', title: 'What the page asks the browser to load', lead: 'Counted from the page HTML. Scripts added later by JavaScript are not in these numbers.',
      rows: [
        row('Scripts', `${x.scripts} files + ${x.inlineScripts} inline`, x.scripts > 25 ? 'warn' : 'info', ''),
        row('Render-blocking scripts in the head', String(x.renderBlockingScripts), x.renderBlockingScripts > 0 ? 'warn' : 'good', x.renderBlockingScripts > 0 ? 'These stop the page from showing until they download. Add defer or async.' : 'Nothing in the head holds back the first paint.'),
        row('Style sheets', String(x.stylesheets), x.stylesheets > 6 ? 'warn' : 'info', ''),
        row('Images', `${x.images}${x.images ? ` (${x.lazyImages} lazy-loaded)` : ''}`, 'info', ''),
        row('Images without width and height', String(x.imagesWithoutSize), x.imagesWithoutSize > 0 ? 'warn' : 'good', x.imagesWithoutSize > 0 ? 'Without a size the page jumps when the image arrives.' : ''),
        row('Other websites the page calls', String(x.thirdPartyHostCount), x.thirdPartyHostCount > 8 ? 'warn' : 'info', x.thirdPartyHosts.length ? x.thirdPartyHosts.slice(0, 6).map((t) => t.host).join(', ') : 'Everything comes from the page\'s own domain.'),
        row('Mobile viewport tag', x.viewport ? 'Present' : 'Missing', x.viewport ? 'good' : 'bad', x.viewport ? '' : 'Without it phones show a tiny zoomed-out page.'),
      ],
    })
  }

  const s = h.security
  const secure = [['HSTS', s.hsts], ['Content-Security-Policy', s.csp], ['X-Content-Type-Options', s.noSniff], ['Clickjacking protection', s.frameProtection], ['Referrer-Policy', s.referrerPolicy], ['Permissions-Policy', s.permissionsPolicy]]
  const have = secure.filter(([, ok]) => ok).length
  groups.push({
    id: 'security', title: 'Security headers', lead: 'Free protection a server can switch on with a few lines of configuration.',
    rows: [
      row('Headers present', `${have} of ${secure.length}`, have >= 5 ? 'good' : have >= 3 ? 'warn' : 'bad', ''),
      ...secure.map(([name, ok]) => row(name, ok ? 'Present' : 'Missing', ok ? 'good' : 'info', '')),
    ],
  })

  const f = p.files
  groups.push({
    id: 'crawl', title: 'Files search engines look for', lead: 'Checked on the same domain.',
    rows: [
      row('robots.txt', f.robots.ok ? 'Found' : f.robots.status ? `Missing (${f.robots.status})` : 'Not reachable', f.robots.ok ? 'good' : 'warn', f.robots.ok ? '' : 'Crawlers expect this file at /robots.txt.'),
      row('sitemap.xml', f.sitemap.ok ? 'Found' : f.sitemap.status ? `Not at /sitemap.xml (${f.sitemap.status})` : 'Not reachable', f.sitemap.ok ? 'good' : 'info', f.sitemap.ok ? '' : 'Your sitemap may live at another address. List it in robots.txt.'),
    ],
  })
  return groups
}
