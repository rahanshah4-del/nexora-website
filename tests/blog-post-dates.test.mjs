import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planPostDates, SERVER_TIME } from '../src/lib/blogPostDates.js'

const T = { seconds: 1 }

test('new draft: createdAt now, no publishDate', () => {
  assert.deepEqual(planPostDates(null, 'draft'), { createdAt: SERVER_TIME, publishDate: null })
})

test('new post published straight away', () => {
  assert.deepEqual(planPostDates(null, 'published'), { createdAt: SERVER_TIME, publishDate: SERVER_TIME })
})

test('first publish of an existing draft sets publishDate, keeps createdAt', () => {
  assert.deepEqual(planPostDates({ createdAt: T, publishDate: null, status: 'draft' }, 'published'), { createdAt: T, publishDate: SERVER_TIME })
})

test('later saves keep publishDate — edit, unpublish, republish, rename', () => {
  const P = { seconds: 2 }
  const stored = { createdAt: T, publishDate: P, status: 'published' }
  assert.deepEqual(planPostDates(stored, 'published'), { createdAt: T, publishDate: P })
  assert.deepEqual(planPostDates(stored, 'draft'), { createdAt: T, publishDate: P })
  assert.deepEqual(planPostDates({ ...stored, status: 'draft' }, 'published'), { createdAt: T, publishDate: P })
})
