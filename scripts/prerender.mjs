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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const SITE = 'https://nexorasolution.online'
const LOGO = `${SITE}/nexora-brand-logo.png`

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
  { path: '/about',         title: 'About Nexora Solution — Pakistan\'s Business Software Platform',                        description: 'Learn about Nexora Solution, the team behind Pakistan\'s leading POS, ERP and CRM platform for restaurants, retail, schools and enterprises.' },
  { path: '/pricing',       title: 'Nexora Pricing — Simple Plans for Every Business',                                      description: 'Compare Nexora pricing plans. Start with a free trial, then choose Basic, Standard or Enterprise. No credit card required.' },
  { path: '/contact',       title: 'Contact Nexora Solution — Get in Touch',                                                description: 'Contact Nexora Solution for POS software, ERP systems, CRM solutions. Book a free demo or reach our support team.' },
  { path: '/restaurant-pos',title: 'Restaurant POS Software Pakistan — Nexora Solution',                                     description: 'Modern restaurant POS with table management, KOT, billing, inventory and cloud sync. Built for Pakistani restaurants.' },
  { path: '/retail-pos',    title: 'Retail POS Software Pakistan — Nexora Solution',                                        description: 'Complete retail POS system with barcode billing, inventory management, discount engine and multi-counter support.' },
  { path: '/school-erp',    title: 'School ERP Software Pakistan — Nexora Solution',                                        description: 'Cloud-based school management system with student records, fee collection, attendance, exams and parent portal.' },
  { path: '/solutions/pos', title: 'POS Software Solutions — Nexora Solution',                                              description: 'Explore Nexora POS solutions for restaurants, retail stores, medical stores and transport businesses.' },
  { path: '/solutions/crm', title: 'CRM Software Pakistan — Nexora Solution',                                               description: 'Customer relationship management with lead tracking, pipeline, follow-ups and WhatsApp integration.' },
  { path: '/solutions/medical-store-pos', title: 'Medical Store POS Pakistan — Nexora Solution',                             description: 'Pharmacy POS with medicine inventory, batch tracking, expiry alerts and sales reports.' },
  { path: '/solutions/school-erp', title: 'School ERP System Pakistan — Nexora Solution',                                   description: 'Complete school ERP with student management, fees, attendance, exams, payroll and reports.' },
  { path: '/solutions/property-erp', title: 'Property ERP Software Pakistan — Nexora Solution',                             description: 'Property management ERP for landlords, agents and developers. Track tenants, rent, maintenance and owners.' },
  { path: '/blog',          title: 'Nexora Blog — POS, ERP & CRM Insights for Pakistani Businesses',                         description: 'Read the Nexora blog for POS tips, ERP guides, CRM strategies and business growth insights for Pakistani entrepreneurs.' },
  { path: '/faq',           title: 'Frequently Asked Questions — Nexora Solution',                                           description: 'Find answers to common questions about Nexora POS, ERP, CRM pricing, features, setup, support and billing.' },
  { path: '/business-services', title: 'Business Services — Nexora Solution',                                               description: 'Explore Nexora business services including custom software development, integrations, consulting and digital transformation.' },
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
  { path: '/projects',     title: 'Projects — Nexora Solution',                                                             description: 'Nexora Solution client projects and case studies. See how businesses transformed with our POS and ERP software.' },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  DYNAMIC SEO HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildSeoHead(meta) {
  const canonical = `${SITE}${meta.path}`
  const img = meta.image || LOGO
  const type = meta.path.startsWith('/blog/') ? 'article' : 'website'

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
  <meta property="og:locale" content="en_PK" />
  ${meta.keywords ? `<meta name="keywords" content="${esc(meta.keywords)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nexorasolution" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <meta name="twitter:image:alt" content="Nexora Solution — POS, ERP and CRM software for Pakistan" />`
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
  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
  <link rel="dns-prefetch" href="https://connect.facebook.net" />
  <link rel="dns-prefetch" href="https://embed.tawk.to" />`
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
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Nexora Solution",
  "url": "${SITE}",
  "logo": "${LOGO}",
  "description": "Pakistan's leading POS, ERP and CRM software platform for restaurants, retail, schools and enterprises.",
  "sameAs": [
    "https://facebook.com/nexorasolution",
    "https://instagram.com/nexorasolution",
    "https://linkedin.com/company/nexorasolution",
    "https://youtube.com/@nexorasolution"
  ]
}
</script>`
}

function websiteSchema() {
  return `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Nexora Solution",
  "url": "${SITE}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${SITE}/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
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
//  FULL BLOG ARTICLE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function buildFullBlogHtml(article) {
  const sections = article.sections || []
  const faqs = article.faqs || []
  const totalWords = sections.reduce((sum, s) => {
    const headingWords = wordCount(s.heading || '')
    const bodyWords = (s.paragraphs || []).reduce((s2, p) => s2 + wordCount(p), 0)
    return sum + headingWords + bodyWords
  }, 0) + wordCount(article.excerpt || article.description || '') + wordCount(article.title || '')
  const readTime = readingTime(totalWords)
  const pubDate = formatDate(article.publishDate)
  const updDate = formatDate(article.updatedDate)

  // ── Build article content HTML ──
  let contentHtml = ''
  for (const section of sections) {
    const level = section.level || 2
    const htag = `h${Math.min(level, 3)}`
    contentHtml += `\n    <${htag}>${esc(section.heading)}</${htag}>\n`
    for (const p of (section.paragraphs || [])) {
      contentHtml += `    <p>${esc(p)}</p>\n`
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

  // ── Related articles ──
  let relatedHtml = ''
  if (article.relatedSlugs && article.relatedSlugs.length) {
    relatedHtml = `\n    <h2>Related Articles</h2>\n    <ul>\n`
    for (const slug of article.relatedSlugs) {
      relatedHtml += `      <li><a href="/blog/${esc(slug)}">${esc(slugToTitle(slug))}</a></li>\n`
    }
    relatedHtml += '    </ul>\n'
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead({
    path: `/blog/${article.slug}`,
    title: article.seoTitle || article.title,
    description: article.metaDescription || article.description || `Read ${article.title} on Nexora Blog.`,
    keywords: (article.tags || []).join(', '),
    image: article.featuredImage || LOGO,
  })}
${orgSchema()}
${articleSchema({ ...article, totalWords })}
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
        <div class="meta">
          <span>By Nexora Solution Editorial Team</span>
          <span>Published: ${pubDate}</span>
          ${updDate !== pubDate ? `<span>Updated: ${updDate}</span>` : ''}
          <span>${readTime} min read</span>
          <span>${totalWords.toLocaleString()} words</span>
          <span>Category: <a href="/blog?category=${encodeURIComponent(article.category || '')}">${esc(article.category || 'General')}</a></span>
        </div>
        ${article.featuredImage ? `<img src="${esc(article.featuredImage)}" alt="${esc(article.title)}" width="1200" height="675" loading="eager" fetchpriority="high" decoding="async" />` : ''}
        ${article.excerpt ? `<p class="excerpt"><strong>${esc(article.excerpt)}</strong></p>` : `<p class="excerpt"><strong>${esc(article.metaDescription || article.description || '')}</strong></p>`}
        ${contentHtml}
        ${faqHtml}
        ${relatedHtml}
        ${ctaHtml}
        <p class="tags">Tags: ${(article.tags || []).map((t) => `<a href="/blog?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join(', ')}</p>
      </article>
    </main>
    <footer>
      <p>&copy; 2019–2026 Nexora Solution. All rights reserved.</p>
    </footer>
  </div>
  <script type="module" src="/src/main.jsx"></script>
  <noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe>
  </noscript>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC PAGE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function buildPublicPageHtml(meta) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${buildCommonHead()}
${buildSeoHead(meta)}
${orgSchema()}
${websiteSchema()}
${meta.path === '/blog'
    ? `  <script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Blog", "name": "Nexora Solution Blog", "url": "${SITE}/blog" }
</script>`
    : ''}
${meta.jsonLd || ''}
${buildGtm()}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
  <noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZJV65RW" height="0" width="0" style="display:none;visibility:hidden"></iframe>
  </noscript>
</body>
</html>`
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
    // Dynamic import of the blog data module
    const blogModule = await import(join(ROOT, 'src', 'lib', 'blogData.js'))
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
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('[prerender] Phase 2 — Starting prerendering...')

  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found. Run "npm run build" first.')
    process.exit(1)
  }

  let pageCount = 0
  let blogCount = 0

  // 1. Public routes
  for (const route of PUBLIC_ROUTES) {
    const html = buildPublicPageHtml({ ...route, path: route.path })
    const outPath = join(DIST, route.path === '/' ? 'index.html' : `${route.path.replace(/\/$/, '')}/index.html`)
    writePage(outPath, html)
    pageCount++
  }
  console.log(`[prerender] ✓ ${pageCount} public routes`)

  // 2. Blog articles — full content
  const articles = await loadBlogArticles()
  for (const article of articles) {
    const html = buildFullBlogHtml(article)
    writePage(join(DIST, 'blog', article.slug, 'index.html'), html)
    blogCount++
  }
  console.log(`[prerender] ✓ ${blogCount} blog articles (full content)`)

  // 3. Sitemap
  try {
    const { execSync } = await import('node:child_process')
    execSync('node scripts/generate-sitemap.mjs', { cwd: ROOT, stdio: 'inherit' })
    console.log('[prerender] ✓ Sitemap updated')
  } catch {
    console.warn('[prerender] ⚠ Sitemap skipped')
  }

  console.log(`[prerender] ✓ Done — ${pageCount + blogCount} pages generated`)
  console.log('[prerender] Blog pages contain: H1, meta, OG, JSON-LD, breadcrumb, full content, reading time, author, dates')
}

main().catch((err) => {
  console.error('[prerender] Fatal:', err)
  process.exit(1)
})
