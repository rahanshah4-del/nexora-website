/**
 * Client-side blog translation via Google Translate API.
 *
 *   English → English (passthrough)
 *   English → Roman Urdu (Hindi target + romanization — Google supports hi→Latin)
 *   English → Hindi (direct)
 *   English → Arabic (direct)
 *   English → Bengali (direct)
 *
 * Uses translate.googleapis.com with sessionStorage caching, retry, and fallback.
 * SEO is unaffected — meta tags and schema always use the English source.
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

async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
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

/* ── Roman Urdu via Hindi transliteration ─────────────────────────────── */

async function translateToRomanUrdu(text) {
  /**
   * Google Translate doesn't support Urdu→Latin romanization.
   * Strategy: translate EN→HI (Hindi), then use a phonetic mapping
   * to produce Roman Urdu output.
   *
   * Step 1: Get Hindi translation (Devanagari script)
   * Step 2: Convert Devanagari → Latin using phonetic transliteration
   */
  const hindiText = await callTranslateAPI(text, 'hi')

  // Devanagari → Latin phonetic map for Roman Urdu
  // This covers all common Hindi/Urdu sounds
  const devaToLatin = [
    // Vowels
    ['अ', 'a'], ['आ', 'aa'], ['ा', 'aa'], ['इ', 'i'], ['ई', 'ee'], ['ी', 'ee'],
    ['उ', 'u'], ['ऊ', 'oo'], ['ू', 'oo'], ['ए', 'e'], ['े', 'e'], ['ऐ', 'ai'],
    ['ै', 'ai'], ['ओ', 'o'], ['ो', 'o'], ['औ', 'au'], ['ौ', 'au'],
    ['ऋ', 'ri'], ['अं', 'an'], ['अः', 'ah'], ['ं', 'n'], ['ः', 'h'],
    // Consonants
    ['क', 'k'], ['का', 'kaa'], ['कि', 'ki'], ['की', 'kee'], ['कु', 'ku'],
    ['ख', 'kh'], ['ग', 'g'], ['घ', 'gh'], ['च', 'ch'], ['छ', 'chh'],
    ['ज', 'j'], ['झ', 'jh'], ['ट', 't'], ['ठ', 'th'], ['ड', 'd'],
    ['ढ', 'dh'], ['ण', 'n'], ['त', 't'], ['थ', 'th'], ['द', 'd'],
    ['ध', 'dh'], ['न', 'n'], ['प', 'p'], ['फ', 'ph'], ['ब', 'b'],
    ['भ', 'bh'], ['म', 'm'], ['य', 'y'], ['र', 'r'], ['ल', 'l'],
    ['व', 'w'], ['श', 'sh'], ['ष', 'sh'], ['स', 's'], ['ह', 'h'],
    ['क्ष', 'ksh'], ['त्र', 'tr'], ['ज्ञ', 'gy'], ['श्र', 'shr'],
    ['ख़', 'kh'], ['ग़', 'gh'], ['ज़', 'z'], ['ड़', 'r'], ['ढ़', 'rh'],
    ['फ़', 'f'], ['क़', 'q'],
    // Special
    ['्', ''], ['ा', 'aa'], ['ि', 'i'], ['ी', 'ee'], ['ु', 'u'],
    ['ू', 'oo'], ['ृ', 'ri'], ['े', 'e'], ['ै', 'ai'], ['ो', 'o'],
    ['ौ', 'au'], ['ॉ', 'o'],
    // Punctuation / spacing
    ['।', '.'], ['॥', '.'], ['॰', '.'],
    // Common words post-processing handled below
  ]

  let latin = hindiText
  // Apply longest matches first
  const sorted = devaToLatin.sort((a, b) => b[0].length - a[0].length)
  for (const [deva, lat] of sorted) {
    latin = latin.split(deva).join(lat)
  }

  // Clean up: join broken vowel marks, remove leftover Devanagari
  latin = latin.replace(/[ऀ-ॿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return latin || hindiText
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

  const cacheKey = `nexora:blogTr:v2:${langCode}:${article.slug}`
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
