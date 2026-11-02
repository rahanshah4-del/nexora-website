/**
 * Second email service: Cloudflare Email Service (the `EMAIL` send_email binding).
 *
 * Resend stays the first choice. When Resend cannot send (monthly/daily quota 429, 402, a 5xx or a network error),
 * the same message goes out through Cloudflare instead, so a full Resend quota never stops OTPs or billing mail.
 * The helpers are pure (no Worker globals besides Response) so they can be unit tested.
 */

/** Resend answers that another service might still be able to deliver: quota/rate limits and server trouble. */
export function shouldFallBack(status) {
  return status === 429 || status === 402 || status >= 500
}

/** "Nexora <a@b.com>" -> { email, name }; a bare address stays a string. */
export function parseMailbox(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^\s*"?([^"<]*?)"?\s*<([^<>\s]+)>\s*$/)
  if (!match) return text
  const name = match[1].trim()
  return name ? { email: match[2], name } : match[2]
}

const asList = (v) => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v])

/** Resend-shaped payload -> Cloudflare Email Service send() payload. */
export function toCloudflarePayload(p) {
  const out = {
    from: parseMailbox(p.from),
    to: asList(p.to).map(parseMailbox),
    subject: String(p.subject ?? ''),
  }
  if (p.html) out.html = String(p.html)
  if (p.text) out.text = String(p.text)
  const cc = asList(p.cc).map(parseMailbox)
  const bcc = asList(p.bcc).map(parseMailbox)
  if (cc.length) out.cc = cc
  if (bcc.length) out.bcc = bcc
  const replyTo = p.reply_to ?? p.replyTo
  if (replyTo) out.replyTo = parseMailbox(Array.isArray(replyTo) ? replyTo[0] : replyTo)
  if (p.headers && typeof p.headers === 'object') out.headers = p.headers
  if (Array.isArray(p.attachments) && p.attachments.length) {
    out.attachments = p.attachments.map((a) => ({
      content: a.content,
      filename: a.filename || 'attachment',
      type: a.content_type || a.type || 'application/octet-stream',
      disposition: 'attachment',
    }))
  }
  return out
}

/** Send through the EMAIL binding. Resolves { ok, id, error }; never throws. */
export async function cloudflareSend(env, payload) {
  if (!env?.EMAIL || typeof env.EMAIL.send !== 'function') return { ok: false, error: 'cloudflare_email_not_configured' }
  try {
    const result = await env.EMAIL.send(toCloudflarePayload(payload))
    return { ok: true, id: result?.messageId || '' }
  } catch (error) {
    return { ok: false, error: `${error?.code || 'E_SEND'}: ${error?.message || 'send failed'}` }
  }
}

/**
 * Resend first, Cloudflare second. `resendCall` performs the Resend request and returns a fetch Response (or throws).
 * Always returns a Response: Resend's when it worked or when there is no fallback, otherwise the Cloudflare outcome.
 */
export async function sendWithFallback(env, payload, resendCall) {
  let resend = null
  let thrown = null
  if (resendCall) {
    try { resend = await resendCall() } catch (error) { thrown = error }
  }
  if (resend?.ok) return resend
  const canFallBack = !resend || shouldFallBack(resend.status)
  if (!canFallBack || !env?.EMAIL) {
    if (resend) return resend
    throw thrown || new Error('No email service is configured.')
  }
  const sent = await cloudflareSend(env, payload)
  if (sent.ok) {
    return new Response(JSON.stringify({ id: sent.id, provider: 'cloudflare' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (resend) return resend // keep Resend's own error: it is the one people know
  return new Response(JSON.stringify({ message: sent.error }), { status: 502, headers: { 'content-type': 'application/json' } })
}
