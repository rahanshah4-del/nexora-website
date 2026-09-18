/**
 * Edge entry for the nexorasolution.online static site.
 *
 * The site is a prerendered Vite/React SPA in ./dist served as Workers static
 * assets. It needs two behaviours that the asset server alone cannot combine:
 *
 *   - a real 404 (status + dist/404.html) for URLs that are nobody's route, so
 *     unknown URLs stop answering 200 with the homepage and its canonical;
 *   - the SPA shell (dist/index.html at status 200) for client-only routes such
 *     as /login or /app/dashboard, which have no prerendered file but ARE real
 *     pages once React boots — a hard refresh or a shared deep link must work.
 *
 * "not_found_handling": "none" in wrangler.jsonc is what lets this script make
 * that call: the asset server still serves every prerendered page, redirect and
 * static file itself (and applies "html_handling": "force-trailing-slash"), and
 * only a request it has no asset for reaches this Worker.
 */

/**
 * Client-only routes: real pages in src/AppRouter.jsx that have no prerendered
 * file in dist, so without this list they would get a 404 page instead of the
 * app on direct load or refresh.
 *
 * ADDING A NEW CLIENT-ONLY ROUTE MEANS ADDING IT HERE. A route registered in
 * src/AppRouter.jsx but missing from this list will 404 on direct load and
 * refresh while still working via in-app navigation — which makes it easy to
 * miss in testing and easy to hear about from users instead.
 *
 * `exact` matches the path itself (trailing slash optional) and nothing below
 * it. `prefixes` matches the path and its whole subtree. The split matters:
 * a subtree match on, say, /ur/blog would hand the SPA shell to
 * /ur/blog/no-such-article/ at status 200 — a soft 404, the exact thing this
 * Worker exists to remove. Only routes that really do own everything beneath
 * them belong in `prefixes`.
 *
 * Deliberately absent, because the asset server or a real 404 already handles
 * them correctly:
 *   - /blog/<slug>/ and /<lang>/blog/<slug>/ — prerendered per article, so an
 *     unknown slug should 404 rather than render an empty article shell.
 *   - /solutions/<slug>/ — the six real ones are prerendered and the renamed
 *     ones 301 via public/_redirects; anything else is not a page.
 *   - /services, /transport, /solutions/pos, /solutions/crm,
 *     /solutions/medical-store-pos — 301s in public/_redirects, applied by the
 *     asset server before this Worker is ever invoked.
 */
export const SPA_ROUTES = {
  exact: [
    // Auth and account entry points
    '/login',
    '/signup',
    '/verify-email',
    '/upgrade-business',
    // Chrome-free Medical Store POS till, opened in its own tab
    '/pos-till/medical',
    // Marketing routes that are intentionally noindex, so not prerendered
    '/features',
    '/pricing-paddle',
    // Translated blog INDEX pages. The articles beneath them are prerendered
    // per language, so these are exact, not prefixes.
    '/ur/blog',
    '/hi/blog',
    '/ar/blog',
    '/bn/blog',
  ],
  prefixes: [
    // The authenticated dashboard app and every nested route under it
    '/app',
    // Workspace picker
    '/workspace',
    // Admin console (/admin/login, /admin/control-centre, …)
    '/admin',
    // Public QR-menu / online-ordering portal. NOTE: the Route is currently
    // mounted as a child of /app (src/AppRouter.jsx), so the live URL is
    // /app/menu/<slug> — already covered by '/app' above. This entry exists
    // because src/crm/lib/featureRegistry.js declares the feature's route as
    // '/menu/*'; until the Route is hoisted to the top level, /menu/<slug>
    // serves the shell and React renders its not-found page.
    '/menu',
  ],
}

// Trailing slash is not significant for route matching: force-trailing-slash
// means a client-only route can be requested either way and both forms must
// reach the same decision.
function isSpaRoute(pathname) {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (SPA_ROUTES.exact.includes(path)) return true
  return SPA_ROUTES.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

// Serves one specific file from dist under a status of our choosing, keeping
// the request's own URL: the SPA shell has to be returned AS /app/dashboard,
// not as a redirect to /index.html, or the router loses the route it is meant
// to render.
async function serveAsset(request, env, assetPath, status) {
  const url = new URL(request.url)
  url.pathname = assetPath
  url.search = ''
  url.hash = ''

  const asset = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }))
  // dist/index.html and dist/404.html are both written by scripts/prerender.mjs
  // on every build, so a miss here means a broken deploy — surface it rather
  // than dressing it up as the status we intended.
  if (!asset.ok) return asset

  const headers = new Headers(asset.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  // The body belongs to a different path than the one being answered, so the
  // asset's own validators would let a cache serve it for the wrong URL.
  headers.delete('etag')
  headers.delete('last-modified')

  return new Response(request.method === 'HEAD' ? null : asset.body, { status, headers })
}

export default {
  async fetch(request, env) {
    // 1. Let the asset server answer first. Anything it can handle — every
    //    prerendered page, _redirects 301, hashed /assets/* file, and the
    //    force-trailing-slash redirects — comes back untouched.
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) return assetResponse

    // 2. No asset, but a client-only route: hand over the SPA shell at 200 so
    //    the React router renders the page on a direct load or refresh.
    const { pathname } = new URL(request.url)
    if (isSpaRoute(pathname)) return serveAsset(request, env, '/index.html', 200)

    // 3. Nobody's route: a real 404 with the real 404 page.
    return serveAsset(request, env, '/404.html', 404)
  },
}
