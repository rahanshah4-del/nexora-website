/**
 * Generate image-sitemap.xml for all public website images.
 * Run after prerender completes.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const DIST = join(ROOT, 'dist')
const PUBLIC = join(ROOT, 'public')
const SITE = 'https://nexorasolution.online'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'])

function findImages(dir, base = dir) {
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

  writeFileSync(join(PUBLIC, 'image-sitemap.xml'), xml)
  console.log(`[image-sitemap] ✓ Generated with ${unique.length} images`)
}

generateImageSitemap()
