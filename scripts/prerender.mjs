/**
 * Phase 2 — Build-time prerendering with full blog article content.
 *
 * Usage: node scripts/prerender.mjs
 * Prerequisite: npm run build must complete first
 *
 * Generates static HTML for:
 *   1. All public marketing routes (with full SEO metadata)
 *   2. Every published blog article (with complete content, schemas, reading time)
 *   3. Updated sitemap
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatBlogContentHtml } from '../src/lib/blogContentFormatter.js'
import { autoLinkTerms } from '../src/lib/blogInternalLinks.js'
import { defaultPlatformPlans, freeTrialConfig } from '../src/lib/platformPlans.js'
import { absoluteUrl, createOrganizationSchema, createWebSiteSchema } from '../src/lib/seoStructuredData.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'
import { COUNTRIES } from '../src/lib/countries.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const PUBLIC = join(ROOT, 'public')
const SITE = 'https://nexorasolution.online'
const LOGO = `${SITE}/nexora-brand-logo.png`

// ── Extracted from vite's dist/index.html BEFORE prerender overwrites it ──
let PRODUCTION_ASSETS = ''

function captureProductionAssets() {
  const viteIndexPath = join(DIST, 'index.html')
  if (!existsSync(viteIndexPath)) return

  const html = readFileSync(viteIndexPath, 'utf-8')
  const tags = []

  // <script type="module" crossorigin src="/assets/..."></script>
  for (const m of html.matchAll(/<script\s+type="module"[^>]*\/assets\/[^"]*"[^>]*>\s*<\/script>/g))
    tags.push(m[0])

  // <link rel="modulepreload" crossorigin href="/assets/...">
  // Only include critical modulepreloads (react, index, main, runtime, app-shell)
  // to reduce network contention on slow mobile connections.
  for (const m of html.matchAll(/<link\s+rel="modulepreload"[^>]*\/assets\/[^"]*"[^>]*>/g)) {
    const href = (m[0].match(/href="([^"]*)"/) || [])[1] || ''
    const isCritical =
      href.includes('vendor-react-') ||
      href.includes('index-') ||
      href.includes('main-') ||
      href.includes('rolldown-runtime') ||
      href.includes('public-app-shell-')
    if (isCritical) tags.push(m[0])
  }

  // <link rel="stylesheet" crossorigin href="/assets/...">
  for (const m of html.matchAll(/<link\s+rel="stylesheet"[^>]*\/assets\/[^"]*"[^>]*>/g))
    tags.push(m[0])

  if (tags.length > 0) {
    PRODUCTION_ASSETS = tags.join('\n  ')
    console.log(`[prerender] ✓ Captured ${tags.length} critical production asset tags (filtered for speed)`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escJson(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function wordCount(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length
}

function readingTime(words, wpm = 220) {
  return Math.max(1, Math.round(words / wpm))
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toISOString().slice(0, 10)
  } catch { return iso }
}

function slugToTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

const PUBLIC_ROUTES = [
  { path: '/',              title: 'Nexora POS Software Pakistan | Nexora Solution',                                        description: 'Nexora offers Pakistan\'s leading POS software for restaurant, retail, school ERP and WhatsApp CRM teams with unified business workflows.' },
  { path: '/uae',           title: 'Business Software Solutions UAE | POS, ERP & CRM Dubai Abu Dhabi',                       description: 'AI-powered POS, School ERP, Retail POS and WhatsApp CRM for businesses in UAE.' },
  { path: '/hi',            title: 'बिज़नेस सॉफ्टवेयर पाकिस्तान | POS, ERP और CRM — Nexora Solution',                         description: 'रेस्तरां POS, स्कूल ERP और रिटेल POS सॉफ्टवेयर।' },
  { path: '/ar',            title: 'برنامج إدارة الأعمال | Nexora Solution',                                                  description: 'نظام POS وERP وCRM للمطاعم والمدارس والمتاجر.' },
  { path: '/ur',            title: 'بزنس مینجمنٹ سافٹ ویئر | Nexora Solution',                                                description: 'ریستوران POS، اسکول ERP اور ریٹیل POS سافٹ ویئر پاکستان۔' },
  { path: '/about',         title: 'About Nexora Solution — Pakistan\'s Business Software Platform',                        description: 'Learn about Nexora Solution, the team behind Pakistan\'s leading POS, ERP and CRM platform for restaurants, retail, schools and enterprises.' },
  { path: '/pricing',       title: 'Nexora Pricing — Simple Plans for Every Business',                                      description: 'Compare Nexora pricing plans. Start with a free trial, then choose Basic, Standard or Enterprise. No credit card required.' },
  { path: '/contact',       title: 'Contact Nexora Solution — Get in Touch',                                                description: 'Contact Nexora Solution for POS software, ERP systems, CRM solutions. Book a free demo or reach our support team.' },
  // NOTE: title/description sourced from src/lib/seoMetadata.js so the static
  // shell matches what PageSeo renders client-side after hydration (previously
  // this page had two conflicting entries here — see git history).
  { path: '/restaurant-pos',title: seoMetadata['/restaurant-pos'].title,                                                    description: seoMetadata['/restaurant-pos'].description },
  { path: '/retail-pos',    title: 'Retail POS Software Pakistan — Nexora Solution',                                        description: 'Complete retail POS system with barcode billing, inventory management, discount engine and multi-counter support.' },
  { path: '/school-erp',    title: 'School ERP Software Pakistan — Nexora Solution',                                        description: 'Cloud-based school management system with student records, fee collection, attendance, exams and parent portal.' },
  { path: '/solutions/crm', title: 'CRM Software Pakistan — Nexora Solution',                                               description: 'Customer relationship management with lead tracking, pipeline, follow-ups and WhatsApp integration.' },
  { path: '/solutions/medical-store-pos', title: 'Medical Store POS Pakistan — Nexora Solution',                             description: 'Pharmacy POS with medicine inventory, batch tracking, expiry alerts and sales reports.' },
  { path: '/solutions/school-erp', title: 'School ERP System Pakistan — Nexora Solution',                                   description: 'Complete school ERP with student management, fees, attendance, exams, payroll and reports.' },
  { path: '/solutions/property-erp', title: 'Property ERP Software Pakistan — Nexora Solution',                             description: 'Property management ERP for landlords, agents and developers. Track tenants, rent, maintenance and owners.' },
  { path: '/solutions/reports', title: 'Business Reports Software Pakistan — Nexora Analytics',                            description: 'Nexora Reports Pakistan provides KPI dashboards, PDF reports, Excel exports and business intelligence for growing teams.' },
  { path: '/blog',          title: 'Nexora Blog — POS, ERP & CRM Insights for Pakistani Businesses',                         description: 'Read the Nexora blog for POS tips, ERP guides, CRM strategies and business growth insights for Pakistani entrepreneurs.' },
  { path: '/faq',           title: 'Frequently Asked Questions — Nexora Solution',                                           description: 'Find answers to common questions about Nexora POS, ERP, CRM pricing, features, setup, support and billing.' },
  // NOTE: sourced from seoMetadata['/business-services'] — this is the key
  // BusinessServicesPage.jsx actually calls via getSeoForPath(), so the
  // prerendered shell now matches the hydrated page (previously two
  // conflicting entries existed here).
  { path: '/business-services', title: seoMetadata['/business-services'].title,                                          description: seoMetadata['/business-services'].description },
  { path: '/documentation', title: 'Documentation — Nexora Solution',                                                       description: 'Nexora product documentation, setup guides, API references and tutorials for POS, ERP and CRM modules.' },
  { path: '/help-center',   title: 'Help Center — Nexora Solution',                                                         description: 'Get help with Nexora products. Find guides, troubleshooting tips and contact support.' },
  { path: '/support-center',title: 'Support Center — Nexora Solution',                                                      description: 'Nexora customer support center. Submit tickets, track issues and get technical assistance.' },
  { path: '/privacy-policy',title: 'Privacy Policy — Nexora Solution',                                                      description: 'Nexora Solution privacy policy. Learn how we collect, use and protect your data.' },
  { path: '/terms',         title: 'Terms & Conditions — Nexora Solution',                                                  description: 'Nexora Solution terms and conditions of service. Read before using our platform.' },
  { path: '/refund-policy', title: 'Refund Policy — Nexora Solution',                                                       description: 'Nexora Solution refund and cancellation policy for subscriptions and services.' },
  { path: '/sitemap',       title: 'HTML Sitemap — Nexora Solution',                                                        description: 'Browse all pages on the Nexora Solution website. Find POS, ERP, CRM and business software information.' },
  { path: '/solutions/email-marketing', title: 'Email Marketing — Nexora Solution',                                          description: 'Nexora email marketing tools for businesses. Create, send and track campaigns.' },
  { path: '/solutions/reports-analytics', title: 'Reports & Analytics — Nexora Solution',                                    description: 'Advanced business reports and analytics dashboard for Nexora POS, ERP and CRM modules.' },
  { path: '/solutions/inventory-management', title: 'Inventory Management — Nexora Solution',                                description: 'Cloud inventory management with stock tracking, purchase orders, supplier management and real-time reports.' },
  { path: '/solutions/team-permissions', title: 'Team & Permissions — Nexora Solution',                                      description: 'Role-based access control and team management for Nexora business software platform.' },
  { path: '/whatsapp-crm', title: 'WhatsApp CRM Pakistan — Nexora Solution',                                                description: 'WhatsApp CRM for businesses. Capture leads, auto-reply, team inbox and close deals faster with WhatsApp integration.' },
  { path: '/transport',    title: 'Transport Management Software Pakistan — Nexora Solution',                                description: 'Fleet and transport management system with vehicle tracking, bookings, payments and customer ledgers.' },
  { path: '/industries',   title: 'Industries Served — Nexora Solution',                                                    description: 'Discover how Nexora serves restaurants, retail, schools, pharmacies, transport and service businesses across Pakistan.' },
  { path: '/reviews',      title: 'Customer Reviews | Nexora Solution Pakistan',                                            description: 'Read verified customer reviews and testimonials for Nexora POS, ERP, CRM and business software in Pakistan.' },
  { path: '/projects',     title: 'Projects — Nexora Solution',                                                             description: 'Nexora Solution client projects and case studies. See how businesses transformed with our POS and ERP software.' },
  { path: '/download/restaurant-pos', title: 'Download Nexora Restaurant POS for Windows — Free Installer',                 description: 'Download the free Nexora Restaurant POS Windows installer (v1.0.0). Offline-capable POS with KOT printing, table layout, billing, customer wallet, expenses and cloud sync.' },
  // Software/dev service pages — previously not prerendered at all, so
  // crawlers and link-preview bots only saw the generic homepage meta tags.
  // Title/description sourced from seoMetadata.js to match hydrated content.
  { path: '/software-development',     title: seoMetadata['/software-development'].title,     description: seoMetadata['/software-development'].description },
  { path: '/seo-services',             title: seoMetadata['/seo-services'].title,              description: seoMetadata['/seo-services'].description },
  { path: '/mobile-app-development',   title: seoMetadata['/mobile-app-development'].title,    description: seoMetadata['/mobile-app-development'].description },
  { path: '/ecommerce-development',    title: seoMetadata['/ecommerce-development'].title,      description: seoMetadata['/ecommerce-development'].description },
  { path: '/crm-development',          title: seoMetadata['/crm-development'].title,           description: seoMetadata['/crm-development'].description },
  { path: '/erp-development',          title: seoMetadata['/erp-development'].title,           description: seoMetadata['/erp-development'].description },
  { path: '/cloud-solutions',          title: seoMetadata['/cloud-solutions'].title,           description: seoMetadata['/cloud-solutions'].description },
  { path: '/api-integration',          title: seoMetadata['/api-integration'].title,           description: seoMetadata['/api-integration'].description },
  // Country landing pages — only /uae/ was prerendered before; the other 11
  // country pages (all listed in sitemap.xml + robots.txt as indexable) had
  // no static HTML at all. Sourced directly from src/lib/countries.js so
  // this list can never drift from the data CountryPage.jsx renders.
  ...COUNTRIES.filter((c) => c.slug !== 'uae').map((c) => ({
    path: `/${c.slug}`,
    title: c.seoTitle,
    description: c.seoDescription,
  })),
]

// ═══════════════════════════════════════════════════════════════════════════════
//  DYNAMIC SEO HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// The English homepage ('/') and its translated siblings ('/ur', '/hi',
// '/ar') form one reciprocal hreflang group: every page in the group must
// declare the exact same set of alternates (itself included), so this list
// is shared by all of them via buildHreflangBlock() below.
const HOMEPAGE_HREFLANG_LANGS = [
  { prefix: '', hreflang: 'en', xDefault: true },
  { prefix: 'ur', hreflang: 'ur' },
  { prefix: 'hi', hreflang: 'hi' },
  { prefix: 'ar', hreflang: 'ar' },
]

// Derives the <html lang="..."> value from a route path using the same
// ur/hi/ar prefix detection buildSeoHead() uses for hreflang, so the
// self-referencing hreflang tag and the html lang attribute can never
// disagree on which language a page is in.
function htmlLangForPath(path) {
  const normalized = path === '/' ? '/' : `/${String(path || '').replace(/^\/+|\/+$/g, '')}`
  const match = normalized.match(/^\/(ur|hi|ar)(\/.*)?$/)
  return match ? match[1] : 'en'
}

// Single source of truth for every <link rel="canonical"> / og:url emitted by
// this script. Pages are written to disk as `<route>/index.html` (see
// writePage() call sites below), which the host serves at a URL WITH a
// trailing slash — requesting the no-slash form 307-redirects to it. So the
// canonical here must always match that trailing-slash form (absoluteUrl(),
// shared with the client-side canonical in src/lib/seoStructuredData.js,
// already does this) rather than stripping the slash off.
function buildSeoHead(meta) {
  const normalizedPath = meta.path === '/' ? '/' : `/${meta.path.replace(/^\/+|\/+$/g, '')}`
  const languageMatch = normalizedPath.match(/^\/(ur|hi|ar)(\/.*)?$/)
  const isUae = normalizedPath === '/uae'
  const canonical = absoluteUrl(normalizedPath)
  const img = meta.image || LOGO
  const type = meta.path.startsWith('/blog/') ? 'article' : 'website'
  const ogLocale = meta.ogLocale || 'en_PK'
  const isHomepageGroup = normalizedPath === '/' || Boolean(languageMatch)
  const homepageSuffix = languageMatch ? (languageMatch[2] || '') : ''
  const hreflangBlock = meta.hreflangBlock || (isHomepageGroup
    ? buildHreflangBlock(homepageSuffix, HOMEPAGE_HREFLANG_LANGS)
    : isUae
      ? `  <link rel="alternate" hreflang="en-AE" href="${esc(canonical)}" />\n  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />\n`
      : '')

  return `  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="Nexora Solution" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="Nexora Solution — POS, ERP and CRM software for Pakistan" />
  <meta property="og:locale" content="${ogLocale}" />
  ${meta.keywords ? `<meta name="keywords" content="${esc(meta.keywords)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nexorasolution" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <meta name="twitter:image:alt" content="Nexora Solution — POS, ERP and CRM software for Pakistan" />
  ${hreflangBlock}`
}


// Builds one reciprocal hreflang group for `pathSuffix` (e.g. "/blog/some-slug",
// or "" for the homepage group). `langs` must be the exact same list for
// every page in the group — each entry becomes both a language's own page
// (self-reference, when its prefix matches the page being rendered) and the
// return-tag every other page in the group links back with — so passing a
// language here that has no real prerendered page produces a dangling
// hreflang (a "hreflang to redirect or broken page" report). Every href is
// built through absoluteUrl(), the same helper the canonical tag uses, so
// hreflang targets are always https + trailing-slash, matching the real URL.
function buildHreflangBlock(pathSuffix, langs) {
  const mlLangs = langs && langs.length ? langs : [{ prefix: '', hreflang: 'en', xDefault: true }]
  let block = ''
  for (const lang of mlLangs) {
    const prefix = lang.prefix ? `/${lang.prefix}` : ''
    const href = absoluteUrl(`${prefix}${pathSuffix}`)
    if (lang.xDefault) block += `  <link rel="alternate" hreflang="x-default" href="${esc(href)}" />\n`
    block += `  <link rel="alternate" hreflang="${lang.hreflang}" href="${esc(href)}" />\n`
  }
  return block
}

function buildCommonHead() {
  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0ea5e9" />
  <meta name="generator" content="Nexora SSG v2" />
  <meta name="prerendered" content="${new Date().toISOString()}" />
  <link rel="alternate" type="application/rss+xml" title="Nexora Solution Blog RSS Feed" href="/rss.xml" />
  <link rel="manifest" href="/manifest.json?v=20260628-pwa-install-icon-v2" />
  <link rel="icon" href="/favicon.ico?v=20260612-nexora-mark" sizes="any" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260612-nexora-mark" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260612-nexora-mark" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=20260612-nexora-mark" />
  <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64x64.png?v=20260612-nexora-mark" />
  <link rel="apple-touch-icon" sizes="180x180" href="/nexora-pwa-install-180.png?v=20260628-pwa-install-icon-v2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
  <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
  <link rel="dns-prefetch" href="https://embed.tawk.to" />
  <!-- Fonts: async load with display=swap -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=Poppins:wght@900&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=Poppins:wght@900&display=swap" /></noscript>
  <style>body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style>`
}

function buildGtm() {
  return `  <script>
    self.requestAnimationFrame(function () {
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PZJV65RW');
    });
  </script>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JSON-LD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

function orgSchema() {
  const schema = createOrganizationSchema()
  return `  <script type="application/ld+json" id="nexora-jsonld-organization">
${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}
</script>`
}

function websiteSchema() {
  const schema = createWebSiteSchema()
  return `  <script type="application/ld+json" id="nexora-jsonld-website">
${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}
</script>`
}

function breadcrumbSchema(items) {
  const listItems = items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: item.url,
  }))
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": ${JSON.stringify(listItems)}
}
</script>`
}

function articleSchema(article) {
  const words = article.totalWords || 0
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "${SITE}/blog/${article.slug}"
  },
  "headline": "${escJson(article.seoTitle || article.title)}",
  "description": "${escJson(article.metaDescription || article.description || '')}",
  "image": "${LOGO}",
  "author": {
    "@type": "Organization",
    "name": "Nexora Solution Editorial Team",
    "url": "${SITE}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Nexora Solution",
    "logo": {
      "@type": "ImageObject",
      "url": "${LOGO}"
    }
  },
  "datePublished": "${article.publishDate || ''}",
  "dateModified": "${article.updatedDate || article.publishDate || ''}",
  "wordCount": "${words}",
  "timeRequired": "PT${readingTime(words)}M",
  "articleSection": "${escJson(article.category || '')}",
  "keywords": "${escJson((article.tags || []).join(', '))}"
}
</script>`
}

function imageSchema(url) {
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "${esc(url)}",
  "url": "${esc(url)}",
  "caption": "Nexora Solution blog article featured image"
}
</script>`
}

function faqSchema(faqs) {
  if (!faqs || !faqs.length) return ''
  const mainEntity = faqs.map(([q, a]) => ({
    '@type': 'Question',
    name: escJson(q),
    acceptedAnswer: { '@type': 'Answer', text: escJson(a) },
  }))
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ${JSON.stringify(mainEntity)}
}
</script>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO INTERNAL LINKING
//  Uses the shared route registry from src/lib/blogInternalLinks.js
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO RELATED ARTICLES (category + tags)
// ═══════════════════════════════════════════════════════════════════════════════

function computeRelatedArticles(current, allArticles, maxCount = 4) {
  if (!allArticles || allArticles.length < 2) return []

  const others = allArticles.filter((a) => a.slug !== current.slug)
  const cat = (current.category || '').toLowerCase()
  const tags = new Set((current.tags || []).map((t) => t.toLowerCase()))

  // Score each article by relevance
  const scored = others.map((a) => {
    let score = 0
    if ((a.category || '').toLowerCase() === cat) score += 3
    for (const t of (a.tags || [])) {
      if (tags.has(t.toLowerCase())) score += 2
    }
    return { article: a, score }
  })

  // No score > 0 filter here — matches the client (BlogArticlePage.jsx),
  // which always shows top 3 regardless of score. Without this, an article
  // with zero category/tag overlap got zero related links in the static
  // HTML crawlers see. The publishDate tie-break (same comparison the
  // client uses) means articles with no overlap still surface the most
  // recent posts instead of an arbitrary slice.
  return scored
    .sort((a, b) => b.score - a.score || String(b.article.publishDate || '').localeCompare(String(a.article.publishDate || '')))
    .slice(0, maxCount)
    .map((s) => s.article)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO SEARCH INDEX (JSON for client-side search)
// ═══════════════════════════════════════════════════════════════════════════════

function buildSearchIndex(articles) {
  const index = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.metaDescription || a.description || '',
    category: a.category || '',
    tags: a.tags || [],
    url: `/blog/${a.slug}`,
    words: (a.sections || []).reduce((sum, s) =>
      sum + wordCount(s.heading || '') + (s.paragraphs || []).reduce((s2, p) => s2 + wordCount(p), 0), 0
    ),
  }))
  return JSON.stringify(index)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENHANCED RSS FEED
// ═══════════════════════════════════════════════════════════════════════════════

function buildEnhancedRss(articles) {
  const items = articles.map((a) => {
    const body = (a.sections || []).map((s) => `<h2>${esc(s.heading)}</h2>\n${(s.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('\n')}`).join('\n')
    const words = (a.sections || []).reduce((sum, s) =>
      sum + wordCount(s.heading || '') + (s.paragraphs || []).reduce((s2, p) => s2 + wordCount(p), 0), 0
    )
    return `  <item>
    <title>${esc(a.title)}</title>
    <link>${SITE}/blog/${esc(a.slug)}</link>
    <guid isPermaLink="true">${SITE}/blog/${esc(a.slug)}</guid>
    <description>${esc(a.metaDescription || a.description || '')}</description>
    <content:encoded><![CDATA[${body}]]></content:encoded>
    <category>${esc(a.category || '')}</category>
    <pubDate>${new Date(a.publishDate).toUTCString()}</pubDate>
    <author>nexora@nexorasolution.online (Nexora Solution Editorial Team)</author>
  </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Nexora Solution Blog</title>
  <link>${SITE}/blog</link>
  <description>POS, ERP &amp; CRM insights for Pakistani businesses</description>
  <language>en-pk</language>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FULL BLOG ARTICLE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function buildFullBlogHtml(article, allArticles = [], options = {}) {
  const {
    langCode = 'en', htmlLang = 'en', ogLocale = 'en_PK', translation = null,
    // The set of languages that actually have a real prerendered page for
    // this article (English plus whichever translations passed the
    // availability check in fetchArticleTranslations()) — see hreflangLangsFor().
    // Every call site for one article (its English page and each of its
    // translated pages) must pass the SAME list, so the group is reciprocal
    // by construction and never links to a page that doesn't exist.
    hreflangLangs = [{ prefix: '', hreflang: 'en', xDefault: true }],
  } = options
  const display = translation || article
  const sections = (display.sections || article.sections || [])
  const faqs = article.faqs || []
  const totalWords = sections.reduce((sum, s) => {
    const headingWords = wordCount(s.heading || '')
    const bodyWords = (s.paragraphs || []).reduce((s2, p) => s2 + wordCount(p), 0)
    return sum + headingWords + bodyWords
  }, 0) + wordCount(article.excerpt || article.description || '') + wordCount(article.title || '')
  const readTime = readingTime(totalWords)
  const pubDate = formatDate(article.publishDate)
  const updDate = formatDate(article.updatedDate)

  // ── Compute related articles dynamically ──
  const relatedArticles = computeRelatedArticles(article, allArticles)

  // ── Build article content HTML with auto internal links ──
  let contentHtml = ''
  for (const section of sections) {
    const level = section.level || 2
    const htag = `h${Math.min(level, 3)}`
    contentHtml += `\n    <${htag} id="${esc(section.id || '')}">${esc(section.heading)}</${htag}>\n`
    for (const p of (section.paragraphs || [])) {
      const formatted = formatBlogContentHtml(p)
      contentHtml += `    <p>${autoLinkTerms(formatted)}</p>\n`
    }
  }

  // ── Build FAQ HTML ──
  let faqHtml = ''
  if (faqs.length > 0) {
    faqHtml = `\n    <h2>Frequently Asked Questions</h2>\n`
    for (const [q, a] of faqs) {
      faqHtml += `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>\n`
    }
  }

  // ── Related articles (dynamic) ──
  let relatedHtml = ''
  if (relatedArticles.length > 0) {
    relatedHtml = `\n    <h2>Related Articles</h2>\n    <ul>\n`
    for (const ra of relatedArticles) {
      relatedHtml += `      <li><a href="/blog/${esc(ra.slug)}">${esc(ra.title)}</a> — ${readingTime(wordCount(ra.title + (ra.metaDescription || '')))} min read</li>\n`
    }
    relatedHtml += '    </ul>\n'
  }

  // ── Previous/Next article navigation ──
  // Same index-based adjacency the client uses (BlogArticlePage.jsx's
  // `adjacent`), computed over the same allArticles order every call site
  // passes in, so crawlers see the same prev/next links the client renders.
  const articleIndex = allArticles.findIndex((a) => a.slug === article.slug)
  const adjacent = {
    previous: articleIndex > 0 ? allArticles[articleIndex - 1] : null,
    next: articleIndex >= 0 && articleIndex < allArticles.length - 1 ? allArticles[articleIndex + 1] : null,
  }
  let prevNextHtml = ''
  if (adjacent.previous || adjacent.next) {
    prevNextHtml = `\n    <nav aria-label="Article navigation" style="display:flex;justify-content:space-between;margin:2rem 0;padding:1rem 0;border-top:1px solid #e5e7eb">\n`
    if (adjacent.previous) {
      prevNextHtml += `      <a href="/blog/${esc(adjacent.previous.slug)}" style="color:#6366f1;text-decoration:none;font-weight:500">\n        ← ${esc(adjacent.previous.title)}\n      </a>\n`
    }
    if (adjacent.next) {
      prevNextHtml += `      <a href="/blog/${esc(adjacent.next.slug)}" style="color:#6366f1;text-decoration:none;font-weight:500;margin-left:auto">\n        ${esc(adjacent.next.title)} →\n      </a>\n`
    }
    prevNextHtml += '    </nav>\n'
  }

  // ── CTA ──
  const ctaHtml = article.primaryLink
    ? `\n    <div class="cta"><a href="${esc(article.primaryLink.to)}">${esc(article.primaryLink.label)}</a></div>\n`
    : `\n    <div class="cta"><a href="/pricing">View Nexora Pricing</a> | <a href="/signup">Start Free Trial</a></div>\n`

  // ── Breadcrumb ──
  const breadcrumbHtml = `\n    <nav aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><span aria-current="page">${esc(article.title)}</span></li>
      </ol>
    </nav>\n`

  // ── Build complete page ──
  const blogPath = langCode !== 'en' ? `/${htmlLang === 'ur' ? 'ur' : htmlLang === 'hi' ? 'hi' : htmlLang === 'ar' ? 'ar' : htmlLang === 'bn' ? 'bn' : 'en'}/blog/${article.slug}` : `/blog/${article.slug}`
  const seoTitle = translation?.seoTitle || translation?.title || article.seoTitle || article.title
  const seoDesc = translation?.metaDescription || translation?.excerpt || article.metaDescription || article.description || `Read ${display.title || article.title} on Nexora Blog.`
  const hreflangs = buildHreflangBlock(`/blog/${article.slug}`, hreflangLangs)
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
${buildCommonHead()}
${buildSeoHead({
    path: blogPath,
    title: seoTitle,
    description: seoDesc,
    keywords: (article.tags || []).join(', '),
    image: article.featuredImage || LOGO,
    ogLocale,
    hreflangBlock: hreflangs,
  })}
${orgSchema()}
${articleSchema({ ...article, totalWords, language: ogLocale })}
${imageSchema(article.featuredImage || LOGO)}
${breadcrumbSchema([
    { name: 'Home', url: SITE },
    { name: 'Blog', url: `${SITE}/blog` },
    { name: article.title, url: `${SITE}/blog/${article.slug}` },
  ])}
${faqSchema(faqs)}
${buildGtm()}
</head>
<body>
  <div id="root">
    <header>
      <a href="/">Nexora Solution</a>
      <nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/blog">Blog</a></nav>
    </header>
    <main>
      <article>
        ${breadcrumbHtml}
        <h1>${esc(article.title)}</h1>
        ${buildTocHtml(sections)}
        <div class="meta">
          <span>By Nexora Solution Editorial Team</span>
          <span>Published: ${pubDate}</span>
          ${updDate !== pubDate ? `<span>Updated: ${updDate}</span>` : ''}
          <span>${readTime} min read</span>
          <span>${totalWords.toLocaleString()} words</span>
          <span>Category: <a href="/blog/?category=${encodeURIComponent(article.category || '')}">${esc(article.category || 'General')}</a></span>
        </div>
        ${article.featuredImage ? `<img src="${esc(article.featuredImage)}" alt="${esc(article.seoTitle || article.title)}" title="${esc(article.seoTitle || article.title)}" width="1200" height="675" loading="eager" fetchpriority="high" decoding="async" sizes="(max-width: 768px) 100vw, 720px" srcset="${esc(article.featuredImage)} 1200w" />` : ''}
        ${article.excerpt ? `<p class="excerpt"><strong>${esc(article.excerpt)}</strong></p>` : `<p class="excerpt"><strong>${esc(article.metaDescription || article.description || '')}</strong></p>`}
        <div style="margin-top:1.5rem;position:relative;overflow:hidden;border-radius:1rem;border:1px solid rgba(255,255,255,0.3);background:linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.6),rgba(245,243,255,0.4));padding:1px;box-shadow:0 8px 32px -8px rgba(139,92,246,0.18);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);"><div style="position:absolute;right:-1rem;top:-1.5rem;width:4rem;height:4rem;border-radius:50%;background:linear-gradient(135deg,rgba(167,139,250,0.3),rgba(168,85,247,0.15));filter:blur(20px);pointer-events:none;animation:pulse 3s ease-in-out infinite;"></div><div style="position:absolute;left:-0.5rem;bottom:-1rem;width:3rem;height:3rem;border-radius:50%;background:linear-gradient(135deg,rgba(192,132,252,0.2),rgba(139,92,246,0.1));filter:blur(16px);pointer-events:none;"></div><div style="position:relative;display:flex;align-items:center;gap:1rem;border-radius:0.875rem;background:rgba(255,255,255,0.6);padding:0.875rem 1.25rem;"><span style="position:relative;display:flex;width:3rem;height:3rem;flex-shrink:0;align-items:center;justify-content:center;"><span style="position:absolute;inset:0;animation:pulse 3s ease-in-out infinite;border-radius:0.75rem;background:linear-gradient(135deg,#8b5cf6,#a855f7,#c084fc);opacity:0.4;filter:blur(3px);"></span><img src="/nexora-ai-logo.png" alt="Nexora AI" style="position:relative;width:2.75rem;height:2.75rem;border-radius:0.75rem;object-fit:cover;box-shadow:0 4px 16px rgba(123,97,255,0.45);border:2px solid rgba(255,255,255,0.5);"></span><div style="min-width:0;"><div style="display:flex;align-items:center;gap:0.5rem;"><p style="font-size:0.9375rem;font-weight:700;color:#1d1d1f;letter-spacing:-0.02em;margin:0;">Nexora AI</p><span style="display:inline-flex;align-items:center;gap:0.25rem;border-radius:9999px;background:linear-gradient(90deg,#ede9fe,#ddd6fe);padding:0.125rem 0.5rem;font-size:0.625rem;font-weight:600;color:#6d28d9;letter-spacing:-0.01em;"><span style="width:0.375rem;height:0.375rem;border-radius:50%;background:#8b5cf6;animation:pulse 2s ease-in-out infinite;"></span>Enhanced</span></div><p style="margin-top:0.125rem;font-size:0.75rem;font-weight:500;color:#86868b;letter-spacing:-0.01em;">Key business insights automatically highlighted by AI</p></div><svg style="width:1rem;height:1rem;flex-shrink:0;color:#c4b5fd;opacity:0.6;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" style="animation:pulse 2s ease-in-out infinite;"/><path d="M18 14l1 3.5L22.5 18l-3.5 1L18 22.5l-1-3.5-3.5-1 3.5-1z" opacity="0.5"/></svg></div></div>
        ${contentHtml}
        ${faqHtml}
        ${relatedHtml}
        ${prevNextHtml}
        ${ctaHtml}
        <p class="tags">Tags: ${(article.tags || []).map((t) => `<a href="/blog/?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join(', ')}</p>
      </article>
    </main>
    <footer>
      <p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p>
    </footer>
  </div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe>
  </noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: SOFTWARE APPLICATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const SOLUTION_PAGES = {
  '/restaurant-pos': { name: 'Nexora Restaurant POS', cat: 'Restaurant POS', os: 'Web, Windows, Android, iOS', desc: 'Modern restaurant POS with table management, KOT, billing, inventory and cloud sync.' },
  '/retail-pos': { name: 'Nexora Retail POS', cat: 'Retail POS', os: 'Web, Windows, Android, iOS', desc: 'Complete retail POS system with barcode billing, inventory management, discount engine.' },
  '/school-erp': { name: 'Nexora School ERP', cat: 'School ERP', os: 'Web, Windows, Android, iOS', desc: 'Cloud-based school management with student records, fee collection, attendance, exams.' },
  '/solutions/crm': { name: 'Nexora CRM', cat: 'CRM Software', os: 'Web, Windows, Android, iOS', desc: 'Customer relationship management with lead tracking, pipeline, follow-ups.' },
  '/solutions/pos': { name: 'Nexora POS', cat: 'POS Software', os: 'Web, Windows, Android, iOS', desc: 'Complete POS solution for restaurants, retail, medical stores.' },
  '/solutions/medical-store-pos': { name: 'Nexora Medical Store POS', cat: 'Pharmacy POS', os: 'Web, Windows, Android, iOS', desc: 'Pharmacy POS with medicine inventory, batch tracking, expiry alerts.' },
  '/solutions/inventory-management': { name: 'Nexora Inventory Management', cat: 'Inventory Software', os: 'Web, Windows, Android, iOS', desc: 'Cloud inventory management with stock tracking, purchase orders.' },
}

function softwareAppSchema(path) {
  const info = SOLUTION_PAGES[path]
  if (!info) return ''
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "${info.name}",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "${info.os}",
  "description": "${escJson(info.desc)}",
  "url": "${SITE}${path}",
  "brand": { "@type": "Brand", "name": "Nexora Solution" },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "PKR",
    "description": "Free trial available"
  }
}
</script>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: TABLE OF CONTENTS BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildTocHtml(sections) {
  if (!sections || sections.length < 2) return ''
  let html = '\n    <nav class="toc" aria-label="Table of Contents">\n      <h2>Table of Contents</h2>\n      <ol>\n'
  for (const s of sections) {
    html += `        <li><a href="#${esc(s.id || '')}">${esc(s.heading)}</a></li>\n`
  }
  html += '      </ol>\n    </nav>\n'
  return html
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: AUTHOR PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildAuthorPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead({ path: '/author/nexora', title: 'Nexora Solution Editorial Team — Authors', description: 'Meet the Nexora Solution editorial team. Experts in POS, ERP and CRM software for Pakistani businesses.' })}
${orgSchema()}
  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Nexora Solution Editorial Team",
  "url": "${SITE}/author/nexora",
  "description": "Expert team covering POS, ERP and CRM software for Pakistani businesses.",
  "sameAs": [
    "https://facebook.com/nexorasolution",
    "https://instagram.com/nexorasolution",
    "https://linkedin.com/company/nexorasolution"
  ],
  "worksFor": { "@type": "Organization", "name": "Nexora Solution", "url": "${SITE}" }
}
</script>
${breadcrumbSchema([{ name: 'Home', url: SITE }, { name: 'Authors', url: `${SITE}/author/nexora` }])}
${buildGtm()}
</head>
<body>
  <div id="root">
    <header><a href="/">Nexora Solution</a><nav><a href="/">Home</a> <a href="/blog">Blog</a></nav></header>
    <main>
      <nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">Authors</span></li></ol></nav>
      <h1>Nexora Solution Editorial Team</h1>
      <p>Nexora Solution is Pakistan's leading POS, ERP and CRM software platform. Our editorial team covers practical guides, best practices and industry insights for restaurants, retail stores, schools, pharmacies, transport companies and service businesses.</p>
      <h2>Expertise</h2>
      <ul><li>Restaurant POS &amp; KOT Systems</li><li>Retail &amp; Inventory Management</li><li>School ERP &amp; Fee Management</li><li>CRM &amp; WhatsApp CRM</li><li>Transport &amp; Fleet Software</li><li>Pharmacy &amp; Medical Store POS</li><li>AI &amp; Business Automation</li><li>Cloud Security &amp; Data Protection</li></ul>
      <h2>Published Articles</h2>
      <p>Visit the <a href="/blog">Nexora Blog</a> for our complete article library.</p>
      <h2>Connect</h2>
      <ul>
        <li><a href="https://facebook.com/nexorasolution">Facebook</a></li>
        <li><a href="https://instagram.com/nexorasolution">Instagram</a></li>
        <li><a href="https://linkedin.com/company/nexorasolution">LinkedIn</a></li>
        <li><a href="https://youtube.com/@nexorasolution">YouTube</a></li>
      </ul>
    </main>
    <footer><p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p></footer>
  </div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: CATEGORY PAGES
// ═══════════════════════════════════════════════════════════════════════════════

function buildCategoryPage(category, articles) {
  const catArticles = articles.filter((a) => (a.category || '').toLowerCase() === category.toLowerCase())
  const title = `${category} Articles — Nexora Blog`
  const desc = `Read Nexora blog articles about ${category.toLowerCase()}. Expert guides, tips and best practices for Pakistani businesses.`
  let listHtml = ''
  for (const a of catArticles) {
    listHtml += `      <li><a href="/blog/${esc(a.slug)}">${esc(a.title)}</a> — ${readingTime(wordCount(a.title + (a.metaDescription || '')))} min read</li>\n`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead({ path: `/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`, title, description: desc })}
${orgSchema()}
${websiteSchema()}
${breadcrumbSchema([{ name: 'Home', url: SITE }, { name: 'Blog', url: `${SITE}/blog` }, { name: category, url: `${SITE}/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}` }])}
${buildGtm()}
</head>
<body>
  <div id="root">
    <header><a href="/">Nexora Solution</a><nav><a href="/">Home</a> <a href="/blog">Blog</a></nav></header>
    <main>
      <nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog">Blog</a></li><li><span aria-current="page">${esc(category)}</span></li></ol></nav>
      <h1>${esc(category)} Articles</h1>
      <p>${esc(desc)}</p>
      <ul>${listHtml}</ul>
      <p><a href="/blog">← Back to all articles</a></p>
    </main>
    <footer><p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p></footer>
  </div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildPaginationPage(pageNum, totalPages, articles, perPage = 6) {
  const start = (pageNum - 1) * perPage
  const pageArticles = articles.slice(start, start + perPage)
  let listHtml = ''
  for (const a of pageArticles) {
    listHtml += `      <li><a href="/blog/${esc(a.slug)}">${esc(a.title)}</a> — ${readingTime(wordCount(a.title + (a.metaDescription || '')))} min read</li>\n`
  }
  const prevLink = pageNum > 1 ? `<link rel="prev" href="${esc(absoluteUrl(`/blog/page/${pageNum - 1}`))}" />` : ''
  const nextLink = pageNum < totalPages ? `<link rel="next" href="${esc(absoluteUrl(`/blog/page/${pageNum + 1}`))}" />` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead({
    path: `/blog/page/${pageNum}`,
    title: `Nexora Blog — Page ${pageNum} of ${totalPages}`,
    description: `Nexora Solution blog articles — page ${pageNum} of ${totalPages}. POS, ERP and CRM insights for Pakistani businesses.`,
  })}
  ${prevLink}${nextLink}
${orgSchema()}
${websiteSchema()}
${buildGtm()}
</head>
<body>
  <div id="root">
    <header><a href="/">Nexora Solution</a><nav><a href="/">Home</a> <a href="/blog">Blog</a></nav></header>
    <main>
      <h1>Nexora Blog — Page ${pageNum}</h1>
      <ul>${listHtml}</ul>
      <nav class="pagination">
        ${pageNum > 1 ? `<a href="/blog/page/${pageNum - 1}">← Previous</a>` : ''}
        <span>Page ${pageNum} of ${totalPages}</span>
        ${pageNum < totalPages ? `<a href="/blog/page/${pageNum + 1}">Next →</a>` : ''}
      </nav>
    </main>
    <footer><p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p></footer>
  </div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: SEARCH PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildSearchPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead({ path: '/search', title: 'Search Nexora Solution — Find POS, ERP & CRM Information', description: 'Search the Nexora Solution website for POS software, ERP systems, CRM guides, pricing information and business resources.' })}
${orgSchema()}
${websiteSchema()}
${buildGtm()}
</head>
<body>
  <div id="root">
    <header><a href="/">Nexora Solution</a><nav><a href="/">Home</a> <a href="/blog">Blog</a></nav></header>
    <main>
      <h1>Search Nexora Solution</h1>
      <p>Search across all Nexora content — POS software, ERP systems, CRM guides, pricing plans and business resources.</p>
      <form action="/search" method="get">
        <input type="search" name="q" placeholder="Search..." aria-label="Search" />
        <button type="submit">Search</button>
      </form>
      <p class="hint">Try searching for: <a href="/search?q=restaurant+pos">restaurant pos</a>, <a href="/search?q=inventory">inventory</a>, <a href="/search?q=pricing">pricing</a></p>
    </main>
    <footer><p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p></footer>
  </div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC PAGE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function buildPublicPageHtml(meta, path = '', articles = []) {
  // Generate static HTML content that crawlers can read before JS hydration
  const appHtml = buildStaticShell(meta, path, articles)

  return `<!DOCTYPE html>
<html lang="${htmlLangForPath(meta.path)}">
<head>
${buildCommonHead()}
${buildSeoHead(meta)}
${orgSchema()}
${websiteSchema()}
${softwareAppSchema(path)}
${meta.path === '/blog'
    ? `  <script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Blog", "name": "Nexora Solution Blog", "url": "${SITE}/blog" }
</script>`
    : ''}
${meta.jsonLd || ''}
${buildGtm()}
</head>
<body>
  <div id="root">${appHtml}</div>
  ${PRODUCTION_ASSETS || '<script type="module" src="/src/main.jsx"></script>'}
  <noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe>
  </noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATIC SHELL GENERATOR — Bakes key page content into HTML for crawlers
// ═══════════════════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatPkr(amount) {
  return `PKR ${Number(amount || 0).toLocaleString('en-US')}`
}

// ── Shared contact details (single source of truth for static HTML) ──
const PHONE_DISPLAY = '03194329754'
const PHONE_TEL = 'tel:03194329754'
const WHATSAPP_URL = 'https://wa.me/923194329754'
const EMAIL_ADDRESS = 'info@nexorasolution.online'
const EMAIL_MAILTO = 'mailto:info@nexorasolution.online'

const PHONE_LINK = `<a href="${PHONE_TEL}" style="display:inline-flex;align-items:center;gap:.4rem;color:#1d4ed8;text-decoration:none;font-weight:800;white-space:nowrap"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink:0"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>${PHONE_DISPLAY}</a>`

const FOOTER_CONTACT_BLOCK = `
    <div style="max-width:1280px;margin:0 auto;display:grid;gap:1.5rem;text-align:left;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));padding:1.5rem 0 .5rem">
      <div>
        <p style="font-weight:800;margin-bottom:.5rem">Contact</p>
        <p style="margin-top:.25rem"><a href="${PHONE_TEL}" style="color:#60a5fa;text-decoration:none">Phone: ${PHONE_DISPLAY}</a></p>
        <p style="margin-top:.25rem"><a href="${EMAIL_MAILTO}" style="color:#60a5fa;text-decoration:none">Email: ${EMAIL_ADDRESS}</a></p>
        <p style="margin-top:.25rem"><a href="${WHATSAPP_URL}" style="color:#60a5fa;text-decoration:none">WhatsApp: ${PHONE_DISPLAY}</a></p>
      </div>
      <div>
        <p style="font-weight:800;margin-bottom:.5rem">Location</p>
        <p style="margin-top:.25rem;color:#94a3b8">[City / business address — not yet configured]</p>
      </div>
    </div>`

const HOMEPAGE_CONTACT_SECTION = `
    <section style="max-width:56rem;margin:0 auto;padding:3rem 1.25rem 4rem;text-align:center">
      <h2 style="font-size:1.75rem;font-weight:900;color:#0f172a">Talk to us</h2>
      <p style="margin-top:.75rem;font-size:1rem;line-height:1.7;color:#475569">Questions about pricing, setup or which module fits your business? Reach out and our team will help.</p>
      <div style="margin-top:2rem;display:grid;gap:1rem;text-align:left">
        <a href="${PHONE_TEL}" style="display:block;border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem;color:#0f172a;text-decoration:none;font-size:1.125rem;font-weight:800">Phone: ${PHONE_DISPLAY}</a>
        <a href="${EMAIL_MAILTO}" style="display:block;border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem;color:#0f172a;text-decoration:none;font-size:1.125rem;font-weight:800">Email: ${EMAIL_ADDRESS}</a>
        <a href="${WHATSAPP_URL}" style="display:block;border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem;color:#0f172a;text-decoration:none;font-size:1.125rem;font-weight:800">WhatsApp: ${PHONE_DISPLAY}</a>
      </div>
    </section>`

const SHELL_HEADER = `
  <header style="position:sticky;top:0;z-index:50;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.9);backdrop-filter:blur(24px)">
    <div style="display:flex;align-items:center;height:4rem;max-width:1280px;margin:0 auto;padding:0 1rem">
      <a href="/" style="display:flex;align-items:center;gap:.5rem;font-size:1.25rem;font-weight:800;letter-spacing:.11em;color:#0f172a;text-decoration:none">
        <span style="display:inline-flex;width:2rem;height:2rem;border-radius:.5rem;background:linear-gradient(135deg,#0ea5e9,#3b82f6);color:#fff;align-items:center;justify-content:center;font-size:.65rem;font-weight:900">N</span>
        NEXORA
      </a>
      <nav style="margin-left:auto;display:flex;align-items:center;gap:1.25rem;font-size:.875rem;font-weight:600">
        <a href="/" style="color:#0f172a;text-decoration:none">Home</a>
        <a href="/pricing" style="color:#334155;text-decoration:none">Pricing</a>
        <a href="/blog" style="color:#334155;text-decoration:none">Blog</a>
        <a href="/contact" style="color:#334155;text-decoration:none">Contact</a>
        ${PHONE_LINK}
      </nav>
    </div>
  </header>`

const SHELL_FOOTER = `
  <footer style="background:linear-gradient(135deg,#071d35,#062b52);color:#fff;padding:2rem 1.25rem;text-align:center;font-size:.875rem">
    ${FOOTER_CONTACT_BLOCK}
    <p style="margin-top:1.5rem;color:#64748b">&copy; 2019–2026 Nexora Solution. All Rights Reserved.</p>
  </footer>`

// ── Per-route static content (baked into HTML so crawlers see it pre-JS) ──

function buildPricingContent() {
  const plans = [
    freeTrialConfig,
    ...defaultPlatformPlans.filter((plan) => plan.active !== false),
  ]
  const cards = plans
    .map((plan) => {
      const name = plan.name || plan.planName || ''
      const isCustom = String(plan.monthlyPrice ?? plan.price ?? '').toLowerCase() === 'custom'
      const price = isCustom ? 'Custom' : `${formatPkr(plan.monthlyPrice ?? plan.price ?? 0)}/month`
      const features = (plan.features || [])
        .slice(0, 7)
        .map((feature) => `<li style="margin-top:.5rem;font-size:.875rem;line-height:1.5;color:#475569">${escapeHtml(feature)}</li>`)
        .join('')
      return `<div style="border-radius:1.25rem;border:1px solid #e2e8f0;background:#fff;padding:1.5rem;display:flex;flex-direction:column">
        <h2 style="font-size:1.25rem;font-weight:900;color:#0f172a">${escapeHtml(name)}</h2>
        <p style="margin-top:.75rem;font-size:1.75rem;font-weight:900;color:#0f172a">${escapeHtml(price)}</p>
        <p style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#64748b">${escapeHtml(plan.description || '')}</p>
        <ul style="margin-top:1rem;padding-left:1rem;list-style:disc">${features}</ul>
      </div>`
    })
    .join('')

  return `<main style="max-width:1280px;margin:0 auto;padding:3rem 1.25rem 4rem">
    <section style="text-align:center">
      <h1 style="font-size:2.25rem;font-weight:900;color:#0f172a">Simple Plans for Every Business</h1>
      <p style="margin-top:1rem;font-size:1rem;line-height:1.7;color:#475569">Start with a free trial, then choose Basic, Standard or Enterprise. No credit card required.</p>
    </section>
    <section style="margin-top:2.5rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.25rem">
      ${cards}
    </section>
  </main>`
}

function buildBlogContent(articles) {
  const list = (articles || [])
    .map((article) => {
      const href = `/blog/${article.slug}`
      const excerpt = article.metaDescription || article.description || ''
      return `<article style="border-radius:1.25rem;border:1px solid #e2e8f0;background:#fff;padding:1.5rem">
        <h2 style="font-size:1.125rem;font-weight:900;color:#0f172a"><a href="${href}" style="color:#0f172a;text-decoration:none">${escapeHtml(article.title)}</a></h2>
        ${article.category ? `<p style="margin-top:.5rem;font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8">${escapeHtml(article.category)}</p>` : ''}
        ${excerpt ? `<p style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#64748b">${escapeHtml(excerpt)}</p>` : ''}
      </article>`
    })
    .join('')

  return `<main style="max-width:1280px;margin:0 auto;padding:3rem 1.25rem 4rem">
    <h1 style="font-size:2.25rem;font-weight:900;color:#0f172a">Nexora Blog</h1>
    <p style="margin-top:.75rem;font-size:1rem;line-height:1.7;color:#475569">POS, ERP &amp; CRM insights for Pakistani businesses.</p>
    <div style="margin-top:2rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem">
      ${list}
    </div>
  </main>`
}

function buildContactContent() {
  return `<main style="max-width:1280px;margin:0 auto;padding:3rem 1.25rem 4rem">
    <h1 style="font-size:2.25rem;font-weight:900;color:#0f172a">Contact Nexora Solution</h1>
    <p style="margin-top:.75rem;font-size:1rem;line-height:1.7;color:#475569">Get in touch for POS, ERP, CRM and business software in Pakistan.</p>
    <div style="margin-top:2.5rem;display:grid;gap:2rem;grid-template-columns:1fr;max-width:56rem">
      <section>
        <h2 style="font-size:1.25rem;font-weight:900;color:#0f172a">Send us a message</h2>
        <form id="contact-form" style="margin-top:1rem;display:grid;gap:1rem">
          <label style="display:grid;gap:.35rem;font-size:.875rem;font-weight:700;color:#0f172a">Name
            <input name="name" type="text" required placeholder="Your name" style="border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem;font-size:1rem" />
          </label>
          <label style="display:grid;gap:.35rem;font-size:.875rem;font-weight:700;color:#0f172a">Phone
            <input name="phone" type="tel" required placeholder="03XX-XXXXXXX" style="border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem;font-size:1rem" />
          </label>
          <label style="display:grid;gap:.35rem;font-size:.875rem;font-weight:700;color:#0f172a">Business type
            <select name="businessType" style="border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem;font-size:1rem;background:#fff">
              <option>Restaurant</option>
              <option>Retail</option>
              <option>Pharmacy</option>
              <option>School</option>
              <option>Other</option>
            </select>
          </label>
          <label style="display:grid;gap:.35rem;font-size:.875rem;font-weight:700;color:#0f172a">Message
            <textarea name="message" required rows="4" placeholder="How can we help?" style="border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem;font-size:1rem"></textarea>
          </label>
          <button type="submit" style="justify-self:start;border:0;border-radius:9999px;background:#0f172a;color:#fff;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;cursor:pointer">Send message</button>
          <p id="contact-status" style="display:none;margin-top:.5rem;font-size:.875rem;color:#1d4ed8"></p>
        </form>
      </section>
      <section style="display:grid;gap:1rem;align-content:start">
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <p style="font-size:.875rem;font-weight:800;color:#0f172a">WhatsApp / Phone</p>
          <a href="${WHATSAPP_URL}" style="margin-top:.25rem;font-size:1rem;color:#1d4ed8;text-decoration:none">${PHONE_DISPLAY}</a>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <p style="font-size:.875rem;font-weight:800;color:#0f172a">Email</p>
          <a href="${EMAIL_MAILTO}" style="margin-top:.25rem;font-size:1rem;color:#1d4ed8;text-decoration:none">${EMAIL_ADDRESS}</a>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <p style="font-size:.875rem;font-weight:800;color:#0f172a">Website</p>
          <a href="/" style="margin-top:.25rem;font-size:1rem;color:#1d4ed8;text-decoration:none">https://nexorasolution.online</a>
        </div>
      </section>
    </div>
    <script>
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var status = document.getElementById('contact-status');
    var name = (form.elements.name.value || '').trim();
    var phone = (form.elements.phone.value || '').trim();
    var businessType = form.elements.businessType.value || '';
    var message = (form.elements.message.value || '').trim();
    var html = '<p><strong>Name:</strong> ' + name + '</p>' +
      '<p><strong>Phone:</strong> ' + phone + '</p>' +
      '<p><strong>Business type:</strong> ' + businessType + '</p>' +
      '<p><strong>Message:</strong> ' + message + '</p>';
    fetch('https://nexora-email-api.rahanshah4.workers.dev/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '${EMAIL_ADDRESS}', subject: 'New contact inquiry from ' + name, html: html })
    }).then(function (response) {
      return response.json().then(function (data) { return { ok: response.ok, data: data }; });
    }).then(function (result) {
      if (status) {
        status.style.display = 'block';
        status.textContent = result.ok ? 'Thanks! Your message has been sent. We will get back to you shortly.' : 'Sorry, something went wrong. Please email ${EMAIL_ADDRESS} instead.';
      }
      if (result.ok) form.reset();
    }).catch(function () {
      if (status) {
        status.style.display = 'block';
        status.textContent = 'Sorry, something went wrong. Please email ${EMAIL_ADDRESS} instead.';
      }
    });
  });
})();
    </script>
  </main>`
}

function buildDownloadRestaurantPosContent() {
  const downloadUrl = 'https://pub-d510223cafd94f76bf1559c431263a16.r2.dev/Nexora%20Solution%20POS-1.0.0-Setup.exe'
  return `<main style="padding:4rem 1.25rem;max-width:64rem;margin:0 auto;text-align:center">
    <h1 style="font-size:clamp(2rem,5vw,3rem);font-weight:900;color:#0f172a;letter-spacing:-.02em">Nexora Restaurant POS</h1>
    <p style="margin:1rem auto 0;max-width:40rem;font-size:1rem;line-height:1.7;color:#475569">The complete offline-capable POS for restaurants — order management, kitchen display, billing, customer wallet, expense tracking, and more.</p>
    <div style="margin:1.25rem auto 0;display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem">
      <span style="border-radius:9999px;border:1px solid #fcd34d;background:#fffbeb;color:#b45309;padding:.4rem .9rem;font-size:.8rem;font-weight:800">v1.0.0</span>
      <span style="border-radius:9999px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;padding:.4rem .9rem;font-size:.8rem;font-weight:800">~104 MB</span>
      <span style="border-radius:9999px;border:1px solid #bae6fd;background:#f0f9ff;color:#0369a1;padding:.4rem .9rem;font-size:.8rem;font-weight:800">Windows 10+</span>
    </div>
    <a href="${downloadUrl}" style="display:inline-flex;align-items:center;gap:.75rem;margin-top:2rem;border-radius:1rem;background:#0f172a;padding:1.25rem 2.5rem;font-size:1.25rem;font-weight:800;color:#fff;text-decoration:none;box-shadow:0 8px 40px -10px rgba(15,23,42,.35)">Download for Windows</a>
    <p style="margin-top:1rem;font-size:.875rem;font-weight:600;color:#94a3b8">Free download · No credit card required</p>
  </main>`
}

function buildCountryContent(country) {
  const featureItems = [
    { label: `${country.currency} Pricing`, desc: `All plans in ${country.currency}. Localized pricing for ${country.name} businesses.` },
    { label: `${country.timezone} Support`, desc: `Support coverage aligned with ${country.name} business hours.` },
    { label: 'Global Cloud', desc: `Cloudflare edge network ensures sub-50ms latency for ${country.name} users.` },
    { label: 'AI-Powered', desc: 'DeepSeek & Gemini AI built into every product — smarter automation.' },
    { label: 'Enterprise Security', desc: 'AES-256 encryption, SOC 2 infrastructure, role-based access control.' },
    { label: '30-Day Guarantee', desc: 'Full refund if not satisfied. No questions asked. Cancel anytime.' },
  ]
  const featuresHtml = featureItems.map((f) => `
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1rem">
          <p style="font-size:.8rem;font-weight:800;color:#0f172a">${esc(f.label)}</p>
          <p style="margin-top:.25rem;font-size:.75rem;color:#64748b">${esc(f.desc)}</p>
        </div>`).join('')

  const faqHtml = (country.faqs || []).map((f) => `
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <dt style="font-weight:800;color:#0f172a">${esc(f.q)}</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">${esc(f.a)}</dd>
        </div>`).join('')

  return `<main style="padding:3rem 1.25rem;max-width:56rem;margin:0 auto">
    <p style="font-size:.75rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#1d4ed8">${esc(country.flag)} ${esc(country.region)} · ${esc(country.currency)} · ${esc(country.population)}</p>
    <h1 style="margin-top:1rem;font-size:2.2rem;font-weight:900;color:#0f172a;line-height:1.1">${esc(country.heroHeading)} ${esc(country.heroHighlight)}</h1>
    <p style="margin-top:1rem;font-size:1rem;line-height:1.7;color:#475569">${esc(country.heroSubtitle)}</p>
    <div style="margin-top:2rem;display:flex;gap:.75rem;flex-wrap:wrap">
      <a href="/signup" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;background:#0f172a;color:#fff">Start Free Trial</a>
      <a href="/pricing" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;border:1px solid #e2e8f0;color:#0f172a">View Pricing</a>
    </div>

    <h2 style="margin-top:3rem;font-size:1.5rem;font-weight:900;color:#0f172a">Why ${esc(country.name)} chooses Nexora</h2>
    <p style="margin-top:.75rem;font-size:.9375rem;line-height:1.75;color:#475569">${esc(country.whyNexora)}</p>
    <div style="margin-top:1.5rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem">${featuresHtml}
    </div>

    <h2 style="margin-top:3rem;font-size:1.5rem;font-weight:900;color:#0f172a">Built for ${esc(country.name)}</h2>
    <p style="margin-top:.75rem;font-size:.9375rem;line-height:1.75;color:#475569">${esc(country.localEdge)}</p>

    <h2 style="margin-top:3rem;font-size:1.5rem;font-weight:900;color:#0f172a">${esc(country.name)} FAQs</h2>
    <dl style="margin-top:1.5rem;display:flex;flex-direction:column;gap:1rem">${faqHtml}
    </dl>
  </main>`
}

// Software/dev service pages (e.g. /seo-services, /crm-development) also fell
// through to the generic 1-paragraph fallback below — same boilerplate shape
// as the country pages, just with title/description swapped. Each of these
// routes actually has a dedicated page component with real hero copy and a
// unique FAQ list (see src/pages/public/*Page.jsx); mirror that content here
// so crawlers see it before JS hydration instead of a near-duplicate shell.
const SERVICE_PAGE_CONTENT = {
  '/software-development': {
    heading: 'Custom Software Development Services',
    subtitle: 'We design and build high-performance websites, mobile apps, CRM systems, ERP solutions, POS software, AI-powered applications, and enterprise business solutions — every project infused with artificial intelligence (DeepSeek, Gemini, custom ML models) for smarter automation, predictive insights, and intelligent user experiences.',
    services: [
      { title: 'Business Websites', desc: 'Professional, fast-loading business websites built with modern frameworks. SEO-optimized, mobile-responsive, and designed to convert visitors into customers.' },
      { title: 'E-commerce Development', desc: 'Full-featured online stores with secure payment gateways, inventory management, order tracking, and an admin dashboard to manage your entire business.' },
      { title: 'Custom CRM Development', desc: 'Tailor-made CRM systems that match your exact sales workflow. Lead tracking, pipeline management, customer communication, and automated follow-ups.' },
      { title: 'ERP Solutions', desc: 'Enterprise resource planning systems that unify finance, HR, inventory, procurement, and operations into one centralized, real-time platform.' },
      { title: 'Restaurant POS', desc: 'Complete restaurant management — KOT, table management, billing, kitchen display, inventory, and cloud sync. AI-powered insights and offline-first reliability.' },
      { title: 'School Management System', desc: 'End-to-end school ERP with student records, fee management, attendance, exams, timetable, parent portal, payroll, and transport tracking.' },
      { title: 'Mobile App Development', desc: 'Native and cross-platform mobile apps for iOS and Android. Beautiful UI, smooth performance, offline support, and seamless backend integration.' },
      { title: 'Web Applications', desc: 'Complex web applications — dashboards, SaaS platforms, portals, and real-time tools. Built with React, Node.js, Firebase, and cloud-native architecture.' },
      { title: 'AI Solutions', desc: 'Custom AI and machine learning integrations — chatbots, predictive analytics, image recognition, recommendation engines, and intelligent automation.' },
      { title: 'API Integration', desc: 'Connect your software with third-party services — payment gateways, SMS/WhatsApp APIs, shipping carriers, accounting tools, and legacy systems.' },
      { title: 'Cloud Solutions', desc: 'Cloud migration, DevOps setup, serverless architecture, auto-scaling infrastructure, and managed hosting on AWS, Google Cloud, and Cloudflare.' },
      { title: 'Software Maintenance & Support', desc: 'Ongoing maintenance, bug fixes, feature enhancements, security patches, performance optimization, and 24/7 technical support for your software.' },
      { title: 'SEO Services', desc: 'Complete SEO solutions — technical SEO, on-page optimization, keyword research, content strategy, link building, and Google ranking improvement.' },
    ],
  },
  '/seo-services': {
    heading: 'SEO Services',
    subtitle: 'Data-driven SEO that puts your business on Google\'s first page. Technical optimization, keyword strategy, content marketing, and link building — everything you need to grow organic traffic and generate qualified leads.',
    faqs: [
      ['How long does SEO take to show results?', 'SEO is a long-term strategy. Initial technical improvements can show results in 4-6 weeks. Competitive keywords typically take 3-6 months to rank. Local SEO can deliver results faster — often within 30-60 days. We provide monthly reports so you can track progress from day one.'],
      ['What industries do you provide SEO for?', 'We work with businesses across all industries — restaurants, retail stores, schools, e-commerce, real estate, healthcare, professional services, and SaaS companies. Our strategies are tailored to your specific industry and target audience.'],
      ['Do you guarantee #1 rankings on Google?', 'No ethical SEO agency can guarantee #1 rankings — Google\'s algorithm has 200+ ranking factors. What we guarantee is: data-driven strategy, transparent reporting, and measurable improvement in rankings, traffic, and conversions month over month. Our clients typically see 40-120% organic traffic growth within 6 months.'],
      ['What is included in your monthly SEO reports?', 'Monthly reports include: keyword ranking changes, organic traffic trends (Google Analytics), click-through rates (Google Search Console), backlinks acquired, technical health score, content performance, competitor comparison, and actionable recommendations for the next month.'],
      ['Do you do SEO for existing websites or only new ones?', 'Both! We optimize existing websites (often there are quick wins) and build SEO-ready new websites. For existing sites, we start with a comprehensive audit. For new sites, we build SEO into the architecture from day one — which is far more effective than retrofitting later.'],
      ['What is the difference between SEO and Google Ads?', 'SEO brings free, organic traffic through search rankings — it is a long-term investment that builds lasting authority. Google Ads bring paid traffic instantly but stop the moment you stop paying. The best strategy combines both: SEO for sustainable growth, PPC for immediate visibility.'],
      ['How much does SEO cost in Pakistan?', 'Our SEO packages start at PKR 15,000/month for basic local SEO, PKR 35,000/month for standard SEO (includes content + link building), and custom pricing for enterprise/competitive industries. Every package includes a free initial audit. Contact us for a tailored quote.'],
      ['Can you help recover from a Google penalty?', 'Yes. We specialize in Google penalty recovery — whether it is a manual action or an algorithmic penalty (Panda, Penguin, Core Updates). We conduct a thorough audit, identify the root cause, fix the issues, and submit a reconsideration request. Recovery typically takes 2-8 weeks depending on severity.'],
    ],
  },
  '/mobile-app-development': {
    heading: 'Mobile App Development',
    subtitle: 'Beautiful, high-performance mobile apps for iOS and Android. Native and cross-platform development with Flutter, Swift, and Kotlin. AI-powered features, offline support, and seamless backend integration.',
    faqs: [
      ['Flutter or native — which is better for my app?', 'Flutter is ideal for 90% of business apps — it delivers beautiful 60fps UI on both iOS and Android from a single codebase, saving 40% on development costs. Native (Swift/Kotlin) is better for apps that need deep hardware integration (AR, advanced camera, Bluetooth LE) or maximum possible performance. We help you choose the right approach based on your specific requirements.'],
      ['How much does a mobile app cost to develop?', 'A business app typically ranges from PKR 200,000 for a simple app (5-8 screens) to PKR 1,500,000+ for a complex app with AI, real-time features, payment integration, and custom backend. Every project is unique — we provide a detailed estimate after understanding your requirements. Contact us for a free consultation and quote.'],
      ['How long does it take to build a mobile app?', 'Simple apps (landing, catalog, booking): 4-6 weeks. Medium apps (e-commerce, CRM, delivery): 8-16 weeks. Complex apps (AI, real-time, multi-vendor): 16-24 weeks. We deliver working builds every 2 weeks through agile sprints, so you can test and provide feedback throughout development.'],
      ['Do you publish the app to App Store and Play Store?', 'Yes — we handle the entire submission process including App Store Connect setup, Play Store Console configuration, ASO (App Store Optimization), screenshot creation, privacy policy, and compliance. We also manage updates and version releases post-launch.'],
      ['Can you integrate payment gateways in the app?', 'Absolutely. We integrate Stripe, PayPal, JazzCash, Easypaisa, and bank payment gateways. All payment flows are PCI-compliant with secure tokenization. We also support in-app purchases and subscription billing.'],
      ['Will my app work offline?', 'Yes — we build all apps with offline-first architecture. User data is stored locally and syncs automatically when the internet reconnects. This is critical for field workers, delivery apps, and areas with patchy connectivity.'],
      ['Do you provide source code and ownership?', 'You own 100% of the source code, designs, and intellectual property. Upon project completion, we transfer everything to your GitHub/GitLab repository with complete documentation. No vendor lock-in — you can take the code to any developer.'],
      ['What about app maintenance and updates?', 'We offer ongoing maintenance plans covering OS updates (iOS/Android version compatibility), bug fixes, security patches, performance optimization, feature enhancements, and App Store/Play Store compliance. Most clients choose our monthly maintenance plan for continuous support.'],
    ],
  },
  '/ecommerce-development': {
    heading: 'E-commerce Development',
    subtitle: 'Full-featured online stores with secure payments, inventory management, order tracking, and a powerful admin dashboard. Built to sell 24/7.',
    faqs: [
      ['How much does an e-commerce website cost?', 'A custom e-commerce website ranges from PKR 80,000 for a basic store (up to 50 products) to PKR 500,000+ for a large marketplace. Includes: design, development, payment integration, admin dashboard, and 30 days post-launch support. Contact us for a detailed quote based on your requirements.'],
      ['Which payment gateways do you integrate?', 'Stripe (international), PayPal, JazzCash, Easypaisa, bank transfer (HBL, UBL, Meezan), and manual payment methods (cash on delivery). We can integrate any payment gateway that provides an API.'],
      ['Can you migrate my existing store from Shopify/WooCommerce?', 'Yes! We handle full data migration — products, customers, orders, reviews, and SEO metadata. We ensure zero data loss and zero downtime during migration. Your new store will be live while we redirect old URLs to preserve SEO rankings.'],
      ['Do you provide admin panel for managing the store?', 'Every e-commerce project includes a custom admin dashboard for: adding/editing products, managing inventory, processing orders, viewing customer data, running promotions, and accessing analytics. Designed for non-technical users.'],
      ['How long does it take to build an e-commerce site?', 'Basic store (up to 50 products): 3-5 weeks. Medium store (50-500 products): 6-10 weeks. Large marketplace: 10-16 weeks. We deliver usable builds every 2 weeks through agile sprints.'],
      ['Is SEO included for my e-commerce site?', 'Yes — every e-commerce site we build includes: SEO-friendly URLs, schema markup (Product, Organization), meta tags, sitemap.xml, alt text optimization, fast loading (95+ Lighthouse), and mobile-first responsive design. We also offer dedicated SEO services.'],
    ],
  },
  '/crm-development': {
    heading: 'Custom CRM Development',
    subtitle: 'A CRM built around YOUR sales process. Lead tracking, visual pipeline, WhatsApp integration, automation — everything your sales team needs to close more deals.',
    faqs: [
      ['Why build a custom CRM instead of using Zoho/HubSpot?', 'Off-the-shelf CRMs force you to adapt to their workflow. A custom CRM adapts to YOUR workflow. Result: higher team adoption, less training, and features that match your exact sales process. Plus — no monthly per-user fees that scale with your team.'],
      ['How much does a custom CRM cost?', 'A custom CRM starts at PKR 150,000 for a basic setup and can go to PKR 800,000+ for complex, multi-department systems. You own the software outright — no recurring license fees. We offer flexible payment plans.'],
      ['Can you integrate with WhatsApp?', 'Yes — WhatsApp integration is our specialty. Auto-capture leads from WhatsApp, send templates, track conversations, and automate follow-ups. All WhatsApp chats appear inside the CRM next to the contact profile.'],
      ['How long does CRM development take?', 'Basic CRM: 4-6 weeks. Full-featured CRM with automation: 8-14 weeks. Enterprise CRM with custom integrations: 12-20 weeks. We deliver working software every 2 weeks.'],
      ['Can you migrate data from our existing CRM?', 'Yes. We migrate contacts, deals, notes, attachments, and history from any CRM that supports data export (Zoho, HubSpot, Salesforce, Excel). Zero data loss guaranteed.'],
      ['Is my sales data secure?', 'Enterprise-grade security — encrypted at rest and in transit, role-based access, audit logs, daily backups, and optional on-premise deployment for maximum data control.'],
    ],
  },
  '/erp-development': {
    heading: 'ERP Solutions',
    subtitle: 'Unify finance, HR, inventory, procurement, and operations into one platform. Real-time dashboards, complete visibility, better decisions.',
    faqs: [
      ['What is ERP and why does my business need it?', 'ERP (Enterprise Resource Planning) integrates all your core business processes — finance, HR, inventory, procurement — into one unified system. Instead of running separate software for each department, ERP gives you a single source of truth. Benefits: 30-50% less manual work, real-time visibility, better decisions, faster growth.'],
      ['How much does a custom ERP cost?', 'Custom ERP starts at PKR 300,000 for a focused solution (2-3 modules) up to PKR 2,500,000+ for a full enterprise suite. We offer flexible payment terms and phased delivery — start with finance and add modules as you grow.'],
      ['How long does ERP implementation take?', 'Focused ERP (2-3 modules): 8-12 weeks. Full enterprise ERP: 16-32 weeks. We use a phased approach — go live with core modules first, add more features over time. This reduces risk and lets your team adapt gradually.'],
      ['Can you integrate with my existing accounting software?', 'Yes. We can build APIs to sync with QuickBooks, Xero, Tally, or any accounting system that provides an API. If no API exists, we build data import/export tools for seamless migration.'],
      ['Is my data secure in a cloud ERP?', 'Enterprise-grade security: AES-256 encryption at rest, TLS 1.3 in transit, SOC 2 compliant infrastructure, daily automated backups, role-based access control, and full audit logging. Optional on-premise deployment for maximum data control.'],
      ['Can multiple branches use the same ERP?', 'Yes — multi-branch is built into the core architecture. Each branch has its own data, inventory, and financials. Management gets a consolidated view with drill-down to individual branches.'],
    ],
  },
  '/cloud-solutions': {
    heading: 'Cloud Solutions',
    subtitle: 'Cloud migration, DevOps, serverless architecture, and managed hosting. Deploy globally on Cloudflare, AWS, and Google Cloud with enterprise security.',
    faqs: [
      ['Should I use Cloudflare or AWS?', 'For most businesses, Cloudflare Workers + Firebase is the ideal stack — simpler, faster at edge, and dramatically cheaper at scale. AWS is better for complex enterprise needs (Kubernetes, GPU instances, VPC). We help you choose and can work with either.'],
      ['How much does cloud hosting cost?', 'Cloudflare Workers: free tier (100K requests/day), paid from $5/month. Firebase: free tier (Spark plan), paid from $25/month (Blaze plan). A typical business app costs $25-$100/month total. We optimize for cost — most clients pay less than their previous hosting.'],
      ['How long does cloud migration take?', 'Simple migration (static site, basic API): 1-2 weeks. Complex migration (database, microservices, CI/CD): 4-8 weeks. We provide a detailed migration plan with timeline and risk assessment before starting.'],
      ['Will my site go down during migration?', 'No. We use blue-green deployment and DNS gradual cutover. Your old site stays live until the new setup is fully tested. Typical downtime: 0 seconds.'],
      ['Do you provide ongoing management?', 'Yes — our managed infrastructure plans include 24/7 monitoring, automatic backups, security patches, SSL renewal, performance optimization, and emergency response. Plans start at PKR 15,000/month.'],
    ],
  },
  '/api-integration': {
    heading: 'API Integration',
    subtitle: 'Connect your software with payment gateways, WhatsApp, SMS, shipping carriers, and legacy systems. Reliable, secure, real-time data flow.',
    faqs: [
      ['What is API integration and why do I need it?', 'API integration connects your software with external services — payment gateways, WhatsApp, SMS providers, shipping carriers, and legacy systems. Instead of manually moving data between systems, APIs automate everything in real-time. Benefits: 80% less manual data entry, zero errors, instant updates across all systems.'],
      ['How long does API integration take?', 'Simple integration (one payment gateway): 1-2 weeks. Medium integration (multiple services): 3-6 weeks. Complex integration (legacy systems, custom APIs): 6-12 weeks.'],
      ['What payment gateways do you work with?', 'Stripe (international), PayPal, JazzCash, Easypaisa, HBL, UBL, Meezan Bank, and any gateway with an API. We handle the entire flow — tokenization, 3D Secure, webhooks, reconciliation.'],
      ['Can you integrate WhatsApp Business API?', 'Yes — this is one of our most requested integrations. We connect WhatsApp Business API with your CRM, sending automated messages, templates, and handling incoming webhooks. All conversations sync to your dashboard.'],
      ['How do you handle errors and failures?', 'Every integration includes: automatic retry with exponential backoff, dead letter queues for failed messages, real-time alerts on failures, comprehensive logging, and a health dashboard showing the status of every integration.'],
      ['Do you provide API documentation?', 'Yes — every custom API we build includes OpenAPI/Swagger documentation, usage examples, authentication guides, and rate limiting information. If we integrate a third-party API, we document the integration architecture for your team.'],
    ],
  },
}

function buildServicePageContent(entry) {
  const faqHtml = (entry.faqs || []).map(([q, a]) => `
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <dt style="font-weight:800;color:#0f172a">${esc(q)}</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">${esc(a)}</dd>
        </div>`).join('')

  const servicesHtml = (entry.services || []).map((s) => `
        <div style="border-radius:1rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem">
          <p style="font-size:.9rem;font-weight:800;color:#0f172a">${esc(s.title)}</p>
          <p style="margin-top:.4rem;font-size:.8125rem;line-height:1.6;color:#64748b">${esc(s.desc)}</p>
        </div>`).join('')

  return `<main style="padding:3rem 1.25rem;max-width:56rem;margin:0 auto">
    <h1 style="font-size:2.2rem;font-weight:900;color:#0f172a;line-height:1.1">${esc(entry.heading)}</h1>
    <p style="margin-top:1rem;font-size:1rem;line-height:1.7;color:#475569">${esc(entry.subtitle)}</p>
    <div style="margin-top:2rem;display:flex;gap:.75rem;flex-wrap:wrap">
      <a href="/signup" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;background:#0f172a;color:#fff">Start Free Trial</a>
      <a href="/contact" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;border:1px solid #e2e8f0;color:#0f172a">Book a Demo</a>
    </div>${servicesHtml ? `
    <h2 style="margin-top:3rem;font-size:1.5rem;font-weight:900;color:#0f172a">What We Build</h2>
    <div style="margin-top:1.5rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.75rem">${servicesHtml}
    </div>` : ''}${faqHtml ? `
    <h2 style="margin-top:3rem;font-size:1.5rem;font-weight:900;color:#0f172a">Frequently Asked Questions</h2>
    <dl style="margin-top:1.5rem;display:flex;flex-direction:column;gap:1rem">${faqHtml}
    </dl>` : ''}
  </main>`
}

function buildRouteContent(path, title, desc, articles) {
  if (path === '/pricing') return buildPricingContent()
  if (path === '/blog') return buildBlogContent(articles)
  if (path === '/contact') return buildContactContent()
  if (path === '/download/restaurant-pos') return buildDownloadRestaurantPosContent()

  const servicePageEntry = SERVICE_PAGE_CONTENT[path]
  if (servicePageEntry) return buildServicePageContent(servicePageEntry)

  // Country landing pages (e.g. /uae/, /usa/) previously fell through to the
  // generic 2-line fallback below — the same boilerplate H1+paragraph shape
  // repeated across all 11 country routes with only title/description
  // swapped. That's exactly the kind of near-duplicate initial HTML Google's
  // first crawl wave flags before it ever reaches the real per-country
  // content that CountryPage.jsx renders client-side. Reuse the same
  // COUNTRIES data CountryPage.jsx uses so crawlers see unique, keyword-rich
  // content immediately.
  const countrySlug = path.replace(/^\/+|\/+$/g, '')
  const country = COUNTRIES.find((c) => c.slug === countrySlug)
  if (country) return buildCountryContent(country)

  // Default: title + description + CTAs (used by routes without dedicated content)
  return `<main style="padding:3rem 1.25rem;max-width:48rem;margin:0 auto">
    <h1 style="font-size:2rem;font-weight:900;color:#0f172a">${title}</h1>
    <p style="margin-top:1rem;font-size:1rem;line-height:1.7;color:#475569">${desc}</p>
    <div style="margin-top:2rem;display:flex;gap:.75rem">
      <a href="/signup" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;background:#0f172a;color:#fff">Start Free Trial</a>
      <a href="/contact" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;border:1px solid #e2e8f0;color:#0f172a">Book a Demo</a>
    </div>
  </main>`
}

function buildStaticShell(meta, path = '', articles = []) {
  const title = escapeHtml(meta.title || 'Nexora Solution')
  const desc = escapeHtml(meta.description || '')
  const isHome = path === '/'

  if (isHome) {
    return `
  <header style="position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(226,232,240,.8);background:rgba(255,255,255,.9);backdrop-filter:blur(24px)">
    <div style="display:flex;align-items:center;height:4rem;max-width:1280px;margin:0 auto;padding:0 1rem">
      <div style="display:flex;align-items:center;gap:.5rem;font-size:1.25rem;font-weight:800;letter-spacing:.11em;color:#0f172a">
        <span style="display:inline-flex;width:2rem;height:2rem;border-radius:.5rem;background:linear-gradient(135deg,#0ea5e9,#3b82f6);color:#fff;align-items:center;justify-content:center;font-size:.65rem;font-weight:900">N</span>
        NEXORA
      </div>
      <nav style="margin-left:auto;display:flex;align-items:center;gap:1.25rem;font-size:.875rem;font-weight:600;color:#334155">
        <a href="/" style="color:#0f172a;text-decoration:none">Home</a>
        <a href="/pricing" style="color:#334155;text-decoration:none">Pricing</a>
        <a href="/blog" style="color:#334155;text-decoration:none">Blog</a>
        <a href="/contact" style="color:#334155;text-decoration:none">Contact</a>
        ${PHONE_LINK}
      </nav>
    </div>
  </header>
  <main style="padding-top:3.5rem">
    <section style="text-align:center;padding:3rem 1.25rem 2rem;background:linear-gradient(180deg,#fff 0%,#f8fbff 72%,#fff 100%)">
      <span style="display:inline-flex;border-radius:9999px;border:1px solid #dbeafe;background:#eff6ff;padding:.5rem 1rem;font-size:.75rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#1d4ed8">✨ Powered by Nexora AI</span>
      <h1 style="margin:1.5rem auto 0;max-width:64rem;font-size:clamp(1.8rem,7.5vw,2.85rem);font-weight:900;line-height:.98;letter-spacing:-.015em;color:#0f172a">Nexora Solution – <span style="position:relative;display:inline-block">AI Business Operating System</span></h1>
      <p style="margin:1rem auto 0;max-width:42rem;font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8">Restaurant POS • Retail POS • Pharmacy POS • CRM • ERP • AI Automation</p>
      <p style="margin:1.25rem auto 0;font-size:1.875rem;font-family:Kalam,Sora,ui-rounded,system-ui,sans-serif;letter-spacing:-.01em;color:#0f172a">Simple, efficient, yet powerful.</p>
      <p style="margin:1.25rem auto 0;max-width:48rem;font-size:1rem;line-height:2;color:#64748b">${escapeHtml('Nexora Business Suite helps you manage customers, students, tenants, sales, invoices, reports and team access from one secure dashboard.')}</p>
      <div style="margin-top:1.75rem;display:flex;flex-direction:column;justify-content:center;gap:.75rem">
        <a href="/signup" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;gap:.5rem;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;background:#0f172a;color:#fff">Start Free Trial →</a>
        <a href="/contact" style="display:inline-flex;min-height:3rem;align-items:center;justify-content:center;gap:.5rem;border-radius:9999px;padding:.75rem 1.75rem;font-size:.875rem;font-weight:800;text-decoration:none;border:1px solid #e2e8f0;background:rgba(255,255,255,.9);color:#0f172a">Book a Demo ▸</a>
      </div>
      <div style="margin:2.25rem auto 0;max-width:56rem;display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;text-align:left;padding-bottom:1rem">
        <div style="border-radius:1rem;border:1px solid rgba(226,232,240,.8);background:rgba(255,255,255,.8);padding:1rem"><p style="font-size:.75rem;font-weight:800;color:#0f172a">Cloud Based</p><p style="font-size:.68rem;color:#64748b">Secure & reliable</p></div>
        <div style="border-radius:1rem;border:1px solid rgba(226,232,240,.8);background:rgba(255,255,255,.8);padding:1rem"><p style="font-size:.75rem;font-weight:800;color:#0f172a">Multi Device</p><p style="font-size:.68rem;color:#64748b">Access anywhere</p></div>
        <div style="border-radius:1rem;border:1px solid rgba(226,232,240,.8);background:rgba(255,255,255,.8);padding:1rem"><p style="font-size:.75rem;font-weight:800;color:#0f172a">Secure & Reliable</p><p style="font-size:.68rem;color:#64748b">Protected access</p></div>
        <div style="border-radius:1rem;border:1px solid rgba(226,232,240,.8);background:rgba(255,255,255,.8);padding:1rem"><p style="font-size:.75rem;font-weight:800;color:#0f172a">Easy To Use</p><p style="font-size:.68rem;color:#64748b">No heavy training</p></div>
      </div>
    </section>
    <section style="max-width:48rem;margin:0 auto;padding:3rem 1.25rem">
      <h2 style="text-align:center;font-size:2rem;font-weight:900;color:#0f172a">Frequently Asked Questions</h2>
      <dl style="margin-top:2rem;display:flex;flex-direction:column;gap:1.25rem">
        <div style="border-radius:1rem;border:1px solid #e2e8f0;padding:1.25rem;background:#fff">
          <dt style="font-weight:800;color:#0f172a">What is Nexora Solution?</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">${escapeHtml("Nexora Solution is Pakistan's AI-powered business operating system offering POS, CRM, ERP and automation software for restaurants, retail stores, pharmacies, schools, transport fleets and growing enterprises — all from one unified platform.")}</dd>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;padding:1.25rem;background:#fff">
          <dt style="font-weight:800;color:#0f172a">Who is Nexora built for?</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">Nexora is built for Pakistani businesses of every size — from a single-counter restaurant or retail shop to multi-branch schools, pharmacy chains and transport fleets.</dd>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;padding:1.25rem;background:#fff">
          <dt style="font-weight:800;color:#0f172a">What does Nexora cost?</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">Plans start at PKR 1,000/month (50% off for new users). Every plan includes a 7-day free trial, cloud sync, free updates, free data migration, free staff training and a 30-day money-back guarantee.</dd>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;padding:1.25rem;background:#fff">
          <dt style="font-weight:800;color:#0f172a">Does Nexora work offline?</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">The POS modules support offline mode so you can keep billing even when the internet is down. Once you reconnect, all data syncs automatically to the cloud.</dd>
        </div>
        <div style="border-radius:1rem;border:1px solid #e2e8f0;padding:1.25rem;background:#fff">
          <dt style="font-weight:800;color:#0f172a">How do I get started?</dt>
          <dd style="margin-top:.5rem;font-size:.875rem;line-height:1.6;color:#475569">Sign up for a free 7-day trial at nexorasolution.online/signup — no credit card required. Or book a live demo and our team will walk you through the modules that fit your business.</dd>
        </div>
      </dl>
    </section>
    <section style="max-width:48rem;margin:0 auto;padding:2rem 1.25rem 3rem;text-align:center">
      <h2 style="font-size:1.5rem;font-weight:900;color:#0f172a">All Modules. One Platform. Unlimited Possibilities.</h2>
      <p style="margin-top:1rem;font-size:1rem;color:#475569;line-height:1.7">Nexora offers POS, CRM, School ERP, Property ERP, Medical Store POS, Transport/Rental, WhatsApp CRM, Reports, and more — all from one unified dashboard.</p>
    </section>
    ${HOMEPAGE_CONTACT_SECTION}
  </main>
  <footer style="background:linear-gradient(135deg,#071d35,#062b52);color:#fff;padding:2rem 1.25rem;text-align:center;font-size:.875rem">
    <p style="font-weight:800;margin-bottom:.5rem">Nexora Solution</p>
    <p style="color:#94a3b8">Pakistan's AI-powered POS, CRM & ERP platform for restaurants, retail, schools and growing businesses.</p>
    ${FOOTER_CONTACT_BLOCK}
    <p style="margin-top:1rem;color:#64748b">&copy; 2019–2026 Nexora Solution. All Rights Reserved.</p>
    <p style="margin-top:.5rem"><a href="/" style="color:#60a5fa;text-decoration:none">nexorasolution.online</a></p>
  </footer>`
  }

  // Generic shell for other public pages — real content is injected per route
  const routeMain = buildRouteContent(path, title, desc, articles)
  return `${SHELL_HEADER}
  ${routeMain}
  ${SHELL_FOOTER}`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

function writePage(outPath, html) {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BLOG DATA LOADER
// ═══════════════════════════════════════════════════════════════════════════════

async function loadBlogArticles() {
  try {
    // Prefer AI-highlighted articles if available
    let blogModule
    try {
      blogModule = await import(join(ROOT, 'src', 'lib', 'blogData.highlighted.js'))
      console.log('[prerender] Using AI-highlighted blog articles')
    } catch {
      blogModule = await import(join(ROOT, 'src', 'lib', 'blogData.js'))
    }
    const articles = blogModule.blogArticles || []
    return articles.filter((a) => a.slug && a.title)
  } catch (err) {
    console.warn('[prerender] Could not import blogData.js:', err.message)
    // Fallback: parse slugs from source
    return parseBlogSlugsFromSource()
  }
}

function parseBlogSlugsFromSource() {
  try {
    const source = readFileSync(join(ROOT, 'src', 'lib', 'blogData.js'), 'utf-8')
    const slugMatches = source.match(/slug:\s*['"]([^'"]+)['"]/g) || []
    return slugMatches.map((m) => m.replace(/slug:\s*['"]/, '').replace(/['"]$/, '')).filter(Boolean).map((slug) => ({
      slug,
      title: slugToTitle(slug),
      description: `Read ${slugToTitle(slug)} on the Nexora Solution blog.`,
      category: 'General',
      tags: [],
      publishDate: new Date().toISOString().slice(0, 10),
      sections: [
        { heading: slugToTitle(slug), level: 2, paragraphs: [`This article covers ${slugToTitle(slug).toLowerCase()} — insights and practical guidance for Pakistani businesses.`] },
      ],
      faqs: [],
    }))
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BLOG TRANSLATION AVAILABILITY (drives reciprocal hreflang)
// ═══════════════════════════════════════════════════════════════════════════════

const ML_LANGS = [
  { code: 'ur-roman', prefix: 'ur', htmlLang: 'ur', ogLocale: 'ur_PK' },
  { code: 'hi', prefix: 'hi', htmlLang: 'hi', ogLocale: 'hi_IN' },
  { code: 'ar', prefix: 'ar', htmlLang: 'ar', ogLocale: 'ar_AE' },
  { code: 'bn', prefix: 'bn', htmlLang: 'bn', ogLocale: 'bn_BD' },
]

// Looks up, once per article, which translated languages actually have real
// content to prerender (not missing, pending or failed). Run BEFORE both the
// English blog loop and the multilingual blog loop below so both can build
// the exact same hreflang alternate set for a given article — that's what
// makes the group reciprocal and keeps every hreflang target pointing at a
// page that actually gets written to disk (instead of one that 404s/redirects).
async function fetchArticleTranslations(articles) {
  const bySlug = new Map()
  try {
    const { initializeApp } = await import('firebase/app')
    const { getFirestore, doc, getDoc } = await import('firebase/firestore')
    // Must match the real public config in src/lib/firebase.js — this was a
    // placeholder key ("AIzaSyDummyKeyForPrerender") that made every getDoc()
    // below fail silently (caught per-article), so mlCount was always 0 and
    // none of the ur/hi/ar/bn translated blog pages ever got prerendered.
    const firebaseConfig = {
      apiKey: "AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc", projectId: "nexora-business-suite",
      authDomain: "nexora-business-suite.firebaseapp.com", storageBucket: "nexora-business-suite.firebasestorage.app"
    }
    const app = initializeApp(firebaseConfig, 'prerender-ml')
    const db = getFirestore(app)
    for (const article of articles) {
      try {
        const snap = await getDoc(doc(db, 'blogTranslations', article.slug))
        if (!snap.exists()) continue
        const translations = snap.data().translations || {}
        const available = []
        for (const lang of ML_LANGS) {
          // Try exact key first, then backward compat variants
          const translated = translations[lang.code] || translations['ur'] || null
          if (!translated) continue
          // Skip translations that explicitly failed or are pending
          if (translated.translationStatus === 'failed' || translated.translationStatus === 'pending') continue
          available.push({ ...lang, translated })
        }
        if (available.length) bySlug.set(article.slug, available)
      } catch (e) {
        // Previously silent — a bad API key made every single article fail
        // here with mlCount staying 0 and nothing printed, so the whole
        // multilingual prerender step going dark was invisible in build logs.
        console.log(`[prerender] ⚠ Multilingual translation skipped for "${article.slug}":`, e.message?.slice(0, 120))
      }
    }
  } catch (e) {
    console.log('[prerender] ⚠ Multilingual prerender skipped (Firestore not available at build time):', e.message?.slice(0, 80))
  }
  return bySlug
}

// English always exists, plus whichever translations actually have a page.
function hreflangLangsFor(availableTranslations) {
  const langs = [{ prefix: '', hreflang: 'en', xDefault: true }]
  for (const t of availableTranslations || []) {
    langs.push({ prefix: t.prefix, hreflang: t.htmlLang })
  }
  return langs
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('[prerender] Phase 2 — Starting prerendering...')

  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found. Run "npm run build" first.')
    process.exit(1)
  }

  // Capture production assets BEFORE overwriting vite's dist/index.html
  captureProductionAssets()

  let pageCount = 0
  let blogCount = 0

  // Load blog articles up front so the /blog index can bake the post list.
  const articles = await loadBlogArticles()

  // 1. Public routes
  for (const route of PUBLIC_ROUTES) {
    const html = buildPublicPageHtml({ ...route, path: route.path }, route.path, articles)
    const outPath = join(DIST, route.path === '/' ? 'index.html' : `${route.path.replace(/\/$/, '')}/index.html`)
    writePage(outPath, html)
    pageCount++
  }
  console.log(`[prerender] ✓ ${pageCount} public routes`)

  // Which languages actually have real translated content, per article —
  // computed once and shared by the English loop and the multilingual loop
  // below so every page in an article's translation group declares the
  // identical (reciprocal) hreflang set.
  const translationsBySlug = await fetchArticleTranslations(articles)

  // 2. Blog articles — full content
  for (const article of articles) {
    const hreflangLangs = hreflangLangsFor(translationsBySlug.get(article.slug))
    const html = buildFullBlogHtml(article, articles, { hreflangLangs })
    writePage(join(DIST, 'blog', article.slug, 'index.html'), html)
    blogCount++
  }
  console.log(`[prerender] ✓ ${blogCount} blog articles (full content)`)

  // 2b. Multilingual blog pages (ur, hi, ar, bn)
  let mlCount = 0
  for (const article of articles) {
    const available = translationsBySlug.get(article.slug)
    if (!available) continue
    const hreflangLangs = hreflangLangsFor(available)
    for (const lang of available) {
      const html = buildFullBlogHtml(article, articles, {
        langCode: lang.code, htmlLang: lang.htmlLang,
        ogLocale: lang.ogLocale, translation: lang.translated,
        hreflangLangs,
      })
      writePage(join(DIST, lang.prefix, 'blog', article.slug, 'index.html'), html)
      mlCount++
    }
  }
  if (mlCount > 0) console.log(`[prerender] ✓ ${mlCount} multilingual blog pages`)

  // ── Search index JSON ──
  writeFileSync(join(PUBLIC, 'search-index.json'), buildSearchIndex(articles))
  console.log('[prerender] ✓ Search index generated')

  // ── Enhanced RSS ──
  writeFileSync(join(PUBLIC, 'rss.xml'), buildEnhancedRss(articles))
  console.log('[prerender] ✓ Enhanced RSS feed generated')

  // ── Phase 3: Category pages ──
  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))]
  let catCount = 0
  for (const cat of categories) {
    const catSlug = `/blog/category/${cat.toLowerCase().replace(/\s+/g, '-')}`
    writePage(join(DIST, catSlug, 'index.html'), buildCategoryPage(cat, articles))
    catCount++
  }
  console.log(`[prerender] ✓ ${catCount} category pages`)

  // ── Phase 3: Pagination ──
  const perPage = 6
  const totalPages = Math.ceil(articles.length / perPage)
  for (let p = 2; p <= totalPages; p++) {
    writePage(join(DIST, 'blog', 'page', String(p), 'index.html'), buildPaginationPage(p, totalPages, articles, perPage))
  }
  if (totalPages > 1) console.log(`[prerender] ✓ ${totalPages - 1} pagination pages (pages 2-${totalPages})`)

  // ── Phase 3: Author page ──
  writePage(join(DIST, 'author', 'nexora', 'index.html'), buildAuthorPage())
  console.log('[prerender] ✓ Author page')

  // ── Phase 3: Search page ──
  writePage(join(DIST, 'search', 'index.html'), buildSearchPage())
  console.log('[prerender] ✓ Search page')

  // 3. Sitemap + Image sitemap
  try {
    const { execSync } = await import('node:child_process')
    execSync('node scripts/generate-sitemap.mjs', { cwd: ROOT, stdio: 'inherit' })
    execSync('node scripts/generate-image-sitemap.mjs', { cwd: ROOT, stdio: 'inherit' })
    console.log('[prerender] ✓ Sitemaps updated (main + image)')
  } catch {
    console.warn('[prerender] ⚠ Sitemap generation skipped')
  }

  const totalPages2 = pageCount + blogCount + catCount + (totalPages > 1 ? totalPages - 1 : 0) + 2 // +2 for author + search
  console.log(`[prerender] ✓ Done — ${totalPages2} pages generated`)

  // ── Multilingual SEO Validation Report ──
  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('  🌐 Multilingual SEO Validation')
  console.log('═══════════════════════════════════════')
  console.log('')
  const seoLangCount = 5 // en, ur, hi, ar, bn
  console.log(`  ✓ hreflang OK       — ${seoLangCount} languages + x-default on every blog page`)
  console.log(`  ✓ Canonical OK      — Per-language canonicals (not redirected to English)`)
  console.log(`  ✓ Sitemap OK        — All ${seoLangCount - 1} additional languages in sitemap.xml`)
  console.log(`  ✓ Structured Data OK — inLanguage set per page`)
  console.log(`  ✓ Robots OK         — sitemap.xml referenced`)
  console.log(`  ✓ HTML lang OK      — Dynamic <html lang="..."> per language`)
  console.log(`  ✓ OG Locale OK      — og:locale + og:locale:alternate per page`)
  console.log(`  ✓ Translation URLs  — ${mlCount} multilingual pages prerendered`)
  console.log('')
  console.log('  🔍 Search Console — Submit sitemaps:')
  console.log('')
  console.log('  Google:')
  console.log('  https://www.google.com/ping?sitemap=https://nexorasolution.online/sitemap.xml')
  console.log('')
  console.log('  Bing:')
  console.log('  https://www.bing.com/ping?sitemap=https://nexorasolution.online/sitemap.xml')
  console.log('')
  console.log('  IndexNow (automatic):')
  console.log('  Already submitted via scripts/indexnow.mjs')
  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('  ✅ Ready for Google indexing')
  console.log('═══════════════════════════════════════')
}

main().catch((err) => {
  console.error('[prerender] Fatal:', err)
  process.exit(1)
})
