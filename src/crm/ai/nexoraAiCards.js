/** Cards (order / order draft) the chat renders from tool results. */

/** Result card for a tool result, or null. */
export function cardFromToolResult(result) {
  if (!result || typeof result !== 'object') return null
  if (result.card === 'order' && result.order) {
    return { kind: 'order', key: `order:${result.order.orderNumber}`, currency: result.currency, order: result.order }
  }
  if (result.card === 'order_draft' && result.draft) {
    return {
      kind: 'order_draft', key: 'order_draft', currency: result.currency, draft: result.draft,
      unmatched: result.unmatched || [], unavailable: result.unavailable || [], readyToConfirm: result.readyToConfirm === true,
    }
  }
  return null
}

