/**
 * Renders the module intro videos (src/lib/moduleIntros.js) to
 * public/videos/intros/<id>.mp4, <id>.webm and <id>-poster.jpg.
 * Frames come from /module-intro-capture?clip=<id> (src/components/video/ModuleIntroStage.jsx),
 * where every frame is a pure function of time.
 *
 *   npm run build && npx vite preview --port 4173 &      (or: npx vite --port 4173)
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright-core node scripts/render-module-intros.mjs [id ...] [--test]
 *
 * --test writes a few PNG frames to $FRAME_DIR/<id>/ (times from TEST_TIMES, comma separated) and stops.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { ALL_INTROS, MODULE_INTRO, MODULE_INTRO_CAPTURE_PATH } from '../src/lib/moduleIntros.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const { stageWidth, stageHeight, width, height, fps } = MODULE_INTRO
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const outDir = new URL('../public/videos/intros/', import.meta.url).pathname
const tmpRoot = process.env.FRAME_DIR || '/tmp/nexora-intro-frames'
const test = process.argv.includes('--test')
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const intros = ALL_INTROS.filter((i) => !wanted.length || wanted.includes(i.id))
const testTimes = process.env.TEST_TIMES ? process.env.TEST_TIMES.split(',').map(Number) : [2, 6, 9, 14, 17, 20, 22, 26.6]

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })

for (const intro of intros) {
  const tmp = `${tmpRoot}/${intro.id}`
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const page = await browser.newPage({ viewport: { width: stageWidth, height: stageHeight }, deviceScaleFactor: width / stageWidth })
  await page.goto(`${BASE}${MODULE_INTRO_CAPTURE_PATH}?clip=${intro.id}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ready === true)
  await page.addStyleTag({ content: 'html,body{margin:0;overflow:hidden;background:#050914}' })
  await page.evaluate(() => document.fonts.ready)
  const shot = async (t, file) => {
    await page.evaluate((v) => window.__setT(v), t)
    const jpg = file.endsWith('.jpg')
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: stageWidth, height: stageHeight }, type: jpg ? 'jpeg' : 'png', ...(jpg ? { quality: 86 } : {}) })
  }
  if (test) {
    for (const t of testTimes.filter((v) => v <= intro.duration)) await shot(t, `${tmp}/t${t}.png`)
    console.log('test frames in', tmp)
    await page.close()
    continue
  }
  const total = Math.round(intro.duration * fps)
  for (let i = 0; i < total; i += 1) await shot(i / fps, `${tmp}/f${String(i).padStart(5, '0')}.png`)
  await shot(intro.posterT, `${outDir}${intro.id}-poster.jpg`)
  await page.close()
  const input = ['-y', '-framerate', String(fps), '-i', `${tmp}/f%05d.png`, '-vf', `scale=${width}:${height}:flags=lanczos`]
  const mp4 = spawnSync('ffmpeg', [...input, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', '-an', `${outDir}${intro.id}.mp4`], { stdio: 'inherit' })
  if (mp4.status !== 0) process.exit(mp4.status || 1)
  const webm = spawnSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', `${outDir}${intro.id}.webm`], { stdio: 'inherit' })
  if (webm.status !== 0) process.exit(webm.status || 1)
  console.log('wrote', intro.id)
}
await browser.close()
