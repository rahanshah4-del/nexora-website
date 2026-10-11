import test from 'node:test'
import assert from 'node:assert/strict'
import { hoistAssetLinksToHead } from '../scripts/lib/hoistAssetLinks.mjs'

const page = `<!DOCTYPE html>
<html>
<head>
  <title>x</title>
</head>
<body>
  <div id="root"><p>content</p></div>
  <script type="module" crossorigin src="/assets/index-abc.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/vendor-react-1.js">
  <link rel="stylesheet" crossorigin href="/assets/index-xyz.css">
</body>
</html>`

test('moves the stylesheet and modulepreload links into <head>, stylesheet first', () => {
  const out = hoistAssetLinksToHead(page)
  const head = out.slice(0, out.indexOf('</head>'))
  const body = out.slice(out.indexOf('</head>'))
  assert.ok(head.includes('<link rel="stylesheet" crossorigin href="/assets/index-xyz.css">'))
  assert.ok(head.includes('<link rel="modulepreload" crossorigin href="/assets/vendor-react-1.js">'))
  assert.ok(head.indexOf('stylesheet') < head.indexOf('modulepreload'))
  assert.ok(!body.includes('rel="stylesheet"'))
  assert.ok(!body.includes('rel="modulepreload"'))
})

test('leaves the module script and the page content where they were', () => {
  const out = hoistAssetLinksToHead(page)
  const body = out.slice(out.indexOf('</head>'))
  assert.ok(body.includes('<script type="module" crossorigin src="/assets/index-abc.js"></script>'))
  assert.ok(body.includes('<div id="root"><p>content</p></div>'))
})

test('does not touch links that are not build assets, or a page without </head>', () => {
  const other = page.replace('/assets/index-xyz.css', 'https://fonts.googleapis.com/css2?family=Inter')
  assert.ok(hoistAssetLinksToHead(other).split('</head>')[1].includes('fonts.googleapis.com'))
  assert.equal(hoistAssetLinksToHead('<div>no head</div>'), '<div>no head</div>')
})
