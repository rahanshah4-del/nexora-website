import test from 'node:test'
import assert from 'node:assert/strict'
import { pickSender, senderForReply, fromHeader, senderEmail } from '../workers/shared/senders.js'
import { renderPlainMessage } from '../workers/shared/emailTemplate.js'

test('picks the department from any form of address', () => {
  assert.equal(pickSender('billing').id, 'billing')
  assert.equal(pickSender('Billing@nexorasolution.online').id, 'billing')
  assert.equal(pickSender('Nexora <hallo@nexorasolution.us>').id, 'hello')
  assert.equal(pickSender('support+tag@nexorasolution.us').id, 'support')
  assert.equal(pickSender('ceo@nexorasolution.us').id, 'ceo')
  assert.equal(pickSender('Rehan@nexorasolution.us').id, 'rahan')
  assert.equal(pickSender('author@nexorasolution.us').name, 'Nexora Author')
  assert.equal(pickSender('random@nexorasolution.us'), null)
  assert.equal(pickSender('evil@gmail.com'), null)
})
test('reply defaults to the address the customer wrote to, else support', () => {
  assert.equal(senderForReply('sales@nexorasolution.us').id, 'sales')
  assert.equal(senderForReply('random@nexorasolution.us').id, 'support')
  assert.equal(senderForReply(undefined).id, 'support')
})
test('from header and signature follow the department', () => {
  const s = pickSender('billing')
  assert.equal(fromHeader(s), 'Nexora Billing <billing@nexorasolution.us>')
  assert.equal(senderEmail(s), 'billing@nexorasolution.us')
  const m = renderPlainMessage('Hi', { signature: s.signature })
  assert.match(m.html, /Nexora Billing Team/)
  assert.match(m.text, /Nexora Billing Team/)
})
