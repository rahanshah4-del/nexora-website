/**
 * Renders the homepage intro to public/nexora-intro-v2.mp4 and a poster.
 * Frames come from /nexora-intro-capture (src/components/home/NexoraIntroStage.jsx),
 * where every frame is a pure function of time.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/render-nexora-video.mjs [--test]
 */
import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { NEXORA_INTRO } from '../src/lib/nexoraIntroData.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const FPS = 30
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const out = new URL('../public/', import.meta.url).pathname
const tmp = process.env.FRAME_DIR || '/tmp/nexora-frames'
const test = process.argv.includes('--test')
const times = process.env.TEST_TIMES ? process.env.TEST_TIMES.split(',').map(Number) : [3, 5.8, 10, 17, 25, 33, 40, 48, 55, 61, 70]

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: NEXORA_INTRO.width, height: NEXORA_INTRO.height }, deviceScaleFactor: 1.5 })
await page.goto(`${BASE}${NEXORA_INTRO.capturePath}`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ready === true)
await page.addStyleTag({ content: 'html,body{margin:0;overflow:hidden;background:#f8fbff}' })
await page.evaluate(() => document.fonts.ready)

const shot = async (t, path) => {
  await page.evaluate((v) => window.__setT(v), t)
  const jpg = path.endsWith('.jpg')
  await page.screenshot({ path, clip: { x: 0, y: 0, width: NEXORA_INTRO.width, height: NEXORA_INTRO.height }, type: jpg ? 'jpeg' : 'png', ...(jpg ? { quality: 88 } : {}) })
}

if (test) {
  for (const t of times) await shot(t, `${tmp}/t${t}.png`)
  await browser.close()
  console.log('test frames in', tmp)
  process.exit(0)
}

const total = Math.round(NEXORA_INTRO.duration * FPS)
for (let i = 0; i < total; i += 1) await shot(i / FPS, `${tmp}/f${String(i).padStart(5, '0')}.png`)
await shot(NEXORA_INTRO.posterT, `${out}nexora-intro-v2-poster.jpg`)
await browser.close()

const r = spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', `${tmp}/f%05d.png`, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-vf', 'scale=1920:1080:flags=lanczos', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', '-an', `${out}nexora-intro-v2.mp4`], { stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status || 1)
console.log('wrote public/nexora-intro-v2.mp4 and poster')
