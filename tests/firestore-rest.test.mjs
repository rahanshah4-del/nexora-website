import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDeleteBody, buildPatchBody, buildSetBody, restCommit, RestUnsupportedError, toFields } from '../src/crm/lib/firestoreRest.js'

const ts = { _methodName: 'serverTimestamp' }

test('set body converts types and moves server timestamps into transforms', () => {
  const body = buildSetBody({ projectId: 'p', docPath: 'workspaces/w/feeStructures/d1', data: { className: 'Grade 1', fees: [{ head: 'Tuition', amount: 1500, frequency: 'monthly' }], ratio: 1.5, on: true, none: null, skip: undefined, createdAt: ts, updatedAt: ts } })
  const w = body.writes[0]
  assert.equal(w.update.name, 'projects/p/databases/(default)/documents/workspaces/w/feeStructures/d1')
  assert.deepEqual(w.update.fields.className, { stringValue: 'Grade 1' })
  assert.deepEqual(w.update.fields.fees.arrayValue.values[0].mapValue.fields.amount, { integerValue: '1500' })
  assert.deepEqual(w.update.fields.ratio, { doubleValue: 1.5 })
  assert.deepEqual(w.update.fields.none, { nullValue: null })
  assert.ok(!('skip' in w.update.fields) && !('createdAt' in w.update.fields))
  assert.deepEqual(w.updateTransforms.map((t) => t.fieldPath).sort(), ['createdAt', 'updatedAt'])
})

test('patch body masks only given fields and requires the document to exist', () => {
  const body = buildPatchBody({ projectId: 'p', docPath: 'a/b', patch: { fees: [], updatedAt: ts } })
  const w = body.writes[0]
  assert.deepEqual(w.updateMask.fieldPaths, ['fees'])
  assert.deepEqual(w.currentDocument, { exists: true })
  assert.equal(w.updateTransforms[0].fieldPath, 'updatedAt')
})

test('unsupported values fall back to SDK only', () => {
  assert.throws(() => buildPatchBody({ projectId: 'p', docPath: 'a/b', patch: { 'a.b': 1 } }), RestUnsupportedError)
  assert.throws(() => toFields({ n: { _methodName: 'increment' } }, '', []), RestUnsupportedError)
  assert.throws(() => toFields({ list: [ts] }, '', []), RestUnsupportedError)
})

test('delete body', () => {
  assert.deepEqual(buildDeleteBody({ projectId: 'p', docPath: 'a/b' }).writes, [{ delete: 'projects/p/databases/(default)/documents/a/b' }])
})

test('restCommit sends the token and maps HTTP errors to Firestore codes', async () => {
  let seen
  const ok = await restCommit({ projectId: 'p', body: { writes: [] }, getToken: async () => 'tok', fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true } } })
  assert.equal(ok, true)
  assert.match(seen.url, /projects\/p\/databases\/\(default\)\/documents:commit$/)
  assert.equal(seen.init.headers.Authorization, 'Bearer tok')
  await assert.rejects(restCommit({ projectId: 'p', body: {}, getToken: async () => 't', fetchImpl: async () => ({ ok: false, status: 403, text: async () => '{"error":{"message":"denied"}}' }) }), (e) => e.code === 'permission-denied' && e.message === 'denied')
  await assert.rejects(restCommit({ projectId: 'p', body: {}, getToken: async () => 't', fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }) }), (e) => e.code === 'unavailable')
  await assert.rejects(restCommit({ projectId: 'p', body: {}, getToken: async () => 't', fetchImpl: async () => { throw new Error('offline') } }), (e) => e.code === 'unavailable')
  await assert.rejects(restCommit({ projectId: 'p', body: {}, getToken: async () => '' }), (e) => e.code === 'unauthenticated')
})

test('merge body masks only the leaves so sibling fields in nested maps survive', async () => {
  const { buildMergeBody } = await import('../src/crm/lib/firestoreRest.js')
  const w = buildMergeBody({ projectId: 'p', docPath: 'a/b', data: { settings: { theme: 'dark', tags: ['x'] }, name: 'n', updatedAt: ts } }).writes[0]
  assert.deepEqual(w.updateMask.fieldPaths.sort(), ['name', 'settings.tags', 'settings.theme'])
  assert.equal(w.currentDocument, undefined)
  assert.equal(w.updateTransforms[0].fieldPath, 'updatedAt')
})
