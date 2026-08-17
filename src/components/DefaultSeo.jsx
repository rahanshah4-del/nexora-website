import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { absoluteUrl, canonicalPath, createLocalBusinessSchema, createOrganizationSchema, createWebSiteSchema } from '../lib/seoStructuredData.js'

const publicSeoPaths = new Set([
  '/',
  '/features',
  '/services',
  '/business-services',
  '/pricing',
  '/contact',
  '/industries',
  '/projects',
  '/about',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/sitemap',
  '/help-center',
  '/documentation',
  '/blog',
  '/restaurant-pos',
  '/retail-pos',
  '/school-erp',
  '/transport',
  '/whatsapp-crm',
  '/software-development',
  '/seo-services',
  '/mobile-app-development',
  '/ecommerce-development',
  '/crm-development',
  '/erp-development',
  '/cloud-solutions',
  '/api-integration',
  '/usa', '/uk', '/canada', '/australia',
  '/uae', '/saudi-arabia', '/bahrain', '/qatar', '/oman', '/kuwait',
  '/pakistan', '/india',
])

// Authentication / private areas must never be indexed.
const NOINDEX_PREFIXES = ['/app', '/admin', '/login', '/signup', '/verify-email', '/workspace']

function upsertTag(tagName, attrs = {}) {
  if (typeof document === 'undefined') return
  let el
  if (tagName === 'link' && attrs.rel === 'canonical') {
    el = document.querySelector('link[rel="canonical"]')
    if (!el) {
      el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      document.head.appendChild(el)
    }
    el.setAttribute('href', attrs.href)
    return
  }
  if (tagName === 'meta' && attrs.name) {
    el = document.querySelector(`meta[name="${attrs.name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', attrs.name)
      document.head.appendChild(el)
    }
    if (attrs.content) el.setAttribute('content', attrs.content)
    return
  }
  if (tagName === 'meta' && attrs.property) {
    el = document.querySelector(`meta[property="${attrs.property}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('property', attrs.property)
      document.head.appendChild(el)
    }
    if (attrs.content) el.setAttribute('content', attrs.content)
    return
  }
}

function upsertJsonLd(id, schema) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(id)
  if (!schema) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(schema).replace(/</g, '\\u003c')
}

export default function DefaultSeo() {
  const location = useLocation()
  const host = 'https://nexorasolution.online'
  const pathname = location?.pathname || '/'
  const legacyCanonicalMap = {
    '/services': `${host}/business-services/`,
    '/services/': `${host}/business-services/`,
    '/solutions/pos': `${host}/restaurant-pos/`,
    '/solutions/pos/': `${host}/restaurant-pos/`,
  }
  const canonical = (() => {
    if (legacyCanonicalMap[pathname]) return legacyCanonicalMap[pathname]
    if (pathname === '/blog' && /(?:^|[?&])(?:tag|category)=/.test(location?.search || '')) return `${host}/blog/`
    return host + canonicalPath(pathname)
  })()
  const cleanPathname = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const isLangBlog = ['/ur/blog', '/hi/blog', '/ar/blog', '/bn/blog'].some(p => cleanPathname === p || cleanPathname.startsWith(p + '/'))
  const publicRoute = publicSeoPaths.has(cleanPathname) || cleanPathname.startsWith('/solutions/') || cleanPathname.startsWith('/blog/') || isLangBlog
  const noindex = NOINDEX_PREFIXES.some((prefix) => cleanPathname === prefix || cleanPathname.startsWith(`${prefix}/`))

  useEffect(() => {
    // Canonical is owned solely by PageSeo (per-page) to prevent duplicate canonicals.
    upsertTag('meta', { name: 'robots', content: noindex ? 'noindex,nofollow' : 'index,follow' })
    upsertTag('meta', { property: 'og:url', content: canonical })
    upsertTag('meta', { property: 'og:site_name', content: 'Nexora Solution' })
    upsertTag('meta', { name: 'twitter:site', content: '@nexorasolution' })
    upsertJsonLd('nexora-jsonld-organization', publicRoute ? createOrganizationSchema() : null)
    upsertJsonLd('nexora-jsonld-website', publicRoute ? createWebSiteSchema() : null)
    upsertJsonLd('nexora-jsonld-localbusiness', publicRoute ? createLocalBusinessSchema() : null)
  }, [canonical, pathname, publicRoute, noindex])

  return null
}
