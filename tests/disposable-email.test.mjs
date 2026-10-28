import assert from 'node:assert/strict'
import test from 'node:test'
import { isDisposableEmail } from '../src/lib/disposableEmail.js'
import { TEMP_MAIL_LAUNCHED } from '../src/lib/tempMailLaunch.js'

test('known disposable domains and their subdomains are blocked', () => {
  for (const e of ['a@mailinator.com', 'A@Yopmail.COM', 'x@sub.guerrillamail.com', 'x@temp-mail.org', 'x@10minutemail.com ']) assert.equal(isDisposableEmail(e), true, e)
})

test('real providers, company domains and bad input are not blocked', () => {
  for (const e of ['a@gmail.com', 'a@outlook.com', 'a@nexorasolution.us', 'a@mycompany.pk', 'a@notmailinator.com', 'mailinator.com', '', null]) assert.equal(isDisposableEmail(e), false, String(e))
})

test('own temp-mail domain is blocked from signup once the tool is launched (allowed before)', () => {
  assert.equal(isDisposableEmail('a@mail.nexorasolution.us'), TEMP_MAIL_LAUNCHED)
})
