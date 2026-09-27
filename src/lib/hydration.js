/**
 * Server-rendered pages (src/entry-server.jsx) mark #root with the URL they
 * were rendered for: <div id="root" data-ssr="/pricing/">.
 *
 * The URL matters: dist/index.html is the server-rendered homepage, and the
 * worker also serves that same file as the app shell for /login, /app/... —
 * that markup must only be hydrated at "/", never at those routes.
 */
function normalizePath(path) {
  return String(path || '').replace(/\/+$/, '') || '/'
}

export function serverRenderedForThisUrl(doc = typeof document === 'undefined' ? null : document) {
  const ssrPath = doc?.getElementById('root')?.getAttribute('data-ssr')
  return Boolean(ssrPath) && normalizePath(ssrPath) === normalizePath(doc.location?.pathname)
}

/**
 * True while React is hydrating that server-rendered page, and until the reader
 * navigates away from its URL. Components whose first render would otherwise
 * read browser-only state (sessionStorage caches and the like) check this and
 * start from the same state the server rendered with, applying the browser
 * state in an effect. It stays true past the root's first commit on purpose:
 * lazy route chunks hydrate later, and they must see the same answer.
 */
let hydrating = serverRenderedForThisUrl()

export function isHydratingServerHtml() {
  return hydrating
}

export function markLeftServerRenderedPage() {
  hydrating = false
}
