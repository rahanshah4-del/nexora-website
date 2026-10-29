/**
 * Browser side of Temp Mail Premium: signed-in calls to the temp-mail Worker and the two payments endpoints
 * (checkout, billing portal). No React in here. Sign-in itself is the same client account GeoLint uses.
 */
import { clientIdToken } from '../../../lib/geolintClient.js'
import { api } from './tempMailClient.js'

const PAYMENTS_API = String(
  import.meta.env?.VITE_NOWPAYMENTS_WORKER_URL || 'https://nexora-payments-api.rahanshah4.workers.dev',
).replace(/\/+$/, '')

/** A temp-mail API call that carries the signed-in visitor's token. */
export async function authedApi(path, options = {}) {
  return api(path, { ...options, token: await clientIdToken() })
}

export const fetchMe = () => authedApi('/api/me')
export const fetchCombinedInbox = () => authedApi('/api/me/inbox')
export const deleteOwnedAddress = (address) => authedApi(`/api/me/address/${encodeURIComponent(address)}`, { method: 'DELETE' })
export const startForwarding = (address, to) => authedApi('/api/forward', { method: 'POST', body: { address, to } })
export const verifyForwarding = (address, code) => authedApi('/api/forward/verify', { method: 'POST', body: { address, code } })
export const stopForwarding = (address) => authedApi('/api/forward', { method: 'DELETE', body: { address } })

async function paymentsCall(path, body) {
  const token = await clientIdToken()
  if (!token) throw Object.assign(new Error('Sign in first.'), { code: 'unauthenticated' })
  const response = await fetch(`${PAYMENTS_API}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) {
    throw Object.assign(new Error(result.error || 'Something went wrong. Please try again.'), { status: response.status, code: response.status === 409 ? 'already_premium' : 'failed' })
  }
  return result
}

/** Resolves the hosted Polar checkout URL for the chosen billing cycle. */
export async function premiumCheckoutUrl(cycle) {
  const result = await paymentsCall('/api/polar/tempmail/checkout', { cycle: cycle === 'yearly' ? 'yearly' : 'monthly' })
  return result.url
}

/** Resolves Polar's customer portal URL (cancel, change card, invoices). */
export async function premiumPortalUrl() {
  const result = await paymentsCall('/api/polar/tempmail/portal')
  return result.portalUrl
}

/** Percent saved by paying yearly instead of twelve months (for the toggle label). */
export function yearlySavingPercent(monthly, yearly) {
  const m = Number(monthly)
  const y = Number(yearly)
  if (!(m > 0) || !(y > 0)) return 0
  return Math.max(0, Math.round((1 - y / (m * 12)) * 100))
}

export function premiumErrorMessage(error) {
  const code = error?.code
  if (code === 'unauthenticated' || error?.status === 401) return 'Please sign in again.'
  if (code === 'already_premium') return 'You already have Premium.'
  if (code === 'address_limit') return 'You have reached the limit of Premium addresses. Delete one to make room.'
  if (code === 'wrong_code') return 'That code is not right. Check it and try again.'
  if (code === 'no_pending') return 'That code has expired. Send a new one.'
  if (code === 'too_many_tries') return 'Too many wrong tries. Send a new code.'
  if (code === 'invalid_destination') return error?.reason === 'own_domain' ? 'Forward to your real inbox, not a Nexora temp address.' : 'Enter a valid email address.'
  if (code === 'forwarding_unavailable') return 'Forwarding is not available right now.'
  if (code === 'send_failed') return 'We could not send the code. Check the address and try again.'
  if (error?.status === 429) return 'Too many requests. Please wait a little and try again.'
  return error?.message && !String(error.message).startsWith('HTTP') ? error.message : 'Something went wrong. Please try again.'
}
