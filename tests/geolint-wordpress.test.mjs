import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wordpressOrigin, wordpressUploadUrl } from '../src/lib/geolintWordPress.js'

test('audited page URL becomes the site origin', () => {
  assert.equal(wordpressOrigin('https://example.com/blog/post?x=1#top'), 'https://example.com')
  assert.equal(wordpressUploadUrl('https://example.com/blog/post'), 'https://example.com/wp-admin/plugin-install.php?tab=upload')
})

test('a bare domain gets https and keeps a subdomain or port', () => {
  assert.equal(wordpressOrigin('example.com'), 'https://example.com')
  assert.equal(wordpressOrigin('  shop.example.co.uk/path '), 'https://shop.example.co.uk')
  assert.equal(wordpressOrigin('http://example.com:8080/x'), 'http://example.com:8080')
})

test('anything that is not a web address gives no link', () => {
  for (const bad of ['', '   ', null, undefined, 'localhost', 'javascript:alert(1)', 'ftp://example.com', 'data:text/html,hi']) {
    assert.equal(wordpressUploadUrl(bad), '', String(bad))
  }
})

test('guide link carries the audited site and falls back to the bare guide', async () => {
  const { wordpressGuidePath } = await import('../src/lib/geolintWordPress.js')
  assert.equal(wordpressGuidePath('https://example.com/post'), '/tools/geo-audit/wordpress?site=https%3A%2F%2Fexample.com')
  assert.equal(wordpressGuidePath(''), '/tools/geo-audit/wordpress')
})
