/**
 * Nexora AI — browser client for the gateway's authenticated /ai/chat endpoint.
 *
 * Runs the tool loop: ask the gateway, execute any requested tools locally
 * (restaurantAiTools.js, against the signed-in user's own data), send the
 * results back, repeat until the model answers in plain text.
 *
 * Only user/assistant TEXT is kept between turns. Tool calls and results live
 * for the duration of one turn, so conversations stay small and old data is
 * never replayed to the model as if it were current.
 */

import { serializeToolResult } from './restaurantAiTools.js'
import { cardFromToolResult } from './nexoraAiCards.js'

export const NEXORA_AI_GATEWAY_URL =
  import.meta.env?.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'

export const MAX_TOOL_ROUNDS = 5
export const MAX_HISTORY_MESSAGES = 12

export class NexoraAiError extends Error {
  constructor(code, message = '') {
    super(message || code)
    this.name = 'NexoraAiError'
    this.code = code
  }
}

function codeForStatus(status) {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate'
  if (status === 413) return 'too_long'
  if (status >= 500) return 'unavailable'
  return 'unknown'
}

/** Keep the last N text turns, starting on a user message. */
export function trimHistory(history, max = MAX_HISTORY_MESSAGES) {
  const clean = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }))
  const tail = clean.slice(-max)
  while (tail.length && tail[0].role !== 'user') tail.shift()
  return tail
}

async function postChat({ gatewayUrl, token, body, fetchImpl, signal }) {
  let res
  try {
    res = await fetchImpl(`${gatewayUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw new NexoraAiError('aborted')
    throw new NexoraAiError('network', error?.message)
  }
  if (!res.ok) throw new NexoraAiError(codeForStatus(res.status), `HTTP ${res.status}`)
  try {
    return await res.json()
  } catch {
    throw new NexoraAiError('unavailable', 'Bad response from the AI service.')
  }
}

/**
 * Run one user turn.
 *
 * @param {object}   p
 * @param {Array}    p.history    prior { role, content } text turns
 * @param {string}   p.userText   the new question
 * @param {object}   p.context    { businessName, currency, role, language, todayISO, timezone }
 * @param {Function} p.getToken   async (forceRefresh?: boolean) => Firebase ID token
 * @param {Function} p.runTool    async (name, args) => { ok, result }
 * @param {Function} [p.onStatus] called with { tool } before each tool runs
 * @returns {Promise<{ text: string, cards: Array, toolsUsed: string[], model?: string }>}
 */
export async function runNexoraAiTurn({
  history = [],
  userText,
  context = {},
  getToken,
  runTool,
  onStatus,
  gatewayUrl = NEXORA_AI_GATEWAY_URL,
  fetchImpl = (...args) => fetch(...args),
  signal,
  maxRounds = MAX_TOOL_ROUNDS,
} = {}) {
  const question = String(userText || '').trim()
  if (!question) throw new NexoraAiError('unknown', 'Empty question.')

  const messages = [...trimHistory(history), { role: 'user', content: question }]
  const cards = new Map()
  const toolsUsed = []
  let refreshed = false

  for (let round = 0; round < maxRounds; round += 1) {
    let token = await getToken(false)
    if (!token) throw new NexoraAiError('auth')

    let data
    try {
      data = await postChat({ gatewayUrl, token, body: { messages, context }, fetchImpl, signal })
    } catch (error) {
      // An expired ID token is the common 401: refresh once, then retry the same round.
      if (error?.code === 'auth' && !refreshed) {
        refreshed = true
        token = await getToken(true)
        if (!token) throw error
        data = await postChat({ gatewayUrl, token, body: { messages, context }, fetchImpl, signal })
      } else {
        throw error
      }
    }

    if (data?.type === 'tool_calls' && Array.isArray(data.toolCalls) && data.toolCalls.length) {
      messages.push({ role: 'assistant', content: data.text || '', toolCalls: data.toolCalls })
      for (const call of data.toolCalls) {
        onStatus?.({ tool: call.name })
        toolsUsed.push(call.name)
        const { result } = await runTool(call.name, call.arguments || {})
        const card = cardFromToolResult(result)
        if (card) cards.set(card.key, card)
        messages.push({ role: 'tool', toolCallId: call.id, name: call.name, content: serializeToolResult(result) })
      }
      continue
    }

    const text = String(data?.text || '').trim()
    if (!text) throw new NexoraAiError('unavailable', 'Empty answer.')
    return { text, cards: Array.from(cards.values()), toolsUsed, model: data.model }
  }

  throw new NexoraAiError('too_many_steps')
}
