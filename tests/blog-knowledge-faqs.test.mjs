/**
 * FAQ shapes accepted by the AI knowledge summary.
 *
 * Static articles (src/lib/blogData.js) and the Control Centre editor produce
 * [question, answer] pairs; blogPosts documents in Firestore store
 * { question, answer } objects. buildBlogSummary runs outside the retry/catch in
 * ingestBlogKnowledge, so a shape it cannot read aborts ingestion for the whole
 * post — which is what happened to every Firestore-sourced post.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBlogSummary, normalizeFaqEntries } from '../src/lib/blogKnowledge.js'

const PAIRS = [
  ['Is pharmacy POS different?', 'It is built around batch and expiry visibility.'],
  ['Does it work offline?', 'Yes, billing keeps working during a connectivity drop.'],
]

const OBJECTS = [
  { question: 'Is pharmacy POS different?', answer: 'It is built around batch and expiry visibility.' },
  { question: 'Does it work offline?', answer: 'Yes, billing keeps working during a connectivity drop.' },
]

test('both FAQ shapes normalize to the same pairs', () => {
  assert.deepEqual(normalizeFaqEntries(PAIRS), PAIRS)
  assert.deepEqual(normalizeFaqEntries(OBJECTS), PAIRS)
  // Firestore key order is not guaranteed; answer-first must work too.
  assert.deepEqual(normalizeFaqEntries([{ answer: 'A.', question: 'Q?' }]), [['Q?', 'A.']])
})

test('malformed entries are skipped, never thrown', () => {
  const malformed = [
    null,
    undefined,
    'just a string',
    42,
    [],
    ['question only'],
    [null, 'answer only'],
    { question: 'no answer' },
    { answer: 'no question' },
    { question: '', answer: 'empty question' },
    { question: '   ', answer: 'whitespace question' },
    { question: 'Q?', answer: '   ' },
    { question: 5, answer: 6 },
  ]
  assert.deepEqual(normalizeFaqEntries(malformed), [])

  // A good entry survives alongside bad ones.
  assert.deepEqual(
    normalizeFaqEntries([null, { question: ' Q? ', answer: ' A. ' }, 'junk']),
    [['Q?', 'A.']],
  )
})

test('non-array faqs are tolerated', () => {
  for (const value of [undefined, null, 'faqs', 7, {}, { question: 'Q?', answer: 'A.' }]) {
    assert.deepEqual(normalizeFaqEntries(value), [], JSON.stringify(value) || 'undefined')
  }
})

test('buildBlogSummary renders FAQs from either shape identically', () => {
  const article = {
    slug: 'property-management-software-pakistan-guide',
    title: 'Property Management Software in Pakistan',
    category: 'Business Tips',
    excerpt: 'How landlords and building managers can move off registers and Excel sheets.',
    tags: ['Property ERP', 'Landlords'],
    sections: [{ heading: 'Article guide', paragraphs: ['Rental portfolios still run on registers.'] }],
  }
  const fromPairs = buildBlogSummary({ ...article, faqs: PAIRS })
  const fromObjects = buildBlogSummary({ ...article, faqs: OBJECTS })

  assert.equal(fromPairs, fromObjects)
  assert.match(fromPairs, /--- FAQs ---/)
  assert.match(fromPairs, /Q: Is pharmacy POS different\?/)
  assert.match(fromPairs, /A: It is built around batch and expiry visibility\./)
})

test('a Firestore-shaped post no longer aborts the summary', () => {
  // The exact shape read back from blogPosts/<slug>: faqs as maps, one of them
  // incomplete. Before the fix this threw "is not iterable" and no knowledge was
  // ever ingested for any CMS post.
  const firestorePost = {
    slug: 'property-management-software-pakistan-guide',
    title: 'Property Management Software in Pakistan',
    sections: [{ heading: 'Article guide', paragraphs: ['A paragraph long enough to matter.'] }],
    faqs: [
      { answer: 'Yes — most portfolios start there.', question: 'Can I migrate from Excel?' },
      { question: 'Incomplete entry with no answer' },
    ],
  }
  const summary = buildBlogSummary(firestorePost)
  assert.match(summary, /Q: Can I migrate from Excel\?/)
  assert.doesNotMatch(summary, /Incomplete entry/)
})

test('FAQs are omitted entirely when none survive normalization', () => {
  const summary = buildBlogSummary({
    slug: 'x',
    title: 'T',
    sections: [{ heading: 'H', paragraphs: ['P'] }],
    faqs: [{ question: 'no answer' }, null],
  })
  assert.doesNotMatch(summary, /--- FAQs ---/)
})
