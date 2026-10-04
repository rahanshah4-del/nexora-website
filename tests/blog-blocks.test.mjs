import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentToSections, parseBlogBlock, renderBlogBlocksHtml, sectionsToContent, blockPlainText } from '../src/lib/blogBlocks.js'
import { htmlNodeToBlogMarkdown } from '../src/lib/blogPaste.js'

test('plain paragraphs stay paragraphs (existing posts unchanged)', () => {
  assert.equal(renderBlogBlocksHtml('Hello world.'), '<p>Hello world.</p>')
  assert.equal(renderBlogBlocksHtml('Line one\nline two'), '<p>Line one<br>line two</p>')
})

test('text is HTML-escaped before rendering', () => {
  assert.equal(renderBlogBlocksHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
})

test('headings, lists and quotes', () => {
  assert.equal(renderBlogBlocksHtml('### Why it matters'), '<h3 id="why-it-matters">Why it matters</h3>')
  assert.equal(renderBlogBlocksHtml('- one\n- two'), '<ul><li>one</li><li>two</li></ul>')
  assert.equal(renderBlogBlocksHtml('1. one\n2) two'), '<ol><li>one</li><li>two</li></ol>')
  assert.equal(renderBlogBlocksHtml('> Note this'), '<blockquote><p>Note this</p></blockquote>')
  const mixed = parseBlogBlock('### Steps\nIntro line\n- a\n- b')
  assert.deepEqual(mixed.map((b) => b.type), ['h3', 'p', 'ul'])
})

test('markdown table and pasted spreadsheet (TSV) table', () => {
  const md = renderBlogBlocksHtml('| Plan | Price |\n|---|---|\n| Basic | PKR 2,000 |\n| Standard | PKR 5,999 |')
  assert.match(md, /^<div class="nx-table-wrap"[^>]*><table><thead><tr><th scope="col">Plan<\/th><th scope="col">Price<\/th><\/tr><\/thead><tbody><tr><td>Basic<\/td><td>PKR 2,000<\/td><\/tr>/)
  const tsv = parseBlogBlock('Plan\tPrice\nBasic\t2000')
  assert.equal(tsv[0].type, 'table')
  assert.deepEqual(tsv[0].header, ['Plan', 'Price'])
  assert.deepEqual(tsv[0].rows, [['Basic', '2000']])
})

test('inline formatter receives escaped text', () => {
  const html = renderBlogBlocksHtml('- **Fast** & simple', (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))
  assert.equal(html, '<ul><li><strong>Fast</strong> &amp; simple</li></ul>')
})

test('## lines split content into sections and round-trip', () => {
  const content = 'Intro paragraph.\n\n## PDF or Excel?\n\nPDF is fixed.\n\n### Sub\n\n- a\n- b\n\n## PDF or Excel?\n\nAgain.'
  const sections = contentToSections(content, 'Overview')
  assert.deepEqual(sections.map((s) => [s.id, s.heading, s.paragraphs.length]), [
    ['overview', 'Overview', 1],
    ['pdf-or-excel', 'PDF or Excel?', 3],
    ['pdf-or-excel-2', 'PDF or Excel?', 1],
  ])
  assert.deepEqual(contentToSections(sectionsToContent(sections), 'Overview').map((s) => s.heading), sections.map((s) => s.heading))
  assert.equal(blockPlainText('| A | B |\n|---|---|\n| **x** | y |'), 'A B x y')
})

// Minimal DOM-like tree for the paste converter.
const el = (name, children = [], attrs = {}) => ({ nodeType: 1, nodeName: name, childNodes: children, getAttribute: (k) => attrs[k] ?? null, get textContent() { return children.map((c) => c.textContent).join('') } })
const txt = (value) => ({ nodeType: 3, nodeValue: value, textContent: value })

test('pasted ChatGPT-style HTML keeps headings, bold, lists and tables', () => {
  const body = el('BODY', [
    el('H2', [txt('PDF or Excel: Which Should You Send?')]),
    el('P', [txt('For the final invoice, '), el('STRONG', [txt('PDF')]), txt(' is best.')]),
    el('UL', [el('LI', [txt('Fixed layout')]), el('LI', [txt('Easy to share')])]),
    el('TABLE', [el('TBODY', [
      el('TR', [el('TH', [txt('Format')]), el('TH', [txt('Use')])]),
      el('TR', [el('TD', [txt('PDF')]), el('TD', [txt('Final invoice')])]),
    ])]),
    el('H3', [txt('HSN codes')]),
  ])
  const md = htmlNodeToBlogMarkdown(body)
  assert.equal(md, [
    '## PDF or Excel: Which Should You Send?',
    'For the final invoice, **PDF** is best.',
    '- Fixed layout\n- Easy to share',
    '| Format | Use |\n| --- | --- |\n| PDF | Final invoice |',
    '### HSN codes',
  ].join('\n\n'))
  const sections = contentToSections(md, 'Intro')
  assert.equal(sections[0].heading, 'PDF or Excel: Which Should You Send?')
  assert.equal(parseBlogBlock(sections[0].paragraphs[2])[0].type, 'table')
})

test('Google Docs bold-normal wrapper is not turned into bold', () => {
  const body = el('BODY', [el('B', [el('P', [txt('Plain text')])], { style: 'font-weight:normal;' })])
  assert.equal(htmlNodeToBlogMarkdown(body), 'Plain text')
})

test('single # headings and bold-only lines become headings', () => {
  assert.equal(renderBlogBlocksHtml('# Big idea'), '<h2 id="big-idea">Big idea</h2>')
  assert.equal(renderBlogBlocksHtml('**Pricing Overview**'), '<h3 id="pricing-overview">Pricing Overview</h3>')
  assert.equal(renderBlogBlocksHtml('**Tip:** keep receipts.'), '<p>**Tip:** keep receipts.</p>')
  assert.equal(renderBlogBlocksHtml('Start **here** now'), '<p>Start **here** now</p>')
})
