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
    model: 'deepseek-v4-flash',
    headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    body: (model, messages, maxTokens) => JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7, stream: false }),
    parse: (data) => {
      const msg = data.choices?.[0]?.message || {}
      // ONLY use content — reasoning_content is internal chain-of-thought, not the answer
      const text = msg.content || ''
      return { text, usage: data.usage || {}, model: data.model }
    },
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

// ── Nexora AI Brain v2 — Permanent System Prompt ──
const BASE_PROMPT = `=== NEXORA AI BRAIN — PERMANENT IDENTITY ===

You are Nexora AI, an AI Business Consultant built by Nexora Solution. You are NOT a generic chatbot. You are NOT DeepSeek, OpenAI, Gemini, or Claude. You ALWAYS identify as "Nexora AI" and represent nexorasolution.online.

=== ROLE ===
You are a professional Nexora Business Consultant. Your job is to help users understand, purchase, and use Nexora products. You answer confidently from the knowledge base provided. You NEVER invent features, pricing, or capabilities. If you don't know something, clearly say: "I don't have that information right now — please contact sales for details."

=== ABOUT NEXORA SOLUTION ===
Nexora Solution is a Pakistani business software company based at nexorasolution.online. We build AI-powered POS, ERP, CRM, and business automation software for restaurants, retail stores, pharmacies, schools, transport fleets, and growing enterprises across Pakistan, UAE, Saudi Arabia, Bahrain, India, Bangladesh, and Afghanistan.

=== CORE PRODUCTS ===
- Restaurant POS — AI-powered restaurant management with KOT, table management, billing, kitchen display, inventory, and cloud sync
- Retail POS — Complete retail billing with barcode, discount engine, multi-counter, and inventory management
- Pharmacy POS — Medical store management with batch tracking, expiry alerts, and medicine inventory
- School ERP — Student records, fee management, attendance, exams, payroll, and parent portal
- CRM — Customer relationship management with lead tracking, pipeline, follow-ups, and WhatsApp integration
- Business Dashboard — Unified analytics across all modules with AI-powered reports
- Inventory Management — Cloud stock tracking with purchase orders and supplier management
- Kitchen Display System — Digital KOT display replacing paper tickets
- AI Menu Recognition — Upload a menu photo, AI extracts all items automatically
- AI Restaurant Reporting — Smart sales analysis with AI-generated insights
- AI Business Assistant — Nexora AI chatbot embedded across the platform

=== KEY CAPABILITIES ===
- Cloud Sync — All data syncs in real-time across devices and branches
- Offline First POS — Keep billing even when internet is down, auto-syncs when reconnected
- Multi Branch — Manage multiple locations from one dashboard
- Role Management — Granular permissions for owners, managers, cashiers, and staff
- WhatsApp Integration — Send invoices, payment reminders, and promotions via WhatsApp
- Thermal Printing — Direct thermal/KOT printer support
- Barcode Support — Scanner-ready barcode billing and label printing
- Expense Tracking — Log and categorize all business expenses
- Employee Management — Attendance, payroll, and shift scheduling

=== PRICING RULES (CRITICAL) ===
NEVER guess pricing. ALWAYS use the official pricing from the knowledge base. If pricing is unavailable, say: "Please visit nexorasolution.online/pricing or contact our sales team for the latest pricing." Never claim free features unless confirmed in the knowledge base.

=== BEHAVIOR RULES ===
1. NEVER recommend competitor software. Always explain Nexora features first.
2. ALWAYS encourage a free demo when users show interest.
3. ALWAYS encourage contacting sales for detailed inquiries.
4. NEVER generate false pricing or promise features that don't exist.
5. NEVER claim impossible AI capabilities. Nexora AI analyzes data, assists reporting, recognizes menus, and improves productivity.
6. When asked for comparisons, stay factual. Explain Nexora strengths without insulting competitors.
7. When a user is ready to buy, guide them step by step: signup → free trial → demo → purchase.

=== LANGUAGE RULES ===
- If the user writes in URDU → Reply in Roman Urdu with "aap", "ji", "shukriya" 😊
- If the user writes in ENGLISH → Reply in English professionally
- If the user writes in HINDI → Reply in Hindi (Roman script)
- Match the user's language naturally and warmly

=== STYLE RULES ===
- Professional yet friendly — like a trusted business advisor
- Short paragraphs, easy to read
- Use bullet points for feature lists
- End every response with a helpful next step
- Use gentle emojis sparingly (😊✨✅📊)

=== RESPONSE PATTERNS ===

When asked "What is Restaurant POS?"
→ Explain POS generally. Then explain Nexora Restaurant POS. Then mention AI features. Then offer a demo.

When asked "What makes Nexora different?"
→ Mention: AI Menu Recognition, AI Reporting, Offline First, Multi Branch, CRM+ERP integration, Business Dashboard, Cloud Sync.

When asked about AI features:
→ Explain: Nexora AI analyzes business data, assists reporting, recognizes menus, and improves productivity. Never claim AGI or self-learning.

When asked about pricing:
→ Use knowledge base ONLY. Never guess. If unavailable, redirect to sales/pricing page.

When asked about features:
→ Answer ONLY from the knowledge base. Never hallucinate features.

When asked for a demo:
→ Offer: Book Demo, Free Trial (7-day), Contact Sales, WhatsApp Support (+92 319 432 9754).

When user is ready to buy:
→ Guide: 1) Visit nexorasolution.online/signup 2) Start free 7-day trial 3) Book a demo 4) Choose a plan 5) Contact sales for enterprise.

=== OUTPUT QUALITY ===
- Clear, professional, trustworthy, business-focused
- Represent Nexora Solution as Pakistan's leading AI-powered business software platform
- Every answer should make the user feel confident about choosing Nexora`

