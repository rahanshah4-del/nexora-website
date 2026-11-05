/**
 * Control Centre Inbox: sorts incoming mail into Important, Promotions and Junk.
 * Pure and client-side (no worker change). Unit tested in tests/mail-category.test.mjs.
 *
 * Order matters: a real conversation or a security / payment / verification mail is always Important,
 * even if it sits next to words that look promotional. Everything we cannot positively call
 * Promotions or Junk stays Important, so a customer mail is never hidden by mistake.
 */

export const CATEGORIES = ['important', 'promo', 'junk']

export const CATEGORY_META = {
  important: { label: 'Important', short: 'Important', emoji: '⭐', chip: 'bg-blue-50 text-blue-700', hint: 'Customers, replies, security, payments and account mail' },
  promo: { label: 'Promotions', short: 'Promo', emoji: '📣', chip: 'bg-amber-50 text-amber-800', hint: 'Newsletters, offers, upsells and automated marketing' },
  junk: { label: 'Junk', short: 'Junk', emoji: '🗑️', chip: 'bg-slate-200 text-slate-600', hint: 'Cold outreach, SEO / link pitches and obvious spam' },
}

// Mail that must never be filed away: account, security, money, approvals.
const IMPORTANT_PATTERNS = [
  /\b(verify|confirm|activate) (your )?(e-?mail|account|address|identity)/i,
  /\bverification (code|link)\b|\bone[- ]time (code|password)\b|\b(login|sign[- ]?in|security) (code|alert)\b|\bpassword reset\b|\breset your password\b/i,
  /\baction required\b|\baction needed\b|\bcomplete your (application|profile|verification|registration)\b/i,
  /\b(approved|rejected|declined|suspended|disabled|deactivated|verified)\b/i,
  /\b(invoice|receipt|payment (failed|received|declined|successful)|refund|chargeback|subscription (renewal|cancel)|billing issue)\b/i,
  /\b(domain|ssl|dns|certificate) (expir|renew|issue|verification)/i,
  /\bsearch console\b|\badsense\b|\bmanual action\b|\bsecurity issue\b|\bunusual (sign[- ]?in|activity)\b/i,
]

// Cold outreach and obvious spam.
const JUNK_PATTERNS = [
  /\b(seo|backlink|link[- ]building|guest post|sponsored post)s?\b.*\b(service|package|offer|pric|rank|traffic|cheap|affordable)/i,
  /\b(rank|ranking) (you|your (site|website)).*(#1|first page|google)/i,
  /\b(first page of google|guaranteed (traffic|ranking|results)|increase your (traffic|sales|ranking)|boost your (traffic|sales|ranking|business))\b/i,
  /\b(i|we) (came across|found|noticed|visited|was looking at) (your )?(website|site|company|business|page)\b/i,
  /\bshowcas(e|ing) (the story|your (brand|business|product|work))\b/i,
  /\b(web ?site|web ?design|app|logo|video|graphic) (design|development|redesign|editing) (service|offer|proposal|package)s?\b/i,
  /\b(buy|get|grow) (real )?(followers|likes|subscribers|views|traffic)\b/i,
  /\b(casino|betting|loan approval|payday|crypto (giveaway|airdrop)|forex signal|adult|viagra|weight loss|lottery|you have won)\b/i,
  /\bdear (sir|madam|sir\/madam|business owner|website owner|webmaster|owner)\b/i,
  /\b(quick question|partnership opportunity|collaboration opportunity|business proposal|cooperation proposal)\b/i,
  /\bwe (can|will) (help|get|make) (you|your)\b.*\b(rank|traffic|leads|sales|customers|clients)\b/i,
]

// Marketing, newsletters and upsells from services we signed up for.
const PROMO_PATTERNS = [
  /\b(newsletter|weekly digest|monthly digest|product update|what'?s new|new features?|release notes|roundup|digest)\b/i,
  /\b\d{1,3}% off\b|\b(discount|coupon|promo code|special offer|limited[- ]time|flash sale|black friday|cyber monday|save \$?\d+|deal of the)\b/i,
  /\b(webinar|masterclass|workshop|register now|join us|free trial ends|your trial (ends|is ending)|upgrade (now|to|your)|unlock|exclusive (offer|access|deal))\b/i,
  /\b(complete your payment|finish your (launch|submission|listing|profile)|get featured|boost your listing|featured (listing|spot|placement)|skip the queue|priority review)\b/i,
  /\bunsubscribe\b|\bview (this email )?in (your )?browser\b|\bmanage (your )?(email )?preferences\b/i,
]

const BULK_SENDER_LOCAL = /^(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|newsletter|news|marketing|promo|promotions|offers|deals|updates?|digest|mailer|notifications?|notify|campaign)$/i
const BULK_SENDER_DOMAIN = /(^|\.)(mailchimp|sendgrid|mailgun|sparkpostmail|amazonses|mandrillapp|constantcontact|campaign-?archive|hubspotemail|substack|beehiiv|convertkit|klaviyomail|brevo|sendinblue|mailerlite|customer\.io)\./i

function addressOf(value = '') {
  const bracketed = String(value).match(/<([^>]+)>/)
  return (bracketed?.[1] || String(value)).trim().toLowerCase()
}

/** The stable key a "move sender" rule is stored under. */
export function senderKey(from = '') {
  return addressOf(from)
}

function sample(email) {
  return `${email?.subject || ''} ${email?.snippet || ''}`.replace(/\s+/g, ' ')
}

/**
 * @param email   list item from /inbox (from, subject, snippet, ticket, state, ...)
 * @param rules   { [senderAddress]: 'important' | 'promo' | 'junk' } the owner has taught the inbox
 * @returns       { category, reason }
 */
export function classifyEmail(email, rules = {}) {
  const from = addressOf(email?.from)
  const taught = rules[from]
  if (taught && CATEGORIES.includes(taught)) return { category: taught, reason: 'You moved this sender' }

  const priority = email?.ticket?.priority
  if (priority === 'urgent' || priority === 'high') return { category: 'important', reason: 'Urgent ticket' }
  if (email?.ticket?.count > 1) return { category: 'important', reason: 'Ongoing conversation' }
  if (/^\s*(re|aw|sv)\s*:/i.test(email?.subject || '')) return { category: 'important', reason: 'Reply to a conversation' }

  const text = sample(email)
  if (IMPORTANT_PATTERNS.some((re) => re.test(text))) return { category: 'important', reason: 'Account, security or payment mail' }
  if (JUNK_PATTERNS.some((re) => re.test(text))) return { category: 'junk', reason: 'Looks like cold outreach or spam' }

  const [local = '', domain = ''] = from.split('@')
  if (BULK_SENDER_LOCAL.test(local) || BULK_SENDER_DOMAIN.test(domain)) return { category: 'promo', reason: 'Automated bulk sender' }
  if (PROMO_PATTERNS.some((re) => re.test(text))) return { category: 'promo', reason: 'Marketing or offer' }

  return { category: 'important', reason: 'Personal mail' }
}

/** Counts (all and unread) per category over a list of mails. */
export function categoryCounts(items, rules = {}) {
  const totals = { important: 0, promo: 0, junk: 0, unread: { important: 0, promo: 0, junk: 0 } }
  for (const email of items) {
    const { category } = classifyEmail(email, rules)
    totals[category] += 1
    if (!email?.state?.isRead) totals.unread[category] += 1
  }
  return totals
}
