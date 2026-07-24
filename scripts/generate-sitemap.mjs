import fs from 'fs/promises'
import path from 'path'
import { blogArticles } from '../src/lib/blogData.js'
import { submitIndexNow } from './indexnow.mjs'

const ROOT = process.cwd()
const APP_ROUTER = path.join(ROOT, 'src', 'AppRouter.jsx')
const PUBLIC_DIR = path.join(ROOT, 'public')
const HOST = 'https://nexorasolution.online'
const PUBLIC_ROUTE_ALLOWLIST = new Set([
  '/',
  '/features',
  '/services',
  '/business-services',
  '/contact',
  '/industries',
  '/projects',
  '/about',
  '/pricing',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/sitemap',
  '/help-center',
  '/documentation',
  '/faq',
  '/support-center',
  '/blog',
  '/restaurant-pos',
  '/retail-pos',
  '/school-erp',
  '/transport',
  '/whatsapp-crm',
  '/solutions/crm',
  '/solutions/property-erp',
  '/solutions/medical-store-pos',
  '/solutions/reports',
  '/solutions/email-marketing',
  '/solutions/inventory-management',
  '/solutions/team-permissions',
  '/solutions/reports-analytics',
])

async function readRoutes() {
  const src = await fs.readFile(APP_ROUTER, 'utf8')
  const pathRegex = /<Route\s+path=\"([^\"]+)\"/g
  const routes = new Set()
  let m
  while ((m = pathRegex.exec(src))) {
    const p = m[1]
    if (!p.startsWith('/')) continue
    if (p.startsWith('/app') || p.startsWith('/admin')) continue
    if (p === '*' ) continue
    const final = cleanRoutePath(p.replace(/:\w+/g, ''))
    if (PUBLIC_ROUTE_ALLOWLIST.has(final)) routes.add(final)
  }
  // Always include allowlist routes — even if not found as explicit paths
  for (const route of PUBLIC_ROUTE_ALLOWLIST) routes.add(route)
  routes.add('/')
  return Array.from(routes).sort()
}

function cleanRoutePath(value) {
  const route = String(value || '').trim().replace(/\/+/g, '/').replace(/\/+$/, '')
  return route || '/'
}

async function readPublicHtmlFiles() {
  try {
    const files = await fs.readdir(PUBLIC_DIR)
    return files.filter((f) => f.endsWith('.html'))
  } catch (e) {
    return []
  }
}

