/**
 * Nexora AI — local answers (no AI service).
 *
 * Turns exact tool results into a short reply in Urdu script, Roman Urdu or
 * English. Every number comes straight from the tool result; nothing is
 * estimated. Output uses the same tiny markdown the chat already renders
 * (**bold**, "- " bullets), so it is never HTML.
 */

import { formatMoneyLabel } from './nexoraAiText.js'
import { DEFAULT_CURRENCY } from '../lib/workspaceCurrency.js'

const pick = (lang, m) => m[lang] ?? m['roman-ur'] ?? m.en
const num = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })

const PERIOD_LABEL = {
  today: { en: 'today', 'roman-ur': 'aaj', ur: 'آج' },
  yesterday: { en: 'yesterday', 'roman-ur': 'kal', ur: 'کل' },
  '7d': { en: 'the last 7 days', 'roman-ur': 'pichle 7 din', ur: 'پچھلے 7 دن' },
  '30d': { en: 'the last 30 days', 'roman-ur': 'pichle 30 din', ur: 'پچھلے 30 دن' },
  all: { en: 'all time', 'roman-ur': 'ab tak', ur: 'اب تک' },
}

/** Period words for a sentence, from the parsed period (default today). */
export function periodWords(period, lang) {
  if (period?.key === 'custom') return period.from === period.to ? period.from : `${period.from} – ${period.to}`
  const entry = PERIOD_LABEL[period?.key || 'today'] || PERIOD_LABEL.today
  return pick(lang, entry)
}

/** Tool arguments for a parsed period. */
export function periodArgs(period) {
  if (!period) return { period: 'today' }
  if (period.key === 'custom') return { from: period.from, to: period.to }
  return { period: period.key }
}

const money = (v, c) => formatMoneyLabel(v, c)
const bullets = (rows) => rows.map((r) => `- ${r}`).join('\n')

function focusAnswer(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  const s = r.sales || {}
  if (p.focus === 'discount') {
    return pick(lang, { en: `**Discounts ${when}: ${money(s.discounts, c)}** (on sales of ${money(s.gross, c)}).`, 'roman-ur': `**${when} ka discount: ${money(s.discounts, c)}** (${money(s.gross, c)} ki sale par).`, ur: `**${when} کا ڈسکاؤنٹ: ${money(s.discounts, c)}** (${money(s.gross, c)} کی سیل پر)۔` })
  }
  if (p.focus === 'refund') {
    const rf = r.refunds || {}
    return pick(lang, { en: `**Refunds ${when}: ${rf.count || 0}** totalling ${money(rf.amount, c)}.`, 'roman-ur': `**${when} refunds: ${rf.count || 0}**, kul ${money(rf.amount, c)}.`, ur: `**${when} ریفنڈز: ${rf.count || 0}**، کل ${money(rf.amount, c)}۔` })
  }
  return pick(lang, { en: `**Tax ${when}: ${money(s.tax, c)}**${s.serviceCharges ? `, service charges ${money(s.serviceCharges, c)}` : ''}.`, 'roman-ur': `**${when} ka tax: ${money(s.tax, c)}**${s.serviceCharges ? `, service charges ${money(s.serviceCharges, c)}` : ''}.`, ur: `**${when} کا ٹیکس: ${money(s.tax, c)}**${s.serviceCharges ? `، سروس چارجز ${money(s.serviceCharges, c)}` : ''}۔` })
}

