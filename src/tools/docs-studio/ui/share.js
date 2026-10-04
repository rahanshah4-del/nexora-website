/**
 * Sharing: the WhatsApp / email message, wa.me and mailto URLs, phone numbers
 * in E.164, and server-less share links (/tools/invoice/view/#<payload>).
 * Pure functions (no DOM), so they are unit-tested directly.
 */

import { SHARE_LINK_MAX_LENGTH, encodeForShareLink, formatMoney, getDocumentType } from '../engine/index.js'

export const SHARE_VIEW_PATH = '/tools/invoice/view/'
export const DEFAULT_MESSAGE_TEMPLATE = 'Hi {client}, please find {type} {number} for {total}.{link}\n\nThank you,\n{business}'
export const MESSAGE_PLACEHOLDERS = Object.freeze(['{client}', '{type}', '{number}', '{total}', '{business}', '{link}'])
export const MAX_MESSAGE_TEMPLATE = 1000

/** The values a message template can use, from a document and its totals. */
export function messageContext(doc, totals, { link = '' } = {}) {
  const config = getDocumentType(doc.type) || getDocumentType('invoice')
  return {
    client: (doc.client?.name || doc.client?.company || '').trim(),
    type: config.label.toLowerCase(),
    typeLabel: config.label,
    number: (doc.number || '').trim(),
    total: config.features.pricing ? formatMoney(totals.amountPayable, doc.currency, doc.locale) : '',
    business: (doc.seller?.name || '').trim(),
    link,
  }
}

/**
 * Fills a message template. Missing values leave no awkward gaps: no client →
 * "Hi,", no total → the "for {total}" phrase is dropped, {link} becomes a
 * "View it online" line only when there is a link.
 */
export function renderShareMessage(template, ctx) {
  let text = String(template || DEFAULT_MESSAGE_TEMPLATE).slice(0, MAX_MESSAGE_TEMPLATE)
  if (!ctx.client) text = text.replace(/\s*\{client\}/g, '')
  if (!ctx.total) text = text.replace(/\s*for\s+\{total\}/gi, '').replace(/\s*\{total\}/g, '')
  if (!ctx.number) text = text.replace(/\s*\{number\}/g, '')
  if (!ctx.business) text = text.replace(/,?\s*\n?\{business\}/g, '')
  const values = {
    '{client}': ctx.client,
    '{type}': ctx.type,
    '{number}': ctx.number,
    '{total}': ctx.total,
    '{business}': ctx.business,
    '{link}': ctx.link ? `\n\nView it online: ${ctx.link}` : '',
  }
  return text.replace(/\{(client|type|number|total|business|link)\}/g, (token) => values[token] ?? '').replace(/[ \t]+\n/g, '\n').trim()
}

export function emailSubject(ctx) {
  return [`${ctx.typeLabel}${ctx.number ? ` ${ctx.number}` : ''}`, ctx.business ? `from ${ctx.business}` : ''].filter(Boolean).join(' ')
}

/**
 * A phone number as E.164 digits for wa.me ("+92 300 123-4567" → "923001234567"),
 * or null when it has no country code (or is not 8–15 digits).
 */
export function toWhatsAppNumber(phone) {
  const raw = String(phone || '').trim().replace(/[\s().-]/g, '')
  let digits
  if (raw.startsWith('+')) digits = raw.slice(1)
  else if (raw.startsWith('00')) digits = raw.slice(2)
  else return null
  if (!/^\d{8,15}$/.test(digits) || digits.startsWith('0')) return null
  return digits
}

/** https://wa.me/<number>?text=… (or wa.me/?text=… to pick the chat in WhatsApp). */
export function whatsappUrl(text, number = null) {
  return `https://wa.me/${number || ''}?text=${encodeURIComponent(text)}`
}

/** mailto: with subject and body (CRLF line breaks, per RFC 6068). */
export function mailtoUrl(email, subject, body) {
  const to = String(email || '').trim()
  const address = /^[^\s@<>"]+@[^\s@<>"]+$/.test(to) ? encodeURIComponent(to).replace(/%40/g, '@') : ''
  const enc = (s) => encodeURIComponent(String(s || '').replace(/\r?\n/g, '\r\n'))
  return `mailto:${address}?subject=${enc(subject)}&body=${enc(body)}`
}

/** What goes into a link: the document without local asset references (logo, letterhead). */
export function documentForShareLink(doc) {
  return {
    ...doc,
    seller: { ...doc.seller, logoAssetId: '' },
    appearance: { ...doc.appearance, letterhead: null },
    // Images stay on this device; the signatory's name and title still travel.
    signoff: doc.signoff ? { ...doc.signoff, signatureAssetId: '', sealAssetId: '' } : null,
  }
}

