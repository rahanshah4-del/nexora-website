/**
 * Nexora AI local engine: understands Urdu / Roman Urdu / English questions
 * and answers from the POS snapshot without any AI service.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { parseQuestion, normalizeText, detectPeriod, tokenize, parseOrderItems } from '../src/crm/ai/nexoraAiNlu.js'
import { answerLocally } from '../src/crm/ai/nexoraAiEngine.js'

const NOW = new Date(2026, 9, 11, 17, 0, 0) // Sun 11 Oct 2026, 17:00 local
const at = (dayOffset, h, m = 0) => new Date(2026, 9, 11 + dayOffset, h, m, 0).toISOString()

// Same-day schedule so the business day rolls over at midnight in every timezone.
const settings = { restaurantPos: { openingTime: '09:00', closingTime: '23:00', enableTax: true, taxPercentage: 16, taxLabel: 'GST', enableServiceCharge: false } }

const line = (name, quantity, price, category = 'Food') => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, quantity, price, sellingPrice: price, category })

const orders = [
  { id: 'o1', orderNumber: 'D-1001', createdAt: at(0, 13), orderType: 'Dine-in', table: 'T1', paymentStatus: 'paid', orderStatus: 'served', paymentMethod: 'Cash', items: [line('Zinger Burger', 2, 450)], subtotal: 900, total: 1000, paidAmount: 1000, dueAmount: 0, customerName: 'Walk-in Guest', cashierId: 'u1', cashierName: 'Ali' },
  { id: 'o2', orderNumber: 'D-1002', createdAt: at(0, 14), orderType: 'Takeaway', paymentStatus: 'partial', orderStatus: 'ready', paymentMethod: 'Cash', items: [line('Chicken Karahi', 1, 1200, 'Mains'), line('Cold Drink', 2, 100, 'Drinks')], subtotal: 1400, total: 1200, paidAmount: 700, dueAmount: 500, customerName: 'Bilal', customerId: 'c1', cashierId: 'u1', cashierName: 'Ali' },
  { id: 'o3', orderNumber: 'D-1003', createdAt: at(0, 15), orderType: 'Dine-in', table: 'T2', paymentStatus: 'pending', orderStatus: 'cancelled', items: [line('Fries', 1, 300)], subtotal: 300, total: 300, paidAmount: 0, cancelReason: 'Customer left' },
  { id: 'o4', orderNumber: 'D-1004', createdAt: at(0, 16, 30), orderType: 'Dine-in', table: 'T3', paymentStatus: 'pending', orderStatus: 'preparing', items: [line('Zinger Burger', 1, 450)], subtotal: 450, total: 450, paidAmount: 0 },
  { id: 'o5', orderNumber: 'D-0999', createdAt: at(-1, 20), orderType: 'Delivery', paymentStatus: 'paid', orderStatus: 'served', paymentMethod: 'JazzCash', items: [line('Zinger Burger', 2, 400)], subtotal: 800, total: 800, paidAmount: 800, dueAmount: 0, customerName: 'Sara', customerId: 'c2', cashierId: 'u1', cashierName: 'Ali' },
]

const menuItems = [
  { id: 'm1', name: 'Zinger Burger', price: 450, category: 'Burgers' },
  { id: 'm2', name: 'Beef Burger', price: 500, category: 'Burgers' },
  { id: 'm3', name: 'Chicken Karahi', price: 1200, category: 'Mains' },
  { id: 'm4', name: 'Cold Drink', price: 100, category: 'Drinks' },
  { id: 'm5', name: 'Seekh Kebab', price: 350, category: 'Grill', available: false },
]

const data = {
  orders,
  customers: [{ id: 'c1', name: 'Bilal' }, { id: 'c2', name: 'Sara' }],
  expenses: [
    { id: 'e1', amount: 200, category: 'Gas', status: 'approved', date: at(0, 10) },
    { id: 'e2', amount: 999, category: 'Rent', status: 'approved', date: at(-3, 10) },
  ],
  menuItems,
  cashSessions: [],
  refunds: [],
  ingredients: [
    { id: 'i1', name: 'Chicken', stockQuantity: 2, minStockAlert: 5, costPerUnit: 600, unit: 'kg' },
    { id: 'i2', name: 'Buns', stockQuantity: 0, minStockAlert: 20, costPerUnit: 20, unit: 'pc' },
    { id: 'i3', name: 'Oil', stockQuantity: 30, minStockAlert: 5, costPerUnit: 400, unit: 'l' },
  ],
  tables: [
    { id: 't1', name: 'T1', floor: 'Ground', status: 'occupied', seats: 4 },
    { id: 't2', name: 'T2', floor: 'Ground', status: 'available', seats: 2 },
    { id: 't3', name: 'T3', floor: 'Ground', status: 'occupied', seats: 6 },
  ],
  settings,
  openingCash: 0,
  currency: 'PKR',
}


const opts = { menu: menuItems, tables: data.tables, now: NOW }
const intentOf = (q) => parseQuestion(q, opts).intent
const ask = (q, extra = {}) => answerLocally(q, data, { role: 'owner', now: NOW, ...extra })

const CASES = {
  summary: ['aaj ka total bill kitna hua', 'average bill kitna hai', 'discount kitna diya', 'refund kitne hue', 'tax kitna laga', 'what did we earn yesterday', 'aaj ki sale kitni hai', 'aaj ki sale', 'sales today', 'how much did we sell today', 'what is my revenue', 'آج کی سیل کتنی ہے', 'aaj kitna kamaya', 'aj ki bikri batao', 'todays sale', 'sale btao', 'profit kitna hua', 'munafa batao', 'آج کا منافع'],
  top_items: ['top 5 items', 'sab se zyada kya bikta hai', 'best selling item', 'سب سے زیادہ بکنے والی چیز', 'konsi cheez sab se zyada bik rahi hai', 'slowest items', 'sab se kam bikne wali cheezein'],
  list_orders: ['unpaid orders', 'baqi orders dikhao', 'pending orders', 'orders list', 'ادھار آرڈرز', 'cancelled orders', 'kitne orders hain aaj'],
  inventory: ['low stock', 'kya khatam hai', 'stock kitna bacha hai', 'out of stock items', 'کم اسٹاک', 'inventory status'],
  customers: ['top customers', 'customers batao', 'gahak kitne aaye', 'regular customers', 'گاہک'],
  tables: ['tables ki halat', 'konsi table khali hai', 'free tables', 'occupied tables', 'ٹیبل خالی'],
  expenses: ['aaj ke kharche', 'expenses today', 'kharcha kitna hua', 'اخراجات', 'total spending'],
  cash: ['aaj ki closing', 'cash session', 'galla kitna hai', 'cash difference', 'drawer ka hisab'],
  kitchen: ['kitchen status', 'kitchen mein kya chal raha hai', 'kot pending', 'کچن کی صورتحال', 'preparing orders kitne hain'],
  compare: ['aaj aur kal ka muqabla', 'compare today and yesterday', 'today vs yesterday sales', 'آج اور کل کا مقابلہ'],
  sales_by: ['aaj kitna cash aaya', 'card se kitna aaya', 'konsa din best raha', 'payment method wise sale', 'category wise sales', 'hourly sales', 'sab se busy time kya hai', 'staff wise sale', 'peak hour kya hai'],
  order_details: ['order D-1002', '#D-1001', 'order 1002 ki tafseel', 'bill no 1004 dikhao', 'order 1001 print karo', 'آرڈر 1001 کی تفصیل'],
  place_order: ['table 2 ke liye 2 zinger aur 1 cold drink', 'order karo 3 zinger burger', 'take away order lagao 1 karahi', 'zinger burger 2 order dedo', 'place order for 2 beef burger and 1 cold drink', 'ٹیبل 2 کے لیے 2 zinger آرڈر کرو'],
  item_sales: ['zinger kitne bike', 'how many zinger burger sold', 'cold drink kitni bikin aaj'],
  menu: ['koi item band hai', 'list unavailable items', 'menu', 'menu diko', 'menu dikhao', 'minu batao', 'price list', 'kya kya milta hai', 'drinks', 'burgers ka menu', 'menu items', 'مینو دکھاؤ', 'unavailable menu items'],
  item_price: ['zinger burger', 'zinger ka price', 'karahi kitne ka hai', 'cold drink rate', 'beef burger ki qeemat', 'seekh kebab'],
  table_order: ['table 1 ka bill', 'table 2 mein kya order hai', 'bill kitna hua table 2 ka'],
  help: ['help', 'madad', 'aap kya kya kar sakte ho'],
  greeting: ['salam', 'hello', 'السلام علیکم'],
  thanks: ['shukriya', 'thanks'],
}

for (const [intent, questions] of Object.entries(CASES)) {
  test(`understands ${intent} in many phrasings`, () => {
    for (const q of questions) assert.equal(intentOf(q), intent, `"${q}" -> ${intentOf(q)}`)
  })
}

test('gibberish and empty input are not understood', () => {
  for (const q of ['', '   ', 'asdf qwer', 'blah blah blah', '???']) assert.equal(intentOf(q), 'unknown', q)
  assert.equal(ask('asdf qwer'), null)
})

test('normalisation maps Urdu variants and digits', () => {
  assert.equal(normalizeText('  آج   کی ۱۲ سیل!! '), 'آج کی 12 سیل')
  assert.deepEqual(tokenize('a, b  c'), ['a', 'b', 'c'])
})

test('periods: today, yesterday, week, month, all, explicit dates', () => {
  const p = (q) => detectPeriod(normalizeText(q), tokenize(normalizeText(q)), NOW)
  assert.equal(p('kal ki sale').key, 'yesterday')
  assert.equal(p('aaj ki sale').key, 'today')
  assert.equal(p('is hafte ki sale').key, '7d')
  assert.equal(p('pichle 30 din ki sale').key, '30d')
  assert.equal(p('mahine ki sale').key, '30d')
  assert.equal(p('ab tak ki sale').key, 'all')
  assert.deepEqual(p('sale on 2026-10-09'), { key: 'custom', from: '2026-10-09', to: '2026-10-09' })
  assert.deepEqual(p('sale 9 oct 2026'), { key: 'custom', from: '2026-10-09', to: '2026-10-09' })
  assert.equal(p('sale'), null)
  assert.equal(p('2026-13-45 sale'), null)
})

test('order items parsing keeps quantities and names', () => {
  const items = parseOrderItems(normalizeText('table 2 ke liye 2 zinger burger aur 1 cold drink'))
  assert.deepEqual(items.map((i) => [i.name, i.quantity]), [['zinger burger', 2], ['cold drink', 1]])
  assert.deepEqual(parseOrderItems('zinger burger 3').map((i) => [i.name, i.quantity]), [['zinger burger', 3]])
})

test('sales answer matches the report numbers in all three languages', () => {
  const en = ask('sales today', { language: 'en' })
  assert.match(en.text, /Sales today: PKR [0-9,]+/)
  assert.deepEqual(en.toolsUsed, ['get_business_summary'])
  const total = en.text.match(/PKR ([0-9,.]+)/)[1]
  const ro = ask('aaj ki sale', { language: 'roman-ur' })
  assert.ok(ro.text.includes(`PKR ${total}`))
  assert.match(ro.text, /aaj ki sale/i)
  const ur = ask('آج کی سیل', { language: 'ur' })
  assert.ok(ur.text.includes(`PKR ${total}`))
  assert.match(ur.text, /آج/)
})

test('yesterday is a different, correct period', () => {
  const r = ask('kal ki sale', { language: 'roman-ur' })
  assert.ok(r.text.includes('PKR 800'), r.text)
  assert.match(r.text, /kal ki sale/i)
})

test('order details returns an order card; unknown order says so', () => {
  const r = ask('order D-1002 ki tafseel')
  assert.equal(r.cards[0].kind, 'order')
  assert.equal(r.cards[0].order.orderNumber, 'D-1002')
  const miss = ask('order 7777 dikhao', { language: 'en' })
  assert.match(miss.text, /could not find order 7777/)
  assert.equal(miss.cards.length, 0)
})

test('unpaid orders lists only unpaid', () => {
  const r = ask('unpaid orders', { language: 'en' })
  assert.equal(r.toolsUsed[0], 'list_orders')
  assert.ok(!r.text.includes('D-1001'))
})

test('placing an order builds a draft card, never saves', () => {
  const r = ask('table 2 ke liye 2 zinger aur 1 cold drink')
  assert.equal(r.cards[0].kind, 'order_draft')
  assert.equal(r.cards[0].draft.tableName, 'T2')
  assert.deepEqual(r.cards[0].draft.lines.map((l) => [l.name, l.quantity]), [['Zinger Burger', 2], ['Cold Drink', 1]])
  assert.equal(r.cards[0].readyToConfirm, true)
  assert.deepEqual(r.toolsUsed, ['propose_order'])
})

test('unknown or unavailable dishes are reported, not guessed', () => {
  const r = ask('order karo 2 pizza', { language: 'en' })
  assert.equal(r.cards[0]?.readyToConfirm ?? false, false)
  const k = ask('1 seekh kebab order karo', { language: 'en' })
  assert.match(k.text, /not available/)
})

test('role limits are respected', () => {
  const r = answerLocally('aaj ki sale', data, { role: 'cashier', now: NOW, language: 'en' })
  assert.match(r.text, /not allowed/)
  const k = answerLocally('kitchen status', data, { role: 'kitchen_staff', now: NOW, language: 'en' })
  assert.match(k.text, /active/)
})

test('follow-up keeps the topic and changes the period', () => {
  const first = ask('aaj ki sale')
  const second = ask('aur kal?', { context: first.context })
  assert.equal(second.intent, 'summary')
  assert.ok(second.text.includes('PKR 800'))
})

test('typos are tolerated', () => {
  assert.equal(intentOf('aaj ki sles batao'), 'summary')
  assert.equal(intentOf('inventry status'), 'inventory')
  assert.equal(intentOf('custmers batao'), 'customers')
})

test('compare reports both days', () => {
  const r = ask('aaj aur kal ka muqabla', { language: 'roman-ur' })
  assert.match(r.text, /Aaj PKR .* vs \*\*kal PKR 800/)
})

test('peak hour question answers with an hour', () => {
  const r = ask('sab se busy time kya hai', { language: 'roman-ur' })
  assert.match(r.text, /\d\d:00/)
})

test('help and greetings need no data', () => {
  assert.match(ask('help', { language: 'en' }).text, /POS data/)
  assert.equal(ask('salam').toolsUsed.length, 0)
})

test('menu lists dishes with prices, by category and availability', () => {
  const all = ask('menu diko', { language: 'roman-ur' })
  assert.deepEqual(all.toolsUsed, [])
  assert.match(all.text, /Zinger Burger — PKR 450/)
  assert.match(all.text, /Seekh Kebab — PKR 350 \(available nahi\)/)
  const drinks = ask('drinks', { language: 'en' })
  assert.match(drinks.text, /Cold Drink/)
  assert.ok(!drinks.text.includes('Zinger'))
  const off = ask('unavailable menu items', { language: 'en' })
  assert.match(off.text, /Seekh Kebab/)
  assert.ok(!off.text.includes('Zinger'))
})

test('item price answers from the menu', () => {
  assert.match(ask('zinger ka price', { language: 'roman-ur' }).text, /Zinger Burger\*\* — PKR 450/)
  assert.match(ask('seekh kebab', { language: 'en' }).text, /Currently not available/)
})

test('a table question returns that table\'s active order with a card', () => {
  const r = ask('table 3 ka bill', { language: 'roman-ur' })
  assert.equal(r.cards[0].order.orderNumber, 'D-1004')
  assert.match(r.text, /Table \*\*T3\*\*/)
  assert.match(ask('table 9 ka bill', { language: 'en' }).text, /no order/)
})

test('discount, tax and refund answer one line from the summary', () => {
  assert.match(ask('discount kitna diya', { language: 'en' }).text, /^\*\*Discounts today: PKR/)
  assert.match(ask('tax kitna laga', { language: 'roman-ur' }).text, /ka tax: PKR/)
  assert.match(ask('refund kitne hue', { language: 'en' }).text, /Refunds today: 0/)
})

test('cash/card questions give the payment-method split; drawer stays a cash session', () => {
  assert.equal(ask('aaj kitna cash aaya').toolsUsed[0], 'get_sales_report')
  assert.equal(ask('cash drawer mein kitne paise hain').toolsUsed[0], 'get_cash_session_summary')
})

test('"new order" explains how to order instead of failing', () => {
  const r = ask('new order', { language: 'en' })
  assert.match(r.text, /items and table/)
  assert.deepEqual(r.toolsUsed, [])
})

test('batao/banao and laga/lagao are not confused', () => {
  assert.equal(intentOf('minu batao'), 'menu')
  assert.equal(intentOf('tax kitna laga'), 'summary')
})
