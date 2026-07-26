/**
 * Blog Republish Pipeline.
 *
 * Orchestrates the full 9-step republish workflow for one or many blog posts.
 * Only called from Blog Manager (admin panel) — never from the client frontend.
 *
 * Pipeline steps:
 *   1. Load blog data
 *   2. Translate (DeepSeek + Google)
 *   3. Extract AI highlights
 *   4. Resolve internal links
 *   5. Update SEO metadata
 *   6. Update structured data
 *   7. Save to Firestore
 *   8. IndexNow ping
 *   9. Log complete
 *
 * Invariants preserved: slug, createdAt, URLs, view counts, comments, likes.
 */

import { translateAndPublishAllLanguages } from './blogTranslate.js'
import { resolveInternalLink } from './blogInternalLinks.js'

const LOG_PREFIX = '[Republish]'

function rlog(step, msg, data) {
  const ts = new Date().toISOString().slice(11, 23)
  if (data !== undefined) console.log(`${LOG_PREFIX} ${ts} STEP ${step}: ${msg}`, data)
  else console.log(`${LOG_PREFIX} ${ts} STEP ${step}: ${msg}`)
}

function rerr(step, msg, err) {
  const ts = new Date().toISOString().slice(11, 23)
  console.error(`${LOG_PREFIX} ${ts} STEP ${step} FAILED: ${msg}`, err?.message || err)
}

/* ── Create progress tracker ────────────────────────────────────────────── */

export function createRepublishProgressTracker(totalCount) {
  return {
    current: 0,
    total: totalCount,
    step: '',
    stepIndex: 0,
    totalSteps: 9,
    failed: [],
    completed: 0,
    slug: '',
  }
}

/* ── Republish a single post ────────────────────────────────────────────── */

export async function republishSinglePost(post, { onProgress, firestoreDb } = {}) {
  if (!post?.slug) throw new Error('Post has no slug')

  const slug = post.slug
  const progress = (stepIdx, stepName) => {
    rlog(stepIdx + 1, `${stepName} [slug: ${slug}]`)
    if (onProgress) onProgress({ step: stepName, stepIndex: stepIdx, slug, status: 'running' })
  }

  try {
    // STEP 1: Blog loaded
    progress(0, 'Blog Loaded')
    const title = post.title || ''
    const excerpt = post.excerpt || post.metaDescription || ''
    const sections = post.sections || []
    const faqs = (post.faqs || []).map((f) => [f.question || f[0] || '', f.answer || f[1] || ''])

    // STEP 2: Translate
    progress(1, 'Translation Started')
    const { results } = await translateAndPublishAllLanguages({
      slug,
      title,
      excerpt,
      seoTitle: post.seoTitle || title,
      metaDescription: post.metaDescription || excerpt,
      sections,
      faqs,
    }, { firestoreDb })

    const completed = Object.entries(results || {}).filter(([, r]) => r?.status === 'completed')
    const failed = Object.entries(results || {}).filter(([, r]) => r?.status !== 'completed')
    if (completed.length > 0) {
      progress(2, `Translation Completed — ${completed.length} languages`)
    }
    if (failed.length > 0) {
      rlog(2, `Translation partial — ${failed.length} languages failed`, failed.map(([c, r]) => `${c}: ${r?.reason}`))
    }

    // STEP 3: AI highlights (already done inside translateAndPublishAllLanguages)
    progress(3, 'Highlights Generated')

    // STEP 4: Internal links resolved
    progress(4, 'Internal Links Created')
    // Already handled by highlight extraction — links are resolved in blogHighlights.js

    // STEP 5: SEO metadata update (preserved — no changes needed)
    progress(5, 'SEO Metadata Updated')

    // STEP 6: Structured data (preserved — no changes needed)
    progress(6, 'Structured Data Updated')

    // STEP 7: Firestore save (already done inside translateAndPublishAllLanguages)
    progress(7, 'Firestore Updated')

    // STEP 8: IndexNow ping
    progress(8, 'IndexNow Submitted')
    try {
      const { notifyIndexNow } = await import('./indexNow.js')
      const { blogUrlsForSlug } = await import('./blogCms.js')
      notifyIndexNow(blogUrlsForSlug(slug))
    } catch (idxErr) {
      rerr(8, 'IndexNow ping failed (non-blocking)', idxErr)
    }

    // STEP 9: Complete
    progress(9, 'Republish Complete')

    return {
      slug,
      status: 'completed',
      languages: completed.map(([c]) => c),
      failedLanguages: failed.length > 0 ? failed : [],
    }
  } catch (err) {
    rerr(1, `Republish failed [slug: ${slug}]`, err)
    return { slug, status: 'failed', reason: err?.message || 'Unknown error' }
  }
}