function summary(r, p, lang, c, wantProfit) {
  const when = periodWords(p.period, lang)
  if (p.focus) return focusAnswer(r, p, lang, c)
  const s = r.sales || {}
  const o = r.orders || {}
  if (!o.billed && !o.all) {
    return pick(lang, {
      en: `There are no orders for ${when} yet.`,
      'roman-ur': `${when} ke liye abhi koi order nahi hai.`,
      ur: `${when} کے لیے ابھی کوئی آرڈر نہیں ہے۔`,
    })
  }
  const lines = []
  if (wantProfit) {
    if (r.profit?.netProfit !== undefined) {
      lines.push(pick(lang, {
        en: `**Profit ${when}: ${money(r.profit.netProfit, c)}** (gross ${money(r.profit.grossProfit, c)}, cost of goods ${money(r.profit.costOfGoodsSold, c)})`,
        'roman-ur': `**${when} ka munafa: ${money(r.profit.netProfit, c)}** (gross ${money(r.profit.grossProfit, c)}, maal ki laagat ${money(r.profit.costOfGoodsSold, c)})`,
        ur: `**${when} کا منافع: ${money(r.profit.netProfit, c)}** (گراس ${money(r.profit.grossProfit, c)}، مال کی لاگت ${money(r.profit.costOfGoodsSold, c)})`,
      }))
    } else {
      lines.push(pick(lang, {
        en: 'Profit cannot be calculated reliably because item cost prices are not set. Sales and expenses are below.',
        'roman-ur': 'Munafa sahi hisab se nahi nikal sakta kyunke items ki cost price set nahi hai. Neeche sales aur kharche hain.',
        ur: 'منافع درست حساب سے نہیں نکل سکتا کیونکہ آئٹمز کی لاگت قیمت سیٹ نہیں ہے۔ نیچے سیلز اور خرچے ہیں۔',
      }))
    }
  }
  lines.push(pick(lang, {
    en: `**Sales ${when}: ${money(s.total, c)}** from ${o.billed} order${o.billed === 1 ? '' : 's'}`,
    'roman-ur': `**${when} ki sale: ${money(s.total, c)}** (${o.billed} order)`,
    ur: `**${when} کی سیل: ${money(s.total, c)}** (${o.billed} آرڈر)`,
  }))
  const rows = []
  rows.push(pick(lang, { en: `Average order: ${money(s.averageOrderValue, c)}`, 'roman-ur': `Average order: ${money(s.averageOrderValue, c)}`, ur: `اوسط آرڈر: ${money(s.averageOrderValue, c)}` }))
  rows.push(pick(lang, {
    en: `Collected: ${money(r.payments?.collected, c)} · Outstanding: ${money(r.payments?.outstanding, c)}`,
    'roman-ur': `Wasool: ${money(r.payments?.collected, c)} · Baqi: ${money(r.payments?.outstanding, c)}`,
    ur: `وصول: ${money(r.payments?.collected, c)} · باقی: ${money(r.payments?.outstanding, c)}`,
  }))
  if (s.discounts) rows.push(pick(lang, { en: `Discounts: ${money(s.discounts, c)}`, 'roman-ur': `Discount: ${money(s.discounts, c)}`, ur: `ڈسکاؤنٹ: ${money(s.discounts, c)}` }))
  if (r.expensesApproved) rows.push(pick(lang, { en: `Approved expenses: ${money(r.expensesApproved, c)}`, 'roman-ur': `Manzoor shuda kharche: ${money(r.expensesApproved, c)}`, ur: `منظور شدہ خرچے: ${money(r.expensesApproved, c)}` }))
  if (r.topItem) rows.push(pick(lang, { en: `Top item: ${r.topItem.name} (${num(r.topItem.quantity)} sold)`, 'roman-ur': `Top item: ${r.topItem.name} (${num(r.topItem.quantity)} bika)`, ur: `ٹاپ آئٹم: ${r.topItem.name} (${num(r.topItem.quantity)} بکا)` }))
  if (o.cancelled) rows.push(pick(lang, { en: `Cancelled orders: ${o.cancelled}`, 'roman-ur': `Cancel orders: ${o.cancelled}`, ur: `منسوخ آرڈرز: ${o.cancelled}` }))
  return `${lines.join('\n')}\n\n${bullets(rows)}`
}

function compare(a, b, lang, c) {
  const t = a.sales?.total || 0
  const y = b.sales?.total || 0
  const diff = t - y
  const pct = y > 0 ? Math.round((diff / y) * 100) : null
  const dir = diff > 0 ? pick(lang, { en: 'up', 'roman-ur': 'zyada', ur: 'زیادہ' }) : diff < 0 ? pick(lang, { en: 'down', 'roman-ur': 'kam', ur: 'کم' }) : ''
  const head = pick(lang, {
    en: `**Today ${money(t, c)}** vs **yesterday ${money(y, c)}**`,
    'roman-ur': `**Aaj ${money(t, c)}** vs **kal ${money(y, c)}**`,
    ur: `**آج ${money(t, c)}** بمقابلہ **کل ${money(y, c)}**`,
  })
  const tail = diff === 0
    ? pick(lang, { en: 'Both days are equal.', 'roman-ur': 'Dono din barabar hain.', ur: 'دونوں دن برابر ہیں۔' })
    : pick(lang, {
      en: `Today is ${money(Math.abs(diff), c)}${pct !== null ? ` (${Math.abs(pct)}%)` : ''} ${dir}.`,
      'roman-ur': `Aaj ${money(Math.abs(diff), c)}${pct !== null ? ` (${Math.abs(pct)}%)` : ''} ${dir} hai.`,
      ur: `آج ${money(Math.abs(diff), c)}${pct !== null ? ` (${Math.abs(pct)}%)` : ''} ${dir} ہے۔`,
    })
  return `${head}\n\n- ${pick(lang, { en: 'Orders', 'roman-ur': 'Orders', ur: 'آرڈرز' })}: ${a.orders?.billed || 0} vs ${b.orders?.billed || 0}\n- ${tail}`
}

