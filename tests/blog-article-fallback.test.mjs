import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentLoadPath, resolveMissingArticle } from '../src/lib/blogArticleFallback.js'

const perfFor = (url) => ({ getEntriesByType: (type) => (type === 'navigation' ? [{ name: url }] : []) })

test('an available article is always shown', () => {
  assert.equal(resolveMissingArticle({ hasArticle: true, loading: true, waitedOut: false, routePath: '/blog/a/', documentPath: '/blog/' }), 'show')
})

test('waits while Firestore may still answer', () => {
  assert.equal(resolveMissingArticle({ hasArticle: false, loading: true, waitedOut: false, routePath: '/blog/a/', documentPath: '/blog/' }), 'wait')
})

test('after an in-app navigation, a missing article triggers one full page load', () => {
  for (const state of [{ loading: false, waitedOut: false }, { loading: true, waitedOut: true }]) {
    assert.equal(resolveMissingArticle({ hasArticle: false, ...state, routePath: '/blog/a/', documentPath: '/blog/' }), 'reload')
  }
})

test('the reloaded page never reloads again: it shows not-found', () => {
  // Simulate the sequence: in-app navigation from /blog/ gives 'reload'; the
  // browser then loads /blog/a/ itself, so the new document's navigation entry
  // is /blog/a/. With the article still missing, every state is 'notFound'.
  const first = resolveMissingArticle({ hasArticle: false, loading: false, waitedOut: true, routePath: '/blog/a/', documentPath: documentLoadPath(perfFor('https://nexorasolution.online/blog/')) })
  assert.equal(first, 'reload')
  const afterReload = documentLoadPath(perfFor('https://nexorasolution.online/blog/a/'))
  for (const state of [{ loading: false, waitedOut: false }, { loading: true, waitedOut: true }, { loading: false, waitedOut: true }]) {
    assert.equal(resolveMissingArticle({ hasArticle: false, ...state, routePath: '/blog/a/', documentPath: afterReload }), 'notFound')
  }
})

test('trailing slashes and query strings do not count as a different document', () => {
  const doc = documentLoadPath(perfFor('https://nexorasolution.online/blog/a/?utm_source=x'))
  assert.equal(resolveMissingArticle({ hasArticle: false, loading: false, waitedOut: true, routePath: '/blog/a', documentPath: doc }), 'notFound')
})

test('without a navigation entry it never reloads', () => {
  assert.equal(documentLoadPath(null), '')
  assert.equal(documentLoadPath({ getEntriesByType: () => [] }), '')
  assert.equal(documentLoadPath({ getEntriesByType: () => { throw new Error('unsupported') } }), '')
  assert.equal(resolveMissingArticle({ hasArticle: false, loading: false, waitedOut: true, routePath: '/blog/a/', documentPath: '' }), 'notFound')
})

// --- server-rendered page detection (src/lib/hydration.js) -------------------

test('server HTML is hydrated only at the URL it was rendered for', async () => {
  const { serverRenderedForThisUrl } = await import('../src/lib/hydration.js')
  const docAt = (ssr, pathname) => ({ location: { pathname }, getElementById: () => ({ getAttribute: (name) => (name === 'data-ssr' ? ssr : null) }) })
  assert.equal(serverRenderedForThisUrl(docAt('/pricing/', '/pricing/')), true)
  assert.equal(serverRenderedForThisUrl(docAt('/pricing/', '/pricing')), true, 'trailing slash is not significant')
  // dist/index.html is the homepage AND the worker's app shell for /login, /app/...
  assert.equal(serverRenderedForThisUrl(docAt('/', '/login')), false)
  assert.equal(serverRenderedForThisUrl(docAt('/', '/app/dashboard')), false)
  assert.equal(serverRenderedForThisUrl(docAt(null, '/blog/post/')), false, 'hand-built pages are never hydrated')
  assert.equal(serverRenderedForThisUrl(null), false)
})
