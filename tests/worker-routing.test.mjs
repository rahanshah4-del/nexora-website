// Edge routing decisions in worker/index.js: which paths get the SPA shell at
// 200 and which get a real 404. The HTMLRewriter branches need the Workers
// runtime, so what is exercised here is the path classification and the
// Firestore lookup URL — the two places a mistake silently changes what search
// engines see.

import assert from 'node:assert/strict'
import test from 'node:test'

import { SPA_ROUTES, blogArticleSlug, blogPostLookupUrl } from '../worker/index.js'

test('a single-segment /blog path yields its slug, with or without a trailing slash', () => {
  assert.equal(blogArticleSlug('/blog/property-management-software-pakistan-guide/'), 'property-management-software-pakistan-guide')
  assert.equal(blogArticleSlug('/blog/property-management-software-pakistan-guide'), 'property-management-software-pakistan-guide')
  assert.equal(blogArticleSlug('/blog/abc'), 'abc')
})

test('the blog index, deeper paths and non-slugs are not article paths', () => {
  for (const path of [
    '/blog',
    '/blog/',
    '/blog/a-slug/deeper/',
    '/blog/ab', // shorter than the 3-character minimum in firestore.rules
    '/blog/Has-Capitals',
    '/blog/has_underscore',
    '/blog/has spaces',
    '/blog/../etc',
    `/blog/${'x'.repeat(121)}`,
  ]) {
    assert.equal(blogArticleSlug(path), null, path)
  }
})

test('the retired translated blog stays a 404, not an article path', () => {
  // These 404 on purpose: no translated article was ever prerendered. A prefix
  // entry in SPA_ROUTES or a looser blog pattern would give them a 200 shell.
  for (const path of ['/ur/blog/a-slug/', '/hi/blog/a-slug/', '/ar/blog/a-slug/', '/bn/blog/a-slug/']) {
    assert.equal(blogArticleSlug(path), null, path)
  }
  for (const prefix of SPA_ROUTES.prefixes) {
    assert.ok(!prefix.includes('blog'), `SPA_ROUTES.prefixes must not cover blog paths, found ${prefix}`)
  }
})

test('client-only routes are matched by the exact/prefix split, not by blog handling', () => {
  assert.ok(SPA_ROUTES.exact.includes('/login'))
  assert.ok(SPA_ROUTES.prefixes.includes('/app'))
  assert.equal(blogArticleSlug('/login'), null)
  assert.equal(blogArticleSlug('/app/dashboard'), null)
})

test('the lookup reads one blogPosts document and asks only for its status', () => {
  const url = new URL(blogPostLookupUrl('a-slug', { projectId: 'proj', apiKey: 'key123' }))
  assert.equal(url.origin, 'https://firestore.googleapis.com')
  assert.equal(url.pathname, '/v1/projects/proj/databases/(default)/documents/blogPosts/a-slug')
  assert.equal(url.searchParams.get('key'), 'key123')
  // Only `status` comes back, and it is what the Worker re-checks before serving
  // the shell — so this must stay in the mask.
  assert.equal(url.searchParams.get('mask.fieldPaths'), 'status')
})

test('a non-slug is refused rather than encoded into the document path', () => {
  // blogArticleSlug already rejects these, so this is the second line of defence.
  // Encoding is not enough: '..' and '%2E%2E' are both resolved away by a URL
  // parser, which would turn the document read into a collection read.
  for (const slug of ['a/b', '..', 'a?b', 'a#b', '', 'ab', 'Has-Capitals']) {
    assert.throws(() => blogPostLookupUrl(slug), /not a blog slug/, JSON.stringify(slug))
  }
})

test('a real slug addresses exactly one document', () => {
  const url = new URL(blogPostLookupUrl('property-management-software-pakistan-guide'))
  assert.equal(url.pathname.split('/documents/')[1], 'blogPosts/property-management-software-pakistan-guide')
})
