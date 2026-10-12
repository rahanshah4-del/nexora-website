/**
 * Nexora AI — local engine. Answers from the owner's own data with no AI
 * service: parse the question (nexoraAiNlu), run the same tool executors the
 * Reports use, and phrase the result (nexoraAiAnswers). Free and offline.
 *
 * Returns null when the question is not understood, so the caller can fall
 * back to the AI service (if available) or show a friendly hint.
 */

import { runRestaurantAiTool } from './restaurantAiTools.js'
import { parseQuestion } from './nexoraAiNlu.js'
import { buildAnswer, menuAnswer, itemPriceAnswer, orderHowTo, tableOrderAnswer, helpText, smallTalk, notPermitted, toolFailed, periodArgs } from './nexoraAiAnswers.js'
import { detectLanguage } from './nexoraAiText.js'
import { cardFromToolResult } from './nexoraAiCards.js'
import { DEFAULT_CURRENCY } from '../lib/workspaceCurrency.js'

export { cardFromToolResult }

function planFor(parsed) {
  const pa = periodArgs(parsed.period)
  switch (parsed.intent) {
    case 'summary': return { tool: 'get_business_summary', args: pa }
    case 'compare': return { tool: 'get_business_summary', args: { period: 'today' }, other: { tool: 'get_business_summary', args: { period: 'yesterday' } } }
    case 'sales_by': return { tool: 'get_sales_report', args: { ...pa, groupBy: parsed.args.groupBy } }
    case 'item_sales': return { tool: 'get_sales_report', args: { ...pa, groupBy: 'item' } }
    case 'top_items': return { tool: 'get_top_items', args: { ...pa, ...(parsed.args || {}), limit: parsed.args?.limit || 5 } }
    case 'list_orders': return { tool: 'list_orders', args: { ...pa, ...(parsed.args || {}) } }
    case 'order_details': return { tool: 'get_order_details', args: { orderNumber: parsed.orderNumber } }
    case 'inventory': return { tool: 'get_inventory_status', args: { lowStockOnly: true } }
    case 'customers': return { tool: 'get_customers_summary', args: pa }
    case 'tables': return { tool: 'get_tables_status', args: {} }
    case 'expenses': return { tool: 'get_expenses_summary', args: pa }
    case 'cash': return { tool: 'get_cash_session_summary', args: pa }
    case 'kitchen': return { tool: 'get_kitchen_status', args: {} }
    case 'place_order': return { tool: 'propose_order', args: parsed.args }
    default: return null
  }
}

/**
 * @param {string} question
 * @param {object} data     POS snapshot (same as runRestaurantAiTool)
 * @param {{role?: string, now?: Date, language?: string, context?: object}} [opts]
 * @returns {null | { text, cards, toolsUsed, intent, context }}
 */
export function answerLocally(question, data = {}, { role, now = new Date(), language = 'auto', context = null } = {}) {
  const lang = language === 'ur' || language === 'roman-ur' || language === 'en' ? language : detectLanguage(question)
  const parsed = parseQuestion(question, { menu: data.menuItems, tables: data.tables, context, now })

  if (parsed.intent === 'unknown') return null
  if (parsed.intent === 'help') return { text: helpText(lang), cards: [], toolsUsed: [], intent: 'help', context: null }
  if (parsed.intent === 'greeting' || parsed.intent === 'thanks') {
    return { text: smallTalk(parsed.intent, lang), cards: [], toolsUsed: [], intent: parsed.intent, context }
  }

  if (parsed.intent === 'menu' || parsed.intent === 'item_price') {
    const currency = data.currency || DEFAULT_CURRENCY
    const text = parsed.intent === 'menu' ? menuAnswer(data.menuItems, parsed.args, lang, currency) : itemPriceAnswer(parsed.item, lang, currency)
    return { text, cards: [], toolsUsed: [], intent: parsed.intent, context: null }
  }

  if (parsed.intent === 'place_order' && !(parsed.args?.items?.length)) {
    return { text: orderHowTo(lang), cards: [], toolsUsed: [], intent: 'place_order', context: null }
  }

  if (parsed.intent === 'table_order') {
    const wanted = String(parsed.tableName || '').toLowerCase().replace(/[\s-]/g, '')
    const mine = (Array.isArray(data.orders) ? data.orders : []).filter((o) => String(o?.table || '').toLowerCase().replace(/[\s-]/g, '') === wanted && String(o?.orderStatus || '').toLowerCase() !== 'cancelled')
    const active = mine.filter((o) => !(String(o.paymentStatus || '').toLowerCase() === 'paid' && ['served', 'ready'].includes(String(o.orderStatus || '').toLowerCase())))
    const pickOrder = [...active].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
    if (!pickOrder) return { text: tableOrderAnswer(null, parsed.tableName, lang), cards: [], toolsUsed: [], intent: 'table_order', context: null }
    const res = runRestaurantAiTool('get_order_details', { orderNumber: pickOrder.orderNumber }, data, { role, now })
    if (!res.ok) return { text: res.result?.error === 'not_permitted' ? notPermitted(lang) : toolFailed(lang), cards: [], toolsUsed: ['get_order_details'], intent: 'table_order', context: null }
    const card = cardFromToolResult(res.result)
    return { text: res.result.found ? tableOrderAnswer(res.result, parsed.tableName, lang) : tableOrderAnswer(null, parsed.tableName, lang), cards: card ? [card] : [], toolsUsed: ['get_order_details'], intent: 'table_order', context: null }
  }
  const plan = planFor(parsed)
  if (!plan) return null

  const main = runRestaurantAiTool(plan.tool, plan.args, data, { role, now })
  const toolsUsed = [plan.tool]
  if (!main.ok) {
    return { text: main.result?.error === 'not_permitted' ? notPermitted(lang) : toolFailed(lang), cards: [], toolsUsed, intent: parsed.intent, context }
  }
  if (main.result?.error) return null
  const results = { main: main.result }
  if (plan.other) {
    const other = runRestaurantAiTool(plan.other.tool, plan.other.args, data, { role, now })
    if (!other.ok) return { text: toolFailed(lang), cards: [], toolsUsed, intent: parsed.intent, context }
    results.other = other.result
  }

  const card = cardFromToolResult(main.result)
  return {
    text: buildAnswer(parsed, results, lang, data.currency || DEFAULT_CURRENCY),
    cards: card ? [card] : [],
    toolsUsed,
    intent: parsed.intent,
    wantPrint: parsed.wantPrint,
    // remembered for follow-ups like "aur kal?"
    context: ['order_details', 'place_order'].includes(parsed.intent) ? null : { intent: parsed.intent, focus: parsed.focus, bestDay: parsed.bestDay, args: parsed.args, profit: parsed.profit, slowest: parsed.slowest, item: parsed.item, peak: parsed.peak },
  }
}
