/**
 * The free tools pages' content (src/lib/toolsPagesData.js) against the Step 7
 * SEO brief and the spam policies: title/description lengths, the primary
 * keyword in the right places, 6–8 FAQs each, no FAQ or paragraph repeated
 * across pages, low pairwise text similarity, no Pakistan-only framing, and
 * JSON-LD that matches the visible content.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { TOOL_CARDS, TOOL_PAGE_CONTENT, TOOLS_PAGES, plainText } from '../src/lib/toolsPagesData.js'
import { toolPageSchemas } from '../src/lib/toolPages.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'
import { pageText, pairwiseSimilarity } from '../scripts/lib/toolsContentStats.mjs'

const PRIMARY = {
  '/tools': 'free business tools',
  '/tools/invoice-generator': 'free invoice generator',
  '/tools/gst-invoice-generator': 'gst invoice generator',
  '/tools/contractor-invoice-generator': 'contractor invoice generator',
  '/tools/cis-invoice-generator': 'cis invoice generator',
  '/tools/uae-vat-invoice-generator': 'uae vat invoice generator',
  '/tools/thermal-receipt-generator': 'thermal receipt generator',
  '/tools/invoice-on-letterhead': 'invoice on letterhead',
  '/tools/quotation-generator': 'quotation generator',
}

const pages = Object.values(TOOLS_PAGES)
// The keyword's words in order, at most two words apart: the brief's own H1
// "Create an Invoice on Your Own Letterhead" is how "invoice on letterhead"
// reads naturally in a sentence.
const has = (text, keyword) => new RegExp(keyword.split(' ').join('(?:\\W+\\w+){0,2}?\\W+'), 'i').test(plainText(text))

test('titles ≤ 60 chars, descriptions 140–155 chars, canonical with trailing slash', () => {
  for (const page of pages) {
    const seo = seoMetadata[page.path]
    assert.ok(seo.title.length <= 60, `${page.path} title ${seo.title.length}`)
    assert.ok(seo.description.length >= 140 && seo.description.length <= 155, `${page.path} description ${seo.description.length}`)
    assert.equal(seo.canonical, `https://nexorasolution.online${page.path}/`)
    assert.ok(!/pakistan/i.test(`${seo.title} ${seo.description} ${seo.keywords}`), `${page.path} has no Pakistan framing`)
  }
})

test('the primary keyword is in the title, H1, description, first paragraph and one H2', () => {
  for (const page of pages) {
    const keyword = PRIMARY[page.path]
    assert.ok(has(page.seo.title, keyword), `${page.path} title`)
    assert.ok(has(page.h1, keyword), `${page.path} H1`)
    assert.ok(has(page.seo.description, keyword), `${page.path} description`)
    assert.ok(has(page.lead, keyword), `${page.path} first paragraph`)
    const h2s = [page.cardsHeading, ...page.sections.map((s) => s.heading), page.faqHeading].filter(Boolean)
    assert.ok(h2s.some((h) => has(h, keyword)), `${page.path} H2`)
  }
})

test('6–8 FAQs per page, and no question or paragraph appears on two pages', () => {
  const seenQuestions = new Map()
  const seenParagraphs = new Map()
  for (const page of pages) {
    assert.ok(page.faqs.length >= 6 && page.faqs.length <= 8, `${page.path} has ${page.faqs.length} FAQs`)
    for (const { question, answer } of page.faqs) {
      assert.ok(!seenQuestions.has(question), `"${question}" repeats on ${seenQuestions.get(question)} and ${page.path}`)
      seenQuestions.set(question, page.path)
      assert.ok(answer.length > 60, `${page.path}: "${question}" has a real answer`)
    }
    const paragraphs = [page.lead, ...page.sections.flatMap((s) => s.blocks.map((b) => b.p || b.callout).filter(Boolean)), ...page.faqs.map((f) => f.answer)]
    for (const p of paragraphs) {
      assert.ok(!seenParagraphs.has(p), `paragraph repeats on ${seenParagraphs.get(p)} and ${page.path}: ${p.slice(0, 60)}`)
      seenParagraphs.set(p, page.path)
    }
  }
})

test('body copy is 900–1,600 words and no pair of pages is similar', () => {
  for (const page of pages) {
    const words = pageText(page).split(/\s+/).filter(Boolean).length
    assert.ok(words >= 900 && words <= 1600, `${page.path}: ${words} words`)
  }
  const pairs = pairwiseSimilarity(pages)
  const worst = pairs[0]
  assert.ok(worst.jaccard < 0.1, `${worst.a} vs ${worst.b}: ${worst.jaccard}`)
})

test('no claims the codebase cannot back', () => {
  const all = pages.map(pageText).join(' ').toLowerCase()
  for (const banned of ['offline', 'rating', 'award', 'testimonial', 'trusted by', 'users worldwide', 'in today\'s fast-paced']) {
    assert.ok(!all.includes(banned), `"${banned}" must not appear`)
  }
  for (const page of pages) assert.ok(!/pakistan/i.test(pageText(page)), `${page.path} is not Pakistan-only`)
})

test('every tool links to the hub-listed tools; related tools are 2–3 other tools', () => {
  const toolPaths = TOOL_CARDS.map((c) => c.path)
  assert.deepEqual(Object.keys(TOOL_PAGE_CONTENT).sort(), [...toolPaths].sort())
  for (const page of Object.values(TOOL_PAGE_CONTENT)) {
    assert.ok(page.related.length >= 2 && page.related.length <= 3, page.path)
    for (const p of page.related) {
      assert.ok(toolPaths.includes(p) && p !== page.path, `${page.path} → ${p}`)
    }
  }
})

test('JSON-LD: types per page, FAQPage matches the visible FAQ, breadcrumb Home › Free Tools › page', () => {
  for (const page of pages) {
    const schemas = toolPageSchemas(page.path)
    const types = schemas.map((s) => s['@type'])
    assert.deepEqual(types, page.path === '/tools' ? ['CollectionPage', 'FAQPage', 'BreadcrumbList'] : ['WebApplication', 'FAQPage', 'BreadcrumbList'])
    const faq = schemas[1]
    assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), page.faqs.map((f) => [f.question, f.answer]))
    const crumbs = schemas[2].itemListElement
    assert.deepEqual(crumbs.map((c) => c.position), crumbs.map((_, i) => i + 1))
    assert.equal(crumbs[0].item, 'https://nexorasolution.online/')
    assert.equal(crumbs[1].item, 'https://nexorasolution.online/tools/')
    assert.equal(crumbs.at(-1).item, `https://nexorasolution.online${page.path}/`)
    const json = JSON.stringify(schemas)
    assert.ok(!/aggregateRating|"Review"|areaServed/.test(json), `${page.path}: no rating, review or areaServed`)
    if (page.path !== '/tools') {
      const app = schemas[0]
      assert.equal(app.offers.price, '0')
      assert.equal(app.offers.priceCurrency, 'USD')
      assert.equal(app.applicationCategory, 'BusinessApplication')
      assert.equal(app.operatingSystem, 'Any (web browser)')
    } else {
      assert.equal(schemas[0].mainEntity['@type'], 'ItemList')
      assert.equal(schemas[0].mainEntity.itemListElement.length, 8)
    }
  }
})
