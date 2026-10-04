/**
 * What a document's payment QR code contains. Pure (no DOM): used by the
 * paper model, so the HTML preview and the PDF draw the same code.
 *
 *   link  the payment link (PayPal.me, Wise, Stripe…)          any currency
 *   upi   upi://pay?…  India's UPI, amount pre-filled           INR only for the amount
 *   epc   EPC069-12 "GiroCode" SEPA credit transfer              EUR only
 *   text  free text the client sees after scanning (e.g. a wallet number)
 *
 * Nothing is sent anywhere: the code only carries the details the visitor typed.
 */

import { currencyExponent } from './currency.js'
import { scaledToDecimalString } from './money.js'

function amountString(minor, currency) {
  if (!Number.isFinite(minor) || minor <= 0) return ''
  return scaledToDecimalString(minor, currencyExponent(currency))
}

function clip(value, max) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

/** UPI deep link (NPCI linking spec). The amount is only added for INR. */
export function upiPayload({ vpa, name, amountMinor, currency, note }) {
  const pa = String(vpa || '').trim()
  if (!/^[\w.-]{2,256}@[a-zA-Z][\w.-]{1,64}$/.test(pa)) return ''
  const params = new URLSearchParams({ pa })
  if (name) params.set('pn', clip(name, 50))
  const am = currency === 'INR' ? amountString(amountMinor, currency) : ''
  if (am) params.set('am', am)
  params.set('cu', 'INR')
  if (note) params.set('tn', clip(note, 50))
  return `upi://pay?${params.toString()}`
}

/** EPC069-12 SEPA credit transfer QR ("GiroCode"). EUR only; IBAN and name required. */
export function epcPayload({ iban, bic, name, amountMinor, currency, remittance }) {
  const cleanIban = String(iban || '').replace(/\s+/g, '').toUpperCase()
  if (currency !== 'EUR' || !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleanIban) || !String(name || '').trim()) return ''
  const amount = amountString(amountMinor, currency)
  const amountField = amount && Number(amount) <= 999999999.99 ? `EUR${amount}` : ''
  return [
    'BCD', '002', '1', 'SCT',
    String(bic || '').replace(/\s+/g, '').toUpperCase().slice(0, 11),
    clip(name, 70),
    cleanIban,
    amountField,
    '', '',
    clip(remittance, 140),
  ].join('\n')
}

/**
 * @param {object} doc  normalized document
 * @param {{ balanceDue?: number, total?: number }} totals
 * @returns {string} '' when the chosen QR has nothing valid to carry
 */
export function paymentQrPayload(doc, totals = {}) {
  const p = doc?.payment
  if (!p || p.qr === 'none') return ''
  const amountMinor = Number(totals.balanceDue ?? totals.total ?? 0)
  const payee = p.accountName || doc.seller?.company || doc.seller?.name || ''
  const note = [doc.number].filter(Boolean).join(' ')
  switch (p.qr) {
    case 'link':
      // Same rule as the model: only web links ever go into a code.
      return /^https?:\/\//i.test(p.link || '') ? clip(p.link, 500) : ''
    case 'upi':
      return upiPayload({ vpa: p.walletId, name: payee, amountMinor, currency: doc.currency, note })
    case 'epc':
      return epcPayload({ iban: p.iban, bic: p.swift, name: payee, amountMinor, currency: doc.currency, remittance: note })
    case 'text':
      return clip(p.qrText, 500)
    default:
      return ''
  }
}
