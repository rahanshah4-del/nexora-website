import test from 'node:test'
import assert from 'node:assert/strict'
import { pickBlogPosts, getToolBlogTopics, SOLUTION_BLOG_TOPICS } from '../src/lib/relatedBlog.js'
import { blogCategories } from '../src/lib/blogData.js'

test('restaurant posts come first for the restaurant module', () => {
  const posts = pickBlogPosts(SOLUTION_BLOG_TOPICS.pos, 3)
  assert.ok(posts.length >= 1)
  posts.forEach((p) => assert.equal(p.category, 'Restaurant POS'))
})

test('every mapped topic is a real blog category', () => {
  for (const cats of [...Object.values(SOLUTION_BLOG_TOPICS), getToolBlogTopics('/tools/thermal-receipt'), getToolBlogTopics('/tools/x')]) {
    cats.forEach((c) => assert.ok(blogCategories.includes(c), c))
  }
})

test('only posts of the wanted categories are returned, never unrelated ones', () => {
  const articles = [
    { slug: 'a', category: 'CRM', publishDate: '2026-01-01' },
    { slug: 'b', category: 'AI', publishDate: '2026-02-01' },
    { slug: 'c', category: 'CRM', publishDate: '2026-03-01' },
  ]
  assert.deepEqual(pickBlogPosts(['CRM'], 3, articles).map((a) => a.slug), ['c', 'a'])
  assert.deepEqual(pickBlogPosts(['Restaurant POS'], 3, articles), [])
  assert.deepEqual(pickBlogPosts([], 3, articles), [])
})

test('the temp-mail tool has no related blog section until an email article exists', () => {
  assert.deepEqual(getToolBlogTopics('/tools/temp-mail'), [])
})
