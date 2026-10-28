import test from 'node:test'
import assert from 'node:assert/strict'
import { marketFromHost } from '../src/lib/geolintBrief.js'

test('market follows the country domain', () => {
  assert.deepEqual(marketFromHost('shop.example.pk'), { market: 'Pakistan', language: 'English' })
  assert.deepEqual(marketFromHost('www.beispiel.de'), { market: 'Germany', language: 'German' })
  assert.equal(marketFromHost('nexorasolution.us').market, 'United States')
})
test('generic domains stay Worldwide', () => {
  assert.equal(marketFromHost('example.com').market, 'Worldwide')
  assert.equal(marketFromHost('').market, 'Worldwide')
})
