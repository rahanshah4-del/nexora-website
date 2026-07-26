/**
 * AI Blog Knowledge Ingestion Engine v1.
 *
 * After every blog publish/republish, this module:
 *   1. Reads the full blog content
 *   2. Calls AI Gateway to extract structured knowledge
 *   3. Saves knowledge to Firestore (aiKnowledge/blogs/{slug})
 *   4. Updates the global AI search index (aiKnowledge/index)
 *
 * The AI Gateway can then search this knowledge to answer
 * user questions with up-to-date blog content.
 */

const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const INGEST_TIMEOUT_MS = 25000
const INGEST_RETRIES = 2

/* ── Logging ────────────────────────────────────────────────────────────── */

function klog(step, msg, data) {
  const ts = new Date().toISOString().slice(11, 23)
  if (data !== undefined) console.log(`[Blog Knowledge] ${ts} STEP ${step}: ${msg}`, data)
  else console.log(`[Blog Knowledge] ${ts} STEP ${step}: ${msg}`)
}

function kerr(step, msg, err) {
  const ts = new Date().toISOString().slice(11, 23)
  console.error(`[Blog Knowledge] ${ts} STEP ${step} FAILED: ${msg}`, err?.message || err)
}

/* ── Fetch helper ───────────────────────────────────────────────────────── */

async function fetchWithTimeout(url, ms, init = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  finally { clearTimeout(timer) }
}

/* ── Build the blog summary for AI ingestion ────────────────────────────── */

function buildBlogSummary(article) {
  const parts = []
  if (article.title) parts.push(`Title: ${article.title}`)
  if (article.slug) parts.push(`Slug: ${article.slug}`)
  if (article.category) parts.push(`Category: ${article.category}`)
  if (article.excerpt || article.metaDescription) parts.push(`Summary: ${article.excerpt || article.metaDescription}`)
  if (article.tags?.length) parts.push(`Tags: ${article.tags.join(', ')}`)

  if (article.sections) {
    parts.push('\n--- ARTICLE CONTENT ---')
    for (const section of article.sections) {
      if (section.heading) parts.push(`\n## ${section.heading}`)
      if (section.paragraphs) {
        for (const p of section.paragraphs) {
          if (p) parts.push(String(p).slice(0, 600))
        }
      }
    }
  }

  if (article.faqs?.length) {
    parts.push('\n--- FAQs ---')
    for (const [q, a] of article.faqs) {
      parts.push(`Q: ${q}\nA: ${a}`)
    }
  }

  return parts.join('\n').slice(0, 8000)
}

/* ── Build ingestion prompt ─────────────────────────────────────────────── */

function buildIngestionPrompt(blogSummary) {
  return `You are a knowledge extraction AI for Nexora Solution (nexorasolution.online) — a Pakistani business software company.

Analyze this blog article and extract structured knowledge. Return ONLY valid JSON — no markdown, no code fences, no extra text.

Blog Content:
${blogSummary}

Extract and return this exact JSON structure:
{
  "slug": "article-slug",
  "title": "Article Title",
  "summary": "2-3 sentence summary of what this article teaches",
  "majorTopics": ["topic1", "topic2", "topic3"],
  "features": ["Feature mentioned in article", "..."],
  "aiFeatures": ["AI capability mentioned", "..."],
  "products": ["Product name mentioned", "..."],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "industries": ["Industry mentioned", "..."],
  "benefits": ["Benefit described", "..."],
  "useCases": ["Use case described", "..."],
  "faqs": [{"question": "Q?", "answer": "A."}],
  "internalLinks": [{"text": "Restaurant POS", "url": "/restaurant-pos"}],
  "callToAction": "Main CTA from the article (e.g., Start Free Trial, Book Demo)",
  "readingTime": "X min read",
  "publishDate": "YYYY-MM-DD"
}

Rules:
- Extract ONLY what is explicitly mentioned in the article. Do not invent.
- If a field has no matches, return an empty array [].
- For internalLinks, only include links to Nexora pages mentioned in the article.
- Keep summaries and FAQs in English.`
}

/* ── Parse AI response to knowledge object ──────────────────────────────── */

function parseKnowledgeResponse(rawText, article) {
  if (!rawText) return null
  let text = String(rawText).trim()

  // Strip fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) text = fenceMatch[1].trim()

  try {
    const parsed = JSON.parse(text)
    return normalizeKnowledge(parsed, article)
  } catch {
    // Try extracting JSON object
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0])
        return normalizeKnowledge(parsed, article)
      } catch { /* fail */ }
    }
  }
  return null
}

