/**
 * Today's Workers KV usage for the Control Centre, read from Cloudflare's GraphQL Analytics API.
 *
 * Needs two things on the Worker: CF_ACCOUNT_ID (plain var) and CF_API_TOKEN (secret, scope
 * "Account Analytics: Read"). Until both are set the panel shows how to set them up instead of numbers.
 * The Free plan limits are per account and per UTC day (they reset at 00:00 UTC = 05:00 in Pakistan).
 */
import { clean } from './lib.js'

export const KV_FREE_LIMITS = { read: 100000, write: 1000, delete: 1000, list: 1000 }
/** Workers Paid ($5/month): amounts included per calendar month; beyond them KV bills per million instead of failing. */
export const KV_PAID_INCLUDED = { read: 10000000, write: 1000000, delete: 1000000, list: 1000000 }
export const KV_PAID_OVERAGE_USD_PER_MILLION = { read: 0.5, write: 5, delete: 5, list: 5 }

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

export function startOfUtcMonth(now = Date.now()) {
  const d = new Date(now)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

/** Estimated overage bill so far this month on the Paid plan (the $5 base fee is not included). */
export function paidOverageUsd(month) {
  let total = 0
  for (const op of Object.keys(KV_PAID_INCLUDED)) {
    const over = Math.max(0, (month?.[op] || 0) - KV_PAID_INCLUDED[op])
    total += (over / 1000000) * KV_PAID_OVERAGE_USD_PER_MILLION[op]
  }
  return Math.round(total * 100) / 100
}

async function queryKv(env, account, token, since, until, fetchFn) {
  const response = await fetchFn('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { account, since, until } }),
  })
  if (!response.ok) throw new Error(`analytics_${response.status}`)
  const body = await response.json()
  if (body?.errors?.length) throw new Error(`analytics_${String(body.errors[0]?.message || 'error').slice(0, 80)}`)
  return summarizeKvRows(body?.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups || [], clean(env.TEMP_MAIL_NAMESPACE_ID))
}

export async function kvUsageToday(env, { now = Date.now(), fetchFn = fetch } = {}) {
  const account = clean(env.CF_ACCOUNT_ID)
  const token = clean(env.CF_API_TOKEN)
  if (!account || !token) {
    return { configured: false, limits: KV_FREE_LIMITS, missing: [!account && 'CF_ACCOUNT_ID', !token && 'CF_API_TOKEN'].filter(Boolean) }
  }
  const until = new Date(now).toISOString()
  const [day, month] = await Promise.all([
    queryKv(env, account, token, startOfUtcDay(now), until, fetchFn),
    queryKv(env, account, token, startOfUtcMonth(now), until, fetchFn),
  ])
  return {
    configured: true,
    since: startOfUtcDay(now),
    limits: KV_FREE_LIMITS,
    account: day.account,
    tempMail: day.namespace,
    paid: { included: KV_PAID_INCLUDED, since: startOfUtcMonth(now), account: month.account, tempMail: month.namespace, overageUsd: paidOverageUsd(month.account) },
  }
}
