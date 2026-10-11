/**
 * Nexora AI — language and text helpers for the chat window. Pure, no React.
 *
 * Message text is only ever parsed into plain segments (never HTML), so model
 * output and menu/customer names cannot inject markup.
 */

export const AI_LANGUAGES = Object.freeze([
  { value: 'auto', label: 'Auto' },
  { value: 'ur', label: 'اردو' },
  { value: 'roman-ur', label: 'Roman Urdu' },
  { value: 'en', label: 'English' },
])

const URDU_SCRIPT = /[؀-ۿݐ-ݿ]/
const ROMAN_URDU_WORDS = /\b(kitn[aiey]|aaj|kal|kya|kiya|hai|hain|ka|ki|ke|ko|mein|me|mujhe|mera|meri|mere|batao|bata|dikhao|dikha|dekho|nikalo|karo|kar|hua|hui|wala|wali|sab|abhi|kaun|kaunsa|konsa|kab|kahan|kyun|nahi|nahin|bill|sale|hisab|order)\b/i
const ROMAN_URDU_STRONG = /\b(kitn[aiey]|mujhe|mera|meri|batao|dikhao|nikalo|kaunsa|konsa|kyun|nahi|nahin|hisab|aaj ki|kal ki)\b/i

/** Guess the language of a single message: 'ur' | 'roman-ur' | 'en'. */
export function detectLanguage(textValue) {
  const value = String(textValue || '')
  if (URDU_SCRIPT.test(value)) return 'ur'
  if (ROMAN_URDU_STRONG.test(value)) return 'roman-ur'
  const hits = value.match(new RegExp(ROMAN_URDU_WORDS.source, 'gi')) || []
  return hits.length >= 2 ? 'roman-ur' : 'en'
}

/** The language used for UI hints (status lines, suggestions). */
export function effectiveLanguage(setting, lastUserText = '') {
  if (setting === 'ur' || setting === 'roman-ur' || setting === 'en') return setting
  return lastUserText ? detectLanguage(lastUserText) : 'roman-ur'
}

export function textDirection(value) {
  return URDU_SCRIPT.test(String(value || '')) ? 'rtl' : 'ltr'
}

const SUGGESTIONS = Object.freeze({
  en: [
    "How are today's sales?",
    'Top 5 selling items this week',
    'Which orders are unpaid?',
    'Is any stock running low?',
    'What is happening in the kitchen now?',
    'Compare today with yesterday',
  ],
  'roman-ur': [
    'Aaj ki sale kitni hui?',
    'Is hafte ke top 5 items batao',
    'Kaun se orders ka payment baqi hai?',
    'Kya koi stock khatam ho raha hai?',
    'Kitchen mein abhi kya chal raha hai?',
    'Aaj aur kal ki sale ka muqabla karo',
  ],
  ur: [
    'آج کی سیل کتنی ہوئی؟',
    'اس ہفتے کے سب سے زیادہ بکنے والے 5 آئٹمز بتائیں',
    'کن آرڈرز کی ادائیگی باقی ہے؟',
    'کیا کوئی اسٹاک ختم ہو رہا ہے؟',
    'کچن میں ابھی کیا چل رہا ہے؟',
    'آج اور کل کی سیل کا موازنہ کریں',
  ],
})

export function suggestionsFor(language) {
  return SUGGESTIONS[language] || SUGGESTIONS['roman-ur']
}

const STATUS = Object.freeze({
  en: {
    get_business_summary: 'Checking the business summary…',
    get_sales_report: 'Preparing the sales report…',
    list_orders: 'Looking through orders…',
    get_order_details: 'Opening the order…',
    get_top_items: 'Ranking best sellers…',
    get_inventory_status: 'Checking stock levels…',
    get_customers_summary: 'Looking at customers…',
    get_tables_status: 'Checking tables…',
    get_expenses_summary: 'Adding up expenses…',
    get_cash_session_summary: 'Checking the cash drawer…',
    get_kitchen_status: 'Checking the kitchen…',
    propose_order: 'Preparing an order draft…',
    _default: 'Working on it…',
  },
  'roman-ur': {
    get_business_summary: 'Business ka khulasa dekh raha hun…',
    get_sales_report: 'Sales report bana raha hun…',
    list_orders: 'Orders dekh raha hun…',
    get_order_details: 'Order khol raha hun…',
    get_top_items: 'Sab se zyada bikne wale items dekh raha hun…',
    get_inventory_status: 'Stock check kar raha hun…',
    get_customers_summary: 'Customers dekh raha hun…',
    get_tables_status: 'Tables check kar raha hun…',
    get_expenses_summary: 'Kharche jama kar raha hun…',
    get_cash_session_summary: 'Cash drawer check kar raha hun…',
    get_kitchen_status: 'Kitchen check kar raha hun…',
    propose_order: 'Order ka draft bana raha hun…',
    _default: 'Kaam kar raha hun…',
  },
  ur: {
    get_business_summary: 'کاروبار کا خلاصہ دیکھ رہا ہوں…',
    get_sales_report: 'سیل رپورٹ بنا رہا ہوں…',
    list_orders: 'آرڈرز دیکھ رہا ہوں…',
    get_order_details: 'آرڈر کھول رہا ہوں…',
    get_top_items: 'سب سے زیادہ بکنے والے آئٹمز دیکھ رہا ہوں…',
    get_inventory_status: 'اسٹاک چیک کر رہا ہوں…',
    get_customers_summary: 'گاہکوں کو دیکھ رہا ہوں…',
    get_tables_status: 'ٹیبلز چیک کر رہا ہوں…',
    get_expenses_summary: 'اخراجات جمع کر رہا ہوں…',
    get_cash_session_summary: 'کیش دراز چیک کر رہا ہوں…',
    get_kitchen_status: 'کچن چیک کر رہا ہوں…',
    propose_order: 'آرڈر کا مسودہ بنا رہا ہوں…',
    _default: 'کام کر رہا ہوں…',
  },
})

