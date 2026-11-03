import test from 'node:test'
import assert from 'node:assert/strict'
import { readParam, withParam } from '../src/lib/urlState.js'

test('sets, keeps other params and removes defaults', () => {
  assert.equal(withParam('', 'tab', 'emailMarketing', 'dashboard'), '?tab=emailMarketing')
  assert.equal(withParam('?tab=emailMarketing&x=1', 'section', 'inbox', 'automation'), '?tab=emailMarketing&x=1&section=inbox')
  assert.equal(withParam('?tab=emailMarketing', 'tab', 'dashboard', 'dashboard'), '')
})
test('only accepts known values', () => {
  assert.equal(readParam('?tab=inbox', 'tab', ['inbox', 'history'], 'automation'), 'inbox')
  assert.equal(readParam('?tab=evil', 'tab', ['inbox'], 'automation'), 'automation')
  assert.equal(readParam('', 'tab', ['inbox'], 'automation'), 'automation')
})
