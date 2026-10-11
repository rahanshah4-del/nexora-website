/**
 * Nexora AI — local question understanding (no AI service, no network).
 *
 * Turns a free-text question in Urdu script, Roman Urdu or English into a
 * structured request: an intent (which report/tool) plus entities (period,
 * order number, table, items, filters). It is rule based on purpose: every
 * answer built from it is computed from the owner's own data by the same tool
 * executors the Reports use, so the numbers are exact and it costs nothing.
 *
 * Pure functions only, so it is fully unit-testable.
 */

// ── Normalisation ───────────────────────────────────────────────────────────

const INDIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }

/** Lower-case, unify Arabic/Urdu letter variants, drop diacritics, map digits, keep , + & # - / . */
export function normalizeText(input) {
  let s = String(input ?? '').normalize('NFKC').toLowerCase()
  s = s.replace(/[٠-٩۰-۹]/g, (d) => INDIC_DIGITS[d] || d)
  s = s.replace(/[ً-ٰٟۖ-ۭـ]/g, '') // diacritics + tatweel
  s = s.replace(/[يىئ]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀةھ]/g, 'ہ').replace(/ۃ/g, 'ہ').replace(/ے/g, 'ی').replace(/ۓ/g, 'ی')
  s = s.replace(/[،٫؛]/g, ',')
  s = s.replace(/[^\p{L}\p{N}#+\-/&,]/gu, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export function tokenize(normalized) {
  return normalized.split(/[\s,]+/).filter(Boolean)
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 3
  // Optimal string alignment: insert, delete, substitute, and swap two neighbours.
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** Typo tolerant word equality: exact for short words, 1 edit from 5 letters, 2 from 9. */
export function wordMatches(token, word) {
  if (token === word) return true
  if (!/^[a-z0-9]+$/.test(word) || !/^[a-z0-9]+$/.test(token)) return false
  if (word.length >= 9) return levenshtein(token, word) <= 2
  if (word.length >= 5 && token.length >= 4) return levenshtein(token, word) <= 1
  return false
}

// ── Lexicon (written as people actually type; normalised at load) ───────────

const N = normalizeText
const list = (...words) => words.map(N)

const LEX = {
  summary: {
    strong: list('sale', 'sales', 'sell', 'selling', 'bikri', 'bikari', 'farokht', 'farookht', 'revenue', 'income', 'kamai', 'kamayi', 'kamaya', 'collection', 'wasooli', 'wasool', 'turnover', 'business', 'hisab', 'hisaab', 'khulasa', 'summary', 'report', 'kaisa chal raha', 'kaisa raha', 'earning', 'earnings', 'سیل', 'سیلز', 'بکری', 'فروخت', 'آمدنی', 'آمدن', 'کمائی', 'کتنا کمایا', 'وصولی', 'وصول', 'حساب', 'خلاصہ', 'رپورٹ', 'کاروبار'),
    weak: list('total', 'kul', 'kitna', 'kitni', 'kitne', 'how much', 'performance', 'کل رقم', 'کتنی', 'کتنا', 'کتنے'),
  },
  profit: {
    strong: list('profit', 'munafa', 'nafa', 'nafah', 'margin', 'نفع', 'منافع', 'منافعہ'),
    weak: [],
  },
  top_items: {
    strong: list('top items', 'top item', 'top selling', 'best selling', 'best seller', 'bestseller', 'bestsellers', 'sab se zyada', 'sab se ziada', 'sabse zyada', 'sabse ziada', 'zyada bikne', 'zyada bikta', 'ziada bikne', 'ziada bikta', 'zyada bik', 'popular', 'mashhoor', 'trending', 'slowest', 'sab se kam', 'sabse kam', 'kam bikne', 'kam bikta', 'least selling', 'سب سے زیادہ', 'زیادہ بکنی', 'زیادہ بکتی', 'ٹاپ', 'مقبول', 'سب سے کم', 'کم بکنی'),
    weak: list('top', 'best', 'items', 'item', 'menu', 'dish', 'dishes', 'cheez', 'cheezein', 'cheezen', 'products', 'aitam', 'آئٹم', 'آئٹمز', 'ڈش'),
  },
  list_orders: {
    strong: list('orders', 'order list', 'orders list', 'unpaid', 'baqi', 'baqaya', 'baqiya', 'baki', 'udhar', 'udhaar', 'adhar', 'due', 'آرڈرز', 'ارڈرز', 'آرڈر لسٹ', 'ادھار', 'باقی', 'بقایا'),
    weak: list('order', 'orders', 'bill', 'bills', 'pending', 'cancelled', 'canceled', 'cancel', 'partial', 'آرڈر', 'ارڈر', 'بل', 'بلز'),
  },
  inventory: {
    strong: list('stock', 'inventory', 'maal', 'ingredient', 'ingredients', 'khatam', 'low stock', 'out of stock', 'rashan', 'raashan', 'samaan', 'saman', 'سامان', 'اسٹاک', 'سٹاک', 'راشن', 'مال', 'ختم', 'انوینٹری'),
    weak: list('kam', 'low', 'remaining', 'bacha', 'bachay', 'bachi', 'بچا', 'کم'),
  },
  customers: {
    strong: list('customer', 'customers', 'gahak', 'grahak', 'client', 'clients', 'regular', 'loyal', 'repeat', 'گاہک', 'کسٹمر', 'کسٹمرز', 'گاہکوں'),
    weak: [],
  },
  tables: {
    strong: list('table', 'tables', 'mez', 'mezain', 'khali', 'occupied', 'free tables', 'ٹیبل', 'ٹیبلز', 'میز', 'میزیں', 'خالی'),
    weak: list('busy', 'free', 'available'),
  },
  expenses: {
    strong: list('expense', 'expenses', 'kharcha', 'kharch', 'kharche', 'kharchay', 'akhrajat', 'akhrajaat', 'spending', 'spent', 'خرچ', 'خرچہ', 'خرچے', 'اخراجات'),
    weak: [],
  },
  cash: {
    strong: list('cash session', 'cash drawer', 'drawer', 'galla', 'gallay', 'closing cash', 'cash difference', 'shift', 'counted', 'cash in hand', 'reconciliation', 'cash short', 'نقدی', 'گلہ', 'شفٹ'),
    weak: list('cash', 'naqd', 'نقد', 'کیش'),
  },
  kitchen: {
    strong: list('kitchen', 'kot', 'bawarchi', 'bawarchikhana', 'chef', 'preparing', 'wait time', 'kitna wait', 'waiting', 'کچن', 'باورچی', 'تیاری'),
    weak: list('ready', 'tayar', 'تیار'),
  },
  compare: {
    strong: list('compare', 'comparison', 'muqabla', 'muqabala', 'mukabla', 'versus', 'vs', 'farq', 'aaj aur kal', 'today and yesterday', 'today vs yesterday', 'مقابلہ', 'مقابلہ', 'فرق'),
    weak: [],
  },
  greeting: { strong: list('salam', 'assalam', 'assalamualaikum', 'assalam o alaikum', 'hello', 'hi', 'hey', 'good morning', 'good evening', 'سلام', 'السلام علیکم', 'ہیلو'), weak: [] },
  help: { strong: list('help', 'madad', 'kya kar sakte', 'kya kya', 'what can you do', 'aap kya', 'commands', 'مدد', 'کیا کر سکتے', 'کیا کیا'), weak: [] },
  thanks: { strong: list('shukriya', 'shukria', 'thanks', 'thank you', 'thank', 'jazakallah', 'شکریہ', 'جزاک اللہ'), weak: [] },
}

const GROUPING_WORDS = {
  payment_method: list('payment method', 'payment methods', 'cash card', 'cash aur card', 'jazzcash', 'easypaisa', 'card sales', 'cash sales', 'method wise', 'payment wise', 'ادائیگی کا طریقہ', 'کارڈ'),
  category: list('category', 'categories', 'category wise', 'kism', 'کیٹیگری', 'کیٹگری'),
  hour: list('hour', 'hourly', 'ghanta', 'ghante', 'peak', 'rush', 'busy time', 'sab se busy', 'kis waqt', 'kis time', 'گھنٹہ', 'گھنٹے', 'پیک', 'رش'),
  staff: list('staff', 'cashier', 'waiter', 'employee', 'کیشیئر', 'کیشئر', 'ویٹر', 'سٹاف', 'اسٹاف'),
  order_type: list('dine in', 'dinein', 'takeaway', 'take away', 'delivery', 'order type', 'ڈائن ان', 'ٹیک اوے', 'ڈیلیوری'),
  day: list('day wise', 'daily', 'rozana', 'har din', 'din ba din', 'day by day', 'روزانہ', 'ہر دن'),
}

const SALES_WORDS = list('sale', 'sales', 'bikri', 'revenue', 'income', 'kamai', 'farokht', 'collection', 'سیل', 'سیلز', 'بکری', 'فروخت', 'آمدنی')
const SOLD_WORDS = list('bike', 'bika', 'bikay', 'biki', 'bik', 'sold', 'sell', 'sale', 'bikri', 'kitne', 'kitni', 'kitna', 'how many', 'count', 'qty', 'quantity', 'بکے', 'بکا', 'بکی', 'بکے', 'کتنے', 'کتنی')
const PLACE_VERBS = list('karo', 'kardo', 'kar do', 'lagao', 'laga do', 'lagado', 'banao', 'bana do', 'banado', 'dedo', 'de do', 'order do', 'order dena', 'place', 'create', 'add', 'chahiye', 'chahiyen', 'bhejo', 'لگاؤ', 'لگا دو', 'بناؤ', 'بنا دو', 'چاہیے', 'چاہئے', 'کرو', 'کر دو')
const ORDER_WORDS = list('order', 'orders', 'آرڈر', 'ارڈر')
const SHOW_WORDS = list('dikhao', 'dikha', 'dekho', 'batao', 'bata', 'btao', 'show', 'tell', 'detail', 'details', 'tafseel', 'tafsil', 'tafseelat', 'print', 'nikalo', 'دکھاؤ', 'دکھا', 'بتاؤ', 'بتا', 'تفصیل', 'پرنٹ', 'نکالو')
const PRINT_WORDS = list('print', 'prnt', 'پرنٹ', 'nikalo print', 'parchi')

// ── Matching helpers ────────────────────────────────────────────────────────

function hasEntry(tokens, joined, entry) {
  if (!entry) return false
  if (entry.includes(' ')) return joined.includes(` ${entry} `)
  return tokens.some((t) => wordMatches(t, entry))
}

function hasAny(tokens, joined, entries) {
  return entries.some((e) => hasEntry(tokens, joined, e))
}

function score(tokens, joined, lex) {
  // Each typed word counts once, so near-duplicate lexicon entries ("hisab"/"hisaab") don't double count.
  const used = new Set()
  let s = 0
  const add = (entries, weight) => {
    for (const e of entries) {
      if (e.includes(' ')) {
        if (joined.includes(` ${e} `)) s += weight
        continue
      }
      const idx = tokens.findIndex((t, i) => !used.has(i) && wordMatches(t, e))
      if (idx >= 0) { used.add(idx); s += weight }
    }
  }
  add(lex.strong, 3)
  add(lex.weak, 1)
  return s
}

// ── Entities ────────────────────────────────────────────────────────────────

const NUMBER_WORDS = new Map(Object.entries({
  ek: 1, one: 1, 'ایک': 1, do: 2, two: 2, 'دو': 2, teen: 3, three: 3, 'تین': 3, char: 4, chaar: 4, four: 4, 'چار': 4,
  panch: 5, paanch: 5, five: 5, 'پانچ': 5, chhe: 6, che: 6, chay: 6, six: 6, 'چھ': 6, 'چہ': 6, saat: 7, seven: 7, 'سات': 7,
  aath: 8, ath: 8, eight: 8, 'آٹھ': 8, nau: 9, no: 9, nine: 9, 'نو': 9, das: 10, ten: 10, 'دس': 10,
}))

const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 }

const pad2 = (n) => String(n).padStart(2, '0')

function validDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Detect the period the question is about. Returns { key, from?, to? } or null. */
export function detectPeriod(normalized, tokens, now = new Date()) {
  const joined = ` ${normalized} `
  const iso = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso && validDate(+iso[1], +iso[2], +iso[3])) {
    const key = `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`
    return { key: 'custom', from: key, to: key }
  }
  const dmy = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/)
  if (dmy && validDate(+dmy[3], +dmy[2], +dmy[1])) {
    const key = `${dmy[3]}-${pad2(dmy[2])}-${pad2(dmy[1])}`
    return { key: 'custom', from: key, to: key }
  }
  const dMon = normalized.match(/\b(\d{1,2})\s*(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b(?:\s*(20\d{2}))?/)
  if (dMon) {
    const year = dMon[3] ? +dMon[3] : now.getFullYear()
    const month = MONTHS[dMon[2]]
    if (validDate(year, month, +dMon[1])) {
      const key = `${year}-${pad2(month)}-${pad2(dMon[1])}`
      return { key: 'custom', from: key, to: key }
    }
  }

  const has = (...e) => hasAny(tokens, joined, e.map(N))
  if (has('yesterday', 'kal', 'guzishta kal', 'گزشتہ کل', 'کل') && !has('aaj aur kal', 'aaj kal')) {
    if (!has('aaj', 'today', 'آج')) return { key: 'yesterday' }
  }
  if (has('7 din', '7 days', 'last 7', 'pichle 7', 'hafta', 'hafte', 'haftay', 'haftawar', 'week', 'weekly', 'ہفتہ', 'ہفتے', 'ہفتی', '7 دن')) return { key: '7d' }
  if (has('30 din', '30 days', 'last 30', 'mahina', 'mahine', 'mahinay', 'month', 'monthly', 'مہینہ', 'مہینی', 'مہینے', '30 دن')) return { key: '30d' }
  if (has('all time', 'ab tak', 'shuru se', 'overall', 'har waqt', 'ساری مدت', 'اب تک', 'شروع سے')) return { key: 'all' }
  if (has('today', 'aaj', 'آج', 'abhi tak', 'is waqt')) return { key: 'today' }
  if (has('yesterday', 'kal', 'کل')) return { key: 'yesterday' }
  return null
}

