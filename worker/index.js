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
 *   - the SPA shell for a blog article published in the CMS since the last
 *     build, which is a real page in Firestore but has no prerendered file yet.
 *     See blogArticleSlug() and isPublishedBlogPost() below.
 *
 * "not_found_handling": "none" in wrangler.jsonc is what lets this script make
 * that call: the asset server still serves every prerendered page, redirect and
 * static file itself (and applies "html_handling": "force-trailing-slash"), and
 * only a request it has no asset for reaches this Worker.
 */

const SITE_ORIGIN = 'https://nexorasolution.online'

/* ── CMS blog articles with no prerendered page yet ────────────────────────
 *
 * scripts/prerender.mjs writes dist/blog/<slug>/index.html for every published
 * post at build time, reading them from Firestore. A post published in the CMS
 * AFTER that build has no file, so the asset server misses and this Worker used
 * to answer a real 404 — for crawlers and for anyone following a direct link,
 * even though the React app fetches and renders the post correctly once JS runs.
 * functions/blogRebuild.js triggers a rebuild on every publish, but a build
 * takes minutes (and can fail), so the URL must not be a 404 in the meantime.
 *
 * Returning the shell at 200 for ANY /blog/<anything>/ would reintroduce the
 * soft 404 this Worker exists to remove: BlogArticlePage has no article to show
 * for a slug that is nobody's post. So the slug is checked against Firestore
 * first, and only a real published post gets the shell.
 *
 * The check is a single REST read of blogPosts/<slug>. firestore.rules allows
 * an unauthenticated read of that document only when its status is 'published'
 * (`allow read: if backendAdmin() || resource.data.status=='published'`), so an
 * unknown slug and a draft both come back 403 and keep their honest 404. The
 * project id and web API key are the public ones already shipped in the client
 * bundle (src/lib/firebase.js) and used by scripts/lib/loadBlogArticles.mjs;
 * they are overridable through Worker vars but need no secret.
 */

// Same shape firestore.rules and scripts/lib/blogRedirects.mjs accept as a slug.
const BLOG_SLUG = /^[a-z0-9-]{3,120}$/
const BLOG_ARTICLE_PATH = /^\/blog\/([a-z0-9-]{3,120})$/

const FIRESTORE_PROJECT_ID = 'nexora-business-suite'
const FIRESTORE_WEB_API_KEY = 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc'

// Cached at the edge so a crawler sweeping a new post's URL, and the burst of
// traffic behind a freshly shared link, cost one Firestore read rather than one
// per request. A miss is cached far more briefly than a hit: that TTL is how
// long a just-published post keeps 404ing, while a hit only goes stale if a post
// is unpublished, which the rebuild it triggers resolves anyway.
const BLOG_LOOKUP_TTL = { hit: 300, miss: 30 }

/**
 * The slug in a single-segment /blog/<slug> path, with or without a trailing
 * slash; null for /blog itself, for anything deeper, and for a non-slug.
 */
export function blogArticleSlug(pathname) {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return BLOG_ARTICLE_PATH.exec(path)?.[1] || null
}

/**
 * Throws on anything that is not a slug, rather than encoding it. Percent-encoding
 * is not enough on its own: a URL parser resolves a `%2E%2E` segment away just as
 * it resolves `..`, which would turn a document read into a collection read. The
 * only safe treatment of a non-slug is to refuse to build a URL for it.
 * isPublishedBlogPost catches the throw and falls through to the 404, and
 * blogArticleSlug means a real request never gets this far.
 */
