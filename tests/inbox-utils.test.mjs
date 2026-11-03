import assert from 'node:assert/strict'
import test from 'node:test'
import { avatarTone, formatBytes, initials, neighbourId, quoteOriginal, relativeTime, secondsAgo, shortcutFor, toggleId } from '../src/lib/inboxUtils.js'

const now = Date.parse('2026-11-03T18:00:00Z')

test('relative time', () => {
  assert.equal(relativeTime('2026-11-03T17:59:40Z', now), 'just now')
  assert.equal(relativeTime('2026-11-03T17:55:00Z', now), '5m ago')
  assert.equal(relativeTime('2026-11-03T15:00:00Z', now), '3h ago')
  assert.equal(relativeTime('2026-11-01T18:00:00Z', now), '2d ago')
  assert.equal(relativeTime('', now), '')
  assert.equal(relativeTime('nonsense', now), '')
  assert.equal(secondsAgo(now - 2000, now), 'just now')
  assert.equal(secondsAgo(now - 30000, now), '30s ago')
  assert.equal(secondsAgo(now - 180000, now), '3m ago')
})

test('initials, avatar tone, sizes', () => {
  assert.equal(initials('Ayesha Khan'), 'AK')
  assert.equal(initials('theforex252@gmail.com'), 'TH')
  assert.equal(initials(''), '?')
  assert.equal(avatarTone('a@b.c'), avatarTone('A@B.C'))
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(3 * 1048576), '3.0 MB')
})

test('neighbour navigation stops at the ends', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.equal(neighbourId(list, 'a', 1), 'b')
  assert.equal(neighbourId(list, 'c', 1), 'c')
  assert.equal(neighbourId(list, 'a', -1), 'a')
  assert.equal(neighbourId(list, 'zzz', 1), 'a')
  assert.equal(neighbourId([], 'a', 1), '')
})

test('shortcuts work outside fields only', () => {
  const press = (key, extra = {}, tagName = 'DIV') => shortcutFor({ key, target: { tagName }, ...extra })
  assert.equal(press('j'), 'next')
  assert.equal(press('e'), 'archive')
  assert.equal(press('#'), 'trash')
  assert.equal(press('j', {}, 'TEXTAREA'), '')
  assert.equal(press('j', { ctrlKey: true }), '')
  assert.equal(press('Enter', { ctrlKey: true }, 'TEXTAREA'), 'send')
  assert.equal(press('Escape', {}, 'INPUT'), 'escape')
  assert.equal(press('q'), '')
})

test('selection toggle and quoting', () => {
  const a = toggleId(new Set(), 'x')
  assert.deepEqual([...a], ['x'])
  assert.deepEqual([...toggleId(a, 'x')], [])
  assert.equal(quoteOriginal({ from: 'A', date: 'Mon', body: 'hi\nthere' }), 'On Mon, A wrote:\n> hi\n> there')
  assert.equal(quoteOriginal({ body: '  ' }), '')
})
