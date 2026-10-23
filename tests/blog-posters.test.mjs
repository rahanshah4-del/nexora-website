import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { blogArticles, normalizeBlogArticleDoc } from '../src/lib/blogData.js'
import { BLOG_POSTERS, DEFAULT_BLOG_IMAGE, blogImageFor } from '../src/lib/blogPosters.js'

test('no static blog post is left with only the brand logo', () => {
  const bare = blogArticles.filter((a) => a.featuredImage === DEFAULT_BLOG_IMAGE).map((a) => a.slug)
  assert.deepEqual(bare, [])
})

test('every poster file exists, is a 16:9 WebP, and is used by a real post', () => {
  const slugs = new Set(blogArticles.map((a) => a.slug))
  for (const [slug, { src, alt }] of Object.entries(BLOG_POSTERS)) {
    const file = `public${src}`
    assert.ok(existsSync(file), file)
    const buf = readFileSync(file)
    assert.equal(buf.subarray(8, 12).toString(), 'WEBP', file)
    // VP8 (lossy) frame header holds the size: 1920x1080
    const vp8 = buf.indexOf('VP8 ')
    assert.equal(buf.readUInt16LE(vp8 + 14) & 0x3fff, 1920, file)
    assert.equal(buf.readUInt16LE(vp8 + 16) & 0x3fff, 1080, file)
    assert.ok(slugs.has(slug), `${slug} matches a post`)
    assert.ok(alt.length > 10)
  }
})

test('posters never replace an image the post already has', () => {
  assert.equal(blogImageFor('what-is-pos-software', 'https://cdn.example/own.webp', 'Own').src, 'https://cdn.example/own.webp')
  assert.equal(blogImageFor('what-is-pos-software', DEFAULT_BLOG_IMAGE).src, '/blog-posters/what-is-pos-software.webp')
  assert.equal(blogImageFor('unknown-post', '').src, DEFAULT_BLOG_IMAGE)
  const cms = normalizeBlogArticleDoc('what-is-pos-software', { title: 'What Is POS Software?' })
  assert.equal(cms.featuredImage, '/blog-posters/what-is-pos-software.webp')
  const own = normalizeBlogArticleDoc('what-is-pos-software', { title: 'x', featuredImage: 'https://firebasestorage.googleapis.com/v0/b/x/o/a.webp' })
  assert.match(own.featuredImage, /firebasestorage/)
})
