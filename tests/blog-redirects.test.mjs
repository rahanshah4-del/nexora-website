import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRedirectsFile, redirectRules, resolveBlogRedirects } from '../scripts/lib/blogRedirects.mjs'

const resolve = (edges, live) => resolveBlogRedirects(edges, new Set(live))

test('single rename', () => {
  const { redirects, skipped } = resolve([{ from: 'old-a', to: 'new-a' }], ['new-a'])
  assert.deepEqual(redirects, [{ from: 'old-a', to: 'new-a' }])
  assert.deepEqual(skipped, [])
})

test('chains collapse: A→B then B→C gives A→C and B→C', () => {
  const { redirects } = resolve([{ from: 'aaa', to: 'bbb' }, { from: 'bbb', to: 'ccc' }], ['ccc'])
  assert.deepEqual(redirects, [{ from: 'aaa', to: 'ccc' }, { from: 'bbb', to: 'ccc' }])
})

test('reused slug: a live page at the source wins', () => {
  // A→B, then B renamed back to A: A is live again, B→A remains.
  const { redirects, skipped } = resolve([{ from: 'aaa', to: 'bbb' }, { from: 'bbb', to: 'aaa' }], ['aaa'])
  assert.deepEqual(redirects, [{ from: 'bbb', to: 'aaa' }])
  assert.equal(skipped[0].from, 'aaa')
  assert.match(skipped[0].reason, /live article/)
})

test('cycles and dead targets are skipped, not emitted', () => {
  const cyc = resolve([{ from: 'aaa', to: 'bbb' }, { from: 'bbb', to: 'aaa' }], [])
  assert.deepEqual(cyc.redirects, [])
  assert.ok(cyc.skipped.every((s) => s.reason === 'redirect cycle'))

  const dead = resolve([{ from: 'aaa', to: 'bbb' }, { from: 'bbb', to: 'ccc' }], ['zzz'])
  assert.deepEqual(dead.redirects, [])
  assert.equal(dead.skipped[0].to, 'ccc')
  assert.match(dead.skipped[0].reason, /not a published article/)
})

test('invalid documents are skipped', () => {
  const { redirects, skipped } = resolve([{ from: 'Bad Slug', to: 'ok-slug' }, { from: 'same', to: 'same' }, { from: 'aa' }], ['ok-slug'])
  assert.deepEqual(redirects, [])
  assert.equal(skipped.length, 3)
})

test('both slash forms, 301, trailing-slash destination', () => {
  assert.deepEqual(redirectRules({ from: 'old', to: 'new' }), [
    { source: '/blog/old', destination: '/blog/new/', code: 301 },
    { source: '/blog/old/', destination: '/blog/new/', code: 301 },
  ])
})

test('merge keeps static rules first and drops duplicate / conflicting sources', () => {
  const staticText = [
    '# comment',
    '/services /business-services/ 301',
    '/blog/old /blog/new/ 301',
    '/blog/old/ /blog/new/ 301',
    '/blog/x/ /elsewhere/ 301',
    '/docs/* /help/:splat 301',
  ].join('\n')
  const generated = [
    ...redirectRules({ from: 'old', to: 'new' }),
    ...redirectRules({ from: 'x', to: 'y' }),
    ...redirectRules({ from: 'fresh', to: 'new' }),
  ]
  const merged = mergeRedirectsFile(staticText, generated)
  assert.equal(merged.duplicates.length, 2)
  assert.equal(merged.conflicts.length, 1)
  assert.equal(merged.conflicts[0].rule.source, '/blog/x/')
  assert.deepEqual(merged.added.map((r) => r.source), ['/blog/x', '/blog/fresh', '/blog/fresh/'])
  assert.ok(merged.text.startsWith(staticText))
  assert.ok(merged.text.indexOf('/blog/fresh/ /blog/new/ 301') > merged.text.indexOf('/services'))
  assert.equal(merged.dynamicCount, 1)
  assert.equal(merged.staticCount, 7)
})

test('merge with nothing generated leaves the static file untouched', () => {
  const merged = mergeRedirectsFile('/a /b 301\n', [])
  assert.equal(merged.text, '/a /b 301\n')
  assert.deepEqual(merged.added, [])
})
