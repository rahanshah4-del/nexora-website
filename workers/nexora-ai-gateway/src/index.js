/**
 * Nexora AI Gateway v2 — Cloudflare Worker
 * Multi-provider AI proxy with session memory, analytics & admin dashboard.
 */

// ── Allowed Origins ──
const ALLOWED_ORIGINS = [
  'https://nexorasolution.online',
  'https://www.nexorasolution.online',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]

// ── Provider Adapters ──
const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    body: (model, messages, maxTokens) => JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7, stream: false }),
    parse: (data) => ({ text: data.choices?.[0]?.message?.content || '', usage: data.usage || {}, model: data.model }),
  },
  openai: {
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    body: (model, messages, maxTokens) => JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
    parse: (data) => ({ text: data.choices?.[0]?.message?.content || '', usage: data.usage || {}, model: data.model }),
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash',
    headers: (key) => ({ 'Content-Type': 'application/json' }),
    body: (model, messages, maxTokens) => {
      const sysMsg = messages.find(m => m.role === 'system')
      const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      return JSON.stringify({ system_instruction: sysMsg ? { parts: [{ text: sysMsg.content }] } : undefined, contents: chatMsgs, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } })
    },
    parse: (data) => ({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', usage: data.usageMetadata || {}, model: 'gemini-2.0-flash' }),
    endpoint: (baseUrl, key) => `${baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
  },
  claude: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-haiku-20240307',
    headers: (key) => ({ 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    body: (model, messages, maxTokens) => {
      const sysMsg = messages.find(m => m.role === 'system')
      const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
      return JSON.stringify({ model, system: sysMsg?.content, messages: chatMsgs, max_tokens: maxTokens })
    },
    parse: (data) => ({ text: data.content?.[0]?.text || '', usage: data.usage || {}, model: data.model }),
  },
}

// ── System Prompt (lightweight, knowledge from KV) ──
const BASE_PROMPT = `You are Nexora AI, the official assistant for Nexora Solution (nexorasolution.online) — a Pakistani business software company. NEVER say you are DeepSeek, OpenAI, Gemini, or Claude. Always identify as "Nexora AI".

TONE (CRITICAL): Always be warm, polite, loving, and respectful — like speaking to a dear family member. NEVER sound cold, robotic, or dismissive. When you cannot help with something (weather, live data, etc.), apologize warmly, explain kindly, and offer an alternative. For Urdu/Hindi speakers, use "aap", "ji", "shukriya" generously. Use gentle emojis 😊🌸✨.

Be helpful and concise. Keep responses under 4 sentences unless showing feature lists. End with a helpful next step.`

// ── Rate Limiter ──
const rateLimiters = new Map()

/**
 * Attempt to close a truncated JSON string by counting brackets.
 */
function closeJson(partial) {
  let fixed = partial
  let braces = 0, brackets = 0
  for (const ch of partial) {
    if (ch === '{') braces++
    if (ch === '}') braces--
    if (ch === '[') brackets++
    if (ch === ']') brackets--
  }
  // Close unclosed strings (if last char is inside a string)
  const lastQuote = fixed.lastIndexOf('"')
  const quotes = (fixed.match(/"/g) || []).length
  if (quotes % 2 !== 0 && lastQuote > 0) fixed += '"'
  // Close brackets then braces
  while (brackets > 0) { fixed += ']'; brackets-- }
  while (braces > 0) { fixed += '}'; braces-- }
  return fixed.length > partial.length ? fixed : null
}

/**
 * Convert ArrayBuffer to base64 string in chunks to avoid
 * "Maximum call stack size exceeded" with large files.
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000 // 32KB chunks
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.slice(i, i + CHUNK))
  }
  return btoa(binary)
}

function checkRateLimit(ip, limit = 100, windowSec = 60) {
  const now = Date.now()
  let entry = rateLimiters.get(ip)
  if (!entry || now - entry.start > windowSec * 1000) {
    entry = { start: now, count: 0 }
    rateLimiters.set(ip, entry)
  }
  entry.count++
  return entry.count <= limit
}

// ── CORS ──
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1')
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id',
    'Access-Control-Max-Age': '86400',
  }
}

// ── Load Knowledge from KV ──
async function loadKnowledge(env) {
  try {
    const cached = await env.AI_KV?.get('nexora-knowledge', 'json')
    if (cached) return cached
  } catch {}
  // Fallback knowledge
  return {
    products: 'Restaurant POS, Retail POS, School ERP, Medical Store POS, Transport Software, Property ERP, CRM, WhatsApp CRM, Reports & Analytics, Inventory Management, Team & Permissions, Email Marketing.',
    pricing: '7-Day Free Trial. Basic: PKR 1,000/mo (50% OFF, was PKR 2,000). Standard: PKR 3,000/mo (was PKR 5,999). Enterprise: Custom. All include cloud sync, backup, free updates. Yearly: 20% savings.',
    guarantees: '30-Day Money Back Guarantee. Lifetime Price Lock. Free Setup & Data Migration. Free Staff Training. WhatsApp Support: +92 319 432 9754.',
    routes: '/signup, /pricing, /blog, /industries, /business-services, /about, /contact, /reviews, /faq, /documentation, /help-center, /support-center.',
    website: 'https://nexorasolution.online',
  }
}

// ── Session Memory (KV) ──
async function getSession(sessionId, env) {
  if (!sessionId || !env.AI_KV) return []
  try {
    const data = await env.AI_KV.get(`session:${sessionId}`, 'json')
    return data?.messages || []
  } catch { return [] }
}

async function saveSession(sessionId, messages, env) {
  if (!sessionId || !env.AI_KV) return
  try {
    await env.AI_KV.put(`session:${sessionId}`, JSON.stringify({ messages: messages.slice(-20), updated: Date.now() }), { expirationTtl: 3600 })
  } catch {}
}

// ── Analytics Logging ──
async function logAnalytics(env, data) {
  if (!env.AI_KV) return
  try {
    const today = new Date().toISOString().slice(0, 10)
    const key = `analytics:${today}`
    const existing = await env.AI_KV.get(key, 'json') || { requests: 0, tokens: 0, errors: 0, responseTimes: [], questions: [] }
    existing.requests++
    existing.tokens += data.tokens || 0
    if (data.error) existing.errors++
    if (data.responseTime) existing.responseTimes.push(data.responseTime)
    if (data.question) existing.questions.push(data.question.slice(0, 100))
    await env.AI_KV.put(key, JSON.stringify(existing), { expirationTtl: 7776000 })
  } catch {}
}

// ── Call AI Provider ──
async function callProvider(providerKey, messages, maxTokens, env) {
  const provider = PROVIDERS[providerKey] || PROVIDERS.deepseek
  const apiKey = env[`${providerKey.toUpperCase()}_API_KEY`] || env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error(`No API key for provider: ${providerKey}`)

  const knowledge = await loadKnowledge(env)
  const systemMsg = { role: 'system', content: `${BASE_PROMPT}\n\nNexora Products: ${knowledge.products}\nPricing: ${knowledge.pricing}\nGuarantees: ${knowledge.guarantees}\nRoutes: ${knowledge.routes}\nWebsite: ${knowledge.website}` }

  const url = provider.endpoint ? provider.endpoint(provider.baseUrl, apiKey) : `${provider.baseUrl}/v1/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: provider.headers(apiKey),
    body: provider.body(provider.model, [systemMsg, ...messages], maxTokens),
  })
  if (!res.ok) throw new Error(`Provider error ${res.status}`)
  return provider.parse(await res.json())
}

