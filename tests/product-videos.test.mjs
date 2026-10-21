/** Product loop clips: data, files, schema and page wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { ALL_CLIPS, clipFiles, PRODUCT_CAPTURE_PATH, PRODUCT_CLIP, PRODUCT_VIDEOS, productVideoSchemas } from '../src/lib/productVideos.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const pub = (p) => new URL(`../public${p}`, import.meta.url)

test('clip ids are unique and each has a scene in the stage', () => {
  const ids = ALL_CLIPS.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
  const stage = read('../src/components/product/ProductClipStage.jsx')
  for (const id of ids) assert.ok(stage.includes(`'${id}':`), `${id} has no scene`)
})

test('every clip has three steps that start at 0 and rise inside the duration', () => {
  for (const clip of ALL_CLIPS) {
    assert.equal(clip.steps.length, 3, clip.id)
    assert.equal(clip.steps[0].at, 0, clip.id)
    for (let i = 1; i < clip.steps.length; i += 1) assert.ok(clip.steps[i].at > clip.steps[i - 1].at, clip.id)
    assert.ok(clip.steps.at(-1).at < PRODUCT_CLIP.duration - 2, `${clip.id} last step starts too late`)
    assert.ok(clip.title.length >= 10 && clip.description.length > 40, clip.id)
    for (const s of clip.steps) assert.ok(s.title && s.text, clip.id)
  }
  assert.ok(PRODUCT_CLIP.posterT > 0 && PRODUCT_CLIP.posterT < PRODUCT_CLIP.duration)
})

test('each product points at a real page and the clips are rendered and light', () => {
  for (const group of Object.values(PRODUCT_VIDEOS)) {
    assert.ok(seoMetadata[group.path], `${group.path} is a page`)
    for (const clip of group.clips) {
      const files = clipFiles(clip.id)
      for (const [kind, path] of Object.entries(files)) {
        assert.ok(existsSync(pub(path)), `${path} is missing`)
        const kb = statSync(pub(path)).size / 1024
        assert.ok(kb > 5, `${path} looks empty`)
        assert.ok(kb < (kind === 'poster' ? 250 : 1500), `${path} is ${Math.round(kb)} KB`)
      }
    }
  }
})

test('VideoObject schema matches the files', () => {
  for (const [slug, group] of Object.entries(PRODUCT_VIDEOS)) {
    const schemas = productVideoSchemas(slug)
    assert.equal(schemas.length, group.clips.length)
    for (const [i, schema] of schemas.entries()) {
      const files = clipFiles(group.clips[i].id)
      assert.equal(schema['@type'], 'VideoObject')
      assert.equal(schema.duration, `PT${PRODUCT_CLIP.duration}S`)
      assert.equal(schema.contentUrl, `https://nexorasolution.us${files.mp4}`)
      assert.equal(schema.thumbnailUrl, `https://nexorasolution.us${files.poster}`)
      assert.match(schema['@id'], new RegExp(`^https://nexorasolution.us${group.path}/#video-`))
    }
  }
})

test('the section is on the solution page and the capture route is hidden', () => {
  assert.match(read('../src/pages/public/SolutionPage.jsx'), /<ProductVideoSection solutionSlug=\{solutionSlug\} \/>/)
  assert.match(read('../src/AppRouter.jsx'), new RegExp(`path="${PRODUCT_CAPTURE_PATH}"`))
  assert.match(read('../src/lib/promoPopupRoutes.js'), new RegExp(PRODUCT_CAPTURE_PATH))
  assert.match(read('../src/pages/public/ProductClipCapture.jsx'), /noindex,nofollow/)
  const video = read('../src/components/product/ProductLoopVideo.jsx')
  for (const needle of ['muted', 'loop', 'playsInline', 'preload="none"', 'poster=', 'IntersectionObserver', 'prefers-reduced-motion']) assert.ok(video.includes(needle), needle)
})

test('the page copy says these are illustrations with sample data', () => {
  assert.match(read('../src/components/product/ProductVideoSection.jsx'), /sample data/i)
})
