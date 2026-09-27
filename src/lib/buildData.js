import { serializeBlogPostSeed } from './blogPostSeed.js'

/**
 * Build-time snapshot of the Firestore content that public pages render
 * (pricing plans, published reviews).
 *
 * scripts/prerender.mjs fetches it once per build, hands it to the server
 * render (setServerBuildData) and embeds the same JSON in every server-rendered
 * page. In the browser the components read it back as their INITIAL state, so
 * the first client render matches the server HTML exactly (hydration keeps it)
 * and Firestore only updates it afterwards — the same pattern as the blog seed.
 */
export const BUILD_DATA_ID = '__NEXORA_DATA__'

let serverData = null
let clientData

export function setServerBuildData(data) {
  serverData = data || {}
}

export function getBuildData(key) {
  if (serverData) return serverData[key]
  if (clientData === undefined) {
    clientData = null
    try {
      const node = typeof document === 'undefined' ? null : document.getElementById(BUILD_DATA_ID)
      clientData = node ? JSON.parse(node.textContent || 'null') : null
    } catch {
      clientData = null
    }
  }
  return clientData?.[key]
}

export function renderBuildDataScript(data) {
  return `<script type="application/json" id="${BUILD_DATA_ID}">${serializeBlogPostSeed(data || {})}</script>`
}

/**
 * Whether there are publicly readable approved customer reviews (build-time
 * snapshot). Everything that points visitors at reviews — the /reviews/ page
 * content and the links to it — shows only when this is true, so the site never
 * advertises reviews it cannot show.
 */
export function hasCustomerReviews() {
  const reviews = getBuildData('customerReviews')
  return Array.isArray(reviews) && reviews.length > 0
}
