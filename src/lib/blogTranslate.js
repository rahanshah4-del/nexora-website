/**
 * Client-side blog translation.
 *
 *   English → English (passthrough)
 *   English → Roman Urdu (Nexora AI / DeepSeek)
 *   English → Hindi (Google Translate)
 *   English → Arabic (Google Translate)
 *   English → Bengali (Google Translate)
 *
 * Roman Urdu uses Nexora AI Gateway (DeepSeek) for natural, fluent translation.
 * Other languages use translate.googleapis.com for speed.
 * All translations cached in sessionStorage. SEO unaffected.
 */

export const BLOG_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ur-roman', label: 'Roman Urdu' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
]

const VALID_CODES = new Set(BLOG_LANGUAGES.map((l) => l.code))
const STORAGE_KEY = 'nexora:blog:lang'
const MAX_CHUNK = 2800
const MAX_RETRIES = 2
const FETCH_TIMEOUT_MS = 8000
const AI_GATEWAY_TIMEOUT_MS = 15000
const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'

/* ── Detection ──────────────────────────────────────────────────────────── */

export function detectPreferredBlogLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_CODES.has(stored)) return { lang: stored, auto: false }
  } catch { /* quota */ }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz === 'Asia/Karachi') return { lang: 'ur-roman', auto: true }
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return { lang: 'hi', auto: true }
    if (tz === 'Asia/Dubai' || tz === 'Asia/Riyadh') return { lang: 'ar', auto: true }
    if (tz === 'Asia/Dhaka') return { lang: 'bn', auto: true }
  } catch { /* Intl down */ }

  const langs = (navigator.languages || [navigator.language]).filter(Boolean).map((s) => s.toLowerCase())
  if (langs.some((s) => s.startsWith('ur') || s.endsWith('-pk'))) return { lang: 'ur-roman', auto: true }
  if (langs.some((s) => s.startsWith('hi') || s.endsWith('-in'))) return { lang: 'hi', auto: true }
  if (langs.some((s) => s.startsWith('ar') || /-(ae|sa|eg|qa|kw|bh|om)$/.test(s))) return { lang: 'ar', auto: true }
  if (langs.some((s) => s.startsWith('bn') || s.endsWith('-bd'))) return { lang: 'bn', auto: true }
  return { lang: 'en', auto: true }
}

export function rememberBlogLanguage(code) {
  if (!VALID_CODES.has(code)) return
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* quota */ }
}

/* ── Resolve target language code ──────────────────────────────────────── */

function resolveTarget(langCode) {
  switch (langCode) {
    case 'ur-roman': return 'hi'   // Hindi → Roman works reliably for Roman Urdu
    case 'hi': return 'hi'
    case 'ar': return 'ar'
    case 'bn': return 'bn'
    default: return 'hi'
  }
}

/* ── Fetch with timeout ────────────────────────────────────────────────── */

async function fetchWithTimeout(url, ms, init = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/* ── Google Translate API call (with retry) ───────────────────────────── */

async function callTranslateAPI(text, targetLang) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: targetLang,
    dt: 't',
    q: text,
  })
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`

  let lastErr = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt))
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const segments = Array.isArray(data?.[0]) ? data[0] : []
      const result = segments.map((seg) => (seg && seg[0] ? String(seg[0]) : '')).join('')
      return result.trim()
    } catch (err) {
      lastErr = err
      if (err?.name === 'AbortError') break // don't retry timeouts
    }
  }
  throw lastErr || new Error('Translation failed')
}

/* ── Roman Urdu via Nexora AI (DeepSeek) ──────────────────────────────── */

async function translateToRomanUrdu(text) {
  /**
   * Uses Nexora AI Gateway (DeepSeek) for natural Roman Urdu translation.
   * DeepSeek natively understands Roman Urdu and produces fluent output.
   * Falls back to Google Translate (hi→Roman) if AI Gateway is unreachable.
   * Includes timeout + retries so the UI never hangs on a stuck request.
   */
  let lastErr = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt))

      const res = await fetchWithTimeout(`${AI_GATEWAY_URL}/chat`, AI_GATEWAY_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Translate this English text to Roman Urdu (Urdu written with English alphabets). Natural, conversational tone like a Pakistani professional would write. Preserve all formatting, line breaks, headings, and markdown exactly. Keep the same paragraph structure. Do NOT use Urdu/Arabic script. Do NOT add greetings, emojis, sales pitches, questions, or any extra text — output ONLY the direct translation:\n\n${text}`,
          }],
          maxTokens: Math.max(500, Math.ceil(text.length * 1.5)),
        }),
      })

      if (!res.ok) throw new Error(`AI Gateway error: ${res.status}`)
      const data = await res.json()
      const translated = (data.text || '').trim()
      if (translated) return translated
      throw new Error('AI Gateway returned empty translation')
    } catch (err) {
      lastErr = err
      if (err?.name === 'AbortError') break // don't retry timeouts
    }
  }

  // ── Fallback: Google Translate (target 'hi' produces Roman script, works for Urdu) ──
  console.warn('[Blog Translate] AI Gateway failed for Roman Urdu, falling back to Google Translate:', lastErr?.message)
  try {
    const result = await callTranslateAPI(text, 'hi')
    if (result) return result
  } catch { /* final fallback to original text */ }

  throw lastErr || new Error('Roman Urdu translation failed')
}