function salesBy(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  const rows = r.rows || []
  if (!rows.length) return pick(lang, { en: `No data for ${when}.`, 'roman-ur': `${when} ka koi data nahi.`, ur: `${when} کا کوئی ڈیٹا نہیں۔` })
  const g = r.groupBy
  if (g === 'hour' && p.peak) {
    const top = [...rows].sort((x, y) => y.sales - x.sales)[0]
    return pick(lang, {
      en: `**Busiest hour ${when}: ${top.hour}** — ${money(top.sales, c)} from ${top.orders} orders.`,
      'roman-ur': `**${when} sab se busy waqt: ${top.hour}** — ${top.orders} order, ${money(top.sales, c)}.`,
      ur: `**${when} سب سے مصروف وقت: ${top.hour}** — ${top.orders} آرڈر، ${money(top.sales, c)}۔`,
    })
  }
  if (g === 'day' && p.bestDay) {
    const top = [...rows].sort((x, y) => y.sales - x.sales)[0]
    return pick(lang, {
      en: `**Best day (${when}): ${top.date}** — ${money(top.sales, c)} from ${top.orders} orders.`,
      'roman-ur': `**Sab se acha din (${when}): ${top.date}** — ${top.orders} order, ${money(top.sales, c)}.`,
      ur: `**سب سے اچھا دن (${when}): ${top.date}** — ${top.orders} آرڈر، ${money(top.sales, c)}۔`,
    })
  }
  const label = (row) => {
    if (g === 'day') return row.date
    if (g === 'hour') return row.hour
    if (g === 'category') return row.category
    if (g === 'payment_method') return row.method
    if (g === 'order_type') return row.type
    if (g === 'staff') return row.staff
    return row.item
  }
  const value = (row) => money(row.sales ?? row.revenue ?? row.collected, c)
  const head = pick(lang, { en: `**Sales ${when}** (total ${money(r.totalSales, c)})`, 'roman-ur': `**${when} ki sale** (kul ${money(r.totalSales, c)})`, ur: `**${when} کی سیل** (کل ${money(r.totalSales, c)})` })
  return `${head}\n\n${bullets(rows.slice(0, 12).map((row) => `${label(row)}: ${value(row)}`))}`
}

function itemSales(r, item, p, lang, c) {
  const when = periodWords(p.period, lang)
  const row = (r.rows || []).find((x) => String(x.item).toLowerCase() === String(item.name).toLowerCase())
  if (!row) return pick(lang, { en: `No ${item.name} sold ${when}.`, 'roman-ur': `${when} ${item.name} ek bhi nahi biki.`, ur: `${when} ${item.name} ایک بھی نہیں بکی۔` })
  return pick(lang, {
    en: `**${item.name}** ${when}: **${num(row.quantity)} sold**, revenue ${money(row.revenue, c)}.`,
    'roman-ur': `**${item.name}** ${when}: **${num(row.quantity)} bika**, kamai ${money(row.revenue, c)}.`,
    ur: `**${item.name}** ${when}: **${num(row.quantity)} بکا**، آمدنی ${money(row.revenue, c)}۔`,
  })
}

function topItems(r, p, lang, c, slowest) {
  const when = periodWords(p.period, lang)
  if (slowest) {
    if (!r.slowest?.length) return pick(lang, { en: `No sales ${when}.`, 'roman-ur': `${when} koi sale nahi.`, ur: `${when} کوئی سیل نہیں۔` })
    return `${pick(lang, { en: `**Slowest items ${when}**`, 'roman-ur': `**${when} sab se kam bikne wali cheezein**`, ur: `**${when} سب سے کم بکنے والی چیزیں**` })}\n\n${bullets(r.slowest.map((i) => `${i.name}: ${num(i.quantity)}`))}`
  }
  if (!r.items?.length) return pick(lang, { en: `No sales ${when}.`, 'roman-ur': `${when} koi sale nahi.`, ur: `${when} کوئی سیل نہیں۔` })
  const head = pick(lang, { en: `**Top items ${when}**`, 'roman-ur': `**${when} ke top items**`, ur: `**${when} کے ٹاپ آئٹمز**` })
  return `${head}\n\n${bullets(r.items.map((i) => `${i.rank}. ${i.name} — ${num(i.quantity)} · ${money(i.revenue, c)}`)).replace(/^- (\d+\.)/gm, '$1')}`
}

const STATUS_WORDS = { pending: ['pending', 'pending', 'زیر التواء'], preparing: ['preparing', 'ban raha', 'تیار ہو رہا'], ready: ['ready', 'tayar', 'تیار'], served: ['served', 'serve ho gaya', 'پیش کر دیا'], cancelled: ['cancelled', 'cancel', 'منسوخ'] }
const statusWord = (s, lang) => (STATUS_WORDS[s] ? STATUS_WORDS[s][lang === 'en' ? 0 : lang === 'ur' ? 2 : 1] : s)

