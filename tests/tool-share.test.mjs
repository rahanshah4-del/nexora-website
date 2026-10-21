/** Copy-ready link snippets on the free tool pages. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { toolShareSnippets } from '../src/lib/toolShare.js'
import { TOOL_LINKS } from '../src/lib/toolsLaunch.js'

test('snippet links to the canonical tool URL with a trailing slash', () => {
  const s = toolShareSnippets({ path: '/tools/quotation-generator', title: 'Quotation Generator' })
  assert.equal(s.url, 'https://nexorasolution.us/tools/quotation-generator/')
  assert.equal(s.html, '<a href="https://nexorasolution.us/tools/quotation-generator/">Quotation Generator by Nexora</a>')
  assert.equal(s.markdown, '[Quotation Generator by Nexora](https://nexorasolution.us/tools/quotation-generator/)')
})

test('anchor text names the brand and the link is followed', () => {
  const s = toolShareSnippets({ path: '/tools/invoice-generator', title: 'Free Invoice Generator' })
  assert.match(s.text, /by Nexora$/)
  assert.doesNotMatch(s.html, /rel=/)
})

test('HTML in a title is escaped', () => {
  const s = toolShareSnippets({ path: '/tools/x', title: 'A & <b>B</b>' })
  assert.ok(s.html.includes('A &amp; &lt;b&gt;B&lt;/b&gt; by Nexora'))
})

test('every tool has a label to build a snippet from', () => {
  for (const tool of TOOL_LINKS) {
    const s = toolShareSnippets({ path: tool.path, title: tool.label })
    assert.ok(s.url.startsWith('https://nexorasolution.us/tools/'))
    assert.ok(s.url.endsWith('/'))
  }
})
