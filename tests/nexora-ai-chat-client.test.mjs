/**
 * Nexora AI chat client, text helpers and order printing.
 * Includes an end-to-end test: the real client talks to the real gateway worker
 * (provider and Firebase JWKS mocked) and runs the real tool executors.
 */
import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

import worker from '../workers/nexora-ai-gateway/src/index.js'
import { resetUidRateLimit } from '../workers/nexora-ai-gateway/src/aiChat.js'
import { AI_TOOL_NAMES } from '../workers/nexora-ai-gateway/src/aiTools.js'
import { MAX_HISTORY_MESSAGES, NexoraAiError, runNexoraAiTurn, trimHistory } from '../src/crm/ai/nexoraAiClient.js'
import { runRestaurantAiTool } from '../src/crm/ai/restaurantAiTools.js'
import {
  AI_LANGUAGES,
  detectLanguage,
  effectiveLanguage,
  formatMoneyLabel,
  friendlyError,
  parseBlocks,
  parseInline,
  suggestionsFor,
  textDirection,
  toolStatusLabel,
} from '../src/crm/ai/nexoraAiText.js'
import { buildAiOrderReceipt } from '../src/crm/ai/nexoraAiPrint.js'
import { mergeAiOrders } from '../src/crm/ai/aiOrderMerge.js'

const GATEWAY = 'https://gw.example'

// ── text helpers ─────────────────────────────────────────────────────────────

test('language detection: Urdu script, Roman Urdu and English', () => {
  assert.equal(detectLanguage('آج کی سیل کتنی ہے؟'), 'ur')
  assert.equal(detectLanguage('Aaj ki sale kitni hui?'), 'roman-ur')
  assert.equal(detectLanguage('mujhe order 1002 dikhao'), 'roman-ur')
  assert.equal(detectLanguage('How are today\'s sales?'), 'en')
  assert.equal(detectLanguage('Show order 1002'), 'en')
  assert.equal(detectLanguage(''), 'en')
})

test('effective language honours an explicit setting, auto follows the user', () => {
  assert.equal(effectiveLanguage('en', 'aaj ki sale kitni'), 'en')
  assert.equal(effectiveLanguage('ur', 'hello'), 'ur')
  assert.equal(effectiveLanguage('auto', 'آج'), 'ur')
  assert.equal(effectiveLanguage('auto', ''), 'roman-ur', 'default for the Pakistani market before the first message')
  assert.deepEqual(AI_LANGUAGES.map((l) => l.value), ['auto', 'ur', 'roman-ur', 'en'])
})

test('text direction, suggestions, status labels and error labels exist in all languages', () => {
  assert.equal(textDirection('سیل'), 'rtl')
  assert.equal(textDirection('sale'), 'ltr')
  for (const lang of ['en', 'roman-ur', 'ur']) {
    assert.equal(suggestionsFor(lang).length, 6)
    for (const tool of AI_TOOL_NAMES) assert.notEqual(toolStatusLabel(tool, lang), toolStatusLabel('_default', lang), `${lang}:${tool}`)
    for (const code of ['auth', 'rate', 'too_long', 'unavailable', 'network', 'too_many_steps', 'no_data', 'aborted', 'unknown']) {
      assert.ok(friendlyError(code, lang).length > 3, `${lang}:${code}`)
    }
  }
  assert.equal(friendlyError('nonsense', 'en'), friendlyError('unknown', 'en'))
})