function listOrders(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  if (!r.matched) return pick(lang, { en: `No matching orders for ${when}.`, 'roman-ur': `${when} koi aisa order nahi mila.`, ur: `${when} کوئی ایسا آرڈر نہیں ملا۔` })
  const head = pick(lang, {
    en: `**${r.matched} order${r.matched === 1 ? '' : 's'} ${when}**${r.showing < r.matched ? ` (showing ${r.showing})` : ''}`,
    'roman-ur': `**${when} ${r.matched} order**${r.showing < r.matched ? ` (${r.showing} dikha raha hoon)` : ''}`,
    ur: `**${when} ${r.matched} آرڈر**${r.showing < r.matched ? ` (${r.showing} دکھا رہا ہوں)` : ''}`,
  })
  const rows = r.orders.map((o) => `${o.orderNumber} · ${o.type}${o.table ? ` ${o.table}` : ''} · ${money(o.total, c)} · ${statusWord(o.orderStatus, lang)}${o.due > 0 ? ` · ${pick(lang, { en: 'due', 'roman-ur': 'baqi', ur: 'باقی' })} ${money(o.due, c)}` : ''}`)
  const hint = pick(lang, { en: 'Say an order number (e.g. "order 45270") for details and print.', 'roman-ur': 'Tafseel aur print ke liye order number likhein (jaise "order 45270").', ur: 'تفصیل اور پرنٹ کے لیے آرڈر نمبر لکھیں (جیسے "order 45270")۔' })
  return `${head}\n\n${bullets(rows)}\n\n${hint}`
}

function orderDetails(r, p, lang) {
  if (!r.found) {
    return pick(lang, {
      en: `I could not find order ${p.orderNumber}. Check the number or ask for the order list.`,
      'roman-ur': `Order ${p.orderNumber} nahi mila. Number check karein ya order list maangein.`,
      ur: `آرڈر ${p.orderNumber} نہیں ملا۔ نمبر چیک کریں یا آرڈر لسٹ مانگیں۔`,
    })
  }
  const o = r.order
  return pick(lang, {
    en: `Order **${o.orderNumber}** — ${o.type}${o.table ? ` · ${o.table}` : ''}, ${o.orderStatus}, payment ${o.paymentStatus}. Details below; use Print for the slip.`,
    'roman-ur': `Order **${o.orderNumber}** — ${o.type}${o.table ? ` · ${o.table}` : ''}, ${o.orderStatus}, payment ${o.paymentStatus}. Tafseel neeche hai; parchi ke liye Print dabayein.`,
    ur: `آرڈر **${o.orderNumber}** — ${o.type}${o.table ? ` · ${o.table}` : ''}، ${o.orderStatus}، ادائیگی ${o.paymentStatus}۔ تفصیل نیچے ہے؛ پرچی کے لیے پرنٹ دبائیں۔`,
  })
}

function inventory(r, lang) {
  if (r.tracked === false) return pick(lang, { en: 'No ingredients are tracked yet, so I have no stock data.', 'roman-ur': 'Abhi koi ingredient track nahi ho raha, is liye stock ka data nahi hai.', ur: 'ابھی کوئی اجزاء ٹریک نہیں ہو رہے، اس لیے اسٹاک کا ڈیٹا نہیں۔' })
  if (!r.alerts?.length) return pick(lang, { en: 'Stock looks fine — nothing is low or out.', 'roman-ur': 'Stock theek hai — kuch bhi kam ya khatam nahi.', ur: 'اسٹاک ٹھیک ہے — کچھ بھی کم یا ختم نہیں۔' })
  const head = pick(lang, {
    en: `**${r.outOfStockCount} out of stock, ${r.lowStockCount} low**`,
    'roman-ur': `**${r.outOfStockCount} khatam, ${r.lowStockCount} kam**`,
    ur: `**${r.outOfStockCount} ختم، ${r.lowStockCount} کم**`,
  })
  return `${head}\n\n${bullets(r.alerts.map((a) => `${a.ingredient}: ${num(a.stock)} ${a.unit || ''} (min ${num(a.minStock)})`))}`
}

