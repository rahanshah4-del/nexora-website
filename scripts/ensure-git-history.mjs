/**
 * Deepen a shallow CI checkout before the sitemap is generated.
 *
 * scripts/lib/pageLastmod.mjs derives each page's <lastmod> from git history.
 * On a shallow clone (Cloudflare's build checkout is one) every file older than
 * the clone's cut-off looks "changed in the boundary commit", so those pages
 * are deliberately given NO <lastmod>. Fetching the full history fixes that.
 *
 * Best effort: a missing git, a non-git directory, no network or a policy that
 * blocks --unshallow must never fail the build. The sitemap then simply falls
 * back to omitting <lastmod>, exactly as before.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

try {
  const shallowFile = git(['rev-parse', '--git-path', 'shallow'])
  const full = path.isAbsolute(shallowFile) ? shallowFile : path.join(ROOT, shallowFile)
  if (existsSync(full)) {
    console.log('[git-history] shallow clone detected, fetching full history for sitemap lastmod…')
    git(['fetch', '--unshallow', '--quiet'])
    console.log('[git-history] ✓ full history available')
  } else {
    console.log('[git-history] full history already present')
  }
} catch (error) {
  console.warn(`[git-history] skipped (${String(error.message || error).split('\n')[0]}); lastmod stays omitted for older pages`)
}
