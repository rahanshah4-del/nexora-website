/**
 * Every copy of the admin UID list (rules, UI, Cloud Functions, workers) is
 * found and identical. The placeholder is reported separately by
 * `npm run check:admin-uids`, which also runs as the firebase.json predeploy hook.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { PLACEHOLDER, SOURCES, adminUidProblems, parseList, readAdminUidLists } from '../../scripts/check-admin-uids.mjs'

test('every admin UID list is found and they are identical', () => {
  const lists = readAdminUidLists()
  assert.equal(lists.length, SOURCES.length)
  for (const { file, uids } of lists) assert.ok(uids && uids.length, `${file}: list found and non-empty`)
  const problems = adminUidProblems(lists).filter((p) => !p.includes(PLACEHOLDER))
  assert.deepEqual(problems, [])
})

test('the guard rejects the placeholder, empty lists, drift and staff-style IDs', () => {
  const ok = 'AbCdEfGhIjKlMnOpQrStUvWxYz12'
  const lists = (uids, other = uids) => [{ file: 'a', uids }, { file: 'b', uids: other }]
  assert.deepEqual(adminUidProblems(lists([ok])), [])
  assert.ok(adminUidProblems(lists([PLACEHOLDER])).some((p) => p.includes('placeholder')))
  assert.ok(adminUidProblems(lists([])).some((p) => p.includes('empty')))
  assert.ok(adminUidProblems(lists([ok], [ok, 'ZyXwVuTsRqPoNmLkJiHgFeDcBa98'])).some((p) => p.includes('differs')))
  assert.ok(adminUidProblems(lists(['ACME-ADM-7QX2'])).some((p) => p.includes('does not look like')))
  assert.ok(adminUidProblems([{ file: 'x', uids: null }]).some((p) => p.includes('not found')))
  assert.deepEqual(parseList(`['a', "b"]`), ['a', 'b'])
})
