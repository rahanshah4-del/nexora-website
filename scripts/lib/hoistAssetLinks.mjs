// scripts/prerender.mjs's page templates print PRODUCTION_ASSETS at the end of <body>, after
// the content. For the module <script> that is harmless (a module script is
// deferred: it runs after parsing wherever it sits). For the stylesheet it is
// not: a <link rel="stylesheet"> at the end of <body> only blocks rendering of
// what comes after it, so the browser painted and laid out the whole page
// unstyled first, then restyled every element once the CSS arrived — a full
// second style + layout pass, and ~2,300 CSS transitions firing as each
// `transition-*` element moved from its unstyled to its styled values. The
// modulepreload hints were also only found after the whole document had been
// parsed. Both now go in <head>, where Vite's own index.html puts them; the
// module <script> stays where it was.
const HEAD_ASSET_TAG = /[ \t]*<link\s+rel="(?:stylesheet|modulepreload)"[^>]*\/assets\/[^"]*"[^>]*>\n?/g

export function hoistAssetLinksToHead(html) {
  const headEnd = html.indexOf('</head>')
  if (headEnd === -1) return html
  const tags = []
  const body = html.slice(headEnd).replace(HEAD_ASSET_TAG, (tag) => { tags.push(tag.trim()); return '' })
  if (tags.length === 0) return html
  // Stylesheet first so it is requested before the script preloads.
  tags.sort((a, b) => Number(b.includes('stylesheet')) - Number(a.includes('stylesheet')))
  return `${html.slice(0, headEnd)}  ${tags.join('\n  ')}\n${body}`
}

