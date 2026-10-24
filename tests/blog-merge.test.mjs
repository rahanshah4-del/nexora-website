import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeBlogArticles } from '../src/lib/blogData.js'

const staticPost = (slug, updatedDate) => ({ slug, title: slug, publishDate: '2026-07-07', updatedDate, source: 'static' })
const cmsPost = (slug, updatedDate) => ({ slug, title: `${slug} (cms)`, publishDate: '2026-07-07', updatedDate, source: 'cms' })

test('a CMS post overrides a static article updated on the same day or earlier', () => {
  const merged = mergeBlogArticles([cmsPost('a', '2026-09-07'), cmsPost('b', '2026-09-20')], [staticPost('a', '2026-09-07'), staticPost('b', '2026-09-15')])
  assert.equal(merged.find((x) => x.slug === 'a').source, 'cms')
  assert.equal(merged.find((x) => x.slug === 'b').source, 'cms')
})

test('a static article rewritten after its CMS copy was last edited wins', () => {
  const merged = mergeBlogArticles([cmsPost('a', '2026-09-07')], [staticPost('a', '2026-10-24')])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].source, 'static')
})

test('the admin view always shows the CMS copy', () => {
  const merged = mergeBlogArticles([cmsPost('a', '2026-09-07')], [staticPost('a', '2026-10-24')], { cmsAlwaysWins: true })
  assert.equal(merged[0].source, 'cms')
})

test('a CMS post with no usable date still overrides, as before', () => {
  const merged = mergeBlogArticles([{ ...cmsPost('a', ''), publishDate: '' }], [staticPost('a', '2026-10-24')])
  assert.equal(merged[0].source, 'cms')
})

test('the real what-is-pos-software rewrite beats its 2026-09-07 CMS import', () => {
  const merged = mergeBlogArticles([cmsPost('what-is-pos-software', '2026-09-07')])
  const post = merged.find((x) => x.slug === 'what-is-pos-software')
  assert.equal(post.source, 'static')
  assert.ok(post.sections.some((s) => s.id === 'first-week'))
})
