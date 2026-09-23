import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffSitemaps } from '../scripts/lib/sitemapDiff.mjs'

const H = 'https://nexorasolution.online'
const sitemap = (entries) => `<urlset>${entries.map(([path, lastmod]) => `<url><loc>${H}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('')}</urlset>`

test('build-date-only lastmod moves on non-article routes are not submitted', () => {
  const prev = sitemap([['/', '2026-09-20'], ['/contact/', '2026-09-20'], ['/blog/', '2026-09-20'], ['/blog/a/', '2026-09-01']])
  const curr = sitemap([['/', '2026-09-23'], ['/contact/', '2026-09-23'], ['/blog/', '2026-09-23'], ['/blog/a/', '2026-09-01']])
  assert.deepEqual(diffSitemaps(prev, curr).urls, [])
})

test('added, removed and edited articles are submitted, plus /blog/', () => {
  const prev = sitemap([['/blog/', '2026-09-20'], ['/blog/a/', '2026-09-01'], ['/blog/old-slug/', '2026-09-02'], ['/blog/c/', '2026-09-03']])
  const curr = sitemap([['/blog/', '2026-09-23'], ['/blog/a/', '2026-09-23'], ['/blog/new-slug/', '2026-09-23'], ['/blog/c/', '2026-09-03']])
  const diff = diffSitemaps(prev, curr)
  assert.deepEqual(diff.added, [`${H}/blog/new-slug/`])
  assert.deepEqual(diff.changed, [`${H}/blog/a/`])
  assert.deepEqual(diff.removed, [`${H}/blog/old-slug/`])
  assert.deepEqual(diff.urls.sort(), [`${H}/blog/`, `${H}/blog/a/`, `${H}/blog/new-slug/`, `${H}/blog/old-slug/`].sort())
})

test('pagination and category pages are not treated as articles', () => {
  const prev = sitemap([['/blog/page/2/', '2026-09-20'], ['/blog/category/crm/', '2026-09-20']])
  const curr = sitemap([['/blog/page/2/', '2026-09-23'], ['/blog/category/crm/', '2026-09-23']])
  assert.deepEqual(diffSitemaps(prev, curr).urls, [])
})

test('a brand-new non-blog route is still submitted', () => {
  const diff = diffSitemaps(sitemap([['/', '2026-09-20']]), sitemap([['/', '2026-09-23'], ['/new-page/', '2026-09-23']]))
  assert.deepEqual(diff.urls, [`${H}/new-page/`])
})
