import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRows, fileKind, fileProblem, formatBytes, rememberEmoji, loadRecentEmoji, stampLabel } from '../src/lib/geolintChatKit.js'

const m = (id, from, at) => ({ id, from, at, text: id, files: [] })

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1500), '1.5 KB')
  assert.equal(formatBytes(2_400_000), '2.4 MB')
  assert.equal(formatBytes(-1), '')
})

test('file kind and problems follow the server rules', () => {
  assert.equal(fileKind({ name: 'a.PNG', type: 'image/png' }), 'image')
  assert.equal(fileKind({ name: 'brief.pdf', type: 'application/pdf' }), 'pdf')
  assert.equal(fileKind({ name: 'x.bin', type: '' }), 'file')
  assert.equal(fileProblem({ name: 'a.png', size: 100 }), '')
  assert.match(fileProblem({ name: 'run.exe', size: 100 }), /cannot be sent/)
  assert.match(fileProblem({ name: 'a.zip', size: 5_000_001 }), /5 MB/)
  assert.match(fileProblem({ name: 'a.txt', size: 0 }), /empty/)
})

test('stamp labels', () => {
  const now = new Date(2026, 9, 28, 17, 0)
  assert.equal(stampLabel(new Date(2026, 9, 28, 9, 5), now), 'Today 9:05 AM')
  assert.equal(stampLabel(new Date(2026, 9, 27, 21, 30), now), 'Yesterday 9:30 PM')
  assert.equal(stampLabel(new Date(2026, 9, 20, 12, 0), now), 'Tue 20 Oct, 12:00 PM')
  assert.equal(stampLabel('nonsense', now), '')
})

test('rows: a stamp first, runs of one sender share a tail, a long pause adds a stamp', () => {
  const base = new Date(2026, 9, 28, 10, 0).getTime()
  const at = (min) => new Date(base + min * 60_000).toISOString()
  const rows = buildRows([m('a', 'client', at(0)), m('b', 'client', at(1)), m('c', 'staff', at(2)), m('d', 'staff', at(200))], 'client')
  assert.deepEqual(rows.map((r) => r.type), ['stamp', 'message', 'message', 'message', 'stamp', 'message'])
  const msgs = rows.filter((r) => r.type === 'message')
  assert.deepEqual(msgs.map((r) => [r.key, r.own, r.first, r.last]), [['a', true, true, false], ['b', true, false, true], ['c', false, true, true], ['d', false, true, true]])
  assert.deepEqual(buildRows([], 'client'), [])
})

test('recent emoji keep order, no duplicates, at most 12', () => {
  const store = new Map()
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  rememberEmoji('😀', storage)
  rememberEmoji('👍', storage)
  assert.deepEqual(rememberEmoji('😀', storage), ['😀', '👍'])
  for (let i = 0; i < 20; i += 1) rememberEmoji(String.fromCodePoint(0x1f600 + i), storage)
  assert.equal(loadRecentEmoji(storage).length, 12)
  assert.deepEqual(loadRecentEmoji({ getItem: () => { throw new Error('blocked') } }), [])
})

import { collectFiles, firstUnreadId, messageMatches, parseRichText, previewKind, receiptFor } from '../src/lib/geolintChatKit.js'

test('rich text: code blocks, inline code and safe links only', () => {
  const parts = parseRichText('Run `npm i` then see https://a.com/x?y=1, ok\n```js\nconst a = 1\n```\nbye')
  assert.deepEqual(parts.map((p) => p.type), ['text', 'inline', 'text', 'link', 'text', 'text', 'code', 'text'])
  assert.equal(parts[3].href, 'https://a.com/x?y=1')
  assert.equal(parts[6].value, 'const a = 1')
  assert.equal(parts[6].lang, 'js')
  assert.deepEqual(parseRichText('javascript:alert(1) <b>x</b>').map((p) => p.type), ['text'])
  assert.deepEqual(parseRichText(''), [])
})

test('search, receipts, unread line, files, preview kinds', () => {
  const msgs = [
    { id: 'a', from: 'client', at: '2026-10-28T10:00:00.000Z', text: 'Hello Site', files: [{ id: 'f1', name: 'Report.PDF', type: 'application/pdf', size: 1 }] },
    { id: 'b', from: 'staff', at: '2026-10-28T10:05:00.000Z', text: 'Hi', files: [] },
    { id: 'c', from: 'client', at: '2026-10-28T10:09:00.000Z', text: 'ok', files: [] },
  ]
  assert.equal(messageMatches(msgs[0], 'site'), true)
  assert.equal(messageMatches(msgs[0], 'report'), true)
  assert.equal(messageMatches(msgs[1], 'report'), false)
  assert.equal(messageMatches(msgs[1], '  '), true)
  assert.deepEqual(receiptFor(msgs, 'staff', '2026-10-28T10:07:00.000Z'), { id: 'b', read: true, label: receiptFor(msgs, 'staff', '2026-10-28T10:07:00.000Z').label })
  assert.equal(receiptFor(msgs, 'staff', '').label, 'Delivered')
  assert.equal(receiptFor(msgs, 'staff', null), null)
  assert.equal(receiptFor([msgs[0]], 'staff', ''), null)
  assert.equal(firstUnreadId(msgs, 'staff', '2026-10-28T10:06:00.000Z'), 'c')
  assert.equal(firstUnreadId(msgs, 'staff', '2026-10-28T11:00:00.000Z'), '')
  assert.deepEqual(collectFiles(msgs, 'staff').map((f) => [f.id, f.own]), [['f1', false]])
  assert.equal(previewKind({ name: 'a.csv', type: 'text/csv' }), 'text')
  assert.equal(previewKind({ name: 'a.pdf', type: '' }), 'pdf')
  assert.equal(previewKind({ name: 'a.zip', type: '' }), 'download')
  assert.equal(previewKind({ name: 'a.png', type: 'image/png' }), 'image')
})
