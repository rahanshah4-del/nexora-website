/**
 * Audits the prerendered free tools pages in dist/ (run after `npm run build`):
 * per page the title and description lengths, H1, heading outline, body word
 * count, FAQ count, page-level JSON-LD types (validated for required
 * properties), canonical, robots and internal links out of the main content;
 * then the pairwise text similarity of the pages' copy.
 *
 *   node scripts/audit-tools-pages.mjs          # table + checks
 *   node scripts/audit-tools-pages.mjs --json   # machine-readable
 *
 * Exits 1 when a check fails (more than one H1, a skipped heading level,
 * invalid JSON-LD, a FAQPage that differs from the visible FAQ).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLS_PAGES } from '../src/lib/toolsPagesData.js'
import { pairwiseSimilarity } from './lib/toolsContentStats.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const strip = (html) => decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (html, re) => decode(html.match(re)?.[1] || '')

function validateSchema(schema, page) {
  const errors = []
  const need = (cond, msg) => { if (!cond) errors.push(`${schema['@type']}: ${msg}`) }
  need(schema['@context'] === 'https://schema.org', '@context')
  switch (schema['@type']) {
    case 'WebApplication':
      need(schema.name && schema.url && schema.applicationCategory && schema.operatingSystem, 'name/url/applicationCategory/operatingSystem')
      need(schema.offers?.['@type'] === 'Offer' && schema.offers.price === '0' && schema.offers.priceCurrency === 'USD', 'offers price 0 USD')
      need(!('areaServed' in schema) && !('aggregateRating' in schema) && !('review' in schema), 'no areaServed/aggregateRating/review')
      break
    case 'FAQPage':
      need(Array.isArray(schema.mainEntity) && schema.mainEntity.every((q) => q['@type'] === 'Question' && q.name && q.acceptedAnswer?.['@type'] === 'Answer' && q.acceptedAnswer.text), 'Question/Answer items')
      need(JSON.stringify(schema.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])) === JSON.stringify(page.faqs.map((f) => [f.question, f.answer])), 'matches the visible FAQ')
      break
    case 'BreadcrumbList':
      need(schema.itemListElement?.every((item, i) => item['@type'] === 'ListItem' && item.position === i + 1 && item.name && /^https:\/\/nexorasolution\.online\/.*\/?$/.test(item.item)), 'ListItem position/name/item')
      break
    case 'CollectionPage':
      need(schema.url && schema.name && schema.mainEntity?.['@type'] === 'ItemList', 'url/name/mainEntity ItemList')
      need(schema.mainEntity.itemListElement.every((item, i) => item.position === i + 1 && item.name && item.url), 'ItemList items')
      break
    default:
      errors.push(`unexpected type ${schema['@type']}`)
  }
  return errors
}

function auditPage(page) {
  const file = path.join(ROOT, 'dist', page.path.slice(1), 'index.html')
  const html = readFileSync(file, 'utf8')
  const main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] || ''
  const headings = [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ level: Number(m[1]), text: strip(m[2]) }))
  const h1s = [...html.matchAll(/<h1\b/g)].length
  const skipped = headings.some((h, i) => i > 0 && h.level > headings[i - 1].level + 1)
  const schemas = [...html.matchAll(/<script type="application\/ld\+json" data-nexora-page-schema="true">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  const schemaErrors = schemas.flatMap((s) => validateSchema(s, page))
  const links = [...new Set([...main.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/g)].map((m) => m[1]))]
  const faqCount = [...main.matchAll(/<details\b/g)].length
  return {
    path: `${page.path}/`,
    title: attr(html, /<title>([^<]*)<\/title>/),
    titleLength: attr(html, /<title>([^<]*)<\/title>/).length,
    descriptionLength: attr(html, /<meta name="description" content="([^"]*)"/).length,
    robots: attr(html, /<meta name="robots" content="([^"]*)"/) || '(none: indexable)',
    canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
    h1: headings.find((h) => h.level === 1)?.text,
    h1Count: h1s,
    outline: headings.filter((h) => h.level > 1).map((h) => `${'  '.repeat(h.level - 2)}H${h.level} ${h.text}`),
    skippedLevel: skipped,
    words: strip(main).split(' ').length,
    faqCount,
    jsonLdTypes: schemas.map((s) => s['@type']),
    schemaErrors,
    linksOut: links,
  }
}

const results = Object.values(TOOLS_PAGES).map(auditPage)
const similarity = pairwiseSimilarity(Object.values(TOOLS_PAGES))
const failures = results.flatMap((r) => [
  ...(r.h1Count !== 1 ? [`${r.path}: ${r.h1Count} H1s`] : []),
  ...(r.skippedLevel ? [`${r.path}: skipped heading level`] : []),
  ...r.schemaErrors.map((e) => `${r.path}: ${e}`),
])

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ results, similarity, failures }, null, 2))
} else {
  for (const r of results) {
    console.log(`\n${r.path}`)
    console.log(`  title (${r.titleLength}): ${r.title}`)
    console.log(`  description: ${r.descriptionLength} chars · robots: ${r.robots} · canonical: ${r.canonical}`)
    console.log(`  H1 (${r.h1Count}): ${r.h1}`)
    console.log(`  words in <main>: ${r.words} · FAQs: ${r.faqCount} · JSON-LD: ${r.jsonLdTypes.join(', ')}`)
    console.log('  outline:')
    for (const line of r.outline) console.log(`    ${line}`)
    console.log(`  internal links out of <main>: ${r.linksOut.join(' ')}`)
  }
  console.log('\nPairwise similarity (5-word shingle Jaccard, word cosine), most similar first:')
  for (const p of similarity) console.log(`  ${p.jaccard.toFixed(4)}  cos ${p.cosine}  ${p.a} ↔ ${p.b}  (${p.sharedShingles} shared 5-word phrases)`)
  console.log(failures.length ? `\n✗ ${failures.length} problem(s):\n  ${failures.join('\n  ')}` : '\n✓ One H1 per page, no skipped heading levels, JSON-LD valid and matching the visible FAQ')
}
process.exit(failures.length ? 1 : 0)
