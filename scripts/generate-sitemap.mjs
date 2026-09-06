import fs from 'fs/promises'
import path from 'path'
import { blogArticles } from '../src/lib/blogData.js'
import { submitIndexNow } from './indexnow.mjs'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { findImages } from './generate-image-sitemap.mjs'

const ROOT = process.cwd()
const APP_ROUTER = path.join(ROOT, 'src', 'AppRouter.jsx')
const PUBLIC_DIR = path.join(ROOT, 'public')
const DIST_DIR = path.join(ROOT, 'dist')
const HOST = 'https://nexorasolution.online'
const PUBLIC_ROUTE_ALLOWLIST = new Set([
  '/',
  '/business-services',
  '/contact',
  '/industries',
  '/reviews',
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
  '/ai',
  '/blog',
  '/download/restaurant-pos',
  // Solution landing pages
  '/restaurant-pos',
  '/retail-pos',
  '/school-erp',
  '/transport',
  '/whatsapp-crm',
  // Software development & services pages
  '/software-development',
  '/seo-services',
  '/mobile-app-development',
  '/ecommerce-development',
  '/crm-development',
  '/erp-development',
  '/cloud-solutions',
  '/api-integration',
  // Country landing pages
  '/usa',
  '/uk',
  '/canada',
  '/australia',
  '/uae',
  '/saudi-arabia',
  '/bahrain',
  '/qatar',
  '/oman',
  '/kuwait',
  '/pakistan',
  '/india',
  // Solution sub-pages
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
  for (const route of PUBLIC_ROUTE_ALLOWLIST) routes.add(cleanRoutePath(route))
  routes.add('/')
  return Array.from(routes).sort()
}

// Normalizes to a NO-trailing-slash "route key" (homepage stays '/'). This is
// only used internally for de-duping and allowlist matching — the public
// <loc> URLs are built from this via makeUrl()/absoluteCanonicalUrl() below,
// which both add the trailing slash back. Pages are prerendered to disk as
// `<route>/index.html` (see scripts/prerender.mjs), which the host serves at
// a URL WITH a trailing slash; the no-slash form 307-redirects to it, so the
// sitemap must never list the no-slash form as a <loc>.
function cleanRoutePath(value) {
  const raw = String(value || '').trim().replace(/\/+/g, '/')
  if (!raw || raw === '/') return '/'
  return raw.replace(/\/+$/, '')
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
  return route === '/' ? `${HOST}/` : `${HOST}${route}/`
}

// Builds the final, byte-for-byte served URL for a <loc> entry: always
// https, always trailing-slash (matching the real prerendered/served page),
// never carrying a query string or hash.
function absoluteCanonicalUrl(value) {
  const loc = String(value || '')
  if (!loc) return `${HOST}/`
  const url = loc.startsWith('http://') || loc.startsWith('https://') ? new URL(loc) : new URL(`${HOST}${cleanRoutePath(loc)}`)
  url.protocol = 'https:'
  url.pathname = url.pathname === '/' ? '/' : `${url.pathname.replace(/\/+$/, '')}/`
  url.search = ''
  url.hash = ''
  return url.toString()
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Image sitemap extension (see https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
// is designed to be embedded directly in a page's own <url> block, so image
// data lives here instead of a separate image-sitemap.xml file.
function imageTagsXml(images) {
  return (images || []).map((img) => `    <image:image>
      <image:loc>${xmlEscape(img.loc)}</image:loc>
      <image:title>${xmlEscape(img.title)}</image:title>
      <image:caption>${xmlEscape(img.caption)}</image:caption>
    </image:image>`).join('\n')
}

function sitemapXml(urls) {
  const hasImages = urls.some((u) => u.images && u.images.length)
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    hasImages
      ? `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
      : `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ]
  for (const u of urls) {
    xml.push('  <url>')
    xml.push(`    <loc>${xmlEscape(u.loc)}</loc>`)
    if (u.lastmod) xml.push(`    <lastmod>${xmlEscape(u.lastmod)}</lastmod>`)
    xml.push(`    <changefreq>${u.changefreq}</changefreq>`)
    xml.push(`    <priority>${u.priority}</priority>`)
    if (u.images && u.images.length) xml.push(imageTagsXml(u.images))
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

// Only articles with a real, non-pending/non-failed translation in Firestore
// should have their ur/hi/ar/bn URLs advertised in the sitemap — otherwise
// Google crawls a URL that has no unique content (the app has nothing to
// render there but the English article), correctly treats it as a duplicate,
// and canonicalizes it away. That was happening for every current article's
// language variants: Firestore's `blogTranslations` collection only had
// translations for articles that predate the current blog content, so zero
// current slugs actually matched. Mirrors the same lookup prerender.mjs uses
// (translations[code], falling back to the 'ur' entry) so the sitemap only
// ever lists a URL that prerender.mjs will actually generate a page for.
async function getTranslatedLanguagesBySlug(articles) {
  const mlLangs = [
    { code: 'ur-roman', prefix: 'ur' },
    { code: 'hi', prefix: 'hi' },
    { code: 'ar', prefix: 'ar' },
    { code: 'bn', prefix: 'bn' },
  ]
  const bySlug = new Map()
  try {
    const firebaseConfig = {
      apiKey: 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc',
      projectId: 'nexora-business-suite',
      authDomain: 'nexora-business-suite.firebaseapp.com',
      storageBucket: 'nexora-business-suite.firebasestorage.app',
    }
    const app = initializeApp(firebaseConfig, 'sitemap-ml')
    const db = getFirestore(app)
    for (const article of articles) {
      try {
        const snap = await getDoc(doc(db, 'blogTranslations', article.slug))
        if (!snap.exists()) continue
        const translations = snap.data().translations || {}
        const prefixes = mlLangs
          .filter(({ code }) => {
            const t = translations[code] || translations['ur']
            return t && t.translationStatus !== 'failed' && t.translationStatus !== 'pending'
          })
          .map(({ prefix }) => prefix)
        if (prefixes.length) bySlug.set(article.slug, prefixes)
      } catch {
        // Skip this article's translation check; it just won't get ml URLs.
      }
    }
  } catch (e) {
    console.log('[sitemap] Multilingual blog URL check skipped (Firestore unavailable):', e.message?.slice(0, 80))
  }
  return bySlug
}

export async function buildSitemap() {
  const routes = await readRoutes()
  const htmlFiles = await readPublicHtmlFiles()

  const previousSitemap = await fs
    .readFile(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8')
    .catch(() => '')

  // Used as lastmod for routes with no per-page tracked update date (i.e.
  // everything except blog articles, which carry their own updatedDate).
  // A build-time date is the standard fallback for static/marketing pages.
  const buildDate = new Date().toISOString().slice(0, 10)

  // Image data for the <image:image> tags embedded below — same discovery
  // logic generate-image-sitemap.mjs used for its now-disabled standalone
  // image-sitemap.xml (see findImages() there).
  const allImages = [...findImages(PUBLIC_DIR), ...findImages(DIST_DIR, DIST_DIR)]
  const seenImagePaths = new Set()
  const uniqueImages = allImages.filter((img) => {
    if (seenImagePaths.has(img.path)) return false
    seenImagePaths.add(img.path)
    return true
  })
  const homepageImages = uniqueImages
    .filter((img) => !img.path.includes('/blog/'))
    .slice(0, 20)
    .map((img) => ({ loc: `${HOST}${img.path}`, title: img.title, caption: `Nexora Solution — ${img.title}` }))
  const blogImages = uniqueImages
    .filter((img) => img.path.includes('/blog/'))
    .slice(0, 40)
    .map((img) => ({ loc: `${HOST}${img.path}`, title: img.title, caption: `Nexora Solution Blog — ${img.title}` }))

  const urls = []
  for (const r of routes) {
    const entry = { loc: makeUrl(r), lastmod: buildDate, changefreq: 'daily', priority: r === '/' ? '1.0' : '0.6' }
    if (r === '/') entry.images = homepageImages
    if (r === '/blog') entry.images = blogImages
    urls.push(entry)
  }
  for (const article of blogArticles) {
    urls.push({ loc: absoluteCanonicalUrl(article.canonical), lastmod: article.updatedDate, changefreq: 'weekly', priority: '0.5' })
  }
  for (const f of htmlFiles) {
    const lower = f.toLowerCase()
    if (lower === 'index.html' || lower === '404.html') continue
    // Google Site Verification files (google<token>.html) are not indexable pages.
    if (/^google[0-9a-z]+\.html$/i.test(f)) continue
    urls.push({ loc: `${HOST}/${f}`, lastmod: buildDate, changefreq: 'monthly', priority: '0.3' })
  }
  // Prerendered homepage translations (see scripts/prerender.mjs PUBLIC_ROUTES)
  // were previously undiscoverable via sitemap — only reachable through the
  // hreflang tags on the English homepage.
  for (const prefix of ['ur', 'hi', 'ar']) {
    urls.push({ loc: makeUrl(`/${prefix}`), lastmod: buildDate, changefreq: 'weekly', priority: '0.5' })
  }

  // Multilingual blog URLs — only for articles that actually have translated
  // content (see getTranslatedLanguagesBySlug above). These used to live only
  // in the now-removed blog-sitemap.xml; they're folded into the single
  // sitemap.xml here so no data is lost.
  const translatedBySlug = await getTranslatedLanguagesBySlug(blogArticles)
  const translatedPrefixes = new Set()
  for (const langs of translatedBySlug.values()) {
    for (const prefix of langs) translatedPrefixes.add(prefix)
  }
  for (const prefix of translatedPrefixes) {
    urls.push({ loc: makeUrl(`/${prefix}/blog`), lastmod: buildDate, changefreq: 'daily', priority: '0.5' })
  }
  for (const article of blogArticles) {
    const langs = translatedBySlug.get(article.slug) || []
    for (const prefix of langs) {
      urls.push({ loc: makeUrl(`/${prefix}/blog/${article.slug}`), lastmod: article.updatedDate, changefreq: 'weekly', priority: '0.4' })
    }
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml(urls), 'utf8')
  await fs.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), rssXml(blogArticles), 'utf8')
  console.log('Wrote public/sitemap.xml with', urls.length, 'entries')
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
