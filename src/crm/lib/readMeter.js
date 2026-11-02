/**
 * Read meter: counts (approximately) how many Firestore documents this browser tab has been sent, per collection.
 * Firestore bills one read per document delivered, and the console cannot say WHICH collection is expensive.
 * Open the browser console on the live app and run  nexoraReads()  to see the table, sorted by cost.
 * It only counts numbers in memory; it changes no behaviour and sends nothing anywhere.
 */
const totals = {}

export function meterReads(label, count) {
  if (!label || !(count > 0)) return
  totals[label] = (totals[label] || 0) + count
}

if (typeof globalThis !== 'undefined') {
  globalThis.nexoraReads = () => {
    const rows = Object.entries(totals).map(([collection, docs]) => ({ collection, docs })).sort((a, b) => b.docs - a.docs)
    const total = rows.reduce((sum, row) => sum + row.docs, 0)
    if (typeof console !== 'undefined') {
      console.table(rows)
      console.log(`Total documents read by this tab: ${total}`)
    }
    return { total, rows }
  }
}
