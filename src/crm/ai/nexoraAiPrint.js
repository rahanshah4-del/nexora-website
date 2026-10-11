/**
 * Nexora AI — print an order that the assistant showed in an order card.
 *
 * Reuses the POS's own guest-check templates and printer routing, so the
 * printout matches what the cashier screen prints. The order comes from the
 * get_order_details tool result (already computed by the app), nothing is
 * recalculated here.
 */

import { buildBillPrintData } from '../lib/restaurantPosCalculations.js'
import { buildModernBillPrintHtml, buildModernBillThermalText } from '../lib/restaurantThermalTemplates.js'
import { printHtmlDocument } from '../lib/printerService.js'

/** Map an order card payload to the bill template input. */
export function buildAiOrderBillData(order = {}, { restaurantName = '', settings = {} } = {}) {
  const items = Array.isArray(order.items) ? order.items : []
  return buildBillPrintData({
    restaurantName: restaurantName || undefined,
    orderNumber: order.orderNumber || '',
    billNumber: order.billNumber || undefined,
    table: order.table || '',
    orderType: order.type || 'Dine-in',
    customerName: order.customerName || order.customer || 'Walk-in Guest',
    rows: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      serviceCharges: order.serviceCharges,
      tax: order.tax,
      total: order.total,
    },
    paidAmount: order.paid,
    paymentMethod: order.paymentMethod || 'Cash',
    date: order.time ? new Date(order.time) : new Date(),
    settings,
  })
}

export function buildAiOrderReceipt(order, ctx = {}) {
  const data = buildAiOrderBillData(order, ctx)
  return { html: buildModernBillPrintHtml(data), thermalText: buildModernBillThermalText(data) }
}

/** Print through the configured thermal printer, else the browser print dialog. */
export async function printAiOrder(order, { restaurantName = '', settings = {}, printerSettings } = {}) {
  const { html, thermalText } = buildAiOrderReceipt(order, { restaurantName, settings })
  return printHtmlDocument({
    html,
    thermalText,
    settings: printerSettings || settings.printer || settings.printerSettings,
    paperSize: '58mm',
  })
}