function customers(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  if (!r.namedCustomers && !r.walkInSales) return pick(lang, { en: `No customer data for ${when}.`, 'roman-ur': `${when} ka customer data nahi.`, ur: `${when} کا کسٹمر ڈیٹا نہیں۔` })
  const head = pick(lang, {
    en: `**${r.namedCustomers} named customers ${when}** (${r.repeatCustomers} repeat). Walk-in sales: ${money(r.walkInSales, c)}.`,
    'roman-ur': `**${when} ${r.namedCustomers} naam wale customers** (${r.repeatCustomers} dobara aaye). Walk-in sale: ${money(r.walkInSales, c)}.`,
    ur: `**${when} ${r.namedCustomers} نام والے کسٹمرز** (${r.repeatCustomers} دوبارہ آئے)۔ واک ان سیل: ${money(r.walkInSales, c)}۔`,
  })
  const rows = (r.topCustomers || []).map((x) => `${x.name}: ${x.orders} orders · ${money(x.sales, c)}${x.outstanding ? ` · ${pick(lang, { en: 'owes', 'roman-ur': 'baqi', ur: 'باقی' })} ${money(x.outstanding, c)}` : ''}`)
  return rows.length ? `${head}\n\n${bullets(rows)}` : head
}

function tables(r, lang) {
  if (r.tracked === false) return pick(lang, { en: 'No tables are set up yet.', 'roman-ur': 'Abhi koi table set up nahi.', ur: 'ابھی کوئی ٹیبل سیٹ اپ نہیں۔' })
  const occ = r.occupied || []
  const free = r.available || []
  return pick(lang, {
    en: `**${occ.length} occupied, ${free.length} free** of ${r.total}.\n\n- Occupied: ${occ.map((t) => t.name).join(', ') || '—'}\n- Free: ${free.join(', ') || '—'}`,
    'roman-ur': `**${occ.length} bhari hui, ${free.length} khali** (kul ${r.total}).\n\n- Bhari hui: ${occ.map((t) => t.name).join(', ') || '—'}\n- Khali: ${free.join(', ') || '—'}`,
    ur: `**${occ.length} بھری ہوئی، ${free.length} خالی** (کل ${r.total})۔\n\n- بھری ہوئی: ${occ.map((t) => t.name).join(', ') || '—'}\n- خالی: ${free.join(', ') || '—'}`,
  })
}

function expenses(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  const cats = (r.topCategories || []).map((x) => `${x.category}: ${money(x.amount, c)}`)
  const head = pick(lang, {
    en: `**Approved expenses ${when}: ${money(r.approvedTotal, c)}**. Pending: ${money(r.byStatus?.pending, c)}.`,
    'roman-ur': `**${when} ke manzoor shuda kharche: ${money(r.approvedTotal, c)}**. Pending: ${money(r.byStatus?.pending, c)}.`,
    ur: `**${when} کے منظور شدہ خرچے: ${money(r.approvedTotal, c)}**۔ زیر التواء: ${money(r.byStatus?.pending, c)}۔`,
  })
  return cats.length ? `${head}\n\n${bullets(cats)}` : head
}

function cash(r, p, lang, c) {
  const when = periodWords(p.period, lang)
  if (!r.closedSessions) return pick(lang, { en: `No closed cash sessions ${when}.`, 'roman-ur': `${when} koi band cash session nahi.`, ur: `${when} کوئی بند کیش سیشن نہیں۔` })
  const diff = r.difference
  return pick(lang, {
    en: `**${r.closedSessions} closed session${r.closedSessions === 1 ? '' : 's'} ${when}.**\n\n- Expected cash: ${money(r.expectedCash, c)}\n- Counted: ${r.countedCash == null ? '—' : money(r.countedCash, c)}\n- Difference: ${diff == null ? '—' : money(diff, c)}`,
    'roman-ur': `**${when} ${r.closedSessions} session band hue.**\n\n- Expected cash: ${money(r.expectedCash, c)}\n- Ginti: ${r.countedCash == null ? '—' : money(r.countedCash, c)}\n- Farq: ${diff == null ? '—' : money(diff, c)}`,
    ur: `**${when} ${r.closedSessions} سیشن بند ہوئے۔**\n\n- متوقع کیش: ${money(r.expectedCash, c)}\n- گنتی: ${r.countedCash == null ? '—' : money(r.countedCash, c)}\n- فرق: ${diff == null ? '—' : money(diff, c)}`,
  })
}

function kitchen(r, lang) {
  if (!r.active) return pick(lang, { en: 'The kitchen is clear — no active orders.', 'roman-ur': 'Kitchen khali hai — koi active order nahi.', ur: 'کچن خالی ہے — کوئی فعال آرڈر نہیں۔' })
  const head = pick(lang, {
    en: `**${r.active} active**: ${r.pending} pending, ${r.preparing} preparing, ${r.ready} ready.`,
    'roman-ur': `**${r.active} active order**: ${r.pending} pending, ${r.preparing} ban rahe, ${r.ready} tayar.`,
    ur: `**${r.active} فعال آرڈر**: ${r.pending} زیر التواء، ${r.preparing} تیار ہو رہے، ${r.ready} تیار۔`,
  })
  const wait = (r.longestWaiting || []).filter((w) => w.waitingMinutes != null).slice(0, 3).map((w) => `${w.orderNumber}${w.table ? ` (${w.table})` : ''}: ${w.waitingMinutes} min`)
  const tail = wait.length ? `\n\n${pick(lang, { en: 'Longest waiting', 'roman-ur': 'Sab se zyada intezar', ur: 'سب سے زیادہ انتظار' })}:\n${bullets(wait)}` : ''
  return head + tail
}

