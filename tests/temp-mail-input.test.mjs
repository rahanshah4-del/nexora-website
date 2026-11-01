import test from 'node:test'
import assert from 'node:assert/strict'
import { checkLocalPart, cleanLocalInput, RESERVED_LOCALS } from '../src/pages/public/tools/tempMailClient.js'
import { RESERVED_LOCALS as WORKER_RESERVED, validateCustomLocal } from '../workers/nexora-temp-mail/src/lib.js'

test('typing and pasting is tidied into a valid shape', () => {
  assert.equal(cleanLocalInput('John Smith'), 'john.smith')
  assert.equal(cleanLocalInput('Rahan@mail.nexorasolution.us'), 'rahan')
  assert.equal(cleanLocalInput('na!me#$%'), 'name')
  assert.equal(cleanLocalInput('a'.repeat(50)).length, 32)
  assert.equal(cleanLocalInput(null), '')
})

test('the browser applies the same rules as the Worker, including double and trailing symbols', () => {
  for (const value of ['ab', 'abc', 'a..b', 'abc-', 'abc.', '-abc', 'a'.repeat(33), 'a'.repeat(32), 'admin', 'nexora', 'good.name_1', 'Good-Name', 'x_y', 'a--b']) {
    assert.equal(checkLocalPart(value).ok, validateCustomLocal(value).ok, `mismatch for "${value}"`)
  }
  assert.equal(checkLocalPart('ab').reason, 'too_short')
  assert.equal(checkLocalPart('admin').reason, 'reserved')
  assert.equal(checkLocalPart('a..b').reason, 'invalid_characters')
})

test('the reserved list in the browser matches the Worker list', () => {
  assert.deepEqual([...RESERVED_LOCALS].sort(), [...WORKER_RESERVED].sort())
})