export function toolStatusLabel(name, language) {
  const table = STATUS[language] || STATUS['roman-ur']
  return table[name] || table._default
}

const ERRORS = Object.freeze({
  en: {
    auth: 'Your session has expired. Please sign in again.',
    rate: 'Too many questions in a short time. Please wait a minute.',
    too_long: 'That conversation got too long. Please clear the chat and try again.',
    unavailable: 'Nexora AI is temporarily unavailable. Please try again shortly.',
    network: 'No connection. Check your internet and try again.',
    too_many_steps: 'This question needed too many steps. Please ask it in a simpler way.',
    no_data: 'Your restaurant data is still loading. Please try again in a moment.',
    aborted: 'Stopped.',
    unknown: 'Something went wrong. Please try again.',
  },
  'roman-ur': {
    auth: 'Aap ka session khatam ho gaya. Dobara sign in karein.',
    rate: 'Thori der mein bohat zyada sawal ho gaye. Ek minute baad try karein.',
    too_long: 'Chat bohat lambi ho gayi. Chat clear kar ke dobara try karein.',
    unavailable: 'Nexora AI abhi dastiyab nahi. Thori der baad try karein.',
    network: 'Internet nahi hai. Connection check kar ke dobara try karein.',
    too_many_steps: 'Is sawal ke liye bohat steps lag rahe hain. Sawal aasan alfaz mein puchein.',
    no_data: 'Aap ke restaurant ka data abhi load ho raha hai. Thori der baad try karein.',
    aborted: 'Rok diya.',
    unknown: 'Kuch masla ho gaya. Dobara try karein.',
  },
  ur: {
    auth: 'آپ کا سیشن ختم ہو گیا ہے۔ دوبارہ سائن اِن کریں۔',
    rate: 'تھوڑی دیر میں بہت زیادہ سوال ہو گئے۔ ایک منٹ بعد کوشش کریں۔',
    too_long: 'چیٹ بہت لمبی ہو گئی ہے۔ چیٹ صاف کر کے دوبارہ کوشش کریں۔',
    unavailable: 'نیکسورا اے آئی ابھی دستیاب نہیں۔ تھوڑی دیر بعد کوشش کریں۔',
    network: 'انٹرنیٹ نہیں ہے۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    too_many_steps: 'اس سوال کے لیے بہت زیادہ مراحل لگ رہے ہیں۔ سوال آسان الفاظ میں پوچھیں۔',
    no_data: 'آپ کے ریسٹورنٹ کا ڈیٹا ابھی لوڈ ہو رہا ہے۔ تھوڑی دیر بعد کوشش کریں۔',
    aborted: 'روک دیا۔',
    unknown: 'کچھ مسئلہ ہو گیا۔ دوبارہ کوشش کریں۔',
  },
})

export function friendlyError(code, language) {
  const table = ERRORS[language] || ERRORS['roman-ur']
  return table[code] || table.unknown
}

// ── Order confirmation messages ─────────────────────────────────────────────

