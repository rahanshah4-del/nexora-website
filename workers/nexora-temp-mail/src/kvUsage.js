/**
 * Today's Workers KV usage for the Control Centre, read from Cloudflare's GraphQL Analytics API.
 *
 * Needs two things on the Worker: CF_ACCOUNT_ID (plain var) and CF_API_TOKEN (secret, scope
 * "Account Analytics: Read"). Until both are set the panel shows how to set them up instead of numbers.
 * The Free plan limits are per account and per UTC day (they reset at 00:00 UTC = 05:00 in Pakistan).
 */
import { clean } from './lib.js'

export const KV_FREE_LIMITS = { read: 100000, write: 1000, delete: 1000, list: 1000 }

const QUERY = `query ($account: String!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      kvOperationsAdaptiveGroups(limit: 1000, filter: { datetime_geq: $since, datetime_leq: $until }) {
        sum { requests }
        dimensions { actionType namespaceId }
      }
    }
  }
}`

const emptyOps = () => ({ read: 0, write: 0, delete: 0, list: 0 })

/** Pure: fold the analytics rows into account-wide and per-namespace counts. */
export function summarizeKvRows(rows, namespaceId = '') {
  const account = emptyOps()
  const namespace = emptyOps()
  for (const row of Array.isArray(rows) ? rows : []) {
    const op = String(row?.dimensions?.actionType || '').toLowerCase()
    if (!(op in account)) continue
    const count = Number(row?.sum?.requests) || 0
    account[op] += count
    if (namespaceId && row.dimensions.namespaceId === namespaceId) namespace[op] += count
  }
  return { account, namespace }
}

export function startOfUtcDay(now = Date.now()) {
  const d = new Date(now)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

export async function kvUsageToday(env, { now = Date.now(), fetchFn = fetch } = {}) {
  const account = clean(env.CF_ACCOUNT_ID)
  const token = clean(env.CF_API_TOKEN)
  if (!account || !token) {
    return { configured: false, limits: KV_FREE_LIMITS, missing: [!account && 'CF_ACCOUNT_ID', !token && 'CF_API_TOKEN'].filter(Boolean) }
  }
  const response = await fetchFn('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { account, since: startOfUtcDay(now), until: new Date(now).toISOString() } }),
  })
  if (!response.ok) throw new Error(`analytics_${response.status}`)
  const body = await response.json()
  if (body?.errors?.length) throw new Error(`analytics_${String(body.errors[0]?.message || 'error').slice(0, 80)}`)
  const rows = body?.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups || []
  const { account: all, namespace } = summarizeKvRows(rows, clean(env.TEMP_MAIL_NAMESPACE_ID))
  return { configured: true, since: startOfUtcDay(now), limits: KV_FREE_LIMITS, account: all, tempMail: namespace }
}
