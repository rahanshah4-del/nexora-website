import { useEffect } from 'react'
import { schemasForPage } from '../lib/seoStructuredData.js'
import { BLOG_SEO_LANGUAGES, getLangConfig } from '../lib/blogLanguages.js'

function setTitle(title) {
  if (typeof document === 'undefined') return
  document.title = title
}

function removeAllHreflangs() {
  if (typeof document === 'undefined') return
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove())
}

function setHreflangs(hreflangMap) {
  if (typeof document === 'undefined' || !hreflangMap) return
  removeAllHreflangs()
  Object.entries(hreflangMap).forEach(([hreflang, href]) => {
    const el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', hreflang)
    el.setAttribute('href', href)
    document.head.appendChild(el)
  })
}

function setOgLocale(ogLocale) {
  if (typeof document === 'undefined') return
  // Remove existing og:locale and og:locale:alternate
  document.querySelectorAll('meta[property="og:locale"], meta[property="og:locale:alternate"]').forEach(el => el.remove())
  if (!ogLocale) return
  // Set primary
  const el = document.createElement('meta')
  el.setAttribute('property', 'og:locale')
  el.setAttribute('content', ogLocale)
  document.head.appendChild(el)
  // Add alternates for other languages
  BLOG_SEO_LANGUAGES.filter(l => l.ogLocale !== ogLocale).forEach(l => {
    const alt = document.createElement('meta')
    alt.setAttribute('property', 'og:locale:alternate')
    alt.setAttribute('content', l.ogLocale)
    document.head.appendChild(alt)
  })
}

function setLink(rel, href) {
  if (typeof document === 'undefined') return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setMeta(name, content, property = false) {
  if (typeof document === 'undefined') return
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    if (property) el.setAttribute('property', name)
    else el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setJsonLd(id, schema) {
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

function clearPageJsonLd() {
  if (typeof document === 'undefined') return
  document.querySelectorAll('script[type="application/ld+json"][data-nexora-page-schema="true"]').forEach((node) => node.remove())
}

export default function PageSeo({
  title,
  description,
  canonical,
  path,
  keywords,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  twitterCard,
  faqItems = [],
  softwareApplication = null,
  structuredData = [],
  hreflangs = null,
  currentLang = null,
  ogLocale = null,
}) {
  useEffect(() => {
    if (!window || !document) return
    if (title) setTitle(title)
    if (description) setMeta('description', description)
    if (keywords) setMeta('keywords', keywords)
    if (robots) setMeta('robots', robots)
    if (canonical) setLink('canonical', canonical)
    if (ogTitle) setMeta('og:title', ogTitle, true)
    if (ogDescription) setMeta('og:description', ogDescription, true)
    if (ogImage) setMeta('og:image', ogImage, true)
    if (twitterCard) setMeta('twitter:card', twitterCard)
    if (ogTitle) setMeta('twitter:title', ogTitle)
    if (ogDescription) setMeta('twitter:description', ogDescription || description)
    if (ogImage) setMeta('twitter:image', ogImage)
    // Hreflang & OG locale
    if (hreflangs) setHreflangs(hreflangs)
    else removeAllHreflangs()
    const langCfg = currentLang ? getLangConfig(currentLang) : null
    setOgLocale(ogLocale || langCfg?.ogLocale || 'en_PK')
    clearPageJsonLd()
    const pagePath = path || (canonical ? new URL(canonical).pathname : window.location.pathname)
    const bcp47 = langCfg?.hreflang || 'en'
    const schemas = [
      ...schemasForPage({
        path: pagePath,
        title: ogTitle || title,
        description: ogDescription || description,
        image: ogImage,
        faqItems,
        softwareApplication,
        language: bcp47,
      }),
      ...(Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean),
    ]
    schemas.forEach((schema, index) => {
      const id = `nexora-jsonld-page-${index}`
      setJsonLd(id, schema)
      document.getElementById(id)?.setAttribute('data-nexora-page-schema', 'true')
    })
    return () => { clearPageJsonLd(); removeAllHreflangs() }
  }, [title, description, canonical, path, keywords, robots, ogTitle, ogDescription, ogImage, twitterCard, faqItems, softwareApplication, structuredData, hreflangs, currentLang, ogLocale])

  return null
}