/* ── Translate a batch of strings ─────────────────────────────────────── */

async function translateStrings(strings, langCode) {
  const target = resolveTarget(langCode)
  const isRomanUrdu = langCode === 'ur-roman'
  const out = []
  let batch = []
  let batchLen = 0

  const flush = async () => {
    if (!batch.length) return
    const joined = batch.join('\n')

    try {
      let result
      if (isRomanUrdu) {
        result = await translateToRomanUrdu(joined)
      } else {
        result = await callTranslateAPI(joined, target)
      }

      const lines = result.split('\n')
      if (lines.length === batch.length) {
        batch.forEach((original, i) => out.push(lines[i].trim() || original))
      } else {
        // Line mismatch — fall back to individual translation
        for (const original of batch) {
          try {
            out.push(isRomanUrdu
              ? (await translateToRomanUrdu(original)) || original
              : (await callTranslateAPI(original, target)) || original)
          } catch {
            out.push(original)
          }
        }
      }
    } catch {
      // Total failure — return originals
      for (const original of batch) out.push(original)
    }

    batch = []
    batchLen = 0
  }

  for (const item of strings) {
    if (batchLen + item.length > MAX_CHUNK) await flush()
    batch.push(item)
    batchLen += item.length + 1
  }
  await flush()
  return out
}

/* ── Public API: translate a full blog article ─────────────────────────── */

export async function translateBlogArticle(article, langCode) {
  if (!article || !VALID_CODES.has(langCode) || langCode === 'en') return null

  const cacheKey = `nexora:blogTr:v3:${langCode}:${article.slug}`
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null')
    if (cached?.title && Array.isArray(cached.sections)) return cached
  } catch { /* bad cache */ }

  const strings = [String(article.title || ''), String(article.excerpt || '')]
  article.sections?.forEach((s) => {
    strings.push(String(s.heading || ''), ...(s.paragraphs || []).map((p) => String(p || '')))
  })
  article.faqs?.forEach(([q, a]) => {
    strings.push(String(q || ''), String(a || ''))
  })

  let translated
  try {
    translated = await translateStrings(strings, langCode)
  } catch {
    return null // silent fallback to English
  }

  let index = 0
  const next = {
    title: translated[index++] || article.title,
    excerpt: translated[index++] || article.excerpt,
    sections: (article.sections || []).map((section) => ({
      ...section,
      heading: translated[index++] || section.heading,
      paragraphs: (section.paragraphs || []).map(() => translated[index++] || ''),
    })),
    faqs: (article.faqs || []).map(() => [translated[index++] || '', translated[index++] || '']),
  }

  try { sessionStorage.setItem(cacheKey, JSON.stringify(next)) } catch { /* quota */ }
  return next
}

/* ── Firestore-backed translation persistence ──────────────────────────── */

const BLOG_TRANSLATIONS_COLLECTION = 'blogTranslations'

/**
 * Save translations for all languages to Firestore.
 * Called once at blog upload time — not per client visit.
 */
export async function saveBlogTranslationsToFirestore(slug, translations, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return }
  }
  if (!firestoreDb || !slug) return

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  const payload = {
    slug,
    translations,
    updatedAt: serverTimestamp(),
  }
  try {
    await setDoc(doc(firestoreDb, BLOG_TRANSLATIONS_COLLECTION, slug), payload, { merge: true })
  } catch (err) {
    console.warn('[Blog Translate] Failed to save translations:', err.message)
  }
}

/**
 * Load pre-translated content from Firestore (fast, no API cost).
 * Returns null if no cached translation exists.
 */
export async function loadBlogTranslationFromFirestore(slug, langCode) {
  if (!slug || langCode === 'en') return null
  try {
    const { firestoreDb } = await import('./firebase.js')
    if (!firestoreDb) return null
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(firestoreDb, BLOG_TRANSLATIONS_COLLECTION, slug))
    if (!snap.exists()) return null
    const data = snap.data()
    return data?.translations?.[langCode] || null
  } catch {
    return null
  }
}

/**
 * Translate a blog article to ALL supported languages and save to Firestore.
 * Call this once at blog upload/publish time.
 */
export async function translateAndPublishAllLanguages(article, { firestoreDb } = {}) {
  if (!article?.slug) return
  const targetLangs = BLOG_LANGUAGES.filter(l => l.code !== 'en')
  const translations = {}

  for (const { code } of targetLangs) {
    try {
      const translated = await translateBlogArticle(article, code)
      if (translated) translations[code] = translated
    } catch (err) {
      console.warn(`[Blog Translate] Failed to translate to ${code}:`, err.message)
    }
  }

  if (Object.keys(translations).length > 0) {
    await saveBlogTranslationsToFirestore(article.slug, translations, { firestoreDb })
  }
  return translations
}
