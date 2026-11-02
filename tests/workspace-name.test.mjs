import test from 'node:test'
import assert from 'node:assert/strict'

test('formatBusinessName capitalises lowercase words and keeps what the owner already capitalised', async () => {
  const { formatBusinessName } = await import('../src/lib/workspaceName.js')
  assert.equal(formatBusinessName('nokaz school'), 'Nokaz School')
  assert.equal(formatBusinessName('  al-noor   public school of  excellence '), 'Al-Noor Public School of Excellence')
  assert.equal(formatBusinessName('ABC grammar school'), 'ABC Grammar School')
  assert.equal(formatBusinessName("St. John's academy"), "St. John's Academy")
  assert.equal(formatBusinessName('iPhone store'), 'iPhone Store')
  assert.equal(formatBusinessName(''), '')
})