function normalizeKnowledge(raw, article) {
  return {
    slug: raw.slug || article.slug || '',
    title: raw.title || article.title || '',
    summary: String(raw.summary || '').trim(),
    majorTopics: (raw.majorTopics || []).filter(Boolean).slice(0, 10),
    features: (raw.features || []).filter(Boolean).slice(0, 20),
    aiFeatures: (raw.aiFeatures || []).filter(Boolean).slice(0, 10),
    products: (raw.products || []).filter(Boolean).slice(0, 10),
    keywords: (raw.keywords || []).filter(Boolean).slice(0, 15),
    industries: (raw.industries || []).filter(Boolean).slice(0, 10),
    benefits: (raw.benefits || []).filter(Boolean).slice(0, 10),
    useCases: (raw.useCases || []).filter(Boolean).slice(0, 10),
    faqs: (raw.faqs || []).filter((f) => f.question && f.answer).slice(0, 10),
    internalLinks: (raw.internalLinks || []).filter((l) => l.text && l.url).slice(0, 10),
    callToAction: String(raw.callToAction || '').trim(),
    readingTime: String(raw.readingTime || '').trim(),
    publishDate: String(raw.publishDate || article.publishDate || '').trim(),
    ingestedAt: new Date().toISOString(),
    version: 1,
  }
}

/* ── Sync to AI Gateway KV (real-time chat awareness) ───────────────────── */

async function syncToAIGateway(slug, knowledge) {
  const syncKey = import.meta.env.VITE_BLOG_SYNC_KEY
  if (!syncKey) {
    klog(3, `Skipping AI Gateway sync — VITE_BLOG_SYNC_KEY not configured`)
    return
  }
  try {
    const res = await fetchWithTimeout(`${AI_GATEWAY_URL}/blog-knowledge/sync`, 10000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Blog-Sync-Key': syncKey,
      },
      body: JSON.stringify({ slug, knowledge }),
    })
    if (res.ok) {
      klog(3, `AI Gateway sync successful [slug: ${slug}]`)
    } else {
      const errData = await res.json().catch(() => ({}))
      kerr(3, `AI Gateway sync failed [slug: ${slug}] — HTTP ${res.status}: ${errData?.error || 'unknown'}`, new Error('Sync failed'))
    }
  } catch (err) {
    kerr(3, `AI Gateway sync error [slug: ${slug}]`, err)
  }
}

/* ── Main: ingest a single blog article ─────────────────────────────────── */

export async function ingestBlogKnowledge(article, { firestoreDb } = {}) {
  if (!article?.slug || !article?.title) {
    kerr(1, 'Missing slug or title for ingestion', new Error('Invalid article'))
    return null
  }

  const slug = article.slug
  klog(1, `Blog ingestion started [slug: ${slug}]`)

  const summary = buildBlogSummary(article)
  if (!summary || summary.length < 100) {
    kerr(1, `Blog content too short for ingestion [slug: ${slug}]`, new Error('Content too short'))
    return null
  }

  const prompt = buildIngestionPrompt(summary)
  let lastErr = null

  for (let attempt = 0; attempt <= INGEST_RETRIES; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt))

      const res = await fetchWithTimeout(`${AI_GATEWAY_URL}/chat`, INGEST_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
        }),
      })

      if (!res.ok) throw new Error(`AI Gateway HTTP ${res.status}`)
      const data = await res.json()
      const knowledge = parseKnowledgeResponse(data.text || '', article)

      if (!knowledge) throw new Error('Failed to parse knowledge from AI response')

      klog(2, `Knowledge extracted [slug: ${slug}]`, {
        topics: knowledge.majorTopics.length,
        features: knowledge.features.length,
        keywords: knowledge.keywords.length,
        faqs: knowledge.faqs.length,
      })

      // Save to Firestore
      await saveKnowledgeToFirestore(slug, knowledge, { firestoreDb })

      // Update global Firestore index
      await updateGlobalIndex(slug, knowledge, { firestoreDb })

      // Push to AI Gateway KV for real-time chat awareness
      await syncToAIGateway(slug, knowledge)

      klog(3, `Blog ingestion complete [slug: ${slug}]`)
      return knowledge
    } catch (err) {
      lastErr = err
      kerr(2, `Ingestion attempt ${attempt + 1}/${INGEST_RETRIES + 1} failed [slug: ${slug}]`, err)
    }
  }

  kerr(3, `All ingestion attempts failed [slug: ${slug}]`, lastErr)
  return null
}

/* ── Firestore: Save knowledge per blog ─────────────────────────────────── */

