import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PUBLISH_LEAD_MS, selectDuePosts, toMillis } from '../functions/blogSchedulerLogic.js'
import { classifyBlogPostChange } from '../functions/blogRebuildLogic.js'
import { readFileSync } from 'node:fs'

const NOW = Date.parse('2026-10-23T06:46:00Z')
const ts = (ms) => ({ toMillis: () => ms })
const post = (slug, status, ms) => ({ slug, data: { status, scheduledAt: ms == null ? undefined : ts(ms) } })

test('a scheduled post is due once its time is within the publish lead', () => {
  const due = selectDuePosts([post('a', 'scheduled', NOW + PUBLISH_LEAD_MS), post('b', 'scheduled', NOW + PUBLISH_LEAD_MS + 1)], NOW)
  assert.deepEqual(due.map((p) => p.slug), ['a'])
})

test('past-due posts are published too, earliest first', () => {
  const due = selectDuePosts([post('late', 'scheduled', NOW - 60_000), post('later', 'scheduled', NOW - 3_600_000)], NOW)
  assert.deepEqual(due.map((p) => p.slug), ['later', 'late'])
})

test('drafts, published posts and scheduled posts without a time are never picked', () => {
  const due = selectDuePosts([post('d', 'draft', NOW - 1), post('p', 'published', NOW - 1), post('n', 'scheduled', null)], NOW)
  assert.deepEqual(due, [])
})

test('timestamps from the Admin SDK, REST shape, Date and ISO string all read as milliseconds', () => {
  assert.equal(toMillis(ts(5)), 5)
  assert.equal(toMillis({ _seconds: 2 }), 2000)
  assert.equal(toMillis({ seconds: 3 }), 3000)
  assert.equal(toMillis(new Date(7)), 7)
  assert.equal(toMillis('2026-10-23T06:46:00Z'), NOW)
  assert.equal(toMillis('nope'), null)
})

test('the existing rebuild trigger ignores a save to scheduled and fires when the scheduler publishes', () => {
  const scheduled = { status: 'scheduled', title: 'T', scheduledAt: ts(NOW) }
  assert.equal(classifyBlogPostChange(null, scheduled).action, 'ignore')
  assert.equal(classifyBlogPostChange({ status: 'draft' }, scheduled).action, 'ignore')
  assert.equal(classifyBlogPostChange(scheduled, { ...scheduled, status: 'published' }).action, 'publish')
})

test('firestore rules accept the scheduled status and scheduledAt, and require a time for scheduled posts', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.match(rules, /data\.status in \['draft','scheduled','published'\]/)
  assert.match(rules, /'scheduledAt'/)
  assert.match(rules, /data\.status!='scheduled'\|\|\('scheduledAt' in data&&data\.scheduledAt is timestamp\)/)
})

test('the scheduler function is exported from functions/index.js', () => {
  const index = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
  assert.match(index, /publishScheduledBlogPosts/)
})
