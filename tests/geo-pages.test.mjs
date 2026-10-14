/** /geo/ guides: data shape, SEO limits, schemas, routing and sitemap wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GEO_HUB, GEO_HUB_PATH, GEO_PAGES, GEO_PATHS, geoHubSchemas, geoPageSchemas, getGeoPage } from '../src/lib/geoPages.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'
import { isNoindexPath } from '../src/lib/indexingRules.js'

const words = (t) => t.trim().split(/\s+/).length
const LINK = /\]\((\/[^)\s]*)\)/g

function internalLinks(page) {
  const found = []
  const scan = (text) => { for (const m of String(text).matchAll(LINK)) found.push(m[1]) }
  for (const section of page.sections) {
    for (const block of section.blocks) {
      if (block.p) scan(block.p)
      if (block.callout) scan(block.callout)
      if (block.steps) block.steps.forEach((s) => scan(s.text))
      if (block.list) block.list.forEach(scan)
    }
  }
  return found
}

test('slugs and paths are unique and match', () => {
  const slugs = GEO_PAGES.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const page of GEO_PAGES) assert.equal(page.path, `/geo/${page.slug}`)
  assert.deepEqual(GEO_PATHS, [GEO_HUB_PATH, ...GEO_PAGES.map((p) => p.path)])
  assert.equal(getGeoPage('nope'), null)
})

test('every page has SEO within search limits and a seoMetadata entry', () => {
  for (const page of [{ path: GEO_HUB_PATH, seo: GEO_HUB.seo }, ...GEO_PAGES]) {
    assert.ok(page.seo.title.length <= 60, `${page.path} title ${page.seo.title.length}`)
    assert.ok(page.seo.description.length >= 110 && page.seo.description.length <= 160, `${page.path} description ${page.seo.description.length}`)
    const meta = seoMetadata[page.path]
    assert.ok(meta, `${page.path} in seoMetadata`)
    assert.equal(meta.title, page.seo.title)
    assert.equal(meta.robots, 'index,follow')
    assert.equal(meta.canonical, `https://nexorasolution.online${page.path}/`)
    assert.ok(!isNoindexPath(page.path), `${page.path} is indexable`)
  }
})

test('every guide opens with a 30-60 word answer, has sections and 3+ FAQs', () => {
  for (const page of GEO_PAGES) {
    const n = words(page.lead)
    assert.ok(n >= 30 && n <= 60, `${page.slug} lead is ${n} words`)
    assert.ok(page.sections.length >= 3, `${page.slug} sections`)
    assert.ok(page.faqs.length >= 3, `${page.slug} faqs`)
    const ids = page.sections.map((s) => s.id)
    assert.equal(new Set(ids).size, ids.length, `${page.slug} section ids unique`)
    for (const section of page.sections) {
      const first = section.blocks[0]
      assert.ok(first.p || first.table, `${page.slug}/${section.id} starts with an answer`)
    }
  }
})

test('internal links point to real pages and each guide links to GeoLint and a sibling guide', () => {
  const real = new Set([...GEO_PATHS, '/tools/geo-audit', '/tools/geo-audit/how-it-works', '/tools/geo-audit/fix', '/tools', '/refund-policy'])
  for (const page of GEO_PAGES) {
    const links = internalLinks(page)
    for (const link of links) assert.ok(real.has(link), `${page.slug} links to unknown ${link}`)
    assert.ok(page.cta.links.some((l) => l.to === '/tools/geo-audit'), `${page.slug} CTA links to GeoLint`)
    assert.ok(page.related.length >= 1)
    for (const slug of page.related) assert.ok(getGeoPage(slug), `${page.slug} related ${slug}`)
  }
})

test('schemas: Article, FAQPage mirroring the visible FAQ, BreadcrumbList', () => {
  for (const page of GEO_PAGES) {
    const schemas = geoPageSchemas(page)
    const types = schemas.map((s) => s['@type'])
    assert.deepEqual(types, page.service ? ['Article', 'Service', 'FAQPage', 'BreadcrumbList'] : ['Article', 'FAQPage', 'BreadcrumbList'])
    const faq = schemas.find((s) => s['@type'] === 'FAQPage')
    const crumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    assert.equal(faq.mainEntity.length, page.faqs.length)
    assert.equal(crumbs['@type'], 'BreadcrumbList')
    assert.equal(crumbs.itemListElement.at(-1).item, `https://nexorasolution.online${page.path}/`)
  }
  const hub = geoHubSchemas()
  assert.deepEqual(hub.map((s) => s['@type']), ['CollectionPage', 'FAQPage', 'BreadcrumbList'])
  assert.equal(hub[0].mainEntity.itemListElement.length, GEO_PAGES.length)
})

test('router, prerender and sitemap are wired to the GEO data', () => {
  const router = readFileSync(new URL('../src/AppRouter.jsx', import.meta.url), 'utf8')
  assert.match(router, /path="\/geo"/)
  assert.match(router, /GEO_PAGES\.map/)
  const prerender = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8')
  assert.match(prerender, /toolRoute\(GEO_HUB_PATH/)
  assert.match(prerender, /GEO_PAGES\.map\(\(page\) => toolRoute\(page\.path/)
  const sitemap = readFileSync(new URL('../scripts/generate-sitemap.mjs', import.meta.url), 'utf8')
  assert.match(sitemap, /\.\.\.GEO_PATHS/)
})

test('no invented numbers: pages carry no statistics or percentages', () => {
  for (const page of GEO_PAGES) {
    const text = JSON.stringify(page)
    assert.ok(!/\d+\s?%/.test(text), `${page.slug} contains a percentage`)
  }
})

test('the fix page price in the Service schema matches the visible copy', () => {
  const page = getGeoPage('fix-my-website')
  assert.ok(page.service)
  const service = geoPageSchemas(page).find((s) => s['@type'] === 'Service')
  assert.equal(service.offers.price, '50')
  assert.equal(service.offers.priceCurrency, 'USD')
  assert.match(page.lead, /\$50 per website/)
  assert.match(page.seo.title, /\$50/)
  assert.ok(page.faqs.some((f) => /\$50 per website/.test(f.answer)))
  assert.ok(page.cta.links.some((l) => l.to === '/tools/geo-audit/fix' && l.primary))
})

test('every guide is linked from at least one other guide or the hub', () => {
  for (const page of GEO_PAGES) {
    const inbound = GEO_PAGES.filter((p) => p.slug !== page.slug && (p.related.includes(page.slug) || internalLinks(p).includes(page.path)))
    assert.ok(inbound.length >= 1, `${page.slug} has an inbound guide link`)
  }
})
