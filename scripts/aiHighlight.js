/**
 * Nexora AI — Article Highlighting Engine
 *
 * Usage: node scripts/aiHighlight.js [--dry-run] [--force]
 *
 * Two modes:
 *   1. Nexora AI Gateway (DeepSeek) — advanced semantic understanding, always branded "Nexora AI"
 *   2. Built-in NLP (always works, no API key) — fast, offline, immediate fallback
 *
 * Output: src/lib/blogData.highlighted.js
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Env loader ──
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}
loadEnvFile(join(ROOT, '.env'))
loadEnvFile(join(ROOT, '.env.production'))
loadEnvFile(join(ROOT, '.env.local'))

const AI_GATEWAY_URL = process.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const isDryRun = process.argv.includes('--dry-run')
const isForce = process.argv.includes('--force')
const isDebug = process.argv.includes('--debug')

function log(...args) { console.log('[Nexora AI]', ...args) }

// ═══════════════════════════════════════════════════════════════════════════
//  BUILT-IN NLP HIGHLIGHTER (no API key needed)
// ═══════════════════════════════════════════════════════════════════════════

const BUSINESS_TERMS = [
  'POS', 'CRM', 'ERP', 'KOT', 'SKU', 'API', 'UI', 'UX', 'BOGO',
  'inventory management', 'point of sale', 'real-time', 'cloud-based',
  'dashboard', 'analytics', 'reporting', 'payment gateway', 'ledger',
  'multi-currency', 'role-based access', 'data encryption', 'scalable',
  'subscription', 'billing', 'invoice', 'attendance', 'payroll',
  'fee management', 'table management', 'kitchen display', 'waitlist',
  'delivery zone', 'fleet management', 'loyalty program', 'discount engine',
  'Restaurant POS', 'Retail POS', 'School ERP', 'Property ERP',
  'WhatsApp CRM', 'Medical Store POS', 'Transport Management',
  'Nexora', 'Nexora Solution', 'Pakistan',
]

const STRONG_KEYWORDS = /\b(best|leading|fastest|top|ultimate|complete|powerful|advanced|modern|smart|intelligent|seamless|unified|comprehensive|essential|critical|crucial|revolutionary|innovative)\b/gi

const NUMBER_PATTERNS = [
  /\b\d+%\b/g,                          // 25%
  /\b(PKR|Rs|USD|EUR)\s*[\d,]+\b/gi,   // PKR 5,000
  /\b\d+\s*(days?|hours?|minutes?|months?|years?)\b/gi, // 7 days
  /\b\d+\s*[-–]\s*\d+\b/g,             // 10-15
  /\bover\s+\d[\d,]*\b/gi,              // over 500
]

const IMPORTANT_PATTERNS = [
  // First sentence of paragraph often contains key point
  /^[^.!?]+[.!?]/,
]

function builtInHighlight(paragraph) {
  if (!paragraph || paragraph.length < 30) return paragraph

  const phrases = new Set()

  // 1. Business terms (longest first)
  const sortedTerms = [...BUSINESS_TERMS].sort((a, b) => b.length - a.length)
  for (const term of sortedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<![=>\\w])(${escaped})(?![=<\\w])`, 'gi')
    const match = paragraph.match(regex)
    if (match) match.forEach((m) => phrases.add(m))
  }

  // 2. Number patterns
  for (const pattern of NUMBER_PATTERNS) {
    const match = paragraph.match(pattern)
    if (match) match.forEach((m) => phrases.add(m.trim()))
  }

  // 3. Strong keyword phrases (capture surrounding context)
  let kwMatch
  while ((kwMatch = STRONG_KEYWORDS.exec(paragraph)) !== null) {
    // Grab 2-3 words around the keyword
    const idx = kwMatch.index
    const before = paragraph.slice(Math.max(0, idx - 30), idx).split(/\s+/).slice(-2).join(' ')
    const after = paragraph.slice(idx + kwMatch[0].length, idx + kwMatch[0].length + 40).split(/\s+/).slice(0, 3).join(' ')
    const phrase = [before, kwMatch[0], after].filter(Boolean).join(' ')
    if (phrase.length > 5 && phrase.length < 80) phrases.add(phrase.trim())
  }

  // 4. First sentence of paragraph (key point)
  const firstSentence = paragraph.match(/^[^.!?]+[.!?]/)
  if (firstSentence && firstSentence[0].length > 20 && firstSentence[0].length < 150) {
    // Extract the most important part (middle portion of first sentence)
    const words = firstSentence[0].split(/\s+/)
    if (words.length > 6) {
      const midStart = Math.floor(words.length * 0.2)
      const midEnd = Math.floor(words.length * 0.8)
      const core = words.slice(midStart, midEnd).join(' ')
      if (core.length > 15) phrases.add(core)
    }
  }

  return applyHighlights(paragraph, [...phrases])
}

function applyHighlights(paragraph, keyPhrases) {
  let result = paragraph
  const sorted = [...keyPhrases].sort((a, b) => b.length - a.length)
  const highlighted = new Set()

  for (const phrase of sorted) {
    if (highlighted.has(phrase.toLowerCase()) || phrase.length < 3) continue
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Don't highlight if already inside ==markers==
    if (new RegExp(`==[^=]*${escaped}[^=]*==`, 'gi').test(result)) continue
    const regex = new RegExp(`(?<!=)(${escaped})(?!=)`, 'g')
    result = result.replace(regex, '==$1==')
    highlighted.add(phrase.toLowerCase())
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════
//  NEXORA AI HIGHLIGHTER (DeepSeek via AI Gateway)
//  Branded "Nexora AI" — backend uses DeepSeek, frontend shows Nexora AI
//  Batches paragraphs for speed (1 API call per article, not per paragraph)
// ═══════════════════════════════════════════════════════════════════════════

async function nexoraAiHighlightBatch(paragraphs, articleContext = '') {
  // Only process paragraphs that need highlighting
  const candidates = paragraphs
    .map((p, i) => ({ text: p, index: i }))
    .filter(({ text }) => text.length >= 30 && !/==[^=]+==/.test(text))

  if (candidates.length === 0) return {}

  // Split into smaller batches (6 paragraphs each) to avoid overflowing context window
  const BATCH_SIZE = 6
  const allResults = {}

  for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
    const batch = candidates.slice(batchStart, batchStart + BATCH_SIZE)

    const prompt = `You are Nexora AI. For each paragraph below, identify 2-4 KEY business phrases. Focus on: business terms (POS, CRM, ERP), numbers/prices, unique features, critical warnings.

Article: ${articleContext || 'Business software'}

${batch.map(({ text }, i) => `[P${i}] ${text.slice(0, 350)}`).join('\n\n')}

Return ONLY a JSON object like {"0":["phrase1","phrase2"],"1":["phrase3"]}. No other text.`

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000)
      const res = await fetch(`${AI_GATEWAY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 600,
          provider: 'deepseek',
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const data = await res.json()
      const text = data?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) continue
      const result = JSON.parse(match[0])
      for (const [key, phrases] of Object.entries(result)) {
        const candidateIdx = parseInt(key, 10)
        if (!isNaN(candidateIdx) && candidateIdx < batch.length) {
          allResults[batch[candidateIdx].index] = phrases
        }
      }
    } catch {
      // Silently continue to next batch
    }

    // Small delay between batches to respect rate limits
    if (batchStart + BATCH_SIZE < candidates.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return Object.keys(allResults).length > 0 ? allResults : null
}

// ═══════════════════════════════════════════════════════════════════════════
//  GEMINI FALLBACK (kept for backward compatibility if key exists)
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

async function geminiHighlight(paragraph, articleContext = '') {
  if (!GEMINI_API_KEY) return null

  const prompt = `You are Nexora AI, a content editor. Identify 2-4 KEY phrases in this paragraph that readers should notice. Focus on: business terms, numbers, unique features, critical warnings, or action items.

Return ONLY a JSON array of exact phrases from the text. No other text.

Article: ${articleContext || 'Business software'}
Paragraph: "${paragraph.slice(0, 600)}"

Key phrases (JSON array):`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 200 },
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return null
    const phrases = JSON.parse(match[0])
    return Array.isArray(phrases) ? phrases.filter((p) => typeof p === 'string' && p.length > 2) : null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

async function processArticle(article, index, total, useAi) {
  const context = `${article.category || 'Business'} — ${article.title || ''}`
  const sections = article.sections || []
  let aiCount = 0
  let builtinCount = 0

  // Collect all paragraphs first
  const allParagraphs = []
  for (const section of sections) {
    const paragraphs = section.paragraphs || []
    allParagraphs.push(...paragraphs)
  }

  // Try batch AI highlighting (1 API call for entire article)
  let aiPhrases = null
  if (useAi) {
    aiPhrases = await nexoraAiHighlightBatch(allParagraphs, context)
    if (aiPhrases && Object.keys(aiPhrases).length > 0) {
      if (isDebug) log(`  🤖 Nexora AI batch: "${article.title}" → ${Object.keys(aiPhrases).length} paragraphs highlighted`)
    }
  }

  // Apply highlights to each paragraph
  let paraIdx = 0
  for (const section of sections) {
    const paragraphs = section.paragraphs || []
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]
      if (!isForce && /==[^=]+==/.test(p)) { paraIdx++; continue } // Already highlighted
      if (p.length < 30) { paraIdx++; continue } // Too short

      let highlighted = false

      // Use AI batch results
      if (aiPhrases && aiPhrases[paraIdx] && Array.isArray(aiPhrases[paraIdx]) && aiPhrases[paraIdx].length > 0) {
        paragraphs[i] = applyHighlights(p, aiPhrases[paraIdx])
        aiCount++
        highlighted = true
      }

      if (!highlighted) {
        paragraphs[i] = builtInHighlight(p)
        builtinCount++
      }
      paraIdx++
    }
  }

  const mode = aiCount > 0 ? `🤖 Nexora AI: ${aiCount} | 📊 NLP: ${builtinCount}` : `📊 NLP: ${builtinCount}`
  log(`[${index + 1}/${total}] "${article.title}" — ${mode}`)
  return article
}

async function main() {
  log('═══════════════════════════════════════════')
  log('        Nexora AI — Article Highlighter')
  log('═══════════════════════════════════════════')
  log(`AI Gateway: ${AI_GATEWAY_URL}`)
  log(`Mode: ${isDryRun ? '🔍 DRY RUN' : isForce ? '🔄 FORCE (re-highlight all)' : '📝 Incremental (skip already highlighted)'}`)
  log(`Backend: DeepSeek (branded as Nexora AI)`)
  log(`Fallback: ${GEMINI_API_KEY ? '✅ Gemini ready' : '📊 Built-in NLP only (Gemini key not set)'}`)
  log('')

  // Load articles
  let blogModule
  try {
    blogModule = await import(join(ROOT, 'src', 'lib', 'blogData.js'))
  } catch (err) {
    log('❌ Could not load blogData.js:', err.message)
    process.exit(1)
  }

  const articles = blogModule.blogArticles || []
  if (!articles.length) { log('No articles found.'); return }

  log(`📄 ${articles.length} articles loaded`)
  log('')

  const processed = []
  for (let i = 0; i < articles.length; i++) {
    const article = {
      ...articles[i],
      sections: (articles[i].sections || []).map((s) => ({
        ...s,
        paragraphs: [...(s.paragraphs || [])],
      })),
    }
    // Always try Nexora AI (DeepSeek) first — falls back to built-in NLP automatically
    processed.push(await processArticle(article, i, articles.length, true))
  }

  if (isDryRun) {
    log('')
    log('🔍 Dry run complete — no files written.')
    log('   Run without --dry-run to save.')
    return
  }

  // Save highlighted data
  const outPath = join(ROOT, 'src', 'lib', 'blogData.highlighted.js')
  const content = `// Generated by Nexora AI — do not edit manually.
// Run: node scripts/aiHighlight.js --force  to regenerate.
// Source: blogData.js
// Backend: DeepSeek via Nexora AI Gateway

export const blogArticles = ${JSON.stringify(processed, null, 2)};
`
  writeFileSync(outPath, content, 'utf-8')
  log('')
  log(`✅ Saved to src/lib/blogData.highlighted.js`)
  log(`   ${processed.length} articles enhanced by Nexora AI`)
  log('')
  log('Next: npm run build   (prerender will use highlighted data)')
}

main().catch((err) => {
  console.error('[Nexora AI] Fatal:', err)
  process.exit(1)
})
