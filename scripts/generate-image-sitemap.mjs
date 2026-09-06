/**
 * Generate image-sitemap.xml for all public website images.
 * Run after prerender completes.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const DIST = join(ROOT, 'dist')
const PUBLIC = join(ROOT, 'public')
const SITE = 'https://nexorasolution.online'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'])

// Exported so generate-sitemap.mjs can reuse the exact same image discovery
// logic when it embeds <image:image> tags directly into sitemap.xml instead
// of this script's now-disabled standalone image-sitemap.xml output.
export function findImages(dir, base = dir) {
  const results = []
  if (!existsSync(dir)) return results
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'assets') {
        results.push(...findImages(full, base))
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        results.push({
          path: '/' + relative(base, full).replace(/\\/g, '/'),
          title: entry.name.replace(extname(entry.name), '').replace(/[-_]/g, ' '),
          size: statSync(full).size,
        })
      }
    }
  } catch { /* skip */ }
  return results
}

function generateImageSitemap() {
  const images = [
    ...findImages(PUBLIC),
    ...findImages(DIST, DIST),
  ]

  // Deduplicate by path
  const seen = new Set()
  const unique = images.filter((img) => {
    if (seen.has(img.path)) return false
    seen.add(img.path)
    return true
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}/</loc>
${unique.filter((img) => !img.path.includes('/blog/')).slice(0, 20).map((img) => `    <image:image>
      <image:loc>${SITE}${img.path}</image:loc>
      <image:title>${img.title}</image:title>
      <image:caption>Nexora Solution — ${img.title}</image:caption>
    </image:image>`).join('\n')}
  </url>
  <url>
    <loc>${SITE}/blog/</loc>
${unique.filter((img) => img.path.includes('/blog/')).slice(0, 40).map((img) => `    <image:image>
      <image:loc>${SITE}${img.path}</image:loc>
      <image:title>${img.title}</image:title>
      <image:caption>Nexora Solution Blog — ${img.title}</image:caption>
    </image:image>`).join('\n')}
  </url>
</urlset>`

  // Standalone image-sitemap.xml is no longer written — its <loc> entries
  // (/ and /blog/) duplicated pages already listed in sitemap.xml, which
  // Ahrefs flagged as pages appearing in multiple sitemaps. The same image
  // data is now embedded directly into sitemap.xml's <url> blocks by
  // generate-sitemap.mjs (via the findImages() export above).
  console.log(`[image-sitemap] ✓ Computed ${unique.length} images (standalone image-sitemap.xml disabled; merged into sitemap.xml)`)
}

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].endsWith('generate-image-sitemap.mjs'))) {
  generateImageSitemap()
}
