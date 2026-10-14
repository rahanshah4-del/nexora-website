/**
 * Renders the GeoLint explainer to public/geolint-how-it-works.mp4 and a poster.
 * The player is a pure function of time (src/pages/public/tools/GeoLintExplainer.jsx),
 * so frames are captured by setting t and taking a screenshot, then joined by ffmpeg.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/render-geolint-video.mjs [--test]
 *
 * Needs ffmpeg and a Chromium (CHROMIUM_PATH, default /opt/pw-browsers/chromium).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { GEOLINT_HOW_DURATION, GEOLINT_HOW_POSTER_T } from '../src/lib/geolintHowData.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const FPS = 25
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const out = new URL('../public/', import.meta.url).pathname
const tmp = process.env.FRAME_DIR || '/tmp/geolint-frames'
const test = process.argv.includes('--test')

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
await page.goto(`${BASE}/tools/geo-audit/how-it-works/?capture=1`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__explainerReady === true)
await page.addStyleTag({ content: 'html,body{margin:0;overflow:hidden}' })
const stage = page.locator('div').first()

const shot = async (t, path) => {
  await page.evaluate((v) => window.__setT(v), t)
  await page.screenshot({ path, clip: { x: 0, y: 0, width: 1280, height: 720 }, type: path.endsWith('.jpg') ? 'jpeg' : 'png', ...(path.endsWith('.jpg') ? { quality: 88 } : {}) })
}

if (test) {
  for (const t of [6.2, 15.3, 51]) await shot(t, `${tmp}/t${t}.png`)
  await browser.close()
  console.log('test frames in', tmp)
  process.exit(0)
}

const total = Math.round(GEOLINT_HOW_DURATION * FPS)
for (let i = 0; i < total; i += 1) await shot(i / FPS, `${tmp}/f${String(i).padStart(5, '0')}.png`)
await shot(GEOLINT_HOW_POSTER_T, `${out}geolint-how-it-works-poster.jpg`)
await browser.close()

const r = spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', `${tmp}/f%05d.png`, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', '-an', `${out}geolint-how-it-works.mp4`], { stdio: 'inherit' })
writeFileSync(`${tmp}/done`, String(r.status))
if (r.status !== 0) process.exit(r.status || 1)
console.log('wrote public/geolint-how-it-works.mp4 and poster')
