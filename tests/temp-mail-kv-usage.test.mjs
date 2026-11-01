import test from 'node:test'
import assert from 'node:assert/strict'
import { KV_FREE_LIMITS, kvUsageToday, startOfUtcDay, summarizeKvRows } from '../workers/nexora-temp-mail/src/kvUsage.js'

const rows = [
  { sum: { requests: 10 }, dimensions: { actionType: 'read', namespaceId: 'tm' } },
  { sum: { requests: 5 }, dimensions: { actionType: 'read', namespaceId: 'other' } },
  { sum: { requests: 7 }, dimensions: { actionType: 'list', namespaceId: 'tm' } },
  { sum: { requests: 2 }, dimensions: { actionType: 'mystery', namespaceId: 'tm' } },
]

test('summarizeKvRows totals the account and the temp-mail namespace', () => {
  const { account, namespace } = summarizeKvRows(rows, 'tm')
  assert.deepEqual(account, { read: 15, write: 0, delete: 0, list: 7 })
  assert.deepEqual(namespace, { read: 10, write: 0, delete: 0, list: 7 })
})

test('startOfUtcDay is midnight UTC', () => {
  assert.equal(startOfUtcDay(Date.UTC(2026, 10, 1, 4, 41)), '2026-11-01T00:00:00.000Z')
})

test('without a token it reports what is missing instead of calling Cloudflare', async () => {
  const out = await kvUsageToday({ CF_ACCOUNT_ID: 'a' }, { fetchFn: () => { throw new Error('must not fetch') } })
  assert.equal(out.configured, false)
  assert.deepEqual(out.missing, ['CF_API_TOKEN'])
  assert.deepEqual(out.limits, KV_FREE_LIMITS)
})

test('with a token it queries GraphQL and returns today\'s counts', async () => {
  let call
  const fetchFn = async (url, init) => { call = { url, init }; return { ok: true, json: async () => ({ data: { viewer: { accounts: [{ kvOperationsAdaptiveGroups: rows }] } } }) } }
  const out = await kvUsageToday({ CF_ACCOUNT_ID: 'acc', CF_API_TOKEN: 'tok', TEMP_MAIL_NAMESPACE_ID: 'tm' }, { now: Date.UTC(2026, 10, 1, 4, 41), fetchFn })
  assert.equal(call.init.headers.authorization, 'Bearer tok')
  assert.equal(JSON.parse(call.init.body).variables.since, '2026-11-01T00:00:00.000Z')
  assert.equal(out.account.read, 15)
  assert.equal(out.tempMail.list, 7)
})

test('a GraphQL error is thrown so the overview can mark it partial', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ errors: [{ message: 'not authorized' }] }) })
  await assert.rejects(kvUsageToday({ CF_ACCOUNT_ID: 'a', CF_API_TOKEN: 't' }, { fetchFn }), /analytics_not authorized/)
})
