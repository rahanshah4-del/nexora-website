/** Module intro videos (dark series): data, scenes, files, schema and page wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { ALL_INTROS, introFiles, introForSlug, introSchema, MODULE_INTRO, MODULE_INTRO_CAPTURE_PATH } from '../src/lib/moduleIntros.js'
import { ACCENT } from '../src/components/video/fxMath.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const pub = (p) => new URL(`../public${p}`, import.meta.url)

test('intro ids and product slugs are unique, and each intro has a scene in the stage', () => {
  const ids = ALL_INTROS.map((i) => i.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(ALL_INTROS.map((i) => i.solutionSlug)).size, ids.length)
  const stage = read('../src/components/video/ModuleIntroStage.jsx')
  const cfg = read('../src/components/video/intros/introConfigs.js')
  for (const id of ids) assert.ok(stage.includes(`'${id}':`) || cfg.includes(`'${id}':`), `${id} has no scene`)
})

test('scenes are contiguous, start at 0 and end at the duration', () => {
  for (const intro of ALL_INTROS) {
    assert.equal(intro.scenes[0].start, 0, intro.id)
    assert.equal(intro.scenes.at(-1).end, intro.duration, intro.id)
    for (let i = 1; i < intro.scenes.length; i += 1) assert.equal(intro.scenes[i].start, intro.scenes[i - 1].end, `${intro.id} scene ${i}`)
    for (const scene of intro.scenes) {
      assert.ok(scene.end > scene.start, `${intro.id}/${scene.id}`)
      assert.ok(scene.title && scene.caption.length > 20, `${intro.id}/${scene.id}`)
      assert.ok(scene.end - scene.start >= 3.5, `${intro.id}/${scene.id} is too short to read`)
    }
    assert.ok(intro.posterT > 0 && intro.posterT < intro.duration, intro.id)
    assert.ok(ACCENT[intro.accent], `${intro.id} accent`)
    assert.ok(intro.duration >= 20 && intro.duration <= 45, `${intro.id} duration`)
  }
})

test('each intro points at a real product page', () => {
  for (const intro of ALL_INTROS) {
    assert.ok(seoMetadata[intro.path], `${intro.path} is a page`)
    assert.equal(introForSlug(intro.solutionSlug), intro)
  }
})

test('rendered files exist and stay light', () => {
  for (const intro of ALL_INTROS) {
    for (const [kind, path] of Object.entries(introFiles(intro.id))) {
      assert.ok(existsSync(pub(path)), `${path} is missing`)
      const kb = statSync(pub(path)).size / 1024
      assert.ok(kb > 20, `${path} looks empty`)
      assert.ok(kb < (kind === 'poster' ? 400 : 9000), `${path} is ${Math.round(kb)} KB`)
    }
  }
})

test('VideoObject schema matches the files', () => {
  for (const intro of ALL_INTROS) {
    const schema = introSchema(intro)
    const files = introFiles(intro.id)
    assert.equal(schema['@type'], 'VideoObject')
    assert.equal(schema.duration, `PT${intro.duration}S`)
    assert.equal(schema.width, MODULE_INTRO.width)
    assert.equal(schema.contentUrl, `https://nexorasolution.online${files.mp4}`)
    assert.equal(schema.thumbnailUrl, `https://nexorasolution.online${files.poster}`)
    assert.equal(schema['@id'], `https://nexorasolution.online${intro.path}/#intro-video`)
  }
})

test('the section is on the solution page and the capture route is hidden', () => {
  assert.match(read('../src/pages/public/SolutionPage.jsx'), /<ModuleIntroSection key=\{solutionSlug\} solutionSlug=\{solutionSlug\} \/>/)
  assert.match(read('../src/AppRouter.jsx'), new RegExp(`path="${MODULE_INTRO_CAPTURE_PATH}"`))
  assert.match(read('../src/lib/promoPopupRoutes.js'), new RegExp(MODULE_INTRO_CAPTURE_PATH))
  assert.match(read('../src/pages/public/ModuleIntroCapture.jsx'), /noindex,nofollow/)
  assert.ok(!existsSync(new URL('../public/module-intro-capture', import.meta.url)))
  assert.ok(!read('../scripts/generate-sitemap.mjs').includes('module-intro-capture'))
})

test('the player is silent, lazy and accessible, and the page says it is an illustration', () => {
  const section = read('../src/components/video/ModuleIntroSection.jsx')
  for (const needle of ['muted', 'playsInline', 'preload="none"', 'poster=', 'aria-label', 'sr-only', 'type="button"', 'sample data', 'loop', 'IntersectionObserver', 'prefers-reduced-motion']) assert.ok(section.toLowerCase().includes(needle.toLowerCase()), needle)
  assert.ok(!section.includes('autoPlay'), 'autoplay is done by the observer, only while visible and muted')
})
