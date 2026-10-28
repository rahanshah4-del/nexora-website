/** GeoLint email signup refuses temporary addresses; sign-in and normal addresses are untouched. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCredentials } from '../src/lib/geolintClient.js'
import { DISPOSABLE_EMAIL_MESSAGE } from '../src/lib/disposableEmail.js'

const base = { name: 'Ali Khan', password: 'longenough1', confirm: 'longenough1' }

test('signup rejects disposable domains, including our own temp-mail domain', () => {
  for (const email of ['a@mailinator.com', 'a@guerrillamail.com', 'a@mail.nexorasolution.us', 'a@x.mail.nexorasolution.us']) {
    assert.equal(validateCredentials({ ...base, email }, 'signup').email, DISPOSABLE_EMAIL_MESSAGE, email)
  }
})

test('signup accepts a normal address; sign-in never checks the domain', () => {
  assert.deepEqual(validateCredentials({ ...base, email: 'ali@gmail.com' }, 'signup'), {})
  assert.deepEqual(validateCredentials({ email: 'old@mailinator.com', password: 'x' }, 'signin'), {})
})

test('a malformed address keeps the plain format error', () => {
  assert.equal(validateCredentials({ ...base, email: 'nope' }, 'signup').email, 'Enter a valid email address.')
})
