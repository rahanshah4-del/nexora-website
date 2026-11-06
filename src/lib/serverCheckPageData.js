/**
 * Copy, SEO and JSON-LD for /tools/server-response-time-test/ (free server response time and delivery check).
 * Pure data, so prerender.mjs (Node) and the page (Vite) read the same source.
 * Written answer-first: every section opens with a direct answer of 30-60 words.
 * Block shapes match pages/public/tools/ToolPageParts.jsx (p, h3, steps, list, table, callout).
 * Thresholds are the ones Google publishes on web.dev for Time to First Byte (good 0.8 s or less, poor over 1.8 s);
 * the tighter bands this tool uses are labelled as its own. Nothing here is a made-up statistic.
 */
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema } from './seoStructuredData.js'

export const SERVER_CHECK_PATH = '/tools/server-response-time-test'
export const SERVER_CHECK_LAST_UPDATED = '2026-11-07'

export const SERVER_CHECK_SEO = Object.freeze({
  title: 'Free Server Response Time Test (TTFB Checker) | Nexora',
  description:
    'Free server response time test. Check TTFB over 3 requests, DNS, redirects, caching, CDN, HTTP/3, security headers and page weight for any URL.',
  keywords:
    'server response time test, ttfb test, ttfb checker, website response time checker, check server response time, time to first byte test, website server test, http header checker, security headers check, dns lookup time, redirect checker, website performance test',
})

export const SERVER_CHECK_FAQS = Object.freeze([
  {
    question: 'Is this server response time test free?',
    answer:
      'Yes. You paste a public URL and get the full result with no account, no email address and no watermark. The only limit is a fair-use cap of a few tests per minute for each visitor, which keeps the check available for everyone.',
  },
  {
    question: 'What is a good server response time?',
    answer:
      'Google\'s web.dev guidance rates Time to First Byte as good at 0.8 seconds or less and poor above 1.8 seconds. This check measures from a data centre without a mobile network in the way, so it uses tighter bands: 400 ms or less is good, 400 to 800 ms needs a look, and above that is slow.',
  },
  {
    question: 'Is server response time the same as TTFB?',
    answer:
      'They are close but not identical. TTFB, as Google defines it, also includes redirects, DNS lookup and connection set-up before the first byte arrives. The server answer time in this check starts when the request is sent, so it isolates the part your hosting and code control. DNS and redirects are reported on their own lines.',
  },
  {
    question: 'Why does the check send three requests instead of one?',
    answer:
      'One request can be unlucky: a cold cache, a busy moment or a server waking from sleep. Three requests show the median and the spread. If the fastest is 200 ms and the slowest is 1,500 ms, the problem is consistency, not average speed.',
  },
  {
    question: 'Why is my result different from Google PageSpeed Insights?',
    answer:
      'They measure different things. PageSpeed loads the page in a lab browser and scores how it paints. This check talks to the server directly and reports answer time, DNS, redirects, headers and what the HTML asks the browser to load. Run both: one tells you how the page feels, the other tells you why.',
  },
  {
    question: 'Does a slow server hurt SEO?',
    answer:
      'Indirectly, yes. TTFB is not a Core Web Vital, but every millisecond the server takes is added to First Contentful Paint and Largest Contentful Paint, which are part of Google\'s page experience signals. A slow server also makes crawling slower, so Googlebot may fetch fewer pages per visit.',
  },
  {
    question: 'Which security headers should every site send?',
    answer:
      'At minimum: Strict-Transport-Security, X-Content-Type-Options set to nosniff, a framing rule (X-Frame-Options or a frame-ancestors directive), and a Referrer-Policy. Content-Security-Policy and Permissions-Policy are valuable too, but they need testing before they are enforced so they do not break the site.',
  },
  {
    question: 'Can I test a page that needs a login or a local address?',
    answer:
      'No. The check only fetches public websites, and it refuses localhost, private network addresses and pages with a login in the address. A page behind a login returns the login screen, not the page you meant to measure.',
  },
])

