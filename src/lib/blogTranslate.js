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
 *
 * Pipeline: English publish → DeepSeek (3 retries, exp backoff)
 *           → Validate non-empty → Firestore save (translationStatus: 'completed')
 *           → Frontend loads from Firestore (only if status === 'completed')
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
const DEEPSEEK_MAX_RETRIES = 3
const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'
const TRANSLATION_HARD_TIMEOUT_MS = 90000  // 90s total cap — never let UI spin >90s

/** Detect AbortError across all browsers (Chrome, Firefox, Safari) */
function isAbortError(err) {
  if (!err) return false
  const name = String(err?.name || '').toLowerCase()
  return name === 'aborterror' || name === 'abort_error' || err?.code === 20 // err.code 20 = AbortError in some envs
}

/**
 * Maps display language codes to Firestore translation keys.
 * 'ur-roman' → 'ur'  (Roman Urdu stored as 'ur' in Firestore)
 * Backward compat: both 'ur-roman' and 'ur' are checked during load.
 */
function toFirestoreLangKey(displayCode) {
  if (displayCode === 'ur-roman') return 'ur'
  return displayCode
}

/** Reverse map: Firestore key → display code (for backward compat) */
function fromFirestoreLangKey(fsKey) {
  if (fsKey === 'ur') return 'ur-roman'
  return fsKey
}

/* ── Logging ────────────────────────────────────────────────────────────── */

const LOG_PREFIX = '[Blog Translate]'

function log(step, message, data = null) {
  const ts = new Date().toISOString().slice(11, 23)
  if (data !== null) {
    console.log(`${LOG_PREFIX} ${ts} STEP ${step}: ${message}`, data)
  } else {
    console.log(`${LOG_PREFIX} ${ts} STEP ${step}: ${message}`)
  }
}

function logError(step, message, err) {
  const ts = new Date().toISOString().slice(11, 23)
  console.error(`${LOG_PREFIX} ${ts} STEP ${step} FAILED: ${message}`, err?.message || err)
}

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
      if (isAbortError(err)) break // don't retry timeouts
    }
  }
  throw lastErr || new Error('Translation failed')
}

/* ── Roman Urdu via Nexora AI (DeepSeek) ──────────────────────────────── */

/* ── Roman Urdu via Nexora AI (DeepSeek) ──────────────────────────────── */

/**
 * Translate English text to Roman Urdu via DeepSeek AI Gateway.
 * DeepSeek natively understands Roman Urdu and produces fluent output.
 *
 * Retry strategy:
 *   Attempt 1 → wait 1s  → Attempt 2 → wait 2s → Attempt 3
 *   (exponential backoff: 1000ms, 2000ms, 4000ms)
 *
 * Fallback: Google Translate (target 'hi' produces Roman script)
 * Only used when DeepSeek is fully exhausted (all 3 retries failed).
 */
async function translateToRomanUrdu(text, { logContext = '' } = {}) {
  let lastErr = null

  // ── DeepSeek with 3 retries + exponential backoff ──
  for (let attempt = 0; attempt < DEEPSEEK_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 1000 * Math.pow(2, attempt - 1) // 1s, 2s, 4s
        log(2, `DeepSeek retry ${attempt + 1}/${DEEPSEEK_MAX_RETRIES} — waiting ${delay}ms${logContext ? ' [' + logContext + ']' : ''}`)
        await new Promise((r) => setTimeout(r, delay))
      }

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

      if (!res.ok) throw new Error(`AI Gateway HTTP ${res.status}`)
      const data = await res.json()
      const translated = (data.text || '').trim()
      if (translated) {
        log(3, `Roman Urdu translation completed (attempt ${attempt + 1})${logContext ? ' [' + logContext + ']' : ''}`)
        return translated
      }
      throw new Error('AI Gateway returned empty translation')
    } catch (err) {
      lastErr = err
      logError(2, `DeepSeek attempt ${attempt + 1}/${DEEPSEEK_MAX_RETRIES} failed`, err)
      if (isAbortError(err)) {
        logError(2, `DeepSeek timed out after ${AI_GATEWAY_TIMEOUT_MS}ms — aborting retries`)
        break
      }
    }
  }

  // ── Fallback: Google Translate (target 'hi' = Roman script, works for Urdu) ──
  log(2, `DeepSeek exhausted, falling back to Google Translate for Roman Urdu${logContext ? ' [' + logContext + ']' : ''}`)
  try {
    const result = await callTranslateAPI(text, 'hi')
    if (result) {
      log(3, `Roman Urdu fallback (Google Translate) completed${logContext ? ' [' + logContext + ']' : ''}`)
      return result
    }
  } catch (fbErr) {
    logError(2, 'Google Translate fallback also failed', fbErr)
  }

  throw lastErr || new Error('Roman Urdu translation failed after all retries and fallback')
}

/* ── Validate translation is not empty ─────────────────────────────────── */

