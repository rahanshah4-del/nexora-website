/**
 * Renders the free tools intro to public/nexora-tools-intro.mp4 and a poster.
 * Frames come from /nexora-tools-intro-capture (src/components/tools/ToolsIntroStage.jsx),
 * where every frame is a pure function of time.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/render-tools-video.mjs [--test]
 */
import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { TOOLS_INTRO } from '../src/lib/toolsIntroData.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const FPS = 30
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const out = new URL('../public/', import.meta.url).pathname
const tmp = process.env.FRAME_DIR || '/tmp/nexora-tools-frames'
const test = process.argv.includes('--test')
const times = process.env.TEST_TIMES ? process.env.TEST_TIMES.split(',').map(Number) : [3, 5.6, 9, 12, 17, 20, 25, 28, 31, 35, 40, 43, 47, 50, 54]

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: TOOLS_INTRO.width, height: TOOLS_INTRO.height }, deviceScaleFactor: 1 })
await page.goto(`${BASE}${TOOLS_INTRO.capturePath}`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ready === true)
await page.addStyleTag({ content: 'html,body{margin:0;overflow:hidden;background:#050816}' })
await page.evaluate(() => document.fonts.ready)

const shot = async (t, path) => {
  await page.evaluate((v) => window.__setT(v), t)
  const jpg = path.endsWith('.jpg')
  await page.screenshot({ path, clip: { x: 0, y: 0, width: TOOLS_INTRO.width, height: TOOLS_INTRO.height }, type: jpg ? 'jpeg' : 'png', ...(jpg ? { quality: 88 } : {}) })
}

if (test) {
  for (const t of times) await shot(t, `${tmp}/t${t}.png`)
  await browser.close()
  console.log('test frames in', tmp)
  process.exit(0)
}

const total = Math.round(TOOLS_INTRO.duration * FPS)
for (let i = 0; i < total; i += 1) await shot(i / FPS, `${tmp}/f${String(i).padStart(5, '0')}.png`)
await shot(TOOLS_INTRO.posterT, `${out}nexora-tools-intro-poster.jpg`)
await browser.close()

const r = spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', `${tmp}/f%05d.png`, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '25', '-preset', 'slow', '-movflags', '+faststart', '-an', `${out}nexora-tools-intro.mp4`], { stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status || 1)
console.log('wrote public/nexora-tools-intro.mp4 and poster')
