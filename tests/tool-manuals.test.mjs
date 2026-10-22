/** Every free tool page links to a real user manual in the Help Center. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HELP_ARTICLES, HELP_ARTICLE_BY_PATH, HELP_ARTICLE_BY_SLUG, HELP_ARTICLE_PATHS } from '../src/lib/helpCenterData.js'
import { TOOL_LINKS, TOOLS_HUB_PATH } from '../src/lib/toolsLaunch.js'
import { toolManualPath, GEOLINT_MANUAL_PATH } from '../src/lib/toolManual.js'
import { GEOLINT_HOW_PATH, GEOLINT_PATH, GEOLINT_WORDPRESS_PATH } from '../src/lib/geolintLaunch.js'

const src = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')

test('every tool, the hub and every GeoLint page map to an existing manual', () => {
  const pages = [...TOOL_LINKS.map((t) => t.path), TOOLS_HUB_PATH, GEOLINT_PATH, GEOLINT_HOW_PATH, GEOLINT_WORDPRESS_PATH]
  for (const page of pages) {
    const manual = toolManualPath(page)
    assert.ok(manual, `${page} has a manual path`)
    assert.ok(HELP_ARTICLE_BY_PATH[manual], `${page} -> ${manual} is a real help article`)
  }
  assert.equal(toolManualPath(`${GEOLINT_PATH}/`), GEOLINT_MANUAL_PATH, 'trailing slash is ignored')
  assert.equal(toolManualPath('/pricing'), null)
})

test('the manuals are complete: sections, questions, privacy and a link back to the tool', () => {
  for (const tool of TOOL_LINKS) {
    const article = HELP_ARTICLE_BY_SLUG[tool.path.split('/').pop()]
    const ids = article.sections.map((s) => s.id)
    for (const id of ['overview', 'how-it-works', 'editor', 'privacy']) assert.ok(ids.includes(id), `${article.slug} has ${id}`)
    assert.ok(article.faqs.length >= 5, `${article.slug} faqs`)
    assert.ok(article.related.includes('editor-manual'))
  }
  for (const slug of ['editor-manual', 'geolint']) {
    const article = HELP_ARTICLE_BY_SLUG[slug]
    assert.ok(article, `${slug} exists`)
    assert.ok(article.sections.length >= 6, `${slug} sections`)
    assert.ok(article.faqs.length >= 5, `${slug} faqs`)
    assert.ok(article.seoTitle.length <= 65, `${slug} title length`)
    assert.ok(HELP_ARTICLE_PATHS.includes(`/help-center/${slug}`), `${slug} is in the sitemap list`)
  }
})

test('every link inside a help article to another help article resolves', () => {
  for (const article of HELP_ARTICLES) {
    const targets = []
    for (const section of article.sections) for (const block of section.blocks) {
      for (const l of block.links || (block.link ? [block.link] : [])) targets.push(l.to)
      for (const item of block.list || []) if (item.to) targets.push(item.to)
    }
    for (const to of targets.filter((t) => t.startsWith('/help-center/'))) assert.ok(HELP_ARTICLE_BY_PATH[to], `${article.slug} links to missing ${to}`)
    for (const rel of article.related || []) assert.ok(HELP_ARTICLE_BY_SLUG[rel], `${article.slug} related ${rel} missing`)
  }
})

test('the landing pages render the manual button and the router has the new routes', () => {
  assert.match(src('pages/public/tools/ToolLandingPage.jsx'), /<ToolManualLink path=\{path\}/)
  assert.match(src('pages/public/tools/ToolsHubPage.jsx'), /<ToolManualLink path=\{page\.path\}/)
  assert.match(src('pages/public/tools/GeoAuditPage.jsx'), /<ToolManualLink path=\{page\.path\}/)
  assert.match(src('pages/public/tools/GeoLintHowItWorksPage.jsx'), /<ToolManualLink/)
  assert.match(src('pages/public/tools/GeoLintWordPressPage.jsx'), /<ToolManualLink/)
  const router = src('AppRouter.jsx')
  for (const slug of ['editor-manual', 'geolint']) assert.ok(router.includes(`path="/help-center/${slug}"`), `route for ${slug}`)
})
