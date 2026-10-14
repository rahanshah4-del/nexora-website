/**
 * Renders the product loop clips (src/lib/productVideos.js) to
 * public/videos/products/<id>.mp4, <id>.webm and <id>-poster.jpg.
 * Frames come from /product-clip-capture?clip=<id> (src/components/product/ProductClipStage.jsx),
 * where every frame is a pure function of time.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/render-product-clips.mjs [clip-id ...] [--test]
 */
import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { ALL_CLIPS, PRODUCT_CAPTURE_PATH, PRODUCT_CLIP } from '../src/lib/productVideos.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const { width, height, fps, duration, posterT } = PRODUCT_CLIP
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const outDir = new URL('../public/videos/products/', import.meta.url).pathname
const tmpRoot = process.env.FRAME_DIR || '/tmp/nexora-product-frames'
const test = process.argv.includes('--test')
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const clips = ALL_CLIPS.filter((c) => !wanted.length || wanted.includes(c.id))
const testTimes = process.env.TEST_TIMES ? process.env.TEST_TIMES.split(',').map(Number) : [1, 2.6, 4, 5.5, 7, 9, 10.5]

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })

for (const clip of clips) {
  const tmp = `${tmpRoot}/${clip.id}`
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.goto(`${BASE}${PRODUCT_CAPTURE_PATH}?clip=${clip.id}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ready === true)
  await page.addStyleTag({ content: 'html,body{margin:0;overflow:hidden;background:#e9f1ff}' })
  await page.evaluate(() => document.fonts.ready)
  const shot = async (t, file) => {
    await page.evaluate((v) => window.__setT(v), t)
    const jpg = file.endsWith('.jpg')
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height }, type: jpg ? 'jpeg' : 'png', ...(jpg ? { quality: 88 } : {}) })
  }
  if (test) {
    for (const t of testTimes) await shot(t, `${tmp}/t${t}.png`)
    console.log('test frames in', tmp)
    await page.close()
    continue
  }
  const total = Math.round(duration * fps)
  for (let i = 0; i < total; i += 1) await shot(i / fps, `${tmp}/f${String(i).padStart(5, '0')}.png`)
  await shot(posterT, `${outDir}${clip.id}-poster.jpg`)
  await page.close()
  const input = ['-y', '-framerate', String(fps), '-i', `${tmp}/f%05d.png`]
  const mp4 = spawnSync('ffmpeg', [...input, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-an', `${outDir}${clip.id}.mp4`], { stdio: 'inherit' })
  if (mp4.status !== 0) process.exit(mp4.status || 1)
  const webm = spawnSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', `${outDir}${clip.id}.webm`], { stdio: 'inherit' })
  if (webm.status !== 0) process.exit(webm.status || 1)
  console.log('wrote', clip.id)
}
await browser.close()
