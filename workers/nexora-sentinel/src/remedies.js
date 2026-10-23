/**
 * First aid. Only safe, reversible actions, and only when their secret is set.
 * For a failing website page:
 *  - purge the Cloudflare cache, at most once per run and once per 30 minutes.
 *    This clears cached copies (for example a cached error or a stale blog
 *    lookup); it cannot repair broken code.
 *  - if the page keeps failing (3 runs), trigger a fresh build of the site via a
 *    Workers Builds deploy hook, at most once per 30 minutes. That rebuilds the
 *    current code, so it helps after a failed or half-finished deploy, not after
 *    a real code bug.
 * Workers, Firebase and other services cannot be restarted from outside, so the
 * Sentinel only re-checks and reports them; it never claims to have fixed them.
 */
export const PURGE_COOLDOWN_MS = 30 * 60 * 1000
export const REDEPLOY_COOLDOWN_MS = 30 * 60 * 1000

export const deployHook = (env) => env.DEPLOY_HOOK || env.PAGES_DEPLOY_HOOK || ''

export function remedyPlan(check, fails, env, now, last = {}) {
  const steps = []
  if (check?.kind !== 'page') return steps
  if (env.CF_API_TOKEN && env.CF_ZONE_ID && !last.purgedThisRun && (!last.purgeAt || now - last.purgeAt > PURGE_COOLDOWN_MS)) steps.push('purge_cache')
  if (fails >= 3 && deployHook(env) && (!last.redeployAt || now - last.redeployAt > REDEPLOY_COOLDOWN_MS)) steps.push('redeploy')
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
      const res = await fetchFn(deployHook(env), { method: 'POST' })
      return res.ok ? 'Started a fresh site build (takes a few minutes)' : `Site rebuild request failed (HTTP ${res.status})`
    }
    return `Unknown fix ${step}`
  } catch (error) {
    return `Fix ${step} errored: ${String(error?.message || error).slice(0, 80)}`
  }
}
