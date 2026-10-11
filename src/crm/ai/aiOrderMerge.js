/** Pure helper: local + Firestore + invoice orders, one entry per logical order number. */

const orderKey = (order) => String(order?.orderNumber || '').replace(/^(W-|D-|#)/, '')

export function mergeAiOrders(localOrders = [], firestoreOrders = [], invoiceOrders = []) {
  const out = []
  const seen = new Set()
  for (const list of [localOrders, firestoreOrders, invoiceOrders]) {
    for (const order of Array.isArray(list) ? list : []) {
      const key = orderKey(order)
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      out.push(order)
    }
  }
  return out
}
