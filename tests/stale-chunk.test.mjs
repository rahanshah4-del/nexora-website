import test from 'node:test'
import assert from 'node:assert/strict'
import { hardRefresh, isStaleChunkError } from '../src/lib/staleChunkReload.js'

test('recognises the browser messages for a missing chunk', () => {
  for (const msg of [
    'Failed to fetch dynamically imported module: https://nexorasolution.online/assets/GeoAuditPage-abc.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
    'Unable to preload CSS for /assets/x.css',
  ]) assert.equal(isStaleChunkError(new Error(msg)), true, msg)
})

test('does not treat ordinary errors as a stale chunk', () => {
  assert.equal(isStaleChunkError(new Error('Cannot read properties of undefined')), false)
  assert.equal(isStaleChunkError(null), false)
})

test('hardRefresh does nothing without a window', async () => {
  await hardRefresh()
})
