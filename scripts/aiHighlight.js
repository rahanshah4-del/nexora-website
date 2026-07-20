/**
 * Nexora AI — Article Highlighting Engine
 *
 * Usage: node scripts/aiHighlight.js [--dry-run] [--force]
 *
 * Two modes:
 *   1. Built-in NLP (always works, no API key) — fast, offline, immediate
 *   2. Gemini-enhanced (needs GEMINI_API_KEY) — better semantic understanding
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
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
//  GEMINI ENHANCEMENT (optional, needs API key)
// ═══════════════════════════════════════════════════════════════════════════

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

async function processArticle(article, index, total, useGemini) {
  const context = `${article.category || 'Business'} — ${article.title || ''}`
  const sections = article.sections || []
  let aiCount = 0
  let builtinCount = 0
  let paragraphCount = 0

  for (const section of sections) {
    const paragraphs = section.paragraphs || []
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]
      paragraphCount++
      if (!isForce && /==[^=]+==/.test(p)) continue // Already highlighted
      if (p.length < 30) continue // Too short

      // Try Gemini first, fall back to built-in
      let highlighted = false
      if (useGemini) {
        const phrases = await geminiHighlight(p, context)
        if (phrases && phrases.length > 0) {
          paragraphs[i] = applyHighlights(p, phrases)
          aiCount++
          highlighted = true
          if (isDebug) log(`  🤖 Gemini: "${article.title}" p${i}`)
        }
        // Rate limit
        if (paragraphCount % 12 === 0) await new Promise((r) => setTimeout(r, 5000))
      }

      if (!highlighted) {
        paragraphs[i] = builtInHighlight(p)
        builtinCount++
      }
    }
  }

  const mode = useGemini ? `🤖+📊 ${aiCount}/${builtinCount}` : `📊 ${builtinCount}`
  log(`[${index + 1}/${total}] "${article.title}" — ${mode} phrases highlighted`)
  return article
}

async function main() {
  log('═══════════════════════════════════════════')
  log('        Nexora AI — Article Highlighter')
  log('═══════════════════════════════════════════')
  log(`Gemini API: ${GEMINI_API_KEY ? '✅ Connected (enhanced mode)' : '⚠️  Not set — using built-in NLP only'}`)
  log(`Mode: ${isDryRun ? '🔍 DRY RUN' : isForce ? '🔄 FORCE' : '📝 Incremental'}`)
  if (!GEMINI_API_KEY) {
    log('')
    log('💡 For AI-enhanced quality, get a free key:')
    log('   https://aistudio.google.com/apikey')
    log('   Then add to .env.local: GEMINI_API_KEY=your-key')
  }
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
    processed.push(await processArticle(article, i, articles.length, Boolean(GEMINI_API_KEY)))
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
