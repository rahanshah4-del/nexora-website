import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  canRoleCreateAiOrder,
  confirmAiOrderDraft,
  isTableBusy,
  nextAiOrderNumber,
  normalizeAiOrderType,
  resetConfirmedRequests,
} from '../src/crm/ai/nexoraAiOrderCreate.js'
import { runRestaurantAiTool } from '../src/crm/ai/restaurantAiTools.js'
import { orderConfirmError } from '../src/crm/ai/nexoraAiText.js'
import { normalizeRestaurantOrder } from '../src/crm/data/restaurantOrders.js'

const MENU = [
  { id: 'm1', name: 'Zinger Burger', price: 450, category: 'Burgers' },
  { id: 'm2', name: 'Karahi', price: 1200, category: 'Mains' },
  { id: 'm3', name: 'Cold Drink', price: 100, category: 'Drinks', available: false },
]
const TABLES = [{ id: 'T1', name: 'T1', floor: 'Main' }, { id: 'T2', name: 'T2', floor: 'Main' }]

const baseData = (over = {}) => ({
  orders: [], customers: [], menuItems: MENU, tables: TABLES, settings: {}, currency: 'PKR', ...over,
})
const draftFor = (args, data = baseData()) => runRestaurantAiTool('propose_order', args, data, { role: 'owner' }).result

let saved
let synced
const deps = (over = {}) => ({
  upsertOrder: (order) => { saved.push(order); return [order] },
  syncOrder: (ws, uid, order) => { synced.push({ ws, uid, order }) },
  posNextOrderNumber: () => '#45266',
  now: () => new Date('2026-10-11T12:00:00.000Z'),
  ...over,
})
const confirm = (draft, over = {}) => confirmAiOrderDraft(draft, { data: baseData(), role: 'owner', workspaceId: 'ws1', userId: 'u1', requestId: `r${Math.random()}`, deps: deps(), ...over })

beforeEach(() => { saved = []; synced = []; resetConfirmedRequests() })

test('happy path: dine-in draft becomes a pending, unpaid KOT-style order and is synced', () => {
  const card = draftFor({ items: [{ name: 'zinger burger', quantity: 2 }, { name: 'karahi', quantity: 1, note: 'less spicy' }], orderType: 'Dine-in', tableName: 't1' })
  assert.equal(card.readyToConfirm, true)
  const res = confirm(card.draft)
  assert.equal(res.ok, true)
  assert.equal(res.orderNumber, '#45266')
  assert.equal(res.total, card.draft.totals.total)
  assert.equal(saved.length, 1)
  const o = saved[0]
  assert.equal(o.table, 'T1')
  assert.equal(o.orderStatus, 'pending')
  assert.equal(o.paymentStatus, 'due')
  assert.equal(o.paidAmount, 0)
  assert.equal(o.customerId, 'cust-walkin')
  assert.match(o.notes, /^\[Nexora AI\]/)
  assert.match(o.notes, /Karahi: less spicy/)
  assert.equal(synced.length, 1)
  assert.deepEqual([synced[0].ws, synced[0].uid, synced[0].order.orderNumber], ['ws1', 'u1', '#45266'])
})

test('the saved payload passes through the real POS normalizer unchanged in meaning', () => {
  const card = draftFor({ items: [{ name: 'Zinger Burger', quantity: 2 }, { name: 'Karahi', quantity: 1 }], orderType: 'Takeaway' })
  confirm(card.draft)
  const n = normalizeRestaurantOrder(saved[0])
  assert.equal(n.orderNumber, '#45266')
  assert.equal(n.orderType, 'Takeaway')
  assert.equal(n.orderStatus, 'pending')
  assert.equal(n.paymentStatus, 'due')
  assert.equal(n.total, card.draft.totals.total)
  assert.equal(n.dueAmount, n.total)
  assert.equal(n.itemsCount, 3)
  assert.deepEqual(n.items, ['2x Zinger Burger', '1x Karahi'])
})

