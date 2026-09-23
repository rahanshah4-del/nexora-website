import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyBlogPostChange,
  classifyRedirectChange,
  decideRebuild,
  DEBOUNCE_MAX_WAIT_MS,
  DEBOUNCE_QUIET_MS,
} from '../functions/blogRebuildLogic.js'

const ts = (ms) => ({ toMillis: () => ms })
const post = (over = {}) => ({
  slug: 'a-post', title: 'A post', status: 'published', sections: [{ heading: 'H', paragraphs: ['p'] }],
  faqs: [], tags: ['x'], publishDate: ts(1000), createdAt: ts(500), updatedAt: ts(1000),
  createdBy: 'uid', createdByEmail: 'a@b.c', ...over,
})

test('draft-only writes are ignored', () => {
  assert.equal(classifyBlogPostChange(null, post({ status: 'draft' })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), post({ status: 'draft', title: 'New' })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), null).action, 'ignore')
})

test('publish, unpublish and delete are detected', () => {
  assert.equal(classifyBlogPostChange(null, post()).action, 'publish')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), post()).action, 'publish')
  assert.equal(classifyBlogPostChange(post(), post({ status: 'draft' })).action, 'unpublish')
  assert.equal(classifyBlogPostChange(post(), null).action, 'delete')
})

test('published → published needs a real field change', () => {
  // Only bookkeeping fields moved: a no-op save.
  assert.equal(classifyBlogPostChange(post(), post({ updatedAt: ts(9999), createdByEmail: 'z@y.x' })).action, 'ignore')
  // Same instant in a different timestamp shape is still no change.
  assert.equal(classifyBlogPostChange(post(), post({ publishDate: { _seconds: 1, _nanoseconds: 0 } })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post(), post({ title: 'Renamed' })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ sections: [{ heading: 'H', paragraphs: ['p', 'q'] }] })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ tags: ['y'] })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ publishDate: ts(2000) })).action, 'content-change')
})

test('redirect document changes', () => {
  assert.equal(classifyRedirectChange(null, { from: 'a', to: 'b' }).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, { from: 'a', to: 'c' }).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, null).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, { from: 'a', to: 'b', createdAt: 1 }).action, 'ignore')
})

test('trailing debounce: waits while edits continue, fires when quiet', () => {
  const t0 = 1_000_000
  assert.equal(decideRebuild(null, t0), 'not-pending')
  assert.equal(decideRebuild({ pending: false, lastChangeAt: t0 }, t0 + DEBOUNCE_QUIET_MS), 'not-pending')
  // The task from an earlier edit runs while a later edit is still recent.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 + 60_000 }, t0 + DEBOUNCE_QUIET_MS), 'wait')
  // The latest edit's task: quiet long enough.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 + 60_000 }, t0 + 60_000 + DEBOUNCE_QUIET_MS), 'fire')
  // Early dispatch by a few seconds still fires.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 }, t0 + DEBOUNCE_QUIET_MS - 3_000), 'fire')
  // Accepts Firestore Timestamps as well as numbers.
  assert.equal(decideRebuild({ pending: true, pendingSince: ts(t0), lastChangeAt: ts(t0) }, t0 + DEBOUNCE_QUIET_MS), 'fire')
})

test('trailing debounce: max wait stops continuous edits starving the build', () => {
  const t0 = 1_000_000
  const now = t0 + DEBOUNCE_MAX_WAIT_MS
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: now - 10_000 }, now), 'fire')
})
