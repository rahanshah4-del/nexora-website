/** Temp mail guide pages: data shape, length, SEO limits, uniqueness, links and wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TEMP_MAIL_GUIDES, TEMP_MAIL_GUIDE_PATHS, getTempMailGuide, tempMailGuideSchemas } from '../src/lib/tempMailGuides.js'
import { TEMP_MAIL_PATH } from '../src/lib/tempMailLaunch.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'
import { isNoindexPath } from '../src/lib/indexingRules.js'

const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length
const LINK = /\]\((\/[^)\s]*)\)/g
const BANNED = [/in today'?s (digital|fast)/i, /\bdelve/i, /\blandscape\b/i, /\bcrucial\b/i, /\bseamless/i, /\brobust\b/i, /\bleverag/i, /game[- ]changer/i, /\bunlock the\b/i, /it is important to note/i, /\bwhether you(?:'re| are)\b/i]

function texts(page) {
  const out = [page.lead]
  for (const s of page.sections) {
    out.push(s.heading)
    for (const b of s.blocks) {
      if (b.p) out.push(b.p)
      if (b.h3) out.push(b.h3)
      if (b.callout) out.push(b.callout)
      if (b.list) out.push(...b.list)
      if (b.steps) b.steps.forEach((x) => out.push(x.title, x.text))
      if (b.table) out.push(b.table.caption, ...b.table.columns, ...b.table.rows.flat())
    }
  }
  for (const f of page.faqs) out.push(f.question, f.answer)
  return out
}
const proseBlocks = (page) => page.sections.flatMap((s) => s.blocks.flatMap((b) => (b.p ? [b.p] : [])))

test('slugs and paths are unique and under /tools/temp-mail/', () => {
  const slugs = TEMP_MAIL_GUIDES.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const page of TEMP_MAIL_GUIDES) assert.equal(page.path, `${TEMP_MAIL_PATH}/${page.slug}`)
  assert.deepEqual(TEMP_MAIL_GUIDE_PATHS, TEMP_MAIL_GUIDES.map((p) => p.path))
  assert.equal(getTempMailGuide('nope'), null)
})

test('SEO is within limits, indexable and in seoMetadata', () => {
  for (const page of TEMP_MAIL_GUIDES) {
    assert.ok(page.seo.title.length <= 60, `${page.slug} title ${page.seo.title.length}`)
    assert.ok(page.seo.description.length >= 110 && page.seo.description.length <= 160, `${page.slug} description ${page.seo.description.length}`)
    const meta = seoMetadata[page.path]
    assert.ok(meta, `${page.path} in seoMetadata`)
    assert.equal(meta.title, page.seo.title)
    assert.equal(meta.robots, 'index,follow')
    assert.equal(meta.canonical, `https://nexorasolution.us${page.path}/`)
    assert.ok(!isNoindexPath(page.path))
  }
})

test('each page is 2,500 to 3,000 words with an answer-first lead and 7+ FAQs', () => {
  for (const page of TEMP_MAIL_GUIDES) {
    const total = texts(page).reduce((n, t) => n + words(t), 0)
    assert.ok(total >= 2500 && total <= 3000, `${page.slug} has ${total} words`)
    const lead = words(page.lead)
    assert.ok(lead >= 30 && lead <= 60, `${page.slug} lead ${lead} words`)
    assert.ok(page.faqs.length >= 7, `${page.slug} faqs`)
    assert.ok(page.sections.length >= 7, `${page.slug} sections`)
    const ids = page.sections.map((s) => s.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const s of page.sections) assert.ok(s.blocks[0].p || s.blocks[0].table, `${page.slug}/${s.id} opens with an answer`)
  }
})

test('no stock AI phrasing', () => {
  for (const page of TEMP_MAIL_GUIDES) {
    const all = texts(page).join('\n')
    for (const re of BANNED) assert.ok(!re.test(all), `${page.slug} matches ${re}`)
  }
})

test('no paragraph, FAQ answer or heading repeats across pages', () => {
  const seen = new Map()
  const check = (kind, value, slug) => {
    const key = value.trim().toLowerCase()
    assert.ok(!seen.has(`${kind}:${key}`), `${kind} repeated on ${slug} and ${seen.get(`${kind}:${key}`)}: ${value.slice(0, 60)}`)
    seen.set(`${kind}:${key}`, slug)
  }
  for (const page of TEMP_MAIL_GUIDES) {
    for (const p of proseBlocks(page)) check('p', p, page.slug)
    for (const f of page.faqs) { check('q', f.question, page.slug); check('a', f.answer, page.slug) }
    for (const s of page.sections) check('h', s.heading, page.slug)
    check('title', page.seo.title, page.slug)
    check('description', page.seo.description, page.slug)
  }
})

test('no two pages share a long run of words', () => {
  const grams = (page) => {
    const w = proseBlocks(page).join(' ').replace(/\]\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
    const set = new Set()
    for (let i = 0; i + 12 <= w.length; i++) set.add(w.slice(i, i + 12).join(' '))
    return set
  }
  const sets = TEMP_MAIL_GUIDES.map((p) => [p.slug, grams(p)])
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const shared = [...sets[i][1]].filter((g) => sets[j][1].has(g))
    assert.equal(shared.length, 0, `${sets[i][0]} and ${sets[j][0]} share: ${shared[0]}`)
  }
})

test('internal links resolve and every guide is linked from siblings and links to the tool', () => {
  const real = new Set([...TEMP_MAIL_GUIDE_PATHS, TEMP_MAIL_PATH, '/tools'])
  for (const page of TEMP_MAIL_GUIDES) {
    const links = []
    for (const t of texts(page)) for (const m of t.matchAll(LINK)) links.push(m[1])
    for (const l of links) assert.ok(real.has(l), `${page.slug} links to unknown ${l}`)
    assert.ok(links.includes(TEMP_MAIL_PATH), `${page.slug} links to the tool`)
    assert.ok(new Set(links.filter((l) => l !== TEMP_MAIL_PATH && l !== page.path)).size >= 2, `${page.slug} links to 2+ siblings`)
    assert.ok(!links.includes(page.path), `${page.slug} links to itself`)
    for (const r of page.related) assert.ok(getTempMailGuide(r), `${page.slug} related ${r}`)
    const inbound = TEMP_MAIL_GUIDES.filter((p) => p.slug !== page.slug && p.related.includes(page.slug))
    assert.ok(inbound.length >= 1, `${page.slug} has an inbound related link`)
  }
})

test('schemas: Article, FAQPage and BreadcrumbList; FAQ mirrors the page', () => {
  for (const page of TEMP_MAIL_GUIDES) {
    const s = tempMailGuideSchemas(page)
    assert.deepEqual(s.map((x) => x['@type']), ['Article', 'FAQPage', 'BreadcrumbList'])
    assert.equal(s[1].mainEntity.length, page.faqs.length)
  }
})

test('wiring: router, prerender, sitemap', () => {
  assert.match(readFileSync('src/AppRouter.jsx', 'utf8'), /TEMP_MAIL_GUIDES\.map/)
  assert.match(readFileSync('scripts/prerender.mjs', 'utf8'), /TEMP_MAIL_GUIDES\.map\(\(page\) => toolRoute\(page\.path/)
  assert.match(readFileSync('scripts/generate-sitemap.mjs', 'utf8'), /TEMP_MAIL_GUIDE_PATHS/)
})
