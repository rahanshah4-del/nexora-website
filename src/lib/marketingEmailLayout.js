/**
 * Branded layout for Nexora marketing emails (logo, hero, bullet list, button,
 * footer with unsubscribe). Pure functions, no imports.
 *
 * This file exists twice on purpose: functions/marketingEmailLayout.js (used by
 * the automation sender) and src/lib/marketingEmailLayout.js (used by the admin
 * template picker). A test fails if the two copies drift apart.
 *
 * Email clients are picky, so: table layout, inline styles, a solid colour
 * behind every gradient, a bulletproof (table) button and a hidden preheader.
 */
export const BRAND = Object.freeze({
  name: 'Nexora Solution',
  site: 'https://nexorasolution.online',
  logo: 'https://nexorasolution.online/logo-192.png',
  contact: 'https://nexorasolution.online/contact',
  primary: '#4f46e5',
  secondary: '#2563eb',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  page: '#f1f5f9',
})

const UNSUB = '{{unsubscribe}}'

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

function bulletRows(bullets = []) {
  if (!bullets.length) return ''
  const rows = bullets.map((item) => `
          <tr>
            <td width="26" valign="top" style="padding:6px 0;font-size:15px;line-height:22px;color:${BRAND.primary};font-weight:700;">&#10003;</td>
            <td valign="top" style="padding:6px 0;font-size:15px;line-height:22px;color:${BRAND.body};">${item}</td>
          </tr>`).join('')
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">${rows}
        </table>`
}

/** Row of big numbers, e.g. "5 min | Free | 0 setup". */
function statsRow(stats = []) {
  if (!stats.length) return ''
  const w = Math.floor(100 / stats.length)
  const cells = stats.map((item) => `
            <td width="${w}%" align="center" valign="top" style="padding:14px 6px;">
              <div style="font-size:24px;line-height:28px;font-weight:800;color:${BRAND.ink};">${escapeHtml(item.value)}</div>
              <div style="margin-top:2px;font-size:12px;line-height:16px;color:${BRAND.muted};">${escapeHtml(item.label)}</div>
            </td>`).join('')
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="margin:4px 0 18px;background:#f8fafc;border:1px solid ${BRAND.line};border-radius:14px;">
          <tr>${cells}
          </tr>
        </table>`
}

/** Feature cards, two per row on desktop (stack on phones through width:100% cells). */
function featureCards(features = [], accent = BRAND.primary) {
  if (!features.length) return ''
  const rows = []
  for (let i = 0; i < features.length; i += 2) {
    const pair = features.slice(i, i + 2)
    const cells = pair.map((item) => `
            <td width="50%" valign="top" style="padding:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.line};border-radius:14px;background:#ffffff;">
                <tr><td style="padding:14px 14px 12px;">
                  <div style="width:28px;height:4px;border-radius:2px;background:${accent};margin-bottom:10px;font-size:0;line-height:0;">&nbsp;</div>
                  <div style="font-size:14px;line-height:20px;font-weight:700;color:${BRAND.ink};">${item.title}</div>
                  <div style="margin-top:4px;font-size:13px;line-height:19px;color:${BRAND.body};">${item.text}</div>
                </td></tr>
              </table>
            </td>`).join('')
    rows.push(`<tr>${cells}${pair.length === 1 ? '<td width="50%"></td>' : ''}</tr>`)
  }
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px -6px 6px;width:calc(100% + 12px);">
          ${rows.join('\n          ')}
        </table>`
}

function callout(text, accent = BRAND.primary) {
  if (!text) return ''
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 4px;">
          <tr><td bgcolor="#eef2ff" style="padding:14px 16px;background:#eef2ff;border-left:4px solid ${accent};border-radius:10px;font-size:14px;line-height:1.6;color:${BRAND.ink};">${text}</td></tr>
        </table>`
}

