// Billing emails for the Polar webhook. Sends through the Nexora email worker with the
// shared internal key. Never throws: a failed email must not fail the webhook (Polar retries
// failed webhooks, which would send the same email again).
const DEFAULT_EMAIL_URL = 'https://nexora-email-api.rahanshah4.workers.dev/send-email'

export async function sendBillingEmail(env, { to, type, data = {} }, fetchImpl = fetch) {
  const key = String(env?.BILLING_EMAIL_KEY || env?.INTERNAL_EMAIL_KEY || '')
  const recipient = String(to || '').trim().toLowerCase()
  if (key.length < 32 || !recipient || !type) return { ok: false, skipped: true }
  try {
    const response = await fetchImpl(String(env.EMAIL_WORKER_URL || DEFAULT_EMAIL_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nexora-Internal-Key': key },
      body: JSON.stringify({ to: recipient, type, data }),
    })
    return { ok: response.ok, status: response.status }
  } catch (error) {
    console.warn(`[Billing email] ${type} failed: ${error?.message || error}`)
    return { ok: false, error: String(error?.message || error) }
  }
}

export function formatEmailDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' })
}

export function formatEmailMoney(amount, currency = 'USD') {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return ''
  return `${String(currency || 'USD').toUpperCase()} ${value.toFixed(2)}`
}

const PLAN_LABELS = { basic: 'Basic', starter: 'Starter', growth: 'Growth', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' }
export function planLabel(plan) {
  const key = String(plan || '').toLowerCase()
  return PLAN_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '')
}
