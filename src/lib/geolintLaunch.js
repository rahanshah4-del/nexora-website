/**
 * Launch switch for the public GeoLint page (/tools/geo-audit/), separate from
 * the invoice tools' switch in toolsLaunch.js.
 *
 *   false — the page works at its URL but is noindex,follow, is out of the
 *           sitemap, and nothing links to it (hub, footer). Safe to deploy
 *           before geolint-backend is live.
 *   true  — indexable, in the sitemap, and linked from the tools hub.
 *
 * Flip to true only after geolint-backend is deployed and VITE_GEOLINT_API_URL
 * is set for the build; the page cannot run an audit without it.
 */
export const GEOLINT_LAUNCHED = true

export const GEOLINT_PATH = '/tools/geo-audit'

/** Where a finished audit opens. Always noindex, never in the sitemap, in both launch states. */
export const GEOLINT_REPORT_PATH = '/tools/geo-audit/report'
