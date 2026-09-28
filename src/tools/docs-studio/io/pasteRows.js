/**
 * Tab-separated rows pasted from Excel / Google Sheets → line items.
 *
 * Column layout is inferred from the number of cells:
 *   2 cells  description, unit price               (qty 1)
 *   3 cells  description, qty, unit price
 *   4+ cells description, qty, unit, unit price     (extra cells ignored)
 * A first row whose number cells are not numbers is treated as a header.
 * Numbers are read in the document's locale ("1.234,50" in de-DE).
 */

import { normalizeDecimalInput, parseMoneyInput, parseScaledDecimal } from '../engine/index.js'

export const MAX_PASTED_ROWS = 200

/** True when the clipboard text looks like spreadsheet cells, not prose. */
export function isTabularText(text) {
  return typeof text === 'string' && text.includes('\t')
}

function parseQty(cell, locale) {
  const decimal = normalizeDecimalInput(cell, locale)
  const value = decimal === null ? null : parseScaledDecimal(decimal, 3)
  return value === null ? null : Number(value)
}

/**
 * @param {string} text
 * @param {{ currency: string, locale: string }} context
 * @returns {{ rows: { description: string, qty_milli: number, unit: string, unitPrice_minor: number }[], skippedHeader: boolean }}
 */
export function parseTabularRows(text, { currency, locale }) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
  const rows = []
  let skippedHeader = false
  lines.slice(0, MAX_PASTED_ROWS + 1).forEach((raw, index) => {
    const cells = raw.split('\t').map((c) => c.trim())
    if (!cells[0] && cells.length < 2) return
    let description = cells[0]
    let qtyCell = '1'
    let unit = ''
    let priceCell = ''
    if (cells.length === 2) priceCell = cells[1]
    else if (cells.length === 3) [description, qtyCell, priceCell] = cells
    else if (cells.length >= 4) [description, qtyCell, unit, priceCell] = cells

    const qty = parseQty(qtyCell, locale)
    const price = priceCell === '' ? { ok: true, minor: 0 } : parseMoneyInput(priceCell, currency, locale)
    if (index === 0 && cells.length >= 2 && (qty === null || !price.ok)) {
      skippedHeader = true
      return
    }
    rows.push({
      description: description.slice(0, 2000),
      qty_milli: qty === null ? 1000 : qty,
      unit: unit.slice(0, 50),
      unitPrice_minor: price.ok ? price.minor : 0,
    })
  })
  return { rows: rows.slice(0, MAX_PASTED_ROWS), skippedHeader }
}