function draft(r, lang, c) {
  if (r.error) return pick(lang, { en: 'I could not prepare that order.', 'roman-ur': 'Yeh order tayar nahi ho saka.', ur: 'یہ آرڈر تیار نہیں ہو سکا۔' })
  const d = r.draft
  const problems = []
  for (const u of r.unmatched || []) {
    problems.push(pick(lang, { en: `"${u.requested}" is not on the menu${u.suggestions?.length ? ` — did you mean ${u.suggestions.join(' / ')}?` : '.'}`, 'roman-ur': `"${u.requested}" menu mein nahi mila${u.suggestions?.length ? ` — kya aap ka matlab ${u.suggestions.join(' / ')} hai?` : '.'}`, ur: `"${u.requested}" مینو میں نہیں ملا${u.suggestions?.length ? ` — کیا آپ کا مطلب ${u.suggestions.join(' / ')} ہے؟` : '۔'}` }))
  }
  for (const u of r.unavailable || []) problems.push(pick(lang, { en: `${u.item} is not available right now.`, 'roman-ur': `${u.item} abhi available nahi.`, ur: `${u.item} ابھی دستیاب نہیں۔` }))
  if (!d.lines.length) return problems.join('\n') || pick(lang, { en: 'No items matched.', 'roman-ur': 'Koi item match nahi hua.', ur: 'کوئی آئٹم میچ نہیں ہوا۔' })
  const needTable = (!d.orderType || /dine/i.test(d.orderType)) && !d.tableName && !/take|deliv/i.test(d.orderType || '')
  const head = r.readyToConfirm
    ? pick(lang, { en: `Order draft ready — total **${money(d.totals.total, c)}**. Check it and tap Confirm.`, 'roman-ur': `Order draft tayar hai — kul **${money(d.totals.total, c)}**. Dekh kar Confirm dabayein.`, ur: `آرڈر ڈرافٹ تیار ہے — کل **${money(d.totals.total, c)}**۔ دیکھ کر کنفرم دبائیں۔` })
    : pick(lang, { en: 'Draft prepared, but some items need attention:', 'roman-ur': 'Draft bana, lekin kuch items dekhne hain:', ur: 'ڈرافٹ بنا، لیکن کچھ آئٹمز دیکھنے ہیں:' })
  const hint = r.readyToConfirm && needTable
    ? `\n\n${pick(lang, { en: 'Tip: no table was given — Confirm will treat it as takeaway.', 'roman-ur': 'Note: table nahi bataya — Confirm par yeh takeaway ban jayega.', ur: 'نوٹ: ٹیبل نہیں بتایا — کنفرم پر یہ ٹیک اوے بن جائے گا۔' })}`
    : ''
  return `${head}${problems.length ? `\n\n${bullets(problems)}` : ''}${hint}`
}

const HELP = {
  en: '**I can answer from your POS data:**\n\n- Sales, profit, comparisons ("sales today", "today vs yesterday")\n- Top / slowest items, hourly or category sales\n- Orders: unpaid, pending, one order by number (with Print)\n- Menu and prices, stock, tables, kitchen, expenses, cash, customers\n- Place an order: "table 2 ke liye 2 zinger aur 1 cold drink"',
  'roman-ur': '**Main aap ke POS ke data se jawab deta hoon:**\n\n- Sale, munafa, muqabla ("aaj ki sale", "aaj aur kal ka muqabla")\n- Top / sab se kam bikne wale items, ghante ya category ke hisab se sale\n- Orders: unpaid, pending, kisi bhi order ki tafseel (Print ke sath)\n- Menu aur price, stock, tables, kitchen, kharche, cash, customers\n- Order lagana: "table 2 ke liye 2 zinger aur 1 cold drink"',
  ur: '**میں آپ کے POS کے ڈیٹا سے جواب دیتا ہوں:**\n\n- سیل، منافع، مقابلہ ("آج کی سیل"، "آج اور کل کا مقابلہ")\n- ٹاپ / سب سے کم بکنے والے آئٹمز، گھنٹے یا کیٹیگری کے حساب سے سیل\n- آرڈرز: ادھار، زیر التواء، کسی بھی آرڈر کی تفصیل (پرنٹ کے ساتھ)\n- مینو اور قیمتیں، اسٹاک، ٹیبلز، کچن، خرچے، کیش، کسٹمرز\n- آرڈر لگانا: "table 2 ke liye 2 zinger aur 1 cold drink"',
}