test('markdown parsing is plain-segment only: bold, bullets, numbers, headings, no HTML', () => {
  assert.deepEqual(parseInline('Total **PKR 2,200** today'), [
    { text: 'Total ', bold: false }, { text: 'PKR 2,200', bold: true }, { text: ' today', bold: false },
  ])
  const blocks = parseBlocks('## Summary\nSales are up.\n\n- Karahi\n* Zinger\n• Fries\n\n1. First\n2) Second')
  assert.deepEqual(blocks.map((b) => b.type), ['p', 'ul', 'ol'])
  assert.equal(blocks[0].items.length, 2, 'heading line and the next line share one paragraph block')
  assert.equal(blocks[0].items[0][0].bold, true, 'heading becomes a bold paragraph')
  assert.equal(blocks[1].items.length, 3)
  assert.equal(blocks[2].items.length, 2)
  const evil = parseBlocks('<img src=x onerror=alert(1)> **<b>hi</b>**')
  assert.equal(evil[0].items[0].map((s) => s.text).join(''), '<img src=x onerror=alert(1)> <b>hi</b>', 'markup stays literal text')
  assert.deepEqual(parseBlocks('   \n\n'), [])
  assert.equal(formatMoneyLabel(12500, 'PKR'), 'PKR 12,500')
  assert.equal(formatMoneyLabel('x'), '—')
})

// ── history ──────────────────────────────────────────────────────────────────

test('trimHistory keeps text turns only, caps the length and starts on a user turn', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }))
  const trimmed = trimHistory([...many, { role: 'tool', content: 'x' }, { role: 'assistant', content: '   ' }, null])
  assert.ok(trimmed.length <= MAX_HISTORY_MESSAGES)
  assert.equal(trimmed[0].role, 'user')
  assert.ok(trimmed.every((m) => m.role === 'user' || m.role === 'assistant'))
  assert.deepEqual(trimHistory('nope'), [])
})

// ── client loop with a stub gateway ─────────────────────────────────────────

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const baseArgs = (overrides = {}) => ({
  history: [],
  userText: 'aaj ki sale?',
  context: { currency: 'PKR' },
  getToken: async () => 'tok',
  runTool: async () => ({ ok: true, result: { ok: 1 } }),
  gatewayUrl: GATEWAY,
  ...overrides,
})

test('tool loop: executes tools, sends results back, collects cards, reports status', async () => {
  const requests = []
  const replies = [
    json(200, { type: 'tool_calls', text: '', toolCalls: [
      { id: 'c1', name: 'get_order_details', arguments: { orderNumber: '1002' } },
      { id: 'c2', name: 'get_business_summary', arguments: { period: 'today' } },
    ] }),
    json(200, { type: 'message', text: 'Order 1002 ka total PKR 1,200 hai.', model: 'm' }),
  ]
  const statuses = []
  const out = await runNexoraAiTurn(baseArgs({
    fetchImpl: async (url, init) => { requests.push({ url, init, body: JSON.parse(init.body) }); return replies.shift() },
    onStatus: (s) => statuses.push(s.tool),
    runTool: async (name) => (name === 'get_order_details'
      ? { ok: true, result: { found: true, card: 'order', currency: 'PKR', order: { orderNumber: 'D-1002', items: [] } } }
      : { ok: true, result: { sales: { total: 2200 } } }),
  }))
  assert.equal(out.text, 'Order 1002 ka total PKR 1,200 hai.')
  assert.deepEqual(out.toolsUsed, ['get_order_details', 'get_business_summary'])
  assert.deepEqual(statuses, ['get_order_details', 'get_business_summary'])
  assert.equal(out.cards.length, 1)
  assert.equal(out.cards[0].kind, 'order')
  assert.equal(requests[0].url, `${GATEWAY}/ai/chat`)
  assert.equal(requests[0].init.headers.Authorization, 'Bearer tok')
  const second = requests[1].body.messages
  assert.deepEqual(second.map((m) => m.role), ['user', 'assistant', 'tool', 'tool'])
  assert.equal(second[1].toolCalls.length, 2)
  assert.equal(second[2].toolCallId, 'c1')
  assert.match(second[3].content, /2200/)
})