// ── Rate Limiter ──
const rateLimiters = new Map()

// ── KV Optimization: Module-scoped caches ──
// Knowledge cache — avoids KV read on every request (10-min TTL)
let knowledgeCache = null
let knowledgeCacheTs = 0
const KNOWLEDGE_CACHE_TTL = 10 * 60 * 1000

// Analytics buffer — aggregates in memory, flushes every 15 min
let analyticsBuffer = {}
let lastAnalyticsFlush = 0
const ANALYTICS_FLUSH_INTERVAL = 15 * 60 * 1000

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

// ── Fallback knowledge (static, zero KV reads) ──
const FALLBACK_KNOWLEDGE = {
  products: `Restaurant POS — AI-powered restaurant management with KOT, table management, billing, kitchen display, inventory, cloud sync, waiter app.
Retail POS — Complete retail billing, barcode support, discount engine, multi-counter, inventory, customer ledger, GST/tax reports.
Pharmacy POS — Medical store management, batch tracking, expiry alerts, medicine inventory, sale/purchase, supplier management.
School ERP — Student records, fee management, attendance tracking, exam management, payroll, parent portal, timetable.
CRM — Lead tracking, pipeline management, customer follow-ups, deal tracking, invoice generation, WhatsApp integration.
Business Dashboard — Unified analytics dashboard with AI-powered reports, sales trends, profit/loss, multi-module overview.
Inventory Management — Cloud stock tracking, purchase orders, supplier management, stock alerts, barcode labels, GRN.
Kitchen Display System — Digital KOT display replacing paper tickets, real-time order updates, multiple kitchen stations.
AI Menu Recognition — Upload menu photo, AI extracts all items with names, prices, categories automatically.
AI Restaurant Reporting — Smart sales analysis, peak hour detection, item popularity ranking, AI-generated insights.
AI Business Assistant — Nexora AI chatbot embedded across all modules for instant help, reports, and navigation.`,
  features: `Cloud Sync — Real-time data sync across all devices and branches.
Offline First POS — Keep billing during internet downtime, auto-syncs when reconnected.
Multi Branch — Manage multiple locations from a single dashboard.
Role Management — Granular permissions for owners, managers, cashiers, staff.
WhatsApp Integration — Send invoices, payment reminders, promotions via WhatsApp.
Thermal Printing — Direct thermal printer and KOT printer support.
Barcode Support — Scanner-ready barcode billing and barcode label printing.
Expense Tracking — Log and categorize all business expenses.
Employee Management — Attendance, payroll, shift scheduling, performance tracking.
Multi Currency — Support for PKR, USD, AED, SAR, and more.
Data Encryption — Enterprise-grade security with encrypted cloud storage.
Daily Backup — Automatic daily cloud backups included in all plans.`,
  ai_features: `Nexora AI analyzes business data to provide actionable insights.
Nexora AI assists with automated reporting — sales reports, trend analysis, peak hour detection.
Nexora AI recognizes menus from photos — extract items, prices, and categories in seconds.
Nexora AI improves productivity by automating repetitive tasks like data entry and report generation.
Nexora AI is embedded across all modules as a conversational assistant for instant help.`,
  differentiators: `AI Menu Recognition — No other Pakistani POS offers camera-to-menu AI extraction.
AI Reporting — Smart insights, not just raw numbers.
Offline First — Works without internet, unlike most cloud POS systems.
All-in-One — POS + CRM + ERP + Inventory in one unified platform.
Pakistan Focused — Built specifically for Pakistani businesses with local tax, Urdu support, and local pricing.
Cloud Sync — Real-time sync across unlimited devices and branches.
Free Setup — Free data migration and staff training included.`,
  pricing: `7-Day Free Trial — No credit card required.
Basic Plan: PKR 1,000/month (50% OFF launch price, was PKR 2,000). 1 outlet, core POS, basic reports.
Standard Plan: PKR 3,000/month (was PKR 5,999). Up to 3 outlets, CRM, inventory, advanced reports, WhatsApp integration.
Enterprise Plan: Custom pricing. Unlimited outlets, all modules, API access, priority support, custom development.
Yearly Plans: 20% savings on annual billing.
All Plans Include: Cloud sync, daily backup, free updates, free setup, free data migration, free staff training.`,
  guarantees: `30-Day Money Back Guarantee — Full refund if not satisfied.
Lifetime Price Lock — Your subscription price never increases.
Free Setup & Data Migration — We set up your account and migrate existing data at no cost.
Free Staff Training — Live training for your team included.
WhatsApp Support — Direct chat support at +92 319 432 9754.
Email Support — hello@nexorasolution.online`,
  routes: `/ — Homepage.
/signup — Start free trial.
/pricing — All pricing plans.
/blog — Business insights and product guides.
/industries — Industries we serve.
/business-services — Custom development and consulting.
/about — About Nexora Solution.
/contact — Contact sales and support.
/reviews — Customer testimonials.
/faq — Frequently asked questions.
/documentation — Product documentation and guides.
/help-center — Help articles and troubleshooting.
/support-center — Submit support tickets.
/restaurant-pos — Restaurant POS details.
/retail-pos — Retail POS details.
/school-erp — School ERP details.
/whatsapp-crm — WhatsApp CRM details.
/solutions/crm — CRM software details.
/solutions/pos — POS solutions overview.
/solutions/inventory-management — Inventory management details.`,
  website: 'https://nexorasolution.online',
  contact: `WhatsApp: +92 319 432 9754
Email: hello@nexorasolution.online
Website: https://nexorasolution.online
Facebook: facebook.com/nexorasolution
Instagram: instagram.com/nexorasolution
LinkedIn: linkedin.com/company/nexorasolution
YouTube: youtube.com/@nexorasolution`,
}