export const SMALL_TALK = {
  greeting: { en: 'Hello! Ask me about sales, orders, stock or place an order.', 'roman-ur': 'Assalam o alaikum! Sale, orders, stock ke bare mein poochein ya order lagwayein.', ur: 'السلام علیکم! سیل، آرڈرز، اسٹاک کے بارے میں پوچھیں یا آرڈر لگوائیں۔' },
  thanks: { en: 'You are welcome!', 'roman-ur': 'Khushi hui! Aur kuch poochna ho to batayein.', ur: 'خوشی ہوئی! اور کچھ پوچھنا ہو تو بتائیں۔' },
}

export const NOT_UNDERSTOOD = {
  en: 'I did not understand that. Try: "sales today", "menu", "unpaid orders", "top 5 items", "order 45270", "low stock" or "table 2 ke liye 2 zinger".',
  'roman-ur': 'Mujhe samajh nahi aaya. Aise poochein: "aaj ki sale", "menu", "unpaid orders", "top 5 items", "order 45270", "low stock" ya "table 2 ke liye 2 zinger".',
  ur: 'مجھے سمجھ نہیں آیا۔ ایسے پوچھیں: "آج کی سیل"، "مینو"، "ادھار آرڈرز"، "ٹاپ 5 آئٹمز"، "order 45270"، "کم اسٹاک" یا "table 2 ke liye 2 zinger"۔',
}

export function orderHowTo(lang) {
  return pick(lang, {
    en: 'Tell me the items and table, e.g. "table 2 ke liye 2 zinger aur 1 cold drink" (or "takeaway 1 karahi"). I will prepare a draft for you to confirm.',
    'roman-ur': 'Items aur table bata dein, jaise "table 2 ke liye 2 zinger aur 1 cold drink" (ya "takeaway 1 karahi"). Main draft bana dunga, aap Confirm karein.',
    ur: 'آئٹمز اور ٹیبل بتائیں، جیسے "table 2 ke liye 2 zinger aur 1 cold drink" (یا "takeaway 1 karahi")۔ میں ڈرافٹ بنا دوں گا، آپ کنفرم کریں۔',
  })
}

export function tableOrderAnswer(found, tableName, lang) {
  if (!found) {
    return pick(lang, { en: `Table ${tableName} has no order right now.`, 'roman-ur': `Table ${tableName} par abhi koi order nahi.`, ur: `ٹیبل ${tableName} پر ابھی کوئی آرڈر نہیں۔` })
  }
  const o = found.order
  return pick(lang, {
    en: `Table **${tableName}**: order **${o.orderNumber}**, total **${formatMoneyLabel(o.total, found.currency)}**${o.due > 0 ? `, due ${formatMoneyLabel(o.due, found.currency)}` : ''} (${o.orderStatus}, ${o.paymentStatus}).`,
    'roman-ur': `Table **${tableName}**: order **${o.orderNumber}**, kul **${formatMoneyLabel(o.total, found.currency)}**${o.due > 0 ? `, baqi ${formatMoneyLabel(o.due, found.currency)}` : ''} (${o.orderStatus}, ${o.paymentStatus}).`,
    ur: `ٹیبل **${tableName}**: آرڈر **${o.orderNumber}**، کل **${formatMoneyLabel(o.total, found.currency)}**${o.due > 0 ? `، باقی ${formatMoneyLabel(o.due, found.currency)}` : ''} (${o.orderStatus}، ${o.paymentStatus})۔`,
  })
}

export function helpText(lang) { return pick(lang, HELP) }
export function smallTalk(kind, lang) { return pick(lang, SMALL_TALK[kind]) }
export function notUnderstood(lang) { return pick(lang, NOT_UNDERSTOOD) }

export function notPermitted(lang) {
  return pick(lang, { en: 'Your role is not allowed to see this information.', 'roman-ur': 'Aap ke role ko yeh maloomat dekhne ki ijazat nahi.', ur: 'آپ کے رول کو یہ معلومات دیکھنے کی اجازت نہیں۔' })
}

export function toolFailed(lang) {
  return pick(lang, { en: 'I could not read that from your data. Please try again.', 'roman-ur': 'Yeh data parhne mein masla aaya. Dobara koshish karein.', ur: 'یہ ڈیٹا پڑھنے میں مسئلہ آیا۔ دوبارہ کوشش کریں۔' })
}


