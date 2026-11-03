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

import { slaState } from '../src/lib/inboxUtils.js'
import { firstName, REPLY_TEMPLATES } from '../src/pages/admin/inbox/replyTemplates.js'
import { fillTemplate } from '../workers/shared/emailTemplate.js'

test('reply target follows priority and only runs while the ticket is open', () => {
  const at = (hours) => new Date(now - hours * 3600 * 1000).toISOString()
  assert.deepEqual(slaState({ status: 'open', priority: 'urgent', lastActivityAt: at(3) }, now), { overdue: true, label: 'Reply overdue by 2h' })
  assert.deepEqual(slaState({ status: 'open', priority: 'normal', lastActivityAt: at(2) }, now), { overdue: false, label: 'Reply due in 22h' })
  assert.equal(slaState({ status: 'pending', priority: 'urgent', lastActivityAt: at(9) }, now), null)
  assert.equal(slaState({ status: 'resolved', priority: 'high', lastActivityAt: at(9) }, now), null)
  assert.equal(slaState(null, now), null)
})

test('saved replies fill in the name and ticket and never show raw placeholders', () => {
  assert.equal(firstName('Ayesha Khan <a@b.c>'), 'Ayesha')
  assert.equal(firstName('theforex252@gmail.com'), 'Theforex252')
  assert.equal(firstName(''), 'there')
  for (const t of REPLY_TEMPLATES) {
    const out = fillTemplate(t.text, { name: 'Ayesha', ticket: 'NX-ABC123' })
    assert.ok(!out.includes('{{'), t.id)
    assert.ok(out.startsWith('Hi Ayesha,'), t.id)
    assert.ok(!/best regards/i.test(out), `${t.id} must not carry its own sign-off`)
  }
  assert.match(fillTemplate(REPLY_TEMPLATES.find((t) => t.id === 'resolved').text, { name: 'A', ticket: 'NX-ABC123' }), /NX-ABC123 has been resolved/)
})
