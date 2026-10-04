import { test } from 'node:test'
import assert from 'node:assert/strict'
import { absoluteUrl, assetUrl } from '../src/lib/seoStructuredData.js'

test('assetUrl never adds a trailing slash to files', () => {
  assert.equal(assetUrl('/authors/rahan-shah.webp'), 'https://nexorasolution.online/authors/rahan-shah.webp')
  assert.equal(assetUrl('nexora-brand-logo.png'), 'https://nexorasolution.online/nexora-brand-logo.png')
  const storage = 'https://firebasestorage.googleapis.com/v0/b/x/o/a.png?alt=media&token=1'
  assert.equal(assetUrl(storage), storage)
  assert.equal(assetUrl(''), '')
})

test('absoluteUrl keeps page URLs canonical with a trailing slash', () => {
  assert.equal(absoluteUrl('/author'), 'https://nexorasolution.online/author/')
})