/** Order number: "#1002", "order 1002", "bill no D-1002", or a bare number. */
export function detectOrderNumber(normalized) {
  const m1 = normalized.match(/(?:^|\s)#\s*([a-z]{0,2}-?\d{3,9})\b/)
  if (m1) return m1[1]
  const m2 = normalized.match(/(?:order|bill|kot|آرڈر|ارڈر|نمبر)\s*(?:no|number|num|نمبر)?\s*#?\s*([a-z]{0,2}-?\d{3,9})\b/)
  if (m2) return m2[1]
  const m3 = normalized.match(/^([a-z]{0,2}-?\d{4,9})$/)
  return m3 ? m3[1] : ''
}

export function detectTopN(normalized) {
  const m = normalized.match(/\b(?:top|ٹاپ)\s*(\d{1,2})\b/) || normalized.match(/\b(\d{1,2})\s*(?:top|items|item|cheezein|cheezen|best|آئٹم|آئٹمز)\b/)
  return m ? Math.min(20, Math.max(1, Number(m[1]))) : 0
}

const PHONE_RE = /(?:\+?92|0)3\d{2}[\s-]?\d{7}/

function extractTable(normalized) {
  const re = /(?:^|\s)(?:table|tbl|mez|میز|ٹیبل)\s*(?:no|number|#)?\s*#?\s*([a-z]?-?\d{1,3}[a-z]?)(?=\s|$)/
  const m = normalized.match(re)
  if (m) return { raw: m[1], text: m[0] }
  const t = normalized.match(/(?:^|\s)(t-?\d{1,3})(?=\s|$)/)
  if (t) return { raw: t[1], text: t[0] }
  return null
}

/** Map what the person typed ("2", "t2", "table 2") to a real table id/name. */
export function resolveTableName(raw, tables = []) {
  const wanted = N(raw).replace(/[\s-]/g, '')
  if (!wanted) return ''
  const list = (Array.isArray(tables) ? tables : []).map((t) => String(t?.name || t?.id || '').trim()).filter(Boolean)
  const exact = list.find((n) => N(n).replace(/[\s-]/g, '') === wanted)
  if (exact) return exact
  const digits = wanted.replace(/\D/g, '')
  if (digits) {
    const byDigits = list.filter((n) => n.replace(/\D/g, '') === digits)
    if (byDigits.length === 1) return byDigits[0]
  }
  return String(raw).trim()
}

const ITEM_STOPWORDS = new Set(list(
  'order', 'orders', 'karo', 'kar', 'do', 'dena', 'dedo', 'de', 'lagao', 'laga', 'banao', 'bana', 'ke', 'ki', 'ka', 'ko', 'liye', 'lie', 'k', 'for', 'please', 'plz', 'pls',
  'mujhe', 'hume', 'humein', 'chahiye', 'table', 'tbl', 'mez', 'dine', 'in', 'takeaway', 'take', 'away', 'delivery', 'parcel', 'pickup', 'new', 'naya', 'add', 'place', 'create',
  'wala', 'wali', 'wale', 'aap', 'zara', 'bhai', 'sir', 'ji', 'jee', 'hai', 'hain', 'a', 'an', 'the', 'of', 'from', 'with', 'customer', 'phone', 'number', 'no', 'bhejo',
  'کرو', 'کر', 'دو', 'دینا', 'لگاؤ', 'لگا', 'بناؤ', 'بنا', 'کے', 'کی', 'کا', 'کو', 'لیے', 'لئے', 'آرڈر', 'ارڈر', 'چاہیے', 'چاہئے', 'مجھے', 'ٹیبل', 'میز',
))
const SEPARATOR_RE = /\s+(?:aur|and|plus|or|sath|saath|اور|ساتھ)\s+|\s*[,+&]\s*/

function toQuantity(token, isFirst, hasFollower) {
  if (/^\d{1,3}$/.test(token)) return Number(token)
  const x = token.match(/^(\d{1,3})x$/) || token.match(/^x(\d{1,3})$/)
  if (x) return Number(x[1])
  if (NUMBER_WORDS.has(token)) {
    if (token === 'do' && !(isFirst && hasFollower)) return 0
    if (token === 'دو' && !(isFirst && hasFollower)) return 0
    if (token === 'no') return 0
    return NUMBER_WORDS.get(token)
  }
  return 0
}

/** "T2 ke liye 2 zinger aur 1 cold drink" → [{ name:'zinger', quantity:2 }, { name:'cold drink', quantity:1 }] */
export function parseOrderItems(normalized) {
  const table = extractTable(normalized)
  let rest = table ? normalized.replace(table.text, ' ') : normalized
  rest = rest.replace(PHONE_RE, ' ')
  const out = []
  for (const segment of rest.split(SEPARATOR_RE)) {
    const tokens = tokenize(segment.trim())
    let quantity = 0
    const nameTokens = []
    tokens.forEach((token, i) => {
      if (!quantity) {
        const nonStop = tokens.slice(i + 1).some((t) => !ITEM_STOPWORDS.has(t) && !toQuantity(t, false, false))
        const q = toQuantity(token, nameTokens.length === 0, nonStop)
        if (q) { quantity = q; return }
      }
      if (ITEM_STOPWORDS.has(token)) return
      if (/^\d+$/.test(token)) return
      nameTokens.push(token)
    })
    const name = nameTokens.join(' ').trim()
    if (name) out.push({ name, quantity: Math.min(99, quantity || 1), explicitQuantity: quantity > 0 })
  }
  return out
}

/**
 * The menu item a question names: every word of its name present (typo tolerant),
 * or one distinctive word that no other menu item shares ("zinger" → Zinger Burger).
 */
export function findMenuMention(tokens, menu = []) {
  const items = (Array.isArray(menu) ? menu : []).map((item) => ({ item, words: tokenize(N(item?.name)).filter((t) => t.length >= 2) })).filter((x) => x.words.length)
  const owners = new Map()
  for (const { item, words } of items) for (const w of new Set(words)) owners.set(w, (owners.get(w) || new Set()).add(item))
  let best = null
  for (const { item, words } of items) {
    const matched = words.filter((nt) => tokens.some((t) => wordMatches(t, nt)))
    if (!matched.length) continue
    const all = matched.length === words.length
    const distinctive = matched.some((w) => w.length >= 4 && owners.get(w).size === 1)
    if (!all && !distinctive) continue
    const weight = matched.join('').length + (all ? 100 : 0)
    if (!best || weight > best.weight) best = { item, weight }
  }
  return best ? best.item : null
}

// ── Main entry ──────────────────────────────────────────────────────────────

const TIE_ORDER = ['kitchen', 'tables', 'cash', 'expenses', 'inventory', 'customers', 'top_items', 'list_orders', 'summary']

const FILTER_WORDS = {
  unpaid: list('unpaid', 'baqi', 'baqaya', 'baqiya', 'baki', 'udhar', 'udhaar', 'adhar', 'due', 'ادھار', 'باقی', 'بقایا', 'payment nahi', 'payment pending'),
  partial: list('partial', 'adhi', 'ادھوری'),
  paid: list('paid', 'ادا شدہ', 'payment ho gayi', 'payment ho gai'),
  pending: list('pending', 'نئے آرڈر', 'زیر التواء'),
  preparing: list('preparing', 'ban raha', 'ban rahe', 'تیار ہو رہا'),
  ready: list('ready', 'tayar hai', 'تیار ہے'),
  served: list('served', 'complete', 'completed', 'پیش'),
  cancelled: list('cancelled', 'canceled', 'cancel', 'منسوخ'),
  dine_in: list('dine in', 'dinein', 'ڈائن ان'),
  takeaway: list('takeaway', 'take away', 'parcel', 'pickup', 'ٹیک اوے'),
  delivery: list('delivery', 'ڈیلیوری'),
}

/**
 * @param {string} question
 * @param {{ menu?: object[], tables?: object[], context?: {intent?: string, args?: object}, now?: Date }} [opts]
 * @returns {object} { intent, confidence, period, args, ... } — intent 'unknown' when not understood
 */
export function parseQuestion(question, { menu = [], tables = [], context = null, now = new Date() } = {}) {
  const normalized = normalizeText(question)
  const tokens = tokenize(normalized)
  const joined = ` ${normalized} `
  const base = { question: String(question || ''), normalized, period: detectPeriod(normalized, tokens, now), wantPrint: hasAny(tokens, joined, PRINT_WORDS) }
  if (!tokens.length) return { ...base, intent: 'unknown', confidence: 0 }

  const orderNumber = detectOrderNumber(normalized)
  const showWord = hasAny(tokens, joined, SHOW_WORDS)
  const placeVerb = hasAny(tokens, joined, PLACE_VERBS)
  const orderWord = hasAny(tokens, joined, ORDER_WORDS)
  const mention = findMenuMention(tokens, menu)
  const items = parseOrderItems(normalized)
  const soldWord = hasAny(tokens, joined, SOLD_WORDS)
  const salesWord = hasAny(tokens, joined, SALES_WORDS)

  // 1. A specific order
  if (orderNumber && !(placeVerb && items.length && !showWord)) return { ...base, intent: 'order_details', confidence: 1, orderNumber }

  // 2. Placing an order
  const matchedItems = items.filter((i) => findMenuMention(tokenize(i.name), menu) || menu.length === 0 || i.explicitQuantity)
  const tableMention = extractTable(normalized)
  const implicitPlace = !placeVerb && menu.length > 0 && items.length > 0 && !soldWord && !salesWord && !showWord &&
    items.every((i) => findMenuMention(tokenize(i.name), menu)) && (tableMention || items.some((i) => i.explicitQuantity))
  if ((placeVerb || implicitPlace) && matchedItems.length && (orderWord || mention || implicitPlace || matchedItems.some((i) => i.explicitQuantity)) && !(showWord && !orderWord)) {
    const table = extractTable(normalized)
    const phone = (normalized.match(PHONE_RE) || [''])[0].replace(/[\s-]/g, '')
    let orderType = ''
    if (hasAny(tokens, joined, FILTER_WORDS.delivery)) orderType = 'Delivery'
    else if (hasAny(tokens, joined, FILTER_WORDS.takeaway)) orderType = 'Takeaway'
    else if (hasAny(tokens, joined, FILTER_WORDS.dine_in) || table) orderType = 'Dine-in'
    return {
      ...base, intent: 'place_order', confidence: 0.9,
      args: {
        items: matchedItems.map(({ name, quantity }) => ({ name, quantity })),
        orderType, tableName: table ? resolveTableName(table.raw, tables) : '', customerPhone: phone,
      },
    }
  }
  if (placeVerb && orderWord && !matchedItems.length && hasAny(tokens, joined, list('naya', 'new', 'نیا'))) {
    return { ...base, intent: 'place_order', confidence: 0.6, args: { items: [] } }
  }

  // 3. Compare today with yesterday
  if (hasAny(tokens, joined, LEX.compare.strong) && (salesWord || hasAny(tokens, joined, list('aaj', 'today', 'kal', 'yesterday', 'آج', 'کل')))) {
    return { ...base, intent: 'compare', confidence: 0.9 }
  }

  // 4. Sales grouped by something
  const groupingHits = Object.entries(GROUPING_WORDS).filter(([, words]) => hasAny(tokens, joined, words))
  const nonTable = groupingHits.filter(([g]) => g !== 'order_type' || salesWord || hasAny(tokens, joined, list('wise', 'vs', 'aur', 'and')))
  if (nonTable.length && (salesWord || nonTable.some(([g]) => g === 'hour' || g === 'staff' || g === 'category' || g === 'payment_method'))) {
    const peak = hasAny(tokens, joined, list('peak', 'rush', 'busy time', 'پیک', 'رش'))
    if (!(hasAny(tokens, joined, LEX.kitchen.strong) && !salesWord)) {
      return { ...base, intent: 'sales_by', confidence: 0.85, args: { groupBy: nonTable[0][0] }, peak }
    }
  }

  // 5. How many of one dish were sold
  if (mention && (soldWord || salesWord) && !placeVerb) return { ...base, intent: 'item_sales', confidence: 0.9, item: mention }

  // 6. Generic scoring
  const scores = {}
  for (const key of ['summary', 'top_items', 'list_orders', 'inventory', 'customers', 'tables', 'expenses', 'cash', 'kitchen']) scores[key] = score(tokens, joined, LEX[key])
  const profitHit = score(tokens, joined, LEX.profit) > 0
  if (profitHit) scores.summary += 3
  if (hasAny(tokens, joined, list('top', 'best', 'ٹاپ')) && hasAny(tokens, joined, list('items', 'item', 'cheez', 'cheezein', 'cheezen', 'menu', 'dish', 'dishes', 'products', 'آئٹم', 'آئٹمز', 'ڈش'))) scores.top_items += 2
  const filterUnpaid = hasAny(tokens, joined, FILTER_WORDS.unpaid)
  if (filterUnpaid) scores.list_orders += 3
  const best = TIE_ORDER.map((k) => [k, scores[k]]).sort((a, b) => b[1] - a[1])[0]

  if (best && best[1] >= 3) {
    const intent = best[0]
    const result = { ...base, intent, confidence: Math.min(1, best[1] / 6), profit: profitHit }
    if (intent === 'top_items') {
      result.args = { limit: detectTopN(normalized) || 5, by: hasAny(tokens, joined, list('revenue', 'income', 'kamai', 'amdani', 'آمدنی', 'رقم')) ? 'revenue' : 'quantity' }
      result.slowest = hasAny(tokens, joined, list('slowest', 'sab se kam', 'sabse kam', 'kam bikne', 'kam bikta', 'least selling', 'سب سے کم', 'کم بکنی'))
    }
    if (intent === 'list_orders') {
      const args = {}
      if (filterUnpaid) args.paymentStatus = 'unpaid'
      else if (hasAny(tokens, joined, FILTER_WORDS.partial)) args.paymentStatus = 'partial'
      else if (hasAny(tokens, joined, FILTER_WORDS.paid)) args.paymentStatus = 'paid'
      for (const status of ['pending', 'preparing', 'ready', 'served', 'cancelled']) {
        if (!args.status && hasAny(tokens, joined, FILTER_WORDS[status])) args.status = status
      }
      if (hasAny(tokens, joined, FILTER_WORDS.dine_in)) args.orderType = 'dine_in'
      else if (hasAny(tokens, joined, FILTER_WORDS.takeaway)) args.orderType = 'takeaway'
      else if (hasAny(tokens, joined, FILTER_WORDS.delivery)) args.orderType = 'delivery'
      args.limit = detectTopN(normalized) || 10
      result.args = args
    }
    return result
  }

  // 7. Small talk
  for (const key of ['thanks', 'greeting', 'help']) {
    if (hasAny(tokens, joined, LEX[key].strong)) return { ...base, intent: key, confidence: 1 }
  }

  // 8. Follow-up: "aur kal?" / "is hafte ka?" keeps the previous topic with a new period
  if (context?.intent && base.period) return { ...base, intent: context.intent, confidence: 0.5, followUp: true, args: context.args, profit: context.profit, slowest: context.slowest, item: context.item, peak: context.peak }

  return { ...base, intent: 'unknown', confidence: 0 }
}
