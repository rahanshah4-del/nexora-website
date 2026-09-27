/**
 * Free tool pages (/tools/*): the data both the React page and
 * scripts/prerender.mjs need, so the static HTML and the hydrated page can
 * never disagree. Full SEO content (sections, FAQs) lands here in Step 7.
 */

import { seoMetadata } from './seoMetadata.js'
import { createWebApplicationSchema } from './seoStructuredData.js'

export const TOOL_PAGES = Object.freeze({
  '/tools/invoice-generator': {
    appName: 'Nexora Free Invoice Generator',
  },
})

/** The page's WebApplication JSON-LD object. */
export function toolWebApplicationSchema(path) {
  return createWebApplicationSchema({
    name: TOOL_PAGES[path].appName,
    path,
    description: seoMetadata[path].description,
  })
}
