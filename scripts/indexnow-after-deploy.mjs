// Runs from the Workers Builds deploy command, after `wrangler deploy` has put
// this build live:
//
//   npx wrangler deploy && npm run indexnow:after-deploy
//
// Diffs the sitemap that was live before the deploy (saved in prebuild by
// scripts/snapshot-live-sitemap.mjs) against the one just deployed, and submits
// the changed URLs to IndexNow: new and edited articles, plus removed URLs
// (unpublished, deleted or renamed posts) so engines recrawl them and see the
// 404 / 301. See scripts/lib/sitemapDiff.mjs for exactly what counts.
//
// Always exits 0 — IndexNow is best-effort and must never mark a successful
// deploy as failed.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffSitemaps } from './lib/sitemapDiff.mjs'
import { submitIndexNow } from './indexnow.mjs'
import { LIVE_SITEMAP_SNAPSHOT } from './snapshot-live-sitemap.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEPLOYED_SITEMAP = join(ROOT, 'dist', 'sitemap.xml')
const LIVE_SITEMAP_URL = 'https://nexorasolution.online/sitemap.xml'
const LIVE_WAIT_MS = 120_000
const LIVE_POLL_MS = 5_000

const log = (...args) => console.log('[indexnow]', ...args)

// The new version is usually serving within seconds of `wrangler deploy`
// returning; wait until the live sitemap matches what was just deployed so
// engines are never pointed at a page that isn't there yet.
async function waitUntilLive(expectedXml) {
  const deadline = Date.now() + LIVE_WAIT_MS
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${LIVE_SITEMAP_URL}?v=${Date.now()}`, { signal: AbortSignal.timeout(10_000), headers: { 'cache-control': 'no-cache' } })
      if (response.ok && (await response.text()) === expectedXml) return true
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, LIVE_POLL_MS))
  }
  return false
}

async function main() {
  if (!existsSync(LIVE_SITEMAP_SNAPSHOT)) {
    log('No pre-deploy sitemap snapshot; skipping (not resubmitting the whole sitemap).')
    return
  }
  if (!existsSync(DEPLOYED_SITEMAP)) {
    log('dist/sitemap.xml missing; skipping.')
    return
  }
  const previous = readFileSync(LIVE_SITEMAP_SNAPSHOT, 'utf8')
  const current = readFileSync(DEPLOYED_SITEMAP, 'utf8')
  const { added, changed, removed, urls } = diffSitemaps(previous, current)
  log(`Sitemap diff vs. previous deploy — added: ${added.length}, articles edited: ${changed.length}, removed: ${removed.length}`)
  if (!urls.length) {
    log('Nothing to submit.')
    return
  }
  for (const url of urls) log(`  • ${url}`)

  if (!(await waitUntilLive(current))) {
    log(`⚠ Live sitemap still differs from this build after ${LIVE_WAIT_MS / 1000}s; submitting anyway.`)
  }
  const result = await submitIndexNow(urls, { reason: 'after-deploy' })
  if (result.dryRun) log(`Dry-run: ${urls.length} URL(s) not sent (set INDEXNOW_SUBMIT=true to send from a local run).`)
  else log(`Submitted ${result.submitted} URL(s)${result.failed ? `, ${result.failed} failed` : ''}.`)
}

main().catch((err) => {
  console.warn('[indexnow] ⚠ after-deploy submission failed (deploy is unaffected):', err?.message || err)
})
