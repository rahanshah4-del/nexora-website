/**
 * Post-build: inline the above-the-fold CSS of the homepage into dist/index.html and
 * load the full stylesheet without blocking first paint (beasties, "swap" preload).
 * Only the homepage is processed; every other page keeps its normal stylesheet link.
 * Safe to skip: if beasties fails, the original file is left untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import Beasties from 'beasties'

/**
 * Hold the app's JavaScript back until the first paint. The page is already prerendered,
 * so it is readable and styled without JS; fetching ~280 KB of scripts at the same time
 * only slows the first paint on slow phones. Scripts start right after first paint (or
 * after 2.5 s at the latest) and hydrate the page exactly as before.
 */
function deferAppScripts(html) {
  const preloads = [...html.matchAll(/<link rel="modulepreload"[^>]*href="(\/assets\/[^"]+)"[^>]*>/g)].map((m) => m[1])
  const entry = html.match(/<script type="module"[^>]*src="(\/assets\/[^"]+)"[^>]*><\/script>/)
  if (!entry || preloads.length === 0) return html
  const loader = `<script>(function(){var d=0,p=${JSON.stringify(preloads)};function go(){if(d)return;d=1;p.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.href=h;document.head.appendChild(l)});import(${JSON.stringify(entry[1])})}try{new PerformanceObserver(function(l,o){if(l.getEntriesByName('first-contentful-paint').length){o.disconnect();setTimeout(go,0)}}).observe({type:'paint',buffered:true})}catch(e){go()}setTimeout(go,2500)})()</script>`
  return html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '').replace(entry[0], loader)
}

const dist = new URL('../dist/', import.meta.url).pathname
const file = `${dist}index.html`
try {
  const html = readFileSync(file, 'utf8')
  const beasties = new Beasties({ path: dist, publicPath: '/', preload: 'swap', inlineFonts: false, pruneSource: false, logLevel: 'warn' })
  let out = await beasties.process(html)
  out = deferAppScripts(out)
  writeFileSync(file, out)
  console.log(`[critical-css] homepage ${Math.round(html.length / 1000)}KB -> ${Math.round(out.length / 1000)}KB`)
} catch (err) {
  console.warn('[critical-css] skipped:', err.message)
}
