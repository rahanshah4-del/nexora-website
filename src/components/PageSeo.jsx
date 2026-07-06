import { useEffect } from 'react'
import { schemasForPage } from '../lib/seoStructuredData.js'

function setTitle(title) {
  if (typeof document === 'undefined') return
  document.title = title
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
    clearPageJsonLd()
    const pagePath = path || (canonical ? new URL(canonical).pathname : window.location.pathname)
    const schemas = [
      ...schemasForPage({
        path: pagePath,
        title: ogTitle || title,
        description: ogDescription || description,
        image: ogImage,
        faqItems,
        softwareApplication,
      }),
      ...(Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean),
    ]
    schemas.forEach((schema, index) => {
      const id = `nexora-jsonld-page-${index}`
      setJsonLd(id, schema)
      document.getElementById(id)?.setAttribute('data-nexora-page-schema', 'true')
    })
    return () => clearPageJsonLd()
  }, [title, description, canonical, path, keywords, robots, ogTitle, ogDescription, ogImage, twitterCard, faqItems, softwareApplication, structuredData])

  return null
}
