/**
 * The free tools launch switch (src/lib/toolsLaunch.js), proven in BOTH states
 * whatever its current value:
 *   - robots: the /tools/* pages are noindex,follow before launch and
 *     indexable after; /tools/invoice/view is noindex in both;
 *   - sitemap: the tools routes are listed only after launch;
 *   - links: the Header, the three footers (PublicFooter, the homepage footer,
 *     the prerender static footer), the homepage section and the HTML sitemap
 *     link to the tools only after launch.
 *
 * The React components read TOOLS_LAUNCHED at import time, so each state is a
 * separate esbuild bundle in which toolsLaunch.js has the constant replaced,
 * rendered with react-dom/server — the real components, not a copy of their
 * link lists.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { isNoindexPath } from '../src/lib/indexingRules.js'
import { TOOL_LANDING_PATHS, TOOL_LINKS, TOOL_SHARE_VIEW_PATH, toolsNoindexPaths, toolsSitemapPaths } from '../src/lib/toolsLaunch.js'
import { footerLinkGroups } from '../scripts/lib/footerLinkGroups.mjs'
import { sitemapPageRoutes } from '../scripts/generate-sitemap.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Inside node_modules so the bundle's external packages resolve from the repo.
const OUT_DIR = path.join(ROOT, 'node_modules', '.cache', 'tools-launch-test')
const LAUNCH_FILE = /src[\\/]lib[\\/]toolsLaunch\.js$/
const SWITCH = /export const TOOLS_LAUNCHED = (true|false)/

const ENTRY = `
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import Header from './src/components/Header.jsx'
import PublicFooter from './src/pages/public/PublicFooter.jsx'
import HomepageSections from './src/sections/HomepageSections.jsx'
import HtmlSitemapPage from './src/pages/public/HtmlSitemapPage.jsx'
import { seoMetadata } from './src/lib/seoMetadata.js'
const at = (url, node) => renderToString(<StaticRouter location={url}>{node}</StaticRouter>)
export function renderAll() {
  return {
    header: at('/', <Header />),
    publicFooter: at('/about/', <PublicFooter />),
    homepage: at('/', <HomepageSections />),
    htmlSitemap: at('/sitemap/', <HtmlSitemapPage />),
  }
}
export { seoMetadata }
`

/** Bundles the entry with TOOLS_LAUNCHED forced to `launched`, and imports it. */
async function loadWithSwitch(launched) {
  let replaced = false
  const result = await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'jsx', sourcefile: 'tools-launch-entry.jsx' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    loader: { '.png': 'empty', '.jpg': 'empty', '.svg': 'empty', '.css': 'empty' },
    define: { 'import.meta.env': JSON.stringify({ PROD: false, DEV: false, SSR: true, MODE: 'test' }) },
    plugins: [{
      name: 'tools-launch-switch',
      setup(b) {
        b.onLoad({ filter: LAUNCH_FILE }, (args) => {
          const source = readFileSync(args.path, 'utf8')
          replaced = SWITCH.test(source)
          return { contents: source.replace(SWITCH, `export const TOOLS_LAUNCHED = ${launched}`), loader: 'js' }
        })
      },
    }],
  })
  assert.ok(replaced, 'toolsLaunch.js must declare `export const TOOLS_LAUNCHED = true|false`')
  mkdirSync(OUT_DIR, { recursive: true })
  const file = path.join(OUT_DIR, `render-${launched}.mjs`)
  writeFileSync(file, result.outputFiles[0].text)
  return import(`${pathToFileURL(file).href}?t=${Date.now()}`)
}

const toolHrefs = (html) => [...html.matchAll(/href="(\/tools\/[^"]*)"/g)].map((m) => m[1])
const LANDING_HREFS = TOOL_LANDING_PATHS.map((p) => `${p}/`)

for (const launched of [false, true]) {
  test(`launch switch ${launched ? 'ON' : 'OFF'}: robots meta`, async () => {
    const { seoMetadata } = await loadWithSwitch(launched)
    for (const p of TOOL_LANDING_PATHS) {
      assert.equal(isNoindexPath(p, { toolsLaunched: launched }), !launched, p)
      assert.equal(isNoindexPath(`${p}/`, { toolsLaunched: launched }), !launched, `${p}/`)
      assert.equal(seoMetadata[p].robots, launched ? 'index,follow' : 'noindex,follow', `seoMetadata robots ${p}`)
    }
    assert.equal(isNoindexPath(TOOL_SHARE_VIEW_PATH, { toolsLaunched: launched }), true, 'the share viewer is always noindex')
    assert.equal(seoMetadata[TOOL_SHARE_VIEW_PATH].robots, 'noindex,follow')
    assert.deepEqual(toolsNoindexPaths(launched).includes(TOOL_SHARE_VIEW_PATH), true)
  })

  test(`launch switch ${launched ? 'ON' : 'OFF'}: sitemap`, async () => {
    const routes = await sitemapPageRoutes({ toolsLaunched: launched })
    const tools = routes.filter((r) => r === '/tools' || r.startsWith('/tools/'))
    assert.deepEqual(tools.sort(), launched ? [...TOOL_LANDING_PATHS].sort() : [])
    assert.ok(!routes.includes(TOOL_SHARE_VIEW_PATH), 'the share viewer is never in the sitemap')
    assert.deepEqual(toolsSitemapPaths(launched), launched ? [...TOOL_LANDING_PATHS] : [])
    assert.ok(routes.includes('/pricing'), 'the rest of the sitemap is unaffected')
  })

  test(`launch switch ${launched ? 'ON' : 'OFF'}: links in header, footers, homepage and HTML sitemap`, async () => {
    const { renderAll } = await loadWithSwitch(launched)
    const html = renderAll()
    const staticFooter = footerLinkGroups(launched).flatMap((g) => g.links.map(([, to]) => to))

    if (!launched) {
      for (const [name, markup] of Object.entries(html)) assert.deepEqual(toolHrefs(markup), [], `${name} must not link to /tools/*`)
      assert.ok(!html.homepage.includes('Free Business Tools'), 'homepage section hidden')
      assert.ok(!staticFooter.some((to) => to.startsWith('/tools')), 'prerender footer has no tools group')
      assert.ok(!footerLinkGroups(false).some((g) => g.heading === 'Free Tools'))
      return
    }

    // Header: the "Free Tools" trigger links to the hub (the dropdown items render when it opens).
    assert.ok(toolHrefs(html.header).includes('/tools/'), 'header links to /tools/')
    assert.match(html.header, />Free Tools</)
    // Every footer and the HTML sitemap list the hub and all four tools.
    for (const name of ['publicFooter', 'homepage', 'htmlSitemap']) {
      const hrefs = toolHrefs(html[name])
      for (const href of LANDING_HREFS) assert.ok(hrefs.includes(href), `${name} links to ${href}`)
    }
    for (const p of TOOL_LANDING_PATHS) assert.ok(staticFooter.includes(p), `prerender footer lists ${p}`)
    // Homepage section: its heading, a card per tool and "See all tools".
    assert.match(html.homepage, /Free Business Tools — <span[^>]*>No Signup Needed<\/span>/)
    for (const tool of TOOL_LINKS) assert.ok(html.homepage.includes(`>${tool.label}</h3>`), `homepage card ${tool.label}`)
    assert.match(html.homepage, /href="\/tools\/"[^>]*>See all tools/)
    // The share viewer is never linked.
    for (const markup of Object.values(html)) assert.ok(!markup.includes('/tools/invoice/view'))
  })
}
