import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { doc, getFirestore } from 'firebase/firestore'
import {
  AI_KNOWLEDGE_COLLECTION,
  BLOG_KNOWLEDGE_COLLECTION_PATH,
  aiKnowledgeIndexPath,
  blogKnowledgeDocPath,
  isValidKnowledgeSlug,
} from '../src/lib/blogKnowledgePaths.js'

// Firestore document references need an EVEN number of segments. The per-post
// knowledge doc used to be built as doc(db, 'aiKnowledge', 'blogs', slug) — three
// segments — so every read and write threw and the whole ingestion pipeline
// (per-post doc, global index, AI Gateway KV sync) silently did nothing.
// These tests pin the segment parity so that cannot come back.

// initializeApp/getFirestore/doc are entirely local: no network, no credentials.
const db = getFirestore(initializeApp({ projectId: 'nexora-business-suite' }, 'blog-knowledge-paths-test'))

test('every knowledge path has an even number of segments', () => {
  for (const path of [aiKnowledgeIndexPath(), blogKnowledgeDocPath('my-slug')]) {
    assert.equal(path.length % 2, 0, `${path.join('/')} has ${path.length} segments`)
  }
  // A collection path is the odd-length counterpart.
  assert.equal(BLOG_KNOWLEDGE_COLLECTION_PATH.length % 2, 1)
})

test('the real Firestore SDK accepts the built paths', () => {
  assert.equal(doc(db, ...aiKnowledgeIndexPath()).path, 'aiKnowledge/index')
  assert.equal(doc(db, ...blogKnowledgeDocPath('my-slug')).path, 'aiKnowledge/blogs/items/my-slug')
})

test('the old three-segment path is what the SDK rejects', () => {
  assert.throws(
    () => doc(db, AI_KNOWLEDGE_COLLECTION, 'blogs', 'my-slug'),
    /even number of segments/,
  )
})

test('slugs that would change the segment count are rejected', () => {
  for (const bad of ['', 'a/b', '/', '.', '..', '__proto__', null, undefined, 42, {}]) {
    assert.equal(isValidKnowledgeSlug(bad), false, `${JSON.stringify(bad)} should be invalid`)
    assert.throws(() => blogKnowledgeDocPath(bad), /Invalid blog knowledge slug/)
  }
  for (const good of ['my-slug', 'pos-software-2026', 'a']) {
    assert.equal(isValidKnowledgeSlug(good), true, good)
    assert.equal(blogKnowledgeDocPath(good).length % 2, 0)
  }
})

test('blogKnowledge.js builds no Firestore path of its own', () => {
  const src = readFileSync(new URL('../src/lib/blogKnowledge.js', import.meta.url), 'utf8')
  const code = src.replace(/^\s*(\/\/.*|\*.*|\/\*.*)$/gm, '')
  assert.equal(
    /['"]aiKnowledge['"]/.test(code),
    false,
    'blogKnowledge.js must take every path from blogKnowledgePaths.js, not hardcode aiKnowledge segments',
  )
})