// ── Load Knowledge from KV (with 10-min in-memory cache) ──
async function loadKnowledge(env) {
  // Return cached version if still fresh
  if (knowledgeCache && (Date.now() - knowledgeCacheTs) < KNOWLEDGE_CACHE_TTL) {
    return knowledgeCache
  }
  try {
    const cached = await env.AI_KV?.get('nexora-knowledge', 'json')
    if (cached) {
      knowledgeCache = cached
      knowledgeCacheTs = Date.now()
      return cached
    }
  } catch {}
  return FALLBACK_KNOWLEDGE
}

// ── Session Memory (KV) ──
async function getSession(sessionId, env) {
  if (!sessionId || !env.AI_KV) return []
  try {
    const data = await env.AI_KV.get(`session:${sessionId}`, 'json')
    return data?.messages || []
  } catch { return [] }
}

// ── Session deduplication via content hash ──
// Only writes to KV when session content actually changed
let sessionHashes = new Map()
let lastHashCleanup = Date.now()

function hashMessages(messages) {
  // Lightweight hash of last 3 messages (enough to detect meaningful change)
  const last = messages.slice(-3)
  let hash = 0
  for (const m of last) {
    const str = (m.role || '') + (m.content || '').slice(-80)
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
  }
  return hash
}

async function saveSession(sessionId, messages, env) {
  if (!sessionId || !env.AI_KV) return
  // Periodic cleanup: prevent unbounded Map growth
  if (Date.now() - lastHashCleanup > 3600000) { // Every hour
    sessionHashes.clear()
    lastHashCleanup = Date.now()
  }
  // Skip write if content hasn't changed since last save
  const newHash = hashMessages(messages)
  if (sessionHashes.get(sessionId) === newHash) return
  sessionHashes.set(sessionId, newHash)
  try {
    await env.AI_KV.put(`session:${sessionId}`, JSON.stringify({ messages: messages.slice(-20), updated: Date.now() }), { expirationTtl: 3600 })
  } catch (err) {
    console.error('[saveSession] KV write failed:', err.message)
  }
}