/** True when the document shows something a link cannot carry. */
export function hasLocalDesignAssets(doc) {
  return Boolean(doc.seller?.logoAssetId || doc.appearance?.letterhead || doc.signoff?.signatureAssetId || doc.signoff?.sealAssetId)
}

/**
 * @returns {Promise<{ ok: true, url: string, length: number } | { ok: false, code: string, message: string, length?: number }>}
 */
export async function buildShareLink(doc, origin, { maxLength = SHARE_LINK_MAX_LENGTH, pureJs = false } = {}) {
  const encoded = await encodeForShareLink(documentForShareLink(doc), { maxLength, pureJs })
  if (!encoded.ok) return { ok: false, code: encoded.error.code, message: encoded.error.message, length: encoded.error.length }
  return { ok: true, url: `${String(origin).replace(/\/$/, '')}${SHARE_VIEW_PATH}#${encoded.value}`, length: encoded.value.length }
}

// ── Calling codes for the phone field (region → code) ───────────────────────

export const CALLING_CODES = Object.freeze([
  ['US', '1'], ['CA', '1'], ['GB', '44'], ['IE', '353'], ['AU', '61'], ['NZ', '64'], ['IN', '91'], ['PK', '92'], ['BD', '880'],
  ['LK', '94'], ['NP', '977'], ['AF', '93'], ['AE', '971'], ['SA', '966'], ['QA', '974'], ['KW', '965'], ['BH', '973'], ['OM', '968'],
  ['JO', '962'], ['LB', '961'], ['IQ', '964'], ['IR', '98'], ['IL', '972'], ['TR', '90'], ['EG', '20'], ['MA', '212'], ['DZ', '213'],
  ['TN', '216'], ['NG', '234'], ['GH', '233'], ['KE', '254'], ['ET', '251'], ['TZ', '255'], ['UG', '256'], ['ZA', '27'], ['DE', '49'],
  ['FR', '33'], ['ES', '34'], ['IT', '39'], ['PT', '351'], ['NL', '31'], ['BE', '32'], ['LU', '352'], ['CH', '41'], ['AT', '43'],
  ['SE', '46'], ['NO', '47'], ['DK', '45'], ['FI', '358'], ['PL', '48'], ['CZ', '420'], ['SK', '421'], ['HU', '36'], ['RO', '40'],
  ['BG', '359'], ['GR', '30'], ['HR', '385'], ['RS', '381'], ['UA', '380'], ['RU', '7'], ['KZ', '7'], ['UZ', '998'], ['CN', '86'],
  ['HK', '852'], ['TW', '886'], ['JP', '81'], ['KR', '82'], ['SG', '65'], ['MY', '60'], ['ID', '62'], ['PH', '63'], ['TH', '66'],
  ['VN', '84'], ['MM', '95'], ['KH', '855'], ['BR', '55'], ['MX', '52'], ['AR', '54'], ['CL', '56'], ['CO', '57'], ['PE', '51'],
  ['EC', '593'], ['VE', '58'],
])

/** Region for a locale ("en-PK" → "PK"), if it is in the list. */
export function regionForLocale(locale) {
  try {
    const region = new Intl.Locale(locale).maximize().region
    return CALLING_CODES.some(([r]) => r === region) ? region : null
  } catch {
    return null
  }
}

/**
 * Splits a stored phone into { region, national } using the longest calling
 * code it starts with ("+44 20 7946 0000" → GB, "20 7946 0000"). For codes
 * shared by several regions (+1, +7) the preferred region wins when it matches.
 */
export function splitPhone(phone, preferredRegion = null) {
  const value = String(phone || '').trim()
  const m = /^\+(\d{1,4})\s*(.*)$/.exec(value)
  if (!m) return { region: null, national: value }
  const digits = m[1] + m[2].replace(/\D/g, '')
  const candidates = CALLING_CODES.filter(([, code]) => digits.startsWith(code)).sort((a, b) => b[1].length - a[1].length)
  if (!candidates.length) return { region: null, national: value }
  const code = candidates[0][1]
  const same = candidates.filter(([, c]) => c === code)
  const region = (same.find(([r]) => r === preferredRegion) || same[0])[0]
  const rest = value.slice(1).replace(/^\s*/, '')
  // Keep the visitor's own spacing after the code where possible.
  const national = rest.startsWith(code) ? rest.slice(code.length).trim() : digits.slice(code.length)
  return { region, national }
}

/** Region + national number → the stored "+CC national" string. */
export function joinPhone(region, national) {
  const text = String(national || '').trim()
  if (!text) return ''
  if (text.startsWith('+')) return text
  const code = CALLING_CODES.find(([r]) => r === region)?.[1]
  return code ? `+${code} ${text.replace(/^0+(?=\d)/, '')}` : text
}