function button(text, url, accent, end = BRAND.secondary) {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;">
          <tr>
            <td align="center" bgcolor="${accent}" style="border-radius:12px;background:${accent};background-image:linear-gradient(135deg,${accent},${end});">
              <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${text}</a>
            </td>
          </tr>
        </table>`
}

/**
 * @param {object} o
 * @param {string} o.title       headline (plain text)
 * @param {string} o.intro       HTML paragraph(s) under the headline. {{name}} allowed.
 * @param {string[]} [o.bullets] short HTML list items
 * @param {string} [o.outro]     closing HTML paragraph
 * @param {string} o.ctaText
 * @param {string} [o.ctaUrl]
 * @param {string} [o.eyebrow]   small label above the headline
 * @param {string} [o.preheader] inbox preview text
 * @param {string} [o.accent]    hero / button colour
 */
export function brandedEmail({ title, intro, bullets = [], outro = '', ctaText, ctaUrl = BRAND.site, eyebrow = '', preheader = '', accent = BRAND.primary, accent2 = '', subtitle = '', stats = [], features = [], callout: note = '', secondaryText = '', secondaryUrl = '', modern = false }) {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>`
    : ''
  const label = eyebrow
    ? (modern
      ? `<p style="margin:0 0 14px;"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e0e7ff;">${escapeHtml(eyebrow)}</span></p>`
      : `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c7d2fe;">${escapeHtml(eyebrow)}</p>`)
    : ''
  const end = accent2 || BRAND.secondary
  const heroBg = modern ? '#0b1020' : accent
  const heroGradient = modern ? `linear-gradient(135deg,#0b1020 0%,${accent} 100%)` : `linear-gradient(135deg,${BRAND.primary},${BRAND.secondary})`
  const sub = subtitle ? `<p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:#dbe4ff;">${escapeHtml(subtitle)}</p>` : ''
  const second = secondaryText && secondaryUrl
    ? `<p style="margin:6px 0 0;font-size:14px;"><a href="${secondaryUrl}" target="_blank" style="color:${accent};font-weight:700;text-decoration:underline;">${escapeHtml(secondaryText)} &rarr;</a></p>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background:${BRAND.page};">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.line};">
        <tr>
          <td style="padding:20px 28px;border-bottom:1px solid ${BRAND.line};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" style="padding-right:12px;"><a href="${BRAND.site}" target="_blank"><img src="${BRAND.logo}" width="44" height="44" alt="Nexora" style="display:block;border:0;border-radius:11px;"></a></td>
                <td valign="middle" style="font-size:18px;font-weight:800;letter-spacing:.04em;color:${BRAND.ink};">NEXORA <span style="color:${BRAND.primary};">SOLUTION</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="${heroBg}" style="padding:${modern ? '40px 28px 36px' : '34px 28px 30px'};background:${heroBg};background-image:${heroGradient};">
            ${label}
            <h1 style="margin:0;font-size:${modern ? '30px' : '26px'};line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(title)}</h1>${sub}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-size:15px;line-height:1.7;color:${BRAND.body};">
            ${intro}${statsRow(stats)}${featureCards(features, accent)}${bulletRows(bullets)}${callout(note, accent)}${button(escapeHtml(ctaText), ctaUrl, accent, end)}${second}
            ${outro ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:${BRAND.muted};">${outro}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 26px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.body};">Questions? Just reply to this email, our team reads every message.</p>
            <p style="margin:10px 0 0;font-size:14px;color:${BRAND.ink};font-weight:700;">Team Nexora</p>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f8fafc" style="padding:18px 28px;background:#f8fafc;border-top:1px solid ${BRAND.line};font-size:12px;line-height:1.7;color:${BRAND.muted};">
            <a href="${BRAND.site}" style="color:${BRAND.muted};text-decoration:underline;">Website</a> &nbsp;|&nbsp;
            <a href="${BRAND.contact}" style="color:${BRAND.muted};text-decoration:underline;">Contact</a><br>
            ${BRAND.name} &middot; All rights reserved 2019-2026.<br>
            You get this because you have a Nexora account or asked us about Nexora.
            <a href="${UNSUB}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

const stripTags = (html) => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()

/** Plain-text twin of brandedEmail (mail clients and spam filters like having one). */
export function brandedText({ title, intro, bullets = [], outro = '', ctaText, ctaUrl = BRAND.site, subtitle = '', stats = [], features = [], callout: note = '', secondaryText = '', secondaryUrl = '' }) {
  return [
    title,
    ...(subtitle ? [subtitle] : []),
    '',
    stripTags(intro),
    ...(stats.length ? ['', stats.map((item) => `${item.value} ${item.label}`).join(' | ')] : []),
    ...(features.length ? ['', ...features.map((item) => `* ${stripTags(item.title)}: ${stripTags(item.text)}`)] : []),
    ...(bullets.length ? ['', ...bullets.map((item) => `- ${stripTags(item)}`)] : []),
    ...(note ? ['', stripTags(note)] : []),
    '',
    `${ctaText}: ${ctaUrl}`,
    ...(secondaryText && secondaryUrl ? [`${secondaryText}: ${secondaryUrl}`] : []),
    ...(outro ? ['', stripTags(outro)] : []),
    '',
    'Questions? Just reply to this email.',
    'Team Nexora',
    '',
    `Unsubscribe: ${UNSUB}`,
  ].join('\n')
}