export const SERVER_CHECK_PAGE = Object.freeze({
  path: SERVER_CHECK_PATH,
  appName: 'Nexora Server Response Time Test',
  breadcrumbName: 'Server Response Time Test',
  eyebrow: 'Free tool · Server, DNS and headers · No signup',
  h1: 'Free Server Response Time Test',
  lead:
    'Check how fast your server really answers. Paste any public URL and get the server response time over three requests, DNS lookup time, the redirect chain, caching and CDN signals, HTTP/3 support, security headers and a count of what the page asks the browser to load. It is the part of speed that Google PageSpeed does not report.',
  badges: ['Free, no signup', '3 requests, median time', 'DNS and redirects', 'Security headers'],
  toolLabel: 'Page URL to check',
  jump: [
    ['What it is', 'what-is'],
    ['How to run it', 'how-to-run'],
    ['Response time', 'response-time'],
    ['DNS and redirects', 'dns-redirects'],
    ['Caching and CDN', 'caching-cdn'],
    ['Page contents', 'page-contents'],
    ['Security headers', 'security-headers'],
    ['Crawl files', 'crawl-files'],
    ['vs PageSpeed', 'vs-pagespeed'],
    ['Fix order', 'fix-order'],
    ['Limits', 'limits'],
    ['FAQ', 'faq'],
  ],
  sections: [
    {
      id: 'what-is',
      heading: 'What Is a Server Response Time Test?',
      blocks: [
        { p: 'A server response time test measures how long a web server takes to start answering a request. It shows whether a slow page is slow because of the server and the network in front of it, or because of what the page itself loads, which are two separate problems with two separate fixes.' },
        { p: 'Every visit begins before a single image or script loads. The browser looks up the domain name, follows any redirects, opens a secure connection and asks for the page. Only when the first byte of the reply comes back can it start to paint anything. If that wait is long, everything that follows is late, however well the page is built.' },
        { p: 'This tool measures that opening stretch from a Cloudflare server and reports it in plain language. It also reads the response headers that control caching, compression and security, and it counts the files the HTML asks the browser to fetch. None of this needs access to your site, a plugin or a login. The check only requests public pages, the same way a visitor or a search engine would.' },
        { p: 'Use it next to a page speed test, not instead of one. A [website speed test](/tools/website-speed-test) tells you how the page paints on a phone. This check tells you what the server and the delivery path are doing underneath that result.' },
      ],
    },
    {
      id: 'how-to-run',
      heading: 'How to Run the Server Check',
      tone: 'alt',
      blocks: [
        { p: 'Paste the full address of one public page, press the check button and wait about 5 to 15 seconds. The tool sends three requests to the page and reads the headers, so there is nothing to install and nothing is added to your site.' },
        {
          steps: [
            { title: 'Enter one page', text: 'Type or paste a URL such as https://example.com/pricing. Check the homepage first, then a busy inner page. A server can answer a cached page in a few milliseconds and a database-driven page in a full second.' },
            { title: 'Run the check', text: 'The tool looks up the domain, follows the redirects, requests the page three times and then tests robots.txt and sitemap.xml on the same domain. The page body is read to count assets but is never stored or shown.' },
            { title: 'Read the answer time first', text: 'The median server answer time and the spread between the fastest and slowest request come first, because every other timing builds on them.' },
            { title: 'Work through the Check and Fix rows', text: 'Each row carries a Good, Check or Fix tag and a one-line reason. Start with the Fix rows, then the Check rows. Rows with no tag are information only.' },
            { title: 'Change one thing and check again', text: 'Switch on caching, remove a redirect or add a header, then run the check again. If you change five things at once you cannot tell which one helped.' },
          ],
        },
        { callout: 'Test the exact address people reach. https://example.com and https://www.example.com can behave differently when one redirects to the other, and the redirect chain is one of the first things this check reports.' },
      ],
    },
    {
      id: 'response-time',
      heading: 'Server Answer Time and TTFB: What Is Good?',
      blocks: [
        { p: 'Google rates Time to First Byte as good at 0.8 seconds or less and poor above 1.8 seconds. Because this check runs from a data centre with no phone network in the way, it applies tighter bands: 400 ms or less is good, up to 800 ms needs attention, and above 800 ms is slow.' },
        {
          table: {
            caption: 'Time to First Byte thresholds and the stricter bands used by this check',
            columns: ['Rating', 'Google web.dev (real visitors)', 'This check (from a data centre)'],
            rows: [
              ['Good', '0.8 s or less', '400 ms or less'],
              ['Needs improvement', '0.8 s to 1.8 s', '400 ms to 800 ms'],
              ['Poor or slow', 'Over 1.8 s', 'Over 800 ms'],
            ],
          },
        },
        { p: 'TTFB itself is not a Core Web Vital, but it sits underneath two of them. Every millisecond the server takes is added to First Contentful Paint and Largest Contentful Paint, so a slow server puts a floor under the loading score that no image optimisation can remove.' },
        { h3: 'Why the check uses three requests' },
        { p: 'A single timing hides problems. The median of three requests gives a fair typical value, and the gap between the fastest and slowest shows consistency. A page that answers in 250 ms once and 1,400 ms next time usually has a cold cache, an overloaded server or a database query that runs only some of the time.' },
        { h3: 'What counts as the server answer time' },
        { p: 'Each request is timed from the moment it is sent until the response headers arrive. That includes the connection set-up for a new connection and the time the server spends building the page. DNS and redirects are reported separately, so you can see which stage owns the delay.' },
      ],
    },
    {
      id: 'dns-redirects',
      heading: 'DNS Lookup, Redirects and HTTPS',
      tone: 'alt',
      blocks: [
        { p: 'Before a server can answer, the browser must find its address through DNS, follow any redirects and set up a secure connection. Each step adds time. A fast server behind a slow DNS provider or a chain of redirects still feels slow, and PageSpeed reports none of it separately.' },
        { h3: 'DNS lookup time' },
        { p: 'The check asks a public resolver for the address of your domain and times the answer. It also lists your name servers and whether the domain has IPv6 addresses. A slow or distant DNS provider adds delay to every first visit, and a very low DNS TTL forces browsers to look the name up again more often than needed.' },
        { h3: 'Redirects' },
        { p: 'A redirect is a full extra round trip. The check follows up to five redirects by hand and lists every hop with its status code and time. The usual culprits are http to https, non-www to www, a missing trailing slash and links that still point at an old address. Link straight to the final URL and the extra hops disappear.' },
        { h3: 'HTTPS and the http to https step' },
        { p: 'The check confirms the final page loads over HTTPS and whether the plain http:// address sends visitors to the secure one. If it does not, your site can be reached in two versions, which splits links, confuses crawlers and leaves some visitors on an unencrypted page.' },
      ],
    },
    {
      id: 'caching-cdn',
      heading: 'Caching, CDN, Compression and HTTP/3',
      blocks: [
        { p: 'Caching and delivery decide whether a repeat visit, or a visitor on the other side of the world, gets the page quickly. The check reads the response headers to show whether a CDN is in front of the site, how the browser is told to cache the page, and whether the newest web protocol is on offer.' },
        {
          table: {
            caption: 'Delivery signals read from the response headers',
            columns: ['Signal', 'What it shows', 'Good looks like'],
            rows: [
              ['CDN', 'Whether a content delivery network serves the page from a nearby location', 'A CDN detected, with cache status HIT on repeat requests'],
              ['Cache-Control', 'How long browsers and shared caches may reuse the page', 'A deliberate policy, with validators such as ETag for HTML'],
              ['Compression', 'Whether text is sent as gzip or Brotli', 'Compression on for HTML, CSS and JavaScript'],
              ['HTTP/3', 'Whether the server advertises the QUIC-based protocol through Alt-Svc', 'Advertised, with HTTP/2 as the fallback'],
              ['Cookies', 'How many cookies are set on the first response', 'Few or none on public pages'],
            ],
          },
        },
        { h3: 'Content delivery network' },
        { p: 'A CDN keeps copies of your pages and files on servers in many countries, so the first byte travels a short distance. The check looks for the headers common CDNs add. If none appear, that is not an error, but a site with visitors in several countries usually gains from one.' },
        { h3: 'Browser caching' },
        { p: 'Cache-Control tells browsers how long they may reuse a file. Static files with a hashed name can be cached for a year. HTML is usually cached briefly or revalidated with an ETag or Last-Modified header, so a repeat visit costs a quick check instead of a full download. A no-store policy turns that off.' },
        { h3: 'Compression' },
        { p: 'Gzip and Brotli shrink text files before they cross the network, and Brotli is usually smaller than gzip for the same file. Not every server reports the encoding header to this check, so a missing value reads as Not confirmed, not as a failure.' },
        { h3: 'HTTP/3' },
        { p: 'HTTP/3 runs over QUIC on UDP and recovers faster from lost packets than older versions, which helps most on weak mobile connections. Servers advertise it with the Alt-Svc header, and browsers fall back to HTTP/2 when it is unavailable. The check reports whether it is advertised.' },
      ],
    },
    {
      id: 'page-contents',
      heading: 'What the Page Asks the Browser to Load',
      tone: 'alt',
      blocks: [
        { p: 'The check reads the page HTML and counts what it references: scripts, style sheets, images, iframes and the other websites it calls. These counts show how much work the browser is asked to do, and they point to the render-blocking files and third-party hosts that slow a page after the server has answered.' },
        {
          list: [
            'Scripts in the head without defer or async block the first paint until they download and run.',
            'Images without a width and height let the page jump when they arrive, which raises layout shift.',
            'Many style sheets mean many requests before the page can be drawn.',
            'Third-party hosts, such as tag managers, chat widgets and ad pixels, each add a DNS lookup, a connection and code you do not control.',
            'A missing viewport tag makes phones show a tiny zoomed-out page.',
          ],
        },
        { p: 'These numbers come from the HTML as the server sends it. Scripts that add more scripts later, and anything loaded after the page runs, are not counted. Treat them as a floor, and use a full lab test for the complete picture.' },
      ],
    },
    {
      id: 'security-headers',
      heading: 'Security Headers: Free Protection in the Response',
      blocks: [
        { p: 'Security headers are instructions the server sends with every page that tell the browser how to behave safely. They cost nothing to send and block whole classes of attack. The check reports six of them and marks a page with fewer than three as needing a fix.' },
        {
          table: {
            caption: 'Security headers reported by this check',
            columns: ['Header', 'What it does', 'Common value'],
            rows: [
              ['Strict-Transport-Security', 'Makes browsers use HTTPS for the domain, even if someone types http://', 'max-age of a year or more'],
              ['Content-Security-Policy', 'Limits where scripts, styles, images and frames may load from', 'default-src \'self\' plus the sources you need'],
              ['X-Content-Type-Options', 'Stops browsers from guessing file types and running text as script', 'nosniff'],
              ['Clickjacking protection', 'Controls whether other sites can embed your page in a frame', 'X-Frame-Options or frame-ancestors'],
              ['Referrer-Policy', 'Controls how much of the page address is sent to other sites', 'strict-origin-when-cross-origin'],
              ['Permissions-Policy', 'Switches off browser features the site does not use', 'camera=(), microphone=()'],
            ],
          },
        },
        { p: 'Add them in small steps. Start with the safe ones: nosniff, a framing rule and a referrer policy. Roll out Strict-Transport-Security only when every part of the site works over HTTPS, because browsers remember it and it is hard to undo. Send Content-Security-Policy as Report-Only first, so you see what it would block before it breaks anything.' },
        { callout: 'A header being present is not the same as being well configured. This check tells you which headers exist. A policy that allows everything still shows as present.' },
      ],
    },
    {
      id: 'crawl-files',
      heading: 'robots.txt and sitemap.xml',
      tone: 'alt',
      blocks: [
        { p: 'Search engines look for two files on every domain: robots.txt, which says what crawlers may fetch, and a sitemap, which lists the pages you want found. The check requests both from the same domain and tells you whether each answers, so a missing file does not go unnoticed for months.' },
        { p: 'A missing robots.txt is not fatal, because crawlers then assume everything is allowed, but it is the standard place to point to your sitemap. A sitemap that is not at /sitemap.xml is also fine when robots.txt lists its real address. The row shows Not at /sitemap.xml in that case, as information, not as an error.' },
        { p: 'Both files should return a normal 200 response. A robots.txt that redirects to the homepage, or a sitemap that returns an error page with a 200 status, can confuse crawlers more than no file at all.' },
      ],
    },
    {
      id: 'vs-pagespeed',
      heading: 'How This Differs From Google PageSpeed Insights',
      blocks: [
        { p: 'PageSpeed Insights loads your page in a lab browser and scores how it paints and responds. This check talks to the server and reports what lives underneath: answer time over several requests, DNS, redirects, caching, protocol and security headers. They answer different questions, so a complete audit runs both.' },
        {
          table: {
            caption: 'What each tool measures',
            columns: ['', 'Google PageSpeed Insights', 'This server check'],
            rows: [
              ['Main question', 'How does the page paint and respond?', 'How does the server and delivery path behave?'],
              ['Server answer time', 'One lab value', 'Median, fastest and slowest of three requests'],
              ['DNS and name servers', 'Not reported', 'Lookup time, name servers and IPv6'],
              ['Redirect chain', 'Flagged only as a saving', 'Every hop with status and time'],
              ['Caching, CDN and HTTP/3', 'Partly, as audits', 'Read directly from the headers'],
              ['Security headers', 'Partly, under Best Practices', 'Six headers listed one by one'],
              ['Scores and Core Web Vitals', 'Yes', 'No'],
            ],
          },
        },
        { p: 'A common pattern: PageSpeed shows a high Largest Contentful Paint, and this check shows a one-second server answer time. The fix is on the server, not in the images. The reverse also happens: a fast server and a heavy page. Reading both results together stops you from fixing the wrong thing.' },
      ],
    },
    {
      id: 'fix-order',
      heading: 'How to Fix a Slow Server, in Order',
      tone: 'alt',
      blocks: [
        { p: 'Fix the cheapest and biggest problem first. A practical order is redirects, then caching, then the hosting plan and the code that builds the page. Each step is safe to try alone, and the check tells you right away whether it helped.' },
        {
          steps: [
            { title: 'Remove redirect hops', text: 'Update internal links, your sitemap and your ads to point at the final URL. Keep one permanent 301 for each old address and remove chains.' },
            { title: 'Cache the page', text: 'Turn on full-page caching for pages that are the same for every visitor. For a CMS, use a page-cache plugin or the host\'s built-in cache. This usually cuts server answer time more than any other single change.' },
            { title: 'Put a CDN in front', text: 'A CDN shortens the distance to far-away visitors and can serve cached pages without touching your server. Check that the cache status shows HIT on a repeat request.' },
            { title: 'Turn on compression and HTTP/3', text: 'Enable Brotli or gzip for text files and HTTP/3 where your host offers it. Both are usually a setting, not a rebuild.' },
            { title: 'Look at the database and the code', text: 'If an uncached page is still slow, log slow database queries, add missing indexes and remove plugins or code that run on every request.' },
            { title: 'Upgrade the hosting last', text: 'Shared hosting with little CPU and memory is a common cause of slow and uneven answers. Move up only after caching is on, so you are not paying for a problem a cache would solve.' },
          ],
        },
      ],
    },
    {
      id: 'limits',
      heading: 'What This Check Cannot Tell You',
      blocks: [
        { p: 'This check measures from one Cloudflare location, shown in the result, using plain requests. It is not a phone on mobile data and it does not run JavaScript. It is a strong first look at the server and delivery path, not a full audit of how real visitors experience the page.' },
        {
          list: [
            'Timings come from a data centre, so they show the server and network, not a visitor on a slow connection.',
            'The page is read as the server sends it. Content added by JavaScript is not counted.',
            'It tests one page at a time. A homepage can be fast while a database-heavy inner page is slow.',
            'Compression is reported only when the server sends the encoding header to the check.',
            'It cannot read a page behind a login, a firewall that blocks data-centre traffic or a local address.',
          ],
        },
        { p: 'For how the page paints and what real Chrome visitors experienced over the last 28 days, run the [free website speed test](/tools/website-speed-test), which uses Google PageSpeed Insights. Together the two results show both the cause and the effect.' },
      ],
    },
  ],
  cta: {
    heading: 'Server slow and not sure why?',
    text: 'Nexora Solution is a software company in Multan, Pakistan that builds fast, server-rendered websites and business software. Send us your check result and we will tell you what to fix first.',
    links: [
      { to: '/contact', label: 'Talk to Nexora', primary: true },
      { to: '/tools/website-speed-test', label: 'Run the speed test' },
    ],
  },
})

