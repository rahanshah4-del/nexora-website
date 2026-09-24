import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BLOG_POST_SEED_ID,
  readBlogPostSeed,
  renderBlogPostSeedScript,
  serializeBlogPostSeed,
} from '../src/lib/blogPostSeed.js'
import { truncateAtWord } from '../src/lib/blogData.js'
import { createHighlightBudget, formatBlogContent } from '../src/lib/blogContentFormatter.js'

// --- seed serialisation ----------------------------------------------------

const HOSTILE = '</script><script>alert(1)</script>'

test('a post containing </script> cannot break out of the JSON block', () => {
  const article = { slug: 'hostile', title: HOSTILE, sections: [{ paragraphs: [HOSTILE] }] }
  const html = renderBlogPostSeedScript(article)
  const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))

  // Nothing that could close the element or open a tag survives in the payload.
  assert.ok(!json.includes('</script'), 'raw </script found in JSON block')
  assert.ok(!json.includes('<'), 'raw < found in JSON block')
  assert.ok(!json.includes('>'), 'raw > found in JSON block')
  // Exactly one closing tag in the whole element: the real one.
  assert.equal(html.split('</script>').length - 1, 1)

  // And it still round-trips to the original text.
  assert.deepEqual(JSON.parse(json), article)
  assert.equal(JSON.parse(json).title, HOSTILE)
})

test('escapes ampersands and the JS line terminators U+2028 / U+2029', () => {
  const article = { slug: 'edge', title: 'Tom & Jerry', excerpt: 'a b c' }
  const json = serializeBlogPostSeed(article)
  assert.ok(!json.includes('&'))
  assert.ok(!json.includes(' '))
  assert.ok(!json.includes(' '))
  assert.ok(json.includes('\\u0026') && json.includes('\\u2028') && json.includes('\\u2029'))
  assert.deepEqual(JSON.parse(json), article)
})

test('renderBlogPostSeedScript needs a slug', () => {
  assert.equal(renderBlogPostSeedScript(null), '')
  assert.equal(renderBlogPostSeedScript({ title: 'no slug' }), '')
  assert.ok(renderBlogPostSeedScript({ slug: 'x' }).startsWith(`<script type="application/json" id="${BLOG_POST_SEED_ID}">`))
})

// --- seed reading ----------------------------------------------------------

// Minimal stand-in for the one DOM call readBlogPostSeed makes.
function fakeDoc(textContent) {
  let removed = false
  return {
    getElementById: (id) => (id === BLOG_POST_SEED_ID && !removed
      ? { textContent, remove: () => { removed = true } }
      : null),
    wasRemoved: () => removed,
  }
}

test('reads the seed only for the slug being rendered', () => {
  const doc = fakeDoc(JSON.stringify({ slug: 'post-a', title: 'A' }))
  assert.equal(readBlogPostSeed('post-b', doc), null, 'a different slug must not be served the seed')
  assert.equal(doc.wasRemoved(), false, 'a mismatched read must leave the node alone')
  assert.deepEqual(readBlogPostSeed('post-a', doc), { slug: 'post-a', title: 'A' })
  assert.equal(doc.wasRemoved(), true, 'a consumed seed is removed so it cannot go stale')
})

test('a missing, malformed or slugless seed degrades to null, never throws', () => {
  assert.equal(readBlogPostSeed('x', fakeDoc('{ not json')), null)
  assert.equal(readBlogPostSeed('x', fakeDoc('null')), null)
  assert.equal(readBlogPostSeed('x', { getElementById: () => null }), null)
  assert.equal(readBlogPostSeed('', fakeDoc('{}')), null)
  assert.equal(readBlogPostSeed('x', null), null)
})

// --- highlight budget ------------------------------------------------------

const PARAGRAPH = 'Our POS handles inventory and billing, so inventory and billing stay in one POS.'

test('without a budget every occurrence is still highlighted (unchanged default)', () => {
  const out = formatBlogContent(PARAGRAPH, { html: true })
  assert.ok((out.match(/class="blog-term"/g) || []).length > 4)
})

test('with a budget each term is highlighted once across the whole article', () => {
  const budget = createHighlightBudget()
  const paragraphs = [PARAGRAPH, PARAGRAPH, PARAGRAPH].map((p) => formatBlogContent(p, { html: true, budget }))
  const counts = paragraphs.join('').match(/class="blog-term"/g) || []
  assert.ok(counts.length <= 10, `expected <= 10 highlights, got ${counts.length}`)
  // Second and third paragraphs repeat the same terms, so they add nothing.
  assert.equal((paragraphs[1].match(/class="blog-term"/g) || []).length, 0)
  assert.equal((paragraphs[2].match(/class="blog-term"/g) || []).length, 0)
})

test('the budget caps an article that keeps introducing new terms', () => {
  const budget = createHighlightBudget(3)
  const out = formatBlogContent('POS inventory billing dashboard reporting analytics workflow', { html: true, budget })
  assert.equal((out.match(/class="blog-term"/g) || []).length, 3)
  assert.equal(budget.remaining, 0)
})

test('highlight spans never nest inside one another', () => {
  const budget = createHighlightBudget()
  const out = formatBlogContent('A modern POS system beats an old POS system.', { html: true, budget })
  assert.ok(!/<span class="blog-term">[^<]*<span class="blog-term">/.test(out), `nested span: ${out}`)
})

// --- excerpt / meta truncation --------------------------------------------

test('truncateAtWord never cuts mid-word and only adds … when it cuts', () => {
  assert.equal(truncateAtWord('short enough', 40), 'short enough')
  assert.equal(truncateAtWord('', 40), '')
  const long = 'unified billing, supplier management, customer records and pharmacy reporting with one tool'
  const cut = truncateAtWord(long, 60)
  assert.ok(cut.length <= 60, `got ${cut.length}`)
  assert.ok(cut.endsWith('…'))
  // The character before the ellipsis ends a whole word from the source.
  const lastWord = cut.slice(0, -1).split(' ').pop()
  assert.ok(long.split(/[\s,]+/).includes(lastWord), `"${lastWord}" is not a whole word from the source`)
  assert.ok(!cut.includes('wit…'), 'cut mid-word')
})

test('truncateAtWord hard-cuts a single word longer than the cap', () => {
  const out = truncateAtWord('Supercalifragilisticexpialidocious', 10)
  assert.ok(out.length <= 10)
  assert.ok(out.endsWith('…'))
})
