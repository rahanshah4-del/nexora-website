/** Nexora homepage intro video: timeline, chapters, schema and wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { NEXORA_INTRO, NEXORA_INTRO_SCENES, nexoraIntroSchema } from '../src/lib/nexoraIntroData.js'
import { NEXORA_PRODUCTS } from '../src/lib/nexoraProducts.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('scenes are contiguous and fill the duration', () => {
  assert.equal(NEXORA_INTRO_SCENES[0].start, 0)
  for (let i = 1; i < NEXORA_INTRO_SCENES.length; i += 1) assert.equal(NEXORA_INTRO_SCENES[i].start, NEXORA_INTRO_SCENES[i - 1].end)
  assert.equal(NEXORA_INTRO_SCENES.at(-1).end, NEXORA_INTRO.duration)
  assert.ok(NEXORA_INTRO.posterT > NEXORA_INTRO_SCENES.at(-1).start && NEXORA_INTRO.posterT < NEXORA_INTRO.duration)
})

test('every chapter link points to a real product or page', () => {
  const known = new Set([...NEXORA_PRODUCTS.map((p) => p.to), '/signup'])
  for (const scene of NEXORA_INTRO_SCENES) for (const [label, to] of scene.links || []) assert.ok(known.has(to), `${scene.id}: ${label} -> ${to}`)
})

test('every product in the product list appears in the tour', () => {
  const linked = new Set(NEXORA_INTRO_SCENES.flatMap((s) => (s.links || []).map(([, to]) => to)))
  for (const p of NEXORA_PRODUCTS) assert.ok(linked.has(p.to), `${p.label} (${p.to}) is missing from the tour`)
})

test('VideoObject schema matches the video', () => {
  const schema = nexoraIntroSchema()
  assert.equal(schema['@type'], 'VideoObject')
  assert.equal(schema.duration, 'PT1M12S')
  assert.equal(schema.contentUrl, 'https://nexorasolution.online/nexora-intro-v2.mp4')
  assert.equal(schema.thumbnailUrl, 'https://nexorasolution.online/nexora-intro-v2-poster.jpg')
})

test('video files exist, are web-sized and are an MP4 / JPEG', () => {
  const mp4 = readFileSync(new URL('../public/nexora-intro-v2.mp4', import.meta.url))
  const jpg = readFileSync(new URL('../public/nexora-intro-v2-poster.jpg', import.meta.url))
  assert.ok(existsSync(new URL('../public/nexora-intro-v2-start.jpg', import.meta.url)))
  assert.equal(mp4.subarray(4, 8).toString(), 'ftyp')
  assert.ok(mp4.length < 12_000_000, `MP4 ${mp4.length} bytes`)
  assert.deepEqual([jpg[0], jpg[1]], [0xff, 0xd8])
})

test('homepage shows the section; the capture page is noindex and unlinked', () => {
  assert.match(read('../src/sections/HomepageSections.jsx'), /<NexoraIntroSection \/>/)
  const player = read('../src/components/home/NexoraIntroPlayer.jsx')
  assert.match(read('../src/sections/NexoraIntroSection.jsx'), /<NexoraIntroPlayer \/>/)
  for (const attr of ['muted', 'loop', 'playsInline', 'preload="none"', '.play()']) assert.ok(player.includes(attr), `video has ${attr}`)
  assert.match(player, /prefers-reduced-motion/)
  assert.match(player, /IntersectionObserver/)
  assert.match(read('../src/pages/public/NexoraIntroCapture.jsx'), /noindex,nofollow/)
  assert.ok(!existsSync(new URL('../public/nexora-intro-capture', import.meta.url)))
  assert.ok(!read('../scripts/generate-sitemap.mjs').includes('nexora-intro-capture'))
})