const itemPrice = (m) => Number(m?.price ?? m?.sellingPrice ?? m?.unitPrice ?? 0)
const isOff = (m) => m?.available === false || m?.isAvailable === false

/** Menu list, optionally one category or only unavailable dishes. Straight from the menu. */
export function menuAnswer(menu, args, lang, currency = DEFAULT_CURRENCY) {
  const all = (Array.isArray(menu) ? menu : []).filter((m) => String(m?.name || '').trim())
  if (!all.length) return pick(lang, { en: 'The menu is empty.', 'roman-ur': 'Menu abhi khali hai.', ur: 'مینو ابھی خالی ہے۔' })
  let rows = all
  if (args?.category) rows = rows.filter((m) => String(m.category || '').trim() === args.category)
  if (args?.onlyUnavailable) rows = rows.filter(isOff)
  if (!rows.length) {
    return args?.onlyUnavailable
      ? pick(lang, { en: 'Every dish is available right now.', 'roman-ur': 'Abhi saari dishes available hain.', ur: 'ابھی ساری ڈشز دستیاب ہیں۔' })
      : pick(lang, { en: 'No dishes found.', 'roman-ur': 'Koi dish nahi mili.', ur: 'کوئی ڈش نہیں ملی۔' })
  }
  const groups = new Map()
  for (const m of rows) {
    const key = String(m.category || '').trim() || pick(lang, { en: 'Other', 'roman-ur': 'Dusri', ur: 'دیگر' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(m)
  }
  const MAX = 40
  let shown = 0
  const parts = []
  for (const [cat, list] of groups) {
    if (shown >= MAX) break
    const take = list.slice(0, MAX - shown)
    shown += take.length
    parts.push(`**${cat}**\n${bullets(take.map((m) => `${m.name} — ${money(itemPrice(m), currency)}${isOff(m) ? pick(lang, { en: ' (not available)', 'roman-ur': ' (available nahi)', ur: ' (دستیاب نہیں)' }) : ''}`))}`)
  }
  const head = pick(lang, {
    en: `**Menu** — ${rows.length} dish${rows.length === 1 ? '' : 'es'}`,
    'roman-ur': `**Menu** — ${rows.length} dishes`,
    ur: `**مینو** — ${rows.length} ڈشز`,
  })
  const more = rows.length > shown ? `\n\n${pick(lang, { en: `…and ${rows.length - shown} more. Ask for a category to see them.`, 'roman-ur': `…aur ${rows.length - shown} dishes. Category ka naam likhein.`, ur: `…اور ${rows.length - shown} ڈشز۔ کیٹیگری کا نام لکھیں۔` })}` : ''
  return `${head}\n\n${parts.join('\n\n')}${more}`
}

/** One dish: price, category, availability. */
export function itemPriceAnswer(item, lang, currency = DEFAULT_CURRENCY) {
  const off = isOff(item)
  const base = pick(lang, {
    en: `**${item.name}** — ${money(itemPrice(item), currency)}${item.category ? ` (${item.category})` : ''}`,
    'roman-ur': `**${item.name}** — ${money(itemPrice(item), currency)}${item.category ? ` (${item.category})` : ''}`,
    ur: `**${item.name}** — ${money(itemPrice(item), currency)}${item.category ? ` (${item.category})` : ''}`,
  })
  const tail = off
    ? pick(lang, { en: 'Currently not available.', 'roman-ur': 'Abhi available nahi hai.', ur: 'ابھی دستیاب نہیں ہے۔' })
    : pick(lang, { en: 'Available.', 'roman-ur': 'Available hai.', ur: 'دستیاب ہے۔' })
  return `${base}\n\n${tail}`
}

/** Build the reply text for a parsed question and its tool results. */
export function buildAnswer(parsed, results, lang, currency = DEFAULT_CURRENCY) {
  const r = results.main
  const c = currency
  switch (parsed.intent) {
    case 'summary': return summary(r, parsed, lang, c, parsed.profit)
    case 'compare': return compare(results.main, results.other, lang, c)
    case 'sales_by': return salesBy(r, parsed, lang, c)
    case 'item_sales': return itemSales(r, parsed.item, parsed, lang, c)
    case 'top_items': return topItems(r, parsed, lang, c, parsed.slowest)
    case 'list_orders': return listOrders(r, parsed, lang, c)
    case 'order_details': return orderDetails(r, parsed, lang)
    case 'inventory': return inventory(r, lang)
    case 'customers': return customers(r, parsed, lang, c)
    case 'tables': return tables(r, lang)
    case 'expenses': return expenses(r, parsed, lang, c)
    case 'cash': return cash(r, parsed, lang, c)
    case 'kitchen': return kitchen(r, lang)
    case 'place_order': return draft(r, lang, c)
    default: return notUnderstood(lang)
  }
}