const ORDER_ERRORS = Object.freeze({
  en: {
    not_permitted: 'Your role is not allowed to create orders.',
    not_signed_in: 'Please sign in again to save orders.',
    empty: 'The draft has no items.',
    duplicate: 'This order was already saved.',
    bad_order_type: 'Unknown order type. Please say dine-in or takeaway.',
    delivery_unsupported: 'Delivery orders need an address. Please create them from the POS.',
    table_required: 'Which table is this order for? Please ask again with a table.',
    table_not_found: 'That table was not found.',
    table_busy: 'That table already has an active unpaid order.',
    item_missing: 'An item is no longer on the menu. Please ask again.',
    item_unavailable: 'An item is not available right now.',
    bad_quantity: 'Invalid quantity.',
    price_changed: 'Menu prices changed since this draft. Please ask again.',
    save_failed: 'The order could not be saved.',
    unknown: 'The order could not be saved.',
  },
  'roman-ur': {
    not_permitted: 'Aap ka role order banane ki ijazat nahi deta.',
    not_signed_in: 'Order save karne ke liye dobara sign in karein.',
    empty: 'Draft mein koi item nahi hai.',
    duplicate: 'Yeh order pehle hi save ho chuka hai.',
    bad_order_type: 'Order type samajh nahi aaya. Dine-in ya takeaway batayein.',
    delivery_unsupported: 'Delivery order ke liye address chahiye. Isay POS se banayein.',
    table_required: 'Yeh order kis table ka hai? Table ke saath dobara batayein.',
    table_not_found: 'Yeh table nahi mili.',
    table_busy: 'Is table par pehle se unpaid order chal raha hai.',
    item_missing: 'Koi item ab menu mein nahi hai. Dobara batayein.',
    item_unavailable: 'Koi item abhi available nahi hai.',
    bad_quantity: 'Quantity galat hai.',
    price_changed: 'Draft ke baad menu ki qeemat badal gayi. Dobara batayein.',
    save_failed: 'Order save nahi ho saka.',
    unknown: 'Order save nahi ho saka.',
  },
  ur: {
    not_permitted: 'آپ کا رول آرڈر بنانے کی اجازت نہیں دیتا۔',
    not_signed_in: 'آرڈر محفوظ کرنے کے لیے دوبارہ سائن اِن کریں۔',
    empty: 'ڈرافٹ میں کوئی آئٹم نہیں۔',
    duplicate: 'یہ آرڈر پہلے ہی محفوظ ہو چکا ہے۔',
    bad_order_type: 'آرڈر کی قسم سمجھ نہیں آئی۔ ڈائن اِن یا ٹیک اوے بتائیں۔',
    delivery_unsupported: 'ڈیلیوری آرڈر کے لیے ایڈریس چاہیے۔ اسے POS سے بنائیں۔',
    table_required: 'یہ آرڈر کس ٹیبل کا ہے؟ ٹیبل کے ساتھ دوبارہ بتائیں۔',
    table_not_found: 'یہ ٹیبل نہیں ملی۔',
    table_busy: 'اس ٹیبل پر پہلے سے غیر ادا شدہ آرڈر چل رہا ہے۔',
    item_missing: 'کوئی آئٹم اب مینو میں نہیں۔ دوبارہ بتائیں۔',
    item_unavailable: 'کوئی آئٹم ابھی دستیاب نہیں۔',
    bad_quantity: 'مقدار غلط ہے۔',
    price_changed: 'ڈرافٹ کے بعد مینو کی قیمت بدل گئی۔ دوبارہ بتائیں۔',
    save_failed: 'آرڈر محفوظ نہیں ہو سکا۔',
    unknown: 'آرڈر محفوظ نہیں ہو سکا۔',
  },
})

export function orderConfirmError(code, language) {
  const table = ORDER_ERRORS[language] || ORDER_ERRORS['roman-ur']
  return table[code] || table.unknown
}

// ── Tiny, safe markdown → plain segments ────────────────────────────────────

/** Split a line into [{ text, bold }] on **bold** markers. */
export function parseInline(line) {
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let match
  const source = String(line ?? '')
  while ((match = re.exec(source)) !== null) {
    if (match.index > last) out.push({ text: source.slice(last, match.index), bold: false })
    out.push({ text: match[1], bold: true })
    last = match.index + match[0].length
  }
  if (last < source.length) out.push({ text: source.slice(last), bold: false })
  return out.length ? out : [{ text: '', bold: false }]
}

/**
 * Parse model text into blocks: { type: 'p' | 'ul' | 'ol', items: Segment[][] }.
 * Handles paragraphs, "-", "*", "•" bullets and "1." numbered lists. Headings
 * ("#") are flattened to bold paragraphs. Nothing here produces HTML.
 */
export function parseBlocks(input) {
  const lines = String(input ?? '').replace(/\r/g, '').split('\n')
  const blocks = []
  let current = null
  const flush = () => { if (current) { blocks.push(current); current = null } }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/)
    if (bullet) {
      if (!current || current.type !== 'ul') { flush(); current = { type: 'ul', items: [] } }
      current.items.push(parseInline(bullet[1]))
    } else if (numbered) {
      if (!current || current.type !== 'ol') { flush(); current = { type: 'ol', items: [] } }
      current.items.push(parseInline(numbered[1]))
    } else {
      const content = heading ? `**${heading[1].replace(/\*\*/g, '')}**` : line.trim()
      if (!current || current.type !== 'p') { flush(); current = { type: 'p', items: [] } }
      current.items.push(parseInline(content))
    }
  }
  flush()
  return blocks
}

export function formatMoneyLabel(value, currency = 'PKR') {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${currency} ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}