test('an order draft result becomes a draft card that carries its warnings', async () => {
  const replies = [
    json(200, { type: 'tool_calls', toolCalls: [{ id: 'c1', name: 'propose_order', arguments: {} }] }),
    json(200, { type: 'message', text: 'Draft ready.' }),
  ]
  const out = await runNexoraAiTurn(baseArgs({
    fetchImpl: async () => replies.shift(),
    runTool: async () => ({ ok: true, result: { card: 'order_draft', currency: 'PKR', draft: { lines: [] }, unmatched: [{ requested: 'x' }], unavailable: [], readyToConfirm: false } }),
  }))
  assert.equal(out.cards[0].kind, 'order_draft')
  assert.equal(out.cards[0].readyToConfirm, false)
  assert.equal(out.cards[0].unmatched.length, 1)
})

test('an expired token (401) is refreshed once and the round retried', async () => {
  const tokens = []
  let calls = 0
  const out = await runNexoraAiTurn(baseArgs({
    getToken: async (force) => { tokens.push(Boolean(force)); return force ? 'fresh' : 'stale' },
    fetchImpl: async (url, init) => {
      calls += 1
      return init.headers.Authorization === 'Bearer fresh' ? json(200, { type: 'message', text: 'ok' }) : json(401, { error: 'unauthorized' })
    },
  }))
  assert.equal(out.text, 'ok')
  assert.equal(calls, 2)
  assert.deepEqual(tokens, [false, true])
})

test('errors map to stable codes', async () => {
  const code = async (fetchImpl, extra = {}) => {
    try { await runNexoraAiTurn(baseArgs({ fetchImpl, ...extra })); return 'no-error' } catch (e) { assert.ok(e instanceof NexoraAiError); return e.code }
  }
  assert.equal(await code(async () => json(401, {}), { getToken: async () => 'same' }), 'auth')
  assert.equal(await code(async () => json(429, {})), 'rate')
  assert.equal(await code(async () => json(413, {})), 'too_long')
  assert.equal(await code(async () => json(503, {})), 'unavailable')
  assert.equal(await code(async () => json(502, {})), 'unavailable')
  assert.equal(await code(async () => { throw new TypeError('Failed to fetch') }), 'network')
  assert.equal(await code(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) }), 'aborted')
  assert.equal(await code(async () => json(200, { type: 'message', text: '  ' })), 'unavailable')
  assert.equal(await code(async () => json(200, { type: 'message', text: 'hi' }), { getToken: async () => '' }), 'auth')
  assert.equal(await code(async () => json(200, {}), { userText: '   ' }), 'unknown')
})

test('a model that never stops asking for tools is cut off', async () => {
  let rounds = 0
  const err = await runNexoraAiTurn(baseArgs({
    maxRounds: 3,
    fetchImpl: async () => { rounds += 1; return json(200, { type: 'tool_calls', toolCalls: [{ id: `c${rounds}`, name: 'get_tables_status', arguments: {} }] }) },
  })).catch((e) => e)
  assert.equal(err.code, 'too_many_steps')
  assert.equal(rounds, 3)
})

// ── end to end: real client + real gateway + real tool executors ─────────────