export function blogPostLookupUrl(slug, { projectId = FIRESTORE_PROJECT_ID, apiKey = FIRESTORE_WEB_API_KEY } = {}) {
  if (!BLOG_SLUG.test(String(slug || ''))) throw new Error('blogPostLookupUrl: not a blog slug')
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/blogPosts`
  // mask.fieldPaths keeps the response to the one field that is read. Rules are
  // evaluated against the whole stored document, so masking cannot widen access.
  return `${base}/${slug}?key=${encodeURIComponent(apiKey)}&mask.fieldPaths=status`
}

/**
 * Whether `slug` is a published post in the CMS.
 *
 * Fails closed. A Firestore outage, a timeout or an unparseable body all return
 * false, so the request falls through to the real 404 rather than handing the
 * homepage shell to every /blog/<typo>/ on the domain while Firestore is down.
 * The prerendered posts never reach this code path, so a false here only ever
 * affects posts published since the last successful build.
 */
async function isPublishedBlogPost(slug, env) {
  const url = blogPostLookupUrl(slug, {
    projectId: env?.FIREBASE_PROJECT_ID || FIRESTORE_PROJECT_ID,
    apiKey: env?.FIREBASE_WEB_API_KEY || FIRESTORE_WEB_API_KEY,
  })
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      cf: { cacheTtlByStatus: { '200-299': BLOG_LOOKUP_TTL.hit, '400-599': BLOG_LOOKUP_TTL.miss } },
    })
    // 403 is the normal answer for both an unknown slug and a draft: the rule
    // that allows the read is the one that tests status == 'published'.
    if (!response.ok) return false
    const document = await response.json()
    // Belt and braces: the rule already guarantees this, but a future rule
    // change must not silently turn drafts into 200s.
    return document?.fields?.status?.stringValue === 'published'
  } catch {
    return false
  }
}

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
 * Deliberately absent, because the asset server, a real 404 or a check of its
 * own already handles them correctly:
 *   - /blog/<slug>/ — prerendered per article. A slug with no file is checked
 *     against Firestore instead (see blogArticleSlug / isPublishedBlogPost), so
 *     a post published since the last build gets the shell while an unknown slug
 *     still 404s. A blanket prefix here would give both of them a 200.
 *   - /<lang>/blog/<slug>/ — the translated blog was retired (see below), so
 *     these 404 rather than rendering an empty article shell.
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
    // NOT '/ur/blog', '/hi/blog', '/ar/blog' or '/bn/blog'. The translated blog
    // was retired: the `blogTranslations` documents in Firestore are keyed to a
    // previous generation of article slugs (9 documents, none of which matches
    // any of the 28 current slugs), so no translated article has ever been
    // prerendered and none of these URLs has ever served real translated HTML —
    // they only ever returned the homepage under the old SPA fallback, which is
    // what Search Console reports as "Alternate page with proper canonical tag".
    // They now 404 honestly. The language HOMEPAGES (/hi/, /ur/, /ar/) are
    // genuinely prerendered pages with real translated content and are served as
    // ordinary assets — they never needed an entry here.
    //
    // If translated articles are ever generated, scripts/prerender.mjs writes
    // them as real /<lang>/blog/<slug>/index.html files, which the asset server
    // serves directly; only the bare /<lang>/blog INDEX pages would need to come
    // back to this list.
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
// pair of signals. The homepage's hreflang alternates go for the same reason —
// they name /, /ur/, /hi/ and /ar/, declaring /app/dashboard to be part of the
// homepage's translation group, which it is not. A pre-existing robots meta is
// dropped first so exactly one survives. Content injected with `html: true` is
// not re-parsed by the rewriter, so the tag added here cannot be matched and
// removed by the handler below it.
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
    .on('link[rel="alternate"][hreflang]', { element(el) { el.remove() } })
}

// The same shell, served for a blog post that exists in Firestore but has no
// prerendered page yet. This one must stay indexable — a 200 that carries
// noindex is no better than the 404 it replaces — so instead of suppressing the
// page's identity, the homepage's identity is replaced with the article's own
// URL: a self-canonical and og:url for the path being answered, and none of the
// homepage's hreflang group, which this URL is no part of.
//
// The <title> and og:title stay the homepage's until React boots and PageSeo
// rewrites them (src/components/PageSeo.jsx), which Googlebot does execute. That
// residue is why this is a stopgap and not the goal: the prerendered page from
// the rebuild in functions/blogRebuild.js is what gets the title right in the
// HTML itself.
function blogShellRewriter(canonicalUrl) {
  const tag = `<link rel="canonical" href="${canonicalUrl}" />`
  return new HTMLRewriter()
    .on('head', {
      element(head) {
        head.prepend(`${tag}<meta property="og:url" content="${canonicalUrl}" />`, { html: true })
      },
    })
    // The homepage's own canonical, og:url and hreflang alternates. Content
    // injected with `html: true` above is not re-parsed, so these handlers
    // cannot match and remove the tags just added.
    .on('link[rel="canonical"]', { element(el) { el.remove() } })
    .on('meta[property="og:url"]', { element(el) { el.remove() } })
    .on('link[rel="alternate"][hreflang]', { element(el) { el.remove() } })
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

/**
 * The asset server's html_handling "force-trailing-slash" answers /oman with a
 * TEMPORARY redirect (Search Console's crawl stats count them as "Moved
 * temporarily (302)": ~7% of Googlebot's requests). The no-slash form is not a
 * second address worth keeping, so make it permanent. Only the exact
 * "/path" -> "/path/" redirect is rewritten (same origin, query kept); every
 * other redirect, including the _redirects 301s, passes through untouched.
 */
export function permanentSlashRedirect(response, requestUrl) {
  if (response.status !== 302 && response.status !== 307) return response
  const location = response.headers.get('location')
  if (!location) return response
  const from = new URL(requestUrl)
  const to = new URL(location, from)
  if (to.origin !== from.origin || to.pathname !== `${from.pathname}/` || to.search !== from.search) return response
  return new Response(null, { status: 301, headers: { location: response.headers.get('location') } })
}

export default {
  async fetch(request, env) {
    // 1. Let the asset server answer first. Anything it can handle — every
    //    prerendered page, _redirects 301, hashed /assets/* file, and the
    //    force-trailing-slash redirects — comes back untouched.
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404) return permanentSlashRedirect(assetResponse, request.url)

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

    // 3. A /blog/<slug> path with no prerendered page: the shell at 200 if the
    //    CMS really has that post published, so a post published since the last
    //    build is a live page rather than a 404 for crawlers and direct links.
    //    Anything else keeps its 404 in step 4.
    const slug = blogArticleSlug(pathname)
    if (slug && await isPublishedBlogPost(slug, env)) {
      const canonicalUrl = `${SITE_ORIGIN}/blog/${slug}/`
      // One URL per post, as everywhere else on the site: the no-slash form is a
      // 301 rather than a second address serving the same article. The asset
      // server does this for pages it has (html_handling force-trailing-slash);
      // for a page it does not have, it has to happen here.
      if (!pathname.endsWith('/')) {
        return new Response(null, { status: 301, headers: { location: `/blog/${slug}/` } })
      }
      const shell = await serveAsset(request, env, '/index.html', 200)
      return shell.ok ? blogShellRewriter(canonicalUrl).transform(shell) : shell
    }

    // 4. Nobody's route: a real 404 with the real 404 page.
    return serveAsset(request, env, '/404.html', 404)
  },
}
