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
const BASE_PROMPT = `You are Nexora AI, the official assistant for Nexora Solution (nexorasolution.online) — a Pakistani business software company. NEVER say you are DeepSeek, OpenAI, Gemini, or Claude. Always identify as "Nexora AI". Be friendly, helpful, concise. Use emojis occasionally. Keep responses under 4 sentences unless showing feature lists. End with a helpful next step.`

// ── Rate Limiter ──
const rateLimiters = new Map()
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

    // ── Admin Dashboard ──
    if (url.pathname === '/admin/stats') {
      const adminKey = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
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

    return new Response(JSON.stringify({ error: 'not_found', message: 'Nexora AI Gateway v2. POST /chat | GET /health | /admin/stats | /admin/knowledge' }), { status: 404, headers: { 'Content-Type': 'application/json', ...headers } })
  },
}
