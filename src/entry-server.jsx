/**
 * Build-time server render of the public marketing pages.
 *
 * Built by `vite build --ssr src/entry-server.jsx` into dist-ssr/ and called by
 * scripts/prerender.mjs, which puts the markup inside
 * <div id="root" data-ssr>. src/main.jsx hydrates that markup instead of
 * replacing it, so the page's full text is in the HTML before any JS runs and
 * stays the same DOM afterwards. Never loaded in the browser.
 *
 * `prerender` (react-dom/static) waits for every lazy route and Suspense
 * boundary to resolve, so the output is the finished page, not skeletons.
 */
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import AppTree from './AppTree.jsx'

// Build-time Firestore snapshot the pages render with (see lib/buildData.js).
export { setServerBuildData } from './lib/buildData.js'

/**
 * @param {string} url  The exact URL the browser will hydrate at, trailing
 *   slash included ('/pricing/'): anything derived from the location must be
 *   identical on both sides.
 * @returns {Promise<string>} The inner HTML for #root.
 */
export async function renderRoute(url) {
  const renderErrors = []
  const { prelude } = await prerender(<AppTree Router={StaticRouter} routerProps={{ location: url }} />, {
    onError(error) {
      // Rethrown by the caller: a page that fails to render must fail the
      // build rather than ship half a page.
      renderErrors.push(error)
    },
  })
  const html = await new Response(prelude).text()
  if (renderErrors.length) throw renderErrors[0]
  return html
}
