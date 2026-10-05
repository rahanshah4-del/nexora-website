import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isNoindexPath, isNoindexPost } from '../src/lib/indexingRules.js'
import { NOINDEX_POST_SLUGS } from '../src/config/noindexPosts.js'
import { NOINDEX_PAGE_PATHS } from '../src/config/noindexPages.js'
import { isAuthorConfigured, missingAuthorFields } from '../src/config/author.js'
import { createLastmodResolver, routeSourceFiles } from '../scripts/lib/pageLastmod.mjs'

// fileURLToPath, not URL.pathname: the latter leaves %20 encoded when the
// checkout's path contains spaces, and readFileSync then cannot find the file.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('the 20 template posts and the thin near-duplicate pages are noindex', () => {
  assert.equal(NOINDEX_POST_SLUGS.size, 20)
  assert.equal(isNoindexPost('saas-vs-desktop-pos-software'), true)
  assert.equal(isNoindexPost('what-is-pos-software'), false)
  for (const form of ['/blog/saas-vs-desktop-pos-software', '/blog/saas-vs-desktop-pos-software/', '/blog/saas-vs-desktop-pos-software/?utm=x']) {
    assert.equal(isNoindexPath(form), true, form)
  }
  for (const page of NOINDEX_PAGE_PATHS) {
    assert.equal(isNoindexPath(page), true)
    assert.equal(isNoindexPath(`${page}/`), true)
  }
  for (const indexable of ['/', '/pricing/', '/pharmacy-pos/', '/pharmacy-pos/billing/', '/blog/', '/blog/what-is-pos-software/', '/solutions']) {
    assert.equal(isNoindexPath(indexable), false, indexable)
  }
})

test('author placeholders are detected (so CI refuses to deploy them)', () => {
  assert.deepEqual(missingAuthorFields({ name: 'TODO: Author name', role: '', bio: 'TODO: bio', photo: '' }), ['name', 'role', 'bio'])
  assert.equal(isAuthorConfigured({ name: 'Ayesha Khan', role: 'Product Lead', bio: 'Writes about POS.', photo: '' }), true, 'photo is optional')
  assert.equal(isAuthorConfigured({ name: 'Ayesha Khan', role: 'todo role', bio: 'x' }), false)
})

test('every sitemap route maps to its page source files', () => {
  const sources = routeSourceFiles(ROOT)
  assert.deepEqual(sources.get('/pakistan'), ['src/pages/public/CountryPage.jsx', 'src/lib/countries.js'])
  assert.ok(sources.get('/').includes('src/sections/HomepageSections.jsx'))
  assert.ok(sources.get('/pharmacy-pos/billing').includes('src/lib/featurePagesData.js'))
  assert.equal(sources.get('/help-center')[0], 'src/pages/public/HelpCenterPage.jsx')
})

test('lastmod is the last commit date, and unknown in a shallow clone rather than wrong', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'lastmod-'))
  const git = (...args) => execFileSync('git', args, { cwd: repo, env: { ...process.env, GIT_AUTHOR_DATE: process.env.GIT_DATE, GIT_COMMITTER_DATE: process.env.GIT_DATE } })
  const commit = (file, date) => {
    writeFileSync(path.join(repo, file), date)
    process.env.GIT_DATE = `${date}T12:00:00Z`
    git('add', file)
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', file)
  }
  git('init', '-q')
  commit('old.txt', '2026-01-10')
  commit('new.txt', '2026-03-05')
  const full = createLastmodResolver(repo)
  assert.equal(full.lastmodFor(['old.txt']), '2026-01-10')
  assert.equal(full.lastmodFor(['old.txt', 'new.txt']), '2026-03-05')
  assert.equal(full.lastmodFor(['missing.txt']), null)

  // Clone with depth 1: old.txt's real commit is outside the history.
  const shallow = mkdtempSync(path.join(tmpdir(), 'lastmod-shallow-'))
  // A file:// URL (properly encoded), because git ignores --depth for plain local paths.
  execFileSync('git', ['clone', '-q', '--depth', '1', pathToFileURL(repo).href, shallow])
  const resolver = createLastmodResolver(shallow)
  assert.equal(resolver.shallow, true)
  assert.equal(resolver.lastmodFor(['old.txt']), null, 'a file from before the cut-off has no knowable date')
  assert.equal(resolver.lastmodFor(['new.txt']), null, 'the boundary commit itself is not trusted either')
})
