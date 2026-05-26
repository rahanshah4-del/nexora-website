import { fxRates } from '../data/currency.js'

export function convertFromUsd(usdValue, currency) {
  const amount = Number(usdValue)
  const rate = fxRates[currency] ?? 1
  return (Number.isFinite(amount) ? amount : 0) * rate
}
