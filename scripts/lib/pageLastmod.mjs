/**
 * Real <lastmod> dates for the sitemap's non-blog pages: the last git commit
 * date of the files a page's content comes from, instead of the build date
 * (which marked every page "modified today" on every build).
 *
 * A route's files are its page component (read from src/AppRouter.jsx) plus the
 * content/data modules listed in CONTENT_SOURCES. Titles/meta (seoMetadata.js)
 * and shared chrome (header, footer) are deliberately not counted.
 *
 * Shallow clones (CI checkouts often are): a file last changed before the
 * clone's cut-off appears to change in the boundary commit, which would be a
 * false date. Such files count as "older than every known date": the page gets
 * the newest known date of its other files, or no <lastmod> at all when none
 * is known. A missing lastmod is ignored by search engines; a wrong one is not.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Content that lives outside the page component itself, by component name.
export const CONTENT_SOURCES = {
  MarketingRoute: ['src/App.jsx', 'src/sections/HomepageSections.jsx', 'src/sections/AISections.jsx', 'src/sections/FreeToolsSection.jsx'],
  SolutionPage: ['src/lib/featurePagesData.js'],
  FeaturePage: ['src/lib/featurePagesData.js'],
  ComparePage: ['src/lib/comparePagesData.js'],
  CountryPage: ['src/lib/countries.js'],
  AboutPage: ['src/lib/aboutContent.js'],
  PrivacyPolicyPage: ['src/lib/legalContent.js', 'src/pages/public/LegalDocument.jsx'],
  TermsPage: ['src/lib/legalContent.js', 'src/pages/public/LegalDocument.jsx'],
  RefundPolicyPage: ['src/lib/legalContent.js', 'src/pages/public/LegalDocument.jsx'],
  PublicBusinessServicesPage: ['src/components/BusinessServicesSection.jsx', 'src/lib/businessServices.js'],
  DownloadRestaurantPOSPage: ['src/pages/public/download/downloadContent.js'],
  PricingPage: ['src/lib/platformPlans.js'],
  // Free tools (/tools/*): copy in the data module, layout in the shared parts.
  ToolsHubPage: ['src/lib/toolsPagesData.js', 'src/pages/public/tools/ToolPageParts.jsx'],
  ToolLandingPage: ['src/lib/toolsPagesData.js', 'src/pages/public/tools/ToolPageParts.jsx'],
}

const WRAPPERS = new Set(['LazyPage', 'NoIndexRoute', 'Suspense', 'Navigate'])

function cleanRoute(value) {
  const raw = String(value || '').trim()
  return !raw || raw === '/' ? '/' : raw.replace(/\/+$/, '')
}

/** route (no trailing slash) -> repo-relative source files, from the router. */
export function routeSourceFiles(root) {
  const routerPath = path.join(root, 'src', 'AppRouter.jsx')
  const src = readFileSync(routerPath, 'utf8')
  const componentFile = new Map()
  for (const m of src.matchAll(/const (\w+) = lazy\(\(\) => import\('\.\/([^']+)'\)\)/g)) componentFile.set(m[1], `src/${m[2]}`)
  for (const m of src.matchAll(/^import (\w+) from '\.\/([^']+\.jsx)'/gm)) componentFile.set(m[1], `src/${m[2]}`)
  const byRoute = new Map()
  for (const m of src.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g)) {
    const component = [...m[2].matchAll(/<([A-Z]\w*)/g)].map((c) => c[1]).find((name) => !WRAPPERS.has(name))
    if (!component || !componentFile.has(component)) continue
    const route = cleanRoute(m[1])
    if (byRoute.has(route)) continue
    byRoute.set(route, [componentFile.get(component), ...(CONTENT_SOURCES[component] || [])])
  }
  return byRoute
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

export function createLastmodResolver(root) {
  let shallowBoundaries = new Set()
  let available = true
  try {
    const shallowFile = git(root, ['rev-parse', '--git-path', 'shallow'])
    const full = path.isAbsolute(shallowFile) ? shallowFile : path.join(root, shallowFile)
    if (existsSync(full)) shallowBoundaries = new Set(readFileSync(full, 'utf8').split(/\s+/).filter(Boolean))
  } catch {
    available = false
  }
  const cache = new Map()
  // YYYY-MM-DD of the file's last commit, or null when it cannot be known.
  function fileDate(file) {
    if (!available) return null
    if (!cache.has(file)) {
      let date = null
      try {
        const [hash, day] = git(root, ['log', '-1', '--format=%H %cs', '--', file]).split(' ')
        if (hash && !shallowBoundaries.has(hash)) date = day
      } catch {
        date = null
      }
      cache.set(file, date)
    }
    return cache.get(file)
  }
  return {
    shallow: shallowBoundaries.size > 0,
    available,
    /** Newest known commit date across the files, or null. */
    lastmodFor(files = []) {
      const dates = files.map(fileDate).filter(Boolean).sort()
      return dates.length ? dates[dates.length - 1] : null
    },
  }
}
