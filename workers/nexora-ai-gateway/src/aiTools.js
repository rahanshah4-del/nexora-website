/**
 * Nexora AI — tool catalogue for the in-app restaurant assistant.
 *
 * SCHEMAS ONLY. The worker never reads Firestore. The browser executes these
 * tools locally (reusing the existing report calculations, under the signed-in
 * user's own Firestore rules) and sends the compact result back to /ai/chat.
 *
 * Every tool is read-only. `propose_order` only builds a DRAFT that the owner
 * must confirm in the UI; it never places an order.
 */

const PERIOD = {
  type: 'string',
  enum: ['today', 'yesterday', '7d', '30d', 'all'],
  description: 'Time window. Business-day boundaries are applied by the app.',
}

const ISO_DATE = { type: 'string', description: 'ISO date, YYYY-MM-DD.' }

export const AI_TOOLS = Object.freeze([
  {
    name: 'get_business_summary',
    description:
      'Headline numbers for a period: total sales, order count, average order value, paid vs pending amounts, active KOT, occupied tables, top item.',
    parameters: {
      type: 'object',
      properties: { period: PERIOD },
      required: ['period'],
    },
  },
  {
    name: 'get_sales_report',
    description:
      'Sales report for a period or date range, optionally grouped (day, hour, item, category, payment_method, order_type, staff).',
    parameters: {
      type: 'object',
      properties: {
        period: PERIOD,
        from: ISO_DATE,
        to: ISO_DATE,
        groupBy: {
          type: 'string',
          enum: ['day', 'hour', 'item', 'category', 'payment_method', 'order_type', 'staff'],
        },
      },
    },
  },
  {
    name: 'list_orders',
    description: 'List orders with optional filters. Returns compact rows (max 50).',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Order status, e.g. open, preparing, ready, served, completed, cancelled.' },
        orderType: { type: 'string', enum: ['dine_in', 'takeaway', 'delivery'] },
        paymentStatus: { type: 'string', enum: ['paid', 'unpaid', 'partial'] },
        from: ISO_DATE,
        to: ISO_DATE,
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: 'get_order_details',
    description:
      'Full details of one order by order number: items, quantities, prices, discount, service charge, tax, total, payments, table, customer, staff, timestamps.',
    parameters: {
      type: 'object',
      properties: { orderNumber: { type: 'string', description: 'The order number exactly as shown in the POS.' } },
      required: ['orderNumber'],
    },
  },
  {
    name: 'get_top_items',
    description: 'Best selling menu items for a period, ranked by quantity or revenue.',
    parameters: {
      type: 'object',
      properties: {
        period: PERIOD,
        limit: { type: 'integer', minimum: 1, maximum: 20 },
        by: { type: 'string', enum: ['quantity', 'revenue'] },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Ingredient stock levels, low-stock alerts and inventory valuation.',
    parameters: {
      type: 'object',
      properties: { lowStockOnly: { type: 'boolean' } },
    },
  },
  {
    name: 'get_customers_summary',
    description: 'Customer counts, repeat customers and top customers by spend for a period.',
    parameters: {
      type: 'object',
      properties: { period: PERIOD, topN: { type: 'integer', minimum: 1, maximum: 20 } },
      required: ['period'],
    },
  },
  {
    name: 'get_tables_status',
    description: 'Current table occupancy: which tables are free, occupied or reserved.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_expenses_summary',
    description: 'Expenses for a period, grouped by category, plus a simple profit estimate when data allows.',
    parameters: {
      type: 'object',
      properties: { period: PERIOD },
      required: ['period'],
    },
  },
  {
    name: 'get_cash_session_summary',
    description: 'Cash drawer sessions for a period: opening, cash sales, movements, expected vs counted cash, differences.',
    parameters: {
      type: 'object',
      properties: { period: PERIOD },
      required: ['period'],
    },
  },
  {
    name: 'get_kitchen_status',
    description: 'Live kitchen queue: active KOT tickets by status and average prep time.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'propose_order',
    description:
      'Build a DRAFT order from menu item names for the owner to confirm in the UI. This does NOT place the order. Use it whenever the owner asks to create or place an order.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 30,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, maximum: 99 },
              note: { type: 'string' },
            },
            required: ['name', 'quantity'],
          },
        },
        orderType: { type: 'string', enum: ['dine_in', 'takeaway', 'delivery'] },
        tableName: { type: 'string' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
      },
      required: ['items', 'orderType'],
    },
  },
])

export const AI_TOOL_NAMES = Object.freeze(AI_TOOLS.map((tool) => tool.name))

/**
 * Tool definitions in the wire format of a provider.
 *  - deepseek / openai (OpenAI-compatible): { type:'function', function:{...} }
 *  - claude (Anthropic Messages API):       { name, description, input_schema }
 */
export function toProviderTools(providerKey) {
  if (providerKey === 'claude') {
    return AI_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }))
  }
  return AI_TOOLS.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))
}