// ── Analytics: Buffered in-memory, flushed every 15 min via ctx.waitUntil ──
function bufferAnalytics(data) {
  const today = new Date().toISOString().slice(0, 10)
  if (!analyticsBuffer[today]) {
    analyticsBuffer[today] = { requests: 0, tokens: 0, errors: 0, responseTimes: [], questions: [] }
  }
  analyticsBuffer[today].requests++
  analyticsBuffer[today].tokens += data.tokens || 0
  if (data.error) analyticsBuffer[today].errors++
  if (data.responseTime) analyticsBuffer[today].responseTimes.push(data.responseTime)
  if (data.question) analyticsBuffer[today].questions.push(data.question.slice(0, 100))
}

function isFreePlan(env) {
  return env.FREE_PLAN === 'true' || env.ENVIRONMENT === 'development'
}

async function flushAnalytics(env) {
  if (isFreePlan(env) || !env.AI_KV) return
  if (Date.now() - lastAnalyticsFlush < ANALYTICS_FLUSH_INTERVAL) return
  const toFlush = analyticsBuffer
  analyticsBuffer = {}
  lastAnalyticsFlush = Date.now()
  for (const [day, stats] of Object.entries(toFlush)) {
    if (!stats.requests) continue
    try {
      const key = `analytics:${day}`
      const existing = await env.AI_KV.get(key, 'json')
      if (existing) {
        existing.requests += stats.requests
        existing.tokens += stats.tokens
        existing.errors += stats.errors
      }
      const merged = existing || stats
      await env.AI_KV.put(key, JSON.stringify(merged), { expirationTtl: 2592000 }) // 30 days
    } catch {}
  }
}

// Legacy wrapper — buffers instead of writing immediately
async function logAnalytics(env, data) {
  bufferAnalytics(data)
  // Don't await — fire-and-forget flush
}

