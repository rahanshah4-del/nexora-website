/**
 * Launch switch for the free tools (/tools/*): the single source of truth that
 * the React components, scripts/prerender.mjs and scripts/generate-sitemap.mjs
 * all read.
 *
 *   false — every /tools/* page is noindex,follow and out of the sitemap, and
 *           no link to them appears in the header, the three footers, the
 *           homepage or the HTML sitemap. The pages still work at their URLs.
 *   true  — the landing pages below become indexable, are listed in the
 *           sitemap, and every link appears.
 *
 * /tools/invoice/view (share links: a private document in the URL fragment) is
 * noindex and out of the sitemap in both states.
 *
 * Launch day: flip to true, build, deploy. See the checklist in the Step 7 report.
 */
export const TOOLS_LAUNCHED = true

export const TOOLS_HUB_PATH = '/tools'
export const TOOL_SHARE_VIEW_PATH = '/tools/invoice/view'

/** The tools, in the order every list shows them. Paths without trailing slash. */
export const TOOL_LINKS = Object.freeze([
  { key: 'invoice', path: '/tools/invoice-generator', label: 'Free Invoice Generator', blurb: 'PDF & Excel invoices in three steps' },
  { key: 'gst', path: '/tools/gst-invoice-generator', label: 'GST Invoice Generator', blurb: 'GSTIN, CGST/SGST/IGST and UPI QR' },
  { key: 'thermal', path: '/tools/thermal-receipt-generator', label: 'Thermal Receipt Generator', blurb: '58mm & 80mm POS receipts' },
  { key: 'letterhead', path: '/tools/invoice-on-letterhead', label: 'Invoice on Letterhead', blurb: 'Print on your own letterhead' },
  { key: 'quotation', path: '/tools/quotation-generator', label: 'Quotation Generator', blurb: 'Quotes that become invoices' },
])

/** Hub + the tools: the pages the switch makes indexable. */
export const TOOL_LANDING_PATHS = Object.freeze([TOOLS_HUB_PATH, ...TOOL_LINKS.map((t) => t.path)])

/** /tools/* paths that are noindex,follow in the given state. */
export function toolsNoindexPaths(launched = TOOLS_LAUNCHED) {
  return launched ? [TOOL_SHARE_VIEW_PATH] : [...TOOL_LANDING_PATHS, TOOL_SHARE_VIEW_PATH]
}

/** /tools/* paths added to the sitemap allowlist in the given state. */
export function toolsSitemapPaths(launched = TOOLS_LAUNCHED) {
  return launched ? [...TOOL_LANDING_PATHS] : []
}

/** Header dropdown items, or none before launch. */
export function toolsNavLinks(launched = TOOLS_LAUNCHED) {
  return launched ? TOOL_LINKS : []
}

/**
 * The "Free Tools" link group shared by the footers and the HTML sitemap, as
 * [label, path] pairs; null before launch.
 */
export function toolsFooterGroup(launched = TOOLS_LAUNCHED) {
  if (!launched) return null
  return {
    heading: 'Free Tools',
    links: [['All Free Tools', TOOLS_HUB_PATH], ...TOOL_LINKS.map((t) => [t.label, t.path])],
  }
}