// ── Main Handler ──
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    // ── Health ──
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', providers: Object.keys(PROVIDERS), timestamp: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // ── Admin Dashboard (public stats — no auth required) ──
    if (url.pathname === '/admin/stats') {
      const stats = { total: 0, byDay: {} }
      if (env.AI_KV) {
        const list = await env.AI_KV.list({ prefix: 'analytics:' })
        for (const key of list.keys) {
          try {
            const day = await env.AI_KV.get(key.name, 'json')
            if (day) {
              stats.total += day.requests || 0
              stats.byDay[key.name.replace('analytics:', '')] = { requests: day.requests, tokens: day.tokens, errors: day.errors, avgTime: day.responseTimes?.length ? Math.round(day.responseTimes.reduce((a,b) => a+b, 0) / day.responseTimes.length) : 0, topQuestions: day.questions?.slice(-5) || [] }
            }
          } catch {}
        }
      }
      return new Response(JSON.stringify(stats), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // ── Admin: Update Knowledge ──
    if (url.pathname === '/admin/knowledge' && request.method === 'POST') {
      const adminKey = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
      try {
        const knowledge = await request.json()
        if (env.AI_KV) await env.AI_KV.put('nexora-knowledge', JSON.stringify(knowledge))
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Admin: Get Knowledge ──
    if (url.pathname === '/admin/knowledge' && request.method === 'GET') {
      const knowledge = await loadKnowledge(env)
      return new Response(JSON.stringify(knowledge), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // ── Chat ──
    if (url.pathname === '/chat' && request.method === 'POST') {
      if (!checkRateLimit(ip, 100, 60)) {
        return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json', ...headers } })
      }

      try {
        const body = await request.json()
        const { messages = [], maxTokens = 500, sessionId, provider: reqProvider = 'deepseek' } = body
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response(JSON.stringify({ error: 'Messages required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        // Session memory
        let history = []
        if (sessionId) {
          history = await getSession(sessionId, env)
        }
        const allMessages = [...history, ...messages]

        const startTime = Date.now()
        const result = await callProvider(reqProvider, allMessages, Math.min(maxTokens, 500), env)
        const responseTime = Date.now() - startTime

        // Save session
        if (sessionId) {
          await saveSession(sessionId, [...allMessages, { role: 'assistant', content: result.text }], env)
        }

        // Log analytics
        ctx.waitUntil(logAnalytics(env, {
          tokens: result.usage?.total_tokens || 0,
          responseTime,
          question: messages[messages.length - 1]?.content || '',
        }))

        return new Response(JSON.stringify({ text: result.text, usage: result.usage, model: result.model, responseTime }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })

      } catch (error) {
        ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true }))
        return new Response(JSON.stringify({ error: 'ai_service_error', message: 'Try again.' }), { status: 502, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Menu Import: AI-powered menu extraction from images ──
    if (url.pathname === '/menu-import' && request.method === 'POST') {
      if (!checkRateLimit(ip, 5, 60)) {
        return new Response(JSON.stringify({ error: 'rate_limit_exceeded', message: 'Too many menu imports. Please wait a moment.' }), { status: 429, headers: { 'Content-Type': 'application/json', ...headers } })
      }

      try {
        const body = await request.json()
        const { imageUrl, imageBase64, confidenceThreshold = 0.7, existingCategories = [], existingItemNames = [], language = 'auto' } = body

        if (!imageUrl && !imageBase64) {
          return new Response(JSON.stringify({ error: 'invalid_request', message: 'imageUrl or imageBase64 is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        let contentType = 'image/jpeg'
        let base64Image = ''

        if (imageBase64) {
          // Client sent base64 data URL directly (fallback when Storage unavailable)
          const dataUriMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/)
          if (dataUriMatch) {
            contentType = dataUriMatch[1]
            base64Image = dataUriMatch[2]
            // Check size (base64 is ~1.33x binary size)
            if (base64Image.length > 14 * 1024 * 1024) {
              return new Response(JSON.stringify({ error: 'file_too_large', maxMB: 10 }), { status: 413, headers: { 'Content-Type': 'application/json', ...headers } })
            }
          } else {
            return new Response(JSON.stringify({ error: 'invalid_request', message: 'imageBase64 must be a valid data URL' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
          }
        } else {
          // Fetch image from provided URL (Firebase Storage or other)
          const imageResponse = await fetch(imageUrl)
          if (!imageResponse.ok) {
            return new Response(JSON.stringify({ error: 'invalid_image_url', message: `Failed to fetch image: ${imageResponse.status}` }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
          }

          contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
          const imageBuffer = await imageResponse.arrayBuffer()

          if (imageBuffer.byteLength > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'file_too_large', maxMB: 10 }), { status: 413, headers: { 'Content-Type': 'application/json', ...headers } })
          }

          base64Image = bufferToBase64(imageBuffer)
        }

        const extractPrompt = `You are a menu extraction AI. Extract ALL menu items from the provided menu image. Return ONLY valid JSON wrapped in \`\`\`json code fences — no other text.

Rules:
1. Extract every visible menu item — do not skip any.
2. For each item return: name, category, description, price (number, no currency symbol), itemType ("Food"/"Drink"/"Beverage"/"Combo"/"Add-on"), variants (string[]), addOns (string[]), tags (string[]), confidence (0-1).
3. If the menu is in Urdu, set "name" to original Urdu and "nameEn" to English transliteration.
4. Price range (e.g. "450-550") → use the lower price.
5. Match categories to these if they fit: ${existingCategories.length ? existingCategories.join(', ') : 'create appropriate new categories'}. Suggest new categories when needed.
6. Existing items (for awareness): ${existingItemNames.length ? existingItemNames.join(', ') : 'none yet'}.
7. Price not visible → set price to null. Name not readable → confidence below 0.3.
8. If image is NOT a menu, return {"items": [], "error": "not_a_menu"}.
9. Language: ${language}.`

        const startTime = Date.now()

        // Try providers in order: Cloudflare AI OCR+DeepSeek → Gemini → OpenAI → Claude
        let rawText = ''
        let modelUsed = ''
        let tokensUsed = 0
        const errors = []

        // ── Provider 0: Cloudflare Workers AI OCR + DeepSeek (free) ──
        if (!rawText && env.AI && base64Image) {
          try {
            // Convert base64 to bytes array (Cloudflare vision models expect byte arrays)
            const binaryStr = atob(base64Image)
            const imageBytes = new Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) {
              imageBytes[i] = binaryStr.charCodeAt(i)
            }

            // Accept Llama 3.2 license (required once; no-op if already accepted)
            try {
              await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                prompt: 'agree',
                max_tokens: 1,
              })
            } catch {}

            // Cloudflare Workers AI vision model for OCR text extraction
            const ocrResult = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
              image: imageBytes,
              prompt: `Read ALL menu text visible in this image. Output every item name, description, price, and category exactly as written. Do not add extra commentary. Preserve the original language (Urdu or English). Output one menu item per line with its details.`,
              max_tokens: 4096,
            })

            const ocrText = ocrResult?.response || ocrResult?.description || ''
            if (ocrText && ocrText.length > 20) {
              // Send extracted OCR text to DeepSeek for structured menu JSON
              if (env.DEEPSEEK_API_KEY) {
                const dsPrompt = `You are a menu extraction AI. Extract ALL menu items from the provided menu TEXT. Return ONLY valid JSON wrapped in \`\`\`json code fences — no other text.

Rules:
1. Extract every menu item mentioned — do not skip any.
2. For each item return: name, category, description, price (number, no currency symbol), itemType ("Food"/"Drink"/"Beverage"/"Combo"/"Add-on"), variants (string[]), addOns (string[]), tags (string[]), confidence (0-1).
3. If the text is in Urdu/Roman Urdu, set "name" to original and "nameEn" to English transliteration.
4. Price range (e.g. "450-550") → use the lower price.
5. Match categories to these if they fit: ${existingCategories.length ? existingCategories.join(', ') : 'create appropriate new categories'}.
6. Existing items: ${existingItemNames.length ? existingItemNames.join(', ') : 'none yet'}.
7. Price not mentioned → set price to null. Name unclear → confidence below 0.3.
8. If text is NOT a menu, return {"items": [], "error": "not_a_menu"}.

Here is the OCR text extracted from the menu image:
"""
${ocrText.slice(0, 12000)}
"""`

                const dsUrl = 'https://api.deepseek.com/v1/chat/completions'
                const dsBody = JSON.stringify({
                  model: 'deepseek-chat',
                  messages: [
                    { role: 'system', content: dsPrompt },
                    { role: 'user', content: 'Extract ALL menu items from this text. Return ONLY valid JSON inside ```json fences.' }
                  ],
                  max_tokens: 16384,
                  temperature: 0.1,
                  stream: false
                })
                const dsRes = await fetch(dsUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
                  body: dsBody
                })
                if (dsRes.ok) {
                  const dsData = await dsRes.json()
                  const dsOutput = dsData.choices?.[0]?.message?.content || ''
                  if (dsOutput.includes('"items"')) {
                    rawText = dsOutput
                    tokensUsed = (dsData.usage?.total_tokens || 0)
                    modelUsed = 'cloudflare-ocr+deepseek-chat'
                  } else {
                    errors.push(`CloudflareOCR: DeepSeek did not return structured items`)
                  }
                } else {
                  errors.push(`CloudflareOCR: DeepSeek API error ${dsRes.status}`)
                }
              } else {
                // No DeepSeek key — OCR text is raw, can't structure it
                errors.push('CloudflareOCR: DEEPSEEK_API_KEY not available for text structuring')
              }
            } else {
              errors.push(`CloudflareOCR: No text extracted (${ocrText?.length || 0} chars)`)
            }
          } catch (e) {
            errors.push(`CloudflareOCR: ${e.message}`)
          }
        } else if (!rawText && !env.AI) {
          errors.push('CloudflareOCR: Workers AI binding not configured')
        }

        // ── Provider 1: Gemini (preferred — cheapest + best multimodal) ──
        if (!rawText && env.GEMINI_API_KEY) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`
            const body = JSON.stringify({
              system_instruction: { parts: [{ text: extractPrompt }] },
              contents: [{ role: 'user', parts: [
                { text: 'Extract ALL menu items from this image. Return ONLY valid JSON inside ```json fences.' },
                { inline_data: { mime_type: contentType, data: base64Image } }
              ]}],
              generationConfig: { maxOutputTokens: 8192, temperature: 0.1, topP: 0.95 }
            })
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
            const data = await res.json()
            if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              rawText = data.candidates[0].content.parts[0].text
              tokensUsed = data.usageMetadata?.totalTokenCount || 0
              modelUsed = 'gemini-2.0-flash'
            } else {
              errors.push(`Gemini: ${res.status} — ${JSON.stringify(data).slice(0, 200)}`)
            }
          } catch (e) {
            errors.push(`Gemini: ${e.message}`)
          }
        } else if (!rawText && !env.GEMINI_API_KEY) {
          errors.push('Gemini: GEMINI_API_KEY not set')
        }

        // ── Provider 2: OpenAI (GPT-4o-mini — vision capable) ──
        if (!rawText && env.OPENAI_API_KEY) {
          try {
            const url = 'https://api.openai.com/v1/chat/completions'
            const body = JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: extractPrompt },
                { role: 'user', content: [
                  { type: 'text', text: 'Extract ALL menu items from this image. Return ONLY valid JSON inside ```json fences.' },
                  { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
                ]}
              ],
              max_tokens: 8192,
              temperature: 0.1
            })
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` }, body })
            const data = await res.json()
            if (res.ok && data.choices?.[0]?.message?.content) {
              rawText = data.choices[0].message.content
              tokensUsed = data.usage?.total_tokens || 0
              modelUsed = 'gpt-4o-mini'
            } else {
              errors.push(`OpenAI: ${res.status} — ${JSON.stringify(data).slice(0, 200)}`)
            }
          } catch (e) {
            errors.push(`OpenAI: ${e.message}`)
          }
        }

        // ── Provider 3: Claude (Haiku — vision capable) ──
        if (!rawText && env.CLAUDE_API_KEY) {
          try {
            const url = 'https://api.anthropic.com/v1/messages'
            const body = JSON.stringify({
              model: 'claude-3-haiku-20240307',
              system: extractPrompt,
              messages: [{ role: 'user', content: [
                { type: 'text', text: 'Extract ALL menu items from this image. Return ONLY valid JSON inside ```json fences.' },
                { type: 'image', source: { type: 'base64', media_type: contentType, data: base64Image } }
              ]}],
              max_tokens: 8192
            })
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' }, body })
            const data = await res.json()
            if (res.ok && data.content?.[0]?.text) {
              rawText = data.content[0].text
              tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
              modelUsed = 'claude-3-haiku-20240307'
            } else {
              errors.push(`Claude: ${res.status} — ${JSON.stringify(data).slice(0, 200)}`)
            }
          } catch (e) {
            errors.push(`Claude: ${e.message}`)
          }
        }

        if (!rawText) {
          return new Response(JSON.stringify({ error: 'all_providers_failed', message: 'All vision AI providers failed.', errors }), { status: 503, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        // Parse JSON from AI response (handles truncated/malformed output)
        let parsed
        try {
          // Try extracting from ```json ... ``` fences first
          const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1].trim())
          } else {
            // Check if output starts with ```json but has no closing fence (truncated)
            const openFence = rawText.match(/```(?:json)?\s*([\s\S]*)/)
            if (openFence) {
              try { parsed = JSON.parse(openFence[1].trim()) } catch {
                // Try closing the truncated JSON by adding missing braces
                const content = openFence[1].trim()
                const fixed = closeJson(content)
                if (fixed) parsed = JSON.parse(fixed)
              }
            } else {
              // No fences — try raw JSON
              parsed = JSON.parse(rawText.trim())
            }
          }
        } catch {
          // Last resort: find anything that looks like {...} with items
          const bracketMatch = rawText.match(/\{[\s\S]*"items"[\s\S]*\}/)
          if (bracketMatch) {
            try { parsed = JSON.parse(bracketMatch[0]) } catch { parsed = null }
          }
        }

        if (!parsed || !Array.isArray(parsed.items)) {
          ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true }))
          return new Response(JSON.stringify({ error: 'extraction_failed', message: 'Could not parse menu items.', rawText: rawText.slice(0, 500) }), { status: 422, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        if (parsed.error === 'not_a_menu') {
          return new Response(JSON.stringify({ error: 'not_a_menu', message: 'Image does not appear to be a menu.' }), { status: 422, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const items = parsed.items.map((item, idx) => {
          const conf = typeof item.confidence === 'number' ? item.confidence : 0.5
          const warnings = []
          if (!item.name || !String(item.name).trim()) warnings.push('missing_name')
          if (item.price === null || item.price === undefined || isNaN(Number(item.price))) warnings.push('missing_price')
          if (conf < confidenceThreshold) warnings.push('low_confidence')
          return {
            name: String(item.name || '').trim(),
            nameEn: item.nameEn || '',
            category: String(item.category || 'Uncategorized').trim(),
            description: String(item.description || '').trim(),
            price: item.price != null && !isNaN(Number(item.price)) ? Number(item.price) : null,
            itemType: ['Food','Drink','Beverage','Combo','Add-on'].includes(item.itemType) ? item.itemType : 'Food',
            variants: Array.isArray(item.variants) ? item.variants.filter(Boolean) : [],
            addOns: Array.isArray(item.addOns) ? item.addOns.filter(Boolean) : [],
            tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
            confidence: conf,
            warnings,
            _index: idx
          }
        })

        const responseTime = Date.now() - startTime
        const newCategories = [...new Set(items.map(i => i.category).filter(c => c !== 'Uncategorized' && !existingCategories.includes(c)))]

        const stats = {
          total: items.length,
          highConfidence: items.filter(i => i.confidence >= confidenceThreshold).length,
          lowConfidence: items.filter(i => i.confidence < confidenceThreshold).length,
          withWarnings: items.filter(i => i.warnings.length > 0).length,
          missingPrice: items.filter(i => i.warnings.includes('missing_price')).length,
          missingName: items.filter(i => i.warnings.includes('missing_name')).length,
          newCategoriesSuggested: newCategories,
          processingTimeMs: responseTime,
          modelUsed,
          tokensUsed
        }

        ctx.waitUntil((async () => {
          await logAnalytics(env, { tokens: stats.tokensUsed, responseTime, question: `[MENU IMPORT] ${items.length} items` })
          if (env.AI_KV) {
            try {
              const today = new Date().toISOString().slice(0, 10)
              const key = `menu-import:${today}`
              const existing = await env.AI_KV.get(key, 'json') || { imports: 0, items: 0 }
              existing.imports++
              existing.items += items.length
              await env.AI_KV.put(key, JSON.stringify(existing), { expirationTtl: 7776000 })
            } catch {}
          }
        })())

        return new Response(JSON.stringify({ items, stats }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })

      } catch (error) {
        ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true, question: `[MENU IMPORT ERROR] ${error.message}` }))
        return new Response(JSON.stringify({ error: 'ai_service_error', message: error.message || 'Menu extraction failed.' }), { status: 502, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Menu Extract from TEXT (Nexora AI — text-based) ──
    if (url.pathname === '/menu-extract-text' && request.method === 'POST') {
      if (!checkRateLimit(ip, 20, 60)) {
        return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json', ...headers } })
      }

      try {
        const body = await request.json()
        const { text, existingCategories = [], existingItemNames = [], confidenceThreshold = 0.7 } = body

        if (!text || !text.trim()) {
          return new Response(JSON.stringify({ error: 'invalid_request', message: 'text is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const extractPrompt = `You are a menu extraction AI. Extract ALL menu items from the provided menu TEXT. Return ONLY valid JSON wrapped in \`\`\`json code fences — no other text.

Rules:
1. Extract every menu item mentioned — do not skip any.
2. For each item return: name, category, description, price (number, no currency symbol), itemType ("Food"/"Drink"/"Beverage"/"Combo"/"Add-on"), variants (string[]), addOns (string[]), tags (string[]), confidence (0-1).
3. If the text is in Urdu/Roman Urdu, set "name" to original and "nameEn" to English transliteration.
4. Price range (e.g. "450-550") → use the lower price.
5. Match categories to these if they fit: ${existingCategories.length ? existingCategories.join(', ') : 'create appropriate new categories'}.
6. Existing items: ${existingItemNames.length ? existingItemNames.join(', ') : 'none yet'}.
7. Price not mentioned → set price to null. Name unclear → confidence below 0.3.
8. If text is NOT a menu, return {"items": [], "error": "not_a_menu"}.

Here is the menu text to extract from:
"""
${text.slice(0, 15000)}
"""`

        const startTime = Date.now()
        const apiKey = env.DEEPSEEK_API_KEY
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'service_unavailable', message: 'DEEPSEEK_API_KEY not configured.' }), { status: 503, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const url = 'https://api.deepseek.com/v1/chat/completions'
        const dsBody = JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: extractPrompt },
            { role: 'user', content: 'Extract ALL menu items from this text. Return ONLY valid JSON inside ```json fences.' }
          ],
          max_tokens: 8192,
          temperature: 0.1,
          stream: false
        })

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: dsBody
        })

        if (!res.ok) {
          return new Response(JSON.stringify({ error: 'ai_service_error', message: `AI service error: ${res.status}` }), { status: 502, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const data = await res.json()
        const rawText = data.choices?.[0]?.message?.content || ''

        // Parse JSON
        let parsed
        try {
          const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawText]
          parsed = JSON.parse((jsonMatch[1] || rawText).trim())
        } catch {
          const bracketMatch = rawText.match(/\{[\s\S]*\}/)
          if (bracketMatch) {
            try { parsed = JSON.parse(bracketMatch[0]) } catch { parsed = null }
          }
        }

        if (!parsed || !Array.isArray(parsed.items)) {
          return new Response(JSON.stringify({ error: 'extraction_failed', message: 'Could not parse menu items from text.', rawText: rawText.slice(0, 500) }), { status: 422, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        if (parsed.error === 'not_a_menu') {
          return new Response(JSON.stringify({ error: 'not_a_menu', message: 'Text does not appear to be a menu.' }), { status: 422, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const items = parsed.items.map((item, idx) => {
          const conf = typeof item.confidence === 'number' ? item.confidence : 0.5
          const warnings = []
          if (!item.name?.trim()) warnings.push('missing_name')
          if (item.price === null || item.price === undefined || isNaN(Number(item.price))) warnings.push('missing_price')
          if (conf < confidenceThreshold) warnings.push('low_confidence')
          return {
            name: String(item.name || '').trim(),
            nameEn: item.nameEn || '',
            category: String(item.category || 'Uncategorized').trim(),
            description: String(item.description || '').trim(),
            price: item.price != null && !isNaN(Number(item.price)) ? Number(item.price) : null,
            itemType: ['Food','Drink','Beverage','Combo','Add-on'].includes(item.itemType) ? item.itemType : 'Food',
            variants: Array.isArray(item.variants) ? item.variants.filter(Boolean) : [],
            addOns: Array.isArray(item.addOns) ? item.addOns.filter(Boolean) : [],
            tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
            confidence: conf,
            warnings,
            _index: idx
          }
        })

        const responseTime = Date.now() - startTime
        const newCategories = [...new Set(items.map(i => i.category).filter(c => c !== 'Uncategorized' && !existingCategories.includes(c)))]

        const stats = {
          total: items.length,
          highConfidence: items.filter(i => i.confidence >= confidenceThreshold).length,
          lowConfidence: items.filter(i => i.confidence < confidenceThreshold).length,
          withWarnings: items.filter(i => i.warnings.length > 0).length,
          missingPrice: items.filter(i => i.warnings.includes('missing_price')).length,
          missingName: items.filter(i => i.warnings.includes('missing_name')).length,
          newCategoriesSuggested: newCategories,
          processingTimeMs: responseTime,
          modelUsed: 'Nexora AI',
          tokensUsed: data.usage?.total_tokens || 0
        }

        ctx.waitUntil(logAnalytics(env, { tokens: stats.tokensUsed, responseTime, question: `[MENU TEXT] ${items.length} items` }))

        return new Response(JSON.stringify({ items, stats }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })

      } catch (error) {
        ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true, question: `[MENU TEXT ERROR] ${error.message}` }))
        return new Response(JSON.stringify({ error: 'ai_service_error', message: error.message }), { status: 502, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Menu Import Stats (Admin) ──
    if (url.pathname === '/menu-import/stats' && request.method === 'GET') {
      const adminKey = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
      const importStats = { totalImports: 0, totalItemsExtracted: 0, byDay: {} }
      if (env.AI_KV) {
        try {
          const list = await env.AI_KV.list({ prefix: 'menu-import:' })
          for (const key of list.keys) {
            try {
              const day = await env.AI_KV.get(key.name, 'json')
              if (day) {
                importStats.totalImports += day.imports || 0
                importStats.totalItemsExtracted += day.items || 0
                importStats.byDay[key.name.replace('menu-import:', '')] = day
              }
            } catch {}
          }
        } catch {}
      }
      return new Response(JSON.stringify(importStats), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    return new Response(JSON.stringify({ error: 'not_found', message: 'Nexora AI Gateway v2. POST /chat | POST /menu-import | GET /health | /admin/stats | /admin/knowledge' }), { status: 404, headers: { 'Content-Type': 'application/json', ...headers } })
  },
}