// ── Call AI Provider ──
async function callProvider(providerKey, messages, maxTokens, env, opts = {}) {
  const provider = PROVIDERS[providerKey]
  if (!provider) throw new Error(`Unknown provider: ${providerKey}`)

  const apiKey = env[`${providerKey.toUpperCase()}_API_KEY`] || (providerKey === 'deepseek' ? env.DEEPSEEK_API_KEY : null)
  if (!apiKey) throw new Error(`${providerKey}: No API key configured`)

  const { skipSystemPrompt = false } = opts

  // Build the messages array — for translation requests, skip the business consultant system prompt
  let allMessages
  if (skipSystemPrompt) {
    // Translation mode: send only the user messages, no Nexora AI persona
    // Add a minimal system prompt that ensures clean translation output
    allMessages = [
      { role: 'system', content: 'You are a professional translator. Translate exactly as instructed. Output ONLY the translation — no greetings, no explanations, no extra text.' },
      ...messages,
    ]
  } else {
    // Normal chat mode: full Nexora AI persona + knowledge base
    const knowledge = await loadKnowledge(env)

    // Load latest blog knowledge for real-time awareness
    let blogContext = ''
    try {
      const blogIndex = env.AI_KV ? await env.AI_KV.get('blog-index', 'json') : null
      if (blogIndex?.blogs) {
        const latest = Object.values(blogIndex.blogs)
          .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''))
          .slice(0, 5)
        if (latest.length > 0) {
          blogContext = `\n=== LATEST BLOG KNOWLEDGE (auto-learned) ===\n${latest.map((b) => `• "${b.title}" — ${b.summary || ''} (Keywords: ${(b.keywords || []).slice(0, 5).join(', ')})`).join('\n')}\nWhen users ask about these topics, reference these articles. When users ask "what's new?", mention the most recent blog.`
        }
      }
    } catch { /* blogs unavailable */ }

    const systemMsg = { role: 'system', content: `${BASE_PROMPT}

=== KNOWLEDGE BASE ===

Products:
${knowledge.products || 'See nexorasolution.online'}

Features:
${knowledge.features || 'See nexorasolution.online'}

AI Capabilities:
${knowledge.ai_features || 'AI analyzes data, assists reporting, recognizes menus, improves productivity.'}

What Makes Nexora Different:
${knowledge.differentiators || 'AI-powered, offline-first, all-in-one platform built for Pakistani businesses.'}

Pricing:
${knowledge.pricing || 'Free trial available. Visit nexorasolution.online/pricing.'}

Guarantees:
${knowledge.guarantees || '30-day money back. Free setup and training.'}

Routes:
${knowledge.routes || '/signup, /pricing, /contact'}

Contact:
${knowledge.contact || 'WhatsApp: +92 319 432 9754 | Email: hello@nexorasolution.online'}

Website: ${knowledge.website || 'https://nexorasolution.online'}${blogContext}` }

    allMessages = [systemMsg, ...messages]
  }

  const url = provider.endpoint ? provider.endpoint(provider.baseUrl, apiKey) : `${provider.baseUrl}/v1/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: provider.headers(apiKey),
    body: provider.body(provider.model, allMessages, maxTokens),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'unknown')
    throw new Error(`${providerKey}: HTTP ${res.status} — ${errorText.slice(0, 200)}`)
  }
  const data = await res.json()
  const parsed = provider.parse(data)
  parsed.model = parsed.model || provider.model
  return parsed
}

// ── Main Handler ──
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    // Flush buffered analytics to KV every 15 min (fire-and-forget via waitUntil)
    ctx.waitUntil(flushAnalytics(env).catch((err) => console.error('[flushAnalytics] Error:', err.message)))

    // ── Health ──
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', providers: Object.keys(PROVIDERS), timestamp: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // ── Admin Dashboard (public stats — no auth required, last 7 days only) ──
    if (url.pathname === '/admin/stats') {
      const stats = { total: 0, byDay: {} }
      // Also include buffered in-memory analytics (not yet flushed to KV)
      for (const [day, buf] of Object.entries(analyticsBuffer)) {
        stats.total += buf.requests || 0
        stats.byDay[day] = { requests: buf.requests, tokens: buf.tokens, errors: buf.errors }
      }
      // Read only last 7 days from KV (not all keys)
      if (env.AI_KV) {
        const days = []
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          days.push(d.toISOString().slice(0, 10))
        }
        for (const day of days) {
          try {
            const existing = await env.AI_KV.get(`analytics:${day}`, 'json')
            if (existing) {
              stats.total += existing.requests || 0
              stats.byDay[day] = stats.byDay[day]
                ? { requests: stats.byDay[day].requests + (existing.requests || 0), tokens: (stats.byDay[day].tokens || 0) + (existing.tokens || 0), errors: (stats.byDay[day].errors || 0) + (existing.errors || 0) }
                : { requests: existing.requests, tokens: existing.tokens, errors: existing.errors, avgTime: existing.responseTimes?.length ? Math.round(existing.responseTimes.reduce((a,b) => a+b, 0) / existing.responseTimes.length) : 0, topQuestions: existing.questions?.slice(-5) || [] }
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
        // Validate required fields before writing to KV
        if (!knowledge || typeof knowledge !== 'object') {
          return new Response(JSON.stringify({ error: 'invalid_payload', message: 'Knowledge must be a JSON object' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }
        const required = ['products', 'pricing', 'guarantees', 'routes', 'website']
        const optional = ['features', 'ai_features', 'differentiators', 'contact']
        const allFields = [...required, ...optional]
        // Validate required fields
        const missing = required.filter((k) => !knowledge[k] || typeof knowledge[k] !== 'string')
        // Warn about unknown fields but don't reject
        const unknownFields = Object.keys(knowledge).filter((k) => !allFields.includes(k))
        if (missing.length > 0) {
          return new Response(JSON.stringify({ error: 'invalid_payload', message: `Missing or invalid fields: ${missing.join(', ')}` }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }
        if (env.AI_KV) {
          try {
            await env.AI_KV.put('nexora-knowledge', JSON.stringify(knowledge))
            // Invalidate cache so next request picks up new knowledge
            knowledgeCache = null
          } catch {}
        }
        return new Response(JSON.stringify({ success: true, fields_saved: Object.keys(knowledge).length, unknown_fields: unknownFields.length > 0 ? unknownFields : undefined }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Admin: Get Knowledge ──
    if (url.pathname === '/admin/knowledge' && request.method === 'GET') {
      const knowledge = await loadKnowledge(env)
      return new Response(JSON.stringify(knowledge), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // ── Admin: Push Blog Knowledge (from client-side ingestion pipeline) ──
    if (url.pathname === '/admin/blog-knowledge' && request.method === 'POST') {
      const adminKey = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
      try {
        const { slug, knowledge } = await request.json()
        if (!slug || !knowledge) {
          return new Response(JSON.stringify({ error: 'invalid_payload', message: 'slug and knowledge are required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }
        if (env.AI_KV) {
          // Store individual blog knowledge
          await env.AI_KV.put(`blog:${slug}`, JSON.stringify(knowledge), { expirationTtl: 7776000 }) // 90 days
          // Update blog index
          const indexRaw = await env.AI_KV.get('blog-index', 'json') || { blogs: {}, topics: {} }
          indexRaw.blogs[slug] = { title: knowledge.title, summary: knowledge.summary, keywords: knowledge.keywords, publishDate: knowledge.publishDate }
          // Index by keywords/topics
          const terms = [...(knowledge.keywords || []), ...(knowledge.majorTopics || []), ...(knowledge.products || [])]
          for (const term of terms) {
            const key = String(term).toLowerCase().trim()
            if (!key) continue
            if (!indexRaw.topics[key]) indexRaw.topics[key] = []
            if (!indexRaw.topics[key].includes(slug)) indexRaw.topics[key].push(slug)
          }
          // Keep max 100 blogs
          const slugs = Object.keys(indexRaw.blogs)
          if (slugs.length > 100) {
            const oldest = slugs.sort((a, b) => (indexRaw.blogs[a]?.publishDate || '').localeCompare(indexRaw.blogs[b]?.publishDate || '')).slice(0, slugs.length - 100)
            for (const s of oldest) {
              delete indexRaw.blogs[s]
              for (const t of Object.keys(indexRaw.topics)) {
                indexRaw.topics[t] = indexRaw.topics[t].filter(x => x !== s)
                if (indexRaw.topics[t].length === 0) delete indexRaw.topics[t]
              }
            }
          }
          await env.AI_KV.put('blog-index', JSON.stringify(indexRaw))
          // Invalidate cache
          knowledgeCache = null
        }
        return new Response(JSON.stringify({ success: true, slug }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Public: Get Latest Blogs ──
    if (url.pathname === '/blog-knowledge/latest' && request.method === 'GET') {
      try {
        const indexRaw = env.AI_KV ? await env.AI_KV.get('blog-index', 'json') : null
        const index = indexRaw || { blogs: {}, topics: {} }
        const blogs = Object.values(index.blogs || {})
          .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''))
          .slice(0, 5)
        return new Response(JSON.stringify({ blogs }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      } catch {
        return new Response(JSON.stringify({ blogs: [] }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Blog Knowledge Sync (from client ingestion pipeline) ──
    // Uses a shared BLOG_SYNC_KEY so the client can push without full admin access
    if (url.pathname === '/blog-knowledge/sync' && request.method === 'POST') {
      const syncKey = request.headers.get('X-Blog-Sync-Key') || ''
      if (!syncKey || (env.BLOG_SYNC_KEY && syncKey !== env.BLOG_SYNC_KEY)) {
        return new Response(JSON.stringify({ error: 'unauthorized', message: 'Valid X-Blog-Sync-Key required' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
      try {
        const { slug, knowledge } = await request.json()
        if (!slug || !knowledge) {
          return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }
        if (env.AI_KV) {
          await env.AI_KV.put(`blog:${slug}`, JSON.stringify(knowledge), { expirationTtl: 7776000 })
          // Update index
          const indexRaw = await env.AI_KV.get('blog-index', 'json') || { blogs: {}, topics: {} }
          indexRaw.blogs[slug] = { title: knowledge.title, summary: knowledge.summary, keywords: knowledge.keywords || [], majorTopics: knowledge.majorTopics || [], publishDate: knowledge.publishDate }
          const terms = [...(knowledge.keywords || []), ...(knowledge.majorTopics || []), ...(knowledge.products || [])]
          for (const term of terms) {
            const key = String(term).toLowerCase().trim()
            if (!key) continue
            if (!indexRaw.topics[key]) indexRaw.topics[key] = []
            if (!indexRaw.topics[key].includes(slug)) indexRaw.topics[key].push(slug)
          }
          await env.AI_KV.put('blog-index', JSON.stringify(indexRaw))
          knowledgeCache = null
        }
        return new Response(JSON.stringify({ success: true, slug }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
      }
    }

    // ── Chat ──
    if (url.pathname === '/chat' && request.method === 'POST') {
      if (!checkRateLimit(ip, 100, 60)) {
        return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), { status: 429, headers: { 'Content-Type': 'application/json', ...headers } })
      }

      try {
        const body = await request.json()
        const { messages = [], maxTokens = 500, sessionId, provider: reqProvider = 'deepseek', purpose } = body
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response(JSON.stringify({ error: 'Messages required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        // Session memory
        let history = []
        if (sessionId) {
          history = await getSession(sessionId, env)
        }
        const allMessages = [...history, ...messages]

        // Translation requests: skip system prompt, allow larger output, no session save
        const isTranslation = purpose === 'translation'

        // Try providers in order with automatic fallback — ensures AI never goes down
        const FALLBACK_ORDER = [reqProvider, 'deepseek', 'gemini', 'openai', 'claude'].filter((p, i, a) => a.indexOf(p) === i) // dedupe
        const errors = []
        let result = null
        let modelUsed = ''
        const startTime = Date.now()

        // Translation: allow up to 16K output tokens (blog posts can be long)
        // Normal chat: cap at 4K to prevent runaway costs
        const effectiveMaxTokens = isTranslation
          ? Math.min(maxTokens, 16384)
          : Math.min(maxTokens, 4096)

        for (const providerKey of FALLBACK_ORDER) {
          try {
            result = await callProvider(providerKey, allMessages, effectiveMaxTokens, env, { skipSystemPrompt: isTranslation })
            modelUsed = result.model || providerKey
            break
          } catch (e) {
            errors.push(`${providerKey}: ${e.message}`)
          }
        }

        if (!result) {
          ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true, question: `[ALL_FAILED] ${errors.join(' | ')}` }))
          return new Response(JSON.stringify({ error: 'ai_service_error', message: 'AI service is temporarily unavailable. Please try again.', errors }), { status: 502, headers: { 'Content-Type': 'application/json', ...headers } })
        }

        const responseTime = Date.now() - startTime

        // Save session in background — response never waits for KV (skip for translation)
        if (sessionId && !isTranslation) {
          ctx.waitUntil(saveSession(sessionId, [...allMessages, { role: 'assistant', content: result.text }], env))
        }

        // Log analytics
        ctx.waitUntil(logAnalytics(env, {
          tokens: result.usage?.total_tokens || 0,
          responseTime,
          question: messages[messages.length - 1]?.content || '',
        }))

        return new Response(JSON.stringify({ text: result.text, usage: result.usage, model: modelUsed, responseTime }), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })

      } catch (error) {
        ctx.waitUntil(logAnalytics(env, { tokens: 0, error: true, question: `[FATAL] ${error.message}` }))
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
                  model: env.DEFAULT_MODEL || 'deepseek-v4-flash',
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
                    modelUsed = 'cloudflare-ocr+deepseek-v4-flash'
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
          // Menu import stats: only write if not on free plan, with error guard
          if (!isFreePlan(env) && env.AI_KV) {
            try {
              const today = new Date().toISOString().slice(0, 10)
              const key = `menu-import:${today}`
              const existing = await env.AI_KV.get(key, 'json') || { imports: 0, items: 0 }
              existing.imports++
              existing.items += items.length
              await env.AI_KV.put(key, JSON.stringify(existing), { expirationTtl: 2592000 })
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
          model: env.DEFAULT_MODEL || 'deepseek-v4-flash',
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

    // ── Menu Import Stats (Admin, last 7 days only) ──
    if (url.pathname === '/menu-import/stats' && request.method === 'GET') {
      const adminKey = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (adminKey !== env.ADMIN_KEY && env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...headers } })
      }
      const importStats = { totalImports: 0, totalItemsExtracted: 0, byDay: {} }
      if (env.AI_KV) {
        try {
          const days = []
          for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push(d.toISOString().slice(0, 10))
          }
          for (const day of days) {
            try {
              const data = await env.AI_KV.get(`menu-import:${day}`, 'json')
              if (data) {
                importStats.totalImports += data.imports || 0
                importStats.totalItemsExtracted += data.items || 0
                importStats.byDay[day] = data
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
