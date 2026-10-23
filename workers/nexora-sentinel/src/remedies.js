/**
 * First aid. Only safe, reversible actions, and only when their secret is set:
 *  - page checks: purge the Cloudflare cache (a stale or poisoned edge copy),
 *    then, if pages keep failing, trigger a fresh Pages build (at most one per 30 min).
 * Workers and third-party services cannot be restarted from outside, so for those
 * the Sentinel retries once and reports; it never pretends to have fixed them.
 */
export const REDEPLOY_COOLDOWN_MS = 30 * 60 * 1000

export function remedyPlan(check, fails, env, now, lastRedeployAt = 0) {
  const steps = []
  if (check.kind !== 'page') return steps
  if (env.CF_API_TOKEN && env.CF_ZONE_ID) steps.push('purge_cache')
  if (fails >= 3 && env.PAGES_DEPLOY_HOOK && now - lastRedeployAt > REDEPLOY_COOLDOWN_MS) steps.push('redeploy')
  return steps
}

export async function runRemedy(step, env, fetchFn = fetch) {
  try {
    if (step === 'purge_cache') {
      const res = await fetchFn(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ purge_everything: true }),
      })
      return res.ok ? 'Purged the Cloudflare cache' : `Cache purge failed (HTTP ${res.status})`
    }
    if (step === 'redeploy') {
      const res = await fetchFn(env.PAGES_DEPLOY_HOOK, { method: 'POST' })
      return res.ok ? 'Started a fresh site build' : `Site rebuild request failed (HTTP ${res.status})`
    }
    return `Unknown fix ${step}`
  } catch (error) {
    return `Fix ${step} errored: ${String(error?.message || error).slice(0, 80)}`
  }
}
