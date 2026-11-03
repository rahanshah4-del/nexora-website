import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeAttachments, MAX_FILES } from '../workers/shared/outgoingAttachments.js'
import { previewKind, mimeFor } from '../src/lib/attachmentKind.js'

const b64 = (s) => Buffer.from(s).toString('base64')
test('accepts normal files and cleans names', () => {
  const r = sanitizeAttachments([{ filename: 'inv/oice?.pdf', content: b64('hello'), content_type: 'application/pdf' }])
  assert.equal(r.error, '')
  assert.equal(r.attachments[0].filename, 'inv_oice_.pdf')
})
test('rejects executables, too many, too large, bad base64', () => {
  assert.match(sanitizeAttachments([{ filename: 'x.exe', content: b64('a') }]).error, /executable/)
  assert.match(sanitizeAttachments(Array(MAX_FILES + 1).fill({ filename: 'a.txt', content: b64('a') })).error, /up to/)
  assert.match(sanitizeAttachments([{ filename: 'big.bin', content: 'A'.repeat(11 * 1024 * 1024) }]).error, /too large/)
  assert.match(sanitizeAttachments([{ filename: 'a.txt', content: '***' }]).error, /could not be read/)
  assert.deepEqual(sanitizeAttachments(undefined), { attachments: [], error: '' })
})
test('preview kinds never include svg/html', () => {
  assert.equal(previewKind('a.png', ''), 'image')
  assert.equal(previewKind('x', 'application/pdf'), 'pdf')
  assert.equal(previewKind('n.txt', 'application/octet-stream'), 'text')
  assert.equal(previewKind('a.svg', 'image/svg+xml'), 'none')
  assert.equal(previewKind('a.html', 'text/html'), 'none')
  assert.equal(mimeFor('p.jpg', 'application/octet-stream'), 'image/jpeg')
})
