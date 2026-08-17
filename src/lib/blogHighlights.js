/**
 * AI Smart Highlight Engine.
 *
 * After DeepSeek completes translation for a language, this module runs
 * a second AI analysis pass to extract important keywords, concepts,
 * product names, and features from the translated content.
 *
 * Each extracted highlight receives:
 *   - id, text, category, importance (0-100), explanation, internalLink, color
 *
 * Only highlights with importance > 80 are stored.
 *
 * Uses the same AI Gateway (DeepSeek) and fetch infrastructure as blogTranslate.js.
 */

import { resolveInternalLink } from './blogInternalLinks.js'

const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const HIGHLIGHT_TIMEOUT_MS = 20000
const HIGHLIGHT_RETRIES = 2

/* ── Category color palette ────────────────────────────────────────────── */

const CATEGORY_COLORS = {
  product:    'linear-gradient(135deg, #667eea, #764ba2)',
  feature:    'linear-gradient(135deg, #f093fb, #f5576c)',
  ai:         'linear-gradient(135deg, #4facfe, #00f2fe)',
  finance:    'linear-gradient(135deg, #43e97b, #38f9d7)',
  analytics:  'linear-gradient(135deg, #fa709a, #fee140)',
  security:   'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  automation: 'linear-gradient(135deg, #fccb90, #d57eeb)',
}

/* ── Logging ────────────────────────────────────────────────────────────── */

function hlog(step, msg, data) {
  const ts = new Date().toISOString().slice(11, 23)
  if (data !== undefined) console.log(`[AI Highlights] ${ts} STEP ${step}: ${msg}`, data)
  else console.log(`[AI Highlights] ${ts} STEP ${step}: ${msg}`)
}

function herr(step, msg, err) {
  const ts = new Date().toISOString().slice(11, 23)
  console.error(`[AI Highlights] ${ts} STEP ${step} FAILED: ${msg}`, err?.message || err)
}

/* ── Fetch helpers ──────────────────────────────────────────────────────── */

async function fetchWithTimeout(url, ms, init = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  finally { clearTimeout(timer) }
}

/* ── Prompt builder ─────────────────────────────────────────────────────── */

const AVAILABLE_ROUTES = [
  '/restaurant-pos', '/retail-pos', '/school-erp', '/whatsapp-crm',
  '/solutions/crm', '/solutions/inventory-management', '/restaurant-pos',
  '/solutions/medical-store-pos', '/solutions/property-erp',
  '/solutions/email-marketing', '/solutions/reports-analytics',
  '/solutions/team-permissions', '/transport', '/pricing', '/contact',
]

function buildHighlightsPrompt(articleSummary, langCode) {
  const langLabel = {
    en: 'English', 'ur-roman': 'Roman Urdu', hi: 'Hindi', ar: 'Arabic', bn: 'Bengali',
  }[langCode] || langCode

  return `You are an AI content analyst. Analyze this ${langLabel} blog article and extract the most important keywords, concepts, product names, features, and business terms.

Article content:
${articleSummary}

Instructions:
1. Identify 8-15 important terms/concepts from the article.
2. Each term must be a short phrase (1-4 words) that appears VERBATIM in the article text.
3. Assign each term a category: product, feature, ai, finance, analytics, security, or automation.
4. Assign an importance score (0-100). Only include terms with importance ABOVE 80.
5. Provide a 1-sentence explanation of why this term matters to the reader.
6. If the term matches one of these routes, set internalLink to the matching path. Otherwise set it to null.
Available routes: ${AVAILABLE_ROUTES.join(', ')}

Return ONLY valid JSON — no markdown, no code fences, no extra text:
[
  {
    "id": "h1",
    "text": "Inventory Management",
    "category": "feature",
    "importance": 95,
    "explanation": "Real-time stock tracking prevents shortages and over-ordering.",
    "internalLink": "/solutions/inventory-management",
    "color": "linear-gradient(135deg, #f093fb, #f5576c)"
  }
]

Color palette per category:
- product: linear-gradient(135deg, #667eea, #764ba2)
- feature: linear-gradient(135deg, #f093fb, #f5576c)
- ai: linear-gradient(135deg, #4facfe, #00f2fe)
- finance: linear-gradient(135deg, #43e97b, #38f9d7)
- analytics: linear-gradient(135deg, #fa709a, #fee140)
- security: linear-gradient(135deg, #a18cd1, #fbc2eb)
- automation: linear-gradient(135deg, #fccb90, #d57eeb)`
}

/* ── JSON parser ────────────────────────────────────────────────────────── */

function parseHighlightsResponse(rawText) {
  if (!rawText || !String(rawText).trim()) return []

  let text = String(rawText).trim()

  // Strip ```json fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) text = fenceMatch[1].trim()

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed && Array.isArray(parsed.highlights)) return parsed.highlights
    if (parsed && Array.isArray(parsed.keywords)) return parsed.keywords
    return []
  } catch {
    // Try to extract JSON array from the text
    const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (arrMatch) {
      try { const parsed = JSON.parse(arrMatch[0]); if (Array.isArray(parsed)) return parsed }
      catch { /* last resort */ }
    }
    return []
  }
}