test('order type defaults from the table; delivery and unknown types are refused', () => {
  assert.equal(normalizeAiOrderType('dine in'), 'Dine-in')
  assert.equal(normalizeAiOrderType('Take away'), 'Takeaway')
  assert.equal(normalizeAiOrderType('pickup'), 'Takeaway')
  assert.equal(normalizeAiOrderType(''), null)
  const base = draftFor({ items: [{ name: 'Karahi', quantity: 1 }] }).draft
  assert.equal(confirm({ ...base, orderType: '', tableName: '' }).order.orderType, 'Takeaway')
  assert.equal(confirm({ ...base, orderType: '', tableName: 'T2' }).order.orderType, 'Dine-in')
  assert.equal(confirm({ ...base, orderType: 'Delivery' }).code, 'delivery_unsupported')
  assert.equal(confirm({ ...base, orderType: 'drive-thru' }).code, 'bad_order_type')
  assert.equal(saved.length, 2)
})

test('dine-in needs an existing table with no other active unpaid order', () => {
  const base = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Dine-in' }).draft
  assert.equal(confirm({ ...base, tableName: '' }).code, 'table_required')
  const nf = confirm({ ...base, tableName: 'T9' })
  assert.equal(nf.code, 'table_not_found')
  assert.deepEqual(nf.options, ['T1', 'T2'])

  const busy = baseData({ orders: [{ orderNumber: '#45270', table: 'T1', orderStatus: 'preparing', paymentStatus: 'due' }] })
  assert.equal(confirm({ ...base, tableName: 'T1' }, { data: busy }).code, 'table_busy')
  assert.equal(confirm({ ...base, tableName: 'T2' }, { data: busy }).ok, true, 'other table is free')

  assert.equal(isTableBusy('T1', [{ table: 'T1', orderStatus: 'cancelled', paymentStatus: 'due' }]), false)
  assert.equal(isTableBusy('T1', [{ table: 'T1', orderStatus: 'served', paymentStatus: 'paid' }]), false)
  assert.equal(isTableBusy('T1', [{ table: 'T1', orderStatus: 'served', paymentStatus: 'due' }]), true)
  assert.equal(saved.length, 1)
})

test('roles: owner/admin/cashier/waiter may create, kitchen staff may not', () => {
  const card = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Takeaway' })
  for (const role of ['owner', 'admin', 'cashier', 'waiter']) assert.equal(canRoleCreateAiOrder(role), true, role)
  assert.equal(canRoleCreateAiOrder('kitchen_staff'), false)
  assert.equal(confirm(card.draft, { role: 'kitchen_staff' }).code, 'not_permitted')
  assert.equal(confirm(card.draft, { workspaceId: '' }).code, 'not_signed_in')
  assert.equal(saved.length, 0)
})

test('lines are re-checked against the CURRENT menu: removed, unavailable and re-priced items block the save', () => {
  const card = draftFor({ items: [{ name: 'Karahi', quantity: 1 }, { name: 'Zinger Burger', quantity: 1 }], orderType: 'Takeaway' })

  const removed = confirm(card.draft, { data: baseData({ menuItems: MENU.filter((m) => m.id !== 'm2') }) })
  assert.equal(removed.code, 'item_missing')

  const off = confirm(card.draft, { data: baseData({ menuItems: MENU.map((m) => (m.id === 'm2' ? { ...m, available: false } : m)) }) })
  assert.equal(off.code, 'item_unavailable')

  const pricier = confirm(card.draft, { data: baseData({ menuItems: MENU.map((m) => (m.id === 'm2' ? { ...m, price: 1500 } : m)) }) })
  assert.equal(pricier.code, 'price_changed')
  assert.ok(pricier.now > pricier.was)

  const taxed = confirm(card.draft, { data: baseData({ settings: { restaurantPos: { enableTax: true, taxPercentage: 16 } } }) })
  assert.equal(taxed.code, 'price_changed', 'a new tax rate also invalidates the shown total')
  assert.equal(saved.length, 0)
})

