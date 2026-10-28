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