/* ── Filter & normalize ─────────────────────────────────────────────────── */

function filterByImportance(highlights, threshold = 80) {
  return (highlights || []).filter((h) => {
    const importance = Number(h.importance || 0)
    return importance > threshold
  })
}

function normalizeHighlights(highlights) {
  return (highlights || []).map((h, i) => ({
    id: h.id || `ai-h${i + 1}`,
    text: String(h.text || '').trim(),
    category: String(h.category || 'feature').toLowerCase(),
    importance: Math.min(100, Math.max(0, Number(h.importance || 85))),
    explanation: String(h.explanation || '').trim(),
    internalLink: h.internalLink && String(h.internalLink).startsWith('/') ? String(h.internalLink) : null,
    color: CATEGORY_COLORS[h.category] || CATEGORY_COLORS.feature,
  })).filter((h) => h.text.length > 1)
}

/* ── Build article summary for the AI ───────────────────────────────────── */

function buildArticleSummary(translation) {
  const parts = []
  if (translation.title) parts.push(`Title: ${translation.title}`)
  if (translation.excerpt) parts.push(`Summary: ${translation.excerpt}`)
  if (translation.sections) {
    for (const section of translation.sections) {
      if (section.heading) parts.push(`\n## ${section.heading}`)
      if (section.paragraphs) {
        for (const p of section.paragraphs) {
          if (p) parts.push(String(p).slice(0, 500)) // truncate long paragraphs
        }
      }
    }
  }
  return parts.join('\n').slice(0, 6000) // keep under AI token limit
}

/* ── Main: extract highlights for one language ──────────────────────────── */

export async function extractHighlightsFromTranslation(slug, langCode, translation) {
  if (!translation) return []
  const summary = buildArticleSummary(translation)
  if (!summary || summary.length < 100) {
    hlog(7, `Skipping highlight extraction — content too short [${langCode}] slug:${slug}`)
    return []
  }

  const prompt = buildHighlightsPrompt(summary, langCode)
  let lastErr = null

  for (let attempt = 0; attempt <= HIGHLIGHT_RETRIES; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt))

      const res = await fetchWithTimeout(`${AI_GATEWAY_URL}/chat`, HIGHLIGHT_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
        }),
      })

      if (!res.ok) throw new Error(`AI Gateway HTTP ${res.status}`)
      const data = await res.json()
      const rawText = data.text || ''
      const parsed = parseHighlightsResponse(rawText)
      const filtered = filterByImportance(parsed, 80)
      const normalized = normalizeHighlights(filtered)

      hlog(8, `Highlight analysis complete [${langCode}] slug:${slug}`, { extracted: normalized.length })
      return normalized
    } catch (err) {
      lastErr = err
      herr(7, `Highlight attempt ${attempt + 1}/${HIGHLIGHT_RETRIES + 1} failed [${langCode}] slug:${slug}`, err)
      if (err?.name === 'AbortError') break
    }
  }

  herr(8, `All highlight attempts failed [${langCode}] slug:${slug} — returning empty`, lastErr)
  return []
}

/* ── Orchestrator: extract highlights for all languages ─────────────────── */

export async function analyzeAndEnhanceAllHighlights(slug, translations) {
  if (!slug || !translations) return translations

  hlog(7, `Highlight analysis started slug:${slug}`)

  const enhanced = { ...translations }

  for (const [langCode, translation] of Object.entries(translations)) {
    if (langCode === 'en') {
      // English already has ==highlight== markers from authoring
      if (!translation.aiHighlights) translation.aiHighlights = []
      continue
    }
    if (!translation || translation.translationStatus !== 'completed') continue

    try {
      const highlights = await extractHighlightsFromTranslation(slug, langCode, translation)
      enhanced[langCode] = {
        ...translation,
        aiHighlights: highlights,
      }
    } catch (err) {
      herr(9, `Failed to enhance highlights for [${langCode}] slug:${slug}`, err)
      // Keep existing translation without highlights
    }
  }

  hlog(9, `Highlights saved to memory slug:${slug}`)
  return enhanced
}
