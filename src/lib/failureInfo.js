/**
 * Turn a failed Inbox request into something an admin can act on:
 * what failed, why (in plain words), what to do, plus the raw technical detail.
 * Pure — the error may carry `.status` (HTTP code) and `.network` (request never arrived).
 */
const RULES = [
  { test: (m, s, e) => e?.network || /failed to fetch|networkerror|load failed|network request failed/i.test(m), why: 'The request never reached the Nexora email server (no internet, VPN/ad-blocker, or the worker is down).', fix: 'Check your internet connection and try again. Your message is kept.' },
  { test: (m, s) => s === 401 || /unauthorized|sign in|invalid token|expired/i.test(m), why: 'Your admin session expired.', fix: 'Refresh the page and sign in again, then press Send. Your draft is kept.' },
  { test: (m, s) => s === 403 || /forbidden|origin not allowed/i.test(m), why: 'This account or website address is not allowed to send mail.', fix: 'Sign in with the admin account on nexorasolution.us.' },
  { test: (m, s) => s === 429 || /rate limit|too many|daily email limit|quota|limit reached/i.test(m), why: 'The sending limit was reached.', fix: 'Wait a while (or until tomorrow for the daily limit) and try again.' },
  { test: (m) => /domain.*(not verified|verify)|not verified|sender.*not (allowed|verified)|from address/i.test(m), why: 'The sending domain or "from" address is not verified with the email provider.', fix: 'Verify nexorasolution.us in Resend (DNS records) and try again.' },
  { test: (m) => /invalid.*(recipient|email|address|to)|recipient|could not determine the reply address|valid recipient/i.test(m), why: 'The recipient address is missing or not valid.', fix: 'Check the To / CC / BCC addresses for typos.' },
  { test: (m) => /api key|resend_api_key|apikey|api_key/i.test(m), why: 'The email provider key is missing or wrong on the server.', fix: 'Set RESEND_API_KEY on the nexora-email-api worker and redeploy.' },
  { test: (m, s) => s === 404 || /not found/i.test(m), why: 'The email or ticket no longer exists on the server.', fix: 'Refresh the Inbox and open the message again.' },
  { test: (m, s) => s === 400 || /required|invalid/i.test(m), why: 'Some required information is missing.', fix: 'Fill in the recipient, subject and message, then try again.' },
  { test: (m, s) => s >= 500 || /timeout|timed out|unavailable|temporar/i.test(m), why: 'The email service had a temporary problem.', fix: 'Try again in a minute. If it keeps failing, check the Cloudflare worker logs.' },
]

export function describeFailure(error, action = 'Send reply') {
  const raw = String(error?.message || error || '').trim()
  const status = Number(error?.status) || 0
  const hit = RULES.find((rule) => rule.test(raw, status, error))
  return {
    title: `❌ ${action} failed`,
    reason: hit?.why || 'The email could not be sent for an unknown reason.',
    fix: hit?.fix || 'Press Retry. If it fails again, copy the technical detail below and check the worker logs.',
    detail: [status ? `HTTP ${status}` : '', raw].filter(Boolean).join(' · ') || 'No details returned',
  }
}

/** One-line version for toasts. */
export function failureLine(error, action) {
  const info = describeFailure(error, action)
  return `${info.title.replace('❌ ', '❌ ')}: ${info.reason}`
}