function makeUrl(loc) {
  const route = cleanRoutePath(loc)
  return `${HOST}${route === '/' ? '/' : route}`
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sitemapXml(urls) {
  const xml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`]
  for (const u of urls) {
    xml.push('  <url>')
    xml.push(`    <loc>${xmlEscape(u.loc)}</loc>`)
    if (u.lastmod) xml.push(`    <lastmod>${xmlEscape(u.lastmod)}</lastmod>`)
    xml.push(`    <changefreq>${u.changefreq}</changefreq>`)
    xml.push(`    <priority>${u.priority}</priority>`)
    xml.push('  </url>')
  }
  xml.push('</urlset>')
  return xml.join('\n')
}

function rssXml(articles) {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    '  <channel>',
    `    <title>${xmlEscape('Nexora Solution Blog')}</title>`,
    `    <link>${HOST}/blog</link>`,
    `    <description>${xmlEscape('POS, ERP, CRM, AI and business software guides from Nexora Solution.')}</description>`,
    `    <language>en-PK</language>`,
    `    <atom:link href="${HOST}/rss.xml" rel="self" type="application/rss+xml" />`,
  ]
  for (const article of articles) {
    lines.push('    <item>')
    lines.push(`      <title>${xmlEscape(article.title)}</title>`)
    lines.push(`      <link>${xmlEscape(article.canonical)}</link>`)
    lines.push(`      <guid>${xmlEscape(article.canonical)}</guid>`)
    lines.push(`      <description>${xmlEscape(article.excerpt)}</description>`)
    lines.push(`      <category>${xmlEscape(article.category)}</category>`)
    lines.push(`      <pubDate>${new Date(article.publishDate).toUTCString()}</pubDate>`)
    lines.push('    </item>')
  }
  lines.push('  </channel>')
  lines.push('</rss>')
  return lines.join('\n')
}

// Parse an existing sitemap into a map of loc -> lastmod so the next build can
// detect which public URLs were created, updated (lastmod changed) or removed.
function parseSitemapEntries(xml) {
  const entries = new Map()
  if (!xml) return entries
  const urlRegex = /<url>([\s\S]*?)<\/url>/g
  let block
  while ((block = urlRegex.exec(xml))) {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block[1])?.[1]?.trim()
    if (!loc) continue
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block[1])?.[1]?.trim() || ''
    entries.set(loc, lastmod)
  }
  return entries
}

// Changed URLs = added, removed, or whose lastmod moved since the previous build.
function diffChangedUrls(previous, current) {
  const changed = new Set()
  for (const [loc, lastmod] of current) {
    if (!previous.has(loc) || previous.get(loc) !== lastmod) changed.add(loc)
  }
  for (const loc of previous.keys()) {
    if (!current.has(loc)) changed.add(loc)
  }
  return Array.from(changed)
}

export async function buildSitemap() {
  const routes = await readRoutes()
  const htmlFiles = await readPublicHtmlFiles()

  const previousSitemap = await fs
    .readFile(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8')
    .catch(() => '')

  const urls = []
  for (const r of routes) {
    urls.push({ loc: makeUrl(r), changefreq: 'daily', priority: r === '/' ? '1.0' : '0.6' })
  }
  for (const article of blogArticles) {
    urls.push({ loc: article.canonical, lastmod: article.updatedDate, changefreq: 'weekly', priority: '0.5' })
  }
  for (const f of htmlFiles) {
    if (f.toLowerCase() === 'index.html' || f.toLowerCase() === '404.html') continue
    urls.push({ loc: `${HOST}/${f}`, changefreq: 'monthly', priority: '0.3' })
  }

  const blogUrls = [
    { loc: `${HOST}/blog`, changefreq: 'daily', priority: '0.7' },
    ...blogArticles.map((article) => ({ loc: article.canonical, lastmod: article.updatedDate, changefreq: 'weekly', priority: '0.5' })),
  ]
  // Multilingual blog URLs
  const mlPrefixes = ['ur', 'hi', 'ar', 'bn']
  for (const prefix of mlPrefixes) {
    blogUrls.push({ loc: `${HOST}/${prefix}/blog`, changefreq: 'daily', priority: '0.5' })
    for (const article of blogArticles) {
      blogUrls.push({ loc: `${HOST}/${prefix}/blog/${article.slug}`, lastmod: article.updatedDate, changefreq: 'weekly', priority: '0.4' })
    }
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml(urls), 'utf8')
  await fs.writeFile(path.join(PUBLIC_DIR, 'blog-sitemap.xml'), sitemapXml(blogUrls), 'utf8')
  await fs.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), rssXml(blogArticles), 'utf8')
  console.log('Wrote public/sitemap.xml with', urls.length, 'entries')
  console.log('Wrote public/blog-sitemap.xml with', blogUrls.length, 'entries')
  console.log('Wrote public/rss.xml with', blogArticles.length, 'entries')

  // Notify IndexNow about URLs that changed vs. the previous sitemap. On the very
  // first build (no previous sitemap) every URL is treated as new. Best-effort:
  // this never throws, so it cannot break the build.
  const currentEntries = parseSitemapEntries(sitemapXml(urls))
  const changedUrls = diffChangedUrls(parseSitemapEntries(previousSitemap), currentEntries)
  const result = await submitIndexNow(changedUrls, { reason: 'sitemap-build' })
  if (result?.submitted) console.log('IndexNow: submitted', result.submitted, 'changed URL(s)')
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('generate-sitemap.mjs')) {
  buildSitemap().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
