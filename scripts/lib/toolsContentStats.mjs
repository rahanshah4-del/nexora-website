/**
 * Text statistics for the free tools pages (src/lib/toolsPagesData.js): the
 * page's body copy as plain text, and pairwise similarity between pages — the
 * duplicate-content check for the Step 7 report and tests/tools-pages.test.mjs.
 *
 * Two measures per pair:
 *   jaccard — overlap of 5-word shingles (shared phrasing / copied sentences);
 *   cosine  — term-frequency cosine over words of 4+ letters (shared topic
 *             vocabulary; expected to be moderate, since all pages are about
 *             business documents).
 */
import { plainText } from '../../src/lib/toolsPagesData.js'

/** Everything a visitor reads in the page body, headings included. */
export function pageText(page) {
  const out = [page.h1, page.valueProp, page.lead, page.cardsHeading, page.cardsIntro]
  for (const section of page.sections) {
    out.push(section.heading)
    for (const block of section.blocks) {
      if (block.p) out.push(block.p)
      if (block.h3) out.push(block.h3)
      if (block.callout) out.push(block.callout)
      if (block.steps) for (const s of block.steps) out.push(s.title, s.text)
      if (block.list) for (const item of block.list) out.push(typeof item === 'string' ? item : `${item.title} ${item.text}`)
      if (block.table) out.push(block.table.columns.join(' '), ...block.table.rows.map((r) => r.join(' ')))
    }
  }
  out.push(page.faqHeading)
  for (const f of page.faqs) out.push(f.question, f.answer)
  if (page.cta) out.push(page.cta.heading, page.cta.text)
  return plainText(out.filter(Boolean).join('\n'))
}

const words = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

function shingles(text, n = 5) {
  const w = words(text)
  const set = new Set()
  for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(' '))
  return set
}

function termFrequencies(text) {
  const tf = new Map()
  for (const w of words(text)) if (w.length >= 4) tf.set(w, (tf.get(w) || 0) + 1)
  return tf
}

function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k) }
  for (const v of b.values()) nb += v * v
  return dot / Math.sqrt(na * nb)
}

/** Every pair of pages, most similar (by shingle Jaccard) first. */
export function pairwiseSimilarity(pages) {
  const data = pages.map((page) => {
    const text = pageText(page)
    return { path: page.path, sh: shingles(text), tf: termFrequencies(text) }
  })
  const pairs = []
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i]
      const b = data[j]
      let shared = 0
      for (const s of a.sh) if (b.sh.has(s)) shared++
      const jaccard = shared / (a.sh.size + b.sh.size - shared)
      pairs.push({ a: a.path, b: b.path, jaccard: +jaccard.toFixed(4), sharedShingles: shared, cosine: +cosine(a.tf, b.tf).toFixed(3) })
    }
  }
  return pairs.sort((x, y) => y.jaccard - x.jaccard)
}
