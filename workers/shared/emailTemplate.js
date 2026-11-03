/**
 * Branded layout for the mail Nexora Support sends by hand or automatically (Inbox replies, new emails from
 * the Inbox, automatic acknowledgements). Pure functions with no imports, so the Workers use them to build the
 * real email and the Control Centre imports the very same code for its "Preview email" button.
 *
 * Email clients are picky: table layout, inline styles, a solid colour behind every gradient, a bulletproof
 * (table) button and a hidden preheader. Everything that comes from a person is escaped.
 */
export const BRAND = Object.freeze({
  name: 'Nexora Solution',
  site: 'https://nexorasolution.us',
  logo: 'https://nexorasolution.us/logo-192.png',
  help: 'https://nexorasolution.us/help-center',
  primary: '#4f46e5',
  secondary: '#2563eb',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  page: '#f1f5f9',
  soft: '#f8fafc',
})

export const SIGNATURE_NAME = 'Nexora Support Team'

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

/** Escape, then turn http(s) links and email addresses into links. */
export function richText(value) {
  return escapeHtml(value)
    .replace(/(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/g, (url) => `<a href="${url}" style="color:${BRAND.secondary};text-decoration:underline;">${url}</a>`)
    .replace(/(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, (all, lead, mail) => `${lead}<a href="mailto:${mail}" style="color:${BRAND.secondary};text-decoration:underline;">${mail}</a>`)
}

/**
 * Plain text -> blocks. Blank lines separate paragraphs; lines starting with "- " or "* " form a list;
 * lines starting with ">" are the quoted original message. Pure.
 */
export function textToBlocks(text) {
  const blocks = []
  String(text ?? '').replace(/\r\n/g, '\n').trim().split(/\n{2,}/).forEach((chunk) => {
    const lines = chunk.split('\n')
    if (lines.every((l) => /^\s*>/.test(l))) blocks.push({ type: 'quote', text: lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n') })
    else if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) blocks.push({ type: 'list', items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, '')) })
    else blocks.push({ type: 'p', text: chunk })
  })
  return blocks.filter((b) => (b.type === 'list' ? b.items.length : b.text.trim()))
}

const P = `margin:0 0 14px;font-size:15px;line-height:24px;color:${BRAND.body};`

export function blocksHtml(blocks = []) {
  return blocks.map((b) => {
    if (b.type === 'list') {
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">${b.items.map((item) => `<tr><td width="24" valign="top" style="padding:3px 0;font-size:15px;line-height:22px;color:${BRAND.primary};font-weight:700;">&#10003;</td><td valign="top" style="padding:3px 0;font-size:15px;line-height:22px;color:${BRAND.body};">${richText(item)}</td></tr>`).join('')}</table>`
    }
    if (b.type === 'quote') {
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 14px;"><tr><td style="border-left:3px solid ${BRAND.line};padding:2px 0 2px 12px;font-size:13px;line-height:20px;color:${BRAND.muted};">${richText(b.text).replaceAll('\n', '<br>')}</td></tr></table>`
    }
    return `<p style="${P}">${richText(b.text).replaceAll('\n', '<br>')}</p>`
  }).join('')
}

function button({ label, url, primary = true }) {
  const bg = primary ? BRAND.primary : '#ffffff'
  const fg = primary ? '#ffffff' : BRAND.primary
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;"><tr><td bgcolor="${bg}" style="background:${bg};border:1px solid ${BRAND.primary};border-radius:10px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 20px;font-size:14px;line-height:18px;font-weight:700;color:${fg};text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`
}

const STATUS_STYLE = {
  open: ['Open', '#dbeafe', '#1d4ed8'],
  pending: ['Waiting for you', '#fef3c7', '#b45309'],
  resolved: ['Resolved', '#dcfce7', '#15803d'],
}

function ticketCard({ ticketId, subject, status }) {
  if (!ticketId) return ''
  const s = STATUS_STYLE[status]
  const chip = s ? `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${s[1]};color:${s[2]};font-size:12px;font-weight:700;">${s[0]}</span>` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.soft}" style="margin:4px 0 18px;background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:12px;"><tr><td style="padding:12px 16px;"><div style="font-size:12px;line-height:16px;color:${BRAND.muted};">Your reference</div><div style="margin-top:2px;font-size:18px;line-height:24px;font-weight:800;color:${BRAND.ink};letter-spacing:.3px;">${escapeHtml(ticketId)} ${chip}</div>${subject ? `<div style="margin-top:4px;font-size:13px;line-height:18px;color:${BRAND.body};">${escapeHtml(String(subject).slice(0, 120))}</div>` : ''}</td></tr></table>`
}

/**
 * The whole email.
 *   emoji, heading  - optional big line under the header bar
 *   blocks          - body (from textToBlocks or hand-made)
 *   ticket          - { ticketId, subject, status } shows the reference card
 *   askTitle, asks  - "To help us faster" checklist
 *   buttons         - [{ label, url, primary }]
 *   preheader       - the grey preview line in the inbox list
 *   closing         - small text above the signature
 */
export function renderSupportEmail({ emoji = '', heading = '', blocks = [], ticket = null, askTitle = '', asks = [], buttons = [], preheader = '', closing = '', signature = SIGNATURE_NAME } = {}) {
  const title = heading ? `<h1 style="margin:0 0 14px;font-size:22px;line-height:30px;font-weight:800;color:${BRAND.ink};">${emoji ? `${escapeHtml(emoji)} ` : ''}${escapeHtml(heading)}</h1>` : ''
  const ask = asks.length ? `${askTitle ? `<p style="${P}margin-bottom:6px;font-weight:700;color:${BRAND.ink};">${escapeHtml(askTitle)}</p>` : ''}${blocksHtml([{ type: 'list', items: asks }])}` : ''
  const buttonRow = buttons.length ? `<div style="margin:8px 0 6px;">${buttons.map(button).join('')}</div>` : ''
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(heading || BRAND.name)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background:${BRAND.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">
<tr><td bgcolor="${BRAND.primary}" style="background:${BRAND.primary};background-image:linear-gradient(135deg,${BRAND.primary},${BRAND.secondary});padding:18px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="44" valign="middle"><img src="${BRAND.logo}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px;background:#ffffff;"></td><td valign="middle" style="padding-left:12px;font-size:17px;line-height:22px;font-weight:800;color:#ffffff;">${escapeHtml(BRAND.name)}</td><td align="right" valign="middle" style="font-size:12px;line-height:16px;color:#e0e7ff;">Customer Support</td></tr></table></td></tr>
<tr><td style="padding:28px 28px 8px;">${title}${ticketCard(ticket || {})}${blocksHtml(blocks)}${ask}${buttonRow}${closing ? `<p style="${P}color:${BRAND.muted};font-size:13px;">${escapeHtml(closing)}</p>` : ''}</td></tr>
<tr><td style="padding:6px 28px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.line};"><tr><td style="padding-top:16px;font-size:14px;line-height:21px;color:${BRAND.body};"><strong style="color:${BRAND.ink};">${escapeHtml(signature)}</strong><br>${escapeHtml(BRAND.name)}<br><a href="${BRAND.site}" style="color:${BRAND.secondary};text-decoration:none;">nexorasolution.us</a> &nbsp;&middot;&nbsp; <a href="${BRAND.help}" style="color:${BRAND.secondary};text-decoration:none;">Help Center</a></td></tr></table></td></tr>
<tr><td bgcolor="${BRAND.soft}" style="background:${BRAND.soft};padding:14px 28px;font-size:12px;line-height:18px;color:${BRAND.muted};text-align:center;">You are receiving this because you contacted ${escapeHtml(BRAND.name)}. Just reply to this email to continue the conversation.</td></tr>
</table></td></tr></table></body></html>`
}

/** Plain-text signature for the text/plain part of the same email. */
export const signatureText = (name = SIGNATURE_NAME) => `--\n${name}\n${BRAND.name}\n${BRAND.site}`


// ---------------------------------------------------------------------------------------------------------
// Executive layout: mail that goes out under a person's name (Rahan, CEO). A letter, not a ticket: serif body,
// navy header with a gold rule, a signature card with the person's title and ways to reach them, and a
// strip of Nexora products. Only real addresses and pages are linked.
// ---------------------------------------------------------------------------------------------------------
const GOLD = '#c9a227'
const NAVY = '#0b1220'
const SERIF = "Georgia,'Times New Roman',serif"
const PRODUCTS = Object.freeze([
  ['Restaurant POS', '/restaurant-pos/'], ['Retail POS', '/retail-pos/'], ['Pharmacy POS', '/pharmacy-pos/'], ['CRM', '/crm/'],
  ['School ERP', '/school-erp/'], ['Property ERP', '/property-erp/'], ['WhatsApp CRM', '/whatsapp-crm/'],
])

function executiveBlocks(blocks) {
  return blocks.map((b) => {
    if (b.type === 'list') return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${b.items.map((item) => `<tr><td width="22" valign="top" style="padding:4px 0;font-size:15px;color:${GOLD};">&#9670;</td><td style="padding:4px 0;font-family:${SERIF};font-size:16px;line-height:26px;color:#1e293b;">${richText(item)}</td></tr>`).join('')}</table>`
    if (b.type === 'quote') return `<blockquote style="margin:0 0 16px;padding:10px 16px;border-left:3px solid ${GOLD};background:#faf7ec;font-family:${SERIF};font-size:14px;line-height:22px;color:#64748b;white-space:pre-wrap;">${richText(b.text)}</blockquote>`
    return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:16px;line-height:27px;color:#1e293b;white-space:pre-wrap;">${richText(b.text)}</p>`
  }).join('')
}

/**
 * person: { name, title, email, monogram, note }  (see SENDERS in senders.js)
 * Same inputs as renderSupportEmail where they make sense (blocks, ticket, preheader).
 */
export function renderExecutiveEmail({ blocks = [], ticket = null, preheader = '', person = {} } = {}) {
  const name = person.name || 'Rahan'
  const title = person.title || 'Founder, Nexora Solution'
  const email = person.email || 'support@nexorasolution.us'
  const monogram = person.monogram || name.trim().charAt(0).toUpperCase()
  const note = person.note || 'Reply to this email and it reaches me personally.'
  const pills = PRODUCTS.map(([label, path]) => `<a href="${BRAND.site}${path}" style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;border:1px solid #d8dee9;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${NAVY};text-decoration:none;background:#ffffff;">${escapeHtml(label)}</a>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(name)} · ${escapeHtml(BRAND.name)}</title></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef1f6;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f6" style="background:#eef1f6;"><tr><td align="center" style="padding:26px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe4ee;">
<tr><td height="5" bgcolor="${GOLD}" style="height:5px;line-height:5px;font-size:0;background:${GOLD};background-image:linear-gradient(90deg,#8a6d12,${GOLD},#f1d77a,${GOLD});">&nbsp;</td></tr>
<tr><td bgcolor="${NAVY}" style="background:${NAVY};padding:22px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="44" valign="middle"><img src="${BRAND.logo}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px;"></td><td valign="middle" style="padding-left:12px;"><div style="font-family:${SERIF};font-size:20px;line-height:24px;font-weight:700;color:#ffffff;">${escapeHtml(BRAND.name)}</div><div style="font-size:11px;line-height:16px;color:${GOLD};letter-spacing:.6px;">Business software for growing companies</div></td><td align="right" valign="middle" style="font-size:11px;line-height:16px;color:#94a3b8;">Personal reply from<br><strong style="color:#ffffff;font-size:12px;">${escapeHtml(name)}</strong></td></tr></table></td></tr>
<tr><td style="padding:32px 32px 10px;">${ticketCard(ticket || {})}${executiveBlocks(blocks)}</td></tr>
<tr><td style="padding:6px 32px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e9f2;"><tr><td style="padding-top:22px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" width="64"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="56" height="56" align="center" valign="middle" bgcolor="${NAVY}" style="width:56px;height:56px;border-radius:28px;background:${NAVY};border:2px solid ${GOLD};font-family:${SERIF};font-size:26px;font-weight:700;color:${GOLD};line-height:56px;">${escapeHtml(monogram)}</td></tr></table></td>
<td valign="top" style="padding-left:14px;"><div style="font-family:${SERIF};font-size:20px;line-height:26px;font-weight:700;color:${NAVY};">${escapeHtml(name)}</div><div style="font-size:13px;line-height:20px;font-weight:700;color:${GOLD};">${escapeHtml(title)}</div><div style="font-size:12px;line-height:19px;color:${BRAND.muted};">${escapeHtml(BRAND.name)} &middot; Pakistan</div></td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="font-size:13px;line-height:24px;color:${BRAND.body};">&#9993;&nbsp; <a href="mailto:${escapeHtml(email)}" style="color:${NAVY};text-decoration:none;font-weight:700;">${escapeHtml(email)}</a><br>&#127760;&nbsp; <a href="${BRAND.site}" style="color:${NAVY};text-decoration:none;font-weight:700;">nexorasolution.us</a><br>&#128712;&nbsp; <a href="${BRAND.help}" style="color:${NAVY};text-decoration:none;font-weight:700;">Help Center</a> &nbsp;&middot;&nbsp; <a href="${BRAND.site}/contact/" style="color:${NAVY};text-decoration:none;font-weight:700;">Contact</a></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#faf7ec;border:1px solid #efe3b5;border-radius:10px;padding:14px 16px;font-size:13px;line-height:20px;color:#5b4b12;"><strong>&#10024; Direct line.</strong> ${escapeHtml(note)}</td></tr></table></td></tr>
<tr><td bgcolor="#f6f8fb" style="background:#f6f8fb;padding:20px 32px 12px;border-top:1px solid #e5e9f2;"><div style="font-size:12px;line-height:18px;font-weight:700;color:${NAVY};margin-bottom:10px;">One platform for your whole business</div>${pills}</td></tr>
<tr><td bgcolor="#f6f8fb" style="background:#f6f8fb;padding:4px 32px 22px;font-size:11px;line-height:17px;color:#94a3b8;text-align:center;">${escapeHtml(BRAND.name)} &middot; Pakistan &middot; <a href="${BRAND.site}" style="color:#94a3b8;">nexorasolution.us</a><br>You are receiving this because you contacted ${escapeHtml(BRAND.name)}. Just reply to continue the conversation.</td></tr>
</table></td></tr></table></body></html>`
}

export const executiveSignatureText = (person = {}) => `--\n${person.name || 'Rahan'}\n${person.title || 'Founder, Nexora Solution'}\n${BRAND.name} · Pakistan\n${person.email || 'support@nexorasolution.us'}\n${BRAND.site}`

/** A typed reply or a new email, as { html, text }. `ticketId` adds the reference card to replies. */
export function renderPlainMessage(text, { ticketId = '', subject = '', status = '', preheader = '', signature = SIGNATURE_NAME, executive = null } = {}) {
  const body = String(text ?? '').trim()
  if (executive) {
    return {
      html: renderExecutiveEmail({ blocks: textToBlocks(body), ticket: ticketId ? { ticketId, subject, status } : null, preheader: preheader || body.replace(/\s+/g, ' ').slice(0, 110), person: executive }),
      text: `${body}\n\n${executiveSignatureText(executive)}`,
    }
  }
  return {
    html: renderSupportEmail({ blocks: textToBlocks(body), ticket: ticketId ? { ticketId, subject, status } : null, preheader: preheader || body.replace(/\s+/g, ' ').slice(0, 110), signature }),
    text: `${body}\n\n${signatureText(signature)}`,
  }
}

/** {{name}}, {{ticket}}, {{agent}} in a saved reply. Unknown names are left out, never printed raw. */
export function fillTemplate(template, values = {}) {
  return String(template ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (all, key) => String(values[key] ?? '')).replace(/[ \t]+\n/g, '\n').replace(/ ,/g, ',')
}
