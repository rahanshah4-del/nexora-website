import test from 'node:test'
import assert from 'node:assert/strict'
import { pickBlogPosts, getToolBlogTopics, SOLUTION_BLOG_TOPICS } from '../src/lib/relatedBlog.js'
import { blogCategories } from '../src/lib/blogData.js'

test('restaurant posts come first for the restaurant module', () => {
  const posts = pickBlogPosts(SOLUTION_BLOG_TOPICS.pos, 3)
  assert.equal(posts.length, 3)
  assert.equal(posts[0].category, 'Restaurant POS')
  assert.equal(posts[1].category, 'Restaurant POS')
})

test('every mapped topic is a real blog category and sections never come up empty', () => {
  for (const cats of [...Object.values(SOLUTION_BLOG_TOPICS), getToolBlogTopics('/tools/temp-mail'), getToolBlogTopics('/tools/x')]) {
    cats.forEach((c) => assert.ok(blogCategories.includes(c), c))
    assert.equal(pickBlogPosts(cats, 3).length, 3)
  }
})
