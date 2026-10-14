/** Free tools intro video (/tools/): timeline, chapters, schema and wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { TOOLS_INTRO, TOOLS_INTRO_SCENES, toolsIntroSchema } from '../src/lib/toolsIntroData.js'
import { TOOL_LINKS } from '../src/lib/toolsLaunch.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('scenes are contiguous and fill the duration', () => {
  assert.equal(TOOLS_INTRO_SCENES[0].start, 0)
  for (let i = 1; i < TOOLS_INTRO_SCENES.length; i += 1) assert.equal(TOOLS_INTRO_SCENES[i].start, TOOLS_INTRO_SCENES[i - 1].end)
  assert.equal(TOOLS_INTRO_SCENES.at(-1).end, TOOLS_INTRO.duration)
  assert.ok(TOOLS_INTRO.posterT > TOOLS_INTRO_SCENES.at(-1).start && TOOLS_INTRO.posterT < TOOLS_INTRO.duration)
})

test('every free tool is linked from the tour and every link is a real tool', () => {
  const real = new Set(TOOL_LINKS.map((t) => t.path))
  const linked = new Set(TOOLS_INTRO_SCENES.flatMap((s) => (s.links || []).map(([, to]) => to)))
  for (const to of linked) assert.ok(real.has(to), `${to} is not a tool`)
  for (const t of TOOL_LINKS) assert.ok(linked.has(t.path), `${t.label} missing from the tour`)
})

test('VideoObject schema matches the video', () => {
  const schema = toolsIntroSchema()
  assert.equal(schema['@type'], 'VideoObject')
  assert.equal(schema.duration, 'PT57S')
  assert.equal(schema.contentUrl, 'https://nexorasolution.online/nexora-tools-intro.mp4')
  assert.equal(schema.thumbnailUrl, 'https://nexorasolution.online/nexora-tools-intro-poster.jpg')
})

test('video files exist and are web-sized', () => {
  const mp4 = readFileSync(new URL('../public/nexora-tools-intro.mp4', import.meta.url))
  const jpg = readFileSync(new URL('../public/nexora-tools-intro-poster.jpg', import.meta.url))
  assert.ok(existsSync(new URL('../public/nexora-tools-intro-start.jpg', import.meta.url)))
  assert.equal(mp4.subarray(4, 8).toString(), 'ftyp')
  assert.ok(mp4.length < 10_000_000, `MP4 ${mp4.length} bytes`)
  assert.deepEqual([jpg[0], jpg[1]], [0xff, 0xd8])
})

test('hub shows the section; capture page is noindex, unlinked and popup-free', () => {
  assert.match(read('../src/pages/public/tools/ToolsHubPage.jsx'), /<ToolsIntroSection \/>/)
  assert.match(read('../src/sections/ToolsIntroSection.jsx'), /<NexoraIntroPlayer intro=\{TOOLS_INTRO\} scenes=\{TOOLS_INTRO_SCENES\} \/>/)
  assert.match(read('../src/pages/public/ToolsIntroCapture.jsx'), /noindex,nofollow/)
  assert.match(read('../src/lib/promoPopupRoutes.js'), /nexora-tools-intro-capture/)
  assert.match(read('../src/AppRouter.jsx'), /nexora-tools-intro-capture/)
  assert.ok(!read('../scripts/generate-sitemap.mjs').includes('nexora-tools-intro-capture'))
})
