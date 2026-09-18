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
    // NOT '/menu'. The QR-menu / online-ordering Route is mounted as a child of
    // /app (src/AppRouter.jsx), so its real URL is /app/menu/<slug>, already
    // covered by '/app' above. Listing '/menu' here would return a 200 shell
    // for /menu/<slug>, which no top-level Route matches — React would fall
    // through to its own not-found page, producing exactly the soft 404 this
    // Worker exists to remove. src/crm/lib/featureRegistry.js:30 still declares
    // the feature's route as '/menu/*'; fix that mismatch there (either hoist
    // the Route out of /app, or correct the registry to '/app/menu/*') rather
    // than papering over it with a prefix here.
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

// dist/index.html is the homepage: it carries the homepage's <title>, its
// <link rel="canonical" href="https://nexorasolution.online/">, its og:url and
// its hreflang group. Served verbatim at /app/dashboard or /login, that is a
// byte-identical duplicate of the homepage claiming to BE the homepage, which
// is how a crawler reads it.
//
// So the shell gets a noindex on the way out, and the homepage canonical is
// removed rather than rewritten to the request's own URL: these routes are not
// pages that should rank, and noindex plus a self-canonical is a contradictory
// pair of signals. A pre-existing robots meta is dropped first so exactly one
// survives. Content injected with `html: true` is not re-parsed by the
// rewriter, so the tag added here cannot be matched and removed by the handler
// below it.
//
// This is deliberately NOT done with robots.txt Disallow: a blocked URL can
// still be indexed from an external link, and blocking it guarantees the
// crawler never fetches the page and so never sees the noindex. public/robots.txt
// therefore leaves these paths crawlable on purpose — see the note in that file.
//
// HTMLRewriter is provided by the Workers runtime, not by the browser globals
// that eslint.config.js loads for this repo's .js files.
/* global HTMLRewriter */
function noindexShellRewriter() {
  return new HTMLRewriter()
    .on('head', {
      element(head) {
        head.prepend('<meta name="robots" content="noindex" />', { html: true })
      },
    })
    .on('meta[name="robots"]', { element(el) { el.remove() } })
    .on('link[rel="canonical"]', { element(el) { el.remove() } })
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
  // The shell is rewritten downstream, so the asset's byte count no longer
  // describes what is sent.
  headers.delete('content-length')

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
    //    the React router renders the page on a direct load or refresh, with the
    //    homepage's indexing signals stripped out of it. Only this branch is
    //    rewritten — real prerendered pages returned in step 1 are untouched,
    //    and dist/404.html already ships a noindex and no canonical.
    const { pathname } = new URL(request.url)
    if (isSpaRoute(pathname)) {
      const shell = await serveAsset(request, env, '/index.html', 200)
      return shell.ok ? noindexShellRewriter().transform(shell) : shell
    }

    // 3. Nobody's route: a real 404 with the real 404 page.
    return serveAsset(request, env, '/404.html', 404)
  },
}
