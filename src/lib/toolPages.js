/**
 * Free tool pages (/tools/*): the data both the React pages and
 * scripts/prerender.mjs need, so the static HTML and the hydrated page can
 * never disagree — above all the page-level JSON-LD, which is built here once
 * and emitted by both (prerender inline, PageSeo after hydration).
 */

import { seoMetadata } from './seoMetadata.js'
import { absoluteUrl, createFAQPageSchema, createWebApplicationSchema, SITE_URL } from './seoStructuredData.js'
import { TOOL_CARDS, TOOL_PAGE_CONTENT, TOOLS_HUB_CONTENT, TOOLS_PAGES } from './toolsPagesData.js'

export const TOOL_PAGES = Object.freeze({
  ...Object.fromEntries(Object.values(TOOL_PAGE_CONTENT).map((page) => [page.path, { appName: page.appName }])),
  '/tools/invoice/view': {
    appName: 'Nexora Invoice Viewer',
  },
})

/** The page's WebApplication JSON-LD object. */
export function toolWebApplicationSchema(path) {
  return createWebApplicationSchema({
    name: TOOL_PAGES[path].appName,
    path,
    description: seoMetadata[path].description,
    operatingSystem: 'Any (web browser)',
  })
}

/** Home › Free Tools (› page), with the visible breadcrumb's names. */
export function toolBreadcrumbSchema(path) {
  const trail = [
    { name: 'Home', path: '/' },
    { name: TOOLS_HUB_CONTENT.breadcrumbName, path: TOOLS_HUB_CONTENT.path },
    ...(path === TOOLS_HUB_CONTENT.path ? [] : [{ name: TOOLS_PAGES[path].breadcrumbName, path }]),
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/** The hub as a CollectionPage whose main entity lists the four tools. */
export function toolsHubCollectionSchema() {
  const path = TOOLS_HUB_CONTENT.path
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: TOOLS_HUB_CONTENT.h1,
    description: TOOLS_HUB_CONTENT.seo.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: TOOL_CARDS.length,
      itemListElement: TOOL_CARDS.map((card, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: card.title,
        url: absoluteUrl(card.path),
      })),
    },
  }
}

/**
 * Every page-level JSON-LD object for a tools page, in output order:
 * hub → CollectionPage, FAQPage, BreadcrumbList;
 * tool → WebApplication, FAQPage, BreadcrumbList.
 * The FAQPage mirrors the visible FAQ exactly (same data).
 */
export function toolPageSchemas(path) {
  const page = TOOLS_PAGES[path]
  if (!page) return [toolWebApplicationSchema(path)]
  return [
    path === TOOLS_HUB_CONTENT.path ? toolsHubCollectionSchema() : toolWebApplicationSchema(path),
    createFAQPageSchema({ path, items: page.faqs }),
    toolBreadcrumbSchema(path),
  ]
}