function validateTranslation(translated, langCode) {
  if (!translated) return false
  // Must have at least a title and one section
  if (!translated.title || !String(translated.title).trim()) return false
  if (!Array.isArray(translated.sections) || translated.sections.length === 0) return false
  // First section must have at least one non-empty paragraph
  const firstSection = translated.sections[0]
  if (!firstSection || !Array.isArray(firstSection.paragraphs) || firstSection.paragraphs.length === 0) return false
  if (!firstSection.paragraphs.some((p) => String(p || '').trim())) return false
  return true
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
          } catch (err) {
            // Roman Urdu: throw instead of silently saving English
            if (isRomanUrdu) throw err
            out.push(original)
          }
        }
      }
    } catch (err) {
      // Roman Urdu: NEVER silently return English originals.
      // If DeepSeek fails, throw so translateBlogArticle returns null
      // and translateSingleLanguage marks it as 'failed'.
      // Google Translate (hi/ar/bn): fall back to originals as last resort.
      if (isRomanUrdu) {
        logError(3, `Roman Urdu batch translation failed — throwing to prevent English-as-Urdu save`, err)
        throw err
      }
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

  // ── Hard timeout: never let translation spin the UI beyond 90 seconds ──
  let translated
  try {
    translated = await Promise.race([
      translateStrings(strings, langCode),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Translation hard timeout after ${TRANSLATION_HARD_TIMEOUT_MS / 1000}s`)), TRANSLATION_HARD_TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    logError(3, `Translation aborted [${langCode}] — ${err?.message || err}`)
    return null
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

  // Safety net: if translated title is identical to English original,
  // the translation silently failed — don't pretend it's translated.
  const originalTitle = String(article.title || '').trim()
  const translatedTitle = String(next.title || '').trim()
  if (originalTitle && translatedTitle === originalTitle) {
    logError(3, `Translation produced identical title to English — treating as failed [${langCode}]`)
    return null
  }

  try { sessionStorage.setItem(cacheKey, JSON.stringify(next)) } catch { /* quota */ }
  return next
}

/* ── Firestore-backed translation persistence ──────────────────────────── */

const BLOG_TRANSLATIONS_COLLECTION = 'blogTranslations'

/**
 * Save translations for all languages to Firestore.
 * Called once at blog upload time — not per client visit.
 *
 * Firestore structure:
 * {
 *   slug: "my-post",
 *   translations: {
 *     en: { title, excerpt, sections, ..., translationStatus: "completed" },
 *     ur: { title, excerpt, sections, ..., translationStatus: "completed" },
 *     hi: { ... },
 *     ar: { ... },
 *     bn: { ... }
 *   },
 *   updatedAt: <serverTimestamp>
 * }
 *
 * Backward compat: Also saves 'ur-roman' key alongside 'ur' so existing
 * frontend code that requests 'ur-roman' continues to work.
 */
export async function saveBlogTranslationsToFirestore(slug, translationsByDisplayCode, { firestoreDb } = {}) {
  if (!firestoreDb) {
    try {
      const { firestoreDb: db } = await import('./firebase.js')
      firestoreDb = db
    } catch { return }
  }
  if (!firestoreDb || !slug) return

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

  // Build Firestore payload with both new (ur) and legacy (ur-roman) keys
  const firestoreTranslations = {}

  for (const [displayCode, translation] of Object.entries(translationsByDisplayCode)) {
    const fsKey = toFirestoreLangKey(displayCode)
    firestoreTranslations[fsKey] = translation

    // Backward compat: also save 'ur-roman' if storing 'ur'
    if (fsKey === 'ur') {
      firestoreTranslations['ur-roman'] = translation
    }
  }

  const payload = {
    slug,
    translations: firestoreTranslations,
    updatedAt: serverTimestamp(),
  }
  try {
    await setDoc(doc(firestoreDb, BLOG_TRANSLATIONS_COLLECTION, slug), payload, { merge: true })
    log(4, `Firestore save successful [slug: ${slug}]`, Object.keys(firestoreTranslations))
  } catch (err) {
    logError(4, `Firestore save failed [slug: ${slug}]`, err)
    throw err
  }
}

/**
 * Load pre-translated content from Firestore (fast, no API cost).
 * Returns null if:
 *   - No cached translation exists
 *   - translationStatus is not 'completed'
 *   - The translation is empty/invalid
 *
 * Backward compat: Checks both 'ur-roman' and 'ur' keys.
 */
export async function loadBlogTranslationFromFirestore(slug, langCode) {
  if (!slug || langCode === 'en') return null

  log(6, `Frontend language loader — checking Firestore [slug: ${slug}, lang: ${langCode}]`)

  try {
    const { firestoreDb } = await import('./firebase.js')
    if (!firestoreDb) {
      logError(6, 'Firestore not available', new Error('No firestoreDb'))
      return null
    }
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(firestoreDb, BLOG_TRANSLATIONS_COLLECTION, slug))

    if (!snap.exists()) {
      log(6, `No translation document found in Firestore [slug: ${slug}] — will attempt live translation`)
      return null
    }

    const data = snap.data()
    const translations = data?.translations || {}

    // Try exact match first, then Firestore key variant
    let translation = translations[langCode] || null

    // Backward compat: if requesting 'ur-roman' but not found, try 'ur' key
    if (!translation && langCode === 'ur-roman') {
      translation = translations['ur'] || null
    }
    // Backward compat: if requesting 'ur' but not found, try 'ur-roman' key
    if (!translation && langCode === 'ur') {
      translation = translations['ur-roman'] || null
    }

    if (!translation) {
      log(6, `Language '${langCode}' not in Firestore translations [slug: ${slug}] — available: ${Object.keys(translations).join(', ')}`)
      return null
    }

    // Check translationStatus: must be 'completed' or missing (backward compat)
    // Reject only if status is explicitly a failure state like 'failed' or 'pending'
    const status = translation.translationStatus || ''
    if (status === 'failed' || status === 'pending') {
      log(6, `Translation found but status='${status}' [slug: ${slug}, lang: ${langCode}] — attempting live translation instead`)
      return null
    }
    // Missing status on older translations = assume completed (backward compat)
    if (status && status !== 'completed') {
      log(6, `Translation found with unknown status='${status}' [slug: ${slug}, lang: ${langCode}] — attempting live translation`)
      return null
    }

    // Validate translation has content
    if (!validateTranslation(translation, langCode)) {
      logError(6, `Translation exists but failed validation (empty content) [slug: ${slug}, lang: ${langCode}]`, new Error('Empty translation'))
      return null
    }

    log(6, `Frontend language loader confirmed — loaded from Firestore [slug: ${slug}, lang: ${langCode}]`)
    return translation
  } catch (err) {
    logError(6, `Firestore load error [slug: ${slug}, lang: ${langCode}]`, err)
    return null
  }
}

/**
 * Translate a blog article to ONE language with full status tracking.
 * Returns { translation, status: 'completed'|'failed' }
 * Never returns empty/invalid translation.
 */
async function translateSingleLanguage(article, langCode) {
  const label = `${langCode} [slug: ${article?.slug || 'unknown'}]`

  try {
    const translated = await translateBlogArticle(article, langCode)
    if (!translated) {
      logError(3, `Translation returned null ${label}`, new Error('Null result'))
      return { status: 'failed', reason: 'Translation returned null' }
    }
    if (!validateTranslation(translated, langCode)) {
      logError(5, `Translation validation failed ${label}`, new Error('Empty/invalid content'))
      return { status: 'failed', reason: 'Translation validation failed — empty content' }
    }

    translated.translationStatus = 'completed'
    log(5, `Translation verified ${label}`)
    return { status: 'completed', translation: translated }
  } catch (err) {
    logError(3, `Translation exception ${label}`, err)
    return { status: 'failed', reason: err?.message || 'Unknown error' }
  }
}

/**
 * Translate a blog article to ALL supported languages and save to Firestore.
 * Call this once at blog upload/publish time.
 *
 * Returns: { translations: {...}, results: {...} }
 *
 * Each language result has:
 *   { status: 'completed' | 'failed' | 'skipped', reason?: string }
 *
 * NEVER saves partial/empty translations.
 * Only languages with status='completed' are saved to Firestore.
 */
export async function translateAndPublishAllLanguages(article, { firestoreDb } = {}) {
  if (!article?.slug) {
    logError(1, 'translateAndPublishAllLanguages called without slug', new Error('Missing slug'))
    return { translations: {}, results: {} }
  }

  log(1, `English blog published [slug: ${article.slug}]`)

  const targetLangs = BLOG_LANGUAGES.filter(l => l.code !== 'en')
  const translations = {
    // Always include English source with completed status
    en: {
      title: article.title || '',
      excerpt: article.excerpt || '',
      seoTitle: article.seoTitle || article.title || '',
      seoDescription: article.metaDescription || article.excerpt || '',
      slug: article.slug,
      sections: article.sections || [],
      faqs: article.faqs || [],
      translationStatus: 'completed',
      updatedAt: new Date().toISOString(),
    },
  }
  const results = {
    en: { status: 'completed' },
  }

  for (const { code } of targetLangs) {
    log(2, `DeepSeek translation started ${code} [slug: ${article.slug}]`)

    const result = await translateSingleLanguage(article, code)
    results[code] = result

    if (result.status === 'completed' && result.translation) {
      translations[code] = result.translation
    }
  }

  // ── Only save languages that translated successfully ──
  const completedLangs = Object.keys(translations)
  if (completedLangs.length > 0) {
    try {
      await saveBlogTranslationsToFirestore(article.slug, translations, { firestoreDb })
    } catch (saveErr) {
      logError(4, 'Failed to persist translations to Firestore', saveErr)
      // Mark all as failed since save didn't complete
      for (const code of completedLangs) {
        results[code] = { status: 'failed', reason: 'Firestore save failed' }
      }
    }
  } else {
    logError(4, `No translations completed for [slug: ${article.slug}] — nothing saved to Firestore`)
  }

  const succeeded = completedLangs.filter(c => results[c]?.status === 'completed').length
  log(5, `Translation pipeline complete [slug: ${article.slug}] — ${succeeded}/${targetLangs.length} languages`, results)

  return { translations, results }
}
