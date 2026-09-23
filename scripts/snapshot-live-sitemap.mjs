// Runs in `prebuild`, before anything is deployed: saves the sitemap that is
// live right now, so scripts/indexnow-after-deploy.mjs can tell IndexNow
// exactly what this deploy changed. The live sitemap — not the copy committed
// in public/ — is the baseline, because CMS-triggered rebuilds never commit,
// so the committed copy goes stale.
//
// Never fails the build: without a snapshot the after-deploy step simply
// skips submission rather than resubmitting every URL.

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const LIVE_SITEMAP_SNAPSHOT = join(ROOT, '.cache', 'indexnow', 'live-sitemap-before-deploy.xml')
const LIVE_SITEMAP_URL = 'https://nexorasolution.online/sitemap.xml'

async function main() {
  // A stale snapshot from an earlier run must never stand in for this one.
  await rm(LIVE_SITEMAP_SNAPSHOT, { force: true })
  try {
    const response = await fetch(LIVE_SITEMAP_URL, { signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } })
    const xml = await response.text()
    if (!response.ok || !xml.includes('<urlset')) throw new Error(`HTTP ${response.status}`)
    await mkdir(dirname(LIVE_SITEMAP_SNAPSHOT), { recursive: true })
    await writeFile(LIVE_SITEMAP_SNAPSHOT, xml)
    console.log(`[indexnow] Saved live sitemap snapshot (${(xml.match(/<url>/g) || []).length} URLs) for the after-deploy diff`)
  } catch (err) {
    console.warn(`[indexnow] ⚠ Could not snapshot ${LIVE_SITEMAP_URL} (${err?.cause?.code || err?.message || err}); IndexNow submission will be skipped after this deploy`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
