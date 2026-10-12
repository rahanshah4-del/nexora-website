import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalSiteHref, formatBlogContent } from '../src/lib/blogContentFormatter.js'

const H = 'https://nexorasolution.online'
const hrefOf = (html) => html.match(/<a href="([^"]*)"/)?.[1]

test('same-site URL pasted without a trailing slash is linked to the canonical slash form', () => {
  const html = formatBlogContent(`See ${H}/blog/how-to-create-an-invoice-usa for details`, { html: true, autoHighlight: false })
  assert.equal(hrefOf(html), `${H}/blog/how-to-create-an-invoice-usa/`)
})

test('www host, query string and hash are normalised and preserved', () => {
  assert.equal(canonicalSiteHref('https://www.nexorasolution.online/pricing?plan=pro#faq'), `${H}/pricing/?plan=pro#faq`)
  assert.equal(canonicalSiteHref('http://nexorasolution.online/blog/free-invoice-generator-canada'), `${H}/blog/free-invoice-generator-canada/`)
})

test('URLs that already end in a slash are unchanged', () => {
  assert.equal(canonicalSiteHref(`${H}/pricing/`), `${H}/pricing/`)
})

test('the site root stays the root', () => {
  assert.equal(canonicalSiteHref(H), `${H}/`)
})

test('trailing sentence punctuation is kept out of the href and the link text', () => {
  const html = formatBlogContent(`Read ${H}/blog/free-invoice-generator-usa.`, { html: true, autoHighlight: false })
  assert.equal(hrefOf(html), `${H}/blog/free-invoice-generator-usa/`)
  assert.match(html, /free-invoice-generator-usa<\/a>\.$/)
})

test('external URLs and same-site file URLs are left exactly as written', () => {
  assert.equal(canonicalSiteHref('https://example.com/some/page'), null)
  assert.equal(canonicalSiteHref('https://notnexorasolution.online/page'), null)
  assert.equal(canonicalSiteHref(`${H}/nexora-logo.png`), null)
  const html = formatBlogContent('Source: https://example.com/report', { html: true, autoHighlight: false })
  assert.equal(hrefOf(html), 'https://example.com/report')
})
