/**
 * Payment choices for a GeoLint order. They come from the SAME place as the upgrade page (the
 * Control Centre's platformSettings → paymentAccounts), so the accounts the client sees here are
 * always the ones the team manages there. Pure helpers: no React, no network.
 */
import { mergePlatformSettings } from './platformPlans.js'

/** Used only when live exchange rates cannot be loaded. The amount is always shown as "about". */
export const FALLBACK_PKR_PER_USD = 280

const LOCAL_IDS = ['jazzcash', 'easypaisa', 'bank_transfer']

/** The demo numbers that ship in the code. They must never be shown to a client as a place to send money. */
const PLACEHOLDER = /^(x+|0300-?1234567|n\/a|tbd|contactsupport|paymentlink)$/i

export function isRealAccount(value) {
  const text = String(value || '').trim()
  return text.length >= 4 && !PLACEHOLDER.test(text.replace(/\s+/g, ''))
}

export function usdToPkr(usd, rates) {
  const rate = Number(rates?.USD)
  const amount = Number(usd)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const perUsd = rate > 0 ? 1 / rate : FALLBACK_PKR_PER_USD
  return Math.round(amount * perUsd)
}

const CRYPTO_URL = /^https:\/\/(www\.)?nowpayments\.io\//i

/**
 * The methods to show, in order: card first (instant), then the local accounts, then crypto.
 *  - `paddle` is the engine's card config (null when cards are off).
 *  - `cardOnly` offers just the card whenever cards are on (and everything else only when they are off).
 *  - `settingsDocs` are the platformSettings documents. With none loaded (offline, blocked) no local
 *    account is shown at all, because the built-in defaults are demo numbers.
 */
export function buildPaymentMethods({ paddle, settingsDocs, cardOnly = false }) {
  const methods = []
  if (paddle) {
    methods.push({ id: 'card', kind: 'card', label: 'Card or PayPal', badge: 'Instant', note: 'Pay securely online. Your order starts by itself a moment after you pay.' })
    // Card only: when cards work, the local accounts and crypto are not offered at all.
    if (cardOnly) return methods
  }
  if (Array.isArray(settingsDocs) && settingsDocs.length) {
    const accounts = mergePlatformSettings(settingsDocs).paymentAccounts || {}
    for (const id of LOCAL_IDS) {
      const account = id === 'bank_transfer' ? accounts.bank_transfer || accounts.bank : accounts[id]
      if (!account || !isRealAccount(account.accountNumber)) continue
      methods.push({
        id,
        kind: 'manual',
        label: account.label || id,
        badge: id === 'bank_transfer' ? '' : 'Pakistan',
        bankName: account.bankName || '',
        accountTitle: account.accountTitle || '',
        accountNumber: String(account.accountNumber).trim(),
        instructions: account.instructions || '',
        note: 'Send the exact amount, then tell us the transaction number. We confirm it by hand, usually within a few hours.',
      })
    }
    const crypto = accounts.nowpayments
    if (crypto && CRYPTO_URL.test(String(crypto.paymentUrl || ''))) {
      methods.push({ id: 'crypto', kind: 'crypto', label: 'Crypto', badge: 'Global', paymentUrl: crypto.paymentUrl, note: 'Pay on the secure crypto page, then paste the transaction ID here. We confirm it by hand.' })
    }
  }
  return methods
}

/** What the "I have paid" form asks for, per method: a short label and a hint. */
export function referenceFields(method) {
  if (!method) return { label: 'Payment reference', hint: '' }
  if (method.id === 'bank_transfer') return { label: 'Transaction or reference number', hint: 'Shown in your banking app or on the receipt.' }
  if (method.id === 'crypto') return { label: 'Transaction ID (hash)', hint: 'The long code shown after you pay.' }
  return { label: 'Transaction ID', hint: 'The TID in the confirmation message from the app.' }
}

/** The text sent to the engine as the payment method, so staff see which account the money went to. */
export function methodName(method) {
  if (!method) return ''
  return method.id === 'crypto' ? 'Crypto (NOWPayments)' : method.id === 'card' ? 'Card' : method.label
}

/** Same rule the engine applies (2 to 160 characters), so the form can say so before sending. */
export function validatePaymentProof({ method, reference }) {
  if (!method) return 'Choose how you paid.'
  const ref = String(reference || '').trim()
  if (ref.length < 4) return 'Enter the transaction number from your payment, at least 4 characters.'
  if (ref.length > 160) return 'That reference is too long.'
  return ''
}
