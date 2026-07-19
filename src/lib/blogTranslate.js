/* Lightweight client-side blog translation.
 * Pakistan visitors → Roman Urdu (Urdu translation, Latin transliteration),
 * India visitors → Hindi. Uses the public Google Translate endpoint with
 * sessionStorage caching; falls back to English silently on any failure.
 * SEO is unaffected — meta tags and schema always use the English source. */

export const BLOG_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ur-roman', label: 'Roman Urdu' },
  { code: 'hi', label: 'हिन्दी' },
]

const VALID_CODES = new Set(BLOG_LANGUAGES.map((item) => item.code))
const STORAGE_KEY = 'nexora:blog:lang'
const MAX_CHUNK_CHARS = 3200

export function detectPreferredBlogLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_CODES.has(stored)) return { lang: stored, auto: false }
  } catch { /* storage unavailable */ }
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (timeZone === 'Asia/Karachi') return { lang: 'ur-roman', auto: true }
    if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta') return { lang: 'hi', auto: true }
  } catch { /* Intl unavailable */ }
  const langs = (navigator.languages || [navigator.language])
    .filter(Boolean)
    .map((item) => String(item).toLowerCase())
  if (langs.some((item) => item.startsWith('ur') || item.endsWith('-pk'))) return { lang: 'ur-roman', auto: true }
  if (langs.some((item) => item.startsWith('hi') || item.endsWith('-in'))) return { lang: 'hi', auto: true }
  return { lang: 'en', auto: true }
}

export function rememberBlogLanguage(code) {
  if (!VALID_CODES.has(code)) return
  try { window.localStorage.setItem(STORAGE_KEY, code) } catch { /* quota — ignore */ }
}

async function fetchTranslation(text, target, roman) {
  const params = `client=gtx&sl=en&tl=${target}&dt=t${roman ? '&dt=rm' : ''}&q=${encodeURIComponent(text)}`
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`)
  if (!res.ok) throw new Error(`translate http ${res.status}`)
  const data = await res.json()
  const segments = Array.isArray(data?.[0]) ? data[0] : []
  const translated = segments.map((seg) => (seg && typeof seg[0] === 'string' ? seg[0] : '')).join('')
  let romanized = ''
  if (roman) {
    romanized = segments.map((seg) => (seg && typeof seg[2] === 'string' ? seg[2] : '')).join('')
    if (!romanized) romanized = segments.map((seg) => (seg && typeof seg[3] === 'string' ? seg[3] : '')).join('')
  }
  return { translated, romanized }
}

function pickText({ translated, romanized }, roman, fallback) {
  const value = (roman && romanized) || translated || fallback
  return String(value).trim() || fallback
}

/* Translate an ordered list of strings. Strings are batched newline-joined to
 * keep request counts low; if the translation mangles the newline boundaries,
 * that batch falls back to per-string requests so alignment never breaks. */
async function translateStrings(strings, langCode) {
  const target = langCode === 'hi' ? 'hi' : 'ur'
  const roman = langCode === 'ur-roman'
  const out = []
  let batch = []
  let batchLen = 0

  const flush = async () => {
    if (!batch.length) return
    const result = await fetchTranslation(batch.join('\n'), target, roman)
    const source = (roman && result.romanized) || result.translated
    const lines = source.split('\n')
    if (lines.length === batch.length) {
      batch.forEach((original, index) => out.push(lines[index].trim() || original))
    } else {
      for (const original of batch) {
        out.push(pickText(await fetchTranslation(original, target, roman), roman, original))
      }
    }
    batch = []
    batchLen = 0
  }

  for (const item of strings) {
    if (batchLen + item.length > MAX_CHUNK_CHARS) await flush()
    batch.push(item)
    batchLen += item.length + 1
  }
  await flush()
  return out
}

export async function translateBlogArticle(article, langCode) {
  if (!article || !VALID_CODES.has(langCode) || langCode === 'en') return null
  const cacheKey = `nexora:blogTr:${langCode}:${article.slug}`
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || 'null')
    if (cached?.title && Array.isArray(cached.sections)) return cached
  } catch { /* ignore bad cache */ }

  const strings = [String(article.title || ''), String(article.excerpt || '')]
  article.sections.forEach((section) => {
    strings.push(String(section.heading || ''), ...section.paragraphs.map((p) => String(p || '')))
  })
  article.faqs.forEach(([question, answer]) => {
    strings.push(String(question || ''), String(answer || ''))
  })

  const translated = await translateStrings(strings, langCode)
  let index = 0
  const next = {
    title: translated[index++] || article.title,
    excerpt: translated[index++] || article.excerpt,
    sections: article.sections.map((section) => ({
      ...section,
      heading: translated[index++] || section.heading,
      paragraphs: section.paragraphs.map((paragraph) => translated[index++] || paragraph),
    })),
    faqs: article.faqs.map(([question, answer]) => [translated[index++] || question, translated[index++] || answer]),
  }
  try { window.sessionStorage.setItem(cacheKey, JSON.stringify(next)) } catch { /* quota — ignore */ }
  return next
}