export function serverCheckWebApplicationSchema() {
  return createWebApplicationSchema({
    name: SERVER_CHECK_PAGE.appName,
    path: SERVER_CHECK_PATH,
    description: SERVER_CHECK_SEO.description,
    operatingSystem: 'Any (web browser)',
  })
}

export function serverCheckBreadcrumbSchema() {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools' },
    { name: SERVER_CHECK_PAGE.breadcrumbName, path: SERVER_CHECK_PATH },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(SERVER_CHECK_PATH)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/** Page-level JSON-LD in output order: WebApplication, FAQPage (mirrors the visible FAQ), BreadcrumbList. */
export function serverCheckPageSchemas() {
  return [
    serverCheckWebApplicationSchema(),
    createFAQPageSchema({ path: SERVER_CHECK_PATH, items: SERVER_CHECK_FAQS }),
    serverCheckBreadcrumbSchema(),
  ]
}

/** Visible words (lead + sections + FAQ), used by the tests. */
export function serverCheckWordCount() {
  const text = []
  const take = (v) => {
    if (typeof v === 'string') text.push(v)
    else if (Array.isArray(v)) v.forEach(take)
    else if (v && typeof v === 'object') Object.values(v).forEach(take)
  }
  take(SERVER_CHECK_PAGE.lead)
  take(SERVER_CHECK_PAGE.sections)
  take(SERVER_CHECK_FAQS)
  return text.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length
}