test('a tampered draft cannot change prices: totals come from the menu, not the draft', () => {
  const card = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Takeaway' })
  const forged = JSON.parse(JSON.stringify(card.draft))
  forged.lines[0].unitPrice = 1
  forged.lines[0].lineTotal = 1
  const res = confirm(forged)
  assert.equal(res.ok, true)
  assert.equal(res.total, 1200)
  const lowball = JSON.parse(JSON.stringify(card.draft))
  lowball.totals.total = 1
  assert.equal(confirm(lowball).code, 'price_changed')
})

test('the same draft cannot be saved twice, but a failed attempt can be retried', () => {
  const card = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Takeaway' })
  assert.equal(confirm(card.draft, { requestId: 'same' }).ok, true)
  assert.equal(confirm(card.draft, { requestId: 'same' }).code, 'duplicate')
  assert.equal(saved.length, 1)

  const failing = confirm(card.draft, { requestId: 'retry', deps: deps({ upsertOrder: () => { throw new Error('quota') } }) })
  assert.equal(failing.code, 'save_failed')
  assert.equal(confirm(card.draft, { requestId: 'retry' }).ok, true, 'failure does not burn the request id')
})

test('order numbers continue above every visible order and the POS counter', () => {
  assert.equal(nextAiOrderNumber([], ''), '#45266')
  assert.equal(nextAiOrderNumber([{ orderNumber: '#45300' }, { orderNumber: 'D-45310' }, { orderNumber: 'INV-5' }], '#45266'), '#45311')
  assert.equal(nextAiOrderNumber([{ orderNumber: '#45266' }], '#45400'), '#45400')
  const card = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Takeaway' })
  const res = confirm(card.draft, { data: baseData({ orders: [{ orderNumber: 'W-45500', createdAt: '2026-10-11' }] }) })
  assert.equal(res.orderNumber, '#45501')
})

test('customer: linked only on an exact phone match, otherwise walk-in', () => {
  const customers = [{ id: 'c7', name: 'Bilal Ahmed', phone: '03001234567' }]
  const base = draftFor({ items: [{ name: 'Karahi', quantity: 1 }], orderType: 'Takeaway', customerName: 'Bilal', customerPhone: '03001234567' }).draft
  const linked = confirm(base, { data: baseData({ customers }) })
  assert.deepEqual([linked.order.customerId, linked.order.customer], ['c7', 'Bilal Ahmed'])
  const other = confirm({ ...base, customerPhone: '03009999999' }, { data: baseData({ customers }) })
  assert.deepEqual([other.order.customerId, other.order.customer], ['cust-walkin', 'Bilal'])
})

test('empty or malformed drafts are rejected', () => {
  assert.equal(confirm(null).code, 'empty')
  assert.equal(confirm({ lines: [] }).code, 'empty')
  assert.equal(confirm({ lines: [{ name: 'Karahi', menuItemId: 'm2', quantity: 0 }], totals: { total: 0 }, orderType: 'Takeaway' }).code, 'bad_quantity')
  assert.equal(saved.length, 0)
})

test('every error code has its own message in all three languages', () => {
  const codes = ['not_permitted', 'not_signed_in', 'empty', 'duplicate', 'bad_order_type', 'delivery_unsupported', 'table_required', 'table_not_found', 'table_busy', 'item_missing', 'item_unavailable', 'bad_quantity', 'price_changed', 'save_failed']
  for (const lang of ['en', 'roman-ur', 'ur']) {
    const messages = codes.map((c) => orderConfirmError(c, lang))
    assert.ok(messages.every((m) => m.length > 5), `${lang}: non-empty`)
    assert.equal(new Set(messages).size, codes.length, `${lang}: distinct`)
  }
  assert.equal(orderConfirmError('nonsense', 'en'), orderConfirmError('unknown', 'en'))
})