async function saveKnowledgeToFirestore(slug, knowledge, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return }
  }
  if (!firestoreDb || !slug) return

  const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')

  // Check existing version
  let version = 1
  try {
    const existingSnap = await getDoc(doc(firestoreDb, 'aiKnowledge', 'blogs', slug))
    if (existingSnap.exists()) {
      const existing = existingSnap.data()
      // Don't overwrite manually edited entries
      if (existing.source === 'manual') {
        klog(3, `Skipping save — [slug: ${slug}] is manually edited`)
        return
      }
      version = (existing.version || 0) + 1
    }
  } catch { /* first save */ }

  const payload = {
    ...knowledge,
    version,
    updatedAt: serverTimestamp(),
    source: 'ai-ingestion',
  }

  try {
    await setDoc(doc(firestoreDb, 'aiKnowledge', 'blogs', slug), payload, { merge: true })
    klog(3, `Knowledge saved to Firestore [slug: ${slug}] v${version}`)
  } catch (err) {
    kerr(3, `Firestore save failed [slug: ${slug}]`, err)
    throw err
  }
}

/* ── Firestore: Update global search index ───────────────────────────────── */

async function updateGlobalIndex(slug, knowledge, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return }
  }
  if (!firestoreDb || !slug) return

  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')

  try {
    const indexRef = doc(firestoreDb, 'aiKnowledge', 'index')
    const indexSnap = await getDoc(indexRef)
    const index = indexSnap.exists() ? indexSnap.data() : { topics: {}, blogs: {}, lastUpdated: null }

    // Index by keywords, topics, products, and features
    const allTerms = [
      ...(knowledge.keywords || []),
      ...(knowledge.majorTopics || []),
      ...(knowledge.products || []),
      ...(knowledge.features || []),
    ].map((t) => String(t).toLowerCase().trim()).filter(Boolean)

    const uniqueTerms = [...new Set(allTerms)]

    for (const term of uniqueTerms) {
      if (!index.topics[term]) index.topics[term] = []
      if (!index.topics[term].includes(slug)) {
        index.topics[term].push(slug)
      }
    }

    // Store blog metadata for quick lookup
    index.blogs[slug] = {
      title: knowledge.title,
      summary: knowledge.summary,
      category: knowledge.products?.[0] || '',
      keywords: knowledge.keywords || [],
      publishDate: knowledge.publishDate,
      slug,
    }

    // Keep only latest 100 blogs in index
    const blogSlugs = Object.keys(index.blogs)
    if (blogSlugs.length > 100) {
      const oldest = blogSlugs.sort((a, b) =>
        (index.blogs[a]?.publishDate || '').localeCompare(index.blogs[b]?.publishDate || '')
      ).slice(0, blogSlugs.length - 100)
      for (const oldSlug of oldest) {
        delete index.blogs[oldSlug]
        for (const term of Object.keys(index.topics)) {
          index.topics[term] = index.topics[term].filter((s) => s !== oldSlug)
          if (index.topics[term].length === 0) delete index.topics[term]
        }
      }
    }

    index.lastUpdated = serverTimestamp()

    await setDoc(indexRef, index)
    klog(3, `Global index updated [slug: ${slug}] — ${uniqueTerms.length} terms indexed`)
  } catch (err) {
    kerr(3, `Index update failed [slug: ${slug}]`, err)
  }
}

/* ── Public API: Get latest blogs for AI context ─────────────────────────── */

export async function getLatestBlogsForAI(limit = 3, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return [] }
  }
  if (!firestoreDb) return []

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const indexSnap = await getDoc(doc(firestoreDb, 'aiKnowledge', 'index'))
    if (!indexSnap.exists()) return []

    const index = indexSnap.data()
    const blogs = Object.values(index.blogs || {})
    return blogs
      .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''))
      .slice(0, limit)
  } catch {
    return []
  }
}

/* ── Public API: Search knowledge index ──────────────────────────────────── */

export async function searchBlogKnowledge(query, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return [] }
  }
  if (!firestoreDb || !query) return []

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const indexSnap = await getDoc(doc(firestoreDb, 'aiKnowledge', 'index'))
    if (!indexSnap.exists()) return []

    const index = indexSnap.data()
    const topics = index.topics || {}
    const blogs = index.blogs || {}

    const queryTerms = String(query).toLowerCase().split(/\s+/).filter(Boolean)
    const matchedSlugs = new Set()

    for (const term of queryTerms) {
      // Exact match
      if (topics[term]) topics[term].forEach((s) => matchedSlugs.add(s))
      // Partial match
      for (const [topic, slugs] of Object.entries(topics)) {
        if (topic.includes(term)) slugs.forEach((s) => matchedSlugs.add(s))
      }
    }

    return [...matchedSlugs].map((slug) => blogs[slug]).filter(Boolean).slice(0, 5)
  } catch {
    return []
  }
}