const PROJECT = 'nexora-business-suite'
const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', publicKey)), kid: 'kid1', alg: 'RS256', use: 'sig' }
const b64url = (v) => Buffer.from(v).toString('base64url')
async function idToken(sub) {
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: 'kid1' }))
  const p = b64url(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub, iat: now, exp: now + 3600 }))
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`
}

let realFetch
let providerCalls
beforeEach(() => { resetUidRateLimit(); realFetch = globalThis.fetch; providerCalls = [] })
afterEach(() => { globalThis.fetch = realFetch })

test('end to end: question → gateway → tool run in the browser → grounded answer', async () => {
  const at = (h) => new Date(2026, 9, 11, h, 0, 0).toISOString()
  const data = {
    orders: [{ id: 'o1', orderNumber: 'D-1001', createdAt: at(13), orderType: 'Dine-in', paymentStatus: 'paid', orderStatus: 'served', paymentMethod: 'Cash', items: [{ id: 'z', name: 'Zinger Burger', quantity: 2, price: 450, sellingPrice: 450 }], subtotal: 900, total: 1000, paidAmount: 1000, dueAmount: 0 }],
    customers: [], menuItems: [], expenses: [], cashSessions: [], refunds: [], ingredients: [], tables: [],
    settings: { restaurantPos: { openingTime: '09:00', closingTime: '23:00' } }, currency: 'PKR',
  }
  const providerReplies = [
    { model: 'm', choices: [{ message: { content: '', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_business_summary', arguments: '{"period":"today"}' } }] } }] },
    { model: 'm', choices: [{ message: { content: 'Aaj ki sale **PKR 1,000** hai.' } }] },
  ]
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    providerCalls.push(JSON.parse(init.body))
    return new Response(JSON.stringify(providerReplies.shift()))
  }
  const env = { DEEPSEEK_API_KEY: 'sk-test-deepseek-key-1234567890' }
  const token = await idToken('owner-9')
  const gatewayFetch = (url, init) => worker.fetch(new Request(url, init), env, { waitUntil() {} })

  const out = await runNexoraAiTurn({
    userText: 'Aaj ki sale kitni hui?',
    context: { businessName: 'Shandar Ice Cream', currency: 'PKR', role: 'owner', language: 'roman-ur', todayISO: '2026-10-11' },
    getToken: async () => token,
    runTool: async (name, args) => runRestaurantAiTool(name, args, data, { role: 'owner', now: new Date(2026, 9, 11, 17, 0, 0) }),
    gatewayUrl: GATEWAY,
    fetchImpl: gatewayFetch,
  })

  assert.equal(out.text, 'Aaj ki sale **PKR 1,000** hai.')
  assert.deepEqual(out.toolsUsed, ['get_business_summary'])
  // The second provider request must carry the REAL tool result computed in the browser.
  const toolMsg = providerCalls[1].messages.find((m) => m.role === 'tool')
  assert.equal(toolMsg.tool_call_id, 'call_1')
  assert.equal(JSON.parse(toolMsg.content).sales.total, 1000)
  assert.match(providerCalls[0].messages[0].content, /Roman Urdu/)
  assert.match(providerCalls[0].messages[0].content, /Shandar Ice Cream/)
})

// ── printing and order merging ───────────────────────────────────────────────

test('order receipt reuses the POS bill template, escapes names and shows totals', () => {
  const order = {
    orderNumber: 'D-1002', type: 'Takeaway', table: '', customer: 'Bilal', paymentMethod: 'Cash',
    time: '2026-10-11T09:00:00.000Z',
    items: [{ name: 'Karahi <b>XL</b>', quantity: 1, unitPrice: 1200, lineTotal: 1200 }, { name: 'Cold Drink', quantity: 2, unitPrice: 100, lineTotal: 200 }],
    subtotal: 1400, discount: 200, serviceCharges: 0, tax: 0, total: 1200, paid: 700, due: 500,
  }
  const { html, thermalText } = buildAiOrderReceipt(order, { restaurantName: 'Shandar Ice Cream' })
  assert.match(html, /D-1002/)
  assert.match(html, /Shandar Ice Cream/)
  assert.match(html, /Karahi &lt;b&gt;XL&lt;\/b&gt;/)
  assert.doesNotMatch(html, /<b>XL<\/b>/)
  assert.match(html, /Balance Due/)
  assert.match(thermalText, /D-1002/)
  assert.match(thermalText, /Cold Drink/)
})

test('mergeAiOrders dedupes W-/D-/# prefixed duplicates and keeps first occurrence', () => {
  const merged = mergeAiOrders(
    [{ orderNumber: '#1080', src: 'local' }],
    [{ orderNumber: 'D-1080', src: 'fs' }, { orderNumber: 'D-1081', src: 'fs' }, { orderNumber: '', src: 'blank' }],
    [{ orderNumber: 'W-1081', src: 'inv' }, { orderNumber: 'INV-5', src: 'inv' }],
  )
  assert.deepEqual(merged.map((o) => `${o.orderNumber}:${o.src}`), ['#1080:local', 'D-1081:fs', ':blank', 'INV-5:inv'])
})