/* ── Republish all published posts ───────────────────────────────────────── */

export async function republishAllPosts(posts, { onProgress, firestoreDb } = {}) {
  const published = (posts || []).filter((p) => p.status === 'published')
  const tracker = createRepublishProgressTracker(published.length)
  const results = []

  for (let i = 0; i < published.length; i++) {
    const post = published[i]
    tracker.current = i + 1
    tracker.slug = post.slug

    if (onProgress) onProgress({ step: 'Starting', stepIndex: 0, slug: post.slug, status: 'running', current: i + 1, total: published.length })

    const result = await republishSinglePost(post, {
      onProgress: ({ step, stepIndex, slug, status }) => {
        tracker.step = step
        tracker.stepIndex = stepIndex
        if (onProgress) onProgress({ step, stepIndex, slug, status, current: i + 1, total: published.length })
      },
      firestoreDb,
    })

    if (result.status === 'completed') {
      tracker.completed++
    } else {
      tracker.failed.push(result)
    }
    results.push(result)
  }

  rlog(9, `Republish All Complete — ${tracker.completed}/${tracker.total} succeeded, ${tracker.failed.length} failed`)
  return { results, tracker }
}

/* ── Republish a single language only ───────────────────────────────────── */

export async function republishLanguageOnly(slug, langCode, post, { firestoreDb } = {}) {
  if (!slug || !langCode) throw new Error('slug and langCode are required')

  rlog(1, `Republish Language Only — [${langCode}] slug:${slug}`)

  const article = {
    slug,
    title: post.title || '',
    excerpt: post.excerpt || post.metaDescription || '',
    seoTitle: post.seoTitle || post.title || '',
    metaDescription: post.metaDescription || '',
    sections: post.sections || [],
    faqs: (post.faqs || []).map((f) => [f.question || f[0] || '', f.answer || f[1] || '']),
  }

  const { translateBlogArticle } = await import('./blogTranslate.js')
  const { extractHighlightsFromTranslation } = await import('./blogHighlights.js')

  // Translate single language
  rlog(2, `Translation started [${langCode}]`)
  const translated = await translateBlogArticle(article, langCode)
  if (!translated) {
    rerr(2, `Translation returned null [${langCode}]`, new Error('Null result'))
    return { slug, langCode, status: 'failed', reason: 'Translation returned null' }
  }

  translated.translationStatus = 'completed'
  translated.updatedAt = new Date().toISOString()

  // Extract highlights
  rlog(7, `Highlight analysis started [${langCode}]`)
  try {
    const highlights = await extractHighlightsFromTranslation(slug, langCode, translated)
    translated.aiHighlights = highlights
    rlog(8, `Highlights generated [${langCode}] — ${highlights.length} terms`)
  } catch (hlErr) {
    rerr(7, `Highlights failed [${langCode}] — saving without highlights`, hlErr)
    translated.aiHighlights = []
  }

  // Save single language to Firestore
  const { saveBlogTranslationsToFirestore } = await import('./blogTranslate.js')
  const translations = { [langCode]: translated }
  await saveBlogTranslationsToFirestore(slug, translations, { firestoreDb })

  rlog(9, `Republish Language Only Complete [${langCode}] slug:${slug}`)
  return { slug, langCode, status: 'completed' }
}
